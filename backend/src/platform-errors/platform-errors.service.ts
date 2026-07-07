import { createHash, randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  PlatformErrorSeverity,
  PlatformErrorSource,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ListPlatformErrorsQueryDto } from './dto/list-errors-query.dto';
import { ReportClientErrorDto } from './dto/report-client-error.dto';

const SENSITIVE_PATTERN =
  /(password|token|authorization|bearer|secret|api[_-]?key|cookie)/i;

export interface ErrorActorContext {
  userId?: string | null;
  userRole?: string;
  userEmail?: string | null;
  userPhone?: string | null;
}

export interface RecordApiErrorInput {
  correlationId: string;
  errorName: string;
  message: string;
  httpMethod?: string;
  httpStatus?: number;
  requestPath?: string;
  userAgent?: string;
  severity?: PlatformErrorSeverity;
  actor?: ErrorActorContext;
  metadata?: Record<string, unknown>;
  stack?: string;
}

@Injectable()
export class PlatformErrorsService {
  private readonly logger = new Logger(PlatformErrorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  sanitizeMessage(input: string): string {
    return String(input || '')
      .replace(SENSITIVE_PATTERN, '[redacted]')
      .slice(0, 2000);
  }

  stackFingerprint(stack?: string, message?: string): string | null {
    const raw = (stack || message || '').slice(0, 500);
    if (!raw.trim()) return null;
    return createHash('sha256').update(raw).digest('hex');
  }

  private inferDeviceClass(userAgent?: string): string {
    const ua = (userAgent || '').toLowerCase();
    if (!ua) return 'unknown';
    if (/mobile|android|iphone|ipod/.test(ua)) return 'mobile';
    if (/ipad|tablet/.test(ua)) return 'tablet';
    return 'desktop';
  }

  private async upsertOrIncrement(
    create: Prisma.PlatformErrorEventUncheckedCreateInput,
  ) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (create.stackFingerprint) {
      const existing = await this.prisma.platformErrorEvent.findFirst({
        where: {
          stackFingerprint: create.stackFingerprint,
          userId: create.userId ?? null,
          pagePath: create.pagePath ?? null,
          lastSeenAt: { gte: fiveMinAgo },
        },
        orderBy: { lastSeenAt: 'desc' },
      });
      if (existing) {
        return this.prisma.platformErrorEvent.update({
          where: { id: existing.id },
          data: {
            occurrenceCount: { increment: 1 },
            lastSeenAt: new Date(),
            message: create.message,
          },
        });
      }
    }

    return this.prisma.platformErrorEvent.create({ data: create });
  }

  async reportClientError(
    dto: ReportClientErrorDto,
    ctx: {
      actor?: ErrorActorContext;
      userAgent?: string;
      correlationId: string;
    },
  ) {
    const fingerprint = this.stackFingerprint(dto.componentStack, dto.message);
    const metadata = {
      ...(dto.metadata || {}),
      ...(dto.componentStack
        ? { componentStack: this.sanitizeMessage(dto.componentStack).slice(0, 3000) }
        : {}),
    };

    return this.upsertOrIncrement({
      source: PlatformErrorSource.CLIENT,
      severity: PlatformErrorSeverity.ERROR,
      errorCode: dto.errorCode,
      errorName: dto.errorName?.slice(0, 200),
      message: this.sanitizeMessage(dto.message),
      stackFingerprint: fingerprint,
      userId: ctx.actor?.userId ?? null,
      userRole: dto.userRole || ctx.actor?.userRole || 'GUEST',
      userEmail: ctx.actor?.userEmail?.slice(0, 320) || null,
      userPhone: ctx.actor?.userPhone?.slice(0, 32) || null,
      pagePath: dto.pagePath?.slice(0, 500) || null,
      pageLabel: dto.pageLabel?.slice(0, 200) || null,
      httpStatus: dto.httpStatus ?? null,
      requestPath: dto.requestPath?.slice(0, 500) || null,
      userAgent: ctx.userAgent?.slice(0, 500) || null,
      deviceClass: dto.deviceClass || this.inferDeviceClass(ctx.userAgent),
      locale: dto.locale?.slice(0, 8) || null,
      correlationId: dto.correlationId || ctx.correlationId,
      metadata: metadata as Prisma.InputJsonValue,
    });
  }

  async recordApiError(input: RecordApiErrorInput) {
    try {
      const severity =
        input.severity ||
        (input.httpStatus && input.httpStatus >= 500
          ? PlatformErrorSeverity.ERROR
          : PlatformErrorSeverity.WARN);

      await this.upsertOrIncrement({
        source: PlatformErrorSource.API,
        severity,
        errorName: input.errorName?.slice(0, 200),
        message: this.sanitizeMessage(input.message),
        stackFingerprint: this.stackFingerprint(input.stack, input.message),
        userId: input.actor?.userId ?? null,
        userRole: input.actor?.userRole || 'GUEST',
        userEmail: input.actor?.userEmail?.slice(0, 320) || null,
        userPhone: input.actor?.userPhone?.slice(0, 32) || null,
        httpMethod: input.httpMethod?.slice(0, 16) || null,
        httpStatus: input.httpStatus ?? null,
        requestPath: input.requestPath?.slice(0, 500) || null,
        userAgent: input.userAgent?.slice(0, 500) || null,
        deviceClass: this.inferDeviceClass(input.userAgent),
        correlationId: input.correlationId || randomUUID(),
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
      });
    } catch (e) {
      this.logger.warn('Failed to persist API error event', e);
    }
  }

  async list(query: ListPlatformErrorsQueryDto) {
    const limit = query.limit ?? 25;
    const offset = query.offset ?? 0;
    const where: Prisma.PlatformErrorEventWhereInput = {};

    if (query.source) where.source = query.source as PlatformErrorSource;
    if (query.severity) where.severity = query.severity as PlatformErrorSeverity;
    if (query.userRole) where.userRole = query.userRole;
    if (query.deviceClass) where.deviceClass = query.deviceClass;
    if (query.correlationId) where.correlationId = query.correlationId;
    if (query.stackFingerprint) where.stackFingerprint = query.stackFingerprint;
    if (query.resolved === 'true') where.resolvedAt = { not: null };
    if (query.resolved === 'false') where.resolvedAt = null;
    if (query.dateFrom || query.dateTo) {
      where.lastSeenAt = {};
      if (query.dateFrom) where.lastSeenAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.lastSeenAt.lte = new Date(query.dateTo);
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { id: { equals: search } },
        { correlationId: { equals: search } },
        { userEmail: { contains: search, mode: 'insensitive' } },
        { userPhone: { contains: search } },
        { errorName: { contains: search, mode: 'insensitive' } },
        { pagePath: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.platformErrorEvent.findMany({
        where,
        orderBy: { lastSeenAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, role: true } },
        },
      }),
      this.prisma.platformErrorEvent.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async getById(id: string) {
    return this.prisma.platformErrorEvent.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true } },
        resolver: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getByCorrelationId(correlationId: string) {
    return this.prisma.platformErrorEvent.findMany({
      where: { correlationId },
      orderBy: { firstSeenAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true } },
      },
    });
  }

  async getTopErrorsLast24h() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<
      Array<{
        stack_fingerprint: string | null;
        error_name: string | null;
        sample_message: string;
        total_occurrences: bigint;
        event_rows: bigint;
        last_seen: Date;
      }>
    >`
      SELECT stack_fingerprint, error_name,
             MAX(message) AS sample_message,
             SUM(occurrence_count)::bigint AS total_occurrences,
             COUNT(*)::bigint AS event_rows,
             MAX(last_seen_at) AS last_seen
      FROM platform_error_events
      WHERE last_seen_at >= ${since}
        AND resolved_at IS NULL
      GROUP BY stack_fingerprint, error_name
      ORDER BY total_occurrences DESC
      LIMIT 10
    `;

    const totalAgg = await this.prisma.platformErrorEvent.aggregate({
      where: { lastSeenAt: { gte: since }, resolvedAt: null },
      _sum: { occurrenceCount: true },
    });
    const grandTotal = Number(totalAgg._sum.occurrenceCount || 0);

    return rows.map((r) => ({
      stackFingerprint: r.stack_fingerprint,
      errorName: r.error_name,
      sampleMessage: r.sample_message,
      totalOccurrences: Number(r.total_occurrences),
      eventRows: Number(r.event_rows),
      lastSeenAt: r.last_seen,
      percentOfTotal:
        grandTotal > 0
          ? Math.round((Number(r.total_occurrences) / grandTotal) * 1000) / 10
          : 0,
    }));
  }

  async resolve(id: string, adminUserId: string) {
    return this.prisma.platformErrorEvent.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolvedBy: adminUserId,
      },
    });
  }
}
