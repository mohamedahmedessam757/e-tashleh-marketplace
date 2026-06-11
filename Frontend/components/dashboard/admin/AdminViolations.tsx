import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useViolationStore, Violation, ViolationType, PenaltyThreshold, ViolationAppeal, PenaltyAction, LoyaltyReviewAlert } from '../../../stores/useViolationStore';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useCustomerStore } from '../../../stores/useCustomerStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { EntitySearchInput } from '../../ui/EntitySearchInput';
import {
    ShieldAlert,
    Search,
    Filter,
    Eye,
    User,
    Scale,
    History,
    Flag,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Plus,
    Edit3,
    Building2,
    FileText,
    Trash2,
    MoreVertical,
    ArrowRight,
    Loader2,
    ShieldCheck,
    Lock,
    Heart,
    Gem,
    Ban,
    ShieldOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { BlurredSection } from './BlurredSection';
import { consumeViolationNavContext } from '../../../utils/violationNavigation';

export const AdminViolations: React.FC = () => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const vt = t.admin.violationsPage;

    const {
        violations,
        violationTypes,
        thresholds,
        pendingAppeals,
        pendingPenalties,
        isLoading,
        fetchViolations,
        fetchViolationTypes,
        fetchThresholds,
        fetchPendingAppeals,
        fetchPendingPenalties,
        riskAlerts,
        fetchRiskAlerts,
        resolveRiskAlert,
        loyaltyAlerts,
        fetchLoyaltyAlerts,
        decideLoyaltyAlert,
        dropViolation,
        issueViolation,
        reviewAppeal,
        reviewPenalty,
        createViolationType,
        updateViolationType,
        createThreshold,
        deleteThreshold,
        subscribeToViolations
    } = useViolationStore();

    const [activeTab, setActiveTab] = useState<'violations' | 'appeals' | 'penalties' | 'risk_alerts' | 'loyalty_reviews' | 'types' | 'thresholds'>('violations');
    const [search, setSearch] = useState('');
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<ViolationType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [processingAppealId, setProcessingAppealId] = useState<string | null>(null);
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [resolvingAlert, setResolvingAlert] = useState<any | null>(null);
    const [resolveFormData, setResolveFormData] = useState({
        resolution: 'DISMISSED' as 'DISMISSED' | 'VIOLATION_ISSUED',
        adminNotes: ''
    });

    // 2026 Loyalty Review modal state
    const [isLoyaltyDecideModalOpen, setIsLoyaltyDecideModalOpen] = useState(false);
    const [decidingAlert, setDecidingAlert] = useState<LoyaltyReviewAlert | null>(null);
    const [decidingDecision, setDecidingDecision] = useState<'CANCEL_REWARDS' | 'KEEP_REWARDS'>('KEEP_REWARDS');
    const [decidingNotes, setDecidingNotes] = useState('');

    // 2026 Drop violation modal state
    const [isDropModalOpen, setIsDropModalOpen] = useState(false);
    const [droppingViolation, setDroppingViolation] = useState<Violation | null>(null);
    const [dropReason, setDropReason] = useState('');
    const [highlightId, setHighlightId] = useState<string | null>(null);
    // Form State for Violation Issuance
    const [formData, setFormData] = useState({
        targetUserId: '',
        targetType: 'MERCHANT' as 'MERCHANT' | 'CUSTOMER',
        typeId: '',
        reason: '',
        evidenceUrl: ''
    });

    // Form State for Violation Type Definition
    const [typeFormData, setTypeFormData] = useState({
        nameAr: '',
        nameEn: '',
        points: 0,
        fineAmount: 0,
        decayDays: 30,
        targetType: 'MERCHANT' as 'MERCHANT' | 'CUSTOMER',
        isActive: true
    });

    // Form State for Penalty Threshold
    const [thresholdFormData, setThresholdFormData] = useState({
        nameAr: '',
        nameEn: '',
        targetType: 'MERCHANT' as 'MERCHANT' | 'CUSTOMER',
        thresholdPoints: 0,
        action: 'WARNING' as 'WARNING' | 'TEMPORARY_SUSPENSION' | 'PERMANENT_BAN' | 'FEE_INCREASE',
        suspendDurationDays: undefined as number | undefined
    });

    const { stores, fetchAllStores } = useAdminStore();
    const { customers, fetchCustomers: fetchAllCustomers } = useCustomerStore();

    useEffect(() => {
        const nav = consumeViolationNavContext();
        if (nav?.tab) {
            const tabMap: Record<string, typeof activeTab> = {
                violations: 'violations',
                penalties: 'penalties',
                appeals: 'appeals',
                loyalty_reviews: 'loyalty_reviews',
                history: 'violations',
            };
            const mapped = tabMap[nav.tab];
            if (mapped) setActiveTab(mapped);
        }
        if (nav?.highlightId) setHighlightId(nav.highlightId);

        fetchViolations();
        fetchViolationTypes();
        fetchThresholds();
        fetchPendingAppeals();
        fetchPendingPenalties();
        fetchRiskAlerts();
        fetchLoyaltyAlerts();

        const unsubscribe = subscribeToViolations();
        return () => unsubscribe();
    }, []);

    const canViewTab = useAdminPermissionsStore(s => s.canViewTab);
    // Permissions-based Tab filtering
    const visibleTabs = useMemo(() => {
        const canViewTab = useAdminPermissionsStore.getState().canViewTab;
        const allTabs = [
            { id: 'violations', icon: ShieldAlert, label: vt.tabs.active, permissionKey: 'ACTIVE' },
            { id: 'appeals', icon: Scale, label: vt.tabs.appeals, permissionKey: 'APPEALS' },
            { id: 'penalties', icon: AlertTriangle, label: vt.tabs.penalties, permissionKey: 'PENALTIES' },
            { id: 'risk_alerts', icon: Flag, label: vt.tabs.riskAlerts, permissionKey: 'RISK_ALERTS' },
            { id: 'loyalty_reviews', icon: Heart, label: (vt.tabs as any).loyaltyReviews ?? (isAr ? 'مراجعات الولاء' : 'Loyalty Reviews'), permissionKey: 'LOYALTY_REVIEWS' },
            { id: 'types', icon: FileText, label: vt.tabs.types, permissionKey: 'TYPES' },
            { id: 'thresholds', icon: ShieldCheck, label: vt.table.threshold, permissionKey: 'THRESHOLDS' }
        ];
        return allTabs.map(tab => ({
            ...tab,
            isLocked: !canViewTab('violations', tab.permissionKey)
        }));
    }, [vt, isAr]);

    // Auto-switch if current tab is restricted
    useEffect(() => {
        const firstAllowed = visibleTabs.find(t => !t.isLocked);
        if (firstAllowed && visibleTabs.find(t => t.id === activeTab)?.isLocked) {
            setActiveTab(firstAllowed.id as any);
        }
    }, [visibleTabs, activeTab]);

    // Local user filtering removed in favor of real-time server-side search

    // --- DYNAMIC FILTERING LOGIC ---

    const filteredViolations = useMemo(() => violations.filter(v =>
        (v.targetUser?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.targetStore?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.id || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.type.nameAr || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.type.nameEn || '').toLowerCase().includes(search.toLowerCase())
    ), [violations, search]);

    const filteredAppeals = useMemo(() => pendingAppeals.filter(a =>
        (a.violation.targetUser?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.violation.targetStore?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.reason || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.violation.id || '').toLowerCase().includes(search.toLowerCase())
    ), [pendingAppeals, search]);

    const filteredPenalties = useMemo(() => pendingPenalties.filter(p =>
        (p.targetUser?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.action || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.reason || '').toLowerCase().includes(search.toLowerCase())
    ), [pendingPenalties, search]);

    const filteredRiskAlerts = useMemo(() => riskAlerts.filter(a =>
        (a.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.status || '').toLowerCase().includes(search.toLowerCase())
    ), [riskAlerts, search]);

    const filteredLoyaltyAlerts = useMemo(() => (loyaltyAlerts || []).filter(a =>
        (a.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.reasonAr || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.reasonEn || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.status || '').toLowerCase().includes(search.toLowerCase())
    ), [loyaltyAlerts, search]);

    const filteredViolationTypes = useMemo(() => violationTypes.filter(t =>
        (t.nameAr || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.nameEn || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.targetType || '').toLowerCase().includes(search.toLowerCase())
    ), [violationTypes, search]);

    const filteredThresholds = useMemo(() => thresholds.filter(th =>
        (th.action || '').toLowerCase().includes(search.toLowerCase()) ||
        (th.targetType || '').toLowerCase().includes(search.toLowerCase()) ||
        (th.thresholdPoints?.toString() || '').includes(search)
    ), [thresholds, search]);

    const searchPlaceholder = useMemo(() => {
        if (isAr) {
            switch (activeTab) {
                case 'violations': return 'البحث في المخالفات...';
                case 'appeals': return 'البحث في الطعون...';
                case 'penalties': return 'البحث في العقوبات...';
                case 'loyalty_reviews': return 'البحث في مراجعات الولاء...';
                case 'types': return 'البحث في أنواع المخالفات...';
                case 'thresholds': return 'البحث في حدود العقوبات...';
                default: return 'البحث...';
            }
        }
        switch (activeTab) {
            case 'violations': return 'Search violations...';
            case 'appeals': return 'Search appeals...';
            case 'penalties': return 'Search penalties...';
            case 'risk_alerts': return 'Search risk alerts...';
            case 'loyalty_reviews': return 'Search loyalty reviews...';
            case 'types': return 'Search violation types...';
            case 'thresholds': return 'Search thresholds...';
            default: return 'Search...';
        }
    }, [activeTab, isAr]);

    const getStatusBadge = (status: string) => {
        const base = "px-2 py-1 rounded text-[10px] border font-bold whitespace-nowrap";
        switch (status) {
            case 'ACTIVE': return <span className={`${base} bg-red-500/10 text-red-400 border-red-500/20`}>{isAr ? 'نشطة' : 'Active'}</span>;
            case 'APPEALED': return <span className={`${base} bg-yellow-500/10 text-yellow-400 border-yellow-500/20`}>{isAr ? 'تم الطعن' : 'Appealed'}</span>;
            case 'DECAYED': return <span className={`${base} bg-green-500/10 text-green-400 border-green-500/20`}>{isAr ? 'منتهية الصلاحية' : 'Decayed'}</span>;
            case 'CANCELLED': return <span className={`${base} bg-white/10 text-white/50 border-white/10`}>{isAr ? 'ملغاة' : 'Cancelled'}</span>;
            default: return <span className={`${base} bg-white/5 text-white/30 border-white/5`}>{status}</span>;
        }
    };

    const handleIssueViolation = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                targetUserId: formData.targetUserId,
                targetType: formData.targetType,
                typeId: formData.typeId,
                adminNotes: formData.reason
            };

            const res = await issueViolation(payload);
            if (res.success) {
                setIsIssueModalOpen(false);
                setFormData({ targetUserId: '', targetType: 'MERCHANT', typeId: '', reason: '', evidenceUrl: '' });
            } else {
                alert(res.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditType = (type: ViolationType) => {
        setEditingType(type);
        setTypeFormData({
            nameAr: type.nameAr,
            nameEn: type.nameEn,
            points: Number(type.points) || 0,
            fineAmount: Number(type.fineAmount) || 0,
            decayDays: Number(type.decayDays) || 1,
            targetType: type.targetType,
            isActive: type.isActive
        });
        setIsTypeModalOpen(true);
    };

    const handleSaveType = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let res;
            if (editingType) {
                res = await updateViolationType(editingType.id, typeFormData);
            } else {
                res = await createViolationType(typeFormData);
            }

            if (res.success) {
                setIsTypeModalOpen(false);
                setEditingType(null);
                setTypeFormData({ nameAr: '', nameEn: '', points: 0, fineAmount: 0, decayDays: 30, targetType: 'MERCHANT', isActive: true });
            } else {
                alert(res.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveThreshold = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await createThreshold(thresholdFormData);
            if (res.success) {
                setIsThresholdModalOpen(false);
                setThresholdFormData({
                    nameAr: '',
                    nameEn: '',
                    targetType: 'MERCHANT',
                    thresholdPoints: 0,
                    action: 'WARNING',
                    suspendDurationDays: undefined
                });
            } else {
                alert(res.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteThreshold = async (id: string) => {
        if (confirm(isAr ? 'هل أنت متأكد من حذف هذا الحد؟' : 'Are you sure you want to delete this threshold?')) {
            const res = await deleteThreshold(id);
            if (!res.success) alert(res.message);
        }
    };

    const handleReviewAppeal = async (appealId: string, status: 'APPROVED' | 'REJECTED', adminResponse: string) => {
        setProcessingAppealId(appealId);
        try {
            await reviewAppeal(appealId, { status, adminResponse });
        } finally {
            setProcessingAppealId(null);
        }
    };

    const handleResolveRiskAlert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resolvingAlert) return;
        setIsSubmitting(true);
        try {
            const res = await resolveRiskAlert(resolvingAlert.id, resolveFormData);
            if (res.success) {
                setIsResolveModalOpen(false);
                setResolvingAlert(null);
                setResolveFormData({ resolution: 'DISMISSED', adminNotes: '' });
            } else {
                alert(res.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDecideLoyaltyAlert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!decidingAlert) return;
        setIsSubmitting(true);
        try {
            const res = await decideLoyaltyAlert(decidingAlert.id, decidingDecision, decidingNotes || undefined);
            if (res.success) {
                setIsLoyaltyDecideModalOpen(false);
                setDecidingAlert(null);
                setDecidingNotes('');
                setDecidingDecision('KEEP_REWARDS');
            } else {
                alert(res.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDropViolation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!droppingViolation || !dropReason.trim()) return;
        setIsSubmitting(true);
        try {
            const res = await dropViolation(droppingViolation.id, dropReason);
            if (res.success) {
                setIsDropModalOpen(false);
                setDroppingViolation(null);
                setDropReason('');
            } else {
                alert(res.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div className="flex items-center gap-4 group">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-transparent border border-red-500/20 flex items-center justify-center text-red-500 shadow-2xl shadow-red-500/10 group-hover:scale-110 transition-transform duration-500">
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
                    <GlassCard className="p-2 border-white/5 flex items-center gap-2 bg-white/[0.02]">
                        <div className="relative group">
                            <Search size={16} className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} text-white/20 group-focus-within:text-gold-500 transition-colors`} />
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                className={`bg-white/5 border border-white/5 rounded-xl ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 text-xs text-white focus:border-gold-500/50 outline-none w-64 md:w-80 transition-all placeholder:text-white/20 font-medium`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </GlassCard>
                    <button
                        onClick={() => {
                            if (activeTab === 'types') {
                                setEditingType(null);
                                setTypeFormData({ nameAr: '', nameEn: '', points: 0, fineAmount: 0, decayDays: 30, targetType: 'MERCHANT', isActive: true });
                                setIsTypeModalOpen(true);
                            } else if (activeTab === 'thresholds') {
                                setThresholdFormData({
                                    nameAr: '',
                                    nameEn: '',
                                    targetType: 'MERCHANT',
                                    thresholdPoints: 0,
                                    action: 'WARNING',
                                    suspendDurationDays: undefined
                                });
                                setIsThresholdModalOpen(true);
                            } else {
                                setIsIssueModalOpen(true);
                            }
                        }}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg shadow-red-600/20"
                    >
                        <Plus size={16} />
                        {activeTab === 'types' ? vt.actions.addType : (activeTab === 'thresholds' ? vt.table.threshold : vt.actions.issue)}
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: vt.stats.total, value: violations.length, icon: Flag, color: 'text-red-400', bg: 'bg-red-400/10' },
                    { label: vt.stats.pendingAppeals, value: pendingAppeals.length, icon: Scale, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                    { label: vt.stats.pendingPenalties, value: pendingPenalties.length, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                    { label: vt.stats.pointsDecayed, value: violations.filter(v => v.status === 'DECAYED').length, icon: History, color: 'text-green-400', bg: 'bg-green-400/10' }
                ].map((stat, i) => (
                    <GlassCard key={i} className="p-5 border-white/5 group hover:border-white/10 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{stat.label}</p>
                                <h3 className="text-3xl font-black text-white font-mono">{stat.value}</h3>
                            </div>
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} border border-white/5`}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-1.5 p-1.5 bg-white/5 rounded-2xl border border-white/5 w-fit flex-wrap">
                {visibleTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-[11px] transition-all whitespace-nowrap group
                            ${activeTab === tab.id
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 scale-[1.02] z-10'
                                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                            }
                            ${tab.isLocked ? 'opacity-70' : ''}
                        `}
                    >
                        <tab.icon 
                            size={16} 
                            className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'}`} 
                        />
                        <span className={`uppercase tracking-widest font-black italic font-outfit ${activeTab === tab.id ? 'opacity-100' : 'opacity-60 group-hover:opacity-100 transition-opacity'}`}>
                            {tab.label}
                        </span>
                        {tab.isLocked && <Lock size={10} className={activeTab === tab.id ? 'text-white/50' : 'text-red-500/50'} />}
                    </button>
                ))}
            </div>

            <div className="relative">
                <BlurredSection
                    isBlurred={visibleTabs.find(t => t.id === activeTab)?.isLocked}
                    titleAr={`تبويب ${visibleTabs.find(t => t.id === activeTab)?.label} محمي`}
                    titleEn={`${visibleTabs.find(t => t.id === activeTab)?.label} Tab Protected`}
                    descriptionAr="لا تملك صلاحية الوصول لهذا التبويب. يرجى التواصل مع الإدارة العليا لتوسيع نطاق وصولك."
                    descriptionEn="You do not have permission to access this tab. Please contact senior management to expand your access scope."
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'violations' && (
                                <div className="grid gap-4">
                                    {filteredViolations.length > 0 ? filteredViolations.map(v => (
                                        <GlassCard key={v.id} className={`p-6 border-white/5 hover:border-red-500/20 group transition-all relative overflow-hidden ${highlightId === v.id ? 'ring-2 ring-gold-500/50 border-gold-500/40' : ''}`}>
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[80px] -z-10 group-hover:bg-red-500/10 transition-colors" />
                                            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr_0.5fr] items-center gap-8 relative z-10">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-red-400 group-hover:bg-red-400/10 transition-colors">
                                                        <span className="text-xl font-black font-mono">-{v.points}</span>
                                                        <span className="text-[8px] font-bold uppercase tracking-tighter">PTS</span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h2 className="text-sm font-black text-white group-hover:text-red-400 transition-colors uppercase italic tracking-tight underline decoration-red-500/30 underline-offset-4">
                                                                {isAr ? v.type.nameAr : v.type.nameEn}
                                                            </h2>
                                                            <span className="text-[8px] font-mono text-white/20 bg-white/5 px-2 py-0.5 rounded">#{v.id.slice(0, 8).toUpperCase()}</span>
                                                        </div>
                                                        <p className="text-[10px] text-white/40 font-bold flex items-center gap-2">
                                                            <User size={10} />
                                                            {v.targetStore?.name || v.targetUser?.name} — {v.targetType}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="px-6 lg:border-x border-white/5">
                                                    <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-1 italic">{isAr ? 'التفاصيل المالية' : 'Financials'}</div>
                                                    <div className="text-sm font-black text-gold-400 font-mono">-{v.fineAmount} AED</div>
                                                    <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Automated Fine</div>
                                                </div>

                                                <div className="text-start lg:text-right">
                                                    <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-2 italic">{isAr ? 'الحالة والمدة' : 'Status & Age'}</div>
                                                    <div className="flex items-center gap-3 lg:justify-end">
                                                        {getStatusBadge(v.status)}
                                                        <div className="flex flex-col text-right">
                                                            <span className="text-[10px] text-white/40 font-mono">{new Date(v.createdAt).toLocaleDateString()}</span>
                                                            <span className="text-[8px] text-white/20 uppercase tracking-tighter">Issue Date</span>
                                                        </div>
                                                    </div>
                                                    {v.status === 'ACTIVE' && (
                                                        <button
                                                            onClick={() => {
                                                                setDroppingViolation(v);
                                                                setDropReason('');
                                                                setIsDropModalOpen(true);
                                                            }}
                                                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                            title={isAr ? 'إسقاط المخالفة وإرجاع النقاط' : 'Drop violation and refund points'}
                                                        >
                                                            <ShieldOff size={12} />
                                                            {isAr ? 'إسقاط' : 'Drop'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </GlassCard>
                                    )) : (
                                        <div className="text-center py-20 opacity-30 italic">{isAr ? 'لا توجد مخالفات مسجلة' : 'No violations logged.'}</div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'loyalty_reviews' && (
                                <div className="grid gap-4">
                                    {filteredLoyaltyAlerts.length > 0 ? filteredLoyaltyAlerts.map(alertItem => {
                                        const isPending = alertItem.status === 'PENDING_REVIEW';
                                        const triggerColor = alertItem.triggeredByType === 'VIOLATION'
                                            ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                            : alertItem.triggeredByType === 'DISPUTE'
                                                ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                                                : 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                                        return (
                                            <GlassCard key={alertItem.id} className="p-6 border-white/5 hover:border-pink-500/20 transition-all overflow-hidden relative">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-[80px] -z-10" />
                                                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.5fr_1fr_1fr] items-start gap-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0">
                                                            <Gem size={22} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-black text-white uppercase italic tracking-tight">
                                                                {alertItem.user?.name || 'Unknown User'}
                                                            </h3>
                                                            <p className="text-[10px] text-white/40 font-bold font-mono">{alertItem.user?.email}</p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${triggerColor}`}>
                                                                    {isAr
                                                                        ? (alertItem.triggeredByType === 'VIOLATION' ? 'مخالفة' : alertItem.triggeredByType === 'DISPUTE' ? 'نزاع' : 'إرجاع')
                                                                        : alertItem.triggeredByType}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider bg-white/5 text-white/50 border-white/10">
                                                                    {alertItem.user?.loyaltyTier || 'BASIC'} • {alertItem.user?.loyaltyPoints ?? 0} pts
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="px-4 lg:border-x border-white/5">
                                                        <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-1 italic">
                                                            {isAr ? 'سبب المراجعة' : 'Review Reason'}
                                                        </div>
                                                        <p className="text-[11px] text-white/70 italic leading-relaxed line-clamp-3">
                                                            "{isAr ? alertItem.reasonAr : alertItem.reasonEn}"
                                                        </p>
                                                        {alertItem.adminNotes && (
                                                            <p className="mt-2 text-[10px] text-white/50">
                                                                <span className="text-white/30">{isAr ? 'ملاحظات الإدمن:' : 'Admin notes:'} </span>
                                                                {alertItem.adminNotes}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-1">
                                                            {isAr ? 'الحالة' : 'Status'}
                                                        </div>
                                                        <div className={`inline-flex px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                                                            alertItem.status === 'PENDING_REVIEW'
                                                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                                : alertItem.status === 'REWARDS_CANCELLED'
                                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                    : 'bg-green-500/10 text-green-400 border-green-500/20'
                                                            }`}>
                                                            {alertItem.status === 'PENDING_REVIEW' ? (isAr ? 'بانتظار قرار' : 'Pending') :
                                                                alertItem.status === 'REWARDS_CANCELLED' ? (isAr ? 'تم الإلغاء' : 'Cancelled') :
                                                                    (isAr ? 'تم الإبقاء' : 'Kept')}
                                                        </div>
                                                        <div className="text-[9px] text-white/30 mt-2 font-mono">
                                                            {new Date(alertItem.createdAt).toLocaleString()}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2 justify-start">
                                                        {isPending ? (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setDecidingAlert(alertItem);
                                                                        setDecidingDecision('CANCEL_REWARDS');
                                                                        setDecidingNotes('');
                                                                        setIsLoyaltyDecideModalOpen(true);
                                                                    }}
                                                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                                                                >
                                                                    <Ban size={14} />
                                                                    {isAr ? 'إلغاء المكافآت' : 'Cancel Rewards'}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setDecidingAlert(alertItem);
                                                                        setDecidingDecision('KEEP_REWARDS');
                                                                        setDecidingNotes('');
                                                                        setIsLoyaltyDecideModalOpen(true);
                                                                    }}
                                                                    className="px-4 py-2 bg-white/5 hover:bg-green-500/10 text-white/60 hover:text-green-400 border border-white/10 hover:border-green-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <Heart size={14} />
                                                                    {isAr ? 'الإبقاء' : 'Keep'}
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="text-[9px] text-white/30 font-mono">
                                                                {alertItem.decidedAt && (
                                                                    <span>{isAr ? 'بقرار:' : 'Decided:'} {new Date(alertItem.decidedAt).toLocaleString()}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </GlassCard>
                                        );
                                    }) : (
                                        <div className="text-center py-20 opacity-30 italic">
                                            {isAr ? 'لا توجد مراجعات ولاء معلقة' : 'No pending loyalty reviews.'}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'appeals' && (
                                <div className="grid gap-4">
                                    {filteredAppeals.length > 0 ? filteredAppeals.map(appeal => (
                                        <GlassCard key={appeal.id} className="p-6 border-white/5 hover:border-yellow-500/20 transition-all overflow-hidden relative">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-[80px] -z-10" />
                                            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_2fr_1fr] items-start gap-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
                                                        <Scale size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-white uppercase italic tracking-tight mb-1">{isAr ? 'طلب طعن بانتظار المراجعة' : 'Pending Appeal Review'}</h3>
                                                        <p className="text-[10px] text-white/60 font-bold mb-1">
                                                            Target: <span className="text-white uppercase tracking-tighter">{appeal.violation.targetUser?.name || appeal.violation.targetStore?.name}</span>
                                                        </p>
                                                        <p className="text-[9px] text-white/40 font-bold font-mono">
                                                            Appeal Date: {new Date(appeal.createdAt).toLocaleDateString('en-US')}
                                                        </p>
                                                        <p className="text-[9px] text-white/30 font-bold mt-1">
                                                            Violation: {isAr ? appeal.violation.type.nameAr : appeal.violation.type.nameEn} (#{appeal.violation.id.slice(0, 8)})
                                                        </p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1 italic">{isAr ? 'سبب الطعن' : 'Appeal Reason'}</div>
                                                    <p className="text-[11px] text-white/70 line-clamp-3 italic leading-relaxed">"{appeal.reason}"</p>

                                                    {appeal.evidenceUrls && appeal.evidenceUrls.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            {appeal.evidenceUrls.map((url, idx) => (
                                                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[9px] text-blue-400 hover:text-blue-300 transition-colors uppercase font-black tracking-widest bg-blue-400/10 px-2 py-1.5 rounded-lg border border-blue-400/20 hover:border-blue-400/40 cursor-pointer">
                                                                    <FileText size={12} />
                                                                    {isAr ? `المرفق ${idx + 1}` : `Attachment ${idx + 1}`}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col lg:items-end justify-start gap-2 h-full">
                                                    <button
                                                        onClick={() => handleReviewAppeal(appeal.id, 'APPROVED', 'Verified Evidence')}
                                                        disabled={processingAppealId === appeal.id}
                                                        className="w-full lg:w-auto px-6 py-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white border border-green-500/20 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {processingAppealId === appeal.id && <Loader2 size={12} className="animate-spin" />}
                                                        {isAr ? 'قبول' : 'Approve'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleReviewAppeal(appeal.id, 'REJECTED', 'Insufficient Evidence')}
                                                        disabled={processingAppealId === appeal.id}
                                                        className="w-full lg:w-auto px-6 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {processingAppealId === appeal.id && <Loader2 size={12} className="animate-spin" />}
                                                        {isAr ? 'رفض' : 'Reject'}
                                                    </button>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    )) : (
                                        <div className="text-center py-20 opacity-30 italic">{isAr ? 'لا توجد طعون معلقة' : 'No pending appeals.'}</div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'penalties' && (
                                <div className="grid gap-4">
                                    {filteredPenalties.length > 0 ? filteredPenalties.map(penalty => (
                                        <GlassCard key={penalty.id} className="p-6 border-white/5 hover:border-orange-500/20 transition-all">
                                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_1.5fr_1fr] items-center gap-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                                        <AlertTriangle size={24} />
                                                    </div>
                                                    <div className="text-sm font-black text-white font-mono">{penalty.violationScore} <span className="text-[8px] text-white/30">SCORE</span></div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">{isAr ? 'المستخدم' : 'Target User'}</div>
                                                    <div className="text-xs font-bold text-white uppercase tracking-tighter">{penalty.targetUser?.name || 'Unknown'}</div>
                                                    <div className="text-[10px] text-white/40">{penalty.targetType}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">{isAr ? 'الإجراء المقترح' : 'Triggered Action'}</div>
                                                    <div className="text-sm font-black text-orange-400 uppercase italic tracking-widest underline underline-offset-4 decoration-orange-500/20">{penalty.action}</div>
                                                </div>
                                                <div className="flex justify-end gap-2 text-right">
                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            onClick={() => reviewPenalty(penalty.id, { status: 'APPROVED' })}
                                                            className="px-6 py-2 bg-white/5 hover:bg-gold-500 text-gold-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all border border-white/5"
                                                        >
                                                            {isAr ? 'تأكيد الإجراء' : 'Confirm Action'}
                                                        </button>
                                                        <button
                                                            onClick={() => reviewPenalty(penalty.id, { status: 'REJECTED' })}
                                                            className="text-[9px] text-white/20 hover:text-red-400 font-bold uppercase transition-colors"
                                                        >
                                                            {isAr ? 'تجاهل' : 'Ignore'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    )) : (
                                        <div className="text-center py-20 opacity-30 italic">{isAr ? 'لا توجد عقوبات بانتظار المراجعة' : 'No penalties awaiting review.'}</div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'risk_alerts' && (
                                <div className="grid gap-4">
                                    {filteredRiskAlerts.length > 0 ? filteredRiskAlerts.map(alert => (
                                        <GlassCard key={alert.id} className="p-6 border-white/5 hover:border-blue-500/20 transition-all overflow-hidden relative">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[80px] -z-10" />
                                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.5fr_1fr] items-center gap-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                                        <ShieldAlert size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-white uppercase italic tracking-tight mb-1">{alert.user?.name || 'Unknown User'}</h3>
                                                        <p className="text-[10px] text-white/40 font-bold font-mono">{alert.user?.email}</p>
                                                    </div>
                                                </div>

                                                <div className="px-6 lg:border-x border-white/5">
                                                    <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-1 italic">{vt.table.returnRate}</div>
                                                    <div className="text-xl font-black text-red-500 font-mono">{(alert.returnRate * 100).toFixed(1)}%</div>
                                                    <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Threshold: 15.0%</div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-1">{vt.table.deliveredOrders}</div>
                                                        <div className="text-xs font-black text-white font-mono">{alert.deliveredCount}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-1">{vt.table.negativeOrders}</div>
                                                        <div className="text-xs font-black text-white font-mono">{alert.negativeCount}</div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-2">
                                                    {alert.status === 'PENDING_REVIEW' ? (
                                                        <button
                                                            onClick={() => {
                                                                setResolvingAlert(alert);
                                                                setIsResolveModalOpen(true);
                                                            }}
                                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20"
                                                        >
                                                            {isAr ? 'مراجعة' : 'Review'}
                                                        </button>
                                                    ) : (
                                                        <div className="flex flex-col items-end">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${alert.status === 'VIOLATION_ISSUED' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'
                                                                }`}>
                                                                {alert.status}
                                                            </span>
                                                            <span className="text-[8px] text-white/20 mt-1 uppercase font-mono">
                                                                {new Date(alert.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </GlassCard>
                                    )) : (
                                        <div className="text-center py-20 opacity-30 italic">{isAr ? 'لا توجد تنبيهات مخاطر معلقة' : 'No pending risk alerts.'}</div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'types' && (
                                <div className="grid gap-4">
                                    {filteredViolationTypes.length > 0 ? filteredViolationTypes.map(type => (
                                        <GlassCard key={type.id} className="p-6 border-white/5 hover:border-gold-500/20 transition-all">
                                            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr_0.5fr] items-center gap-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gold-500">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-white uppercase italic tracking-tight">
                                                            {isAr ? type.nameAr : type.nameEn}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/5">{type.targetType}</span>
                                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${type.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                                {type.isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Disabled')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="px-6 lg:border-x border-white/5">
                                                    <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-1 italic">{isAr ? 'النقاط والغرامة' : 'Impact'}</div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-black text-red-400">-{type.points} Pts</span>
                                                        <span className="text-xs font-black text-gold-400">{type.fineAmount} AED</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-1 italic">{vt.table.decayDays}</div>
                                                    <div className="text-xs font-bold text-white uppercase tracking-tighter">{type.decayDays} {isAr ? 'يوم' : 'Days'}</div>
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditType(type)}
                                                        className="p-2 hover:bg-white/10 rounded-lg text-white/20 hover:text-white transition-colors"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    )) : (
                                        <div className="text-center py-20 opacity-30 italic">{isAr ? 'لا توجد أنواع مخالفات مأرشفة' : 'No violation types found.'}</div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'thresholds' && (
                                <div className="grid gap-4">
                                    {filteredThresholds.length > 0 ? filteredThresholds.map(th => {
                                        const getActionColor = (action: string) => {
                                            switch (action) {
                                                case 'PERMANENT_BAN': return 'text-red-500 bg-red-500/10 border-red-500/20';
                                                case 'TEMPORARY_SUSPENSION': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
                                                case 'FEE_INCREASE': return 'text-pink-500 bg-pink-500/10 border-pink-500/20';
                                                default: return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
                                            }
                                        };

                                        return (
                                            <GlassCard key={th.id} className="p-6 border-white/5 hover:border-white/10 transition-all relative overflow-hidden group">
                                                {/* Card Header with Name */}
                                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                                                            <ShieldAlert size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-black text-white uppercase tracking-wider">
                                                                {isAr ? (th.nameAr || 'حد عقوبة غير مسمى') : (th.nameEn || 'Unnamed Threshold')}
                                                            </h4>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${getActionColor(th.action)}`}>
                                                            {vt.penaltyActions?.[th.action] || th.action}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-white/60 font-black uppercase tracking-widest">
                                                            {th.targetType === 'MERCHANT' ? <Building2 size={10} /> : <User size={10} />}
                                                            {vt.targets?.[th.targetType] || th.targetType}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_150px_80px] items-center gap-6">
                                                    {/* Points Requirement */}
                                                    <div className="flex flex-col gap-1">
                                                        <div className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">{vt.table.threshold}</div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gold-500">
                                                                <Scale size={20} />
                                                            </div>
                                                            <span className="text-2xl font-black text-white tracking-tighter tabular-nums">
                                                                {th.thresholdPoints}
                                                                <span className="ml-1 text-[10px] text-white/30 font-medium">PTS</span>
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Action & Target */}
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${getActionColor(th.action)}`}>
                                                                {vt.penaltyActions?.[th.action] || th.action}
                                                            </span>
                                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-white/60 font-black uppercase tracking-widest">
                                                                {th.targetType === 'MERCHANT' ? <Building2 size={10} /> : <User size={10} />}
                                                                {vt.targets?.[th.targetType] || th.targetType}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-white/40 font-medium leading-relaxed italic">
                                                            {isAr ? `يتم تطبيق ${vt.penaltyActions?.[th.action]} تلقائياً عند وصول نقاط الـ ${vt.targets?.[th.targetType]} لـ ${th.thresholdPoints}` : `Automatic ${vt.penaltyActions?.[th.action]} applied when ${vt.targets?.[th.targetType]} reach ${th.thresholdPoints} pts.`}
                                                        </p>

                                                        {/* Linking Violations */}
                                                        <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-white/5">
                                                            <div className="text-[8px] text-white/30 font-black uppercase tracking-widest w-full mb-1 flex items-center gap-1">
                                                                <Flag size={10} />
                                                                {isAr ? 'المخالفات التي تساهم في هذا الحد:' : 'Violations contributing to this limit:'}
                                                            </div>
                                                            {violationTypes
                                                                .filter(type => type.targetType === th.targetType)
                                                                .map(type => (
                                                                    <div key={type.id} className="px-2 py-1 rounded-lg bg-orange-500/5 hover:bg-orange-500/10 border border-orange-500/10 text-[9px] text-orange-400/70 font-bold transition-all">
                                                                        {isAr ? type.nameAr : type.nameEn}
                                                                        <span className="ml-1 text-white/30 font-medium">({type.points} PTS)</span>
                                                                    </div>
                                                                ))
                                                            }
                                                        </div>
                                                    </div>

                                                    {/* Duration */}
                                                    <div className="flex flex-col gap-1">
                                                        <div className="text-[9px] text-white/30 font-black uppercase tracking-widest">{vt.table.duration}</div>
                                                        <div className="flex items-center gap-2 text-white font-black text-sm uppercase">
                                                            <History size={14} className="text-white/20" />
                                                            {th.suspendDurationDays ? `${th.suspendDurationDays} ${isAr ? 'يوم' : 'Days'}` : (isAr ? vt.forms.permanent : 'Permanent')}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex justify-end pr-2">
                                                        <button
                                                            onClick={() => handleDeleteThreshold(th.id)}
                                                            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all flex items-center justify-center border border-transparent hover:border-red-500/30"
                                                            title={isAr ? 'حذف' : 'Delete'}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </GlassCard>
                                        );
                                    }) : (
                                        <div className="text-center py-24 bg-white/[0.02] border border-dashed border-white/5 rounded-3xl">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/10">
                                                <Scale size={32} />
                                            </div>
                                            <p className="text-xs text-white/20 font-black uppercase tracking-widest">{isAr ? 'لا توجد حدود عقوبات معرفة' : 'No penalty thresholds defined.'}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </BlurredSection>
            </div>

            {/* Issue Violation Modal */}
            {isIssueModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-lg bg-[#151310] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-red-600/10 to-transparent">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase italic">{vt.actions.issue}</h3>
                                <p className="text-[10px] text-red-400/60 font-bold tracking-widest uppercase mt-1">Manual Enforcement System</p>
                            </div>
                            <button onClick={() => setIsIssueModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/50 flex items-center justify-center transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleIssueViolation} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.targetType}</label>
                                    <select
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-red-500/50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23ffffff44%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_0.5rem_center] bg-no-repeat pr-10"
                                        value={formData.targetType}
                                        onChange={e => {
                                            setFormData({ ...formData, targetType: e.target.value as any, targetUserId: '' });
                                        }}
                                    >
                                        <option value="MERCHANT" className="bg-[#151310] text-white">MERCHANT</option>
                                        <option value="CUSTOMER" className="bg-[#151310] text-white">CUSTOMER</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.targetUser}</label>
                                    <EntitySearchInput
                                        onSelect={(res) => setFormData({ ...formData, targetUserId: res?.id || '' })}
                                        placeholder={isAr ? "بحث بالاسم أو البريد..." : "Search name or email..."}
                                        className="mt-0"
                                    />
                                </div>
                            </div>


                            <div className="space-y-2">
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.violationType}</label>
                                <select
                                    required
                                    className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-red-500/50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23ffffff44%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_0.5rem_center] bg-no-repeat pr-10"
                                    value={formData.typeId}
                                    onChange={e => setFormData({ ...formData, typeId: e.target.value })}
                                >
                                    <option value="" className="bg-[#151310] text-white">{isAr ? 'اختر نوع المخالفة...' : 'Select Type...'}</option>
                                    {violationTypes.filter(t => t.targetType === formData.targetType).map(t => (
                                        <option key={t.id} value={t.id} className="bg-[#151310] text-white" disabled={!t.isActive && false}>
                                            {isAr ? t.nameAr : t.nameEn} (-{t.points} Pts) {!t.isActive && (isAr ? ' (معطل)' : ' (Disabled)')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.reason}</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder={isAr ? 'شرح مفصل لسبب المخالفة...' : 'Detailed reason...'}
                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-red-500/50 resize-none"
                                    value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsIssueModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    {isAr ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] px-6 py-4 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            {isAr ? 'جاري الإصدار...' : 'Issuing...'}
                                        </>
                                    ) : (
                                        vt.actions.issue
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Violation Type Management Modal (Add/Edit) */}
            {isTypeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-xl bg-[#151310] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-gold-600/10 to-transparent">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase italic">
                                    {editingType ? vt.actions.editType : vt.actions.addType}
                                </h3>
                                <p className="text-[10px] text-gold-400/60 font-bold tracking-widest uppercase mt-1">Platform Rules Configuration</p>
                            </div>
                            <button onClick={() => setIsTypeModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/50 flex items-center justify-center transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveType} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.typeNameAr}</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gold-500/50"
                                        value={typeFormData.nameAr}
                                        onChange={e => setTypeFormData({ ...typeFormData, nameAr: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.typeNameEn}</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gold-500/50"
                                        value={typeFormData.nameEn}
                                        onChange={e => setTypeFormData({ ...typeFormData, nameEn: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.points}</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gold-500/50"
                                        value={typeFormData.points}
                                        onChange={e => setTypeFormData({ ...typeFormData, points: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.fineAmount}</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gold-500/50"
                                        value={typeFormData.fineAmount}
                                        onChange={e => setTypeFormData({ ...typeFormData, fineAmount: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.decayDays}</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gold-500/50"
                                        value={typeFormData.decayDays}
                                        onChange={e => setTypeFormData({ ...typeFormData, decayDays: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.targetType}</label>
                                    <select
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gold-500/50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23ffffff44%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_0.5rem_center] bg-no-repeat pr-10"
                                        value={typeFormData.targetType}
                                        onChange={e => setTypeFormData({ ...typeFormData, targetType: e.target.value as any })}
                                    >
                                        <option value="MERCHANT" className="bg-[#151310] text-white">MERCHANT</option>
                                        <option value="CUSTOMER" className="bg-[#151310] text-white">CUSTOMER</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{isAr ? 'حالة التفعيل' : 'Active Status'}</label>
                                    <select
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-gold-500/50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23ffffff44%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_0.5rem_center] bg-no-repeat pr-10"
                                        value={typeFormData.isActive ? 'true' : 'false'}
                                        onChange={e => setTypeFormData({ ...typeFormData, isActive: e.target.value === 'true' })}
                                    >
                                        <option value="true" className="bg-[#151310] text-white">{isAr ? 'نشط' : 'Active'}</option>
                                        <option value="false" className="bg-[#151310] text-white">{isAr ? 'معطل' : 'Disabled'}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsTypeModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    {vt.forms.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] px-6 py-4 rounded-2xl bg-gold-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gold-700 transition-all shadow-xl shadow-gold-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            {isAr ? 'جاري الحفظ...' : 'Saving...'}
                                        </>
                                    ) : (
                                        vt.forms.submit
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Penalty Threshold Management Modal (Add) */}
            {isThresholdModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-xl bg-[#0F0F0F] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-orange-600/10 to-transparent">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase italic">
                                    {vt.table.threshold}
                                </h3>
                                <p className="text-[10px] text-orange-400/60 font-bold tracking-widest uppercase mt-1">Automated Systems Architecture</p>
                            </div>
                            <button onClick={() => setIsThresholdModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/50 flex items-center justify-center transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveThreshold} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.typeNameAr}</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500/50"
                                        placeholder="مثال: إيقاف مستوى 1"
                                        value={thresholdFormData.nameAr}
                                        onChange={e => setThresholdFormData({ ...thresholdFormData, nameAr: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.typeNameEn}</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500/50"
                                        placeholder="e.g. Suspension Level 1"
                                        value={thresholdFormData.nameEn}
                                        onChange={e => setThresholdFormData({ ...thresholdFormData, nameEn: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.targetType}</label>
                                    <select
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500/50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23ffffff44%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_0.5rem_center] bg-no-repeat pr-10"
                                        value={thresholdFormData.targetType}
                                        onChange={e => setThresholdFormData({ ...thresholdFormData, targetType: e.target.value as any })}
                                    >
                                        <option value="MERCHANT" className="bg-[#151310] text-white">{vt.targets?.MERCHANT}</option>
                                        <option value="CUSTOMER" className="bg-[#151310] text-white">{vt.targets?.CUSTOMER}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.scoreThreshold}</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500/50"
                                        value={thresholdFormData.thresholdPoints}
                                        onChange={e => setThresholdFormData({ ...thresholdFormData, thresholdPoints: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.penaltyAction}</label>
                                    <select
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500/50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23ffffff44%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_0.5rem_center] bg-no-repeat pr-10"
                                        value={thresholdFormData.action}
                                        onChange={e => setThresholdFormData({ ...thresholdFormData, action: e.target.value as any })}
                                    >
                                        <option value="WARNING" className="bg-[#151310] text-white">{vt.penaltyActions?.WARNING}</option>
                                        <option value="TEMPORARY_SUSPENSION" className="bg-[#151310] text-white">{vt.penaltyActions?.TEMPORARY_SUSPENSION}</option>
                                        <option value="PERMANENT_BAN" className="bg-[#151310] text-white">{vt.penaltyActions?.PERMANENT_BAN}</option>
                                        <option value="FEE_INCREASE" className="bg-[#151310] text-white">{vt.penaltyActions?.FEE_INCREASE}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.durationDays}</label>
                                    <input
                                        type="number"
                                        placeholder={isAr ? 'دائم للأرقام الصفرية' : '0 for Permanent'}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500/50"
                                        value={thresholdFormData.suspendDurationDays || ''}
                                        onChange={e => setThresholdFormData({ ...thresholdFormData, suspendDurationDays: e.target.value ? parseInt(e.target.value) : undefined })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsThresholdModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    {vt.forms.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] px-6 py-4 rounded-2xl bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            {isAr ? 'جاري الحفظ...' : 'Saving...'}
                                        </>
                                    ) : (
                                        vt.forms.submit
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Resolve Risk Alert Modal */}
            {isResolveModalOpen && resolvingAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-lg bg-[#151310] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase italic">{isAr ? 'مراجعة مخاطر العميل' : 'Customer Risk Review'}</h3>
                                <p className="text-[10px] text-blue-400/60 font-bold tracking-widest uppercase mt-1">2026 Governance Protocol</p>
                            </div>
                            <button onClick={() => setIsResolveModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/50 flex items-center justify-center transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleResolveRiskAlert} className="p-8 space-y-6">
                            {/* User Info Context */}
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                                        {resolvingAlert.user?.avatar ? (
                                            <img src={resolvingAlert.user.avatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="text-white/20" size={20} />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-tight">{resolvingAlert.user?.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/10">
                                                {(resolvingAlert.returnRate * 100).toFixed(1)}% Return Rate
                                            </span>
                                            <span className="text-[9px] text-white/30 font-bold">
                                                {resolvingAlert.deliveredCount} Delivered Orders
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{isAr ? 'القرار الإداري' : 'Governance Decision'}</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setResolveFormData({ ...resolveFormData, resolution: 'DISMISSED' })}
                                        className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${resolveFormData.resolution === 'DISMISSED'
                                                ? 'bg-green-500/10 border-green-500/50 text-green-500'
                                                : 'bg-white/5 border-white/5 text-white/30 grayscale opacity-50'
                                            }`}
                                    >
                                        <CheckCircle2 size={24} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{isAr ? 'تجاهل (سليم)' : 'Dismiss (Good Standing)'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setResolveFormData({ ...resolveFormData, resolution: 'VIOLATION_ISSUED' })}
                                        className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${resolveFormData.resolution === 'VIOLATION_ISSUED'
                                                ? 'bg-red-500/10 border-red-500/50 text-red-500'
                                                : 'bg-white/5 border-white/5 text-white/30 grayscale opacity-50'
                                            }`}
                                    >
                                        <AlertTriangle size={24} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{isAr ? 'إصدار مخالفة' : 'Issue Violation'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{vt.forms.reason}</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder={isAr ? 'ملاحظات المراجعة (تظهر للعميل في حال الرفض)...' : 'Review notes (visible to user if rejected)...'}
                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500/50 resize-none"
                                    value={resolveFormData.adminNotes}
                                    onChange={e => setResolveFormData({ ...resolveFormData, adminNotes: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsResolveModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    {isAr ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] px-6 py-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gold-500 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                                    {isAr ? 'تنفيذ القرار' : 'Execute Decision'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* 2026 Loyalty Review Decision Modal */}
            {isLoyaltyDecideModalOpen && decidingAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-lg bg-[#151310] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-pink-600/10 to-transparent">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase italic">
                                    {isAr ? 'قرار الولاء' : 'Loyalty Decision'}
                                </h3>
                                <p className="text-[10px] text-pink-400/60 font-bold tracking-widest uppercase mt-1">
                                    {decidingDecision === 'CANCEL_REWARDS'
                                        ? (isAr ? 'تأكيد إلغاء جميع المكافآت' : 'Confirm Cancellation of All Rewards')
                                        : (isAr ? 'تأكيد الإبقاء على المكافآت' : 'Confirm Keeping Rewards')}
                                </p>
                            </div>
                            <button onClick={() => setIsLoyaltyDecideModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/50 flex items-center justify-center transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleDecideLoyaltyAlert} className="p-8 space-y-6">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
                                        <Gem size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-tight">{decidingAlert.user?.name || 'Unknown'}</h4>
                                        <p className="text-[10px] text-white/40 font-mono">{decidingAlert.user?.email}</p>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[9px] font-black bg-white/5 text-white/60 px-1.5 py-0.5 rounded border border-white/10">
                                                {decidingAlert.user?.loyaltyTier || 'BASIC'}
                                            </span>
                                            <span className="text-[9px] font-black bg-white/5 text-white/60 px-1.5 py-0.5 rounded border border-white/10">
                                                {decidingAlert.user?.loyaltyPoints ?? 0} pts
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[11px] text-white/70 italic leading-relaxed pt-2 border-t border-white/5">
                                    "{isAr ? decidingAlert.reasonAr : decidingAlert.reasonEn}"
                                </div>
                            </div>

                            {decidingDecision === 'CANCEL_REWARDS' && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                                        <div className="text-[11px] text-red-300/90 leading-relaxed">
                                            {isAr
                                                ? 'سيتم تصفير نقاط الولاء وإرجاع المستوى إلى BASIC. لن يتأثر رصيد العميل النقدي ولا الكاش-باك المسجّل سابقاً. هذا الإجراء يسجَّل في سجل التدقيق ويصل العميل إشعار فورى.'
                                                : 'Loyalty points will be reset to 0 and tier returned to BASIC. The customer cash balance and previously-realized cashback are NOT affected. The action is recorded in the audit log and the customer is notified instantly.'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">
                                    {isAr ? 'ملاحظات الإدارة' : 'Admin Notes'}
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder={isAr ? 'سبب القرار (سيظهر فى سجل التدقيق)...' : 'Reason for the decision (recorded in audit log)...'}
                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-pink-500/50 resize-none"
                                    value={decidingNotes}
                                    onChange={e => setDecidingNotes(e.target.value)}
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsLoyaltyDecideModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    {isAr ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`flex-[2] px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                                        decidingDecision === 'CANCEL_REWARDS'
                                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30'
                                            : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30'
                                    }`}
                                >
                                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                                    {decidingDecision === 'CANCEL_REWARDS'
                                        ? (isAr ? 'تأكيد إلغاء المكافآت' : 'Confirm Cancellation')
                                        : (isAr ? 'تأكيد الإبقاء' : 'Confirm Keep')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* 2026 Drop Violation Modal */}
            {isDropModalOpen && droppingViolation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-lg bg-[#151310] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-red-600/10 to-transparent">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase italic">
                                    {isAr ? 'إسقاط مخالفة' : 'Drop Violation'}
                                </h3>
                                <p className="text-[10px] text-red-400/60 font-bold tracking-widest uppercase mt-1">
                                    {isAr ? 'سيتم إعادة النقاط للعميل' : 'Points will be refunded to user'}
                                </p>
                            </div>
                            <button onClick={() => setIsDropModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/50 flex items-center justify-center transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleDropViolation} className="p-8 space-y-6">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                                <div className="text-sm font-black text-white uppercase italic tracking-tight">
                                    {isAr ? droppingViolation.type.nameAr : droppingViolation.type.nameEn}
                                </div>
                                <div className="text-[10px] text-white/40">
                                    <span className="text-red-400 font-mono">-{droppingViolation.points} PTS</span>
                                    {' • '}
                                    <span>{droppingViolation.targetType}</span>
                                    {' • '}
                                    <span className="font-mono">#{droppingViolation.id.slice(0, 8).toUpperCase()}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">
                                    {isAr ? 'سبب الإسقاط (إلزامي)' : 'Drop Reason (required)'}
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder={isAr ? 'مثال: صدرت بالخطأ، أو تم التحقق من سلامة الطلب...' : 'e.g. Issued in error, verified order was correct...'}
                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-red-500/50 resize-none"
                                    value={dropReason}
                                    onChange={e => setDropReason(e.target.value)}
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsDropModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    {isAr ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !dropReason.trim()}
                                    className="flex-[2] px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
                                >
                                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                                    <ShieldOff size={14} />
                                    {isAr ? 'إسقاط المخالفة' : 'Drop Violation'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};
