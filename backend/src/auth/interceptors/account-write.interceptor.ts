import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { shouldBlockAccountWrite } from '../account-access.util';

/**
 * Blocks mutating HTTP methods for suspended/blocked accounts while allowing
 * read endpoints so the dashboard can show an access banner.
 *
 * Registered as APP_INTERCEPTOR (not APP_GUARD) so it runs AFTER JwtAuthGuard
 * has attached req.user — a global guard would always see user=undefined.
 */
@Injectable()
export class AccountWriteInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as
      | { accountAccessBlocked?: boolean; status?: string; adminInactive?: boolean }
      | undefined;

    const method = String(req.method || 'GET');
    const path = String(req.originalUrl || req.url || req.path || '');

    if (shouldBlockAccountWrite(user, method, path)) {
      throw new ForbiddenException(
        'Account is suspended or blocked. Only read access is allowed until reactivation.',
      );
    }

    return next.handle();
  }
}
