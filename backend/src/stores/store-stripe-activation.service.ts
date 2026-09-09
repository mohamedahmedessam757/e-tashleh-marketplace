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
    options?: { allowMissingAccountRestrict?: boolean },
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
        stripeDetailsSubmitted: true,
      },
    });

    if (!store) {
      this.logger.warn(`syncStoreFromStripeAccount: store ${storeId} not found`);
      return { ready: false, status: 'MISSING' };
    }

    // Security: refuse to apply an account that does not belong to this store
    // (except when store has no account yet and we're binding the first one).
    if (
      account &&
      mapped.readiness.stripeAccountId &&
      store.stripeAccountId &&
      store.stripeAccountId !== mapped.readiness.stripeAccountId
    ) {
      this.logger.warn(
        `Refusing Stripe sync for store ${storeId}: account ${mapped.readiness.stripeAccountId} != bound ${store.stripeAccountId}`,
      );
      return { ready: false, status: store.status };
    }

    const wasDetailsSubmitted = Boolean(store.stripeDetailsSubmitted);
    const nowDetailsSubmitted = Boolean(mapped.stripeDetailsSubmitted);

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
    const adminApproved = Boolean(store.adminApprovedAt);

    if (requiresStripe) {
      if (
        ready &&
        adminApproved &&
        (store.status === StoreStatus.PENDING_STRIPE ||
          store.status === StoreStatus.STRIPE_RESTRICTED)
      ) {
        nextStatus = StoreStatus.ACTIVE;
      } else if (
        !ready &&
        store.status === StoreStatus.ACTIVE &&
        (store.stripeAccountId || options?.allowMissingAccountRestrict)
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

    // First time merchant finishes Stripe hosted form (still awaiting review / capabilities).
    if (!wasDetailsSubmitted && nowDetailsSubmitted && !ready) {
      await this.notifyDetailsSubmitted(store);
    }

    if (nextStatus && nextStatus !== store.status) {
      await this.notifyStatusTransition(store, nextStatus, mapped.readiness);
    }

    return { ready, status: updated.status };
  }

  /**
   * Mark a Stripe-required store as restricted when Connect account was wiped/lost.
   */
  async markRestrictedMissingAccount(storeId: string): Promise<void> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        status: true,
        ownerId: true,
        stripeActivationRequired: true,
      },
    });
    if (!store?.stripeActivationRequired) return;
    if (store.status !== StoreStatus.ACTIVE && store.status !== StoreStatus.PENDING_STRIPE) {
      return;
    }

    const nextStatus =
      store.status === StoreStatus.ACTIVE
        ? StoreStatus.STRIPE_RESTRICTED
        : StoreStatus.PENDING_STRIPE;

    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        status: nextStatus,
        stripeAccountId: null,
        stripeOnboarded: false,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        stripeDisabledReason: 'account_missing',
        stripeRequirementsDue: ['account'],
        stripeStatusUpdatedAt: new Date(),
      },
    });

    if (nextStatus !== store.status) {
      await this.notifyStatusTransition(store, nextStatus, {
        stripeAccountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        disabledReason: 'account_missing',
        currentlyDue: ['account'],
        pendingVerification: [],
      });
    }
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

  private async notifyDetailsSubmitted(store: {
    id: string;
    name: string;
    ownerId: string;
  }) {
    try {
      if (store.ownerId) {
        void this.notifications
          .create({
            recipientId: store.ownerId,
            recipientRole: 'MERCHANT',
            titleAr: 'تم استلام بيانات Stripe — قيد المراجعة',
            titleEn: 'Stripe details received — under review',
            messageAr:
              'استلمنا بيانات حسابك المالي. Stripe يراجع التوثيق الآن. التفعيل يتم تلقائيًا عند اكتمال الجاهزية (charges + payouts).',
            messageEn:
              'We received your financial account details. Stripe is reviewing verification. Activation happens automatically when ready (charges + payouts).',
            type: 'INFO',
            link: '/dashboard',
            metadata: {
              storeId: store.id,
              event: 'STORE_STRIPE_DETAILS_SUBMITTED',
              // In-app only — WhatsApp result template fires on final approve/restrict.
            },
          })
          .catch((e) => this.logger.error('Failed merchant details-submitted notify', e));
      }

      void this.notifications
        .notifyAdmins({
          titleAr: `بيانات Stripe لمتجر (${store.name}) قيد المراجعة`,
          titleEn: `Stripe details for (${store.name}) under review`,
          messageAr: 'التاجر أرسل بيانات Connect. بانتظار جاهزية charges + payouts.',
          messageEn: 'Merchant submitted Connect details. Awaiting charges + payouts readiness.',
          type: 'INFO',
          link: `/dashboard/admin/stores/${store.id}`,
          metadata: { storeId: store.id, event: 'STORE_STRIPE_DETAILS_SUBMITTED' },
        })
        .catch((e) => this.logger.error('Failed admin details-submitted notify', e));
    } catch (e) {
      this.logger.error('notifyDetailsSubmitted failed', e);
    }
  }

  private async notifyStatusTransition(
    store: { id: string; name: string; ownerId: string; status: StoreStatus },
    nextStatus: StoreStatus,
    readiness: StripeAccountReadinessSnapshot,
  ) {
    try {
      if (nextStatus === StoreStatus.ACTIVE) {
        const statusDetailAr =
          'يمكنك الآن تقديم العروض على الطلبات الجديدة واستقبال المستحقات وفق آلية الدفع المعتمدة.';
        const statusDetailEn =
          'You can now submit offers on new orders and receive payouts per the platform payment rules.';
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
                store_name: store.name,
                event: 'STORE_STRIPE_ACTIVATED',
                waEvent: 'STORE_STRIPE_RESULT',
                decision: 'approved',
                decision_status: 'تمت الموافقة',
                decision_status_en: 'Approved',
                status_detail: statusDetailAr,
                status_detail_en: statusDetailEn,
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
        const dueRaw =
          readiness.currentlyDue?.slice(0, 5).join(', ') ||
          readiness.disabledReason ||
          '';
        const due = dueRaw || 'requirements';
        const statusDetailAr = dueRaw
          ? `سبب Stripe / المتطلبات: ${dueRaw}`
          : 'لم يُذكر سبب تفصيلي — راجع لوحة Stripe وأكمل أي متطلبات ناقصة.';
        const statusDetailEn = dueRaw
          ? `Stripe reason / requirements: ${dueRaw}`
          : 'No detailed reason provided — open Stripe Express and complete any outstanding requirements.';
        if (store.ownerId) {
          void this.notifications
            .create({
              recipientId: store.ownerId,
              recipientRole: 'MERCHANT',
              titleAr: 'مطلوب إعادة التحقق المالي',
              titleEn: 'Financial re-verification required',
              messageAr: `حساب Stripe لم يعد جاهزًا. تم إيقاف تقديم العروض الجديدة. التفاصيل: ${due}`,
              messageEn: `Your Stripe account is no longer ready. New offers are paused. Details: ${due}`,
              // WARNING (not SECURITY) so WhatsApp channel can dispatch STORE_STRIPE_RESULT.
              type: 'WARNING',
              link: '/dashboard/wallet',
              metadata: {
                storeId: store.id,
                store_name: store.name,
                event: 'STORE_STRIPE_RESTRICTED',
                waEvent: 'STORE_STRIPE_RESULT',
                decision: 'rejected',
                decision_status: 'مرفوض أو مقيد',
                decision_status_en: 'Rejected or restricted',
                status_detail: statusDetailAr,
                status_detail_en: statusDetailEn,
              },
            })
            .catch((e) => this.logger.error('Failed merchant restrict notify', e));
        }

        void this.notifications
          .notifyAdmins({
            titleAr: `تقييد Stripe لمتجر (${store.name})`,
            titleEn: `Stripe restriction for store (${store.name})`,
            messageAr: `تم تحويل المتجر إلى STRIPE_RESTRICTED. السبب/المتطلبات: ${due}`,
            messageEn: `Store moved to STRIPE_RESTRICTED. Reason/requirements: ${due}`,
            type: 'WARNING',
            link: `/dashboard/admin/stores/${store.id}`,
            metadata: { storeId: store.id, event: 'STORE_STRIPE_RESTRICTED' },
          })
          .catch((e) => this.logger.error('Failed admin restrict notify', e));
      }
    } catch (e) {
      this.logger.error('notifyStatusTransition failed', e);
    }
  }

  isReady(account: Record<string, unknown> | null | undefined): boolean {
    return mapStripeAccountToStoreFields(account).ready;
  }

  assertReadySnapshot(account: Record<string, unknown> | null | undefined): boolean {
    return isStripeFullyReady(mapStripeAccountToStoreFields(account).readiness);
  }
}
