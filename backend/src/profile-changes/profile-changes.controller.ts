import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProfileChangesService } from './profile-changes.service';
import {
    RequestProfileChangeOtpDto,
    ResolveProfileChangeDto,
    SubmitProfileChangeDto,
} from './dto/profile-change.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller()
export class ProfileChangesController {
    constructor(private readonly profileChangesService: ProfileChangesService) {}

    @Post('users/profile/change-request/otp')
    @UseGuards(JwtAuthGuard)
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    requestOtp(@Req() req: { user: { id: string } }, @Body() dto: RequestProfileChangeOtpDto) {
        return this.profileChangesService.requestOtp(req.user.id, dto.field);
    }

    @Post('users/profile/change-request')
    @UseGuards(JwtAuthGuard)
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    submitChangeRequest(
        @Req() req: { user: { id: string } },
        @Body() dto: SubmitProfileChangeDto,
    ) {
        return this.profileChangesService.submitChangeRequest(
            req.user.id,
            dto.field,
            dto.newValue,
            dto.otp,
        );
    }

    @Get('users/profile/change-requests/pending')
    @UseGuards(JwtAuthGuard)
    getMyPending(@Req() req: { user: { id: string } }) {
        return this.profileChangesService.getMyPending(req.user.id);
    }

    @Get('admin/profile-changes')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('users', 'view')
    getPendingForAdmin() {
        return this.profileChangesService.getPendingForAdmin();
    }

    @Post('admin/profile-changes/:id/resolve')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('users', 'edit')
    resolveRequest(
        @Param('id') id: string,
        @Body() dto: ResolveProfileChangeDto,
        @Req() req: { user: { id: string } },
    ) {
        return this.profileChangesService.resolveRequest(
            id,
            dto.action,
            req.user.id,
            dto.rejectionReason,
        );
    }
}
