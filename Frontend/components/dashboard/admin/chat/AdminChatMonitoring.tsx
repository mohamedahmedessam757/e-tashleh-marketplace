import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { client as api } from '../../../../services/api/client';
import { ShieldAlert, RefreshCw, AlertTriangle, Eye, Ban, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../../../ui/GlassCard';

interface ChatViolationLog {
  id: string;
  actorId: string;
  actorType: string;
  actorName: string;
  action: string;
  entity: string;
  reason: string;
  timestamp: string; // Updated from createdAt to match Prisma schema
  metadata: {
      text?: string;
      chatId?: string;
      senderRole?: string;
  };
}

export const AdminChatMonitoring: React.FC = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [logs, setLogs] = useState<ChatViolationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/audit-logs/action/CHAT_VIOLATION');
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch chat violation logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAdminAction = async (chatId: string | undefined, actionType: 'close' | 'block', targetUserId?: string, logId?: string) => {
    if (!chatId) {
        alert(isAr ? 'معرف المحادثة غير متوفر لهذه المخالفة.' : 'Chat ID not available for this violation.');
        return;
    }
    
    if (!window.confirm(isAr ? 'هل أنت متأكد من تنفيذ هذا الإجراء؟' : 'Are you sure you want to perform this action?')) return;
    
    setActionLoading(logId || 'action');
    try {
      if (actionType === 'block' && targetUserId) {
        // Assume an endpoint exists or we use the chat action endpoint
        await api.post(`/chats/${chatId}/admin-action`, { action: 'block', targetUserId });
        alert(isAr ? 'تم حظر المستخدم بنجاح.' : 'User blocked successfully.');
      } else if (actionType === 'close') {
        await api.post(`/chats/${chatId}/admin-action`, { action: 'close' });
        alert(isAr ? 'تم إغلاق المحادثة بنجاح.' : 'Chat closed successfully.');
      }
    } catch (error) {
      console.error(`Failed to ${actionType}:`, error);
      alert(isAr ? 'حدث خطأ أثناء تنفيذ الإجراء.' : 'An error occurred during the action.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="text-red-500" />
            {isAr ? 'مراقبة المحادثات (Chat Guard)' : 'Chat Monitoring (Chat Guard)'}
          </h1>
          <p className="text-white/50 text-sm mt-1">
            {isAr 
              ? 'مراقبة محاولات تبادل معلومات الاتصال أو الروابط الممنوعة في المحادثات واتخاذ إجراءات رادعة.'
              : 'Monitor attempts to exchange contact information or prohibited links in chats and take deterrent actions.'}
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>{isAr ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 px-4">
                <th className={`p-4 text-xs font-bold text-white/50 uppercase tracking-wider ${isAr ? 'text-right' : 'text-left'}`}>
                  {isAr ? 'المستخدم' : 'User'}
                </th>
                <th className={`p-4 text-xs font-bold text-white/50 uppercase tracking-wider ${isAr ? 'text-right' : 'text-left'}`}>
                  {isAr ? 'التفاصيل / المحتوى' : 'Details / Content'}
                </th>
                <th className={`p-4 text-xs font-bold text-white/50 uppercase tracking-wider ${isAr ? 'text-right' : 'text-left'}`}>
                  {isAr ? 'الوقت' : 'Time'}
                </th>
                <th className={`p-4 text-xs font-bold text-white/50 uppercase tracking-wider text-center`}>
                  {isAr ? 'إجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className={`p-4 align-top ${isAr ? 'text-right' : 'text-left'}`}>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-white">{log.actorName || 'Unknown User'}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${log.actorType === 'VENDOR' ? 'bg-gold-500/10 text-gold-400 border-gold-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                            {log.actorType || 'USER'}
                          </span>
                          <span className="text-xs text-white/40 font-mono" title={log.actorId}>{log.actorId?.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className={`p-4 align-top max-w-[400px] ${isAr ? 'text-right' : 'text-left'}`}>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} className="text-red-400" />
                          <span className="text-sm font-medium text-red-400">{isAr ? 'مخالفة فلتر المحادثات' : 'Chat Filter Violation'}</span>
                        </div>
                        {log.metadata?.text && (
                          <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-sm text-red-200 break-words font-mono relative overflow-hidden group w-full">
                           <div className="absolute inset-y-0 left-0 w-1 bg-red-500/50"></div>
                            {log.metadata.text}
                          </div>
                        )}
                         <div className="text-xs text-white/40 mt-1 flex items-center gap-1">
                             <span className="font-medium text-white/60">Chat ID:</span> {log.metadata?.chatId || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className={`p-4 align-top ${isAr ? 'text-right' : 'text-left'}`}>
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Clock size={14} />
                        {new Date(log.timestamp).toLocaleString(isAr ? 'ar-SA' : 'en-US', {
                          calendar: 'gregory',
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex items-center justify-center gap-2">
                         <button
                           onClick={() => handleAdminAction(log.metadata?.chatId, 'close', undefined, log.id)}
                           disabled={actionLoading === log.id}
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-lg transition-colors disabled:opacity-50"
                           title={isAr ? 'إغلاق المحادثة' : 'Close Chat'}
                         >
                            {actionLoading === log.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            <span className="text-xs font-semibold">{isAr ? 'إغلاق' : 'Close'}</span>
                         </button>
                         <button
                           onClick={() => handleAdminAction(log.metadata?.chatId, 'block', log.actorId, log.id)}
                           disabled={actionLoading === log.id}
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                           title={isAr ? 'حظر الحساب' : 'Block Account'}
                         >
                            {actionLoading === log.id ? <RefreshCw size={14} className="animate-spin" /> : <Ban size={14} />}
                            <span className="text-xs font-semibold">{isAr ? 'حظر' : 'Block'}</span>
                         </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-white/40">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center gap-3">
                         <RefreshCw className="animate-spin text-gold-500" size={24} />
                         <span>{isAr ? 'جاري التحميل...' : 'Loading...'}</span>
                      </div>
                    ) : (
                       <div className="flex flex-col items-center justify-center gap-3">
                         <CheckCircle2 className="text-green-500/50" size={32} />
                         <span>{isAr ? 'لا توجد مخالفات حالياً.' : 'No violations found.'}</span>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
