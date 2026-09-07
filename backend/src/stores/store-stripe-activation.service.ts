import { Injectable, Logger } from '@nestjs/common';
import { Prisma, StoreStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  isStripeFullyReady,
  mapStripeAccountToStoreFields,
  type StripeAccountReadinessSnapshot,
} from './store-activation.policy';

@Injectable()
export class StoreStripeActivationService {
  private readonly logger = new Logger(StoreStripeActivationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Persist Stripe capability fields and apply store status transitions.
   * Safe for grandfathered stores (stripeActivationRequired=false): updates Stripe
   * fields only; does not force STRIPE_RESTRICTED when Stripe is missing/incomplete.
   */
  async syncStoreFromStripeAccount(
    storeId: string,
    account: Record<string, unknown> | null | undefined,
  ): Promise<{ ready: boolean; status: string }> {
    const mapped = mapStripeAccountToStoreFields(account);
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        status: true,
        ownerId: true,
        adminApprovedAt: true,
        stripeActivationRequired: true,
        stripeAccountId: true,
      },
    });

    if (!store) {
      this.logger.warn(`syncStoreFromStripeAccount: store ${storeId} not found`);
      return { ready: false, status: 'MISSING' };
    }

    const data: Prisma.StoreUpdateInput = {
      stripeChargesEnabled: mapped.stripeChargesEnabled,
      stripePayoutsEnabled: mapped.stripePayoutsEnabled,
      stripeDetailsSubmitted: mapped.stripeDetailsSubmitted,
      stripeDisabledReason: mapped.stripeDisabledReason,
      stripeRequirementsDue: mapped.stripeRequirementsDue as Prisma.InputJsonValue,
      stripeRequirementsPending: mapped.stripeRequirementsPending as Prisma.InputJsonValue,
      stripeOnboarded: mapped.ready,
      stripeStatusUpdatedAt: mapped.stripeStatusUpdatedAt,
    };

    if (mapped.readiness.stripeAccountId && !store.stripeAccountId) {
      data.stripeAccountId = mapped.readiness.stripeAccountId;
    }

    let nextStatus: StoreStatus | null = null;
    const requiresStripe = Boolean(store.stripeActivationRequired);
    const ready = mapped.ready;

    if (requiresStripe) {
      if (
        ready &&
        store.adminApprovedAt &&
        (store.status === StoreStatus.PENDING_STRIPE || store.status === StoreStatus.STRIPE_RESTRICTED)
      ) {
        nextStatus = StoreStatus.ACTIVE;
      } else if (
        !ready &&
        store.status === StoreStatus.ACTIVE &&
        store.stripeAccountId
      ) {
        nextStatus = StoreStatus.STRIPE_RESTRICTED;
      }
    }

    if (nextStatus) {
      data.status = nextStatus;
    }

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data,
      select: { id: true, status: true, name: true, ownerId: true },
    });

    if (nextStatus && nextStatus !== store.status) {
      await this.notifyStatusTransition(store, nextStatus, mapped.readiness);
    }

    return { ready, status: updated.status };
  }

  async syncStoreFromReadiness(
    storeId: string,
    readiness: StripeAccountReadinessSnapshot,
  ): Promise<{ ready: boolean; status: string }> {
    const fakeAccount = {
      id: readiness.stripeAccountId,
      charges_enabled: readiness.chargesEnabled,
      payouts_enabled: readiness.payoutsEnabled,
      details_submitted: readiness.detailsSubmitted,
      requirements: {
        currently_due: readiness.currentlyDue,
        pending_verification: readiness.pendingVerification,
        disabled_reason: readiness.disabledReason,
      },
    };
    return this.syncStoreFromStripeAccount(storeId, fakeAccount);
  }

  private async notifyStatusTransition(
    store: { id: string; name: string; ownerId: string; status: StoreStatus },
    nextStatus: StoreStatus,
    readiness: StripeAccountReadinessSnapshot,
  ) {
    try {
      if (nextStatus === StoreStatus.ACTIVE) {
        if (store.ownerId) {
          void this.notifications
            .create({
              recipientId: store.ownerId,
              recipientRole: 'MERCHANT',
              titleAr: 'تم تفعيل متجرك بالكامل',
              titleEn: 'Your store is fully activated',
              messageAr:
                'اكتمل التحقق المالي عبر Stripe. يمكنك الآن تقديم العروض واستقبال الأرباح.',
              messageEn:
                'Stripe financial verification is complete. You can now submit offers and receive payouts.',
              type: 'SUCCESS',
              link: '/dashboard',
              metadata: {
                storeId: store.id,
                event: 'STORE_STRIPE_ACTIVATED',
                waEvent: 'STORE_ACTIVATION',
              },
            })
            .catch((e) => this.logger.error('Failed merchant activation notify', e));
        }

        void this.notifications
          .notifyAdmins({
            titleAr: `تم تفعيل متجر (${store.name}) عبر Stripe`,
            titleEn: `Store (${store.name}) activated via Stripe`,
            messageAr: 'الحساب المالي أصبح جاهزًا (charges + payouts). المتجر نشط الآن.',
            messageEn: 'Financial account is ready (charges + payouts). Store is now ACTIVE.',
            type: 'SUCCESS',
            link: `/dashboard/admin/stores/${store.id}`,
            metadata: { storeId: store.id, event: 'STORE_STRIPE_ACTIVATED' },
          })
          .catch((e) => this.logger.error('Failed admin activation notify', e));
        return;
      }

      if (nextStatus === StoreStatus.STRIPE_RESTRICTED) {
        const due = readiness.currentlyDue?.slice(0, 5).join(', ') || readiness.disabledReason || 'requirements';
        if (store.ownerId) {
          void this.notifications
            .create({
              recipientId: store.ownerId,
              recipientRole: 'MERCHANT',
              titleAr: 'مطلوب إعادة التحقق المالي',
              titleEn: 'Financial re-verification required',
              messageAr: `حساب Stripe لم يعد جاهزًا. تم إيقاف تقديم العروض الجديدة. التفاصيل: ${due}`,
              messageEn: `Your Stripe account is no longer ready. New offers are paused. Details: ${due}`,
              type: 'SECURITY',
              link: '/dashboard/wallet',
              metadata: { storeId: store.id, event: 'STORE_STRIPE_RESTRICTED' },
            })
            .catch((e) => this.logger.error('Failed merchant restrict notify', e));
        }

        void this.notifications
          .notifyAdmins({
            titleAr: `تقييد Stripe لمتجر (${store.name})`,
            titleEn: `Stripe restriction for store (${store.name})`,
            messageAr: `تم تحويل المتجر إلى STRIPE_RESTRICTED. السبب/المتطلبات: ${due}`,
            messageEn: `Store moved to STRIPE_RESTRICTED. Reason/requirements: ${due}`,
            type: 'SECURITY',
            link: `/dashboard/admin/stores/${store.id}`,
            metadata: { storeId: store.id, event: 'STORE_STRIPE_RESTRICTED' },
          })
          .catch((e) => this.logger.error('Failed admin restrict notify', e));
      }
    } catch (e) {
      this.logger.error('notifyStatusTransition failed', e);
    }
  }

  /** Convenience for callers that already have a readiness decision. */
  isReady(account: Record<string, unknown> | null | undefined): boolean {
    return mapStripeAccountToStoreFields(account).ready;
  }

  assertReadySnapshot(account: Record<string, unknown> | null | undefined): boolean {
    return isStripeFullyReady(mapStripeAccountToStoreFields(account).readiness);
  }
}
