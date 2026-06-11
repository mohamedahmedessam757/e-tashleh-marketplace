import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  ShieldCheck,
  Calendar,
  Car,
  Clock,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  User,
  Filter,
} from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { verificationTasksApi } from '@/services/api/verificationTasks';
import { getCurrentUser } from '../../../utils/auth';
import {
  AdminVerificationTasksFilter,
  VERIFICATION_TASK_DECISION_LABEL,
  VERIFICATION_TASK_STATUS_LABEL,
  countVerificationTasksByAdminFilter,
  filterVerificationTasksForAdmin,
} from './verification/verificationTaskHelpers';

interface VerificationTasksDashboardProps {
  onNavigate?: (path: string, id?: any) => void;
}

function normalizeTasksPayload(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
    return (payload as { data: unknown[] }).data;
  }
  return [];
}

export const VerificationTasksDashboard: React.FC<VerificationTasksDashboardProps> = ({ onNavigate }) => {
  const { t, language, dir } = useLanguage();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AdminVerificationTasksFilter>('all');

  const isAr = language === 'ar';
  const viewerRole = getCurrentUser()?.role ?? '';
  const isOfficer = viewerRole === 'VERIFICATION_OFFICER';
  const isAdminViewer = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(viewerRole);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      let data: unknown[] = [];
      if (isOfficer) {
        const res = await verificationTasksApi.getMyTasks();
        data = normalizeTasksPayload(res.data);
      } else if (isAdminViewer) {
        const res = await verificationTasksApi.listAllForAdmin();
        data = normalizeTasksPayload(res.data);
      }
      setTasks(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to fetch verification tasks', error);
      setFetchError(error?.response?.data?.message || error?.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [isOfficer, isAdminViewer]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const counts = useMemo(() => countVerificationTasksByAdminFilter(tasks), [tasks]);

  const visibleTasks = useMemo(() => {
    if (isOfficer) return tasks;
    return filterVerificationTasksForAdmin(tasks, filter);
  }, [tasks, filter, isOfficer]);

  const filterTabs: { id: AdminVerificationTasksFilter; labelAr: string; labelEn: string }[] = [
    { id: 'all', labelAr: 'الكل', labelEn: 'All' },
    { id: 'pending', labelAr: 'بانتظار الاعتماد', labelEn: 'Awaiting approval' },
    { id: 'active', labelAr: 'جارية', labelEn: 'In progress' },
    { id: 'done', labelAr: 'منتهية', labelEn: 'Completed' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gradient-to-r from-[#1A1814] to-transparent p-6 rounded-3xl border border-white/5">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
              <ShieldCheck className="text-blue-400" size={24} />
            </div>
            <h1 className="text-3xl font-bold text-white">
              {t.admin.verificationTasks || (isAr ? 'مهام المطابقة الميدانية' : 'Verification Tasks')}
            </h1>
          </div>
          <p className="text-white/50 text-sm max-w-xl">
            {isOfficer
              ? isAr
                ? 'إدارة مهام الفحص والمطابقة المسندة إليك'
                : 'Manage your assigned verification and inspection tasks'
              : isAr
                ? 'سجل كامل لمهام المطابقة الميدانية — المفتوحة والمنتهية وكل الدورات'
                : 'Full history of field verification tasks — open, completed, and all cycles'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchTasks()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/80 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {isAdminViewer && !loading && !fetchError && tasks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-white/30" />
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                filter === tab.id
                  ? 'bg-gold-500/20 border-gold-500/40 text-gold-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
            >
              {isAr ? tab.labelAr : tab.labelEn}
              <span className="mr-1.5 ml-1.5 opacity-60">({counts[tab.id]})</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-12 h-12 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          </div>
        ) : fetchError ? (
          <GlassCard className="flex flex-col items-center justify-center p-12 text-center border-dashed border-red-500/20">
            <p className="text-red-400 text-sm mb-4">{fetchError}</p>
            <button
              type="button"
              onClick={() => void fetchTasks()}
              className="text-sm text-gold-400 hover:underline"
            >
              {isAr ? 'إعادة المحاولة' : 'Try again'}
            </button>
          </GlassCard>
        ) : visibleTasks.length === 0 ? (
          <GlassCard className="flex flex-col items-center justify-center p-12 text-center border-dashed border-white/10">
            <ShieldCheck size={48} className="text-white/10 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {isAr ? 'لا توجد مهام' : 'No tasks'}
            </h3>
            <p className="text-sm text-white/40">
              {isOfficer
                ? isAr
                  ? 'لم يتم إسناد أي مهام مطابقة إليك بعد.'
                  : 'You have not been assigned any verification tasks yet.'
                : filter === 'all'
                  ? isAr
                    ? 'لم تُنشأ أي مهمة مطابقة ميدانية بعد.'
                    : 'No field verification tasks have been created yet.'
                  : isAr
                    ? 'لا توجد مهام في هذا التصنيف. جرّب «الكل».'
                    : 'No tasks in this filter. Try «All».'}
            </p>
          </GlassCard>
        ) : (
          visibleTasks.map((task) => (
            <GlassCard
              key={task.id}
              className="group relative p-0 overflow-hidden cursor-pointer hover:border-gold-500/30 transition-all duration-300"
              onClick={() => onNavigate && onNavigate('verification-task-details', task.id)}
            >
              <div
                className={`absolute top-0 left-0 w-1 h-full ${
                  ['AWAITING_ADMIN_APPROVAL', 'AWAITING_CORRECTION'].includes(task.status)
                    ? 'bg-amber-500/70'
                    : ['ADMIN_APPROVED', 'COMPLETED_MATCH'].includes(task.status)
                      ? 'bg-emerald-500/50'
                      : 'bg-blue-500/50'
                }`}
              />
              <div className="p-5 pl-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-gold-400 font-bold tracking-tighter">
                      #{task.order?.orderNumber}
                    </span>
                    <Badge status={task.status} />
                    {task.decision && (
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                          task.decision === 'MATCHING'
                            ? 'bg-green-500/10 text-green-400 border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {isAr
                          ? VERIFICATION_TASK_DECISION_LABEL[task.decision]?.ar || task.decision
                          : VERIFICATION_TASK_DECISION_LABEL[task.decision]?.en || task.decision}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-white">
                      {task.offer?.orderPart?.name || task.order?.partName || '—'}
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-white/40 mt-1">
                    {isAdminViewer && (
                      <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                        <User size={14} className="text-white/30" />
                        <span>
                          {task.officer?.name || task.officer?.email || (isAr ? 'بدون موظف' : 'Unassigned')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                      <Car size={14} className="text-white/30" />
                      <span>
                        {task.order?.vehicleMake} {task.order?.vehicleModel} ({task.order?.vehicleYear})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-white/30" />
                      <span>
                        {new Date(task.updatedAt || task.createdAt).toLocaleDateString(
                          language === 'ar' ? 'ar-EG' : 'en-US',
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-white/30" />
                      <span>
                        {isAr ? `دورة ${task.cycleNumber}` : `Cycle ${task.cycleNumber}`}
                      </span>
                    </div>
                    {task.completedAt && (
                      <span className="text-white/30">
                        {isAr ? 'اكتمل:' : 'Done:'}{' '}
                        {new Date(task.completedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                      </span>
                    )}
                  </div>

                  {isAdminViewer && task.status && (
                    <p className="text-[10px] text-white/25">
                      {isAr
                        ? VERIFICATION_TASK_STATUS_LABEL[task.status]?.ar || task.status
                        : VERIFICATION_TASK_STATUS_LABEL[task.status]?.en || task.status}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 group-hover:bg-gold-500/20 group-hover:text-gold-400 transition-colors shrink-0">
                  {dir === 'rtl' ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
};
