import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { getAuditContext } from '../../common/audit-context.util';
import { ContactChangeService } from './contact-change.service';
import { ContactChangeInitDto, ContactChangeVerifyDto } from './contact-change.dto';

@Controller('users/profile/contact-change')
@UseGuards(JwtAuthGuard)
export class ContactChangeController {
    constructor(private readonly contactChangeService: ContactChangeService) {}

    @Post('init')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async init(@Req() req: any, @Body() body: ContactChangeInitDto) {
        const { ip, userAgent } = getAuditContext(req);
        return this.contactChangeService.init(req.user.id || req.user.userId, body.field, body.newValue, {
            ip,
            userAgent,
        });
    }

    @Post('verify')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async verify(@Req() req: any, @Body() body: ContactChangeVerifyDto) {
        const { ip, userAgent } = getAuditContext(req);
        return this.contactChangeService.verify(
            req.user.id || req.user.userId,
            body.field,
            body.newValue,
            body.otp,
            { ip, userAgent },
        );
    }
}
