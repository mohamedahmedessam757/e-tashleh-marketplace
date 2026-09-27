import React from 'react';
import { Ban, PackageX, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { PolicyNoticeDialog } from '../ui/PolicyNoticeDialog';

interface CustomerShippingNoticeProps {
  open: boolean;
  onClose: () => void;
}

export const CustomerShippingNotice: React.FC<CustomerShippingNoticeProps> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const n = t.common.policyNotices.customerShipping;

  return (
    <PolicyNoticeDialog
      open={open}
      onClose={onClose}
      title={n.prohibitedTitle}
      confirmLabel={n.confirm}
      closeLabel={t.common.policyNotices.close}
    >
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {n.prohibited.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-white/85"
          >
            <Ban size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-5 mb-2 text-sm font-black text-gold-400 flex items-center gap-2">
        <PackageX size={18} aria-hidden />
        {n.nonReturnableTitle}
      </h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {n.nonReturnable.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 rounded-xl border border-gold-500/20 bg-gold-500/5 px-3 py-2 text-sm text-white/85"
          >
            <RotateCcw size={16} className="text-gold-400 shrink-0 mt-0.5" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-white/50">{n.termsNote}</p>
    </PolicyNoticeDialog>
  );
};

export default CustomerShippingNotice;
