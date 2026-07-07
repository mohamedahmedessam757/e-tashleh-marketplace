import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialConfigService } from './financial-config.service';
import { OrderDurationConfigService } from './order-duration-config.service';
import { LogisticsConfigService } from './logistics-config.service';
import { PlatformBrandingService } from './platform-branding.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    FinancialConfigService,
    OrderDurationConfigService,
    LogisticsConfigService,
    PlatformBrandingService,
  ],
  exports: [
    FinancialConfigService,
    OrderDurationConfigService,
    LogisticsConfigService,
    PlatformBrandingService,
  ],
})
export class PlatformConfigModule {}
