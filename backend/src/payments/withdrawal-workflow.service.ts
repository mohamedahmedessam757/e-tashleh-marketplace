import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StripeService } from '../stripe/stripe.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FinancialConfigService } from '../common/financial-config.service';
import { WITHDRAWAL_ACTIVE_STATUSES, WITHDRAWAL_STATUS } from './withdrawal-workflow.constants';

export interface WithdrawalActionContext {
  adminId: string;
  adminName?: string;
  adminEmail?: string;
  adminSignature?: string;
  notes?: string;
  ip?: string | null;
  idempotencyKey?: string;
}

type WithdrawalWithRelations = Prisma.WithdrawalRequestGetPayload<{
  include: { store: { include: { owner: true } }; user: true };
}>;

@Injectable()
export class WithdrawalWorkflowService {
  private readonly logger = new Logger(WithdrawalWorkflowService.name);
  private readonly completeIdempotency = new Map<string, number>();
  private readonly IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly stripeService: StripeService,
    private readonly auditLogs: AuditLogsService,
    private readonly financialConfig: FinancialConfigService,
  ) {}

  async assertNoActiveWithdrawal(params: { userId?: string; storeId?: string }) {
    const where: Prisma.WithdrawalRequestWhereInput = {
      status: { in: [...WITHDRAWAL_ACTIVE_STATUSES] },
    };
    if (params.userId) where.userId = params.userId;
    if (params.storeId) where.storeId = params.storeId;

    const existing = await this.prisma.withdrawalRequest.findFirst({ where, select: { id: true } });
    if (existing) {
      throw new ConflictException(
        'You already have an active withdrawal request. Cancel it or wait until it is processed.',
      );
    }
  }

  async enforceCreateRateLimit(userId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.prisma.withdrawalRequest.count({
      where: {
        createdAt: { gte: oneHourAgo },
        OR: [{ userId }, { store: { ownerId: userId } }],
      },
    });
    if (count >= 3) {
      throw new BadRequestException('Too many withdrawal requests. Please try again later.');
    }
  }

  async assertStripeConnectEnabled() {
    const config = await this.financialConfig.getConfig();
    if (!config.stripeConnectEnabled) {
      throw new ForbiddenException('Stripe Connect payouts are not enabled on this platform.');
    }
  }

  private validateAdminReason(notes?: string, requireSignature = true, adminSignature?: string) {
    const reason = (notes || '').trim();
    if (reason.length < 10) {
      throw new BadRequestException('Reason is required (minimum 10 characters)');
    }
    if (requireSignature && !adminSignature?.trim()) {
      throw new BadRequestException('Admin signature is required');
    }
    return reason;
  }

  private checkIdempotency(key: string) {
    const now = Date.now();
    for (const [k, exp] of this.completeIdempotency) {
      if (exp < now) this.completeIdempotency.delete(k);
    }
    if (this.completeIdempotency.has(key)) {
      throw new BadRequestException('This action was already submitted. Please wait.');
    }
    this.completeIdempotency.set(key, now + this.IDEMPOTENCY_TTL_MS);
  }

  private async unholdBalance(
    tx: Prisma.TransactionClient,
    request: WithdrawalWithRelations,
    amount: number,
  ) {
    if (request.role === 'CUSTOMER') {
      await tx.user.update({
        where: { id: request.userId! },
        data: {
          customerBalance: { increment: amount },
          customerFrozenBalance: { decrement: amount },
        },
      });
    } else {
      await tx.store.update({
        where: { id: request.storeId! },
        data: {
          balance: { increment: amount },
          frozenBalance: { decrement: amount },
        },
      });
    }
  }

  private async burnFrozenBalance(
    tx: Prisma.TransactionClient,
    request: WithdrawalWithRelations,
    amount: number,
  ): Promise<number> {
    if (request.role === 'CUSTOMER') {
      const user = await tx.user.findUnique({ where: { id: request.userId! } });
      if (Number(user?.customerFrozenBalance || 0) < amount) {
        throw new BadRequestException('Held customer balance is insufficient');
      }
      await tx.user.update({
        where: { id: request.userId! },
        data: { customerFrozenBalance: { decrement: amount } },
      });
      return Number(user?.customerBalance || 0);
    }

    const store = await tx.store.findUnique({ where: { id: request.storeId! } });
    if (Number(store?.frozenBalance || 0) < amount) {
      throw new BadRequestException('Held store balance is insufficient');
    }
    await tx.store.update({
      where: { id: request.storeId! },
      data: { frozenBalance: { decrement: amount } },
    });
    return Number(store?.balance || 0);
  }

  async approveWithdrawal(requestId: string, ctx: WithdrawalActionContext) {
    const request = await this.loadRequest(requestId);
    if (request.status !== WITHDRAWAL_STATUS.PENDING && request.status !== 'UNDER_REVIEW') {
      throw new BadRequestException('Only pending requests can be approved');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.auditLogs.logAction(
        {
          entity: 'FINANCIAL',
          action: 'WITHDRAWAL_APPROVED',
          actorType: ActorType.ADMIN,
          actorId: ctx.adminId,
          actorName: ctx.adminName,
          metadata: {
            requestId,
            amount: request.amount,
            note: ctx.notes,
            adminEmail: ctx.adminEmail,
            adminSignature: ctx.adminSignature || null,
            ip: ctx.ip ?? null,
          },
        },
        tx,
      );

      return tx.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: WITHDRAWAL_STATUS.PROCESSING,
          approvedAt: new Date(),
          processedBy: ctx.adminId,
          adminSignature: ctx.adminSignature || null,
          adminNotes: ctx.notes || null,
        },
      });
    });

    await this.notifyRecipient(request, {
      titleAr: 'تم اعتماد طلب السحب',
      titleEn: 'Withdrawal Approved',
      messageAr: 'تم اعتماد طلب السحب، وجارٍ تنفيذ عملية التحويل البنكي.',
      messageEn: 'Your withdrawal has been approved and bank transfer is in progress.',
      metadataType: 'WITHDRAWAL_APPROVED',
    });

    return updated;
  }

  async rejectWithdrawal(requestId: string, ctx: WithdrawalActionContext) {
    const reason = this.validateAdminReason(ctx.notes, true, ctx.adminSignature);
    const request = await this.loadRequest(requestId);
    if (request.status !== WITHDRAWAL_STATUS.PENDING && request.status !== 'UNDER_REVIEW') {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    const amount = Number(request.amount);
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.unholdBalance(tx, request, amount);
      await this.auditLogs.logAction(
        {
          entity: 'FINANCIAL',
          action: 'WITHDRAWAL_REJECTION',
          actorType: ActorType.ADMIN,
          actorId: ctx.adminId,
          actorName: ctx.adminName,
          metadata: {
            requestId,
            amount,
            note: reason,
            adminEmail: ctx.adminEmail,
            adminSignature: ctx.adminSignature || null,
            ip: ctx.ip ?? null,
          },
        },
        tx,
      );

      return tx.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: WITHDRAWAL_STATUS.REJECTED,
          rejectionReason: reason,
          adminNotes: reason,
          processedBy: ctx.adminId,
          adminSignature: ctx.adminSignature || null,
        },
      });
    });

    await this.notifyRecipient(request, {
      titleAr: 'تم رفض طلب السحب',
      titleEn: 'Withdrawal Request Rejected',
      messageAr: `تم رفض طلب سحب ${amount} درهم. السبب: ${reason}.`,
      messageEn: `Your withdrawal of AED ${amount} has been rejected. Reason: ${reason}.`,
      metadataType: 'WITHDRAWAL_REJECTED',
      extra: { reason },
    });

    return updated;
  }

  async completeWithdrawal(requestId: string, ctx: WithdrawalActionContext) {
    const reason = this.validateAdminReason(ctx.notes, true, ctx.adminSignature);
    const idempotencyKey = ctx.idempotencyKey || `complete_${requestId}_${ctx.adminId}`;
    this.checkIdempotency(idempotencyKey);

    const request = await this.loadRequest(requestId);
    if (request.status !== WITHDRAWAL_STATUS.PROCESSING) {
      throw new BadRequestException('Only processing requests can be completed');
    }

    const amount = Number(request.amount);
    const methodToUse = request.payoutMethod;
    const stripeKey = request.stripeIdempotencyKey || `transfer_${requestId}`;

    const updated = await this.prisma.$transaction(async (tx) => {
      const balanceAfter = await this.burnFrozenBalance(tx, request, amount);

      await tx.walletTransaction.create({
        data: {
          userId: request.role === 'CUSTOMER' ? request.userId : request.store!.ownerId,
          role: request.role === 'CUSTOMER' ? 'CUSTOMER' : 'VENDOR',
          type: 'DEBIT',
          transactionType: 'withdrawal',
          amount: request.amount,
          description: `Withdrawal via ${methodToUse}: ${request.id}`,
          balanceAfter,
          metadata: { requestId: request.id, payoutMethod: methodToUse },
        },
      });

      let transferId: string | null = null;
      if (methodToUse === 'STRIPE') {
        const config = await this.financialConfig.getConfig();
        if (!config.stripeConnectEnabled) {
          throw new ForbiddenException('Stripe Connect is disabled');
        }
        const stripeId =
          request.role === 'CUSTOMER'
            ? request.user?.stripeAccountId
            : request.store?.stripeAccountId;
        if (!stripeId) throw new BadRequestException('Stripe Connect account not linked');

        const transfer = await this.stripeService.createTransfer(
          request.amount.toString(),
          request.currency,
          stripeId,
          `WITHDRAWAL_${request.id}`,
          { requestId: request.id, role: request.role },
          stripeKey,
        );
        transferId = transfer.id;
      } else {
        const hasBank =
          request.role === 'CUSTOMER'
            ? Boolean(request.user?.bankIban && request.user?.bankName)
            : Boolean(request.store?.bankIban && request.store?.bankName);
        if (!hasBank) {
          throw new BadRequestException('Bank details are missing. Cannot complete bank transfer.');
        }
      }

      await this.auditLogs.logAction(
        {
          entity: 'FINANCIAL',
          action: 'WITHDRAWAL_COMPLETED',
          actorType: ActorType.ADMIN,
          actorId: ctx.adminId,
          actorName: ctx.adminName,
          metadata: {
            requestId,
            amount,
            method: methodToUse,
            note: reason,
            adminEmail: ctx.adminEmail,
            adminSignature: ctx.adminSignature || null,
            stripeTransferId: transferId,
            ip: ctx.ip ?? null,
          },
        },
        tx,
      );

      return tx.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: WITHDRAWAL_STATUS.COMPLETED,
          completedAt: new Date(),
          transferCompletedAt: new Date(),
          stripeTransferId: transferId,
          stripeIdempotencyKey: stripeKey,
          adminNotes: reason,
          processedBy: ctx.adminId,
          adminSignature: ctx.adminSignature || null,
        },
      });
    });

    await this.notifyRecipient(request, {
      titleAr: 'تم إتمام السحب',
      titleEn: 'Withdrawal Completed',
      messageAr: `تم تحويل مبلغ ${amount} درهم بنجاح.`,
      messageEn: `Your withdrawal of AED ${amount} has been completed.`,
      metadataType: 'WITHDRAWAL_COMPLETED',
    });

    return updated;
  }

  async releaseWithdrawalFunds(requestId: string, ctx: WithdrawalActionContext) {
    const reason = this.validateAdminReason(ctx.notes, true, ctx.adminSignature);
    const idempotencyKey = ctx.idempotencyKey || `release_${requestId}_${ctx.adminId}`;
    this.checkIdempotency(idempotencyKey);

    const request = await this.loadRequest(requestId);
    if (request.status !== WITHDRAWAL_STATUS.PROCESSING) {
      throw new BadRequestException('Only processing requests can be released');
    }

    const amount = Number(request.amount);
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.unholdBalance(tx, request, amount);
      await this.auditLogs.logAction(
        {
          entity: 'FINANCIAL',
          action: 'WITHDRAWAL_RELEASED',
          actorType: ActorType.ADMIN,
          actorId: ctx.adminId,
          actorName: ctx.adminName,
          metadata: {
            requestId,
            amount,
            note: reason,
            adminEmail: ctx.adminEmail,
            adminSignature: ctx.adminSignature || null,
            ip: ctx.ip ?? null,
          },
        },
        tx,
      );

      return tx.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: WITHDRAWAL_STATUS.REJECTED,
          rejectionReason: reason,
          adminNotes: reason,
          processedBy: ctx.adminId,
          adminSignature: ctx.adminSignature || null,
        },
      });
    });

    await this.notifyRecipient(request, {
      titleAr: 'تم إفراج المبلغ المحجوز',
      titleEn: 'Withdrawal Funds Released',
      messageAr: `تم إفراج مبلغ ${amount} درهم وإعادته لمحفظتك. السبب: ${reason}.`,
      messageEn: `AED ${amount} has been released back to your wallet. Reason: ${reason}.`,
      metadataType: 'WITHDRAWAL_RELEASED',
      extra: { reason },
    });

    return updated;
  }

  async cancelWithdrawalRequest(userId: string, requestId: string, ip?: string | null) {
    const request = await this.loadRequest(requestId);
    if (request.status !== WITHDRAWAL_STATUS.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    const isOwner =
      request.role === 'CUSTOMER'
        ? request.userId === userId
        : request.store?.ownerId === userId;
    if (!isOwner) throw new ForbiddenException('Not authorized to cancel this request');

    const amount = Number(request.amount);
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.unholdBalance(tx, request, amount);
      await this.auditLogs.logAction(
        {
          entity: 'FINANCIAL',
          action: 'WITHDRAWAL_CANCELLED',
          actorType: request.role === 'CUSTOMER' ? ActorType.CUSTOMER : ActorType.VENDOR,
          actorId: userId,
          metadata: { requestId, amount, ip: ip ?? null },
        },
        tx,
      );

      return tx.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: WITHDRAWAL_STATUS.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: userId,
        },
      });
    });

    return updated;
  }

  async handleStripeTransferEvent(
    transfer: { id: string; metadata?: Record<string, string> },
    eventType: string,
  ) {
    const requestId = transfer.metadata?.requestId;
    if (!requestId) return;

    const existing = await this.prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
    if (!existing || existing.status !== WITHDRAWAL_STATUS.PROCESSING) return;

    if (eventType === 'transfer.created' || eventType === 'transfer.paid') {
      await this.prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: WITHDRAWAL_STATUS.COMPLETED,
          stripeTransferId: transfer.id,
          transferCompletedAt: new Date(),
          completedAt: new Date(),
        },
      });
    } else if (eventType === 'transfer.failed' || eventType === 'transfer.reversed') {
      await this.prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          adminNotes: `Stripe ${eventType}: ${transfer.id}. Admin must release funds manually if needed.`,
        },
      });
    }
  }

  private async loadRequest(requestId: string): Promise<WithdrawalWithRelations> {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
      include: { store: { include: { owner: true } }, user: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  private async notifyRecipient(
    request: WithdrawalWithRelations,
    payload: {
      titleAr: string;
      titleEn: string;
      messageAr: string;
      messageEn: string;
      metadataType: string;
      extra?: Record<string, unknown>;
    },
  ) {
    const recipientId = request.role === 'CUSTOMER' ? request.userId : request.store?.ownerId;
    const recipientRole = request.role === 'CUSTOMER' ? 'CUSTOMER' : 'VENDOR';
    if (!recipientId) return;

    await this.notifications.create({
      recipientId,
      recipientRole,
      type: 'payment',
      titleAr: payload.titleAr,
      titleEn: payload.titleEn,
      messageAr: payload.messageAr,
      messageEn: payload.messageEn,
      metadata: {
        type: payload.metadataType,
        requestId: request.id,
        ...payload.extra,
      },
    });
  }
}
