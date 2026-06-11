import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Store, 
  DollarSign, 
  Scale, 
  RefreshCcw, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  Package, 
  Clock, 
  ShieldCheck, 
  X, 
  Lock,
  History,
  Eye,
  Gavel,
  Activity,
  ExternalLink,
  Zap,
  ArrowUpRight,
  Users,
  Loader2,
  AlertOctagon,
  CreditCard,
  RotateCcw,
  MinusCircle,
  PlusCircle,
  Calculator
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useResolutionStore, ReturnPhase } from '../../../stores/useResolutionStore';
import { useOrderStore } from '../../../stores/useOrderStore';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { ShippingPaymentCard } from '../resolution/ShippingPaymentCard';
import { storesApi } from '../../../services/api/stores';
import { computeAdjudicationPreview } from '../../../utils/adjudicationFinancial';

interface AdminDisputeDetailsProps {
    caseId: string;
    onBack: () => void;
    onNavigate?: (path: string, id?: any) => void;
}

export const AdminDisputeDetails: React.FC<AdminDisputeDetailsProps> = ({ caseId, onBack, onNavigate }) => {
    const { t, language } = useLanguage();
    const { getCaseById, adminVerdict, updateReturnPhase, updateAdminVerdict } = useResolutionStore();
    const { getOrder, forceStatus, fetchOrder } = useOrderStore();
    const { addNotification } = useNotificationStore();

    const [isFetching, setIsFetching] = useState(false);
    const [verdictStep, setVerdictStep] = useState<1 | 2 | 3>(1);

    const [adminApproval, setAdminApproval] = useState<'APPROVED' | 'REJECTED' | null>(null);
    const [adminApprovalReason, setAdminApprovalReason] = useState('');
    const [adminEvidence, setAdminEvidence] = useState<string[]>([]);
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminSignature, setAdminSignature] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);

    const [adminNotes, setAdminNotes] = useState('');
    const [faultParty, setFaultParty] = useState<
        'CUSTOMER' | 'MERCHANT' | 'BOTH' | 'SHIPPING_COMPANY' | 'PLATFORM' | 'CLOSE_COMPLETE_REFUND'
    >('MERCHANT');
    const [shippingRefund, setShippingRefund] = useState<number>(0);
    
    // 2026 Phase 5: Financial Adjudication States
    const [gatewayFeePct, setGatewayFeePct] = useState<number>(3.00);
    const [refundFeePct, setRefundFeePct] = useState<number>(1.50);
    const [shippingRoundtrip, setShippingRoundtrip] = useState<number>(0);
    const [penaltyType, setPenaltyType] = useState<'FRAUD' | 'NEGLIGENCE' | null>(null);
    const [penaltyAmount, setPenaltyAmount] = useState<number>(50000);
    const [merchantBalance, setMerchantBalance] = useState<number | null>(null);
    
    const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);

    const dispute = getCaseById(caseId);
    const order = dispute ? getOrder(String(dispute.orderId)) : undefined;

    const isAr = language === 'ar';
    const NextIcon = isAr ? ChevronLeft : ChevronRight;
    const PrevIcon = isAr ? ChevronRight : ChevronLeft;

    const catalogOrderTotal = Number(order?.price || 0);
    const isMultiPartCase = Boolean(dispute?.orderPartId);
    const itemOfferTotal =
        dispute?.offer?.unitPrice != null
            ? Number(dispute.offer.unitPrice) + Number(dispute.offer.shippingCost || 0)
            : null;
    const orderPaidTotal =
        isMultiPartCase && itemOfferTotal != null && itemOfferTotal > 0
            ? itemOfferTotal
            : dispute?.paidTotal != null && dispute.paidTotal > 0
              ? Number(dispute.paidTotal)
              : catalogOrderTotal;
    const paymentMismatch =
        dispute?.paidTotal != null &&
        dispute.paidTotal > 0 &&
        catalogOrderTotal > 0 &&
        Math.abs(catalogOrderTotal - dispute.paidTotal) > 0.01;
    const isCloseCompleteRefund = faultParty === 'CLOSE_COMPLETE_REFUND';

    const computeFinancialBreakdown = () => {
        const preview = computeAdjudicationPreview({
            orderPaidTotal,
            gatewayFeePct,
            refundFeePct,
            shippingRoundtrip,
            faultParty,
            maxRefundable:
                dispute?.maxRefundable != null && dispute.maxRefundable >= 0
                    ? dispute.maxRefundable
                    : null,
        });
        return {
            gatewayFee: preview.gatewayFee,
            refundFee: preview.refundFee,
            net: preview.net,
            retained: preview.retained,
            platformFees: preview.platformFees,
            stripeExecutable: preview.stripeExecutable,
            stripeCapped: preview.stripeCapped,
            ...preview,
        };
    };

    const finPreview = useMemo(
        () => computeFinancialBreakdown(),
        [orderPaidTotal, gatewayFeePct, refundFeePct, shippingRoundtrip, faultParty, dispute?.maxRefundable],
    );

    const getFaultPartyLabel = (party?: string) => {
        const key = String(party || '').toUpperCase();
        if (isAr) {
            const labels: Record<string, string> = {
                MERCHANT: 'التاجر (إهمال)',
                CUSTOMER: 'العميل (إدعاء)',
                SHIPPING_COMPANY: 'شركة الشحن (إهمال)',
                CLOSE_COMPLETE_REFUND: t.admin.disputeManager.verdictTerminal.closeCompleteRefund,
            };
            return labels[key] || party || '—';
        }
        const labelsEn: Record<string, string> = {
            MERCHANT: 'Merchant (Negligence)',
            CUSTOMER: 'Customer (Claim)',
            SHIPPING_COMPANY: 'Shipping Company (Negligence)',
            CLOSE_COMPLETE_REFUND: t.admin.disputeManager.verdictTerminal.closeCompleteRefund,
        };
        return labelsEn[key] || party || '—';
    };

    useEffect(() => {
        // 2026 Real-time Adjudication Sync
        const role = 'admin';
        (window as any).currentViewRole = role;
        useResolutionStore.getState().subscribeToCases(role);

        if (dispute) {
            setShippingRefund(dispute.shippingRefund || 0);
            if (dispute.verdictNotes) setAdminNotes(dispute.verdictNotes);
            
            // Check if order exists, if not, fetch it
            if (!order && !isFetching) {
                setIsFetching(true);
                fetchOrder(String(dispute.orderId)).finally(() => setIsFetching(false));
            }
        }

        if (dispute?.merchantStoreId && merchantBalance === null) {
            storesApi.getStoreProfile(dispute.merchantStoreId).then(res => {
                setMerchantBalance(Number(res.balance || 0));
            }).catch(err => console.error("Balance fetch failed", err));
        }

        return () => {
            // Only unsubscribe if we are leaving the resolution context entirely (optional but safer)
            // useResolutionStore.getState().unsubscribeFromCases(); 
        };
    }, [dispute, order, caseId, merchantBalance]);

    if (!dispute) {
        return (
            <div className="h-[600px] flex flex-col items-center justify-center">
                <div className="text-center space-y-6">
                    <X className="w-16 h-16 text-red-500 mx-auto opacity-20" />
                    <p className="text-white font-black uppercase tracking-[0.3em]">{t.admin.disputeManager.verdictTerminal.selectCasePrompt}</p>
                    <Button onClick={onBack} variant="outline" className="border-white/10 text-white/60">
                        {t.common.actions.back}
                    </Button>
                </div>
            </div>
        );
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setIsUploading(true);
        try {
            const { storageApi } = await import('../../../services/api/storage');
            const file = e.target.files[0];
            const url = await storageApi.upload(file, 'marketplace-uploads', `admin-verdicts/${caseId}`);
            setAdminEvidence(prev => [...prev, url]);
        } catch (error) {
            console.error('Upload failed', error);
        } finally {
            setIsUploading(false);
        }
    };

    const confirmVerdict = async () => {
        if (!adminApproval || isExecuting) return;

        const verdictNotes = (adminApprovalReason || '').trim();
        if (!verdictNotes) {
            addNotification({
                type: 'SECURITY',
                titleAr: 'سبب القرار مطلوب',
                titleEn: 'Decision reason required',
                messageAr: 'يرجى كتابة سبب القرار الإداري في المرحلة الأولى قبل التنفيذ.',
                messageEn: 'Please provide the administrative decision reason in stage 1 before executing.',
                priority: 'high',
            });
            setVerdictStep(1);
            return;
        }

        if (!adminSignature?.trim() || !adminName?.trim() || !adminEmail?.trim()) {
            addNotification({
                type: 'SECURITY',
                titleAr: 'بيانات التوقيع ناقصة',
                titleEn: 'Signature details missing',
                messageAr: 'يرجى إكمال الاسم والبريد والتوقيع الرقمي قبل التنفيذ.',
                messageEn: 'Please complete name, email, and digital signature before executing.',
                priority: 'high',
            });
            return;
        }

        const breakdown = computeFinancialBreakdown();
        const { net: calculatedNetRefund, retained: platformRetainedAmount } = breakdown;

        const extra = {
            faultParty,
            platformRetainedAmount,
            feeBearer: breakdown.feeBearer,
            customerStripeRefund: breakdown.stripeExecutable,
            shippingCompanyLiability: breakdown.shippingCompanyLiability,
            resolutionMode: isCloseCompleteRefund ? 'CLOSE_COMPLETE_REFUND' : undefined,
            shippingRefund: adminApproval === 'APPROVED' ? shippingRoundtrip : 0,
            gatewayFeePct,
            refundFeePct,
            shippingRoundtrip,
            penaltyType,
            penaltyAmount: penaltyType ? penaltyAmount : 0,
            adminApproval,
            adminApprovalReason: verdictNotes,
            adminEvidence,
            adminName,
            adminEmail,
            adminSignature,
            calculatedNetRefund,
        };

        const finalVerdictType =
            adminApproval === 'APPROVED' || isCloseCompleteRefund ? 'REFUND' : 'DENY';

        const caseType = dispute.type === 'return' ? 'return' : 'dispute';

        try {
            setIsExecuting(true);

            if (dispute.verdictIssuedAt) {
                await updateAdminVerdict(dispute.id, caseType, finalVerdictType, verdictNotes, extra);
            } else {
                await adminVerdict(dispute.id, caseType, finalVerdictType, verdictNotes, extra);
            }

            onBack();

            addNotification({
                type: 'SYSTEM',
                titleAr: 'تم تنفيذ الحكم',
                titleEn: 'Verdict Executed',
                messageAr: 'تم تنفيذ الحكم الإداري وتحديث حالة النزاع والطلب بنجاح.',
                messageEn: 'Verdict executed; dispute and order status were updated successfully.',
                priority: 'normal',
            });
        } catch (error: any) {
            console.error('[ADJUDICATION_FAILURE]', error);
            addNotification({
                type: 'SECURITY',
                titleAr: 'فشل تنفيذ الحكم',
                titleEn: 'Verdict Execution Failed',
                messageAr: `لم يتم حفظ القرار: ${error?.message || 'خطأ غير معروف'}`,
                messageEn: `Verdict was not saved: ${error?.message || 'Unknown error'}`,
                priority: 'high',
            });
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4">
            
            {/* 2026 COMMAND HEADER: MULTI-ENTITY TRACEABILITY */}
            <div className="relative group" dir={isAr ? 'rtl' : 'ltr'}>
                <div className="absolute -inset-1 bg-gradient-to-r from-gold-500/10 to-cyan-500/10 rounded-[40px] blur-2xl opacity-50 transition duration-1000" />
                <GlassCard className="relative p-8 md:p-10 border-white/10 rounded-[40px] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                    <div className="flex items-start gap-6 w-full lg:w-auto">
                        <button onClick={onBack} className={`mt-2 p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-white/40 hover:text-white ${isAr ? 'rotate-180' : ''}`}>
                            <ChevronLeft size={24} />
                        </button>
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3">
                                <span 
                                    className={`px-4 py-1.5 flex items-center justify-center text-[10px] uppercase font-black tracking-[0.2em] shadow-2xl border-none rounded-xl
                                        ${(dispute.type || '').toLowerCase() === 'dispute' 
                                            ? 'bg-red-500/20 text-red-500 shadow-red-500/20 animate-pulse' 
                                            : 'bg-cyan-500/20 text-cyan-400 shadow-cyan-500/20'}`}
                                >
                                    {(t.admin.disputeManager.types as any)[(dispute.type || '').toLowerCase()] || dispute.type}
                                </span>
                                <span className="text-white/20 text-[10px] font-black uppercase tracking-widest">v4.0.2 SECURE | {t.admin.disputeManager.intelligence.verdictProtocol}</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                                {t.admin.disputeManager.caseId} <span className="text-gold-500 font-mono">#{dispute.id.substring(0, 8)}</span>
                            </h1>
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                                    <Clock size={14} className="text-white/40" />
                                    <span className="text-xs font-bold text-white/60">{new Date(dispute.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${['RESOLVED', 'REFUNDED', 'APPROVED'].includes(dispute.status) ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]'}`} />
                                    <span className="text-xs font-black text-white uppercase tracking-widest">
                                        {['AWAITING_ADMIN', 'MERCHANT_REJECTED', 'UNDER_REVIEW', 'ESCALATED'].includes(dispute.status) 
                                          ? (isAr ? 'تحت المراجعة الإدارية' : 'UNDER ADMIN REVIEW')
                                          : (t.admin.disputeManager.status as any)[(dispute.status || '').toLowerCase()] || dispute.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TRACEABILITY TERMINAL */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full lg:w-auto">
                        {[
                            { 
                                label: t.admin.disputeManager.intelligence.orderEntity, 
                                val: `#${dispute.orderNumber}`, 
                                icon: Package, 
                                color: 'gold',
                                action: () => onNavigate?.('admin-order-details', dispute.orderId)
                            },
                            { label: t.admin.disputeManager.intelligence.shipmentHub, val: dispute.shipmentId ? `#${dispute.shipmentId.substring(0, 8)}` : 'N/A', icon: Truck, color: 'cyan' },
                            { label: t.admin.disputeManager.intelligence.financialId, val: dispute.invoiceId ? `#${dispute.invoiceId.substring(0, 8)}` : 'N/A', icon: FileText, color: 'pink' }
                        ].map((item, i) => (
                            <div 
                                key={i} 
                                onClick={item.action}
                                className={`p-4 bg-black/40 border border-white/5 rounded-3xl group/term hover:border-white/20 transition-all ${item.action ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <item.icon size={12} className={`text-${item.color}-400 opacity-40`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{item.label}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-white group-hover/term:text-gold-400 transition-colors uppercase">{item.val}</span>
                                    {item.action && <ArrowUpRight size={12} className="text-white/10 group-hover/term:text-white/40" />}
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8" dir={isAr ? 'rtl' : 'ltr'}>
                
                {/* LEFT: CASE INTELLIGENCE & FINANCIALS (3 COLUMNS) */}
                <div className="xl:col-span-3 space-y-8">
                    <GlassCard className="p-8 border-gold-500/10 space-y-8">
                        <div>
                            <div className="space-y-6">
                               {/* Customer Card */}
                               <div className="flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5">
                                  <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 overflow-hidden">
                                        {dispute.customerAvatar ? (
                                          <img src={dispute.customerAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                          <Users size={20} className="text-cyan-400" />
                                        )}
                                      </div>
                                     <div className="text-right rtl:text-right overflow-hidden">
                                        <div className="text-[10px] font-black text-white/30 uppercase">{t.admin.disputeManager.intelligence.userIntegrity}</div>
                                        <div className="text-xs font-black text-white truncate max-w-[100px]">{dispute.customerName}</div>
                                     </div>
                                  </div>
                               </div>

                               {/* Merchant Card */}
                               <div className="flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5">
                                  <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-2xl bg-gold-500/10 flex items-center justify-center border border-gold-500/20 overflow-hidden">
                                        {dispute.merchantLogo ? (
                                          <img src={dispute.merchantLogo} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                          <Store size={20} className="text-gold-400" />
                                        )}
                                     </div>
                                     <div className="text-right rtl:text-right overflow-hidden">
                                        <div className="text-[10px] font-black text-white/30 uppercase">{isAr ? 'منفذ التاجر' : 'Merchant Node'}</div>
                                        <div className="text-xs font-black text-white truncate max-w-[100px]">
                                           {dispute.merchantName && dispute.merchantName !== 'Store' ? dispute.merchantName : (isAr ? 'متجر معتمد' : 'Verified Store')}
                                        </div>
                                     </div>
                                  </div>
                               </div>
                           </div>
                        </div>

                        <div className="pt-8 border-t border-white/5">
                            <h4 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">{t.admin.disputeManager.heldAmount}</h4>
                            <div className="p-6 bg-green-500/10 rounded-[32px] border border-green-500/20 relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-green-500/10 blur-3xl rounded-full transition-all group-hover:bg-green-500/20" />
                                <div className="relative z-10">
                                    <div className="text-3xl font-black text-white font-mono mb-1 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                                        {isFetching && !order ? (
                                            <div className="h-9 w-32 bg-white/10 animate-pulse rounded-lg" />
                                        ) : (
                                            <>
                                                {Number(order?.price || 0).toLocaleString()} <span className="text-xs text-green-400">AED</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-green-400/60 uppercase">
                                       <ShieldCheck size={12} />
                                       {isAr ? 'مؤمن في الخزنة' : 'Secured in Vault'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                           <Button 
                               onClick={() => onNavigate?.('admin-order-details', dispute.orderId)}
                               className="w-full py-4 bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3"
                           >
                              <FileText size={14} />
                              {t.admin.disputeManager.intelligence.originalContract}
                           </Button>
                        </div>
                    </GlassCard>
                </div>

                {/* RIGHT: COMPREHENSIVE INVESTIGATION HUB (9 COLUMNS) */}
                <div className="xl:col-span-9 space-y-8">
                    
                    {/* VISUAL INVESTIGATION LAB: SIDE-BY-SIDE 2026 HUB */}
                    <GlassCard className="p-0 border-white/10 overflow-hidden rounded-[40px] shadow-2xl shadow-black/50">
                        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                           <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                              <Eye size={18} className="text-gold-500" />
                              {t.admin.disputeManager.intelligence.visualInvestigationLab}
                           </h3>
                           <div className="flex items-center gap-4">
                              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/10">
                                 <Activity size={12} className="text-cyan-400" />
                                 <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t.admin.disputeManager.intelligence.comparison}</span>
                              </div>
                              <Badge variant="outline" className="border-white/10 text-white/30 font-black">
                                 {(dispute.customerEvidence?.length || 0) + (dispute.merchantResponse?.evidence?.length || 0)} {t.admin.disputeManager.intelligence.assets}
                              </Badge>
                           </div>
                        </div>
                        
                        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                            
                            {/* CUSTOMER DEFENSE PANEL */}
                            <div className="space-y-8">
                                <div className="flex items-center justify-between mb-2">
                                   <Badge variant="gold" className="px-4 py-1.5 shadow-gold-500/20">{t.admin.disputeManager.intelligence.customerDefense}</Badge>
                                   <div className="flex gap-2">
                                      {dispute.usageCondition && (
                                         <Badge variant="cyan" className="text-[10px] py-1">
                                            {(t.admin.disputeManager.usageConditions as any)[dispute.usageCondition] || dispute.usageCondition}
                                         </Badge>
                                      )}
                                   </div>
                                </div>

                                <div className="p-6 bg-white/[0.02] rounded-[32px] border border-white/5 space-y-4">
                                   <div>
                                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-2">{t.admin.disputeManager.intelligence.customerReason}</span>
                                      <p className="text-sm font-bold text-white/90 leading-relaxed">
                                         {(t.admin.disputeManager.reasons as any)[dispute.reason] || dispute.reason}
                                      </p>
                                   </div>
                                   <div className="pt-4 border-t border-white/5">
                                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-2">{isAr ? 'وصف المشكلة' : 'Problem Description'}</span>
                                      <p className="text-sm text-white/60 leading-relaxed italic">"{dispute.description}"</p>
                                   </div>
                                </div>

                                <div className="space-y-4">
                                   <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block">{t.admin.disputeManager.intelligence.evidenceCustomer}</span>
                                   <div className="grid grid-cols-2 gap-3">
                                      {dispute.customerEvidence && dispute.customerEvidence.length > 0 ? dispute.customerEvidence.map((img, i) => (
                                         <motion.div 
                                            key={i} 
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => setSelectedEvidence(img)}
                                            className="aspect-video bg-white/5 rounded-2xl border border-white/10 overflow-hidden cursor-zoom-in group relative"
                                         >
                                            <img src={img} alt="Customer Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                               <Eye className="text-white" size={20} />
                                            </div>
                                         </motion.div>
                                      )) : (
                                         <div className="col-span-2 py-10 bg-white/[0.02] rounded-2xl border border-dashed border-white/5 flex flex-col items-center gap-2 opacity-20">
                                            <Eye size={24} />
                                            <span className="text-[8px] font-black uppercase tracking-widest">No customer files</span>
                                         </div>
                                      )}
                                   </div>
                                </div>
                            </div>

                            {/* MERCHANT RESPONSE PANEL */}
                            <div className="space-y-8 lg:border-l lg:border-white/5 lg:pl-10">
                                <div className="flex items-center justify-between mb-2">
                                   <Badge variant="outline" className="px-4 py-1.5 shadow-2xl uppercase">
                                      {t.admin.disputeManager.intelligence.merchantResponse}
                                   </Badge>
                                   {dispute.merchantResponse && (
                                      <Badge variant={dispute.merchantResponse.acceptedReturn ? 'green' : 'red'} className="border-none text-[10px]">
                                         {dispute.merchantResponse.acceptedReturn
                                            ? t.admin.disputeManager.intelligence.merchantApprovedReturn
                                            : t.admin.disputeManager.intelligence.merchantRejectedReturn}
                                      </Badge>
                                   )}
                                </div>

                                {dispute.merchantResponse ? (
                                   <div className="space-y-8">
                                      <div className="p-6 bg-white/[0.02] rounded-[32px] border border-white/5 space-y-4">
                                         <div>
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-2">{t.admin.disputeManager.intelligence.merchantDecision}</span>
                                            <p className="text-sm font-bold text-white/90 leading-relaxed italic">"{dispute.merchantResponse.text}"</p>
                                         </div>
                                         <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-2 px-2 py-0.5 bg-cyan-500/5 rounded-md text-[8px] font-black text-cyan-400/60 border border-cyan-500/10 uppercase tracking-widest">
                                               <ShieldCheck size={10} />
                                               {t.admin.disputeManager.intelligence.signedHashVerified}
                                            </div>
                                            <span className="text-[9px] text-white/20 font-bold">
                                               {new Date(dispute.merchantResponse.submittedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                                            </span>
                                         </div>
                                      </div>

                                      <div className="space-y-4">
                                         <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block">{t.admin.disputeManager.intelligence.evidenceMerchant}</span>
                                         <div className="grid grid-cols-2 gap-3">
                                            {dispute.merchantResponse.evidence && dispute.merchantResponse.evidence.length > 0 ? dispute.merchantResponse.evidence.map((img, i) => (
                                               <motion.div 
                                                  key={i} 
                                                  whileHover={{ scale: 1.02 }}
                                                  onClick={() => setSelectedEvidence(img)}
                                                  className="aspect-video bg-white/5 rounded-2xl border border-white/10 overflow-hidden cursor-zoom-in group relative"
                                               >
                                                  <img src={img} alt="Merchant Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                     <Eye className="text-white" size={20} />
                                                  </div>
                                               </motion.div>
                                            )) : (
                                               <div className="col-span-2 py-10 bg-white/[0.02] rounded-2xl border border-dashed border-white/5 flex flex-col items-center gap-2 opacity-20">
                                                  <Store size={24} />
                                                  <span className="text-[8px] font-black uppercase tracking-widest">No merchant files</span>
                                               </div>
                                            )}
                                         </div>
                                      </div>
                                   </div>
                                ) : (
                                   <div className="h-64 bg-white/[0.01] rounded-[32px] border border-dashed border-white/5 flex flex-col items-center justify-center text-center p-8 opacity-40">
                                      <Clock size={40} className="text-gold-500 mb-4 animate-pulse" />
                                      <p className="text-xs font-black uppercase tracking-[0.2em]">{t.admin.disputeManager.intelligence.merchantSla}</p>
                                      <p className="text-[10px] text-white/40 mt-2">{isAr ? 'في انتظار رد التاجر الرسمي' : 'Awaiting official merchant response'}</p>
                                   </div>
                                )}
                            </div>
                        </div>
                    </GlassCard>

                    {/* 2026 Logistics Hub: Shipping Payment Status (ADMIN VIEW) */}
                    <ShippingPaymentCard 
                        caseRecord={dispute} 
                        role="ADMIN" 
                    />

                     {/* 2026 VERDICT TERMINAL: WIZARD OR FINAL DISPLAY */}
                    {(!dispute.verdictIssuedAt && !['APPROVED', 'REFUNDED', 'RESOLVED', 'CLOSED', 'CANCELLED'].includes(dispute.status)) ? (
                       <GlassCard className="p-10 bg-red-500/[0.03] border-red-500/20 rounded-[40px] shadow-2xl relative overflow-hidden">
                          {/* WIZARD STEPS INDICATOR */}
                          <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-8 relative z-10">
                             {[1, 2, 3].map((step) => (
                                 <div key={step} className="flex items-center gap-4 relative">
                                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-2xl ${verdictStep >= step ? 'bg-gradient-to-br from-gold-500 to-amber-600 text-black scale-105' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                                         <span className="text-xs font-black">{step}</span>
                                     </div>
                                     <div className="hidden md:block">
                                         <p className={`text-[7px] font-black uppercase tracking-[0.2em] mb-0.5 ${verdictStep >= step ? 'text-gold-500' : 'text-white/20'}`}>
                                             Stage 0{step}
                                         </p>
                                         <p className={`text-xs font-bold ${verdictStep >= step ? 'text-white' : 'text-white/40'}`}>
                                             {(t.admin.disputeManager.verdictTerminal as any)[`stepTitle_${step}`]}
                                         </p>
                                     </div>
                                     {step < 3 && <div className={`hidden lg:block w-16 h-px mx-4 ${verdictStep > step ? 'bg-gold-500/50' : 'bg-white/10'}`} />}
                                 </div>
                             ))}
                          </div>

                          {/* STEP CONTENT (WIZARD) */}
                          <div className="min-h-[400px]">
                             {verdictStep === 1 && (
                                 <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
                                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                         {/* LEFT: Decision & Reasoning */}
                                         <div className="lg:col-span-12 xl:col-span-8 space-y-8">
                                             <div className="space-y-4">
                                                 <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">1. {t.admin.disputeManager.verdictTerminal.adminApproval_APPROVED} / {t.admin.disputeManager.verdictTerminal.adminApproval_REJECTED}</label>
                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                     <button 
                                                         onClick={() => setAdminApproval('APPROVED')}
                                                         className={`p-6 rounded-3xl border flex items-center gap-6 transition-all ${adminApproval === 'APPROVED' ? 'bg-green-500/10 border-green-500/50 shadow-2xl' : 'bg-white/5 border-white/5 hover:border-white/10 opacity-60'}`}
                                                     >
                                                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${adminApproval === 'APPROVED' ? 'bg-green-500 text-black' : 'bg-white/10 text-white/40'}`}>
                                                             <CheckCircle2 size={24} />
                                                         </div>
                                                         <span className="text-lg font-black text-white">{t.admin.disputeManager.verdictTerminal.adminApproval_APPROVED}</span>
                                                     </button>
                                                     <button 
                                                         onClick={() => setAdminApproval('REJECTED')}
                                                         className={`p-6 rounded-3xl border flex items-center gap-6 transition-all ${adminApproval === 'REJECTED' ? 'bg-red-500/10 border-red-500/50 shadow-2xl' : 'bg-white/5 border-white/5 hover:border-white/10 opacity-60'}`}
                                                     >
                                                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${adminApproval === 'REJECTED' ? 'bg-red-500 text-white' : 'bg-white/10 text-white/40'}`}>
                                                             <X size={24} />
                                                         </div>
                                                         <span className="text-lg font-black text-white">{t.admin.disputeManager.verdictTerminal.adminApproval_REJECTED}</span>
                                                     </button>
                                                 </div>
                                             </div>

                                             <div className="space-y-4">
                                                 <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{t.admin.disputeManager.verdictTerminal.adminReasonLabel}</label>
                                                 <textarea 
                                                     value={adminApprovalReason}
                                                     onChange={(e) => setAdminApprovalReason(e.target.value)}
                                                     placeholder={isAr ? 'اكتب بالتفصيل أسباب قرارك الإداري...' : 'State the administrative rationale for this decision...'}
                                                     className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 text-white text-sm focus:border-gold-500/50 outline-none transition-all min-h-[120px]"
                                                 />
                                             </div>
                                         </div>

                                         {/* RIGHT: Asset Upload */}
                                         <div className="lg:col-span-12 xl:col-span-4 space-y-4">
                                             <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{t.admin.disputeManager.intelligence.assets}</label>
                                             <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[32px] space-y-6">
                                                 <div className="grid grid-cols-2 gap-3">
                                                     {adminEvidence.map((url, idx) => (
                                                         <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group shadow-xl">
                                                             <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                                                             <button 
                                                                 onClick={() => setAdminEvidence(prev => prev.filter((_, i) => i !== idx))}
                                                                 className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                                             >
                                                                 <X size={12} />
                                                             </button>
                                                         </div>
                                                     ))}
                                                     <label className={`aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-gold-500/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-white/5 group ${isUploading ? 'animate-pulse pointer-events-none' : ''}`}>
                                                         <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                                                         <Activity size={24} className={`${isUploading ? 'text-gold-500' : 'text-white/20 group-hover:text-gold-500'} transition-colors`} />
                                                         <span className="text-[8px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">{isUploading ? 'UPLOADING...' : 'ADD ASSET'}</span>
                                                     </label>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>

                                     <div className="flex justify-end pt-6 border-t border-white/5">
                                         <Button 
                                             onClick={() => setVerdictStep(2)}
                                             disabled={!adminApproval || !adminApprovalReason}
                                             className={`px-8 py-4 bg-gold-500 hover:bg-gold-400 text-black font-black uppercase tracking-widest text-[11px] rounded-xl shadow-xl shadow-gold-500/10 flex items-center gap-3 transition-all hover:translate-x-${isAr ? '[-4px]' : '[4px]'}`}
                                         >
                                             {t.common.actions.continue}
                                             <NextIcon size={16} />
                                         </Button>
                                     </div>
                                 </motion.div>
                             )}

                             {verdictStep === 2 && (
                                 <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-10">
                                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                         <div className="space-y-6">
                                             <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{t.admin.disputeManager.verdictTerminal.assignFaultParty}</label>
                                             <div className="space-y-3">
                                                 {[
                                                     { id: 'MERCHANT', label: isAr ? 'التاجر (إهمال)' : 'Merchant (Negligence)', icon: Store },
                                                     { id: 'CUSTOMER', label: isAr ? 'العميل (إدعاء)' : 'Customer (Claim)', icon: User },
                                                     { id: 'SHIPPING_COMPANY', label: t.admin.disputeManager.verdictTerminal.shippingNegligence, icon: Truck },
                                                      {
                                                          id: 'CLOSE_COMPLETE_REFUND',
                                                          label: t.admin.disputeManager.verdictTerminal.closeCompleteRefund,
                                                          icon: Lock,
                                                      },
                                                 ].map((opt: { id: string; label: string; icon: React.ElementType }) => (
                                                     <button
                                                         key={opt.id}
                                                         onClick={() => setFaultParty(opt.id as any)}
                                                         className={`w-full p-5 rounded-2xl border flex items-center justify-between transition-all ${faultParty === opt.id ? 'bg-gold-500/10 border-gold-500/40 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                                                     >
                                                         <div className="flex items-center gap-4">
                                                             <div className={`p-2 rounded-lg ${faultParty === opt.id ? 'bg-gold-500 text-black' : 'bg-white/5'}`}>
                                                                 <opt.icon size={16} />
                                                             </div>
                                                             <span className="text-xs font-bold">{opt.label}</span>
                                                         </div>
                                                         {faultParty === opt.id && <CheckCircle2 size={16} className="text-gold-500" />}
                                                     </button>
                                                 ))}
                                             </div>
                                             {isCloseCompleteRefund && (
                                                 <div className="p-4 rounded-2xl border border-gold-500/30 bg-gold-500/5">
                                                     <p className="text-[11px] font-bold text-gold-200/90 leading-relaxed">
                                                         {t.admin.disputeManager.verdictTerminal.closeCompleteRefundHint}
                                                     </p>
                                                 </div>
                                             )}
                                         </div>

                                         <div className="space-y-6">
                                         <div className="space-y-6">
                                             <div className="p-8 bg-black/40 rounded-[40px] border border-white/5 space-y-6">
                                                 <div className="flex items-center justify-between">
                                                     <div className="flex items-center gap-3">
                                                         <Calculator size={18} className="text-gold-500" />
                                                         <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{isAr ? 'حاسبة الرسوم المالية' : 'FINANCIAL FEE CALCULATOR'}</span>
                                                     </div>
                                                     <Badge variant="outline" className="text-[9px] border-gold-500/20 text-gold-500">v4.1 CALC</Badge>
                                                 </div>

                                                 <div className="space-y-4">
                                                     {/* Fee Percentage Controls */}
                                                     <div className="grid grid-cols-2 gap-4">
                                                         <div className="space-y-2">
                                                             <label className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{isAr ? 'رسوم البوابة (%)' : 'GATEWAY FEE (%)'}</label>
                                                             <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10">
                                                                 <button onClick={() => setGatewayFeePct(Math.max(0, gatewayFeePct - 0.5))} className="p-1 hover:bg-white/10 rounded-md text-white/40"><MinusCircle size={14} /></button>
                                                                 <span className="flex-1 text-center font-mono text-xs text-white">{gatewayFeePct.toFixed(1)}%</span>
                                                                 <button onClick={() => setGatewayFeePct(gatewayFeePct + 0.5)} className="p-1 hover:bg-white/10 rounded-md text-white/40"><PlusCircle size={14} /></button>
                                                             </div>
                                                         </div>
                                                         <div className="space-y-2">
                                                             <label className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{isAr ? 'رسوم الاسترداد (%)' : 'REFUND FEE (%)'}</label>
                                                             <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10">
                                                                 <button onClick={() => setRefundFeePct(Math.max(0, refundFeePct - 0.5))} className="p-1 hover:bg-white/10 rounded-md text-white/40"><MinusCircle size={14} /></button>
                                                                 <span className="flex-1 text-center font-mono text-xs text-white">{refundFeePct.toFixed(1)}%</span>
                                                                 <button onClick={() => setRefundFeePct(refundFeePct + 0.5)} className="p-1 hover:bg-white/10 rounded-md text-white/40"><PlusCircle size={14} /></button>
                                                             </div>
                                                         </div>
                                                     </div>

                                                     {/* Round-trip Shipping Control */}
                                                     <div className="space-y-2">
                                                         <label className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{isAr ? 'تكاليف الشحن ذهاباً وإياباً' : 'ROUND-TRIP SHIPPING COST'}</label>
                                                         <div className="relative group">
                                                             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"><Truck size={14} /></div>
                                                             <input 
                                                                 type="number"
                                                                 value={shippingRoundtrip}
                                                                 onChange={(e) => setShippingRoundtrip(Number(e.target.value))}
                                                                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm font-mono text-white focus:border-gold-500/50 outline-none transition-all"
                                                                 placeholder="0.00"
                                                             />
                                                             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20">AED</div>
                                                         </div>
                                                     </div>

                                                     {/* Financial Breakdown Table */}
                                                     <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                                                         <div className="flex justify-between text-[10px]">
                                                             <span className="text-white/40">
                                                                 {isMultiPartCase
                                                                     ? isAr
                                                                         ? 'مبلغ القطعة المتنازع عليها'
                                                                         : 'Disputed item amount'
                                                                     : isAr
                                                                       ? 'إجمالي المدفوع (Stripe)'
                                                                       : 'Total paid (Stripe)'}
                                                             </span>
                                                             <span className="text-white font-mono">{orderPaidTotal.toLocaleString()} AED</span>
                                                         </div>
                                                         {isMultiPartCase && catalogOrderTotal > 0 && (
                                                             <p className="text-[9px] text-amber-400/80">
                                                                 {isAr
                                                                     ? `إجمالي الطلب: ${catalogOrderTotal.toLocaleString()} AED — الاسترداد على القطعة المحددة فقط`
                                                                     : `Order total: ${catalogOrderTotal.toLocaleString()} AED — refund scoped to selected item`}
                                                             </p>
                                                         )}
                                                         
                                                         {/* Responsibility Indicator */}
                                                         <motion.div className={`p-3 rounded-xl border mb-4 ${isCloseCompleteRefund ? 'bg-gold-500/5 border-gold-500/20' : faultParty === 'MERCHANT' ? 'bg-orange-500/5 border-orange-500/20' : faultParty === 'SHIPPING_COMPANY' ? 'bg-purple-500/5 border-purple-500/20' : 'bg-cyan-500/5 border-cyan-500/20'}`}>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Scale size={12} className={isCloseCompleteRefund ? 'text-gold-400' : faultParty === 'MERCHANT' ? 'text-orange-400' : 'text-cyan-400'} />
                                                                <span className="text-[9px] font-black uppercase text-white/60">
                                                                    {isAr ? 'حوكمة الرسوم' : 'FEE GOVERNANCE'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[9px] font-bold text-white leading-tight">
                                                                {isCloseCompleteRefund
                                                                    ? t.admin.disputeManager.verdictTerminal.closeCompleteRefundHint
                                                                    : faultParty === 'MERCHANT'
                                                                      ? (t.admin.disputeManager.verdictTerminal as any).feeGovernanceMerchant
                                                                      : faultParty === 'SHIPPING_COMPANY'
                                                                        ? (t.admin.disputeManager.verdictTerminal as any).feeGovernanceShipping
                                                                        : (t.admin.disputeManager.verdictTerminal as any).feeGovernanceCustomer}
                                                            </p>
                                                         </motion.div>

                                                         {finPreview.customerFullRefund && (
                                                            <div className="flex justify-between text-[10px] mb-2 p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                                                                <span className="text-green-400/80 font-bold">{(t.admin.disputeManager.verdictTerminal as any).customerFullRefund}</span>
                                                                <span className="text-green-400 font-mono">{orderPaidTotal.toFixed(2)} AED</span>
                                                            </div>
                                                         )}

                                                         {finPreview.showFeesOnCustomerNet && (
                                                         <>
                                                         <div className="flex justify-between text-[10px]">
                                                             <span className="text-red-400/60 flex items-center gap-2"><CreditCard size={10} /> {isAr ? 'رسوم بوابة الدفع' : 'Gateway Fee'} ({gatewayFeePct}%)</span>
                                                             <span className="text-red-400 font-mono">-{finPreview.gatewayFee.toFixed(2)} AED</span>
                                                         </div>
                                                         <div className="flex justify-between text-[10px]">
                                                             <span className="text-red-400/60 flex items-center gap-2"><RotateCcw size={10} /> {isAr ? 'رسوم الاسترداد' : 'Refund Fee'} ({refundFeePct}%)</span>
                                                             <span className="text-red-400 font-mono">-{finPreview.refundFee.toFixed(2)} AED</span>
                                                         </div>
                                                         </>
                                                         )}
                                                         {!finPreview.showFeesOnCustomerNet && finPreview.platformFees > 0 && faultParty === 'MERCHANT' && (
                                                            <div className="flex justify-between text-[10px]">
                                                                <span className="text-orange-400/60 flex items-center gap-2"><CreditCard size={10} /> {(t.admin.disputeManager.verdictTerminal as any).merchantDebitFees}</span>
                                                                <span className="text-orange-400 font-mono">-{finPreview.platformFees.toFixed(2)} AED</span>
                                                            </div>
                                                         )}
                                                         {finPreview.showShippingOnCustomerNet && shippingRoundtrip > 0 && (
                                                            <div className="flex justify-between text-[10px]">
                                                                <span className="text-orange-400/60 flex items-center gap-2"><Truck size={10} /> {isAr ? 'تكاليف الشحن (على العميل)' : 'Shipping (customer)'}</span>
                                                                <span className="text-orange-400 font-mono">-{shippingRoundtrip.toFixed(2)} AED</span>
                                                            </div>
                                                         )}
                                                         {faultParty === 'MERCHANT' && finPreview.merchantDebits.shipping > 0 && (
                                                            <div className="flex justify-between text-[10px]">
                                                                <span className="text-orange-400/60 flex items-center gap-2"><Truck size={10} /> {(t.admin.disputeManager.verdictTerminal as any).merchantDebitShipping}</span>
                                                                <span className="text-orange-400 font-mono">-{finPreview.merchantDebits.shipping.toFixed(2)} AED</span>
                                                            </div>
                                                         )}
                                                         {faultParty === 'SHIPPING_COMPANY' && finPreview.shippingCompanyLiability > 0 && (
                                                            <div className="flex justify-between text-[10px] p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
                                                                <span className="text-purple-400/80 flex items-center gap-2"><Truck size={10} /> {(t.admin.disputeManager.verdictTerminal as any).shippingCompanyLiability}</span>
                                                                <span className="text-purple-400 font-mono">{finPreview.shippingCompanyLiability.toFixed(2)} AED</span>
                                                            </div>
                                                         )}
                                                         {faultParty === 'MERCHANT' && merchantBalance !== null && (finPreview.merchantDebits.shipping + finPreview.merchantDebits.platformFees) > 0 && (
                                                            <div className={`mt-4 p-3 rounded-xl border ${merchantBalance < finPreview.merchantDebits.shipping + finPreview.merchantDebits.platformFees ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/5 border-green-500/10'}`}>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{(t.admin.disputeManager.verdictTerminal as any).merchantBalanceCheck}</span>
                                                                    <span className={`text-[10px] font-mono ${merchantBalance < finPreview.merchantDebits.shipping + finPreview.merchantDebits.platformFees ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                                                                        {merchantBalance.toFixed(2)} AED
                                                                    </span>
                                                                </div>
                                                                {merchantBalance < finPreview.merchantDebits.shipping + finPreview.merchantDebits.platformFees && (
                                                                    <p className="text-[8px] text-red-500 font-bold mt-1">{(t.admin.disputeManager.verdictTerminal as any).merchantInsufficientBalance}</p>
                                                                )}
                                                            </div>
                                                         )}

                                                         <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                                             <span className="text-xs font-black text-white uppercase">{isAr ? 'صافي المبلغ المسترد' : 'NET REFUND'}</span>
                                                             <div className="text-right">
                                                                <span className="text-lg font-black text-green-400 font-mono leading-none">
                                                                    {finPreview.net.toFixed(2)}
                                                                </span>
                                                                <span className="text-[10px] text-green-400/40 font-black ml-1 uppercase">AED</span>
                                                             </div>
                                                         </div>
                                                         {finPreview.stripeCapped && (
                                                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-[10px] font-bold text-red-200 leading-relaxed">
                                                                {isAr
                                                                    ? `تنبيه: صافي الاسترداد ${finPreview.net.toFixed(2)} د.إ — المتاح على Stripe ${finPreview.stripeExecutable.toFixed(2)} د.إ فقط.`
                                                                    : `Net refund ${finPreview.net.toFixed(2)} AED — only ${finPreview.stripeExecutable.toFixed(2)} AED on Stripe.`}
                                                            </div>
                                                         )}
                                                         {isCloseCompleteRefund && (
                                                            <div className="flex justify-between items-center pt-3 border-t border-gold-500/20">
                                                                <div>
                                                                    <span className="text-xs font-black text-gold-400 uppercase block">{t.admin.disputeManager.verdictTerminal.platformRetained}</span>
                                                                    <span className="text-[9px] text-white/40 font-bold">{t.admin.disputeManager.verdictTerminal.platformRetainedDesc}</span>
                                                                </div>
                                                                <span className="text-lg font-black text-gold-400 font-mono">
                                                                    {computeFinancialBreakdown().retained.toFixed(2)} AED
                                                                </span>
                                                            </div>
                                                         )}
                                                     </div>
                                                 </div>
                                             </div>

                                             {/* 2026 Fraud Control Module */}
                                             <div className={`p-6 rounded-[32px] border transition-all ${penaltyType === 'FRAUD' ? 'bg-red-500/10 border-red-500/50' : 'bg-white/5 border-white/5'}`}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <AlertOctagon size={18} className={penaltyType === 'FRAUD' ? 'text-red-500' : 'text-white/20'} />
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${penaltyType === 'FRAUD' ? 'text-red-500' : 'text-white/20'}`}>{isAr ? 'الكشف عن احتيال' : 'FRAUD DETECTION'}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => setPenaltyType(penaltyType === 'FRAUD' ? null : 'FRAUD')}
                                                        className={`w-12 h-6 rounded-full relative transition-all ${penaltyType === 'FRAUD' ? 'bg-red-500' : 'bg-white/10'}`}
                                                    >
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isAr ? (penaltyType === 'FRAUD' ? 'left-1' : 'right-1') : (penaltyType === 'FRAUD' ? 'right-1' : 'left-1')}`} />
                                                    </button>
                                                </div>
                                                {penaltyType === 'FRAUD' && (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                                                        <p className="text-[9px] text-red-500/60 font-bold leading-relaxed">
                                                            {isAr ? '⚠️ تفعيل هذا الخيار سيؤدي إلى تعليق حساب الطرف المسؤول وتجميد جميع أرصدته وخصم الغرامة المحددة.' : '⚠️ Enabling this will suspend the guilty party\'s account, freeze all balances, and deduct the specified fine.'}
                                                        </p>
                                                        <div className="relative">
                                                            <input 
                                                                type="number"
                                                                value={penaltyAmount}
                                                                onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                                                                className="w-full bg-red-500/5 border border-red-500/20 rounded-xl py-2 px-4 text-xs font-mono text-red-500 outline-none"
                                                            />
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-red-500/40">AED FINE</div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                             </div>
                                         </div>
                                         </div>
                                     </div>

                                     <div className="flex justify-between pt-8 border-t border-white/5">
                                         <Button 
                                             onClick={() => setVerdictStep(1)}
                                             variant="outline"
                                             className={`px-8 py-3.5 border-white/10 text-white/40 hover:text-white flex items-center gap-3 text-[10px] uppercase font-black tracking-widest rounded-xl transition-all`}
                                         >
                                             <PrevIcon size={14} />
                                             {t.common.actions.back}
                                         </Button>
                                         <Button 
                                             onClick={() => setVerdictStep(3)}
                                             className={`px-8 py-4 bg-gold-500 hover:bg-gold-400 text-black font-black uppercase tracking-widest text-[11px] rounded-xl shadow-xl flex items-center gap-3 transition-all hover:translate-x-${isAr ? '[-4px]' : '[4px]'}`}
                                         >
                                             {t.common.actions.continue}
                                             <NextIcon size={16} />
                                         </Button>
                                     </div>
                                 </motion.div>
                             )}

                             {verdictStep === 3 && (
                                 <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-12">
                                     <div className="p-6 bg-cyan-500/5 rounded-[32px] border border-cyan-500/20 grid grid-cols-1 sm:grid-cols-3 gap-6">
                                         <div>
                                             <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2">
                                                 {t.admin.disputeManager.intelligence.escrowStatusTitle}
                                             </span>
                                             <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-300">
                                                 {(() => {
                                                     const es = String(dispute?.escrowStatus || '').toUpperCase();
                                                     if (es === 'HELD') return t.admin.disputeManager.intelligence.escrowHeld;
                                                     if (es === 'FROZEN') return t.admin.disputeManager.intelligence.escrowFrozen;
                                                     if (es === 'RELEASED') return t.admin.disputeManager.intelligence.escrowReleased;
                                                     if (es === 'REFUNDED') return t.admin.disputeManager.intelligence.escrowRefunded;
                                                     return t.admin.disputeManager.intelligence.escrowNone;
                                                 })()}
                                             </Badge>
                                         </div>
                                         <div>
                                             <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2">
                                                 {t.admin.disputeManager.intelligence.paidTotalLabel}
                                             </span>
                                             <span className="text-lg font-black text-white font-mono">
                                                 {(orderPaidTotal || 0).toFixed(2)} AED
                                             </span>
                                         </div>
                                         <div>
                                             <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2">
                                                 {t.admin.disputeManager.intelligence.maxRefundableLabel}
                                             </span>
                                             <span className="text-lg font-black text-emerald-400 font-mono">
                                                 {dispute?.maxRefundable != null
                                                     ? `${Number(dispute.maxRefundable).toFixed(2)} AED`
                                                     : '—'}
                                             </span>
                                         </div>
                                     </div>
                                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                         <div className="space-y-8">
                                             <div className="p-8 bg-gold-500/5 rounded-[40px] border border-gold-500/20 space-y-6">
                                                 <div className="flex items-center gap-4 text-gold-500">
                                                     <ShieldCheck size={20} />
                                                     <span className="text-sm font-black uppercase tracking-widest">{t.admin.disputeManager.verdictTerminal.adminSignatureLabel}</span>
                                                 </div>
                                                 <div className="space-y-4">
                                                     <input 
                                                         type="text" 
                                                         value={adminSignature}
                                                         onChange={(e) => setAdminSignature(e.target.value)}
                                                         placeholder={isAr ? 'أدخل اسمك الكامل للموافقة والتوقيع...' : 'Type full name to sign & authorize...'}
                                                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-mono text-lg focus:border-gold-500/50 outline-none transition-all block"
                                                     />
                                                     <div className="grid grid-cols-2 gap-4">
                                                         <input 
                                                             type="text" 
                                                             value={adminName} 
                                                             onChange={(e) => setAdminName(e.target.value)}
                                                             placeholder={t.admin.disputeManager.verdictTerminal.adminNameLabel}
                                                             className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white focus:border-gold-500/50 outline-none"
                                                         />
                                                         <input 
                                                             type="email" 
                                                             value={adminEmail} 
                                                             onChange={(e) => setAdminEmail(e.target.value)}
                                                             placeholder={t.admin.disputeManager.verdictTerminal.adminEmailLabel}
                                                             className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white focus:border-gold-500/50 outline-none"
                                                         />
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>

                                         <div className="p-10 bg-black/60 rounded-[40px] border border-white/10 flex flex-col justify-between h-full relative group">
                                             <div className="absolute -inset-0.5 bg-gradient-to-r from-gold-500/20 to-amber-500/20 rounded-[40px] blur opacity-0 group-hover:opacity-100 transition duration-1000" />
                                             <div className="relative space-y-6">
                                                 <div className="flex items-center gap-3">
                                                     <Gavel size={24} className="text-gold-500" />
                                                     <h3 className="text-2xl font-black text-white tracking-tighter uppercase">{t.admin.disputeManager.verdictTerminal.executeVerdict}</h3>
                                                 </div>
                                                 <p className="text-xs text-white leading-relaxed">
                                                     {isAr 
                                                         ? 'من خلال النقر على تنفيذ، سيتم إرسال الإشعارات الفورية للعميل والمتجر بالقرار الإداري الرسمي.'
                                                         : 'By clicking execute, automated real-time notifications of the official administrative decision will be dispatched to both parties.'}
                                                 </p>
                                             </div>
                                             <Button 
                                                 onClick={confirmVerdict}
                                                 isLoading={isExecuting}
                                                 disabled={!adminSignature || !adminName || !adminEmail}
                                                 className="relative mt-8 py-5 bg-gradient-to-r from-gold-600 to-amber-500 hover:from-gold-500 hover:to-amber-400 text-black font-black uppercase tracking-[0.2em] text-sm rounded-2xl shadow-2xl shadow-gold-500/20 w-full transition-all hover:scale-[1.02]"
                                             >
                                                 {t.admin.disputeManager.verdictTerminal.executeVerdict}
                                             </Button>
                                         </div>
                                     </div>

                                     <div className="flex items-center gap-4 pt-8 border-t border-white/5">
                                         <Button 
                                             onClick={() => setVerdictStep(2)}
                                             variant="outline"
                                             className={`px-8 py-3.5 border-white/10 text-white/40 hover:text-white flex items-center gap-3 text-[10px] uppercase font-black tracking-widest rounded-xl transition-all`}
                                         >
                                             <PrevIcon size={14} />
                                             {t.common.actions.back}
                                         </Button>
                                     </div>
                                 </motion.div>
                             )}
                          </div>
                      </GlassCard>
                    ) : (
                       /* 2026 POST-VERDICT HUB: READ-ONLY AUDIT DISPLAY */
                       <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                          <GlassCard className="p-12 bg-white/[0.02] border-gold-500/30 rounded-[40px] shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-6 bg-gold-500/10 rounded-bl-[40px] border-l border-b border-gold-500/20 flex items-center gap-3">
                                <ShieldCheck size={20} className="text-gold-500" />
                                <span className="text-xs font-black text-gold-500 uppercase tracking-[0.2em]">{isAr ? 'حكم إداري نهائي ومؤرشف' : 'FINAL ARCHIVED VERDICT'}</span>
                             </div>

                             <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                                {/* LEFT: VERDICT CONTENT */}
                                <div className="lg:col-span-12 xl:col-span-8 space-y-10">
                                   <div className="flex items-center gap-8">
                                      <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center shadow-2xl
                                         ${dispute.adminApproval === 'APPROVED' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                                         {dispute.adminApproval === 'APPROVED' ? <CheckCircle2 size={48} /> : <X size={48} />}
                                      </div>
                                      <div>
                                         <h3 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
                                            {dispute.adminApproval === 'APPROVED' ? (isAr ? 'تم قبول الطلب' : 'Verdict: APPROVED') : (isAr ? 'تم رفض الطلب' : 'Verdict: REJECTED')}
                                         </h3>
                                         <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em]">
                                            {isAr ? 'تم الإصدار في' : 'ISSUED ON'} {new Date(dispute.verdictIssuedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                                         </p>
                                      </div>
                                   </div>

                                   <div className="bg-white/[0.03] rounded-[40px] p-10 border border-white/5 relative">
                                      <div className="absolute -top-4 left-10 px-4 py-1.5 bg-[#0F0E0C] border border-white/10 rounded-xl">
                                         <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{isAr ? 'منطق الحكم الرسمي' : 'OFFICIAL RATIONALE'}</span>
                                      </div>
                                      <p className="text-lg text-white/90 leading-relaxed font-medium italic">
                                         "{dispute.adminApprovalReason}"
                                      </p>
                                   </div>

                                   {dispute.adminEvidence && dispute.adminEvidence.length > 0 && (
                                      <div className="space-y-6">
                                         <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{isAr ? 'الأدلة والحقائق المرفقة' : 'ATTACHED EVIDENCE & EXHIBITS'}</span>
                                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {dispute.adminEvidence.map((url, idx) => (
                                               <motion.div 
                                                  key={idx} 
                                                  whileHover={{ scale: 1.05 }}
                                                  onClick={() => setSelectedEvidence(url)}
                                                  className="aspect-video rounded-2xl overflow-hidden border border-white/10 cursor-zoom-in brightness-75 hover:brightness-100 transition-all shadow-xl"
                                               >
                                                  <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                                               </motion.div>
                                            ))}
                                         </div>
                                      </div>
                                   )}
                                </div>

                                {/* RIGHT: SIGNATURE & AUTHORITY */}
                                <div className="lg:col-span-12 xl:col-span-4 space-y-8">
                                   <div className="p-8 bg-black/40 rounded-[40px] border border-white/5 space-y-8">
                                      <div className="space-y-2 border-b border-white/5 pb-6">
                                         <span className="text-[9px] font-black text-gold-500/40 uppercase tracking-widest block">{isAr ? 'الطرف المسؤول' : 'PARTY AT FAULT'}</span>
                                         <Badge className="bg-white/5 text-white border-white/10 text-xs px-4 py-2 font-black uppercase">
                                            {getFaultPartyLabel(dispute.faultParty)}
                                         </Badge>
                                      </div>

                                      <div className="space-y-4 border-b border-white/5 pb-6">
                                         <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block">{isAr ? 'التسوية المالية' : 'FINANCIAL SETTLEMENT'}</span>
                                         <div className="grid grid-cols-1 gap-3">
                                            {(dispute.shippingRefund ?? 0) > 0 && (
                                                <div className="flex justify-between items-center p-3 bg-cyan-500/5 rounded-2xl border border-cyan-500/10">
                                                   <span className="text-[10px] text-cyan-400/60 font-bold uppercase">{isAr ? 'شحن ذهاباً وإياباً' : 'Round-trip Shipping'}</span>
                                                   <span className="text-sm font-black text-cyan-400 font-mono">{Number(dispute.shippingRefund).toLocaleString()} AED</span>
                                                </div>
                                            )}
                                            
                                            {/* 2026 Detailed Fee Breakdown Display */}
                                            {(dispute.gatewayFeeAmount ?? 0) > 0 && (
                                                <div className="flex justify-between items-center p-3 bg-red-500/5 rounded-2xl border border-red-500/10">
                                                   <span className="text-[10px] text-red-400/60 font-bold uppercase">{isAr ? 'رسوم البوابة (3%)' : 'Gateway Fee (3%)'}</span>
                                                   <span className="text-sm font-black text-red-400 font-mono">{Number(dispute.gatewayFeeAmount).toLocaleString()} AED</span>
                                                </div>
                                            )}
                                            
                                            {(dispute.refundFeeAmount ?? 0) > 0 && (
                                                <div className="flex justify-between items-center p-3 bg-red-500/5 rounded-2xl border border-red-500/10">
                                                   <span className="text-[10px] text-red-400/60 font-bold uppercase">{isAr ? 'رسوم الاسترداد (1.5%)' : 'Refund Fee (1.5%)'}</span>
                                                   <span className="text-sm font-black text-red-400 font-mono">{Number(dispute.refundFeeAmount).toLocaleString()} AED</span>
                                                </div>
                                            )}

                                            {(dispute.penaltyAmount ?? 0) > 0 && (
                                                <div className="flex justify-between items-center p-3 bg-red-600/10 rounded-2xl border border-red-600/20">
                                                   <span className="text-[10px] text-red-600 font-black uppercase flex items-center gap-2"><AlertOctagon size={12} /> {isAr ? 'غرامة احتيال' : 'FRAUD PENALTY'}</span>
                                                   <span className="text-sm font-black text-red-600 font-mono">{Number(dispute.penaltyAmount).toLocaleString()} AED</span>
                                                </div>
                                            )}

                                            {(dispute as any).feeBearer && (
                                                <div className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/10">
                                                   <span className="text-[10px] text-white/50 font-bold uppercase">{isAr ? 'تحميل الرسوم' : 'Fee bearer'}</span>
                                                   <span className="text-xs font-black text-white font-mono">{(dispute as any).feeBearer}</span>
                                                </div>
                                            )}
                                            {((dispute as any).shippingCompanyLiability ?? 0) > 0 && (
                                                <div className="flex justify-between items-center p-3 bg-purple-500/5 rounded-2xl border border-purple-500/20">
                                                   <span className="text-[10px] text-purple-400/60 font-bold uppercase">{(t.admin.disputeManager.verdictTerminal as any).shippingCompanyLiability}</span>
                                                   <span className="text-sm font-black text-purple-400 font-mono">{Number((dispute as any).shippingCompanyLiability).toLocaleString()} AED</span>
                                                </div>
                                            )}
                                            <div className="pt-2 flex justify-between items-center border-t border-white/5 mt-1">
                                                <span className="text-[10px] font-black text-white uppercase">{(t.admin.disputeManager.verdictTerminal as any).customerNetRefundLabel || (isAr ? 'الصافي المسترد' : 'NET REFUNDED')}</span>
                                                <span className="text-xl font-black text-green-400 font-mono">{Number(dispute.netRefundAmount ?? dispute.refundAmount ?? 0).toLocaleString()} AED</span>
                                            </div>
                                         </div>
                                      </div>

                                      <div className="space-y-6 pt-2">
                                         <div className="space-y-2">
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block">{isAr ? 'المسؤول المصدر' : 'ISSUING AUTHORITY'}</span>
                                            <div className="flex items-center gap-4">
                                               <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
                                                  <Gavel size={18} className="text-gold-500" />
                                               </div>
                                               <div>
                                                  <p className="text-sm font-black text-white">{dispute.adminName}</p>
                                                  <p className="text-[10px] text-white/40 font-bold">{dispute.adminEmail}</p>
                                               </div>
                                            </div>
                                         </div>

                                         <div className="pt-6 border-t border-white/5 space-y-6">
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block">{isAr ? 'التوقيع الرقمي المعتمد' : 'VERIFIED DIGITAL SIGNATURE'}</span>
                                            <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 relative group">
                                               <div className="absolute top-2 right-4 flex items-center gap-1.5 opacity-20">
                                                  <Lock size={10} className="text-green-500" />
                                                  <span className="text-[8px] font-black text-green-500">SECURE HASH v4.0</span>
                                               </div>
                                               <p className="text-3xl font-black text-white font-mono tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">
                                                  {dispute.adminSignature}
                                               </p>
                                               <div className="w-full h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />
                                               <p className="text-[8px] text-gold-500/40 font-bold tracking-[0.4em] uppercase">{isAr ? 'حكم نهائي ملزم' : 'LEGALLY BINDING VERDICT'}</p>
                                            </div>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </GlassCard>
                       </motion.div>
                    )}
                </div>
            </div>

            {/* LIGHTBOX FOR EVIDENCE */}
            <AnimatePresence>
                {selectedEvidence && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-10">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedEvidence(null)}
                            className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-4xl max-h-full aspect-video z-10"
                        >
                            <img src={selectedEvidence} alt="Evidence Full" className="w-full h-full object-contain rounded-3xl" />
                            <button 
                                onClick={() => setSelectedEvidence(null)}
                                className="absolute top-6 right-6 p-3 bg-black/50 hover:bg-black rounded-full border border-white/20 text-white transition-all"
                            >
                                <X size={24} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};
