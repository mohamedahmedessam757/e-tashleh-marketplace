import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PermissionRequirement } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

  if (!requirement) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return false;
  }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.id) {
      return false;
    }

    // 2026 Security: Fetch fresh role from DB to prevent stale JWT role issues
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, status: true }
    });

    const currentRole = (dbUser?.role || user.role || '').toString().toUpperCase();

    // Fetch the specific permissions for this admin user first — inactive staff
    // must never bypass via SUPER_ADMIN short-circuit.
    const adminPerm = await this.prisma.adminPermission.findUnique({
      where: { userId: user.id },
    });

    const userSuspended =
      dbUser?.status === 'SUSPENDED' ||
      dbUser?.status === 'BLOCKED' ||
      user.status === 'SUSPENDED' ||
      user.status === 'BLOCKED' ||
      user.accountAccessBlocked === true ||
      user.adminInactive === true;

    if ((adminPerm && !adminPerm.isActive) || (userSuspended && !!adminPerm)) {
      // Allow read-only dashboard shell so an access banner can render.
      const method = String(
        context.switchToHttp().getRequest()?.method || 'GET',
      ).toUpperCase();
      if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return true;
      }
      throw new ForbiddenException('Admin account is inactive');
    }

    // Only SUPER_ADMIN is the ultimate authority when the account is active.
    if (currentRole === 'SUPER_ADMIN') {
      return true;
    }

    if (!adminPerm) {
      throw new ForbiddenException('Admin account has no permissions record');
    }

    const permissions = adminPerm.permissions as any;
    const { page, action } = requirement;

    // Ensure permissions object and the specific page key exist
    const pagePerms = permissions && typeof permissions === 'object' ? permissions[page] : null;

    // Support both top-level view/edit and nested granular actions (EXPORT_FINANCIALS, etc.)
    const hasTopLevel = !!(pagePerms && pagePerms[action] === true);
    const hasNestedAction = !!(
      pagePerms &&
      typeof pagePerms.actions === 'object' &&
      pagePerms.actions[action] === true
    );
    const hasAccess = hasTopLevel || hasNestedAction;

    if (!hasAccess) {
      throw new ForbiddenException(`Access Denied: Missing ${action} permission for ${page}`);
    }

    return true;
  }
}
