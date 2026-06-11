import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Clock, CheckCircle2, AlertTriangle, ArrowRight, Eye, CreditCard, AlertOctagon } from 'lucide-react';
import { useOrdersStore } from '../../../../stores/useOrdersStore';
import { useBillingStore } from '../../../../stores/useBillingStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { InvoiceModal } from '../../wallet/InvoiceModal';
import { Order } from '../../../../types';
import { SavedCards } from '../../wallet/SavedCards';
import { useCheckoutStore } from '../../../../stores/useCheckoutStore';

interface BillingTabProps {
    onNavigate: (path: string, id?: any) => void;
}

export const BillingTab: React.FC<BillingTabProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const { orders, fetchOrders, loading: ordersLoading } = useOrdersStore();
    const { cards, fetchCards, loading: billingLoading } = useBillingStore(); // Using fetchCards to get count for stats

    const [activeTab, setActiveTab] = useState<'unpaid' | 'history' | 'overdue' | 'methods'>('unpaid');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchOrders();
        fetchCards();
    }, []);

    // Filter Logic
    const unpaidInvoices = orders.filter(o => o.status === 'AWAITING_PAYMENT');

    // Simulate Late/Overdue Logic: In real app, check due_date < now
    // For now, let's assume any UNPAID order older than 7 days is OVERDUE
    const overdueInvoices = unpaidInvoices.filter(o => {
        const created = new Date(o.createdAt).getTime();
        const now = Date.now();
        const diffDays = (now - created) / (1000 * 3600 * 24);
        return diffDays > 7;
    });

    const historyInvoices = orders.filter(o =>
        ['PREPARATION', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'RETURNED', 'DISPUTED'].includes(o.status)
    );

    const handleViewInvoice = (order: Order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariant = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const loading = ordersLoading || billingLoading;

    return (
        <motion.div key="billing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            {/* 1. Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl flex items-center gap-4 bg-purple-900/10 border border-purple-500/20">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Clock className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">{t.dashboard.billing.tabs.unpaid}</p>
                        <h3 className="text-xl font-bold text-white">{unpaidInvoices.length}</h3>
                    </div>
                </div>

                <div className="p-4 rounded-xl flex items-center gap-4 bg-red-900/10 border border-red-500/20">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                        <AlertOctagon className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Late / Overdue</p>
                        <h3 className="text-xl font-bold text-white">{overdueInvoices.length}</h3>
                    </div>
                </div>

                <div className="p-4 rounded-xl flex items-center gap-4 bg-green-900/10 border border-green-500/20">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">{t.dashboard.billing.tabs.history}</p>
                        <h3 className="text-xl font-bold text-white">{historyInvoices.length}</h3>
                    </div>
                </div>

                <div className="p-4 rounded-xl flex items-center gap-4 bg-blue-900/10 border border-blue-500/20">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <CreditCard className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">{t.dashboard.billing.wallet || 'Saved Cards'}</p>
                        <h3 className="text-xl font-bold text-white">{cards.length}</h3>
                    </div>
                </div>
            </div>

            {/* 2. Tabs */}
            <div className="flex gap-4 border-b border-white/10 pb-1 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('unpaid')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'unpaid' ? 'text-gold-500' : 'text-gray-400 hover:text-white'}`}
                >
                    {t.dashboard.billing.tabs.unpaid} ({unpaidInvoices.length})
                    {activeTab === 'unpaid' && <motion.div layoutId="activeTabBill" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-500" />}
                </button>
                <button
                    onClick={() => setActiveTab('overdue')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'overdue' ? 'text-red-500 font-bold' : 'text-gray-400 hover:text-white'}`}
                >
                    Late Payments ({overdueInvoices.length})
                    {activeTab === 'overdue' && <motion.div layoutId="activeTabBill" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'history' ? 'text-gold-500' : 'text-gray-400 hover:text-white'}`}
                >
                    {t.dashboard.billing.tabs.history}
                    {activeTab === 'history' && <motion.div layoutId="activeTabBill" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-500" />}
                </button>
                <button
                    onClick={() => setActiveTab('methods')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'methods' ? 'text-gold-500' : 'text-gray-400 hover:text-white'}`}
                >
                    {t.dashboard.billing.wallet || 'Payment Methods'}
                    {activeTab === 'methods' && <motion.div layoutId="activeTabBill" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-500" />}
                </button>
            </div>

            {/* 3. Content */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                key={activeTab}
                className="space-y-4 min-h-[400px]"
            >
                {activeTab === 'methods' ? (
                    <SavedCards />
                ) : (
                    // Invoices List (Unpaid / History / Overdue)
                    loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        (activeTab === 'unpaid' ? unpaidInvoices : activeTab === 'overdue' ? overdueInvoices : historyInvoices).length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-center border border-white/5 rounded-xl bg-white/5">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                    <Receipt className="w-8 h-8 text-gray-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    {activeTab === 'overdue'
                                        ? 'No overdue payments'
                                        : activeTab === 'unpaid'
                                            ? t.dashboard.billing.empty.unpaid
                                            : t.dashboard.billing.empty.history}
                                </h3>
                                <p className="text-gray-400 max-w-sm">
                                    {activeTab === 'overdue'
                                        ? 'Good job! You have no late payments.'
                                        : activeTab === 'unpaid'
                                            ? 'Great! You have no pending payments.'
                                            : 'Your payment history is empty.'}
                                </p>
                            </div>
                        ) : (
                            (activeTab === 'unpaid' ? unpaidInvoices : activeTab === 'overdue' ? overdueInvoices : historyInvoices).map((order) => {
                                const acceptedOffer = order.offers?.find(o => o.status === 'accepted');
                                const price = acceptedOffer?.finalPrice || order.totalAmount || 0;
                                const date = new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
                                const isOverdue = overdueInvoices.includes(order);

                                return (
                                    <motion.div variants={itemVariant} key={order.id}>
                                        <div className={`group p-0 overflow-hidden hover:border-gold-500/50 transition-colors border rounded-xl bg-[#151310] ${isOverdue ? 'border-red-500/50' : 'border-white/10'}`}>
                                            <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                                {/* Left: Info */}
                                                <div className="flex items-center gap-4 w-full md:w-auto">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-red-500/20 text-red-500' :
                                                        activeTab === 'unpaid' ? 'bg-yellow-500/20 text-yellow-500' :
                                                            'bg-green-500/20 text-green-500'
                                                        }`}>
                                                        {isOverdue ? <AlertOctagon className="w-6 h-6" /> :
                                                            activeTab === 'unpaid' ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                                            INV-{order.orderNumber}
                                                            {isOverdue && <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full">OVERDUE</span>}
                                                        </h4>
                                                        <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                                                            <span>{date}</span>
                                                            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                                            <span>{order.partName || 'Unknown Part'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Middle: Amount */}
                                                <div className="text-center md:text-right w-full md:w-auto">
                                                    <p className="text-sm text-gray-400 mb-1">{t.dashboard.billing.invoice.amount}</p>
                                                    <p className="text-2xl font-bold text-gold-500 font-mono">
                                                        {Number(price) > 0 ? Number(price).toFixed(2) : '--'}
                                                    </p>
                                                </div>

                                                {/* Right: Actions */}
                                                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                                    {activeTab === 'unpaid' || activeTab === 'overdue' ? (
                                                        <button
                                                            className={`flex-1 md:flex-none px-6 py-2.5 text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${isOverdue ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-gold-500 hover:bg-gold-600'
                                                                }`}
                                                            onClick={() => {
                                                                const store = useCheckoutStore.getState();
                                                                store.reset();
                                                                store.setOrderId(order.id);
                                                                onNavigate?.('checkout', order.id);
                                                            }}
                                                        >
                                                            {t.dashboard.billing.invoice.pay}
                                                            <ArrowRight className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleViewInvoice(order)}
                                                            className="flex-1 md:flex-none px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 border border-white/10"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            {t.dashboard.billing.invoice.view}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )
                    )
                )}
            </motion.div>

            {/* Invoice Modal */}
            <InvoiceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                order={selectedOrder}
            />
        </motion.div>
    );
};
