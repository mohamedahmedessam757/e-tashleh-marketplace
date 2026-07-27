import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { CreateCardDto } from './dto/create-card.dto';

@Injectable()
export class CardsService {
    private readonly logger = new Logger(CardsService.name);

    constructor(
        private prisma: PrismaService,
        private stripeService: StripeService,
    ) {}

    /**
     * Return wallet cards with Stripe PaymentMethod IDs reconciled to the live customer.
     * Stale pm_* (deleted customer / Connect mismatch) are cleared so Quick Pay cannot confirm them.
     */
    async getUserCards(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { stripeCustomerId: true, email: true, name: true },
        });

        const dbCards = await this.prisma.userCard.findMany({
            where: { userId },
            orderBy: { isDefault: 'desc' },
        });

        if (!user?.stripeCustomerId) {
            // No live Stripe customer → never expose dangling pm_* for confirm
            const stale = dbCards.filter((c) => c.stripePaymentMethodId);
            if (stale.length) {
                await this.prisma.userCard.updateMany({
                    where: { userId, stripePaymentMethodId: { not: null } },
                    data: { stripePaymentMethodId: null },
                });
                for (const c of dbCards) c.stripePaymentMethodId = null;
            }
            return dbCards;
        }

        try {
            const stripeMethods = await this.stripeService.listPaymentMethods(user.stripeCustomerId);
            const validPmIds = new Set(stripeMethods.map((m: { id: string }) => m.id));

            // Clear DB links that Stripe no longer has for this customer
            for (const card of dbCards) {
                if (card.stripePaymentMethodId && !validPmIds.has(card.stripePaymentMethodId)) {
                    this.logger.warn(
                        `Clearing stale PaymentMethod ${card.stripePaymentMethodId} for user ${userId} card ${card.id}`,
                    );
                    await this.prisma.userCard.update({
                        where: { id: card.id },
                        data: { stripePaymentMethodId: null },
                    });
                    card.stripePaymentMethodId = null;
                }
            }

            // Re-link by last4 when Stripe has a valid PM and DB row is missing/outdated
            for (const method of stripeMethods) {
                const last4 = method.card?.last4 as string | undefined;
                if (!last4) continue;
                const match = dbCards.find((c) => c.last4 === last4);
                if (match && match.stripePaymentMethodId !== method.id) {
                    await this.prisma.userCard.update({
                        where: { id: match.id },
                        data: {
                            stripePaymentMethodId: method.id,
                            brand: method.card?.brand ?? match.brand,
                            expiryMonth: method.card?.exp_month ?? match.expiryMonth,
                            expiryYear: method.card?.exp_year ?? match.expiryYear,
                        },
                    });
                    match.stripePaymentMethodId = method.id;
                }
            }
        } catch (err: any) {
            if (this.stripeService.isMissingStripeCustomer(err)) {
                await this.stripeService.clearStripeCustomerId(userId);
                for (const c of dbCards) c.stripePaymentMethodId = null;
            }
            this.logger.warn(`Stripe card sync failed for ${userId}: ${err?.message || err}`);
        }

        return dbCards;
    }

    /** Invalidate a single PaymentMethod link after confirm failure (client recovery). */
    async clearPaymentMethodLink(userId: string, paymentMethodId: string) {
        if (!paymentMethodId?.startsWith('pm_')) {
            return { cleared: 0 };
        }
        const result = await this.prisma.userCard.updateMany({
            where: { userId, stripePaymentMethodId: paymentMethodId },
            data: { stripePaymentMethodId: null },
        });
        return { cleared: result.count };
    }

    async addCard(userId: string, dto: CreateCardDto) {
        const existingCount = await this.prisma.userCard.count({
            where: { userId },
        });

        const isDefault = existingCount === 0;

        return this.prisma.userCard.create({
            data: {
                userId,
                last4: dto.last4,
                brand: dto.brand,
                expiryMonth: dto.expiryMonth,
                expiryYear: dto.expiryYear,
                cardHolderName: dto.cardHolderName,
                isDefault,
            },
        });
    }

    async deleteCard(userId: string, cardId: string) {
        const card = await this.prisma.userCard.findFirst({
            where: { id: cardId, userId },
        });

        if (!card) {
            throw new NotFoundException('Card not found');
        }

        await this.prisma.userCard.delete({
            where: { id: cardId },
        });

        if (card.isDefault) {
            const nextCard = await this.prisma.userCard.findFirst({
                where: { userId },
                orderBy: { createdAt: 'asc' },
            });
            if (nextCard) {
                await this.prisma.userCard.update({
                    where: { id: nextCard.id },
                    data: { isDefault: true },
                });
            }
        }

        return { success: true };
    }

    /**
     * Persist a card from a succeeded PaymentIntent (checkout / wallet sync).
     * Links stripePaymentMethodId so Quick Pay works on future checkouts.
     */
    async syncFromPaymentIntent(userId: string, paymentIntentId: string) {
        const stripe = this.stripeService.getStripeClient();
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['payment_method'],
        });

        if (intent.status !== 'succeeded') {
            return null;
        }

        const pmRaw = intent.payment_method;
        if (!pmRaw) return null;

        const paymentMethodId = typeof pmRaw === 'string' ? pmRaw : pmRaw.id;
        const cardDetails = typeof pmRaw === 'object' ? pmRaw.card : null;
        if (!cardDetails) return null;

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { stripeCustomerId: true, email: true, name: true },
        });

        let stripeCustomerId = user?.stripeCustomerId;
        if (!stripeCustomerId && user?.email) {
            stripeCustomerId = await this.stripeService.getOrCreateCustomer(
                userId,
                user.email,
                user.name ?? undefined,
            );
        }
        if (!stripeCustomerId) return null;

        await this.stripeService.attachPaymentMethod(paymentMethodId, stripeCustomerId);

        const existingByPm = await this.prisma.userCard.findFirst({
            where: { userId, stripePaymentMethodId: paymentMethodId },
        });
        if (existingByPm) return existingByPm;

        const existingByLast4 = await this.prisma.userCard.findFirst({
            where: { userId, last4: cardDetails.last4 },
        });
        if (existingByLast4) {
            return this.prisma.userCard.update({
                where: { id: existingByLast4.id },
                data: {
                    stripePaymentMethodId: paymentMethodId,
                    brand: cardDetails.brand ?? existingByLast4.brand,
                    expiryMonth: cardDetails.exp_month ?? existingByLast4.expiryMonth,
                    expiryYear: cardDetails.exp_year ?? existingByLast4.expiryYear,
                },
            });
        }

        const existingCount = await this.prisma.userCard.count({ where: { userId } });
        return this.prisma.userCard.create({
            data: {
                userId,
                last4: cardDetails.last4,
                brand: cardDetails.brand ?? 'card',
                expiryMonth: cardDetails.exp_month,
                expiryYear: cardDetails.exp_year,
                stripePaymentMethodId: paymentMethodId,
                isDefault: existingCount === 0,
            },
        });
    }

    async setDefaultCard(userId: string, cardId: string) {
        const card = await this.prisma.userCard.findFirst({
            where: { id: cardId, userId },
        });

        if (!card) {
            throw new NotFoundException('Card not found');
        }

        await this.prisma.$transaction([
            this.prisma.userCard.updateMany({
                where: { userId },
                data: { isDefault: false },
            }),
            this.prisma.userCard.update({
                where: { id: cardId },
                data: { isDefault: true },
            }),
        ]);

        return { success: true };
    }
}
