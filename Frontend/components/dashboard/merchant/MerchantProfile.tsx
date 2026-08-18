import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, MapPin, Clock, FileText, UploadCloud, Edit3, Save, CheckCircle2, User, Phone, Mail, Shield, ShieldCheck, Fingerprint, Globe, RefreshCw, Eye, Archive, CreditCard, ExternalLink, AlertTriangle, Star, ShieldAlert, Info, PenTool } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useVendorStore } from '../../../stores/useVendorStore';
import { useReviewStore } from '../../../stores/useReviewStore';
import { isFeaturedMerchantByRules } from '../../../utils/ratingImpactPolicy';
import { GlassCard } from '../../ui/GlassCard';
import { MultiSelectDropdown } from '../../ui/MultiSelectDropdown';
import { useCatalogStore } from '../../../stores/useCatalogStore';
import { printContractHtml } from '../../../utils/print';
import { ContractPrintDocument, mapMerchantContractAcceptance } from '../shared/contracts/ContractPrintDocument';
import { sanitizeHtml } from '../../../utils/htmlSanitize';
import { ContractAmendmentModal } from './ContractAmendmentModal';
import { LicenseExpiryBanner } from './LicenseExpiryBanner';
import { MerchantDocumentUploadModal, type MerchantDocKey } from './MerchantDocumentUploadModal';
import type { SecondPartyData } from '../../../utils/contractBaker';
import {
    daysUntilLicenseExpiry,
    formatRemainingCountdown,
    getDocumentFreezeDeadline,
    getRemainingParts,
    isDocRowUrgent,
    parseLicenseDate,
} from '../../../utils/licenseExpiry';

export const MerchantProfile: React.FC = () => {
    const { t, language } = useLanguage();
    const { 
        storeInfo, account, profile, vendorStatus,
        updateStoreInfo, fetchVendorProfile, 
        documents, isLoadingProfile, performance, 
        updateVendorProfile, uploadLogo, uploadDocument,
        contractAcceptance, contractAcceptances, pendingContractChanges,
        fetchPendingContractChanges, submitContractChange,
        connectStripe, openStripeDashboard, fetchDashboardStats
    } = useVendorStore();

    const { fetchImpactRules, fetchMerchantStats, impactRules, merchantStats } = useReviewStore();
    const { makes, fetchCatalog, isLoading: isLoadingCatalog, subscribeToCatalog, unsubscribeFromCatalog } = useCatalogStore();
    
    const [activeProfileTab, setActiveProfileTab] = useState<'info' | 'contract' | 'restrictions'>('info');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const logoInputRef = React.useRef<HTMLInputElement>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [showAmendmentModal, setShowAmendmentModal] = useState(false);
    const [docUploadModal, setDocUploadModal] = useState<{
        key: MerchantDocKey;
        title: string;
    } | null>(null);
    const [isPrintingContract, setIsPrintingContract] = useState(false);
    const contractPrintRef = useRef<HTMLDivElement>(null);

    const archivedContracts = contractAcceptances.filter((a: any) => a.isActive === false);
    const hasPendingAmendment = pendingContractChanges.length > 0;
    const contractT = t.dashboard.merchant.storeProfile.contract;

    useEffect(() => {
        fetchVendorProfile();
        fetchDashboardStats();
        fetchPendingContractChanges();
        fetchImpactRules();
        fetchMerchantStats();
        if (makes.length === 0) {
            fetchCatalog();
        }
        subscribeToCatalog();
        return () => {
            unsubscribeFromCatalog();
        };
    }, [fetchVendorProfile, fetchDashboardStats, fetchPendingContractChanges, fetchImpactRules, fetchMerchantStats, makes.length, fetchCatalog, subscribeToCatalog, unsubscribeFromCatalog]);

    const handleSubmitContractAmendment = async (data: SecondPartyData) => {
        await submitContractChange(data as Record<string, string>);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateVendorProfile();
            setIsEditing(false);
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Save failed', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingLogo(true);
        try {
            await uploadLogo(file);
        } catch (error) {
            console.error('Logo upload failed', error);
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handlePrintContract = async () => {
        if (!contractAcceptance || isPrintingContract) return;
        const el = contractPrintRef.current;
        if (!el) return;
        setIsPrintingContract(true);
        try {
            await printContractHtml(el.outerHTML, `Contract_${storeInfo.storeName}`, {
                dir: language === 'ar' ? 'rtl' : 'ltr',
            });
        } finally {
            setIsPrintingContract(false);
        }
    };

    const InputGroup = ({ label, value, onChange, disabled = false, type = "text" }: any) => (
        <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider">{label}</label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                disabled={!isEditing || disabled}
                className={`
            w-full bg-[#1A1814] border rounded-xl px-4 py-3 text-white outline-none transition-colors 
            ${isEditing ? 'border-white/10 focus:border-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'border-transparent text-white/70'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
            />
        </div>
    );

    const ProfileSkeleton = () => (
        <div className="space-y-8 animate-pulse">
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard className="p-6 h-64 bg-white/5"><div /></GlassCard>
                    <GlassCard className="p-6 h-48 bg-white/5"><div /></GlassCard>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="p-6 h-96 bg-white/5"><div /></GlassCard>
                </div>
            </div>
        </div>
    );

    if (isLoadingProfile) return <ProfileSkeleton />;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <LicenseExpiryBanner
                onNavigate={() => {
                    setActiveProfileTab('info');
                    window.setTimeout(() => {
                        document.getElementById('merchant-docs-section')?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                        });
                    }, 120);
                }}
            />
            <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-xl sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gold-500/10 rounded-xl border border-gold-500/20">
                        <Store className="text-gold-500" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white leading-none mb-1">
                            {t.dashboard.merchant.storeProfile.title}
                        </h1>
                        <p className="text-xs text-white/40">{t.dashboard.merchant.profile.verified}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mr-4">
                        <button
                            onClick={() => setActiveProfileTab('info')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                activeProfileTab === 'info' 
                                ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' 
                                : 'text-white/60 hover:text-white'
                            }`}
                        >
                            {t.dashboard.merchant.storeProfile.sections.basic}
                        </button>
                        <button
                            onClick={() => setActiveProfileTab('contract')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                activeProfileTab === 'contract' 
                                ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' 
                                : 'text-white/60 hover:text-white'
                            }`}
                        >
                            {t.dashboard.merchant.storeProfile.contract?.tab || 'العقد'}
                        </button>
                        <button
                            onClick={() => setActiveProfileTab('restrictions')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                activeProfileTab === 'restrictions' 
                                ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' 
                                : 'text-white/60 hover:text-white'
                            }`}
                        >
                            {language === 'ar' ? 'القيود والتحكم' : 'Restrictions'}
                        </button>
                    </div>

                    {activeProfileTab === 'info' && (
                        isEditing ? (
                            <>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-5 py-2 rounded-xl font-bold transition-all text-white/60 hover:text-white"
                                >
                                    {t.common?.cancel || (language === 'ar' ? 'إلغاء' : 'Cancel')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-gold-500 hover:bg-gold-600 text-black shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all"
                            >
                                <Edit3 size={18} />
                                {t.dashboard.merchant.storeProfile.actions.edit}
                            </button>
                        )
                    )}
                </div>
            </div>
            <AnimatePresence mode="wait">
                        {activeProfileTab === 'restrictions' && (
                            <motion.div
                                key="restrictions"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Financial Restrictions */}
                                    <GlassCard className="p-8 border-white/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className={`p-4 rounded-2xl ${useVendorStore.getState().withdrawalsFrozen ? 'bg-orange-500/20 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'bg-white/5 text-white/20'}`}>
                                                <CreditCard size={28} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white uppercase tracking-wider">{language === 'ar' ? 'الوضع المالي' : 'Financial Status'}</h3>
                                                <p className="text-xs text-white/40">{language === 'ar' ? 'حالة سحب الرصيد والمدفوعات' : 'Payouts and withdrawal status'}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className={`p-6 rounded-3xl border ${useVendorStore.getState().withdrawalsFrozen ? 'bg-orange-500/5 border-orange-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-sm font-bold text-white">{language === 'ar' ? 'عمليات السحب' : 'Withdrawals'}</span>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${useVendorStore.getState().withdrawalsFrozen ? 'bg-orange-500 text-black' : 'bg-green-500 text-black'}`}>
                                                        {useVendorStore.getState().withdrawalsFrozen ? (language === 'ar' ? 'مجمدة' : 'Frozen') : (language === 'ar' ? 'متاحة' : 'Active')}
                                                    </span>
                                                </div>
                                                {useVendorStore.getState().withdrawalsFrozen && (
                                                    <p className="text-xs text-orange-400/80 leading-relaxed font-medium">
                                                        {useVendorStore.getState().withdrawalFreezeNote || (language === 'ar' ? 'تم تجميد حسابك مؤقتاً من قبل الإدارة.' : 'Your account has been temporarily frozen by administration.')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </GlassCard>

                                    {/* Operational Restrictions */}
                                    <GlassCard className="p-8 border-white/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className={`p-4 rounded-2xl ${useVendorStore.getState().visibilityRestricted || useVendorStore.getState().offerLimit !== -1 ? 'bg-blue-500/20 text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-white/5 text-white/20'}`}>
                                                <AlertTriangle size={28} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white uppercase tracking-wider">{language === 'ar' ? 'القيود التشغيلية' : 'Operational Quotas'}</h3>
                                                <p className="text-xs text-white/40">{language === 'ar' ? 'حدود العروض ونسبة الظهور' : 'Offer limits and visibility rates'}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                                                <div className="text-sm font-bold text-white/60">{language === 'ar' ? 'حد العروض اليومي' : 'Daily Offer Limit'}</div>
                                                <div className="text-lg font-black text-white font-mono">{useVendorStore.getState().offerLimit === -1 ? '∞' : useVendorStore.getState().offerLimit}</div>
                                            </div>

                                            <div className={`p-5 rounded-2xl border transition-all ${useVendorStore.getState().visibilityRestricted ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/[0.02] border-white/5'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-bold text-white/60">{language === 'ar' ? 'نسبة ظهور الطلبات' : 'Order Visibility Rate'}</span>
                                                    <span className="text-lg font-black text-blue-400 font-mono">{useVendorStore.getState().visibilityRate}%</span>
                                                </div>
                                                {useVendorStore.getState().visibilityRestricted && (
                                                    <p className="text-[10px] text-blue-400/60 uppercase font-black tracking-widest italic">
                                                        {useVendorStore.getState().visibilityNote || (language === 'ar' ? 'معدل ظهورك مقيد إدارياً' : 'Visibility rate restricted by admin')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </GlassCard>
                                </div>

                                {useVendorStore.getState().restrictionAlertMessage && (
                                    <GlassCard className="p-6 bg-red-500/5 border-red-500/20">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-red-500/20 rounded-xl text-red-500">
                                                <AlertTriangle size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-red-500 uppercase tracking-widest mb-1">{language === 'ar' ? 'رسالة إدارية هامة' : 'Important Administrative Message'}</h4>
                                                <p className="text-xs text-white/70 leading-relaxed">{useVendorStore.getState().restrictionAlertMessage}</p>
                                            </div>
                                        </div>
                                    </GlassCard>
                                )}
                            </motion.div>
                        )}
                        {activeProfileTab === 'info' && (
                    <motion.div
                        key="info"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        {/* Real-time Re-upload Alerts (2026) */}
                        {Object.entries(documents).some(([_, d]: any) => d?.status === 'reupload_requested') && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="mb-8"
                            >
                                <GlassCard className="p-6 bg-red-600/10 border-red-500/30 border-2 shadow-[0_0_30px_rgba(239,68,68,0.1)] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-3xl -mr-32 -mt-32" />
                                    <div className="flex items-start gap-4">
                                        <div className="p-4 bg-red-500 text-white rounded-2xl shadow-xl shadow-red-500/40 animate-bounce">
                                            <ShieldAlert size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-2">
                                                {language === 'ar' ? 'تنبيه عاجل: مستند يحتاج إلى تصحيح' : 'Urgent: Document Correction Required'}
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                            </h4>
                                            <div className="space-y-4">
                                                {Object.entries(documents).filter(([_, d]: any) => d?.status === 'reupload_requested').map(([key, d]: any) => (
                                                    <div key={key} className="p-4 bg-black/40 rounded-xl border border-red-500/20">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="text-red-400 text-xs font-black uppercase tracking-widest">
                                                                {key.toUpperCase()}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-white/30 font-mono italic">
                                                                <PenTool size={10} />
                                                                {d.adminName || 'Compliance Officer'}
                                                            </div>
                                                        </div>
                                                        <p className="text-white/80 text-sm font-medium italic mb-2 leading-relaxed">
                                                            "{d.reuploadMessage || d.rejectionReason || (language === 'ar' ? 'يرجى مراجعة بيانات هذا المستند وإعادة رفعه' : 'Please review this document and re-upload.')}"
                                                        </p>
                                                        {d.adminSignature && (
                                                            <div className="flex justify-end">
                                                                <div className="text-[9px] text-white/20 border border-white/5 px-2 py-0.5 rounded italic">
                                                                    Digitally Signed Authorization
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        )}

                        {showSaveSuccess && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-center gap-3"
                            >
                                <CheckCircle2 size={20} />
                                {t.dashboard.merchant.profile.saveSuccess}
                            </motion.div>
                        )}

                        {vendorStatus === 'PENDING_REVIEW' && (
                            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex items-start gap-3 animate-pulse">
                                <Shield className="text-orange-500 mt-0.5" size={20} />
                                <div>
                                    <h4 className="text-sm font-bold text-orange-500 mb-1">
                                        {language === 'ar' ? 'حسابك قيد المراجعة المؤقتة' : 'Account Temporarily Under Review'}
                                    </h4>
                                    <p className="text-xs text-orange-400/80 leading-relaxed">
                                        {language === 'ar'
                                            ? 'لقد قمت بتحديث مستندات قانونية هامة. تم إيقاف الحساب مؤقتاً في انتظار موافقة الإدارة.'
                                            : 'You have updated important legal documents. The account is temporarily suspended pending admin approval.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-6">
                                <GlassCard className="p-8 text-center relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4">
                                        <div className="bg-green-500/10 text-green-400 text-[10px] font-bold px-2 py-1 rounded-md border border-green-500/20 uppercase">
                                            {language === 'ar' ? 'نشط' : 'Active'}
                                        </div>
                                    </div>
                                    
                                    <input 
                                        type="file" 
                                        ref={logoInputRef} 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                    />
                                    <div className={`w-32 h-32 mx-auto border-2 border-dashed rounded-full flex items-center justify-center mb-6 overflow-hidden relative group/logo transition-all ${profile.logo ? 'border-gold-500/20 bg-transparent' : 'bg-gradient-to-br from-white/10 to-white/5 border-white/20'}`}>
                                        {isUploadingLogo ? (
                                            <RefreshCw size={32} className="text-gold-500 animate-spin" />
                                        ) : profile.logo ? (
                                            <img src={profile.logo} alt="Logo" className="w-3/4 h-3/4 object-contain transition-transform duration-500 group-hover/logo:scale-110" />
                                        ) : (
                                            <Store size={48} className="text-white/10" />
                                        )}
                                        {isEditing && !isUploadingLogo && (
                                            <div 
                                                onClick={() => logoInputRef.current?.click()}
                                                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-all cursor-pointer"
                                            >
                                                <UploadCloud className="text-white w-8 h-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center gap-2 mb-2">
                                        <h2 className="text-xl font-bold text-white leading-tight">{storeInfo.storeName || t.dashboard.merchant.storeProfile.fields.name}</h2>
                                        {(() => {
                                            const storeRating = performance?.rating || 0;
                                            const totalReviews = merchantStats?.totalReviews ?? 0;
                                            const isFeatured = isFeaturedMerchantByRules(impactRules, storeRating, totalReviews);
                                            
                                            if (!isFeatured) return null;

                                            return (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                                    <Star size={10} className="text-emerald-400" fill="currentColor" />
                                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{t.dashboard.merchant.reviews.featuredStore}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    
                                    <div className="flex items-center justify-center gap-1 mb-6">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <div key={s} className={`w-1.5 h-1.5 rounded-full ${s <= Math.round(performance?.rating || 0) ? 'bg-gold-500' : 'bg-white/10'}`} />
                                        ))}
                                        <span className="text-xs text-white/40 ml-2">{performance?.rating?.toFixed(1)} {t.dashboard.merchant.profile.rating}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-white/5">
                                        {[
                                            { 
                                                label: t.dashboard.merchant.kpi.responseSpeed, 
                                                value: performance?.hasResponseSpeed
                                                    ? `${performance.responseSpeed}h`
                                                    : '—',
                                                status: !performance?.hasResponseSpeed
                                                    ? 'neutral'
                                                    : performance.responseSpeed < 4 ? 'good' : 'bad',
                                            },
                                            { 
                                                label: t.dashboard.merchant.kpi.prepSpeed, 
                                                value: performance?.hasPrepSpeed
                                                    ? `${performance.prepSpeed}h`
                                                    : '—',
                                                status: !performance?.hasPrepSpeed
                                                    ? 'neutral'
                                                    : performance.prepSpeed < 24 ? 'good' : 'bad',
                                            },
                                            { 
                                                label: t.dashboard.merchant.kpi.acceptanceRate, 
                                                value: `${performance?.acceptanceRate ?? 0}%`, 
                                                status: (performance?.acceptanceRate ?? 0) > 50 ? 'good' : 'bad',
                                            },
                                            { 
                                                label: t.dashboard.merchant.kpi.rating, 
                                                value: Number(performance?.rating ?? 0).toFixed(1), 
                                                status: (performance?.rating ?? 0) > 4.5 ? 'good' : 'risk',
                                            },
                                        ].map((kpi, idx) => (
                                            <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center group/kpi hover:border-gold-500/20 transition-all">
                                                <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1 group-hover/kpi:text-gold-500/60 transition-colors">{kpi.label}</div>
                                                <div className={`text-base font-bold ${
                                                    kpi.status === 'good' ? 'text-green-400' : 
                                                    kpi.status === 'risk' ? 'text-yellow-400' :
                                                    kpi.status === 'neutral' ? 'text-white/40' : 'text-red-400'
                                                }`}>
                                                    {kpi.value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </GlassCard>

                                <GlassCard className="p-6">
                                    <h3 className="text-sm font-bold text-gold-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Phone size={14} />
                                        {t.dashboard.merchant.storeProfile.sections.contact}
                                    </h3>
                                    <div className="space-y-3">
                                        {[
                                            { icon: User, label: t.dashboard.merchant.profile.manager, value: account.name, color: 'text-blue-400' },
                                            { icon: Phone, label: t.dashboard.merchant.profile.mobile, value: account.phone, color: 'text-green-400' },
                                            { icon: Mail, label: t.dashboard.merchant.profile.email, value: account.email, color: 'text-purple-400' }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors">
                                                <div className={`p-2 rounded-lg bg-white/5 ${item.color}`}>
                                                    <item.icon size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] text-white/40 uppercase tracking-wider">{item.label}</div>
                                                    <div className="text-white text-sm font-medium truncate">{item.value}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </GlassCard>
                            </div>

                            <div className="lg:col-span-2 space-y-6">
                                <GlassCard className="p-8 relative z-[3]">
                                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                            <div className="w-1 h-6 bg-gold-500 rounded-full" />
                                            {t.dashboard.merchant.storeProfile.sections.basic}
                                        </h3>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                                        <InputGroup
                                            label={t.dashboard.merchant.storeProfile.fields.name}
                                            value={storeInfo.storeName}
                                            onChange={(e: any) => updateStoreInfo('storeName', e.target.value)}
                                        />
                                        
                                        <div className="space-y-6">
                                            <MultiSelectDropdown
                                                label={language === 'ar' ? 'تخصص شركات السيارات' : 'Car Makes Specialization'}
                                                items={makes.map(m => ({ id: m.name, name: m.name, nameAr: m.nameAr }))}
                                                selectedItems={storeInfo.selectedMakes ?? []}
                                                disabled={!isEditing}
                                                onChange={(newMakes) => {
                                                    updateStoreInfo('selectedMakes', newMakes as any);
                                                    const availableModels = makes
                                                        .filter(m => newMakes.includes(m.name))
                                                        .flatMap(m => m.models);
                                                    const availableModelNames = availableModels.map(m => m.name);
                                                    const filteredModels = (storeInfo.selectedModels ?? []).filter(sm => availableModelNames.includes(sm));
                                                    if (filteredModels.length !== (storeInfo.selectedModels ?? []).length) {
                                                        updateStoreInfo('selectedModels', filteredModels as any);
                                                    }
                                                }}
                                                customValue={storeInfo.customMake}
                                                onCustomValueChange={(val) => updateStoreInfo('customMake', val)}
                                            />

                                            { (storeInfo.selectedMakes ?? []).length > 0 && (
                                                <MultiSelectDropdown
                                                    label={language === 'ar' ? 'تخصص موديلات السيارات' : 'Car Models Specialization'}
                                                    items={makes
                                                        .filter(m => (storeInfo.selectedMakes ?? []).includes(m.name))
                                                        .flatMap(m => m.models.map(t => ({ 
                                                            id: t.name, 
                                                            name: t.name, 
                                                            nameAr: t.nameAr, 
                                                            subtext: m.name 
                                                        })))}
                                                    selectedItems={storeInfo.selectedModels ?? []}
                                                    disabled={!isEditing}
                                                    onChange={(newModels) => updateStoreInfo('selectedModels', newModels as any)}
                                                    customValue={storeInfo.customModel}
                                                    onCustomValueChange={(val) => updateStoreInfo('customModel', val)}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs text-white/40 uppercase tracking-wider block">{t.dashboard.merchant.storeProfile.fields.bio}</label>
                                        <textarea
                                            value={storeInfo.bio}
                                            onChange={(e) => updateStoreInfo('bio', e.target.value)}
                                            disabled={!isEditing}
                                            rows={4}
                                            className={`
                                            w-full bg-[#1A1814] border rounded-2xl px-5 py-4 text-white outline-none transition-all resize-none
                                            ${isEditing ? 'border-white/10 focus:border-gold-500 shadow-[0_0_20px_rgba(212,175,55,0.05)]' : 'border-transparent text-white/70'}
                                        `}
                                        />
                                    </div>
                                </GlassCard>



                                <GlassCard className="p-8 relative z-[2]">
                                    <div className="flex items-center gap-3 mb-6">
                                        <MapPin size={24} className="text-gold-500" />
                                        <h3 className="text-lg font-bold text-white">
                                            {t.dashboard.merchant.profile.location}
                                        </h3>
                                    </div>
                                    <div className="relative group/map h-auto min-h-[12rem] bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center justify-center p-6 text-white/40 transition-all hover:bg-white/[0.07]">
                                        <Globe className="mb-3 opacity-20 group-hover/map:scale-110 group-hover/map:opacity-40 transition-all" size={32} />
                                        
                                        {isEditing ? (
                                            <div className="w-full space-y-4">
                                                <InputGroup 
                                                    label={language === 'ar' ? 'العنوان' : 'Address'}
                                                    value={storeInfo.address}
                                                    onChange={(e: any) => updateStoreInfo('address', e.target.value)}
                                                    placeholder={language === 'ar' ? 'أدخل العنوان التفصيلي' : 'Enter detailed address'}
                                                />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-white/40 uppercase tracking-widest">{language === 'ar' ? 'خط العرض' : 'Latitude'}</label>
                                                        <input 
                                                            type="number" 
                                                            step="any"
                                                            value={storeInfo.lat || ''} 
                                                            onChange={(e) => updateStoreInfo('lat', parseFloat(e.target.value))}
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-gold-500 outline-none"
                                                            placeholder="e.g. 24.7136"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-white/40 uppercase tracking-widest">{language === 'ar' ? 'خط الطول' : 'Longitude'}</label>
                                                        <input 
                                                            type="number" 
                                                            step="any"
                                                            value={storeInfo.lng || ''} 
                                                            onChange={(e) => updateStoreInfo('lng', parseFloat(e.target.value))}
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-gold-500 outline-none"
                                                            placeholder="e.g. 46.6753"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-xs font-mono px-6 text-center leading-relaxed text-white/70">
                                                    {storeInfo.address || (language === 'ar' ? 'الموقع غير محدد' : 'Location not specified')}
                                                </div>
                                                <div className="mt-4 flex gap-2">
                                                    <div className="text-[10px] bg-black/30 px-3 py-1.5 rounded-lg border border-white/5 font-mono text-gold-500/80">
                                                        LAT: {storeInfo.lat?.toFixed(6) || '---'}
                                                    </div>
                                                    <div className="text-[10px] bg-black/30 px-3 py-1.5 rounded-lg border border-white/5 font-mono text-gold-500/80">
                                                        LNG: {storeInfo.lng?.toFixed(6) || '---'}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </GlassCard>

                                <GlassCard id="merchant-docs-section" className="p-8 bg-gradient-to-b from-[#1A1814]/50 to-transparent relative z-[1] scroll-mt-24">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                            <FileText size={20} className="text-gold-500" />
                                            {t.dashboard.merchant.storeProfile.sections.docs}
                                        </h3>
                                        <div className="text-[10px] text-white/20 uppercase tracking-[0.2em]">Mandatory Records</div>
                                    </div>

                                    <div className="grid gap-4">
                                        {[
                                            { key: 'cr', label: language === 'ar' ? 'السجل التجاري' : 'Commercial Record' },
                                            { key: 'license', label: language === 'ar' ? 'الرخصة التجارية' : 'Commercial License' },
                                            { key: 'id', label: language === 'ar' ? 'بطاقة الهوية' : 'ID Card' },
                                            { key: 'iban', label: language === 'ar' ? 'شهادة الآيبان' : 'IBAN Certificate' },
                                            { key: 'authLetter', label: language === 'ar' ? 'خطاب التفويض' : 'Authorization Letter' },
                                        ].map((docItem) => {
                                            const doc = documents[docItem.key as keyof typeof documents];
                                            let displayStatus = doc?.status || 'empty';

                                            const expiry = parseLicenseDate(doc?.expiryDate);
                                            const daysLeft = expiry ? daysUntilLicenseExpiry(expiry) : 999;
                                            const freezeParts = expiry
                                                ? getRemainingParts(getDocumentFreezeDeadline(expiry))
                                                : null;
                                            const urgent = isDocRowUrgent(daysLeft, displayStatus);

                                            if (displayStatus === 'approved' && daysLeft <= 0) {
                                                displayStatus = 'expired';
                                            }

                                            const dateLabel = expiry
                                                ? (language === 'ar' ? 'ينتهي في: ' : 'Expires: ') +
                                                  expiry.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB')
                                                : doc?.lastUpdated
                                                    ? new Date(doc.lastUpdated).toLocaleDateString('en-GB')
                                                    : '---';

                                            const activeOrdersCount = performance?.activeOrdersCount || 0;
                                            const hasActiveBusiness = activeOrdersCount > 0;

                                            return (
                                                <div
                                                    key={docItem.key}
                                                    className={`group/doc relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border transition-all ${
                                                        urgent || displayStatus === 'expired' || displayStatus === 'reupload_requested'
                                                            ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_28px_rgba(239,68,68,0.45)] animate-pulse'
                                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className={`p-3 rounded-xl ${
                                                            displayStatus === 'expired' || urgent
                                                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                                                : displayStatus === 'approved'
                                                                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                                  : (displayStatus === 'rejected' || displayStatus === 'reupload_requested')
                                                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                                    : 'bg-white/5 text-white/30 border border-white/10'
                                                        }`}>
                                                            <FileText size={20} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-bold text-white mb-1">{docItem.label}</div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-tight ${
                                                                    displayStatus === 'approved' && !urgent ? 'text-green-400 bg-green-500/5 border-green-500/20' :
                                                                    displayStatus === 'expired' || urgent ? 'text-red-300 bg-red-500/10 border-red-500/30 animate-pulse' :
                                                                    displayStatus === 'pending' || displayStatus === 'uploading' ? 'text-blue-400 bg-blue-500/5 border-blue-500/20' :
                                                                    (displayStatus === 'rejected' || displayStatus === 'reupload_requested') ? 'text-red-400 bg-red-500/5 border-red-500/20' :
                                                                    'text-white/20 bg-white/5 border-white/10'
                                                                }`}>
                                                                    {displayStatus === 'approved' && urgent
                                                                        ? (language === 'ar' ? 'ينتهي قريباً' : 'Expiring Soon')
                                                                        : displayStatus === 'approved' ? (language === 'ar' ? 'مفعل' : 'Active') :
                                                                     displayStatus === 'expired' ? (language === 'ar' ? 'منتهي الصلاحية' : 'Expired') :
                                                                     displayStatus === 'pending' ? (language === 'ar' ? 'بانتظار الموافقة' : 'Pending Approval') :
                                                                     displayStatus === 'uploading' ? (language === 'ar' ? 'جاري الرفع' : 'Uploading') :
                                                                     displayStatus === 'rejected' ? (language === 'ar' ? 'مرفوض' : 'Rejected') :
                                                                     displayStatus === 'reupload_requested' ? (language === 'ar' ? 'مطلوب إعادة رفع' : 'Re-upload Requested') :
                                                                     (language === 'ar' ? 'غير متوفر' : 'Not Provided')}
                                                                </span>
                                                                <span className="text-[10px] text-white/20">•</span>
                                                                <span className={`text-[10px] font-mono italic ${urgent ? 'text-red-200/80' : 'text-white/30'}`}>{dateLabel}</span>
                                                                {expiry && daysLeft !== 999 && (
                                                                    <>
                                                                        <span className="text-[10px] text-white/20">•</span>
                                                                        <span className={`text-[10px] font-bold ${urgent || daysLeft <= 30 ? 'text-red-300' : 'text-green-400/80'}`}>
                                                                            {daysLeft <= 0
                                                                                ? (language === 'ar' ? 'منتهي' : 'Expired')
                                                                                : (language === 'ar' ? `متبقي ${daysLeft} يوم` : `${daysLeft} days left`)}
                                                                            {displayStatus === 'pending' ? (language === 'ar' ? ' (قيد المراجعة)' : ' (pending)') : ''}
                                                                        </span>
                                                                    </>
                                                                )}
                                                                {freezeParts && urgent && (
                                                                    <>
                                                                        <span className="text-[10px] text-white/20">•</span>
                                                                        <span className="text-[10px] font-black text-red-400 tabular-nums">
                                                                            {language === 'ar' ? 'تجميد خلال ' : 'Freeze in '}
                                                                            {formatRemainingCountdown(freezeParts, language === 'ar')}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 sm:self-center">
                                                        {doc?.fileUrl && (
                                                            <button 
                                                                onClick={() => window.open(doc.fileUrl!, '_blank')}
                                                                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"
                                                                title={language === 'ar' ? 'عرض المستند' : 'View Document'}
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDocUploadModal({
                                                                    key: docItem.key as MerchantDocKey,
                                                                    title: docItem.label,
                                                                })
                                                            }
                                                            className={`p-2.5 rounded-xl transition-all relative group/btn cursor-pointer ${
                                                            displayStatus === 'expired' || displayStatus === 'rejected' || displayStatus === 'reupload_requested' || displayStatus === 'empty' || urgent
                                                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20'
                                                                : 'bg-gold-500/5 hover:bg-gold-500/10 text-gold-500/40 hover:text-gold-500 border border-transparent'
                                                        }`} title={
                                                            hasActiveBusiness 
                                                                ? (language === 'ar' ? 'يمكن الرفع الآن، وسيتم بدء المراجعة بعد اكتمال طلباتك النشطة' : 'Upload enabled; formal review will begin after your active orders are completed.')
                                                                : (language === 'ar' ? 'تحديث المستند' : 'Update Document')
                                                        }>
                                                            {displayStatus === 'uploading'
                                                                ? <RefreshCw size={18} className="animate-spin" />
                                                                : <UploadCloud size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </GlassCard>
                            </div>
                        </div>
                        </motion.div>
                        )}

                        {activeProfileTab === 'contract' && (
                    <motion.div
                        key="contract"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {!contractAcceptance && contractAcceptances.length === 0 ? (
                            <div className="bg-black/20 p-12 rounded-3xl border border-white/5 backdrop-blur-xl text-center flex flex-col items-center justify-center space-y-4">
                                <div className="p-6 bg-white/5 rounded-full">
                                    <Archive className="text-white/20" size={64} />
                                </div>
                                <h3 className="text-xl font-bold text-white">
                                    {contractT?.noContract || 'العقد غير متاح حالياً'}
                                </h3>
                                <p className="text-white/40 max-w-sm">
                                    {language === 'ar' 
                                        ? 'سيظهر العقد هنا بمجرد التوقيع الإلكتروني واعتماد الإدارة للمتجر.' 
                                        : 'The contract will appear here once signed and approved by management.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {hasPendingAmendment && (
                                    <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-4">
                                        <div className="p-2 bg-amber-500/20 rounded-xl shrink-0">
                                            <AlertTriangle className="text-amber-400" size={22} />
                                        </div>
                                        <div>
                                            <h4 className="text-amber-300 font-bold text-sm mb-1">
                                                {contractT?.amendment?.pendingTitle || (language === 'ar' ? 'طلب تعديل قيد المراجعة' : 'Amendment Pending Review')}
                                            </h4>
                                            <p className="text-amber-200/70 text-xs leading-relaxed">
                                                {contractT?.amendment?.pendingDesc || (language === 'ar'
                                                    ? 'تم إرسال طلب تعديل بيانات العقد وهو بانتظار موافقة الإدارة.'
                                                    : 'A contract amendment request is awaiting admin approval.')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {contractAcceptance && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-black/20 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-gold-500/10 rounded-lg">
                                                <FileText className="text-gold-500" size={20} />
                                            </div>
                                            <h3 className="text-lg font-bold text-white">
                                                {contractT?.snapshot || 'لقطة العقد'}
                                            </h3>
                                        </div>
                                        
                                        <div className="bg-white/5 rounded-2xl border border-white/5 p-6 h-[600px] overflow-y-auto custom-scrollbar">
                                            <div 
                                                className="prose prose-invert max-w-none text-sm text-white/70 whitespace-pre-wrap leading-relaxed"
                                                dangerouslySetInnerHTML={{ 
                                                    __html: sanitizeHtml(language === 'ar' 
                                                        ? contractAcceptance.contentArSnapshot 
                                                        : contractAcceptance.contentEnSnapshot)
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contract Metadata & Signature */}
                                <div className="space-y-6">
                                    {/* Second Party Data */}
                                    <div className="bg-black/20 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
                                        <div className="flex items-center justify-between gap-3 mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                                    <ShieldCheck className="text-blue-400" size={20} />
                                                </div>
                                                <h3 className="text-lg font-bold text-white">
                                                    {contractT?.secondParty.title || 'بيانات الطرف الثاني'}
                                                </h3>
                                            </div>
                                            {!hasPendingAmendment && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAmendmentModal(true)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-gold-500/10 hover:bg-gold-500 text-gold-500 hover:text-black border border-gold-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    <Edit3 size={14} />
                                                    {contractT?.amendment?.edit || (language === 'ar' ? 'تعديل البيانات' : 'Edit Data')}
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                <span className="text-white/40">{contractT?.secondParty.company || 'الشركة'}</span>
                                                <span className="text-white font-medium">{contractAcceptance.secondPartyData?.companyName}</span>
                                            </div>
                                            <div className="flex justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                <span className="text-white/40">{contractT?.secondParty.manager || 'المدير المسؤول'}</span>
                                                <span className="text-white font-medium">{contractAcceptance.secondPartyData?.managerName}</span>
                                            </div>
                                            <div className="flex justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                <span className="text-white/40">{contractT?.secondParty.crNumber || 'السجل'}</span>
                                                <span className="text-white font-medium">{contractAcceptance.secondPartyData?.crNumber}</span>
                                            </div>
                                            <div className="flex justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                <span className="text-white/40">{contractT?.secondParty.license || 'الرخصة / انتهاء الصلاحية'}</span>
                                                <span className="text-white font-medium">
                                                    {contractAcceptance.secondPartyData?.licenseNumber || contractAcceptance.secondPartyData?.municipalityLicense}
                                                    {contractAcceptance.secondPartyData?.licenseExpiry && ` / ${contractAcceptance.secondPartyData.licenseExpiry}`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                <span className="text-white/40">{contractT?.secondParty.location || 'الإمارة / الدولة'}</span>
                                                <span className="text-white font-medium">
                                                    {contractAcceptance.secondPartyData?.emirate} / {contractAcceptance.secondPartyData?.country}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Signature Information */}
                                    <div className="bg-black/20 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
                                            <div className="flex items-center justify-between gap-3 mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                                        <Fingerprint className="text-green-400" size={20} />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white">
                                                        {t.dashboard.merchant.storeProfile.contract?.signature.title || 'التوقيع والتحقق'}
                                                    </h3>
                                                </div>
                                                <button 
                                                    onClick={handlePrintContract}
                                                    disabled={isPrintingContract}
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-black border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500/10 disabled:hover:text-blue-500"
                                                    title={language === 'ar' ? 'تنزيل العقد PDF' : 'Download Contract PDF'}
                                                >
                                                    <FileText size={14} className="group-hover:scale-110 transition-transform" />
                                                    {language === 'ar' ? 'تنزيل العقد PDF' : 'Download PDF'}
                                                </button>
                                            </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 rounded-2xl bg-green-500/5 border border-green-500/20">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 className="text-green-400" size={20} />
                                                    <span className="text-green-400 font-bold">{language === 'ar' ? 'تم التوقيع إلكترونياً' : 'Signed Electronically'}</span>
                                                </div>
                                                <span className="text-white/40 text-xs">ID: {contractAcceptance.id.split('-')[0]}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                                    <p className="text-white/40 text-xs mb-1">{t.dashboard.merchant.storeProfile.contract?.signature.signedBy}</p>
                                                    <p className="text-white text-sm font-medium">{contractAcceptance.signatureData?.signedName || contractAcceptance.signatureData?.signerName}</p>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                                    <p className="text-white/40 text-xs mb-1">{t.dashboard.merchant.storeProfile.contract?.signature.contact || 'البريد / الهاتف'}</p>
                                                    <p className="text-white text-[10px] font-medium truncate">
                                                        {contractAcceptance.signatureData?.email} / {contractAcceptance.signatureData?.phone}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                                <p className="text-white/40 text-xs mb-1">{t.dashboard.merchant.storeProfile.contract?.signature.date}</p>
                                                <p className="text-white text-sm font-medium">
                                                    {new Date(contractAcceptance.acceptedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                                </p>
                                            </div>

                                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                                <p className="text-white/40 text-xs mb-2 flex items-center gap-1">
                                                    <Globe size={12} /> {t.dashboard.merchant.storeProfile.contract?.signature.security}
                                                </p>
                                                <div className="space-y-1">
                                                    <p className="text-white/60 text-[10px] break-all font-mono">IP: {contractAcceptance.ipAddress}</p>
                                                    <p className="text-white/60 text-[10px] truncate font-mono">UA: {contractAcceptance.userAgent}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                                )}

                                {archivedContracts.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/5 rounded-lg">
                                                <Archive className="text-white/40" size={20} />
                                            </div>
                                            <h3 className="text-lg font-bold text-white">
                                                {contractT?.archived?.title || (language === 'ar' ? 'العقود المؤرشفة' : 'Archived Contracts')}
                                            </h3>
                                        </div>

                                        <div className="p-4 rounded-2xl border border-white/10 bg-white/5 text-xs text-white/50 leading-relaxed">
                                            {contractT?.archived?.banner || (language === 'ar'
                                                ? 'هذه نسخ سابقة من العقد للقراءة فقط. النسخة النشطة أعلاه هي المعتمدة حالياً.'
                                                : 'These are previous contract versions for reference only. The active version above is currently in effect.')}
                                        </div>

                                        <div className="space-y-4">
                                            {archivedContracts.map((archived: any) => (
                                                <div key={archived.id} className="bg-black/20 p-6 rounded-3xl border border-white/5 backdrop-blur-xl opacity-80">
                                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-white/5">
                                                        <span className="text-white/40 text-xs font-mono">ID: {archived.id.split('-')[0]}</span>
                                                        <span className="text-white/60 text-xs">
                                                            {contractT?.archived?.acceptedAt || (language === 'ar' ? 'تاريخ التوقيع' : 'Signed At')}:{' '}
                                                            {new Date(archived.acceptedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
                                                        <div className="flex justify-between p-2 rounded-lg bg-white/5">
                                                            <span className="text-white/40">{contractT?.secondParty.company}</span>
                                                            <span className="text-white/70">{archived.secondPartyData?.companyName}</span>
                                                        </div>
                                                        <div className="flex justify-between p-2 rounded-lg bg-white/5">
                                                            <span className="text-white/40">{contractT?.secondParty.manager}</span>
                                                            <span className="text-white/70">{archived.secondPartyData?.managerName}</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/5 rounded-2xl border border-white/5 p-4 h-48 overflow-y-auto custom-scrollbar">
                                                        <div
                                                            className="prose prose-invert max-w-none text-xs text-white/50 whitespace-pre-wrap leading-relaxed"
                                                            dangerouslySetInnerHTML={{
                                                                __html: sanitizeHtml(language === 'ar'
                                                                    ? archived.contentArSnapshot
                                                                    : archived.contentEnSnapshot),
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {contractAcceptance && (
                            <ContractAmendmentModal
                                isOpen={showAmendmentModal}
                                onClose={() => setShowAmendmentModal(false)}
                                initialData={{
                                    companyName: contractAcceptance.secondPartyData?.companyName || '',
                                    managerName: contractAcceptance.secondPartyData?.managerName || '',
                                    crNumber: contractAcceptance.secondPartyData?.crNumber || '',
                                    licenseNumber: contractAcceptance.secondPartyData?.licenseNumber || contractAcceptance.secondPartyData?.municipalityLicense || '',
                                    licenseExpiry: contractAcceptance.secondPartyData?.licenseExpiry || '',
                                    emirate: contractAcceptance.secondPartyData?.emirate || '',
                                    country: contractAcceptance.secondPartyData?.country || '',
                                }}
                                onSubmit={handleSubmitContractAmendment}
                            />
                        )}
                        </motion.div>
                        )}
                    </AnimatePresence>

                    <MerchantDocumentUploadModal
                        isOpen={Boolean(docUploadModal)}
                        onClose={() => setDocUploadModal(null)}
                        docKey={docUploadModal?.key || 'cr'}
                        docTitle={docUploadModal?.title || ''}
                        initialExpiry={
                            docUploadModal
                                ? (documents as any)?.[docUploadModal.key]?.expiryDate ||
                                  (docUploadModal.key === 'license'
                                      ? contractAcceptance?.secondPartyData?.licenseExpiry
                                      : null)
                                : null
                        }
                        currentFileUrl={
                            docUploadModal
                                ? (documents as any)?.[docUploadModal.key]?.fileUrl || null
                                : null
                        }
                        requiresLegalConfirm={
                            docUploadModal?.key === 'cr' || docUploadModal?.key === 'license'
                        }
                        onSubmit={async ({ file, expiresAt }) => {
                            if (!docUploadModal) return;
                            await uploadDocument(docUploadModal.key as any, file, expiresAt);
                            await fetchVendorProfile();
                        }}
                    />
            {contractAcceptance && (
                <div
                    id="contract-print-source"
                    ref={contractPrintRef}
                    aria-hidden="true"
                    style={{
                        position: 'fixed',
                        left: '-9999px',
                        top: 0,
                        visibility: 'hidden',
                        pointerEvents: 'none',
                    }}
                >
                    <ContractPrintDocument
                        acceptance={mapMerchantContractAcceptance(contractAcceptance)}
                        storeName={storeInfo.storeName}
                        language={language}
                    />
                </div>
            )}
        </div>
    );
};
