
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { useBillingStore } from '../../stores/useBillingStore';
import { FileText, CreditCard, Download, Eye, Calendar, DollarSign } from 'lucide-react';

export const BillingPage: React.FC = () => {
    const { t } = useLanguage();
    const { invoices, fetchInvoices, loading } = useBillingStore();
    const [activeTab, setActiveTab] = useState<'INVOICES' | 'WALLET'>('INVOICES');

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-white mb-6">{t.dashboard.menu.billing}</h1>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-white/10 pb-4 mb-6">
                <button
                    onClick={() => setActiveTab('INVOICES')}
                    className={`text-sm font-bold pb-4 transition-colors relative ${activeTab === 'INVOICES' ? 'text-gold-500' : 'text-white/50'}`}
                >
                    {t.dashboard.billing?.invoices || 'Invoices'}
                    {activeTab === 'INVOICES' && <motion.div layoutId="billingTab" className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-gold-500" />}
                </button>
                <button
                    onClick={() => setActiveTab('WALLET')}
                    className={`text-sm font-bold pb-4 transition-colors relative ${activeTab === 'WALLET' ? 'text-gold-500' : 'text-white/50'}`}
                >
                    {t.dashboard.billing?.wallet || 'My Wallet'}
                    {activeTab === 'WALLET' && <motion.div layoutId="billingTab" className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-gold-500" />}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'INVOICES' && (
                    <motion.div
                        key="invoices"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                    >
                        {loading ? (
                            <div className="text-center text-white/50 py-12">Loading invoices...</div>
                        ) : invoices.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5">
                                <FileText className="mx-auto text-white/20 mb-4" size={48} />
                                <h3 className="text-white font-bold">No Invoices Found</h3>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {invoices.map((inv, idx) => (
                                    <GlassCard key={inv.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6" delay={idx * 0.05}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold">{inv.invoice_number}</h4>
                                                <p className="text-xs text-white/50 flex items-center gap-1 mt-1">
                                                    <Calendar size={12} />
                                                    {new Date(inv.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <p className="text-xs text-white/50">Amount</p>
                                                <p className="text-lg font-bold text-white">{inv.totalAmount || 0} AED</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors">
                                                    <Eye size={20} />
                                                </button>
                                                <button className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors">
                                                    <Download size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'WALLET' && (
                    <motion.div
                        key="wallet"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <GlassCard className="p-8 text-center">
                            <CreditCard className="mx-auto text-gold-500 mb-4" size={48} />
                            <h2 className="text-2xl font-bold text-white mb-2">Wallet Feature Coming Soon</h2>
                            <p className="text-white/50">Manage your saved cards and balance here.</p>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
