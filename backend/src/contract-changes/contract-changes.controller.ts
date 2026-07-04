import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContractChangesService } from './contract-changes.service';
import { SubmitContractChangeDto, ResolveContractChangeDto } from './dto/contract-change.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller()
export class ContractChangesController {
  constructor(private readonly contractChangesService: ContractChangesService) {}

  @Post('stores/me/contract-change-request')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 1, ttl: 86_400_000 } })
  submit(@Req() req: { user: { id: string; role: string } }, @Body() dto: SubmitContractChangeDto) {
    return this.contractChangesService.submitRequest(req.user.id, req.user.role, dto);
  }

  @Get('stores/me/contract-change-requests/pending')
  @UseGuards(JwtAuthGuard)
  getMyPending(@Req() req: { user: { id: string } }) {
    return this.contractChangesService.getMyPending(req.user.id);
  }

  @Get('admin/contract-changes')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users', 'view')
  getPendingForAdmin(@Query('search') search?: string) {
    return this.contractChangesService.getPendingForAdmin(search);
  }

  @Post('admin/contract-changes/:id/resolve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users', 'edit')
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveContractChangeDto,
    @Req() req: { user: { id: string; email: string } },
  ) {
    return this.contractChangesService.resolveRequest(id, dto, req.user.id, req.user.email);
  }
}
