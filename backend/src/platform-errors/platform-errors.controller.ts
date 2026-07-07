import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ListPlatformErrorsQueryDto } from './dto/list-errors-query.dto';
import { ReportClientErrorDto } from './dto/report-client-error.dto';
import { PlatformErrorsService } from './platform-errors.service';

type AuthedRequest = Request & {
  user?: { id: string; email?: string; role?: string; phone?: string };
  correlationId?: string;
};

@Controller()
export class PlatformErrorsController {
  constructor(private readonly errors: PlatformErrorsService) {}

  @Public()
  @Post('system/client-errors')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  reportClient(@Body() dto: ReportClientErrorDto, @Req() req: AuthedRequest) {
    const actor = req.user
      ? {
          userId: req.user.id,
          userEmail: req.user.email,
          userPhone: req.user.phone,
          userRole: this.mapRole(req.user.role),
        }
      : undefined;

    return this.errors.reportClientError(dto, {
      actor,
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId || dto.correlationId,
    });
  }

  @Get('admin/platform-errors/summary/top')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings', 'view')
  topSummary() {
    return this.errors.getTopErrorsLast24h();
  }

  @Get('admin/platform-errors/correlation/:correlationId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings', 'view')
  byCorrelation(@Param('correlationId') correlationId: string) {
    return this.errors.getByCorrelationId(correlationId);
  }

  @Get('admin/platform-errors')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings', 'view')
  list(@Query() query: ListPlatformErrorsQueryDto) {
    return this.errors.list(query);
  }

  @Get('admin/platform-errors/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings', 'view')
  getOne(@Param('id') id: string) {
    return this.errors.getById(id);
  }

  @Patch('admin/platform-errors/:id/resolve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings', 'edit')
  resolve(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.errors.resolve(id, req.user!.id);
  }

  private mapRole(role?: string): 'GUEST' | 'CUSTOMER' | 'MERCHANT' | 'ADMIN' {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return 'ADMIN';
    if (role === 'VENDOR') return 'MERCHANT';
    if (role === 'CUSTOMER') return 'CUSTOMER';
    return 'GUEST';
  }
}
