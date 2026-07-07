import { create } from 'zustand';
import { client } from '../services/api/client';
import { supabase } from '../services/supabase';

export type PlatformErrorSource = 'CLIENT' | 'API' | 'UNHANDLED';
export type PlatformErrorSeverity = 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface PlatformErrorEvent {
  id: string;
  source: PlatformErrorSource;
  severity: PlatformErrorSeverity;
  errorCode?: string | null;
  errorName?: string | null;
  message: string;
  stackFingerprint?: string | null;
  userId?: string | null;
  userRole: string;
  userEmail?: string | null;
  userPhone?: string | null;
  pagePath?: string | null;
  pageLabel?: string | null;
  httpMethod?: string | null;
  httpStatus?: number | null;
  requestPath?: string | null;
  correlationId: string;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string | null;
  deviceClass?: string;
  metadata?: Record<string, unknown>;
  user?: { id: string; name?: string; email?: string; phone?: string; role?: string };
}

export interface TopErrorSummary {
  stackFingerprint: string | null;
  errorName: string | null;
  sampleMessage: string;
  totalOccurrences: number;
  eventRows: number;
  lastSeenAt: string;
  percentOfTotal: number;
}

interface Filters {
  source: string;
  severity: string;
  userRole: string;
  deviceClass: string;
  resolved: string;
  dateFrom: string;
  dateTo: string;
  stackFingerprint: string;
}

interface PlatformErrorsState {
  items: PlatformErrorEvent[];
  topErrors: TopErrorSummary[];
  total: number;
  isLoading: boolean;
  search: string;
  filters: Filters;
  subscription: ReturnType<typeof supabase.channel> | null;
  correlated: PlatformErrorEvent[];
  fetchErrors: (search?: string) => Promise<void>;
  fetchTopErrors: () => Promise<void>;
  fetchCorrelated: (correlationId: string) => Promise<void>;
  resolveError: (id: string) => Promise<void>;
  setSearch: (q: string) => void;
  setFilter: (key: keyof Filters, value: string) => void;
  subscribe: () => void;
  unsubscribe: () => void;
}

const defaultFilters: Filters = {
  source: 'ALL',
  severity: 'ALL',
  userRole: 'ALL',
  deviceClass: 'ALL',
  resolved: 'ALL',
  dateFrom: '',
  dateTo: '',
  stackFingerprint: '',
};

export const usePlatformErrorsStore = create<PlatformErrorsState>((set, get) => ({
  items: [],
  topErrors: [],
  total: 0,
  isLoading: false,
  search: '',
  filters: { ...defaultFilters },
  subscription: null,
  correlated: [],

  setSearch: (q) => set({ search: q }),

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  fetchErrors: async (search?: string) => {
    const q = search ?? get().search;
    const f = get().filters;
    set({ isLoading: true, search: q });
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('offset', '0');
      if (q.trim()) params.set('search', q.trim());
      if (f.source !== 'ALL') params.set('source', f.source);
      if (f.severity !== 'ALL') params.set('severity', f.severity);
      if (f.userRole !== 'ALL') params.set('userRole', f.userRole);
      if (f.deviceClass !== 'ALL') params.set('deviceClass', f.deviceClass);
      if (f.resolved === 'true') params.set('resolved', 'true');
      if (f.resolved === 'false') params.set('resolved', 'false');
      if (f.dateFrom) params.set('dateFrom', f.dateFrom);
      if (f.dateTo) params.set('dateTo', f.dateTo);
      if (f.stackFingerprint) params.set('stackFingerprint', f.stackFingerprint);

      const { data } = await client.get(`/admin/platform-errors?${params.toString()}`);
      set({
        items: data.items || [],
        total: data.total || 0,
        isLoading: false,
      });
    } catch (e) {
      console.error('fetch platform errors failed', e);
      set({ isLoading: false });
    }
  },

  fetchTopErrors: async () => {
    try {
      const { data } = await client.get('/admin/platform-errors/summary/top');
      set({ topErrors: data || [] });
    } catch (e) {
      console.error('fetch top errors failed', e);
    }
  },

  fetchCorrelated: async (correlationId: string) => {
    try {
      const { data } = await client.get(`/admin/platform-errors/correlation/${correlationId}`);
      set({ correlated: data || [] });
    } catch (e) {
      console.error('fetch correlated errors failed', e);
      set({ correlated: [] });
    }
  },

  resolveError: async (id: string) => {
    await client.patch(`/admin/platform-errors/${id}/resolve`);
    await get().fetchErrors();
    await get().fetchTopErrors();
  },

  subscribe: () => {
    if (get().subscription) return;
    const sub = supabase
      .channel('platform-error-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'platform_error_events' },
        (payload) => {
          const row = payload.new as PlatformErrorEvent;
          set((s) => ({
            items: [row, ...s.items].slice(0, 200),
          }));
          void get().fetchTopErrors();
        },
      )
      .subscribe();
    set({ subscription: sub });
  },

  unsubscribe: () => {
    const sub = get().subscription;
    if (sub) {
      supabase.removeChannel(sub);
      set({ subscription: null });
    }
  },
}));
