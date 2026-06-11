
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { useProfileStore } from '../../../stores/useProfileStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { User, Star, MapPin, CreditCard, Shield, Settings, ShieldAlert, Package, AlertTriangle } from 'lucide-react';
import { InfoTab } from './tabs/InfoTab';
import { SecurityTab } from './tabs/SecurityTab';
import { AddressesTab } from './tabs/AddressesTab';
import { BillingTab } from './tabs/BillingTab';

import { SavedCards } from '../wallet/SavedCards';

export const ProfileView: React.FC = () => {
    const { t } = useLanguage();

    const [activeTab, setActiveTab] = useState<'info' | 'security' | 'settings' | 'billing' | 'loyalty'>('info');

    // Consolidated Tabs Configuration
    const tabs = [
        { id: 'info', icon: User, label: t.dashboard.profile.tabs.info },
        { id: 'security', icon: Shield, label: t.dashboard.profile.tabs.security },
        { id: 'restrictions', icon: ShieldAlert, label: useLanguage().language === 'ar' ? 'القيود والتحكم' : 'Restrictions' },
    ];

    const handleNavigate = (path: string, id?: any) => {
        console.log("Navigation requested", path, id);
    };

    return (
        <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 space-y-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${activeTab === tab.id ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20' : 'text-white/50 hover:bg-white/5 hover:text-white'}
                  `}
                    >
                        <tab.icon size={18} />
                        <span className="font-bold text-sm">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3">
                <GlassCard className="min-h-[500px] p-6 md:p-10">
                    <AnimatePresence mode="wait">
                        {activeTab === 'info' && <InfoTab />}
                        {activeTab === 'security' && <SecurityTab />}
                        {activeTab === 'restrictions' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Order Quotas */}
                                    <GlassCard className="p-6 bg-white/[0.02] border-white/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <Package size={60} />
                                        </div>
                                        <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <ShieldAlert size={16} className="text-blue-500" />
                                            {useLanguage().language === 'ar' ? 'حدود النشاط' : 'Activity Limits'}
                                        </h3>
                                        
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                                <span className="text-xs font-bold text-white/60">{useLanguage().language === 'ar' ? 'حد الطلبات اليومي' : 'Daily Order Limit'}</span>
                                                <span className="text-lg font-black text-white font-mono">{useProfileStore.getState().user?.orderLimit === -1 ? '∞' : useProfileStore.getState().user?.orderLimit}</span>
                                            </div>
                                            <p className="text-[10px] text-white/20 leading-relaxed italic uppercase font-black">
                                                {useLanguage().language === 'ar' ? 'يتم إعادة تعيين هذا الحد تلقائياً كل 24 ساعة' : 'This limit resets automatically every 24 hours'}
                                            </p>
                                        </div>
                                    </GlassCard>

                                    {/* Financial Restrictions */}
                                    <GlassCard className="p-6 bg-white/[0.02] border-white/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <CreditCard size={60} />
                                        </div>
                                        <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <ShieldAlert size={16} className="text-orange-500" />
                                            {useLanguage().language === 'ar' ? 'الوضع المالي' : 'Financial Status'}
                                        </h3>
                                        
                                        <div className="space-y-4">
                                            <div className={`p-4 rounded-2xl border ${useProfileStore.getState().user?.withdrawalsFrozen ? 'bg-orange-500/5 border-orange-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-white/60">{useLanguage().language === 'ar' ? 'عمليات السحب' : 'Withdrawals'}</span>
                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${useProfileStore.getState().user?.withdrawalsFrozen ? 'bg-orange-500 text-black' : 'bg-green-500 text-black'}`}>
                                                        {useProfileStore.getState().user?.withdrawalsFrozen ? (useLanguage().language === 'ar' ? 'مقيد' : 'Restricted') : (useLanguage().language === 'ar' ? 'متاح' : 'Active')}
                                                    </span>
                                                </div>
                                                {useProfileStore.getState().user?.withdrawalsFrozen && (
                                                    <p className="text-[10px] text-orange-400/70 font-medium">
                                                        {useProfileStore.getState().user?.withdrawalFreezeNote || (useLanguage().language === 'ar' ? 'تم تعليق عمليات السحب للمراجعة الإدارية.' : 'Withdrawals suspended for administrative review.')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </GlassCard>
                                </div>

                                {useProfileStore.getState().user?.restrictionAlertMessage && (
                                    <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl flex items-start gap-4">
                                        <AlertTriangle className="text-red-500 mt-1" size={24} />
                                        <div>
                                            <h4 className="text-sm font-black text-red-500 uppercase tracking-widest mb-1">{useLanguage().language === 'ar' ? 'تنبيه إداري' : 'Admin Notice'}</h4>
                                            <p className="text-xs text-white/60 leading-relaxed">{useProfileStore.getState().user?.restrictionAlertMessage}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </GlassCard>
            </div>
        </div>
    );
};

