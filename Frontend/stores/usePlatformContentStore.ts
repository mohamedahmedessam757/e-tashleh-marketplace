import { create } from 'zustand';
import { supabase } from '../services/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';

export interface StaticPageSummary {
  slug: string;
  titleAr?: string | null;
  titleEn?: string | null;
  updatedAt?: string;
}

export interface PlatformAnnouncement {
  id: string;
  slug: string;
  titleAr?: string | null;
  titleEn?: string | null;
  bodyAr?: string | null;
  bodyEn?: string | null;
  effectiveFrom?: string;
  expiresAt?: string | null;
  audience?: string;
}

interface PlatformContentState {
  staticPages: StaticPageSummary[];
  announcements: PlatformAnnouncement[];
  isLoading: boolean;
  fetchStaticPages: () => Promise<void>;
  fetchAnnouncements: (audience?: string) => Promise<void>;
  subscribeRealtime: () => () => void;
}

export const usePlatformContentStore = create<PlatformContentState>((set, get) => ({
  staticPages: [],
  announcements: [],
  isLoading: false,

  fetchStaticPages: async () => {
    try {
      const res = await fetch(`${API_URL}/admin/static-pages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (res.ok) set({ staticPages: await res.json() });
    } catch (e) {
      console.warn('fetchStaticPages failed', e);
    }
  },

  fetchAnnouncements: async (audience = 'ALL') => {
    try {
      const res = await fetch(`${API_URL}/platform-announcements/active?audience=${audience}`);
      if (res.ok) set({ announcements: await res.json() });
    } catch (e) {
      console.warn('fetchAnnouncements failed', e);
    }
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('platform_content_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'static_pages' }, () => {
        get().fetchStaticPages();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_announcements' }, () => {
        get().fetchAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
