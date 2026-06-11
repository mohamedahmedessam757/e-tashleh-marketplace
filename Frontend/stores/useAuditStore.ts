import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { auditApi } from '../services/api/audit';
import { supabase } from '../services/supabase';

export type ActorType = 'SYSTEM' | 'ADMIN' | 'CUSTOMER' | 'VENDOR';
export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'STATUS_CHANGE' | 'FINANCIAL' | 'STORE_STATUS_CHANGE' | 'STORE_NOTES_UPDATE' | 'DOC_APPROVED' | 'DOC_REJECTED' | 'AUTO_UNBAN';

export interface AuditLog {
  id: string; // UUID
  orderId?: string; // UUID from backend
  action: ActionType;
  entity: string;
  actorType: ActorType;
  actorId: string;
  actorName: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface AuditState {
  logs: AuditLog[];
  isLoading: boolean;
  error: string | null;
  subscription: any | null;
  hasMore: boolean;
  nextCursor: string | null;
  fetchLogs: () => Promise<void>;
  fetchMoreLogs: () => Promise<void>;
  fetchLogsByOrder: (orderId: string) => Promise<AuditLog[]>;
  getLogsByOrderId: (orderId: string) => AuditLog[];
  getLogsByActor: (actorType: ActorType) => AuditLog[];
  clearLogs: () => void;
  logAction: (log: Partial<AuditLog>) => void;
  subscribeToLogs: () => void;
  unsubscribeFromLogs: () => void;
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      logs: [],
      isLoading: false,
      hasMore: true,
      nextCursor: null,
      error: null,
      subscription: null,

      fetchLogs: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await auditApi.getAll();
          set({ 
            logs: result.data, 
            hasMore: result.hasMore, 
            nextCursor: result.nextCursor,
            isLoading: false 
          });
        } catch (err) {
          console.error("Failed to fetch logs:", err);
          set({ error: 'Failed to fetch audit logs', isLoading: false });
        }
      },

      fetchMoreLogs: async () => {
        const { nextCursor, isLoading, hasMore } = get();
        if (!hasMore || isLoading || !nextCursor) return;

        set({ isLoading: true });
        try {
          const result = await auditApi.getAll(nextCursor);
          set((state) => ({ 
            logs: [...state.logs, ...result.data], 
            hasMore: result.hasMore, 
            nextCursor: result.nextCursor,
            isLoading: false 
          }));
        } catch (err) {
          console.error("Failed to fetch more logs:", err);
          set({ isLoading: false });
        }
      },

      subscribeToLogs: () => {
        // Prevent duplicate subscriptions
        if (get().subscription) return;

        const sub = supabase.channel('audit-logs-realtime')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'audit_logs' },
            (payload) => {
              const newLog = payload.new as AuditLog;
              set((state) => ({
                // Add new log to the top and keep the list at a reasonable size (200 records)
                logs: [newLog, ...state.logs].slice(0, 200)
              }));
            }
          )
          .subscribe();

        set({ subscription: sub });
      },

      unsubscribeFromLogs: () => {
        const sub = get().subscription;
        if (sub) {
          supabase.removeChannel(sub);
          set({ subscription: null });
        }
      },

      fetchLogsByOrder: async (orderId: string) => {
        set({ isLoading: true });
        try {
          const data = await auditApi.getByOrder(orderId);
          set((state) => {
            const others = state.logs.filter(l => l.orderId !== orderId);
            return { logs: [...data, ...others], isLoading: false };
          });
          return data;
        } catch (err) {
          set({ isLoading: false });
          return [];
        }
      },

      getLogsByOrderId: (orderId) => get().logs.filter(l => l.orderId === orderId),
      getLogsByActor: (actorType) => get().logs.filter(l => l.actorType === actorType),
      clearLogs: () => set({ logs: [] }),
      logAction: (log) => set((state) => ({
        logs: [{ id: Date.now().toString(), timestamp: new Date().toISOString(), ...log } as AuditLog, ...state.logs]
      }))
    }),
    {
      name: 'etashleh-audit-storage',
      storage: createJSONStorage(() => sessionStorage),
      // We don't want to persist the subscription object
      partialize: (state) => {
        const { subscription, ...rest } = state;
        return rest;
      },
    }
  )
);
