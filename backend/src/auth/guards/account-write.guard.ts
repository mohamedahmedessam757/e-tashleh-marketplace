import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Blocks mutating HTTP methods for suspended/blocked accounts while allowing
 * read endpoints so the dashboard can show an access banner.
 */
@Injectable()
export class AccountWriteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as
      | { accountAccessBlocked?: boolean; status?: string }
      | undefined;

    const blocked =
      user?.accountAccessBlocked === true ||
      user?.status === 'SUSPENDED' ||
      user?.status === 'BLOCKED';

    if (!blocked) return true;

    const method = String(req.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    const path = String(req.originalUrl || req.url || req.path || '').toLowerCase();

    // Session / notifications housekeeping still allowed
    const allowPrefixes = [
      '/auth/logout',
      '/auth/refresh',
      '/auth/me',
      '/notifications',
    ];
    if (allowPrefixes.some((p) => path.includes(p))) {
      return true;
    }

    throw new ForbiddenException(
      'Account is suspended or blocked. Only read access is allowed until reactivation.',
    );
  }
}
