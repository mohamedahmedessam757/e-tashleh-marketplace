import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, DollarSign, MessageSquare, AlertTriangle, Package, Truck, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotificationStore, NotificationType } from '../../../stores/useNotificationStore';
import { getCurrentUserId } from '../../../utils/auth';
import {
    resolveNotificationNavigation,
    setViolationNavContext,
} from '../../../utils/violationNavigation';

interface NotificationCenterTabProps {
    role?: 'customer' | 'merchant' | 'admin' | string;
    onNavigate?: (path: string, id?: number) => void;
}

export const NotificationCenterTab: React.FC<NotificationCenterTabProps> = ({ role = 'customer', onNavigate }) => {
    const { t, language } = useLanguage();
    const { notifications, markAsRead, markAllAsRead, fetchNotifications, isLoading } = useNotificationStore();

    useEffect(() => {
        const uid = getCurrentUserId();
        if (uid) {
            fetchNotifications(uid, role);
        }
    }, [role]);

    const getIcon = (type: NotificationType | string) => {
        switch (type) {
            case 'OFFER': return <MessageSquare size={18} className="text-blue-400" />;
            case 'ORDER': return <CheckCircle2 size={18} className="text-green-400" />;
            case 'PAYMENT': return <DollarSign size={18} className="text-gold-400" />;
            case 'SHIPPING': return <Truck size={18} className="text-purple-400" />;
            case 'DELIVERED': return <Package size={18} className="text-emerald-400" />;
            case 'RATE': return <Bell size={18} className="text-yellow-400" />;
            case 'DISPUTE': return <AlertTriangle size={18} className="text-red-400" />;
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
        <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Bell size={20} className="text-gold-500" />
                    {t.dashboard.notificationsCenter?.title || (language === 'ar' ? 'مركز الإشعارات' : 'Notification Center')}
                </h3>
                {notifications.length > 0 && (
                    <button
                        onClick={() => {
                            const uid = getCurrentUserId();
                            if (uid) markAllAsRead(uid, role);
                        }}
                        className="text-sm text-gold-400 hover:text-gold-300 font-medium transition-colors"
                    >
                        {t.dashboard.notificationsCenter?.markAllRead || (language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read')}
                    </button>
                )}
            </div>

            <div className="bg-[#1A1814] rounded-xl border border-white/5 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-white/50">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-white/30">
                        <Bell size={48} className="mb-4 opacity-20" />
                        <p className="text-lg">{t.dashboard.notificationsCenter?.empty || (language === 'ar' ? 'لا توجد إشعارات حالياً' : 'No notifications at the moment')}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                        <AnimatePresence>
                            {notifications.map((notif) => (
                                <motion.div
                                    key={notif.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => {
                                        const uid = getCurrentUserId();
                                        if (uid && !notif.isRead) markAsRead(notif.id, uid);

                                        if (!onNavigate) return;
                                        const nav = resolveNotificationNavigation(notif);
                                        if (!nav) return;
                                        if (nav.context) setViolationNavContext(nav.context);
                                        if (notif.metadata?.orderId) {
                                            onNavigate('order-details', notif.metadata.orderId);
                                        } else if (notif.metadata?.caseId) {
                                            onNavigate('dispute-details', notif.metadata.caseId);
                                        } else {
                                            onNavigate(nav.path);
                                        }
                                    }}
                                    className={`p-5 hover:bg-white/5 cursor-pointer transition-colors relative flex gap-4 ${!notif.isRead ? 'bg-gold-500/5' : ''}`}
                                >
                                    {!notif.isRead && (
                                        <div className={`absolute top-1/2 -translate-y-1/2 ${language === 'ar' ? 'right-2' : 'left-2'} w-2 h-2 rounded-full bg-gold-500 hidden md:block`} />
                                    )}
                                    <div className="mt-1 p-3 rounded-full bg-[#0F0E0C] border border-white/10 h-fit flex-shrink-0">
                                        {getIcon(notif.type as NotificationType)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-wrap gap-2 items-start justify-between mb-1">
                                            <h4 className={`text-base font-bold ${!notif.isRead ? 'text-white' : 'text-white/70'}`}>
                                                {language === 'ar' ? notif.titleAr : notif.titleEn}
                                            </h4>
                                            <span className="text-xs text-white/30 font-mono whitespace-nowrap">
                                                {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-white/50 leading-relaxed">
                                            {language === 'ar' ? notif.messageAr : notif.messageEn}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
