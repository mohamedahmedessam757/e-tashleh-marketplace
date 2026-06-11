import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe2, Smartphone, Monitor, LogOut, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { useProfileStore } from '../../../../stores/useProfileStore';
import { useLanguage } from '../../../../contexts/LanguageContext';

export const SecurityTab: React.FC = () => {
    const { sessions, terminateSession, terminateAllSessions, detectCurrentSession } = useProfileStore();
    const { t, language } = useLanguage();
    const [isWarningOpen, setIsWarningOpen] = useState(false);

    useEffect(() => {
        detectCurrentSession();
    }, []);

    const handleTerminateAll = () => {
        terminateAllSessions();
        setIsWarningOpen(false);
    };

    return (
        <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">

            <div className="h-px bg-white/10" />

            {/* Active Sessions Section */}
            <div>
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Globe2 size={20} className="text-gold-500" />
                    {t.dashboard.profile.security.activeSessions}
                </h3>

                <div className="space-y-3">
                    {sessions.length > 0 ? sessions.map(session => (
                        <div key={session.id} className="p-4 rounded-xl border border-white/5 bg-[#151310] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${session.device.toLowerCase().includes('phone') ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                    {session.device.toLowerCase().includes('phone') ? <Smartphone size={20} /> : <Monitor size={20} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white text-sm">{session.device}</span>
                                        {session.isCurrent && (
                                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
                                                {t.dashboard.profile.security.thisDevice || 'This Device'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-white/40 mt-1 flex flex-wrap items-center gap-2">
                                        <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider">{session.os}</span>
                                        <span>•</span>
                                        <span className="text-gold-200/60">{session.location === 'Unknown Location' && language === 'ar' ? 'موقع غير معروف' : session.location}</span>
                                        <span>•</span>
                                        <span className="font-mono text-[10px] bg-black/20 px-1.5 py-0.5 rounded border border-white/5">{session.ip}</span>
                                        <span>•</span>
                                        <span className="whitespace-nowrap italic opacity-60">
                                            {language === 'ar' ? 'نشط منذ: ' : 'Active: '}
                                            {new Date(session.lastActive).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {!session.isCurrent && (
                                <button
                                    onClick={() => terminateSession(session.id)}
                                    className="p-2 hover:bg-red-500/10 text-white/30 hover:text-red-500 rounded-lg transition-colors text-xs"
                                >
                                    {t.dashboard.profile.security.terminate}
                                </button>
                            )}
                        </div>
                    )) : (
                        <div className="text-center py-6 text-white/30">
                            {language === 'ar' ? 'جاري تحميل الجلسات...' : 'Loading sessions...'}
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <button
                        onClick={() => setIsWarningOpen(true)}
                        className="w-full py-4 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut size={18} />
                        {t.dashboard.profile.security.terminateAll}
                    </button>
                </div>
            </div>

            {/* Terminate All Confirmation Modal */}
            <AnimatePresence>
                {isWarningOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#1A1814] w-full max-w-md rounded-2xl border border-red-500/20 overflow-hidden shadow-2xl shadow-red-900/20"
                        >
                            <div className="p-6">
                                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                                    <AlertCircle size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    {language === 'ar' ? 'إنهاء جميع الجلسات النشطة' : 'Terminate All Active Sessions'}
                                </h3>
                                <p className="text-white/60 text-sm mb-6 leading-relaxed">
                                    {language === 'ar'
                                        ? 'سيتم تسجيل خروجك فوراً من جميع الأجهزة المتصلة بحسابك (بما في ذلك الحواسيب، والهواتف، وتطبيقات الجوال) باستثناء هذا الجهاز الذي تستخدمه الآن. هل أنت متأكد من تنفيذ هذا الإجراء الأمني؟'
                                        : 'You will be immediately logged out from all devices connected to your account (including computers, tablets, and mobile apps) EXCEPT this current device. Are you sure you want to take this security action?'}
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsWarningOpen(false)}
                                        className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-bold"
                                    >
                                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={handleTerminateAll}
                                        className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-bold shadow-lg shadow-red-500/20"
                                    >
                                        {language === 'ar' ? 'تسجيل الخروج من البقية' : 'Sign Out All'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-xl flex items-center gap-3">
                <ShieldCheck size={20} className="text-green-500" />
                <span className="text-xs text-green-200/70">
                    {t.dashboard.profile.security.secureNote}
                </span>
            </div>

        </motion.div>
    );
};
