import React from 'react';
import {
  Hash,
  Calendar,
  Package,
  Truck,
  Percent,
  CreditCard,
  User,
  Building2,
  RotateCcw,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { InvoiceDocTab } from './invoiceDocs.types';

interface Labels {
  invoiceTitle: string;
  invoiceNumber: string;
  orderNumber: string;
  offerNumber: string;
  issueDate: string;
  partName: string;
  partPrice: string;
  shippingCompany: string;
  shippingPending: string;
  shippingRevenue: string;
  lineItems: string;
  platformCompany: string;
  commissionAmount: string;
  gatewayFee?: string;
  refundAmount?: string;
  refundFee?: string;
  roundtripShipping?: string;
  adjudicationFee?: string;
  customer: string;
  payer?: string;
  total: string;
  thankYou: string;
  electronicDoc: string;
  emptyTitle: string;
  emptyHint: string;
  groupId: string;
}

interface InvoiceTypedDocumentProps {
  inv: any;
  docType: Exclude<InvoiceDocTab, 'MASTER'>;
  isAr: boolean;
  isRTL: boolean;
  labels: Labels;
}

const InfoRow: React.FC<{ icon: any; label: string; value: string }> = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="flex flex-wrap sm:flex-nowrap items-start gap-2 text-xs sm:text-sm min-w-0">
    <Icon className="w-4 h-4 text-gold-500 mt-0.5 shrink-0 inv-icon" />
    <span className="text-gray-400 shrink-0 inv-label">{label}:</span>
    <span className="text-white font-semibold break-all inv-value min-w-0">{value || '--'}</span>
  </div>
);

export const InvoiceTypedDocument: React.FC<InvoiceTypedDocumentProps> = ({
  inv,
  docType,
  isAr,
  isRTL,
  labels,
}) => {
  const order = inv?.order || {};
  const acceptedOffer =
    order?.offers?.find(
      (o: any) =>
        o.id === inv?.payment?.offerId ||
        o.status === 'accepted' ||
        o.status === 'ACCEPTED',
    ) || order?.offers?.[0];
  const customer = order?.customer || null;

  const invoiceNumber = inv.invoiceNumber || '--';
  const orderNumber = order.orderNumber || '--';
  const offerNumber = acceptedOffer?.offerNumber || '--';
  const rawDate = inv.issuedAt || order.createdAt;
  const invoiceDate = rawDate
    ? `${new Date(rawDate).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })} | ${new Date(rawDate).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })}`
    : '--';

  const currency = inv.currency || 'AED';
  const partName =
    inv.livePartName ||
    inv.partNameSnapshot ||
    acceptedOffer?.orderPart?.name ||
    order.partName ||
    (isAr ? 'قطعة غيار' : 'Spare Part');
  const customerName =
    customer?.name || customer?.email || (isAr ? 'عميل' : 'Customer');
  const carrierName =
    inv.liveCarrierName ||
    inv.carrierNameSnapshot ||
    order?.shipments?.[0]?.carrierName ||
    null;
  const platformName =
    (isAr
      ? inv.livePlatformLegalNameAr || inv.platformLegalNameAr
      : inv.livePlatformLegalNameEn || inv.platformLegalNameEn) ||
    'ELLIPP FZ LLC';

  const amount =
    docType === 'PART'
      ? Number(inv.subtotal || inv.total || 0)
      : docType === 'SHIPPING'
        ? Number(inv.shipping || inv.total || 0)
        : docType === 'GATEWAY_FEE' || docType === 'REFUND'
          ? Number(inv.total || 0)
          : Number(inv.commission || inv.total || 0);

  const lineItems: Array<{
    partName?: string;
    amount?: number;
    paymentId?: string;
    kind?: string;
    payer?: string;
  }> = Array.isArray(inv.lineItems) ? inv.lineItems : [];

  const feeKindLabel = (kind?: string) => {
    const k = String(kind || '').toUpperCase();
    if (k === 'GATEWAY_FEE') return labels.gatewayFee || (isAr ? 'رسوم بوابة الدفع' : 'Gateway fee');
    if (k === 'REFUND') return labels.refundAmount || (isAr ? 'مبلغ الاسترداد' : 'Refund amount');
    if (k === 'REFUND_FEE') return labels.refundFee || (isAr ? 'رسوم الاسترداد' : 'Refund fee');
    if (k === 'ROUNDTRIP_SHIPPING') return labels.roundtripShipping || (isAr ? 'شحن ذهاب وعودة' : 'Round-trip shipping');
    if (k === 'ADJUDICATION_FEE') return labels.adjudicationFee || (isAr ? 'رسوم الحكم' : 'Adjudication fee');
    return labels.commissionAmount;
  };

  const isCaseFeeDoc = String(inv?.shippingBatchKey || '').startsWith('RETURNS_FEE:');
  const feePayerRaw = lineItems.find((l) => l.payer)?.payer;
  const feePayerLabel = (() => {
    const p = String(feePayerRaw || '').toUpperCase();
    if (p === 'MERCHANT') return isAr ? 'التاجر' : 'Merchant';
    if (p === 'CUSTOMER') return isAr ? 'العميل' : 'Customer';
    if (p === 'PLATFORM') return isAr ? 'المنصة' : 'Platform';
    if (p === 'SHIPPING_COMPANY') return isAr ? 'شركة الشحن' : 'Shipping company';
    return feePayerRaw || '';
  })();

  const qrValue = `https://e-tashleh.net/invoice/${inv.id}`;
  const TitleIcon =
    docType === 'PART'
      ? Package
      : docType === 'SHIPPING'
        ? Truck
        : docType === 'GATEWAY_FEE'
          ? CreditCard
          : docType === 'REFUND'
            ? RotateCcw
            : Percent;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-w-0">
      <div
        className="hidden print:flex inv-print-logo-header justify-between items-center border-b-2 border-[#b8860b] pb-6 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-xl border-2 border-gold-500 flex items-center justify-center p-2">
            <img src="/logo.png" alt="E-Tashleh" className="w-12 h-12 object-contain inv-brand-logo" />
          </div>
          <h1 className="text-3xl font-black text-[#b8860b] uppercase tracking-wider">
            E-Tashleh
          </h1>
        </div>
        <p className="text-[18px] font-black text-gray-800 uppercase tracking-widest inv-value">
          {labels.invoiceTitle}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 sm:pb-6 border-b border-white/10 inv-section">
        <div className="min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-3 mb-1">
            <img src="/logo.png" alt="E-Tashleh" className="w-9 h-9 sm:w-10 sm:h-10 object-contain inv-brand-logo shrink-0 print:hidden" />
            <h1 className="text-lg sm:text-2xl font-bold text-white inv-value">
              E-Tashleh.net
            </h1>
          </div>
          <div className="mt-3 sm:mt-4 space-y-2 text-xs sm:text-sm text-gray-300">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              <Hash className="w-4 h-4 text-gold-500 inv-icon shrink-0" />
              <span className="inv-label shrink-0">{labels.invoiceNumber}:</span>
              <span className="font-mono font-bold text-white inv-value break-all">
                {invoiceNumber}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              <Hash className="w-4 h-4 text-gold-500 inv-icon shrink-0" />
              <span className="inv-label shrink-0">{labels.orderNumber}:</span>
              <span className="font-mono font-bold text-white inv-value break-all">
                {orderNumber}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              <Hash className="w-4 h-4 text-gold-500 inv-icon shrink-0" />
              <span className="inv-label shrink-0">{labels.offerNumber}:</span>
              <span className="font-mono font-bold text-white inv-value break-all">
                {offerNumber}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              <Calendar className="w-4 h-4 text-gold-500 inv-icon shrink-0" />
              <span className="inv-label shrink-0">{labels.issueDate}:</span>
              <span className="font-mono text-white inv-value break-words">{invoiceDate}</span>
            </div>
            {inv.invoiceGroupId && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                <Hash className="w-4 h-4 text-gold-500 inv-icon shrink-0" />
                <span className="inv-label shrink-0">{labels.groupId}:</span>
                <span className="font-mono text-white/70 inv-value text-[11px]">
                  {String(inv.invoiceGroupId).slice(0, 8)}…
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gold-500/10 border border-gold-500/20 shrink-0">
          <TitleIcon className="w-5 h-5 text-gold-500" />
          <span className="text-xs font-black uppercase tracking-wider text-gold-400">
            {labels.invoiceTitle}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
        <div className="inv-section bg-white/5 rounded-xl p-3.5 sm:p-4 border border-white/10 min-w-0">
          {docType === 'COMMISSION' ? (
            <>
              <InfoRow
                icon={Building2}
                label={labels.platformCompany}
                value={platformName}
              />
              <div className="mt-3">
                <InfoRow icon={Package} label={labels.partName} value={partName} />
              </div>
              {isCaseFeeDoc && feePayerLabel ? (
                <div className="mt-3">
                  <InfoRow
                    icon={User}
                    label={labels.payer || (isAr ? 'الدافع' : 'Payer')}
                    value={feePayerLabel}
                  />
                </div>
              ) : null}
            </>
          ) : docType === 'GATEWAY_FEE' ? (
            <>
              <InfoRow
                icon={Building2}
                label={labels.platformCompany}
                value={platformName}
              />
              <div className="mt-3">
                <InfoRow icon={CreditCard} label={labels.gatewayFee || (isAr ? 'رسوم بوابة الدفع' : 'Gateway fee')} value={`${amount.toLocaleString()} ${currency}`} />
              </div>
              <div className="mt-3">
                <InfoRow icon={User} label={labels.customer} value={customerName} />
              </div>
            </>
          ) : docType === 'REFUND' ? (
            <>
              <InfoRow
                icon={Building2}
                label={labels.platformCompany}
                value={platformName}
              />
              <div className="mt-3">
                <InfoRow icon={User} label={labels.customer} value={customerName} />
              </div>
              <div className="mt-3">
                <InfoRow
                  icon={RotateCcw}
                  label={labels.refundAmount || (isAr ? 'مبلغ الاسترداد' : 'Refund amount')}
                  value={`${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}
                />
              </div>
            </>
          ) : docType === 'SHIPPING' ? (
            <>
              <InfoRow
                icon={Truck}
                label={labels.shippingCompany}
                value={carrierName || labels.shippingPending}
              />
              <div className="mt-3">
                {isCaseFeeDoc && feePayerLabel ? (
                  <InfoRow
                    icon={User}
                    label={labels.payer || (isAr ? 'الدافع' : 'Payer')}
                    value={feePayerLabel}
                  />
                ) : (
                  <InfoRow icon={User} label={labels.customer} value={customerName} />
                )}
              </div>
            </>
          ) : (
            <>
              <InfoRow icon={Package} label={labels.partName} value={partName} />
              <div className="mt-3">
                <InfoRow icon={User} label={labels.customer} value={customerName} />
              </div>
            </>
          )}
        </div>

        <div className="inv-section bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
          {docType === 'PART' && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 inv-label">{labels.partPrice}</span>
              <span className="font-mono text-white inv-value">
                {amount.toLocaleString()} {currency}
              </span>
            </div>
          )}
          {docType === 'COMMISSION' && (
            <>
              {lineItems.some((l) => l.kind) ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gold-500">
                    {labels.lineItems}
                  </p>
                  {lineItems.map((line, idx) => (
                    <div
                      key={`${line.kind || idx}`}
                      className="flex justify-between text-xs sm:text-sm gap-3"
                    >
                      <span className="text-gray-400 inv-label truncate">
                        {feeKindLabel(line.kind)}
                      </span>
                      <span className="font-mono text-white inv-value shrink-0">
                        {Number(line.amount || 0).toLocaleString()} {currency}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 inv-label">{labels.commissionAmount}</span>
                  <span className="font-mono text-white inv-value">
                    {amount.toLocaleString()} {currency}
                  </span>
                </div>
              )}
            </>
          )}
          {docType === 'GATEWAY_FEE' && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 inv-label">
                {labels.gatewayFee || (isAr ? 'رسوم بوابة الدفع' : 'Gateway fee')}
              </span>
              <span className="font-mono text-orange-300 inv-value">
                {amount.toLocaleString()} {currency}
              </span>
            </div>
          )}
          {docType === 'REFUND' && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 inv-label">
                {labels.refundAmount || (isAr ? 'مبلغ الاسترداد' : 'Refund amount')}
              </span>
              <span className="font-mono text-rose-400 inv-value">
                {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
              </span>
            </div>
          )}
          {docType === 'SHIPPING' && (
            <>
              {lineItems.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gold-500">
                    {labels.lineItems}
                  </p>
                  {lineItems.map((line, idx) => (
                    <div
                      key={`${line.paymentId || idx}`}
                      className="flex justify-between text-xs sm:text-sm gap-3"
                    >
                      <span className="text-gray-400 inv-label truncate">
                        {line.partName || feeKindLabel(line.kind) || partName}
                      </span>
                      <span className="font-mono text-white inv-value shrink-0">
                        {Number(line.amount || 0).toLocaleString()} {currency}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 inv-label">{labels.shippingRevenue}</span>
                  <span className="font-mono text-white inv-value">
                    {amount.toLocaleString()} {currency}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className={`bg-gradient-to-r ${docType === 'REFUND' ? 'from-rose-500/20 to-black/40 border-rose-500' : 'from-gold-500/20 to-black/40 border-gold-500'} rounded-xl p-6 sm:p-8 border-2 mt-8 inv-total-box flex justify-center`}>
        <div className={`text-center bg-black/40 px-6 py-4 rounded-xl border ${docType === 'REFUND' ? 'border-rose-500/30' : 'border-gold-500/30'} max-w-md w-full`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${docType === 'REFUND' ? 'text-rose-400' : 'text-gold-500'}`}>
            {labels.total}
          </p>
          <p className={`text-4xl sm:text-5xl font-black font-mono inv-total-amount ${docType === 'REFUND' ? 'text-rose-400' : 'text-gold-500'}`}>
            {(docType === 'GATEWAY_FEE' || docType === 'REFUND'
              ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : Math.round(amount).toLocaleString())}
            <span className={`text-xl sm:text-2xl font-bold ms-2 ${docType === 'REFUND' ? 'text-rose-300' : 'text-gold-400'}`}>
              {currency}
            </span>
          </p>
        </div>
      </div>

      <div className="text-center pt-8 mt-12 border-t-2 border-white/10 inv-footer">
        <div className="inline-block bg-white p-3 rounded-xl border-4 border-gold-500 mb-4">
          <QRCodeSVG value={qrValue} size={120} level="H" includeMargin={false} />
        </div>
        <div className="space-y-1.5 text-xs text-gray-500">
          <p className="inv-label font-bold text-gray-400">{labels.thankYou}</p>
          <p className="inv-label">{labels.electronicDoc}</p>
          <div className="mt-4 pt-4 border-t border-white/5 inline-block">
            <p className="text-gray-600 font-mono text-[10px] inv-label tracking-widest">
              ELLIPP FZ LLC | {isAr ? 'رخصة تجارية:' : 'L/N:'} 45000927 |{' '}
              {isAr ? 'سجل تجاري:' : 'CR:'} 0000004036902
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const InvoiceDocEmptyState: React.FC<{
  title: string;
  hint: string;
}> = ({ title, hint }) => (
  <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
    <Package size={40} className="mx-auto mb-4 text-white/20" />
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-white/50 text-sm max-w-md mx-auto">{hint}</p>
  </div>
);
