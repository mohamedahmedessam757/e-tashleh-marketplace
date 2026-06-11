
import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle2, DollarSign, MessageSquare, AlertTriangle, Package, RotateCcw, Truck, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotificationStore, NotificationType, Notification } from '../../../stores/useNotificationStore';
import { getCurrentUserId } from '../../../utils/auth';
import {
    resolveNotificationNavigation,
    setViolationNavContext,
} from '../../../utils/violationNavigation';

interface NotificationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (path: string, id?: string) => void;
    role: 'customer' | 'merchant' | 'admin' | string;
}

// 1. Memoized Notification Item for Performance (2026 Optimization)
const NotificationItem = memo(({ 
    notif, 
    language, 
    onClick 
}: { 
    notif: Notification; 
    language: string; 
    onClick: () => void;
}) => {
    const getIcon = (type: NotificationType | string) => {
        switch (type) {
            case 'OFFER': return <MessageSquare size={18} className="text-blue-400" />;
            case 'ORDER': return <CheckCircle2 size={18} className="text-green-400" />;
            case 'PAYMENT': return <DollarSign size={18} className="text-gold-400" />;
            case 'SHIPPING': return <Truck size={18} className="text-purple-400" />;
            case 'DELIVERED': return <Package size={18} className="text-emerald-400" />;
            case 'RATE': return <Bell size={18} className="text-yellow-400" />;
            case 'DISPUTE': return <AlertTriangle size={18} className="text-red-400" />;
            case 'RETURN': return <RotateCcw size={18} className="text-orange-400" />;
            case 'DOC_EXPIRY': return <AlertTriangle size={18} className="text-orange-400" />;
            case 'SECURITY': return <AlertTriangle size={18} className="text-red-500" />;
            case 'VIOLATION':
            case 'LOYALTY_REVIEW':
            case 'CHAT_VIOLATION':
                return <ShieldAlert size={18} className="text-amber-400" />;
            default: return <Bell size={18} />;
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onClick}
            className={`p-4 hover:bg-white/5 cursor-pointer transition-all duration-200 relative group border-b border-white/5 ${!notif.isRead ? 'bg-gold-500/[0.03]' : ''}`}
            style={{ willChange: 'transform, opacity' }}
        >
            {!notif.isRead && (
                <div className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} w-2 h-2 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,0.6)]`} />
            )}
            <div className="flex gap-3">
                <div className="mt-1 p-2 rounded-xl bg-[#0F0E0C] border border-white/10 h-fit group-hover:border-gold-500/30 transition-colors">
                    {getIcon(notif.type)}
                </div>
                <div className="flex-1">
                    <h4 className={`text-sm font-bold mb-1 transition-colors ${!notif.isRead ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>
                        {language === 'ar' ? notif.titleAr : notif.titleEn}
                    </h4>
                    <p className="text-xs text-white/50 leading-relaxed line-clamp-2 group-hover:text-white/70 transition-colors">
                        {language === 'ar' ? notif.messageAr : notif.messageEn}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-white/30 font-medium">
                            {new Date(notif.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

NotificationItem.displayName = 'NotificationItem';

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose, onNavigate, role }) => {
    const { t, language } = useLanguage();
    const { notifications, dismissNotification, markAsRead, markAllAsRead, shouldShowAsPopup, isLoading } = useNotificationStore();

    const handleNotifClick = async (notif: Notification) => {
        const uid = getCurrentUserId();
        if (uid && !notif.isRead) {
            if (shouldShowAsPopup(notif)) {
                await dismissNotification(notif.id);
            } else {
                await markAsRead(notif.id, uid);
            }
        }

        const nav = resolveNotificationNavigation(notif);
        if (nav) {
            if (nav.context) {
                setViolationNavContext(nav.context);
            }
            if (notif.metadata?.orderId) {
                onNavigate('order-details', notif.metadata.orderId);
            } else if (notif.metadata?.caseId) {
                const detailPath = role === 'admin' ? 'admin-dispute-details' : 'dispute-details';
                onNavigate(detailPath, notif.metadata.caseId);
            } else {
                onNavigate(nav.path);
            }
            onClose();
            return;
        }
    };

    // 2026 High-Performance Animation Variants
    const drawerVariants = {
        closed: { 
            x: language === 'ar' ? '-100%' : '100%',
            transition: { type: 'tween', duration: 0.3, ease: [0.4, 0, 0.2, 1] }
        },
        open: { 
            x: 0,
            transition: { type: 'tween', duration: 0.4, ease: [0, 0, 0.2, 1] }
        }
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <div className="fixed inset-0 z-[100] overflow-hidden">
                    {/* Backdrop - Separate for better perf */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                        style={{ willChange: 'opacity' }}
                    />

                    {/* Drawer */}
                    <motion.div
                        variants={drawerVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        className={`absolute top-0 bottom-0 ${language === 'ar' ? 'left-0' : 'right-0'} w-full max-w-[400px] bg-[#0A0A0A] border-x border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[110] flex flex-col`}
                        style={{ willChange: 'transform' }}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0F0E0C]">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Bell className="text-gold-500" size={24} />
                                    {notifications.some(n => !n.isRead) && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-[#0F0E0C] rounded-full" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-xl tracking-tight">{t.dashboard.notifications.title}</h3>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Real-time Updates</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-2 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all duration-200 active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Actions Bar */}
                        <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                            <span className="text-[11px] text-white/30 font-medium">
                                {notifications.filter(n => !n.isRead).length} {language === 'ar' ? 'تنبيهات جديدة' : 'New Alerts'}
                            </span>
                            <button
                                onClick={() => {
                                    const uid = getCurrentUserId();
                                    if (uid) markAllAsRead(uid, role);
                                }}
                                className="text-[11px] text-gold-400 hover:text-gold-300 font-bold uppercase tracking-wider transition-colors active:opacity-50"
                            >
                                {t.dashboard.notifications.markAllRead}
                            </button>
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
                            {isLoading && notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full space-y-4">
                                    <div className="w-10 h-10 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-white/20 px-10 text-center">
                                    <div className="w-20 h-20 rounded-full bg-white/[0.02] flex items-center justify-center mb-6">
                                        <Bell size={40} className="opacity-20" />
                                    </div>
                                    <p className="text-sm font-medium">{t.dashboard.notifications.empty}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <AnimatePresence initial={false}>
                                        {notifications.map((notif) => (
                                            <NotificationItem
                                                key={notif.id}
                                                notif={notif}
                                                language={language}
                                                onClick={() => handleNotifClick(notif)}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                        
                        {/* Footer - 2026 Premium Finish */}
                        <div className="p-4 border-t border-white/5 bg-white/[0.01] text-center">
                            <p className="text-[10px] text-white/20 font-medium tracking-tighter">
                                {language === 'ar' ? 'مركز التنبيهات الذكي 2026' : 'SMART NOTIFICATION CENTER 2026'}
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
