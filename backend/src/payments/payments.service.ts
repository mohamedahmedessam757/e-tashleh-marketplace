import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StripeService } from '../stripe/stripe.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { CreateIntentDto } from './dto/create-intent.dto';
import { AdminManualPayoutDto, PayoutMethod } from './dto/admin-payout.dto';
import { Prisma, ActorType, OfferFulfillmentStatus } from '@prisma/client';
import { EscrowService } from './escrow.service';
import { UnifiedFinancialEventDto, FinancialEventSource, FinancialDirection } from './dto/unified-financial-feed.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { OfferFulfillmentService } from '../orders/offer-fulfillment.service';
import {
    computeCompletedOrdersCount,
    computeLedgerNetProfit,
    computeMerchantEscrowBalances,
    computeMerchantGrossSales,
    reconcileStoreWalletFromEscrow,
} from './merchant-wallet-metrics.util';
import {
    escrowReleaseWindowEnd,
    isOrderEligibleForEscrowAutoRelease,
    isEscrowPaymentEligibleForAutoRelease,
} from './escrow-release-eligibility.util';
import {
    buildWithdrawalGovernance,
    countOpenMerchantCases,
} from './merchant-withdrawal-governance.util';
import { buildPayoutBankDetailsResponse, getPayoutReadiness, assertWithdrawalPayoutMethodReady, maskIban } from './payout-account.util';
import {
    buildActiveReferralWindowFilter,
    computeCustomerCompletedOrdersCount,
    computeCustomerTotalPurchases,
    computeLedgerNetRewards,
    computePendingLoyaltyFromOrders,
    computePendingReferralFromOrders,
    computeRefundedAmount,
    CUSTOMER_PENDING_ORDER_STATUSES,
    reconcileUserTotalSpent,
    REFERRAL_WINDOW_DAYS,
    splitRewardAggregates,
} from './customer-wallet-metrics.util';
import {
    computeAdminFinancialKpis,
    buildAdminDateRange,
    computeSalesTrend,
    computeTopSpenders,
    computeTopEarners,
} from './admin-financial-metrics.util';
import {
    getWalletTypeLabel,
    getWithdrawalLabel,
    getPaymentStatusLabel,
    getEscrowStatusLabel,
} from './financial-labels.ar';
import {
    fetchUnifiedFeedIndex,
    countUnifiedFeed,
    encodeFeedCursor,
} from './financial-feed.util';
import { buildOrderFinancialTimeline } from './order-financial-timeline.util';
import { CardsService } from '../cards/cards.service';
import {
    normalizeSearchQuery,
    normalizePhone,
    resolveUserIds,
    resolveStoreIds,
    resolveOrderIds,
    isUuid,
} from '../common/search/admin-entity-search.util';
import { FinancialConfigService } from '../common/financial-config.service';
import { WithdrawalWorkflowService } from './withdrawal-workflow.service';
import { InvoiceSnapshotService } from '../invoices/invoice-snapshot.service';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly escrowService: EscrowService,
        @Inject(forwardRef(() => StripeService))
        private readonly stripeService: StripeService,
        private readonly auditLogs: AuditLogsService,
        @Inject(forwardRef(() => OfferFulfillmentService))
        private readonly offerFulfillment: OfferFulfillmentService,
        private readonly cardsService: CardsService,
        private readonly financialConfig: FinancialConfigService,
        private readonly withdrawalWorkflow: WithdrawalWorkflowService,
        private readonly invoiceSnapshot: InvoiceSnapshotService,
    ) { }

    /**
     * Process a payment for a single offer within an order.
     * This is the core payment logic implementing:
     * 1. Ownership & status validation
     * 2. Commission calculation (25% of unitPrice, min 100 AED)
     * 3. Payment transaction recording
     * 4. Wallet distribution (merchant gets unitPrice+shipping, admin gets commission)
     * 5. Invoice generation
     * 6. Conditional order status transition (only if ALL accepted offers are paid)
     * 7. Notifications
     */
    async processPayment(customerId: string, dto: ProcessPaymentDto) {
        if (process.env.ALLOW_MOCK_PAYMENTS !== 'true') {
            throw new ForbiddenException('Mock payment API is disabled. Use Stripe.');
        }

        const { orderId, offerId, card } = dto;

        // 1. Fetch and validate order
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                offers: {
                    where: { status: 'accepted' },
                    include: { store: true, orderPart: true },
                },
            },
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.customerId !== customerId) throw new ForbiddenException('Not owner of this order');
        
        const validPaymentStatuses = ['AWAITING_PAYMENT', 'AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'PARTIALLY_PAID'];
        if (!validPaymentStatuses.includes(order.status)) {
            throw new BadRequestException(`Order is not in a valid payment status (Current: ${order.status})`);
        }

        // 2. Find the specific accepted offer AND validate it belongs to this order
        const offer = order.offers.find(o => o.id === offerId);
        if (!offer) {
            this.logger.warn(`Offer ${offerId} not found on order ${orderId}. Possible stale orderId.`);
            throw new NotFoundException(
                `Offer ${offerId} does not belong to order ${orderId}. Please refresh and try again.`,
            );
        }

        // 3. Fast-path guard: Check if this offer is already paid (soft check before DB constraint)
        const existingPayment = await this.prisma.paymentTransaction.findFirst({
            where: { offerId, status: 'SUCCESS' },
        });
        if (existingPayment) {
            throw new ConflictException('This offer has already been paid');
        }

        // 4. Calculate amounts
        const unitPrice = Number(offer.unitPrice);
        const shippingCost = Number(offer.shippingCost);
        const commission = await this.financialConfig.computeCommissionForPrice(unitPrice);
        const totalAmount = unitPrice + shippingCost + commission;
        const finConfig = await this.financialConfig.getConfig();
        const displayCurrency = finConfig.supportedCurrencies[0] || 'AED';

        // 5. Validate card (basic â€” in production this would be Stripe)
        const cardNumber = card.number.replace(/\s/g, '');
        if (cardNumber.length < 13 || cardNumber.length > 19) {
            throw new BadRequestException('Invalid card number');
        }

        // 6. Determine card brand
        const cardBrand = this.detectCardBrand(cardNumber);
        const cardLast4 = cardNumber.slice(-4);

        // 7. Execute atomic transaction (wrapped in try/catch for unique constraint safety)
        let result;
        try {
            result = await this.prisma.$transaction(async (tx) => {
                // 7a. Generate transaction number
                const txnResult = await tx.$queryRaw<{ generate_transaction_number: string }[]>`SELECT generate_transaction_number()`;
                const transactionNumber = txnResult[0].generate_transaction_number;

                // 7b. Create payment transaction with SUCCESS
                const payment = await tx.paymentTransaction.create({
                    data: {
                        transactionNumber,
                        orderId,
                        offerId,
                        customerId,
                        unitPrice,
                        shippingCost,
                        commission,
                        totalAmount,
                        currency: displayCurrency,
                        displayCurrency,
                        fxRate: 1,
                        cardLast4,
                        cardBrand,
                        cardHolder: card.holder.toUpperCase(),
                        status: 'SUCCESS',
                        paidAt: new Date(),
                    },
                });

                await tx.offer.update({
                    where: { id: offerId },
                    data: { fulfillmentStatus: OfferFulfillmentStatus.IN_PREPARATION },
                });

                // 7b-i. Note: TotalSpent and LoyaltyPoints are now updated upon Order COMPLETION 
                // in OrdersService/LoyaltyService to ensure return period has passed.


                // 7c. Credit merchant wallet (unitPrice + shippingCost)
                const merchantAmount = unitPrice + shippingCost;
                const store = offer.store;

                if (store) {
                    const newStoreBalance = Number(store.balance) + merchantAmount;

                    await tx.store.update({
                        where: { id: store.id },
                        data: { balance: newStoreBalance },
                    });

                    await tx.walletTransaction.create({
                        data: {
                            userId: store.ownerId,
                            role: 'VENDOR',
                            paymentId: payment.id,
                            type: 'CREDIT',
                            amount: merchantAmount,
                            currency: 'AED',
                            description: `Payment for offer #${offer.offerNumber} â€” Order #${order.orderNumber}`,
                            balanceAfter: newStoreBalance,
                        },
                    });
                }

                // 7d. Credit admin commission (to a system wallet record)
                await tx.walletTransaction.create({
                    data: {
                        userId: customerId, // placeholder: in production use ADMIN user ID
                        role: 'ADMIN',
                        paymentId: payment.id,
                        type: 'CREDIT',
                        amount: commission,
                        currency: 'AED',
                        description: `Commission for offer #${offer.offerNumber} â€” Order #${order.orderNumber}`,
                        balanceAfter: commission, // placeholder â€” in production track admin balance
                    },
                });

                // 7e. Generate invoice bundle (MASTER + PART + COMMISSION + SHIPPING)
                const companySnap = await this.resolveCompanySnapshot(tx);
                const partName =
                    (offer as any).orderPart?.name ||
                    (order as any).partName ||
                    'Spare Part';
                const bundle = await this.invoiceSnapshot.ensurePaymentInvoiceBundle(tx, {
                    orderId,
                    paymentId: payment.id,
                    customerId,
                    unitPrice,
                    shippingCost,
                    commission,
                    totalAmount,
                    currency: 'AED',
                    partName,
                    shippingType: (order as any).shippingType || null,
                    cartShipmentId: (offer as any).cartShipmentId || null,
                    offerId,
                    platformLegalNameEn: companySnap.legalNameEn,
                    platformLegalNameAr: companySnap.legalNameAr,
                    actorId: customerId,
                });
                const invoiceNumber = bundle.masterInvoiceNumber;

                // 7f. Check if ALL accepted offers are now paid
                const allAcceptedOfferIds = order.offers.map(o => o.id);
                const paidCount = await tx.paymentTransaction.count({
                    where: {
                        offerId: { in: allAcceptedOfferIds },
                        status: 'SUCCESS',
                    },
                });

                const allPaid = paidCount >= allAcceptedOfferIds.length;
                const orderTransitioned = false;

                // Audit Log (2026 Payment Success)
                await this.auditLogs.logAction({
                    orderId,
                    action: 'PAYMENT_SUCCESS',
                    entity: 'PaymentTransaction',
                    actorType: ActorType.CUSTOMER,
                    actorId: customerId,
                    metadata: {
                        offerId,
                        transactionNumber,
                        amount: totalAmount,
                        commission,
                        orderTransitioned
                    },
                    newState: 'SUCCESS'
                }, tx);

                return {
                    payment,
                    invoiceNumber,
                    transactionNumber,
                    allPaid,
                    orderTransitioned,
                    remainingOffers: allAcceptedOfferIds.length - paidCount,
                };
            }, { timeout: 20000 });
        } catch (error) {
            // Handle Prisma unique constraint violation (race condition safety net)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                this.logger.warn(`Duplicate payment attempt for offer ${offerId} caught by DB constraint`);
                throw new ConflictException('This offer has already been paid (duplicate detected)');
            }
            throw error; // Re-throw any other errors
        }

        try {
            const aggStatus = await this.offerFulfillment.recomputeOrderStatus(orderId);
            result.orderTransitioned = aggStatus === 'PREPARATION';
        } catch (recomputeErr: any) {
            this.logger.warn(
                `Fulfillment recompute after mock payment failed: ${recomputeErr?.message}`,
            );
        }

        // 8. Send notifications (outside transaction for performance)
        try {
            // Notify customer with "Premium" encouraging tone
            await this.notifications.create({
                recipientId: customerId,
                recipientRole: 'CUSTOMER',
                type: 'payment',
                titleAr: 'تم الدفع بنجاح! 🎉',
                titleEn: 'Payment Successful! 🎉',
                messageAr: `اختيار رائع! 👌 تم دفع ${totalAmount} درهم بنجاح للعرض #${offer.offerNumber}. نحن الآن بصدد البدء في تجهيز طلبك.`,
                messageEn: `Great choice! 👌 Payment of AED ${totalAmount} successful for offer #${offer.offerNumber}. We are now starting to prepare your order.`,
                link: 'checkout',
                metadata: {
                    orderId,
                    offerId,
                    amount: totalAmount,
                    invoiceNumber: result.invoiceNumber,
                    orderNumber: order.orderNumber,
                    waEvent: 'INVOICE_ISSUED',
                },
            });

            // Notify merchant with professional financial alert
            if (offer.store) {
                await this.notifications.create({
                    recipientId: offer.store.ownerId,
                    recipientRole: 'VENDOR',
                    type: 'payment',
                    titleAr: 'مبيعة جديدة! 💰',
                    titleEn: 'New Sale! 💰',
                    messageAr: `ممتاز! تم دفع الطلب #${order.orderNumber}. المبلغ المضاف لحسابك: ${unitPrice + shippingCost} درهم. يرجى البدء في التجهيز.`,
                    messageEn: `Excellent! Payment received for Order #${order.orderNumber}. Amount credited: AED ${unitPrice + shippingCost}. Please start preparation.`,
                    link: 'active-orders',
                    metadata: {
                        orderId,
                        offerId,
                        amount: unitPrice + shippingCost,
                        invoiceNumber: result.invoiceNumber,
                        orderNumber: order.orderNumber,
                        waEvent: 'INVOICE_ISSUED',
                    },
                });
            }
        } catch (notifError) {
            // Don't fail the payment if notification fails
            console.error('Notification error after payment:', notifError);
        }

        return {
            success: true,
            transactionNumber: result.transactionNumber,
            invoiceNumber: result.invoiceNumber,
            totalAmount,
            allPaid: result.allPaid,
            orderTransitioned: result.orderTransitioned,
            remainingOffers: result.remainingOffers,
        };
    }
    
    /**
     * Phase 1: Create a Stripe PaymentIntent for the frontend to confirm.
     * This registers a PENDING transaction and returns the clientSecret.
     */
    async createPaymentIntent(customerId: string, dto: CreateIntentDto) {
        const { orderId, offerId } = dto;

        // 1. Fetch and validate order
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                offers: {
                    where: { id: offerId, status: 'accepted' },
                    include: { store: true },
                },
            },
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.customerId !== customerId) throw new ForbiddenException('Not owner of this order');
        const validPaymentStatuses = ['AWAITING_PAYMENT', 'AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'PARTIALLY_PAID'];
        if (!validPaymentStatuses.includes(order.status)) {
            throw new BadRequestException(`Order is not in a valid payment status (Current: ${order.status})`);
        }

        const offer = order.offers[0];
        if (!offer) {
            throw new NotFoundException(`Accepted offer ${offerId} not found on order ${orderId}`);
        }

        // 2. Check existing payment row (SUCCESS blocks; PENDING may be reused)
        const existingPayment = await this.prisma.paymentTransaction.findUnique({
            where: { offerId },
        });
        if (existingPayment?.status === 'SUCCESS') {
            throw new ConflictException('This offer has already been paid');
        }

        // 3. Calculate amounts (Simplified: Offer Price is ALL-INCLUSIVE)
        const unitPrice = Number(offer.unitPrice);
        const shippingCost = Number(offer.shippingCost);
        const commission = await this.financialConfig.computeCommissionForPrice(unitPrice);
        
        // Total amount charged to customer = unitPrice + shippingCost + commission (Full price from OfferCard)
        const totalAmount = unitPrice + shippingCost + commission;
        const amountCents = Math.round(totalAmount * 100);

        if (!Number.isFinite(totalAmount) || !Number.isFinite(amountCents) || amountCents < 200) {
            throw new BadRequestException(
                `Invalid payment amount (${totalAmount}). Minimum charge is 2.00 AED.`,
            );
        }

        // 4. Handle Stripe Customer (2026 Saved Card Logic)
        const user = await this.prisma.user.findUnique({
            where: { id: customerId },
            select: { email: true, name: true }
        });
        if (!user) {
            throw new NotFoundException('Customer not found');
        }
        if (!user.email) {
            throw new BadRequestException('Customer email is required for payment processing');
        }

        let stripeCustomerId: string;
        let intent: any;
        const intentMetadata = {
            orderId,
            offerId,
            customerId,
            orderNumber: order.orderNumber,
            offerNumber: offer.offerNumber,
        };

        try {
            stripeCustomerId = await this.stripeService.getOrCreateCustomer(
                customerId,
                user.email,
                user.name,
            );

            // 5. Stripe PaymentIntent — reuse open PENDING intent when possible (avoids duplicate intents on retry)
            intent = await this.resolveOrCreateStripeIntent(
                existingPayment?.stripePaymentId,
                existingPayment?.status,
                Number(existingPayment?.totalAmount ?? 0),
                totalAmount,
                amountCents,
                intentMetadata,
                stripeCustomerId,
            );
        } catch (err: any) {
            const errMsg = String(err?.message || '');
            const staleCustomer =
                this.stripeService.isMissingStripeCustomer(err) ||
                /no such customer/i.test(errMsg);

            if (staleCustomer) {
                this.logger.warn(
                    `Stale Stripe customer for user ${customerId}; clearing and recreating PaymentIntent`,
                );
                try {
                    await this.stripeService.clearStripeCustomerId(customerId);
                    stripeCustomerId = await this.stripeService.getOrCreateCustomer(
                        customerId,
                        user.email,
                        user.name,
                    );
                    // Do not reuse PENDING intents bound to the deleted customer
                    intent = await this.stripeService.createPaymentIntent(
                        totalAmount.toString(),
                        'AED',
                        intentMetadata,
                        stripeCustomerId,
                    );
                } catch (retryErr: any) {
                    const retryMsg = retryErr?.message || 'Stripe payment initialization failed';
                    throw new BadRequestException(
                        /Stripe|card|amount|customer/i.test(retryMsg)
                            ? retryMsg
                            : `Payment provider error: ${retryMsg}`,
                    );
                }
            } else if (
                err instanceof BadRequestException ||
                err instanceof NotFoundException ||
                err instanceof ForbiddenException ||
                err instanceof ConflictException
            ) {
                throw err;
            } else {
                const stripeMsg = errMsg || 'Stripe payment initialization failed';
                throw new BadRequestException(
                    stripeMsg.includes('Stripe') ||
                        stripeMsg.includes('card') ||
                        stripeMsg.includes('amount') ||
                        stripeMsg.includes('customer')
                        ? stripeMsg
                        : `Payment provider error: ${stripeMsg}`,
                );
            }
        }

        // 6. Record PENDING transaction — atomic upsert (race-safe vs concurrent prefetch + pay clicks)
        const isNewPaymentRow = !existingPayment;
        try {
            await this.prisma.$transaction(async (tx) => {
                const txnResult = await tx.$queryRaw<{ generate_transaction_number: string }[]>`SELECT generate_transaction_number()`;
                const transactionNumber = txnResult?.[0]?.generate_transaction_number;
                if (!transactionNumber) {
                    throw new BadRequestException('Failed to generate transaction number');
                }

                await tx.paymentTransaction.upsert({
                    where: { offerId },
                    create: {
                        transactionNumber,
                        orderId,
                        offerId,
                        customerId,
                        unitPrice,
                        shippingCost,
                        commission,
                        totalAmount,
                        currency: 'AED',
                        stripePaymentId: intent.id,
                        status: 'PENDING',
                    },
                    update: {
                        stripePaymentId: intent.id,
                        status: 'PENDING',
                        totalAmount,
                        unitPrice,
                        shippingCost,
                        commission,
                    },
                });

                if (isNewPaymentRow) {
                    await this.auditLogs.logAction({
                        orderId,
                        action: 'PAYMENT_INTENT_CREATED',
                        entity: 'PaymentTransaction',
                        actorType: ActorType.CUSTOMER,
                        actorId: customerId,
                        metadata: {
                            offerId,
                            amount: totalAmount,
                            stripeIntentId: intent.id,
                        },
                    }, tx);
                }
            }, { timeout: 20000 });
        } catch (error) {
            // Safety net: concurrent requests can still race before upsert lands (extremely rare)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                this.logger.warn(
                    `Payment intent race on offer ${offerId} â€” reconciling with update instead of failing`,
                );
                await this.prisma.paymentTransaction.update({
                    where: { offerId },
                    data: {
                        stripePaymentId: intent.id,
                        status: 'PENDING',
                        totalAmount,
                        unitPrice,
                        shippingCost,
                        commission,
                    },
                });
            } else {
                throw error;
            }
        }

        return {
            clientSecret: intent.client_secret,
            paymentIntentId: intent.id,
            totalAmount,
            currency: 'AED'
        };
    }

    /**
     * Phase 2: Create a Stripe PaymentIntent for RETURN/DISPUTE shipping costs.
     */
    async createShippingPaymentIntent(userId: string, caseId: string, caseType: 'return' | 'dispute') {
        const model = caseType === 'return' ? this.prisma.returnRequest : this.prisma.dispute;
        
        const caseRecord = await (model as any).findUnique({
            where: { id: caseId },
            include: { 
                store: true,
                order: true 
            }
        });

        if (!caseRecord) throw new NotFoundException('Case not found');
        
        // Validation: Is this user the one obligated to pay?
        const isMerchant = caseRecord.shippingPayee === 'MERCHANT';
        const isCustomer = caseRecord.shippingPayee === 'CUSTOMER';
        
        if (isMerchant) {
            const store = await this.prisma.store.findUnique({ where: { ownerId: userId } });
            if (!store || store.id !== caseRecord.storeId) {
                throw new ForbiddenException('You are not the merchant assigned to this shipping payment');
            }
        } else if (isCustomer) {
            if (caseRecord.customerId !== userId) {
                throw new ForbiddenException('You are not the customer assigned to this shipping payment');
            }
        } else {
            throw new BadRequestException('No shipping payee assigned to this case');
        }

        const shippingAmount = Number(caseRecord.shippingRefund || 0);
        if (shippingAmount <= 0) throw new BadRequestException('No shipping cost to pay');
        
        if (caseRecord.shippingPaymentStatus === 'PAID') {
            throw new BadRequestException('Shipping already paid');
        }

        // Create Stripe Intent
        const intent = await this.stripeService.createPaymentIntent(
            shippingAmount.toString(),
            'AED',
            {
                caseId,
                caseType,
                isShippingPayment: 'true',
                orderId: caseRecord.orderId,
                orderNumber: caseRecord.order?.orderNumber
            }
        );

        // Record intent ID in the case record
        await (model as any).update({
            where: { id: caseId },
            data: { shippingStripeId: intent.id }
        });

        return {
            clientSecret: intent.client_secret,
            paymentIntentId: intent.id,
            amount: shippingAmount,
            currency: 'AED'
        };
    }
    async createShippingCheckoutSession(userId: string, caseId: string, caseType: 'return' | 'dispute', frontendUrl?: string) {
        const model = caseType === 'return' ? this.prisma.returnRequest : this.prisma.dispute;
        
        const caseRecord = await (model as any).findUnique({
            where: { id: caseId },
            include: { 
                customer: true,
                order: true 
            }
        });

        if (!caseRecord) throw new NotFoundException('Case not found');
        
        // Validation
        const isMerchant = caseRecord.shippingPayee === 'MERCHANT';
        const isCustomer = caseRecord.shippingPayee === 'CUSTOMER';
        
        if (isMerchant) {
            const store = await this.prisma.store.findUnique({ where: { ownerId: userId } });
            if (!store || store.id !== caseRecord.storeId) {
                throw new ForbiddenException('You are not the merchant assigned to this shipping payment');
            }
        } else if (isCustomer) {
            if (caseRecord.customerId !== userId) {
                throw new ForbiddenException('You are not the customer assigned to this shipping payment');
            }
        }

        const shippingAmount = Number(caseRecord.shippingRefund || 0);
        if (shippingAmount <= 0) throw new BadRequestException('No shipping cost to pay');

        const baseUrl = (frontendUrl || process.env.FRONTEND_URL || 'https://e-tashleh.net').replace(
            /\/$/,
            '',
        );
        const returnPath =
            caseType === 'dispute'
                ? `/dashboard/dispute-details/${caseId}`
                : `/dashboard/resolution`;
        const successUrl = `${baseUrl}${returnPath}?payment=success&caseId=${caseId}&caseType=${caseType}`;
        const cancelUrl = `${baseUrl}${returnPath}?payment=cancel&caseId=${caseId}&caseType=${caseType}`;

        const session = await this.stripeService.createCheckoutSession({
            amount: shippingAmount.toString(),
            currency: 'AED',
            successUrl,
            cancelUrl,
            customerEmail: caseRecord.customer?.email,
            metadata: {
                caseId,
                caseType,
                isShippingPayment: 'true',
                orderId: caseRecord.orderId,
                orderNumber: caseRecord.order?.orderNumber
            }
        });

        // Record session ID in the case record for tracking
        await (model as any).update({
            where: { id: caseId },
            data: { shippingStripeId: session.id }
        });

        return { url: session.url };
    }

    /**
     * Phase 2: Webhook Fulfillment
     * Finalizes the payment, credits wallets, generates invoices, and holds funds in escrow.
     * Triggered by Stripe Webhook (payment_intent.succeeded)
     */
    async fulfillStripePayment(paymentIntentId: string) {
        // 1. Find the pending transaction
        const payment = await this.prisma.paymentTransaction.findFirst({
            where: { stripePaymentId: paymentIntentId }, // Removed redundant 'status: PENDING' to allow idempotency checks inside the transaction
            include: { 
                order: true, 
                offer: { 
                    include: { store: true, orderPart: true } 
                } 
            }
        });

        if (!payment) {
            // Check if it's a shipping payment intent (these aren't in paymentTransaction table)
            const intent = await this.stripeService.getStripeClient().paymentIntents.retrieve(paymentIntentId);
            if (intent.metadata?.isShippingPayment === 'true') {
                return await this.fulfillShippingPayment(intent);
            }

            this.logger.warn(`Stripe payment fulfillment failed: Record not found for intent ${paymentIntentId}`);
            return;
        }

        // Never credit wallets / advance fulfillment on cancelled or closed orders.
        // If Stripe already captured funds, ops must refund — do not auto-fulfill.
        const blockedFulfillStatuses = new Set([
            'CANCELLED',
            'REFUNDED',
            'CLOSED',
            'RETURNED',
            'EXPIRED',
            'REJECTED',
        ]);
        const orderStatus = String(payment.order?.status || '').toUpperCase();
        if (blockedFulfillStatuses.has(orderStatus)) {
            this.logger.error(
                `Refusing Stripe fulfillment for ${paymentIntentId}: order ${payment.orderId} is ${orderStatus}. Manual refund review required.`,
            );
            throw new BadRequestException(
                `Cannot fulfill payment — order is ${orderStatus}. Contact support for refund review.`,
            );
        }

        const stripeClient = this.stripeService.getStripeClient();
        const intentSnapshot = await stripeClient.paymentIntents.retrieve(paymentIntentId);
        const expectedMinor = Math.round(Number(payment.totalAmount) * 100);
        if (
            intentSnapshot.status === 'succeeded' &&
            typeof intentSnapshot.amount_received === 'number' &&
            intentSnapshot.amount_received !== expectedMinor
        ) {
            this.logger.error(
                `Stripe amount mismatch for ${paymentIntentId}: expected ${expectedMinor}, received ${intentSnapshot.amount_received}`,
            );
            throw new Error('Stripe payment amount does not match recorded transaction');
        }

        // 2. Atomic Database Transaction â€” claim PENDING â†’ SUCCESS once (webhook + confirm-intent safe)
        const result = await this.prisma.$transaction(async (tx) => {
            const claim = await tx.paymentTransaction.updateMany({
                where: { id: payment.id, status: 'PENDING' },
                data: {
                    status: 'SUCCESS',
                    paidAt: new Date(),
                    gatewayFee: 0,
                },
            });

            if (claim.count === 0) {
                const existing = await tx.paymentTransaction.findUnique({
                    where: { id: payment.id },
                    select: { status: true },
                });
                if (existing?.status === 'SUCCESS') {
                    this.logger.log(`Payment intent ${paymentIntentId} already fulfilled. Skipping.`);
                    return null;
                }
                throw new BadRequestException(
                    `Payment cannot be fulfilled (status: ${existing?.status ?? 'unknown'})`,
                );
            }

            const updatedPayment = await tx.paymentTransaction.findUnique({
                where: { id: payment.id },
            });
            if (!updatedPayment) {
                throw new BadRequestException('Payment record missing after fulfillment claim');
            }

            await tx.offer.update({
                where: { id: payment.offerId },
                data: { fulfillmentStatus: OfferFulfillmentStatus.IN_PREPARATION },
            });

            // b. Execute Financial Flow (Wallet & Escrow)
            const unitPrice = Number(payment.unitPrice);
            const shippingCost = Number(payment.shippingCost);
            const commission = Number(payment.commission);
            
            // Merchant Net Share = unitPrice (the basePrice set by merchant)
            // Commission and shipping are ADDED on top and belong to the platform
            const merchantNetShare = unitPrice;

            // Hold funds in Escrow (using the shared tx client for atomicity)
            // Admin share consists of commission + shippingCost
            await this.escrowService.holdFunds(
                payment.id, 
                payment.orderId, 
                payment.offer.storeId, 
                {
                    merchantAmount: merchantNetShare,
                    shippingAmount: shippingCost,
                    commissionAmount: commission,
                    gatewayFee: 0
                },
                tx
            );

            // Credit Merchant Wallet (Create transaction record for net amount)
            const updatedStore = await tx.store.findUnique({
                where: { id: payment.offer.storeId },
                select: { pendingBalance: true },
            });
            const vendorWalletExists = await tx.walletTransaction.findFirst({
                where: {
                    paymentId: payment.id,
                    role: 'VENDOR',
                    type: 'CREDIT',
                    transactionType: 'PAYMENT',
                },
                select: { id: true },
            });
            if (!vendorWalletExists) {
                await tx.walletTransaction.create({
                    data: {
                        userId: payment.offer.store.ownerId,
                        role: 'VENDOR',
                        paymentId: payment.id,
                        type: 'CREDIT',
                        transactionType: 'PAYMENT',
                        amount: merchantNetShare,
                        currency: 'AED',
                        description: `Net payout for offer #${payment.offer.offerNumber} (Excludes Admin Commission & Shipping) â€” Order #${payment.order.orderNumber}`,
                        balanceAfter: Number(updatedStore?.pendingBalance ?? payment.offer.store.pendingBalance ?? 0),
                    },
                });
            }

            // Admin commission ledger entry (visible in financial feed immediately)
            if (commission > 0) {
                const commissionExists = await tx.walletTransaction.findFirst({
                    where: {
                        paymentId: payment.id,
                        role: 'ADMIN',
                        type: 'CREDIT',
                        transactionType: 'COMMISSION',
                    },
                    select: { id: true },
                });
                if (!commissionExists) {
                    const adminUser = await tx.user.findFirst({
                        where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
                        select: { id: true },
                        orderBy: { createdAt: 'asc' },
                    });
                    const platformWallet = await tx.platformWallet.findFirst({
                        select: { commissionBalance: true },
                    });
                    await tx.walletTransaction.create({
                        data: {
                            userId: adminUser?.id ?? payment.customerId,
                            role: 'ADMIN',
                            paymentId: payment.id,
                            type: 'CREDIT',
                            transactionType: 'COMMISSION',
                            amount: commission,
                            currency: 'AED',
                            description: `Platform commission for offer #${payment.offer.offerNumber} â€” Order #${payment.order.orderNumber}`,
                            balanceAfter: Number(platformWallet?.commissionBalance ?? commission),
                        },
                    });
                }
            }

            // c. Generate Invoice bundle (MASTER + PART + COMMISSION + SHIPPING)
            let invoiceNumber: string | undefined;
            const companySnap = await this.resolveCompanySnapshot(tx);
            const partName =
                (payment.offer as any)?.orderPart?.name ||
                (payment.order as any)?.partName ||
                'Spare Part';
            const bundle = await this.invoiceSnapshot.ensurePaymentInvoiceBundle(tx, {
                orderId: payment.orderId,
                paymentId: payment.id,
                customerId: payment.customerId,
                unitPrice,
                shippingCost,
                commission,
                totalAmount: Number(payment.totalAmount),
                currency: 'AED',
                partName,
                shippingType: (payment.order as any)?.shippingType || null,
                cartShipmentId: (payment.offer as any)?.cartShipmentId || null,
                offerId: payment.offerId,
                platformLegalNameEn: companySnap.legalNameEn,
                platformLegalNameAr: companySnap.legalNameAr,
                actorId: payment.customerId,
            });
            invoiceNumber = bundle.masterInvoiceNumber;

            // d. Check if ALL accepted offers are now paid
            const allAcceptedOffers = await tx.offer.findMany({
                where: { orderId: payment.orderId, status: 'accepted' },
                select: { id: true }
            });
            
            const paidCount = await tx.paymentTransaction.count({
                where: { 
                    orderId: payment.orderId, 
                    status: 'SUCCESS' 
                }
            });

            const orderTransitioned = paidCount >= allAcceptedOffers.length;

            return {
                payment: updatedPayment,
                invoiceNumber,
                orderTransitioned,
                storeOwnerId: payment.offer.store.ownerId,
                totalAmount: Number(payment.totalAmount),
                offerNumber: payment.offer.offerNumber,
                orderNumber: payment.order.orderNumber,
                customerId: payment.customerId,
                orderId: payment.orderId,
                unitPrice,
                shippingCost
            };
        }, { timeout: 60000 });

        // 3. Post-Transaction Notifications (Outside the DB lock for performance)
        if (result) {
            const { payment, invoiceNumber, orderTransitioned, storeOwnerId, totalAmount, offerNumber, orderNumber, customerId, orderId, unitPrice, shippingCost } = result as any;

            // Save card for future Quick Pay (non-blocking)
            this.cardsService.syncFromPaymentIntent(customerId, paymentIntentId).catch((err) =>
                this.logger.warn(`Card sync after payment failed: ${err?.message}`),
            );

            await this.offerFulfillment.recomputeOrderStatus(orderId).catch((err) =>
                this.logger.warn(`Fulfillment recompute after payment failed: ${err?.message}`),
            );

            // Notify Merchant
            if (orderTransitioned) {
                await this.notifications.create({
                    recipientId: storeOwnerId,
                    recipientRole: 'VENDOR',
                    titleAr: 'طلب جديد جاهز للتجهيز! 📦',
                    titleEn: 'New Order Ready for Preparation! 📦',
                    messageAr: `تم دفع قيمة الطلب #${orderNumber}. يرجى البدء في تجهيز القطع للشحن.`,
                    messageEn: `Payment for Order #${orderNumber} confirmed. Please start preparing parts for shipment.`,
                    type: 'payment',
                    link: `/merchant/orders/${orderId}`,
                    metadata: {
                        orderId,
                        invoiceNumber,
                        orderNumber,
                        amount: totalAmount,
                        waEvent: 'INVOICE_ISSUED',
                    },
                }).catch(() => {});

                this.notifications.notifyAdmins({
                    titleAr: 'تم سداد طلب بنجاح 💵',
                    titleEn: 'Order Payment Successful 💵',
                    messageAr: `تم سداد مبلغ ${totalAmount} درهم للطلب #${orderNumber}.`,
                    messageEn: `Payment of AED ${totalAmount} confirmed for Order #${orderNumber}.`,
                    type: 'PAYMENT',
                    link: `/admin/orders/${orderId}`,
                    metadata: { orderId, amount: totalAmount }
                }).catch(() => {});
            }

            // Final Notification to customer
            await this.notifications.create({
                recipientId: customerId,
                recipientRole: 'CUSTOMER',
                type: 'payment',
                titleAr: 'تم الدفع بنجاح! 🎉',
                titleEn: 'Payment Successful! 🎉',
                messageAr: `تم دفع ${totalAmount} درهم بنجاح للعرض #${offerNumber}. نحن الآن نجهز طلبك.`,
                messageEn: `Payment of AED ${totalAmount} successful for offer #${offerNumber}. Preparation started.`,
                link: 'checkout',
                metadata: {
                    orderId,
                    invoiceNumber,
                    orderNumber,
                    amount: totalAmount,
                    waEvent: 'INVOICE_ISSUED',
                },
            }).catch(() => {});
        }
    }

    /**
     * Handle payment failures from Stripe.
     * Triggered by payment_intent.payment_failed
     */
    async handlePaymentFailure(paymentIntentId: string) {
        const payment = await this.prisma.paymentTransaction.findFirst({
            where: { stripePaymentId: paymentIntentId },
            include: { order: true }
        });

        if (!payment) return;

        // Idempotency check: don't overwrite success or already failed status
        if (payment.status !== 'PENDING') return;

        await this.prisma.paymentTransaction.update({
            where: { id: payment.id },
            data: { status: 'FAILED' }
        });

        // Notify customer about the failure
        await this.notifications.create({
            recipientId: payment.customerId,
            recipientRole: 'CUSTOMER',
            type: 'payment',
            titleAr: 'Ø¹Ø°Ø±Ø§Ù‹ØŒ ÙØ´Ù„Øª Ø¹Ù…Ù„ÙŠØ© Ø§Ù„Ø¯ÙØ¹ âŒ',
            titleEn: 'Payment Failed âŒ',
            messageAr: `Ù„Ù… Ù†ØªÙ…ÙƒÙ† Ù…Ù† Ø¥ØªÙ…Ø§Ù… Ø¹Ù…Ù„ÙŠØ© Ø§Ù„Ø¯ÙØ¹ Ù„Ù„Ø·Ù„Ø¨ #${payment.order.orderNumber}. ÙŠØ±Ø¬Ù‰ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù…Ø±Ø© Ø£Ø®Ø±Ù‰ Ø£Ùˆ Ø§Ø³ØªØ®Ø¯Ø§Ù… ÙˆØ³ÙŠÙ„Ø© Ø¯ÙØ¹ Ù…Ø®ØªÙ„ÙØ©.`,
            messageEn: `We couldn't process your payment for Order #${payment.order.orderNumber}. Please try again or use a different payment method.`,
            link: `checkout?orderId=${payment.orderId}`,
            metadata: { orderId: payment.orderId, failureReason: 'STRIPE_FAILURE' }
        });
    }

    async handleStripeChargeRefunded(charge: {
        payment_intent?: string | { id?: string } | null;
        amount_refunded?: number;
        amount?: number;
    }) {
        const piRaw = charge.payment_intent;
        const piId = typeof piRaw === 'string' ? piRaw : piRaw?.id;
        if (!piId || charge.amount_refunded == null || charge.amount == null) return;

        const payment = await this.prisma.paymentTransaction.findFirst({
            where: { stripePaymentId: piId },
        });
        if (!payment) {
            this.logger.warn(`Refund webhook: no payment row for PI ${piId}`);
            return;
        }

        const refundedMajor = charge.amount_refunded / 100;
        const fullRefund = charge.amount_refunded >= charge.amount;

        await this.prisma.$transaction(async (tx) => {
            await tx.paymentTransaction.update({
                where: { id: payment.id },
                data: {
                    refundedAmount: refundedMajor,
                    refundedAt: fullRefund ? new Date() : payment.refundedAt ?? new Date(),
                    refundReason: payment.refundReason || 'STRIPE_CHARGE_REFUNDED',
                    ...(fullRefund ? { status: 'REFUNDED' } : {}),
                },
            });

            if (fullRefund) {
                await this.invoiceSnapshot.markPaymentInvoicesRefunded(tx, payment.id);
            }
        });
    }

    /**
     * Get the current status of a payment for an offer.
     * Used by the frontend to verify status before/after Stripe redirection.
     * (2026 Resilient Sync)
     */
    async getPaymentStatus(customerId: string, offerId: string) {
        const payment = await this.prisma.paymentTransaction.findUnique({
            where: { offerId },
            include: { order: true }
        });

        // Soft miss: checkout sync probes every accepted offer before any intent exists.
        // Returning NONE avoids noisy 404s and is not an authorization leak (owner checked below).
        if (!payment) {
            const offer = await this.prisma.offer.findUnique({
                where: { id: offerId },
                select: {
                    id: true,
                    orderId: true,
                    order: { select: { customerId: true, status: true } },
                },
            });
            if (!offer) throw new NotFoundException('Offer not found');
            if (offer.order.customerId !== customerId) {
                throw new ForbiddenException('Not owner of this payment');
            }
            return {
                status: 'NONE',
                paidAt: null,
                transactionNumber: null,
                totalAmount: null,
                orderId: offer.orderId,
                orderStatus: offer.order.status,
            };
        }

        if (payment.customerId !== customerId) throw new ForbiddenException('Not owner of this payment');

        return {
            status: payment.status,
            paidAt: payment.paidAt,
            transactionNumber: payment.transactionNumber,
            totalAmount: payment.totalAmount,
            orderId: payment.orderId,
            orderStatus: payment.order.status
        };
    }

    /**
     * Client-side fallback when Stripe succeeds but the webhook is delayed or unavailable.
     * Verifies the PaymentIntent with Stripe and runs fulfillStripePayment if still PENDING.
     */
    async confirmPaymentIntentFromClient(customerId: string, paymentIntentId: string) {
        if (!paymentIntentId?.trim()) {
            throw new BadRequestException('paymentIntentId is required');
        }

        const payment = await this.prisma.paymentTransaction.findFirst({
            where: { stripePaymentId: paymentIntentId },
            select: { id: true, customerId: true, status: true },
        });

        if (!payment) {
            throw new NotFoundException('Payment record not found for this intent');
        }
        if (payment.customerId !== customerId) {
            throw new ForbiddenException('Not owner of this payment');
        }
        if (payment.status === 'SUCCESS') {
            return { status: 'SUCCESS', alreadyFulfilled: true };
        }

        const stripeClient = this.stripeService.getStripeClient();
        const intent = await stripeClient.paymentIntents.retrieve(paymentIntentId);

        if (intent.status === 'succeeded') {
            await this.fulfillStripePayment(paymentIntentId);
            return { status: 'SUCCESS', fulfilled: true };
        }
        if (intent.status === 'processing') {
            return { status: 'PROCESSING' };
        }

        return { status: intent.status };
    }

    /**
     * Phase 2: Fulfill Shipping Payment (Return/Dispute)
     */
    private async fulfillShippingPayment(intent: any) {
        const { caseId, caseType } = intent.metadata || {};
        if (!caseId || !caseType) {
            this.logger.warn('Shipping fulfillment missing case metadata');
            return;
        }

        const caseBefore =
            caseType === 'return'
                ? await this.prisma.returnRequest.findUnique({ where: { id: caseId } })
                : await this.prisma.dispute.findUnique({ where: { id: caseId } });
        if (!caseBefore) {
            this.logger.warn(`Shipping case record missing for ${caseId}`);
            return;
        }
        if (
            caseBefore.shippingPaymentStatus === 'PAID' &&
            caseBefore.shippingPaymentMethod === 'STRIPE'
        ) {
            this.logger.log(`Shipping payment already fulfilled for ${caseType} ${caseId}; skipping duplicate webhook`);
            return;
        }
        const expectedMinor = Math.round(Number(caseBefore.shippingRefund || 0) * 100);
        if (typeof intent.amount_received === 'number' && intent.amount_received !== expectedMinor) {
            this.logger.error(
                `Shipping PI ${intent.id} amount mismatch: expected ${expectedMinor}, got ${intent.amount_received}`,
            );
            throw new Error('Shipping payment amount mismatch');
        }

        const modelName = caseType === 'return' ? 'returnRequest' : 'dispute';

        this.logger.log(`Fulfilling shipping payment for ${caseType} ${caseId}`);

        return await this.prisma.$transaction(async (tx) => {
            // 1. Update the case status
            const updatedCase = await (tx as any)[modelName].update({
                where: { id: caseId },
                data: {
                    shippingPaymentStatus: 'PAID',
                    shippingPaymentMethod: 'STRIPE',
                    updatedAt: new Date()
                }
            });

            // 2. Create financial log (WalletTransaction for transparency)
            // Even if paid via Stripe, we log it.
            const payeeId = updatedCase.shippingPayee === 'MERCHANT' ? 
                           (await tx.store.findUnique({ where: { id: updatedCase.storeId }, select: { ownerId: true } })).ownerId :
                           updatedCase.customerId;

            let balanceAfter = 0;
            if (updatedCase.shippingPayee === 'MERCHANT') {
                const storeRow = await tx.store.findUnique({
                    where: { id: updatedCase.storeId },
                    select: { balance: true },
                });
                balanceAfter = Number(storeRow?.balance ?? 0);
            } else {
                const userRow = await tx.user.findUnique({
                    where: { id: payeeId },
                    select: { customerBalance: true },
                });
                balanceAfter = Number(userRow?.customerBalance ?? 0);
            }

            await tx.walletTransaction.create({
                data: {
                    userId: payeeId,
                    role: updatedCase.shippingPayee === 'MERCHANT' ? 'VENDOR' : 'CUSTOMER',
                    type: 'DEBIT',
                    transactionType: 'SHIPPING_FEE',
                    amount: Number(updatedCase.shippingRefund),
                    currency: 'AED',
                    description: `Shipping cost for ${caseType} #${updatedCase.orderId} (Paid via Stripe)`,
                    balanceAfter,
                    metadata: { caseId, caseType, paymentMethod: 'STRIPE', stripeIntentId: intent.id },
                }
            });

            // 3. Transition Shipment Status to RETURN_STARTED (Ø¨Ø¯Ø¡ Ø§Ù„Ø§Ø±Ø¬Ø§Ø¹)
            const shipment = await tx.shipment.findFirst({
                where: { orderId: updatedCase.orderId },
                orderBy: { createdAt: 'desc' }
            });

            if (shipment) {
                await tx.shipment.update({
                    where: { id: shipment.id },
                    data: { status: 'RETURN_STARTED' as any }
                });

                await tx.shipmentStatusLog.create({
                    data: {
                        shipmentId: shipment.id,
                        fromStatus: shipment.status,
                        toStatus: 'RETURN_STARTED' as any,
                        notes: 'Ø¨Ø¯Ø¡ Ø§Ù„Ø§Ø±Ø¬Ø§Ø¹ - ØªÙ… Ø³Ø¯Ø§Ø¯ ØªÙƒÙ„ÙØ© Ø§Ù„Ø´Ø­Ù† Ø¹Ø¨Ø± Stripe',
                        source: 'API'
                    }
                });
            }

            // 4. Notify all parties
            const titleAr = 'ØªÙ… Ø³Ø¯Ø§Ø¯ ØªÙƒÙ„ÙØ© Ø§Ù„Ø´Ø­Ù†! ðŸšš';
            const titleEn = 'Shipping Paid! ðŸšš';
            const messageAr = `ØªÙ… Ø§Ø³ØªÙ„Ø§Ù… Ø¯ÙØ¹Ø© Ø§Ù„Ø´Ø­Ù† Ù„Ù„Ø·Ù„Ø¨ #${updatedCase.orderId}. Ø¹Ù…Ù„ÙŠØ© Ø§Ù„Ø¥Ø±Ø¬Ø§Ø¹ Ø¬Ø§Ø±ÙŠØ© Ø§Ù„Ø¢Ù†.`;
            const messageEn = `Shipping payment received for Order #${updatedCase.orderId}. Return process is now active.`;

            await this.notifications.create({
                recipientId: updatedCase.customerId,
                recipientRole: 'CUSTOMER',
                type: 'order',
                titleAr, titleEn, messageAr, messageEn,
                link: `orders/${updatedCase.orderId}`,
                metadata: { caseId, caseType }
            });

            const store = await tx.store.findUnique({ where: { id: updatedCase.storeId }, select: { ownerId: true } });
            if (store) {
                await this.notifications.create({
                    recipientId: store.ownerId,
                    recipientRole: 'VENDOR',
                    type: 'order',
                    titleAr, titleEn, messageAr, messageEn,
                    link: `marketplace/orders/${updatedCase.orderId}`,
                    metadata: { caseId, caseType }
                });
            }

            // 5. Notify ADMIN
            const adminTitleAr = `Ø³Ø¯Ø§Ø¯ Ø´Ø­Ù†: ${caseType === 'return' ? 'Ø·Ù„Ø¨ Ø¥Ø±Ø¬Ø§Ø¹' : 'Ù†Ø²Ø§Ø¹'} #${updatedCase.orderId}`;
            const adminTitleEn = `Shipping Paid: ${caseType === 'return' ? 'Return' : 'Dispute'} #${updatedCase.orderId}`;
            const adminMsgAr = `Ù‚Ø§Ù… ${updatedCase.shippingPayee === 'MERCHANT' ? 'Ø§Ù„ØªØ§Ø¬Ø±' : 'Ø§Ù„Ø¹Ù…ÙŠÙ„'} Ø¨Ø³Ø¯Ø§Ø¯ ØªÙƒÙ„ÙØ© Ø§Ù„Ø´Ø­Ù† Ø¨Ù‚ÙŠÙ…Ø© ${updatedCase.shippingRefund} Ø¯Ø±Ù‡Ù….`;
            const adminMsgEn = `${updatedCase.shippingPayee === 'MERCHANT' ? 'Merchant' : 'Customer'} paid AED ${updatedCase.shippingRefund} for shipping.`;

            // Broadcast to all admins (recipientId = null + role = ADMIN often used for broadcast in our system)
            await this.notifications.create({
                recipientId: null as any,
                recipientRole: 'ADMIN',
                type: 'order',
                titleAr: adminTitleAr,
                titleEn: adminTitleEn,
                messageAr: adminMsgAr,
                messageEn: adminMsgEn,
                link: 'resolution', // Admin resolution center
                metadata: { caseId, caseType }
            });

            return updatedCase;
        });
    }

    /**
     * Detect card brand from card number prefix
     */
    /**
     * Reuse an in-flight Stripe PaymentIntent when the customer retries or when
     * prefetch + pay fire close together. Prevents orphan intents and duplicate DB rows.
     */
    private async resolveOrCreateStripeIntent(
        existingStripePaymentId: string | null | undefined,
        existingStatus: string | null | undefined,
        existingTotalAmount: number,
        totalAmount: number,
        amountCents: number,
        metadata: Record<string, string>,
        stripeCustomerId: string,
    ): Promise<{ id: string; client_secret: string | null }> {
        const reusableStatuses = new Set([
            'requires_payment_method',
            'requires_confirmation',
            'requires_action',
            'processing',
        ]);

        if (
            existingStripePaymentId &&
            existingStatus === 'PENDING' &&
            existingTotalAmount === totalAmount
        ) {
            try {
                const existingIntent = await this.stripeService.retrievePaymentIntent(existingStripePaymentId);
                if (
                    reusableStatuses.has(existingIntent.status) &&
                    existingIntent.amount === amountCents &&
                    existingIntent.client_secret
                ) {
                    this.logger.debug(`Reusing Stripe PaymentIntent ${existingIntent.id}`);
                    return existingIntent;
                }
            } catch (err) {
                this.logger.warn(
                    `Could not reuse PaymentIntent ${existingStripePaymentId}: ${(err as Error).message}`,
                );
            }
        }

        return this.stripeService.createPaymentIntent(
            totalAmount.toString(),
            'AED',
            metadata,
            stripeCustomerId,
        );
    }

    private async resolveCompanySnapshot(tx?: Prisma.TransactionClient): Promise<{
        legalNameEn: string;
        legalNameAr: string;
    }> {
        const db = tx || this.prisma;
        try {
            const row = await db.platformSettings.findUnique({
                where: { settingKey: 'system_config' },
            });
            const company = ((row?.settingValue as Record<string, unknown>)?.company ||
                {}) as Record<string, unknown>;
            return {
                legalNameEn: String(company.legalNameEn || 'ELLIPP FZ LLC'),
                legalNameAr: String(company.legalNameAr || 'إليب ش.م.ح. - ذ.م.م'),
            };
        } catch {
            return {
                legalNameEn: 'ELLIPP FZ LLC',
                legalNameAr: 'إليب ش.م.ح. - ذ.م.م',
            };
        }
    }

    private detectCardBrand(cardNumber: string): string {
        if (cardNumber.startsWith('4')) return 'Visa';
        if (/^5[1-5]/.test(cardNumber) || /^2[2-7]/.test(cardNumber)) return 'Mastercard';
        if (cardNumber.startsWith('34') || cardNumber.startsWith('37')) return 'Amex';
        if (cardNumber.startsWith('62')) return 'UnionPay';
        return 'Unknown';
    }

    /**
     * Get pending (unpaid) accepted offers and their orders for the billing page
     */
    async getPendingPayments(userId: string) {
        // Find orders where customer owns it, and there's at least one ACCEPTED offer
        // that does NOT have a successful payment transaction
        return this.prisma.order.findMany({
            where: {
                customerId: userId,
                offers: {
                    some: {
                        status: 'accepted',
                        payments: {
                            none: {
                                status: 'SUCCESS'
                            }
                        }
                    }
                }
            },
            include: {
                offers: {
                    where: {
                        status: 'accepted',
                        payments: {
                            none: {
                                status: 'SUCCESS'
                            }
                        }
                    },
                    include: {
                        store: true
                    }
                },
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        countryCode: true,
                        country: true,
                    }
                },
                shippingAddresses: true,
                parts: true,
                store: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Get pending payments for a merchant (accepted but unpaid offers from their store)
     */
    async getMerchantPendingPayments(userId: string) {
        const store = await this.prisma.store.findUnique({
            where: { ownerId: userId }
        });

        if (!store) return [];

        return this.prisma.order.findMany({
            where: {
                offers: {
                    some: {
                        storeId: store.id,
                        status: 'accepted',
                        payments: {
                            none: {
                                status: 'SUCCESS'
                            }
                        }
                    }
                }
            },
            include: {
                offers: {
                    where: {
                        storeId: store.id,
                        status: 'accepted',
                        payments: {
                            none: {
                                status: 'SUCCESS'
                            }
                        }
                    },
                    include: {
                        store: true
                    }
                },
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        countryCode: true,
                        country: true,
                    }
                },
                shippingAddresses: true,
                parts: true,
                store: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    // --- New Wallet APIs ---

    async getCustomerWalletDashboard(userId: string) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const referralWindowCutoff = new Date(
            Date.now() - REFERRAL_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        );

        const [
            user,
            ordersCount,
            pendingOwnOrders,
            pendingReferralOrders,
            transactions,
            rewardTxs,
            walletDebitStats,
            purchasesFromPayments,
            completedOrders,
            refundedAmount,
        ] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    totalSpent: true,
                    loyaltyPoints: true,
                    loyaltyTier: true,
                    referralCount: true,
                    referralCode: true,
                    customerBalance: true,
                    pointsLastResetAt: true,
                    name: true,
                    withdrawalsFrozen: true,
                    withdrawalFreezeNote: true,
                    orderLimit: true,
                    restrictionAlertMessage: true,
                },
            }),
            this.prisma.order.aggregate({
                where: { customerId: userId },
                _count: { id: true },
            }),
            this.prisma.order.findMany({
                where: {
                    customerId: userId,
                    status: { in: [...CUSTOMER_PENDING_ORDER_STATUSES] },
                },
                include: { payments: { where: { status: 'SUCCESS' } } },
            }),
            this.prisma.order.findMany({
                where: {
                    status: { in: [...CUSTOMER_PENDING_ORDER_STATUSES] },
                    customer: {
                        referredById: userId,
                        ...buildActiveReferralWindowFilter(referralWindowCutoff),
                    },
                },
                include: { payments: { where: { status: 'SUCCESS' } } },
            }),
            this.getCustomerTransactions(userId),
            this.prisma.walletTransaction.findMany({
                where: {
                    userId,
                    role: 'CUSTOMER',
                    transactionType: { in: ['ORDER_PROFIT', 'REFERRAL_PROFIT'] },
                },
                select: {
                    amount: true,
                    type: true,
                    transactionType: true,
                    createdAt: true,
                },
            }),
            this.prisma.walletTransaction.aggregate({
                where: {
                    userId,
                    role: 'CUSTOMER',
                    type: 'DEBIT',
                    transactionType: { in: ['SHIPPING_FEE', 'PENALTY', 'WITHDRAWAL'] },
                },
                _sum: { amount: true },
            }),
            computeCustomerTotalPurchases(this.prisma, userId),
            computeCustomerCompletedOrdersCount(this.prisma, userId),
            computeRefundedAmount(this.prisma, userId),
        ]);

        if (!user) throw new NotFoundException('User not found');

        const finConfig = await this.financialConfig.getConfig();
        const tierCashbackRate = this.financialConfig.getCustomerCashbackRate(
            user.loyaltyTier,
            finConfig,
        );
        const rewardSplits = splitRewardAggregates(rewardTxs, startOfMonth);
        const pendingLoyaltyRewards = computePendingLoyaltyFromOrders(
            pendingOwnOrders,
            tierCashbackRate,
        );
        const pendingReferralRewards = computePendingReferralFromOrders(
            pendingReferralOrders,
        );
        const pendingRewards = pendingLoyaltyRewards + pendingReferralRewards;

        const totalOrdersCount = ordersCount._count.id;
        const orderCompletionRate =
            totalOrdersCount > 0 ? (completedOrders / totalOrdersCount) * 100 : 100;

        const totalSpent = await reconcileUserTotalSpent(
            this.prisma,
            userId,
            purchasesFromPayments,
            Number(user.totalSpent || 0),
        );
        const totalPurchases = purchasesFromPayments;

        const lifetimeCredits = rewardSplits.lifetimeLoyalty + rewardSplits.lifetimeReferral;
        const netRewardsEarned = computeLedgerNetRewards(rewardTxs);

        return {
            stats: {
                ...user,
                customerBalance: Number(user.customerBalance || 0),
                totalSpent,
                totalPurchases,
                monthlyLoyaltyRewards: rewardSplits.monthlyLoyalty,
                monthlyReferralRewards: rewardSplits.monthlyReferral,
                monthlyRewards:
                    rewardSplits.monthlyLoyalty + rewardSplits.monthlyReferral,
                pendingLoyaltyRewards,
                pendingReferralRewards,
                pendingRewards,
                refundedAmount,
                walletDeductions: Number(walletDebitStats._sum.amount || 0),
                totalRewardsEarned: Number(lifetimeCredits.toFixed(2)),
                netRewardsEarned,
                completedOrders,
                totalOrdersCount,
                orderCompletionRate: Math.round(orderCompletionRate),
                acceptanceRate: Math.round(orderCompletionRate),
                tierCashbackRate: tierCashbackRate * 100,
                profitPercentage: tierCashbackRate * 100,
                referralRate: 0.01,
                referralWindowDays: REFERRAL_WINDOW_DAYS,
                loyaltyConfig: {
                    tiers: finConfig.loyaltyTiers,
                    thresholds: finConfig.customerTierThresholds,
                },
            },
            transactions,
            withdrawalLimits: await this.financialConfig.getWithdrawalLimitsForUser(userId),
        };
    }

    async getCustomerWallet(userId: string) {
        const dashboard = await this.getCustomerWalletDashboard(userId);
        return dashboard.stats;
    }

    async getCustomerTransactions(userId: string) {
        const [payments, walletTxs] = await Promise.all([
            // 1. Fetch standard payment transactions
            this.prisma.paymentTransaction.findMany({
                where: { customerId: userId, status: { not: 'FAILED' } },
                include: { 
                    order: {
                        select: {
                            id: true,
                            orderNumber: true,
                            status: true
                        }
                    }
                }
            }),
            // 2. Fetch wallet-specific transactions (Loyalty, Referrals, Refunds, Withdrawals)
            this.prisma.walletTransaction.findMany({
                where: { userId, role: 'CUSTOMER' },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // 3. Normalize and merge for a unified 2026 ledger
        const unifiedLedger = [
            ...payments.map(p => ({
                id: p.id,
                amount: Number(p.totalAmount),
                type: 'DEBIT',
                transactionType: 'PAYMENT',
                status: p.status,
                createdAt: p.createdAt,
                description: `Payment for Order #${p.order?.orderNumber || 'N/A'}`,
                order: p.order,
                metadata: { offerId: p.offerId, transactionNumber: p.transactionNumber }
            })),
            ...walletTxs.map(w => ({
                id: w.id,
                amount: Number(w.amount),
                type: w.type,
                transactionType: w.transactionType,
                status: 'SUCCESS', // Wallet actions are immediate in this system
                createdAt: w.createdAt,
                description: w.description,
                metadata: w.metadata
            }))
        ];

        // 4. Sort by date descending (Real-time Audit Trail)
        return unifiedLedger.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    async getMerchantWalletDashboard(userId: string, filters?: { startDate?: string; endDate?: string }) {
        const store = await this.prisma.store.findUnique({
            where: { ownerId: userId },
            include: { owner: true }
        });

        if (!store) throw new NotFoundException('Store not found');

        const dateFilter: any = {};
        if (filters?.startDate) dateFilter.gte = new Date(filters.startDate);
        if (filters?.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.lte = end;
        }
        const hasDateFilter = Object.keys(dateFilter).length > 0;

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // 1. Parallel fetch: KPI aggregates (always all-time) + filtered ledger for table
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        const [
            walletActions,
            allTimeVendorTxs,
            allTimeReferralTxs,
            merchantGrossSales,
            completedOrderCount,
        ] = await Promise.all([
        this.prisma.walletTransaction.findMany({
            where: { 
                userId: store.ownerId,
                role: 'VENDOR',
                ...(hasDateFilter ? { createdAt: dateFilter } : {})
            },
            include: {
                payment: {
                    include: {
                        order: {
                            select: {
                                id: true,
                                orderNumber: true,
                                status: true
                            }
                        }
                    }
                },
                escrow: {
                    include: {
                        order: {
                            select: {
                                id: true,
                                orderNumber: true,
                                status: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        }),
        this.prisma.walletTransaction.findMany({
            where: { userId: store.ownerId, role: 'VENDOR' },
            select: {
                amount: true,
                type: true,
                transactionType: true,
                paymentId: true,
                escrowId: true,
            },
        }),
        this.prisma.walletTransaction.findMany({
            where: {
                userId: store.ownerId,
                transactionType: 'REFERRAL_PROFIT',
                type: 'CREDIT',
            },
            select: { amount: true },
        }),
        computeMerchantGrossSales(this.prisma, store.id),
        computeCompletedOrdersCount(this.prisma, store.id),
        ]);

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // 2. Variables & FSM Definitions
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        const stats = {
            available: 0, 
            pending: 0,   
            frozen: 0,    
            totalSales: 0, 
            netEarnings: 0, 
            completedOrders: 0, 
            referralCount: store.owner.referralCount,
            loyaltyPoints: store.owner.loyaltyPoints,
            pendingRewards: 0,
            monthlyRewards: 0,
            earnedReferralProfits: 0 
        };

        const tierConfig: Record<string, { rate: number; benefits: { ar: string; en: string }[] }> = {};
        const finConfig = await this.financialConfig.getConfig();
        const storeRules = finConfig.storeLoyaltyTiers;
        const staticBenefits: Record<string, { ar: string; en: string }[]> = {
            BASIC: [{ ar: 'شارة بائع موثوق', en: 'Verified Seller Badge' }],
            SILVER: [
                { ar: 'شارة بائع موثوق', en: 'Verified Seller Badge' },
                { ar: 'أولوية في نتائج البحث', en: 'Search Result Priority' },
            ],
            GOLD: [
                { ar: 'شارة بائع موثوق', en: 'Verified Seller Badge' },
                { ar: 'أولوية في نتائج البحث', en: 'Search Result Priority' },
            ],
            VIP: [
                { ar: 'شارة بائع موثوق', en: 'Verified Seller Badge' },
                { ar: 'أولوية في نتائج البحث', en: 'Search Result Priority' },
                { ar: 'مدير حساب VIP (24/7)', en: '24/7 VIP Account Manager' },
            ],
            ELITE: [
                { ar: 'أعلى مستوى — دعوة فقط', en: 'Invite-only top tier' },
                { ar: 'مدير حساب VIP (24/7)', en: '24/7 VIP Account Manager' },
                { ar: 'أولوية قصوى في الطلبات والظهور', en: 'Maximum order and visibility priority' },
            ],
        };
        for (const tier of ['BASIC', 'SILVER', 'GOLD', 'VIP', 'ELITE']) {
            tierConfig[tier] = {
                rate: storeRules[tier]?.rate ?? 0.02,
                benefits: staticBenefits[tier] ?? staticBenefits.BASIC,
            };
        }
        
        const currentTierData = tierConfig[store.loyaltyTier] || tierConfig.BASIC;
        const userRate = currentTierData.rate;

        const tiers = ['BASIC', 'SILVER', 'GOLD', 'VIP', 'ELITE'];
        const currentIdx = tiers.indexOf(store.loyaltyTier);
        const nextTier = currentIdx < tiers.length - 1 ? tiers[currentIdx + 1] : null;
        const nextTierData = nextTier ? tierConfig[nextTier] : null;

        const ACTIVE_STATUSES = ['PREPARATION', 'PREPARED', 'VERIFICATION', 'VERIFICATION_SUCCESS', 'READY_FOR_SHIPPING', 'SHIPPED', 'CORRECTION_PERIOD', 'CORRECTION_SUBMITTED', 'DELAYED_PREPARATION', 'NON_MATCHING'];

        // Release eligible escrow (same rules as cron) + repair missing rows for completed orders
        await this.syncMerchantEscrowReleases(store.id);
        const refreshedStore = await this.prisma.store.findUnique({
            where: { id: store.id },
            select: { balance: true, pendingBalance: true, frozenBalance: true },
        });
        if (refreshedStore) {
            store.balance = refreshedStore.balance;
            store.pendingBalance = refreshedStore.pendingBalance;
            store.frozenBalance = refreshedStore.frozenBalance;
        }

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // 3. KPI cards â€” always all-time (never date-filtered)
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        const escrowBalances = await computeMerchantEscrowBalances(
            this.prisma,
            store.id,
        );
        const storedPending = Number(store.pendingBalance);
        const storedFrozen = Number(store.frozenBalance);
        if (
            Math.abs(storedPending - escrowBalances.pending) > 0.01 ||
            Math.abs(storedFrozen - escrowBalances.frozen) > 0.01
        ) {
            void reconcileStoreWalletFromEscrow(this.prisma, store.id).catch(
                () => undefined,
            );
        }

        stats.available = Number(store.balance);
        stats.pending = escrowBalances.pending;
        stats.frozen = escrowBalances.frozen;

        stats.totalSales = merchantGrossSales;

        stats.completedOrders = completedOrderCount;

        // Referral profits (all-time) â€” credits personal customerBalance, role CUSTOMER
        stats.earnedReferralProfits = allTimeReferralTxs.reduce(
            (sum, tx) => sum + Number(tx.amount),
            0,
        );

        const ledgerNetProfit = computeLedgerNetProfit(allTimeVendorTxs);
        const totalWalletBalance =
            stats.available + stats.pending + stats.frozen;
        // ØµØ§ÙÙŠ Ø§Ù„Ø£Ø±Ø¨Ø§Ø­ = Ù…Ø¨ÙŠØ¹Ø§Øª/Ø¥Ø­Ø§Ù„Ø§Øª Ù…Ø¹ØªØ±Ù Ø¨Ù‡Ø§ ÙÙŠ Ø§Ù„Ø³Ø¬Ù„Ø› Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø±ØµÙŠØ¯ = Ù…Ø³ØªØ­Ù‚ + Ù…Ø¹Ù„Ù‘Ù‚ + Ù…Ø¬Ù…Ù‘Ø¯
        stats.netEarnings = ledgerNetProfit;

        (stats as any).totalWalletBalance = Number(totalWalletBalance.toFixed(2));
        (stats as any).ledgerNetProfit = ledgerNetProfit;
        (stats as any).merchantShareTotal = merchantGrossSales;

        // Backfill store counters from payment aggregates (merchant unitPrice, not customer GMV)
        if (
            merchantGrossSales > 0 &&
            (Number(store.lifetimeEarnings) === 0 ||
                Math.abs(Number(store.lifetimeEarnings) - merchantGrossSales) > 0.01)
        ) {
            void this.prisma.store
                .update({
                    where: { id: store.id },
                    data: {
                        lifetimeEarnings: merchantGrossSales,
                        completedOrdersCount: completedOrderCount,
                    },
                })
                .catch(() => undefined);
        } else if (completedOrderCount > Number(store.completedOrdersCount || 0)) {
            void this.prisma.store
                .update({
                    where: { id: store.id },
                    data: { completedOrdersCount: completedOrderCount },
                })
                .catch(() => undefined);
        }

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // 4. Monthly Context
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const monthlyAggr = await this.prisma.walletTransaction.aggregate({
            where: {
                userId: store.ownerId,
                type: 'CREDIT',
                transactionType: 'REFERRAL_PROFIT',
                createdAt: { gte: startOfMonth }
            },
            _sum: { amount: true }
        });
        stats.monthlyRewards = Number(monthlyAggr._sum.amount || 0);

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // 6. True Pending Referral Rewards (1% of platform commission + 6-month window)
        //    Active orders from referred users still inside their referral window
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        const REFERRAL_WINDOW_MS = 180 * 24 * 60 * 60 * 1000;
        const windowCutoff = new Date(Date.now() - REFERRAL_WINDOW_MS);

        const pendingReferrals = await this.prisma.order.findMany({
            where: {
                status: { in: ACTIVE_STATUSES as any },
                customer: {
                    referredById: store.ownerId,
                    ...buildActiveReferralWindowFilter(windowCutoff),
                } as any
            },
            include: { payments: { where: { status: 'SUCCESS' } } }
        });

        stats.pendingRewards = computePendingReferralFromOrders(
            pendingReferrals as Array<{ payments: Array<{ commission?: unknown }> }>,
        );

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // 7. Notifications
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        const notifications = await this.prisma.notification.findMany({
            where: { recipientId: userId, recipientRole: 'MERCHANT' },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        const openCases = await countOpenMerchantCases(this.prisma, store.id);
        const withdrawalGovernance = buildWithdrawalGovernance(stats.available, openCases);
        const withdrawalLimits = await this.financialConfig.getWithdrawalLimitsForStore(store.id);

        return {
            stats: {
                ...stats,
                available: Number(stats.available.toFixed(2)),
                pending: Number(stats.pending.toFixed(2)),
                frozen: Number(stats.frozen.toFixed(2)),
                totalSales: Number(stats.totalSales.toFixed(2)),
                netEarnings: Number(stats.netEarnings.toFixed(2)),
                totalWalletBalance: Number((stats as any).totalWalletBalance),
                ledgerNetProfit: Number((stats as any).ledgerNetProfit),
                merchantShareTotal: Number((stats as any).merchantShareTotal),
                loyaltyTier: store.loyaltyTier,
                performanceScore: Number(store.performanceScore),
                rating: Number(store.rating),
                storeName: store.name || 'Merchant',
                storeId: store.id,
                referralCode: await (async () => {
                    if (store.owner.referralCode) return store.owner.referralCode;
                    let code = '';
                    let isUnique = false;
                    while (!isUnique) {
                        code = Math.random().toString(36).substring(2, 8).toUpperCase();
                        const existing = await this.prisma.user.findUnique({ where: { referralCode: code } });
                        if (!existing) isUnique = true;
                    }
                    await this.prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
                    return code;
                })(),
                profitPercentage: 1, // Fixed 1% referral commission (independent of loyalty tier)
                referralWindowDays: 180,
                tierBenefits: currentTierData.benefits,
                nextTierBenefits: nextTierData?.benefits || [],
                stripeOnboarded: store.owner.stripeOnboarded,
                stripeAccountId: store.owner.stripeAccountId,
                withdrawalsFrozen: store.owner.withdrawalsFrozen,
                withdrawalFreezeNote: store.owner.withdrawalFreezeNote,
                orderLimit: store.owner.orderLimit,
                restrictionAlertMessage: store.owner.restrictionAlertMessage,
                referralCustomerBalance: Number(store.owner.customerBalance || 0),
                ...withdrawalGovernance,
            },
            withdrawalLimits,
            notifications,
            transactions: walletActions // Wallet actions has exactly all sales, cancellations, and referrals
        };
    }

    async getMerchantWallet(userId: string) {
        const store = await this.prisma.store.findUnique({
            where: { ownerId: userId },
            select: {
                id: true,
                balance: true,
                pendingBalance: true,
                frozenBalance: true,
                stripeAccountId: true,
                stripeOnboarded: true,
                payoutSchedule: true,
                lifetimeEarnings: true,
            },
        });

        if (!store) throw new NotFoundException('Store not found');

        const balance = Number(store.balance);
        const escrowBalances = await computeMerchantEscrowBalances(
            this.prisma,
            store.id,
        );
        const pendingBalance = escrowBalances.pending;
        const frozenBalance = escrowBalances.frozen;
        const totalSales = await computeMerchantGrossSales(this.prisma, store.id);
        const vendorTxs = await this.prisma.walletTransaction.findMany({
            where: { userId, role: 'VENDOR' },
            select: {
                amount: true,
                type: true,
                transactionType: true,
                paymentId: true,
                escrowId: true,
            },
        });
        const ledgerNetProfit = computeLedgerNetProfit(vendorTxs);

        return {
            ...store,
            balance,
            pendingBalance,
            frozenBalance,
            totalSales,
            netEarnings: ledgerNetProfit,
            totalWalletBalance: balance + pendingBalance + frozenBalance,
            ledgerNetProfit,
        };
    }

    async getMerchantTransactions(userId: string) {
        const store = await this.prisma.store.findUnique({ where: { ownerId: userId }});
        if(!store) throw new NotFoundException('Store not found');

        return this.prisma.walletTransaction.findMany({
            where: { userId: store.ownerId, role: 'VENDOR' },
            orderBy: { createdAt: 'desc' },
            include: {
                payment: {
                    select: {
                        orderId: true,
                        order: {
                            select: {
                                orderNumber: true,
                                status: true
                            }
                        }
                    }
                }
            }
        });
    }

    async releaseEscrowManually(
        adminId: string,
        body: { orderId?: string; paymentId?: string; offerId?: string },
    ) {
        let paymentId = body.paymentId;
        let orderId = body.orderId;

        if (body.offerId && !paymentId) {
            const base = await this.escrowService.resolveOfferPaymentBase(body.offerId);
            paymentId = base.paymentId ?? undefined;
            orderId = base.orderId ?? orderId;
        }

        if (!paymentId && orderId) {
            const heldCount = await this.prisma.escrowTransaction.count({
                where: {
                    orderId,
                    status: { in: ['HELD', 'FROZEN', 'RELEASING'] },
                },
            });
            if (heldCount > 1) {
                throw new BadRequestException(
                    'Multi-payment order: specify paymentId or offerId to release a specific escrow row.',
                );
            }
        }

        if (paymentId && !orderId) {
            const escrow = await this.prisma.escrowTransaction.findFirst({
                where: { paymentId },
            });
            orderId = escrow?.orderId;
        }

        if (!orderId) {
            throw new BadRequestException('Could not resolve order for escrow release.');
        }

        await this.escrowService.releaseFunds(orderId, 'ADMIN_RELEASE', adminId, paymentId);
        return { success: true, message: 'Funds released successfully.' };
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 7. Withdrawal & Stripe Connect Logic
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    async getStripeOnboardingLink(userId: string) {
        await this.withdrawalWorkflow.assertStripeConnectEnabled();
        const store = await this.prisma.store.findUnique({
            where: { ownerId: userId },
            include: { owner: true }
        });

        if (!store) throw new NotFoundException('Store not found');

        let stripeAccountId = store.stripeAccountId;
        if (!stripeAccountId) {
            try {
                const account = await this.stripeService.createConnectedAccount(store.id, store.owner.email);
                stripeAccountId = account.id;
            } catch (err: any) {
                this.logger.error(`Stripe Connect account creation failed: ${err.message}`);
                // Handle the specific "not signed up for Connect" error
                if (err.message?.includes('signed up for Connect') || err.type === 'StripeInvalidRequestError') {
                    throw new BadRequestException(
                        'Stripe Connect is not enabled on this platform. Please use Bank Transfer for withdrawals, or contact the admin to enable Stripe Connect.'
                    );
                }
                throw new BadRequestException(`Failed to create Stripe account: ${err.message}`);
            }
        }

        const frontendUrl = (
            process.env.FRONTEND_URL || 'https://e-tashleh.net'
        ).replace(/\/$/, '');
        const returnUrl = `${frontendUrl}/dashboard/wallet?stripe_status=return`;
        const refreshUrl = `${frontendUrl}/dashboard/wallet?stripe_status=refresh`;

        return this.stripeService.createOnboardingLink(stripeAccountId, returnUrl, refreshUrl);
    }

    async getCustomerStripeOnboardingLink(userId: string) {
        await this.withdrawalWorkflow.assertStripeConnectEnabled();
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) throw new NotFoundException('User not found');

        let stripeAccountId = user.stripeAccountId;
        if (!stripeAccountId) {
            try {
                // For customers, we use their email and a generic 'customer' identifier
                const account = await this.stripeService.createConnectedAccount(`cust_${user.id}`, user.email, true);
                stripeAccountId = account.id;
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { stripeAccountId }
                });
            } catch (err: any) {
                this.logger.error(`Customer Stripe Connect account creation failed: ${err.message}`);
                if (err.message?.includes('signed up for Connect')) {
                    throw new BadRequestException('Stripe Connect is not enabled on this platform.');
                }
                throw new BadRequestException(`Failed to create Stripe account: ${err.message}`);
            }
        }

        const frontendUrl = (
            process.env.FRONTEND_URL || 'https://e-tashleh.net'
        ).replace(/\/$/, '');
        const returnUrl = `${frontendUrl}/dashboard/wallet?stripe_status=return`;
        const refreshUrl = `${frontendUrl}/dashboard/wallet?stripe_status=refresh`;

        return this.stripeService.createOnboardingLink(stripeAccountId, returnUrl, refreshUrl);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 7b. Bank Details Management
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    async saveBankDetails(userId: string, details: { bankName: string; accountHolder: string; iban: string; swift?: string }) {
        const store = await this.prisma.store.findUnique({ where: { ownerId: userId } });
        if (!store) throw new NotFoundException('Store not found');

        // Basic IBAN validation (length and prefix)
        const iban = details.iban.replace(/\s/g, '').toUpperCase();
        if (iban.length < 15 || iban.length > 34) {
            throw new BadRequestException('Invalid IBAN format');
        }

        await (this.prisma.store.update as any)({
            where: { id: store.id },
            data: {
                bankName: details.bankName,
                bankAccountHolder: details.accountHolder,
                bankIban: iban,
                bankSwift: details.swift || null,
                bankDetailsVerified: false // Admin must verify
            }
        });

        return {
            success: true,
            message: 'Bank details saved successfully. Pending admin verification.',
            bankDetails: buildPayoutBankDetailsResponse({
                bankName: details.bankName,
                bankAccountHolder: details.accountHolder,
                bankIban: iban,
                bankSwift: details.swift || null,
                bankDetailsVerified: false,
                stripeOnboarded: store.stripeOnboarded,
                stripeAccountId: store.stripeAccountId,
            }),
        };
    }

    async saveCustomerBankDetails(userId: string, details: { bankName: string; accountHolder: string; iban: string; swift?: string }) {
        const iban = details.iban.replace(/\s/g, '').toUpperCase();
        if (iban.length < 15 || iban.length > 34) {
            throw new BadRequestException('Invalid IBAN format');
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                bankName: details.bankName,
                bankAccountHolder: details.accountHolder,
                bankIban: iban,
                bankSwift: details.swift || null,
                bankDetailsVerified: false
            }
        });

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { stripeOnboarded: true, stripeAccountId: true },
        });

        return {
            success: true,
            message: 'Bank details saved successfully. Pending admin verification.',
            bankDetails: buildPayoutBankDetailsResponse({
                bankName: details.bankName,
                bankAccountHolder: details.accountHolder,
                bankIban: iban,
                bankSwift: details.swift || null,
                bankDetailsVerified: false,
                stripeOnboarded: user?.stripeOnboarded,
                stripeAccountId: user?.stripeAccountId,
            }),
        };
    }

    async getCustomerBankDetails(userId: string) {
        const user = await this.prisma.user.findUnique({ 
            where: { id: userId },
            select: {
                bankName: true,
                bankAccountHolder: true,
                bankIban: true,
                bankSwift: true,
                bankDetailsVerified: true,
                stripeOnboarded: true,
                stripeAccountId: true
            }
        });
        if (!user) throw new NotFoundException('User not found');

        return buildPayoutBankDetailsResponse({
            bankName: user.bankName,
            bankAccountHolder: user.bankAccountHolder,
            bankIban: user.bankIban,
            bankSwift: user.bankSwift,
            bankDetailsVerified: user.bankDetailsVerified,
            stripeOnboarded: user.stripeOnboarded,
            stripeAccountId: user.stripeAccountId,
        });
    }

    async getBankDetails(userId: string) {
        const store = await this.prisma.store.findUnique({ where: { ownerId: userId } });
        if (!store) throw new NotFoundException('Store not found');

        const s = store as any;
        return buildPayoutBankDetailsResponse({
            bankName: s.bankName,
            bankAccountHolder: s.bankAccountHolder,
            bankIban: s.bankIban,
            bankSwift: s.bankSwift,
            bankDetailsVerified: s.bankDetailsVerified,
            stripeOnboarded: store.stripeOnboarded,
            stripeAccountId: store.stripeAccountId,
        });
    }

    async adminVerifyBankDetails(adminId: string, targetId: string, role: 'CUSTOMER' | 'VENDOR') {
        if (role === 'CUSTOMER') {
            await this.prisma.user.update({
                where: { id: targetId },
                data: { bankDetailsVerified: true }
            });
        } else {
            await this.prisma.store.update({
                where: { id: targetId },
                data: { bankDetailsVerified: true }
            });
        }

        // Audit log
        // Audit log (2026 Financial Integrity)
        await this.auditLogs.logAction({
            entity: 'FINANCIAL',
            action: 'BANK_DETAILS_VERIFIED',
            actorType: ActorType.ADMIN,
            actorId: adminId,
            metadata: { targetId, role }
        });

        return { success: true, message: 'Bank details verified successfully' };
    }

    async requestWithdrawal(userId: string, amount: number, payoutMethod: string = 'BANK_TRANSFER', ip?: string | null) {
        await this.withdrawalWorkflow.enforceCreateRateLimit(userId);

        const store = await this.prisma.store.findUnique({
            where: { ownerId: userId },
            include: { owner: true }
        });

        if (!store) throw new NotFoundException('Store not found');

        // --- 2026 Governance Enforcement: Withdrawal Freeze ---
        if (store.owner.withdrawalsFrozen) {
            throw new ForbiddenException(store.owner.restrictionAlertMessage || 'Your withdrawals have been frozen by administration.');
        }
        if (store.owner.withdrawalsFrozenUntil && new Date(store.owner.withdrawalsFrozenUntil) > new Date()) {
            throw new ForbiddenException(`Your withdrawals are temporarily frozen until ${new Date(store.owner.withdrawalsFrozenUntil).toLocaleString()}`);
        }
        // ------------------------------------------------------

        if (payoutMethod === 'STRIPE') {
            await this.withdrawalWorkflow.assertStripeConnectEnabled();
        }

        // Validate payout method prerequisites
        const payoutReadiness = getPayoutReadiness({
            bankIban: store.bankIban,
            stripeOnboarded: store.stripeOnboarded,
        });
        assertWithdrawalPayoutMethodReady(payoutMethod, payoutReadiness);

        await this.withdrawalWorkflow.assertNoActiveWithdrawal({ storeId: store.id });

        const limits = await this.financialConfig.getWithdrawalLimitsForStore(store.id);
        if (amount < limits.min) throw new BadRequestException(`Minimum withdrawal is ${limits.min} AED`);
        if (amount > limits.max) throw new BadRequestException(`Maximum withdrawal is ${limits.max} AED`);

        // Check balance
        if (Number(store.balance) < amount) {
            throw new BadRequestException('Insufficient balance');
        }

        const finConfig = await this.financialConfig.getConfig();
        if (finConfig.payoutDelayDaysMerchant > 0) {
            const recentCredit = await this.prisma.walletTransaction.findFirst({
                where: { userId: store.ownerId, role: 'VENDOR', type: 'CREDIT' },
                orderBy: { createdAt: 'desc' },
            });
            if (recentCredit) {
                const eligibleAt = new Date(
                    recentCredit.createdAt.getTime() +
                        finConfig.payoutDelayDaysMerchant * 24 * 60 * 60 * 1000,
                );
                if (eligibleAt > new Date()) {
                    throw new BadRequestException(
                        `Withdrawals are available ${finConfig.payoutDelayDaysMerchant} day(s) after funds are credited`,
                    );
                }
            }
        }

        const openCases = await countOpenMerchantCases(this.prisma, store.id);
        const governance = buildWithdrawalGovernance(Number(store.balance), openCases);
        if (amount > governance.maxWithdrawableAmount) {
            throw new BadRequestException(
                governance.withdrawalRestrictionMessageEn ||
                    'Withdrawal amount exceeds the maximum allowed for your account',
            );
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT id FROM stores WHERE id = ${store.id}::uuid FOR UPDATE`;

            // Re-validate AFTER acquiring the row lock to close the TOCTOU window:
            // two concurrent requests can both pass the pre-lock checks above.
            const locked = await tx.store.findUnique({
                where: { id: store.id },
                select: { balance: true },
            });
            if (!locked || Number(locked.balance) < amount) {
                throw new BadRequestException('Insufficient balance');
            }
            const activeWithdrawal = await tx.withdrawalRequest.findFirst({
                where: { storeId: store.id, status: { in: ['PENDING', 'PROCESSING'] } },
                select: { id: true },
            });
            if (activeWithdrawal) {
                throw new ConflictException('You already have an active withdrawal request');
            }

            await tx.store.update({
                where: { id: store.id },
                data: {
                    balance: { decrement: amount },
                    frozenBalance: { increment: amount },
                },
            });

            const request = await tx.withdrawalRequest.create({
                data: {
                    storeId: store.id,
                    amount,
                    payoutMethod,
                    status: 'PENDING',
                    role: 'VENDOR',
                    balanceHeldAtRequest: amount,
                    ibanSnapshot: store.bankIban || null,
                    stripeAccountSnapshot: store.stripeAccountId || null,
                },
            });

            await this.auditLogs.logAction({
                entity: 'FINANCIAL',
                action: 'WITHDRAWAL_REQUEST_CREATED',
                actorType: ActorType.VENDOR,
                actorId: userId,
                metadata: { requestId: request.id, amount, payoutMethod, role: 'VENDOR', ip: ip ?? null },
            }, tx);

            const admins = await tx.user.findMany({
                where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] } }
            });

            const methodLabel = payoutMethod === 'STRIPE' ? 'Stripe' : 'Bank Transfer';
            for (const admin of admins) {
                await this.notifications.create({
                    recipientId: admin.id,
                    recipientRole: 'ADMIN',
                    titleAr: 'طلب سحب جديد',
                    titleEn: 'New Withdrawal Request',
                    messageAr: `قام التاجر ${store.name} بطلب سحب ${amount} AED عبر ${payoutMethod === 'STRIPE' ? 'Stripe' : 'تحويل بنكي'}`,
                    messageEn: `Merchant ${store.name} requested a ${methodLabel} withdrawal of ${amount} AED`,
                    type: 'SYSTEM',
                    metadata: { type: 'WITHDRAWAL_REQUEST', requestId: request.id, payoutMethod }
                });
            }

            return request;
        });
    }

    async requestCustomerWithdrawal(userId: string, amount: number, payoutMethod: string = 'BANK_TRANSFER', ip?: string | null) {
        await this.withdrawalWorkflow.enforceCreateRateLimit(userId);

        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) throw new NotFoundException('User not found');

        // --- 2026 Governance Enforcement: Withdrawal Freeze ---
        if (user.withdrawalsFrozen) {
            throw new ForbiddenException(user.restrictionAlertMessage || 'Your withdrawals have been frozen by administration.');
        }
        if (user.withdrawalsFrozenUntil && new Date(user.withdrawalsFrozenUntil) > new Date()) {
            throw new ForbiddenException(`Your withdrawals are temporarily frozen until ${new Date(user.withdrawalsFrozenUntil).toLocaleString()}`);
        }
        // ------------------------------------------------------

        if (payoutMethod === 'STRIPE') {
            await this.withdrawalWorkflow.assertStripeConnectEnabled();
        }

        const payoutReadiness = getPayoutReadiness({
            bankIban: user.bankIban,
            stripeOnboarded: user.stripeOnboarded,
        });
        assertWithdrawalPayoutMethodReady(payoutMethod, payoutReadiness);

        await this.withdrawalWorkflow.assertNoActiveWithdrawal({ userId: user.id });

        const limits = await this.financialConfig.getWithdrawalLimitsForUser(user.id);
        if (amount < limits.min) throw new BadRequestException(`Minimum withdrawal is ${limits.min} AED`);
        if (amount > limits.max) throw new BadRequestException(`Maximum withdrawal is ${limits.max} AED`);

        if (Number(user.customerBalance) < amount) {
            throw new BadRequestException('Insufficient balance in your rewards wallet');
        }

        const finConfig = await this.financialConfig.getConfig();
        if (finConfig.payoutDelayDaysCustomer > 0) {
            const recentCredit = await this.prisma.walletTransaction.findFirst({
                where: { userId: user.id, role: 'CUSTOMER', type: 'CREDIT' },
                orderBy: { createdAt: 'desc' },
            });
            if (recentCredit) {
                const eligibleAt = new Date(
                    recentCredit.createdAt.getTime() +
                        finConfig.payoutDelayDaysCustomer * 24 * 60 * 60 * 1000,
                );
                if (eligibleAt > new Date()) {
                    throw new BadRequestException(
                        `Withdrawals are available ${finConfig.payoutDelayDaysCustomer} day(s) after rewards are credited`,
                    );
                }
            }
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`;

            // Re-validate AFTER acquiring the row lock to close the TOCTOU window.
            const locked = await tx.user.findUnique({
                where: { id: user.id },
                select: { customerBalance: true },
            });
            if (!locked || Number(locked.customerBalance) < amount) {
                throw new BadRequestException('Insufficient balance in your rewards wallet');
            }
            const activeWithdrawal = await tx.withdrawalRequest.findFirst({
                where: { userId: user.id, status: { in: ['PENDING', 'PROCESSING'] } },
                select: { id: true },
            });
            if (activeWithdrawal) {
                throw new ConflictException('You already have an active withdrawal request');
            }

            await tx.user.update({
                where: { id: user.id },
                data: {
                    customerBalance: { decrement: amount },
                    customerFrozenBalance: { increment: amount },
                },
            });

            const request = await tx.withdrawalRequest.create({
                data: {
                    userId: user.id,
                    amount,
                    payoutMethod,
                    role: 'CUSTOMER',
                    status: 'PENDING',
                    balanceHeldAtRequest: amount,
                    ibanSnapshot: user.bankIban || null,
                    stripeAccountSnapshot: user.stripeAccountId || null,
                },
            });

            await this.auditLogs.logAction({
                entity: 'FINANCIAL',
                action: 'WITHDRAWAL_REQUEST_CREATED',
                actorType: ActorType.CUSTOMER,
                actorId: userId,
                metadata: { requestId: request.id, amount, payoutMethod, role: 'CUSTOMER', ip: ip ?? null },
            }, tx);

            const admins = await tx.user.findMany({
                where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] } }
            });

            const methodLabel = payoutMethod === 'STRIPE' ? 'Stripe' : 'Bank Transfer';
            for (const admin of admins) {
                await this.notifications.create({
                    recipientId: admin.id,
                    recipientRole: 'ADMIN',
                    titleAr: 'طلب سحب عميل جديد',
                    titleEn: 'New Customer Withdrawal Request',
                    messageAr: `قام العميل ${user.name || user.email} بطلب سحب ${amount} AED عبر ${methodLabel}`,
                    messageEn: `Customer ${user.name || user.email} requested a ${methodLabel} withdrawal of ${amount} AED`,
                    type: 'SYSTEM',
                    metadata: { type: 'WITHDRAWAL_REQUEST', requestId: request.id, role: 'CUSTOMER', payoutMethod }
                });
            }

            return request;
        });
    }

    async getWithdrawalRequests(userId: string, role: string, filters?: any) {
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            return this.getAdminWithdrawals(filters);
        }

        // Scoped staff (SUPPORT/ACCOUNTANT) must hold the granular billing.view permission
        // to see the platform-wide withdrawal list — role alone is not sufficient.
        if (role === 'SUPPORT' || role === 'ACCOUNTANT') {
            const perm = await this.prisma.adminPermission.findUnique({ where: { userId } });
            const permissions = (perm?.permissions ?? {}) as Record<string, any>;
            const canViewBilling = !!perm?.isActive && permissions?.billing?.view === true;
            if (!canViewBilling) {
                throw new ForbiddenException('Access Denied: Missing view permission for billing');
            }
            return this.getAdminWithdrawals(filters);
        }

        const store = await this.prisma.store.findUnique({ where: { ownerId: userId } });
        
        return this.prisma.withdrawalRequest.findMany({
            where: { 
                OR: [
                    { storeId: store?.id || undefined },
                    { userId: userId }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getAdminWithdrawals(filters?: any) {
        const range = buildAdminDateRange(filters);
        const dateFilter =
            range.startDate || range.endDate
                ? {
                      ...(range.startDate ? { gte: range.startDate } : {}),
                      ...(range.endDate ? { lte: range.endDate } : {}),
                  }
                : undefined;

        const where: Prisma.WithdrawalRequestWhereInput = {
            ...(dateFilter ? { createdAt: dateFilter } : {}),
        };

        const status = filters?.status || 'PENDING';
        if (status !== 'ALL') {
            where.status = status;
        }
        if (filters?.role && filters.role !== 'ALL') {
            where.role = filters.role;
        }
        if (filters?.search) {
            const q = normalizeSearchQuery(filters.search);
            const [userIds, storeIds, orderIds] = await Promise.all([
                resolveUserIds(this.prisma, q),
                resolveStoreIds(this.prisma, q),
                resolveOrderIds(this.prisma, q),
            ]);

            const or: Prisma.WithdrawalRequestWhereInput[] = [
                { user: { name: { contains: q, mode: 'insensitive' } } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
                { user: { phone: { contains: q, mode: 'insensitive' } } },
                { store: { name: { contains: q, mode: 'insensitive' } } },
                { store: { storeCode: { contains: q, mode: 'insensitive' } } },
            ];

            const phoneNorm = normalizePhone(q);
            if (phoneNorm && phoneNorm !== q) {
                or.push({ user: { phone: { contains: phoneNorm, mode: 'insensitive' } } });
            }

            if (isUuid(q)) {
                or.push({ id: q });
                or.push({ userId: q });
                or.push({ storeId: q });
            }
            if (userIds.length) or.push({ userId: { in: userIds } });
            if (storeIds.length) or.push({ storeId: { in: storeIds } });

            if (orderIds.length) {
                const orders = await this.prisma.order.findMany({
                    where: { id: { in: orderIds } },
                    select: { customerId: true, storeId: true },
                });
                const customerIds = [...new Set(orders.map((o) => o.customerId))];
                const orderStoreIds = [
                    ...new Set(orders.map((o) => o.storeId).filter(Boolean)),
                ] as string[];
                if (customerIds.length) or.push({ userId: { in: customerIds } });
                if (orderStoreIds.length) or.push({ storeId: { in: orderStoreIds } });
            }

            where.OR = or;
        }

        const requests = await this.prisma.withdrawalRequest.findMany({
            where,
            include: {
                store: {
                    select: {
                        name: true,
                        id: true,
                        balance: true,
                        bankName: true,
                        bankIban: true,
                        bankAccountHolder: true,
                        bankSwift: true,
                        bankDetailsVerified: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                        id: true,
                        customerBalance: true,
                        bankName: true,
                        bankIban: true,
                        bankAccountHolder: true,
                        bankSwift: true,
                        bankDetailsVerified: true,
                    },
                },
                processor: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const requestIds = requests.map((r) => r.id);
        const linkedWalletTxs =
            requestIds.length > 0
                ? await this.prisma.walletTransaction.findMany({
                      where: {
                          transactionType: { in: ['WITHDRAWAL', 'withdrawal', 'MANUAL_PAYOUT'] },
                          OR: requestIds.map((requestId) => ({
                              metadata: {
                                  path: ['requestId'],
                                  equals: requestId,
                              },
                          })),
                      },
                      select: {
                          id: true,
                          amount: true,
                          balanceAfter: true,
                          metadata: true,
                          createdAt: true,
                      },
                  })
                : [];

        return requests.map((req) => {
            const linked = linkedWalletTxs.find((tx) => {
                const meta = tx.metadata as Record<string, unknown> | null;
                return meta?.requestId === req.id;
            });
            const balanceCurrent =
                req.role === 'VENDOR'
                    ? Number(req.store?.balance || 0)
                    : Number(req.user?.customerBalance || 0);
            const balanceAtRequest = linked
                ? Number(linked.balanceAfter) + Number(linked.amount)
                : null;

            return {
                ...req,
                amount: Number(req.amount),
                balanceCurrent,
                balanceAtRequest,
                linkedWalletTxId: linked?.id || null,
                adminNotes: req.adminNotes || null,
                rejectionReason: req.rejectionReason || null,
                stripeTransferId: req.stripeTransferId || null,
                processedAt: req.status !== 'PENDING' ? (req.completedAt || req.approvedAt || req.updatedAt) : null,
                store: req.store
                    ? {
                          ...req.store,
                          bankIban: maskIban(req.store.bankIban),
                      }
                    : null,
                user: req.user
                    ? {
                          ...req.user,
                          bankIban: maskIban(req.user.bankIban),
                      }
                    : null,
            };
        });
    }

    async approveWithdrawal(adminId: string, requestId: string, ctx: { notes?: string; adminSignature?: string; adminName?: string; adminEmail?: string; ip?: string | null }) {
        return this.withdrawalWorkflow.approveWithdrawal(requestId, { adminId, ...ctx });
    }

    async rejectWithdrawal(adminId: string, requestId: string, ctx: { notes?: string; adminSignature?: string; adminName?: string; adminEmail?: string; ip?: string | null }) {
        return this.withdrawalWorkflow.rejectWithdrawal(requestId, { adminId, ...ctx });
    }

    async completeWithdrawal(adminId: string, requestId: string, ctx: { notes?: string; adminSignature?: string; adminName?: string; adminEmail?: string; ip?: string | null; idempotencyKey?: string }) {
        return this.withdrawalWorkflow.completeWithdrawal(requestId, { adminId, ...ctx });
    }

    async releaseWithdrawalFunds(adminId: string, requestId: string, ctx: { notes?: string; adminSignature?: string; adminName?: string; adminEmail?: string; ip?: string | null; idempotencyKey?: string }) {
        return this.withdrawalWorkflow.releaseWithdrawalFunds(requestId, { adminId, ...ctx });
    }

    async cancelWithdrawalRequest(userId: string, requestId: string, ip?: string | null) {
        return this.withdrawalWorkflow.cancelWithdrawalRequest(userId, requestId, ip);
    }

    private async assertCanAccessWithdrawal(userId: string, role: string, request: {
        id: string;
        userId: string | null;
        storeId: string | null;
    }) {
        const isAdminRole = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'ACCOUNTANT'].includes(role);
        if (isAdminRole) {
            if (role === 'ADMIN' || role === 'SUPER_ADMIN') return;
            const perm = await this.prisma.adminPermission.findUnique({ where: { userId } });
            const permissions = (perm?.permissions ?? {}) as Record<string, any>;
            const canViewBilling = !!perm?.isActive && permissions?.billing?.view === true;
            if (!canViewBilling) {
                throw new ForbiddenException('Access Denied: Missing view permission for billing');
            }
            return;
        }

        if (request.userId === userId) return;

        const store = await this.prisma.store.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (store && request.storeId === store.id) return;

        throw new ForbiddenException('Unauthorized access to this withdrawal');
    }

    async getWithdrawalReceipt(userId: string, role: string, requestId: string) {
        const request = await this.prisma.withdrawalRequest.findUnique({
            where: { id: requestId },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                store: { select: { id: true, name: true, storeCode: true } },
                processor: { select: { id: true, name: true, email: true } },
            },
        });
        if (!request) throw new NotFoundException('Withdrawal request not found');
        await this.assertCanAccessWithdrawal(userId, role, request);

        return {
            receiptNumber: `WD-${request.id.slice(0, 8).toUpperCase()}`,
            id: request.id,
            amount: Number(request.amount),
            currency: request.currency,
            status: request.status,
            payoutMethod: request.payoutMethod,
            role: request.role,
            createdAt: request.createdAt,
            approvedAt: request.approvedAt,
            completedAt: request.completedAt,
            cancelledAt: request.cancelledAt,
            transferCompletedAt: request.transferCompletedAt,
            rejectionReason: request.rejectionReason,
            adminNotes: request.adminNotes,
            ibanSnapshot: request.ibanSnapshot ? maskIban(request.ibanSnapshot) : null,
            stripeTransferId: request.stripeTransferId,
            accountName:
                request.role === 'CUSTOMER'
                    ? request.user?.name || request.user?.email || null
                    : request.store?.name || null,
            accountCode:
                request.role === 'CUSTOMER'
                    ? request.user?.email || null
                    : request.store?.storeCode || null,
            processedBy: request.processor
                ? { name: request.processor.name, email: request.processor.email }
                : null,
        };
    }

    async exportWithdrawals(
        userId: string,
        role: string,
        filters: any,
        format: 'xlsx' | 'csv',
        res: Response,
    ) {
        const isAdminRole = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'ACCOUNTANT'].includes(role);
        let rows: any[];

        if (isAdminRole) {
            rows = await this.getAdminWithdrawals({
                ...filters,
                status: filters?.status || 'ALL',
            });
        } else {
            rows = await this.getWithdrawalRequests(userId, role, filters);
        }

        const flat = rows.map((r) => ({
            id: r.id,
            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
            amount: Number(r.amount),
            currency: r.currency || 'AED',
            status: r.status,
            payoutMethod: r.payoutMethod,
            completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : '',
            failureReason: r.rejectionReason || '',
            role: r.role,
            userName: r.user?.name || r.user?.email || '',
            storeName: r.store?.name || r.store?.storeCode || '',
        }));

        const filename = `withdrawals_${new Date().toISOString().slice(0, 10)}.${format}`;

        if (format === 'csv') {
            const headers = Object.keys(flat[0] || {
                id: '',
                createdAt: '',
                amount: '',
                currency: '',
                status: '',
                payoutMethod: '',
                completedAt: '',
                failureReason: '',
                role: '',
                userName: '',
                storeName: '',
            });
            const escape = (v: unknown) => {
                const s = String(v ?? '');
                if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
                return s;
            };
            const lines = [
                headers.join(','),
                ...flat.map((row) => headers.map((h) => escape((row as any)[h])).join(',')),
            ];
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.send('\uFEFF' + lines.join('\n'));
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Withdrawals');
        sheet.columns = [
            { header: 'ID', key: 'id', width: 38 },
            { header: 'Created At', key: 'createdAt', width: 24 },
            { header: 'Amount', key: 'amount', width: 12 },
            { header: 'Currency', key: 'currency', width: 10 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Payout Method', key: 'payoutMethod', width: 16 },
            { header: 'Completed At', key: 'completedAt', width: 24 },
            { header: 'Failure Reason', key: 'failureReason', width: 28 },
            { header: 'Role', key: 'role', width: 12 },
            { header: 'User', key: 'userName', width: 24 },
            { header: 'Store', key: 'storeName', width: 24 },
        ];
        sheet.addRows(flat);
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        await workbook.xlsx.write(res);
        res.end();
    }

    async getUserWithdrawalLimits(userId: string, role: 'CUSTOMER' | 'VENDOR') {
        if (role === 'VENDOR') {
            const store = await this.prisma.store.findUnique({ where: { ownerId: userId }, select: { id: true } });
            if (!store) throw new NotFoundException('Store not found');
            return this.financialConfig.getWithdrawalLimitsForStore(store.id);
        }
        return this.financialConfig.getWithdrawalLimitsForUser(userId);
    }

    async processWithdrawalRequest(
        adminId: string, 
        requestId: string, 
        action: 'APPROVE' | 'REJECT', 
        notes?: string,
        adminSignature?: string,
        adminName?: string,
        adminEmail?: string,
        overrideMethod?: string,
        ip?: string | null,
    ) {
        const ctx = { notes, adminSignature, adminName, adminEmail, ip };
        if (action === 'REJECT') {
            return this.rejectWithdrawal(adminId, requestId, ctx);
        }
        return this.approveWithdrawal(adminId, requestId, ctx);
    }

    async handleStripeTransferEvent(transfer: { id: string; metadata?: Record<string, string> }, eventType: string) {
        return this.withdrawalWorkflow.handleStripeTransferEvent(transfer, eventType);
    }

    async getWithdrawalStripeStatus(requestId: string) {
        const request = await this.prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
        if (!request) throw new NotFoundException('Request not found');
        if (!request.stripeTransferId) {
            return { requestId, status: request.status, stripeVerified: false, message: 'No Stripe transfer ID' };
        }
        try {
            const transfer = await this.stripeService.retrieveTransfer(request.stripeTransferId);
            return {
                requestId,
                status: request.status,
                stripeTransferId: request.stripeTransferId,
                stripeVerified: true,
                stripeStatus: transfer.reversed ? 'reversed' : 'completed',
                amount: transfer.amount / 100,
                currency: transfer.currency,
            };
        } catch (err: any) {
            return { requestId, status: request.status, stripeVerified: false, error: err.message };
        }
    }

    async getWithdrawalLimits() {
        const [settings, finConfig] = await Promise.all([
            this.prisma.platformSettings.findUnique({
                where: { settingKey: 'withdrawal_limits' },
            }),
            this.financialConfig.getConfig(),
        ]);

        const stored = (settings?.settingValue as Record<string, unknown>) ?? {};
        const customerMin = Number(stored.customerMin ?? stored.min ?? finConfig.minWithdrawalCustomer);
        const merchantMin = Number(stored.merchantMin ?? finConfig.minWithdrawalMerchant);
        const max = Number(stored.max ?? 10000);

        return {
            ...stored,
            min: customerMin,
            max,
            customerMin,
            merchantMin,
            stripeConnectEnabled: finConfig.stripeConnectEnabled,
        };
    }

    /**
     * Auto-release HELD escrow for completed/delivered orders (24h window).
     * Also repairs SUCCESS payments that never created escrow rows (legacy/test data).
     */
    private async syncMerchantEscrowReleases(storeId: string): Promise<void> {
        const config = await this.financialConfig.getConfig();
        const windowEnd = escrowReleaseWindowEnd(new Date(), config.escrowHoldHoursMerchant);

        const heldEscrows = await this.prisma.escrowTransaction.findMany({
            where: {
                status: 'HELD',
                payment: { offer: { storeId } },
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
        });

        for (const escrow of heldEscrows) {
            const order = await this.prisma.order.findUnique({
                where: { id: escrow.orderId },
                select: { status: true, deliveredAt: true, updatedAt: true },
            });
            const offer = escrow.payment?.offer;
            if (
                !order ||
                !isEscrowPaymentEligibleForAutoRelease(order, offer, windowEnd)
            ) {
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
                        store: { select: { ownerId: true } },
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

                await this.escrowService.holdFunds(
                    payment.id,
                    payment.orderId,
                    payment.offer.storeId,
                    {
                        merchantAmount: unitPrice,
                        shippingAmount: shippingCost,
                        commissionAmount: commission,
                        gatewayFee: 0,
                    },
                );
                await this.escrowService.releaseFunds(
                    payment.orderId,
                    'AUTO_48H',
                    undefined,
                    payment.id,
                );
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                this.logger.warn(
                    `Legacy escrow repair skipped for payment ${payment.id}: ${message}`,
                );
            }
        }

        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            select: { ownerId: true },
        });
        if (!store) return;

        const [releasedSum, withdrawalDebits] = await Promise.all([
            this.prisma.escrowTransaction.aggregate({
                where: { status: 'RELEASED', payment: { offer: { storeId } } },
                _sum: { merchantAmount: true },
            }),
            this.prisma.walletTransaction.aggregate({
                where: {
                    userId: store.ownerId,
                    role: 'VENDOR',
                    type: 'DEBIT',
                    transactionType: 'WITHDRAWAL',
                },
                _sum: { amount: true },
            }),
        ]);

        const released = Number(releasedSum._sum.merchantAmount || 0);
        const withdrawn = Number(withdrawalDebits._sum.amount || 0);
        const expectedBalance = Math.max(0, Number((released - withdrawn).toFixed(2)));
        const currentStore = await this.prisma.store.findUnique({
            where: { id: storeId },
            select: { balance: true },
        });
        const currentBalance = Number(currentStore?.balance || 0);

        if (released > 0 && Math.abs(expectedBalance - currentBalance) > 0.01) {
            await this.prisma.store.update({
                where: { id: storeId },
                data: { balance: expectedBalance },
            });
        }
    }

    async updateWithdrawalLimits(adminId: string, limits: { min: number, max: number }) {
        const result = await this.prisma.platformSettings.upsert({
            where: { settingKey: 'withdrawal_limits' },
            update: { settingValue: limits },
            create: { settingKey: 'withdrawal_limits', settingValue: limits }
        });

        // Audit Log (2026 Policy Change)
        await this.auditLogs.logAction({
            entity: 'FINANCIAL',
            action: 'UPDATE_WITHDRAWAL_LIMITS',
            actorType: ActorType.ADMIN,
            actorId: adminId,
            metadata: { newLimits: limits }
        });

        return result;
    }

    // --- Admin Financial Hub ---

    async getAdminFinancials(filters?: any) {
        const range = buildAdminDateRange(filters);
        const hasDateFilter = !!(range.startDate || range.endDate);
        const dateFilter = range.startDate || range.endDate
            ? {
                ...(range.startDate ? { gte: range.startDate } : {}),
                ...(range.endDate ? { lte: range.endDate } : {}),
            }
            : undefined;

        const transactionsWhere: Prisma.WalletTransactionWhereInput = {
            ...(dateFilter ? { createdAt: dateFilter } : {}),
        };

        if (filters?.type && filters.type !== 'ALL') {
            transactionsWhere.type = filters.type;
        }
        if (filters?.role && filters.role !== 'ALL') {
            transactionsWhere.role = filters.role;
        }
        if (filters?.search) {
            const search = filters.search;
            transactionsWhere.OR = [
                { description: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { transactionType: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [kpis, salesTrend, topSpenders, topEarners, transactions] = await Promise.all([
            computeAdminFinancialKpis(this.prisma, range),
            computeSalesTrend(this.prisma, range),
            computeTopSpenders(this.prisma, range),
            computeTopEarners(this.prisma, range),
            this.prisma.walletTransaction.findMany({
                where: transactionsWhere,
                include: { user: { select: { name: true, role: true } } },
                orderBy: { createdAt: 'desc' },
                take: filters?.limit ? Number(filters.limit) : 100,
                skip:
                    filters?.page && filters?.limit
                        ? (Number(filters.page) - 1) * Number(filters.limit)
                        : 0,
            }),
        ]);

        return {
            kpis,
            salesTrend,
            topSpenders,
            topEarners,
            transactions: transactions.map((t) => ({
                id: t.id,
                userId: t.userId,
                userName: t.user?.name || 'Unknown',
                userRole: t.user?.role || t.role,
                amount: Number(t.amount),
                type: t.type,
                transactionType: t.transactionType,
                status: 'COMPLETED',
                date: t.createdAt,
            })),
            meta: { hasDateFilter },
        };
    }

    async exportFinancialTransactions(filters?: any) {
        const data = await this.getAdminFinancials(filters);
        return data.transactions;
    }

    async exportUnifiedFinancialFeed(filters?: any) {
        const result = await this.getUnifiedFinancialFeed({
            ...filters,
            limit: filters?.limit ? Number(filters.limit) : 100000,
            cursor: undefined,
        });
        return result.data;
    }

    async sendManualPayout(adminId: string, dto: AdminManualPayoutDto) {
        const { userId, amount, note, adminName, adminEmail, adminSignature, method } = dto;

        const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { store: true } });
        if (!user) throw new NotFoundException('User not found');

        let balance = 0;
        let role = user.role;
        let stripeId = null;

        if (role === 'CUSTOMER') {
            balance = Number(user.customerBalance || 0);
            stripeId = user.stripeAccountId;
        } else if (user.store) {
            balance = Number(user.store.balance || 0);
            stripeId = user.store.stripeAccountId;
            role = 'VENDOR' as any;
        }

        if (balance < amount) {
            throw new BadRequestException('Insufficient balance for manual payout');
        }

        if (method === PayoutMethod.STRIPE_CONNECT && !stripeId) {
            throw new BadRequestException('User does not have a Stripe Connect account');
        }

        // Phase A (committed tx): lock, revalidate and debit the ledger. No network calls here,
        // so the DB transaction stays short and never blocks on Stripe.
        const walletTx = await this.prisma.$transaction(async (tx) => {
            let balanceAfter = 0;

            if (role === 'CUSTOMER') {
                await tx.$executeRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
                const locked = await tx.user.findUnique({ where: { id: userId }, select: { customerBalance: true } });
                const current = Number(locked?.customerBalance || 0);
                if (current < amount) {
                    throw new BadRequestException('Insufficient balance for manual payout');
                }
                await tx.user.update({
                    where: { id: userId },
                    data: { customerBalance: { decrement: amount } }
                });
                balanceAfter = current - amount;
            } else {
                await tx.$executeRaw`SELECT id FROM stores WHERE id = ${user.store!.id}::uuid FOR UPDATE`;
                const locked = await tx.store.findUnique({ where: { id: user.store!.id }, select: { balance: true } });
                const current = Number(locked?.balance || 0);
                if (current < amount) {
                    throw new BadRequestException('Insufficient balance for manual payout');
                }
                await tx.store.update({
                    where: { id: user.store!.id },
                    data: { balance: { decrement: amount } }
                });
                balanceAfter = current - amount;
            }

            const created = await tx.walletTransaction.create({
                data: {
                    userId,
                    role: role,
                    type: 'DEBIT',
                    transactionType: 'MANUAL_PAYOUT',
                    amount,
                    description: `Admin Payout: ${note || 'No notes'}`,
                    balanceAfter
                }
            });

            await this.auditLogs.logAction({
                entity: 'FINANCIAL',
                action: 'MANUAL_PAYOUT',
                actorType: ActorType.ADMIN,
                actorId: adminId,
                actorName: adminName,
                metadata: { amount, method, note, adminEmail, adminSignature }
            }, tx);

            return created;
        });

        // Phase B (after commit): run the Stripe transfer OUTSIDE the DB transaction, keyed by the
        // persisted walletTx id so retries never double-transfer. Compensate on failure.
        let transferId: string | null = null;
        if (method === PayoutMethod.STRIPE_CONNECT) {
            try {
                const transfer = await this.stripeService.createTransfer(
                    amount.toString(),
                    'AED',
                    stripeId!,
                    `MANUAL_PAYOUT_${walletTx.id}`,
                    { adminId, note },
                    `manual_payout_${walletTx.id}`,
                );
                transferId = transfer.id;
                await this.prisma.walletTransaction.update({
                    where: { id: walletTx.id },
                    data: { metadata: { stripeTransferId: transferId } },
                });
            } catch (err: any) {
                this.logger.error(`Stripe Transfer failed for manual payout: ${err.message}`);
                await this.prisma.$transaction(async (tx) => {
                    if (role === 'CUSTOMER') {
                        await tx.user.update({ where: { id: userId }, data: { customerBalance: { increment: amount } } });
                    } else {
                        await tx.store.update({ where: { id: user.store!.id }, data: { balance: { increment: amount } } });
                    }
                    await tx.walletTransaction.update({
                        where: { id: walletTx.id },
                        data: { description: `Admin Payout REVERSED (Stripe failed): ${note || 'No notes'}` },
                    });
                });
                throw new BadRequestException(`Stripe Transfer failed: ${err.message}`);
            }
        }

            this.notifications.create({
                recipientId: userId,
                titleAr: 'ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø¯ÙØ¹Ø© Ù…Ø§Ù„ÙŠØ©',
                titleEn: 'Payout Processed',
                messageAr: `ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø¯ÙØ¹Ø© Ø¨Ù…Ø¨Ù„Øº ${amount} Ø¯Ø±Ù‡Ù… Ø¥Ù„Ù‰ Ø­Ø³Ø§Ø¨Ùƒ.`,
                messageEn: `A payout of ${amount} AED has been processed to your account.`,
                type: 'financial',
                link: '/dashboard/wallet'
            });

        return {
            success: true,
            message: 'Manual payout executed successfully',
            walletTransactionId: walletTx.id,
            stripeTransferId: transferId,
        };
    }

    /**
     * Phase 1: Unified Financial Feed (2026 Standard)
     * Aggregates events from Payments, Wallet, Escrow, and Withdrawals.
     */
    async getUnifiedFinancialFeed(filters: any) {
        const limit = Math.min(Math.max(Number(filters?.limit) || 50, 1), 100);

        const [{ rows, hasMore }, total] = await Promise.all([
            fetchUnifiedFeedIndex(this.prisma, filters),
            countUnifiedFeed(this.prisma, filters),
        ]);

        if (rows.length === 0) {
            return { data: [], total, hasMore: false, nextCursor: undefined };
        }

        const paymentIds = rows.filter((r) => r.source === 'PAYMENT').map((r) => r.id);
        const walletIds = rows.filter((r) => r.source === 'WALLET').map((r) => r.id);
        const escrowIds = rows.filter((r) => r.source === 'ESCROW').map((r) => r.id);
        const withdrawalIds = rows.filter((r) => r.source === 'WITHDRAWAL').map((r) => r.id);

        const [payments, walletTx, escrows, withdrawals] = await Promise.all([
            paymentIds.length
                ? this.prisma.paymentTransaction.findMany({
                      where: { id: { in: paymentIds } },
                      include: {
                          customer: { select: { id: true, name: true, avatar: true } },
                          order: { select: { id: true, orderNumber: true } },
                          offer: {
                              include: {
                                  store: {
                                      select: { id: true, name: true, logo: true, storeCode: true },
                                  },
                              },
                          },
                      },
                  })
                : [],
            walletIds.length
                ? this.prisma.walletTransaction.findMany({
                      where: { id: { in: walletIds } },
                      include: {
                          user: {
                              select: {
                                  id: true,
                                  name: true,
                                  avatar: true,
                                  store: {
                                      select: { id: true, name: true, logo: true, storeCode: true },
                                  },
                              },
                          },
                          payment: {
                              select: { id: true, order: { select: { orderNumber: true, id: true } } },
                          },
                      },
                  })
                : [],
            escrowIds.length
                ? this.prisma.escrowTransaction.findMany({
                      where: { id: { in: escrowIds } },
                      include: {
                          order: {
                              select: {
                                  id: true,
                                  orderNumber: true,
                                  customer: { select: { id: true, name: true, avatar: true } },
                                  store: {
                                      select: { id: true, name: true, logo: true, storeCode: true },
                                  },
                              },
                          },
                      },
                  })
                : [],
            withdrawalIds.length
                ? this.prisma.withdrawalRequest.findMany({
                      where: { id: { in: withdrawalIds } },
                      include: {
                          user: { select: { id: true, name: true, avatar: true } },
                          store: { select: { id: true, name: true, logo: true, storeCode: true } },
                          processor: { select: { id: true, name: true } },
                      },
                  })
                : [],
        ]);

        const paymentMap = new Map(payments.map((p) => [p.id, p] as const));
        const walletMap = new Map(walletTx.map((w) => [w.id, w] as const));
        const escrowMap = new Map(escrows.map((e) => [e.id, e] as const));
        const withdrawalMap = new Map(withdrawals.map((w) => [w.id, w] as const));

        const data: UnifiedFinancialEventDto[] = rows
            .map((row) => {
                if (row.source === 'PAYMENT') {
                    const p = paymentMap.get(row.id);
                    return p ? this.mapPaymentToUnified(p) : null;
                }
                if (row.source === 'WALLET') {
                    const w = walletMap.get(row.id);
                    return w ? this.mapWalletToUnified(w) : null;
                }
                if (row.source === 'ESCROW') {
                    const e = escrowMap.get(row.id);
                    return e ? this.mapEscrowToUnified(e) : null;
                }
                const wd = withdrawalMap.get(row.id);
                return wd ? this.mapWithdrawalToUnified(wd) : null;
            })
            .filter(Boolean) as UnifiedFinancialEventDto[];

        const lastRow = rows[rows.length - 1];
        const nextCursor = hasMore && lastRow ? encodeFeedCursor(lastRow) : undefined;

        return { data, total, hasMore, nextCursor };
    }

    /**
     * Order Financial Timeline — optimized parallel queries (2026)
     */
    async getOrderFinancialTimeline(orderId: string) {
        return buildOrderFinancialTimeline(this.prisma, orderId);
    }


    private resolveWalletFinancialImpact(txType: string, type: string): UnifiedFinancialEventDto['financialImpact'] {
        const upper = txType.toUpperCase();
        if (upper === 'COMMISSION' || upper === 'commission') return 'PLATFORM_REVENUE';
        if (upper === 'ORDER_PROFIT' || upper === 'REFERRAL_PROFIT') return 'PLATFORM_EXPENSE';
        if (type === 'CREDIT') return 'USER_LIABILITY';
        return 'NEUTRAL';
    }

    private mapPaymentToUnified(p: any): UnifiedFinancialEventDto {
        const amount = Number(p.totalAmount);
        return {
            id: p.id,
            source: FinancialEventSource.PAYMENT,
            orderId: p.orderId,
            orderNumber: p.order?.orderNumber,
            reference: p.order?.orderNumber || p.id,
            debit: amount,
            credit: undefined,
            executorName: undefined,
            customerId: p.customerId,
            customerName: p.customer?.name,
            customerAvatar: p.customer?.avatar,
            storeId: p.offer?.store?.id,
            storeName: p.offer?.store?.name,
            storeLogo: p.offer?.store?.logo,
            storeCode: p.offer?.store?.storeCode,
            amount,
            currency: p.currency,
            direction: FinancialDirection.DEBIT,
            unitPrice: Number(p.unitPrice),
            shippingCost: Number(p.shippingCost),
            commission: Number(p.commission),
            gatewayFee: Number(p.gatewayFee),
            refundedAmount: Number(p.refundedAmount),
            paymentId: p.id,
            transactionNumber: p.transactionNumber,
            financialImpact: 'NEUTRAL',
            eventType: `PAYMENT_${p.status}`,
            eventTypeEn: getPaymentStatusLabel(p.status, 'en'),
            eventTypeAr: getPaymentStatusLabel(p.status, 'ar'),
            status: p.status,
            createdAt: p.createdAt,
            updatedAt: p.paidAt || p.createdAt,
            metadata: { transactionNumber: p.transactionNumber, method: p.cardBrand },
        };
    }

    private mapWalletToUnified(w: any): UnifiedFinancialEventDto {
        const isCredit = w.type === 'CREDIT';
        const txType = String(w.transactionType || '').toUpperCase();
        const amount = Number(w.amount);
        const meta = (w.metadata as Record<string, unknown>) || {};
        return {
            id: w.id,
            source: FinancialEventSource.WALLET,
            orderId: w.payment?.order?.id,
            orderNumber: w.payment?.order?.orderNumber,
            reference: (meta.requestId as string) || w.payment?.order?.orderNumber || w.id,
            debit: isCredit ? undefined : amount,
            credit: isCredit ? amount : undefined,
            executorName: (meta.adminName as string) || undefined,
            customerId: w.role === 'CUSTOMER' ? w.userId : undefined,
            customerName: w.role === 'CUSTOMER' ? w.user?.name : undefined,
            customerAvatar: w.role === 'CUSTOMER' ? w.user?.avatar : undefined,
            storeId: w.role === 'VENDOR' ? w.user?.store?.id : undefined,
            storeName: w.role === 'VENDOR' ? w.user?.store?.name : undefined,
            storeLogo: w.role === 'VENDOR' ? w.user?.store?.logo : undefined,
            storeCode: w.role === 'VENDOR' ? w.user?.store?.storeCode : undefined,
            amount,
            currency: w.currency,
            direction: isCredit ? FinancialDirection.CREDIT : FinancialDirection.DEBIT,
            balanceAfter: Number(w.balanceAfter),
            userRole: w.role,
            walletTxId: w.id,
            paymentId: w.paymentId || undefined,
            financialImpact: this.resolveWalletFinancialImpact(txType, w.type),
            eventType: txType,
            eventTypeEn: getWalletTypeLabel(w.transactionType, 'en'),
            eventTypeAr: getWalletTypeLabel(w.transactionType, 'ar'),
            status: 'COMPLETED',
            description: w.description,
            createdAt: w.createdAt,
            updatedAt: w.createdAt,
            metadata: meta,
        };
    }

    private mapEscrowToUnified(e: any): UnifiedFinancialEventDto {
        const amount = Number(e.merchantAmount);
        return {
            id: e.id,
            source: FinancialEventSource.ESCROW,
            orderId: e.orderId,
            orderNumber: e.order?.orderNumber,
            reference: e.order?.orderNumber || e.orderId,
            debit: e.status === 'RELEASED' ? amount : undefined,
            credit: e.status === 'HELD' || e.status === 'FROZEN' ? amount : undefined,
            executorName: undefined,
            customerId: e.order?.customer?.id,
            customerName: e.order?.customer?.name,
            storeId: e.order?.store?.id,
            storeName: e.order?.store?.name,
            storeCode: e.order?.store?.storeCode,
            amount: Number(e.merchantAmount),
            merchantAmount: Number(e.merchantAmount),
            escrowStatus: e.status,
            currency: 'AED',
            direction:
                e.status === 'RELEASED'
                    ? FinancialDirection.RELEASE
                    : e.status === 'FROZEN'
                      ? FinancialDirection.FREEZE
                      : FinancialDirection.HOLD,
            financialImpact: 'NEUTRAL',
            eventType: `ESCROW_${e.status}`,
            eventTypeEn: getEscrowStatusLabel(e.status, 'en'),
            eventTypeAr: getEscrowStatusLabel(e.status, 'ar'),
            status: e.status,
            createdAt: e.createdAt,
            updatedAt: e.releasedAt || e.createdAt,
        };
    }

    private mapWithdrawalToUnified(wd: any): UnifiedFinancialEventDto {
        const amount = Number(wd.amount);
        return {
            id: wd.id,
            source: FinancialEventSource.WITHDRAWAL,
            reference: wd.id,
            debit: amount,
            credit: undefined,
            executorName: wd.processor?.name || undefined,
            customerId: wd.role === 'CUSTOMER' ? wd.userId : undefined,
            customerName: wd.role === 'CUSTOMER' ? wd.user?.name : undefined,
            customerAvatar: wd.role === 'CUSTOMER' ? wd.user?.avatar : undefined,
            storeId: wd.role === 'VENDOR' ? wd.storeId : undefined,
            storeName: wd.role === 'VENDOR' ? wd.store?.name : undefined,
            storeLogo: wd.role === 'VENDOR' ? wd.store?.logo : undefined,
            storeCode: wd.role === 'VENDOR' ? wd.store?.storeCode : undefined,
            amount,
            currency: wd.currency,
            direction: FinancialDirection.DEBIT,
            payoutMethod: wd.payoutMethod,
            adminNotes: wd.adminNotes || undefined,
            stripeTransferId: wd.stripeTransferId || undefined,
            processedAt: wd.transferCompletedAt || (wd.status !== 'PENDING' ? wd.updatedAt : undefined),
            userRole: wd.role,
            financialImpact: 'USER_LIABILITY',
            eventType: `WITHDRAWAL_${wd.status}`,
            eventTypeEn: getWithdrawalLabel(wd.status, 'en'),
            eventTypeAr: getWithdrawalLabel(wd.status, 'ar'),
            status: wd.status,
            createdAt: wd.createdAt,
            updatedAt: wd.updatedAt,
            metadata: { method: wd.payoutMethod, role: wd.role },
        };
    }
}
