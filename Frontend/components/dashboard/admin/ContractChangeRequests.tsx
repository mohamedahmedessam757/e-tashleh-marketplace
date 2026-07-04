import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { CheckCircle, XCircle, FilePenLine } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { client } from '../../../services/api/client';
import { supabase } from '../../../services/supabase';
import { AdminSearchInput } from './AdminSearchInput';
import { AdminSignatureModal } from './AdminSignatureModal';

interface ContractChangeRequest {
    id: string;
    storeId: string;
    storeName: string;
    storeCode: string;
    userId: string;
    userName: string;
    userEmail: string;
    oldSecondPartyData: Record<string, string>;
    newSecondPartyData: Record<string, string>;
    status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
    requestedAt: string;
}

const SECOND_PARTY_FIELDS = [
    { key: 'companyName', labelEn: 'Company', labelAr: 'الشركة' },
    { key: 'managerName', labelEn: 'Manager', labelAr: 'المدير' },
    { key: 'crNumber', labelEn: 'CR Number', labelAr: 'رقم السجل' },
    { key: 'licenseNumber', labelEn: 'License', labelAr: 'الرخصة' },
    { key: 'licenseExpiry', labelEn: 'License Expiry', labelAr: 'انتهاء الرخصة' },
    { key: 'emirate', labelEn: 'Emirate', labelAr: 'الإمارة' },
    { key: 'country', labelEn: 'Country', labelAr: 'الدولة' },
] as const;

function formatAdminSignature(sigData: {
    adminSignatureName: string;
    adminSignatureType: 'DRAWN' | 'TYPED';
    adminSignatureText?: string;
    adminSignatureImage?: string;
}) {
    return JSON.stringify({
        name: sigData.adminSignatureName,
        type: sigData.adminSignatureType,
        value: sigData.adminSignatureType === 'TYPED'
            ? sigData.adminSignatureText
            : sigData.adminSignatureImage,
    });
}

export const ContractChangeRequests: React.FC = () => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const cc = t.admin.security.contractChanges;
    const [requests, setRequests] = useState<ContractChangeRequest[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<'APPROVE' | 'REJECT' | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    const fetchRequests = useCallback(async (search?: string) => {
        try {
            const res = await client.get('/admin/contract-changes', {
                params: search?.trim() ? { search: search.trim() } : undefined,
            });
            const mapped = (res.data || []).map((r: any) => ({
                id: r.id,
                storeId: r.storeId,
                storeName: r.store?.name || 'Unknown',
                storeCode: r.store?.storeCode || '',
                userId: r.userId,
                userName: r.user?.name || 'Unknown',
                userEmail: r.user?.email || '',
                oldSecondPartyData: (r.oldSecondPartyData || {}) as Record<string, string>,
                newSecondPartyData: (r.newSecondPartyData || {}) as Record<string, string>,
                status: r.status,
                requestedAt: r.requestedAt,
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
            .channel('contract-change-live')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'contract_change_requests' },
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

    const navigateToStore = (storeId: string) => {
        window.dispatchEvent(new CustomEvent('admin-nav', { detail: { path: 'store-profile', id: storeId, tab: 'contract' } }));
    };

    const openActionModal = (id: string, action: 'APPROVE' | 'REJECT') => {
        setSelectedRequestId(id);
        setPendingAction(action);
        setIsSignatureModalOpen(true);
    };

    const handleSignatureConfirm = async (sigData: {
        adminSignatureName: string;
        adminSignatureType: 'DRAWN' | 'TYPED';
        adminSignatureText?: string;
        adminSignatureImage?: string;
        adminReviewDetails?: string;
    }) => {
        if (!selectedRequestId || !pendingAction) return;

        await client.post(`/admin/contract-changes/${selectedRequestId}/resolve`, {
            action: pendingAction,
            adminSignature: formatAdminSignature(sigData),
            rejectionReason: pendingAction === 'REJECT' ? sigData.adminReviewDetails : undefined,
        });

        setRequests((prev) =>
            prev.map((r) =>
                r.id === selectedRequestId
                    ? { ...r, status: pendingAction === 'APPROVE' ? 'APPROVED' : 'REJECTED' }
                    : r,
            ),
        );

        setIsSignatureModalOpen(false);
        setSelectedRequestId(null);
        setPendingAction(null);
    };

    const getChangedFields = (req: ContractChangeRequest) =>
        SECOND_PARTY_FIELDS.filter(({ key }) => {
            const oldVal = req.oldSecondPartyData[key] || '';
            const newVal = req.newSecondPartyData[key] || '';
            return oldVal !== newVal;
        });

    return (
        <>
            <GlassCard className="p-6 mt-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <FilePenLine className="text-amber-400" />
                        {cc.title}
                    </h3>

                    <AdminSearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder={cc.search}
                        className="w-72"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/[0.05] text-[10px] text-white/30 uppercase tracking-[0.15em] font-black bg-black/20">
                                <th className="py-4 px-4">{cc.merchant}</th>
                                <th className="py-4 px-4 text-center">{cc.changes}</th>
                                <th className="py-4 px-4">{cc.date}</th>
                                <th className="py-4 px-4">{cc.status}</th>
                                <th className="py-4 px-4 text-end">{cc.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-white/40">
                                        {cc.loading}
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-white/30">
                                        {cc.empty}
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => {
                                    const changedFields = getChangedFields(req);
                                    return (
                                        <tr key={req.id} className="hover:bg-white/[0.02]">
                                            <td className="py-4 px-4">
                                                <button
                                                    type="button"
                                                    onClick={() => navigateToStore(req.storeId)}
                                                    className="text-left hover:text-gold-400 transition-colors"
                                                >
                                                    <div className="text-sm text-white font-bold">{req.storeName}</div>
                                                    <div className="text-[10px] text-white/30">{req.storeCode} · {req.userEmail}</div>
                                                </button>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="space-y-2">
                                                    {changedFields.length === 0 ? (
                                                        <span className="text-xs text-white/30">{isAr ? '—' : '—'}</span>
                                                    ) : (
                                                        changedFields.map(({ key, labelEn, labelAr }) => (
                                                            <div key={key} className="text-xs" dir="ltr">
                                                                <span className="text-gold-500 font-bold">{isAr ? labelAr : labelEn}:</span>{' '}
                                                                <span className="text-white/30 line-through">{req.oldSecondPartyData[key] || '—'}</span>
                                                                <span className="text-gold-500 mx-1">→</span>
                                                                <span className="text-white">{req.newSecondPartyData[key] || '—'}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-xs text-white/50">
                                                {new Date(req.requestedAt).toLocaleString(isAr ? 'ar-AE' : 'en-US')}
                                            </td>
                                            <td className="py-4 px-4">
                                                {req.status === 'PENDING_REVIEW' ? (
                                                    <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                                                        {cc.pending}
                                                    </span>
                                                ) : req.status === 'APPROVED' ? (
                                                    <span className="text-[10px] font-black uppercase text-green-400">{cc.approved}</span>
                                                ) : (
                                                    <span className="text-[10px] font-black uppercase text-red-400">{cc.rejected}</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-end">
                                                {req.status === 'PENDING_REVIEW' && (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => openActionModal(req.id, 'APPROVE')}
                                                            className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                                            title={cc.approve}
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => openActionModal(req.id, 'REJECT')}
                                                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                            title={cc.reject}
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <AdminSignatureModal
                isOpen={isSignatureModalOpen}
                onClose={() => {
                    setIsSignatureModalOpen(false);
                    setSelectedRequestId(null);
                    setPendingAction(null);
                }}
                onConfirm={handleSignatureConfirm}
                actionType={pendingAction || 'APPROVE'}
                title={
                    pendingAction === 'REJECT'
                        ? (isAr ? 'رفض تعديل العقد' : 'Reject Contract Amendment')
                        : (isAr ? 'اعتماد تعديل العقد' : 'Approve Contract Amendment')
                }
                subtitle={
                    pendingAction === 'REJECT'
                        ? (isAr ? 'يرجى كتابة سبب الرفض والتوقيع لإبلاغ التاجر.' : 'Please provide a rejection reason and sign to notify the merchant.')
                        : (isAr ? 'يرجى التوقيع لاعتماد التعديل وتفعيل النسخة الجديدة من العقد.' : 'Please sign to approve the amendment and activate the new contract version.')
                }
            />
        </>
    );
};
