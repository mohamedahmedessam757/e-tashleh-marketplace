import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  ShieldCheck,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileText,
} from 'lucide-react';
import { FileUploader } from '../../ui/FileUploader';
import { verificationTasksApi } from '@/services/api/verificationTasks';
import { getCurrentUser } from '../../../utils/auth';
import {
  isDevGpsBypassEnabled,
  isGeolocationSecureContext,
  mapGeolocationError,
  requestGeolocationCoords,
} from '../../../utils/geolocation';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);
import { VerificationSessionCountdown } from './verification/VerificationSessionCountdown';
import { VerificationOrderSummary } from './verification/VerificationOrderSummary';
import { VerificationComparisonGrid } from './verification/VerificationComparisonGrid';
import { VerificationActivityTimeline } from './verification/VerificationActivityTimeline';
import { VerificationImageGrid } from './verification/VerificationImageGrid';
import {
  asImageUrls,
  getCustomerReferenceImages,
  getFieldPhotoUrlsFromTask,
  VERIFICATION_TASK_DECISION_LABEL,
  VERIFICATION_TASK_STATUS_LABEL,
} from './verification/verificationTaskHelpers';

async function openVerificationTaskReport(params: {
  taskId: string;
  legacyReportUrl?: string | null;
  isAr: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { taskId, legacyReportUrl, isAr } = params;
  try {
    // We always prefer the live generated report to ensure latest design/data
    const res = await verificationTasksApi.getReportBlob(taskId);
    const blob = res.data;
    if (!(blob instanceof Blob) || blob.size === 0) {
      return { ok: false, message: isAr ? 'التقرير غير متاح' : 'Report is empty or unavailable' };
    }
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) {
      URL.revokeObjectURL(url);
      return { ok: false, message: isAr ? 'اسمح بفتح النوافذ المنبثقة للمتصفح' : 'Allow pop-ups for this site' };
    }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    return { ok: true };
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    const msg = err?.response?.data?.message || err?.message;
    return {
      ok: false,
      message: typeof msg === 'string' ? msg : isAr ? 'تعذر فتح التقرير' : 'Could not open report',
    };
  }
}

interface VerificationTaskDetailsProps {
  taskId: string;
  onBack?: () => void;
}

export const VerificationTaskDetails: React.FC<VerificationTaskDetailsProps> = ({ taskId, onBack }) => {
  const { language, dir } = useLanguage();
  const isAr = language === 'ar';
  const currentRole = getCurrentUser()?.role;
  const isOfficer = currentRole === 'VERIFICATION_OFFICER';
  const isAdmin = ADMIN_ROLES.has(currentRole || '');

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completingHint, setCompletingHint] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showDevGpsBypass, setShowDevGpsBypass] = useState(false);
  const [decision, setDecision] = useState<'MATCHING' | 'NON_MATCHING' | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);

  const fetchTaskDetails = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const { data } = await verificationTasksApi.getTask(taskId);
      setTask(data);
      setNotes(data.officerNotes ?? '');
      if (data.sessionDeadline && new Date(data.sessionDeadline).getTime() <= Date.now()) {
        setSessionExpired(true);
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        (isAr ? 'تعذر تحميل المهمة' : 'Failed to load task');
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [taskId, isAr]);

  useEffect(() => {
    fetchTaskDetails();
  }, [fetchTaskDetails]);

  useEffect(() => {
    if (isDevGpsBypassEnabled() && !isGeolocationSecureContext()) {
      setShowDevGpsBypass(true);
    }
  }, []);

  const order = task?.order;
  const doc = task?.merchantVerificationDoc ?? order?.verificationDocuments?.find(
    (d: any) => d.offerId === task?.offerId,
  ) ?? order?.verificationDocuments?.[0];
  const partLabel =
    task?.partLabel ||
    task?.offer?.orderPart?.name ||
    (isAr ? 'قطعة' : 'Part');

  const customerImages = useMemo(() => {
    if (!order) return [];
    return getCustomerReferenceImages(order);
  }, [order]);

  const storeImages = useMemo(() => (doc ? asImageUrls(doc.images) : []), [doc]);
  const officerImages = useMemo(() => {
    const fromRows =
      (task?.fieldPhotos as { url: string }[] | undefined)?.map((p) => p.url).filter(Boolean) ?? [];
    const fromJson = asImageUrls(task?.officerPhotos);
    return [...new Set([...fromRows, ...fromJson])];
  }, [task?.officerPhotos, task?.fieldPhotos]);

  const deadlinePassed =
    !!task?.sessionDeadline && new Date(task.sessionDeadline).getTime() <= Date.now();

  const actionsLocked = isOfficer && (sessionExpired || deadlinePassed);

  const startInspection = async (opts?: { forceDevBypass?: boolean }) => {
    setStarting(true);
    setGpsError(null);
    setShowDevGpsBypass(false);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      let gpsDevBypass = false;

      if (opts?.forceDevBypass && isDevGpsBypassEnabled()) {
        gpsDevBypass = true;
      } else {
        const coords = await requestGeolocationCoords(isAr, isDevGpsBypassEnabled());
        if (coords.source === 'dev_bypass') {
          gpsDevBypass = true;
        } else {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      await verificationTasksApi.start(taskId, {
        lat,
        lng,
        gpsDevBypass,
        deviceInfo: {
          userAgent: navigator.userAgent,
          ...(gpsDevBypass ? { gpsSource: 'dev_bypass' } : { gpsSource: 'gps' }),
        },
      });
      await fetchTaskDetails();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        err?.response?.data?.message ||
        (error instanceof Error ? error.message : mapGeolocationError(error, isAr)) ||
        (isAr ? 'تعذر بدء المطابقة' : 'Could not start inspection');

      setGpsError(msg);
      if (isDevGpsBypassEnabled() && !isGeolocationSecureContext()) {
        setShowDevGpsBypass(true);
      }
    } finally {
      setStarting(false);
    }
  };

  const handleStartVerification = () => startInspection();

  const handleCompleteVerification = async () => {
    if (!decision || actionsLocked) return;
    if (decision === 'NON_MATCHING' && !reason.trim()) {
      alert(isAr ? 'يرجى ذكر سبب عدم المطابقة' : 'Please provide a reason for non-matching');
      return;
    }

    const hasServerPhotos =
      (task?.fieldPhotos?.length ?? 0) > 0 ||
      asImageUrls(task?.officerPhotos).some((u) => u.startsWith('http'));

    if (photos.length === 0 && !hasServerPhotos) {
      alert(isAr ? 'يرجى رفع صور المطابقة للقطعة الفعلية' : 'Please upload field verification photos');
      return;
    }

    setCompleting(true);
    setCompletingHint(null);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const pos = await requestGeolocationCoords(isAr, isDevGpsBypassEnabled());
        if (pos.source === 'gps') {
          lat = pos.lat;
          lng = pos.lng;
        }
      } catch {
        /* optional at complete */
      }

      if (photos.length > 0) {
        setCompletingHint(isAr ? 'جاري رفع الصور…' : 'Uploading photos…');
        await verificationTasksApi.uploadFieldPhotos(taskId, photos);
      }

      setCompletingHint(isAr ? 'جاري إرسال القرار وتسجيل المهمة…' : 'Submitting decision…');
      await verificationTasksApi.complete(taskId, {
        decision,
        reason,
        notes,
        lat,
        lng,
        deviceInfo: { userAgent: navigator.userAgent },
      });
      setCompletingHint(isAr ? 'جاري تحديث البيانات…' : 'Refreshing…');
      await fetchTaskDetails();
    } catch (error: any) {
      alert(
        error?.response?.data?.message ||
          (isAr ? 'فشل إنهاء المطابقة' : 'Failed to complete verification'),
      );
    } finally {
      setCompleting(false);
      setCompletingHint(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
      </div>
    );
  }

  if (loadError || !task) {
    return (
      <GlassCard className="p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 text-sm">{loadError || (isAr ? 'المهمة غير موجودة' : 'Task not found')}</p>
        {onBack && (
          <button type="button" onClick={onBack} className="mt-4 text-gold-400 text-sm underline">
            {isAr ? 'رجوع' : 'Back'}
          </button>
        )}
      </GlassCard>
    );
  }

  const canAct =
    !actionsLocked &&
    (task.status === 'ASSIGNED' || task.status === 'LINK_SENT' || task.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-wrap items-center gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
          >
            {dir === 'rtl' ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
            <ShieldCheck className="text-gold-500 shrink-0" size={24} />
            {isAr ? 'مهمة مطابقة ميدانية' : 'Field verification task'}
            {order?.orderNumber && (
              <span className="font-mono text-gold-400 text-lg">#{order.orderNumber}</span>
            )}
          </h1>
          <p className="text-sm text-amber-400/90 font-bold mt-1">
            {isAr ? 'القطعة:' : 'Part:'} {partLabel}
          </p>
          {task.officer && (
            <p className="text-xs text-white/45 mt-1">
              {isAr ? 'الموظف:' : 'Officer:'} {task.officer.name} ({task.officer.email})
            </p>
          )}
        </div>
      </div>

      {task.sessionDeadline && (
        <VerificationSessionCountdown
          deadline={task.sessionDeadline}
          isAr={isAr}
          onExpired={isOfficer ? () => setSessionExpired(true) : undefined}
        />
      )}

      {isOfficer && actionsLocked && (
        <GlassCard className="p-4 border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-200">
            {isAr
              ? 'انتهت صلاحية الجلسة. لا يمكن متابعة الإجراءات. تواصل مع الإدارة للحصول على رابط جديد.'
              : 'Session expired. Actions are locked. Contact admin for a new link.'}
          </p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <VerificationOrderSummary isAr={isAr} order={order} task={task} viewerRole={currentRole} />

          <VerificationComparisonGrid
            isAr={isAr}
            customerImages={customerImages}
            storeImages={storeImages}
            officerImages={officerImages}
          />

          {(task.orderTaskHistory?.length ?? 0) > 0 && (
            <GlassCard className="p-6 bg-red-500/5 border-red-500/20">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" />
                {isAr ? 'دورات مطابقة سابقة' : 'Previous verification cycles'}
              </h3>
              <div className="space-y-4">
                {task.orderTaskHistory.map((h: any) => (
                  <div key={h.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-2 text-xs">
                      <span className="text-white/70 font-bold">
                        {isAr ? 'دورة' : 'Cycle'} {h.cycleNumber}
                        {h.decision && (
                          <span
                            className={`mr-2 ml-2 px-2 py-0.5 rounded ${
                              h.decision === 'NON_MATCHING' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                            }`}
                          >
                            {isAr
                              ? VERIFICATION_TASK_DECISION_LABEL[h.decision]?.ar || h.decision
                              : VERIFICATION_TASK_DECISION_LABEL[h.decision]?.en || h.decision}
                          </span>
                        )}
                      </span>
                      <span className="text-white/40">
                        {isAr
                          ? VERIFICATION_TASK_STATUS_LABEL[h.status]?.ar || h.status
                          : VERIFICATION_TASK_STATUS_LABEL[h.status]?.en || h.status}
                        {' · '}
                        {h.completedAt ? new Date(h.completedAt).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    {h.officer?.name || h.officer?.email ? (
                      <p className="text-[11px] text-white/45 mb-2">
                        {isAr ? 'الموظف:' : 'Officer:'} {h.officer.name || h.officer.email}
                      </p>
                    ) : null}
                    {h.decisionReason && (
                      <p className="text-sm text-white mb-2">
                        <span className="text-white/40">{isAr ? 'السبب:' : 'Reason:'}</span> {h.decisionReason}
                      </p>
                    )}
                    {h.officerNotes ? (
                      <p className="text-sm text-white/70 mb-2 whitespace-pre-wrap">{h.officerNotes}</p>
                    ) : null}
                    <VerificationImageGrid images={getFieldPhotoUrlsFromTask(h)} emptyLabel="" columns={4} />
                    {(h.reportUrl || h.completedAt) && (
                      <button
                        type="button"
                        onClick={async () => {
                          const r = await openVerificationTaskReport({
                            taskId: h.id,
                            legacyReportUrl: h.reportUrl,
                            isAr,
                          });
                          if (r.ok === false) alert(r.message);
                        }}
                        className="text-xs text-gold-400 underline mt-2 inline-block bg-transparent border-0 cursor-pointer p-0 font-inherit"
                      >
                        {isAr ? 'تقرير الدورة' : 'Cycle report'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          <VerificationActivityTimeline
            isAr={isAr}
            logs={task.activityLogs ?? []}
            showAdminNote={isAdmin || isOfficer}
          />
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6 border-gold-500/20 bg-gradient-to-b from-gold-500/5 to-transparent relative overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-gold-500" />
              {isAr ? 'إجراءات المطابقة' : 'Verification actions'}
            </h3>

            {task.status === 'ASSIGNED' || task.status === 'LINK_SENT' ? (
              <div className="space-y-4">
                <p className="text-sm text-white/60">
                  {isAr
                    ? 'يجب بدء المطابقة لتسجيل الموقع (GPS) والوقت. الموقع إلزامي.'
                    : 'Start inspection to record GPS and time. Location is required.'}
                </p>
                {gpsError && <p className="text-xs text-red-300">{gpsError}</p>}
                {!isGeolocationSecureContext() && isDevGpsBypassEnabled() && (
                  <p className="text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                    {isAr
                      ? 'بيئة تطوير (HTTP): GPS غير متاح. استخدم الزر البرتقالي للمتابعة بدون موقع.'
                      : 'Dev (HTTP): GPS blocked. Use the orange button to continue without location.'}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleStartVerification}
                  disabled={starting || !canAct}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin size={18} />}
                  {starting ? (isAr ? 'جاري البدء...' : 'Starting...') : isAr ? 'بدء الفحص الميداني' : 'Start field inspection'}
                </button>
                {showDevGpsBypass && isDevGpsBypassEnabled() && (
                  <button
                    type="button"
                    onClick={() => startInspection({ forceDevBypass: true })}
                    disabled={starting || !canAct}
                    className="w-full py-2.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 rounded-xl text-sm font-bold"
                  >
                    {isAr ? 'متابعة بدون GPS (تطوير فقط)' : 'Continue without GPS (dev only)'}
                  </button>
                )}
              </div>
            ) : task.status === 'IN_PROGRESS' ? (
              <div className="space-y-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-200">
                  <Clock size={14} className="inline mr-1" />
                  {isAr ? 'بدء الفحص:' : 'Started:'}{' '}
                  {task.startedAt ? new Date(task.startedAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB') : '—'}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!canAct}
                    onClick={() => setDecision('MATCHING')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${
                      decision === 'MATCHING'
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    <CheckCircle size={24} />
                    <span className="text-xs font-bold">{isAr ? 'مطابق' : 'Matching'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canAct}
                    onClick={() => setDecision('NON_MATCHING')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${
                      decision === 'NON_MATCHING'
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    <XCircle size={24} />
                    <span className="text-xs font-bold">{isAr ? 'غير مطابق' : 'Not matching'}</span>
                  </button>
                </div>

                {decision === 'NON_MATCHING' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      disabled={!canAct}
                      placeholder={isAr ? 'سبب عدم المطابقة (إلزامي)...' : 'Non-matching reason (required)...'}
                      className="w-full bg-black/40 border border-red-500/30 rounded-xl p-3 text-sm text-white min-h-[90px]"
                    />
                  </motion.div>
                )}

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!canAct}
                  placeholder={isAr ? 'ملاحظات إضافية (اختياري)' : 'Additional notes (optional)'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white min-h-[70px]"
                />

                <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                  <p className="text-xs font-bold text-white mb-2">
                    {isAr ? 'صور القطعة الفعلية' : 'Actual part photos'}
                    <span className="text-red-400"> *</span>
                  </p>
                  <FileUploader
                    onFilesSelected={setPhotos}
                    maxFiles={6}
                    accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCompleteVerification}
                  disabled={!canAct || !decision || completing}
                  className="w-full py-3 bg-gold-500 disabled:opacity-40 text-black rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {completing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {isAr ? 'إنهاء وإرسال للإدارة' : 'Complete & send to admin'}
                </button>
                {completingHint && (
                  <p className="text-[11px] text-gold-300/90 text-center flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    {completingHint}
                  </p>
                )}
              </div>
            ) : (
              <CompletedState task={task} isAr={isAr} />
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

function CompletedState({ task, isAr }: { task: any; isAr: boolean }) {
  const [reportOpening, setReportOpening] = useState(false);

  const matched = task.decision === 'MATCHING';
  const rejected = task.decision === 'NON_MATCHING';
  const pendingAdmin = task.status === 'AWAITING_ADMIN_APPROVAL' || task.status === 'AWAITING_CORRECTION';

  const canOpenReport =
    !!task.completedAt ||
    !!task.reportUrl ||
    [
      'AWAITING_ADMIN_APPROVAL',
      'AWAITING_CORRECTION',
      'ADMIN_APPROVED',
      'ADMIN_REJECTED',
      'COMPLETED_MATCH',
      'COMPLETED_NON_MATCH',
    ].includes(task.status);

  return (
    <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
      <div
        className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3 ${
          matched ? 'bg-green-500/20 text-green-500' : rejected ? 'bg-red-500/20 text-red-500' : 'bg-white/10'
        }`}
      >
        {matched ? <CheckCircle size={24} /> : rejected ? <XCircle size={24} /> : <ShieldCheck size={24} />}
      </div>
      <h4 className="font-bold text-white mb-1">
        {pendingAdmin
          ? rejected
            ? isAr
              ? 'توصية: غير مطابق — بانتظار اعتماد الإدارة'
              : 'Recommended: non-match — awaiting admin'
            : isAr
              ? 'توصية: مطابق — بانتظار اعتماد الإدارة'
              : 'Recommended: match — awaiting admin'
          : matched
            ? isAr
              ? 'مطابق'
              : 'Matching'
            : rejected
              ? isAr
                ? 'غير مطابق'
                : 'Not matching'
              : task.status}
      </h4>
      {canOpenReport && (
        <div className="mt-4">
          <button
            type="button"
            disabled={reportOpening}
            onClick={async () => {
              setReportOpening(true);
              const r = await openVerificationTaskReport({
                taskId: task.id,
                legacyReportUrl: task.reportUrl,
                isAr,
              });
              setReportOpening(false);
              if (r.ok === false) {
                alert(r.message);
              }
            }}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-gold-500/30 rounded-xl text-gold-400 font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {reportOpening ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileText size={18} className="text-gold-500" />
            )}
            {reportOpening ? (isAr ? 'جاري الفتح…' : 'Opening…') : (isAr ? 'عرض تقرير HTML' : 'Open HTML report')}
          </button>
          <p className="mt-2 text-[10px] text-white/40">
            {isAr ? 'جاهز للتصدير كـ PDF' : 'Ready for PDF export'}
          </p>
        </div>
      )}
      {task.decisionReason && (
        <p className="text-xs text-red-300/80 mt-2 p-2 bg-red-500/10 rounded-lg">{task.decisionReason}</p>
      )}
    </div>
  );
}

