import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { CheckCircle, XCircle, UserCog } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { client } from '../../../services/api/client';
import { supabase } from '../../../services/supabase';
import { AdminSearchInput } from './AdminSearchInput';

interface ProfileChangeRequest {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    field: 'email' | 'phone';
    oldValue: string | null;
    newValue: string;
    status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
    requestedAt: string;
    userRole: string;
}

export const ProfileChangeRequests: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchRequests = useCallback(async (search?: string) => {
        try {
            const res = await client.get('/admin/profile-changes', {
                params: search?.trim() ? { search: search.trim() } : undefined,
            });
            const mapped = (res.data || []).map((r: any) => ({
                id: r.id,
                userId: r.userId,
                userName: r.user?.name || 'Unknown',
                userEmail: r.user?.email || '',
                userPhone: r.user?.phone || '',
                field: r.field,
                oldValue: r.oldValue,
                newValue: r.newValue,
                status: r.status,
                requestedAt: r.requestedAt,
                userRole: r.user?.role || 'VENDOR',
            }));
            setRequests(mapped);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const channel = supabase
            .channel('profile-change-live')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profile_change_requests' },
                () => fetchRequests(searchTerm),
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchRequests, searchTerm]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            fetchRequests(searchTerm);
        }, 400);
        return () => window.clearTimeout(timer);
    }, [searchTerm, fetchRequests]);

    const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
        let rejectionReason: string | undefined;
        if (action === 'REJECT') {
            rejectionReason = window.prompt(isAr ? 'سبب الرفض (اختياري):' : 'Rejection reason (optional):') || undefined;
        }
        if (!window.confirm(isAr ? 'هل أنت متأكد من هذا الإجراء؟' : 'Are you sure about this action?')) return;

        try {
            await client.post(`/admin/profile-changes/${id}/resolve`, { action, rejectionReason });
            setRequests((prev) =>
                prev.map((r) =>
                    r.id === id ? { ...r, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : r,
                ),
            );
        } catch (err: any) {
            alert(err.response?.data?.message || (isAr ? 'فشلت العملية' : 'Action failed'));
        }
    };

    const fieldLabel = (field: 'email' | 'phone') =>
        field === 'email' ? (isAr ? 'البريد' : 'Email') : isAr ? 'الجوال' : 'Phone';

    return (
        <GlassCard className="p-6 mt-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <UserCog className="text-blue-400" />
                    {isAr ? 'طلبات تغيير بيانات التجار' : 'Merchant Profile Change Requests'}
                </h3>

                <AdminSearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder={isAr ? 'بحث...' : 'Search...'}
                    className="w-72"
                />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/[0.05] text-[10px] text-white/30 uppercase tracking-[0.15em] font-black bg-black/20">
                            <th className="py-4 px-4">{isAr ? 'التاجر' : 'Merchant'}</th>
                            <th className="py-4 px-4 text-center">{isAr ? 'الحقل' : 'Field'}</th>
                            <th className="py-4 px-4 text-center">{isAr ? 'القديم → الجديد' : 'Old → New'}</th>
                            <th className="py-4 px-4">{isAr ? 'التاريخ' : 'Date'}</th>
                            <th className="py-4 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                            <th className="py-4 px-4 text-end">{isAr ? 'إجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-white/40">
                                    {isAr ? 'جاري التحميل...' : 'Loading...'}
                                </td>
                            </tr>
                        ) : requests.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-white/30">
                                    {isAr ? 'لا توجد طلبات معلقة' : 'No pending requests'}
                                </td>
                            </tr>
                        ) : (
                            requests.map((req) => (
                                <tr key={req.id} className="hover:bg-white/[0.02]">
                                    <td className="py-4 px-4">
                                        <div className="text-sm text-white font-bold">{req.userName}</div>
                                        <div className="text-[10px] text-white/30">{req.userEmail}</div>
                                    </td>
                                    <td className="py-4 px-4 text-center text-xs text-gold-500 font-bold">
                                        {fieldLabel(req.field)}
                                    </td>
                                    <td className="py-4 px-4 text-center" dir="ltr">
                                        <span className="text-white/30 line-through text-xs">{req.oldValue || '—'}</span>
                                        <span className="text-gold-500 mx-2">→</span>
                                        <span className="text-white text-sm font-mono">{req.newValue}</span>
                                    </td>
                                    <td className="py-4 px-4 text-xs text-white/50">
                                        {new Date(req.requestedAt).toLocaleString(isAr ? 'ar-AE' : 'en-US')}
                                    </td>
                                    <td className="py-4 px-4">
                                        {req.status === 'PENDING_REVIEW' ? (
                                            <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                                                {isAr ? 'قيد المراجعة' : 'Pending'}
                                            </span>
                                        ) : req.status === 'APPROVED' ? (
                                            <span className="text-[10px] font-black uppercase text-green-400">Approved</span>
                                        ) : (
                                            <span className="text-[10px] font-black uppercase text-red-400">Rejected</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-end">
                                        {req.status === 'PENDING_REVIEW' && (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleAction(req.id, 'APPROVE')}
                                                    className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                                    title="Approve"
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, 'REJECT')}
                                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                    title="Reject"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </GlassCard>
    );
};
