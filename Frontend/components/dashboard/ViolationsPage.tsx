import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { useViolationStore, Violation } from '../../stores/useViolationStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCurrentUserId } from '../../utils/auth';
import { 
  ShieldAlert, 
  Scale, 
  History, 
  Flag, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  FileText, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Check,
  X,
  Shield,
  Image as ImageIcon,
  File as FileIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomerReliabilityMeter } from './customer/CustomerReliabilityMeter';
import { consumeViolationNavContext } from '../../utils/violationNavigation';

interface ViolationsPageProps {
    role: 'customer' | 'merchant';
}

export const ViolationsPage: React.FC<ViolationsPageProps> = ({ role }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const vt = role === 'customer' ? t.dashboard.violationsPage : t.dashboard.merchant.violationsPage;

    const { 
        myViolations, 
        myScore,
        thresholds,
        violationTypes,
        isLoading,
        fetchMyViolations,
        fetchMyScore,
        submitAppeal,
        uploadAppealFile,
        fetchThresholds,
        fetchViolationTypes,
        subscribeForUser
    } = useViolationStore();

    const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
    const [isGuidelinesModalOpen, setIsGuidelinesModalOpen] = useState(false);
    const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [isTransparencyAccepted, setIsTransparencyAccepted] = useState(false);
    const [activeTab, setActiveTab] = useState<'history' | 'reliability'>('history');
    const [highlightId, setHighlightId] = useState<string | null>(null);
    
    const [appealData, setAppealData] = useState({
        reason: '',
        evidenceUrl: ''
    });

    useEffect(() => {
        const nav = consumeViolationNavContext();
        if (nav?.highlightId) setHighlightId(nav.highlightId);
        if (nav?.tab === 'history' || nav?.tab === 'violations') setActiveTab('history');

        fetchMyViolations();
        fetchMyScore();
        fetchThresholds(role.toUpperCase());
        fetchViolationTypes(role.toUpperCase());

        // 2026 Realtime: scoped per-user subscription (avoids hitting admin endpoints)
        const userId = getCurrentUserId();
        const unsubscribe = userId ? subscribeForUser(userId) : () => {};
        return () => unsubscribe();
    }, []);

    const maxScore = thresholds.length > 0 
        ? Math.max(...thresholds.map(t => t.thresholdPoints)) 
        : 200;

    const nextThreshold = [...thresholds]
        .filter(t => t.thresholdPoints > (myScore || 0))
        .sort((a, b) => a.thresholdPoints - b.thresholdPoints)[0];

    // Determine theme based on score/threshold
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedViolation) return;

        setUploadingFile(true);
        const res = await uploadAppealFile(selectedViolation.id, file);
        setUploadingFile(false);

        if (res.success) {
            setAppealData({ ...appealData, evidenceUrl: res.url || '' });
        } else {
            alert(res.message);
        }
    };



    const handleAppealSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedViolation || !isTransparencyAccepted) return;
        
        setIsSubmitting(true);
        const payload = {
            reason: appealData.reason,
            evidenceUrls: appealData.evidenceUrl ? [appealData.evidenceUrl] : undefined
        };
        const res = await submitAppeal(selectedViolation.id, payload);
        setIsSubmitting(false);

        if (res.success) {
            setIsAppealModalOpen(false);
            setAppealData({ reason: '', evidenceUrl: '' });
            setSelectedViolation(null);
            setIsTransparencyAccepted(false);
        } else {
            alert(res.message);
        }
    };

    const getScoreInfo = (score: number | null) => {
        if (score === null) return { status: '...', color: 'text-white/20', bg: 'bg-white/5', icon: Info };
        if (score === 0) return { status: vt.scoreCard.perfect, color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle2 };
        if (score < 50) return { status: vt.scoreCard.warning, color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: AlertTriangle };
        return { status: vt.scoreCard.danger, color: 'text-red-400', bg: 'bg-red-400/10', icon: ShieldAlert };
    };

    const scoreInfo = getScoreInfo(myScore);

    const theme = role === 'merchant' 
        ? { 
            primary: 'gold-500', 
            accent: 'gold-400', 
            bgGradient: 'from-gold-600/20', 
            border: 'border-gold-500/20', 
            color: 'text-gold-500',
            glow: 'shadow-gold-500/10'
        } 
        : { 
            primary: 'red-500', 
            accent: 'red-400', 
            bgGradient: 'from-red-500/20', 
            border: 'border-red-500/20', 
            color: 'text-red-500',
            glow: 'shadow-red-500/10'
        };

    const getStatusBadge = (status: string) => {
        const base = "px-2 py-1 rounded text-[10px] border font-bold uppercase tracking-widest";
        switch (status) {
            case 'ACTIVE': return <span className={`${base} bg-red-500/10 text-red-500 border-red-500/20`}>{isAr ? 'نشطة' : 'Active'}</span>;
            case 'APPEALED': return <span className={`${base} bg-yellow-500/10 text-yellow-400 border-yellow-500/20`}>{isAr ? 'تحت الطعن' : 'Appealed'}</span>;
            case 'DECAYED': return <span className={`${base} bg-green-500/10 text-green-400 border-green-500/20`}>{isAr ? 'منتهية' : 'Decayed'}</span>;
            case 'CANCELLED': return <span className={`${base} bg-white/10 text-white/50 border-white/10`}>{isAr ? 'ملغاة' : 'Cancelled'}</span>;
            default: return <span className={`${base} bg-white/5 text-white/30 border-white/5`}>{status}</span>;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.bgGradient} to-transparent border ${theme.border} flex items-center justify-center ${theme.color} shadow-xl ${theme.glow}`}>
                        <ShieldAlert size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase italic font-outfit">
                            {vt.title}
                        </h1>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                            {vt.subtitle}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsGuidelinesModalOpen(true)}
                        className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                    >
                        <Info size={16} />
                        {isAr ? 'تعليمات النظام' : 'System Guidelines'}
                    </button>
                </div>
            </div>

            {/* Tabs Selector (Customer Only) */}
            {role === 'customer' && (
                <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/5 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'history' ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        {vt.tabs?.history || (isAr ? 'سجل المخالفات' : 'Violation History')}
                    </button>
                    <button
                        onClick={() => setActiveTab('reliability')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'reliability' ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        {vt.tabs?.reliability || (isAr ? 'مؤشر الموثوقية' : 'Reliability Meter')}
                    </button>
                </div>
            )}

            <AnimatePresence mode="wait">
                {activeTab === 'reliability' && role === 'customer' ? (
                    <motion.div
                        key="reliability-tab"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <CustomerReliabilityMeter />
                    </motion.div>
                ) : (
                    <motion.div
                        key="history-tab"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-8"
                    >
                        {/* Score Overview */}
                        <GlassCard className="p-8 border-white/5 overflow-hidden relative group">
                <div className={`absolute top-0 right-0 w-64 h-64 ${scoreInfo.bg} blur-[120px] -z-10 transition-colors duration-1000`} />
                
                <div className="flex flex-col lg:flex-row justify-between items-center gap-12">
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                        <div className={`flex items-center gap-3 ${scoreInfo.color} mb-4`}>
                            <scoreInfo.icon size={24} />
                            <span className="text-xs font-black uppercase tracking-widest">{vt.scoreCard.title}</span>
                        </div>
                        <h2 className="text-6xl font-black text-white font-mono mb-2">
                            {myScore !== null ? myScore : '--'}
                            <span className="text-lg text-white/20 ml-2">/ {maxScore}</span>
                        </h2>
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${scoreInfo.color}`}>
                            {scoreInfo.status}
                        </p>
                    </div>

                    <div className="h-24 w-px bg-white/5 hidden lg:block" />

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full lg:w-auto">
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                            <h4 className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-3 italic">{isAr ? 'تنبيه العقوبة القادمة' : 'Next Penalty Trigger'}</h4>
                            <div className="flex justify-between items-end">
                                <span className="text-xl font-black text-white font-mono">{nextThreshold ? nextThreshold.thresholdPoints : maxScore} <span className="text-[10px] text-white/20">PTS</span></span>
                                <span className={`text-[9px] font-bold uppercase tracking-tighter border-b pb-0.5 ${myScore && nextThreshold && myScore >= nextThreshold.thresholdPoints * 0.8 ? 'text-red-400 border-red-500/20' : 'text-orange-400 border-orange-500/20'}`}>
                                    {nextThreshold ? (isAr ? nextThreshold.nameAr : nextThreshold.nameEn) : (isAr ? 'حالة آمنة' : 'Safe Status')}
                                </span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${myScore && nextThreshold && myScore >= nextThreshold.thresholdPoints * 0.8 ? 'bg-red-500' : 'bg-orange-400'}`} 
                                    style={{ width: `${Math.min(100, ((myScore || 0) / (nextThreshold?.thresholdPoints || maxScore)) * 100)}%` }}
                                />
                            </div>
                        </div>
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                            <h4 className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-3 italic">{isAr ? 'آخر مخالفة' : 'Latest Violation'}</h4>
                            <p className="text-xs font-bold text-white uppercase truncate">
                                {myViolations[0] ? (isAr ? myViolations[0].type.nameAr : myViolations[0].type.nameEn) : (isAr ? 'لا يوجد' : 'None')}
                            </p>
                            <p className="text-[9px] text-white/20 mt-1 uppercase font-mono">
                                {myViolations[0] ? new Date(myViolations[0].createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '--'}
                            </p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Violations List */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-4">
                    <div className="flex items-center gap-3">
                        <Scale size={18} className={theme.color} />
                        <h3 className="text-xs text-white uppercase font-black tracking-widest italic">{isAr ? 'سجل المخالفات التفصيلي' : 'Detailed Violation History'}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] text-white/40 font-bold uppercase tracking-widest">{myViolations.length} {isAr ? 'مخالفات' : 'Records'}</span>
                    </div>
                </div>

                <div className="grid gap-4">
                    {myViolations.length > 0 ? myViolations.map((v) => (
                        <GlassCard key={v.id} className={`p-8 border-white/5 hover:border-white/10 transition-all relative group ${highlightId === v.id ? 'ring-2 ring-gold-500/50 border-gold-500/40' : ''}`}>
                            {/* Card Background Glow */}
                            <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/5 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex flex-col lg:flex-row justify-between items-center gap-8 relative z-10">
                                <div className="flex items-center gap-8 flex-1 w-full">
                                    {/* Points/Badge */}
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center justify-center group-hover:border-red-500/30 transition-colors">
                                            <span className="text-2xl font-black text-red-500 font-mono leading-none">-{v.points}</span>
                                            <span className="text-[8px] font-black text-white/30 uppercase mt-1">PTS</span>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-lg font-black text-white uppercase italic tracking-tight">{isAr ? v.type.nameAr : v.type.nameEn}</h4>
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        </div>
                                        
                                        {/* Meta Meta */}
                                        <div className="flex flex-wrap items-center gap-y-3 gap-x-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-white/30">
                                                    <FileText size={12} />
                                                </div>
                                                <span className="text-[10px] text-white/40 font-mono uppercase tracking-tighter">#{v.id.slice(0,8).toUpperCase()}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-white/30">
                                                    <History size={12} />
                                                </div>
                                                <span className="text-[9px] text-white/30 font-bold uppercase tracking-tight">{new Date(v.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex flex-col items-center lg:items-end gap-5 w-full lg:w-auto">
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-lg font-black text-white font-mono leading-tight">{Number(v.fineAmount).toLocaleString()} <span className="text-[10px] text-white/40 uppercase">AED</span></div>
                                            <div className="text-[9px] text-white/20 uppercase font-black tracking-widest mt-1">{isAr ? 'الغرامة المقررة' : 'Penalty Fine'}</div>
                                        </div>
                                        <div className="h-10 w-px bg-white/5 hidden lg:block" />
                                        {getStatusBadge(v.status)}
                                    </div>

                                    {v.status === 'ACTIVE' && (
                                        <button 
                                            onClick={() => { setSelectedViolation(v); setIsAppealModalOpen(true); }}
                                            className="w-full lg:w-auto px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all"
                                        >
                                            <Scale size={14} />
                                            {vt.appeal.submit}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </GlassCard>
                    )) : (
                        <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.01]">
                            <div className="w-20 h-20 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                                <CheckCircle2 size={32} />
                            </div>
                            <p className="text-white/40 font-black uppercase tracking-[0.2em] text-[10px]">
                                {isAr ? 'لا توجد مخالفات مسجلة في ملفك' : 'Your record is currently clean'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            </motion.div>
        )}
    </AnimatePresence>

            {/* Appeal Modal */}
            <AnimatePresence>
                {isAppealModalOpen && selectedViolation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="w-full max-w-lg bg-[#111] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="p-10 border-b border-white/5 bg-gradient-to-br from-yellow-500/5 to-transparent">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center border border-yellow-500/20">
                                        <Scale size={32} />
                                    </div>
                                    <button onClick={() => setIsAppealModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/30 flex items-center justify-center transition-colors">
                                        <XCircle size={20} />
                                    </button>
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">{vt.appeal.title}</h3>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">
                                    {isAr ? 'رقم المخالفة' : 'Case ID'}: #{selectedViolation.id.toUpperCase()}
                                </p>
                            </div>

                            <form onSubmit={handleAppealSubmit} className="p-10 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                                <div className="space-y-4">
                                    <label className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] italic">{vt.appeal.reason}</label>
                                    <textarea 
                                        required
                                        rows={4}
                                        placeholder={vt.appeal.reasonPlaceholder}
                                        className="w-full bg-white/[0.02] border border-white/5 rounded-3xl p-6 text-sm text-white placeholder:text-white/10 focus:border-yellow-500/20 focus:bg-white/[0.04] outline-none transition-all resize-none leading-relaxed shadow-inner"
                                        value={appealData.reason}
                                        onChange={e => setAppealData({...appealData, reason: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] italic">{vt.appeal.evidence}</label>
                                    
                                    <div className="relative group">
                                        <input 
                                            type="file" 
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                            disabled={uploadingFile}
                                            accept="image/*,video/*,application/pdf"
                                        />
                                        <div className={`
                                            w-full py-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 transition-all
                                            ${appealData.evidenceUrl ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 bg-white/[0.01] group-hover:border-white/10 group-hover:bg-white/[0.02]'}
                                        `}>
                                            {uploadingFile ? (
                                                <Loader2 className="animate-spin text-yellow-500" size={32} />
                                            ) : appealData.evidenceUrl ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                                                        <Check size={24} />
                                                    </div>
                                                    <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">{isAr ? 'تم الرفع بنجاح' : 'Evidence Uploaded'}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 rounded-2xl bg-white/5 text-white/20 flex items-center justify-center">
                                                        <ImageIcon size={24} />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest opacity-60">{isAr ? 'اضغط لرفع فيديو أو صور أو مستندات' : 'Tap to upload media or docs'}</p>
                                                        <p className="text-[8px] text-white/20 uppercase mt-1">PNG, JPG, MP4, PDF (MAX 30MB)</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Transparency Checkbox */}
                                <div 
                                    onClick={() => setIsTransparencyAccepted(!isTransparencyAccepted)}
                                    className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-4 cursor-pointer hover:bg-white/[0.07] transition-all group"
                                >
                                    <div className={`
                                        w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0
                                        ${isTransparencyAccepted ? 'bg-yellow-500 border-yellow-500 text-black' : 'border-white/10 group-hover:border-white/20'}
                                    `}>
                                        {isTransparencyAccepted && <Check size={14} strokeWidth={4} />}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-white/80 font-black uppercase tracking-wider leading-none">{isAr ? 'إقرار بصحة البيانات' : 'Truthfulness Declaration'}</p>
                                        <p className="text-[9px] text-white/20 font-medium leading-relaxed">
                                            {isAr 
                                                ? 'أقر بأن جميع المعلومات والوثائق المقدمة حقيقية، وأدرك أن تقديم طعون كيدية قد يؤدي لمضاعفة العقوبات.' 
                                                : 'I certify that all information and docs provided are true. I understand that fraudulent appeals may result in doubled penalties.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsAppealModalOpen(false)}
                                        className="flex-1 py-5 rounded-[2rem] bg-white/5 text-white/30 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                                    >
                                        {isAr ? 'إلغاء' : 'Discard'}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !isTransparencyAccepted || uploadingFile}
                                        className={`
                                            flex-[2] py-5 rounded-[2rem] text-black text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3
                                            ${isSubmitting || !isTransparencyAccepted || uploadingFile 
                                                ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                                                : 'bg-yellow-500 hover:bg-yellow-400 shadow-yellow-500/20'}
                                        `}
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Scale size={16} />}
                                        {isSubmitting ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : vt.appeal.submit}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* System Guidelines Modal */}
            <AnimatePresence>
                {isGuidelinesModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-12 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] rounded-full -z-10" />
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-white/40 mb-2">
                                            <Info size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">{isAr ? 'مرجع النظام' : 'System Reference'}</span>
                                        </div>
                                        <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">{vt.guidelines.title}</h3>
                                        <p className="text-xs text-white/30 font-medium uppercase tracking-widest mt-2">{vt.guidelines.subtitle}</p>
                                    </div>
                                    <button onClick={() => setIsGuidelinesModalOpen(false)} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center transition-all hover:rotate-90">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Scrolling Content */}
                            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-16">
                                {/* Violation Types Table */}
                                <section className="space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                                            <Shield size={20} />
                                        </div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-widest italic">{vt.guidelines.typeTable.title}</h4>
                                    </div>

                                    <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02]">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-white/5">
                                                    <th className="px-8 py-5 text-[9px] font-black text-white/40 uppercase tracking-widest">{vt.guidelines.typeTable.name}</th>
                                                    <th className="px-8 py-5 text-[9px] font-black text-white/40 uppercase tracking-widest text-center">{vt.guidelines.typeTable.points}</th>
                                                    <th className="px-8 py-5 text-[9px] font-black text-white/40 uppercase tracking-widest text-center">{vt.guidelines.typeTable.fine}</th>
                                                    <th className="px-8 py-5 text-[9px] font-black text-white/40 uppercase tracking-widest text-center">{vt.guidelines.typeTable.decay}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.03]">
                                                {violationTypes.map((type) => (
                                                    <tr key={type.id} className="hover:bg-white/[0.04] transition-colors group">
                                                        <td className="px-8 py-5">
                                                            <div className="font-bold text-white text-xs">{isAr ? type.nameAr : type.nameEn}</div>
                                                            <div className="text-[9px] text-white/20 mt-1">{isAr ? type.descriptionAr : type.descriptionEn}</div>
                                                        </td>
                                                        <td className="px-8 py-5 text-center">
                                                            <span className="text-xs font-black text-red-500 font-mono">+{type.points}</span>
                                                        </td>
                                                        <td className="px-8 py-5 text-center">
                                                            <span className="text-xs font-black text-white font-mono">{Number(type.fineAmount).toLocaleString()} <span className="text-[9px] text-white/20">AED</span></span>
                                                        </td>
                                                        <td className="px-8 py-5 text-center">
                                                            <span className="text-xs font-bold text-white/40 uppercase tracking-tighter italic">{type.decayDays} {isAr ? 'يوم' : 'DAYS'}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                {/* Penalty Thresholds Table */}
                                <section className="space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                                            <Scale size={20} />
                                        </div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-widest italic">{vt.guidelines.thresholdTable.title}</h4>
                                    </div>

                                    <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02]">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-white/5">
                                                    <th className="px-8 py-5 text-[9px] font-black text-white/40 uppercase tracking-widest">{vt.guidelines.thresholdTable.points}</th>
                                                    <th className="px-8 py-5 text-[9px] font-black text-white/40 uppercase tracking-widest">{vt.guidelines.thresholdTable.action}</th>
                                                    <th className="px-8 py-5 text-[9px] font-black text-white/40 uppercase tracking-widest text-center">{vt.guidelines.thresholdTable.duration}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.03]">
                                                {[...thresholds].sort((a,b) => a.thresholdPoints - b.thresholdPoints).map((threshold) => (
                                                    <tr key={threshold.id} className="hover:bg-white/[0.04] transition-colors">
                                                        <td className="px-8 py-5">
                                                            <span className="text-lg font-black text-white font-mono">{threshold.thresholdPoints} <span className="text-[10px] text-white/20">PTS</span></span>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <div className="font-bold text-white text-xs">{isAr ? threshold.nameAr : threshold.nameEn}</div>
                                                            <div className="text-[9px] text-white/20 mt-1 lowercase">{isAr ? threshold.action : threshold.action.replace(/_/g, ' ')}</div>
                                                        </td>
                                                        <td className="px-8 py-5 text-center">
                                                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] font-black text-white/40 uppercase tracking-widest">
                                                                {threshold.suspendDurationDays || 0} {isAr ? 'أيام' : 'DAYS'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </div>
                            
                            {/* Footer / CTA */}
                            <div className="p-12 border-t border-white/5 bg-white/[0.01]">
                                <button 
                                    onClick={() => setIsGuidelinesModalOpen(false)}
                                    className="w-full py-6 rounded-[2rem] bg-white text-black text-xs font-black uppercase tracking-[0.3em] hover:bg-white/90 transition-all shadow-2xl shadow-white/5"
                                >
                                    {isAr ? 'فهمت التعليمات' : 'I Understand the Guidelines'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
