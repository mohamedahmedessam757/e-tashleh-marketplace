import React from 'react';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Percent,
    RotateCcw,
    AlertTriangle,
    ShieldCheck,
    TrendingUp,
    Wallet,
    Activity,
    User,
    Crown,
    ChevronDown,
    History,
} from 'lucide-react';
import { BlurredSection } from './BlurredSection';
import type { UnifiedFinancialEvent } from '../../../stores/useAdminStore';

export interface FinancialFeedRowProps {
    item: UnifiedFinancialEvent;
    isAr: boolean;
    isExpanded: boolean;
    isSectionBlurred: (key: string) => boolean;
    t: any;
    onRowClick: (item: UnifiedFinancialEvent) => void;
    onToggleExpand: (id: string) => void;
    onViewAudit: (orderId: string) => void;
}

export const FinancialFeedRow = React.memo(function FinancialFeedRow({
    item,
    isAr,
    isExpanded,
    isSectionBlurred,
    t,
    onRowClick,
    onToggleExpand,
    onViewAudit,
}: FinancialFeedRowProps) {
    const isCredit = item.direction === 'CREDIT' || item.direction === 'RELEASE';
    const isDebit = item.direction === 'DEBIT';

    const breakdownParts: string[] = [];
    if (item.commission != null && item.commission > 0) breakdownParts.push(`C:${item.commission}`);
    if (item.shippingCost != null && item.shippingCost > 0) breakdownParts.push(`S:${item.shippingCost}`);
    if (item.gatewayFee != null && item.gatewayFee > 0) breakdownParts.push(`G:${item.gatewayFee}`);
    if (item.refundedAmount != null && item.refundedAmount > 0) breakdownParts.push(`R:${item.refundedAmount}`);
    if (item.unitPrice != null && item.unitPrice > 0) breakdownParts.push(`U:${item.unitPrice}`);

    const eventIcon = (() => {
        if (item.eventType.includes('PAYMENT')) return <ArrowDownLeft size={18} className="text-emerald-400" />;
        if (item.eventType.includes('WITHDRAWAL')) return <ArrowUpRight size={18} className="text-rose-400" />;
        if (item.eventType.includes('COMMISSION')) return <Percent size={18} className="text-gold-400" />;
        if (item.eventType.includes('REFUND')) return <RotateCcw size={18} className="text-amber-400" />;
        if (item.eventType.includes('PENALTY')) return <AlertTriangle size={18} className="text-rose-500" />;
        if (item.eventType.includes('ESCROW')) return <ShieldCheck size={18} className="text-blue-400" />;
        if (item.eventType.includes('PROFIT')) return <TrendingUp size={18} className="text-emerald-500" />;
        return item.source === 'WALLET'
            ? <Wallet size={18} className="text-white/40" />
            : <Activity size={18} className="text-white/40" />;
    })();

    return (
        <React.Fragment>
            <tr
                onClick={() => onRowClick(item)}
                className={`
                    hover:bg-white/[0.04] transition-colors cursor-pointer group
                    ${item.isNew ? 'financial-row-new animate-gold-pulse' : ''}
                `}
            >
                <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-300 ${
                            item.isNew
                                ? 'bg-gold-500/20 border-gold-500/30 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                                : 'bg-white/5 border-white/10 group-hover:border-white/20'
                        }`}>
                            {eventIcon}
                        </div>
                        <div>
                            <div className="font-mono text-white font-bold text-sm">
                                {isAr ? item.eventTypeAr : item.eventTypeEn}
                            </div>
                            <div className="text-[10px] text-white/30 font-black uppercase mt-1">
                                {item.source} • #{item.id.slice(-8).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </td>
                <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                        {item.orderNumber && (
                            <div className="text-xs font-black text-white/80 flex items-center gap-2">
                                <span className="text-[9px] text-white/20">ORD</span>
                                {item.orderNumber}
                            </div>
                        )}
                        <div className="text-[10px] text-white/40 font-bold flex items-center gap-2">
                            {item.customerName && (
                                <BlurredSection isBlurred={isSectionBlurred('customer_name')}>
                                    <span className="flex items-center gap-1">
                                        <User size={10} />
                                        {item.customerName}
                                    </span>
                                </BlurredSection>
                            )}
                            {item.storeName && (
                                <BlurredSection isBlurred={isSectionBlurred('customer_name')}>
                                    <span className="flex items-center gap-1 text-gold-500/50">
                                        <Crown size={10} />
                                        {item.storeName}
                                    </span>
                                </BlurredSection>
                            )}
                            {item.userRole && (
                                <span className="text-[9px] text-white/25 uppercase">{item.userRole}</span>
                            )}
                        </div>
                        {item.financialImpact && (
                            <span className="inline-flex mt-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-gold-500/10 text-gold-400 border border-gold-500/20">
                                {t.admin.billing.ledger.financialImpact}: {item.financialImpact}
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-6 text-center">
                    <div className={`font-mono text-lg font-black flex items-center justify-center gap-2 ${
                        isCredit ? 'text-emerald-400' : isDebit ? 'text-rose-400' : 'text-white/60'
                    }`}>
                        <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
                            <span>{isDebit ? '-' : '+'}{Number(item.amount).toLocaleString()}</span>
                        </BlurredSection>
                        <span className="text-[10px] opacity-30 font-bold uppercase">{item.currency}</span>
                    </div>
                </td>
                <td className="px-6 py-6 text-center">
                    <span className="font-mono text-[10px] text-white/50">
                        {breakdownParts.length > 0 ? breakdownParts.join(' · ') : '—'}
                    </span>
                </td>
                <td className="px-6 py-6 text-center font-mono text-xs text-white/50">
                    {item.balanceAfter != null ? Number(item.balanceAfter).toLocaleString() : '—'}
                </td>
                <td className="px-6 py-6 font-mono text-xs text-white/40 text-center">
                    {new Date(item.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                </td>
                <td className="px-6 py-6">
                    <div className="flex items-center justify-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                            item.status === 'COMPLETED' || item.status === 'SUCCESS'
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                : item.status === 'PENDING'
                                    ? 'bg-amber-500 animate-pulse'
                                    : 'bg-white/20'
                        }`} />
                        <span className="text-[10px] text-white/60 font-black uppercase">{item.status}</span>
                    </div>
                </td>
                <td className="px-6 py-6 text-center font-mono text-[9px] text-white/30">
                    {item.transactionNumber && <div>TXN:{item.transactionNumber.slice(-8)}</div>}
                    {item.orderNumber && <div>ORD:{item.orderNumber}</div>}
                    {!item.transactionNumber && !item.orderNumber && '—'}
                </td>
                <td className="px-4 py-6 text-left">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleExpand(item.id);
                            }}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5"
                            title={isExpanded ? t.admin.billing.ledger.collapseDetails : t.admin.billing.ledger.expandDetails}
                        >
                            <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (item.orderId) onViewAudit(item.orderId);
                            }}
                            disabled={!item.orderId}
                            className="p-2 rounded-xl bg-white/5 hover:bg-gold-500 hover:text-black transition-all disabled:opacity-20 disabled:cursor-not-allowed group/btn shadow-lg border border-white/5"
                            title={t.admin.billing.ledger.table.viewAudit}
                        >
                            <History size={16} className="group-hover/btn:rotate-[360deg] transition-all duration-700" />
                        </button>
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-white/[0.02]">
                    <td colSpan={9} className="px-8 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] font-mono text-white/50">
                            {item.unitPrice != null && (
                                <div><span className="text-white/25 block uppercase mb-1">{t.admin.billing.invoiceViewer.unitPrice}</span>{Number(item.unitPrice).toLocaleString()} AED</div>
                            )}
                            {item.commission != null && (
                                <div><span className="text-white/25 block uppercase mb-1">{t.admin.billing.ledger.auditDrawer.platformFee}</span>{Number(item.commission).toLocaleString()} AED</div>
                            )}
                            {item.shippingCost != null && (
                                <div><span className="text-white/25 block uppercase mb-1">{t.admin.billing.kpis.logisticsRevenue}</span>{Number(item.shippingCost).toLocaleString()} AED</div>
                            )}
                            {item.gatewayFee != null && (
                                <div><span className="text-white/25 block uppercase mb-1">{t.admin.billing.kpis.gatewayFees}</span>{Number(item.gatewayFee).toLocaleString()} AED</div>
                            )}
                            {item.refundedAmount != null && (
                                <div><span className="text-white/25 block uppercase mb-1">{t.admin.billing.kpis.totalRefunds}</span>{Number(item.refundedAmount).toLocaleString()} AED</div>
                            )}
                            {item.balanceAfter != null && (
                                <div><span className="text-white/25 block uppercase mb-1">{t.admin.billing.ledger.table.balanceAfter}</span>{Number(item.balanceAfter).toLocaleString()} AED</div>
                            )}
                            {item.financialImpact && (
                                <div><span className="text-white/25 block uppercase mb-1">{t.admin.billing.ledger.financialImpact}</span>{item.financialImpact}</div>
                            )}
                            {item.transactionNumber && (
                                <div><span className="text-white/25 block uppercase mb-1">TXN</span>{item.transactionNumber}</div>
                            )}
                            {item.metadata && typeof item.metadata === 'object' && Object.keys(item.metadata as object).length > 0 && (
                                <div className="col-span-2 sm:col-span-4">
                                    <span className="text-white/25 block uppercase mb-1">metadata</span>
                                    <pre className="text-[9px] whitespace-pre-wrap break-all">{JSON.stringify(item.metadata, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </React.Fragment>
    );
});
