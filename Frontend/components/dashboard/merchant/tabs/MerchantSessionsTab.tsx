import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe2, Smartphone, Monitor, LogOut, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useProfileStore } from '../../../../stores/useProfileStore';
import { useLanguage } from '../../../../contexts/LanguageContext';

export const MerchantSessionsTab: React.FC = () => {
    const { sessions, terminateSession, terminateAllSessions, detectCurrentSession } = useProfileStore();
    const { t, language } = useLanguage();
    const [isWarningOpen, setIsWarningOpen] = useState(false);

    useEffect(() => {
        detectCurrentSession();
    }, []);

    const handleTerminateAll = async () => {
        try {
            await terminateAllSessions();
            setIsWarningOpen(false);
        } catch (error) {
            console.error('[MerchantSessionsTab] Terminate all failed:', error);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-10"
        >
            {/* Active Sessions List */}
            <div>
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Globe2 size={20} className="text-gold-500" />
                    {language === 'ar' ? 'الجلسات النشطة' : 'Active Sessions'}
                </h3>

                <div className="space-y-3">
                    {sessions.length > 0 ? sessions.map(session => (
                        <div key={session.id} className="p-4 rounded-xl border border-white/5 bg-[#151310] flex items-center justify-between group hover:border-gold-500/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${session.device.toLowerCase().includes('phone') ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                    {session.device.toLowerCase().includes('phone') ? <Smartphone size={20} /> : <Monitor size={20} />}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white text-sm">{session.device}</span>
                                        {session.isCurrent && (
                                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 font-bold uppercase tracking-wider">
                                                {language === 'ar' ? 'هذا الجهاز' : 'THIS DEVICE'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-white/40 flex flex-wrap items-center gap-2">
                                        <span className="bg-white/5 px-1.5 py-0.5 rounded font-medium">{session.os}</span>
                                        <span className="text-white/20">•</span>
                                        <span className="text-gold-200/60 font-medium">{session.location}</span>
                                        <span className="text-white/20">•</span>
                                        <span className="font-mono bg-black/40 px-1.5 py-0.5 rounded border border-white/5 text-[10px]">{session.ip}</span>
                                        <span className="text-white/20">•</span>
                                        <span className="italic opacity-60">
                                            {language === 'ar' ? 'نشط: ' : 'Active: '}
                                            {new Date(session.lastActive).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {!session.isCurrent && (
                                <button
                                    onClick={() => terminateSession(session.id)}
                                    className="p-2.5 hover:bg-red-500/10 text-white/20 hover:text-red-500 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100"
                                    title={language === 'ar' ? 'إنهاء الجلسة' : 'Terminate Session'}
                                >
                                    <LogOut size={16} />
                                </button>
                            )}
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/2">
                            <Loader2 className="w-8 h-8 text-gold-500 animate-spin mb-3" />
                            <p className="text-white/30 text-sm">
                                {language === 'ar' ? 'جاري جلب بيانات الجلسات النشطة...' : 'Retrieving active sessions...'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <button
                        onClick={() => setIsWarningOpen(true)}
                        className="w-full py-4 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                    >
                        <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
                        {language === 'ar' ? 'تسجيل الخروج من الجلسات الأخرى' : 'Sign Out All Other Sessions'}
                    </button>
                    <p className="text-center text-[10px] text-white/20 mt-3 italic">
                        {language === 'ar' ? '* سيتم تسجيل خروجك من جميع الأجهزة باستثناء هذا الجهاز.' : '* You will be logged out from all devices except this one.'}
                    </p>
                </div>
            </div>

            {/* Terminate All Confirmation Modal */}
            <AnimatePresence>
                {isWarningOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-[#1A1814] w-full max-w-md rounded-2xl border border-red-500/20 overflow-hidden shadow-2xl shadow-red-500/10"
                        >
                            <div className="p-8">
                                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 text-red-500 border border-red-500/20 rotate-3">
                                    <AlertCircle size={28} />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">
                                    {language === 'ar' ? 'تأكيد الحماية' : 'Security Confirmation'}
                                </h3>
                                <p className="text-white/60 text-sm mb-8 leading-relaxed">
                                    {language === 'ar'
                                        ? 'هل أنت متأكد من إنهاء جميع الجلسات النشطة الأخرى؟ سيتم تسجيل الخروج فوراً من جميع المتصفحات والأجهزة المتصلة بحساب التاجر الخاص بك.'
                                        : 'Are you sure you want to terminate all other active sessions? You will be immediately logged out from all browsers and devices connected to your merchant account.'}
                                </p>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setIsWarningOpen(false)}
                                        className="flex-1 py-3.5 px-4 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-bold text-sm"
                                    >
                                        {language === 'ar' ? 'تراجع' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={handleTerminateAll}
                                        className="flex-1 py-3.5 px-4 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all font-bold shadow-lg shadow-red-500/20 text-sm active:scale-95"
                                    >
                                        {language === 'ar' ? 'إنهاء الجميع' : 'Sign Out All'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="p-5 bg-gold-500/5 border border-gold-500/10 rounded-2xl flex items-start gap-4">
                <div className="p-2 bg-gold-500/10 rounded-lg text-gold-500">
                    <ShieldCheck size={20} />
                </div>
                <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gold-500 uppercase tracking-widest">
                        {language === 'ar' ? 'نصيحة أمنية' : 'Security Advice'}
                    </h4>
                    <p className="text-xs text-white/50 leading-relaxed">
                        {language === 'ar' 
                            ? 'نوصي بإنهاء أي جلسة غير معروفة وتغيير كلمة المرور بشكل دوري لضمان أمان متجرك وبيانات الشحن والمدفوعات.' 
                            : 'We recommend terminating any unrecognized sessions and periodically changing your password to ensure the security of your store, shipping data, and payments.'}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};
