import {
    Controller,
    Post,
    Body,
    Req,
    Ip,
    Get,
    UseGuards,
    Query,
} from '@nestjs/common';
import { RecoveryService } from './recovery.service';
import {
    LostPhoneStartDto,
    LostPhoneVerifyProofDto,
    LostPhoneRequestNewDto,
    LostPhoneConfirmDto,
    LostEmailStartDto,
    LostEmailVerifyProofDto,
    LostEmailRequestNewDto,
    LostEmailConfirmDto,
    LostBothSubmitDto,
    LostBothRequestOtpsDto,
    LostBothCompleteDto,
    AdminResolveRecoveryDto,
    AdminFreezeUserDto,
    RequestEmailOtpDto,
    VerifyEmailOtpDto,
    RequestPhoneOtpDto,
    SubmitRecoveryDto,
} from './dto/recovery.dto';
import { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Permissions } from './decorators/permissions.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth/recovery')
export class RecoveryController {
    constructor(private readonly recoveryService: RecoveryService) {}

    // ── Case 1: Lost phone (identify by email) ────────────────────────

    @Post('case/lost-phone/start')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    lostPhoneStart(@Body() dto: LostPhoneStartDto) {
        return this.recoveryService.lostPhoneStart(dto.email, dto.role);
    }

    @Post('case/lost-phone/verify-proof')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    lostPhoneVerifyProof(@Body() dto: LostPhoneVerifyProofDto, @Ip() ip: string) {
        return this.recoveryService.lostPhoneVerifyProof(dto.email, dto.otp, dto.role, ip);
    }

    @Post('case/lost-phone/request-new-phone-otp')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    lostPhoneRequestNew(@Body() dto: LostPhoneRequestNewDto, @Ip() ip: string) {
        return this.recoveryService.lostPhoneRequestNewOtp(
            dto.email,
            dto.newPhone,
            dto.role,
            dto.newCountryCode,
            ip,
        );
    }

    @Post('case/lost-phone/confirm')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    lostPhoneConfirm(
        @Body() dto: LostPhoneConfirmDto,
        @Req() req: Request,
        @Ip() ip: string,
    ) {
        const device = req.headers['user-agent'] || 'Unknown Device';
        return this.recoveryService.lostPhoneConfirm(
            dto.email,
            dto.newPhone,
            dto.phoneOtp,
            dto.role,
            dto.newCountryCode,
            ip,
            device,
        );
    }

    // ── Case 2: Lost email (identify by phone) ────────────────────────

    @Post('case/lost-email/start')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    lostEmailStart(@Body() dto: LostEmailStartDto) {
        return this.recoveryService.lostEmailStart(dto.phone, dto.role, dto.countryCode);
    }

    @Post('case/lost-email/verify-proof')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    lostEmailVerifyProof(@Body() dto: LostEmailVerifyProofDto, @Ip() ip: string) {
        return this.recoveryService.lostEmailVerifyProof(
            dto.phone,
            dto.otp,
            dto.role,
            dto.countryCode,
            ip,
        );
    }

    @Post('case/lost-email/request-new-email-otp')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    lostEmailRequestNew(@Body() dto: LostEmailRequestNewDto, @Ip() ip: string) {
        return this.recoveryService.lostEmailRequestNewOtp(
            dto.phone,
            dto.newEmail,
            dto.role,
            dto.countryCode,
            ip,
        );
    }

    @Post('case/lost-email/confirm')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    lostEmailConfirm(
        @Body() dto: LostEmailConfirmDto,
        @Req() req: Request,
        @Ip() ip: string,
    ) {
        const device = req.headers['user-agent'] || 'Unknown Device';
        return this.recoveryService.lostEmailConfirm(
            dto.phone,
            dto.newEmail,
            dto.emailOtp,
            dto.role,
            dto.countryCode,
            ip,
            device,
        );
    }

    // ── Case 3: Lost both ─────────────────────────────────────────────

    @Post('case/lost-both/submit')
    @Throttle({ default: { limit: 3, ttl: 60_000 } })
    lostBothSubmit(@Body() dto: LostBothSubmitDto, @Req() req: Request, @Ip() ip: string) {
        const device = req.headers['user-agent'] || 'Unknown Device';
        return this.recoveryService.lostBothSubmit(
            dto.oldPhone,
            dto.oldEmail,
            dto.role,
            dto.countryCode,
            ip,
            device,
        );
    }

    @Post('case/lost-both/request-otps')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    lostBothRequestOtps(@Body() dto: LostBothRequestOtpsDto) {
        return this.recoveryService.lostBothRequestOtps(
            dto.resumeToken,
            dto.newPhone,
            dto.newEmail,
            dto.newCountryCode,
        );
    }

    @Post('case/lost-both/complete')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    lostBothComplete(
        @Body() dto: LostBothCompleteDto,
        @Req() req: Request,
        @Ip() ip: string,
    ) {
        const device = req.headers['user-agent'] || 'Unknown Device';
        return this.recoveryService.lostBothComplete(
            dto.resumeToken,
            dto.newPhone,
            dto.newEmail,
            dto.phoneOtp,
            dto.emailOtp,
            dto.newCountryCode,
            ip,
            device,
        );
    }

    // ── Admin ─────────────────────────────────────────────────────────

    @Get('admin/requests')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('security-audit', 'view')
    getPendingRequests(@Query('search') search?: string) {
        return this.recoveryService.getPendingRequests(search);
    }

    @Post('admin/resolve')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('security-audit', 'edit')
    resolveRequest(
        @Body() body: AdminResolveRecoveryDto,
        @Req() req: Request & { user: { id: string } },
        @Ip() ip: string,
    ) {
        const userAgent = req.headers['user-agent'] || 'Unknown';
        return this.recoveryService.resolveRequest(
            body.requestId,
            body.action,
            req.user.id,
            ip,
            userAgent,
            body.rejectionReason,
        );
    }

    @Post('admin/freeze-user')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('security-audit', 'edit')
    freezeUser(
        @Body() body: AdminFreezeUserDto,
        @Req() req: Request & { user: { id: string } },
        @Ip() ip: string,
    ) {
        return this.recoveryService.adminFreezeUser(body.userId, req.user.id, body.note, ip);
    }

    // ── Legacy (deprecated) ───────────────────────────────────────────

    @Post('request-email-otp')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    requestEmailOtp(@Body() dto: RequestEmailOtpDto) {
        return this.recoveryService.requestEmailOtp(dto.email, dto.role);
    }

    @Post('verify-email-otp')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    verifyEmailOtp(@Body() dto: VerifyEmailOtpDto, @Ip() ip: string) {
        return this.recoveryService.verifyEmailOtp(dto.email, dto.otp, dto.role, ip);
    }

    @Post('request-phone-otp')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    requestPhoneOtp(@Body() dto: RequestPhoneOtpDto, @Ip() ip: string) {
        return this.recoveryService.requestPhoneOtp(dto.email, dto.newPhone, dto.role, ip);
    }

    @Post('submit')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    submitRecovery(@Body() dto: SubmitRecoveryDto, @Req() req: Request, @Ip() ip: string) {
        const device = req.headers['user-agent'] || 'Unknown Device';
        return this.recoveryService.submitRecovery(
            dto.email,
            dto.newPhone,
            dto.phoneOtp,
            dto.role,
            ip,
            device,
        );
    }
}
