import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActorType, Prisma } from '@prisma/client';
import {
  normalizeSearchQuery,
  resolveUserIds,
  resolveOrderIds,
  isUuid,
  mergeWhereWithSearch,
} from '../common/search/admin-entity-search.util';

export interface CreateAuditLogDto {
  orderId?: string;
  action: string;
  entity: string;
  actorType: ActorType;
  actorId?: string;
  actorName?: string;
  previousState?: string;
  newState?: string;
  reason?: string;
  metadata?: any;
}

export interface FinancialAuditLogDto extends CreateAuditLogDto {
  reason: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) { }

  /** Requires explicit reason for human financial actors (ADMIN / ACCOUNTANT). */
  async logFinancialAction(data: FinancialAuditLogDto, tx?: Prisma.TransactionClient) {
    const reason = data.reason?.trim();
    if (!reason || reason.length < 10) {
      throw new BadRequestException('Financial audit reason is required (min 10 characters)');
    }
    return this.logAction({ ...data, reason }, tx);
  }

  async logAction(data: CreateAuditLogDto, tx?: Prisma.TransactionClient) {
    const prisma = tx || this.prisma;
    
    // 1. ActorType Normalization Layer (2026 Resilience Pattern)
    // Mapping extended roles to Prisma Enum to prevent validation crashes
    const validActorTypes = Object.values(ActorType);
    let finalActorType: ActorType = ActorType.SYSTEM;

    if (validActorTypes.includes(data.actorType as any)) {
      finalActorType = data.actorType;
    } else if (['SUPER_ADMIN', 'SUPPORT', 'MODERATOR'].includes(data.actorType as any)) {
      finalActorType = ActorType.ADMIN;
    }

    // 2. Ensure a reason exists for 2026 transparency standards
    let finalReason = data.reason;
    if (!finalReason) {
      if (finalActorType === ActorType.SYSTEM) {
        finalReason = 'AUDIT_REASON_SYSTEM_AUTOMATED';
      } else {
        finalReason = 'AUDIT_REASON_NO_REASON_PROVIDED';
      }
    }

    return prisma.auditLog.create({
      data: {
        orderId: data.orderId,
        action: data.action,
        entity: data.entity,
        actorType: finalActorType,
        actorId: data.actorId,
        actorName: data.actorName,
        previousState: data.previousState,
        newState: data.newState,
        reason: finalReason,
        metadata: data.metadata || {},
      },
    });
  }

  private async buildSearchWhere(
    rawQuery?: string | null,
  ): Promise<Prisma.AuditLogWhereInput | undefined> {
    const q = normalizeSearchQuery(rawQuery);
    if (!q) return undefined;

    const or: Prisma.AuditLogWhereInput[] = [
      { action: { contains: q, mode: 'insensitive' } },
      { entity: { contains: q, mode: 'insensitive' } },
      { actorName: { contains: q, mode: 'insensitive' } },
      { reason: { contains: q, mode: 'insensitive' } },
      { previousState: { contains: q, mode: 'insensitive' } },
      { newState: { contains: q, mode: 'insensitive' } },
    ];

    if (isUuid(q)) {
      or.push({ id: q });
      or.push({ orderId: q });
      or.push({ actorId: q });
    }

    const [userIds, orderIds] = await Promise.all([
      resolveUserIds(this.prisma, q),
      resolveOrderIds(this.prisma, q),
    ]);
    if (userIds.length) or.push({ actorId: { in: userIds } });
    if (orderIds.length) or.push({ orderId: { in: orderIds } });

    return { OR: or };
  }

  async findAll(cursor?: string, limit: number = 25, search?: string) {
    const searchWhere = await this.buildSearchWhere(search);
    const args: Prisma.AuditLogFindManyArgs = {
      where: searchWhere,
      orderBy: { timestamp: 'desc' },
      take: limit + 1,
    };

    if (cursor) {
      args.cursor = { id: cursor };
      args.skip = 1;
    }

    const logs = await this.prisma.auditLog.findMany(args);
    
    let hasMore = false;
    if (logs.length > limit) {
      hasMore = true;
      logs.pop(); // Remove the extra record
    }

    return {
      data: logs,
      hasMore,
      nextCursor: hasMore ? logs[logs.length - 1].id : null,
    };
  }

  async findByOrder(orderId: string) {
    return this.prisma.auditLog.findMany({
      where: { orderId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findByAction(action: string, search?: string) {
    const searchWhere = await this.buildSearchWhere(search);
    const where = mergeWhereWithSearch({ action }, searchWhere ?? {});
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 200,
    });
  }
}
