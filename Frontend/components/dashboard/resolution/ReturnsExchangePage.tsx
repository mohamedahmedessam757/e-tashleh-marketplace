import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { Badge, StatusType } from '../../ui/Badge';
import { RefreshCw, RotateCcw, AlertTriangle, ChevronRight, ChevronLeft, Box, FileText, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useReturnsStore } from '../../../stores/useReturnsStore';
import { ReturnRequestModal } from './ReturnRequestModal';
import { DisputeModal } from './DisputeModal';
import { ShippingPaymentCard } from './ShippingPaymentCard';

interface ReturnsExchangePageProps {
    onNavigate: (path: string) => void;
}

export const ReturnsExchangePage: React.FC<ReturnsExchangePageProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const { returns, disputes, loading, fetchReturnsAndDisputes, cancelReturn } = useReturnsStore();
    const [activeTab, setActiveTab] = useState<'returns' | 'disputes' | 'guidelines'>('returns');

    // Modal State
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [disputeModalOpen, setDisputeModalOpen] = useState(false);

    useEffect(() => {
        fetchReturnsAndDisputes();
    }, [fetchReturnsAndDisputes]);

    const ArrowIcon = language === 'ar' ? ChevronLeft : ChevronRight;

    return (
        <div className="space-y-8">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t.dashboard.menu.returns}</h1>
                    <p className="text-white/50">{t.dashboard.returns.subtitle}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setReturnModalOpen(true)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-cyan-600/20"
                    >
                        <RotateCcw size={18} />
                        {language === 'ar' ? 'تقديم طلب إرجاع' : 'Request Return'}
                    </button>
                    <button
                        onClick={() => setDisputeModalOpen(true)}
                        className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-600/20"
                    >
                        <AlertTriangle size={18} />
                        {language === 'ar' ? 'فتح نزاع جديد' : 'Open Dispute'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('returns')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'returns'
                        ? 'bg-gold-500 text-black font-bold'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <RotateCcw size={18} />
                    {t.dashboard.returns.tabs.activeReturns}
                    {returns.length > 0 && (
                        <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs">
                            {returns.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('disputes')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'disputes'
                        ? 'bg-red-500 text-white font-bold'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <AlertTriangle size={18} />
                    {t.dashboard.returns.tabs.disputes}
                    {disputes.length > 0 && (
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                            {disputes.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('guidelines')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'guidelines'
                        ? 'bg-blue-500 text-white font-bold'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <FileText size={18} />
                    {t.dashboard.returns.tabs.guidelines}
                </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <div className="text-center py-20">
                        <RefreshCw className="animate-spin mx-auto text-gold-500 mb-4" size={32} />
                        <p className="text-white/50">Loading...</p>
                    </div>
                ) : activeTab === 'returns' ? (
                    <motion.div
                        key="returns"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                    >
                        {returns.length > 0 ? (
                            returns.map((order) => (
                                <ReturnCard key={order.id} order={order} type="return" onCancel={cancelReturn} t={t} language={language} ArrowIcon={ArrowIcon} onSuccess={fetchReturnsAndDisputes} />
                            ))
                        ) : (
                            <EmptyState
                                icon={RotateCcw}
                                title={t.dashboard.returns.noReturns}
                                desc={t.dashboard.returns.noReturnsDesc}
                            />
                        )}
                    </motion.div>
                ) : activeTab === 'disputes' ? (
                    <motion.div
                        key="disputes"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                    >
                        {disputes.length > 0 ? (
                            disputes.map((order) => (
                                <ReturnCard key={order.id} order={order} type="dispute" t={t} language={language} ArrowIcon={ArrowIcon} onSuccess={fetchReturnsAndDisputes} />
                            ))
                        ) : (
                            <EmptyState
                                icon={AlertTriangle}
                                title={t.dashboard.returns.noDisputes}
                                desc={t.dashboard.returns.noDisputesDesc}
                            />
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="guidelines"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        <GlassCard className="p-6">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Box className="text-gold-500" />
                                {t.dashboard.resolution.guidelines?.packaging || 'Packaging Instructions'}
                            </h3>
                            <ul className="space-y-3 text-white/70">
                                {t.dashboard.resolution.guidelines?.steps?.map((step: string, i: number) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ul>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <FileText className="text-gold-500" />
                                {t.dashboard.resolution.guidelines?.title || 'Return Policy Highlights'}
                            </h3>
                            <ul className="space-y-3 text-white/70">
                                {t.dashboard.resolution.guidelines?.highlights?.map((highlight: string, i: number) => (
                                    <li key={i} className="flex gap-3">
                                        <CheckCircle size={16} className="text-green-500 mt-1 shrink-0" />
                                        <span>{highlight}</span>
                                    </li>
                                ))}
                            </ul>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <ReturnRequestModal
                isOpen={returnModalOpen}
                onClose={() => setReturnModalOpen(false)}
                onSuccess={() => {
                    void fetchReturnsAndDisputes({ silent: true });
                }}
            />
            <DisputeModal
                isOpen={disputeModalOpen}
                onClose={() => setDisputeModalOpen(false)}
                onSuccess={() => {
                    void fetchReturnsAndDisputes({ silent: true });
                }}
            />
        </div>
    );
};

// --- Helper Components ---

const EmptyState = ({ icon: Icon, title, desc }: any) => (
    <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon size={24} className="text-white/20" />
        </div>
        <h3 className="text-white font-bold mb-1">{title}</h3>
        <p className="text-white/40 text-sm max-w-sm mx-auto">{desc}</p>
    </div>
);

const ReturnCard = ({ order, type, onCancel, t, language, ArrowIcon, onSuccess }: any) => {
    // Determine status color
    const isDispute = type === 'dispute';

    // Access joined order details
    const orderDetails = order.order || {};
    // Fallback logic for Part Name: partName -> parts[0].name -> "Unknown Item"
    const partName = orderDetails.partName || (orderDetails.parts && orderDetails.parts.length > 0 ? orderDetails.parts[0].name : null) || (language === 'ar' ? 'منتج غير معروف' : 'Unknown Item');

    // Evidence files (using camelCase as per new types)
    const evidenceFiles = order.evidenceFiles || [];

    return (
        <GlassCard className={`p-6 border-l-4 ${isDispute ? 'border-l-red-500' : 'border-l-gold-500'}`}>
            <div className="flex flex-col gap-4">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDispute ? 'bg-red-500/10 text-red-500' : 'bg-gold-500/10 text-gold-500'}`}>
                            {isDispute ? <AlertTriangle size={20} /> : <RotateCcw size={20} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-white/40">#{orderDetails.orderNumber || 'N/A'}</span>
                                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                <span className="text-xs text-white/40">{new Date(order.createdAt).toLocaleDateString()}</span>
                            </div>
                            <h3 className="font-bold text-white text-lg">{partName}</h3>
                            <p className="text-sm text-white/60">{orderDetails.vehicleMake} {orderDetails.vehicleModel}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge status={order.status} />
                        {type === 'return' && onCancel && order.status === 'PENDING' && (
                            <button
                                onClick={() => onCancel(order.id)}
                                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 text-xs transition-colors"
                            >
                                {language === 'ar' ? 'إلغاء الطلب' : 'Cancel Request'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Details Section */}
                <div className="bg-white/5 rounded-xl p-4 space-y-3">
                    <div>
                        <span className="text-xs text-white/40 block mb-1">{language === 'ar' ? 'السبب' : 'Reason'}</span>
                        <p className="text-sm text-white">{order.reason}</p>
                    </div>
                    {order.description && (
                        <div>
                            <span className="text-xs text-white/40 block mb-1">{language === 'ar' ? 'الوصف' : 'Description'}</span>
                            <p className="text-sm text-white/80">{order.description}</p>
                        </div>
                    )}

                    {/* Evidence Files */}
                    {evidenceFiles.length > 0 && (
                        <div>
                            <span className="text-xs text-white/40 block mb-2">{language === 'ar' ? 'المرفقات' : 'Evidence'}</span>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {evidenceFiles.map((url: string, idx: number) => (
                                    <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-16 h-16 rounded-lg border border-white/10 overflow-hidden hover:border-gold-500/50 transition-colors relative group"
                                    >
                                        <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Box size={12} className="text-white" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
 
                    {/* Shipping Payment Section (Phase 4) */}
                    {order.shippingPaymentStatus && order.shippingRefund && Number(order.shippingRefund) > 0 && (
                        <div className="pt-4 border-t border-white/5 mt-4">
                            <ShippingPaymentCard 
                                caseRecord={order as any} 
                                role="CUSTOMER" 
                                onSuccess={() => onSuccess?.()}
                            />
                        </div>
                    )}
                </div>
            </div>
        </GlassCard>
    );
};
