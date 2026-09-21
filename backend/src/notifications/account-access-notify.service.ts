import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ConfigService } from '@nestjs/config';

export type AccountAccessAction = 'BAN' | 'UNBAN';
export type AccountAccessScope = 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
export type AccountAccessBanKind = 'PERMANENT' | 'TEMPORARY' | 'NONE';

export interface AccountAccessNotifyParams {
  recipientId: string;
  /** Actual platform role for in-app routing */
  recipientRole: string;
  scope: AccountAccessScope;
  action: AccountAccessAction;
  banKind: AccountAccessBanKind;
  reason?: string | null;
  suspendedUntil?: Date | string | null;
  durationDays?: number | null;
  storeName?: string | null;
  recipientName?: string | null;
}

const SUPPORT = {
  phone: '971544404839',
  emailCustomer: 'cs@e-tashleh.shop',
  emailMerchant: 'sl@e-tashleh.shop',
  emailAdmin: 'shop@e-tashleh.shop',
};

@Injectable()
export class AccountAccessNotifyService {
  private readonly logger = new Logger(AccountAccessNotifyService.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async notify(params: AccountAccessNotifyParams): Promise<void> {
    try {
      const supportPhone =
        this.config.get<string>('SUPPORT_WHATSAPP') ||
        this.config.get<string>('SUPPORT_PHONE') ||
        SUPPORT.phone;
      const supportEmail =
        params.scope === 'MERCHANT'
          ? SUPPORT.emailMerchant
          : params.scope === 'ADMIN'
            ? SUPPORT.emailAdmin
            : SUPPORT.emailCustomer;

      const isBan = params.action === 'BAN';
      const until =
        params.suspendedUntil != null ? new Date(params.suspendedUntil) : null;
      const durationLabelAr =
        params.banKind === 'TEMPORARY'
          ? params.durationDays
            ? `${params.durationDays} يوم`
            : until
              ? until.toLocaleString('ar-EG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '—'
          : params.banKind === 'PERMANENT'
            ? 'دائم'
            : '—';
      const durationLabelEn =
        params.banKind === 'TEMPORARY'
          ? params.durationDays
            ? `${params.durationDays} day(s)`
            : until
              ? until.toLocaleString('en-GB', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '—'
          : params.banKind === 'PERMANENT'
            ? 'Permanent'
            : '—';

      const scopeAr =
        params.scope === 'MERCHANT'
          ? 'تاجر'
          : params.scope === 'ADMIN'
            ? 'إدارة'
            : 'عميل';
      const scopeEn =
        params.scope === 'MERCHANT'
          ? 'Merchant'
          : params.scope === 'ADMIN'
            ? 'Admin'
            : 'Customer';

      const banKindAr =
        params.banKind === 'TEMPORARY'
          ? 'مؤقت'
          : params.banKind === 'PERMANENT'
            ? 'دائم'
            : '—';
      const banKindEn =
        params.banKind === 'TEMPORARY'
          ? 'Temporary'
          : params.banKind === 'PERMANENT'
            ? 'Permanent'
            : '—';

      const reason = (params.reason || '').trim() || (isBan ? 'قرار إداري' : '—');
      const storeBitAr = params.storeName ? ` (متجر: ${params.storeName})` : '';
      const storeBitEn = params.storeName ? ` (store: ${params.storeName})` : '';

      const titleAr = isBan
        ? params.banKind === 'TEMPORARY'
          ? '⏸️ تم إيقاف حسابك مؤقتاً'
          : '⛔ تم حظر حسابك'
        : '✅ تم تنشيط حسابك';
      const titleEn = isBan
        ? params.banKind === 'TEMPORARY'
          ? '⏸️ Your account was temporarily suspended'
          : '⛔ Your account was blocked'
        : '✅ Your account was reactivated';

      const messageAr = isBan
        ? `تم ${params.banKind === 'TEMPORARY' ? 'إيقاف' : 'حظر'} حسابك (${scopeAr})${storeBitAr}. النوع: ${banKindAr}. المدة: ${durationLabelAr}. السبب: ${reason}. للدعم: واتساب ${supportPhone} | بريد ${supportEmail}`
        : `تم تنشيط حسابك (${scopeAr})${storeBitAr} بنجاح. يمكنك متابعة استخدام المنصة. للدعم: واتساب ${supportPhone} | بريد ${supportEmail}`;

      const messageEn = isBan
        ? `Your ${scopeEn} account${storeBitEn} was ${params.banKind === 'TEMPORARY' ? 'temporarily suspended' : 'blocked'}. Type: ${banKindEn}. Duration: ${durationLabelEn}. Reason: ${reason}. Support: WhatsApp ${supportPhone} | Email ${supportEmail}`
        : `Your ${scopeEn} account${storeBitEn} was reactivated. You can continue using the platform. Support: WhatsApp ${supportPhone} | Email ${supportEmail}`;

      const link =
        params.scope === 'MERCHANT'
          ? '/dashboard/merchant/home'
          : params.scope === 'ADMIN'
            ? '/dashboard/admin'
            : '/dashboard/customer';

      const statusDetailAr = messageAr;
      const statusDetailEn = messageEn;

      await this.notifications.create({
        recipientId: params.recipientId,
        recipientRole: params.scope === 'MERCHANT' ? 'MERCHANT' : 'CUSTOMER',
        titleAr,
        titleEn,
        messageAr,
        messageEn,
        type: 'SECURITY',
        link,
        metadata: {
          waEvent: 'ACCOUNT_ACCESS',
          accountAccessAction: params.action,
          accountAccessScope: params.scope,
          banKind: params.banKind,
          reason,
          durationDays: params.durationDays ?? null,
          suspendedUntil: until?.toISOString() ?? null,
          supportPhone,
          supportEmail,
          storeName: params.storeName ?? null,
          status_detail: statusDetailAr,
          status_detail_en: statusDetailEn,
          actualRecipientRole: params.recipientRole,
        },
      });
    } catch (e) {
      this.logger.warn(
        `AccountAccessNotify failed: ${(e as Error)?.message || e}`,
      );
    }
  }
}
