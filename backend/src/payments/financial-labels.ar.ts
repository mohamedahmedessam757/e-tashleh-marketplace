/** Arabic financial event labels — UTF-8 source file (do not edit via PowerShell). */

export const WALLET_TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  payment: { en: 'Order Payment', ar: 'دفع طلب' },
  commission: { en: 'Platform Commission', ar: 'عمولة المنصة' },
  withdrawal: { en: 'Balance Withdrawal', ar: 'سحب رصيد من المحفظة' },
  referral: { en: 'Referral Bonus Reward', ar: 'مكافأة إحالة مستخدم' },
  referral_profit: { en: 'Referral Profit', ar: 'ربح إحالة' },
  order_profit: { en: 'Loyalty Cashback', ar: 'كاش باك ولاء' },
  shipping_fee: { en: 'Shipping Fee', ar: 'رسوم الشحن' },
  manual_payout: { en: 'Manual Bank Transfer', ar: 'تحويل بنكي يدوي' },
  payout: { en: 'Merchant Payout', ar: 'تحويل مستحقات التاجر' },
  refund: { en: 'Customer Refund', ar: 'استرداد مبلغ للعميل' },
  penalty: { en: 'Violation Penalty', ar: 'خصم غرامة مخالفة' },
  adjudication_fee: { en: 'Adjudication Fee', ar: 'رسوم الفصل في النزاع' },
  escrow_release: { en: 'Escrow Release', ar: 'تحرير أموال الضمان' },
  platform_fee_retention: { en: 'Platform Fee Retention', ar: 'احتفاظ برسوم المنصة' },
  fraud_penalty: { en: 'Fraud Penalty', ar: 'غرامة احتيال' },
  adjustment: { en: 'Financial Adjustment', ar: 'تسوية مالية' },
  shipping_liability: { en: 'Shipping Liability', ar: 'مسؤولية الشحن' },
  sale: { en: 'Sale Credit', ar: 'إيراد مبيعات' },
  gateway_fee: { en: 'Payment Gateway Fee', ar: 'رسوم بوابة الدفع' },
  refund_fee: { en: 'Refund Fee', ar: 'رسوم الاسترداد' },
  dispute: { en: 'Dispute Hold', ar: 'حجز نزاع' },
  loyalty_bonus: { en: 'Loyalty Bonus', ar: 'مكافأة ولاء' },
  wallet_topup: { en: 'Wallet Top-up', ar: 'شحن المحفظة' },
};

export const WITHDRAWAL_STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  pending: { en: 'Withdrawal Request Pending', ar: 'طلب سحب قيد المراجعة' },
  completed: { en: 'Withdrawal Successfully Executed', ar: 'تم تحويل المبلغ بنجاح' },
  approved: { en: 'Withdrawal Approved for Processing', ar: 'تمت الموافقة على السحب' },
  rejected: { en: 'Withdrawal Request Rejected', ar: 'تم رفض طلب السحب' },
  failed: { en: 'Withdrawal Transfer Failed', ar: 'فشل في تحويل المبلغ' },
};

export const PAYMENT_STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  SUCCESS: { en: 'Order Payment Received', ar: 'استلام دفعة طلب' },
  PENDING: { en: 'Payment Pending', ar: 'عملية دفع معلقة' },
  FAILED: { en: 'Payment Failed', ar: 'عملية دفع فاشلة' },
  REFUNDED: { en: 'Payment Refunded', ar: 'عملية دفع مستردة' },
};

export const ESCROW_STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  HELD: { en: 'Funds Secured in Escrow', ar: 'تأمين الأموال في الضمان' },
  RELEASED: { en: 'Escrow Funds Released', ar: 'تحرير أموال الضمان' },
  FROZEN: { en: 'Escrow Funds Frozen', ar: 'تجميد أموال الضمان' },
};

export function getWalletTypeLabel(type: string, lang: 'ar' | 'en'): string {
  return WALLET_TYPE_LABELS[type.toLowerCase()]?.[lang] || type;
}

export function getWithdrawalLabel(status: string, lang: 'ar' | 'en'): string {
  return WITHDRAWAL_STATUS_LABELS[status.toLowerCase()]?.[lang] || `Withdrawal ${status}`;
}

export function getPaymentStatusLabel(status: string, lang: 'ar' | 'en'): string {
  return PAYMENT_STATUS_LABELS[status]?.[lang] || `Payment ${status}`;
}

export function getEscrowStatusLabel(status: string, lang: 'ar' | 'en'): string {
  return ESCROW_STATUS_LABELS[status]?.[lang] || `Escrow ${status}`;
}
