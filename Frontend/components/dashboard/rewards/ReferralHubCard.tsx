import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Share2, Copy, CheckCircle2, Clock, UserPlus, Star,
    MessageCircle, Send, Mail, Share, AtSign, Users
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';

interface ReferralHubCardProps {
    referralCode: string;
    referralCount: number;
    activeReferrals: number;
}

/**
 * Premium Referral Hub 2026 Edition
 * 
 * Enhancements:
 * - Ultra-responsive visual feedback for copy actions.
 * - Dynamic brand gradients for social share buttons.
 * - Robust fallback for the "More" button on desktop.
 * - Premium Glassmorphism and micro-animations.
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

    const referralUrl = useMemo(() => {
        if (!referralCode) return '';
        // In 2026, we ensure the URL is clean and safe
        const base = window.location.origin;
        return `${base}/register?ref=${encodeURIComponent(referralCode)}`;
    }, [referralCode]);

    const shareText = useMemo(() => {
        const baseAr = `انضم إلى E-TASHLEH وابدأ تجربة تسوق ذكية. سجل من خلال رابطي:`;
        const baseEn = `Join E-TASHLEH for a smart shopping experience. Sign up using my link:`;
        return isAr ? baseAr : baseEn;
    }, [isAr]);

    const fullShareMessage = useMemo(
        () => `${shareText} ${referralUrl}`,
        [shareText, referralUrl]
    );

    const handleCopy = async () => {
        if (!referralUrl) return;
        try {
            // Robust clipboard logic with fallback
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(referralUrl);
            } else {
                // Fallback for non-secure contexts or older environments
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

    const handleNativeShare = async () => {
        if (!referralUrl) return;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'E-TASHLEH',
                    text: shareText,
                    url: referralUrl,
                });
            } catch (e) {
                // User cancelled or share failed — handle gracefully
                if ((e as Error).name !== 'AbortError') {
                    handleCopy(); // Fallback to copy if it's a real error
                }
            }
        } else {
            // Enhanced desktop fallback: copy + visual toast
            handleCopy();
        }
    };

    const shareButtons = useMemo(() => {
        if (!referralUrl) return [];

        const enc = encodeURIComponent;
        return [
            {
                id: 'whatsapp',
                label: 'WhatsApp',
                icon: MessageCircle,
                href: `https://wa.me/?text=${enc(fullShareMessage)}`,
                gradient: 'from-[#25D366] to-[#128C7E]',
                shadow: 'shadow-[#25D366]/20',
            },
            {
                id: 'telegram',
                label: 'Telegram',
                icon: Send,
                href: `https://t.me/share/url?url=${enc(referralUrl)}&text=${enc(shareText)}`,
                gradient: 'from-[#0088cc] to-[#006699]',
                shadow: 'shadow-[#0088cc]/20',
            },
            {
                id: 'twitter',
                label: 'X / Twitter',
                icon: AtSign,
                href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(referralUrl)}`,
                gradient: 'from-[#000000] to-[#333333]',
                shadow: 'shadow-white/10',
                border: 'border-white/10',
            },
            {
                id: 'facebook',
                label: 'Facebook',
                icon: Users,
                href: `https://www.facebook.com/sharer/sharer.php?u=${enc(referralUrl)}`,
                gradient: 'from-[#1877F2] to-[#0C59CF]',
                shadow: 'shadow-[#1877F2]/20',
            },
            {
                id: 'email',
                label: 'Email',
                icon: Mail,
                href: `mailto:?subject=${enc('E-TASHLEH')}&body=${enc(fullShareMessage)}`,
                gradient: 'from-[#EA4335] to-[#C5221F]',
                shadow: 'shadow-[#EA4335]/20',
            },
            {
                id: 'more',
                label: isAr ? 'المزيد' : 'More',
                icon: Share,
                onClick: handleNativeShare,
                gradient: 'from-[#EAB308] to-[#CA8A04]',
                shadow: 'shadow-yellow-500/30',
                textColor: 'text-black',
            },
        ];
    }, [referralUrl, fullShareMessage, shareText, isAr]);

    return (
        <GlassCard className="p-6 sm:p-8 border-blue-500/20 relative group bg-gradient-to-br from-blue-600/[0.08] via-transparent to-transparent overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-[100px] pointer-events-none transition-all duration-700 group-hover:bg-blue-500/20" />
            <div className="absolute bottom-0 left-0 p-24 bg-purple-500/5 rounded-full -ml-12 -mb-12 blur-[80px] pointer-events-none" />

            {/* Header Section */}
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
                {/* Modern Copy Link Bar */}
                <div className="relative group/input">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-blue-500/30 rounded-2xl opacity-0 group-hover/input:opacity-100 transition-opacity duration-500 blur-md" />
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

                {/* Big Invite CTA Button */}
                <motion.button
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopy}
                    disabled={!referralUrl}
                    className={`group/btn w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] relative overflow-hidden shadow-2xl transition-all duration-300 ${
                        copied 
                            ? 'bg-emerald-500 text-black shadow-emerald-500/40' 
                            : 'bg-blue-600 text-white shadow-blue-600/40'
                    }`}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_2s_infinite]" />
                    <div className="relative flex items-center justify-center gap-3">
                        <AnimatePresence mode="wait">
                            {copied ? (
                                <motion.div key="ok" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                                    <CheckCircle2 size={18} />
                                </motion.div>
                            ) : (
                                <motion.div key="share" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                                    <UserPlus size={18} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <span>
                            {copied ? (isAr ? 'تم النسخ بنجاح' : 'LINK COPIED!') : (isAr ? 'دعوة صديق الآن' : 'INVITE FRIEND NOW')}
                        </span>
                    </div>
                </motion.button>

                {/* Social Share Row - Compact & Premium 2026 Style */}
                <div className="flex flex-wrap items-center justify-center gap-4 py-2">
                    {shareButtons.map((btn) => {
                        const Component = btn.href ? 'a' : 'button';
                        const props = btn.href 
                            ? { href: btn.href, target: "_blank", rel: "noopener noreferrer" }
                            : { onClick: btn.onClick };

                        return (
                            <motion.div
                                key={btn.id}
                                whileHover={{ scale: 1.15, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                                className="relative group/share"
                            >
                                <div className={`absolute -inset-1.5 bg-gradient-to-br ${btn.gradient} rounded-full blur-md opacity-0 group-hover/share:opacity-50 transition-all duration-300`} />
                                <Component
                                    {...props as any}
                                    className={`relative w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br ${btn.gradient} ${btn.shadow} ${btn.border || 'border-transparent'} border-2 transition-all overflow-hidden shadow-xl`}
                                    title={btn.label}
                                >
                                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/share:opacity-100 transition-opacity" />
                                    <btn.icon size={26} className={`relative z-10 ${btn.textColor || 'text-white'} group-hover/share:scale-110 transition-transform`} />
                                </Component>
                                
                                {/* Tooltip label */}
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-md text-[8px] font-black text-white opacity-0 group-hover/share:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 tracking-widest z-20">
                                    {btn.label}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Notes & Commissions */}
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

                {/* Sharing Error Toast Fallback */}
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

                {/* Visual Roadmap (Simplified) */}
                <div className="pt-6 relative">
                    <div className="absolute top-[42px] left-[10%] right-[10%] h-[2px] bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: referralCount > 0 ? (referralCount > 5 ? '100%' : '50%') : '0%' }}
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
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
        </GlassCard>
    );
};
