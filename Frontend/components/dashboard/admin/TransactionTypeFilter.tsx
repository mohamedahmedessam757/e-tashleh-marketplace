import React from 'react';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  Wallet,
  CreditCard,
  ShieldCheck,
  Download,
  Filter,
  RefreshCw,
  Landmark,
  TrendingUp,
  Percent,
} from 'lucide-react';

const TransactionTypeFilter: React.FC = () => {
  const { feedFilters, setFeedFilters } = useAdminStore();
  const { t } = useLanguage();
  const b = t.admin.billing.ledger.filterTypes;

  const types = [
    { id: 'ALL', icon: Filter, label: b.all },
    { id: 'PAYMENT', icon: CreditCard, label: b.payments },
    { id: 'PAYMENT_REFUNDED', icon: RefreshCw, label: b.refunds },
    { id: 'ESCROW', icon: ShieldCheck, label: b.escrow },
    { id: 'WITHDRAWAL', icon: Download, label: b.withdrawals },
    { id: 'MANUAL_PAYOUT', icon: Landmark, label: b.manualPayouts },
    { id: 'ORDER_PROFIT', icon: TrendingUp, label: b.loyaltyCashback },
    { id: 'REFERRAL_PROFIT', icon: Wallet, label: b.referralPayouts },
    { id: 'COMMISSION', icon: Percent, label: b.commissions },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {types.map((type) => {
        const Icon = type.icon;
        const isActive = feedFilters.type === type.id;

        return (
          <button
            key={type.id}
            type="button"
            onClick={() => setFeedFilters({ type: type.id })}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 border
              ${
                isActive
                  ? 'bg-[#A88B3E] text-white border-[#A88B3E] shadow-lg shadow-[#A88B3E]/20'
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:border-white/20'
              }
            `}
          >
            <Icon size={18} className={isActive ? 'animate-pulse' : ''} />
            <span className="text-sm font-medium">{type.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TransactionTypeFilter;
