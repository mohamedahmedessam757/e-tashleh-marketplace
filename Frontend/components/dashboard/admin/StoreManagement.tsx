
import React, { useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useAdminStore, Vendor } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ShieldAlert, Store, Search, Filter, Eye, User, Mail, Calendar, ChevronRight, Hash } from 'lucide-react';

interface StoreManagementProps {
    onNavigate?: (path: string, id: any) => void;
}

export const StoreManagement: React.FC<StoreManagementProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const { stores, subscribeToStores, unsubscribeFromStores, isLoadingStores } = useAdminStore();
    const [filter, setFilter] = useState<'all' | 'pending'>('all');
    const [search, setSearch] = useState('');

    const isAr = language === 'ar';

    React.useEffect(() => {
        subscribeToStores();
        return () => unsubscribeFromStores();
    }, []);

    const filteredStores = stores.filter(store => {
        const matchesFilter = filter === 'all' || (filter === 'pending' && (store.status === 'PENDING_REVIEW' || store.status === 'PENDING_DOCUMENTS'));
        // Search by Name or Owner Name
        const matchesSearch =
            (store.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (store.owner?.name || '').toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE': return <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-[10px] border border-green-500/20 font-bold whitespace-nowrap">{isAr ? 'نشط' : 'Active'}</span>;
            case 'PENDING_REVIEW': return <span className="bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded text-[10px] border border-yellow-500/20 font-bold animate-pulse whitespace-nowrap">{isAr ? 'قيد المراجعة' : 'Pending Review'}</span>;
            case 'PENDING_DOCUMENTS': return <span className="bg-orange-500/10 text-orange-400 px-2 py-1 rounded text-[10px] border border-orange-500/20 font-bold whitespace-nowrap">{isAr ? 'بانتظار المستندات' : 'Pending Docs'}</span>;
            case 'LICENSE_EXPIRED': return <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded text-[10px] border border-red-500/20 font-bold whitespace-nowrap">{isAr ? 'رخصة منتهية' : 'License Expired'}</span>;
            case 'BLOCKED': return <span className="bg-black text-white/50 px-2 py-1 rounded text-[10px] border border-white/10 font-bold whitespace-nowrap">{isAr ? 'محظور' : 'Blocked'}</span>;
            default: return <span className="bg-white/10 text-white/50 px-2 py-1 rounded text-[10px] whitespace-nowrap">{isAr ? 'غير نشط' : 'Inactive'}</span>;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* --- Premium Header Section --- */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div className="flex items-center gap-4 group">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-500/20 to-transparent border border-gold-500/20 flex items-center justify-center text-gold-500 shadow-2xl shadow-gold-500/10 group-hover:scale-110 transition-transform duration-500">
                        <Store size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">
                            {isAr ? 'إدارة المتاجر' : 'Store Management'}
                        </h1>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                            {isAr ? 'التحكم المركزي في منظومة التجار' : 'Centralized Vendor Governance Hub'}
                        </p>
                    </div>
                </div>

                {/* --- Search & Filters Hub --- */}
                <GlassCard className="p-2 border-white/5 flex flex-wrap md:flex-nowrap items-center gap-2 bg-white/[0.02]">
                    <div className="relative group">
                        <Search size={16} className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} text-white/20 group-focus-within:text-gold-500 transition-colors`} />
                        <input
                            type="text"
                            placeholder={isAr ? 'ابحث عن متجر، مالك، أو رقم تعريفي...' : 'Search store, owner, or ID...'}
                            className={`bg-white/5 border border-white/5 rounded-xl ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 text-xs text-white focus:border-gold-500/50 outline-none w-64 md:w-80 transition-all placeholder:text-white/20 font-medium`}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="h-6 w-[1px] bg-white/10 mx-2 hidden md:block" />
                    <div className="flex gap-1 p-1 bg-black/20 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setFilter('all')} 
                            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all duration-300 ${filter === 'all' ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            {isAr ? 'الكل' : 'All'}
                        </button>
                        <button 
                            onClick={() => setFilter('pending')} 
                            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all duration-300 ${filter === 'pending' ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            {isAr ? 'قيد الانتظار' : 'Pending'}
                        </button>
                    </div>
                </GlassCard>
            </div>

            <div className="grid gap-4">
                {isLoadingStores ? (
                    [...Array(6)].map((_, i) => (
                        <GlassCard key={i} className="p-6 border-white/5 animate-pulse">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5" />
                                    <div className="space-y-2">
                                        <div className="w-32 h-4 bg-white/10 rounded" />
                                        <div className="w-48 h-3 bg-white/5 rounded" />
                                    </div>
                                </div>
                                <div className="w-24 h-8 bg-white/10 rounded-xl" />
                            </div>
                        </GlassCard>
                    ))
                ) : filteredStores.length > 0 ? (
                    filteredStores.map(store => (
                        <GlassCard key={store.id} className="p-6 border-white/5 hover:border-gold-500/20 transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 blur-[80px] -z-10 group-hover:bg-gold-500/10 transition-colors" />
                            
                            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1.2fr_0.8fr] items-center gap-8 relative z-10">
                                {/* --- Section 1: Store Bio --- */}
                                <div className="flex items-center gap-5 min-w-0">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/30 group-hover:text-gold-500 group-hover:bg-gold-500/5 transition-all duration-500 shadow-inner shrink-0 overflow-hidden">
                                        {store.logo ? (
                                            <img src={store.logo} alt={store.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                                        ) : (
                                            <Store size={28} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-lg font-black text-white group-hover:text-gold-500 transition-colors tracking-tight truncate">
                                                {store.name}
                                            </h2>
                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded text-[8px] font-mono text-white/30 border border-white/5 shrink-0">
                                                <Hash size={8} />
                                                {store.id.slice(0, 8).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-white/40 italic">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12} className="opacity-50" />
                                                {new Date(store.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* --- Section 2: Owner Info --- */}
                                <div className={`flex items-center gap-4 px-6 lg:border-x border-white/5 ${isAr ? 'lg:text-right' : 'lg:text-left'}`}>
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 shrink-0">
                                        <User size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-1 italic">
                                            {isAr ? 'المالك المعتمد' : 'Authorized Owner'}
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-xs font-black text-white/80 truncate">
                                                {store.owner?.name || 'Unknown'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 truncate">
                                                <Mail size={10} className="text-blue-500/50 shrink-0" />
                                                {store.owner?.email}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* --- Section 3: Status & Action --- */}
                                <div className="flex items-center gap-6 justify-between lg:justify-self-end">
                                    <div className="text-start lg:text-right">
                                        <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-2 italic">
                                            {isAr ? 'حالة المنصة' : 'Platform Status'}
                                        </div>
                                        {getStatusBadge(store.status)}
                                    </div>
                                    <button
                                        onClick={() => onNavigate && onNavigate('store-profile', store.id)}
                                        className="w-12 h-12 bg-white/5 hover:bg-gold-500 text-gold-500 hover:text-white rounded-2xl flex items-center justify-center transition-all duration-300 border border-white/10 group-active:scale-90 shadow-xl shrink-0"
                                    >
                                        <Eye size={20} />
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    ))
                ) : (
                    <GlassCard className="p-20 text-center flex flex-col items-center justify-center opacity-50 border-dashed border-white/10">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <Store size={40} className="text-white/20" />
                        </div>
                        <p className="text-white/50 font-black uppercase tracking-widest text-xs italic">
                            {isAr ? 'لا توجد متاجر تطابق بحثك حالياً' : 'No commercial entities matched your criteria'}
                        </p>
                    </GlassCard>
                )}
            </div>
        </div>
    );
};
