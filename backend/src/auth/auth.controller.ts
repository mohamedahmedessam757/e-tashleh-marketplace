import { Controller, Post, Body, UseGuards, Request, Get, UnauthorizedException, Delete, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // Will create this next
import { UserRole } from '@prisma/client';
import {
    RegisterResendOtpDto,
    RegisterVerifyOtpDto,
    MobileLoginResendOtpDto,
    MobileLoginInitDto,
    EmailLoginInitDto,
    EmailLoginResendOtpDto,
    MobileLoginVerifyDto,
    EmailLoginVerifyDto,
    RegisterInitDto,
    StaffOtpDto,
    StaffOtpVerifyDto,
} from './dto/otp.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async login(@Body() loginDto: LoginDto, @Request() req) {
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            console.warn(`[Security] Failed login attempt for email: ${loginDto.email}`);
            throw new UnauthorizedException('Invalid credentials');
        }
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        return this.authService.login(user, ip, userAgent, loginDto.fingerprint);
    }

    @Post('mobile-login-init')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async initiateMobileLogin(@Body() body: MobileLoginInitDto) {
        const result = await this.authService.initiateMobileLogin(body.phone, body.role);
        if (!result) {
            // Frontend: "If no, show message account not found please register"
            throw new UnauthorizedException('Account not found');
        }
        return result;
    }

    @Post('email-login-init')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async initiateEmailLogin(@Body() body: EmailLoginInitDto) {
        const result = await this.authService.initiateEmailLogin(body.email, body.role);
        if (!result) {
            throw new UnauthorizedException('Account not found');
        }
        return result;
    }

    @Post('mobile-login-verify')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    async verifyMobileLogin(@Body() body: MobileLoginVerifyDto, @Request() req) {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        return this.authService.verifyMobileLogin(
            body.phone,
            body.code,
            body.role,
            ip,
            userAgent,
            body.fingerprint,
        );
    }

    @Post('email-login-verify')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    async verifyEmailLogin(@Body() body: EmailLoginVerifyDto, @Request() req) {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        return this.authService.verifyEmailLogin(
            body.email,
            body.code,
            body.role,
            ip,
            userAgent,
            body.fingerprint,
        );
    }


    @Post('register-init')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async initRegistration(@Body() body: RegisterInitDto) {
        const audience = body.role === 'vendor' ? 'vendor' : 'customer';
        return this.authService.initRegistration(
            body.email,
            body.phone,
            body.channel,
            body.name,
            audience,
        );
    }

    @Post('register-verify-otp')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    async verifyRegistrationOtp(@Body() body: RegisterVerifyOtpDto) {
        return this.authService.verifyRegistrationOtp(
            body.email,
            body.phone,
            body.code,
            body.channel,
        );
    }

    @Post('register-resend-otp')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async resendRegistrationOtp(
        @Body() body: RegisterResendOtpDto & { role?: 'customer' | 'vendor' },
    ) {
        const audience = body.role === 'vendor' ? 'vendor' : 'customer';
        return this.authService.resendRegistrationOtp(
            body.email,
            body.phone,
            body.channel,
            body.name,
            audience,
        );
    }

    @Post('mobile-login-resend')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async resendMobileLoginOtp(@Body() body: MobileLoginResendOtpDto) {
        return this.authService.resendMobileLoginOtp(body.phone, body.role);
    }

    @Post('email-login-resend')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async resendEmailLoginOtp(@Body() body: EmailLoginResendOtpDto) {
        return this.authService.resendEmailLoginOtp(body.email, body.role);
    }

    /** Staff 2FA — Admin / Super Admin / Support / Verification Officer / Accountant */
    @Post('otp/send')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async sendStaffOtp(@Body() body: StaffOtpDto) {
        return this.authService.sendStaffOtp(body.email, body.channel);
    }

    @Post('otp/verify')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    async verifyStaffOtp(@Body() body: StaffOtpVerifyDto) {
        return this.authService.verifyStaffOtp(body.email, body.code, body.channel);
    }

    @Post('otp/resend')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    async resendStaffOtp(@Body() body: StaffOtpDto) {
        return this.authService.resendStaffOtp(body.email, body.channel);
    }

    @Post('register/customer')
    async registerCustomer(@Body() createUserDto: CreateUserDto) {
        // Force role to CUSTOMER
        createUserDto.role = UserRole.CUSTOMER;
        return this.authService.register(createUserDto);
    }

    @Post('register/vendor')
    async registerVendor(@Body() createUserDto: CreateUserDto, @Request() req) {
        // Force role to VENDOR (or pending logic later)
        createUserDto.role = UserRole.VENDOR;
        if (createUserDto.contractData) {
            createUserDto.contractData.ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            createUserDto.contractData.userAgent = req.headers['user-agent'];
        }
        return this.authService.register(createUserDto);
    }

    // Example protected route to verify JWT
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(@Request() req) {
        // Fetch full user data from DB to ensure we have latest avatar/details
        // req.user from JWT strategy might be limited or stale
        const user = await this.authService.getUserProfile(req.user.id || req.user.userId);
        return user;
    }

    // --- Session Management Endpoints ---

    @UseGuards(JwtAuthGuard)
    @Get('sessions')
    async getSessions(@Request() req, @Query('lang') lang?: string) {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const locale = lang === 'ar' ? 'ar' : 'en';
        return this.authService.getActiveSessions(
            req.user.id || req.user.userId,
            token,
            locale,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Delete('sessions/all')
    async terminateAllSessions(@Request() req) {
        const token = req.headers.authorization?.replace('Bearer ', '');
        return this.authService.terminateAllOtherSessions(req.user.id || req.user.userId, token);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('sessions/:id')
    async terminateSession(@Request() req, @Param('id') sessionId: string) {
        return this.authService.terminateSession(req.user.id || req.user.userId, sessionId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('me')
    async deleteAccount(@Request() req) {
        return this.authService.deleteAccount(req.user.id || req.user.userId);
    }

    @Post('deep-link/consume')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    async consumeDeepLink(@Body() body: { dl?: string }, @Request() req) {
        if (!body?.dl || typeof body.dl !== 'string' || body.dl.length > 4096) {
            throw new UnauthorizedException('Invalid link');
        }
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        return this.authService.consumeDeepLink(body.dl, ip, userAgent);
    }
}
