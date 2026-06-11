import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, Clock, ChevronRight, ChevronLeft, FileText, 
  UploadCloud, Send, ShieldCheck, User, MessageSquare, Scale, CheckCircle2, X,
  Package, Store, History, Gavel, Search, Loader2, ArrowRight
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { Button } from '../../ui/Button';
import { useResolutionStore } from '../../../stores/useResolutionStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Badge } from '../../ui/Badge';
import { ShippingPaymentCard } from '../resolution/ShippingPaymentCard';

interface CustomerDisputeDetailsProps {
  caseId: string;
  onBack: () => void;
  onNavigate?: (path: string, id?: any) => void;
}

// 48H Countdown Component for 2026 Standards
const CountdownTimer: React.FC<{ targetDate: string, isAr: boolean }> = ({ targetDate, isAr }) => {
  const [timeLeft, setTimeLeft] = useState<{h: number, m: number, s: number} | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) return null;

      return {
        h: Math.floor(diff / (1000 * 60 * 60)),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((diff % (1000 * 60)) / 1000)
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 1000);

    setTimeLeft(calculateTime());
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-1.5 font-mono text-gold-500 font-black">
      <span className="bg-gold-500/10 px-1.5 py-0.5 rounded border border-gold-500/20">{String(timeLeft.h).padStart(2, '0')}</span>
      <span className="text-gold-500/40 animate-pulse">:</span>
      <span className="bg-gold-500/10 px-1.5 py-0.5 rounded border border-gold-500/20">{String(timeLeft.m).padStart(2, '0')}</span>
      <span className="text-gold-500/40 animate-pulse">:</span>
      <span className="bg-gold-500/10 px-1.5 py-0.5 rounded border border-gold-500/20">{String(timeLeft.s).padStart(2, '0')}</span>
    </div>
  );
};

export const CustomerDisputeDetails: React.FC<CustomerDisputeDetailsProps> = ({ caseId, onBack, onNavigate }) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ChevronLeft : ChevronRight;
  
  const { getCaseById } = useResolutionStore();
  const dispute = getCaseById(caseId);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!dispute) return (
    <div className="p-20 text-center">
      <Loader2 className="animate-spin text-gold-500 mx-auto mb-4" size={40} />
      <p className="text-white/40 font-black tracking-tight">
        {isAr ? 'جاري فحص بيانات الحالة...' : 'Analyzing Case Intelligence...'}
      </p>
    </div>
  );

  const steps = [
    { key: 'REQUESTED', icon: Send, label: t.dashboard.resolution.statusTimeline?.requested || 'Requested' },
    { key: 'AWAITING_MERCHANT', icon: Store, label: t.dashboard.resolution.statusTimeline?.awaiting_merchant || 'Merchant Review' },
    { key: 'UNDER_REVIEW', icon: ShieldCheck, label: t.dashboard.resolution.statusTimeline?.under_review || 'Admin Oversight' },
    { key: 'RESOLVED', icon: Gavel, label: t.dashboard.resolution.statusTimeline?.resolved || 'Final Verdict' }
  ];

  const currentStepIndex = 
    dispute.status === 'RESOLVED' || dispute.status === 'REFUNDED' ? 3 :
    dispute.status === 'UNDER_REVIEW' || dispute.status === 'AWAITING_ADMIN' || dispute.status === 'ESCALATED' ? 2 :
    dispute.status === 'AWAITING_MERCHANT' || dispute.status === 'OPEN' ? 1 : 0;

  const showCountdown = (dispute.status === 'AWAITING_MERCHANT' || dispute.status === 'OPEN');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <button onClick={onBack} className="flex items-center gap-3 text-white/40 hover:text-gold-400 transition-all group font-black tracking-tight text-sm uppercase">
          <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10 group-hover:border-gold-500/50">
            <ArrowIcon size={20} />
          </div>
          {t.dashboard.resolution.details.back}
        </button>
        
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-xl shrink-0">
           {dispute.adminApproval && (
             <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border shadow-lg
                ${dispute.adminApproval === 'APPROVED' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                <ShieldCheck size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">{dispute.adminApproval === 'APPROVED' ? (isAr ? 'قرار إيجابي' : 'POSITIVE RULING') : (isAr ? 'قرار نهائي' : 'FINAL RULING')}</span>
             </div>
           )}
           {showCountdown && (
             <div className="px-4 py-2 text-right">
              <span className="block text-[9px] text-white/30 uppercase font-black mb-1">
                {isAr ? 'التصعيد التلقائي خلال' : 'Auto-Escalation In'}
              </span>
              <CountdownTimer targetDate={dispute.deadline} isAr={isAr} />
             </div>
           )}
        </div>
      </div>

      {/* Status Timeline */}
      <GlassCard className="p-8 border-white/5 overflow-hidden relative">
         <div className="absolute inset-0 bg-gold-500/[0.01] pointer-events-none" />
         <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
            {steps.map((step, idx) => (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-3 group">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-500
                      ${idx <= currentStepIndex 
                         ? 'bg-gold-500/10 border-gold-500 text-gold-400 shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                         : 'bg-white/5 border-white/10 text-white/20'}`}>
                      <step.icon size={22} />
                   </div>
                   <div className="text-center">
                      <div className={`text-[10px] font-black uppercase tracking-tight ${idx <= currentStepIndex ? 'text-gold-400' : 'text-white/20'}`}>
                        {step.label}
                      </div>
                   </div>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`hidden md:block flex-1 h-[1px] rounded-full mx-2 transition-all duration-1000
                    ${idx < currentStepIndex ? 'bg-gold-500 shadow-[0_0_8px_#D4AF37]' : 'bg-white/5'}`} />
                )}
              </React.Fragment>
            ))}
         </div>
      </GlassCard>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
           <GlassCard className="p-8 space-y-8 border-white/5 relative group">
              <div className="flex items-center gap-6">
                 <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform duration-500 shrink-0">
                    <Package size={40} className="text-white/20 group-hover:text-gold-500 transition-colors" />
                 </div>
                 <div>
                     <h4 className="text-[10px] font-black text-gold-500 uppercase tracking-tight mb-1">{dispute.type === 'dispute' ? (isAr ? 'نزاع' : 'Dispute') : (isAr ? 'إرجاع' : 'Return')}</h4>
                     <h2 className="text-3xl font-black text-white tracking-tight uppercase leading-tight">{dispute.partName}</h2>
                     <p className="text-white/40 text-[12px] font-bold flex items-center gap-2 mt-1">
                       {t.dashboard.resolution.details.orderRef}: <span className="text-gold-500/70">#{dispute.orderNumber}</span>
                       <span className="w-1 h-1 rounded-full bg-white/10" />
                       {new Date(dispute.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                     </p>
                 </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 py-6 border-y border-white/5">
                 <div className="space-y-1">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-tight">{t.dashboard.resolution.details.primaryReason}</span>
                    <div className="text-md font-black text-white">
                      {(t.dashboard.resolution.reasons as any)[dispute.reason] || dispute.reason}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-tight">{t.dashboard.resolution.details.merchantEntity}</span>
                    <div className="text-md font-black text-cyan-400 flex items-center gap-2">
                       <Store size={16} />
                       {dispute.merchantName}
                       <span className="text-[10px] bg-cyan-500/10 px-2 py-0.5 rounded text-cyan-500/70 border border-cyan-500/20">{dispute.storeCode || 'N/A'}</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 <span className="text-[10px] font-black text-white/30 uppercase tracking-tight">{t.dashboard.resolution.details.statement}</span>
                 <div className="bg-white/5 rounded-2xl p-6 border border-white/10 italic text-white/80 leading-relaxed font-medium text-sm">
                    "{dispute.description}"
                 </div>
              </div>

              {dispute.customerEvidence && dispute.customerEvidence.length > 0 && (
                <div className="space-y-4">
                   <span className="text-[10px] font-black text-white/30 uppercase tracking-tight">{t.dashboard.resolution.details.evidence}</span>
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {dispute.customerEvidence.map((img, i) => (
                        <motion.div 
                          key={i} 
                          whileHover={{ scale: 1.02 }}
                          onClick={() => setSelectedImage(img)}
                          className="aspect-square bg-white/5 rounded-2xl border border-white/10 overflow-hidden group/img relative cursor-zoom-in"
                        >
                           <img src={img} alt="Evidence" className="w-full h-full object-cover opacity-60 group-hover/img:opacity-100 transition-all duration-500" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-all">
                              <Search className="text-white" size={20} />
                           </div>
                        </motion.div>
                      ))}
                   </div>
                </div>
              )}
            </GlassCard>

            {/* Merchant Response Section (2026 Phase 4 Transparency) */}
            {dispute.merchantResponse && (
               <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <GlassCard className="p-8 space-y-8 border-cyan-500/10 bg-cyan-500/[0.02] relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 bg-cyan-500/10 rounded-bl-3xl border-l border-b border-cyan-500/10 flex items-center gap-2">
                        <Store size={14} className="text-cyan-400" />
                        <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">{isAr ? 'رد المتجر الرسمي' : 'OFFICIAL STORE RESPONSE'}</span>
                     </div>

                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
                           <MessageSquare className="text-cyan-400" size={32} />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-white tracking-tight uppercase">{isAr ? 'توضيح من المتجر' : 'Store Explanation'}</h3>
                           <p className="text-[10px] text-cyan-400/60 font-bold uppercase tracking-tight">
                              {isAr ? 'تم الرد في' : 'Submitted on'} {new Date(dispute.merchantResponse.submittedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                           </p>
                        </div>
                     </div>

                     <div className="bg-white/5 rounded-2xl p-6 border border-white/10 relative">
                        <div className="absolute -top-3 left-6 px-3 py-1 bg-[#151310] border border-white/10 rounded-lg">
                           <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{isAr ? 'البيان' : 'STATEMENT'}</span>
                        </div>
                        <p className="text-white/80 leading-relaxed font-medium text-sm italic">
                           "{dispute.merchantResponse.text}"
                        </p>
                     </div>

                     {dispute.merchantResponse.evidence && dispute.merchantResponse.evidence.length > 0 && (
                        <div className="space-y-4">
                           <div className="flex items-center gap-2">
                              <Search size={14} className="text-white/20" />
                              <span className="text-[10px] font-black text-white/30 uppercase tracking-tight">{isAr ? 'الأدلة المقدمة من التاجر' : 'MERCHANT EVIDENCE ASSETS'}</span>
                           </div>
                           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              {dispute.merchantResponse.evidence.map((img, i) => (
                                 <motion.div 
                                    key={i} 
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => setSelectedImage(img)}
                                    className="aspect-square bg-white/5 rounded-2xl border border-white/10 overflow-hidden relative cursor-zoom-in group/mimg"
                                 >
                                    <img src={img} alt="Merchant Evidence" className="w-full h-full object-cover opacity-60 group-hover/mimg:opacity-100 transition-all duration-700" />
                                    <div className="absolute inset-0 bg-cyan-500/20 opacity-0 group-hover/mimg:opacity-100 transition-all flex items-center justify-center">
                                       <Search className="text-white" size={20} />
                                    </div>
                                 </motion.div>
                              ))}
                           </div>
                        </div>
                     )}
                  </GlassCard>
               </motion.div>
            )}

            {/* 2026 Logistics Hub: Shipping Payment Status (CUSTOMER VIEW) */}
            <ShippingPaymentCard 
                caseRecord={dispute} 
                role="CUSTOMER" 
            />
         </div>

        {/* Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-6">
           {/* Final Decision Panel: Elevated 2026 Admin Transparency */}
           {(dispute.adminApproval) && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <GlassCard className={`p-8 border-none relative overflow-hidden shadow-3xl
                   ${dispute.adminApproval === 'APPROVED' ? 'bg-green-500/[0.04]' : 'bg-red-500/[0.04]'}`}>
                   
                   {/* Background Decorative Element */}
                   <div className={`absolute -right-10 -top-10 w-40 h-40 blur-[80px] rounded-full 
                      ${dispute.adminApproval === 'APPROVED' ? 'bg-green-500/10' : 'bg-red-500/10'}`} />
                   
                   <div className="flex items-center justify-between mb-8 relative z-10">
                      <div className="flex items-center gap-4">
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl
                            ${dispute.adminApproval === 'APPROVED' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            <Gavel size={28} />
                         </div>
                         <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">{t.dashboard.resolution.details.verdict}</h3>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">{isAr ? 'قرار لجنة فض النزاعات' : 'ADR COMMITTEE RULING'}</p>
                         </div>
                      </div>
                      <Badge variant={dispute.adminApproval === 'APPROVED' ? 'green' : 'red'} className="px-5 py-2 text-[10px] font-black uppercase">
                         {dispute.adminApproval === 'APPROVED' ? (isAr ? 'تم قبول الطلب' : 'REQUEST APPROVED') : (isAr ? 'تم رفض الطلب' : 'REQUEST REJECTED')}
                      </Badge>
                   </div>

                   <div className="space-y-8 relative z-10">
                      <div className="p-8 bg-black/40 rounded-[32px] border border-white/5 space-y-4">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gold-500 uppercase tracking-[0.2em]">{t.dashboard.resolution.details.conclusion}</span>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                               <ShieldCheck size={12} className="text-cyan-400" />
                               <span className="text-[9px] font-black text-white/40 uppercase font-mono tracking-widest">S-AUTH: {dispute.id.substring(0,6)}</span>
                            </div>
                         </div>
                         <p className="text-sm font-bold text-white/90 leading-relaxed italic">
                            "{dispute.adminApprovalReason || (isAr ? 'لم يتم ذكر سبب إضافي.' : 'No additional rationale provided.')}"
                         </p>
                      </div>

                      {/* Fault and Responsibility Hub */}
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5">
                            <span className="text-[9px] font-black text-white/20 uppercase block mb-1">{isAr ? 'الطرف المتسبب' : 'Fault Party'}</span>
                            <div className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-gold-400 shadow-[0_0_8px_#fbbf24]" />
                               {dispute.faultParty || 'OFFICIAL_REVIEW'}
                            </div>
                         </div>
                         <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5">
                            <span className="text-[9px] font-black text-white/20 uppercase block mb-1">{isAr ? 'تاريخ التنفيذ' : 'Execution Date'}</span>
                            <div className="text-xs font-black text-white uppercase tracking-tight">
                               {new Date(dispute.updatedAt).toLocaleDateString()}
                            </div>
                         </div>
                      </div>

                      {/* Official Digital Signature */}
                      <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-4">
                         <div className="text-center">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] block mb-4">{isAr ? 'توقيع المسؤول الإداري' : 'OFFICIAL ADMIN SIGNATURE'}</span>
                            <div className="font-signature text-3xl text-gold-500/80 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)] transform -rotate-2">
                               {dispute.adminSignature || 'ADMIN_SIGNED_PROTOCOL'}
                            </div>
                         </div>
                         <div className="flex items-center gap-4 px-4 py-2 bg-white/5 rounded-xl border border-white/5 opacity-40">
                            <div className="text-center px-4 border-r border-white/10 last:border-0">
                               <div className="text-[8px] font-black text-white/40 uppercase mb-0.5">{isAr ? 'اسم المسؤول' : 'OFFICER NAME'}</div>
                               <div className="text-[10px] font-bold text-white">{dispute.adminName || 'ADR-SYSTEM'}</div>
                            </div>
                            <div className="text-center px-4 border-r border-white/10 last:border-0">
                               <div className="text-[8px] font-black text-white/40 uppercase mb-0.5">{isAr ? 'البريد الرسمي' : 'OFFICIAL EMAIL'}</div>
                               <div className="text-[10px] font-bold text-white">{dispute.adminEmail || 'admin@marketplace.gov'}</div>
                            </div>
                         </div>
                      </div>
                   </div>
                </GlassCard>

                {/* Evidence Assets from Admin (if any) */}
                {dispute.adminEvidence && dispute.adminEvidence.length > 0 && (
                  <div className="space-y-4">
                     <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block">{isAr ? 'مرفقات الإقرار الإداري' : 'ADMINISTRATIVE EVIDENCE'}</span>
                     <div className="grid grid-cols-4 gap-3">
                        {dispute.adminEvidence.map((img, i) => (
                           <motion.div 
                              key={i} 
                              whileHover={{ scale: 1.05 }}
                              onClick={() => setSelectedImage(img)}
                              className="aspect-square bg-white/5 rounded-xl border border-white/10 overflow-hidden cursor-zoom-in relative group"
                           >
                              <img src={img} alt="Admin Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                 <Search className="text-white" size={16} />
                              </div>
                           </motion.div>
                        ))}
                     </div>
                  </div>
                )}
              </motion.div>
           )}

           {/* Security Standards */}
           <GlassCard className="p-6 bg-cyan-500/[0.02] border-cyan-500/20 relative group">
              <div className="flex items-center gap-3 mb-3">
                 <ShieldCheck size={18} className="text-cyan-400" />
                 <span className="text-[10px] font-black uppercase text-cyan-400">{t.dashboard.resolution.details.escrowSecurity}</span>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed font-bold uppercase">
                {t.dashboard.resolution.details.escrowDesc}
              </p>
           </GlassCard>

           {/* Case Activity Log */}
           <GlassCard className="p-8 border-white/5">
              <div className="flex items-center gap-3 mb-6">
                 <History size={18} className="text-gold-400" />
                 <h3 className="text-[10px] font-black text-white uppercase">{t.dashboard.resolution.details.activity}</h3>
              </div>
              <div className="space-y-6">
                 {[
                   { t: t.dashboard.resolution.details.opened, d: dispute.createdAt },
                   { t: t.dashboard.resolution.details.notified, d: dispute.createdAt },
                   ...(dispute.updatedAt !== dispute.createdAt ? [{ t: t.dashboard.resolution.details.update, d: dispute.updatedAt }] : [])
                 ].map((act, i) => (
                   <div key={i} className="flex gap-4 items-start pb-6 border-l border-white/10 ml-2 relative last:pb-0 last:border-0">
                      <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                      <div className="pl-4 -mt-1">
                         <div className="text-[10px] font-black text-white uppercase tracking-tight">{act.t}</div>
                         <div className="text-[9px] text-white/20 mt-1 font-mono font-bold tracking-tighter">{new Date(act.d).toLocaleString()}</div>
                      </div>
                   </div>
                 ))}
              </div>
           </GlassCard>

           {/* Contact Action - Moved to Sidebar per User Request */}
           <GlassCard className="p-6 border-gold-500/20 bg-gold-500/[0.02] space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-gold-500/10 rounded-2xl flex items-center justify-center text-gold-500 border border-gold-500/20 shrink-0">
                    <MessageSquare size={24} />
                 </div>
                 <div>
                    <h4 className="text-xs font-black text-white uppercase leading-tight mb-1">{isAr ? 'هل تحتاج لمناقشة التاجر؟' : 'Need to discuss with Merchant?'}</h4>
                    <p className="text-[9px] text-white/40 font-bold uppercase leading-relaxed">{isAr ? 'يمكنك التواصل مباشرة للوصول لحل ودي' : 'Contact the merchant directly for a faster resolution'}</p>
                 </div>
              </div>
              <Button 
                onClick={() => onNavigate?.('chats', dispute.chatId)}
                disabled={!dispute.chatId}
                className="w-full bg-gold-500 text-black font-black uppercase text-[10px] tracking-tight py-4 rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-gold-500/20 disabled:opacity-50"
              >
                {isAr ? 'فتح المحادثة الرسمية' : 'Open Official Chat'}
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Button>
           </GlassCard>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
          >
            <motion.button 
              className="absolute top-8 right-8 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
              whileHover={{ rotate: 90 }}
            >
              <X size={24} />
            </motion.button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage}
              alt="Evidence Fullscreen"
              className="max-w-full max-h-[90vh] rounded-3xl shadow-2xl border border-white/10 object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
