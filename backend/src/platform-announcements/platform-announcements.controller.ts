import { Controller, Get, Query } from '@nestjs/common';
import { PlatformAnnouncementsService } from './platform-announcements.service';

@Controller('platform-announcements')
export class PlatformAnnouncementsController {
  constructor(private readonly announcements: PlatformAnnouncementsService) {}

  @Get('active')
  findActive(@Query('audience') audience?: string) {
    return this.announcements.findActive(audience);
  }
}
