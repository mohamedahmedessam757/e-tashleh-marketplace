import { Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EscrowService } from './escrow.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { FinancialConfigService } from '../common/financial-config.service';
import {
    escrowReleaseWindowEnd,
    isEscrowPaymentEligibleForAutoRelease,
} from './escrow-release-eligibility.util';

/** Values safe to send in Prisma `status: { in: ... }` against live Postgres. */
const ORDER_COMPLETION_FINANCE_DB_STATUSES: OrderStatus[] = [
    OrderStatus.COMPLETED,
    OrderStatus.WARRANTY_ACTIVE,
    OrderStatus.WARRANTY_EXPIRED,
];

/**
 * Terminal finance statuses. `CLOSED` exists in Prisma but is missing from some
 * live `order_status` enums — never send it in a SQL `IN (...)` filter.
 */
export const ORDER_COMPLETION_FINANCE_STATUSES: OrderStatus[] = [
    ...ORDER_COMPLETION_FINANCE_DB_STATUSES,
    OrderStatus.CLOSED,
];

@Injectable()
export class OrderCompletionFinanceService {
    private readonly logger = new Logger(OrderCompletionFinanceService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly escrowService: EscrowService,
        @Inject(forwardRef(() => LoyaltyService))
        private readonly loyaltyService: LoyaltyService,
        private readonly financialConfig: FinancialConfigService,
    ) {}

    isTerminalFinanceStatus(status: string): boolean {
        return (ORDER_COMPLETION_FINANCE_STATUSES as string[]).includes(status);
    }

    /**
     * Idempotent settlement for a terminal order: release HELD/RELEASING escrow,
     * then grant cashback/points and referral (each step isolated).
     */
    async settleCompletedOrder(orderId: string): Promise<void> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, status: true },
        });
        if (!order || !this.isTerminalFinanceStatus(order.status)) {
            return;
        }

        const heldPayments = await this.prisma.paymentTransaction.findMany({
            where: {
                orderId,
                status: 'SUCCESS',
                escrow: { status: { in: ['HELD', 'RELEASING'] } },
            },
            select: { id: true },
        });

        for (const payment of heldPayments) {
            try {
                await this.escrowService.releaseFunds(
                    orderId,
                    'AUTO_48H',
                    undefined,
                    payment.id,
                );
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                if (err instanceof NotFoundException || message.includes('No HELD escrow')) {
                    continue;
                }
                this.logger.warn(
                    `Escrow release failed for payment ${payment.id} on order ${orderId}: ${message}`,
                );
            }
        }

        try {
            await this.loyaltyService.grantOrderCompletionRewards(orderId);
        } catch (err) {
            this.logger.warn(
                `Loyalty grant failed for order ${orderId}: ${
                    err instanceof Error ? err.message : String(err)
                }`,
            );
        }

        try {
            await this.loyaltyService.processReferralReward(orderId);
        } catch (err) {
            this.logger.warn(
                `Referral reward failed for order ${orderId}: ${
                    err instanceof Error ? err.message : String(err)
                }`,
            );
        }
    }

    /**
     * Heal HELD/RELEASING escrow that is eligible for auto-release (terminal
     * orders immediately, DELIVERED after the hold window). Optionally scoped
     * to one store. Grants rewards for terminal orders after release.
     */
    async syncEligibleEscrowReleases(opts?: {
        storeId?: string;
        limit?: number;
    }): Promise<void> {
        const limit = opts?.limit ?? 50;
        const config = await this.financialConfig.getConfig();
        const windowEnd = escrowReleaseWindowEnd(new Date(), config.escrowHoldHoursMerchant);

        const heldEscrows = await this.prisma.escrowTransaction.findMany({
            where: {
                status: { in: ['HELD', 'RELEASING'] },
                ...(opts?.storeId
                    ? { payment: { offer: { storeId: opts.storeId } } }
                    : {}),
            },
            select: {
                orderId: true,
                paymentId: true,
                payment: {
                    select: {
                        offer: {
                            select: {
                                fulfillmentStatus: true,
                                deliveredAt: true,
                            },
                        },
                    },
                },
            },
            take: limit,
        });

        const settledOrderIds = new Set<string>();

        for (const escrow of heldEscrows) {
            const order = await this.prisma.order.findUnique({
                where: { id: escrow.orderId },
                select: { status: true, deliveredAt: true, updatedAt: true },
            });
            if (
                !order ||
                !isEscrowPaymentEligibleForAutoRelease(
                    order,
                    escrow.payment?.offer,
                    windowEnd,
                )
            ) {
                continue;
            }

            if (this.isTerminalFinanceStatus(order.status)) {
                if (!settledOrderIds.has(escrow.orderId)) {
                    settledOrderIds.add(escrow.orderId);
                    await this.settleCompletedOrder(escrow.orderId);
                }
                continue;
            }

            try {
                await this.escrowService.releaseFunds(
                    escrow.orderId,
                    'AUTO_48H',
                    undefined,
                    escrow.paymentId,
                );
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                this.logger.warn(
                    `Escrow auto-release skipped for payment ${escrow.paymentId}: ${message}`,
                );
            }
        }

        if (opts?.storeId) {
            await this.repairPaymentsWithoutEscrow(opts.storeId, windowEnd);
        }
    }

    async healCustomerCompletionRewards(customerId: string, limit = 20): Promise<void> {
        const orders = await this.prisma.order.findMany({
            where: {
                customerId,
                status: { in: ORDER_COMPLETION_FINANCE_DB_STATUSES },
            },
            select: { id: true },
            orderBy: { updatedAt: 'desc' },
            take: limit,
        });

        for (const order of orders) {
            const existing = await this.prisma.walletTransaction.findFirst({
                where: {
                    userId: customerId,
                    transactionType: 'ORDER_PROFIT',
                    metadata: { path: ['orderId'], equals: order.id },
                },
                select: { id: true },
            });
            if (existing) continue;
            await this.settleCompletedOrder(order.id);
        }
    }

    private async repairPaymentsWithoutEscrow(
        storeId: string,
        windowEnd: Date,
    ): Promise<void> {
        const paymentsWithoutEscrow = await this.prisma.paymentTransaction.findMany({
            where: {
                status: 'SUCCESS',
                offer: { storeId },
                escrow: null,
            },
            include: {
                order: { select: { status: true, deliveredAt: true, updatedAt: true } },
                offer: {
                    select: {
                        fulfillmentStatus: true,
                        deliveredAt: true,
                        storeId: true,
                    },
                },
            },
        });

        for (const payment of paymentsWithoutEscrow) {
            if (!payment.order || !payment.offer?.storeId) continue;
            if (
                !isEscrowPaymentEligibleForAutoRelease(
                    payment.order,
                    payment.offer,
                    windowEnd,
                )
            ) {
                continue;
            }

            try {
                const unitPrice = Number(payment.unitPrice || 0);
                const shippingCost = Number(payment.shippingCost || 0);
                const commission = Number(payment.commission || 0);
                if (unitPrice <= 0) continue;

                const vendorAlreadyCredited = await this.prisma.walletTransaction.findFirst({
                    where: {
                        paymentId: payment.id,
                        role: 'VENDOR',
                        type: 'CREDIT',
                    },
                    select: { id: true },
                });
                if (vendorAlreadyCredited) {
                    if (this.isTerminalFinanceStatus(payment.order.status)) {
                        await this.settleCompletedOrder(payment.orderId);
                    }
                    continue;
                }

                const storedFee = Number(payment.gatewayFee || 0);
                const gatewayFee =
                    storedFee > 0
                        ? storedFee
                        : await this.financialConfig.computeGatewayFeeForTotal(
                              Number(payment.totalAmount || 0),
                          );
                if (storedFee <= 0 && gatewayFee > 0) {
                    await this.prisma.paymentTransaction.update({
                        where: { id: payment.id },
                        data: { gatewayFee },
                    });
                }

                await this.escrowService.holdFunds(
                    payment.id,
                    payment.orderId,
                    payment.offer.storeId,
                    {
                        merchantAmount: unitPrice,
                        shippingAmount: shippingCost,
                        commissionAmount: commission,
                        gatewayFee,
                    },
                );

                if (this.isTerminalFinanceStatus(payment.order.status)) {
                    await this.settleCompletedOrder(payment.orderId);
                } else {
                    await this.escrowService.releaseFunds(
                        payment.orderId,
                        'AUTO_48H',
                        undefined,
                        payment.id,
                    );
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                this.logger.warn(
                    `Legacy escrow repair skipped for payment ${payment.id}: ${message}`,
                );
            }
        }
    }
}
