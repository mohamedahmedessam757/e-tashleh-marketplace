import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { useOrderStore } from '../../../stores/useOrderStore';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Badge, StatusType } from '../../ui/Badge';
import { Search, Filter, Download, ArrowRight, ArrowLeft, Plus, Trash2, Edit, CheckCircle2, User, Package, Car, ChevronDown, Loader2, PackageSearch } from 'lucide-react';

export const OrderControl: React.FC<{ onNavigate?: (path: string, id: any) => void }> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const { 
        orders, 
        isLoading, 
        isFetchingMore, 
        hasMore, 
        total,
        fetchOrders, 
        fetchMoreOrders 
    } = useOrderStore();
    const { currentAdmin } = useAdminStore();
    const isAr = language === 'ar';
    const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    
    const dropdownRef = useRef<HTMLDivElement>(null);
    const observerTarget = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // 1. Debounce Search Logic
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [searchQuery]);

    // 2. Fetch Trigger (Search/Filter Change)
    useEffect(() => {
        fetchOrders({ 
            search: debouncedSearch, 
            status: filterStatus === 'ALL' ? undefined : filterStatus 
        });
    }, [debouncedSearch, filterStatus]);

    // 3. Infinite Scroll Observer
    const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
        const [target] = entries;
        if (target.isIntersecting && hasMore && !isLoading && !isFetchingMore) {
            fetchMoreOrders({ 
                search: debouncedSearch, 
                status: filterStatus === 'ALL' ? undefined : filterStatus 
            });
        }
    }, [hasMore, isLoading, isFetchingMore, debouncedSearch, filterStatus]);

    useEffect(() => {
        const option = { root: null, rootMargin: '200px', threshold: 0 };
        const observer = new IntersectionObserver(handleObserver, option);
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
    }, [handleObserver]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const statuses = [
        { label: isAr ? 'كافة الحالات' : 'All Statuses', value: 'ALL' },
        { label: isAr ? 'بانتظار العروض' : 'Awaiting Offers', value: 'AWAITING_OFFERS' },
        { label: isAr ? 'جمع العروض (بندقية)' : 'Collecting Offers (Auction)', value: 'COLLECTING_OFFERS' },
        { label: isAr ? 'بانتظار الدفع' : 'Awaiting Payment', value: 'AWAITING_PAYMENT' },
        { label: isAr ? 'قيد التجهيز' : 'Preparation', value: 'PREPARATION' },
        { label: isAr ? 'قيد التوثيق' : 'Verification', value: 'VERIFICATION' },
        { label: isAr ? 'تم التوثيق' : 'Verified', value: 'VERIFICATION_SUCCESS' },
        { label: isAr ? 'جاهز للشحن' : 'Ready for Shipping', value: 'READY_FOR_SHIPPING' },
        { label: isAr ? 'تم الشحن' : 'Shipped', value: 'SHIPPED' },
        { label: isAr ? 'تم الاستلام' : 'Delivered', value: 'DELIVERED' },
        { label: isAr ? 'مكتمل' : 'Completed', value: 'COMPLETED' },
        { label: isAr ? 'فترة التصحيح' : 'Correction Period', value: 'CORRECTION_PERIOD' },
        { label: isAr ? 'ملغي' : 'Cancelled', value: 'CANCELLED' },
        { label: isAr ? 'نزاع قائم' : 'Disputed', value: 'DISPUTED' },
    ];

    const handleRowClick = (id: string | number) => {
        if (onNavigate) onNavigate('admin-order-details', id);
    };

    const handleExportCSV = () => {
        if (orders.length === 0) return;
        
        const headers = ["Order ID", "Customer", "Car", "Part", "Price (AED)", "Status"];
        const rows = orders.map(order => [
            `#${String(order.id).slice(0, 8)}`,
            order.customer?.name || 'Customer',
            order.car,
            order.part,
            order.price || '0.00',
            order.status
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header & Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-[#0a0a0a]/40 backdrop-blur-xl p-6 rounded-[1.5rem] border border-white/5 shadow-2xl sticky top-0 z-30">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                        <PackageSearch className="text-gold-500" size={28} />
                        {isAr ? 'الطلبات الواردة' : 'INCOMING ORDERS'}
                        <div className="bg-gold-500/10 border border-gold-500/20 px-2 py-0.5 rounded-lg">
                            <span className="text-xs font-mono font-black text-gold-500">{total}</span>
                        </div>
                    </h1>
                    <p className="text-[10px] md:text-xs text-gold-500/60 font-medium tracking-[0.2em] uppercase">
                        {isAr ? 'مركز قيادة وتتبع طلبات قطع الغيار' : 'Spare Parts Command & Control Center'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 md:flex-none group">
                        <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-4 text-white/20 group-focus-within:text-gold-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={isAr ? 'بحث سريع...' : 'Quick search...'}
                            className="w-full md:w-64 bg-[#050505] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:border-gold-500/50 focus:bg-[#080808] outline-none transition-all placeholder:text-white/10 font-bold shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {isLoading && (
                            <div className="absolute top-1/2 -translate-y-1/2 right-4">
                                <Loader2 size={14} className="text-gold-500 animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Filter */}
                    <div className="relative" ref={dropdownRef}>
                        <div 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all cursor-pointer font-black uppercase tracking-tighter shadow-xl text-xs ${
                            isFilterOpen ? 'bg-white/10 border-gold-500 text-gold-500' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'
                        }`}>
                            <Filter size={16} className={isFilterOpen ? 'text-gold-500' : 'text-gold-500/50'} />
                            <span className="min-w-[80px]">{statuses.find(s => s.value === filterStatus)?.label}</span>
                            <ChevronDown size={14} className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </div>

                        <AnimatePresence>
                            {isFilterOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full mt-3 right-0 w-64 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-[100]"
                                >
                                    <div className="p-2 space-y-1">
                                        {statuses.map((status) => (
                                            <div
                                                key={status.value}
                                                onClick={() => {
                                                    setFilterStatus(status.value);
                                                    setIsFilterOpen(false);
                                                }}
                                                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer group ${
                                                    filterStatus === status.value 
                                                    ? 'bg-gold-500 text-black font-black' 
                                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                                }`}
                                            >
                                                <span className="text-xs font-bold uppercase tracking-tight">{status.label}</span>
                                                {filterStatus === status.value && <div className="w-1.5 h-1.5 rounded-full bg-black shadow-sm" />}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Export */}
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-600 active:bg-gold-700 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-2xl shadow-gold-500/20 active:scale-95 group"
                    >
                        <Download size={16} className="group-hover:bounce" />
                        <span>{isAr ? 'تصدير' : 'Export'}</span>
                    </button>
                </div>
            </div>

            {/* Orders Feed */}
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {orders.map((order, idx) => (
                    <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (idx % 20) * 0.05 }}
                    >
                        <GlassCard 
                            onClick={() => handleRowClick(order.id)}
                            className="relative overflow-hidden group cursor-pointer border-white/5 hover:border-gold-500/30 transition-all duration-500 hover:-translate-y-2 p-0 h-full"
                        >
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-gold-500/50 via-white/10 to-transparent" />
                            
                            <div className="p-6 space-y-5 flex flex-col h-full">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg">
                                                <span className="text-[10px] font-mono font-black text-gold-500 tracking-tighter">#{String(order.id).slice(0, 8).toUpperCase()}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <Badge status={order.status} className="scale-90 origin-left" />
                                                {order.shipments?.[0] && !['CANCELLED', 'AWAITING_OFFERS', 'AWAITING_PAYMENT'].includes(order.status) && (
                                                    <Badge status={order.shipments[0].status as StatusType} className="scale-75 origin-left animate-in fade-in zoom-in duration-500" />
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500/20 to-transparent flex items-center justify-center border border-white/5 overflow-hidden">
                                                {order.customer?.avatar ? (
                                                    <img src={order.customer.avatar} alt={order.customer.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={18} className="text-gold-500/40" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white/90 truncate max-w-[140px]">{order.customer?.name || 'Customer'}</h3>
                                                <p className="text-[10px] text-gold-500/40 font-bold uppercase tracking-widest">{order.customer?.customerCode || 'ID_SYNC'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">{isAr ? 'تاريخ الطلب' : 'DATE'}</p>
                                        <p className="text-xs font-mono font-bold text-white/60">{order.date}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 p-4 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden flex-grow">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-white/20">
                                            <Package size={12} />
                                            <span className="text-[10px] font-black uppercase tracking-tighter">{isAr ? 'القطعة' : 'Part'}</span>
                                        </div>
                                        <p className="text-xs font-bold text-white group-hover:text-gold-400 transition-colors truncate">
                                            {order.part}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-white/20">
                                            <Car size={12} />
                                            <span className="text-[10px] font-black uppercase tracking-tighter">{isAr ? 'السيارة' : 'Vehicle'}</span>
                                        </div>
                                        <p className="text-xs font-bold text-white truncate">{order.car}</p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-2">
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">{isAr ? 'القيمة الإجمالية' : 'ESTIMATED VALUE'}</p>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xl font-black text-white font-mono leading-none flex items-center gap-2">
                                                {Number(order.price || 0).toLocaleString()} AED
                                                {['PREPARATION', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(String(order.status).toUpperCase()) && (
                                                    <CheckCircle2 size={16} className="text-green-500" />
                                                )}
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full border border-white/5 bg-white/5 flex items-center justify-center group-hover:bg-gold-500 group-hover:text-black transition-all">
                                        <ArrowRight size={20} className={`text-white group-hover:translate-x-1 transition-transform ${isAr ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            {/* Scroll Sentinel */}
            <div 
                ref={observerTarget} 
                className="w-full h-24 flex items-center justify-center border-t border-white/5 mt-10"
            >
                {isFetchingMore ? (
                    <div className="flex flex-col items-center gap-2">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        >
                            <Loader2 className="text-gold-500" size={24} />
                        </motion.div>
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">{isAr ? 'جلب المزيد...' : 'SYSTEM SYNC...'}</p>
                    </div>
                ) : !hasMore && orders.length > 0 ? (
                    <div className="flex flex-col items-center gap-2">
                         <div className="h-0.5 w-8 bg-gold-500/20 rounded-full mb-1"></div>
                         <p className="text-white/10 text-[9px] font-black uppercase tracking-[0.4em]">
                            {isAr ? 'نهاية السجل المدقق' : 'END OF AUDIT TRAIL'}
                         </p>
                    </div>
                ) : null}
            </div>

            {/* Empty State */}
            {!isLoading && orders.length === 0 && (
                <GlassCard className="p-32 flex flex-col items-center justify-center text-center space-y-6 border-dashed border-white/10">
                    <div className="w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/5 shadow-2xl">
                        <Package size={44} className="text-white/10" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">{isAr ? 'لا يوجد نتائج' : 'NO RESULTS FOUND'}</h2>
                        <p className="text-xs text-white/30 font-bold uppercase tracking-widest">{isAr ? 'لم نجد أي طلبات مطابقة لهذا البحث' : 'System query returned 0 matches for this segment'}</p>
                    </div>
                    <button 
                        onClick={() => { setSearchQuery(''); setFilterStatus('ALL'); }}
                        className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest rounded-xl border border-white/10 transition-all"
                    >
                        {isAr ? 'إعادة ضبط النظام' : 'RESET SYSTEM PARAMETERS'}
                    </button>
                </GlassCard>
            )}
        </div>
    );
};
