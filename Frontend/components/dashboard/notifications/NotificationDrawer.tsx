import React, { memo, useCallback, useMemo } from 'react';
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

const ICON_BY_TYPE: Record<string, React.ReactNode> = {
    OFFER: <MessageSquare size={18} className="text-blue-400" />,
    ORDER: <CheckCircle2 size={18} className="text-green-400" />,
    PAYMENT: <DollarSign size={18} className="text-gold-400" />,
    SHIPPING: <Truck size={18} className="text-purple-400" />,
    DELIVERED: <Package size={18} className="text-emerald-400" />,
    RATE: <Bell size={18} className="text-yellow-400" />,
    DISPUTE: <AlertTriangle size={18} className="text-red-400" />,
    RETURN: <RotateCcw size={18} className="text-orange-400" />,
    DOC_EXPIRY: <AlertTriangle size={18} className="text-orange-400" />,
    SECURITY: <AlertTriangle size={18} className="text-red-500" />,
    VIOLATION: <ShieldAlert size={18} className="text-amber-400" />,
    LOYALTY_REVIEW: <ShieldAlert size={18} className="text-amber-400" />,
    CHAT_VIOLATION: <ShieldAlert size={18} className="text-amber-400" />,
};

const DEFAULT_ICON = <Bell size={18} />;

function getNotifIcon(type: NotificationType | string) {
    return ICON_BY_TYPE[String(type || '').toUpperCase()] || DEFAULT_ICON;
}

function formatNotifTime(iso: string, language: string): string {
    try {
        return new Date(iso).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

/** Plain DOM row — no per-item Framer motion (keeps drawer open cheap). */
const NotificationItem = memo(function NotificationItem({
    notif,
    language,
    onSelect,
}: {
    notif: Notification;
    language: string;
    onSelect: (notif: Notification) => void;
}) {
    const unreadDotSide = language === 'ar' ? 'left-4' : 'right-4';

    return (
        <div
            onClick={() => onSelect(notif)}
            className={`p-4 hover:bg-white/5 cursor-pointer transition-colors duration-150 relative group border-b border-white/5 ${!notif.isRead ? 'bg-gold-500/[0.03]' : ''}`}
            style={{ contentVisibility: 'auto', containIntrinsicSize: '0 88px' }}
        >
            {!notif.isRead && (
                <div
                    className={`absolute top-4 ${unreadDotSide} w-2 h-2 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,0.6)]`}
                />
            )}
            <div className="flex gap-3">
                <div className="mt-1 p-2 rounded-xl bg-[#0F0E0C] border border-white/10 h-fit group-hover:border-gold-500/30 transition-colors">
                    {getNotifIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <h4
                        className={`text-sm font-bold mb-1 transition-colors ${!notif.isRead ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}
                    >
                        {language === 'ar' ? notif.titleAr : notif.titleEn}
                    </h4>
                    <p className="text-xs text-white/50 leading-relaxed line-clamp-2 group-hover:text-white/70 transition-colors">
                        {language === 'ar' ? notif.messageAr : notif.messageEn}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-white/30 font-medium">
                            {formatNotifTime(notif.createdAt, language)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
    isOpen,
    onClose,
    onNavigate,
    role,
}) => {
    const { t, language } = useLanguage();
    const notifications = useNotificationStore((s) => s.notifications);
    const dismissNotification = useNotificationStore((s) => s.dismissNotification);
    const markAsRead = useNotificationStore((s) => s.markAsRead);
    const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
    const shouldShowAsPopup = useNotificationStore((s) => s.shouldShowAsPopup);
    const isLoading = useNotificationStore((s) => s.isLoading);

    const unreadCount = useMemo(
        () => notifications.reduce((n, item) => n + (item.isRead ? 0 : 1), 0),
        [notifications],
    );
    const hasUnread = unreadCount > 0;
    const isAr = language === 'ar';

    const handleNotifClick = useCallback(
        async (notif: Notification) => {
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

                let path = nav.path;
                let id = nav.id || (notif.metadata?.orderId as string | undefined) || (notif.metadata?.caseId as string | undefined);

                if (path === 'order-details' || path === 'orders') {
                    if (role === 'admin') path = 'admin-order-details';
                    else if (role === 'merchant') path = id ? 'explore-offer' : 'active-orders';
                    else path = 'order-details';
                } else if (path === 'dispute-details') {
                    path = role === 'admin' ? 'admin-dispute-details' : 'dispute-details';
                } else if (path === 'store-profile' && role !== 'admin') {
                    path = 'profile';
                    id = undefined;
                } else if (path === 'profile' && role === 'admin' && notif.metadata?.storeId) {
                    path = 'store-profile';
                    id = String(notif.metadata.storeId);
                }

                onNavigate(path, id);
                onClose();
            }
        },
        [dismissNotification, markAsRead, shouldShowAsPopup, onNavigate, onClose, role],
    );

    const handleMarkAll = useCallback(() => {
        const uid = getCurrentUserId();
        if (uid) markAllAsRead(uid, role);
    }, [markAllAsRead, role]);

    // Single light slide — no spring, no blur, no per-row layout animations
    const slideFrom = isAr ? '-100%' : '100%';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60"
                    />

                    <motion.div
                        initial={{ x: slideFrom }}
                        animate={{ x: 0 }}
                        exit={{ x: slideFrom }}
                        transition={{ type: 'tween', duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                        className={`absolute top-0 bottom-0 ${isAr ? 'left-0' : 'right-0'} w-full max-w-[400px] bg-[#0A0A0A] border-x border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[110] flex flex-col`}
                    >
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0F0E0C]">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Bell className="text-gold-500" size={24} />
                                    {hasUnread && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-[#0F0E0C] rounded-full" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-xl tracking-tight">
                                        {t.dashboard.notifications.title}
                                    </h3>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
                                        Real-time Updates
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-colors duration-150 active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                            <span className="text-[11px] text-white/30 font-medium">
                                {unreadCount} {isAr ? 'تنبيهات جديدة' : 'New Alerts'}
                            </span>
                            <button
                                type="button"
                                onClick={handleMarkAll}
                                className="text-[11px] text-gold-400 hover:text-gold-300 font-bold uppercase tracking-wider transition-colors active:opacity-50"
                            >
                                {t.dashboard.notifications.markAllRead}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide py-2">
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
                                    {notifications.map((notif) => (
                                        <NotificationItem
                                            key={notif.id}
                                            notif={notif}
                                            language={language}
                                            onSelect={handleNotifClick}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-white/5 bg-white/[0.01] text-center">
                            <p className="text-[10px] text-white/20 font-medium tracking-tighter">
                                {isAr ? 'مركز التنبيهات الذكي 2026' : 'SMART NOTIFICATION CENTER 2026'}
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
