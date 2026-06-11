import React from 'react';
import { GlassCard } from '../../../ui/GlassCard';
import { History } from 'lucide-react';
import { formatActionLabel } from './verificationTaskHelpers';

interface VerificationActivityTimelineProps {
  isAr: boolean;
  logs: any[];
  showAdminNote?: boolean;
}

export const VerificationActivityTimeline: React.FC<VerificationActivityTimelineProps> = ({
  isAr,
  logs,
  showAdminNote = true,
}) => {
  if (!logs?.length) return null;

  return (
    <GlassCard className="p-6 bg-[#1A1814]/80">
      <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
        <History size={18} className="text-gold-500" />
        {isAr ? 'سجل النشاط' : 'Activity log'}
      </h3>
      {showAdminNote && (
        <p className="text-[10px] text-white/40 mb-4">
          {isAr
            ? 'يظهر لموظف المطابقة والإدارة (أدمن / سوبر أدمن).'
            : 'Visible to the verification officer and admins (admin / super admin).'}
        </p>
      )}
      <ul className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {logs.map((log) => (
          <li
            key={log.id}
            className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-white/5 border border-white/5 text-xs"
          >
            <span className="text-white font-medium">{formatActionLabel(log.action, isAr)}</span>
            <span className="text-white/40 font-mono">
              {new Date(log.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB')}
            </span>
            {log.officer?.name && (
              <span className="w-full text-white/35">{log.officer.name}</span>
            )}
          </li>
        ))}
      </ul>
    </GlassCard>
  );
};
