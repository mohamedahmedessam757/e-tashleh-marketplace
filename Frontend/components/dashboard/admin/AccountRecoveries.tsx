import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Snowflake,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { client } from '../../../services/api/client';
import { supabase } from '../../../services/supabase';
import { AdminSearchInput } from './AdminSearchInput';

interface RecoveryRequest {
  id: string;
  userId: string;
  userName: string;
  caseType: string;
  oldPhone: string | null;
  newPhone: string | null;
  oldEmail: string | null;
  newEmail: string | null;
  status: string;
  balanceSnapshot: number;
  openOrdersCount: number;
  disputesCount: number;
  createdAt: string;
  userRole: string;
}

export const AccountRecoveries: React.FC = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastResumeToken, setLastResumeToken] = useState<{
    id: string;
    token: string;
  } | null>(null);

  const fetchRequests = useCallback(async (search?: string) => {
    try {
      setLoadError(null);
      const res = await client.get('/auth/recovery/admin/requests', {
        params: search?.trim() ? { search: search.trim() } : undefined,
      });
      const data = res.data;
      const mapped = data.map((r: any) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user?.name || r.userName || 'Unknown',
        caseType: r.caseType || 'LOST_PHONE',
        oldPhone: r.oldPhone,
        newPhone: r.newPhone,
        oldEmail: r.oldEmail,
        newEmail: r.newEmail,
        status: r.status,
        balanceSnapshot: Number(r.balanceSnapshot),
        openOrdersCount: r.openOrdersCount,
        disputesCount: r.disputesCount,
        createdAt: r.createdAt,
        userRole: r.userRole || r.user?.role,
      }));
      setRequests(mapped);
    } catch (err: any) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 403) {
        setLoadError(
          isAr
            ? 'لا تملك صلاحية عرض طلبات الاسترجاع (security-audit).'
            : 'Missing permission to view recovery requests (security-audit).',
        );
      } else {
        setLoadError(
          isAr
            ? 'تعذّر تحميل طلبات الاسترجاع. حاول مرة أخرى.'
            : 'Failed to load recovery requests. Please try again.',
        );
      }
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    const channel = supabase
      .channel('account-recovery-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_recovery_requests',
        },
        () => {
          fetchRequests(searchTerm);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests, searchTerm]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchRequests(searchTerm);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchTerm, fetchRequests]);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    let rejectionReason: string | undefined;
    if (action === 'REJECT') {
      const warned = window.confirm(
        isAr
          ? 'تنبيه: سبب الرفض سيُرسل إلى الإيميل المسجّل للعميل/التاجر. المتابعة؟'
          : 'Warning: the rejection reason will be emailed to the registered address. Continue?',
      );
      if (!warned) return;
      rejectionReason =
        window.prompt(
          isAr
            ? 'سبب الرفض (إلزامي — سيُرسل بالإيميل):'
            : 'Rejection reason (required — will be emailed):',
        ) || undefined;
      if (!rejectionReason || rejectionReason.trim().length < 5) {
        alert(
          isAr
            ? 'سبب الرفض إلزامي (5 أحرف على الأقل) وسيُرسل للبريد المسجّل.'
            : 'Rejection reason is required (min 5 chars) and will be emailed.',
        );
        return;
      }
    } else if (
      !window.confirm(
        isAr
          ? 'الموافقة ستُرسل رمز الاستكمال تلقائياً إلى الإيميل المسجّل. المتابعة؟'
          : 'Approval will email the resume token to the registered address. Continue?',
      )
    ) {
      return;
    }

    try {
      const res = await client.post('/auth/recovery/admin/resolve', {
        requestId: id,
        action,
        rejectionReason,
      });
      if (res.data?.resumeToken) {
        setLastResumeToken({ id, token: res.data.resumeToken });
        const emailed = res.data.emailSent
          ? isAr
            ? `تم إرسال الرمز إلى ${res.data.maskedEmail || 'الإيميل المسجّل'}.`
            : `Token emailed to ${res.data.maskedEmail || 'registered email'}.`
          : isAr
            ? 'تعذّر إرسال الإيميل — انسخ الرمز ووصّله يدوياً.'
            : 'Email failed — copy the token and deliver it manually.';
        window.alert(
          (isAr
            ? 'تمت الموافقة. انسخ رمز الاستكمال الآن (يظهر مرة واحدة).\n'
            : 'Approved. Copy the resume token now (shown once).\n') + emailed,
        );
      } else if (action === 'REJECT') {
        const emailed = res.data?.emailSent
          ? isAr
            ? `تم إرسال سبب الرفض إلى ${res.data.maskedEmail || 'الإيميل المسجّل'}.`
            : `Rejection emailed to ${res.data.maskedEmail || 'registered email'}.`
          : isAr
            ? 'تم الرفض؛ تعذّر إرسال إيميل السبب.'
            : 'Rejected; reason email failed.';
        window.alert(emailed);
      }
      fetchRequests(searchTerm);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      alert(
        (Array.isArray(msg) ? msg[0] : msg) ||
          (isAr ? 'فشلت العملية' : 'Action failed'),
      );
    }
  };

  const handleFreeze = async (userId: string) => {
    const note =
      window.prompt(
        isAr
          ? 'ملاحظة التجميد اليدوي (احتيال/استيلاء):'
          : 'Manual freeze note (fraud/takeover):',
      ) || undefined;
    if (
      !window.confirm(
        isAr
          ? 'تجميد الحساب يدوياً (سحب + تعليق مؤقت)؟'
          : 'Manually freeze this account (withdrawals + temporary suspend)?',
      )
    ) {
      return;
    }
    try {
      await client.post('/auth/recovery/admin/freeze-user', { userId, note });
      alert(isAr ? 'تم تجميد الحساب' : 'Account frozen');
    } catch {
      alert(isAr ? 'فشل التجميد' : 'Freeze failed');
    }
  };

  const navigateToProfile = (userId: string, role: string) => {
    const isMerchant = role === 'VENDOR' || role === 'merchant';
    const path = isMerchant ? 'store-profile' : 'customer-profile';
    window.dispatchEvent(new CustomEvent('admin-nav', { detail: { path, id: userId } }));
  };

  const caseLabel = (t: string) => {
    if (t === 'LOST_BOTH') return isAr ? 'فقد الاتنين (عالي الخطورة)' : 'Lost both (High Risk)';
    if (t === 'LOST_EMAIL') return isAr ? 'فقد الإيميل' : 'Lost email';
    return isAr ? 'فقد الجوال' : 'Lost phone';
  };

  const statusLabel = (s: string) => {
    const map: Record<string, [string, string]> = {
      PENDING_REVIEW: ['قيد المراجعة', 'Pending review'],
      APPROVED_AWAITING_CONTACTS: ['بانتظار بيانات جديدة', 'Awaiting new contacts'],
      APPROVED: ['مكتمل', 'Completed'],
      REJECTED: ['مرفوض', 'Rejected'],
    };
    const pair = map[s] || [s, s];
    return isAr ? pair[0] : pair[1];
  };

  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-white flex items-center gap-3">
          <ShieldAlert className="text-orange-500" />
          {isAr ? 'مراجعات استرجاع الحسابات' : 'Account Recovery Reviews'}
        </h3>
        <AdminSearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={isAr ? 'بحث بالاسم، الرقم أو المعرف...' : 'Search name, phone or ID...'}
          className="w-72"
        />
      </div>

      {loadError && (
        <div className="mb-4 p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-sm text-red-200">
          {loadError}
        </div>
      )}

      {lastResumeToken && (
        <div className="mb-4 p-4 rounded-xl border border-gold-500/40 bg-gold-500/10 text-sm text-gold-100">
          <div className="font-bold mb-2">
            {isAr
              ? 'رمز الاستكمال (نسخة احتياطية للأدمن — يُعرض مرة واحدة؛ أُرسل أيضاً للإيميل المسجّل إن نجح الإرسال)'
              : 'Resume token (admin backup — shown once; also emailed to registered address if send succeeded)'}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs break-all bg-black/40 px-2 py-1 rounded">
              {lastResumeToken.token}
            </code>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-gold-300 hover:text-white"
              onClick={() => navigator.clipboard.writeText(lastResumeToken.token)}
            >
              <Copy size={14} /> {isAr ? 'نسخ' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-white/[0.05] text-[10px] text-white/30 uppercase tracking-[0.15em] font-black bg-black/20">
              <th className="py-4 px-4 text-start">{isAr ? 'النوع' : 'Case'}</th>
              <th className="py-4 px-4 text-start">{isAr ? 'المستخدم' : 'User'}</th>
              <th className="py-4 px-4 text-start">{isAr ? 'البيانات' : 'Details'}</th>
              <th className="py-4 px-4 text-start">{isAr ? 'المخاطر' : 'Risk'}</th>
              <th className="py-4 px-4 text-start">{isAr ? 'الحالة' : 'Status'}</th>
              <th className="py-4 px-4 text-end">{isAr ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-white/40">
                  {isAr ? 'جاري التحميل...' : 'Loading...'}
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-white/20">
                  {loadError
                    ? isAr
                      ? '—'
                      : '—'
                    : isAr
                      ? 'لا توجد طلبات'
                      : 'No requests'}
                </td>
              </tr>
            ) : (
              requests.map((r) => {
                const isHighRiskPending =
                  r.caseType === 'LOST_BOTH' && r.status === 'PENDING_REVIEW';
                return (
                <tr
                  key={r.id}
                  className={
                    isHighRiskPending
                      ? 'bg-orange-500/10 hover:bg-orange-500/15 border-l-2 border-orange-400'
                      : 'hover:bg-white/[0.02]'
                  }
                >
                  <td className="py-4 px-4 text-sm text-white/80">
                    <span
                      className={
                        r.caseType === 'LOST_BOTH'
                          ? 'text-orange-300 font-bold'
                          : 'text-white/70'
                      }
                    >
                      {caseLabel(r.caseType)}
                    </span>
                    {isHighRiskPending && (
                      <div className="text-[10px] text-orange-300/80 mt-1 font-bold uppercase tracking-wide">
                        {isAr ? 'يتطلب مراجعة فورية' : 'Needs immediate review'}
                      </div>
                    )}
                    <div className="text-[10px] text-white/30 font-mono mt-1">
                      {r.id.slice(0, 8)}…
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-white">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-gold-300"
                      onClick={() => navigateToProfile(r.userId, r.userRole)}
                    >
                      {r.userName} <ExternalLink size={12} />
                    </button>
                    <div className="text-[10px] text-white/40">{r.userRole}</div>
                  </td>
                  <td className="py-4 px-4 text-xs text-white/60 space-y-1">
                    <div>
                      {isAr ? 'جوال:' : 'Phone:'} {r.oldPhone || '—'} → {r.newPhone || '—'}
                    </div>
                    <div>
                      {isAr ? 'إيميل:' : 'Email:'} {r.oldEmail || '—'} → {r.newEmail || '—'}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs text-white/60">
                    <div>
                      {Number(r.balanceSnapshot).toFixed(2)} AED
                    </div>
                    <div>
                      {isAr ? 'طلبات:' : 'Orders:'} {r.openOrdersCount} ·{' '}
                      {isAr ? 'نزاعات:' : 'Disputes:'} {r.disputesCount}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs text-white/70">{statusLabel(r.status)}</td>
                  <td className="py-4 px-4 text-end">
                    <div className="inline-flex flex-wrap gap-2 justify-end">
                      {r.status === 'PENDING_REVIEW' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAction(r.id, 'APPROVE')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold inline-flex items-center gap-1"
                          >
                            <CheckCircle size={12} /> {isAr ? 'موافقة' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(r.id, 'REJECT')}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-bold inline-flex items-center gap-1"
                          >
                            <XCircle size={12} /> {isAr ? 'رفض' : 'Reject'}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleFreeze(r.userId)}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-200 text-xs font-bold inline-flex items-center gap-1"
                        title={isAr ? 'تجميد يدوي' : 'Manual freeze'}
                      >
                        <Snowflake size={12} /> {isAr ? 'تجميد' : 'Freeze'}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

export default AccountRecoveries;
