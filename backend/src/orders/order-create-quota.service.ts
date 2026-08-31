import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  ORDER_CREATE_RULES,
  hasDuplicatePartNames,
  normalizeVehicleKey,
  resolveRequestType,
  unlockAtFromCreatedAt,
  windowStart,
  type OrderCreateRuleCode,
} from './order-create-rules.util';

export type CreateQuotaBlockedVehicle = {
  make: string;
  model: string;
  year: number;
  unlockAt: string;
};

export type CreateQuotaResponse = {
  serverNow: string;
  single: {
    used: number;
    max: number;
    remaining: number;
    blockedVehicles: CreateQuotaBlockedVehicle[];
    nextUnlockAt: string | null;
  };
  multiple: {
    canCreate: boolean;
    unlockAt: string | null;
    blockingOrderId: string | null;
  };
};

type DbClient = Prisma.TransactionClient | PrismaService;

type WindowOrderRow = {
  id: string;
  requestType: string | null;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  createdAt: Date;
  _count?: { parts: number };
};

@Injectable()
export class OrderCreateQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  private ruleError(
    code: OrderCreateRuleCode,
    messageAr: string,
    messageEn: string,
    extra?: Record<string, unknown>,
  ): never {
    const isClientError =
      code === 'DUPLICATE_PART_NAME' ||
      code === 'PARTS_LIMIT' ||
      code === 'INVALID_REQUEST_TYPE';

    const body = {
      statusCode: isClientError ? 400 : 403,
      message: messageAr,
      messageAr,
      messageEn,
      code,
      ...extra,
    };

    if (isClientError) {
      throw new BadRequestException(body);
    }
    throw new ForbiddenException(body);
  }

  private async loadWindowOrders(
    customerId: string,
    db: DbClient,
    now = new Date(),
  ): Promise<WindowOrderRow[]> {
    return db.order.findMany({
      where: {
        customerId,
        createdAt: { gte: windowStart(now) },
        status: { not: OrderStatus.CANCELLED },
      },
      select: {
        id: true,
        requestType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        createdAt: true,
        _count: { select: { parts: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private partition(rows: WindowOrderRow[]) {
    const singles: WindowOrderRow[] = [];
    const multiples: WindowOrderRow[] = [];
    for (const row of rows) {
      const type = resolveRequestType(row.requestType, row._count?.parts);
      if (type === 'multiple') multiples.push(row);
      else singles.push(row);
    }
    return { singles, multiples };
  }

  private buildQuotaFromRows(
    rows: WindowOrderRow[],
    now: Date,
  ): CreateQuotaResponse {
    const { singles, multiples } = this.partition(rows);

    const blockedVehicles: CreateQuotaBlockedVehicle[] = singles.map((o) => ({
      make: o.vehicleMake,
      model: o.vehicleModel,
      year: o.vehicleYear,
      unlockAt: unlockAtFromCreatedAt(o.createdAt, now).toISOString(),
    }));

    const used = singles.length;
    const remaining = Math.max(0, ORDER_CREATE_RULES.maxSinglePerWindow - used);
    const nextUnlockAt =
      singles.length > 0
        ? unlockAtFromCreatedAt(singles[0].createdAt, now).toISOString()
        : null;

    const blockingMultiple = multiples[0] ?? null;

    return {
      serverNow: now.toISOString(),
      single: {
        used,
        max: ORDER_CREATE_RULES.maxSinglePerWindow,
        remaining,
        blockedVehicles,
        nextUnlockAt,
      },
      multiple: {
        canCreate: !blockingMultiple,
        unlockAt: blockingMultiple
          ? unlockAtFromCreatedAt(blockingMultiple.createdAt, now).toISOString()
          : null,
        blockingOrderId: blockingMultiple?.id ?? null,
      },
    };
  }

  async getQuota(customerId: string, db: DbClient = this.prisma): Promise<CreateQuotaResponse> {
    const now = new Date();
    const rows = await this.loadWindowOrders(customerId, db, now);
    return this.buildQuotaFromRows(rows, now);
  }

  /**
   * Enforces create-order rules. Pass the same Prisma tx client when called inside a transaction.
   */
  async assertCanCreate(
    customerId: string,
    dto: CreateOrderDto,
    db: DbClient = this.prisma,
  ): Promise<CreateQuotaResponse> {
    const rawType = String(dto.requestType ?? '').trim().toLowerCase();
    if (rawType !== 'single' && rawType !== 'multiple') {
      this.ruleError(
        'INVALID_REQUEST_TYPE',
        'نوع الطلب غير صالح. يجب أن يكون مفرداً أو مجمعاً.',
        'Invalid request type. Must be single or multiple.',
      );
    }
    const requestType = rawType as 'single' | 'multiple';

    const parts = dto.parts ?? [];
    const partNames = parts.map((p) => p.name ?? '');

    if (requestType === 'single') {
      if (parts.length !== ORDER_CREATE_RULES.maxPartsSingle) {
        this.ruleError(
          'PARTS_LIMIT',
          'الطلب المفرد يجب أن يحتوي على قطعة واحدة فقط.',
          'A single request must contain exactly one part.',
        );
      }
    } else {
      if (
        parts.length < 2 ||
        parts.length > ORDER_CREATE_RULES.maxPartsMultiple
      ) {
        this.ruleError(
          'PARTS_LIMIT',
          `الطلب المجمع يسمح من قطعتين إلى ${ORDER_CREATE_RULES.maxPartsMultiple} قطع كحد أقصى.`,
          `A multiple request allows between 2 and ${ORDER_CREATE_RULES.maxPartsMultiple} parts.`,
        );
      }
      if (hasDuplicatePartNames(partNames)) {
        this.ruleError(
          'DUPLICATE_PART_NAME',
          'لا يمكنك إضافة القطعة نفسها أكثر من مرة داخل هذا الطلب.\nيرجى إضافة قطعة مختلفة.',
          'You cannot add the same part more than once in this request.\nPlease add a different part.',
        );
      }
    }

    const now = new Date();
    const rows = await this.loadWindowOrders(customerId, db, now);
    const { singles, multiples } = this.partition(rows);
    const quota = this.buildQuotaFromRows(rows, now);

    if (requestType === 'multiple') {
      const blocking = multiples[0];
      if (blocking) {
        const unlockAt = unlockAtFromCreatedAt(blocking.createdAt, now).toISOString();
        this.ruleError(
          'MULTIPLE_COOLDOWN',
          'لا يمكنك تقديم طلب مجمع آخر إلا بعد مرور 24 ساعة على طلبك المجمع السابق (غير الملغى).',
          'You cannot submit another multiple request until 24 hours have passed since your previous active multiple request.',
          { unlockAt, blockingOrderId: blocking.id },
        );
      }
      return quota;
    }

    // --- single ---
    const incomingKey = normalizeVehicleKey(
      dto.vehicleMake,
      dto.vehicleModel,
      dto.vehicleYear,
    );

    const duplicate = singles.find(
      (o) =>
        normalizeVehicleKey(o.vehicleMake, o.vehicleModel, o.vehicleYear) ===
        incomingKey,
    );
    if (duplicate) {
      const unlockAt = unlockAtFromCreatedAt(duplicate.createdAt, now).toISOString();
      this.ruleError(
        'SINGLE_VEHICLE_DUPLICATE',
        'لا يمكنك تقديم أكثر من طلب مفرد واحد خلال 24 ساعة لنفس السيارة.\nإذا كنت تحتاج إلى عدة قطع لنفس السيارة، يرجى استخدام الطلب المجمع، حيث يمكنك إضافة عدة قطع في طلب واحد، مع إمكانية اختيار طريقة الشحن لكل قطعة بشكل منفصل أو شحن جميع القطع معاً.',
        'You cannot submit more than one single request within 24 hours for the same vehicle.\nIf you need multiple parts for the same vehicle, please use a multiple request where you can add several parts in one order and choose shipping per part or combined.',
        { unlockAt, blockingOrderId: duplicate.id },
      );
    }

    if (singles.length >= ORDER_CREATE_RULES.maxSinglePerWindow) {
      const oldest = singles[0];
      const unlockAt = unlockAtFromCreatedAt(oldest.createdAt, now).toISOString();
      this.ruleError(
        'SINGLE_LIMIT',
        `لقد وصلت إلى الحد الأقصى (${ORDER_CREATE_RULES.maxSinglePerWindow}) طلبات مفردة خلال 24 ساعة. يمكنك المحاولة مرة أخرى بعد انتهاء المدة.`,
        `You have reached the maximum of ${ORDER_CREATE_RULES.maxSinglePerWindow} single requests within 24 hours. Try again after the window resets.`,
        { unlockAt, used: singles.length, max: ORDER_CREATE_RULES.maxSinglePerWindow },
      );
    }

    return quota;
  }
}
