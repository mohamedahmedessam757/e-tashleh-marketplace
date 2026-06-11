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
} from 'lucide-react';
import { Badge } from '../../../ui/Badge';
import {
  asImageUrls,
  CUSTOMER_ORDER_STATUS_LABEL,
  getCustomerReferenceImages,
  isMultiPartOrder,
  resolveMerchantStore,
  taskHasFieldOfficerReport,
  VERIFICATION_TASK_DECISION_LABEL,
} from './verificationTaskHelpers';
import { VerificationImageGrid } from './VerificationImageGrid';
import { VerificationVideoPlayer } from './VerificationVideoPlayer';
import { OrderInvoicesPanel } from '../../shared/OrderInvoicesPanel';

type InvoicePanelRole = 'ADMIN' | 'SUPER_ADMIN' | 'MERCHANT' | 'CUSTOMER' | 'VERIFICATION_OFFICER';

function resolveOrderInvoicesPanelRole(viewerRole: string | null | undefined): InvoicePanelRole {
  const r = viewerRole || '';
  if (
    r === 'ADMIN' ||
    r === 'SUPER_ADMIN' ||
    r === 'MERCHANT' ||
    r === 'CUSTOMER' ||
    r === 'VERIFICATION_OFFICER'
  ) {
    return r;
  }
  return 'CUSTOMER';
}

interface VerificationOrderSummaryProps {
  isAr: boolean;
  order: any;
  task: any;
  /** Current user role (drives invoice layout: admin vs customer vs merchant — same as OrderDetails). */
  viewerRole?: string | null;
}

function InfoTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
      <span className="text-[10px] text-white/40 uppercase tracking-widest flex items-center gap-1">
        <Icon size={12} />
        {label}
      </span>
      <p className="text-sm font-bold text-white mt-1">{value || '—'}</p>
      {sub && <p className="text-[11px] text-white/45 mt-0.5 line-clamp-2">{sub}</p>}
    </div>
  );
}

export const VerificationOrderSummary: React.FC<VerificationOrderSummaryProps> = ({
  isAr,
  order,
  task,
  viewerRole,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'invoices'>('summary');

  if (!order) return null;

  const doc = order.verificationDocuments?.[0];
  const invoices = Array.isArray(order.invoices) ? order.invoices : [];
  const merchantStore = resolveMerchantStore(order, doc);
  const multiPart = isMultiPartOrder(order);
  const aggregatedCustomerImages = multiPart ? getCustomerReferenceImages(order) : [];
  const storeImages = doc ? asImageUrls(doc.images) : [];
  const locale = isAr ? 'ar-EG' : 'en-US';
  const statusLabel = CUSTOMER_ORDER_STATUS_LABEL[order.status];
  const invoicePanelRole = resolveOrderInvoicesPanelRole(viewerRole);

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
            {invoices.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]">{invoices.length}</span>
            )}
          </button>
        </div>

        {activeTab === 'summary' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoTile
              icon={Store}
              label={isAr ? 'المتجر' : 'Store'}
              value={merchantStore?.name ?? '—'}
              sub={merchantStore?.storeCode ? `#${merchantStore.storeCode}` : undefined}
            />
            <InfoTile
              icon={User}
              label={isAr ? 'العميل' : 'Customer'}
              value={order.customer?.name ?? '—'}
              sub={[order.customer?.phone, order.customer?.email].filter(Boolean).join(' · ')}
            />
            <InfoTile
              icon={Car}
              label={isAr ? 'المركبة' : 'Vehicle'}
              value={`${order.vehicleMake} ${order.vehicleModel} (${order.vehicleYear})`}
              sub={order.vin ? `VIN: ${order.vin}` : undefined}
            />
            <InfoTile
              icon={Package}
              label={isAr ? 'القطعة' : 'Part'}
              value={order.partName}
              sub={order.partDescription}
            />
            {order.acceptedOffer && (
              <InfoTile
                icon={FileText}
                label={isAr ? 'العرض المقبول' : 'Accepted offer'}
                value={`#${order.acceptedOffer.offerNumber}`}
                sub={[order.acceptedOffer.condition, order.acceptedOffer.partType].filter(Boolean).join(' · ')}
              />
            )}
            {invoices[0] && (
              <InfoTile
                icon={Receipt}
                label={isAr ? 'آخر فاتورة' : 'Latest invoice'}
                value={`#${invoices[0].invoiceNumber}`}
                sub={`${Number(invoices[0].total).toLocaleString(locale, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ${invoices[0].currency || 'AED'} · ${invoices[0].status}`}
              />
            )}
          </div>
        ) : (
          <OrderInvoicesPanel orderId={order.id} role={invoicePanelRole} initialData={invoices} />
        )}
      </GlassCard>

      {(order.parts?.length ?? 0) > 0 && (
        <GlassCard className="p-6 bg-[#1A1814]/80">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Package size={18} className="text-gold-500" />
            {multiPart
              ? isAr
                ? 'تفاصيل القطع (طلب مجمّع)'
                : 'Parts breakdown (multi-part)'
              : isAr
                ? 'تفاصيل القطعة'
                : 'Part details'}
          </h3>
          <div className="space-y-4">
            {order.parts.map((part: any) => (
              <div key={part.id} className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="font-bold text-white text-sm">{part.name}</p>
                {part.description && <p className="text-xs text-white/50 mt-1">{part.description}</p>}
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
        </GlassCard>
      )}

      {multiPart && aggregatedCustomerImages.length > 0 && (
        <GlassCard className="p-6 bg-[#1A1814]/80">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <User size={18} className="text-blue-400" />
            {isAr ? 'صور طلب العميل (طلب مجمّع)' : 'Customer images (multi-part order)'}
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
          <VerificationImageGrid images={storeImages} emptyLabel={isAr ? 'لا صور' : 'No images'} columns={4} />
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {doc.recipientName && (
              <p className="text-white/60">
                <PenLine size={12} className="inline mr-1" />
                {isAr ? 'المستلم:' : 'Recipient:'} <span className="text-white">{doc.recipientName}</span>
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
              <p className="text-[10px] text-white/40 mb-2">{isAr ? 'توقيع المندوب' : 'Courier signature'}</p>
              <img src={doc.recipientSignature} alt="signature" className="max-h-20 object-contain" />
            </div>
          )}
          {doc.videoUrl && <VerificationVideoPlayer src={doc.videoUrl} isAr={isAr} />}
        </GlassCard>
      )}
    </div>
  );
};
