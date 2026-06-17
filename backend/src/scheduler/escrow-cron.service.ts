import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EscrowService } from '../payments/escrow.service';
import {
    escrowReleaseWindowEnd,
    isOrderEligibleForEscrowAutoRelease,
} from '../payments/escrow-release-eligibility.util';

@Injectable()
export class EscrowCronService {
    private readonly logger = new Logger(EscrowCronService.name);

    constructor(
        private prisma: PrismaService,
        private escrowService: EscrowService,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async handleAutoRelease() {
        this.logger.log('Running Escrow Auto-Release Cron (24h after delivery/completion)...');
        const windowEnd = escrowReleaseWindowEnd();

        try {
            const heldEscrows = await this.prisma.escrowTransaction.findMany({
                where: { status: 'HELD' },
            });

            for (const escrow of heldEscrows) {
                const order = await this.prisma.order.findUnique({
                    where: { id: escrow.orderId },
                    select: { status: true, deliveredAt: true, updatedAt: true },
                });

                if (!order || !isOrderEligibleForEscrowAutoRelease(order, windowEnd)) {
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
