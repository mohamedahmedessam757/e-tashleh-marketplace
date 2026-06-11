import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useCustomerStore, Customer } from '../../../stores/useCustomerStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
    ChevronLeft, ChevronRight, User, Mail, Phone, Lock, Unlock,
    Shield, Smartphone, Globe, Package, Scale, RefreshCcw,
    DollarSign, Target, MessageSquare, CheckCircle2, Loader2,
    Calendar, Clock, ShieldAlert, Crown, Diamond, AlertTriangle, Eye, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../../ui/Badge';
import { AdminSignatureModal } from './AdminSignatureModal';
import { AdminInitiateChatModal } from './AdminInitiateChatModal';
import { BlurredSection } from './BlurredSection';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { chatsApi } from '../../../services/api/chats';
import * as XLSX from 'xlsx';

interface AdminCustomerProfileProps {
    customerId: string;
    onBack: () => void;
    onNavigate?: (path: string, id: any) => void;
}

export const AdminCustomerProfile: React.FC<AdminCustomerProfileProps> = ({ customerId, onBack, onNavigate }) => {
    const { t, language } = useLanguage();
    const { fetchCustomerById, toggleStatus, updateNotes } = useCustomerStore();
    const isSectionBlurred = useAdminPermissionsStore(s => s.isSectionBlurred);
    const canViewTab = useAdminPermissionsStore(s => s.canViewTab);

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'disputes' | 'security' | 'financial' | 'restrictions'>('overview');

    // Restrictions State (2026)
    const [restrictionData, setRestrictionData] = useState({
        withdrawalsFrozen: false,
        withdrawalFreezeNote: '',
        orderLimit: -1,
        restrictionAlertMessage: ''
    });
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [internalNotes, setInternalNotes] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    // 2026 Admin Management Tools State
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);

    // Phase 2.3: Edit Profile State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [pendingRestrictionAction, setPendingRestrictionAction] = useState<'UPDATE' | 'CLEAR' | null>(null);
    const [editData, setEditData] = useState({ name: '', email: '', country: '', phone: '' });
    const [isUpdating, setIsUpdating] = useState(false);

    // Phase 1 (2026 Evolution): Ban Control States
    const [isBanning, setIsBanning] = useState(false);
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [banReason, setBanReason] = useState('');

    const [isLive, setIsLive] = useState(false);
    const isAr = language === 'ar';
    const ArrowIcon = isAr ? ChevronRight : ChevronLeft;

    const loadData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        const data = await fetchCustomerById(customerId);
        if (data) {
            setCustomer(data);
            setInternalNotes(data.adminNotes || '');
            setRestrictionData({
                withdrawalsFrozen: data.withdrawalsFrozen || false,
                withdrawalFreezeNote: data.withdrawalFreezeNote || '',
                orderLimit: data.orderLimit || -1,
                restrictionAlertMessage: data.restrictionAlertMessage || ''
            });
            if (silent) {
                setIsLive(true);
                setTimeout(() => setIsLive(false), 3000);
            }
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();

        // Phase 5: Real-time Financial Orchestration (2026 Standard)
        const channel = useCustomerStore.getState().subscribeToCustomerChanges?.(customerId, () => {
            loadData(true); // Silent refresh on background updates
        });
        return () => {
            if (channel) channel.unsubscribe();
        };
    }, [customerId]);

    // Permissions-based Tab filtering
    const visibleTabs = React.useMemo(() => {
        const allTabs = [
            { id: 'overview', label: isAr ? 'نظرة عامة' : 'Overview', icon: User, permissionKey: 'OVERVIEW' },
            { id: 'orders', label: t.admin.customerProfile.orders, icon: Package, permissionKey: 'ORDERS' },
            { id: 'disputes', label: t.admin.customerProfile.disputes, icon: Scale, permissionKey: 'DISPUTES' },
            { id: 'financial', label: isAr ? 'السجل المالي' : 'Financial Journal', icon: DollarSign, permissionKey: 'FINANCIAL' },
            { id: 'security', label: isAr ? 'الجلسات والأمان' : 'Security', icon: Shield, permissionKey: 'SESSIONS' },
            { id: 'restrictions', label: isAr ? 'التحكم والقيود' : 'Restrictions', icon: ShieldAlert, permissionKey: 'RESTRICTIONS' },
        ];
        return allTabs.map(tab => ({
            ...tab,
            isLocked: !canViewTab('CUSTOMER_PROFILE', tab.permissionKey)
        }));
    }, [canViewTab, isAr, t]);

    // Auto-switch logic: Pick the first allowed tab on initial load
    useEffect(() => {
        const firstAllowed = visibleTabs.find(t => !t.isLocked);
        if (firstAllowed && visibleTabs.find(t => t.id === activeTab)?.isLocked === undefined) {
            setActiveTab(firstAllowed.id as any);
        }
    }, [visibleTabs]);

    const handleToggleStatus = async () => {
        if (!customer) return;

        if (customer.status === 'SUSPENDED' || customer.status === 'BLOCKED') {
            setIsBanning(true);
            try {
                await toggleStatus(customer.id, undefined, customer.status);
                await loadData(true);
                window.alert(isAr ? 'تم تنشيط الحساب بنجاح' : 'Account activated successfully');
            } catch {
                window.alert(isAr ? 'فشل تنشيط الحساب' : 'Failed to activate account');
            } finally {
                setIsBanning(false);
            }
        } else {
            setBanReason('');
            setIsBanModalOpen(true);
        }
    };

    const handleConfirmBan = async () => {
        if (!customer || !banReason.trim()) return;
        setIsBanning(true);
        try {
            await toggleStatus(customer.id, banReason, customer.status);
            await loadData(true);
            setIsBanModalOpen(false);
            setBanReason('');
            window.alert(isAr ? 'تم حظر الحساب بنجاح' : 'Account suspended successfully');
        } catch {
            window.alert(isAr ? 'فشل حظر الحساب' : 'Failed to suspend account');
        } finally {
            setIsBanning(false);
        }
    };

    const handleSaveNotes = async () => {
        if (!customer) return;
        setIsSavingNotes(true);
        try {
            await updateNotes(customer.id, internalNotes);
            setCustomer(prev => prev ? { ...prev, adminNotes: internalNotes } : null);
        } finally {
            setIsSavingNotes(false);
        }
    };

    const handleExportPaymentsExcel = () => {
        if (!customer) return;

        const isAr = language === 'ar';

        const paymentsData = (customer.payments || []).map((tx: any) => ({
            [isAr ? 'رقم الحركة' : 'Txn Number']: tx.transactionNumber,
            [isAr ? 'التاريخ' : 'Date']: new Date(tx.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB'),
            [isAr ? 'رقم الطلب' : 'Order Ref']: tx.order?.orderNumber || '---',
            [isAr ? 'المبلغ (AED)' : 'Amount (AED)']: Number(tx.totalAmount),
            [isAr ? 'الوسيلة' : 'Method']: tx.cardBrand || 'Card',
            [isAr ? 'الحالة' : 'Status']: tx.status
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(paymentsData);
        XLSX.utils.book_append_sheet(wb, ws, isAr ? "المدفوعات" : "Payments History");

        XLSX.writeFile(wb, `Payments_Report_${customer.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportWithdrawalsExcel = () => {
        if (!customer) return;

        const isAr = language === 'ar';

        const withdrawalsData = (customer.withdrawalRequests || []).map((req: any) => ({
            [isAr ? 'التاريخ' : 'Date']: new Date(req.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB'),
            [isAr ? 'المبلغ (AED)' : 'Amount (AED)']: Number(req.amount),
            [isAr ? 'الحالة' : 'Status']: req.status,
            [isAr ? 'اسم البنك' : 'Bank Name']: req.bankName || '',
            [isAr ? 'رقم الحساب' : 'Account Number']: req.accountNumber || '',
            [isAr ? 'ملاحظات الإدارة' : 'Admin Notes']: req.adminNotes || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(withdrawalsData);
        XLSX.utils.book_append_sheet(wb, ws, isAr ? "طلبات السحب" : "Withdrawal Requests");

        XLSX.writeFile(wb, `Withdrawals_Report_${customer.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleUpdateCustomer = async () => {
        if (!customer) return;
        setIsUpdating(true);
        try {
            await useCustomerStore.getState().updateCustomer(customer.id, editData);
            setCustomer(prev => prev ? { ...prev, ...editData } : null);
            setIsEditModalOpen(false);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateRestrictions = async (signatureData: any) => {
        if (!customer) return;
        setIsUpdating(true);
        try {
            if (pendingRestrictionAction === 'CLEAR') {
                await useCustomerStore.getState().clearCustomerRestrictions(customer.id, signatureData);
                setRestrictionData({
                    withdrawalsFrozen: false,
                    withdrawalFreezeNote: '',
                    orderLimit: -1,
                    restrictionAlertMessage: ''
                });
                setIsSignatureModalOpen(false);
                window.alert(isAr ? 'تم مسح القيود بنجاح' : 'Restrictions cleared successfully');
            } else {
                const data = { ...restrictionData, ...signatureData };
                await useCustomerStore.getState().updateCustomerRestrictions(customer.id, data);
                setCustomer(prev => prev ? { ...prev, ...data } : null);
                setIsSignatureModalOpen(false);
                window.alert(isAr ? 'تم تحديث القيود بنجاح' : 'Restrictions updated successfully');
            }
            await loadData(true);
        } catch (error) {
            console.error(error);
            window.alert(isAr ? 'فشل تنفيذ الإجراء' : 'Action failed');
        } finally {
            setIsUpdating(false);
            setPendingRestrictionAction(null);
        }
    };

    const handleInitiateChat = async (data: any) => {
        if (!customer) return;
        try {
            const response = await chatsApi.adminInitChat({
                targetUserId: customer.id,
                targetRole: 'CUSTOMER',
                ...data
            });
            if (response?.id) {
                window.alert(isAr ? 'تم فتح المحادثة بنجاح' : 'Chat initiated successfully');
                if (onNavigate) onNavigate('/dashboard/chats', response.id);
            }
        } catch (error: any) {
            console.error('Failed to initiate chat:', error);
            throw error;
        }
    };

    const handleClearRestrictions = () => {
        setPendingRestrictionAction('CLEAR');
        setIsSignatureModalOpen(true);
    };

    const openEditModal = () => {
        if (!customer) return;
        setEditData({
            name: customer.name || '',
            email: customer.email || '',
            country: customer.country || '',
            phone: customer.phone || ''
        });
        setIsEditModalOpen(true);
    };

    // Phase 2: Loyalty Synchronization Logic (v2026 Core)
    const getLoyaltyStats = () => {
        const spent = Number(customer?.totalSpent || customer?.ltv || 0);
        const tiers = [
            { name: 'BASIC', min: 0, max: 1000 },
            { name: 'SILVER', min: 1000, max: 3000 },
            { name: 'GOLD', min: 3000, max: 10000 },
            { name: 'VIP', min: 10000, max: 20000 },
            { name: 'PARTNER', min: 20000, max: Infinity }
        ];

        const currentTierIndex = tiers.findIndex(t => spent >= t.min && spent < t.max);
        const currentTier = tiers[currentTierIndex] || tiers[0];
        const nextTier = tiers[currentTierIndex + 1] || null;

        let progress = 0;
        if (nextTier) {
            const range = nextTier.min - currentTier.min;
            const absoluteProgress = spent - currentTier.min;
            progress = Math.min(100, Math.max(0, (absoluteProgress / range) * 100));
        } else {
            progress = 100; // Crown/Partner Level
        }

        return {
            currentTierName: currentTier.name,
            nextTierName: nextTier ? nextTier.name : 'MAX',
            targetAmount: nextTier ? nextTier.min : spent,
            currentAmount: spent,
            progress
        };
    };

    const stats = getLoyaltyStats();

    // Phase 3: Advanced Trust & Integrity Engine (v2026 Strategy)
    const getTrustStanding = () => {
        const orders = customer?._count?.orders || customer?.orders?.length || 0;
        const ltv = Number(customer?.totalSpent || customer?.ltv || 0);
        const successRate = customer?.successRate || 100;
        const isVerified = !!customer?.emailVerifiedAt;

        if ((orders >= 25 || ltv >= 15000) && successRate >= 95) {
            return {
                label: isAr ? 'أسطوري' : 'LEGEND',
                icon: <Crown size={16} className="text-amber-400" />,
                color: 'text-amber-400',
                bg: 'bg-amber-400/10',
                border: 'border-amber-400/20'
            };
        }
        if ((orders >= 5 || ltv >= 3000) && successRate >= 90) {
            return {
                label: 'VIP',
                icon: <Diamond size={16} className="text-blue-400" />,
                color: 'text-blue-400',
                bg: 'bg-blue-400/10',
                border: 'border-blue-400/20'
            };
        }
        if (isVerified || orders > 0) {
            return {
                label: isAr ? 'موثوق' : 'TRUSTED',
                icon: <Shield size={16} className="text-green-400" />,
                color: 'text-green-400',
                bg: 'bg-green-400/10',
                border: 'border-green-400/20'
            };
        }
        return {
            label: isAr ? 'جديد' : 'NEW',
            icon: <User size={16} className="text-white/40" />,
            color: 'text-white/40',
            bg: 'bg-white/5',
            border: 'border-white/10'
        };
    };

    const trust = getTrustStanding();

    if (isLoading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Loader2 className="animate-spin text-gold-400" size={32} />
            </div>
        );
    }

    if (!customer) return <div className="text-white p-8 text-center">{isAr ? 'العميل غير موجود' : 'Customer not found'}</div>;

    const isCustomerBanned = customer.status === 'SUSPENDED' || customer.status === 'BLOCKED';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

            {/* Account Ban Status Banner */}
            {isCustomerBanned && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-1 rounded-3xl bg-gradient-to-r from-red-500/20 via-red-600/10 to-red-500/20 border border-red-500/30 overflow-hidden shadow-lg shadow-red-500/10"
                >
                    <div className="bg-[#0F0E0D]/80 backdrop-blur-xl p-5 rounded-[22px]">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30 shrink-0">
                                <Lock size={28} className="text-red-500" />
                            </div>
                            <div className="space-y-2 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-black text-white">
                                        {isAr ? 'حظر على حساب العميل' : 'Customer Account Suspended'}
                                    </h3>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                        {isAr ? 'محظور' : 'Banned'}
                                    </span>
                                </div>
                                <p className="text-xs text-white/50">
                                    {isAr
                                        ? 'لا يمكن للعميل الوصول إلى المنصة حتى يتم تنشيط الحساب.'
                                        : 'The customer cannot access the platform until the account is reactivated.'}
                                </p>
                                {customer.suspendReason && (
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">
                                            {isAr ? 'سبب الحظر' : 'Ban Reason'}
                                        </p>
                                        <p className="text-sm text-white/90 font-medium leading-relaxed">
                                            {customer.suspendReason}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Phase 3: Premium Hero Section (Identity + Actions + Metrics) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1814] to-[#0A0908] border border-white/5 shadow-2xl">
                {/* Background Decorative Glows */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-500/5 blur-[120px] rounded-full -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full -ml-24 -mb-24" />

                <div className="relative z-10 p-8">
                    <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">

                        {/* Customer Main Identity Block */}
                        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left flex-1">
                            <button onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/50 hover:text-white border border-white/5 order-first md:order-none mb-4 md:mb-0">
                                <ArrowIcon size={24} />
                            </button>

                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-tr from-gold-500/50 to-amber-500/50 rounded-full blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-[#0F0E0D] border-2 border-gold-500/20 shadow-2xl flex items-center justify-center bg-cover bg-center"
                                    style={{ backgroundImage: customer.avatar ? `url(${customer.avatar})` : 'none' }}>
                                    {!customer.avatar && <User size={64} className="text-gold-500/20" />}
                                </div>
                                <div className={`absolute bottom-2 right-2 p-1.5 rounded-full border shadow-lg ${customer.status === 'ACTIVE' ? 'text-green-400 border-green-500/20 bg-green-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}`}>
                                    {customer.status === 'ACTIVE' ? <CheckCircle2 size={24} fill="currentColor" className="text-[#0F0E0D]" /> : <ShieldAlert size={24} />}
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 max-w-xl">
                                <div className="space-y-1">
                                    <h1 className="text-3xl md:text-4xl font-black text-white flex items-center justify-center md:justify-start gap-3 tracking-tight">
                                        <BlurredSection isBlurred={isSectionBlurred('customer_name')}>
                                            {customer.name || 'User Name'}
                                        </BlurredSection>
                                        {customer.emailVerifiedAt && <Badge status="ACTIVE" className="bg-blue-500/20 text-blue-400 border-blue-500/20" />}
                                    </h1>
                                    <BlurredSection isBlurred={isSectionBlurred('customer_phone')}>
                                        <p className="text-gold-500/60 font-mono text-sm uppercase tracking-wide flex items-center justify-center md:justify-start gap-2">
                                            <Smartphone size={14} /> {customer.phone || '---'}
                                        </p>
                                    </BlurredSection>
                                    {isCustomerBanned && (
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                                            {isAr ? 'حساب محظور' : 'Account Banned'}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                                    <BlurredSection isBlurred={isSectionBlurred('customer_phone')}>
                                        <div className="flex items-center justify-center md:justify-start gap-3 text-white/70 hover:text-white transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Mail size={14} className="text-gold-500/70" /></div>
                                            <span className="text-sm font-medium truncate">{customer.email}</span>
                                        </div>
                                    </BlurredSection>
                                    <div className="flex items-center justify-center md:justify-start gap-3 text-white/70 hover:text-white transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Globe size={14} className="text-gold-500/70" /></div>
                                        <span className="text-sm font-medium">{customer.country || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-center md:justify-start gap-3 text-white/70 hover:text-white transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Calendar size={14} className="text-gold-500/70" /></div>
                                        <span className="text-sm font-medium">
                                            {isAr ? 'انضم في' : 'Joined'}: {new Date(customer.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                    </div>
                                    {customer.lastLoginIp && (
                                        <div className="flex items-center justify-center md:justify-start gap-3 text-white/70 hover:text-white transition-colors truncate">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Shield size={14} className="text-gold-500/70" /></div>
                                            <span className="text-sm font-medium font-mono text-[10px]">{customer.lastLoginIp}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Section: Actions + Metrics */}
                        <div className="flex flex-col gap-6 w-full lg:w-72">
                            {/* Strategic Action Hub */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-2 mb-1">
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-wide">{isAr ? 'مركز التحكم' : 'Action Hub'}</span>
                                    <div className={`w-2 h-2 rounded-full ${
                                        customer.status === 'ACTIVE'
                                            ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                                            : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse'
                                    }`} />
                                </div>
                                <button
                                    onClick={openEditModal}
                                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black uppercase text-gold-500 tracking-tighter transition-all flex items-center justify-center gap-2 mb-2"
                                >
                                    <Target size={14} />
                                    {isAr ? 'تعديل البيانات الأساسية' : 'Edit Primary Data'}
                                </button>

                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        onClick={() => setIsChatModalOpen(true)}
                                        className="w-full py-3.5 bg-primary-500/10 hover:bg-primary-500 text-primary-400 hover:text-black font-black text-[10px] uppercase tracking-widest rounded-2xl border border-primary-500/20 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <MessageSquare size={16} className="group-hover:rotate-12 transition-transform" />
                                        {isAr ? 'بدء محادثة فورية' : 'Direct Support Chat'}
                                    </button>
                                    <button
                                        onClick={handleToggleStatus}
                                        disabled={isBanning}
                                        className={`w-full py-3.5 font-black text-xs uppercase tracking-[0.1em] rounded-2xl hover:scale-[1.02] transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed ${customer.status === 'ACTIVE'
                                                ? 'bg-red-500 text-white shadow-red-500/20'
                                                : 'bg-green-500 text-[#0F0E0D] shadow-green-500/20'
                                            }`}
                                    >
                                        {isBanning ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                {isAr ? 'جاري التنفيذ...' : 'Processing...'}
                                            </>
                                        ) : (
                                            <>
                                                {customer.status === 'ACTIVE' ? <Lock size={16} /> : <Unlock size={16} />}
                                                {customer.status === 'ACTIVE' ? (isAr ? 'حظر الحساب' : 'Suspend Account') : (isAr ? 'تنشيط الحساب' : 'Activate Account')}
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={async () => {
                                            setIsUpdating(true);
                                            await fetchCustomerById(customerId).then(data => data && setCustomer(data));
                                            setIsUpdating(false);
                                        }}
                                        disabled={isUpdating}
                                        className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/30 hover:text-white font-black text-[9px] uppercase tracking-[0.3em] rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5 disabled:opacity-50"
                                    >
                                        {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                                        {isAr ? 'تحديث البيانات' : 'Sync Intelligence'}
                                    </button>
                                </div>
                            </div>

                            {/* Compact Metrics Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <GlassCard className="p-3 bg-white/5 border-white/5 hover:border-gold-500/30 transition-all">
                                    <span className="text-[9px] uppercase font-black text-white/40 block mb-1">Wallet</span>
                                    <div className="text-sm font-black text-white truncate">
                                        <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
                                            {(customer.customerBalance || 0).toLocaleString()} <span className="text-[8px] text-white/40">AED</span>
                                        </BlurredSection>
                                    </div>
                                </GlassCard>

                                <GlassCard className="p-3 bg-white/5 border-white/5 hover:border-green-500/30 transition-all">
                                    <span className="text-[9px] uppercase font-black text-white/40 block mb-1">Spent</span>
                                    <div className="text-sm font-black text-white truncate">
                                        <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
                                            {Number(customer.totalSpent || customer.ltv || 0).toLocaleString()} <span className="text-[8px] text-white/40">AED</span>
                                        </BlurredSection>
                                    </div>
                                </GlassCard>

                                <GlassCard className="p-3 bg-white/5 border-white/5 hover:border-blue-500/30 transition-all text-center">
                                    <span className="text-[9px] uppercase font-black text-white/40 block mb-1">Orders</span>
                                    <div className="text-sm font-black text-white uppercase">{customer._count?.orders || customer.orders?.length || 0}</div>
                                </GlassCard>

                                <GlassCard className="p-3 bg-white/5 border-white/5 hover:border-yellow-500/30 transition-all text-center">
                                    <span className="text-[9px] uppercase font-black text-white/40 block mb-1">Success</span>
                                    <div className="text-sm font-black text-white">{customer.successRate || 100}%</div>
                                </GlassCard>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* NEW: Administrative Restriction Banners (2026 Admin Visibility) */}
            {(customer.withdrawalsFrozen || (customer.orderLimit && customer.orderLimit !== -1)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customer.withdrawalsFrozen && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-4 animate-in slide-in-from-top-2 duration-500">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-widest">{isAr ? 'عمليات السحب مجمدة' : 'Withdrawals Frozen'}</h4>
                                <p className="text-[10px] text-red-400 font-bold mt-0.5">{customer.withdrawalFreezeNote || (isAr ? 'تم تقييد سحب الأموال لهذا العميل' : 'Financial payouts restricted for this user')}</p>
                            </div>
                        </div>
                    )}
                    {customer.orderLimit && customer.orderLimit !== -1 && (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-4 animate-in slide-in-from-top-2 duration-500 delay-75">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                <Package size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-widest">{isAr ? 'حد الطلبات مفعل' : 'Order Limit Active'}</h4>
                                <p className="text-[10px] text-amber-400 font-bold mt-0.5">{isAr ? `محدد بـ ${customer.orderLimit} طلبات يومياً` : `Limited to ${customer.orderLimit} orders per day`}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">

                {/* Col 1: Admin Quick Notes Support */}
                <div className="space-y-6">
                    <GlassCard className="p-5 bg-gold-500/5 border-gold-500/20">
                        <div className="flex items-center justify-between mb-3 text-gold-400 uppercase tracking-widest text-[10px] font-bold">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={14} />
                                {t.admin.customersTable.adminNotes}
                            </div>
                            <button
                                onClick={handleSaveNotes}
                                disabled={isSavingNotes || internalNotes === customer.adminNotes}
                                className="hover:text-gold-300 disabled:opacity-30 transition-all flex items-center gap-1"
                            >
                                {isSavingNotes ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                {isAr ? 'حفظ' : 'Save'}
                            </button>
                        </div>
                        <textarea
                            value={internalNotes}
                            onChange={(e) => setInternalNotes(e.target.value)}
                            placeholder={isAr ? 'اكتب ملاحظات سرية هنا...' : 'Write confidential notes here...'}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-gold-500/30 min-h-[120px] transition-all resize-none"
                        />
                    </GlassCard>
                </div>
                {/* Col 2 & 3: Navigation & Active Content */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Tab Navigation Hub */}
                    <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5 w-fit overflow-x-auto no-scrollbar">
                        {visibleTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-gold-500 text-[#0F0E0D] shadow-lg shadow-gold-500/20'
                                        : 'text-white/40 hover:text-white hover:bg-white/5'
                                    } ${tab.isLocked ? 'opacity-70' : ''}`}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                                {tab.isLocked && <Lock size={12} className={activeTab === tab.id ? 'text-[#0F0E0D]/50' : 'text-red-500/50'} />}
                            </button>
                        ))}
                    </div>

                    <GlassCard className="min-h-[500px] flex flex-col bg-[#1A1814] overflow-hidden">
                        <div className="flex-1 p-6 relative">
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
                                        transition={{ duration: 0.2 }}
                                    >
                                        {activeTab === 'overview' && (
                                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                                    {/* Loyalty & Rewards Status */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
                                                                <Target size={20} className="text-gold-500" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-white font-black uppercase tracking-wider text-sm">{isAr ? 'برنامج الولاء' : 'Loyalty Program'}</h3>
                                                                <p className="text-white/30 text-[10px] uppercase">{isAr ? 'تصنيف العميل والمكافآت' : 'Customer tier & rewards'}</p>
                                                            </div>
                                                        </div>
                                                        <GlassCard className="p-5 bg-white/[0.02] border-white/5 relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                                <Globe size={80} className="text-gold-500" />
                                                            </div>
                                                            <div className="flex justify-between items-end mb-4">
                                                                <div>
                                                                    <div className="text-[10px] text-white/30 uppercase mb-1">{isAr ? 'المستوى الحالي' : 'Current Tier'}</div>
                                                                    <div className="text-2xl font-black text-white flex items-center gap-2">
                                                                        {stats.currentTierName}
                                                                        <div className="w-2 h-2 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-[10px] text-white/30 uppercase mb-1">{isAr ? 'نقاط الولاء' : 'Loyalty Points'}</div>
                                                                    <div className="text-xl font-black text-gold-500">{customer.loyaltyPoints || 0}</div>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                                    <span className="text-white/40">
                                                                        {isAr ? 'التقدم للمستوى التالي' : 'Next Tier'}: <span className="text-white/60 ml-1">{stats.nextTierName}</span>
                                                                    </span>
                                                                    <span className="text-gold-500">
                                                                        {Math.floor(stats.currentAmount).toLocaleString()} / {stats.targetAmount.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-gold-600 to-amber-400 rounded-full transition-all duration-1000"
                                                                        style={{ width: `${stats.progress}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </GlassCard>
                                                    </div>

                                                    {/* Referral System */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                                                <RefreshCcw size={20} className="text-blue-500" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-white font-black uppercase tracking-wider text-sm">{isAr ? 'نظام الإحالة' : 'Referral System'}</h3>
                                                                <p className="text-white/30 text-[10px] uppercase">{isAr ? 'أداء التوسع والنمو' : 'Growth & expansion performance'}</p>
                                                            </div>
                                                        </div>
                                                        <GlassCard className="p-5 bg-white/[0.02] border-white/5">
                                                            <div className="flex justify-between items-center mb-6">
                                                                <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col">
                                                                    <span className="text-[10px] text-white/30 uppercase mb-1">{isAr ? 'كود الإحالة' : 'Referral Code'}</span>
                                                                    <span className="text-lg font-black font-mono text-white tracking-widest">{customer.referralCode || 'NOTSET'}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-[10px] text-white/30 uppercase block mb-1">{isAr ? 'إجمالي الإحالات' : 'Total Referrals'}</span>
                                                                    <span className="text-3xl font-black text-blue-500">
                                                                        {customer.referralCount || customer._count?.referredUsers || 0}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </GlassCard>
                                                    </div>

                                                    {/* Violation & Security Standing */}
                                                    <div className="md:col-span-2 space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                                                <Shield size={20} className="text-red-500" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-white font-black uppercase tracking-wider text-sm">{isAr ? 'سجل الالتزام والأمان' : 'Security & Compliance'}</h3>
                                                                <p className="text-white/30 text-[10px] uppercase">{isAr ? 'مؤشر النزاهة والمخالفات' : 'Integrity & violation index'}</p>
                                                            </div>
                                                        </div>
                                                        <GlassCard className="p-6 bg-white/[0.02] border-white/5 relative overflow-hidden group">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                                {/* Violation Points Metric */}
                                                                <div className="space-y-4">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">{isAr ? 'نقاط المخالفات' : 'Violation Score'}</span>
                                                                        <span className={`text-[10px] font-black uppercase ${(customer.violationScore || 0) > 50 ? 'text-red-500' : 'text-green-500'}`}>
                                                                            {(customer.violationScore || 0) > 70 ? (isAr ? 'حرج' : 'CRITICAL') : (customer.violationScore || 0) > 30 ? (isAr ? 'تحذير' : 'WARNING') : (isAr ? 'آمن' : 'STABLE')}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-end gap-2">
                                                                        <span className={`text-5xl font-black tracking-tighter ${(customer.violationScore || 0) > 45 ? 'text-red-500' : 'text-white'}`}>
                                                                            {customer.violationScore || 0}
                                                                        </span>
                                                                        <span className="text-white/20 text-sm mb-2 font-mono">/ 150 PTS</span>
                                                                    </div>
                                                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all duration-1000 ${(customer.violationScore || 0) > 100 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                                                                                    (customer.violationScore || 0) > 50 ? 'bg-yellow-500' : 'bg-green-500'
                                                                                }`}
                                                                            style={{ width: `${Math.min(100, ((customer.violationScore || 0) / 150) * 100)}%` }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Activity Counter: Disputes */}
                                                                <div className="flex flex-col justify-center border-l border-white/5 pl-8">
                                                                    <span className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">{isAr ? 'النزاعات النشطة' : 'Active Disputes'}</span>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-4xl font-black text-white">{customer._count?.disputes || 0}</span>
                                                                        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${customer._count?.disputes > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/10 text-green-500'}`}>
                                                                            {customer._count?.disputes > 0 ? (isAr ? 'مفتوح' : 'OPEN') : (isAr ? 'لا يوجد' : 'NONE')}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Trust Matrix Standing */}
                                                                <div className="flex flex-col justify-center border-l border-white/5 pl-8">
                                                                    <span className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2">{isAr ? 'تصنيف الثقة' : 'Trust Standing'}</span>
                                                                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-500 ${trust.bg} ${trust.border} w-fit`}>
                                                                        <div className="p-2 bg-black/20 rounded-xl">
                                                                            {trust.icon}
                                                                        </div>
                                                                        <div>
                                                                            <span className={`text-xs font-black uppercase tracking-[0.2em] block ${trust.color}`}>{trust.label}</span>
                                                                            <span className="text-[8px] text-white/20 uppercase font-bold">{isAr ? 'معايير النزاهة 2026' : 'INTEGRITY INDEX v2.6'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </GlassCard>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Phase 4: Optimized Orders Tab (v2026 Strategy) */}
                                        {activeTab === 'orders' && (
                                            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                                {customer.orders?.map(order => {
                                                    const itemsCount = order.parts?.length || 1;
                                                    const isMultiItem = itemsCount > 1;
                                                    const computeGrossPrice = (unitPrice: number, shippingCost: number) => {
                                                        const uPrice = Number(unitPrice || 0);
                                                        const sCost = Number(shippingCost || 0);
                                                        const percentComm = Math.round(uPrice * 0.25);
                                                        const commission = uPrice > 0 ? Math.max(percentComm, 100) : 0;
                                                        return uPrice + sCost + commission;
                                                    };

                                                    const totalPrice = Number(order.totalAmount) ||
                                                        (order.payments?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)) ||
                                                        (order.offers?.filter((off: any) => off.status === 'accepted').reduce((sum: number, off: any) => sum + computeGrossPrice(off.unitPrice, off.shippingCost), 0)) ||
                                                        (order.parts?.reduce((sum: number, p: any) => {
                                                            const partOffer = p.offers?.find((off: any) => off.status === 'accepted');
                                                            return sum + (partOffer ? computeGrossPrice(partOffer.unitPrice, partOffer.shippingCost) : Number(p.totalAmount || 0));
                                                        }, 0)) ||
                                                        (order.acceptedOffer
                                                            ? computeGrossPrice(order.acceptedOffer.unitPrice, order.acceptedOffer.shippingCost)
                                                            : 0);

                                                    return (
                                                        <div
                                                            key={order.id}
                                                            onClick={() => onNavigate && onNavigate('admin-order-details', order.id)}
                                                            className="group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-gold-500/30 transition-all cursor-pointer shadow-lg hover:shadow-gold-500/5"
                                                        >
                                                            <div className="flex items-center gap-5 relative z-10">
                                                                <div className="relative">
                                                                    <div className="w-14 h-14 rounded-2xl bg-[#0F0E0D] border border-white/5 flex items-center justify-center text-gold-500 group-hover:bg-gold-500 group-hover:text-[#0F0E0D] transition-all duration-300 shadow-xl">
                                                                        <Package size={24} />
                                                                    </div>
                                                                    {isMultiItem && (
                                                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 text-[#0F0E0D] rounded-lg text-[10px] font-black flex items-center justify-center border-2 border-[#0F0E0D] shadow-lg">
                                                                            {itemsCount}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-black text-white group-hover:text-gold-500 transition-colors flex items-center gap-2">
                                                                        {isMultiItem ? (isAr ? 'طلب متعدد القطع' : 'Multi-Item Order') : order.partName}
                                                                        {order.isUrgent && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                                                                        {isMultiItem && (
                                                                            <span className="text-[10px] px-2 py-0.5 bg-gold-500/10 text-gold-500 rounded-md uppercase font-black tracking-widest border border-gold-500/20">
                                                                                {itemsCount} {isAr ? 'قطع' : 'ITEMS'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-3 mt-1.5">
                                                                        <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase bg-white/5 px-2 py-0.5 rounded-md">#{order.orderNumber}</span>
                                                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                                                        <span className="text-[10px] text-white/30 font-medium">
                                                                            {new Date(order.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-8 relative z-10">
                                                                <div className="text-right">
                                                                    <Badge status={order.status} className="mb-2" />
                                                                    <div className="text-lg font-black text-white tabular-nums tracking-tighter">
                                                                        {totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                        <span className="text-[10px] text-gold-500/80 ml-1.5 font-bold uppercase tracking-widest">aed</span>
                                                                    </div>
                                                                </div>
                                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-gold-500/10 group-hover:text-gold-500 transition-all border border-white/5 group-hover:border-gold-500/20">
                                                                    {isAr ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {(!customer.orders || customer.orders.length === 0) && (
                                                    <div className="flex flex-col items-center justify-center py-24 opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                                                        <Package size={80} strokeWidth={1} className="mb-6 text-gold-500" />
                                                        <p className="text-sm font-black uppercase tracking-[0.3em] text-white">{isAr ? 'لم يتم تسجيل أي طلبات حتى الآن' : 'No analytics-ready orders found'}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Phase 5: Unified Complaints & Returns Tab (v2026 Strategy) */}
                                        {activeTab === 'disputes' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                                {[
                                                    ...(customer.disputes || []).map(d => ({ ...d, type: 'DISPUTE' })),
                                                    ...(customer.returns || []).map(r => ({ ...r, type: 'RETURN' }))
                                                ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(caseItem => (
                                                    <div
                                                        key={`${caseItem.type}-${caseItem.id}`}
                                                        className={`p-5 rounded-2xl border transition-all flex justify-between items-center group relative overflow-hidden ${caseItem.type === 'DISPUTE'
                                                                ? 'bg-red-500/[0.03] border-red-500/10 hover:border-red-500/30'
                                                                : 'bg-amber-500/[0.03] border-amber-500/10 hover:border-amber-500/30'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-5 relative z-10">
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${caseItem.type === 'DISPUTE' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                                                                }`}>
                                                                {caseItem.type === 'DISPUTE' ? <Scale size={22} /> : <RefreshCcw size={22} />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-white/5 text-white/40 rounded border border-white/5">
                                                                        {caseItem.type === 'DISPUTE' ? (isAr ? 'نزاع' : 'DISPUTE') : (isAr ? 'إرجاع' : 'RETURN')}
                                                                    </span>
                                                                    <div className="text-sm font-black text-white">{caseItem.reason || (isAr ? 'بدون سبب مسجل' : 'No reason provided')}</div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="text-[9px] text-white/30 font-mono tracking-tight uppercase">CASE_ID: {caseItem.id.slice(0, 8)}...</div>
                                                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                                                    <div className="text-[9px] text-white/30 font-medium lowercase">
                                                                        {new Date(caseItem.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6 relative z-10">
                                                            <div className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg tracking-widest shadow-lg ${caseItem.status === 'OPEN' || caseItem.status === 'PENDING'
                                                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                                    : 'bg-green-500/10 text-green-500 border border-green-500/20 shadow-green-500/5'
                                                                }`}>
                                                                {caseItem.status}
                                                            </div>
                                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-white/10 group-hover:text-white transition-all border border-white/5">
                                                                {isAr ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {((!customer.disputes || customer.disputes.length === 0) && (!customer.returns || customer.returns.length === 0)) && (
                                                    <div className="flex flex-col items-center justify-center py-20 opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                                                        <Shield size={64} className="mb-4 text-green-500" />
                                                        <p className="text-sm font-black uppercase tracking-[0.2em]">{isAr ? 'السجل نظيف تماماً' : 'Total Clean Record'}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Phase 5: Unified Financial & KYC Tab */}
                                        {activeTab === 'financial' && (
                                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                                                {/* Luxury Live Toast (Phase 5) */}
                                                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
                                                    {isLive && (
                                                        <div className="bg-gold-500 text-black px-6 py-3 rounded-2xl shadow-[0_0_50px_rgba(212,175,55,0.3)] border border-gold-400/50 flex items-center gap-3 animate-in fade-in zoom-in slide-in-from-top-4 duration-300">
                                                            <div className="w-2 h-2 bg-black rounded-full animate-ping" />
                                                            <span className="text-xs font-black uppercase tracking-[0.2em]">{isAr ? 'تم تحديث البيانات مالياً' : 'Financial Data Synced Live'}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Financial Journal Header Stats */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-1">
                                                    <GlassCard className="p-5 bg-gold-500/5 border-gold-500/10 relative overflow-hidden group">
                                                        <div className={`absolute inset-0 bg-gold-500/20 transition-opacity duration-1000 ${isLive ? 'opacity-100' : 'opacity-0'}`} />
                                                        <span className="relative z-10 text-[10px] text-white/30 uppercase font-black tracking-widest block mb-1">{isAr ? 'الرصيد الكلي' : 'Total Balance'}</span>
                                                        <div className="relative z-10 flex items-baseline gap-2">
                                                            <span className="text-2xl font-black text-white">{Number(customer.customerBalance || 0).toLocaleString()}</span>
                                                            <span className="text-[10px] text-gold-500 font-bold uppercase">AED</span>
                                                        </div>
                                                    </GlassCard>
                                                    <GlassCard className="p-5 bg-blue-500/5 border-blue-500/10 relative overflow-hidden group">
                                                        <div className={`absolute inset-0 bg-blue-500/20 transition-opacity duration-1000 ${isLive ? 'opacity-100' : 'opacity-0'}`} />
                                                        <span className="relative z-10 text-[10px] text-white/30 uppercase font-black tracking-widest block mb-1">{isAr ? 'إجمالي المدفوعات' : 'Total Paid'}</span>
                                                        <div className="relative z-10 flex items-baseline gap-2">
                                                            <span className="text-2xl font-black text-white">{Number(customer.totalSpent || 0).toLocaleString()}</span>
                                                            <span className="text-[10px] text-blue-500 font-bold uppercase">AED</span>
                                                        </div>
                                                    </GlassCard>
                                                    <GlassCard className="p-5 bg-green-500/5 border-green-500/10 relative overflow-hidden group">
                                                        <div className={`absolute inset-0 bg-green-500/20 transition-opacity duration-1000 ${isLive ? 'opacity-100' : 'opacity-0'}`} />
                                                        <span className="relative z-10 text-[10px] text-white/30 uppercase font-black tracking-widest block mb-1">{isAr ? 'عمليات السحب' : 'Total Withdrawals'}</span>
                                                        <div className="relative z-10 flex items-baseline gap-2">
                                                            <span className="text-2xl font-black text-white">
                                                                {customer.withdrawalRequests?.filter(r => r.status === 'COMPLETED').reduce((acc, r) => acc + Number(r.amount), 0).toLocaleString() || 0}
                                                            </span>
                                                            <span className="text-[10px] text-green-500 font-bold uppercase">AED</span>
                                                        </div>
                                                    </GlassCard>
                                                    <GlassCard className="p-5 bg-purple-500/5 border-purple-500/10 relative overflow-hidden group">
                                                        <div className={`absolute inset-0 bg-purple-500/20 transition-opacity duration-1000 ${isLive ? 'opacity-100' : 'opacity-0'}`} />
                                                        <span className="relative z-10 text-[10px] text-white/30 uppercase font-black tracking-widest block mb-1">{isAr ? 'نقاط الولاء' : 'Loyalty Points'}</span>
                                                        <div className="relative z-10 flex items-baseline gap-2">
                                                            <span className="text-2xl font-black text-white">{customer.loyaltyPoints || 0}</span>
                                                            <span className="text-[10px] text-purple-500 font-bold uppercase">PTS</span>
                                                        </div>
                                                    </GlassCard>
                                                </div>

                                                <div className="flex flex-col gap-10">

                                                    {/* Journal 1: Orders & Payments Ledger */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between px-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-500 shadow-lg">
                                                                    <DollarSign size={20} />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{isAr ? 'سجل الطلبات والمدفوعات' : 'Orders & Payments Ledger'}</h3>
                                                                    <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">{isAr ? 'تتبع التدفقات المالية للطلبات' : 'Transaction flow per order'}</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={handleExportPaymentsExcel}
                                                                className="flex items-center gap-2 px-6 py-2.5 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-black border border-green-500/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all group"
                                                            >
                                                                <FileText size={14} className="group-hover:scale-110 transition-transform" />
                                                                {isAr ? 'تصدير تقرير EXCEL' : 'Export Excel Report'}
                                                            </button>
                                                        </div>

                                                        <GlassCard className="min-h-[400px] border-white/5 bg-white/[0.01] overflow-hidden flex flex-col">
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left border-collapse">
                                                                    <thead>
                                                                        <tr className="border-b border-white/5 bg-white/[0.02]">
                                                                            <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{isAr ? 'العملية / التاريخ' : 'Txn / Date'}</th>
                                                                            <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{isAr ? 'رقم الطلب' : 'Order Ref'}</th>
                                                                            <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{isAr ? 'الوسيلة' : 'Method'}</th>
                                                                            <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{isAr ? 'المبلغ' : 'Amount'}</th>
                                                                            <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-center">{isAr ? 'الحالة' : 'Status'}</th>
                                                                            <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">{isAr ? 'إجراء' : 'Action'}</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-white/[0.03]">
                                                                        {customer.payments && customer.payments.length > 0 ? (
                                                                            customer.payments.map((txn: any) => (
                                                                                <tr key={txn.id} className="group hover:bg-white/[0.02] transition-colors">
                                                                                    <td className="p-4">
                                                                                        <div className="text-xs font-black text-white group-hover:text-gold-500 transition-colors uppercase">{txn.transactionNumber}</div>
                                                                                        <div className="text-[9px] text-white/30 font-medium">
                                                                                            {new Date(txn.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-4">
                                                                                        <div
                                                                                            onClick={() => txn.order?.id && onNavigate && onNavigate('admin-order-details', txn.order.id)}
                                                                                            className="text-xs font-bold text-gold-500/80 hover:text-gold-500 cursor-pointer transition-colors inline-block"
                                                                                        >
                                                                                            #{txn.order?.orderNumber || '---'}
                                                                                        </div>
                                                                                        <div className="text-[9px] text-white/20 uppercase font-black">{txn.order?.status || 'N/A'}</div>
                                                                                    </td>
                                                                                    <td className="p-4">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="w-6 h-4 bg-white/5 rounded border border-white/10 flex items-center justify-center">
                                                                                                <span className="text-[7px] font-black text-white/40 uppercase">{txn.cardBrand || 'Card'}</span>
                                                                                            </div>
                                                                                            <span className="text-[10px] font-mono text-white/40">**** {txn.cardLast4 || '0000'}</span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-4">
                                                                                        <div className="text-xs font-black text-white">
                                                                                            {Number(txn.totalAmount).toLocaleString()}
                                                                                            <span className="ml-1 text-[9px] text-white/30 uppercase">AED</span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-4">
                                                                                        <div className="flex justify-center">
                                                                                            <div className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tight ${txn.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                                                                    txn.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                                                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                                                                }`}>
                                                                                                {isAr ? (txn.status === 'SUCCESS' ? 'ناجحة' : txn.status === 'FAILED' ? 'فاشلة' : 'معلقة') : txn.status}
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-4 text-right">
                                                                                        <button
                                                                                            onClick={() => txn.order?.id && onNavigate && onNavigate('admin-order-details', txn.order.id)}
                                                                                            className="p-2 rounded-xl bg-white/5 text-white/40 hover:bg-gold-500 hover:text-black transition-all border border-white/5"
                                                                                        >
                                                                                            <Eye size={14} />
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            ))
                                                                        ) : (
                                                                            <tr>
                                                                                <td colSpan={6} className="p-20 text-center">
                                                                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                                                                        <Package size={40} strokeWidth={1} />
                                                                                        <span className="text-xs font-black uppercase tracking-[0.3em]">{isAr ? 'لا توجد حركات مالية' : 'No Transaction History'}</span>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </GlassCard>
                                                    </div>

                                                    {/* Journal 2: Withdrawals History */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between px-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 shadow-lg">
                                                                    <RefreshCcw size={20} />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{isAr ? 'سجل حركات السحب' : 'Withdrawals History'}</h3>
                                                                    <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">{isAr ? 'طلبات تحويل الرصيد' : 'Balance payout requests'}</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={handleExportWithdrawalsExcel}
                                                                className="flex items-center gap-2 px-6 py-2.5 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-black border border-green-500/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all group"
                                                            >
                                                                <FileText size={14} className="group-hover:scale-110 transition-transform" />
                                                                {isAr ? 'تصدير تقرير EXCEL' : 'Export Excel Report'}
                                                            </button>
                                                        </div>

                                                        <GlassCard className="min-h-[400px] border-white/5 bg-white/[0.01] overflow-hidden flex flex-col">
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left border-collapse">
                                                                    <thead>
                                                                        <tr className="border-b border-white/5 bg-white/[0.02]">
                                                                            <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{isAr ? 'البنك / التاريخ' : 'Bank / Date'}</th>
                                                                            <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{isAr ? 'المبلغ المطلوب' : 'Amount'}</th>
                                                                            <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-center">{isAr ? 'الحالة' : 'Status'}</th>
                                                                            <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{isAr ? 'ملاحظات الإدارة' : 'Admin Notes'}</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-white/[0.03]">
                                                                        {customer.withdrawalRequests && customer.withdrawalRequests.length > 0 ? (
                                                                            customer.withdrawalRequests.map((req: any) => (
                                                                                <tr key={req.id} className="group hover:bg-white/[0.02] transition-colors">
                                                                                    <td className="p-4">
                                                                                        <div className="text-xs font-black text-white group-hover:text-green-500 transition-colors uppercase">{req.bankName || (isAr ? 'بنك غير محدد' : 'Unknown Bank')}</div>
                                                                                        <div className="text-[10px] text-white/40 font-mono tracking-tight">{req.accountNumber || '---'}</div>
                                                                                        <div className="text-[9px] text-white/20 mt-1">
                                                                                            {new Date(req.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-4">
                                                                                        <div className="text-sm font-black text-white">
                                                                                            {Number(req.amount).toLocaleString()}
                                                                                            <span className="ml-1 text-[9px] text-white/30 uppercase tracking-tighter">AED</span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-4 text-center">
                                                                                        <div className="inline-flex">
                                                                                            <div className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tight ${req.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                                                                    req.status === 'REJECTED' || req.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                                                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                                                                }`}>
                                                                                                {isAr ? (
                                                                                                    req.status === 'COMPLETED' ? 'تم التحويل' :
                                                                                                        req.status === 'PENDING' ? 'قيد المراجعة' :
                                                                                                            req.status === 'REJECTED' ? 'مرفوض' : req.status
                                                                                                ) : req.status}
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-4">
                                                                                        <div className="max-w-[150px]">
                                                                                            {req.adminNotes ? (
                                                                                                <p className="text-[10px] text-white/50 leading-relaxed italic line-clamp-2 hover:line-clamp-none transition-all cursor-help bg-white/5 p-2 rounded-lg border border-white/5">
                                                                                                    {req.adminNotes}
                                                                                                </p>
                                                                                            ) : (
                                                                                                <span className="text-[9px] text-white/10 italic">{isAr ? 'لا توجد ملاحظات' : 'No notes added'}</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            ))
                                                                        ) : (
                                                                            <tr>
                                                                                <td colSpan={4} className="p-20 text-center">
                                                                                    <div className="flex flex-col items-center gap-3 opacity-10">
                                                                                        <Smartphone size={40} strokeWidth={1} />
                                                                                        <span className="text-xs font-black uppercase tracking-[0.3em]">{isAr ? 'لا توجد طلبات سحب' : 'No Withdrawal Requests'}</span>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </GlassCard>
                                                    </div>

                                                </div>
                                            </div>
                                        )}

                                        {/* Phase 5: Consolidated Security & Sessions Tab */}
                                        {activeTab === 'security' && (
                                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between px-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-gold-500 uppercase tracking-widest">
                                                                <Shield size={12} />
                                                                {isAr ? 'حماية الحساب' : 'Account Security'}
                                                            </div>
                                                            <h3 className="text-xl font-black text-white">{isAr ? 'الجلسات النشطة' : 'Active Sessions'}</h3>
                                                        </div>
                                                        <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                                                            <span className="text-[10px] font-black text-white/40 uppercase block mb-0.5">{isAr ? 'إجمالي الأجهزة' : 'Total Devices'}</span>
                                                            <span className="text-xl font-bold text-white font-mono">{(customer.Session?.length || 0).toString().padStart(2, '0')}</span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-4">
                                                        {customer.Session && customer.Session.length > 0 ? (
                                                            customer.Session.map(session => (
                                                                <div key={session.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.05] hover:border-gold-500/20 transition-all flex items-center justify-between group shadow-lg">
                                                                    <div className="flex items-center gap-5">
                                                                        <div className="w-14 h-14 bg-[#0F0E0D] border border-white/5 rounded-2xl flex items-center justify-center text-gold-500 group-hover:bg-gold-500 group-hover:text-black transition-all duration-300">
                                                                            {session.device?.toLowerCase().includes('phone') ? <Smartphone size={24} /> : <Globe size={24} />}
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-sm font-black text-white group-hover:text-gold-500 transition-colors">{session.device || 'Unknown Device'}</div>
                                                                            <div className="flex items-center gap-3 mt-1">
                                                                                <div className="text-[10px] text-white/30 font-mono tracking-widest uppercase bg-white/5 px-2 py-0.5 rounded-md">IP: {session.ip || '---'}</div>
                                                                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                                                                <div className="text-[10px] text-white/20 font-medium">
                                                                                    {isAr ? 'آخر ظهور:' : 'Last seen:'} {new Date(session.lastSeen || session.createdAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="text-right hidden sm:block">
                                                                            <div className="text-[10px] font-black text-green-500 uppercase tracking-widest">{isAr ? 'نشط الآن' : 'Active Now'}</div>
                                                                            <div className="text-[9px] text-white/20 uppercase">{isAr ? 'جلسة مشفرة' : 'Encrypted Session'}</div>
                                                                        </div>
                                                                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse" />
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="py-20 text-center space-y-4 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                                                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/10">
                                                                    <Shield size={32} />
                                                                </div>
                                                                <p className="text-xs font-black text-white/20 uppercase tracking-[0.2em]">{isAr ? 'لا توجد جلسات نشطة حالياً' : 'No active sessions found'}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {/* Phase 3: Advanced Governance & Restrictions (2026) */}
                                        {activeTab === 'restrictions' && (
                                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                            <ShieldAlert size={28} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-black text-white uppercase tracking-tight">{isAr ? 'إدارة القيود والتحكم' : 'Restriction Governance'}</h3>
                                                            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">{isAr ? 'تعديل سقف العمليات والوصول' : 'Adjust operation limits & access'}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={handleClearRestrictions}
                                                        className="px-5 py-2.5 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-xl transition-all text-white/40 hover:text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                                    >
                                                        <RefreshCcw size={14} />
                                                        {isAr ? 'مسح كافة القيود' : 'Clear All Restrictions'}
                                                    </button>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    {/* Financial Controls */}
                                                    <GlassCard className="p-6 space-y-6 relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                            <Lock size={80} />
                                                        </div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="p-2 bg-red-500/20 rounded-lg text-red-500">
                                                                <ShieldAlert size={20} />
                                                            </div>
                                                            <h3 className="text-lg font-bold text-white">{isAr ? 'القيود المالية' : 'Financial Restrictions'}</h3>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                                                <div className="space-y-1">
                                                                    <div className="text-sm font-bold text-white">{isAr ? 'تجميد السحب' : 'Freeze Withdrawals'}</div>
                                                                    <div className="text-xs text-white/40">{isAr ? 'منع العميل من سحب الرصيد' : 'Prevent customer from withdrawing balance'}</div>
                                                                </div>
                                                                <button
                                                                    onClick={() => setRestrictionData({ ...restrictionData, withdrawalsFrozen: !restrictionData.withdrawalsFrozen })}
                                                                    className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ${restrictionData.withdrawalsFrozen ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/10'}`}
                                                                >
                                                                    <div className={`w-5 h-5 rounded-full bg-white transition-all duration-300 transform ${restrictionData.withdrawalsFrozen ? (isAr ? '-translate-x-7' : 'translate-x-7') : 'translate-x-0'}`} />
                                                                </button>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-white/40 uppercase tracking-widest">{isAr ? 'سبب التجميد (داخلي)' : 'Freeze Reason (Internal)'}</label>
                                                                <textarea
                                                                    value={restrictionData.withdrawalFreezeNote}
                                                                    onChange={(e) => setRestrictionData({ ...restrictionData, withdrawalFreezeNote: e.target.value })}
                                                                    placeholder={isAr ? 'اكتب ملاحظاتك هنا...' : 'Enter freeze notes...'}
                                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-red-500/50 outline-none transition-all h-24 resize-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    </GlassCard>

                                                    {/* Activity Controls */}
                                                    <GlassCard className="p-6 space-y-6 relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                            <Target size={80} />
                                                        </div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="p-2 bg-gold-500/20 rounded-lg text-gold-500">
                                                                <Package size={20} />
                                                            </div>
                                                            <h3 className="text-lg font-bold text-white">{isAr ? 'قيود النشاط' : 'Activity Constraints'}</h3>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between items-center">
                                                                    <label className="text-xs font-black text-white/40 uppercase tracking-widest">{isAr ? 'حد الطلبات اليومي' : 'Daily Order Limit'}</label>
                                                                    <span className="text-xs font-mono text-gold-500">{restrictionData.orderLimit === -1 ? (isAr ? 'غير محدود' : 'Unlimited') : restrictionData.orderLimit}</span>
                                                                </div>
                                                                <input
                                                                    type="number"
                                                                    value={restrictionData.orderLimit}
                                                                    onChange={(e) => setRestrictionData({ ...restrictionData, orderLimit: parseInt(e.target.value) })}
                                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-gold-500/50 outline-none transition-all"
                                                                    placeholder="-1 for unlimited"
                                                                />
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-white/40 uppercase tracking-widest">{isAr ? 'رسالة تنبيه للعميل' : 'Customer Alert Message'}</label>
                                                                <textarea
                                                                    value={restrictionData.restrictionAlertMessage}
                                                                    onChange={(e) => setRestrictionData({ ...restrictionData, restrictionAlertMessage: e.target.value })}
                                                                    placeholder={isAr ? 'رسالة تظهر للعميل عند محاولة الطلب...' : 'Message shown to customer when attempting order...'}
                                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-gold-500/50 outline-none transition-all h-24 resize-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    </GlassCard>
                                                </div>

                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => {
                                                            setPendingRestrictionAction('UPDATE');
                                                            setIsSignatureModalOpen(true);
                                                        }}
                                                        disabled={isUpdating}
                                                        className="px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-gold-500 hover:text-white transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex items-center gap-3 group disabled:opacity-50"
                                                    >
                                                        {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <ShieldAlert size={16} className="group-hover:rotate-12 transition-transform" />}
                                                        {isAr ? 'تطبيق القيود واعتمادها' : 'Apply & Authorize Restrictions'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </BlurredSection>
                        </div>
                    </GlassCard>
                </div>

                {/* Phase 2.3: Edit Profile Modal (Premium Glass Design) */}
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-[#0F0E0D]/80 backdrop-blur-md" onClick={() => !isUpdating && setIsEditModalOpen(false)} />
                        <GlassCard className="relative z-10 w-full max-w-lg bg-[#1A1814] border-gold-500/20 shadow-[0_0_50px_rgba(212,175,55,0.1)] overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase tracking-wider">{isAr ? 'تعديل البيانات الأساسية' : 'Edit Primary Data'}</h2>
                                        <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">{isAr ? 'تحديث معلومات هوية العميل' : 'Update customer identity info'}</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-gold-500/10 flex items-center justify-center text-gold-500">
                                        <User size={24} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase px-1">{isAr ? 'الاسم الكامل' : 'Full Name'}</label>
                                        <BlurredSection isBlurred={isSectionBlurred('customer_name')}>
                                            <input
                                                type="text"
                                                value={editData.name}
                                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold-500/50 transition-all font-medium"
                                                placeholder="Mohamed Essam"
                                            />
                                        </BlurredSection>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase px-1">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</label>
                                        <BlurredSection isBlurred={isSectionBlurred('customer_phone')}>
                                            <input
                                                type="email"
                                                value={editData.email}
                                                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold-500/50 transition-all font-medium"
                                                placeholder="example@mail.com"
                                            />
                                        </BlurredSection>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase px-1">{isAr ? 'الدولة' : 'Country'}</label>
                                            <input
                                                type="text"
                                                value={editData.country}
                                                onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold-500/50 transition-all font-medium"
                                                placeholder="Egypt"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase px-1">{isAr ? 'رقم الهاتف' : 'Phone'}</label>
                                            <BlurredSection isBlurred={isSectionBlurred('customer_phone')}>
                                                <input
                                                    type="text"
                                                    value={editData.phone}
                                                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold-500/50 transition-all font-medium font-mono"
                                                    placeholder="+971..."
                                                />
                                            </BlurredSection>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="flex-1 py-4 rounded-2xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 font-black text-xs uppercase tracking-widest transition-all"
                                    >
                                        {isAr ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={handleUpdateCustomer}
                                        disabled={isUpdating}
                                        className="flex-[2] py-4 rounded-2xl bg-gold-500 text-[#0F0E0D] font-black text-xs uppercase tracking-widest shadow-lg shadow-gold-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                                    >
                                        {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        {isAr ? 'حفظ التغييرات' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* Phase 1: Ban Reason Modal (2026 Admin Standard) */}
                {isBanModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-[#0F0E0D]/90 backdrop-blur-xl"
                            onClick={() => !isBanning && setIsBanModalOpen(false)}
                        />
                        <GlassCard className="relative z-10 w-full max-w-md bg-[#1A1814] border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)] overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase tracking-wider">{isAr ? 'تأكيد حظر الحساب' : 'Confirm Account Ban'}</h2>
                                        <p className="text-[10px] text-red-500/60 uppercase tracking-[0.2em] font-bold">{isAr ? 'إجراء إداري صارم' : 'Strict Administrative Action'}</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                                        <ShieldAlert size={24} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase px-1">{isAr ? 'سبب الحظر' : 'Ban Reason'}</label>
                                        <textarea
                                            value={banReason}
                                            onChange={(e) => setBanReason(e.target.value)}
                                            disabled={isBanning}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 transition-all font-medium min-h-[120px] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder={isAr ? 'اكتب سبب الحظر هنا ليتم توثيقه...' : 'Enter the reason for suspension for the audit log...'}
                                        />
                                    </div>
                                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                                        <p className="text-[10px] text-red-500/70 font-medium leading-relaxed">
                                            {isAr
                                                ? 'سيتم تسجيل هذا الإجراء في سجل العمليات الآمنة (Audit Log) وسيفقد المستخدم الوصول للمنصة فوراً.'
                                                : 'This action will be recorded in the security logs, and the user will lose platform access immediately.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setIsBanModalOpen(false)}
                                        disabled={isBanning}
                                        className="flex-1 py-4 rounded-2xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 font-black text-xs uppercase tracking-widest transition-all disabled:opacity-30"
                                    >
                                        {isAr ? 'تراجع' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={handleConfirmBan}
                                        disabled={isBanning || !banReason.trim()}
                                        className="flex-[2] py-4 rounded-2xl bg-red-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isBanning ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                {isAr ? 'جاري تنفيذ الحظر...' : 'Applying ban...'}
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={16} />
                                                {isAr ? 'تأكيد الحظر' : 'Confirm Suspension'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                )}

                <AdminSignatureModal
                    isOpen={isSignatureModalOpen}
                    onClose={() => setIsSignatureModalOpen(false)}
                    onConfirm={handleUpdateRestrictions}
                    title={isAr ? 'اعتماد القيود الإدارية' : 'Authorize Administrative Restrictions'}
                    subtitle={isAr ? 'يرجى التوقيع للمتابعة وتطبيق القيود على هذا العميل' : 'Please sign to proceed and apply restrictions to this customer'}
                />

                <AdminInitiateChatModal
                    isOpen={isChatModalOpen}
                    onClose={() => setIsChatModalOpen(false)}
                    onConfirm={handleInitiateChat}
                    targetName={customer?.name || 'Customer'}
                    targetRole="CUSTOMER"
                />
            </div>
        </div>
    );
};
