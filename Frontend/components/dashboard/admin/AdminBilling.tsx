import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense, startTransition } from 'react';
import { motion } from 'framer-motion';
import { 
    FileText,
    Download, 
    ArrowUpRight, 
    ArrowDownLeft, 
    DollarSign, 
    TrendingUp, 
    CreditCard, 
    Save, 
    Lock, 
    Settings, 
    AlertOctagon, 
    CheckCircle2, 
    Percent, 
    Filter, 
    Wallet, 
    RefreshCw, 
    Send,
    Activity,
    Calendar,
    ChevronRight,
    ExternalLink,
    Users,
    ArrowRight,
    ShieldCheck,
    ClipboardCheck,
    ArrowRightLeft,
    Crown,
    ChevronDown,
    Package,
    User,
    X,
    Store,
    Receipt,
    Scale,
    BarChart3,
    Shield,
    RotateCcw,
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { BarChart } from '../../ui/Charts';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ManualPayoutModal } from './ManualPayoutModal';
import { AdminWithdrawalQueue } from './AdminWithdrawalQueue';
import { Landmark, History } from 'lucide-react';
import { FinancialToast } from '../../ui/FinancialToast';
import TransactionTypeFilter from './TransactionTypeFilter';
import { BlurredSection } from './BlurredSection';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { FinancialFeedRow } from './FinancialFeedRow';
import type { UnifiedFinancialEvent } from '../../../stores/useAdminStore';
import { AdminSearchInput } from './AdminSearchInput';
import { OverviewKpiSection } from './OverviewKpiSection';

const OrderFinancialDrawer = lazy(() =>
  import('./OrderFinancialDrawer').then((m) => ({ default: m.OrderFinancialDrawer })),
);
const AdminSellerAccounts = lazy(() =>
  import('./AdminSellerAccounts').then((m) => ({ default: m.AdminSellerAccounts })),
);
const AdminCustomerAccounts = lazy(() =>
  import('./AdminCustomerAccounts').then((m) => ({ default: m.AdminCustomerAccounts })),
);
const AdminFinancialRefunds = lazy(() =>
  import('./AdminFinancialRefunds').then((m) => ({ default: m.AdminFinancialRefunds })),
);
const AdminSettlement = lazy(() =>
  import('./AdminSettlement').then((m) => ({ default: m.AdminSettlement })),
);
const AdminFinancialPenalties = lazy(() =>
  import('./AdminFinancialPenalties').then((m) => ({ default: m.AdminFinancialPenalties })),
);
const AdminFinancialReports = lazy(() =>
  import('./AdminFinancialReports').then((m) => ({ default: m.AdminFinancialReports })),
);

type BillingTab =
  | 'OVERVIEW'
  | 'CUSTOMER_ACCOUNTS'
  | 'SELLER_ACCOUNTS'
  | 'CUSTOMER_WITHDRAWALS'
  | 'MERCHANT_WITHDRAWALS'
  | 'TRANSACTIONS'
  | 'REFUNDS'
  | 'SETTLEMENT'
  | 'PENALTIES'
  | 'REPORTS';

interface AdminBillingProps {
    onNavigate?: (path: string, id: any) => void;
}

export const AdminBilling: React.FC<AdminBillingProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const isSectionBlurred = useAdminPermissionsStore(s => s.isSectionBlurred);
    const canViewTab = useAdminPermissionsStore(s => s.canViewTab);

    // --- Selective store subscriptions to prevent flicker/re-renders ---
    const currentAdmin = useAdminStore(s => s.currentAdmin);
    const commissionRate = useAdminStore(s => s.commissionRate);
    const setCommissionRate = useAdminStore(s => s.setCommissionRate);
    
    // Legacy Stats (Overview Tab)
    const adminFinancials = useAdminStore(s => s.adminFinancials);
    const isLoadingFinancials = useAdminStore(s => s.isLoadingFinancials);
    const financialFilters = useAdminStore(s => s.financialFilters);
    const setFinancialFilters = useAdminStore(s => s.setFinancialFilters);
    const fetchAdminFinancials = useAdminStore(s => s.fetchAdminFinancials);
    const subscribeToFinancials = useAdminStore(s => s.subscribeToFinancials);
    const unsubscribeFromFinancials = useAdminStore(s => s.unsubscribeFromFinancials);
    
    // Unified Financial Feed (Transactions Tab)
    const financialFeed = useAdminStore(s => s.financialFeed);
    const isFeedLoading = useAdminStore(s => s.isFeedLoading);
    const feedHasMore = useAdminStore(s => s.feedHasMore);
    const feedFilters = useAdminStore(s => s.feedFilters);
    const fetchFinancialFeed = useAdminStore(s => s.fetchFinancialFeed);
    const setFeedFilters = useAdminStore(s => s.setFeedFilters);
    const markFeedItemAsSeen = useAdminStore(s => s.markFeedItemAsSeen);
    const subscribeToFinancialFeed = useAdminStore(s => s.subscribeToFinancialFeed);
    const unsubscribeFromFinancialFeed = useAdminStore(s => s.unsubscribeFromFinancialFeed);

    const exportFinancialCSV = useAdminStore(s => s.exportFinancialCSV);
    const exportFinancialReport = useAdminStore(s => s.exportFinancialReport);
    const canPerformBilling = useAdminPermissionsStore(s => s.canPerform);
    const canExportFinancials =
      canPerformBilling('billing', 'EXPORT_FINANCIALS') ||
      canPerformBilling('billing', 'EXPORT_REPORTS') ||
      currentAdmin?.role === 'SUPER_ADMIN';
    const sendManualPayout = useAdminStore(s => s.sendManualPayout);
    const withdrawalLimits = useAdminStore(s => s.withdrawalLimits);
    const updateWithdrawalLimits = useAdminStore(s => s.updateWithdrawalLimits);
    const pendingWithdrawals = useAdminStore(s => s.pendingWithdrawals);
    const processWithdrawal = useAdminStore(s => s.processWithdrawal);
    const fetchWithdrawals = useAdminStore(s => s.fetchWithdrawals);
    const subscribeToWithdrawals = useAdminStore(s => s.subscribeToWithdrawals);
    const unsubscribeFromWithdrawals = useAdminStore(s => s.unsubscribeFromWithdrawals);
    const isLoadingWithdrawals = useAdminStore(s => s.isLoadingWithdrawals);
    const verifyBankDetails = useAdminStore(s => s.verifyBankDetails);
    const fetchCustomerAccounts = useAdminStore(s => s.fetchCustomerAccounts);
    const fetchSellerAccounts = useAdminStore(s => s.fetchSellerAccounts);
    const fetchFinancialRefunds = useAdminStore(s => s.fetchFinancialRefunds);
    const fetchFinancialPenalties = useAdminStore(s => s.fetchFinancialPenalties);

    const [tempRate, setTempRate] = useState(commissionRate);
    const [limits, setLimits] = useState(withdrawalLimits);
    const [activeTab, setActiveTab] = useState<BillingTab>('OVERVIEW');
    const [selectedOrderIdForTimeline, setSelectedOrderIdForTimeline] = useState<string | null>(null);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showBankModal, setShowBankModal] = useState(false);
    const [selectedWithdrawalReq, setSelectedWithdrawalReq] = useState<any>(null);
    const [processingRejectId, setProcessingRejectId] = useState<string | null>(null);
    const [isVerifyingBank, setIsVerifyingBank] = useState(false);
    const [expandedFeedIds, setExpandedFeedIds] = useState<Set<string>>(new Set());
    const [ledgerSearchInput, setLedgerSearchInput] = useState(feedFilters.search || '');
    
    const observerTarget = React.useRef(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && feedHasMore && !isFeedLoading && activeTab === 'TRANSACTIONS') {
                    fetchFinancialFeed();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [feedHasMore, isFeedLoading, activeTab]);
    
    const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
    const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false);
    const typeDropdownRef = React.useRef<HTMLDivElement>(null);
    const roleDropdownRef = React.useRef<HTMLDivElement>(null);

    const isHighLevelAdmin = currentAdmin?.role === 'SUPER_ADMIN' || currentAdmin?.role === 'ADMIN';

    useEffect(() => {
        if (adminFinancials === null) {
            fetchAdminFinancials();
        }
        subscribeToFinancials();
        subscribeToFinancialFeed();
        subscribeToWithdrawals();

        const handleClickOutside = (event: MouseEvent) => {
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
                setIsTypeFilterOpen(false);
            }
            if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
                setIsRoleFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            unsubscribeFromFinancials();
            unsubscribeFromFinancialFeed();
            unsubscribeFromWithdrawals();
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (activeTab === 'TRANSACTIONS' && financialFeed.length === 0 && !isFeedLoading) {
            fetchFinancialFeed(true);
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'MERCHANT_WITHDRAWALS') {
            setFinancialFilters({ role: 'VENDOR' });
        } else if (activeTab === 'CUSTOMER_WITHDRAWALS') {
            setFinancialFilters({ role: 'CUSTOMER' });
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'MERCHANT_WITHDRAWALS' || activeTab === 'CUSTOMER_WITHDRAWALS') {
            fetchWithdrawals(true);
        }
    }, [activeTab, financialFilters.withdrawalStatus, financialFilters.role]);

    useEffect(() => {
        if (activeTab === 'CUSTOMER_ACCOUNTS') fetchCustomerAccounts('');
        else if (activeTab === 'SELLER_ACCOUNTS') fetchSellerAccounts('');
        else if (activeTab === 'REFUNDS') fetchFinancialRefunds('');
        else if (activeTab === 'PENALTIES') fetchFinancialPenalties('');
    }, [activeTab, fetchCustomerAccounts, fetchSellerAccounts, fetchFinancialRefunds, fetchFinancialPenalties]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (ledgerSearchInput !== (feedFilters.search || '')) {
                setFeedFilters({ search: ledgerSearchInput });
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [ledgerSearchInput]);

    useEffect(() => {
        setLedgerSearchInput(feedFilters.search || '');
    }, [feedFilters.search]);

    const allTabsConfig = useMemo(() => [
        { id: 'OVERVIEW' as BillingTab, label: t.admin.billing.panels.overview, icon: Activity, permissionKey: 'OVERVIEW', group: 'platform' },
        { id: 'CUSTOMER_ACCOUNTS' as BillingTab, label: t.admin.billing.panels.customerAccounts, icon: User, permissionKey: 'CUSTOMER_ACCOUNTS', group: 'customer' },
        { id: 'SELLER_ACCOUNTS' as BillingTab, label: t.admin.billing.panels.sellerAccounts, icon: Store, permissionKey: 'SELLER_ACCOUNTS', group: 'merchant' },
        { id: 'CUSTOMER_WITHDRAWALS' as BillingTab, label: t.admin.billing.panels.customerWithdrawals, icon: ArrowRightLeft, permissionKey: 'CUSTOMER_WITHDRAWALS', group: 'customer' },
        { id: 'MERCHANT_WITHDRAWALS' as BillingTab, label: t.admin.billing.panels.merchantWithdrawals, icon: ArrowRightLeft, permissionKey: 'MERCHANT_WITHDRAWALS', group: 'merchant' },
        { id: 'TRANSACTIONS' as BillingTab, label: t.admin.billing.panels.ledger, icon: ClipboardCheck, permissionKey: 'TRANSACTIONS', group: 'platform' },
        { id: 'REFUNDS' as BillingTab, label: t.admin.billing.panels.refunds, icon: RotateCcw, permissionKey: 'REFUNDS', group: 'platform' },
        { id: 'SETTLEMENT' as BillingTab, label: t.admin.billing.panels.settlement, icon: Scale, permissionKey: 'SETTLEMENT', group: 'platform' },
        { id: 'PENALTIES' as BillingTab, label: t.admin.billing.panels.penalties, icon: AlertOctagon, permissionKey: 'PENALTIES', group: 'platform' },
        { id: 'REPORTS' as BillingTab, label: t.admin.billing.panels.reports, icon: BarChart3, permissionKey: 'REPORTS', group: 'platform' },
    ], [t]);

    const visibleTabs = useMemo(() => {
        return allTabsConfig.map(tab => ({
            ...tab,
            isLocked: !canViewTab('BILLING', tab.permissionKey)
        }));
    }, [allTabsConfig, canViewTab]);

    const tabGroups = useMemo(() => ([
        { key: 'merchant', label: t.admin.billing.tabGroups.merchant, tabs: visibleTabs.filter(t => t.group === 'merchant') },
        { key: 'customer', label: t.admin.billing.tabGroups.customer, tabs: visibleTabs.filter(t => t.group === 'customer') },
        { key: 'platform', label: t.admin.billing.tabGroups.platform, tabs: visibleTabs.filter(t => t.group === 'platform') },
    ]), [visibleTabs, t]);

    // Auto-switch if current tab is restricted
    useEffect(() => {
        const firstAllowed = visibleTabs.find(t => !t.isLocked);
        if (firstAllowed && visibleTabs.find(t => t.id === activeTab)?.isLocked) {
            setActiveTab(firstAllowed.id);
        }
    }, [visibleTabs, activeTab]);

    const kpis = adminFinancials?.kpis || {
        totalSales: 0, netCommission: 0, netPlatformPosition: 0,
        shippingCollected: 0, shippingProfit: 0, referralPaidOut: 0, referralEarnings: 0,
        referralCount: 0, loyaltyCashbackPaid: 0, pendingWithdrawals: 0, pendingWithdrawalsCount: 0,
        frozenFunds: 0, opsLast24h: 0, todayTransactionsCount: 0,
        totalRefunds: 0, gatewayFees: 0, pendingLiabilities: 0,
        loyaltyPointsOutstanding: 0, failedUnsettledCount: 0, failedUnsettledAmount: 0, reconciliationDelta: 0,
        grossCommission: 0, totalReleasedToMerchants: 0, completedWithdrawals: 0, completedWithdrawalsCount: 0,
        financialDisputesCount: 0, financialDisputesAmount: 0, totalPenalties: 0, dailyTxCount: 0, monthlyTxCount: 0,
    };

    const salesTrendFromApi: { date: string; grossSales: number }[] = adminFinancials?.salesTrend || [];
    const topSpenders: any[] = adminFinancials?.topSpenders || [];
    const topEarners: any[] = adminFinancials?.topEarners || [];

    const salesTrendData = useMemo(() => {
        return salesTrendFromApi.slice(-14).map((point) => ({
            label: new Date(point.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                month: 'short',
                day: 'numeric',
            }),
            value: point.grossSales,
        }));
    }, [salesTrendFromApi, isAr]);

    const liquidityKpis = useMemo(() => [
        { label: t.admin.billing.kpis.withdrawalQueue, value: `${(kpis.pendingWithdrawals || 0).toLocaleString()} AED`, subValue: `${kpis.pendingWithdrawalsCount || 0} ${t.admin.billing.kpis.pendingRequests}`, icon: RefreshCw, color: '#f59e0b' },
        { label: t.admin.billing.kpis.userLiabilities, value: `${(kpis.pendingLiabilities || 0).toLocaleString()} AED`, subValue: `${t.admin.billing.kpis.netPlatformProfitLabel}: ${(kpis.netPlatformPosition || 0).toLocaleString()} AED`, icon: AlertOctagon, color: '#eab308' },
        { label: t.admin.billing.kpis.totalReleasedToMerchants, value: `${(kpis.totalReleasedToMerchants || 0).toLocaleString()} AED`, subValue: t.admin.billing.kpis.totalReleasedSub, icon: ArrowUpRight, color: '#22c55e' },
        { label: t.admin.billing.kpis.completedWithdrawals, value: `${(kpis.completedWithdrawals || 0).toLocaleString()} AED`, subValue: `${kpis.completedWithdrawalsCount || 0} ${t.admin.billing.kpis.completedWithdrawalsSub}`, icon: CheckCircle2, color: '#10b981' },
    ], [kpis, t]);

    const platformRevenueKpis = useMemo(() => [
        { label: t.admin.billing.kpis.platformCommissions || 'Platform Commissions', value: `${((kpis.platformCommissions ?? kpis.grossCommission) || 0).toLocaleString()} AED`, icon: Percent, color: '#d4af37' },
        { label: t.admin.billing.kpis.loyaltyReferralExpenses || 'Loyalty & Referral Expenses', value: `${(kpis.loyaltyReferralExpenses ?? ((kpis.loyaltyCashbackPaid || 0) + (kpis.referralPaidOut || 0))).toLocaleString()} AED`, icon: Users, color: '#a855f7' },
        { label: t.admin.billing.kpis.commissionRefunds || 'Commission Refunds', value: `${(kpis.commissionRefunds || 0).toLocaleString()} AED`, icon: ArrowDownLeft, color: '#f87171' },
        { label: t.admin.billing.kpis.netPlatformRevenue || 'Net Platform Revenue', value: `${((kpis.netPlatformRevenue ?? kpis.netPlatformPosition) || 0).toLocaleString()} AED`, icon: ShieldCheck, color: '#22d3ee' },
    ], [kpis, t]);

    const revenueKpis = useMemo(() => [
        { label: t.admin.billing.kpis.logisticsRevenue, value: `${(kpis.shippingCollected ?? kpis.shippingProfit ?? 0).toLocaleString()} AED`, subValue: t.admin.billing.kpis.logisticsSub, icon: Activity, color: '#10b981' },
        { label: t.admin.billing.kpis.referralEcosystem, value: `${(kpis.referralPaidOut ?? kpis.referralEarnings ?? 0).toLocaleString()} AED`, subValue: `${kpis.referralCount || 0} ${t.admin.billing.kpis.activeReferrals} · ${t.admin.billing.kpis.referralSub}`, icon: Users, color: '#8b5cf6' },
        { label: t.admin.billing.kpis.loyaltyCashback, value: `${(kpis.loyaltyCashbackPaid || 0).toLocaleString()} AED`, subValue: t.admin.billing.kpis.loyaltySub, icon: TrendingUp, color: '#a855f7' },
        { label: t.admin.billing.kpis.grossCommission, value: `${(kpis.grossCommission || 0).toLocaleString()} AED`, subValue: t.admin.billing.kpis.grossCommissionSub, icon: Percent, color: '#d4af37' },
        { label: t.admin.billing.kpis.gatewayFees, value: `${(kpis.gatewayFees || 0).toLocaleString()} AED`, icon: CreditCard, color: '#6366f1' },
    ], [kpis, t]);

    const riskKpis = useMemo(() => [
        { label: t.admin.billing.kpis.totalRefunds, value: `${(kpis.totalRefunds || 0).toLocaleString()} AED`, icon: ArrowDownLeft, color: '#f87171' },
        { label: t.admin.billing.kpis.failedUnsettled, value: String(kpis.failedUnsettledCount ?? 0), subValue: `${(kpis.failedUnsettledAmount ?? 0).toLocaleString()} AED · ${t.admin.billing.kpis.failedUnsettledSub}`, icon: RefreshCw, color: '#64748b' },
        { label: t.admin.billing.kpis.financialDisputes, value: String(kpis.financialDisputesCount ?? 0), subValue: `${(kpis.financialDisputesAmount ?? 0).toLocaleString()} AED · ${t.admin.billing.kpis.financialDisputesSub}`, icon: Scale, color: '#f97316' },
        { label: t.admin.billing.kpis.totalPenalties, value: `${(kpis.totalPenalties || 0).toLocaleString()} AED`, subValue: t.admin.billing.kpis.totalPenaltiesSub, icon: AlertOctagon, color: '#ea580c' },
        { label: t.admin.billing.kpis.dailyTxCount, value: String(kpis.dailyTxCount ?? 0), subValue: t.admin.billing.kpis.dailyTxSub, icon: Activity, color: '#38bdf8' },
        { label: t.admin.billing.kpis.monthlyTxCount, value: String(kpis.monthlyTxCount ?? 0), subValue: t.admin.billing.kpis.monthlyTxSub, icon: Calendar, color: '#a78bfa' },
        { label: t.admin.billing.kpis.activityLoad, value: String(kpis.opsLast24h ?? kpis.todayTransactionsCount ?? 0), subValue: t.admin.billing.kpis.realtimeOps, icon: RefreshCw, color: '#ffffff' },
    ], [kpis, t]);

    const handleFeedRowClick = useCallback((item: UnifiedFinancialEvent) => {
        markFeedItemAsSeen(item.id);
    }, [markFeedItemAsSeen]);

    const handleFeedToggleExpand = useCallback((id: string) => {
        setExpandedFeedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleFeedViewAudit = useCallback((orderId: string) => {
        startTransition(() => setSelectedOrderIdForTimeline(orderId));
    }, []);

    const handleCloseOrderTimeline = useCallback(() => {
        setSelectedOrderIdForTimeline(null);
    }, []);

    const handleSaveCommission = () => {
        setCommissionRate(tempRate);
        alert(t.admin.billing.alerts.commissionSuccess);
    };

    const handleSaveLimits = async () => {
        const success = await updateWithdrawalLimits(limits);
        if (success) alert(t.admin.billing.alerts.limitsSuccess);
    };



    // Helper for Premium Stat Card — React.memo used inside here to prevent flicker
    const StatCard = React.memo(({ label, value, subValue, icon: Icon, color, trend }: any) => (
        <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 bg-gradient-to-br from-white/[0.04] to-transparent border-white/5">
            <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 rounded-full -mr-12 -mt-12 group-hover:opacity-20 transition-opacity duration-700`} style={{ backgroundColor: color }} />
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black text-white/30 uppercase ">{label}</p>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors" style={{ color: color }}>
                        <Icon size={18} />
                    </div>
                </div>
                <div className="mt-4">
                    <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
                        <h3 className="text-2xl font-black text-white font-mono tracking-tight">{value}</h3>
                    </BlurredSection>
                    {subValue && <p className="text-[10px] font-bold text-white/40 mt-1 uppercase ">{subValue}</p>}
                    {trend && (
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: trend }} className="h-full bg-cyan-400" />
                            </div>
                            <span className="text-[10px] font-black text-cyan-400">{trend}</span>
                        </div>
                    )}
                </div>
            </div>
        </GlassCard>
    ));
    StatCard.displayName = 'StatCard';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20" dir={isAr ? 'rtl' : 'ltr'}>
            
            {/* 1. Header Hero Section */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1A1814] to-[#0A0908] border border-white/5 shadow-2xl p-8 sm:p-10">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-500/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full -ml-24 -mb-24 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 bg-gold-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                                <DollarSign className="text-black" size={30} />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
                                    {t.admin.billing.title}
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                        <div className="flex flex-wrap items-center gap-2">
                            {([
                              { id: 'monthly' as const, label: t.admin.billing.kpis.periodMonthly || 'Monthly' },
                              { id: 'quarterly' as const, label: t.admin.billing.kpis.periodQuarterly || 'Quarterly' },
                              { id: 'yearly' as const, label: t.admin.billing.kpis.periodYearly || 'Yearly' },
                            ]).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setFinancialFilters({ period: p.id, startDate: '', endDate: '' })}
                                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase border ${
                                  financialFilters.period === p.id
                                    ? 'bg-gold-500 text-black border-gold-500'
                                    : 'bg-white/5 text-white/50 border-white/10'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
                            <input 
                                type="date" 
                                value={financialFilters.startDate || ''}
                                onChange={(e) => setFinancialFilters({ startDate: e.target.value, period: '' })}
                                className="bg-transparent border-none text-[10px] text-white font-mono focus:ring-0 cursor-pointer outline-none"
                            />
                            <span className="text-white/20 text-xs">→</span>
                            <input 
                                type="date" 
                                value={financialFilters.endDate || ''}
                                onChange={(e) => setFinancialFilters({ endDate: e.target.value, period: '' })}
                                className="bg-transparent border-none text-[10px] text-white font-mono focus:ring-0 cursor-pointer outline-none"
                            />
                        </div>
                        <div className="relative flex-1 lg:flex-none">
                            <AdminSearchInput
                                value={financialFilters.search || ''}
                                onChange={(value) => setFinancialFilters({ search: value })}
                                placeholder={t.admin.billing.searchPlaceholder}
                                className="w-full lg:w-72"
                            />
                        </div>
                        {canExportFinancials && (
                          <>
                            <button
                              type="button"
                              onClick={() => exportFinancialCSV()}
                              className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-3 group"
                              title="CSV"
                            >
                              <Download size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                            {(['xlsx', 'pdf'] as const).map((fmt) => (
                              <button
                                key={fmt}
                                type="button"
                                onClick={() =>
                                  exportFinancialReport('platform-revenue-summary', fmt, {
                                    startDate: financialFilters.startDate || '',
                                    endDate: financialFilters.endDate || '',
                                    ...(financialFilters.period ? { period: financialFilters.period } : {}),
                                  })
                                }
                                className="px-3 py-2 bg-gold-500/10 hover:bg-gold-500 hover:text-black text-gold-400 rounded-2xl border border-gold-500/20 text-[9px] font-black uppercase"
                              >
                                {fmt.toUpperCase()}
                              </button>
                            ))}
                          </>
                        )}
                        {isHighLevelAdmin && (
                            <button 
                                onClick={() => setShowPayoutModal(true)} 
                                className="px-8 py-4 bg-gold-500 hover:bg-gold-400 text-black font-black text-xs uppercase  rounded-2xl shadow-xl shadow-gold-500/20 transition-all flex items-center justify-center gap-3"
                            >
                                <Send size={18} />
                                {t.admin.billing.manualPayout.execute}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tab Navigation — desktop flat / mobile grouped */}
            <div className="hidden lg:flex gap-2 p-2 bg-[#1A1814] border border-white/5 rounded-3xl w-fit overflow-x-auto no-scrollbar shadow-2xl">
                {visibleTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase transition-all whitespace-nowrap cursor-pointer
                            ${activeTab === tab.id 
                                ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20 scale-105' 
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                            }
                            ${tab.isLocked ? 'opacity-70' : ''}
                        `}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                        {tab.isLocked && <Lock size={11} className={activeTab === tab.id ? 'text-black/50' : 'text-gold-500/50'} />}
                    </button>
                ))}
            </div>
            <div className="lg:hidden space-y-4">
                {tabGroups.map(group => (
                    <div key={group.key}>
                        <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-2 px-1">{group.label}</p>
                        <div className="flex gap-2 p-2 bg-[#1A1814] border border-white/5 rounded-2xl overflow-x-auto no-scrollbar">
                            {group.tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all whitespace-nowrap
                                        ${activeTab === tab.id ? 'bg-gold-500 text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}
                                    `}
                                >
                                    <tab.icon size={12} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <BlurredSection
                isBlurred={visibleTabs.find(t => t.id === activeTab)?.isLocked}
                titleAr={t.admin.billing.tabProtectedTitle.replace('{tab}', visibleTabs.find(tab => tab.id === activeTab)?.label || '')}
                titleEn={t.admin.billing.tabProtectedTitle.replace('{tab}', visibleTabs.find(tab => tab.id === activeTab)?.label || '')}
                descriptionAr={t.admin.billing.tabProtectedDescription}
                descriptionEn={t.admin.billing.tabProtectedDescription}
            >

            {activeTab === 'OVERVIEW' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    
                    {/* Hero KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <StatCard 
                            label={t.admin.billing.kpis.totalSales}
                            value={`${(kpis.totalSales || 0).toLocaleString()} AED`}
                            icon={TrendingUp}
                            color="#3b82f6"
                        />
                        <StatCard 
                            label={t.admin.billing.kpis.netProfit}
                            value={`${(kpis.netCommission || 0).toLocaleString()} AED`}
                            subValue={t.admin.billing.kpis.netProfitSub}
                            icon={DollarSign}
                            color="#d4af37"
                        />
                        <StatCard 
                            label={t.admin.billing.kpis.escrowLocked}
                            value={`${(kpis.frozenFunds || 0).toLocaleString()} AED`}
                            subValue={t.admin.billing.kpis.escrowLockedSub}
                            icon={Lock}
                            color="#ef4444"
                        />
                        <StatCard 
                            label={t.admin.billing.kpis.netPlatformPosition}
                            value={`${(kpis.netPlatformPosition || 0).toLocaleString()} AED`}
                            subValue={t.admin.billing.kpis.netPlatformSub}
                            icon={ShieldCheck}
                            color="#22d3ee"
                        />
                    </div>

                    <div className="space-y-4">
                        <OverviewKpiSection
                            title={t.admin.billing.kpis.platformRevenueSection || (isAr ? 'إيرادات المنصة (ملخص)' : 'Platform Revenue Summary')}
                            items={platformRevenueKpis}
                            renderValue={(item) => (
                                <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
                                    <h3 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">{item.value}</h3>
                                </BlurredSection>
                            )}
                        />
                        <OverviewKpiSection
                            title={isAr ? 'السيولة والتحويلات' : 'Liquidity & Payouts'}
                            items={liquidityKpis}
                            renderValue={(item) => (
                                <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
                                    <h3 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">{item.value}</h3>
                                </BlurredSection>
                            )}
                        />
                        <OverviewKpiSection
                            title={isAr ? 'الإيرادات والعمولات' : 'Revenue & Commissions'}
                            items={revenueKpis}
                            renderValue={(item) => (
                                <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
                                    <h3 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">{item.value}</h3>
                                </BlurredSection>
                            )}
                        />
                        <OverviewKpiSection
                            title={isAr ? 'المخاطر والعمليات' : 'Risk & Operations'}
                            items={riskKpis}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                        {/* 3a. Top Spenders & Top Earners Leaderboard (Col 1) */}
                        <GlassCard className="p-8 bg-[#151310] border-white/5 flex flex-col gap-10">
                            {/* Top Spenders (Blue Theme) */}
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className={`text-xs font-black uppercase ${isAr ? 'tracking-normal' : 'tracking-[0.3em]'} text-white/30 flex items-center gap-3`}>
                                        <Users size={16} className="text-blue-400" />
                                        {t.admin.billing.leaderboards.topSpenders}
                                    </h4>
                                </div>
                                <div className="space-y-4">
                                    {topSpenders.length === 0 ? (
                                        <div className="py-10 text-center opacity-20">
                                            <Users size={32} className="mx-auto mb-2" />
                                            <p className="text-[10px] font-black uppercase">{t.admin.billing.leaderboards.noData}</p>
                                        </div>
                                    ) : topSpenders.map((item: any, idx: number) => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => onNavigate && onNavigate('customer-profile', item.id)}
                                            className="group relative flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/30 hover:bg-white/5 transition-all cursor-pointer"
                                        >
                                            {/* Rank */}
                                            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                                idx === 0 ? 'bg-blue-500 text-black shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-white/10 text-white/40'
                                            }`}>
                                                {idx + 1}
                                            </div>

                                            {/* Avatar */}
                                            <div className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">
                                                {item.avatar ? (
                                                    <img src={item.avatar} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={16} className="text-white/20" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <BlurredSection isBlurred={isSectionBlurred('customer_name')}>
                                                    <p className="text-[13px] font-black text-white truncate group-hover:text-blue-400 transition-colors">{item.name}</p>
                                                </BlurredSection>
                                                <div className="flex items-center gap-2 text-[9px] text-white/30 font-bold uppercase mt-0.5">
                                                    <Package size={10} />
                                                    <span>{item.ordersCount} {t.admin.billing.leaderboards.orders}</span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <span className="block text-xs font-black text-white font-mono">{item.totalSpent.toLocaleString()} <span className="text-[9px] text-blue-400">AED</span></span>
                                                <ArrowUpRight size={12} className="text-white/10 group-hover:text-blue-400 transition-colors inline-block mt-1" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                            {/* Top Earners (Gold Theme) */}
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className={`text-xs font-black uppercase ${isAr ? 'tracking-normal' : 'tracking-[0.3em]'} text-white/30 flex items-center gap-3`}>
                                        <Crown size={16} className="text-gold-400" />
                                        {t.admin.billing.leaderboards.topMerchants}
                                    </h4>
                                </div>
                                <div className="space-y-4">
                                    {topEarners.length === 0 ? (
                                        <div className="py-10 text-center opacity-20">
                                            <Crown size={32} className="mx-auto mb-2" />
                                            <p className="text-[10px] font-black uppercase">{t.admin.billing.leaderboards.noData}</p>
                                        </div>
                                    ) : topEarners.map((item: any, idx: number) => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => onNavigate && onNavigate('store-profile', item.id)}
                                            className="group relative flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-gold-500/30 hover:bg-white/5 transition-all cursor-pointer"
                                        >
                                            {/* Rank */}
                                            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                                idx === 0 ? 'bg-gold-500 text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-white/10 text-white/40'
                                            }`}>
                                                {idx + 1}
                                            </div>

                                            {/* Logo */}
                                            <div className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">
                                                {item.logo ? (
                                                    <img src={item.logo} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Crown size={16} className="text-white/20" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <BlurredSection isBlurred={isSectionBlurred('customer_name')}>
                                                        <span className="text-[13px] font-black text-white truncate group-hover:text-gold-400 transition-colors">{item.name}</span>
                                                    </BlurredSection>
                                                    {item.rating > 0 && (
                                                        <div className="flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded-full border border-white/5 shrink-0">
                                                            <span className="text-[8px] font-black text-gold-400">{item.rating}</span>
                                                            <TrendingUp size={8} className="text-gold-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[9px] text-white/30 font-bold uppercase">
                                                    <Package size={10} />
                                                    <span>{item.ordersCount} {t.admin.billing.leaderboards.orders}</span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <span className="block text-xs font-black text-white font-mono">{item.totalEarned.toLocaleString()} <span className="text-[9px] text-gold-500">AED</span></span>
                                                <span className="text-[8px] text-green-400 font-black uppercase tracking-tighter">{t.admin.billing.leaderboards.grossSales}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </GlassCard>

                        {/* 3b. Sales Trend Chart (Col 2 & 3) */}
                        <GlassCard className="p-8 bg-[#151310] border-white/5 lg:col-span-2 flex flex-col">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h4 className={`text-xs font-black uppercase ${isAr ? 'tracking-normal' : 'tracking-[0.3em]'} text-white flex items-center gap-3`}>
                                        <TrendingUp size={18} className="text-gold-500" />
                                        {t.admin.billing.charts.salesTrend}
                                    </h4>
                                    <p className="text-[10px] text-white/30 uppercase mt-2">
                                        {t.admin.billing.charts.salesTrendSub}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
                                        <span className="block text-2xl font-bold text-gold-400 font-mono">{kpis.totalSales.toLocaleString()} AED</span>
                                    </BlurredSection>
                                    <span className="block text-[10px] text-white/30 mt-1 uppercase">{t.admin.billing.kpis.totalSales}</span>
                                </div>
                            </div>
                            
                            <div className="flex-1 min-h-[250px] w-full">
                                <BarChart
                                    data={salesTrendData}
                                    height={250}
                                    color="#A88B3E"
                                />
                            </div>
                        </GlassCard>
                    </div>


                </div>
            )}

            {activeTab === 'TRANSACTIONS' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
                        {/* Transaction Type Filter (2026 Enhanced) */}
                        <TransactionTypeFilter />

                        <div className="flex flex-wrap items-center justify-end gap-3 w-full xl:w-auto">
                            {/* Search */}
                            <AdminSearchInput
                                value={ledgerSearchInput}
                                onChange={setLedgerSearchInput}
                                placeholder={t.admin.billing.searchPlaceholder}
                                className="w-full md:w-64"
                            />

                            {/* Export */}
                            <button 
                                onClick={() => exportFinancialCSV()}
                                className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-600 active:bg-gold-700 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-2xl shadow-gold-500/20 active:scale-95 group"
                            >
                                <Download size={16} className="group-hover:bounce" />
                                <span>{t.admin.billing.export}</span>
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <GlassCard className="p-0 overflow-hidden bg-black/20 border-white/5 shadow-2xl">
                        <div className="overflow-x-auto text-white">
                            <table className="w-full text-left whitespace-nowrap border-collapse">
                                <thead className="bg-white/[0.03] text-[10px] text-white/30 uppercase font-black sticky top-0 z-10 backdrop-blur-md">
                                    <tr className="border-b border-white/5">
                                        <th className="px-6 py-6 text-right">{t.admin.billing.ledger.table.transaction}</th>
                                        <th className="px-6 py-6 text-right">{t.admin.billing.ledger.table.details}</th>
                                        <th className="px-6 py-6 text-center">{t.admin.billing.ledger.table.amount}</th>
                                        <th className="px-6 py-6 text-center">{t.admin.billing.ledger.table.debit}</th>
                                        <th className="px-6 py-6 text-center">{t.admin.billing.ledger.table.credit}</th>
                                        <th className="px-6 py-6 text-center">{t.admin.billing.ledger.table.breakdown}</th>
                                        <th className="px-6 py-6 text-center">{t.admin.billing.ledger.table.balanceAfter}</th>
                                        <th className="px-6 py-6 text-center">{t.admin.billing.ledger.table.timestamp}</th>
                                        <th className="px-6 py-6 text-center">{t.admin.billing.ledger.table.executor}</th>
                                        <th className="px-6 py-6 text-center">{t.admin.billing.ledger.table.status_header}</th>
                                        <th className="px-6 py-6 text-center">{t.admin.billing.ledger.table.refs}</th>
                                        <th className="px-4 py-6"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {isFeedLoading && financialFeed.length === 0 ? (
                                        <tr><td colSpan={12} className="px-8 py-20 text-center text-white/20 font-black text-xs uppercase animate-pulse">{t.admin.billing.ledger.table.scanning}</td></tr>
                                    ) : financialFeed.length === 0 ? (
                                        <tr><td colSpan={12} className="px-8 py-20 text-center text-white/10 font-bold text-xs uppercase ">{t.admin.billing.ledger.table.noRecords}</td></tr>
                                    ) : financialFeed.map((item) => (
                                        <FinancialFeedRow
                                            key={item.id}
                                            item={item}
                                            isAr={isAr}
                                            isExpanded={expandedFeedIds.has(item.id)}
                                            isSectionBlurred={isSectionBlurred}
                                            t={t}
                                            onRowClick={handleFeedRowClick}
                                            onToggleExpand={handleFeedToggleExpand}
                                            onViewAudit={handleFeedViewAudit}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Infinite Scroll Target */}
                        <div ref={observerTarget} className="h-20 flex items-center justify-center">
                            {isFeedLoading && (
                                <div className="flex items-center gap-3 text-gold-500/50 font-black text-[10px] uppercase tracking-tighter animate-pulse">
                                    <RefreshCw size={14} className="animate-spin" />
                                    {t.admin.billing.ledger.scanningMore}
                                </div>
                            )}
                            {!feedHasMore && financialFeed.length > 0 && (
                                <div className="text-white/10 font-black text-[10px] uppercase tracking-tighter">
                                    {t.admin.billing.ledger.loadMore}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        )}

            {(activeTab === 'MERCHANT_WITHDRAWALS' || activeTab === 'CUSTOMER_WITHDRAWALS') && (
                <AdminWithdrawalQueue
                    role={activeTab === 'MERCHANT_WITHDRAWALS' ? 'VENDOR' : 'CUSTOMER'}
                    onNavigate={onNavigate}
                />
            )}

            <Suspense fallback={<div className="py-20 text-center text-white/20 text-xs uppercase animate-pulse">{t.admin.billing.ledger.table.scanning}</div>}>
                {activeTab === 'SELLER_ACCOUNTS' && <AdminSellerAccounts onNavigate={onNavigate} />}
                {activeTab === 'CUSTOMER_ACCOUNTS' && <AdminCustomerAccounts onNavigate={onNavigate} />}
                {activeTab === 'REFUNDS' && <AdminFinancialRefunds />}
                {activeTab === 'SETTLEMENT' && <AdminSettlement />}
                {activeTab === 'PENALTIES' && <AdminFinancialPenalties />}
                {activeTab === 'REPORTS' && <AdminFinancialReports />}
            </Suspense>

            {/* 5. Manual Payout Modal (2026 Style Overlay) */}
            <ManualPayoutModal
                show={showPayoutModal}
                onClose={() => {
                    setShowPayoutModal(false);
                    setSelectedWithdrawalReq(null);
                }}
                currentAdmin={currentAdmin}
                t={t}
                isAr={isAr}
                sendManualPayout={sendManualPayout}
                processWithdrawal={processWithdrawal}
                selectedRequest={selectedWithdrawalReq}
            />
            </BlurredSection>
            {/* Phase 4: Financial Audit Drawer */}
            {selectedOrderIdForTimeline && (
              <Suspense fallback={null}>
                <OrderFinancialDrawer
                  orderId={selectedOrderIdForTimeline}
                  onClose={handleCloseOrderTimeline}
                />
              </Suspense>
            )}

            {/* Phase 5: Real-time Notifications */}
            <FinancialToast />
        </div>
    );
};
