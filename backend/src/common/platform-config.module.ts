import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialConfigService } from './financial-config.service';
import { OrderDurationConfigService } from './order-duration-config.service';
import { LogisticsConfigService } from './logistics-config.service';
import { PlatformBrandingService } from './platform-branding.service';
import { CronLockService } from './cron-lock.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    FinancialConfigService,
    OrderDurationConfigService,
    LogisticsConfigService,
    PlatformBrandingService,
    CronLockService,
  ],
  exports: [
    FinancialConfigService,
    OrderDurationConfigService,
    LogisticsConfigService,
    PlatformBrandingService,
    CronLockService,
  ],
})
export class PlatformConfigModule {}
