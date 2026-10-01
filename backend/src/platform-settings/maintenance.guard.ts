import { Injectable, CanActivate, ExecutionContext, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  private readonly logger = new Logger(MaintenanceGuard.name);

  private cache: { value: any; expiresAt: number } | null = null;

  constructor(private prisma: PrismaService) {}

  private async getStatus(): Promise<any> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) return this.cache.value;
    const row = await this.prisma.platformSettings.findUnique({ where: { settingKey: 'system_status' } });
    this.cache = { value: row?.settingValue ?? null, expiresAt: now + 10_000 };
    return this.cache.value;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const url = request.url;

    // 1. Whitelist Auth, Public System Endpoints & Settings (Necessary to login or see status)
    if (
      url.includes('/auth/') ||
      url.includes('/platform-settings') ||
      url.includes('/system/') ||
      url.includes('/public/documents/') ||
      url.includes('/meta/server-time') ||
      url.includes('/health') ||
      url.includes('/loyalty/public-stats')
    ) {
      return true;
    }

    try {
      // 2. Fetch Maintenance Status
      const status = await this.getStatus();
      if (!status) return true;

      const isMaintenance = status?.maintenanceMode === true;

      if (!isMaintenance) return true;

      const user = request.user;
      if (user?.id) {
        const dbUser = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        const r = (dbUser?.role || user.role || '').toString().toUpperCase();
        if (r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'SUPPORT') {
          return true;
        }
      }

      // 3. Block all other operations during maintenance
      throw new ServiceUnavailableException({
        maintenance: true,
        messageAr: status?.maintenanceMsgAr || 'النظام في وضع الصيانة حالياً لخدمتكم بشكل أفضل.',
        messageEn: status?.maintenanceMsgEn || 'System is currently under maintenance for performance optimization.',
        endTime: status?.endTime || null,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      // Transient DB outage — do not flood 500 errors; allow traffic until DB recovers
      this.logger.warn(
        `Maintenance guard DB error (fail-open): ${error instanceof Error ? error.message : error}`,
      );
      return true;
    }
  }
}
