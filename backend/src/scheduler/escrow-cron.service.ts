import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderCompletionFinanceService } from '../payments/order-completion-finance.service';
import { CronLockService } from '../common/cron-lock.service';

@Injectable()
export class EscrowCronService {
    private readonly logger = new Logger(EscrowCronService.name);

    constructor(
        private completionFinance: OrderCompletionFinanceService,
        private cronLock: CronLockService,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async handleAutoRelease() {
        const { ran } = await this.cronLock.runWithLock('escrow-auto-release', () => this.runAutoRelease());
        if (!ran) this.logger.debug('Escrow auto-release skipped (locked by another instance).');
    }

    private async runAutoRelease() {
        this.logger.log('Running Escrow Auto-Release Cron (eligible HELD/RELEASING + completion rewards)...');
        try {
            await this.completionFinance.syncEligibleEscrowReleases({ limit: 200 });
            this.logger.log('Escrow auto-release cron finished.');
        } catch (error) {
            this.logger.error('Escrow auto-release cron failed', error);
        }
    }
}
