import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StoresService } from '../stores/stores.service';

/**
 * Daily document/license expiry enforcement:
 * - Warn merchant + admins within 30 days / grace
 * - Auto-set LICENSE_EXPIRED after 15-day grace
 */
@Injectable()
export class DocumentExpiryService {
    private readonly logger = new Logger(DocumentExpiryService.name);

    constructor(private readonly storesService: StoresService) {}

    @Cron(CronExpression.EVERY_DAY_AT_1AM)
    async handleDocumentExpiryScan() {
        this.logger.log('Starting document expiry scan...');
        try {
            const result = await this.storesService.scanDocumentExpiries();
            this.logger.log(
                `Document expiry scan done: scanned=${result.scanned} suspended=${result.suspended} warned=${result.warned}`,
            );
        } catch (err: any) {
            this.logger.error(`Document expiry scan failed: ${err?.message || err}`);
        }
    }
}
