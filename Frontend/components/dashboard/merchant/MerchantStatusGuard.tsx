
import React, { useEffect, useRef, useState } from 'react';
import { useVendorStore } from '../../../stores/useVendorStore';
import { GlassCard } from '../../ui/GlassCard';
import { 
  ShieldAlert, Lock, Clock, XCircle, ChevronRight, 
  UserPlus, MessageCircle, Mail, Phone, Info, CheckCircle2 
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { SITE_CONTACT_EMAIL } from '../../../config/site';

interface MerchantStatusGuardProps {
  children: React.ReactNode;
}

export const MerchantStatusGuard: React.FC<MerchantStatusGuardProps> = ({ children }) => {
  const vendorStatus = useVendorStore(state => state.vendorStatus);
  const storeRejectionReason = useVendorStore(state => state.storeRejectionReason);
  const fetchVendorProfile = useVendorStore(state => state.fetchVendorProfile);
  
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  // Determine if we should show the full-screen loader
  // We only show it if the status is IDLE (no cached data found)
  const [initialLoadRunning, setInitialLoadRunning] = useState(vendorStatus === 'IDLE');
  const fetchLock = useRef(false);

  useEffect(() => {
    // Only fetch if not already in progress
    if (fetchLock.current) return;
    fetchLock.current = true;

    // Trigger silent sync or initial fetch
    fetchVendorProfile()
      .finally(() => {
        setInitialLoadRunning(false);
        fetchLock.current = false;
      });
  }, [fetchVendorProfile]);

  // Show spinner ONLY during the truly initial load (status === 'IDLE')
  if (initialLoadRunning && vendorStatus === 'IDLE') {
    return (
      <div className="fixed inset-0 bg-[#0F0E0C] flex flex-col items-center justify-center z-50">
        <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gold-400/60 font-medium animate-pulse">
          {isAr ? 'جاري تحميل بيانات المتجر...' : 'Loading store data...'}
        </p>
      </div>
    );
  }

  const renderPendingReview = () => (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0F0E0C]">
      {/* Blurred Dashboard Content */}
      <div className="filter blur-[20px] pointer-events-none opacity-30 h-full fixed inset-0">
        {children}
      </div>

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto custom-scrollbar py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <GlassCard className="p-6 md:p-10 border-gold-500/20 shadow-2xl relative overflow-hidden bg-black/60 backdrop-blur-xl">
            {/* Background Aesthetic Glows */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold-500/5 blur-[100px] rounded-full" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gold-500/5 blur-[100px] rounded-full" />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 bg-gold-500/10 rounded-2xl flex items-center justify-center mb-6 border border-gold-500/20 shadow-[0_0_30px_rgba(184,134,11,0.1)]">
                  <Clock size={40} className="text-gold-500 animate-pulse" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white text-center mb-4 tracking-tight">
                  {isAr ? 'حسابك قيد المراجعة' : 'Account Under Review'}
                </h2>
                <div className="h-1 w-20 bg-gradient-to-r from-transparent via-gold-500 to-transparent rounded-full" />
              </div>

              {/* Core Message */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 text-center">
                <p className="text-white/80 text-base md:text-lg leading-relaxed">
                  {isAr 
                    ? 'تم استلام بيانات متجرك بنجاح، وجاري الآن تدقيقها من قبل فريق التحقق. نحرص على التأكد من صحة البيانات لضمان جودة وثقة جميع المتاجر داخل المنصة.'
                    : 'Your store data has been successfully received and is now being audited by our verification team. We ensure data accuracy to maintain quality and trust for all stores on the platform.'
                  }
                </p>
              </div>

              {/* Grid Content: Duration & Alert */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {/* Duration */}
                <div className="bg-white/5 border border-white/5 rounded-xl p-5">
                   <div className="flex items-center gap-3 mb-3 text-gold-500">
                      <Clock size={18} />
                      <span className="font-bold text-sm uppercase tracking-wider">{isAr ? 'مدة المراجعة' : 'Review Duration'}</span>
                   </div>
                   <p className="text-white/60 text-sm leading-relaxed">
                      {isAr 
                        ? 'عادةً تستغرق المراجعة من 24 إلى 72 ساعة عمل وسيتم إشعارك فور الانتهاء عبر البريد الإلكتروني.'
                        : 'Review typically takes 24 to 72 business hours. You will be notified via email once complete.'
                      }
                   </p>
                </div>

                {/* Important Alert */}
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-5">
                   <div className="flex items-center gap-3 mb-3 text-amber-500">
                      <Info size={18} />
                      <span className="font-bold text-sm uppercase tracking-wider">{isAr ? 'تنبيه مهم' : 'Important Note'}</span>
                   </div>
                   <p className="text-white/60 text-sm leading-relaxed">
                      {isAr 
                        ? 'في حال وجود نقص في البيانات، سيتم التواصل معك مباشرة عبر وسائل الاتصال المسجلة بحسابك.'
                        : 'In case of missing data, you will be contacted directly via the contact details registered on your account.'
                      }
                   </p>
                </div>
              </div>

              {/* Support Channels */}
              <div className="border-t border-white/10 pt-8 mb-8">
                <h4 className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] text-center mb-6">
                  {isAr ? 'الدعم والتواصل' : 'Support & Contact'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <a href="https://wa.me/966525700525" target="_blank" className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-gold-500/10 hover:border-gold-500/20 transition-all group">
                    <div className="w-10 h-10 bg-[#25D366]/10 rounded-xl flex items-center justify-center group-hover:bg-[#25D366]/20 transition-colors">
                      <MessageCircle size={20} className="text-[#25D366]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 font-bold uppercase">{isAr ? 'واتساب الدعم' : 'WhatsApp Support'}</p>
                      <p className="text-sm text-white font-mono">+966 52 570 0525</p>
                    </div>
                  </a>

                  <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-gold-500/10 hover:border-gold-500/20 transition-all group">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <Mail size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 font-bold uppercase">{isAr ? 'البريد الإلكتروني' : 'Email Support'}</p>
                      <p className="text-sm text-white font-mono">{SITE_CONTACT_EMAIL}</p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Closing Message */}
              <div className="flex items-center justify-center gap-3 text-white/40 italic text-sm text-center">
                <CheckCircle2 size={16} className="text-gold-500/40" />
                <p>
                  {isAr 
                    ? 'نشكرك على انضمامك لمنصتنا، ونتطلع لبدء شراكة ناجحة معك قريبًا'
                    : 'Thank you for joining our platform; we look forward to starting a successful partnership with you soon.'
                  }
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );

  const renderOverlay = (Icon: any, title: string, desc: string, variant: 'gold' | 'red' = 'gold', fullBlock: boolean = true) => (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Blurred Dashboard Content */}
      <div className="filter blur-[12px] pointer-events-none opacity-40 transition-all duration-700 h-full">
        {children}
      </div>

      {/* Lock Overlay - FIXED POSITION TO COVER EVERYTHING */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-[4px]">
        <motion.div
           initial={{ opacity: 0, scale: 0.95, y: 10 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           transition={{ duration: 0.3 }}
           className="w-full max-w-lg"
        >
          <GlassCard className={`p-8 md:p-12 text-center border-${variant === 'gold' ? 'gold' : 'red'}-500/20 shadow-2xl relative overflow-hidden`}>
            {/* Background Glow */}
            <div className={`absolute -top-24 -left-24 w-48 h-48 bg-${variant === 'gold' ? 'gold' : 'red'}-500/10 blur-[80px] rounded-full`} />
            
            <div className={`w-24 h-24 bg-${variant === 'gold' ? 'gold' : 'red'}-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-${variant === 'gold' ? 'gold' : 'red'}-500/20 rotate-3`}>
              <Icon size={48} className={`text-${variant === 'gold' ? 'gold' : 'red'}-500 -rotate-3`} />
            </div>

            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
              {title}
            </h2>
            
            <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-sm mx-auto">
              {desc}
            </p>

            {fullBlock && (
               <div className="flex flex-col gap-4">
                  <div className="h-px bg-white/10 w-full mb-2" />
                  <p className="text-white/40 text-sm">
                    {isAr ? 'سيتم إشعارك فور تحديث حالة حسابك' : 'You will be notified as soon as your status is updated'}
                  </p>
               </div>
            )}
            
            {vendorStatus === 'REJECTED' && (
               <motion.button
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
                 onClick={() => window.location.href = '/auth/merchant-register'}
                 className="w-full mt-6 py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition-all"
               >
                 <UserPlus size={20} />
                 {isAr ? 'إنشاء حساب جديد بمستندات صحيحة' : 'Create New Account with Correct Documents'}
               </motion.button>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );

  // 1. PENDING_REVIEW / PENDING_DOCUMENTS
  if (vendorStatus === 'PENDING_REVIEW' || vendorStatus === 'PENDING_DOCUMENTS') {
    return renderPendingReview();
  }

  // 2. REJECTED
  if (vendorStatus === 'REJECTED') {
    return renderOverlay(
        XCircle,
        isAr ? 'تم رفض طلب الانضمام' : 'Membership Request Rejected',
        isAr 
          ? `عذراً، لم نتمكن من قبول طلبك. السبب: ${storeRejectionReason || 'المستندات المرفوعة غير مطابقة للمواصفات'}`
          : `Sorry, we couldn't accept your request. Reason: ${storeRejectionReason || 'Uploaded documents do not meet specifications'}`,
        "red",
        false
    );
  }

  // 3. SUSPENDED
  if (vendorStatus === 'SUSPENDED') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="max-w-md w-full text-center p-10 border-red-500/20 bg-red-900/5">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <ShieldAlert size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
             {isAr ? 'الحساب معلق' : 'Account Suspended'}
          </h2>
          <p className="text-white/60 leading-relaxed">
            {isAr 
              ? 'لقد تم تعليق حسابك مؤقتاً لمخالفة سياسات المنصة. يرجى التواصل مع الدعم الفني.'
              : 'Your account has been temporarily suspended for violating platform policies. Please contact support.'
            }
          </p>
        </GlassCard>
      </div>
    );
  }

  // 4. BLOCKED
  if (vendorStatus === 'BLOCKED') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="max-w-md w-full text-center p-10 border-red-500/20 bg-black shadow-[0_0_50px_rgba(255,0,0,0.1)]">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-white/30 border border-white/10">
            <Lock size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
             {isAr ? 'تم حظر الحساب' : 'Account Blocked'}
          </h2>
          <p className="text-white/60 leading-relaxed">
            {isAr 
              ? 'تم حظر هذا الحساب بشكل نهائي من قبل الإدارة. لم تعد قادراً على استخدام منصة إي تشليح.'
              : 'This account has been permanently blocked by administration. You are no longer able to use E-Tashleh platform.'
            }
          </p>
        </GlassCard>
      </div>
    );
  }

  // 5. ACTIVE or LICENSE_EXPIRED (Partial Access)
  if (vendorStatus === 'ACTIVE' || vendorStatus === 'LICENSE_EXPIRED') {
    return <>{children}</>;
  }

  // 6. Security Fallback: If status is still IDLE or unknown (e.g. network failure / 401)
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <GlassCard className="max-w-md w-full text-center p-10 border-red-500/20 bg-black shadow-[0_0_50px_rgba(255,0,0,0.1)]">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500/50 border border-white/10">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">
            {isAr ? 'خطأ في المصادقة' : 'Authentication Error'}
        </h2>
        <p className="text-white/60 leading-relaxed mb-6">
          {isAr 
            ? 'تعذر التحقق من حالة حساب التاجر. يرجى تسجيل الدخول مجدداً أو المحاولة لاحقاً.'
            : 'Could not verify merchant account status. Please login again or try later.'
          }
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl font-bold transition-all"
        >
          {isAr ? 'العودة للرئيسية' : 'Return to Home'}
        </button>
      </GlassCard>
    </div>
  );
};
