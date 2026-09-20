import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Share2, Copy, CheckCircle2, Clock, UserPlus, Star,
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ReferralShareDestinations, buildReferralUrl } from './ReferralShareDestinations';

interface ReferralHubCardProps {
    referralCode: string;
    referralCount: number;
    activeReferrals: number;
}

/**
 * Premium Referral Hub — brand SVG share destinations + invite sheet.
 */
export const ReferralHubCard: React.FC<ReferralHubCardProps> = ({
    referralCode,
    referralCount,
    activeReferrals,
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const [copied, setCopied] = useState(false);
    const [sharingError, setSharingError] = useState<string | null>(null);
    const [shareSheetOpen, setShareSheetOpen] = useState(false);

    const referralUrl = useMemo(() => buildReferralUrl(referralCode), [referralCode]);

    const handleCopy = async () => {
        if (!referralUrl) return;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(referralUrl);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = referralUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (e) {
            console.error('Clipboard copy failed', e);
            setSharingError(isAr ? 'فشل النسخ، يرجى المحاولة يدوياً' : 'Copy failed, please try manually');
            setTimeout(() => setSharingError(null), 3000);
        }
    };

    return (
        <GlassCard className="p-6 sm:p-8 border-blue-500/20 relative group bg-gradient-to-br from-blue-600/[0.08] via-transparent to-transparent overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-[100px] pointer-events-none transition-all duration-700 group-hover:bg-blue-500/20" />
            <div className="absolute bottom-0 left-0 p-24 bg-cyan-500/5 rounded-full -ml-12 -mb-12 blur-[80px] pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
                <div className="space-y-1">
                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Share2 size={14} className="animate-pulse" />
                        {t.dashboard.profile.loyalty.referral.title}
                    </h3>
                    <p className="text-white/60 text-xs font-medium">
                        {isAr ? 'شارك النجاح مع أصدقائك واحصل على مكافآت فورية' : 'Share success and earn instant rewards'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="px-4 py-1.5 bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-md">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block leading-none mb-1">
                            {t.dashboard.profile.loyalty.referral.totalLabel}
                        </span>
                        <span className="text-lg font-black text-gold-500 leading-none">
                            {referralCount}
                        </span>
                    </div>
                    <div className="px-4 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl backdrop-blur-md">
                        <span className="text-[10px] font-bold text-emerald-500/40 uppercase tracking-widest block leading-none mb-1">
                            {isAr ? 'النشطة' : 'ACTIVE'}
                        </span>
                        <span className="text-lg font-black text-emerald-400 leading-none">
                            {activeReferrals}
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-6 relative z-10">
                <div className="relative group/input">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-cyan-500/20 to-blue-500/30 rounded-2xl opacity-0 group-hover/input:opacity-100 transition-opacity duration-500 blur-md" />
                    <div className="relative flex items-center bg-[#0a0a0a]/80 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
                        <div className="flex-1 px-5 py-4 overflow-hidden">
                            <span className="text-[11px] font-mono font-bold text-blue-400/90 whitespace-nowrap overflow-hidden text-ellipsis block">
                                {referralUrl || '---'}
                            </span>
                        </div>
                        <button
                            onClick={handleCopy}
                            disabled={!referralUrl}
                            className="px-6 py-4 bg-white/[0.05] hover:bg-white/[0.1] text-white/40 hover:text-blue-400 transition-all border-l border-white/10 active:scale-95 disabled:opacity-30"
                            title={isAr ? 'نسخ الرابط' : 'Copy link'}
                        >
                            <AnimatePresence mode="wait">
                                {copied ? (
                                    <motion.div key="check" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                                        <CheckCircle2 size={20} className="text-emerald-400" />
                                    </motion.div>
                                ) : (
                                    <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                        <Copy size={20} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShareSheetOpen(true)}
                    disabled={!referralUrl}
                    className="group/btn w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] relative overflow-hidden shadow-2xl transition-all duration-300 bg-blue-600 text-white shadow-blue-600/40 disabled:opacity-40"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_2s_infinite]" />
                    <div className="relative flex items-center justify-center gap-3">
                        <UserPlus size={18} />
                        <span>{isAr ? 'دعوة صديق الآن' : 'INVITE FRIEND NOW'}</span>
                    </div>
                </motion.button>

                <ReferralShareDestinations
                    referralCode={referralCode}
                    isAr={isAr}
                    variant="row"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-blue-400">
                            <Star size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{isAr ? 'المكافأة' : 'REWARD'}</span>
                        </div>
                        <p className="text-[11px] text-white/70 leading-relaxed font-bold">
                            {t.dashboard.profile.loyalty.referral.commissionNote}
                        </p>
                    </div>
                    <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-gold-500">
                            <Clock size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{isAr ? 'الصلاحية' : 'VALIDITY'}</span>
                        </div>
                        <p className="text-[11px] text-white/70 leading-relaxed font-bold">
                            {t.dashboard.profile.loyalty.referral.windowNote}
                        </p>
                    </div>
                </div>

                <AnimatePresence>
                    {sharingError && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="absolute bottom-4 left-4 right-4 bg-rose-500 text-white p-3 rounded-xl text-[10px] font-black text-center z-50 shadow-2xl"
                        >
                            {sharingError}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="pt-6 relative">
                    <div className="absolute top-[42px] left-[10%] right-[10%] h-[2px] bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: referralCount > 0 ? (referralCount > 5 ? '100%' : '50%') : '0%' }}
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                        />
                    </div>
                    <div className="relative flex justify-between">
                        {[
                            { icon: Share2, label: isAr ? 'شارك' : 'SHARE', active: true },
                            { icon: UserPlus, label: isAr ? 'انضمام' : 'JOIN', active: referralCount > 0 },
                            { icon: Star, label: isAr ? 'اربح' : 'EARN', active: referralCount > 5 },
                        ].map((step, i) => (
                            <div key={i} className="flex flex-col items-center gap-3 w-1/3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${
                                    step.active
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                                        : 'bg-white/5 border-white/5 text-white/20'
                                }`}>
                                    <step.icon size={16} />
                                </div>
                                <span className={`text-[8px] font-black tracking-widest ${step.active ? 'text-blue-400' : 'text-white/20'}`}>
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <ReferralShareDestinations
                referralCode={referralCode}
                isAr={isAr}
                variant="sheet"
                isOpen={shareSheetOpen}
                onClose={() => setShareSheetOpen(false)}
            />
        </GlassCard>
    );
};
