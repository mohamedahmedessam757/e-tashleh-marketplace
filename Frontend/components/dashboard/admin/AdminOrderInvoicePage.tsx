import React, { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { OrderInvoicesPanel } from '../shared/OrderInvoicesPanel';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAdminStore } from '../../../stores/useAdminStore';
import type { InvoiceDocTab } from '../shared/invoices/invoiceDocs.types';

const DOC_TAB_STORAGE_KEY = 'admin_invoice_doc_tab';

interface AdminOrderInvoicePageProps {
  orderId: string;
  onNavigate?: (path: string, id?: string) => void;
  onBack?: () => void;
}

function peekDocTab(): InvoiceDocTab | undefined {
  try {
    const raw = sessionStorage.getItem(DOC_TAB_STORAGE_KEY);
    if (
      raw === 'MASTER' ||
      raw === 'PART' ||
      raw === 'SHIPPING' ||
      raw === 'COMMISSION' ||
      raw === 'GATEWAY_FEE' ||
      raw === 'REFUND'
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export const AdminOrderInvoicePage: React.FC<AdminOrderInvoicePageProps> = ({
  orderId,
  onNavigate,
  onBack,
}) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const adminRole = useAdminStore((s) => s.currentAdmin?.role || 'ADMIN');
  const role =
    adminRole === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN'
      : adminRole === 'VERIFICATION_OFFICER'
        ? 'VERIFICATION_OFFICER'
        : adminRole === 'ACCOUNTANT'
          ? 'ACCOUNTANT'
          : adminRole === 'SUPPORT'
            ? 'SUPPORT'
            : 'ADMIN';

  // Peek (do not remove) so React Strict Mode remount still sees the tab.
  const [initialDocTab] = useState<InvoiceDocTab | undefined>(() => peekDocTab());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(DOC_TAB_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [orderId]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : onNavigate?.('invoices'))}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs font-black uppercase"
        >
          <ArrowLeft size={16} />
          {isAr ? 'رجوع للفواتير' : 'Back to invoices'}
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight truncate">
            {(t.admin as any).invoicesHub?.orderInvoiceTitle || (isAr ? 'فاتورة الطلب' : 'Order Invoice')}
          </h1>
          <p className="text-xs text-white/40 font-mono mt-1 truncate">{orderId}</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('admin-order-details', orderId)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-500 text-xs font-black uppercase hover:bg-gold-500 hover:text-black transition-all shrink-0"
        >
          <ExternalLink size={14} />
          {isAr ? 'تفاصيل الطلب' : 'Order details'}
        </button>
      </div>

      <GlassCard className="p-4 sm:p-8 bg-[#151310] border-white/5 shadow-2xl overflow-hidden">
        <OrderInvoicesPanel
          orderId={orderId}
          role={role as any}
          initialDocTab={initialDocTab}
        />
      </GlassCard>
    </div>
  );
};
