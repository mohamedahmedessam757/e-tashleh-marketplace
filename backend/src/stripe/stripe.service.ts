import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe = require('stripe');
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StripeService {
    private readonly stripe: any;
    private readonly logger = new Logger(StripeService.name);

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!secretKey) {
            this.logger.warn('STRIPE_SECRET_KEY is missing from environment variables');
        }
        this.stripe = new Stripe(secretKey || '', {
            apiVersion: '2026-03-25.dahlia' as any, // latest stable typings
        });
    }

    isConfigured(): boolean {
        const key = this.configService.get<string>('STRIPE_SECRET_KEY');
        return Boolean(key?.trim());
    }

    private assertConfigured(): void {
        if (!this.isConfigured()) {
            throw new BadRequestException(
                'Stripe is not configured on the server (missing STRIPE_SECRET_KEY).',
            );
        }
    }

    /** Maps Stripe SDK errors to safe 400 responses (avoids opaque 500 in production). */
    mapStripeError(error: unknown): BadRequestException {
        const err = error as { message?: string; type?: string; code?: string; statusCode?: number };
        const msg = err?.message || 'Stripe request failed';
        this.logger.error(`Stripe API error: ${msg}`, err?.type || err?.code || '');

        if (
            msg.includes('signed up for Connect') ||
            msg.includes('complete your platform profile') ||
            msg.includes('managing losses')
        ) {
            return new BadRequestException(
                'Stripe Connect is not enabled on this platform. Please contact support or use bank transfer.',
            );
        }
        if (err?.type === 'StripeAuthenticationError' || err?.statusCode === 401) {
            return new BadRequestException(
                'Stripe API key is invalid or mismatched (test vs live). Check server STRIPE_SECRET_KEY.',
            );
        }
        if (msg.includes('Invalid email') || err?.code === 'email_invalid') {
            return new BadRequestException('A valid account email is required for Stripe Connect.');
        }
        if (msg.includes('must be a valid URL') || msg.includes('redirect')) {
            return new BadRequestException(
                'Stripe onboarding redirect URL is invalid. Ensure FRONTEND_URL is https://e-tashleh.net on the server.',
            );
        }
        return new BadRequestException(`Stripe error: ${msg}`);
    }

    async retrieveAccountOrNull(accountId: string): Promise<any | null> {
        this.assertConfigured();
        try {
            return await this.stripe.accounts.retrieve(accountId);
        } catch (error: unknown) {
            const err = error as { code?: string; statusCode?: number };
            if (err?.code === 'resource_missing' || err?.statusCode === 404) {
                return null;
            }
            throw this.mapStripeError(error);
        }
    }

    buildConnectAccountDisplay(account: Record<string, unknown> | null | undefined) {
        if (!account) {
            return null;
        }
        const id = String(account.id || '');
        const email = typeof account.email === 'string' ? account.email : null;
        const businessProfile = account.business_profile as { name?: string } | undefined;
        const company = account.company as { name?: string } | undefined;
        const businessName = businessProfile?.name || company?.name || null;

        return {
            maskedAccountId: id.length > 10 ? `${id.slice(0, 5)}••••${id.slice(-4)}` : id || null,
            email,
            businessName,
            payoutsEnabled: Boolean(account.payouts_enabled),
            chargesEnabled: Boolean(account.charges_enabled),
            detailsSubmitted: Boolean(account.details_submitted),
        };
    }

    /**
     * Creates a new connected Express account
     */
    async createConnectedAccount(storeId: string, email: string, isCustomer: boolean = false): Promise<any> {
        this.assertConfigured();
        const normalizedEmail = email?.trim();
        if (!normalizedEmail) {
            throw new BadRequestException('A valid email is required before Stripe Connect onboarding.');
        }

        try {
            const account = await this.stripe.accounts.create({
                controller: {
                    fees: { payer: 'application' },
                    losses: { payments: 'application' },
                    stripe_dashboard: { type: 'express' },
                    requirement_collection: 'stripe',
                },
                country: 'AE',
                email: normalizedEmail,
                capabilities: {
                    transfers: { requested: true },
                },
                metadata: {
                    id: storeId,
                    ...(isCustomer ? {} : { storeId }),
                    type: isCustomer ? 'customer' : 'store',
                },
                settings: {
                    payouts: {
                        schedule: { interval: 'manual' },
                    },
                },
            } as any);

            if (!isCustomer) {
                await this.prisma.store.update({
                    where: { id: storeId },
                    data: {
                        stripeAccountId: account.id,
                        payoutSchedule: 'MANUAL',
                    },
                });
            }

            return account;
        } catch (error: unknown) {
            throw this.mapStripeError(error);
        }
    }

    /**
     * Creates an onboarding URL for the connected account
     */
    async createOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
        this.assertConfigured();
        const isProd = this.configService.get<string>('NODE_ENV') === 'production';
        if (isProd && (!returnUrl.startsWith('https://') || !refreshUrl.startsWith('https://'))) {
            throw new BadRequestException(
                'Stripe live mode requires HTTPS return URLs. Set FRONTEND_URL=https://e-tashleh.net on the server.',
            );
        }

        try {
            const accountLink = await this.stripe.accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: 'account_onboarding',
            });
            return accountLink.url;
        } catch (error: unknown) {
            throw this.mapStripeError(error);
        }
    }

    /**
     * View Stripe Dashboard link (Express accounts)
     */
    async createLoginLink(accountId: string): Promise<string> {
        const loginLink = await this.stripe.accounts.createLoginLink(accountId);
        return loginLink.url;
    }

    async createPaymentIntent(amountStr: string, currency: string, metadata: any, customerId?: string): Promise<any> {
        const amountCents = Math.round(parseFloat(amountStr) * 100);
        
        const params: any = {
            amount: amountCents,
            currency: currency,
            metadata: metadata,
            transfer_group: metadata.orderId,
            setup_future_usage: 'off_session', // Standard for 2026: Always allow saving for better UX
        };

        if (customerId) {
            params.customer = customerId;
        }

        return await this.stripe.paymentIntents.create(params);
    }

    /** Retrieve an existing PaymentIntent (idempotent payment retries). */
    async retrievePaymentIntent(paymentIntentId: string): Promise<any> {
        return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    }

    /**
     * Get or Create a Stripe Customer for a user
     */
    async getOrCreateCustomer(userId: string, email: string, name?: string): Promise<string> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { stripeCustomerId: true }
        });

        if (user?.stripeCustomerId) {
            return user.stripeCustomerId;
        }

        const customer = await this.stripe.customers.create({
            email,
            name,
            metadata: { userId }
        });

        await this.prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: customer.id }
        });

        return customer.id;
    }

    /**
     * List saved payment methods for a customer
     */
    async listPaymentMethods(customerId: string): Promise<any[]> {
        const paymentMethods = await this.stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });
        return paymentMethods.data;
    }

    /** Attach a payment method to a Stripe customer (idempotent if already attached). */
    async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<void> {
        try {
            await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        } catch (error: any) {
            const msg = error?.message || '';
            if (!msg.includes('already been attached')) {
                throw error;
            }
        }
    }

    /**
     * Creates a Stripe Checkout Session for one-time payment (e.g. shipping).
     * 2026 Best Practice: Using hosted checkout for maximum 3DS and SCA compliance.
     */
    async createCheckoutSession(params: {
        amount: string;
        currency: string;
        successUrl: string;
        cancelUrl: string;
        metadata: any;
        customerEmail?: string;
    }): Promise<any> {
        const amountCents = Math.round(parseFloat(params.amount) * 100);

        return await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: params.currency,
                    product_data: {
                        name: `Shipping Payment - Order #${params.metadata.orderNumber || 'N/A'}`,
                        description: `Shipping cost for ${params.metadata.caseType} #${params.metadata.caseId}`,
                    },
                    unit_amount: amountCents,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: params.successUrl,
            cancel_url: params.cancelUrl,
            metadata: params.metadata,
            customer_email: params.customerEmail,
            payment_intent_data: {
                transfer_group: params.metadata.orderId,
                metadata: params.metadata,
            }
        });
    }

    /**
     * Creates a destination transfer, releasing funds from Platform to Merchant.
     */
    async createTransfer(amountStr: string, currency: string, connectedAccountId: string, transferGroup: string, metadata: any, idempotencyKey?: string): Promise<any> {
        const amountCents = Math.round(parseFloat(amountStr) * 100);

        try {
            return await this.stripe.transfers.create(
                {
                    amount: amountCents,
                    currency,
                    destination: connectedAccountId,
                    transfer_group: transferGroup,
                    metadata: metadata,
                },
                idempotencyKey ? { idempotencyKey } : undefined,
            );
        } catch (error: any) {
            this.logger.error(`Failed to transfer funds to ${connectedAccountId}`, error.message);
            throw new BadRequestException(`Transfer failed: ${error.message}`);
        }
    }

    /**
     * Request payout from connected account balance to external bank.
     */
    async createPayout(amountStr: string, currency: string, connectedAccountId: string): Promise<any> {
        const amountCents = Math.round(parseFloat(amountStr) * 100);
        
        try {
            return await this.stripe.payouts.create(
                {
                    amount: amountCents,
                    currency,
                },
                { stripeAccount: connectedAccountId }
            );
        } catch (error: any) {
            this.logger.error(`Failed to execute payout for ${connectedAccountId}`, error.message);
            throw new BadRequestException(`Payout failed: ${error.message}`);
        }
    }

    /**
     * Remaining refundable amount on a PaymentIntent (AED), from Stripe charge state.
     */
    async getMaxRefundableAmountAed(paymentIntentId: string): Promise<number> {
        const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge'],
        });
        const charge = (pi as any).latest_charge;
        if (charge && typeof charge !== 'string') {
            const remaining = (Number(charge.amount) - Number(charge.amount_refunded || 0)) / 100;
            return Math.max(0, Math.round(remaining * 100) / 100);
        }
        const received = Number((pi as any).amount_received || pi.amount || 0) / 100;
        const refunded = Number((pi as any).amount_refunded || 0) / 100;
        return Math.max(0, Math.round((received - refunded) * 100) / 100);
    }

    /**
     * Refund a PaymentIntent (full or partial)
     */
    async createRefund(paymentIntentId: string, amountStr?: string): Promise<any> {
        const params: any = {
            payment_intent: paymentIntentId,
        };
        if (amountStr) {
            params.amount = Math.round(parseFloat(amountStr) * 100);
        }
        return await this.stripe.refunds.create(params);
    }

    constructWebhookEvent(body: Buffer, sig: string): any {
        const endpointSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
        if (!endpointSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
        return this.stripe.webhooks.constructEvent(body, sig, endpointSecret);
    }

    // Helper to get raw stripe client if needed
    getStripeClient(): any {
        return this.stripe;
    }
}
