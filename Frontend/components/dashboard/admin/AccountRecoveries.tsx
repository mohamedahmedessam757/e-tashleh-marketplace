import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { ShieldAlert, CheckCircle, XCircle, Search, Eye, User, Store, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { client } from '../../../services/api/client';
import { supabase } from '../../../services/supabase';

interface RecoveryRequest {
    id: string;
    userId: string;
    userName: string; // Joined from user table
    oldPhone: string | null;
    newPhone: string;
    status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
    balanceSnapshot: number;
    openOrdersCount: number;
    disputesCount: number;
    createdAt: string;
    userRole: string;
}

export const AccountRecoveries: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [requests, setRequests] = useState<RecoveryRequest[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchRequests();

        // Subscribe to real-time updates for the recovery table
        const channel = supabase
            .channel('account-recovery-live')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'account_recovery_requests'
                },
                () => {
                    // Re-fetch from backend to get joined user data and accurate risk summary
                    fetchRequests();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await client.get('/auth/recovery/admin/requests');
            const data = res.data;

            const mapped = data.map((r: any) => ({
                id: r.id,
                userId: r.userId,
                userName: r.user?.name || 'Unknown',
                oldPhone: r.oldPhone,
                newPhone: r.newPhone,
                status: r.status,
                balanceSnapshot: Number(r.balanceSnapshot),
                openOrdersCount: r.openOrdersCount,
                disputesCount: r.disputesCount,
                createdAt: r.createdAt,
                userRole: r.userRole
            }));
            setRequests(mapped);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
        if (!window.confirm(isAr ? 'هل أنت متأكد من هذا الإجراء؟' : 'Are you sure about this action?')) return;

        try {
            await client.post('/auth/recovery/admin/resolve', { requestId: id, action });

            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : r));
        } catch (err) {
            alert(isAr ? 'فشلت العملية' : 'Action failed');
        }
    };

    const navigateToProfile = (userId: string, role: string) => {
        // Logic to determine if user is merchant or customer based on context or request data
        // In this system, we can dispatch an admin-nav event
        const isMerchant = role === 'VENDOR' || role === 'merchant';
        const path = isMerchant ? 'store-profile' : 'customer-profile';
        window.dispatchEvent(new CustomEvent('admin-nav', { detail: { path, id: userId } }));
    };

    const filteredRequests = requests.filter(req => 
        req.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.newPhone.includes(searchTerm) ||
        req.id.includes(searchTerm)
    );

    return (
        <GlassCard className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <ShieldAlert className="text-orange-500" />
                    {isAr ? 'مراجعات استرجاع الحسابات' : 'Account Recovery Reviews'}
                </h3>

                <div className="relative">
                    <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-white/40`} size={16} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={isAr ? 'بحث بالاسم، الرقم أو المعرف...' : 'Search name, phone or ID...'}
                        className={`bg-black/20 border border-white/10 rounded-xl ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 text-sm text-white focus:border-gold-500 outline-none w-72 transition-all shadow-inner font-medium`}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/[0.05] text-[10px] text-white/30 uppercase tracking-[0.15em] font-black bg-black/20">
                            <th className="py-5 px-6 text-start w-[10%]">{isAr ? 'رقم الطلب' : 'Request ID'}</th>
                            <th className="py-5 px-6 text-start w-[15%]">{isAr ? 'العميل' : 'Customer'}</th>
                            <th className="py-5 px-6 text-center w-[25%]">{isAr ? 'الرقم القديم ← الجديد' : 'Old → New Phone'}</th>
                            <th className="py-5 px-6 text-start w-[20%]">{isAr ? 'ملخص المخاطر/الرصيد' : 'Risk/Balance'}</th>
                            <th className="py-5 px-6 text-start w-[12%]">{isAr ? 'التاريخ' : 'Date'}</th>
                            <th className="py-5 px-6 text-start w-[10%]">{isAr ? 'الحالة' : 'Status'}</th>
                            <th className="py-5 px-6 text-end w-[8%]">{isAr ? 'إجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-white/40">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold uppercase tracking-widest">{isAr ? 'جاري التحميل...' : 'Loading Requests...'}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredRequests.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-white/20">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search size={40} strokeWidth={1} className="opacity-20 mb-2" />
                                        <span className="text-sm font-medium">
                                            {isAr ? 'لم يتم العثور على طلبات مطابقة' : 'No matching requests found'}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredRequests.map((req) => (
                            <tr key={req.id} className="group hover:bg-white/[0.02] transition-all duration-300 border-b border-white/[0.03] last:border-0 relative overflow-hidden">
                                <td className="py-6 px-6 font-mono text-[10px] text-gold-500/50 text-start w-[10%]">
                                    <span className="opacity-40">#</span>{req.id.split('-').pop()}
                                </td>
                                <td className="py-6 px-6 text-start w-[15%]">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-white font-bold tracking-tight group-hover:text-gold-500 transition-colors line-clamp-1">{req.userName}</span>
                                        <span className="text-[9px] text-white/20 uppercase tracking-tighter">Verified User</span>
                                    </div>
                                </td>
                                <td className="py-6 px-6 w-[25%] text-center">
                                    <div className="flex items-center justify-center gap-3" dir="ltr">
                                        <span className="text-white/20 text-xs font-mono line-through decoration-red-500/50">{req.oldPhone || 'N/A'}</span>
                                        <div className="flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-gold-500 animate-ping"></div>
                                            <span className="text-gold-500/40 font-black">→</span>
                                        </div>
                                        <span className="text-white font-black font-mono text-sm bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 shadow-inner">{req.newPhone}</span>
                                    </div>
                                </td>
                                <td className="py-6 px-6 text-start w-[20%]">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-base font-black tracking-tighter ${req.balanceSnapshot > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {req.balanceSnapshot.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[9px] text-white/30 font-bold uppercase">AED</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-white/40">
                                                {isAr ? 'طلبات:' : 'Orders:'} <span className="text-white/60">{req.openOrdersCount}</span>
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-white/40">
                                                {isAr ? 'نزاعات:' : 'Disputes:'} <span className="text-white/60">{req.disputesCount}</span>
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-6 px-6 text-start w-[12%]">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-white/50 font-bold">
                                            {new Date(req.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: '2-digit', month: 'short' })}
                                        </span>
                                        <span className="text-[9px] text-white/20 uppercase">{new Date(req.createdAt).getFullYear()}</span>
                                    </div>
                                </td>
                                <td className="py-6 px-6 text-start w-[10%]">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${
                                        req.status === 'APPROVED' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' :
                                        req.status === 'REJECTED' ? 'bg-red-500/5 text-red-400 border-red-500/10' :
                                        'bg-gold-500/5 text-gold-400 border-gold-500/10'
                                    }`}>
                                        <div className={`w-1 h-1 rounded-full animate-pulse ${
                                            req.status === 'APPROVED' ? 'bg-emerald-400' :
                                            req.status === 'REJECTED' ? 'bg-red-400' : 'bg-gold-400'
                                        }`}></div>
                                        <span className="text-[9px] font-black uppercase tracking-tight">
                                            {isAr ? (req.status === 'APPROVED' ? 'تم القبول' : req.status === 'REJECTED' ? 'مرفوض' : 'قيد المراجعة') : req.status}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-6 px-6 text-end w-[8%]">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => navigateToProfile(req.userId, req.userRole)}
                                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all border border-white/10 group-hover:border-white/20"
                                            title={isAr ? 'عرض الملف الشخصي' : 'View Profile'}
                                        >
                                            {req.userRole === 'VENDOR' ? <Store size={16} /> : <User size={16} />}
                                        </button>

                                        {req.status === 'PENDING_REVIEW' && (
                                            <>
                                                <button
                                                    onClick={() => handleAction(req.id, 'APPROVE')}
                                                    className="w-9 h-9 flex items-center justify-center bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl transition-all duration-300 border border-emerald-500/10 shadow-lg"
                                                    title="Approve"
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, 'REJECT')}
                                                    className="w-9 h-9 flex items-center justify-center bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 border border-red-500/10 shadow-lg"
                                                    title="Reject"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            </>
                                        )}
                                        
                                        {req.status !== 'PENDING_REVIEW' && (
                                            <button className="w-9 h-9 flex items-center justify-center text-white/10 hover:text-white transition-colors">
                                                <ExternalLink size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </GlassCard>
    );
};
