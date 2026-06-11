
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, Clock, ChevronRight, ChevronLeft, FileText, 
  UploadCloud, Send, ShieldCheck, User, MessageSquare, Scale, CheckCircle2, X,
  FileIcon, FileImage, FileStack, Trash2, Gavel, History
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { Badge } from '../../ui/Badge';
import { useResolutionStore } from '../../../stores/useResolutionStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { ShippingPaymentCard } from '../resolution/ShippingPaymentCard';
import { useShippingPaymentReturn } from '../../../utils/useShippingPaymentReturn';

interface MerchantDisputeDetailsProps {
  caseId: string;
  onBack: () => void;
}

export const MerchantDisputeDetails: React.FC<MerchantDisputeDetailsProps> = ({ caseId, onBack }) => {
  const { t, language } = useLanguage();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ChevronLeft : ChevronRight;
  
  const { getCaseById, respondToCase, escalateCase, fetchMerchantCases } = useResolutionStore();
  const { addNotification } = useNotificationStore();
  const dispute = getCaseById(caseId);

  useEffect(() => {
    fetchMerchantCases(true);
  }, [caseId, fetchMerchantCases]);

  useShippingPaymentReturn(true, 'merchant');

  const [response, setResponse] = useState('');
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [timeLeft, setTimeLeft] = useState<{h: number, m: number} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const calcTimeLeft = (deadlineStr: string) => {
    const diff = new Date(deadlineStr).getTime() - new Date().getTime();
    if (diff <= 0) return { h: 0, m: 0 };
    return {
      h: Math.floor(diff / (1000 * 60 * 60)),
      m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    };
  };

  // Timer Logic: Countdown to Auto-Escalation
  useEffect(() => {
    if (!dispute) return;
    // Initial calculation to prevent flicker
    setTimeLeft(calcTimeLeft(dispute.deadline));
    const interval = setInterval(() => {
      setTimeLeft(calcTimeLeft(dispute.deadline));
    }, 60000);
    return () => clearInterval(interval);
  }, [dispute]);

  if (!dispute) return <div className="p-8 text-center text-white">Case not found</div>;

  const handleManualEscalate = async () => {
    setIsEscalating(true);
    await escalateCase(dispute.id);
    
    addNotification({
        type: 'dispute',
        titleKey: 'disputeUpdate',
        message: isAr
          ? `تم تصعيد النزاع #${dispute.id} للإدارة يدوياً.`
          : `Dispute #${dispute.id} manually escalated to administration.`,
        orderId: Number(dispute.orderId),
        linkTo: 'resolution',
        priority: 'high'
    });
    
    setIsEscalating(false);
    setShowEscalateModal(false);
    onBack();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      // Validate size (10MB) and count (5 max)
      const validFiles = newFiles.filter((f: File) => f.size <= 10 * 1024 * 1024);
      if (validFiles.length !== newFiles.length) {
        addNotification({
          type: 'alert',
          titleKey: 'error',
          message: isAr ? 'بعض الملفات تتجاوز الحد الأقصى (10 ميجابايت)' : 'Some files exceed the 10MB limit',
          priority: 'high'
        });
      }
      setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // 2026 Enhanced Validation Logic
    if (!decision || !response.trim() || selectedFiles.length === 0) {
      setShowValidationErrors(true);
      addNotification({
        type: 'alert',
        titleKey: 'error',
        message: isAr ? 'يجب إكمال جميع الحقول وإرفاق الأدلة للمتابعة' : 'All fields and evidence are required to proceed',
        priority: 'high'
      });
      // Sound or Haptic feedback could be triggered here in a mobile environment
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Secure Backend Upload (Bypasses Frontend RLS using NestJS Service Role Key)
      await respondToCase(dispute.id, dispute.type, {
        text: response,
        acceptedReturn: decision === 'APPROVE',
        evidence: selectedFiles // Passing files to be handled by backend
      });

      addNotification({
          type: 'dispute',
          titleKey: 'disputeUpdate',
          message: isAr
            ? `تم إرسال ردك على النزاع #${dispute.id}.`
            : `Response submitted for Dispute #${dispute.id}.`,
          orderId: Number(dispute.orderId),
          linkTo: 'resolution',
          priority: 'normal'
      });

      onBack();
    } catch (error: any) {
      addNotification({
        type: 'alert',
        titleKey: 'error',
        message: isAr ? 'فشل إرسال الرد، يرجى المحاولة لاحقاً' : 'Failed to submit response, please try again',
        priority: 'high'
      });
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUrgencyColor = () => {
    if (!timeLeft) return 'text-white';
    if (timeLeft.h < 4) return 'text-red-500 animate-pulse';
    if (timeLeft.h < 24) return 'text-orange-500';
    return 'text-green-400';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
      
      {/* Top Navigation & Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group">
          <ArrowIcon size={18} className={`transition-transform ${isAr ? 'group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
          <span>{isAr ? 'العودة للمركز' : 'Back to Center'}</span>
        </button>
        
           <div className="flex items-center gap-4 bg-[#151310] px-4 py-2 rounded-xl border border-white/10">
           {dispute.adminApproval && (
             <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border shadow-lg mr-4
                ${dispute.adminApproval === 'APPROVED' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                <Gavel size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">{isAr ? 'حكم إداري نهائي' : 'OFFICIAL ADMIN VERDICT'}</span>
             </div>
           )}
           <div className="text-right">
              <span className="block text-[10px] text-white/40 uppercase tracking-wider">{isAr ? 'التصعيد التلقائي خلال' : 'Auto-Escalation In'}</span>
               {timeLeft ? (
                <div className={`flex items-center gap-2 font-mono font-bold ${getUrgencyColor()}`}>
                   <Clock size={14} />
                   {timeLeft.h}h {timeLeft.m}m
                </div>
              ) : dispute.status === 'ESCALATED' ? (
                <span className="text-xs text-red-500 font-bold uppercase">{isAr ? 'تم التصعيد للإدارة' : 'ESCALATED TO ADMIN'}</span>
              ) : (
                <div className="flex items-center gap-2 text-white/20 animate-pulse">
                  <Clock size={14} />
                  <span className="text-[10px] font-mono">--h --m</span>
                </div>
              )}
           </div>
           <div className="h-8 w-px bg-white/10" />
           <div className="text-right">
              <span className="block text-[10px] text-white/40 uppercase tracking-wider">{isAr ? 'رقم القضية' : 'Case ID'}</span>
              <span className="font-mono font-bold text-gold-400">{dispute.id}</span>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* LEFT: Customer Claim */}
        <div className="space-y-6">
           <GlassCard className="bg-[#1A1814] border-red-500/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
              
              <div className="flex items-start justify-between mb-6">
                 <div>
                    <h2 className="text-lg font-bold text-white mb-1">{isAr ? 'تفاصيل شكوى العميل' : 'Customer Claim Details'}</h2>
                    <div className="flex items-center gap-2 text-xs text-white/50">
                       <User size={12} />
                       <span>{isAr ? 'كود العميل' : 'Customer Code'}: {dispute.customerId.split('-')[0]}</span>
                    </div>
                 </div>
                 <div className="bg-red-500/10 text-red-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
                    <Scale size={14} />
                    {isAr ? (t.dashboard.merchant.resolution.reasons[dispute.reason.toLowerCase()] || dispute.reason) : dispute.reason.toUpperCase()}
                 </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-6">
                 <p className="text-sm text-white/80 leading-relaxed italic">
                    "{dispute.description}"
                 </p>
              </div>

              <div className="space-y-2">
                 <span className="text-xs text-white/40 uppercase tracking-wider">{isAr ? 'الأدلة المرفقة' : 'Attached Evidence'}</span>
                  <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                     {dispute.customerEvidence && dispute.customerEvidence.length > 0 ? (
                        dispute.customerEvidence.map((url, i) => (
                           <div key={i} className="w-32 h-32 rounded-2xl bg-black/40 border border-white/10 overflow-hidden shrink-0 group/img relative">
                              <img 
                                 src={url} 
                                 alt={`Evidence ${i+1}`} 
                                 className="w-full h-full object-cover opacity-60 group-hover/img:opacity-100 transition-all duration-500" 
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-all cursor-pointer">
                                 <FileText className="text-white" size={24} />
                              </div>
                           </div>
                        ))
                     ) : (
                        <div className="w-full py-8 bg-white/5 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 opacity-30">
                           <X size={24} />
                           <span className="text-[10px] font-black uppercase tracking-widest">{isAr ? 'لا توجد مرفقات' : 'No Evidence Uploaded'}</span>
                        </div>
                     )}
                  </div>
              </div>
           </GlassCard>

           <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
              <ShieldCheck className="text-blue-400 shrink-0" size={20} />
              <p className="text-xs text-blue-200/70 leading-relaxed">
                 {isAr 
                   ? 'جميع البيانات الحساسة للعميل مشفرة لحماية الخصوصية. يرجى التواصل فقط من خلال المنصة.'
                   : 'Customer sensitive data is masked for privacy. Please communicate only through the platform.'}
              </p>
           </div>
        </div>

        {/* RIGHT: Merchant Response Form */}
        <div className="relative">
           {dispute.adminApproval ? (
              <GlassCard className="h-full bg-black/40 border-gold-500/20 relative overflow-hidden flex flex-col">
                 {/* 2026 Admin Verdict Header */}
                 <div className={`p-8 border-b border-white/5 flex items-center justify-between
                    ${dispute.adminApproval === 'APPROVED' ? 'bg-green-500/[0.03]' : 'bg-red-500/[0.03]'}`}>
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-500 border border-gold-500/20">
                          <Gavel size={24} />
                       </div>
                       <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">{isAr ? 'الحكم الإداري النهائي' : 'FINAL ADMIN RULING'}</h3>
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                             <span className="text-[10px] text-white/40 font-mono">CASE_AUTHORIZED_SECURE</span>
                          </div>
                       </div>
                    </div>
                    <Badge variant={dispute.adminApproval === 'APPROVED' ? 'green' : 'red'} className="px-4 py-1.5 text-[10px] uppercase">
                       {dispute.adminApproval === 'APPROVED' ? (isAr ? 'تمت الموافقة' : 'APPROVED') : (isAr ? 'تم الرفض' : 'REJECTED')}
                    </Badge>
                 </div>

                 <div className="p-8 flex-1 space-y-8">
                    {/* Rationale Section */}
                    <div className="space-y-3">
                       <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{isAr ? 'موجز الحكم الإداري' : 'OFFICIAL RATIONALE'}</span>
                       <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 italic text-sm text-white/80 leading-relaxed shadow-inner">
                          "{dispute.adminApprovalReason || (isAr ? 'تم اتخاذ القرار بناءً على الأدلة والسياسات المتبعة.' : 'Decision reached based on provided evidence and platform integrity protocols.')}"
                       </div>
                    </div>

                    {/* Financial & Responsibility Hub */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-2">
                          <span className="text-[9px] font-black text-white/20 uppercase">{isAr ? 'تحديد المسؤولية' : 'Liability Assigned'}</span>
                          <div className="text-md font-black text-gold-500 flex items-center gap-2">
                             <ShieldCheck size={16} />
                             {dispute.faultParty || 'ADMIN_DETERMINED'}
                          </div>
                          <p className="text-[8px] text-white/30 leading-tight uppercase font-bold">
                             {isAr ? 'هذا القرار نهائي بناءً على معايير المنصة' : 'Verdict final based on platform standards'}
                          </p>
                       </div>
                       <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-2">
                          <span className="text-[9px] font-black text-white/20 uppercase">{isAr ? 'الأثر المالي' : 'Financial Impact'}</span>
                          <div className="text-xl font-black text-white font-mono">
                             {dispute.adminApproval === 'APPROVED' ? (
                                <>
                                   -{Number(dispute.refundAmount || 0).toLocaleString()} <span className="text-[10px] text-red-500">SAR</span>
                                </>
                             ) : (
                                <span className="text-green-500">0.00 SAR</span>
                             )}
                          </div>
                          <p className="text-[8px] text-white/30 leading-tight uppercase font-bold">
                             {dispute.adminApproval === 'APPROVED' ? (isAr ? 'سيتم الخصم من المحفظة' : 'Deducted from balance') : (isAr ? 'لم يتم إجراء خصم' : 'No deduction applied')}
                          </p>
                       </div>
                    </div>

                    {/* Admin Signature & Verification */}
                    <div className="pt-8 border-t border-white/5 mt-auto">
                       <div className="flex flex-col items-center gap-4">
                          <div className="text-center">
                             <div className="text-signature text-3xl text-gold-500 opacity-60 mb-2 select-none">
                                {dispute.adminSignature || 'ADMIN_SIGNED'}
                             </div>
                             <div className="flex items-center gap-3">
                                <div className="h-px w-8 bg-white/10" />
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em]">{isAr ? 'معتمد إلكترونياً' : 'ELECTRONICALLY SIGNED'}</span>
                                <div className="h-px w-8 bg-white/10" />
                             </div>
                          </div>
                          
                          <div className="flex gap-4 opacity-30">
                             <div className="flex items-center gap-2 text-[9px] font-bold text-white px-3 py-1 bg-white/5 rounded-full border border-white/10">
                                <User size={10} />
                                {dispute.adminName || 'ADR-OFFICER'}
                             </div>
                             <div className="flex items-center gap-2 text-[9px] font-bold text-white px-3 py-1 bg-white/5 rounded-full border border-white/10">
                                <History size={10} />
                                {new Date(dispute.updatedAt).toLocaleDateString()}
                             </div>
                          </div>
                       </div>
                    </div>
 
                    {/* Shipping Payment Section (Phase 4) */}
                    {dispute.shippingPayee === 'MERCHANT' &&
                        Number(dispute.shippingRefund || dispute.shippingRoundtrip || 0) > 0 && (
                       <div className="pt-4 border-t border-white/5">
                           <ShippingPaymentCard
                              caseRecord={dispute as any}
                              role="MERCHANT"
                              onSuccess={() => useResolutionStore.getState().fetchMerchantCases(true)}
                           />
                       </div>
                    )}
                 </div>
              </GlassCard>
           ) : dispute.status !== 'OPEN' && dispute.status !== 'AWAITING_MERCHANT' ? (
              <GlassCard className="h-full flex flex-col items-center justify-center text-center p-12 bg-gold-500/5 border-gold-500/20">
                 <div className="w-20 h-20 bg-gold-500/10 rounded-full flex items-center justify-center text-gold-500 mb-6">
                    <Clock size={40} className="animate-pulse" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">{isAr ? 'الشكوى قيد المراجعة' : 'Claim Under Review'}</h3>
                 <p className="text-white/50 max-w-xs mx-auto mb-6">
                    {isAr 
                      ? 'تم استلام ردك بنجاح. يقوم فريق الإدارة الآن بمراجعة الأدلة المقدمة من كافة الأطراف.'
                      : 'Your response has been received. The administration team is currently reviewing evidence from all parties.'}
                 </p>
                 <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-black text-white/30 uppercase tracking-widest">
                    <ShieldCheck size={14} className="text-cyan-400" />
                    {isAr ? 'المراجعة الإدارية نشطة' : 'ADMIN REVIEW ACTIVE'}
                 </div>
              </GlassCard>
           ) : (
              <GlassCard className="h-full flex flex-col bg-[#151310] border-gold-500/20">
                 <div className="mb-6">
                    <h2 className="text-lg font-bold text-white mb-2">{isAr ? 'رد التاجر' : 'Your Response'}</h2>
                    <p className="text-xs text-white/50">
                       {isAr 
                         ? 'يرجى تقديم توضيح مفصل أو قبول طلب الإرجاع لحل النزاع ودياً قبل التصعيد.' 
                         : 'Please provide a detailed explanation or accept the return to resolve amicably before escalation.'}
                    </p>
                 </div>

                  <div className="flex-1 space-y-4">
                    {/* Decision Buttons */}
                    <div className={`grid grid-cols-2 gap-4 rounded-2xl transition-all duration-500 ${showValidationErrors && !decision ? 'ring-2 ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] bg-red-500/5' : ''}`}>
                       <div 
                          onClick={() => { setDecision('APPROVE'); setShowValidationErrors(false); }}
                          className={`
                             p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden
                             ${decision === 'APPROVE' 
                                ? 'bg-green-500/10 border-green-500/50' 
                                : 'bg-white/5 border-white/10 hover:bg-white/10'}
                          `}
                       >
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${decision === 'APPROVE' ? 'bg-green-500 border-green-500 text-white' : 'border-white/30'}`}>
                             {decision === 'APPROVE' && <CheckCircle2 size={16} />}
                          </div>
                          <div>
                             <h4 className="font-bold text-white text-[12px]">{isAr ? 'الموافقة على الإرجاع والصلح' : 'Accept Return & Resolve'}</h4>
                             <p className="text-[9px] text-white/40 leading-tight">{isAr ? 'سيتم إصدار بوليصة إرجاع للعميل فوراً' : 'Return waybill will be issued immediately'}</p>
                          </div>
                       </div>

                       <div 
                          onClick={() => { setDecision('REJECT'); setShowValidationErrors(false); }}
                          className={`
                             p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden
                             ${decision === 'REJECT' 
                                ? 'bg-red-500/10 border-red-500/50' 
                                : 'bg-white/5 border-white/10 hover:bg-white/10'}
                          `}
                       >
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${decision === 'REJECT' ? 'bg-red-500 border-red-500 text-white' : 'border-white/30'}`}>
                             {decision === 'REJECT' && <X size={16} />}
                          </div>
                          <div>
                             <h4 className="font-bold text-white text-[12px]">{isAr ? 'رفض الإرجاع' : 'Reject Return'}</h4>
                             <p className="text-[9px] text-white/40 leading-tight">{isAr ? 'سيتم مراجعة دفاعك من قبل الإدارة' : 'Decision will be reviewed by admin'}</p>
                          </div>
                       </div>
                    </div>

                     {/* Dynamic Decision Warnings (Phase 2) */}
                     <AnimatePresence mode="wait">
                        {decision === 'APPROVE' && (
                           <motion.div
                              key="approve-warning"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                           >
                              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 flex gap-3 text-left mb-4">
                                 <AlertTriangle size={18} className="text-green-500 shrink-0 mt-0.5" />
                                 <div className="flex-1">
                                    <h5 className="text-[11px] font-bold text-green-500 mb-1">
                                       {isAr ? 'ماذا سيحدث الآن؟' : 'What happens next?'}
                                    </h5>
                                    <p className="text-[10px] text-white/60 leading-relaxed">
                                       {isAr 
                                         ? 'بمجرد الموافقة، سنقوم بإصدار بوليصة شحن للعميل آلياً. بعد استلامك للمنتج وفحصه، يمكنك تأكيد استرداد الأموال للعميل.' 
                                         : 'Upon approval, a return waybill will be automatically generated for the customer. Once you receive and inspect the item, you can confirm the final refund.'}
                                    </p>
                                 </div>
                              </div>
                           </motion.div>
                        )}

                        {decision === 'REJECT' && (
                           <motion.div
                              key="reject-warning"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                           >
                              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex gap-3 text-left mb-4">
                                 <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                 <div className="flex-1">
                                    <h5 className={`text-[11px] font-bold text-red-500 mb-1 ${isAr ? 'text-right' : 'text-left'}`}>
                                       {isAr ? 'تنبيه هـام' : 'Important Note'}
                                    </h5>
                                    <p className={`text-[10px] text-white/60 leading-relaxed ${isAr ? 'text-right' : 'text-left'}`}>
                                       {isAr 
                                         ? 'يجب كتابة سبب الرفض بوضوح وإرفاق الأدلة اللازمة. قد يقوم العميل بطلب "تصعيد" القضية للإدارة للمراجعة النهائية في حال عدم الاقتناع بالسبب.' 
                                         : 'A clear reason for rejection and supporting evidence must be provided. The customer may escalate the case to administration for final review if the reason is unsatisfactory.'}
                                    </p>
                                 </div>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>

                    {/* Defense Text */}
                    <div>
                       <label className="block text-xs text-white/60 mb-2 uppercase tracking-wider">
                          {isAr ? 'التوضيح / الدفاع' : 'Explanation / Defense'}
                       </label>
                       <textarea 
                          value={response}
                          onChange={(e) => { setResponse(e.target.value); setShowValidationErrors(false); }}
                          className={`w-full bg-white/5 border rounded-xl p-4 text-white text-sm outline-none resize-none h-40 placeholder-white/20 transition-all duration-500 ${showValidationErrors && !response.trim() ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] ring-2 ring-red-500/20' : 'border-white/10 focus:border-gold-500'}`}
                          placeholder={isAr ? 'اكتب تفاصيل ردك هنا...' : 'Write your detailed response here...'}
                       />
                    </div>

                     {/* Evidence Upload */}
                     <div className="space-y-4">
                        <input 
                           type="file" 
                           ref={fileInputRef}
                           onChange={handleFileSelect}
                           multiple 
                           accept="image/*,application/pdf,video/*"
                           className="hidden" 
                        />
                        <div 
                           onClick={() => { fileInputRef.current?.click(); setShowValidationErrors(false); }}
                           className={`border border-dashed rounded-xl p-4 flex items-center justify-center gap-3 text-white/40 hover:text-gold-400 hover:border-gold-500/30 hover:bg-white/5 cursor-pointer transition-all duration-500 ${showValidationErrors && selectedFiles.length === 0 ? 'border-red-500 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.4)] ring-2 ring-red-500/20' : 'border-white/10'}`}
                        >
                           <UploadCloud size={20} className={showValidationErrors && selectedFiles.length === 0 ? 'text-red-400' : ''} />
                           <span className={`text-xs font-bold ${showValidationErrors && selectedFiles.length === 0 ? 'text-red-400' : ''}`}>{isAr ? 'إرفاق صور أو مستندات دفاعية' : 'Attach Supporting Evidence'}</span>
                        </div>

                        {/* Selected Files Gallery */}
                        <AnimatePresence>
                           {selectedFiles.length > 0 && (
                              <motion.div 
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0, y: 10 }}
                                 className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                              >
                                 {selectedFiles.map((file, idx) => (
                                    <div key={idx} className="group relative bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 hover:bg-white/10 transition-colors">
                                       <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center text-gold-400 shrink-0">
                                          {file.type.startsWith('image/') ? <FileImage size={20} /> : <FileText size={20} />}
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <p className="text-[10px] text-white font-bold truncate">{file.name}</p>
                                          <p className="text-[9px] text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                       </div>
                                       <button 
                                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                          className="p-1.5 bg-black/20 hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded-md transition-all"
                                          title={isAr ? 'حذف' : 'Remove'}
                                       >
                                          <X size={14} />
                                       </button>
                                    </div>
                                 ))}
                              </motion.div>
                           )}
                        </AnimatePresence>
                     </div>
                 </div>

                  <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap justify-between items-center gap-4">
                     <button 
                        onClick={() => setShowEscalateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-300 active:scale-95 shadow-lg shadow-red-500/5"
                     >
                        <Scale size={14} />
                        {isAr ? 'تصعيد للادارة' : 'Escalate to Admin'}
                     </button>

                     <div className="flex gap-3">
                        <button 
                           onClick={onBack}
                           className="px-6 py-3 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors text-sm font-bold"
                        >
                           {isAr ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button 
                           onClick={handleSubmit}
                           disabled={isSubmitting}
                           className="px-8 py-3 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-black rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-gold-500/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                           {isSubmitting ? (
                              <div className="flex items-center gap-2">
                                 <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                 <span>{isAr ? 'جاري الرفع...' : 'Uploading...'}</span>
                              </div>
                           ) : (
                              <>
                                 <Send size={16} />
                                 {isAr ? 'إرسال الرد' : 'Send Response'}
                              </>
                           )}
                        </button>
                     </div>
                  </div>
              </GlassCard>
           )}
        </div>

      </div>

      {/* Manual Escalation Warning Modal */}
      <AnimatePresence>
         {showEscalateModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowEscalateModal(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md"
               />
               <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-md bg-[#1A1814] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
               >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0" />
                  
                  <div className="flex flex-col items-center text-center gap-6">
                     <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                        <AlertTriangle size={40} />
                     </div>
                     
                     <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">{isAr ? 'هل أنت متأكد من التصعيد؟' : 'Confirm Manual Escalation'}</h3>
                        <p className="text-sm text-white/50 leading-relaxed">
                           {isAr 
                              ? 'عند تصعيد النزاع، سيتم سحب الصلاحيات من التاجر والعميل وسيتم تحويل المراجعة إلى فريق فض النزاعات بالإدارة لإصدار حكم نهائي وغير قابل للنقاش.'
                              : 'By escalating, you transfer full control to the administration. A final, non-negotiable verdict will be issued by the dispute team.'}
                        </p>
                     </div>

                     <div className="grid grid-cols-2 gap-3 w-full mt-4">
                        <button 
                           onClick={() => setShowEscalateModal(false)}
                           className="py-4 rounded-2xl bg-white/5 text-white/60 hover:text-white font-bold transition-all"
                        >
                           {isAr ? 'تراجع' : 'Back'}
                        </button>
                        <button 
                           onClick={handleManualEscalate}
                           disabled={isEscalating}
                           className="py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                        >
                           {isEscalating ? <Clock className="animate-spin" size={18} /> : (isAr ? 'نعم، تصعيد الآن' : 'Yes, Escalate Now')}
                        </button>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
};
