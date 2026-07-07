import { Module } from '@nestjs/common';
import { PlatformSettingsController } from './platform-settings.controller';
import { PlatformSettingsService } from './platform-settings.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformConfigModule } from '../common/platform-config.module';
import { PlatformAnnouncementsModule } from '../platform-announcements/platform-announcements.module';

@Module({
  imports: [AuditLogsModule, PrismaModule, PlatformConfigModule, PlatformAnnouncementsModule],
  controllers: [PlatformSettingsController],
  providers: [PlatformSettingsService],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
