
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useCustomerStore } from '../../../stores/useCustomerStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Search, Filter, Eye, Lock, Unlock, User, Mail, Phone, DollarSign, Target, Loader2, Users, Sparkles, ShieldCheck } from 'lucide-react';

interface CustomerManagementProps {
    onNavigate?: (path: string, id: any) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const { customers, fetchCustomers, toggleStatus, isLoading } = useCustomerStore();
    const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all');
    const [search, setSearch] = useState('');

    const isAr = language === 'ar';

    useEffect(() => {
        fetchCustomers();
    }, []);

    const filteredCustomers = customers.filter(c => {
        const matchesFilter = filter === 'all' || (c.status || '').toLowerCase() === filter;
        const matchesSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
            c.phone?.includes(search);
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* --- Phase 1: Modernized Header & Global Control Center --- */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-4 border-b border-white/5">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gold-500/10 flex items-center justify-center text-gold-500 border border-gold-500/20 shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                            <Users size={24} />
                        </div>
                        <h1 className="text-4xl font-black text-white italic tracking-tighter flex items-center gap-3">
                            {isAr ? 'إدارة العملاء' : 'Customer Management'}
                            {isLoading && <Loader2 size={24} className="animate-spin text-gold-500/50" />}
                        </h1>
                    </div>
                    <p className="text-white/40 text-sm font-medium max-w-xl leading-relaxed">
                        {isAr 
                            ? 'نظرة شمولية على قاعدة العملاء، مراقبة النشاط، وإدارة صلاحيات الوصول للمنصة بدقة متناهية.' 
                            : 'A holistic view of the customer base, monitoring activity, and managing platform access permissions with high precision.'}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    {/* Glass Search Hub */}
                    <div className="relative group w-full sm:w-80">
                        <div className="absolute inset-0 bg-gold-500/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <Search size={18} className="absolute top-1/2 -translate-y-1/2 left-4 text-white/20 group-focus-within:text-gold-500 transition-colors z-10" />
                        <input
                            type="text"
                            placeholder={isAr ? 'بحث عن عميل، إيميل، أو رقم...' : 'Search for customer, email, or number...'}
                            className={`w-full bg-[#0a0a0a]/60 backdrop-blur-md border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold text-white placeholder:text-white/20 focus:border-gold-500/50 outline-none transition-all relative z-10 ${isAr ? 'text-right' : 'text-left'}`}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Filter Segment Control */}
                    <div className="flex p-1.5 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                        {[
                            { id: 'all', label: isAr ? 'الكل' : 'All', color: 'gold' },
                            { id: 'active', label: isAr ? 'نشط' : 'Active', color: 'green' },
                            { id: 'suspended', label: isAr ? 'محظور' : 'Banned', color: 'red' }
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => setFilter(btn.id as any)}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                                    filter === btn.id 
                                        ? 'bg-gold-500 text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                                        : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                                }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- Phase 2 & 3: Luxury Customer Card List & Skeletons --- */}
            <div className="space-y-4">
                {isLoading ? (
                    // Premium Skeleton Loader
                    [...Array(5)].map((_, i) => (
                        <GlassCard key={`skeleton-${i}`} className="p-6 border-white/5 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent skeleton-sweep" />
                            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1.5fr_1fr] items-center gap-8 opacity-50">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 animate-pulse" />
                                    <div className="space-y-2">
                                        <div className="w-32 h-4 bg-white/10 rounded animate-pulse" />
                                        <div className="w-20 h-2 bg-white/5 rounded animate-pulse" />
                                    </div>
                                </div>
                                <div className="px-6 space-y-3 lg:border-x border-white/5">
                                    <div className="w-40 h-3 bg-white/5 rounded animate-pulse" />
                                    <div className="w-24 h-2 bg-white/5 rounded animate-pulse" />
                                </div>
                                <div className="flex items-center gap-6 justify-between lg:justify-self-end">
                                    <div className="w-24 h-8 bg-white/5 rounded-xl animate-pulse" />
                                    <div className="flex gap-2">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl animate-pulse" />
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    ))
                ) : (
                    filteredCustomers.map(customer => (
                        <GlassCard key={customer.id} className="p-6 border-white/5 hover:border-gold-500/20 transition-all group overflow-hidden relative">
                            {/* Decorative background glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 blur-[80px] -z-10 group-hover:bg-gold-500/10 transition-colors" />
                            
                            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1.5fr_1fr] items-center gap-8 relative z-10">
                                {/* --- Section 1: Customer Identity --- */}
                                <div className="flex items-center gap-5 min-w-0">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-600/20 to-gold-400/20 p-[1px] shadow-2xl group-hover:scale-105 transition-transform duration-500 shrink-0">
                                        <div className="w-full h-full rounded-2xl bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                                            {customer.avatar ? (
                                                <img src={customer.avatar} alt={customer.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            ) : (
                                                <User size={28} className="text-gold-500/40" />
                                            )}
                                        </div>
                                    </div>
                                <div className="min-w-0">
                                    <h2 className="text-lg font-black text-white group-hover:text-gold-500 transition-colors tracking-tight truncate mb-1">
                                        {customer.name}
                                    </h2>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 italic">
                                        <Sparkles size={12} className="text-gold-500/50" />
                                        {isAr ? 'عضو منذ' : 'Member since'}: {new Date(customer.joinedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}
                                    </div>
                                </div>
                            </div>

                            {/* --- Section 2: Contact & Financial Hub --- */}
                            <div className={`flex flex-col gap-3 px-6 lg:border-x border-white/5 ${isAr ? 'lg:text-right' : 'lg:text-left'}`}>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-xs font-black text-white/80 truncate">
                                        <Mail size={12} className="text-blue-500/50 shrink-0" />
                                        {customer.email}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 truncate">
                                        <Phone size={11} className="text-gold-500/50 shrink-0" />
                                        {customer.phone}
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-white/5 flex items-center gap-4">
                                    <div>
                                        <div className="text-[8px] text-white/20 font-black uppercase tracking-widest mb-0.5 italic">
                                            {isAr ? 'القيمة الشرائية (LTV)' : 'Lifetime Value (LTV)'}
                                        </div>
                                        <div className="text-xs font-mono font-black text-green-400 flex items-center gap-1">
                                            <DollarSign size={10} />
                                            {customer.ltv?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div className="w-px h-6 bg-white/5" />
                                    <div>
                                        <div className="text-[8px] text-white/20 font-black uppercase tracking-widest mb-0.5 italic">
                                            {isAr ? 'المستوى' : 'Tier'}
                                        </div>
                                        <div className="text-[10px] font-black text-gold-500/80 italic">
                                            {customer.ltv > 5000 ? 'GOLD' : customer.ltv > 1000 ? 'SILVER' : 'BRONZE'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- Section 3: Performance & Interaction --- */}
                            <div className="flex items-center gap-6 justify-between lg:justify-self-end">
                                <div className="space-y-3">
                                    <div className="text-start lg:text-right">
                                        <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-1 italic">
                                            {isAr ? 'نسبة النجاح' : 'Success Rate'}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-1000 ${customer.successRate > 70 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`}
                                                    style={{ width: `${customer.successRate || 0}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-white/60">{customer.successRate || 0}%</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] px-3 py-1 rounded-full font-black tracking-widest uppercase border ${
                                            customer.status === 'ACTIVE' 
                                                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                            {customer.status || 'ACTIVE'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onNavigate && onNavigate('customer-profile', customer.id)}
                                        className="w-12 h-12 bg-white/5 hover:bg-gold-500 text-gold-500 hover:text-white rounded-2xl flex items-center justify-center transition-all duration-300 border border-white/10 group-active:scale-90 shadow-xl"
                                        title={isAr ? 'التفاصيل' : 'Details'}
                                    >
                                        <Eye size={20} />
                                    </button>
                                    <button
                                        onClick={() => toggleStatus(customer.id)}
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border group-active:scale-90 shadow-xl ${
                                            customer.status === 'ACTIVE'
                                                ? 'bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border-red-500/20'
                                                : 'bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white border-green-500/20'
                                        }`}
                                        title={customer.status === 'ACTIVE' ? (isAr ? 'حظر' : 'Ban') : (isAr ? 'إلغاء الحظر' : 'Unban')}
                                    >
                                        {customer.status === 'ACTIVE' ? <Lock size={20} /> : <Unlock size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                    ))
                )}

                {filteredCustomers.length === 0 && !isLoading && (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/10 border border-white/5">
                            <Users size={40} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-white font-bold">{isAr ? 'لا يوجد عملاء مطابقين' : 'No matching customers found'}</h3>
                            <p className="text-white/30 text-xs">{isAr ? 'حاول استخدام كلمات بحث أخرى' : 'Try using different search terms'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
