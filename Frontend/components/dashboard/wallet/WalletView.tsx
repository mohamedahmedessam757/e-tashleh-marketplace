import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wallet, 
    CreditCard, 
    TrendingUp, 
    Clock, 
    ClipboardCheck, 
    ShieldCheck, 
    Percent, 
    Crown, 
    FileText, 
    Copy, 
    CheckCircle2, 
    Link as LinkIcon, 
    ArrowRightLeft, 
    Download, 
    Calendar, 
    Search,
    ChevronRight,
    ArrowUpRight,
    ExternalLink,
    AlertCircle,
    UserPlus,
    RotateCcw,
    ShoppingBag,
    Star,
    Share2,
    ShieldAlert,
    Lock,
    Scale,
    AlertTriangle,
    Gavel,
    Trophy,
    PlusCircle,
    Truck,
    AlertOctagon
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useCustomerWalletStore } from '../../../stores/useCustomerWalletStore';
import { PendingStoreReviewBanner } from '../shared/PendingStoreReviewBanner';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { getCurrentUserId } from '../../../utils/auth';
import { useLanguage } from '../../../contexts/LanguageContext';
import { 
    ChevronDown, 
    Settings, 
} from 'lucide-react';

import { RestrictionAlertBanner } from '../shared/RestrictionAlertBanner';
import { PayoutMethodPanel } from './PayoutMethodPanel';
import { BankDetailsModal } from './BankDetailsModal';

interface WalletViewProps {
    onNavigate?: (path: string, id?: any) => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ onNavigate }) => {
    const { language, t } = useLanguage();
    const isAr = language === 'ar';
    const wd = t.dashboard.profile.wallet.walletDashboard;
    const { 
        stats, 
        transactions, 
        withdrawalRequests,
        withdrawalLimits,
        bankDetails,
        stripeConnectInfo,
        isLoading, 
        fetchWalletData,
        fetchWithdrawals,
        fetchBankDetails,
        saveBankDetails,
        requestWithdrawal,
        getStripeOnboardingUrl
    } = useCustomerWalletStore();
    const { notifications, fetchNotifications } = useNotificationStore();
    const [copied, setCopied] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    
    // Withdrawal Form State
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [withdrawError, setWithdrawError] = useState('');
    const [withdrawSuccess, setWithdrawSuccess] = useState(false);
    const [isOnboarding, setIsOnboarding] = useState(false);
    const [stripeSuccess, setStripeSuccess] = useState(false);
    const [bankLinkSuccess, setBankLinkSuccess] = useState(false);
    const [payoutMethod, setPayoutMethod] = useState<'BANK_TRANSFER' | 'STRIPE'>('BANK_TRANSFER');
    
    // Bank Details Form State
    const [bankForm, setBankForm] = useState({ bankName: '', accountHolder: '', iban: '', swift: '' });
    const [isSavingBank, setIsSavingBank] = useState(false);
    const [showBankForm, setShowBankForm] = useState(false);

    const availableBalance = isLoading ? null : Number(stats?.customerBalance ?? 0);
    const canWithdraw =
        !stats?.withdrawalsFrozen &&
        availableBalance !== null &&
        availableBalance >= withdrawalLimits.min;

    useEffect(() => {
        fetchWalletData();
        fetchWithdrawals();
        fetchBankDetails();
    }, [fetchWalletData, fetchWithdrawals, fetchBankDetails]);

    // --- STRIPE CONNECT RETURN HANDLER ---
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const stripeStatus = params.get('stripe_status');

        if (stripeStatus === 'return') {
            const handleReturn = async () => {
                setIsOnboarding(true);
                try {
                    const { success, onboarded } = await useCustomerWalletStore.getState().refreshStripeStatus();
                    if (success && onboarded) {
                        setStripeSuccess(true);
                        fetchBankDetails(); // Refresh all details
                    } else if (success && !onboarded) {
                        alert(
                            language === 'ar'
                            ? '⚠️ يبدو أنك لم تكمل جميع البيانات المطلوبة في Stripe. يرجى المحاولة مرة أخرى.'
                            : '⚠️ It seems you did not complete all required details in Stripe. Please try again.'
                        );
                    } else {
                        alert(
                            language === 'ar'
                            ? 'فشل تحديث حالة الربط، يرجى المحاولة لاحقاً.'
                            : 'Failed to update connection status, please try again.'
                        );
                    }
                } catch (error) {
                    console.error('Error refreshing stripe status:', error);
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
                language === 'ar'
                ? 'تم تحديث صفحة الربط. يرجى المتابعة.'
                : 'Onboarding session refreshed. Please continue.'
            );
            // Clean URL
            const url = new URL(window.location.href);
            url.searchParams.delete('stripe_status');
            window.history.replaceState({}, '', url.pathname + url.search);
        }
    }, [language, fetchBankDetails]);

    useEffect(() => {
        if (bankDetails) {
            setBankForm({
                bankName: bankDetails.bankName || '',
                accountHolder: bankDetails.accountHolder || '',
                iban: bankDetails.iban || '',
                swift: bankDetails.swift || ''
            });
        }
    }, [bankDetails]);

    const handleCopyReferral = () => {
        if (!stats?.referralCode) return;
        const url = `${window.location.origin}/register?ref=${stats.referralCode}`;
        
        const fallbackCopy = (text: string) => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            document.body.removeChild(textArea);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url)
                .then(() => setCopied(true))
                .catch(() => fallbackCopy(url));
        } else {
            fallbackCopy(url);
        }

        setTimeout(() => setCopied(false), 3000);
    };

    const handleStripeConnect = async () => {
        setIsOnboarding(true);
        try {
            const url = await getStripeOnboardingUrl();
            if (!url) throw new Error(language === 'ar' ? 'لم يتم استلام رابط الربط من الخادم' : 'No onboarding URL received from server');
            // Use same window to maintain session stability in localhost/popups environments
            window.location.href = url;
        } catch (error: any) {
            console.error('Stripe Connect Error:', error);
            const msg = error.response?.data?.message || error.message || '';
            
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
                titleAr: 'تم حفظ البيانات البنكية',
                titleEn: 'Bank Details Saved',
                messageAr: result.message,
                messageEn: result.message,
                recipientRole: 'CUSTOMER'
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

        if (amountNum > (stats?.customerBalance || 0)) {
            setWithdrawError(isAr ? 'رصيد المكافآت غير كافٍ' : 'Insufficient rewards balance');
            return;
        }

        // Validate prerequisites
        if (payoutMethod === 'STRIPE' && !bankDetails?.stripeOnboarded) {
            setWithdrawError(isAr ? 'يجب ربط حسابك عبر Stripe أولاً' : 'Please complete Stripe onboarding first');
            return;
        }
        if (payoutMethod === 'BANK_TRANSFER' && !bankDetails?.iban) {
            setWithdrawError(isAr ? 'يجب إضافة بيانات الحساب البنكي أولاً' : 'Please add your bank details first');
            return;
        }

        setIsSubmitting(true);
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


    const filteredTransactions = useMemo(() => {
        let result = transactions;

        // 1. Status Filter
        if (filter === 'COMPLETED') {
            result = result.filter(tx => tx.status === 'SUCCESS' || tx.status === 'COMPLETED');
        } else if (filter === 'PENDING') {
            result = result.filter(tx => tx.status === 'PENDING');
        }

        // 2. Search Query (Order #, Type, Amount)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(tx => 
                (tx.id && tx.id.toLowerCase().includes(q)) || 
                (tx.orderId && tx.orderId.toLowerCase().includes(q)) ||
                (tx.transactionType && tx.transactionType.toLowerCase().includes(q)) ||
                (tx.amount?.toString().includes(q)) ||
                (tx.order?.orderNumber?.toLowerCase().includes(q))
            );
        }

        // 3. Date Range Filter
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
            // v2026 Professional Report Generation Logic
            // We create a pixel-perfect "Statement of Account" based on the filtered data
            const printableContent = document.createElement('div');
            printableContent.className = 'statement-print-template';
            
            const logoUrl = 'https://e-tashleh.com/logo.png'; // Fallback to public asset
            const date = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');

            const html = `
                <div style="padding: 40px; font-family: 'Inter', 'Segoe UI', sans-serif; color: #1a1a1a; background: white; min-height: 100vh; line-height: 1.5; position: relative;" dir="${isAr ? 'rtl' : 'ltr'}">
                    
                    <!-- Professional Watermark -->
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 150px; color: rgba(168, 139, 62, 0.03); font-weight: 900; white-space: nowrap; pointer-events: none; z-index: 0; user-select: none;">
                        E-TASHLEH OFFICIAL
                    </div>

                    <!-- Standard Invoice Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #E5E7EB; padding-bottom: 30px; margin-bottom: 40px; position: relative; z-index: 1;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <img src="/logo.png" style="width: 50px; height: 50px; object-contain: fit;" />
                            <div>
                                <h1 style="color: #A88B3E; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 1px;">E-TASHLEH</h1>
                                <p style="margin: 5px 0 0; font-size: 14px; color: #666; font-weight: 800; text-transform: uppercase;">${isAr ? 'كشف حساب مالي رسمي' : 'Official Financial Statement'}</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <h2 style="margin: 0; font-size: 14px; font-weight: 800; color: #999; text-transform: uppercase; letter-spacing: 1px;">${isAr ? 'رقم الكشف' : 'Statement No.'}</h2>
                            <p style="margin: 2px 0 0; font-size: 16px; font-weight: 700; color: #1a1a1a; font-family: monospace;">#ST-${new Date().getTime().toString().slice(-8)}</p>
                        </div>
                    </div>

                    <!-- Client and Account Summary Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 40px; margin-bottom: 40px; position: relative; z-index: 1;">
                        <div style="background: #FAFAFA; padding: 20px; border-radius: 8px; border: 1px solid #F3F4F6;">
                            <h4 style="margin: 0 0 12px; font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">${isAr ? 'بيانات العميل' : 'Customer Information'}</h4>
                            <p style="margin: 0; font-size: 18px; font-weight: 800; color: #111827;">${stats?.name || '---'}</p>
                            <p style="margin: 6px 0; font-size: 12px; color: #6B7280; font-weight: 500;"><strong>ID:</strong> ${getCurrentUserId()}</p>
                            <p style="margin: 0; font-size: 12px; color: #6B7280; font-weight: 500;"><strong>${isAr ? 'المستوى' : 'Loyalty Tier'}:</strong> ${stats?.loyaltyTier || 'BASIC'}</p>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div style="border-bottom: 1px solid #F3F4F6; padding-bottom: 10px;">
                                <span style="font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 800;">${isAr ? 'الرصيد المتاح' : 'Available Balance'}</span>
                                <div style="font-size: 16px; font-weight: 800; color: #A88B3E;">${(stats?.customerBalance || 0).toLocaleString()} <small style="font-size: 9px;">AED</small></div>
                            </div>
                            <div style="border-bottom: 1px solid #F3F4F6; padding-bottom: 10px;">
                                <span style="font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 800;">${isAr ? 'إجمالي المشتريات' : 'Total Purchases'}</span>
                                <div style="font-size: 16px; font-weight: 800; color: #111827;">${(stats?.totalPurchases || 0).toLocaleString()} <small style="font-size: 9px;">AED</small></div>
                            </div>
                            <div style="border-bottom: 1px solid #F3F4F6; padding-bottom: 10px;">
                                <span style="font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 800;">${isAr ? 'تاريخ الإصدار' : 'Issued Date'}</span>
                                <div style="font-size: 13px; font-weight: 700; color: #111827;">${date}</div>
                            </div>
                            <div style="border-bottom: 1px solid #F3F4F6; padding-bottom: 10px;">
                                <span style="font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 800;">${isAr ? 'حالة الحساب' : 'Account Status'}</span>
                                <div style="font-size: 11px; font-weight: 900; color: #10B981; text-transform: uppercase;">ACTIVE / مُفعل</div>
                            </div>
                        </div>
                    </div>

                    <!-- Ledger Table -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; position: relative; z-index: 1;">
                        <thead>
                            <tr style="background: #F9FAFB; border-bottom: 2px solid #E5E7EB;">
                                <th style="padding: 15px 12px; text-align: ${isAr ? 'right' : 'left'}; font-size: 11px; font-weight: 800; color: #4B5563; text-transform: uppercase;">${isAr ? 'رقم المرجع / الطلب' : 'REF / ORDER #'}</th>
                                <th style="padding: 15px 12px; text-align: ${isAr ? 'right' : 'left'}; font-size: 11px; font-weight: 800; color: #4B5563; text-transform: uppercase;">${isAr ? 'التاريخ' : 'DATE'}</th>
                                <th style="padding: 15px 12px; text-align: center; font-size: 11px; font-weight: 800; color: #4B5563; text-transform: uppercase;">${isAr ? 'نوع العملية' : 'TYPE'}</th>
                                <th style="padding: 15px 12px; text-align: center; font-size: 11px; font-weight: 800; color: #4B5563; text-transform: uppercase;">${isAr ? 'الحالة' : 'STATUS'}</th>
                                <th style="padding: 15px 12px; text-align: right; font-size: 11px; font-weight: 800; color: #4B5563; text-transform: uppercase;">${isAr ? 'المبلغ الصافي' : 'NET AMOUNT'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredTransactions.map(tx => {
                                const isCredit = tx.type === 'CREDIT';
                                return `
                                    <tr style="border-bottom: 1px solid #F3F4F6;">
                                        <td style="padding: 15px 12px; font-size: 12px; font-family: monospace; font-weight: 700; color: #111827;">#${tx.order?.orderNumber || (tx.id.length > 10 ? tx.id.slice(0, 8).toUpperCase() : tx.id)}</td>
                                        <td style="padding: 15px 12px; font-size: 12px; color: #6B7280; font-weight: 500;">${new Date(tx.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</td>
                                        <td style="padding: 15px 12px; text-align: center; font-size: 11px; font-weight: 600; color: #4B5563;">${(tx.transactionType || 'PAYMENT').toUpperCase()}</td>
                                        <td style="padding: 15px 12px; text-align: center;">
                                            <span style="font-size: 9px; font-weight: 900; padding: 4px 8px; border-radius: 4px; border: 1px solid #E5E7EB; background: #F9FAFB; color: #4B5563; text-transform: uppercase;">
                                                ${tx.status || 'SUCCESS'}
                                            </span>
                                        </td>
                                        <td style="padding: 15px 12px; text-align: right; font-size: 13px; font-weight: 800; color: ${isCredit ? '#10B981' : '#111827'};">
                                            ${isCredit ? '+' : '-'}${(tx.amount || 0).toLocaleString()} AED
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>

                    <!-- Footer -->
                    <div style="margin-top: 80px; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 30px; position: relative; z-index: 1;">
                        <p style="font-size: 11px; color: #9CA3AF; margin: 0 0 5px;">${isAr ? 'تم إنشاء كشف الحساب هذا إلكترونياً من قبل نظام محاسبة E-TASHLEH' : 'This statement was automatically generated by the E-TASHLEH accounting system.'}</p>
                        <p style="font-size: 12px; font-weight: 800; color: #A88B3E; margin: 0;">E-TASHLEH PLATFORM — 2026</p>
                    </div>
                </div>
            `;

            // Open a new window for professional printing
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`<html><head><title>Account Statement - ${date}</title></head><body>${html}</body></html>`);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                    setIsGeneratingReport(false);
                }, 500);
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
            'PENDING': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            'FAILED': 'bg-red-500/10 text-red-400 border-red-500/20',
            'REFUNDED': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'DELIVERED': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            'PAID': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            'CANCELLED': 'bg-red-500/10 text-red-400 border-red-500/20',
        };
        return styles[status?.toUpperCase()] || 'bg-white/5 text-white/50 border-white/10';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'COMPLETED': isAr ? 'مكتمل' : 'Completed',
            'SUCCESS': isAr ? 'ناجح' : 'Success',
            'PENDING': isAr ? 'قيد الانتظار' : 'Pending',
            'FAILED': isAr ? 'فاشل' : 'Failed',
            'REFUNDED': isAr ? 'مسترجع' : 'Refunded',
            'DELIVERED': isAr ? 'تم التوصيل' : 'Delivered',
            'PAID': isAr ? 'تم الدفع' : 'Paid',
            'CANCELLED': isAr ? 'ملغي' : 'Cancelled',
        };
        return labels[status?.toUpperCase()] || status;
    };

    const StatCard = ({ label, value, unit, icon: Icon, colorClass, borderClass, bgClass }: any) => (
        <GlassCard className={`p-4 sm:p-5 flex flex-col justify-between min-h-[100px] sm:min-h-[110px] ${borderClass || ''}`}>
            <div className="flex justify-between items-start w-full">
                <p className={`${colorClass || 'text-white/30'} text-[10px] font-black uppercase tracking-wider mb-1`}>{label}</p>
                <div className={`p-1.5 ${bgClass || 'bg-white/5'} rounded-lg ${colorClass || 'text-white/40'} border border-white/10 shrink-0`}>
                    <Icon size={14} className="sm:size-[16px]" />
                </div>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-none mt-2 truncate">
                {value} <span className="text-[10px] text-white/30 font-medium">{unit}</span>
            </h2>
        </GlassCard>
    );

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-2 sm:px-0" dir={isAr ? 'rtl' : 'ltr'}>
            {/* 2026 Admin Transparency Banner */}
            
            {/* 1. Header Navigation & Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gold-500/10 rounded-xl border border-gold-500/20 hidden sm:block">
                        <Wallet className="text-gold-500" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white leading-none truncate max-w-[250px] sm:max-w-none">
                            {isAr ? 'المحفظة المالية' : 'Financial Wallet'}
                        </h1>
                        <p className="text-white/40 text-[10px] sm:text-xs mt-1.5 font-medium">
                            {isAr ? 'إدارة رصيدك المالي، أرباحك، وعمليات السحب والولاء.' : 'Manage your balance, earnings, withdrawals, and loyalty.'}
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
                                placeholder={wd.searchPlaceholder}
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
                        className="p-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-gold-500/20 hover:border-gold-500/40 transition-all text-white/70 hover:text-gold-500 flex items-center gap-2 disabled:opacity-50"
                        title={isAr ? 'تنزيل كشف الحساب' : 'Download Statement'}
                    >
                        {isGeneratingReport ? <RotateCcw size={16} className="animate-spin" /> : <Download size={16} />}
                        <span className="text-[10px] font-bold uppercase tracking-widest sm:hidden">{isAr ? 'تحميل' : 'PDF'}</span>
                    </button>
                </div>
            </div>

            <PendingStoreReviewBanner onNavigate={onNavigate} className="mb-2" />

            {/* 2. Primary Stat Cards (Legacy Restoration) */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                <StatCard 
                    label={wd.availableBalance}
                    value={Number(stats?.customerBalance || 0).toLocaleString()}
                    unit="AED"
                    icon={Wallet}
                    colorClass="text-emerald-400"
                    bgClass="bg-emerald-500/10"
                    borderClass="border-emerald-500/10"
                />
                <StatCard 
                    label={wd.totalPurchases}
                    value={Number(stats?.totalPurchases || 0).toLocaleString()}
                    unit="AED"
                    icon={ShoppingBag}
                    bgClass="bg-blue-500/5"
                    colorClass="text-blue-300"
                />
                <StatCard 
                    label={wd.completedOrders}
                    value={stats?.completedOrders || 0}
                    unit={isAr ? 'طلب' : 'Orders'}
                    icon={ClipboardCheck}
                />
                <StatCard 
                    label={wd.refunded}
                    value={Number(stats?.refundedAmount || 0).toLocaleString()}
                    unit="AED"
                    icon={RotateCcw}
                    colorClass="text-rose-400"
                    bgClass="bg-rose-500/10"
                    borderClass="border-rose-500/10"
                />
                <StatCard 
                    label={wd.loyaltyPoints}
                    value={stats?.loyaltyPoints || 0}
                    unit=""
                    icon={Star}
                    colorClass="text-gold-500"
                    bgClass="bg-gold-500/10"
                    borderClass="border-gold-500/10"
                />
                <StatCard 
                    label={wd.tier}
                    value={stats?.loyaltyTier || 'BASIC'}
                    unit={`[${stats?.referralCount || 0} ${isAr ? 'إحالة' : 'Ref'}]`}
                    icon={Crown}
                    colorClass="text-purple-400"
                    bgClass="bg-purple-500/10"
                    borderClass="border-purple-500/10"
                />
            </div>

            {/* 3. Main Dashboard Row (Income Summary) */}
            <div className="relative">
                {/* 2026 Lock Overlay for Rewards/Income Grid */}
                {stats?.withdrawalsFrozen && (
                    <div className="absolute inset-0 z-20 backdrop-blur-md bg-black/40 rounded-2xl flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-500 border border-red-500/10">
                        <Lock size={32} className="text-red-500/50 mb-2" />
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">{isAr ? 'المكافآت مقيدة حالياً' : 'REWARDS TEMPORARILY RESTRICTED'}</p>
                    </div>
                )}
                
                <motion.div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 transition-all duration-500 ${stats?.withdrawalsFrozen ? 'filter blur-sm grayscale opacity-30 select-none pointer-events-none' : ''}`}>
                <GlassCard className="p-5 sm:p-6 relative overflow-hidden group bg-gradient-to-br from-white/[0.04] to-transparent">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-white/40 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-2">{wd.pendingCashback}</p>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-baseline gap-2">
                                {Number(stats?.pendingLoyaltyRewards ?? stats?.pendingRewards ?? 0).toLocaleString()} <span className="text-xs text-white/30 font-medium">AED</span>
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
                            <p className="text-white/40 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-2">{wd.pendingReferral}</p>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-baseline gap-2">
                                {Number(stats?.pendingReferralRewards ?? 0).toLocaleString()} <span className="text-xs text-white/30 font-medium">AED</span>
                            </h2>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-lg shadow-blue-500/5 group-hover:bg-blue-500/20 transition-colors">
                            <LinkIcon className="text-blue-400" size={20} />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-5 sm:p-6 relative overflow-hidden group bg-gradient-to-br from-white/[0.04] to-transparent">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-white/40 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-2">{wd.monthlyCashback}</p>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-baseline gap-2">
                                {Number(stats?.monthlyLoyaltyRewards ?? stats?.monthlyRewards ?? 0).toLocaleString()} <span className="text-xs text-white/30 font-medium">AED</span>
                            </h2>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5 group-hover:bg-emerald-500/20 transition-colors">
                            <TrendingUp className="text-emerald-400" size={20} />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-5 sm:p-6 relative overflow-hidden group bg-gradient-to-br from-white/[0.04] to-transparent">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-white/40 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-2">{wd.monthlyReferral}</p>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-baseline gap-2">
                                {Number(stats?.monthlyReferralRewards ?? 0).toLocaleString()} <span className="text-xs text-white/30 font-medium">AED</span>
                            </h2>
                        </div>
                        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 shadow-lg shadow-purple-500/5 group-hover:bg-purple-500/20 transition-colors">
                            <UserPlus className="text-purple-400" size={20} />
                        </div>
                    </div>
                </GlassCard>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:col-span-2 lg:col-span-4">
                    <GlassCard className="p-4 flex flex-col justify-center bg-white/[0.02] border-white/5 border-l-2 border-l-emerald-500/30">
                        <p className="text-[10px] text-white/30 uppercase font-black">{wd.orderCompletionRate}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-emerald-400">
                            <ShieldCheck size={16} />
                            <span className="text-lg font-bold sm:text-xl tracking-tighter">{stats?.orderCompletionRate ?? stats?.acceptanceRate ?? 0}%</span>
                        </div>
                    </GlassCard>
                    <GlassCard className="p-4 flex flex-col justify-center bg-white/[0.02] border-white/5 border-l-2 border-l-purple-500/30">
                        <p className="text-[10px] text-white/30 uppercase font-black">{wd.tierCashbackRate}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-purple-400">
                            <Percent size={16} />
                            <span className="text-lg font-bold sm:text-xl tracking-tighter">
                                {stats?.tierCashbackRate ?? stats?.profitPercentage ?? 2}%
                            </span>
                        </div>
                    </GlassCard>
                </div>
            </motion.div>
        </div>

            {/* 4. Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
                
                {/* 4a. Transaction Table (Legacy Style) */}
                <div className="lg:col-span-3 space-y-6">
                    <GlassCard className="p-0 overflow-hidden relative border-white/5">
                        <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.01]">
                            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-3">
                                {isAr ? 'سجل الارباح والطلبات' : 'Earnings & Orders Log'}
                            </h3>
                            <div className="flex p-0.5 sm:p-1 bg-black/40 rounded-xl border border-white/5">
                                {['ALL', 'COMPLETED', 'PENDING'].map((f) => (
                                    <button 
                                        key={f}
                                        onClick={() => setFilter(f as any)}
                                        className={`px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${filter === f ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'text-white/40 hover:text-white'}`}
                                    >
                                        {f === 'ALL' ? (isAr ? 'الكل' : 'All') : f === 'COMPLETED' ? (isAr ? 'المكتملة' : 'Completed') : (isAr ? 'قيد الانتظار' : 'Pending')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative custom-scrollbar">
                            {/* Mobile Scroll Indicator */}
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/40 to-transparent pointer-events-none sm:hidden" />
                            
                            <table className="w-full text-sm text-center border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="sticky top-0 z-20 border-b border-white/5 bg-[#151310] text-[10px] text-white/30 uppercase tracking-widest font-black">
                                        <th className="px-4 py-5 font-black">{isAr ? 'رقم الطلب' : 'Order ID'}</th>
                                        <th className="px-4 py-5 font-black">{isAr ? 'التاريخ' : 'Date'}</th>
                                        <th className="px-4 py-5 font-black">{isAr ? 'المبلغ' : 'Amount'}</th>
                                        <th className="px-4 py-5 font-black">{isAr ? 'حالة الدفع' : 'Payment Status'}</th>
                                        <th className="px-4 py-5 font-black">{isAr ? 'حالة الطلب' : 'Order Status'}</th>
                                        <th className="px-4 py-5 font-black">{isAr ? 'نوع العملية' : 'Process Type'}</th>
                                        <th className="px-4 py-5 font-black">{isAr ? 'الإجراء' : 'Action'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan={7} className="p-12 text-center text-white/20 font-black tracking-widest text-xs">{isAr ? 'جاري التحميل...' : 'LOADING DATA...'}</td></tr>
                                    ) : filteredTransactions.length === 0 ? (
                                        <tr><td colSpan={7} className="p-12 text-center text-white/20 font-black tracking-widest text-xs uppercase">{isAr ? 'لا توجد معاملات مطابقة' : 'NO DATA FOUND'}</td></tr>
                                    ) : (
                                        filteredTransactions.map((tx) => (
                                            <tr key={tx.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-4 py-4">
                                                    <span className="font-mono font-bold text-white group-hover:text-gold-500 transition-colors">#{tx.order?.orderNumber || (tx.metadata?.orderId ? '---' : tx.id.slice(0, 8))}</span>
                                                </td>
                                                <td className="px-4 py-4 font-mono text-white/40 text-[11px]">
                                                    {new Date(tx.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                                </td>
                                                <td className="px-4 py-4 font-bold text-white">
                                                    <span className={tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-white'}>
                                                        {tx.type === 'CREDIT' ? '+' : '-'}{Number(tx.amount || tx.totalAmount || 0).toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] text-white/20 ml-1">AED</span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase border tracking-tight ${getStatusStyle(tx.status || 'SUCCESS')}`}>
                                                        {getStatusLabel(tx.status || 'SUCCESS')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase border bg-white/5 border-white/10 text-white/60 tracking-tight`}>
                                                        {getStatusLabel(tx.order?.status || 'COMPLETED')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase whitespace-nowrap">
                                                        {(() => {
                                                            const type = tx.transactionType?.toUpperCase() || 'PAYMENT';
                                                            const typeLabels = t.dashboard.profile.wallet.transactionTypes;
                                                            
                                                            const iconConfig: Record<string, { icon: any, color: string }> = {
                                                                'ORDER_PROFIT': { icon: Star, color: 'text-gold-500' },
                                                                'REFERRAL_PROFIT': { icon: LinkIcon, color: 'text-blue-400' },
                                                                'PAYMENT': { icon: CreditCard, color: 'text-indigo-400' },
                                                                'WITHDRAWAL': { icon: ArrowUpRight, color: 'text-orange-400' },
                                                                'REFUND': { icon: RotateCcw, color: 'text-rose-400' },
                                                                'COMMISSION': { icon: Scale, color: 'text-slate-400' },
                                                                'PENALTY': { icon: AlertTriangle, color: 'text-red-500' },
                                                                'DISPUTE': { icon: Gavel, color: 'text-purple-400' },
                                                                'LOYALTY_BONUS': { icon: Trophy, color: 'text-amber-400' },
                                                                'WALLET_TOPUP': { icon: PlusCircle, color: 'text-emerald-400' },
                                                                'GATEWAY_FEE': { icon: ShieldAlert, color: 'text-orange-400' },
                                                                'REFUND_FEE': { icon: RotateCcw, color: 'text-rose-400' },
                                                                'SHIPPING_FEE': { icon: Truck, color: 'text-cyan-400' },
                                                                'FRAUD_PENALTY': { icon: AlertOctagon, color: 'text-red-600' },
                                                                'ADJUDICATION_FEE': { icon: Scale, color: 'text-orange-400' },
                                                                'SHIPPING_LIABILITY': { icon: Truck, color: 'text-purple-400' }
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
                                                    <button 
                                                        onClick={() => tx.order?.id && onNavigate?.('order-details', tx.order.id)}
                                                        disabled={!tx.order?.id}
                                                        className={`p-2 rounded-lg transition-all border border-white/10 ${tx.order?.id ? 'bg-white/5 hover:bg-gold-500 hover:text-black text-white/30 group-hover:border-gold-500/50' : 'opacity-20 cursor-not-allowed'}`}
                                                    >
                                                        <FileText size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 bg-black/40 border-t border-white/5">
                            <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/40 text-[10px] font-black rounded-xl border border-white/10 transition-all uppercase tracking-widest outline-none">
                                {isAr ? 'عرض جميع السجلات المالية' : 'View Financial Records History'}
                            </button>
                        </div>
                    </GlassCard>

                    {/* 2026 REVOLUTION: Integrated Loyalty Progress (Advanced Mathematical Logic) */}
                    {(() => {
                        const spent = Number(stats?.totalSpent || 0);
                        const tiers = [
                            { id: 'BASIC', label: t.dashboard.profile.loyalty.tiers.basic, limit: 1000, rate: '2%' },
                            { id: 'SILVER', label: t.dashboard.profile.loyalty.tiers.silver, limit: 3000, rate: '3%' },
                            { id: 'GOLD', label: t.dashboard.profile.loyalty.tiers.gold, limit: 10000, rate: '4%' },
                            { id: 'VIP', label: t.dashboard.profile.loyalty.tiers.vip, limit: 20000, rate: '5%' },
                            { id: 'PARTNER', label: t.dashboard.profile.loyalty.tiers.partner, limit: 20000, rate: '6%' },
                        ];
                        
                        const currentTierIdx = tiers.findIndex(tier => tier.id === (stats?.loyaltyTier || 'BASIC'));
                        const nextTier = currentTierIdx < tiers.length - 1 ? tiers[currentTierIdx + 1] : null;
                        
                        // v2026 Relative Progression Logic:
                        // (CurrentSpent - LevelStart) / (LevelEnd - LevelStart)
                        const startLimit = currentTierIdx === 0 ? 0 : tiers[currentTierIdx - 1].limit;
                        const endLimit = nextTier ? nextTier.limit : tiers[currentTierIdx].limit;
                        
                        const range = endLimit - startLimit;
                        const relativeSpent = spent - startLimit;
                        const segmentProgress = nextTier ? Math.max(0, Math.min((relativeSpent / range) * 100, 100)) : 100;
                        const totalProgress = ((currentTierIdx + (nextTier ? segmentProgress / 100 : 0)) / (tiers.length - 1)) * 100;
                        const remaining = nextTier ? endLimit - spent : 0;
                        
                        // v2026 6-Month Points Reset Timer
                        const resetDateRaw = stats?.pointsLastResetAt ? new Date(stats.pointsLastResetAt) : new Date();
                        const nextResetDate = new Date(resetDateRaw.getTime() + (180 * 24 * 60 * 60 * 1000));
                        const daysUntilReset = Math.max(0, Math.ceil((nextResetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                        const isResetNear = daysUntilReset <= 30;

                        return (
                            <GlassCard className="p-6 sm:p-8 relative overflow-hidden border-white/5 group bg-gradient-to-br from-gold-500/5 to-transparent">
                                <div className="absolute top-0 right-0 p-32 bg-gold-500/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none group-hover:bg-gold-500/10 transition-colors" />
                                <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 relative z-10">
                                    <div className="relative shrink-0">
                                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-black to-white/5 border border-gold-500/30 flex items-center justify-center shadow-[0_10px_40px_rgba(212,175,55,0.1)] group-hover:shadow-[0_10px_40px_rgba(212,175,55,0.2)] transition-shadow">
                                            <Crown className="text-gold-500 w-10 h-10 sm:w-12 sm:h-12" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 bg-gold-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full border-2 border-[#1A1814] uppercase tracking-tighter">
                                            {stats?.loyaltyTier || 'BASIC'}
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full text-center md:text-start">
                                        <div className="flex justify-between items-end mb-2">
                                            <h3 className="text-sm sm:text-lg font-bold text-white uppercase tracking-tighter">
                                                {t.dashboard.profile.loyalty.progression.title}
                                            </h3>
                                            {nextTier && (
                                                <span className="text-[10px] font-black text-gold-500 uppercase tracking-widest bg-gold-500/10 px-2 py-1 rounded">
                                                    NEXT: {nextTier.label}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-6">
                                            {/* Tier Roadmap Visual */}
                                            <div className="relative pt-4 pb-2">
                                                {/* Background Progress Track */}
                                                <div className="absolute top-[32px] left-[10%] right-[10%] h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${totalProgress}%` }}
                                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                                        className="h-full bg-gradient-to-r from-blue-500 via-gold-500 to-gold-400 shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                                                    />
                                                </div>
                                                
                                                {/* Tier Nodes */}
                                                <div className="relative flex justify-between">
                                                    {tiers.map((tier, idx) => {
                                                        const isCompleted = currentTierIdx > idx;
                                                        const isCurrent = currentTierIdx === idx;
                                                        
                                                        let iconColor = "text-white/20";
                                                        let bgColor = "bg-[#1A1814] border-white/10";
                                                        let labelColor = "text-white/30";
                                                        
                                                        if (isCompleted) {
                                                            iconColor = "text-gold-500";
                                                            bgColor = "bg-gold-500/10 border-gold-500/30";
                                                            labelColor = "text-gold-500/80";
                                                        } else if (isCurrent) {
                                                            iconColor = "text-white";
                                                            bgColor = "bg-gradient-to-tr from-gold-600 to-gold-400 border-white shadow-[0_0_20px_rgba(212,175,55,0.4)]";
                                                            labelColor = "text-gold-400 font-bold";
                                                        }
                                                        
                                                        return (
                                                            <div key={tier.id} className="flex flex-col items-center gap-2 z-10 w-[20%]">
                                                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${bgColor}`}>
                                                                    {isCurrent ? <Star size={16} className={iconColor} fill="currentColor" /> : <ShieldCheck size={14} className={iconColor} />}
                                                                </div>
                                                                <div className="flex flex-col items-center text-center">
                                                                    <span className={`text-[8px] sm:text-[9px] uppercase tracking-widest ${labelColor}`}>
                                                                        {tier.id}
                                                                    </span>
                                                                    <span className="text-[7px] text-white/40 font-bold mt-0.5">
                                                                        {tier.rate}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-white/40 bg-white/5 p-3 rounded-xl border border-white/5">
                                                <span className="flex flex-col gap-1">
                                                    <span className="text-white/30 text-[8px]">{isAr ? 'الإنفاق المعتمد' : 'APPROVED SPENT'}</span>
                                                    <span className="flex items-center gap-1.5 text-white">
                                                        <TrendingUp size={12} className="text-gold-500" /> 
                                                        {spent.toLocaleString()} <span className="text-[8px] font-medium opacity-60">AED</span>
                                                    </span>
                                                </span>
                                                {nextTier && (
                                                    <span className="flex flex-col items-end gap-1">
                                                        <span className="text-white/30 text-[8px]">{t.dashboard.profile.loyalty.progression.goal}</span>
                                                        <span className="text-gold-500 flex items-center gap-1">
                                                            {endLimit.toLocaleString()} <ChevronRight size={12} />
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                                                <p className="text-[9px] text-white/40 uppercase font-black tracking-tighter flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                                    {nextTier 
                                                        ? t.dashboard.profile.loyalty.progression.almostThere.replace('{amount}', Math.max(0, remaining).toLocaleString())
                                                        : (isAr ? 'لقد وصلت إلى أعلى مستوى كشريك! 👑' : 'YOU HAVE REACHED THE MAXIMUM PARTNER TIER! 👑')
                                                    }
                                                </p>
                                                {nextTier && (
                                                    <div className="flex items-center gap-2 bg-gold-500/10 border border-gold-500/20 px-3 py-1.5 rounded-lg shadow-inner">
                                                        <Star size={12} className="text-gold-500" />
                                                        <span className="text-[9px] font-black text-gold-500/80 uppercase tracking-widest">
                                                            {t.dashboard.profile.loyalty.progression.nextLvlPerks}: {nextTier.rate}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* v2026 Points Reset Timer */}
                                            <div className={`mt-4 p-3 sm:p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${isResetNear ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${isResetNear ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/40'}`}>
                                                        <Clock size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white">
                                                            {wd.pointsResetLabel}
                                                        </span>
                                                        <span className={`text-[9px] sm:text-[10px] font-bold mt-1 ${isResetNear ? 'text-orange-400/80' : 'text-white/40'}`}>
                                                            {wd.pointsResetNote}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isResetNear ? 'text-orange-400' : 'text-white/40'}`}>
                                                        {isAr ? 'الوقت المتبقي' : 'Time Remaining'}
                                                    </span>
                                                    <span className={`text-lg sm:text-xl font-black ${isResetNear ? 'text-orange-500' : 'text-white'} leading-none mt-1`}>
                                                        {daysUntilReset} <span className="text-[10px] font-medium opacity-60 uppercase">{isAr ? 'يوم' : 'Days'}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        );
                    })()}

                    {/* NEW: Withdrawal & Payout Management Section */}
                    <div className="space-y-6 pt-2">
                        <GlassCard className="p-6 sm:p-8 border-gold-500/10 bg-gradient-to-br from-gold-500/[0.03] to-transparent relative overflow-hidden">
                            {/* 2026 Premium Lock Overlay */}
                            {stats?.withdrawalsFrozen && (
                                <div className="absolute inset-0 z-30 backdrop-blur-md bg-black/60 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                                    <motion.div 
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="w-20 h-20 bg-red-500/20 rounded-[2rem] flex items-center justify-center border border-red-500/30 mb-6 shadow-2xl shadow-red-500/20"
                                    >
                                        <Lock size={40} className="text-red-500" />
                                    </motion.div>
                                    <h4 className="text-xl font-black text-white uppercase tracking-widest mb-3">
                                        {isAr ? 'عمليات السحب مقيدة' : 'Withdrawals Restricted'}
                                    </h4>
                                    <p className="text-white/60 text-xs max-w-xs leading-relaxed font-medium mb-6">
                                        {isAr 
                                            ? `تم تجميد عمليات السحب لهذا الحساب مؤقتاً لأسباب أمنية أو إدارية. السبب: ${stats.withdrawalFreezeNote || 'مراجعة أمنية جارية'}`
                                            : `Withdrawal capabilities are currently restricted for this account. Reason: ${stats.withdrawalFreezeNote || 'Security Review in Progress'}`}
                                    </p>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-[9px] font-black text-white/40 uppercase tracking-widest">
                                        <ShieldAlert size={12} className="text-red-500" />
                                        {isAr ? 'يرجى مراجعة الدعم الفني لمزيد من المعلومات' : 'Please contact support for more information'}
                                    </div>
                                </div>
                            )}

                            <div className={`transition-all duration-700 ${stats?.withdrawalsFrozen ? 'filter blur-xl grayscale opacity-30 select-none pointer-events-none' : ''}`}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                        <ArrowRightLeft className="text-gold-500" size={20} />
                                        {isAr ? 'سحب المبالغ والمكافآت' : 'Withdrawal & Rewards Payout'}
                                    </h3>
                                    <p className="text-white/40 text-xs mt-1">
                                        {isAr ? 'قم بسحب أرباحك إلى حسابك البنكي أو عبر Stripe' : 'Withdraw your earnings to your bank account or via Stripe.'}
                                    </p>
                                </div>
                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
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
                                        Stripe Connect
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmitWithdrawal} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[2px] block">{isAr ? 'مبلغ السحب (AED)' : 'Withdrawal Amount (AED)'}</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <Wallet size={18} className="text-gold-500/50 group-focus-within:text-gold-500 transition-colors" />
                                        </div>
                                        <input 
                                            type="number"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            placeholder="0.00"
                                            disabled={!canWithdraw || stats?.withdrawalsFrozen}
                                            className={`w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xl font-bold text-white outline-none focus:border-gold-500/50 transition-all ${!canWithdraw ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-white/30">{isAr ? 'الرصيد المتاح:' : 'Available Balance:'} <span className="text-emerald-400 font-black">{isLoading ? '…' : `${(stats?.customerBalance ?? 0).toLocaleString()} AED`}</span></span>
                                        <span className="text-white/30">{isAr ? 'الحد الأدنى:' : 'Min:'} <span className="text-white/80">{withdrawalLimits.min} AED</span></span>
                                    </div>
                                    {!canWithdraw && !isLoading && !stats?.withdrawalsFrozen && (
                                        <p className="text-[10px] text-white/40">
                                            {isAr
                                                ? `الحد الأدنى للسحب ${withdrawalLimits.min} AED — رصيدك الحالي غير كافٍ`
                                                : `Minimum withdrawal is ${withdrawalLimits.min} AED — your balance is insufficient`}
                                        </p>
                                    )}
                                    
                                    {withdrawError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-bold animate-shake">
                                            <AlertCircle size={14} /> {withdrawError}
                                        </div>
                                    )}
                                    {withdrawSuccess && (
                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-[10px] font-bold animate-bounce">
                                            <CheckCircle2 size={14} /> {isAr ? 'تم تقديم طلب السحب بنجاح!' : 'Withdrawal request submitted successfully!'}
                                        </div>
                                    )}
                                    
                                    <button 
                                        type="submit"
                                        disabled={isSubmitting || !withdrawAmount || stats?.withdrawalsFrozen || !canWithdraw}
                                        className={`w-full py-4 font-black uppercase tracking-[3px] text-xs rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 mt-4 ${
                                            stats?.withdrawalsFrozen || !canWithdraw
                                            ? 'bg-white/5 text-white/20 border border-white/10 cursor-not-allowed opacity-50' 
                                            : 'bg-gold-500 hover:bg-gold-400 text-black shadow-gold-500/10'
                                        }`}
                                    >
                                        {isSubmitting ? <RotateCcw size={18} className="animate-spin" /> : <ArrowUpRight size={18} />}
                                        {stats?.withdrawalsFrozen 
                                            ? (isAr ? 'السحب مجمد حالياً' : 'Withdrawals Frozen') 
                                            : (isAr ? 'تأكيد طلب السحب' : 'Confirm Withdrawal')
                                        }
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <PayoutMethodPanel
                                        mode={payoutMethod}
                                        isAr={isAr}
                                        bankDetails={bankDetails}
                                        stripeOnboarded={Boolean(bankDetails?.stripeOnboarded || stats?.stripeOnboarded)}
                                        stripeDisplay={stripeConnectInfo}
                                        isOnboarding={isOnboarding}
                                        bankLinkSuccess={bankLinkSuccess}
                                        onStripeConnect={handleStripeConnect}
                                        onEditBank={() => setShowBankForm(true)}
                                    />
                                </div>
                            </form>
                        </div>
                    </GlassCard>

                        {/* Withdrawal Request History */}
                        <GlassCard className="p-0 overflow-hidden border-white/5">
                            <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                    <Clock className="text-gold-500/50" size={18} />
                                    {isAr ? 'سجل عمليات السحب' : 'Withdrawal History'}
                                </h3>
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{withdrawalRequests.length} {isAr ? 'عمليات' : 'Total'}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-center border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.01] text-[9px] text-white/30 uppercase tracking-widest font-black">
                                            <th className="px-4 py-4">{isAr ? 'المبلغ' : 'Amount'}</th>
                                            <th className="px-4 py-4">{isAr ? 'الطريقة' : 'Method'}</th>
                                            <th className="px-4 py-4">{isAr ? 'الحالة' : 'Status'}</th>
                                            <th className="px-4 py-4">{isAr ? 'التاريخ' : 'Date'}</th>
                                            <th className="px-4 py-4">{isAr ? 'ملاحظات الإدارة' : 'Admin Notes'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {withdrawalRequests.length === 0 ? (
                                            <tr><td colSpan={5} className="p-8 text-white/20 text-[10px] font-black italic">{isAr ? 'لا توجد طلبات سحب سابقة' : 'No previous withdrawal requests found'}</td></tr>
                                        ) : (
                                            withdrawalRequests.map(req => (
                                                <tr key={req.id} className="hover:bg-white/[0.01] transition-colors">
                                                    <td className="px-4 py-4 font-bold text-white">{Number(req.amount).toLocaleString()} AED</td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-[10px] font-black text-white/40 uppercase bg-white/5 px-2 py-1 rounded">
                                                            {req.payoutMethod === 'STRIPE' ? 'Stripe' : (isAr ? 'بنك' : 'Bank')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${getStatusStyle(req.status)}`}>
                                                            {getStatusLabel(req.status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-white/30 text-[10px] font-mono">
                                                        {new Date(req.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-4 text-[10px] text-white/40 italic">
                                                        {req.adminNotes || '---'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    </div>
                </div>
                    
                {/* 4b. Sidebar (Real Notifications & Referrals) */}
                <div className="space-y-6">
                    
                    {/* Real Notifications Section */}
                    <GlassCard className="p-6 border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <h3 className="text-[10px] font-black text-white/80 uppercase tracking-widest">{isAr ? 'أحدث التنبيهات' : 'Activity Feed'}</h3>
                            </div>
                            <button 
                                onClick={() => onNavigate?.('notifications')}
                                className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-[9px] font-black text-white/30 hover:text-white hover:border-gold-500/30 transition-all active:scale-95"
                            >
                                VIEW ALL
                            </button>
                        </div>
                        <div className="space-y-5">
                            {notifications?.length > 0 ? (
                                notifications.slice(0, 3).map(notif => (
                                    <div key={notif.id} className="flex gap-3 items-start group relative">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-white/30 group-hover:bg-gold-500/10 group-hover:text-gold-500 transition-all border border-white/5 group-hover:border-gold-500/20">
                                            {notif.type === 'PAYMENT' ? <Wallet size={14} /> : <AlertCircle size={14} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] text-white/70 leading-relaxed font-medium line-clamp-2">
                                                {isAr ? notif.messageAr : notif.messageEn}
                                            </p>
                                            <span className="block text-[9px] text-white/20 mt-1 font-black uppercase tracking-tighter">
                                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • JUST NOW
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <div className="text-white/5 mb-2 flex justify-center"><Wallet size={32} /></div>
                                    <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">{isAr ? 'لا توجد تنبيهات' : 'Quiet for now'}</p>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* PREMIUM Referral Link Card */}
                    <GlassCard className="p-6 border-blue-500/20 relative group bg-gradient-to-br from-blue-600/[0.08] via-transparent to-transparent overflow-hidden">
                        <div className="absolute top-0 right-0 p-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-colors" />
                        
                        <div className="flex items-center justify-between gap-3 mb-5 relative z-10 w-full">
                                        <div className="flex flex-col">
                                            <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                <span className="w-1 h-4 bg-gold-500 rounded-full" />
                                                {t.dashboard.profile.loyalty.referral.title}
                                            </h3>
                                            <div className="mt-2 flex items-center gap-3">
                                                <div className="px-3 py-1 bg-gold-500/10 border border-gold-500/20 rounded-full">
                                                    <span className="text-[10px] font-black text-gold-500 uppercase tracking-tighter">
                                                        {t.dashboard.profile.loyalty.referral.totalLabel} {stats?.referralCount || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onNavigate?.('rewards')}
                                            title={isAr ? 'الانتقال إلى مركز الإحالات' : 'Go to Referral Center'}
                                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all active:scale-90"
                                        >
                                            <ArrowUpRight size={16} />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-4 relative z-10">
                                        <div className="relative group/input">
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/50 to-purple-500/50 rounded-xl opacity-20 group-hover/input:opacity-40 transition-opacity blur" />
                                            <div className="relative flex items-center bg-black/60 border border-white/10 rounded-xl overflow-hidden">
                                                 <input 
                                                    readOnly 
                                                    value={stats?.referralCode ? `${window.location.origin}/register?ref=${stats.referralCode}` : '---'} 
                                                    className="flex-1 bg-transparent px-4 py-3.5 text-[10px] font-mono font-bold text-blue-400 outline-none truncate"
                                                />
                                                <button 
                                                    onClick={handleCopyReferral}
                                                    className="p-3.5 bg-white/5 hover:bg-white/10 text-white/30 hover:text-blue-400 transition-all border-l border-white/10"
                                                    title={isAr ? 'نسخ الرابط' : 'Copy link'}
                                                >
                                                    <AnimatePresence mode="wait">
                                                        {copied ? (
                                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="check">
                                                                <CheckCircle2 size={16} className="text-blue-400" />
                                                            </motion.div>
                                                        ) : (
                                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="copy">
                                                                <Copy size={16} />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={handleCopyReferral}
                                            className={`w-full py-3.5 rounded-xl transition-all shadow-xl font-black text-[10px] uppercase tracking-[2px] relative overflow-hidden group/btn flex items-center justify-center gap-2 ${copied ? 'bg-emerald-500 text-black shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 hover:-translate-y-0.5'}`}
                                        >
                                            {copied ? <CheckCircle2 size={16} /> : <Share2 size={16} className="group-hover/btn:rotate-12 transition-transform" />}
                                            {copied ? (isAr ? 'تم النسخ!' : 'LINK COPIED!') : (isAr ? 'دعوة صديق الآن' : 'INVITE PARTNER')}
                                        </button>
                                        
                                        <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 space-y-2">
                                            <p className="text-[10px] text-white/50 leading-relaxed font-bold">
                                                {t.dashboard.profile.loyalty.referral.commissionNote}
                                            </p>
                                            <p className="text-[9px] text-blue-400/80 leading-relaxed font-bold flex items-center gap-1.5">
                                                <Clock size={10} />
                                                {t.dashboard.profile.loyalty.referral.windowNote}
                                            </p>
                                        </div>

                            {/* Enhanced Referral Workflow Steps - Redesigned with Connectors */}
                            <div className="relative pt-6 pb-2">
                                {/* Connector Line (Background) */}
                                <div className="absolute top-[38px] left-[15%] right-[15%] h-[2px] bg-white/5 z-0 hidden sm:block overflow-hidden rounded-full">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: stats?.referralCount ? (stats.referralCount > 5 ? '100%' : '50%') : '0%' }}
                                        transition={{ duration: 1.5, delay: 0.5 }}
                                        className="h-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                                    />
                                </div>

                                <div className="relative z-10 flex justify-between items-start">
                                    {[
                                        { icon: Share2, lab: isAr ? 'شارك الرابط' : 'Share Link', act: true },
                                        { icon: UserPlus, lab: isAr ? 'انضمام صديق' : 'Friend Joined', act: (stats?.referralCount || 0) > 0 },
                                        { icon: Star, lab: isAr ? 'احصد مكافأتك' : 'Get Rewards', act: (stats?.referralCount || 0) > 5 }
                                    ].map((step, idx) => (
                                        <div key={idx} className="flex flex-col items-center gap-3 w-1/3 relative">
                                            {/* Step Icon Container */}
                                            <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 border-2 ${step.act ? 'bg-blue-600 border-blue-400 text-white shadow-[0_8px_30px_rgba(37,99,235,0.4)] scale-110' : 'bg-[#151310] border-white/5 text-white/20'}`}>
                                                <step.icon size={20} className={step.act ? 'animate-pulse' : ''} />
                                                
                                                {/* Active Checkmark */}
                                                {step.act && (
                                                    <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-[#1A1814]">
                                                        <CheckCircle2 size={10} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Label */}
                                            <div className="text-center px-1">
                                                <span className={`text-[9px] font-black uppercase tracking-tight leading-none block ${step.act ? 'text-blue-400' : 'text-white/20'}`}>
                                                    {step.lab}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* PREMIUM Wallet Quick Panel */}
                    <GlassCard className="p-6 border-gold-500/20 bg-gradient-to-br from-gold-500/[0.04] via-transparent to-transparent group">
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gold-500/10 rounded-lg border border-gold-400/20 text-gold-500 group-hover:scale-110 transition-transform">
                                    <Wallet size={16} />
                                </div>
                                <h3 className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{isAr ? 'العمليات السريعة' : 'Instant Actions'}</h3>
                            </div>
                            <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center text-white/20 hover:text-white transition-colors cursor-pointer">
                                <ArrowUpRight size={14} />
                            </div>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">{wd.totalRewardsEarned}</p>
                                    <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                                        <Star size={10} />
                                        <span className="text-[10px] font-black">{stats?.loyaltyPoints || 0} pts</span>
                                    </div>
                                </div>
                                <h2 className="text-2xl font-black text-white tracking-tighter">
                                    {Number(stats?.totalRewardsEarned ?? 0).toLocaleString()} 
                                    <span className="text-xs text-gold-500/60 font-medium ml-2">AED</span>
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5">
                                {/* Redundant Buttons Removed as per user request */}
                                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
                                        {isAr ? 'إدارة رصيدك تتم من خلال خيارات السحب المخصصة' : 'Manage your balance through the dedicated payout options'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Security Badge */}
                            <div className="flex items-center justify-center gap-2 mt-2 opacity-30 group-hover:opacity-60 transition-opacity">
                                <ShieldCheck size={10} className="text-emerald-500" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-white">{isAr ? 'نظام تشفير فائق السرعة' : 'AES-256 Quantum Shield Active'}</span>
                            </div>
                        </div>
                    </GlassCard>
                </div>

            </div>

            {/* NEW: Bank Details Modal Overlay */}
            <AnimatePresence>
                <BankDetailsModal 
                    isOpen={showBankForm} 
                    onClose={() => setShowBankForm(false)}
                    form={bankForm}
                    onChange={setBankForm}
                    onSave={handleSaveBankDetails}
                    isLoading={isSavingBank}
                    isAr={isAr}
                    isUpdate={Boolean(bankDetails?.isLinked ?? bankDetails?.iban)}
                    maskedExistingIban={bankDetails?.maskedIban}
                />
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
                                    ? 'تم تفعيل مدفوعات Stripe الفورية لحسابك. يمكنك الآن استلام أرباحك مباشرة وبكل سهولة.' 
                                    : 'Stripe instant payouts are now enabled for your account. You can now receive your earnings directly and easily.'}
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
