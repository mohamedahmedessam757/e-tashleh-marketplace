import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';
import { WhatsAppChannelService } from '../widers/whatsapp-channel.service';
import { isWhatsAppEligibleRole } from '../widers/whatsapp-notification.mapper';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private prisma: PrismaService,
        private readonly gateway: NotificationsGateway,
        private readonly whatsappChannel: WhatsAppChannelService,
    ) { }

    async create(data: CreateNotificationDto) {
        const offerId = data.metadata?.offerId != null ? String(data.metadata.offerId) : null;
        if (data.type === 'payment' && offerId) {
            const duplicate = await this.prisma.notification.findFirst({
                where: {
                    recipientId: data.recipientId,
                    type: 'payment',
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                    metadata: { path: ['offerId'], equals: offerId },
                },
            });
            if (duplicate) {
                return duplicate;
            }
        }

        // 1. Rate Limiting: Max 20 per minute per user
        // ORDER_CREATED merchant fan-out may legitimately exceed 20 — use higher cap for that event only.
        const waEvent = data.metadata?.waEvent != null ? String(data.metadata.waEvent) : '';
        const isOrderCreatedFanout = waEvent === 'ORDER_CREATED';
        if (await this.isRateLimited(data.recipientId, isOrderCreatedFanout ? 100 : 20)) {
            this.logger.warn(
                `Rate limit reached for user ${data.recipientId} (waEvent=${waEvent || 'n/a'}). Notification suppressed.`,
            );
            return null;
        }

        // 2. Role Fallback: Resolve from DB if not provided
        let recipientRole = data.recipientRole;
        if (!recipientRole) {
            const user = await this.prisma.user.findUnique({
                where: { id: data.recipientId },
                select: { role: true }
            });
            recipientRole = user?.role === 'VENDOR' ? 'MERCHANT' : user?.role || 'CUSTOMER';
        }

        // 3. Persist Notification
        const notification = await this.prisma.notification.create({
            data: {
                ...data,
                recipientRole,
            },
        });

        // 4. Real-time Emission
        this.gateway.sendToUser(data.recipientId, notification);

        // 5. WhatsApp transactional dispatch — AWAIT for eligible roles so the send
        // completes before the HTTP request ends (void fire-and-forget was dropping txn_*).
        const roleForWa = recipientRole ?? 'CUSTOMER';
        if (isWhatsAppEligibleRole(roleForWa)) {
            try {
                await this.whatsappChannel.maybeSend({
                    recipientId: data.recipientId,
                    recipientRole: roleForWa,
                    type: data.type,
                    titleAr: data.titleAr,
                    titleEn: data.titleEn,
                    messageAr: data.messageAr,
                    messageEn: data.messageEn,
                    link: data.link,
                    metadata: data.metadata,
                    notificationId: notification.id,
                });
            } catch (err) {
                this.logger.warn(
                    `WhatsApp dispatch hook failed (notif=${notification.id}): ${err instanceof Error ? err.message : err}`,
                );
            }
        }

        return notification;
    }

    private async isRateLimited(userId: string, maxPerMinute = 20): Promise<boolean> {
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const count = await this.prisma.notification.count({
            where: {
                recipientId: userId,
                createdAt: { gte: oneMinuteAgo }
            }
        });
        return count >= maxPerMinute;
    }

    async findAll(userId: string) {
        return this.prisma.notification.findMany({
            where: { recipientId: userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    async markAsRead(id: string, userId: string) {
        if (!UUID_RE.test(id)) {
            this.logger.warn(`markAsRead skipped: invalid notification id "${id}"`);
            return null;
        }
        const notif = await this.prisma.notification.findUnique({ where: { id } });
        if (!notif || notif.recipientId !== userId) return null;

        return this.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
    }

    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: { recipientId: userId, isRead: false },
            data: { isRead: true },
        });
    }

    async getUnreadCount(userId: string) {
        return this.prisma.notification.count({
            where: { recipientId: userId, isRead: false }
        });
    }

    /**
     * Helper to send urgent notifications to all platform administrators
     * Following 2026 Admin Alerting standards
     */
    async notifyAdmins(data: Omit<CreateNotificationDto, 'recipientId' | 'recipientRole'>) {
        const admins = await this.prisma.user.findMany({
            where: {
                role: { in: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] }
            },
            select: { id: true, role: true }
        });

        if (admins.length === 0) {
            this.logger.warn('notifyAdmins: no staff users found (ADMIN/SUPER_ADMIN/SUPPORT)');
            return { count: 0 };
        }

        const notificationsData = admins.map(admin => ({
            ...data,
            recipientId: admin.id,
            recipientRole: admin.role === 'SUPPORT' ? 'SUPPORT' : 'ADMIN',
            type: data.type || 'alert'
        }));

        const result = await this.prisma.notification.createMany({
            data: notificationsData
        });

        this.gateway.sendToAdmins({
            ...data,
            type: data.type || 'alert',
            createdAt: new Date()
        });

        return result;
    }

    /**
     * Standardized helper for bilingual user notifications
     */
    async notifyUser(recipientId: string, role: string, data: Omit<CreateNotificationDto, 'recipientId' | 'recipientRole'>) {
        return this.create({
            ...data,
            recipientId,
            recipientRole: role,
            // Do not default to SYSTEM/ALERT — those silently block WhatsApp dispatch
            type: data.type || 'ORDER',
        });
    }

    /**
     * Phase 1 Enhancement: Auto-resolve store owner from storeId
     */
    async notifyMerchantByStoreId(storeId: string, data: Omit<CreateNotificationDto, 'recipientId' | 'recipientRole'>) {
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            select: { ownerId: true }
        });

        if (!store) {
            this.logger.error(`Failed to notify merchant: Store ${storeId} not found.`);
            return null;
        }

        return this.notifyUser(store.ownerId, 'MERCHANT', data);
    }

    /**
     * Phase 1 Enhancement: Prevent duplicate notifications within a TTL window
     */
    async notifyWithDedup(recipientId: string, dedupKey: string, ttlMinutes: number, data: CreateNotificationDto) {
        const recent = await this.prisma.notification.findFirst({
            where: {
                recipientId,
                type: data.type,
                createdAt: { gte: new Date(Date.now() - ttlMinutes * 60000) },
                metadata: {
                    path: ['dedupKey'],
                    equals: dedupKey
                }
            }
        });

        if (recent) {
            this.logger.debug(`Duplicate notification suppressed for user ${recipientId} (key: ${dedupKey})`);
            return recent;
        }

        return this.create({
            ...data,
            metadata: { ...data.metadata, dedupKey }
        });
    }
}
