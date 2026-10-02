import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

const DEBOUNCE_MS = 400;

/**
 * Browser clients connect to Supabase as `anon` (auth is Nest JWT), so RLS on
 * shipments / shipment_status_logs / shipping_waybills drops their realtime events.
 * This relay listens with the service role (post-commit changes) and fans out
 * `shipment_updated` over the JWT-authenticated notifications socket to the
 * order's customer, the store owners on that order, and admins.
 * Order / accepted-offer changes are relayed the same way as `order_updated`
 * (customer + accepted store owners only; payload is just the order id).
 */
@Injectable()
export class ShipmentsRealtimeRelayService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ShipmentsRealtimeRelayService.name);
    private client: SupabaseClient | null = null;
    private channel: RealtimeChannel | null = null;
    private readonly pending = new Map<string, { timer: NodeJS.Timeout; shipmentIds: Set<string> }>();
    private readonly pendingOrders = new Map<string, NodeJS.Timeout>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly gateway: NotificationsGateway,
    ) {}

    onModuleInit() {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            this.logger.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — shipment realtime relay disabled');
            return;
        }
        this.client = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        this.channel = this.client
            .channel('backend-shipments-relay')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, (p) =>
                this.onRow('shipments', p),
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shipment_status_logs' }, (p) =>
                this.onRow('shipment_status_logs', p),
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shipping_waybills' }, (p) =>
                this.onRow('shipping_waybills', p),
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (p) =>
                this.onOrderRow('orders', p),
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, (p) =>
                this.onOrderRow('offers', p),
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') this.logger.log('Shipment realtime relay subscribed');
                else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    this.logger.warn(`Shipment realtime relay status: ${status}`);
                }
            });
    }

    async onModuleDestroy() {
        for (const p of this.pending.values()) clearTimeout(p.timer);
        this.pending.clear();
        for (const t of this.pendingOrders.values()) clearTimeout(t);
        this.pendingOrders.clear();
        if (this.client && this.channel) {
            await this.client.removeChannel(this.channel).catch(() => undefined);
        }
    }

    private async onRow(table: string, payload: any) {
        try {
            const row = (payload?.new && Object.keys(payload.new).length ? payload.new : payload?.old) || {};
            let orderId: string | null = null;
            let shipmentId: string | null = null;

            if (table === 'shipments') {
                shipmentId = row.id ?? null;
                orderId = row.order_id ?? null;
            } else if (table === 'shipment_status_logs') {
                shipmentId = row.shipment_id ?? null;
            } else if (table === 'shipping_waybills') {
                orderId = row.order_id ?? null;
            }

            if (!orderId && shipmentId) {
                const s = await this.prisma.shipment.findUnique({
                    where: { id: shipmentId },
                    select: { orderId: true },
                });
                orderId = s?.orderId ?? null;
            }
            if (!orderId) return;
            this.schedule(orderId, shipmentId);
        } catch (err) {
            this.logger.debug(`Relay row handling failed: ${(err as Error)?.message}`);
        }
    }

    /**
     * Orders / accepted offers → `order_updated` hint (assembly cart, order details).
     * Bids that are not accepted are ignored so bidding traffic doesn't fan out.
     */
    private onOrderRow(table: 'orders' | 'offers', payload: any) {
        const row = (payload?.new && Object.keys(payload.new).length ? payload.new : payload?.old) || {};
        let orderId: string | null = null;
        if (table === 'orders') {
            orderId = row.id ?? null;
        } else {
            if (String(row.status || '').toLowerCase() !== 'accepted') return;
            orderId = row.order_id ?? null;
        }
        if (!orderId || this.pendingOrders.has(orderId)) return;
        const timer = setTimeout(() => {
            this.pendingOrders.delete(orderId as string);
            void this.flushOrder(orderId as string);
        }, DEBOUNCE_MS);
        this.pendingOrders.set(orderId, timer);
    }

    private async flushOrder(orderId: string) {
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                select: {
                    customerId: true,
                    offers: {
                        where: { status: { in: ['accepted', 'ACCEPTED'] } },
                        select: { store: { select: { ownerId: true } } },
                    },
                },
            });
            if (!order) return;
            const recipients = new Set<string>();
            if (order.customerId) recipients.add(order.customerId);
            for (const o of order.offers || []) {
                const ownerId = (o as any).store?.ownerId;
                if (ownerId) recipients.add(ownerId);
            }
            this.gateway.emitOrderUpdated([...recipients], { orderId });
        } catch (err) {
            this.logger.debug(`Order relay flush failed for order ${orderId}: ${(err as Error)?.message}`);
        }
    }

    private schedule(orderId: string, shipmentId: string | null) {
        const existing = this.pending.get(orderId);
        if (existing) {
            if (shipmentId) existing.shipmentIds.add(shipmentId);
            return;
        }
        const shipmentIds = new Set<string>(shipmentId ? [shipmentId] : []);
        const timer = setTimeout(() => {
            this.pending.delete(orderId);
            void this.flush(orderId, [...shipmentIds]);
        }, DEBOUNCE_MS);
        this.pending.set(orderId, { timer, shipmentIds });
    }

    private async flush(orderId: string, shipmentIds: string[]) {
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                select: {
                    customerId: true,
                    offers: { select: { store: { select: { ownerId: true } } } },
                },
            });
            if (!order) return;
            const recipients = new Set<string>();
            if (order.customerId) recipients.add(order.customerId);
            for (const o of order.offers || []) {
                const ownerId = (o as any).store?.ownerId;
                if (ownerId) recipients.add(ownerId);
            }
            this.gateway.emitShipmentUpdated([...recipients], { orderId, shipmentIds });
        } catch (err) {
            this.logger.debug(`Relay flush failed for order ${orderId}: ${(err as Error)?.message}`);
        }
    }
}
