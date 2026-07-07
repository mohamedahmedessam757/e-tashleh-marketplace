import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AnnouncementAudience = 'ALL' | 'CUSTOMER' | 'VENDOR' | 'ADMIN';

export interface CreateAnnouncementInput {
  slug: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  audience?: AnnouncementAudience;
  settingKey?: string;
  effectiveFrom?: Date;
  expiresAt?: Date | null;
  createdById?: string;
  auditMetadata?: Record<string, unknown>;
}

@Injectable()
export class PlatformAnnouncementsService {
  private readonly logger = new Logger(PlatformAnnouncementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findActive(audience?: string) {
    const now = new Date();
    const aud = (audience || 'ALL').toUpperCase();

    const rows = await this.prisma.platformAnnouncement.findMany({
      where: {
        isActive: true,
        effectiveFrom: { lte: now },
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          ...(aud !== 'ALL'
            ? [{ OR: [{ audience: 'ALL' as const }, { audience: aud }] }]
            : []),
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
      take: 20,
    });

    return rows;
  }

  async create(input: CreateAnnouncementInput) {
    return this.prisma.platformAnnouncement.create({
      data: {
        slug: input.slug,
        titleAr: input.titleAr,
        titleEn: input.titleEn,
        bodyAr: input.bodyAr,
        bodyEn: input.bodyEn,
        audience: input.audience ?? 'ALL',
        settingKey: input.settingKey,
        effectiveFrom: input.effectiveFrom ?? new Date(),
        expiresAt: input.expiresAt ?? null,
        createdById: input.createdById,
        auditMetadata: (input.auditMetadata ?? {}) as any,
      },
    });
  }

  async createOrderDurationChangeAnnouncement(
    actorId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    audit: { reason: string; adminName: string; adminSignature: string },
  ) {
    const slug = `order-durations-${Date.now()}`;
    const changedKeys = Object.keys(after).filter(
      (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]),
    );

    if (!changedKeys.length) return null;

    const summaryAr = changedKeys
      .map((k) => `${k}: ${String(before[k] ?? '—')} ← ${String(after[k] ?? '—')}`)
      .join(' | ');
    const summaryEn = summaryAr;

    return this.create({
      slug,
      titleAr: 'تحديث سياسات الطلبات',
      titleEn: 'Order Policy Update',
      bodyAr: `تم تحديث إعدادات مدد الطلبات. ${summaryAr}. السبب: ${audit.reason}`,
      bodyEn: `Order duration settings were updated. ${summaryEn}. Reason: ${audit.reason}`,
      audience: 'ALL',
      settingKey: 'orderDurations',
      createdById: actorId,
      auditMetadata: {
        before,
        after,
        adminName: audit.adminName,
        adminSignature: audit.adminSignature,
        reason: audit.reason,
      },
    });
  }

  async deactivate(id: string) {
    const row = await this.prisma.platformAnnouncement.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Announcement not found');
    return this.prisma.platformAnnouncement.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
