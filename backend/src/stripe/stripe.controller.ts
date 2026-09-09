import {
    Controller,
    Post,
    Get,
    Req,
    UseGuards,
    BadRequestException,
    Logger,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { StoreStatus } from '@prisma/client';
import { StoreStripeActivationService } from '../stores/store-stripe-activation.service';
import { mapStripeAccountToStoreFields, stripeMerchantPhase } from '../stores/store-activation.policy';

@Controller('stripe')
@UseGuards(JwtAuthGuard)
export class StripeController {
    private readonly logger = new Logger(StripeController.name);

    constructor(
        private readonly stripeService: StripeService,
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => StoreStripeActivationService))
        private readonly storeStripeActivation: StoreStripeActivationService,
    ) {}

    private resolveFrontendBaseUrl(): string {
        let frontendUrl =
            this.configService.get<string>('FRONTEND_URL')?.trim() ||
            'https://e-tashleh.net';
        frontendUrl = frontendUrl.replace(/^["']|["']$/g, '').replace(/\/$/, '');

        const isProd = this.configService.get<string>('NODE_ENV') === 'production';
        if (isProd && !frontendUrl.startsWith('https://')) {
            throw new BadRequestException(
                'FRONTEND_URL must be https://e-tashleh.net in production for Stripe Connect.',
            );
        }
        return frontendUrl;
    }

    private buildWalletRedirectUrls(): { returnUrl: string; refreshUrl: string } {
        const base = this.resolveFrontendBaseUrl();
        return {
            returnUrl: `${base}/dashboard/wallet?stripe_status=return`,
            refreshUrl: `${base}/dashboard/wallet?stripe_status=refresh`,
        };
    }

    private async resolveMerchantAccountId(
        store: {
            id: string;
            stripeAccountId: string | null;
            stripeActivationRequired?: boolean;
            status?: string;
        },
        email: string,
    ): Promise<string> {
        if (store.stripeAccountId) {
            const existing = await this.stripeService.retrieveAccountOrNull(store.stripeAccountId);
            if (existing) return store.stripeAccountId;

            this.logger.warn(
                `Stale Stripe account ${store.stripeAccountId} for store ${store.id}; creating a new one.`,
            );
            await this.prisma.store.update({
                where: { id: store.id },
                data: {
                    stripeAccountId: null,
                    stripeOnboarded: false,
                    stripeChargesEnabled: false,
                    stripePayoutsEnabled: false,
                    stripeDetailsSubmitted: false,
                    stripeDisabledReason: 'account_missing',
                    stripeRequirementsDue: ['account'],
                    stripeStatusUpdatedAt: new Date(),
                },
            });
            // Never leave a Stripe-required ACTIVE store without a restricted status.
            await this.storeStripeActivation.markRestrictedMissingAccount(store.id);
        }

        const account = await this.stripeService.createConnectedAccount(store.id, email);
        return account.id;
    }

    private async resolveCustomerAccountId(
        user: { id: string; email: string; stripeAccountId: string | null },
    ): Promise<string> {
        if (user.stripeAccountId) {
            const existing = await this.stripeService.retrieveAccountOrNull(user.stripeAccountId);
            if (existing) return user.stripeAccountId;

            this.logger.warn(
                `Stale Stripe account ${user.stripeAccountId} for user ${user.id}; creating a new one.`,
            );
            await this.prisma.user.update({
                where: { id: user.id },
                data: { stripeAccountId: null, stripeOnboarded: false },
            });
        }

        const account = await this.stripeService.createConnectedAccount(
            `cust_${user.id}`,
            user.email,
            true,
        );
        await this.prisma.user.update({
            where: { id: user.id },
            data: { stripeAccountId: account.id },
        });
        return account.id;
    }

    @Post('onboarding-link')
    async getOnboardingLink(@Req() req) {
        const userId = req.user.id;

        try {
            const { returnUrl, refreshUrl } = this.buildWalletRedirectUrls();

            const store = await this.prisma.store.findUnique({
                where: { ownerId: userId },
            });

            if (!store) {
                const user = await this.prisma.user.findUnique({ where: { id: userId } });
                if (!user) throw new BadRequestException('User not found');
                if (!user.email?.trim()) {
                    throw new BadRequestException(
                        'Your account must have an email before Stripe Connect onboarding.',
                    );
                }

                const stripeAccountId = await this.resolveCustomerAccountId(user);
                const link = await this.stripeService.createOnboardingLink(
                    stripeAccountId,
                    returnUrl,
                    refreshUrl,
                );
                return { url: link };
            }

            // Merchants on the new activation path need onboarding while pending/restricted,
            // or when ACTIVE but Stripe needs repair.
            const allowedStatuses: string[] = [
                StoreStatus.PENDING_STRIPE,
                StoreStatus.STRIPE_RESTRICTED,
                StoreStatus.ACTIVE,
                StoreStatus.PENDING_REVIEW,
                StoreStatus.PENDING_DOCUMENTS,
            ];
            if (!allowedStatuses.includes(store.status)) {
                throw new BadRequestException(
                    `Stripe onboarding is not available for store status ${store.status}.`,
                );
            }

            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            const email = user?.email?.trim() || store.name;
            if (!email) {
                throw new BadRequestException(
                    'Merchant account must have an email before Stripe Connect onboarding.',
                );
            }

            const stripeAccountId = await this.resolveMerchantAccountId(store, email);
            const link = await this.stripeService.createOnboardingLink(
                stripeAccountId,
                returnUrl,
                refreshUrl,
            );
            return { url: link };
        } catch (error: unknown) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error(`onboarding-link failed for user ${userId}`, error);
            throw this.stripeService.mapStripeError(error);
        }
    }

    @Get('dashboard-link')
    async getDashboardLink(@Req() req) {
        const userId = req.user.id;
        const store = await this.prisma.store.findUnique({
            where: { ownerId: userId },
        });

        try {
            if (store?.stripeAccountId) {
                const url = await this.stripeService.createLoginLink(store.stripeAccountId);
                return { url };
            }

            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (user?.stripeAccountId) {
                const url = await this.stripeService.createLoginLink(user.stripeAccountId);
                return { url };
            }

            throw new BadRequestException('No Stripe account connected');
        } catch (error: unknown) {
            if (error instanceof BadRequestException) throw error;
            throw this.stripeService.mapStripeError(error);
        }
    }

    @Get('status')
    async getStripeStatus(@Req() req) {
        const userId = req.user.id;

        const store = await this.prisma.store.findUnique({
            where: { ownerId: userId },
            select: {
                id: true,
                status: true,
                stripeAccountId: true,
                stripeOnboarded: true,
                payoutSchedule: true,
                stripeActivationRequired: true,
                stripeChargesEnabled: true,
                stripePayoutsEnabled: true,
                stripeDetailsSubmitted: true,
                stripeDisabledReason: true,
                stripeRequirementsDue: true,
                stripeRequirementsPending: true,
            },
        });

        if (store) {
            let stripeDisplay = null;
            let syncResult: { ready: boolean; status: string } | null = null;
            if (store.stripeAccountId) {
                try {
                    const account = await this.stripeService.retrieveAccountOrNull(
                        store.stripeAccountId,
                    );
                    if (account) {
                        stripeDisplay = this.stripeService.buildConnectAccountDisplay(account);
                        // Fallback sync (does NOT trust return_url alone — uses live account fields).
                        syncResult = await this.storeStripeActivation.syncStoreFromStripeAccount(
                            store.id,
                            account,
                        );
                        const mapped = mapStripeAccountToStoreFields(account);
                        return {
                            stripeAccountId: store.stripeAccountId,
                            stripeOnboarded: mapped.ready,
                            payoutSchedule: store.payoutSchedule,
                            stripeDisplay,
                            storeStatus: syncResult.status,
                            stripeActivationRequired: store.stripeActivationRequired,
                            stripeChargesEnabled: mapped.stripeChargesEnabled,
                            stripePayoutsEnabled: mapped.stripePayoutsEnabled,
                            stripeDetailsSubmitted: mapped.stripeDetailsSubmitted,
                            stripeDisabledReason: mapped.stripeDisabledReason,
                            stripeRequirementsDue: mapped.stripeRequirementsDue,
                            stripeRequirementsPending: mapped.stripeRequirementsPending,
                            stripeReady: mapped.ready,
                            stripePhase: stripeMerchantPhase(mapped.readiness),
                        };
                    }
                } catch (error) {
                    this.logger.warn(`Stripe status check failed for store ${store.id}: ${error}`);
                }
            }
            return {
                stripeAccountId: store.stripeAccountId,
                stripeOnboarded: store.stripeOnboarded,
                payoutSchedule: store.payoutSchedule,
                stripeDisplay,
                storeStatus: store.status,
                stripeActivationRequired: store.stripeActivationRequired,
                stripeChargesEnabled: store.stripeChargesEnabled,
                stripePayoutsEnabled: store.stripePayoutsEnabled,
                stripeDetailsSubmitted: store.stripeDetailsSubmitted,
                stripeDisabledReason: store.stripeDisabledReason,
                stripeRequirementsDue: store.stripeRequirementsDue,
                stripeRequirementsPending: store.stripeRequirementsPending,
                stripeReady: false,
                stripePhase: stripeMerchantPhase({
                    stripeAccountId: store.stripeAccountId,
                    chargesEnabled: Boolean(store.stripeChargesEnabled),
                    payoutsEnabled: Boolean(store.stripePayoutsEnabled),
                    detailsSubmitted: Boolean(store.stripeDetailsSubmitted),
                    disabledReason: store.stripeDisabledReason || null,
                    currentlyDue: Array.isArray(store.stripeRequirementsDue)
                        ? (store.stripeRequirementsDue as string[])
                        : [],
                    pendingVerification: Array.isArray(store.stripeRequirementsPending)
                        ? (store.stripeRequirementsPending as string[])
                        : [],
                }),
            };
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { stripeAccountId: true, stripeOnboarded: true },
        });

        if (user) {
            let stripeDisplay = null;
            if (user.stripeAccountId) {
                try {
                    const account = await this.stripeService.retrieveAccountOrNull(
                        user.stripeAccountId,
                    );
                    if (account) {
                        stripeDisplay = this.stripeService.buildConnectAccountDisplay(account);
                        if (account?.details_submitted && !user.stripeOnboarded) {
                            await this.prisma.user.update({
                                where: { id: userId },
                                data: { stripeOnboarded: true },
                            });
                            return {
                                stripeAccountId: user.stripeAccountId,
                                stripeOnboarded: true,
                                stripeDisplay,
                            };
                        }
                    }
                } catch (error) {
                    this.logger.warn(`Stripe status check failed for user ${userId}: ${error}`);
                }
            }
            return {
                stripeAccountId: user.stripeAccountId,
                stripeOnboarded: user.stripeOnboarded,
                stripeDisplay,
            };
        }

        return { stripeOnboarded: false, stripeDisplay: null };
    }
}
