import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface Props {
  isAr: boolean;
  formData: any;
  updateField: (section: string, field: string, value: unknown) => void;
}

export const AdminSettingsOrdersTab: React.FC<Props> = ({ isAr, formData, updateField }) => {
  const d = formData.orderDurations || {
    assemblyCartDays: 7,
    returnWindowHours: 24,
    disputeWindowHours: 24,
    paymentTimeoutHours: 24,
  };

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-gold-500/50';

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in duration-500">
      <div className="p-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 flex gap-4">
        <AlertTriangle className="text-amber-400 shrink-0" size={22} />
        <p className="text-sm text-white/80 leading-relaxed">
          {isAr
            ? 'تغيير هذه المدد يؤثر فوراً على كل الطلبات الجديدة والجارية، ويظهر إشعار لجميع المستخدمين.'
            : 'Changing these durations affects all new and in-progress orders immediately. All users will see a policy banner.'}
        </p>
      </div>

      <header className="flex items-center gap-3 border-b border-white/5 pb-4">
        <Clock className="text-purple-400" size={20} />
        <h2 className="text-xl font-black text-white">
          {isAr ? 'مدد الطلبات' : 'Order durations'}
        </h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          ['assemblyCartDays', isAr ? 'مدة سلة التجميع (أيام)' : 'Assembly cart (days)', 1, 90],
          ['returnWindowHours', isAr ? 'مدة الإرجاع (ساعات)' : 'Return window (hours)', 1, 720],
          ['disputeWindowHours', isAr ? 'مدة النزاعات (ساعات)' : 'Dispute window (hours)', 1, 720],
          ['paymentTimeoutHours', isAr ? 'مهلة الدفع (ساعات)' : 'Payment timeout (hours)', 1, 168],
        ].map(([key, label, min, max]) => (
          <div key={key} className="space-y-2">
            <label className="text-[11px] font-black text-white/30 uppercase">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              className={inputCls}
              value={d[key] ?? ''}
              onChange={(e) => updateField('orderDurations', key, Number(e.target.value))}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
