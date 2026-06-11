import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert, X, ChevronRight } from 'lucide-react';
import { useProfileStore } from '../../../stores/useProfileStore';
import { useVendorStore } from '../../../stores/useVendorStore';
import { useLanguage } from '../../../contexts/LanguageContext';
interface RestrictionAlertBannerProps {
    onNavigate?: (path: string) => void;
}

export const RestrictionAlertBanner: React.FC<RestrictionAlertBannerProps> = ({ onNavigate }) => {
    const { user } = useProfileStore();
    const vendorState = useVendorStore();
    const { language } = useLanguage();
    const [isDismissed, setIsDismissed] = React.useState(false);

    const isAr = language === 'ar';

    // Determine if any restriction is active
    const role = user?.role?.toUpperCase();
    const isMerchant = role === 'MERCHANT' || role === 'VENDOR';
    
    const hasUserRestrictions = user?.withdrawalsFrozen || (user?.orderLimit !== undefined && user.orderLimit !== -1);
    const hasVendorRestrictions = isMerchant && (vendorState.withdrawalsFrozen || vendorState.visibilityRestricted || (vendorState.offerLimit !== -1));

    // 2026 Admin Bypass: Do not show restrictions banner for administrators
    if (role === 'ADMIN') return null;

    if (isDismissed || (!hasUserRestrictions && !hasVendorRestrictions)) return null;

    const handleAction = () => {
        if (onNavigate) {
            onNavigate('profile');
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="px-4 md:px-8 mt-2 md:mt-4 pointer-events-none"
            >
                <div 
                    dir={isAr ? 'rtl' : 'ltr'}
                    className="relative z-10 bg-gradient-to-r from-red-600/90 via-red-500/90 to-red-600/90 backdrop-blur-xl border border-red-400/30 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-auto"
                >
                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden rounded-[1.5rem] md:rounded-[2rem]">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent scale-150 animate-pulse" />
                    </div>

                    <div className="flex items-center gap-4 text-center sm:text-right relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
                            <ShieldAlert size={20} className="text-white animate-bounce" />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-sm sm:text-base font-black text-white uppercase tracking-[2px] leading-tight">
                                {isAr ? 'تنبيه إداري: قيود نشطة على الحساب' : 'Security Alert: Active Account Restrictions'}
                            </p>
                            <p className="text-[10px] sm:text-xs text-white/80 font-bold tracking-tight opacity-90">
                                {isAr 
                                    ? 'تم تطبيق قيود أمنية على بعض العمليات لضمان الامتثال والنزاهة.' 
                                    : 'Security restrictions have been applied to ensure platform integrity.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleAction}
                            className="px-6 py-2 bg-white text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-xl shadow-black/20"
                        >
                            {isAr ? 'عرض التفاصيل والقيود' : 'View Restrictions'}
                            <ChevronRight size={14} className={isAr ? 'rotate-180' : ''} />
                        </button>
                        <button
                            onClick={() => setIsDismissed(true)}
                            className="p-2 hover:bg-white/20 rounded-xl text-white/70 hover:text-white transition-all group"
                        >
                            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>
                
                {/* Premium scanning light effect */}
                <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                />
            </motion.div>
        </AnimatePresence>
    );
};
