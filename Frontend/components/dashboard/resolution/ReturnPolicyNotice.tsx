import React from 'react';
import { Ban, Camera, ClipboardList, Clock, Info, Package, Truck } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { PolicyNoticeDialog } from '../../ui/PolicyNoticeDialog';

interface ReturnPolicyNoticeProps {
  open: boolean;
  onClose: () => void;
}

const ICONS = [Clock, Camera, Ban, Ban, Package, Truck, ClipboardList];

export const ReturnPolicyNotice: React.FC<ReturnPolicyNoticeProps> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const n = t.common.policyNotices.returnDispute;

  return (
    <PolicyNoticeDialog
      open={open}
      onClose={onClose}
      lockBodyScroll={false}
      title={n.title}
      confirmLabel={n.confirm}
      closeLabel={t.common.policyNotices.close}
    >
      <ul className="space-y-2.5">
        {n.items.map((item, i) => {
          const Icon = ICONS[i] ?? Info;
          return (
            <li
              key={item}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/85 leading-relaxed"
            >
              <Icon
                size={18}
                className={`shrink-0 mt-0.5 ${Icon === Ban ? 'text-red-400' : 'text-gold-400'}`}
                aria-hidden
              />
              <span>{item}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 rounded-xl border border-gold-500/30 bg-gold-500/10 p-3 text-sm font-bold text-gold-400">
        {n.acknowledgement}
      </p>
    </PolicyNoticeDialog>
  );
};

export default ReturnPolicyNotice;
