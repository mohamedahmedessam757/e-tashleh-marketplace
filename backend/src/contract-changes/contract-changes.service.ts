import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActorType, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContractsService } from '../contracts/contracts.service';
import { bakeContractTemplate } from '../common/contract-baker.util';
import {
  normalizeSearchQuery,
  resolveUserIds,
  resolveStoreIds,
  isUuid,
  mergeWhereWithSearch,
} from '../common/search/admin-entity-search.util';
import { SubmitContractChangeDto, ResolveContractChangeDto } from './dto/contract-change.dto';

const MERCHANT_ROLES: string[] = [UserRole.VENDOR];

@Injectable()
export class ContractChangesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
    private readonly contractsService: ContractsService,
  ) {}

  private assertMerchant(role: string) {
    if (!MERCHANT_ROLES.includes(role)) {
      throw new ForbiddenException('Contract amendments are for merchants only');
    }
  }

  private async enforceDailyLimit(storeId: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await this.prisma.contractChangeRequest.count({
      where: { storeId, requestedAt: { gte: since } },
    });
    if (count >= 1) {
      throw new HttpException(
        {
          message: 'You can submit one contract amendment request every 24 hours.',
          messageAr: 'يمكنك تقديم طلب تعديل واحد كل 24 ساعة',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async submitRequest(userId: string, role: string, dto: SubmitContractChangeDto) {
    this.assertMerchant(role);

    const store = await this.prisma.store.findFirst({
      where: { ownerId: userId },
      include: {
        contractAcceptances: {
          where: { isActive: true },
          orderBy: { acceptedAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!store) throw new NotFoundException('Store not found');

    const active = store.contractAcceptances[0];
    if (!active) {
      throw new BadRequestException('No active contract acceptance found');
    }

    const pending = await this.prisma.contractChangeRequest.findFirst({
      where: { storeId: store.id, status: 'PENDING_REVIEW' },
    });
    if (pending) {
      throw new ConflictException('A contract amendment is already pending review');
    }

    await this.enforceDailyLimit(store.id);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const signatureBase = (active.signatureData as Record<string, unknown>) || {};
    const newSignature = {
      ...signatureBase,
      ...(dto.newSignatureData || {}),
      email: user?.email,
      phone: user?.phone,
      date: new Date().toISOString(),
    };

    return this.prisma.contractChangeRequest.create({
      data: {
        storeId: store.id,
        userId,
        acceptanceId: active.id,
        oldSecondPartyData: active.secondPartyData as object,
        newSecondPartyData: dto.newSecondPartyData as object,
        oldSignatureData: active.signatureData as object,
        newSignatureData: newSignature as object,
        status: 'PENDING_REVIEW',
      },
    });
  }

  async getMyPending(userId: string) {
    const store = await this.prisma.store.findFirst({ where: { ownerId: userId } });
    if (!store) return [];
    return this.prisma.contractChangeRequest.findMany({
      where: { storeId: store.id, status: 'PENDING_REVIEW' },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async getPendingForAdmin(search?: string) {
    let where: Record<string, unknown> = { status: 'PENDING_REVIEW' };
    const q = normalizeSearchQuery(search);
    if (q) {
      const userIds = await resolveUserIds(this.prisma, q);
      const storeIds = await resolveStoreIds(this.prisma, q);
      const or: Record<string, unknown>[] = [];
      if (userIds.length) or.push({ userId: { in: userIds } });
      if (storeIds.length) or.push({ storeId: { in: storeIds } });
      if (isUuid(q)) or.push({ id: q });
      if (or.length) {
        where = mergeWhereWithSearch(where, { OR: or });
      } else {
        return [];
      }
    }

    return this.prisma.contractChangeRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        store: { select: { id: true, name: true, storeCode: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  async resolveRequest(
    id: string,
    dto: ResolveContractChangeDto,
    adminId: string,
    adminEmail: string,
  ) {
    const request = await this.prisma.contractChangeRequest.findUnique({
      where: { id },
      include: {
        store: true,
        acceptance: { include: { contract: true } },
        user: true,
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Request already resolved');
    }

    if (dto.action === 'REJECT') {
      const updated = await this.prisma.contractChangeRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          resolvedAt: new Date(),
          resolvedBy: adminId,
          adminSignature: dto.adminSignature,
          rejectionReason: dto.rejectionReason || null,
        },
      });

      await this.auditLogs.logAction({
        action: 'CONTRACT_CHANGE_REJECTED',
        entity: 'ContractChangeRequest',
        actorType: ActorType.ADMIN,
        actorId: adminId,
        actorName: adminEmail,
        reason: dto.rejectionReason || 'Contract amendment rejected',
        metadata: { requestId: id, storeId: request.storeId, signature: dto.adminSignature },
      });

      await this.notifications.create({
        recipientId: request.userId,
        recipientRole: 'VENDOR',
        type: 'contract_amendment',
        titleAr: 'تم رفض طلب تعديل العقد',
        titleEn: 'Contract amendment rejected',
        messageAr: dto.rejectionReason || 'تم رفض طلب تعديل بيانات العقد من قبل الإدارة.',
        messageEn: dto.rejectionReason || 'Your contract data amendment request was rejected.',
        link: '/dashboard/profile',
      });

      return updated;
    }

    const platformContract =
      request.acceptance.contract ||
      (await this.contractsService.getActiveVendorContract());
    const fp = (request.acceptance.firstPartySnapshot as Record<string, string>) ||
      ((platformContract as any).firstPartyConfig as Record<string, string>) ||
      {};
    const secondParty = request.newSecondPartyData as Record<string, string>;
    const signature = request.newSignatureData as Record<string, string>;

    const contentAr = bakeContractTemplate(
      (platformContract as any).contentAr || request.acceptance.contentArSnapshot,
      'ar',
      fp,
      secondParty,
      signature,
    );
    const contentEn = bakeContractTemplate(
      (platformContract as any).contentEn || request.acceptance.contentEnSnapshot,
      'en',
      fp,
      secondParty,
      signature,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.contractAcceptance.update({
        where: { id: request.acceptanceId },
        data: {
          isActive: false,
          archivedAt: new Date(),
          changeRequestId: id,
        },
      });

      const newAcceptance = await tx.contractAcceptance.create({
        data: {
          storeId: request.storeId,
          contractId: request.acceptance.contractId,
          contractVersion: request.acceptance.contractVersion,
          secondPartyData: request.newSecondPartyData as object,
          signatureData: request.newSignatureData as object,
          firstPartySnapshot: request.acceptance.firstPartySnapshot as object,
          contentArSnapshot: contentAr,
          contentEnSnapshot: contentEn,
          isActive: true,
        },
      });

      const updatedRequest = await tx.contractChangeRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          resolvedAt: new Date(),
          resolvedBy: adminId,
          adminSignature: dto.adminSignature,
        },
      });

      return { updatedRequest, newAcceptance };
    });

    await this.auditLogs.logAction({
      action: 'CONTRACT_CHANGE_APPROVED',
      entity: 'ContractChangeRequest',
      actorType: ActorType.ADMIN,
      actorId: adminId,
      actorName: adminEmail,
      reason: 'Contract amendment approved',
      metadata: {
        requestId: id,
        storeId: request.storeId,
        newAcceptanceId: result.newAcceptance.id,
        signature: dto.adminSignature,
      },
    });

    await this.notifications.create({
      recipientId: request.userId,
      recipientRole: 'VENDOR',
      type: 'contract_amendment',
      titleAr: 'تمت الموافقة على تعديل العقد',
      titleEn: 'Contract amendment approved',
      messageAr: 'تمت الموافقة على تعديل بيانات العقد. النسخة الجديدة أصبحت نشطة.',
      messageEn: 'Your contract data amendment was approved. The new version is now active.',
      link: '/dashboard/profile',
    });

    return result.updatedRequest;
  }
}
