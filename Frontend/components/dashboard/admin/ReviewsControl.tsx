
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { useReviewStore } from '../../../stores/useReviewStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Star, CheckCircle2, XCircle, Search, Loader2, MessageSquare, User, Store, Calendar, Zap, Plus, Trash2, Edit3, Settings2, AlertTriangle, ShieldCheck, Lock } from 'lucide-react';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { BlurredSection } from './BlurredSection';

export const ReviewsControl: React.FC = () => {
    const { t, language } = useLanguage();
    const {
        reviews,
        impactRules,
        fetchAdminReviews,
        fetchImpactRules,
        createImpactRule,
        updateImpactRule,
        deleteImpactRule,
        updateReviewStatus,
        subscribeToAdminReviews,
        unsubscribeFromAdminReviews,
        isLoading,
        error
    } = useReviewStore();
    const [tab, setTab] = useState<'PENDING' | 'PUBLISHED' | 'REJECTED' | 'IMPACT'>('PENDING');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredReviews = reviews.filter(r => {
        const matchesTab = r.adminStatus === tab;
        if (!matchesTab) return false;

        const search = searchTerm.toLowerCase();
        return (
            (r.store?.storeName || r.store?.name || '').toLowerCase().includes(search) ||
            (r.customer?.name || '').toLowerCase().includes(search) ||
            (r.comment || '').toLowerCase().includes(search)
        );
    });

    // Rule Management State
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<any>(null);
    const [ruleForm, setRuleForm] = useState({
        minRating: 0,
        maxRating: 5,
        actionType: 'NONE',
        actionLabelAr: '',
        actionLabelEn: '',
        suspendDurationDays: 7,
        isActive: true
    });

    useEffect(() => {
        fetchAdminReviews();
        fetchImpactRules();
        subscribeToAdminReviews();

        return () => {
            unsubscribeFromAdminReviews();
        };
    }, []);

    const canViewTab = useAdminPermissionsStore(s => s.canViewTab);

    // Permissions-based Tab filtering
    const visibleTabs = React.useMemo(() => {
        const allTabs = [
            { id: 'PENDING', label: t.admin.reviewsControl.pending, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
            { id: 'PUBLISHED', label: t.admin.reviewsControl.published, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
            { id: 'REJECTED', label: t.admin.reviewsControl.rejected, color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/20' },
            { id: 'IMPACT', label: t.admin.reviewsControl.impact, color: 'text-gold-400', bg: 'bg-gold-400/10 border-gold-400/20' },
        ];
        return allTabs.map(item => ({
            ...item,
            isLocked: !canViewTab('reviews', item.id)
        }));
    }, [canViewTab, t]);

    // Auto-switch logic: Pick the first allowed tab on initial load
    useEffect(() => {
        const firstAllowed = visibleTabs.find(t => !t.isLocked);
        if (firstAllowed && visibleTabs.find(t => t.id === tab)?.isLocked === undefined) {
            setTab(firstAllowed.id as any);
        }
    }, [visibleTabs]);

    const handleOpenRuleModal = (rule?: any) => {
        if (rule) {
            setEditingRule(rule);
            setRuleForm({
                minRating: Number(rule.minRating),
                maxRating: Number(rule.maxRating),
                actionType: rule.actionType,
                actionLabelAr: rule.actionLabelAr,
                actionLabelEn: rule.actionLabelEn,
                suspendDurationDays: rule.suspendDurationDays || 7,
                isActive: rule.isActive
            });
        } else {
            setEditingRule(null);
            setRuleForm({
                minRating: 0,
                maxRating: 5,
                actionType: 'NONE',
                actionLabelAr: '',
                actionLabelEn: '',
                suspendDurationDays: 7,
                isActive: true
            });
        }
        setIsRuleModalOpen(true);
    };

    const handleSaveRule = async () => {
        let success = false;
        if (editingRule) {
            success = await updateImpactRule(editingRule.id, ruleForm);
        } else {
            success = await createImpactRule(ruleForm);
        }
        if (success) setIsRuleModalOpen(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                        <Star className="text-gold-500" />
                        {t.admin.reviewsControl.title}
                    </h1>
                    <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-1">
                        {t.admin.reviewsControl.subtitle}
                    </p>
                </div>
                <button
                    onClick={() => fetchAdminReviews()}
                    disabled={isLoading}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white"
                >
                    <Loader2 size={20} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Global Statistics Dashboard - Restored */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <GlassCard className="p-5 bg-amber-400/5 border-amber-400/10 group hover:border-amber-400/30 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-amber-400/60 uppercase tracking-widest mb-1">{t.admin.reviewsControl.pending}</p>
                            <h3 className="text-2xl font-black text-white">{reviews.filter(r => r.adminStatus === 'PENDING').length}</h3>
                        </div>
                        <div className="p-2 bg-amber-400/10 rounded-xl text-amber-400">
                            <Lock size={18} />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-5 bg-emerald-400/5 border-emerald-400/10 group hover:border-emerald-400/30 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest mb-1">{t.admin.reviewsControl.published}</p>
                            <h3 className="text-2xl font-black text-white">{reviews.filter(r => r.adminStatus === 'PUBLISHED').length}</h3>
                        </div>
                        <div className="p-2 bg-emerald-400/10 rounded-xl text-emerald-400">
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-5 bg-rose-400/5 border-rose-400/10 group hover:border-rose-400/30 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-rose-400/60 uppercase tracking-widest mb-1">{t.admin.reviewsControl.rejected}</p>
                            <h3 className="text-2xl font-black text-white">{reviews.filter(r => r.adminStatus === 'REJECTED').length}</h3>
                        </div>
                        <div className="p-2 bg-rose-400/10 rounded-xl text-rose-400">
                            <XCircle size={18} />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-5 bg-gold-500/5 border-gold-500/10 group hover:border-gold-500/30 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-gold-500/60 uppercase tracking-widest mb-1">{t.admin.reviewsControl.impact}</p>
                            <h3 className="text-2xl font-black text-white">{impactRules.length}</h3>
                        </div>
                        <div className="p-2 bg-gold-500/10 rounded-xl text-gold-500">
                            <Zap size={18} />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-black/40 border border-white/5 rounded-2xl w-fit">
                {visibleTabs.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setTab(item.id as any)}
                        className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${tab === item.id ? `${item.bg} ${item.color} border shadow-lg` : 'bg-transparent border-transparent text-white/20 hover:text-white/60'
                            } ${item.isLocked ? 'opacity-70' : ''}`}
                    >
                        {tab === item.id && (
                            <motion.div layoutId="active-tab" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current" />
                        )}
                        {item.label}
                        {item.id !== 'IMPACT' && (
                            <span className="ml-2 opacity-30 text-[10px]">({reviews.filter(r => r.adminStatus === item.id).length})</span>
                        )}
                        {item.id === 'IMPACT' && (
                            <Zap size={14} className="ml-2 inline opacity-50" />
                        )}
                        {item.isLocked && <Lock size={12} className="ml-2 opacity-50 text-red-500/50" />}
                    </button>
                ))}
            </div>
            {/* Search Bar - Restored functionality */}
            <div className="relative max-w-xl group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-gold-500 transition-colors">
                    <Search size={18} />
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={language === 'ar' ? 'البحث في المراجعات، المتاجر، أو العملاء...' : 'Search reviews, stores, or customers...'}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white text-sm outline-none focus:border-gold-500/30 transition-all placeholder:text-white/10"
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-4 flex items-center text-white/20 hover:text-white transition-colors"
                    >
                        <XCircle size={18} />
                    </button>
                )}
            </div>

            {/* Content Rendering */}
            <div className="relative">
                <BlurredSection
                    isBlurred={visibleTabs.find(t => t.id === tab)?.isLocked}
                    titleAr={`تبويب ${visibleTabs.find(t => t.id === tab)?.label} محمي`}
                    titleEn={`${visibleTabs.find(t => t.id === tab)?.label} Tab Protected`}
                    descriptionAr="لا تملك صلاحية الوصول لهذا التبويب. يرجى التواصل مع الإدارة العليا لتوسيع نطاق وصولك."
                    descriptionEn="You do not have permission to access this tab. Please contact senior management to expand your access scope."
                >
                    <div className="grid gap-6">
                        {isLoading && reviews.length === 0 && impactRules.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <Loader2 size={40} className="animate-spin text-gold-500/40" />
                                <p className="text-white/20 font-bold uppercase tracking-widest text-xs">{language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading Data...'}</p>
                            </div>
                        ) : tab === 'IMPACT' ? (
                            /* IMPACT RULES TAB */
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold text-white uppercase tracking-tighter flex items-center gap-3">
                                        <Settings2 className="text-gold-500" />
                                        {t.admin.reviewsControl.impact}
                                    </h2>
                                    <button
                                        onClick={() => handleOpenRuleModal()}
                                        className="px-6 py-3 bg-gold-500 hover:bg-gold-600 text-black rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-gold-500/20"
                                    >
                                        <Plus size={18} />
                                        {t.admin.reviewsControl.rules.add}
                                    </button>
                                </div>

                                <div className="grid gap-4">
                                    {impactRules.map(rule => (
                                        <GlassCard key={rule.id} className="p-6 group border-white/5 hover:border-gold-500/30 transition-all">
                                            <div className="flex flex-col md:flex-row items-center gap-6">
                                                {/* Rating Range */}
                                                <div className="w-full md:w-48 bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                                                    <span className="text-[10px] text-white/30 uppercase font-black mb-1">{t.admin.reviewsControl.rating}</span>
                                                    <div className="flex items-center gap-3 text-2xl font-black text-white">
                                                        <span>{Number(rule.minRating).toFixed(1)}</span>
                                                        <span className="text-gold-500 text-sm opacity-50">→</span>
                                                        <span>{Number(rule.maxRating).toFixed(1)}</span>
                                                    </div>
                                                </div>

                                                {/* Rule Details */}
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-lg ${rule.actionType === 'SUSPEND' ? 'bg-rose-500/10 text-rose-500' :
                                                                rule.actionType === 'WARNING' ? 'bg-amber-500/10 text-amber-500' :
                                                                    rule.actionType === 'FEATURED' ? 'bg-emerald-500/10 text-emerald-500' :
                                                                        'bg-white/5 text-white/40'
                                                            }`}>
                                                            {rule.actionType === 'SUSPEND' ? <AlertTriangle size={18} /> :
                                                                rule.actionType === 'WARNING' ? <ShieldCheck size={18} /> :
                                                                    rule.actionType === 'FEATURED' ? <Star size={18} fill="currentColor" /> :
                                                                        <Zap size={18} />}
                                                        </div>
                                                        <h3 className="font-bold text-white text-lg">
                                                            {language === 'ar' ? rule.actionLabelAr : rule.actionLabelEn}
                                                        </h3>
                                                        {!rule.isActive && (
                                                            <span className="px-2 py-0.5 bg-white/5 rounded text-[8px] font-black uppercase text-white/20 border border-white/5">
                                                                {t.admin.reviewsControl.rules.inactive}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-white/40 text-xs italic">
                                                        {rule.actionType === 'SUSPEND'
                                                            ? (language === 'ar' ? `سيتم تحويل حالة المتجر إلى معلق لمدة ${rule.suspendDurationDays} أيام (يتطلب موافقة الأدمن)` : `Store will be set to SUSPENDED for ${rule.suspendDurationDays} days (Requires Admin Approval)`)
                                                            : (language === 'ar' ? `سيتم إرسال إشعار تلقائي للتاجر بهذا الإجراء` : `An automatic notification will be sent to the merchant regarding this action`)
                                                        }
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleOpenRuleModal(rule)}
                                                        className="p-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all border border-white/5"
                                                    >
                                                        <Edit3 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه القاعدة؟' : 'Are you sure you want to delete this rule?')) {
                                                                deleteImpactRule(rule.id);
                                                            }
                                                        }}
                                                        className="p-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    ))}

                                    {impactRules.length === 0 && (
                                        <div className="py-24 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                                            <Settings2 size={48} className="mx-auto mb-4 text-white/10" />
                                            <p className="text-white/30 font-bold uppercase tracking-widest text-xs">
                                                {language === 'ar' ? 'لا توجد قواعد تأثير حالياً' : 'No impact rules defined yet.'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* REVIEWS LIST TAB */
                            <div className="grid gap-4 animate-in slide-in-from-bottom-6 duration-700">
                                {filteredReviews.map(review => (
                                    <GlassCard key={review.id} className="p-6 border-white/5 hover:border-gold-500/20 transition-all group relative overflow-hidden">
                                        <div className={`absolute top-0 right-0 w-1 h-full ${tab === 'PENDING' ? 'bg-amber-500/50' : tab === 'PUBLISHED' ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`} />

                                        <div className="grid md:grid-cols-[1fr_2fr_1fr] items-start gap-8">
                                            {/* Review Meta */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500 font-bold">
                                                        {review.rating}
                                                    </div>
                                                    <div className="flex gap-0.5">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                size={10}
                                                                className={i < review.rating ? 'text-gold-500 fill-gold-500' : 'text-white/10'}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase font-black tracking-widest">
                                                        <Store size={12} />
                                                        {review.store?.storeName || review.store?.name || 'Unknown Store'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase font-black tracking-widest">
                                                        <User size={12} />
                                                        {review.customer?.name || 'Anonymous'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase font-black tracking-widest">
                                                        <Calendar size={12} />
                                                        {new Date(review.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Review Content */}
                                            <div className="space-y-4">
                                                <div className="bg-black/40 p-4 rounded-2xl border border-white/5 min-h-[100px]">
                                                    <div className="flex items-center gap-2 text-white/20 mb-2">
                                                        <MessageSquare size={14} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Comment</span>
                                                    </div>
                                                    <p className="text-white/80 text-sm italic leading-relaxed">
                                                        "{review.comment}"
                                                    </p>
                                                </div>
                                                {review.media && review.media.length > 0 && (
                                                    <div className="flex gap-2">
                                                        {review.media.map((url: string, i: number) => (
                                                            <img key={i} src={url} className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Admin Actions */}
                                            <div className="flex flex-col gap-2">
                                                {tab === 'PENDING' && (
                                                    <>
                                                        <button
                                                            onClick={() => updateReviewStatus(review.id, 'PUBLISHED')}
                                                            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                                                        >
                                                            <CheckCircle2 size={16} />
                                                            {t.admin.reviewsControl.approve}
                                                        </button>
                                                        <button
                                                            onClick={() => updateReviewStatus(review.id, 'REJECTED')}
                                                            className="w-full py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all border border-rose-500/20"
                                                        >
                                                            <XCircle size={16} />
                                                            {t.admin.reviewsControl.reject}
                                                        </button>
                                                    </>
                                                )}
                                                {tab === 'PUBLISHED' && (
                                                    <button
                                                        onClick={() => updateReviewStatus(review.id, 'REJECTED')}
                                                        className="w-full py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all border border-rose-500/20"
                                                    >
                                                        <XCircle size={16} />
                                                        {language === 'ar' ? 'إلغاء النشر' : 'Unpublish'}
                                                    </button>
                                                )}
                                                {tab === 'REJECTED' && (
                                                    <button
                                                        onClick={() => updateReviewStatus(review.id, 'PUBLISHED')}
                                                        className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all border border-emerald-500/20"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                        {language === 'ar' ? 'إعادة نشر' : 'Republish'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </GlassCard>
                                ))}

                                {filteredReviews.length === 0 && (
                                    <div className="py-32 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-[40px]">
                                        <MessageSquare size={64} className="mx-auto mb-6 text-white/5" />
                                        <h3 className="text-white/40 font-black uppercase tracking-[0.2em] text-sm">
                                            {language === 'ar' ? `لا توجد مراجعات ${tab.toLowerCase()} حالياً` : `No ${tab.toLowerCase()} reviews yet.`}
                                        </h3>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </BlurredSection>
            </div>

            {/* Impact Rule Modal */}
            <AnimatePresence>
                {isRuleModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsRuleModalOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-xl relative z-10"
                        >
                            <GlassCard className="p-8 border-gold-500/20 shadow-2xl bg-[#0F0E0D]">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                                        {editingRule ? (language === 'ar' ? 'تعديل القاعدة' : 'Edit Rule') : (language === 'ar' ? 'قاعدة جديدة' : 'New Rule')}
                                    </h2>
                                    <button onClick={() => setIsRuleModalOpen(false)} className="text-white/40 hover:text-white transition-all">
                                        <XCircle size={24} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{t.admin.reviewsControl.rules.minRating}</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="5"
                                                value={ruleForm.minRating}
                                                onChange={(e) => setRuleForm({ ...ruleForm, minRating: parseFloat(e.target.value) })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500/50 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{t.admin.reviewsControl.rules.maxRating}</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="5"
                                                value={ruleForm.maxRating}
                                                onChange={(e) => setRuleForm({ ...ruleForm, maxRating: parseFloat(e.target.value) })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500/50 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{t.admin.reviewsControl.rules.actionType}</label>
                                        <select
                                            value={ruleForm.actionType}
                                            onChange={(e) => setRuleForm({ ...ruleForm, actionType: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500/50 outline-none transition-all appearance-none"
                                        >
                                            <option value="NONE">{t.admin.reviewsControl.rules.actions.NONE}</option>
                                            <option value="SUSPEND">{t.admin.reviewsControl.rules.actions.SUSPEND}</option>
                                            <option value="WARNING">{t.admin.reviewsControl.rules.actions.WARNING}</option>
                                            <option value="FEATURED">{t.admin.reviewsControl.rules.actions.FEATURED}</option>
                                        </select>
                                    </div>

                                    {ruleForm.actionType === 'SUSPEND' && (
                                        <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{t.admin.reviewsControl.rules.duration}</label>
                                            <input
                                                type="number"
                                                value={ruleForm.suspendDurationDays}
                                                onChange={(e) => setRuleForm({ ...ruleForm, suspendDurationDays: parseInt(e.target.value) })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500/50 outline-none transition-all"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{t.admin.reviewsControl.rules.actionLabelAr}</label>
                                        <input
                                            type="text"
                                            value={ruleForm.actionLabelAr}
                                            onChange={(e) => setRuleForm({ ...ruleForm, actionLabelAr: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-right focus:border-gold-500/50 outline-none transition-all"
                                            placeholder="مثال: إيقاف المتجر لمدة أسبوع"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{t.admin.reviewsControl.rules.actionLabelEn}</label>
                                        <input
                                            type="text"
                                            value={ruleForm.actionLabelEn}
                                            onChange={(e) => setRuleForm({ ...ruleForm, actionLabelEn: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500/50 outline-none transition-all"
                                            placeholder="Example: Store Suspension (7 Days)"
                                        />
                                    </div>

                                    <div className="flex items-center gap-4 py-4">
                                        <input
                                            type="checkbox"
                                            id="rule-active"
                                            checked={ruleForm.isActive}
                                            onChange={(e) => setRuleForm({ ...ruleForm, isActive: e.target.checked })}
                                            className="w-5 h-5 rounded border-white/10 bg-white/5 text-gold-500 focus:ring-gold-500 focus:ring-offset-0"
                                        />
                                        <label htmlFor="rule-active" className="text-sm font-bold text-white/60 cursor-pointer">{t.admin.reviewsControl.rules.active}</label>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-12">
                                    <button
                                        onClick={() => setIsRuleModalOpen(false)}
                                        className="flex-1 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest rounded-2xl border border-white/5 transition-all"
                                    >
                                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={handleSaveRule}
                                        className="flex-1 px-8 py-4 bg-gold-500 hover:bg-gold-600 text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-gold-500/20 transition-all"
                                    >
                                        {language === 'ar' ? 'حفظ القاعدة' : 'Save Rule'}
                                    </button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
