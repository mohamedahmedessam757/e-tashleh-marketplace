import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Filter, CheckCircle2, AlertTriangle, DollarSign, Package, Truck, Settings } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotificationStore, NotificationType } from '../../../stores/useNotificationStore';
import { getCurrentUserId } from '../../../utils/auth';
import { MerchantPreferencesTab } from './MerchantPreferencesTab';
import {
    resolveNotificationNavigation,
    setViolationNavContext,
} from '../../../utils/violationNavigation';

interface MerchantNotificationsProps {
    onNavigate?: (path: string, id?: string) => void;
}

export const MerchantNotifications: React.FC<MerchantNotificationsProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const { notifications, markAsRead, markAllAsRead } = useNotificationStore();
    const [activeTab, setActiveTab] = useState<'prefs' | 'notifications'>('notifications');
    const [filter, setFilter] = useState<'all' | 'unread' | 'alerts'>('all');

    const isAr = language === 'ar';

    const getIcon = (type: NotificationType | string) => {
        switch (type) {
            case 'PAYMENT': return <DollarSign size={20} className="text-gold-400" />;
            case 'OFFER': return <Package size={20} className="text-blue-400" />;
            case 'DISPUTE': return <AlertTriangle size={20} className="text-red-400" />;
            case 'DOC_EXPIRY': return <AlertTriangle size={20} className="text-orange-400" />;
            case 'ORDER': return <CheckCircle2 size={20} className="text-green-400" />;
            case 'SHIPPING': return <Truck size={20} className="text-purple-400" />;
            default: return <Bell size={20} className="text-white/60" />;
        }
    };

    const filteredNotifs = notifications.filter(n => {
        if (filter === 'unread') return !n.isRead;
        if (filter === 'alerts') return n.type === 'DISPUTE' || n.type === 'PAYMENT' || n.type === 'DOC_EXPIRY';
        return true;
    });

    const handleMarkAllRead = () => {
        const uid = getCurrentUserId();
        if (uid) markAllAsRead(uid, 'MERCHANT');
    };

    const handleMarkRead = (id: string) => {
        const uid = getCurrentUserId();
        if (uid) markAsRead(id, uid);
    };

    const handleNotifClick = (notif: (typeof notifications)[0]) => {
        handleMarkRead(notif.id);
        if (!onNavigate) return;
        const nav = resolveNotificationNavigation(notif);
        if (!nav) return;
        if (nav.context) setViolationNavContext(nav.context);
        if (notif.metadata?.orderId) {
            onNavigate('orders', notif.metadata.orderId);
        } else {
            onNavigate(nav.path);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {t.dashboard.merchant.menu.prefsAndNotifications}
                    </h1>
                    <p className="text-white/50 text-sm">
                        {isAr 
                            ? 'إدارة تفضيلات حسابك والبقاء على اطلاع بآخر التحديثات' 
                            : 'Manage your account preferences and stay updated with latest activities'}
                    </p>
                </div>
                {activeTab === 'notifications' && (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-colors text-sm self-start md:self-center"
                    >
                        <CheckCircle2 size={16} />
                        {t.dashboard.merchant.notifications.markAllRead}
                    </button>
                )}
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl w-fit border border-white/10">
                <button
                    onClick={() => setActiveTab('notifications')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'notifications' ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'text-white/50 hover:text-white'}`}
                >
                    <Bell size={18} />
                    {t.dashboard.merchant.notifications.title}
                </button>
                <button
                    onClick={() => setActiveTab('prefs')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'prefs' ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'text-white/50 hover:text-white'}`}
                >
                    <Settings size={18} />
                    {isAr ? 'التفضيلات' : 'Preferences'}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'notifications' ? (
                    <motion.div
                        key="notifications-list"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-6"
                    >
                        {/* Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                            {[
                                { id: 'all', label: isAr ? 'الكل' : 'All' },
                                { id: 'unread', label: isAr ? 'غير مقروءة' : 'Unread' },
                                { id: 'alerts', label: isAr ? 'تنبيهات هامة' : 'Important Alerts' },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilter(f.id as any)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filter === f.id ? 'bg-gold-500/10 text-gold-500 border border-gold-500/20' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* List */}
                        <div className="grid gap-3">
                            {filteredNotifs.length > 0 ? (
                                filteredNotifs.map((notif) => (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => handleNotifClick(notif)}
                                        className={`
                                            p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 group
                                            ${!notif.isRead
                                                ? 'bg-[#1A1814] border-gold-500/30'
                                                : 'bg-white/5 border-white/5 hover:bg-white/10'}
                                        `}
                                    >
                                        <div className={`p-3 rounded-full bg-[#0F0E0C] border border-white/10 shrink-0 ${!notif.isRead ? 'animate-pulse' : ''}`}>
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1 gap-4">
                                                <h4 className={`text-sm font-bold truncate ${!notif.isRead ? 'text-white' : 'text-white/60'}`}>
                                                    {isAr ? notif.titleAr : notif.titleEn}
                                                </h4>
                                                <span className="text-[10px] text-white/30 font-mono whitespace-nowrap shrink-0">
                                                    {new Date(notif.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/80 mb-1 leading-relaxed">
                                                {isAr ? notif.messageAr : notif.messageEn}
                                            </p>
                                            {notif.metadata?.orderId && (
                                                <p className="text-xs text-gold-500/40 font-mono">
                                                    #{notif.metadata.orderId}
                                                </p>
                                            )}
                                        </div>
                                        {!notif.isRead && (
                                            <div className="w-2 h-2 rounded-full bg-gold-500 mt-2 shrink-0 shadow-[0_0_10px_rgba(168,139,62,0.5)]" />
                                        )}
                                    </motion.div>
                                ))
                            ) : (
                                <div className="py-20 text-center text-white/30 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                                    <Bell size={40} className="mx-auto mb-4 opacity-20" />
                                    <p>{t.dashboard.merchant.notifications.empty}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <MerchantPreferencesTab key="preferences-content" />
                )}
            </AnimatePresence>

        </div>
    );
};
