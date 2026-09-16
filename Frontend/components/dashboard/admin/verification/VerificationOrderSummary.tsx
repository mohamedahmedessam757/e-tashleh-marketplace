import React, { useState } from 'react';
import { GlassCard } from '../../../ui/GlassCard';
import {
  Package,
  Car,
  User,
  Store,
  FileText,
  Receipt,
  PenLine,
  LayoutGrid,
  MessageCircle,
} from 'lucide-react';
import { Badge } from '../../../ui/Badge';
import {
  asImageUrls,
  CUSTOMER_ORDER_STATUS_LABEL,
  getActiveVerificationParts,
  getCustomerReferenceImages,
  isMultiPartOrder,
  resolveMerchantStore,
  taskHasFieldOfficerReport,
  VERIFICATION_TASK_DECISION_LABEL,
} from './verificationTaskHelpers';
import {
  filterMasterInvoices,
  resolveStoreOwnerContact,
  shouldUsePartyInvoicesOnVerificationPage,
  toWhatsAppHref,
} from './verificationContactUtils';
import { VerificationImageGrid } from './VerificationImageGrid';
import { VerificationVideoPlayer } from './VerificationVideoPlayer';
import { OrderInvoicesPanel } from '../../shared/OrderInvoicesPanel';

type InvoiceAudience = 'customer' | 'merchant';

interface VerificationOrderSummaryProps {
  isAr: boolean;
  order: any;
  task: any;
  /** Current user role (kept for callers; matching page always uses party invoices). */
  viewerRole?: string | null;
}

function InfoTile({
  icon: Icon,
  label,
  value,
  sub,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
      <span className="text-[10px] text-white/40 uppercase tracking-widest flex items-center gap-1">
        <Icon size={12} />
        {label}
      </span>
      <p className="text-sm font-bold text-white mt-1 break-words">{value || '—'}</p>
      {sub && <p className="text-[11px] text-white/45 mt-0.5 break-words">{sub}</p>}
      {children}
    </div>
  );
}

function WhatsAppLink({
  href,
  ariaLabel,
}: {
  href: string;
  ariaLabel: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold hover:bg-emerald-500/25 transition-colors"
    >
      <MessageCircle size={14} />
      WhatsApp
    </a>
  );
}

export const VerificationOrderSummary: React.FC<VerificationOrderSummaryProps> = ({
  isAr,
  order,
  task,
  viewerRole,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'invoices'>('summary');
  const [invoiceAudience, setInvoiceAudience] = useState<InvoiceAudience>('customer');

  if (!order) return null;

  // Matching page: always customer|merchant party invoices (never typed admin tabs).
  const usePartyInvoices = shouldUsePartyInvoicesOnVerificationPage(viewerRole);

  const doc =
    task?.merchantVerificationDoc ??
    (task?.offerId
      ? order.verificationDocuments?.find((d: any) => d.offerId === task.offerId)
      : null) ??
    order.verificationDocuments?.[0];
  const invoices = Array.isArray(order.invoices) ? order.invoices : [];
  const masterInvoices = filterMasterInvoices(invoices);
  const invoiceBadgeCount = usePartyInvoices ? masterInvoices.length : invoices.length;
  const merchantStore = resolveMerchantStore(order, doc);
  const storeContact = resolveStoreOwnerContact(order.store, doc?.store ?? merchantStore);
  const multiPart = isMultiPartOrder(order);
  const activeParts = getActiveVerificationParts(order);
  const aggregatedCustomerImages = multiPart ? getCustomerReferenceImages(order) : [];
  const storeImages = doc ? asImageUrls(doc.images) : [];
  const locale = isAr ? 'ar-EG' : 'en-US';
  const statusLabel = CUSTOMER_ORDER_STATUS_LABEL[order.status];

  const customerWa = toWhatsAppHref(order.customer?.phone, order.customer?.countryCode);
  const storePhone = storeContact.phone;
  const storeEmail = storeContact.email;
  const storeWa = toWhatsAppHref(storePhone, storeContact.countryCode);
  const storeSubParts = [
    merchantStore?.storeCode ? `#${merchantStore.storeCode}` : null,
    storePhone,
    storeEmail,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <GlassCard className="p-6 bg-[#1A1814]/80 border-gold-500/20">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
              {isAr ? 'رقم الطلب' : 'Order number'}
            </p>
            <p className="text-2xl font-mono font-bold text-gold-400">#{order.orderNumber}</p>
            <p className="text-xs text-white/50 mt-1">
              {isAr ? 'دورة المطابقة' : 'Cycle'}: {task.cycleNumber ?? 1}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge status={task.status} />
            {taskHasFieldOfficerReport(task) && task.decision && (
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                  task.decision === 'NON_MATCHING'
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-green-500/10 text-green-400 border-green-500/30'
                }`}
              >
                {isAr ? 'قرار الميدان:' : 'Field:'}{' '}
                {isAr
                  ? VERIFICATION_TASK_DECISION_LABEL[task.decision]?.ar || task.decision
                  : VERIFICATION_TASK_DECISION_LABEL[task.decision]?.en || task.decision}
              </span>
            )}
            {statusLabel && (
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-white/70">
                {isAr ? 'حالة العميل:' : 'Customer:'} {isAr ? statusLabel.ar : statusLabel.en}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'summary'
                ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
                : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
            }`}
          >
            <LayoutGrid size={14} />
            {isAr ? 'ملخص الطلب' : 'Order summary'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'invoices'
                ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
                : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
            }`}
          >
            <Receipt size={14} />
            {isAr ? 'الفواتير' : 'Invoices'}
            {invoiceBadgeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]">{invoiceBadgeCount}</span>
            )}
          </button>
        </div>

        {activeTab === 'summary' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoTile
              icon={Store}
              label={isAr ? 'المتجر' : 'Store'}
              value={merchantStore?.name ?? '—'}
              sub={storeSubParts.length ? storeSubParts.join(' · ') : undefined}
            >
              {storeWa && (
                <WhatsAppLink
                  href={storeWa}
                  ariaLabel={isAr ? 'فتح واتساب المتجر' : 'Open store WhatsApp'}
                />
              )}
              {storeEmail && !storeSubParts.includes(storeEmail) && (
                <a
                  href={`mailto:${storeEmail}`}
                  className="block mt-1.5 text-[11px] text-sky-400/90 hover:text-sky-300 break-all"
                >
                  {storeEmail}
                </a>
              )}
              {storeEmail && storeSubParts.includes(storeEmail) && (
                <a
                  href={`mailto:${storeEmail}`}
                  className="inline-flex mt-2 text-[11px] text-sky-400/90 hover:text-sky-300 break-all"
                >
                  {isAr ? 'إرسال بريد' : 'Email store'}
                </a>
              )}
            </InfoTile>
            <InfoTile
              icon={User}
              label={isAr ? 'العميل' : 'Customer'}
              value={order.customer?.name ?? '—'}
              sub={[order.customer?.phone, order.customer?.email].filter(Boolean).join(' · ')}
            >
              {customerWa && (
                <WhatsAppLink
                  href={customerWa}
                  ariaLabel={isAr ? 'فتح واتساب العميل' : 'Open customer WhatsApp'}
                />
              )}
            </InfoTile>
            <InfoTile
              icon={Car}
              label={isAr ? 'المركبة' : 'Vehicle'}
              value={`${order.vehicleMake} ${order.vehicleModel} (${order.vehicleYear})`}
              sub={order.vin ? `VIN: ${order.vin}` : undefined}
            />
            <InfoTile
              icon={Package}
              label={isAr ? 'القطعة' : 'Part'}
              value={task?.partLabel || order.partName}
              sub={order.partDescription}
            />
            {order.acceptedOffer && (
              <InfoTile
                icon={FileText}
                label={isAr ? 'العرض المقبول' : 'Accepted offer'}
                value={`#${order.acceptedOffer.offerNumber}`}
                sub={[order.acceptedOffer.condition, order.acceptedOffer.partType]
                  .filter(Boolean)
                  .join(' · ')}
              />
            )}
            {masterInvoices[0] && (
              <InfoTile
                icon={Receipt}
                label={isAr ? 'آخر فاتورة' : 'Latest invoice'}
                value={`#${masterInvoices[0].invoiceNumber}`}
                sub={`${Number(masterInvoices[0].total).toLocaleString(locale, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ${masterInvoices[0].currency || 'AED'} · ${masterInvoices[0].status}`}
              />
            )}
          </div>
        ) : (
          <div className="space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setInvoiceAudience('customer')}
                className={`w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${
                  invoiceAudience === 'customer'
                    ? 'bg-gold-500 text-black border-gold-500'
                    : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:border-gold-500/40'
                }`}
              >
                {isAr ? 'فاتورة العميل' : 'Customer invoice'}
              </button>
              <button
                type="button"
                onClick={() => setInvoiceAudience('merchant')}
                className={`w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${
                  invoiceAudience === 'merchant'
                    ? 'bg-gold-500 text-black border-gold-500'
                    : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:border-gold-500/40'
                }`}
              >
                {isAr ? 'فاتورة التاجر' : 'Merchant invoice'}
              </button>
            </div>
            <OrderInvoicesPanel
              key={`party-${invoiceAudience}`}
              orderId={order.id}
              role={invoiceAudience === 'customer' ? 'CUSTOMER' : 'MERCHANT'}
              initialData={masterInvoices}
              partyInvoicesOnly
            />
          </div>
        )}
      </GlassCard>

      {(order.parts?.length ?? 0) > 0 && (
        <GlassCard className="p-6 bg-[#1A1814]/80">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Package size={18} className="text-gold-500" />
            {multiPart
              ? isAr
                ? 'تفاصيل القطع النشطة (طلب مجمّع)'
                : 'Active parts (multi-part)'
              : isAr
                ? 'تفاصيل القطعة'
                : 'Part details'}
          </h3>
          {activeParts.length === 0 ? (
            <p className="text-sm text-white/50 py-4 text-center">
              {isAr ? 'لا توجد قطع نشطة للمطابقة' : 'No active parts for verification'}
            </p>
          ) : (
            <div className="space-y-4">
              {activeParts.map((part: any) => (
                <div key={part.id} className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="font-bold text-white text-sm">{part.name}</p>
                  {part.description && (
                    <p className="text-xs text-white/50 mt-1">{part.description}</p>
                  )}
                  {part.notes && (
                    <p className="text-xs text-white/40 mt-1">
                      {isAr ? 'ملاحظات:' : 'Notes:'} {part.notes}
                    </p>
                  )}
                  <div className="mt-3">
                    <VerificationImageGrid
                      images={asImageUrls(part.images)}
                      emptyLabel={isAr ? 'بدون صور' : 'No images'}
                      columns={4}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {multiPart && aggregatedCustomerImages.length > 0 && (
        <GlassCard className="p-6 bg-[#1A1814]/80">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <User size={18} className="text-blue-400" />
            {isAr ? 'صور طلب العميل (قطع نشطة)' : 'Customer images (active parts)'}
          </h3>
          <VerificationImageGrid images={aggregatedCustomerImages} emptyLabel="" columns={4} />
        </GlassCard>
      )}

      {doc && (
        <GlassCard className="p-6 bg-[#1A1814]/80">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Store size={18} className="text-amber-400" />
            {isAr ? 'توثيق المتجر وتسليم المندوب' : 'Store verification & handover'}
          </h3>
          {doc.description && <p className="text-sm text-white/60 mb-3">{doc.description}</p>}
          <VerificationImageGrid
            images={storeImages}
            emptyLabel={isAr ? 'لا صور' : 'No images'}
            columns={4}
          />
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {doc.recipientName && (
              <p className="text-white/60">
                <PenLine size={12} className="inline mr-1" />
                {isAr ? 'المستلم:' : 'Recipient:'}{' '}
                <span className="text-white">{doc.recipientName}</span>
              </p>
            )}
            {doc.handoverDate && (
              <p className="text-white/60">
                {isAr ? 'تاريخ التسليم:' : 'Handover:'}{' '}
                <span className="text-white">
                  {new Date(doc.handoverDate).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}
                  {doc.handoverTime ? ` ${doc.handoverTime}` : ''}
                </span>
              </p>
            )}
          </div>
          {doc.recipientSignature && (
            <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10 max-w-xs">
              <p className="text-[10px] text-white/40 mb-2">
                {isAr ? 'توقيع المندوب' : 'Courier signature'}
              </p>
              <img src={doc.recipientSignature} alt="signature" className="max-h-20 object-contain" />
            </div>
          )}
          {doc.videoUrl && <VerificationVideoPlayer src={doc.videoUrl} isAr={isAr} />}
        </GlassCard>
      )}
    </div>
  );
};
