import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Clock, CheckCircle2, AlertTriangle, ArrowRight, Download, Eye, CreditCard } from 'lucide-react';
import { useBillingStore } from '../../../stores/useBillingStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useCheckoutStore } from '../../../stores/useCheckoutStore';
import { GlassCard } from '../../ui/GlassCard';
import { InvoiceModal } from './InvoiceModal';
import { SavedCards } from './SavedCards';
import { Order } from '../../../types';

interface BillingPageProps {
    onNavigate?: (path: string, id?: any) => void;
}

type TabType = 'pending' | 'history' | 'cards';

export const BillingPage: React.FC<BillingPageProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const { invoices, pendingPayments, loading, cards, fetchInvoices, fetchPendingPayments, fetchCards } = useBillingStore();
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Role detection
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const isMerchant = user?.role === 'VENDOR';

    useEffect(() => {
        fetchInvoices();
        fetchPendingPayments();
        fetchCards();

        const interval = setInterval(() => {
            fetchInvoices();
            fetchPendingPayments();
        }, 10000); // 10 seconds background refresh

        return () => clearInterval(interval);
    }, []);

    const handleViewInvoice = (invoiceBaseData: any) => {
        // Prepare order structure needed by modal
        setSelectedOrder(invoiceBaseData);
        setIsModalOpen(true);
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-8">
            {/* 1. Header Area with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className={`p-6 flex items-center gap-4 border-white/10 ${isMerchant
                    ? "bg-gradient-to-br from-blue-900/40 to-black/40 border-blue-500/30"
                    : "bg-gradient-to-br from-red-900/40 to-black/40 border-red-500/30"
                    }`}>
                    <div className={`p-3 rounded-xl ${isMerchant ? 'bg-blue-500/20' : 'bg-red-500/20'}`}>
                        <AlertTriangle className={`w-8 h-8 ${isMerchant ? 'text-blue-400' : 'text-red-400'}`} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">{t.dashboard.billing?.tabs?.pendingOffers || (language === 'ar' ? 'المدفوعات المتأخرة' : 'Pending Payments')}</p>
                        <h3 className="text-2xl font-bold text-white">{pendingPayments.length}</h3>
                    </div>
                </GlassCard>

                <GlassCard className={`p-6 flex items-center gap-4 border-white/10 ${isMerchant
                    ? "bg-gradient-to-br from-indigo-900/40 to-black/40 border-indigo-500/30"
                    : "bg-gradient-to-br from-green-900/40 to-black/40 border-green-500/30"
                    }`}>
                    <div className={`p-3 rounded-xl ${isMerchant ? 'bg-indigo-500/20' : 'bg-green-500/20'}`}>
                        <Receipt className={`w-8 h-8 ${isMerchant ? 'text-indigo-400' : 'text-green-400'}`} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">{t.dashboard.billing?.tabs?.history || (language === 'ar' ? 'سجل الفواتير' : 'Invoices')}</p>
                        <h3 className="text-2xl font-bold text-white">{invoices.length}</h3>
                    </div>
                </GlassCard>

                {!isMerchant && (
                    <GlassCard className="p-6 flex items-center gap-4 bg-gradient-to-br from-gold-900/40 to-black/40 border-gold-500/30">
                        <div className="p-3 bg-gold-500/20 rounded-xl">
                            <CreditCard className="w-8 h-8 text-gold-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">{language === 'ar' ? 'البطاقات المحفوظة' : 'Saved Cards'}</p>
                            <h3 className="text-2xl font-bold text-white max-w-[200px] leading-tight">
                                {cards.length}
                            </h3>
                        </div>
                    </GlassCard>
                )}
            </div>

            {/* 2. Tabs */}
            <div className="flex flex-wrap gap-4 border-b border-white/10 pb-1">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'pending' ? (isMerchant ? 'text-blue-400' : 'text-gold-500') : 'text-gray-400 hover:text-white'
                        }`}
                >
                    {t.dashboard.billing?.tabs?.pendingOffers || (language === 'ar' ? 'المدفوعات المتأخرة' : 'Pending Payments')} ({pendingPayments.length})
                    {activeTab === 'pending' && <motion.div layoutId="activeTabBill" className={`absolute bottom-0 left-0 right-0 h-0.5 ${isMerchant ? 'bg-blue-400' : 'bg-gold-500'}`} />}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'history' ? (isMerchant ? 'text-indigo-400' : 'text-gold-500') : 'text-gray-400 hover:text-white'
                        }`}
                >
                    {t.dashboard.billing?.tabs?.history || (language === 'ar' ? 'سجل الفواتير' : 'Invoices History')} ({invoices.length})
                    {activeTab === 'history' && <motion.div layoutId="activeTabBill" className={`absolute bottom-0 left-0 right-0 h-0.5 ${isMerchant ? 'bg-indigo-400' : 'bg-gold-500'}`} />}
                </button>
                {!isMerchant && (
                    <button
                        onClick={() => setActiveTab('cards')}
                        className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'cards' ? 'text-gold-500' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {t.dashboard.billing?.tabs?.methods || (language === 'ar' ? 'طرق الدفع المحفوظة' : 'Saved Payment Methods')}
                        {activeTab === 'cards' && <motion.div layoutId="activeTabBill" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-500" />}
                    </button>
                )}
            </div>

            {/* 3. Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="min-h-[400px]"
                >
                    {activeTab === 'cards' ? (
                        <GlassCard className="p-6">
                            <SavedCards />
                        </GlassCard>
                    ) : (
                        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <div className={`w-8 h-8 border-2 ${isMerchant ? 'border-blue-500' : 'border-gold-500'} border-t-transparent rounded-full animate-spin`}></div>
                                </div>
                            ) : (activeTab === 'pending' ? pendingPayments : invoices).length === 0 ? (
                                <GlassCard className="p-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                        <Receipt className="w-8 h-8 text-gray-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        {activeTab === 'pending'
                                            ? t.dashboard.billing?.empty?.unpaid || (language === 'ar' ? 'لا توجد مدفوعات متأخرة' : 'No pending payments')
                                            : t.dashboard.billing?.empty?.history || (language === 'ar' ? 'لا توجد فواتير سابقة' : 'No invoices history')}
                                    </h3>
                                    <p className="text-gray-400 max-w-sm">
                                        {activeTab === 'pending'
                                            ? (language === 'ar' ? 'رائع! لا يوجد أي عروض يرجى دفع ثمنها حالياً.' : 'Great! You have no pending payments at the moment.')
                                            : (language === 'ar' ? 'ستظهر فواتيرك هنا بعد إتمام عمليات الدفع.' : 'Your invoices will appear here once you complete orders.')}
                                    </p>
                                </GlassCard>
                            ) : (
                                (activeTab === 'pending' ? pendingPayments : invoices).map((itemRecord: any, index: number) => {
                                    // Item is an invoice record or order record
                                    const isInvoice = activeTab === 'history';
                                    const acceptedOffer = itemRecord.offers?.find((o: any) => o.status === 'accepted');

                                    // Get the real total amount
                                    let displayPrice = 0;
                                    if (isInvoice) {
                                        displayPrice = itemRecord.invoiceTotal || Number(acceptedOffer?.finalPrice || acceptedOffer?.price || 0);
                                    } else {
                                        displayPrice = Number(acceptedOffer?.finalPrice || acceptedOffer?.price || 0);
                                    }

                                    // Get the correct date — use ar-EG for Gregorian, NOT ar-SA (Hijri)
                                    const rawDate = isInvoice
                                        ? (itemRecord.invoiceIssuedAt || itemRecord.createdAt)
                                        : itemRecord.createdAt;
                                    const dateLabel = rawDate
                                        ? new Date(rawDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                                            year: 'numeric', month: '2-digit', day: '2-digit'
                                        })
                                        : '--';

                                    // Get part name — Order model stores partName directly
                                    const partName = itemRecord.partName
                                        || itemRecord.parts?.[0]?.name
                                        || acceptedOffer?.partName
                                        || (language === 'ar' ? 'قطعة غيار' : 'Spare Part');

                                    // Get the store name — offer.store.name (via Prisma relation)
                                    const storeName = acceptedOffer?.store?.name
                                        || acceptedOffer?.store?.storeCode
                                        || itemRecord.store?.name
                                        || itemRecord.store?.storeCode
                                        || (language === 'ar' ? 'متجر' : 'Store');

                                    // Get the store code for display
                                    const storeCode = acceptedOffer?.store?.storeCode
                                        || itemRecord.store?.storeCode
                                        || '';

                                    return (
                                        <motion.div variants={item} key={`${activeTab}-${index}-${itemRecord.id || itemRecord.invoice_number}`}>
                                            <GlassCard className={`group p-0 overflow-hidden ${isMerchant ? (activeTab === 'pending' ? 'hover:border-blue-500/50' : 'hover:border-indigo-500/50') : 'hover:border-gold-500/50'} transition-colors`}>
                                                <div className="p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
                                                    {/* Left: Info */}
                                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isMerchant
                                                                ? (activeTab === 'pending' ? 'bg-blue-500/20 text-blue-500' : 'bg-indigo-500/20 text-indigo-500')
                                                                : (activeTab === 'pending' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500')
                                                            }`}>
                                                            {activeTab === 'pending' ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-base md:text-lg font-bold text-white truncate">
                                                                {isInvoice ? (itemRecord.invoice_number || `INV-${itemRecord.orderNumber}`) : `${language === 'ar' ? 'طلب' : 'Order'} #${itemRecord.orderNumber || itemRecord.id?.toString().slice(0, 6).toUpperCase()}`}
                                                            </h4>
                                                            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-400 mt-1">
                                                                <span>{dateLabel}</span>
                                                                <span className="w-1 h-1 bg-gray-600 rounded-full hidden md:block"></span>
                                                                <span className="truncate max-w-[120px] md:max-w-[200px]">{partName}</span>
                                                                <span className="w-1 h-1 bg-gray-600 rounded-full hidden md:block"></span>
                                                                <span className="text-gold-500/70 truncate max-w-[100px] md:max-w-[150px]">{storeName}{storeCode ? ` #${storeCode}` : ''}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Middle: Amount */}
                                                    <div className="text-center md:text-right w-full md:w-auto">
                                                        <p className="text-xs text-gray-400 mb-1">{language === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}</p>
                                                        <p className="text-xl md:text-2xl font-bold text-gold-500 font-mono">
                                                            {displayPrice > 0 ? `${displayPrice.toFixed(2)} ${itemRecord.invoiceCurrency || 'AED'}` : '--'}
                                                        </p>
                                                    </div>

                                                    {/* Right: Actions */}
                                                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                                        {activeTab === 'pending' ? (
                                                            !isMerchant ? (
                                                                <button
                                                                    className="flex-1 md:flex-none px-5 md:px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                                                                    onClick={() => {
                                                                        const store = useCheckoutStore.getState();
                                                                        store.reset();
                                                                        store.setOrderId(itemRecord.id);
                                                                        onNavigate?.('checkout', itemRecord.id);
                                                                    }}
                                                                >
                                                                    {language === 'ar' ? 'دفع الآن' : 'Pay Now'}
                                                                    <ArrowRight className="w-4 h-4" />
                                                                </button>
                                                            ) : (
                                                                <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
                                                                    <span className="text-xs text-gray-400 font-medium">
                                                                        {language === 'ar' ? 'في انتظار دفع العميل' : "Waiting for customer payment"}
                                                                    </span>
                                                                </div>
                                                            )
                                                        ) : (
                                                            <button
                                                                onClick={() => handleViewInvoice(itemRecord)}
                                                                className="flex-1 md:flex-none px-5 md:px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 border border-white/10 text-sm"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                                {language === 'ar' ? 'عرض الفاتورة' : 'View Invoice'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </GlassCard>
                                        </motion.div>
                                    );
                                })
                            )}
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Modal */}
            {selectedOrder && (
                <InvoiceModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setTimeout(() => setSelectedOrder(null), 300); }}
                    order={selectedOrder}
                />
            )}
        </div>
    );
};
