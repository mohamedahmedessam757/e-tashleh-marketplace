import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EscrowService } from '../payments/escrow.service';
import { FinancialConfigService } from '../common/financial-config.service';
import { CronLockService } from '../common/cron-lock.service';
import {
    escrowReleaseWindowEnd,
    isEscrowPaymentEligibleForAutoRelease,
} from '../payments/escrow-release-eligibility.util';

@Injectable()
export class EscrowCronService {
    private readonly logger = new Logger(EscrowCronService.name);

    constructor(
        private prisma: PrismaService,
        private escrowService: EscrowService,
        private financialConfig: FinancialConfigService,
        private cronLock: CronLockService,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async handleAutoRelease() {
        const { ran } = await this.cronLock.runWithLock('escrow-auto-release', () => this.runAutoRelease());
        if (!ran) this.logger.debug('Escrow auto-release skipped (locked by another instance).');
    }

    private async runAutoRelease() {
        const config = await this.financialConfig.getConfig();
        const holdHours = config.escrowHoldHoursMerchant;
        this.logger.log(`Running Escrow Auto-Release Cron (${holdHours}h after delivery/completion)...`);
        const windowEnd = escrowReleaseWindowEnd(new Date(), holdHours);

        try {
            const heldEscrows = await this.prisma.escrowTransaction.findMany({
                where: { status: 'HELD' },
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

                try {
                    this.logger.log(
                        `Auto-releasing escrow for order ${escrow.orderId} (payment ${escrow.paymentId})...`,
                    );
                    await this.escrowService.releaseFunds(
                        escrow.orderId,
                        'AUTO_48H',
                        undefined,
                        escrow.paymentId,
                    );
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    this.logger.warn(
                        `Escrow release skipped for payment ${escrow.paymentId}: ${message}`,
                    );
                }
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error during auto-release cron: ${message}`);
        }
    }
}
