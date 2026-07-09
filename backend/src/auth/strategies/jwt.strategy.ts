import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { sanitizeUser } from '../../common/user-sanitizer';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService,
        private prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
            // Pin the signing algorithm to prevent alg-confusion (e.g. "none"/RS256) attacks.
            algorithms: ['HS256'],
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: any) {
        const user = await this.usersService.findByIdWithStore(payload.sub);
        if (!user) {
            throw new UnauthorizedException();
        }

        // Per-request account status check — a suspended/blocked account cannot keep using a
        // token that was valid at login time.
        if ((user as any).status === 'SUSPENDED' || (user as any).status === 'BLOCKED') {
            throw new UnauthorizedException('Account is suspended or blocked');
        }

        // Session-bound revocation: the presented token must still correspond to a live session.
        // Terminating a session (logout / "sign out other devices" / admin revoke) invalidates it.
        const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        if (rawToken) {
            const session = await this.prisma.session.findFirst({
                where: { userId: user.id, token: rawToken },
                select: { id: true },
            });
            if (!session) {
                throw new UnauthorizedException('Session has been revoked');
            }
        }

        // For VENDOR users, attach storeId directly to user object for easy access
        return sanitizeUser({
            ...user,
            storeId: user.store?.id || null,
        });
    }
}
