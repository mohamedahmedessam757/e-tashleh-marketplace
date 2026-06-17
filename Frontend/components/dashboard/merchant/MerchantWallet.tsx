import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet,
    TrendingUp,
    Clock,
    AlertCircle,
    ArrowDownLeft,
    ArrowUpRight,
    Download,
    Calendar,
    Search,
    ChevronRight,
    FileText,
    RotateCcw,
    Star,
    Crown,
    ShieldCheck,
    Target,
    Zap,
    Percent,
    MessageCircle,
    Copy,
    Share2,
    ExternalLink,
    CheckCircle2,
    LayoutGrid,
    CreditCard,
    UserPlus,
    Bell,
    Settings,
    ShoppingBag,
    Link as LinkIcon,
    ArrowRightLeft,
    ClipboardCheck,
    ShieldAlert,
    Lock,
    Scale,
    AlertTriangle,
    Gavel,
    Trophy,
    PlusCircle,
    Truck,
    AlertOctagon,
} from 'lucide-react';
import { useVendorStore } from '../../../stores/useVendorStore';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { MerchantStoreTierProgress } from './MerchantStoreTierProgress';
import { useMerchantWalletStore, subscribeToMerchantWalletUpdates } from '../../../stores/useMerchantWalletStore';
import { PayoutMethodPanel } from '../wallet/PayoutMethodPanel';
import { BankDetailsModal } from '../wallet/BankDetailsModal';
import { getCurrentUser } from '../../../utils/auth';
import { useNotificationStore } from '../../../stores/useNotificationStore';

interface MerchantWalletProps {
    onNavigate?: (page: string, id?: string) => void;
}

// NEW 2026: Restriction Banner Component for Wallet
const RestrictionBanner = ({ message, isAr }: { message?: string, isAr: boolean }) => (
    <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        className="mb-8 p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
        <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500 animate-pulse">
                <ShieldAlert size={28} />
            </div>
            <div>
                <h4 className="text-lg font-black text-white uppercase tracking-tight">
                    {isAr ? 'عمليات السحب مقيدة إدارياً' : 'Withdrawals Restricted by Admin'}
                </h4>
                <p className="text-red-400/80 text-xs font-bold uppercase tracking-widest mt-1 leading-relaxed">
                    {message || (isAr ? 'تم تجميد حسابك مؤقتاً لأسباب تدقيقية. يرجى مراجعة الإدارة.' : 'Your account is temporarily frozen for audit reasons. Please contact support.')}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-3 relative z-10">
            <div className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20">
                {isAr ? 'تم تقييد الوصول' : 'ACCESS RESTRICTED'}
            </div>
        </div>
    </motion.div>
);

export const MerchantWallet: React.FC<MerchantWalletProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const {
        stats,
        transactions,
        notifications,
        withdrawalRequests,
        withdrawalLimits,
        bankDetails,
        stripeConnectInfo,
        fetchWallet,
        fetchWithdrawalData,
        fetchBankDetails,
        saveBankDetails,
        requestWithdrawal,
        getStripeOnboardingUrl,
        refreshStripeStatus,
        isLoading
    } = useMerchantWalletStore();
    const { withdrawalsFrozen, withdrawalFreezeNote } = useVendorStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [filter, setFilter] = useState<'ALL' | 'DONE' | 'PENDING'>('ALL');
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [copied, setCopied] = useState(false);

    // Withdrawal Form State
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [withdrawError, setWithdrawError] = useState('');
    const [withdrawSuccess, setWithdrawSuccess] = useState(false);
    const [isOnboarding, setIsOnboarding] = useState(false);
    const [payoutMethod, setPayoutMethod] = useState<'BANK_TRANSFER' | 'STRIPE'>('BANK_TRANSFER');

    // Bank Details Form State
    const [bankForm, setBankForm] = useState({ bankName: '', accountHolder: '', iban: '', swift: '' });
    const [isSavingBank, setIsSavingBank] = useState(false);
    const [showBankForm, setShowBankForm] = useState(false);
    const [stripeSuccess, setStripeSuccess] = useState(false);
    const [bankLinkSuccess, setBankLinkSuccess] = useState(false);
    const [performanceSnap, setPerformanceSnap] = useState<{
        progressToNext?: {
            nextTier: string | null;
            percent: number;
            summaryAr: string;
            summaryEn: string;
        };
        completedOrdersCount?: number;
        rankingBreakdown?: { rating: number };
    } | null>(null);

    const isAr = language === 'ar';
    const w = t.dashboard.merchant.wallet;

    const merchantAvailable = isLoading ? null : Number(stats?.available ?? 0);
    const maxWithdrawable = isLoading
        ? null
        : Number(stats?.maxWithdrawableAmount ?? stats?.available ?? 0);
    const withdrawalRestrictionMessage = isAr
        ? stats?.withdrawalRestrictionMessageAr
        : stats?.withdrawalRestrictionMessageEn;
    const canWithdraw =
        !withdrawalsFrozen &&
        maxWithdrawable !== null &&
        maxWithdrawable >= withdrawalLimits.min;

    const currentUser = getCurrentUser();

    useEffect(() => {
        // Trigger fetch with filters for real-time reactive stats
        fetchWallet({
            startDate: dateRange.start || undefined,
            endDate: dateRange.end || undefined
        });
        fetchWithdrawalData();
        fetchBankDetails();

        if (currentUser?.id) {
            const unsubscribe = subscribeToMerchantWalletUpdates(currentUser.id, stats.storeId);
            return () => {
                unsubscribe();
            };
        }
    }, [fetchWallet, fetchWithdrawalData, currentUser?.id, dateRange.start, dateRange.end, stats.storeId]);

    useEffect(() => {
        const loadPerformance = async () => {
            try {
                const { client } = await import('../../../services/api/client');
                const { data } = await client.get<{
                    progressToNext?: {
                        nextTier: string | null;
                        percent: number;
                        summaryAr: string;
                        summaryEn: string;
                    };
                    completedOrdersCount?: number;
                    rankingBreakdown?: { rating: number };
                }>('/merchant-performance/me');
                setPerformanceSnap({
                    progressToNext: data.progressToNext,
                    completedOrdersCount: data.completedOrdersCount,
                    rankingBreakdown: data.rankingBreakdown,
                });
            } catch {
                /* non-fatal — wallet still works without progression bar */
            }
        };
        void loadPerformance();
    }, [stats.storeId, stats.loyaltyTier, stats.performanceScore]);

    // --- STRIPE CONNECT RETURN HANDLER ---
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const stripeStatus = params.get('stripe_status');

        if (stripeStatus === 'return') {
            const handleReturn = async () => {
                // Show modal immediately for instant feedback
                setStripeSuccess(true);
                setIsOnboarding(true);
                try {
                    const { success, onboarded } = await useMerchantWalletStore.getState().refreshStripeStatus();
                    if (!success || !onboarded) {
                        // If verification fails, hide modal and show error
                        setStripeSuccess(false);
                        alert(
                            isAr
                                ? '⚠️ يبدو أن عملية الربط لم تكتمل في Stripe. يرجى التأكد من إدخال كافة البيانات.'
                                : '⚠️ Onboarding seems incomplete. Please ensure all data is entered in Stripe.'
                        );
                    }
                } catch (error) {
                    console.error('Error refreshing stripe status:', error);
                    setStripeSuccess(false);
                } finally {
                    setIsOnboarding(false);
                    // Clean URL
                    const url = new URL(window.location.href);
                    url.searchParams.delete('stripe_status');
                    window.history.replaceState({}, '', url.pathname + url.search);
                }
            };
            handleReturn();
        } else if (stripeStatus === 'refresh') {
            alert(
                isAr
                    ? 'تم تحديث صفحة الربط. يرجى المتابعة.'
                    : 'Onboarding session refreshed. Please continue.'
            );
            // Clean URL
            const url = new URL(window.location.href);
            url.searchParams.delete('stripe_status');
            window.history.replaceState({}, '', url.pathname + url.search);
        }
    }, [isAr, fetchBankDetails]);

    const handleCopyReferral = () => {
        if (!stats?.referralCode) {
            alert(isAr ? 'جاري تجهيز كود الإحالة الخاص بك... يرجى المحاولة بعد قليل.' : 'Referral code is being generated... please try again in a moment.');
            return;
        }

        const url = `${window.location.origin}/register?ref=${stats.referralCode}`;

        const performCopy = (text: string) => {
            if (navigator.clipboard) {
                return navigator.clipboard.writeText(text);
            } else {
                // Legacy Fallback
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    return Promise.resolve();
                } catch (err) {
                    document.body.removeChild(textArea);
                    return Promise.reject(err);
                }
            }
        };

        performCopy(url)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch((err) => {
                console.error('Copy failed', err);
                alert(isAr ? 'فشل نسخ الرابط، يرجى نسخه يدوياً.' : 'Failed to copy link, please copy it manually.');
            });
    };

    const handleStripeConnect = async () => {
        setIsOnboarding(true);
        try {
            const url = await getStripeOnboardingUrl();
            if (!url) throw new Error(isAr ? 'لم يتم استلام رابط الربط من الخادم' : 'No onboarding URL received from server');
            // Use same window to maintain session stability in localhost/popups environments
            window.location.href = url;
        } catch (error: any) {
            console.error('Stripe Connect Error:', error);
            const raw = error.response?.data?.message;
            const msg =
                typeof raw === 'string'
                    ? raw
                    : Array.isArray(raw)
                      ? raw.join('; ')
                      : error.message || 'Internal server error';

            if (msg.includes('Stripe Connect is not enabled') || msg.includes('signed up for Connect')) {
                alert(isAr
                    ? 'خدمة Stripe Connect غير مفعلة حالياً. يرجى التواصل مع الإدارة.'
                    : 'Stripe Connect is not enabled on this platform. Please contact support.');
            } else {
                alert(isAr
                    ? `فشل بدء عملية الربط: ${msg}`
                    : `Failed to start onboarding: ${msg}`);
            }
            setIsOnboarding(false);
        }
    };

    const handleSaveBankDetails = async () => {
        setIsSavingBank(true);
        const result = await saveBankDetails(bankForm);
        setIsSavingBank(false);

        if (result.success) {
            setShowBankForm(false);
            setBankLinkSuccess(true);
            setTimeout(() => setBankLinkSuccess(false), 10000);
            useNotificationStore.getState().addNotification({
                type: 'PAYMENT',
                titleAr: 'تم حفظ البيانات البنكية بنجاح',
                titleEn: 'Bank Details Saved Successfully',
                messageAr: 'تم تحديث بيانات تحويل أرباح المتجر بنجاح.',
                messageEn: 'Store profit transfer details have been updated successfully.',
                recipientRole: 'MERCHANT'
            });
        } else {
            alert(result.message);
        }
    };

    const handleSubmitWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        setWithdrawError('');
        setWithdrawSuccess(false);

        const amountNum = parseFloat(withdrawAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setWithdrawError(isAr ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
            return;
        }

        if (amountNum < withdrawalLimits.min) {
            setWithdrawError(`${isAr ? 'الحد الأدنى للسحب هو' : 'Minimum withdrawal is'} ${withdrawalLimits.min} AED`);
            return;
        }

        if (amountNum > withdrawalLimits.max) {
            setWithdrawError(`${isAr ? 'الحد الأقصى للسحب هو' : 'Maximum withdrawal is'} ${withdrawalLimits.max} AED`);
            return;
        }

        if (amountNum > (maxWithdrawable ?? stats.available)) {
            setWithdrawError(
                withdrawalRestrictionMessage ||
                    (isAr ? 'المبلغ يتجاوز الحد المسموح للسحب' : 'Amount exceeds your maximum withdrawable balance'),
            );
            return;
        }

        // Validate prerequisites for chosen method
        if (payoutMethod === 'STRIPE' && !stats.stripeOnboarded) {
            setWithdrawError(isAr ? 'يجب ربط حسابك عبر Stripe أولاً' : 'Please complete Stripe onboarding first');
            return;
        }
        if (payoutMethod === 'BANK_TRANSFER' && !bankDetails?.iban) {
            setWithdrawError(isAr ? 'يجب إضافة بيانات الحساب البنكي أولاً' : 'Please add your bank details first');
            return;
        }

        setIsSubmitting(true);
        if (withdrawalsFrozen) {
            setWithdrawError(isAr ? 'عمليات السحب مجمدة حالياً' : 'Withdrawals are currently frozen');
            setIsSubmitting(false);
            return;
        }
        const result = await requestWithdrawal(amountNum, payoutMethod);
        setIsSubmitting(false);

        if (result.success) {
            setWithdrawSuccess(true);
            setWithdrawAmount('');
            setTimeout(() => setWithdrawSuccess(false), 5000);
        } else {
            setWithdrawError(result.message);
        }
    };


    // Filtering Logic
    const filteredTransactions = useMemo(() => {
        let result = transactions;

        if (filter === 'DONE') {
            result = result.filter(tx => tx.type === 'CREDIT');
        } else if (filter === 'PENDING') {
            result = result.filter(tx => tx.transactionType === 'PENDING' || tx.type === 'PENDING');
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(tx =>
                (tx.id && tx.id.toLowerCase().includes(q)) ||
                (tx.orderId && tx.orderId.toLowerCase().includes(q)) ||
                (tx.payment?.order?.orderNumber && tx.payment.order.orderNumber.toLowerCase().includes(q)) ||
                (tx.amount?.toString().includes(q))
            );
        }

        if (dateRange.start) {
            const start = new Date(dateRange.start);
            result = result.filter(tx => new Date(tx.createdAt) >= start);
        }
        if (dateRange.end) {
            const end = new Date(dateRange.end);
            end.setHours(23, 59, 59, 999);
            result = result.filter(tx => new Date(tx.createdAt) <= end);
        }

        return result;
    }, [transactions, filter, searchQuery, dateRange]);

    const handleDownloadReport = async () => {
        setIsGeneratingReport(true);
        try {
            const date = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');
            const startStr = dateRange.start || '---';
            const endStr = dateRange.end || '---';

            const html = `
                <div style="padding: 50px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; background: white; min-height: 100vh; line-height: 1.6; position: relative;" dir="${isAr ? 'rtl' : 'ltr'}">
                    
                    <!-- Watermark -->
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(168, 139, 62, 0.03); font-weight: 900; pointer-events: none; z-index: 0; white-space: nowrap;">
                        E-TASHLEH OFFICIAL
                    </div>

                    <!-- Premium Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #E5E7EB; padding-bottom: 30px; margin-bottom: 35px; position: relative; z-index: 1;">
                        <div style="display: flex; gap: 20px; align-items: center;">
                            <img src="/logo.png" style="width: 60px; height: 60px; object-fit: contain;" alt="Logo" onerror="this.style.display='none'" />
                            <div>
                                <h1 style="margin: 0; color: #A88B3E; font-size: 32px; font-weight: 900; letter-spacing: -1px;">E-TASHLEH</h1>
                                <p style="margin: 0; color: #666; font-weight: 700; text-transform: uppercase; font-size: 13px;">${isAr ? 'بيان المبيعات والتحصيل المالي - القطاع التجاري' : 'Financial Revenue & Sales Statement - Merchant'}</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; font-weight: 800; color: #A88B3E; font-size: 14px;">#MR-${new Date().getTime().toString().slice(-8)}</p>
                            <p style="margin: 5px 0 0; color: #999; font-size: 11px; font-weight: 600;">${isAr ? 'تاريخ الإصدار' : 'Issue Date'}: ${date}</p>
                            <p style="margin: 5px 0 0; color: #999; font-size: 11px; font-weight: 600;">${isAr ? 'الفترة' : 'Period'}: ${startStr} ${isAr ? 'إلى' : 'to'} ${endStr}</p>
                        </div>
                    </div>

                    <!-- Merchant Info & Account Summary Grid -->
                    <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 30px; margin-bottom: 40px; position: relative; z-index: 1;">
                        <div style="background: #F9FAFB; padding: 25px; border-radius: 12px; border: 1px solid #F3F4F6;">
                            <h4 style="margin: 0 0 15px; font-size: 11px; color: #9CA3AF; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">${isAr ? 'بيانات التاجر' : 'Merchant Information'}</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div>
                                    <p style="margin: 0; font-size: 14px; font-weight: 800; color: #111827;">${stats.storeName || '---'}</p>
                                    <p style="margin: 4px 0 0; font-size: 11px; color: #6B7280;"><strong>ID:</strong> ${currentUser?.id || '---'}</p>
                                </div>
                                <div>
                                    <p style="margin: 0; font-size: 11px; color: #6B7280;"><strong>STORE ID:</strong> ${stats.storeId || '---'}</p>
                                    <p style="margin: 4px 0 0; font-size: 11px; color: #6B7280;"><strong>${isAr ? 'المستوى' : 'Tier'}:</strong> ${stats.loyaltyTier || 'BASIC'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div style="border-bottom: 1px solid #F3F4F6; padding-bottom: 10px;">
                                <span style="font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 800;">${isAr ? 'الرصيد المستحق' : 'Available'}</span>
                                <div style="font-size: 18px; font-weight: 800; color: #10B981;">${Number(stats.available).toLocaleString()} <small style="font-size: 10px;">AED</small></div>
                            </div>
                            <div style="border-bottom: 1px solid #F3F4F6; padding-bottom: 10px;">
                                <span style="font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 800;">${isAr ? 'الرصيد المعلق' : 'Pending'}</span>
                                <div style="font-size: 18px; font-weight: 800; color: #F59E0B;">${Number(stats.pending).toLocaleString()} <small style="font-size: 10px;">AED</small></div>
                            </div>
                            <div style="border-bottom: 1px solid #F3F4F6; padding-bottom: 10px;">
                                <span style="font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 800;">${w.totalSales}</span>
                                <div style="font-size: 18px; font-weight: 800; color: #111827;">${Number(stats.totalSales).toLocaleString()} <small style="font-size: 10px;">AED</small></div>
                            </div>
                            <div style="border-bottom: 1px solid #F3F4F6; padding-bottom: 10px;">
                                <span style="font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 800;">${w.netEarnings}</span>
                                <div style="font-size: 18px; font-weight: 800; color: #A88B3E;">${Number(stats.netEarnings).toLocaleString()} <small style="font-size: 10px;">AED</small></div>
                                <div style="font-size: 9px; color: #9CA3AF; margin-top: 4px;">${w.netEarningsHint}</div>
                            </div>
                            <div style="border-bottom: 1px solid #F3F4F6; padding-bottom: 10px;">
                                <span style="font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 800;">${w.totalWalletBalance}</span>
                                <div style="font-size: 18px; font-weight: 800; color: #6366F1;">${Number(stats.totalWalletBalance || 0).toLocaleString()} <small style="font-size: 10px;">AED</small></div>
                            </div>
                        </div>
                    </div>

                    <!-- Details Table -->
                    <h3 style="margin-bottom: 20px; font-size: 16px; font-weight: 900; border-bottom: 2px solid #EEE; padding-bottom: 10px; position: relative; z-index: 1;">${isAr ? 'سجل العمليات التفصيلي' : 'Detailed Transaction & Order Log'}</h3>
                    <table style="width: 100%; border-collapse: collapse; position: relative; z-index: 1;">
                        <thead>
                            <tr style="background: #1a1a1a; color: white;">
                                <th style="padding: 12px; text-align: ${isAr ? 'right' : 'left'}; font-size: 10px; border-radius: ${isAr ? '0 8px 0 0' : '8px 0 0 0'}; text-transform: uppercase;">${isAr ? 'رقم المرجع' : 'REF / ORDER #'}</th>
                                <th style="padding: 12px; text-align: center; font-size: 10px; text-transform: uppercase;">${isAr ? 'التاريخ' : 'DATE'}</th>
                                <th style="padding: 12px; text-align: center; font-size: 10px; text-transform: uppercase;">${isAr ? 'النوع' : 'TYPE'}</th>
                                <th style="padding: 12px; text-align: center; font-size: 10px; text-transform: uppercase;">${isAr ? 'حالة الدفع' : 'PAYMENT'}</th>
                                <th style="padding: 12px; text-align: center; font-size: 10px; text-transform: uppercase;">${isAr ? 'حالة الطلب' : 'ORDER'}</th>
                                <th style="padding: 12px; text-align: right; font-size: 10px; border-radius: ${isAr ? '8px 0 0 0' : '0 8px 0 0'}; text-transform: uppercase;">${isAr ? 'المبلغ' : 'AMOUNT'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredTransactions.map(tx => `
                                <tr style="border-bottom: 1px solid #F3F4F6;">
                                    <td style="padding: 12px; font-weight: 700; font-family: monospace; font-size: 11px;">#${tx.payment?.order?.orderNumber || tx.id.slice(0, 8).toUpperCase()}</td>
                                    <td style="padding: 12px; text-align: center; color: #666; font-size: 11px;">${new Date(tx.createdAt).toLocaleDateString()}</td>
                                    <td style="padding: 12px; text-align: center; font-size: 10px; font-weight: 800; color: #4B5563;">${tx.transactionType === 'REFERRAL_PROFIT' ? (isAr ? 'عمولة إحالة' : 'REFERRAL') : tx.transactionType === 'WITHDRAWAL' ? (isAr ? 'سحب' : 'WITHDRAW') : (isAr ? 'بيع' : 'SALE')}</td>
                                    <td style="padding: 12px; text-align: center;">
                                        <span style="font-size: 9px; font-weight: 900; padding: 3px 8px; border-radius: 4px; background: ${(tx.payment?.status || 'SUCCESS') === 'SUCCESS' || (tx.payment?.status || 'SUCCESS') === 'COMPLETED' ? '#ECFDF5' : '#FEF3C7'}; color: ${(tx.payment?.status || 'SUCCESS') === 'SUCCESS' || (tx.payment?.status || 'SUCCESS') === 'COMPLETED' ? '#10B981' : '#D97706'};">
                                            ${tx.payment?.status || 'SUCCESS'}
                                        </span>
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        <span style="font-size: 9px; font-weight: 800; color: #6B7280; text-transform: uppercase;">
                                            ${tx.payment?.order?.status || '---'}
                                        </span>
                                    </td>
                                    <td style="padding: 12px; text-align: right; font-weight: 900; color: ${tx.type === 'CREDIT' ? '#10B981' : '#EF4444'}; font-size: 13px;">
                                        ${tx.type === 'CREDIT' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <!-- Footer -->
                    <div style="margin-top: 50px; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 30px; position: relative; z-index: 1;">
                        <p style="margin: 0; font-size: 12px; color: #4B5563; font-weight: 700;">${isAr ? 'شكراً لتعاملكم مع إي تشليح - شريكك الموثوق في قطاع الغيار' : 'Thank you for partnering with E-TASHLEH - Your trusted parts network'}</p>
                        <p style="margin: 6px 0 0; font-size: 10px; color: #9CA3AF; letter-spacing: 1px;">OFFICIAL MERCHANT STATEMENT • © 2026 ELLIPP FZ LLC • GENERATED ON ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            `;

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`<html><head><title>Merchant Statement</title></head><body style="margin:0;">${html}</body></html>`);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                    setIsGeneratingReport(false);
                }, 800);
            }
        } catch (error) {
            console.error('Report generation failed', error);
            setIsGeneratingReport(false);
        }
    };

    const getStatusStyle = (status: string) => {
        const styles: Record<string, string> = {
            'COMPLETED': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            'SUCCESS': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            'SHIPPED': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'PREPARATION': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            'CANCELLED': 'bg-red-500/10 text-red-400 border-red-500/20',
        };
        return styles[status?.toUpperCase()] || 'bg-white/5 text-white/50 border-white/10';
    };

    const StatCard = ({ label, value, unit, icon: Icon, colorClass, bgClass, borderClass, subtitle }: any) => (
        <GlassCard className={`p-4 sm:p-5 flex flex-col justify-between min-h-[110px] ${borderClass || 'border-white/5'}`}>
            <motion.div className="flex justify-between items-start w-full">
                <p className={`${colorClass || 'text-white/30'} text-[10px] font-black uppercase tracking-wider mb-1`}>{label}</p>
                <div className={`p-1.5 ${bgClass || 'bg-white/5'} rounded-lg ${colorClass || 'text-white/40'} border border-white/10 shrink-0`}>
                    <Icon size={14} className="sm:size-[16px]" />
                </div>
            </motion.div>
            <div>
                <h2 className="text-xl font-bold text-white leading-none mt-2 truncate">
                    {Number(value || 0).toLocaleString()} <span className="text-[10px] text-white/30 font-medium">{unit}</span>
                </h2>
                {subtitle && (
                    <p className="text-[9px] text-white/35 mt-2 leading-snug">{subtitle}</p>
                )}
            </div>
        </GlassCard>
    );

    return (
        <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

            {/* 0. Governance Alerts (2026 Admin Transparency) */}

            {/* 1. Header Navigation & Dashboard Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gold-500/10 rounded-xl border border-gold-500/20 shadow-lg shadow-gold-500/5">
                        <Wallet className="text-gold-500" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            {isAr ? 'المحفظة المالية للتاجر' : 'Merchant Financial Wallet'}
                        </h1>
                        <p className="text-white/40 text-[10px] sm:text-xs mt-1 font-medium">
                            {w.walletSubtitle}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative group flex-1 md:flex-initial">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-gold-500 transition-colors" size={14} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={w.searchOrderPlaceholder}
                                className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:border-gold-500/50 transition-all w-full md:w-56"
                            />
                        </div>
                        <div className="relative group">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-2 py-2 text-[10px] outline-none focus:border-gold-500/50 transition-all w-40 text-white/70"
                            />
                        </div>
                    </div>
                    <button
                        disabled={isGeneratingReport}
                        onClick={handleDownloadReport}
                        className="p-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-gold-500/20 hover:border-gold-500/40 transition-all text-white/70 hover:text-gold-500 disabled:opacity-50"
                    >
                        {isGeneratingReport ? <RotateCcw size={16} className="animate-spin" /> : <Download size={16} />}
                    </button>
                </div>
            </div>

            {/* 2. Primary Stat Cards (Legacy Stats Restored) */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                <StatCard
                    label={w.availableBalance}
                    value={stats.available}
                    unit="AED"
                    icon={Wallet}
                    colorClass="text-emerald-400"
                    bgClass="bg-emerald-500/10"
                    borderClass="border-emerald-500/10"
                />
                <StatCard
                    label={w.pendingBalance}
                    value={stats.pending}
                    unit="AED"
                    icon={Clock}
                    colorClass="text-amber-400"
                    bgClass="bg-amber-500/10"
                    borderClass="border-amber-500/10"
                />
                <StatCard
                    label={w.frozenFunds}
                    value={stats.frozen}
                    unit="AED"
                    icon={ShieldCheck}
                    colorClass="text-rose-400"
                    bgClass="bg-rose-500/10"
                    borderClass="border-rose-500/10"
                />
                <StatCard
                    label={w.totalSales}
                    value={stats.totalSales}
                    unit="AED"
                    icon={LayoutGrid}
                    colorClass="text-blue-400"
                    bgClass="bg-blue-500/10"
                    borderClass="border-blue-500/10"
                    subtitle={w.totalSalesHint}
                />
                <StatCard
                    label={w.netEarnings}
                    value={stats.ledgerNetProfit ?? stats.netEarnings}
                    unit="AED"
                    icon={TrendingUp}
                    colorClass="text-purple-400"
                    bgClass="bg-purple-500/10"
                    borderClass="border-purple-500/10"
                    subtitle={w.netEarningsHint}
                />
                <StatCard
                    label={w.completedOrders}
                    value={stats.completedOrders}
                    unit={isAr ? 'طلب' : 'Orders'}
                    icon={FileText}
                    colorClass="text-gold-500"
                    bgClass="bg-gold-500/10"
                    borderClass="border-gold-500/10"
                />
            </div>

            {/* 3. Referral profit summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <GlassCard className="p-5 sm:p-6 relative overflow-hidden group bg-gradient-to-br from-white/[0.04] to-transparent">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-white/40 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-2">{isAr ? 'أرباح إحالات (قيد الانتظار)' : 'Referral Profits (Pending)'}</p>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-baseline gap-2">
                                {Number(stats.pendingRewards || 0).toLocaleString()} <span className="text-xs text-white/30 font-medium">AED</span>
                            </h2>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-lg shadow-amber-500/5 group-hover:bg-amber-500/20 transition-colors">
                            <Clock className="text-amber-400" size={20} />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-5 sm:p-6 relative overflow-hidden group bg-gradient-to-br from-white/[0.04] to-transparent">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-white/40 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-2">{isAr ? 'أرباح إحالات هذا الشهر' : 'Referral Profits (Monthly)'}</p>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-baseline gap-2">
                                {Number(stats.monthlyRewards || 0).toLocaleString()} <span className="text-xs text-white/30 font-medium">AED</span>
                            </h2>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5 group-hover:bg-emerald-500/20 transition-colors">
                            <TrendingUp className="text-emerald-400" size={20} />
                        </div>
                    </div>
                </GlassCard>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:col-span-2 lg:col-span-1">
                    <GlassCard className="p-4 flex flex-col justify-center bg-white/[0.02] border-white/5 border-l-2 border-l-emerald-500/30">
                        <p className="text-[10px] text-white/30 uppercase font-black">{isAr ? 'نسبة القبول' : 'Acceptance'}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-emerald-400">
                            <ShieldCheck size={16} />
                            <span className="text-lg font-bold sm:text-xl tracking-tighter">{stats.performanceScore}%</span>
                        </div>
                    </GlassCard>
                    <GlassCard className="p-4 flex flex-col justify-center bg-white/[0.02] border-white/5 border-l-2 border-l-gold-500/30">
                        <p className="text-[10px] text-white/30 uppercase font-black">{w.storeTier}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-gold-400">
                            <Crown size={16} />
                            <span className="text-lg font-bold sm:text-xl tracking-tighter">{stats.loyaltyTier || 'BASIC'}</span>
                        </div>
                        <p className="text-[8px] text-white/30 mt-1">{w.storeTierHint}</p>
                    </GlassCard>
                </div>
            </div>

            {/* 4. Main Dashboard Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">

                {/* 4a. Transaction Records Table */}
                <div className="lg:col-span-3 space-y-6">
                    <GlassCard className="p-0 overflow-hidden relative border-white/5">
                        <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.01]">
                            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-3">
                                {isAr ? 'سجل الارباح والطلبات' : 'Earnings & Orders Log'}
                            </h3>
                            <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                                {['ALL', 'DONE', 'PENDING'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f as any)}
                                        className={`px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-black rounded-lg transition-all ${filter === f ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'text-white/40 hover:text-white'}`}
                                    >
                                        {f === 'ALL' ? (isAr ? 'الكل' : 'All') : f === 'DONE' ? (isAr ? 'المنجزة' : 'Done') : (isAr ? 'المعلقة' : 'Pending')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
                            <table className="w-full text-sm text-center border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="sticky top-0 z-20 border-b border-white/5 bg-[#151310] text-[10px] text-white/30 uppercase tracking-widest font-black">
                                        <th className="px-4 py-5">{isAr ? 'رقم الطلب' : 'Order ID'}</th>
                                        <th className="px-4 py-5">{isAr ? 'التاريخ' : 'Date'}</th>
                                        <th className="px-4 py-5">{isAr ? 'المبلغ' : 'Amount'}</th>
                                        <th className="px-4 py-5">{isAr ? 'حالة الدفع' : 'Payment'}</th>
                                        <th className="px-4 py-5">{isAr ? 'حالة الطلب' : 'Status'}</th>
                                        <th className="px-4 py-5">{isAr ? 'العملية' : 'Type'}</th>
                                        <th className="px-4 py-5">{isAr ? 'إجراء' : 'Act'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan={7} className="p-12 text-center text-white/20 font-black text-xs uppercase">{isAr ? 'جاري التحميل...' : 'LOADING...'}</td></tr>
                                    ) : filteredTransactions.length === 0 ? (
                                        <tr><td colSpan={7} className="p-12 text-center text-white/20 font-black text-xs uppercase">{isAr ? 'لا توجد بيانات' : 'NO DATA'}</td></tr>
                                    ) : filteredTransactions.map((tx) => (
                                        <tr key={tx.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-all group">
                                            <td className="px-4 py-4">
                                                <code className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[11px] text-gold-500/80 group-hover:text-gold-500">
                                                    #{tx.payment?.order?.orderNumber || tx.id.slice(0, 8).toUpperCase()}
                                                </code>
                                            </td>
                                            <td className="px-4 py-4 font-mono text-white/40 text-[11px]">{new Date(tx.createdAt).toLocaleDateString(isAr ? 'ar-AE' : 'en-AE')}</td>
                                            <td className="px-4 py-4 font-bold text-white">
                                                <span className={tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-amber-400'}>
                                                    {tx.type === 'CREDIT' ? '+' : '-'}{Math.abs(Number(tx.amount)).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getStatusStyle(tx.payment?.status || 'SUCCESS')}`}>
                                                    {tx.payment?.status || 'SUCCESS'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getStatusStyle(tx.payment?.order?.status || 'PREPARATION')}`}>
                                                    {tx.payment?.order?.status || 'PREP'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-center gap-2 text-[9px] font-black uppercase whitespace-nowrap">
                                                    {(() => {
                                                        const type = tx.transactionType?.toUpperCase() || 'PAYMENT';
                                                        const typeLabels = t.dashboard.profile.wallet.transactionTypes;

                                                        const iconConfig: Record<string, { icon: any, color: string }> = {
                                                            'ORDER_PROFIT': { icon: Star, color: 'text-gold-500' },
                                                            'REFERRAL_PROFIT': { icon: LinkIcon, color: 'text-blue-400' },
                                                            'PAYMENT': { icon: CreditCard, color: 'text-indigo-400' },
                                                            'WITHDRAWAL': { icon: ArrowDownLeft, color: 'text-rose-400' },
                                                            'REFUND': { icon: RotateCcw, color: 'text-rose-400' },
                                                            'COMMISSION': { icon: Scale, color: 'text-slate-400' },
                                                            'PENALTY': { icon: AlertTriangle, color: 'text-red-500' },
                                                            'DISPUTE': { icon: Gavel, color: 'text-purple-400' },
                                                            'LOYALTY_BONUS': { icon: Trophy, color: 'text-amber-400' },
                                                            'WALLET_TOPUP': { icon: PlusCircle, color: 'text-emerald-400' },
                                                            'GATEWAY_FEE': { icon: ShieldAlert, color: 'text-orange-400' },
                                                            'REFUND_FEE': { icon: RotateCcw, color: 'text-rose-400' },
                                                            'SHIPPING_FEE': { icon: Truck, color: 'text-cyan-400' },
                                                            'ADJUDICATION_FEE': { icon: Gavel, color: 'text-orange-400' },
                                                            'FRAUD_PENALTY': { icon: AlertOctagon, color: 'text-red-600' }
                                                        };

                                                        const config = iconConfig[type] || { icon: AlertCircle, color: 'text-white/40' };
                                                        const Icon = config.icon;

                                                        return (
                                                            <div className={`flex items-center gap-1.5 ${config.color}`}>
                                                                <Icon size={12} className={type === 'LOYALTY_BONUS' ? 'animate-bounce' : ''} />
                                                                <span>{typeLabels[type] || type}</span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </td>

                                            <td className="px-4 py-4">
                                                <button onClick={() => tx.payment?.order?.id && onNavigate?.('explore-offer', tx.payment.order.id)} className="p-2 rounded bg-white/5 hover:bg-gold-500 hover:text-black transition-all border border-white/10"><FileText size={12} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>

                    <MerchantStoreTierProgress
                        stats={stats}
                        performanceSnap={performanceSnap}
                        isAr={isAr}
                        labels={{
                            tierProgressionTitle: w.tierProgressionTitle,
                            storeTierHint: w.storeTierHint,
                            progressToNext: w.progressToNext,
                            viewTierDetails: w.viewTierDetails,
                            completedOrders: w.completedOrders,
                            totalSales: w.totalSales,
                            maxStoreTier: w.maxStoreTier,
                            eliteInviteOnly: w.eliteInviteOnly,
                        }}
                        onNavigate={onNavigate}
                    />

                    {/* Payout Section (Withdrawal & Profits) */}
                    <GlassCard className="p-0 border-gold-500/10 bg-gradient-to-br from-gold-500/[0.03] to-transparent relative overflow-hidden">
                        {withdrawalsFrozen && (
                            <div className="absolute inset-0 z-20 backdrop-blur-md bg-black/40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center border border-red-500/30 mb-4 shadow-2xl shadow-red-500/20"
                                >
                                    <Lock size={40} className="text-red-500" />
                                </motion.div>
                                <h4 className="text-xl font-black text-white uppercase tracking-widest mb-2">
                                    {isAr ? 'العمليات المالية مقيدة' : 'Financial Payouts Restricted'}
                                </h4>
                                <p className="text-white/60 text-xs max-w-xs leading-relaxed font-medium">
                                    {isAr
                                        ? `تم تجميد عمليات السحب لهذا الحساب مؤقتاً. السبب: ${withdrawalFreezeNote || 'مراجعة أمنية'}`
                                        : `Payout capabilities are currently restricted for this account. Reason: ${withdrawalFreezeNote || 'Security Review'}`}
                                </p>
                            </div>
                        )}

                        <div className={`p-6 sm:p-8 transition-all duration-500 ${withdrawalsFrozen ? 'filter blur-sm opacity-50 grayscale select-none pointer-events-none' : ''}`}>
                            {stats?.hasOpenReturnOrDispute && withdrawalRestrictionMessage && (
                                <div className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
                                    <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <p className="text-amber-300 text-xs font-black uppercase tracking-wider mb-1">
                                            {w.withdrawalRestrictionTitle}
                                        </p>
                                        <p className="text-white/70 text-xs leading-relaxed">{withdrawalRestrictionMessage}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                        <ArrowRightLeft className="text-gold-500" size={20} />
                                        {isAr ? 'سحب المبالغ والأرباح' : 'Withdrawal & Profits Payout'}
                                    </h3>
                                    <p className="text-white/40 text-xs mt-1">
                                        {isAr ? 'قم بسحب أرباح متجرك إلى حسابك البنكي أو عبر Stripe بشكل آمن' : 'Withdraw your store profits to your bank account or via Stripe securely.'}
                                    </p>
                                </div>
                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shrink-0">
                                    <button
                                        onClick={() => setPayoutMethod('BANK_TRANSFER')}
                                        className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${payoutMethod === 'BANK_TRANSFER' ? 'bg-gold-500 text-black' : 'text-white/40'}`}
                                    >
                                        {isAr ? 'تحويل بنكي' : 'Bank Transfer'}
                                    </button>
                                    <button
                                        onClick={() => setPayoutMethod('STRIPE')}
                                        className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${payoutMethod === 'STRIPE' ? 'bg-[#635BFF] text-white' : 'text-white/40'}`}
                                    >
                                        Stripe
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left: Amount */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[2px] block">{isAr ? 'مبلغ السحب (AED)' : 'Withdrawal Amount (AED)'}</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <Wallet size={18} className="text-gold-500/50 group-focus-within:text-gold-500 transition-colors" />
                                        </div>
                                        <input
                                            type="number"
                                            min={withdrawalLimits.min}
                                            max={maxWithdrawable ?? undefined}
                                            step="0.01"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            placeholder="0.00"
                                            disabled={!canWithdraw || withdrawalsFrozen}
                                            className={`w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xl font-bold text-white outline-none focus:border-gold-500/50 transition-all font-mono ${!canWithdraw ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-white/30">{isAr ? 'الرصيد المتاح:' : 'Available:'} <span className="text-gold-500 font-black">{isLoading ? '…' : `${(stats.available || 0).toLocaleString()} AED`}</span></span>
                                        <span className="text-white/30">{isAr ? 'الحد الأقصى للسحب:' : 'Max withdraw:'} <span className="text-white/80">{(maxWithdrawable ?? 0).toLocaleString()} AED</span></span>
                                        <span className="text-white/30">{isAr ? 'حد أدنى:' : 'Min:'} <span className="text-white/80">{withdrawalLimits.min} AED</span></span>
                                    </div>
                                    {!canWithdraw && !isLoading && !withdrawalsFrozen && (
                                        <p className="text-[10px] text-white/40">
                                            {isAr
                                                ? `الحد الأدنى للسحب ${withdrawalLimits.min} AED — رصيدك الحالي غير كافٍ`
                                                : `Minimum withdrawal is ${withdrawalLimits.min} AED — your balance is insufficient`}
                                        </p>
                                    )}
                                    {withdrawError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-bold">
                                            <AlertCircle size={14} /> {withdrawError}
                                        </div>
                                    )}
                                    {withdrawSuccess && (
                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-[10px] font-bold">
                                            <CheckCircle2 size={14} /> {isAr ? 'تم تقديم طلب السحب!' : 'Withdrawal request submitted!'}
                                        </div>
                                    )}
                                    <button
                                        onClick={(e) => { e.preventDefault(); handleSubmitWithdrawal(e as any); }}
                                        disabled={isSubmitting || withdrawalsFrozen || !withdrawAmount || Number(withdrawAmount) <= 0 || !canWithdraw}
                                        className={`w-full py-4 font-black uppercase tracking-[3px] text-xs rounded-2xl transition-all shadow-xl shadow-gold-500/10 flex items-center justify-center gap-2 ${!canWithdraw || withdrawalsFrozen ? 'opacity-50 cursor-not-allowed bg-gold-500/50' : 'bg-gold-500 hover:bg-gold-400 text-black'}`}
                                    >
                                        {isSubmitting ? <RotateCcw size={18} className="animate-spin" /> : <ArrowUpRight size={18} />}
                                        {isAr ? 'تأكيد طلب السحب' : 'Confirm Withdrawal'}
                                    </button>
                                </div>

                                {/* Right: Method Config */}
                                <div>
                                    <PayoutMethodPanel
                                        mode={payoutMethod}
                                        isAr={isAr}
                                        bankDetails={bankDetails}
                                        stripeOnboarded={Boolean(stats.stripeOnboarded)}
                                        stripeDisplay={stripeConnectInfo}
                                        isOnboarding={isOnboarding}
                                        bankLinkSuccess={bankLinkSuccess}
                                        onStripeConnect={handleStripeConnect}
                                        onEditBank={() => setShowBankForm(true)}
                                        merchantVariant
                                    />
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Withdrawal History Table */}
                    <GlassCard className="p-0 overflow-hidden border-white/5 bg-black/20">
                        <div className="p-5 border-b border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Clock className="text-gold-500/50" size={16} />
                                <h3 className="text-base font-bold text-white">{isAr ? 'سجل عمليات السحب' : 'Withdrawal History'}</h3>
                            </div>
                            <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-black text-white/40 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-gold-500 animate-pulse" />
                                {withdrawalRequests.length} {isAr ? 'عمليات' : 'Records'}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-center border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.01] text-[9px] text-white/30 uppercase tracking-[2px] font-black">
                                        <th className="px-4 py-3">{isAr ? 'المبلغ' : 'Amount'}</th>
                                        <th className="px-4 py-3">{isAr ? 'الحالة' : 'Status'}</th>
                                        <th className="px-4 py-3">{isAr ? 'الطريقة' : 'Method'}</th>
                                        <th className="px-4 py-3">{isAr ? 'تاريخ المراجعة' : 'Review Date'}</th>
                                        <th className="px-4 py-3">{isAr ? 'التاريخ' : 'Date'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {withdrawalRequests.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-16 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-20">
                                                    <ClipboardCheck size={28} />
                                                    <p className="text-[10px] font-black uppercase tracking-[3px]">{isAr ? 'لا يوجد سجل سحب' : 'No withdrawal records found'}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        withdrawalRequests.map((req, idx) => (
                                            <tr key={req.id || idx} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-4">
                                                    <span className="text-sm font-black text-white">{Number(req.amount).toLocaleString()}</span>
                                                    <span className="text-[9px] text-gold-500/50 ml-1">AED</span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className={`inline-flex items-center px-3 py-1 rounded-full border text-[9px] font-black uppercase ${req.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                            'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${req.status === 'COMPLETED' ? 'bg-emerald-400' : req.status === 'PENDING' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
                                                        {isAr ? (req.status === 'COMPLETED' ? 'تم التحويل' : req.status === 'PENDING' ? 'قيد المراجعة' : 'مرفوض') : req.status}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {req.payoutMethod === 'STRIPE' ? (
                                                        <div className="inline-flex items-center gap-1.5 bg-[#635BFF]/10 text-[#635BFF] px-3 py-1 rounded-lg border border-[#635BFF]/20 text-[9px] font-black">
                                                            <Zap size={10} /> Stripe
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1.5 bg-gold-500/10 text-gold-500 px-3 py-1 rounded-lg border border-gold-500/20 text-[9px] font-black">
                                                            <CreditCard size={10} /> Bank
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-[10px] text-white/30 font-bold">
                                                    {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : '---'}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-[11px] font-bold text-white/80">{new Date(req.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</p>
                                                    <p className="text-[8px] text-white/20 font-black uppercase">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>

                </div>

                {/* 4b. Sidebar Widgets (The Transformation) */}
                <div className="space-y-6">
                    {/* Activity Feed (Notifications) */}
                    <GlassCard className="p-6 border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <h4 className="text-[10px] font-black text-white/80 uppercase tracking-widest">{isAr ? 'أحدث التنبيهات' : 'Activity Feed'}</h4>
                            </div>
                        </div>
                        <div className="space-y-5">
                            {notifications.length > 0 ? notifications.slice(0, 3).map((n, i) => (
                                <div key={i} className="flex gap-3 items-start group relative">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-gold-500/20 group-hover:text-gold-500 transition-all text-white/30">
                                        <Bell size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] text-white/70 leading-relaxed font-medium line-clamp-2">{isAr ? n.messageAr : n.messageEn}</p>
                                        <span className="block text-[9px] text-white/20 mt-1 font-black uppercase tracking-tighter">
                                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • JUST NOW
                                        </span>
                                    </div>
                                </div>
                            )) : <p className="text-center py-8 text-[10px] font-black text-white/10 uppercase tracking-widest">{isAr ? 'لا توجد تنبيهات' : 'Quiet for now'}</p>}
                        </div>
                    </GlassCard>

                    {/* PREMIUM Referral Social Hub */}
                    <GlassCard className="p-6 border-blue-500/20 relative group bg-gradient-to-br from-blue-600/[0.08] via-transparent to-transparent overflow-hidden">
                        <div className="absolute top-0 right-0 p-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-colors" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1 h-4 bg-gold-500 rounded-full" />
                                    {isAr ? 'نظام الإحالات' : 'Referral Social Hub'}
                                </h3>
                                <button
                                    onClick={() => onNavigate?.('performance')}
                                    title={isAr ? 'الانتقال إلى مركز الأداء والمزايا' : 'Go to Performance Center'}
                                    className="p-1.5 bg-gold-500/10 hover:bg-gold-500/20 text-gold-500 hover:text-gold-400 rounded-lg border border-gold-500/20 hover:border-gold-500/40 transition-all active:scale-90"
                                >
                                    <ArrowUpRight size={14} />
                                </button>
                            </div>
                            <div className="mb-4">
                                <div className="px-3 py-1 bg-gold-500/10 border border-gold-500/20 rounded-full inline-block">
                                    <span className="text-[10px] font-black text-gold-500 uppercase tracking-tighter">{isAr ? 'إجمالي الإحالات:' : 'Total Refs:'} {stats.referralCount}</span>
                                </div>
                                <p className="text-[10px] text-white/40 mt-2 leading-relaxed">{w.referralCommissionNote}</p>
                            </div>
                            <div className="space-y-4">
                                <div className="relative group/input">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/50 to-purple-500/50 rounded-xl opacity-20 group-hover/input:opacity-40 transition-opacity blur" />
                                    <div className="relative flex items-center bg-black/60 border border-white/10 rounded-xl overflow-hidden">
                                        <input readOnly value={stats.referralCode ? `${window.location.origin}/register?ref=${stats.referralCode}` : '---'} className="flex-1 bg-transparent px-4 py-3.5 text-[10px] font-mono font-bold text-blue-400 outline-none truncate" />
                                        <button onClick={handleCopyReferral} className="p-3.5 bg-white/5 hover:bg-white/10 text-white/30 hover:text-blue-400 transition-all border-l border-white/10">
                                            <AnimatePresence mode="wait">
                                                {copied ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="check"><CheckCircle2 size={16} className="text-blue-400" /></motion.div> : <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="copy"><Copy size={16} /></motion.div>}
                                            </AnimatePresence>
                                        </button>
                                    </div>
                                </div>
                                <button onClick={handleCopyReferral} className={`w-full py-3.5 rounded-xl transition-all shadow-xl font-black text-[10px] uppercase tracking-[2px] relative overflow-hidden group/btn flex items-center justify-center gap-2 ${copied ? 'bg-emerald-500 text-black' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                                    {copied ? <CheckCircle2 size={16} /> : <Share2 size={16} />}
                                    {copied ? (isAr ? 'تم نسخ الرابط!' : 'LINK COPIED!') : (isAr ? 'دعوة صديق الآن' : 'INVITE PARTNER')}
                                </button>

                                {/* Fixed 1% Referral CTA + 6-month Window Note (v2 2026) */}
                                <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center relative overflow-hidden group/cta">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/30" />
                                    <p className="text-[10px] text-blue-400 font-black mb-1.5 leading-snug tracking-tight">
                                        {isAr
                                            ? 'اربح عمولة 1% من ثمن كل منتج يشتريه صديقك خلال 6 شهور من تاريخ تسجيله.'
                                            : "Earn 1% commission on every item your friend buys, for 6 months from their signup date."}
                                    </p>
                                    <p className="text-[9px] text-blue-400/80 mt-2 font-bold flex items-center justify-center gap-1.5">
                                        <Clock size={10} />
                                        {isAr ? 'مدة فعالية الرابط: 6 شهور لكل مُحال' : 'Link validity: 6 months per referred user'}
                                    </p>
                                    <p className="text-[9px] text-white/30 font-medium leading-relaxed px-2 mt-2">
                                        {isAr
                                            ? 'رؤيتك وشركاؤك هم قيمة متجرك الحقيقية. ابدأ في بناء شبكتك العالمية اليوم.'
                                            : 'Your vision and partners are your store\'s true value. Start building your global network today.'}
                                    </p>
                                </div>

                                <div className="relative pt-6 pb-2">
                                    <div className="absolute top-[38px] left-[15%] right-[15%] h-[2px] bg-white/5 z-0">
                                        <motion.div initial={{ width: 0 }} animate={{ width: stats.referralCount > 0 ? (stats.referralCount > 5 ? '100%' : '50%') : '0%' }} transition={{ duration: 1.5, delay: 0.5 }} className="h-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                                    </div>
                                    <div className="relative z-10 flex justify-between">
                                        {[{ icon: Share2, label: isAr ? 'شارك' : 'Share', act: true }, { icon: UserPlus, label: isAr ? 'انضمام' : 'Join', act: stats.referralCount > 0 }, { icon: Star, label: isAr ? 'اربح' : 'Earn', act: stats.referralCount > 5 }].map((step, idx) => (
                                            <div key={idx} className="flex flex-col items-center gap-3 w-1/3">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all border-2 ${step.act ? 'bg-blue-600 border-blue-400 text-white shadow-xl scale-110' : 'bg-black border-white/5 text-white/20'}`}><step.icon size={16} /></div>
                                                <span className={`text-[9px] font-black uppercase tracking-tight ${step.act ? 'text-blue-400' : 'text-white/20'}`}>{step.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* RESTORED: Referral Profits Overview (Info Only) */}
                    <GlassCard className="p-6 border-gold-500/20 bg-gradient-to-br from-gold-500/[0.04] via-transparent to-transparent group">
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gold-500/10 rounded-lg border border-gold-400/20 text-gold-500 group-hover:scale-110 transition-transform"><Wallet size={16} /></div>
                                <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{w.referralProfits}</h3>
                            </div>
                            <Star size={14} className="text-gold-500/50" />
                        </div>
                        <div className="space-y-4 relative z-10">
                            <div className="border-b border-white/5 pb-2">
                                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">{w.referralPersonalBalance}</p>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-3xl font-black text-white">
                                    {Number((stats as any).earnedReferralProfits || 0).toLocaleString()}
                                </h2>
                                <span className="text-xs text-white/30 font-black uppercase tracking-tighter">AED</span>
                            </div>
                            <p className="text-[9px] text-white/20 italic font-medium leading-tight">
                                {w.referralEscrowNote}
                            </p>

                            <div className="pt-2">
                                <div className="px-3 py-2 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                                        {isAr ? 'دفعات فورية مفعلة' : 'Instant Payouts Enabled'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                </div>
            </div>

            {/* Bank Details Modal Integration */}
            <AnimatePresence>
                {showBankForm && (
                    <BankDetailsModal
                        isOpen={showBankForm}
                        onClose={() => setShowBankForm(false)}
                        isAr={isAr}
                        form={bankForm}
                        onChange={setBankForm}
                        onSave={handleSaveBankDetails}
                        isLoading={isSavingBank}
                        isUpdate={Boolean(bankDetails?.isLinked ?? bankDetails?.iban)}
                        maskedExistingIban={bankDetails?.maskedIban}
                    />
                )}
            </AnimatePresence>

            {/* Stripe Success Celebration Modal */}
            <AnimatePresence>
                {stripeSuccess && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setStripeSuccess(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, y: 100 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.5, opacity: 0, y: 100 }}
                            className="bg-[#1A1814] border border-gold-500/30 rounded-[3rem] p-12 max-w-md w-full text-center relative z-10 shadow-[0_0_100px_rgba(212,175,55,0.2)]"
                        >
                            <div className="w-24 h-24 bg-gold-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-gold-500/20">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.3, type: 'spring' }}
                                >
                                    <ShieldCheck className="text-black" size={48} />
                                </motion.div>
                            </div>

                            <h2 className="text-3xl font-black text-white mb-4 leading-tight">
                                {isAr ? 'تهانينا! تم الربط بنجاح' : 'Congratulations! Connected Successfully'}
                            </h2>
                            <p className="text-white/50 mb-6 leading-relaxed font-bold">
                                {isAr
                                    ? 'تم تفعيل مدفوعات Stripe الفورية لمتجرك. يمكنك الآن استلام أرباحك مباشرة وبكل سهولة.'
                                    : 'Stripe instant payouts are now enabled for your store. You can now receive your earnings directly and easily.'}
                            </p>
                            {stripeConnectInfo && (
                                <div className="mb-8 p-4 rounded-2xl border border-white/10 bg-black/30 text-left text-xs space-y-2">
                                    {stripeConnectInfo.businessName && (
                                        <p className="text-white/80"><span className="text-white/40">{isAr ? 'الاسم: ' : 'Name: '}</span>{stripeConnectInfo.businessName}</p>
                                    )}
                                    {stripeConnectInfo.email && (
                                        <p className="text-white/80 font-mono"><span className="text-white/40">{isAr ? 'البريد: ' : 'Email: '}</span>{stripeConnectInfo.email}</p>
                                    )}
                                    {stripeConnectInfo.maskedAccountId && (
                                        <p className="text-emerald-400 font-mono"><span className="text-white/40">{isAr ? 'الحساب: ' : 'Account: '}</span>{stripeConnectInfo.maskedAccountId}</p>
                                    )}
                                </div>
                            )}
                            <p className="text-[10px] text-white/30 mb-6">
                                {isAr ? 'لا حاجة لربط حسابات إضافية.' : 'No need to connect additional accounts.'}
                            </p>

                            <button
                                onClick={() => setStripeSuccess(false)}
                                className="w-full py-5 bg-gold-500 hover:bg-gold-400 text-black font-black uppercase tracking-[3px] rounded-2xl transition-all shadow-xl shadow-gold-500/20"
                            >
                                {isAr ? 'ابدأ الاستخدام' : 'Get Started'}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
