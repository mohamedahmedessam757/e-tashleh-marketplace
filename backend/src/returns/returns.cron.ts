import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReturnsService } from './returns.service';
import { CronLockService } from '../common/cron-lock.service';

@Injectable()
export class ReturnsCronService {
    private readonly logger = new Logger(ReturnsCronService.name);

    constructor(
        private readonly returnsService: ReturnsService,
        private readonly cronLock: CronLockService,
    ) { }

    /** Near-realtime escalation/handover; hourly job kept as safety net historically → now minute. */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleReturnsCron() {
        this.logger.debug('Running Returns & Disputes Maintenance Job...');
        const { ran } = await this.cronLock.runWithLock('returns-maintenance-minute', async () => {
            await this.returnsService.checkAutoEscalation();
            await this.returnsService.checkExpiredHandovers();
        });
        if (!ran) this.logger.debug('Returns maintenance skipped (locked).');
    }
}
