import { Body, Controller, Param, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PlatformAnnouncementsService } from './platform-announcements.service';

@Controller('admin/platform-announcements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('settings', 'view')
export class PlatformAnnouncementsAdminController {
  constructor(private readonly announcements: PlatformAnnouncementsService) {}

  @Patch(':id/deactivate')
  @Permissions('settings', 'edit')
  deactivate(@Param('id') id: string) {
    return this.announcements.deactivate(id);
  }
}
