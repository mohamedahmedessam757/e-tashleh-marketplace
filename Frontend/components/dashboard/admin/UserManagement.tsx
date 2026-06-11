
import React, { useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useVendorStore } from '../../../stores/useVendorStore';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CheckCircle2, XCircle, Search, FileText, Eye, ShieldAlert } from 'lucide-react';

export const UserManagement: React.FC = () => {
    const { t, language } = useLanguage();
    const { vendorStatus, adminApproveVendor, adminRejectVendor } = useVendorStore();
    const { currentAdmin } = useAdminStore();
    const [filter, setFilter] = useState<'all' | 'pending'>('all');

    const isAr = language === 'ar';
    const hasWriteAccess = currentAdmin?.role === 'SUPER_ADMIN' || currentAdmin?.role === 'ADMIN';

    // Mock Users List (In real app, this comes from API)
    const users = [
        { id: 1, name: 'Mohammed Ali', role: 'Vendor', status: vendorStatus, company: 'My Store' },
        { id: 2, name: 'Khalid Omar', role: 'Customer', status: 'ACTIVE', company: '-' },
        { id: 3, name: 'Sarah Ahmed', role: 'Customer', status: 'ACTIVE', company: '-' },
    ];

    const filteredUsers = filter === 'pending'
        ? users.filter(u => u.status === 'PENDING_REVIEW' || u.status === 'PENDING_DOCUMENTS')
        : users;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">{t.admin.users}</h1>
                <div className="flex gap-2">
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold ${filter === 'all' ? 'bg-gold-500 text-white' : 'bg-white/10 text-white/50'}`}>{t.admin.usersTable.filters.all}</button>
                    <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg text-sm font-bold ${filter === 'pending' ? 'bg-gold-500 text-white' : 'bg-white/10 text-white/50'}`}>{t.admin.usersTable.filters.pending}</button>
                </div>
            </div>

            {!hasWriteAccess && (
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 flex items-center gap-3">
                    <ShieldAlert className="text-blue-400" size={20} />
                    <span className="text-sm text-blue-200">
                        {t.admin.usersTable.readOnly}
                    </span>
                </div>
            )}

            <GlassCard className="p-0 overflow-hidden bg-[#151310]">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-xs text-white/40 uppercase">
                        <tr>
                            <th className={`p-4 ${isAr ? 'text-right' : 'text-left'}`}>{t.admin.usersTable.name}</th>
                            <th className={`p-4 ${isAr ? 'text-right' : 'text-left'}`}>{t.admin.usersTable.role}</th>
                            <th className={`p-4 ${isAr ? 'text-right' : 'text-left'}`}>{t.admin.usersTable.status}</th>
                            <th className={`p-4 ${isAr ? 'text-right' : 'text-left'}`}>{t.admin.usersTable.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-white">{user.name}</div>
                                    <div className="text-xs text-white/40">{user.company}</div>
                                </td>
                                <td className="p-4 text-sm text-white/70">{user.role}</td>
                                <td className="p-4">
                                    <span className={`text-[10px] px-2 py-1 rounded border ${user.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            user.status === 'PENDING_REVIEW' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse' :
                                                'bg-white/10 text-white/50'
                                        }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {user.role === 'Vendor' && (user.status === 'PENDING_REVIEW' || user.status === 'PENDING_DOCUMENTS') && (
                                        <div className="flex gap-2">
                                            {/* Action Buttons: Only for Admins */}
                                            {hasWriteAccess ? (
                                                <>
                                                    <button
                                                        onClick={() => adminApproveVendor(String(user.id))}
                                                        className="p-2 bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white rounded-lg transition-colors" title={t.common.approve}
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const reason = prompt(isAr ? 'أدخل سبب الرفض:' : 'Enter rejection reason:');
                                                            if (reason) adminRejectVendor(String(user.id), reason);
                                                        }}
                                                        className="p-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-colors" title={t.common.reject}
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-white/30 italic">No actions</span>
                                            )}

                                            {/* View Docs: Available to Everyone (including Support) */}
                                            <button className="p-2 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg transition-colors" title="View Docs">
                                                <FileText size={16} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </GlassCard>
        </div>
    );
};
