import {
    Controller,
    Post,
    Get,
    Req,
    UseGuards,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('stripe')
@UseGuards(JwtAuthGuard)
export class StripeController {
    private readonly logger = new Logger(StripeController.name);

    constructor(
        private readonly stripeService: StripeService,
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {}

    private resolveFrontendBaseUrl(): string {
        let frontendUrl =
            this.configService.get<string>('FRONTEND_URL')?.trim() ||
            'http://localhost:5173';
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
        store: { id: string; stripeAccountId: string | null },
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
                data: { stripeAccountId: null, stripeOnboarded: false },
            });
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
                stripeAccountId: true,
                stripeOnboarded: true,
                payoutSchedule: true,
            },
        });

        if (store) {
            if (store.stripeAccountId && !store.stripeOnboarded) {
                try {
                    const account = await this.stripeService.retrieveAccountOrNull(
                        store.stripeAccountId,
                    );
                    if (account?.details_submitted) {
                        await this.prisma.store.update({
                            where: { id: store.id },
                            data: { stripeOnboarded: true },
                        });
                        return {
                            stripeAccountId: store.stripeAccountId,
                            stripeOnboarded: true,
                            payoutSchedule: store.payoutSchedule,
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
            };
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { stripeAccountId: true, stripeOnboarded: true },
        });

        if (user) {
            if (user.stripeAccountId && !user.stripeOnboarded) {
                try {
                    const account = await this.stripeService.retrieveAccountOrNull(
                        user.stripeAccountId,
                    );
                    if (account?.details_submitted) {
                        await this.prisma.user.update({
                            where: { id: userId },
                            data: { stripeOnboarded: true },
                        });
                        return {
                            stripeAccountId: user.stripeAccountId,
                            stripeOnboarded: true,
                        };
                    }
                } catch (error) {
                    this.logger.warn(`Stripe status check failed for user ${userId}: ${error}`);
                }
            }
            return {
                stripeAccountId: user.stripeAccountId,
                stripeOnboarded: user.stripeOnboarded,
            };
        }

        return { stripeOnboarded: false };
    }
}
