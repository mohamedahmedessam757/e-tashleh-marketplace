import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformAnnouncementsService } from './platform-announcements.service';
import { PlatformAnnouncementsController } from './platform-announcements.controller';
import { PlatformAnnouncementsAdminController } from './platform-announcements-admin.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformAnnouncementsController, PlatformAnnouncementsAdminController],
  providers: [PlatformAnnouncementsService],
  exports: [PlatformAnnouncementsService],
})
export class PlatformAnnouncementsModule {}
