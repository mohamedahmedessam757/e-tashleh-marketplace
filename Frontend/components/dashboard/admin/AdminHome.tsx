
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { Users, Store, Activity, DollarSign, Package, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, MoreHorizontal, ShieldCheck, CheckCircle2, Download, Filter, Search, Plus, Trash2, Edit, Car, User } from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useVendorStore } from '../../../stores/useVendorStore';
import { useResolutionStore } from '../../../stores/useResolutionStore';
import { useSystemAutomation } from '../../../stores/useSystemAutomation'; // Import Automation Store
import { useShipmentStore } from '../../../stores/useShipmentStore';
import { LineChart, DonutChart, BarChart } from '../../ui/Charts';
import { AdminAlerts } from './AdminAlerts';

// SUB-COMPONENTS
import { StoreManagement } from './StoreManagement';
import { OrderControl } from './OrderControl';
import { AdminStoreProfile } from './AdminStoreProfile';
import { AdminOrderDetails } from './AdminOrderDetails';
import { CustomerManagement } from './CustomerManagement';
import { AdminCustomerProfile } from './AdminCustomerProfile';
import { ReviewsControl } from './ReviewsControl';
import { AdminResolutionPage } from './AdminResolutionPage';
import { AdminDisputeDetails } from './AdminDisputeDetails';
import { AdminBilling } from './AdminBilling';
import { InvoiceViewer } from './InvoiceViewer';
import { AdminAuditLogs } from './AdminAuditLogs';
import { AdminShipping } from './AdminShipping';
import { AdminSettings } from './AdminSettings';
import { AdminSupport } from './AdminSupport';
import { SecurityAudit } from './SecurityAudit';
import { AdminViolations } from './AdminViolations';
import { AdminAccessControl } from './AdminAccessControl';
import { FinancialHub } from './FinancialHub';
import { PermissionGuard } from './PermissionGuard';
import { AdminShippingCarts } from './AdminShippingCarts';
import { VerificationTasksDashboard } from './VerificationTasksDashboard';
import { VerificationTaskDetails } from './VerificationTaskDetails';

interface AdminHomeProps {
    subPath?: string;
    viewId?: any; // ID passed from routing
    onNavigate?: (path: string, id?: any) => void;
}

// Ultra-Modern 2026 Skeleton Pre-loader (No flashes, extremely fast structural rendering)
const AdminHomeSkeleton = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-10">
        {/* HEADER HEADER SKELETON */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gradient-to-r from-[#1A1814] to-transparent p-6 rounded-3xl border border-white/5">
            <div className="space-y-3 w-full max-w-sm">
                <div className="w-24 h-6 bg-white/10 rounded-full animate-pulse"></div>
                <div className="w-64 h-10 bg-white/10 rounded-xl animate-pulse"></div>
                <div className="w-48 h-4 bg-white/10 rounded-xl animate-pulse"></div>
            </div>
            <div className="flex gap-2">
                <div className="w-32 h-10 bg-white/10 rounded-xl animate-pulse"></div>
                <div className="w-24 h-10 bg-white/10 rounded-xl animate-pulse"></div>
            </div>
        </div>

        {/* KPI GRID SKELETON */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
                <GlassCard key={i} className="p-5 border-white/5">
                    <div className="flex justify-between items-start">
                        <div className="space-y-3 w-full">
                            <div className="w-16 h-3 bg-white/10 rounded-full animate-pulse"></div>
                            <div className="w-24 h-8 bg-white/10 rounded-xl animate-pulse"></div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/10 animate-pulse"></div>
                    </div>
                </GlassCard>
            ))}
        </div>

        {/* CHARTS SKELETON */}
        <div className="grid lg:grid-cols-3 gap-6">
            <GlassCard className="lg:col-span-2 p-6 md:p-8 flex flex-col bg-[#1A1814]/80 min-h-[400px] justify-between">
                <div className="flex justify-between w-full">
                    <div className="w-32 h-6 bg-white/10 rounded-xl animate-pulse"></div>
                    <div className="w-24 h-8 bg-white/10 rounded-xl animate-pulse"></div>
                </div>
                <div className="w-full h-[300px] bg-white/5 rounded-xl animate-pulse mt-8"></div>
            </GlassCard>
            <GlassCard className="p-6 bg-[#1A1814]/80 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-48 h-48 rounded-full bg-white/5 animate-pulse"></div>
                <div className="w-full grid grid-cols-2 gap-3 mt-8">
                    {[...Array(4)].map((_, i) => <div key={i} className="w-full h-8 bg-white/10 rounded-xl animate-pulse"></div>)}
                </div>
            </GlassCard>
        </div>
    </div>
);

// --- KPI CARD COMPONENT (MEMOIZED & ANIMATED) ---
const KPICard = React.memo(({ label, value, icon: Icon, color, trend, loading, children }: any) => {
    const [displayValue, setDisplayValue] = useState(0);
    const targetValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
    const unit = typeof value === 'string' ? value.replace(/[0-9.,\s]/g, '') : '';

    useEffect(() => {
        if (loading) return;
        let start = displayValue;
        const end = targetValue;
        const duration = 800; // 0.8s for smooth count
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuad = (t: number) => t * (2 - t);
            const current = Math.floor(start + (end - start) * easeOutQuad(progress));
            
            setDisplayValue(current);
            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }, [targetValue, loading]);

    return (
        <GlassCard className="relative overflow-hidden group p-5 border-white/5 hover:border-gold-500/30 transition-all duration-500 min-h-[140px]">
            {loading ? (
                <div className="space-y-4">
                    <div className="w-16 h-3 bg-white/10 rounded-full animate-pulse" />
                    <div className="w-24 h-8 bg-white/10 rounded-xl animate-pulse" />
                    <div className="w-20 h-3 bg-white/5 rounded-full animate-pulse" />
                </div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                    <div className={`absolute top-0 right-0 p-20 rounded-full blur-3xl opacity-10 bg-${color.split('-')[1]}-500 group-hover:opacity-20 transition-opacity`} />
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">{label}</p>
                            <h3 className="text-2xl lg:text-3xl font-bold text-white font-mono tracking-tight">
                                {displayValue.toLocaleString()} <span className="text-xs text-white/40">{unit}</span>
                            </h3>
                            {children}
                        </div>
                        <div className={`p-3 rounded-xl bg-white/5 border border-white/5 ${color} shadow-lg`}>
                            <Icon size={20} />
                        </div>
                    </div>
                    <div className="relative z-10 mt-4 flex items-center gap-2">
                        <span className={`text-xs font-bold flex items-center gap-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {Math.abs(trend)}%
                        </span>
                        <span className="text-[10px] text-white/30">vs last period</span>
                    </div>
                </motion.div>
            )}
        </GlassCard>
    );
});

export const AdminHome: React.FC<AdminHomeProps> = ({ subPath, viewId, onNavigate }) => {
    const { t, language } = useLanguage();
    const { currentAdmin, isLoadingStats, commissionRate, fetchDashboardStats, dashboardStats, dashboardStatsError, subscribeToStats, unsubscribeFromStats } = useAdminStore();
    const { cases } = useResolutionStore();
    const { isRunning } = useSystemAutomation();

    const isAr = language === 'ar';

    // Date Filters Local State (for smooth input interaction)
    const [localDateRange, setLocalDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    // Debounced Date Range (for actual fetching)
    const [debouncedRange, setDebouncedRange] = useState(localDateRange);
    const [statsRequested, setStatsRequested] = useState(false);

    // Sync local range to debounced range with a delay
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedRange(localDateRange);
        }, 300); // Reduced to 300ms for snappier feel
        return () => clearTimeout(timer);
    }, [localDateRange]);

    // Fetch Real-time Stats on Mount & on Debounced Filter Change
    React.useEffect(() => {
        setStatsRequested(true);
        fetchDashboardStats(debouncedRange);
        subscribeToStats();
        
        // Shipment sync — admins only (officer has no shipments permission → 403 noise)
        if (!['VERIFICATION_OFFICER'].includes(currentAdmin?.role || '')) {
            useShipmentStore.getState().startRealtime();
        }

        // Listen for internal navigation events
        const handleInternalNav = (e: any) => {
            const { path, id } = e.detail;
            if (onNavigate) {
                onNavigate(path, id);
            }
        };
        window.addEventListener('admin-nav', handleInternalNav);

        return () => {
            unsubscribeFromStats();
            useShipmentStore.getState().stopRealtime();
            window.removeEventListener('admin-nav', handleInternalNav);
        };
    }, [debouncedRange, fetchDashboardStats, subscribeToStats, unsubscribeFromStats, currentAdmin?.role]);

    // Helper for internal nav bubbling
    const navigate = (path: string, id?: any) => {
        if (onNavigate) {
            onNavigate(path, id);
        } else {
            window.dispatchEvent(new CustomEvent('admin-nav', { detail: { path, id } }));
        }
    };

    // --- ANALYTICS ENGINE (KPIs) ---
    const stats = useMemo(() => {
        if (!dashboardStats) return {
            totalSales: 0,
            totalCommission: 0,
            totalOrders: 0,
            openDisputes: 0,
            activeVendors: 0,
            activeCustomers: 0
        };

        return {
            totalSales: dashboardStats.totalSales || 0,
            totalCommission: dashboardStats.totalCommission || 0,
            totalSalesTrend: dashboardStats.salesTrendPercent || 0,
            totalOrders: dashboardStats.totalOrders || 0,
            openDisputes: dashboardStats.openDisputes || 0,
            activeVendors: dashboardStats.activeStores || 0,
            activeCustomers: dashboardStats.activeCustomers || 0
        };
    }, [dashboardStats]);

    // --- CHARTS DATA ENGINE ---
    const chartsData = useMemo(() => {
        if (!dashboardStats) return {
            salesTrend: [],
            salesLabels: [],
            donutData: [],
            barData: []
        };

        const salesTrend = (dashboardStats.salesTrend ?? []).map(d => d.value);
        const salesLabels = (dashboardStats.salesTrend ?? []).map(d => {
            const date = new Date(d.date);
            // Always use Gregorian (English locales usually do, but let's be explicit)
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
        });

        const sDist = dashboardStats.statusDistribution ?? [];
        
        // Dynamic mapping of all possible statuses to 2026 premium colors
        const statusConfig: Record<string, string> = {
            AWAITING_OFFERS: '#818CF8', // Indigo
            COLLECTING_OFFERS: '#6366F1', // Indigo-600
            AWAITING_PAYMENT: '#A78BFA', // Violet
            PARTIALLY_PAID: '#C084FC', // Purple
            PREPARATION: '#FBBF24', // Amber
            PREPARED: '#F59E0B', // Amber-600
            DELAYED_PREPARATION: '#EF4444', // Red
            VERIFICATION: '#22D3EE', // Cyan
            VERIFICATION_SUCCESS: '#34D399', // Emerald
            READY_FOR_SHIPPING: '#0EA5E9', // Sky
            SHIPPED: '#60A5FA', // Blue
            DELIVERED: '#2DD4BF', // Teal
            COMPLETED: '#10B981', // Green
            CANCELLED: '#64748B', // Slate
            DISPUTED: '#EF4444', // Bright Red
            RETURN_REQUESTED: '#FB923C', // Orange
            RETURN_APPROVED: '#F97316', // Dark Orange
            REFUNDED: '#F472B6', // Pink
            WARRANTY_ACTIVE: '#38BDF8', // Light Blue
            WARRANTY_EXPIRED: '#94A3B8', // Slate
            NON_MATCHING: '#F43F5E', // Rose
            CORRECTION_PERIOD: '#F59E0B', // Amber
            CORRECTION_SUBMITTED: '#FCD34D', // Amber-300
        };

        const donutData = sDist.map(item => ({
            label: (t.common.status as any)[item.status] || item.status,
            value: item.count,
            color: statusConfig[item.status] || '#FFFFFF'
        })).sort((a, b) => b.value - a.value);

        const donutTotal = donutData.reduce((sum, item) => sum + item.value, 0);

        const barData = (dashboardStats.topStores ?? []).map(s => ({
            label: s.name,
            value: s.ordersCount
        }));

        const salesTrendData = (dashboardStats.salesTrend ?? []).map((d, i) => ({
            label: salesLabels[i] || '',
            value: d.value
        }));

        return { salesTrend, salesLabels, donutData, donutTotal, barData, salesTrendData };
    }, [dashboardStats, language, t]);

    if (subPath === 'billing') {
        return (
            <PermissionGuard page="billing" action="view">
                <AdminBilling onNavigate={navigate} />
            </PermissionGuard>
        );
    }
    if (subPath === 'financials') {
        return (
            <PermissionGuard page="billing" action="view">
                <FinancialHub />
            </PermissionGuard>
        );
    }
    if (subPath === 'invoice-details' && viewId) return <InvoiceViewer invoiceId={viewId} onBack={() => navigate('billing')} />;
    
    if (subPath === 'resolution') {
        return <PermissionGuard page="resolution" action="view"><AdminResolutionPage onNavigate={navigate} /></PermissionGuard>;
    }
    if (subPath === 'admin-dispute-details' && viewId) {
        return <PermissionGuard page="resolution" action="view"><AdminDisputeDetails caseId={viewId} onBack={() => navigate('resolution')} onNavigate={navigate} /></PermissionGuard>;
    }
    if (subPath === 'users') {
        return <PermissionGuard page="users" action="view"><StoreManagement onNavigate={navigate} /></PermissionGuard>;
    }
    if (subPath === 'store-profile' && viewId) {
        return <PermissionGuard page="users" action="view"><AdminStoreProfile vendorId={viewId} onBack={() => navigate('users')} onNavigate={navigate} /></PermissionGuard>;
    }
    if (subPath === 'customers') {
        return <PermissionGuard page="customers" action="view"><CustomerManagement onNavigate={navigate} /></PermissionGuard>;
    }
    if (subPath === 'customer-profile' && viewId) {
        return <PermissionGuard page="customers" action="view"><AdminCustomerProfile customerId={viewId} onBack={() => navigate('customers')} onNavigate={navigate} /></PermissionGuard>;
    }
    if (subPath === 'reviews') {
        return <PermissionGuard page="reviews" action="view"><ReviewsControl /></PermissionGuard>;
    }
    if (subPath === 'orders-control') {
        return <PermissionGuard page="orders-control" action="view"><OrderControl onNavigate={navigate} /></PermissionGuard>;
    }
    if (subPath === 'admin-order-details' && viewId) {
        return <PermissionGuard page="orders-control" action="view"><AdminOrderDetails orderId={viewId} onBack={() => navigate('orders-control')} onNavigate={navigate} /></PermissionGuard>;
    }
    if (subPath === 'audit-logs') {
        return <PermissionGuard page="audit-logs" action="view"><AdminAuditLogs /></PermissionGuard>;
    }
    if (subPath === 'shipping') {
        return <PermissionGuard page="shipping" action="view"><AdminShipping initialSearch={viewId} /></PermissionGuard>;
    }
    if (subPath === 'shipping-carts') {
        return <PermissionGuard page="shipping-carts" action="view"><AdminShippingCarts /></PermissionGuard>;
    }
    if (subPath === 'settings') {
        return <PermissionGuard page="settings" action="view"><AdminSettings /></PermissionGuard>;
    }
    if (subPath === 'support') {
        return <PermissionGuard page="support" action="view"><AdminSupport viewId={viewId} /></PermissionGuard>;
    }
    if (subPath === 'security-audit') {
        return <PermissionGuard page="security-audit" action="view"><SecurityAudit /></PermissionGuard>;
    }
    if (subPath === 'violations') {
        return <PermissionGuard page="violations" action="view"><AdminViolations /></PermissionGuard>;
    }
    if (subPath === 'access-control') {
        return (
            <PermissionGuard page="access-control" action="view">
                <AdminAccessControl />
            </PermissionGuard>
        );
    }
    if (subPath === 'verification-tasks') {
        return (
            <PermissionGuard page="verification-tasks" action="view">
                <VerificationTasksDashboard onNavigate={navigate} />
            </PermissionGuard>
        );
    }
    if (subPath === 'verification-task-details' && viewId) {
        return (
            <PermissionGuard page="verification-tasks" action="view">
                <VerificationTaskDetails taskId={viewId} onBack={() => navigate('verification-tasks')} />
            </PermissionGuard>
        );
    }

    if (!dashboardStats) {
        if (!statsRequested || isLoadingStats) return <AdminHomeSkeleton />;

        const isSessionError = dashboardStatsError === 'NO_TOKEN' || dashboardStatsError === 'UNAUTHORIZED';
        const isNetworkError = dashboardStatsError === 'NETWORK';
        const errorMessage = isSessionError
            ? (isAr ? 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى.' : 'Session expired. Please sign in again.')
            : isNetworkError
              ? (isAr
                  ? 'تعذر الاتصال بالخادم. تأكد أن NestJS Backend يعمل على المنفذ 3000.'
                  : 'Cannot reach the server. Ensure the NestJS backend is running on port 3000.')
              : (isAr ? 'تعذر تحميل لوحة التحكم من الخادم.' : 'Failed to load dashboard data from the server.');

        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-white/40 px-6 text-center">
                <AlertTriangle size={32} className="text-amber-500" />
                <p className="text-sm max-w-md">{errorMessage}</p>
                {isSessionError ? (
                    <button
                        type="button"
                        onClick={() => {
                            window.location.href = '/auth/admin-login';
                        }}
                        className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-xl text-xs font-bold transition-colors"
                    >
                        {isAr ? 'تسجيل الدخول' : 'Sign in'}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => fetchDashboardStats(debouncedRange)}
                        className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-xl text-xs font-bold transition-colors"
                    >
                        {t.admin.actions.refresh}
                    </button>
                )}
            </div>
        );
    }

    const topStores = dashboardStats.topStores ?? [];
    const recentOrders = dashboardStats.recentOrders ?? [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-10">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gradient-to-r from-[#1A1814] to-transparent p-6 rounded-3xl border border-white/5">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded-full border border-white/10">
                            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isRunning ? 'text-green-400' : 'text-red-400'}`}>
                                {isRunning ? t.admin.automations.active : t.admin.automations.stopped}
                            </span>
                        </div>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">{t.admin.welcome}</h1>
                    <p className="text-white/50 text-sm flex items-center gap-2">
                        {t.admin.welcomeSub}
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className={`font-mono font-bold ${['SUPER_ADMIN', 'ADMIN'].includes(currentAdmin?.role || '') ? 'text-red-400' : 'text-blue-400'}`}>
                            {currentAdmin?.role}
                        </span>
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('security-audit')}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                    >
                        <ShieldCheck size={14} />
                        {t.admin.security.title}
                    </button>
                    <button 
                        onClick={() => fetchDashboardStats(localDateRange)}
                        className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-xl text-xs font-bold shadow-lg shadow-gold-500/20 transition-all active:scale-95"
                    >
                        {t.admin.actions.refresh}
                    </button>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <KPICard label={t.admin.kpi.totalSales} value={`${stats.totalSales.toLocaleString()} AED`} icon={DollarSign} color="text-gold-400" trend={stats.totalSalesTrend} loading={isLoadingStats} />
                <KPICard 
                    label={t.admin.kpi.commission} 
                    value={`${stats.totalCommission.toLocaleString()} AED`} 
                    icon={TrendingUp} 
                    color="text-green-400" 
                    trend={8.2} 
                    loading={isLoadingStats}
                >
                    <p className="text-[10px] text-white/40 mt-1">{t.admin.kpi.profitSub}</p>
                </KPICard>
                <KPICard label={t.admin.kpi.orders} value={stats.totalOrders} icon={Package} color="text-blue-400" trend={-2.1} loading={isLoadingStats} />
                <KPICard label={t.admin.kpi.customers} value={stats.activeCustomers.toLocaleString()} icon={Users} color="text-purple-400" trend={5.4} loading={isLoadingStats} />
                <KPICard label={t.admin.kpi.stores} value={stats.activeVendors} icon={Store} color="text-pink-400" trend={0} loading={isLoadingStats} />
                <KPICard label={t.admin.kpi.disputes} value={stats.openDisputes} icon={AlertTriangle} color="text-red-400" trend={15} loading={isLoadingStats} />
            </div>

            {/* MAIN ANALYTICS SECTION */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Sales Chart (Large) */}
                <GlassCard className="lg:col-span-2 p-6 md:p-8 flex flex-col bg-[#1A1814]/80">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">
                                {t.admin.charts.salesTrend} ({Math.ceil((new Date(localDateRange.endDate).getTime() - new Date(localDateRange.startDate).getTime()) / (1000 * 3600 * 24))} {isAr ? 'يوم' : 'Days'})
                            </h3>
                            <p className="text-xs text-white/40">{isAr ? 'نظرة شاملة على أداء المنصة المالي' : 'Overview of platform financial performance'}</p>
                        </div>
                        
                        {/* Date Pickers */}
                        <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
                            <input 
                                type="date" 
                                value={localDateRange.startDate}
                                onChange={(e) => setLocalDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="bg-transparent border-none text-[10px] text-white font-mono focus:ring-0 cursor-pointer"
                            />
                            <span className="text-white/20 text-xs">→</span>
                            <input 
                                type="date" 
                                value={localDateRange.endDate}
                                onChange={(e) => setLocalDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                className="bg-transparent border-none text-[10px] text-white font-mono focus:ring-0 cursor-pointer"
                            />
                        </div>

                        <div className="text-right">
                            <span className="block text-2xl font-bold text-gold-400 font-mono">{stats.totalSales.toLocaleString()} AED</span>
                            <span className="block text-[10px] text-green-400">+12.5% vs prev week</span>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-[300px] relative">
                        {isLoadingStats && (
                            <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <div className="w-12 h-12 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                            </div>
                        )}
                        <div className={`w-full h-[300px] transition-all duration-700 ${isLoadingStats ? 'opacity-30 scale-[0.98] blur-[2px]' : 'opacity-100 scale-100 blur-0'}`}>
                            <BarChart
                                data={chartsData.salesTrendData}
                                height={300}
                                color="#A88B3E" // Gold
                            />
                        </div>
                    </div>
                </GlassCard>

                {/* Side Column: Alerts & Status */}
                <div className="space-y-6">
                    {/* Status Donut */}
                    <GlassCard className="p-6 bg-[#1A1814]/80 flex flex-col items-center justify-between min-h-[420px] relative overflow-hidden border-white/5">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
                        
                        <div className="w-full flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-sm font-bold text-white mb-1">{t.admin.charts.orderStatus}</h3>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest">{isAr ? 'توزيع الحالات اللحظي' : 'Real-time status distribution'}</p>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                                <Activity size={14} />
                            </div>
                        </div>

                        <div className="flex-1 flex items-center justify-center py-4">
                            <DonutChart data={chartsData.donutData} size={200} />
                        </div>

                        <div className="w-full grid grid-cols-2 gap-2 mt-6 max-h-[140px] overflow-y-auto custom-scrollbar pr-2">
                            {chartsData.donutData.map((d, i) => {
                                const percent = chartsData.donutTotal > 0
                                    ? Math.round((d.value / chartsData.donutTotal) * 100)
                                    : 0;

                                return (
                                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.color, boxShadow: `0 0 8px ${d.color}` }} />
                                            <span className="text-[9px] text-white/60 font-medium truncate group-hover:text-white transition-colors">{d.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 ml-2">
                                            <span className="text-[10px] font-bold text-white">{d.value}</span>
                                            <span className="text-[8px] text-white/20 font-mono">{percent}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* BOTTOM SECTION: Top Stores & Alerts */}
            <div className="grid lg:grid-cols-3 gap-6">
                <GlassCard className="p-6 bg-[#1A1814]/80 flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">{t.admin.charts.topStores}</h3>
                        <button 
                            onClick={() => navigate('users')}
                            className="px-3 py-1 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 text-gold-400 rounded-lg text-[10px] font-bold transition-all"
                        >
                            {t.admin.actions.viewReport}
                        </button>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                        {topStores.map((store: any, index: number) => (
                            <div 
                                key={store.storeId}
                                onClick={() => navigate('store-profile', store.storeId)}
                                className="group relative flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-gold-500/30 hover:bg-white/10 transition-all cursor-pointer"
                            >
                                {/* Rank Badge */}
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                    index === 0 ? 'bg-gold-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' :
                                    index === 1 ? 'bg-slate-300 text-black' :
                                    index === 2 ? 'bg-amber-700 text-white' :
                                    'bg-white/10 text-white/40'
                                }`}>
                                    {index + 1}
                                </div>

                                {/* Store Logo */}
                                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">
                                    {store.logo ? (
                                        <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Store size={18} className="text-white/20" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-bold text-white truncate group-hover:text-gold-400 transition-colors">{store.name}</span>
                                        {store.rating > 0 && (
                                            <div className="flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded-full border border-white/5">
                                                <span className="text-[10px] font-bold text-gold-400">{store.rating}</span>
                                                <TrendingUp size={8} className="text-gold-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                                        <Package size={10} />
                                        <span>{store.ordersCount} {isAr ? 'طلبات' : 'Orders'}</span>
                                    </div>
                                </div>

                                {/* Financial Value */}
                                <div className="text-right">
                                    <span className="block text-xs font-bold text-white font-mono">AED {store.revenue.toLocaleString()}</span>
                                    <span className="text-[9px] text-green-400 font-bold uppercase tracking-tighter">Growth</span>
                                </div>

                                <ArrowUpRight size={14} className="text-white/20 group-hover:text-gold-400 transition-colors ml-1" />
                            </div>
                        ))}

                        {topStores.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-white/20 py-10">
                                <Activity size={40} strokeWidth={1} className="mb-2 opacity-20" />
                                <span className="text-xs">{isAr ? 'لا توجد بيانات متاجر حالياً' : 'No store data available'}</span>
                            </div>
                        )}
                    </div>
                </GlassCard>

                <div className="lg:col-span-2">
                    <AdminAlerts />
                </div>
            </div>

            {/* RECENT ORDERS TABLE - REDESIGNED 2026 */}
            <GlassCard className="p-0 overflow-hidden bg-[#1A1814]/90 border-white/10 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-500/20 to-transparent" />
                
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div className="flex flex-col">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Activity size={18} className="text-gold-500" />
                            {t.admin.headers.recentOrders}
                        </h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">{isAr ? 'آخر 5 عمليات تجارية' : 'Latest 5 transactions'}</p>
                    </div>
                    <button 
                        onClick={() => navigate('orders-control')}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                        {isAr ? 'عرض الكل' : 'View All'}
                    </button>
                </div>

                <div className="px-6 py-4">
                    {/* Header - Hidden on mobile, visible as grid on desktop */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[10px] uppercase text-white/20 font-bold tracking-widest">
                        <div className="col-span-2">{t.admin.ordersTable.id}</div>
                        <div className="col-span-5">{isAr ? 'العميل والطلب' : 'Customer & Order'}</div>
                        <div className="col-span-2">{t.admin.ordersTable.status}</div>
                        <div className="col-span-3 text-end">{isAr ? 'القيمة الإجمالية' : 'Total Value'}</div>
                    </div>

                    <div className="space-y-2 mt-2">
                        {recentOrders.map((order: any) => {
                            const allAccepted = order.offers?.filter((of: any) => ['ACCEPTED', 'COMPLETED', 'SHIPPED', 'DELIVERED'].includes(String(of.status).toUpperCase())) || [];
                            const calculatedPrice = allAccepted.length > 0 
                                ? allAccepted.reduce((total: number, of: any) => {
                                    const base = Number(of.unitPrice || 0);
                                    const shipping = Number(of.shippingCost || 0);
                                    const percentCommission = Math.round(base * 0.25);
                                    const commission = base > 0 ? Math.max(percentCommission, 100) : 0;
                                    return total + base + shipping + commission;
                                  }, 0)
                                : (order.totalAmount ? Number(order.totalAmount) : null);

                            const displayOffer = order.acceptedOffer || allAccepted[0];

                            return (
                                <div 
                                    key={order.id} 
                                    className="group grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-gold-500/30 rounded-2xl cursor-pointer transition-all duration-300" 
                                    onClick={() => navigate('admin-order-details', order.id)}
                                >
                                    {/* Order ID */}
                                    <div className="col-span-2 flex flex-col gap-1">
                                        <span className="font-mono text-gold-400 font-bold tracking-tighter group-hover:text-gold-300 transition-colors">
                                            #{order.id.split('-').pop().toUpperCase()}
                                        </span>
                                        <span className="text-[9px] text-white/20 font-medium">
                                            {new Date(order.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: '2-digit', month: 'short' })}
                                        </span>
                                    </div>

                                    {/* Order Details & Customer */}
                                    <div className="col-span-5 flex items-center gap-4">
                                        {/* Customer Avatar */}
                                        <div className="relative shrink-0">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                                                {order.customer?.avatar ? (
                                                    <img src={order.customer.avatar} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={18} className="text-white/20" />
                                                )}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black border border-white/10 flex items-center justify-center">
                                                <Car size={8} className="text-gold-500" />
                                            </div>
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-bold truncate max-w-[120px]">{order.customer?.name || 'User'}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                                                <span className="text-gold-400 text-xs font-medium truncate max-w-[140px]">{order.partName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-white/40 mt-0.5">
                                                <span className="font-bold">{order.vehicleMake} {order.vehicleModel}</span>
                                                <span className="text-white/10">|</span>
                                                <span>{order.vehicleYear}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-2">
                                        <Badge status={order.status} className="shadow-lg shadow-black/20" />
                                    </div>

                                    {/* Financials */}
                                    <div className="col-span-3 text-start md:text-end">
                                        <div className="flex flex-col items-start md:items-end gap-1">
                                            {calculatedPrice ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="font-mono text-white font-black text-sm tracking-tighter">
                                                        {calculatedPrice.toLocaleString('en-US', { minimumFractionDigits: 0 })} <span className="text-[10px] text-gold-400">AED</span>
                                                    </div>
                                                    {!['AWAITING_OFFERS', 'AWAITING_PAYMENT', 'CANCELLED'].includes(String(order.status).toUpperCase()) && (
                                                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                                                            <CheckCircle2 size={10} strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="font-mono text-white/20 font-bold text-sm">— AED</div>
                                            )}
                                            
                                            {displayOffer?.store?.name && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[8px] text-white/20 uppercase font-black">{isAr ? 'التاجر' : 'Vendor'}</span>
                                                    <span className="text-[10px] text-white/40 font-bold truncate max-w-[100px]">{displayOffer.store.name}</span>
                                                </div>
                                            )}
                                            {!displayOffer && (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex -space-x-1">
                                                        {[...Array(Math.min(order._count?.offers || 0, 3))].map((_, i) => (
                                                            <div key={i} className="w-3 h-3 rounded-full border border-black bg-gold-500/20" />
                                                        ))}
                                                    </div>
                                                    <span className="text-[9px] text-white/40 font-bold">
                                                        {order._count?.offers ?? 0} {isAr ? 'عروض' : 'offers'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};
