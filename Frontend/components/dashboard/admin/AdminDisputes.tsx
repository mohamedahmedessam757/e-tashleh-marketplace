
import React, { useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useResolutionStore, CaseStatus } from '../../../stores/useResolutionStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Search, Scale, AlertTriangle, Eye, RefreshCcw } from 'lucide-react';

interface AdminDisputesProps {
    onNavigate: (path: string, id: any) => void;
}

export const AdminDisputes: React.FC<AdminDisputesProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const { cases } = useResolutionStore();
    const [filter, setFilter] = useState<'all' | 'open' | 'urgent' | 'resolved'>('all');
    const [search, setSearch] = useState('');

    const isAr = language === 'ar';

    const filteredCases = cases.filter(c => {
        const matchesSearch = c.id.toLowerCase().includes(search.toLowerCase()) ||
            c.orderId.toString().includes(search) ||
            c.customerName.toLowerCase().includes(search.toLowerCase());

        if (!matchesSearch) return false;

        if (filter === 'open') return c.status === 'OPEN' || c.status === 'AWAITING_MERCHANT';
        if (filter === 'urgent') return c.status === 'AWAITING_ADMIN' || c.status === 'ESCALATED';
        if (filter === 'resolved') return c.status === 'RESOLVED' || c.status === 'REFUNDED' || c.status === 'CLOSED';
        return true;
    });

    const getStatusBadge = (status: CaseStatus) => {
        switch (status) {
            case 'AWAITING_ADMIN': 
            case 'ESCALATED': return <span className="bg-orange-500/10 text-orange-400 px-2 py-1 rounded text-[10px] border border-orange-500/20 font-bold animate-pulse">{t.admin.disputeManager.status.awaiting_admin}</span>;
            case 'OPEN': return <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded text-[10px] border border-red-500/20 font-bold">{t.admin.disputeManager.status.open}</span>;
            case 'AWAITING_MERCHANT': return <span className="bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded text-[10px] border border-yellow-500/20">{t.admin.disputeManager.status.awaiting_merchant}</span>;
            case 'RESOLVED':
            case 'REFUNDED': return <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-[10px] border border-green-500/20">{t.admin.disputeManager.status.resolved}</span>;
            default: return <span className="bg-white/10 text-white/50 px-2 py-1 rounded text-[10px]">{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Scale className="text-gold-500" />
                    {t.admin.disputes}
                </h1>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-white/30" />
                        <input
                            type="text"
                            placeholder={t.common.search}
                            className="w-full bg-[#151310] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-gold-500 outline-none md:w-64"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold ${filter === 'all' ? 'bg-gold-500 text-white' : 'bg-white/10 text-white/50'}`}>{t.common.viewAll}</button>
                    <button onClick={() => setFilter('urgent')} className={`px-4 py-2 rounded-lg text-sm font-bold ${filter === 'urgent' ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/50'}`}>{t.admin.disputeManager.status.awaiting_admin}</button>
                    <button onClick={() => setFilter('open')} className={`px-4 py-2 rounded-lg text-sm font-bold ${filter === 'open' ? 'bg-red-500 text-white' : 'bg-white/10 text-white/50'}`}>{t.admin.disputeManager.status.open}</button>
                </div>
            </div>

            <GlassCard className="p-0 overflow-hidden bg-[#151310]">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-xs text-white/40 uppercase">
                        <tr>
                            <th className={`p-4 ${isAr ? 'text-right' : 'text-left'}`}>{t.admin.disputeManager.caseId}</th>
                            <th className={`p-4 ${isAr ? 'text-right' : 'text-left'}`}>{t.admin.ordersTable.id}</th>
                            <th className={`p-4 ${isAr ? 'text-right' : 'text-left'}`}>{t.admin.customersTable.name}</th>
                            <th className={`p-4 ${isAr ? 'text-right' : 'text-left'}`}>{t.admin.usersTable.name}</th>
                            <th className={`p-4 ${isAr ? 'text-right' : 'text-left'}`}>{t.admin.usersTable.status}</th>
                            <th className={`p-4 ${isAr ? 'text-right' : 'text-left'}`}>{t.admin.usersTable.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredCases.map(c => (
                            <tr key={c.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-mono text-gold-400 font-bold">{c.id}</td>
                                <td className="p-4 text-sm text-white/70">#{c.orderId}</td>
                                <td className="p-4 text-sm text-white/70">{c.customerName}</td>
                                <td className="p-4 text-sm text-white/70">{c.merchantName}</td>
                                <td className="p-4">{getStatusBadge(c.status)}</td>
                                <td className="p-4">
                                    <button
                                        onClick={() => onNavigate('admin-dispute-details', c.id)}
                                        className="p-2 bg-white/5 hover:bg-gold-500 hover:text-white text-gold-400 rounded-lg transition-colors border border-white/10"
                                        title={t.common.details}
                                    >
                                        <Eye size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredCases.length === 0 && (
                    <div className="p-10 text-center text-white/30">{t.admin.resolution.noCases}</div>
                )}
            </GlassCard>
        </div>
    );
};
