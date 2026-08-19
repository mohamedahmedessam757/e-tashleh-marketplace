import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Eye, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AdminSearchInput } from './AdminSearchInput';
import { AdminFinancialDataTable } from './AdminFinancialDataTable';
import { useFinancialTableRealtime } from '../../../hooks/useFinancialTableRealtime';
import { BlurredSection } from './BlurredSection';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { invoiceTypeBadgeClass } from '../shared/invoices/invoiceDocs.types';

type InvoiceTab = 'customers' | 'stores';
type InvoiceTypeFilter = 'ALL' | 'MASTER' | 'PART' | 'SHIPPING' | 'COMMISSION';

const DOC_TAB_STORAGE_KEY = 'admin_invoice_doc_tab';

interface AdminInvoicesHubProps {
  onNavigate?: (path: string, id?: string) => void;
}

export const AdminInvoicesHub: React.FC<AdminInvoicesHubProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const hub = (t.admin as any).invoicesHub || {};
  const [tab, setTab] = useState<InvoiceTab>('customers');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [invoiceType, setInvoiceType] = useState<InvoiceTypeFilter>('ALL');
  const isSectionBlurred = useAdminPermissionsStore((s) => s.isSectionBlurred);

  const adminCustomerInvoices = useAdminStore((s) => s.adminCustomerInvoices);
  const adminStoreInvoices = useAdminStore((s) => s.adminStoreInvoices);
  const adminCustomerInvoicesMeta = useAdminStore((s) => s.adminCustomerInvoicesMeta);
  const adminStoreInvoicesMeta = useAdminStore((s) => s.adminStoreInvoicesMeta);
  const isLoadingCustomerInvoices = useAdminStore((s) => s.isLoadingCustomerInvoices);
  const isLoadingStoreInvoices = useAdminStore((s) => s.isLoadingStoreInvoices);
  const fetchAdminCustomerInvoices = useAdminStore((s) => s.fetchAdminCustomerInvoices);
  const fetchAdminStoreInvoices = useAdminStore((s) => s.fetchAdminStoreInvoices);

  const refetch = useCallback(() => {
    const typeParam = invoiceType === 'ALL' ? undefined : invoiceType;
    if (tab === 'customers') {
      fetchAdminCustomerInvoices({ search, entityType: 'customer', page, invoiceType: typeParam });
    } else {
      fetchAdminStoreInvoices({ search, entityType: 'store', page, invoiceType: typeParam });
    }
  }, [tab, search, page, invoiceType, fetchAdminCustomerInvoices, fetchAdminStoreInvoices]);

  useEffect(() => {
    setPage(1);
  }, [tab, search, invoiceType]);

  useEffect(() => {
    const timer = setTimeout(refetch, 350);
    return () => clearTimeout(timer);
  }, [refetch]);

  useFinancialTableRealtime(refetch, ['invoices', 'payment_transactions']);

  const rows = tab === 'customers' ? adminCustomerInvoices : adminStoreInvoices;
  const meta = tab === 'customers' ? adminCustomerInvoicesMeta : adminStoreInvoicesMeta;
  const isLoading = tab === 'customers' ? isLoadingCustomerInvoices : isLoadingStoreInvoices;
  const totalPages = meta?.totalPages ?? 1;

  const searchPlaceholder =
    tab === 'customers'
      ? hub.searchCustomers || (isAr ? 'بحث العملاء: الاسم / الإيميل / الهاتف / ID' : 'Search customers: name / email / phone / ID')
      : hub.searchStores || (isAr ? 'بحث المتاجر: الاسم / الإيميل / الهاتف / ID' : 'Search stores: name / email / phone / ID');

  const typeLabel = (type?: string) => {
    const tpe = String(type || 'MASTER').toUpperCase();
    if (tpe === 'PART') return hub.typePart || (isAr ? 'قطعة' : 'Part');
    if (tpe === 'SHIPPING') return hub.typeShipping || (isAr ? 'شحن' : 'Shipping');
    if (tpe === 'COMMISSION') return hub.typeCommission || (isAr ? 'عمولة' : 'Commission');
    return hub.typeMaster || (isAr ? 'شاملة' : 'Master');
  };

  const openInvoice = (orderId: string, type?: string) => {
    try {
      const tabType = String(type || 'MASTER').toUpperCase();
      sessionStorage.setItem(DOC_TAB_STORAGE_KEY, tabType);
    } catch {
      /* ignore */
    }
    onNavigate?.('admin-order-invoice', orderId);
  };

  const typeFilters: { id: InvoiceTypeFilter; label: string }[] = [
    { id: 'ALL', label: hub.filterAll || (isAr ? 'الكل' : 'All') },
    { id: 'MASTER', label: hub.filterMaster || (isAr ? 'شاملة' : 'Master') },
    { id: 'PART', label: hub.filterPart || (isAr ? 'قطعة' : 'Part') },
    { id: 'SHIPPING', label: hub.filterShipping || (isAr ? 'شحن' : 'Shipping') },
    { id: 'COMMISSION', label: hub.filterCommission || (isAr ? 'عمولة' : 'Commission') },
  ];

  const columns = useMemo(() => {
    const entityCol =
      tab === 'customers'
        ? {
            key: 'customerName',
            header: hub.customer || (isAr ? 'العميل' : 'Customer'),
            render: (r: any) => (
              <BlurredSection isBlurred={isSectionBlurred('customer_name')}>
                <button
                  type="button"
                  className="text-white hover:text-gold-400 underline-offset-2 hover:underline text-sm font-black"
                  onClick={() => r.customerId && onNavigate?.('customer-profile', r.customerId)}
                >
                  {r.customerName || r.customer || '—'}
                </button>
              </BlurredSection>
            ),
            sticky: true,
          }
        : {
            key: 'storeName',
            header: hub.store || (isAr ? 'المتجر' : 'Store'),
            render: (r: any) => (
              <button
                type="button"
                className="text-white hover:text-gold-400 underline-offset-2 hover:underline text-sm font-black"
                onClick={() => r.storeId && onNavigate?.('store-profile', r.storeId)}
              >
                {r.storeName || r.store || '—'}
              </button>
            ),
            sticky: true,
          };

    return [
      {
        key: 'invoiceNumber',
        header: hub.invoiceNumber || (isAr ? 'رقم الفاتورة' : 'Invoice #'),
        render: (r: any) => (
          <span className="font-mono text-gold-500">{r.invoiceNumber || r.id?.slice(-8)}</span>
        ),
      },
      {
        key: 'invoiceType',
        header: hub.type || (isAr ? 'النوع' : 'Type'),
        render: (r: any) => (
          <span
            className={`inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wide ${invoiceTypeBadgeClass(r.invoiceType)}`}
          >
            {typeLabel(r.invoiceType)}
          </span>
        ),
      },
      {
        key: 'orderNumber',
        header: hub.orderNumber || (isAr ? 'رقم الطلب' : 'Order #'),
        render: (r: any) => r.orderNumber || '—',
      },
      entityCol,
      {
        key: 'email',
        header: hub.email || (isAr ? 'البريد' : 'Email'),
        render: (r: any) => (
          <BlurredSection isBlurred={isSectionBlurred('customer_name')}>
            <span className="text-white/50 text-[11px]">
              {tab === 'customers' ? r.customerEmail || '—' : r.storeEmail || '—'}
            </span>
          </BlurredSection>
        ),
      },
      {
        key: 'phone',
        header: hub.phone || (isAr ? 'الهاتف' : 'Phone'),
        render: (r: any) => (
          <BlurredSection isBlurred={isSectionBlurred('customer_name')}>
            <span className="text-white/50 text-[11px] font-mono">
              {tab === 'customers' ? r.customerPhone || '—' : r.storePhone || '—'}
            </span>
          </BlurredSection>
        ),
      },
      {
        key: 'total',
        header: hub.total || (isAr ? 'الإجمالي' : 'Total'),
        render: (r: any) => (
          <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
            <span className="font-mono font-black text-white">
              {Number(r.total || 0).toLocaleString()} {r.currency || 'AED'}
            </span>
          </BlurredSection>
        ),
      },
      {
        key: 'paymentStatus',
        header: hub.paymentStatus || (isAr ? 'حالة الدفع' : 'Payment'),
        render: (r: any) => {
          const status = String(r.paymentStatus || r.invoiceStatus || '').toUpperCase();
          const label =
            hub.paymentStatusLabels?.[status] ||
            r.paymentStatus ||
            r.invoiceStatus ||
            '—';
          const tone =
            status === 'REFUNDED'
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              : status === 'SUCCESS' || status === 'PAID'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-white/5 text-white/50 border-white/10';
          return (
            <span className={`inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wide ${tone}`}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'issuedAt',
        header: hub.issuedAt || (isAr ? 'تاريخ الإصدار' : 'Issued'),
        render: (r: any) =>
          r.issuedAt
            ? new Date(r.issuedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')
            : '—',
      },
      {
        key: 'actions',
        header: hub.actions || (isAr ? 'إجراءات' : 'Actions'),
        render: (r: any) => (
          <button
            type="button"
            onClick={() => r.orderId && openInvoice(r.orderId, r.invoiceType)}
            className="p-2 rounded-xl bg-white/5 hover:bg-gold-500 hover:text-black border border-white/10 transition-all"
            title={hub.view || (isAr ? 'عرض' : 'View')}
          >
            <Eye size={16} />
          </button>
        ),
      },
    ];
  }, [tab, isAr, hub, isSectionBlurred, onNavigate]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 bg-gold-500 rounded-2xl flex items-center justify-center shrink-0">
          <FileText className="text-black" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white uppercase">{hub.title || (isAr ? 'الفوترة' : 'Billing')}</h1>
          <p className="text-xs text-white/40">{hub.subtitle || (isAr ? 'فواتير العملاء والمتاجر' : 'Customer & merchant invoices')}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="flex gap-2 p-1.5 bg-[#1A1814] border border-white/5 rounded-2xl w-fit">
          {(['customers', 'stores'] as InvoiceTab[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                tab === id ? 'bg-gold-500 text-black' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {id === 'customers'
                ? hub.tabCustomers || (isAr ? 'عملاء' : 'Customers')
                : hub.tabStores || (isAr ? 'متاجر' : 'Merchants')}
            </button>
          ))}
        </div>
        <AdminSearchInput
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          className="w-full lg:w-96"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {typeFilters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setInvoiceType(f.id)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
              invoiceType === f.id
                ? 'bg-gold-500 text-black border-gold-500'
                : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <GlassCard className="p-0 overflow-hidden bg-black/20 border-white/5 shadow-2xl">
        <AdminFinancialDataTable
          columns={columns as any}
          rows={rows as any[]}
          rowKey={(r: any) => r.id}
          isLoading={isLoading}
          emptyMessage={hub.empty || (isAr ? 'لا توجد فواتير' : 'No invoices found')}
          loadingMessage={t.admin.billing.ledger.table.scanning}
        />
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
            <span className="text-[10px] font-black text-white/30 uppercase">
              {isAr ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
