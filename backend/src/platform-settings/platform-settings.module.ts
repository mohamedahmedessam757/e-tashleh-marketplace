import { Module } from '@nestjs/common';
import { PlatformSettingsController } from './platform-settings.controller';
import { PlatformSettingsService } from './platform-settings.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialConfigService } from '../common/financial-config.service';

@Module({
  imports: [AuditLogsModule, PrismaModule],
  controllers: [PlatformSettingsController],
  providers: [PlatformSettingsService, FinancialConfigService],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
