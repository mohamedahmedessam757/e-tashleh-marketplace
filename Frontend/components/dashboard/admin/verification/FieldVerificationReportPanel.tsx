import React from 'react';
import { AlertCircle, FileText, Image as ImageIcon, Loader2, History } from 'lucide-react';
import {
  VERIFICATION_TASK_DECISION_LABEL,
  VERIFICATION_TASK_STATUS_LABEL,
  getFieldPhotoUrlsFromTask,
} from './verificationTaskHelpers';

export type FieldReportPanelVariant = 'current' | 'pending' | 'previous';

interface FieldVerificationReportPanelProps {
  task: {
    id: string;
    cycleNumber?: number;
    status?: string;
    decision?: string | null;
    decisionReason?: string | null;
    officerNotes?: string | null;
    completedAt?: string | Date | null;
    officer?: { name?: string | null; email?: string | null } | null;
    fieldPhotos?: { url?: string | null }[] | null;
    officerPhotos?: unknown;
  };
  isAr: boolean;
  variant: FieldReportPanelVariant;
  openingReportTaskId?: string | null;
  reportBusy?: boolean;
  onOpenReport: (taskId: string) => void;
}

export const FieldVerificationReportPanel: React.FC<FieldVerificationReportPanelProps> = ({
  task,
  isAr,
  variant,
  openingReportTaskId,
  reportBusy,
  onOpenReport,
}) => {
  const fieldPhotoUrls = getFieldPhotoUrlsFromTask(task);
  const isOpening = reportBusy && openingReportTaskId === task.id;

  const borderClass =
    variant === 'pending'
      ? 'border-amber-500/35 bg-gradient-to-br from-amber-500/10 to-transparent'
      : variant === 'previous'
        ? 'border-white/15 bg-white/[0.03]'
        : 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 to-transparent';

  const title =
    variant === 'previous'
      ? isAr
        ? `قرار المطابقة — دورة ${task.cycleNumber ?? '—'}`
        : `Field decision — cycle ${task.cycleNumber ?? '—'}`
      : variant === 'pending'
        ? isAr
          ? 'تقرير المطابقة الميدانية — بانتظار المراجعة'
          : 'Field report — awaiting review'
        : isAr
          ? 'قرار موظف المطابقة الميدانية'
          : 'Field officer decision';

  const subtitle =
    variant === 'pending'
      ? isAr
        ? 'راجع الأدلة والتقرير. الاعتماد من لوحة «توثيق القطعة» أعلاه.'
        : 'Review evidence and report. Approve from the part verification panel above.'
      : variant === 'previous'
        ? isAr
          ? 'سجل ثابت — لا يُحذف بعد بدء دورة مطابقة جديدة.'
          : 'Permanent record — kept when a new verification cycle starts.'
        : isAr
          ? 'يظل القرار والأدلة ظاهرين بعد اعتماد الإدارة على التوثيق.'
          : 'Decision and evidence remain visible after admin document approval.';

  return (
    <div className={`relative z-10 mb-6 p-5 rounded-2xl border space-y-4 ${borderClass}`}>
      <div className="flex items-start gap-2">
        {variant === 'previous' ? (
          <History className="text-white/50 shrink-0 mt-0.5" size={20} />
        ) : (
          <AlertCircle
            className={`shrink-0 mt-0.5 ${variant === 'pending' ? 'text-amber-400' : 'text-emerald-400'}`}
            size={20}
          />
        )}
        <div>
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="text-xs text-white/50 mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <div className="bg-black/30 rounded-xl p-3 border border-white/10">
          <p className="text-white/40 uppercase font-bold mb-1">{isAr ? 'الموظف' : 'Officer'}</p>
          <p className="text-white font-medium">
            {task.officer?.name || task.officer?.email || '—'}
          </p>
        </div>
        <div className="bg-black/30 rounded-xl p-3 border border-white/10">
          <p className="text-white/40 uppercase font-bold mb-1">{isAr ? 'قرار الفحص' : 'Field decision'}</p>
          <p
            className={`font-bold ${
              task.decision === 'NON_MATCHING' ? 'text-red-300' : task.decision === 'MATCHING' ? 'text-green-300' : 'text-white'
            }`}
          >
            {task.decision
              ? isAr
                ? VERIFICATION_TASK_DECISION_LABEL[task.decision]?.ar || task.decision
                : VERIFICATION_TASK_DECISION_LABEL[task.decision]?.en || task.decision
              : '—'}
          </p>
        </div>
        <div className="bg-black/30 rounded-xl p-3 border border-white/10">
          <p className="text-white/40 uppercase font-bold mb-1">{isAr ? 'حالة المهمة' : 'Task status'}</p>
          <p className="text-white font-medium">
            {task.status
              ? isAr
                ? VERIFICATION_TASK_STATUS_LABEL[task.status]?.ar || task.status
                : VERIFICATION_TASK_STATUS_LABEL[task.status]?.en || task.status
              : '—'}
          </p>
        </div>
      </div>

      {task.officerNotes ? (
        <div className="text-sm text-white/80 bg-black/20 rounded-xl p-3 border border-white/10">
          <p className="text-[10px] uppercase text-white/40 font-bold mb-1">{isAr ? 'ملاحظات الموظف' : 'Officer notes'}</p>
          <p className="whitespace-pre-wrap">{task.officerNotes}</p>
        </div>
      ) : null}

      {task.decisionReason ? (
        <div className="text-sm text-white/80 bg-black/20 rounded-xl p-3 border border-white/10">
          <p className="text-[10px] uppercase text-white/40 font-bold mb-1">{isAr ? 'سبب / تفاصيل' : 'Reason / details'}</p>
          <p className="whitespace-pre-wrap">{task.decisionReason}</p>
        </div>
      ) : null}

      {fieldPhotoUrls.length > 0 ? (
        <div>
          <p className="text-[10px] uppercase text-white/40 font-bold mb-2 flex items-center gap-1">
            <ImageIcon size={12} />
            {isAr ? 'صور الميدان' : 'Field photos'}
          </p>
          <div className="flex flex-wrap gap-2">
            {fieldPhotoUrls.map((src) => (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noreferrer"
                className="block w-24 h-24 rounded-lg overflow-hidden border border-white/10 bg-black/40 shrink-0"
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onOpenReport(task.id)}
          disabled={reportBusy}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 text-sm text-gold-400 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {isOpening ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText size={18} className="text-gold-500" />}
          {isAr ? 'عرض تقرير HTML' : 'Open HTML report'}
        </button>
        {task.completedAt ? (
          <span className="text-xs text-white/40 self-center">
            {isAr ? 'اكتمل:' : 'Completed:'}{' '}
            {new Date(task.completedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
          </span>
        ) : null}
      </div>
    </div>
  );
};
