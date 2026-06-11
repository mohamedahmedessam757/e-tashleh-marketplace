import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { getCurrentUserId, getCurrentUser } from '../utils/auth';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar?: string;
  withdrawalsFrozen?: boolean;
  withdrawalFreezeNote?: string;
  orderLimit?: number;
  restrictionAlertMessage?: string;
  violationScore?: number;
  totalDeliveredOrders?: number;
  totalReturnDisputeOrders?: number;
  cachedReturnRate?: number;
}

export interface Address {
  id: string;
  title: string;
  details: string;
  city: string;
  isDefault: boolean;
}

export interface Session {
  id: string;
  device: string;
  os: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface UserSettings {
  language: 'ar' | 'en';
  currency: string;
  notifications_email: boolean;
  notifications_push: boolean;
  notifications_sms: boolean;
  notifications_offers: boolean;
  theme: 'dark' | 'light';
  autoTranslateChat: boolean;
}

interface ProfileState {
  user: UserProfile | null;
  addresses: Address[];
  sessions: Session[];
  loading: boolean;
  error: string | null;
  settings: UserSettings;

  // Actions
  fetchProfile: () => Promise<void>;
  updateUser: (data: Partial<UserProfile>) => Promise<void>;
  updateSettings: (data: Partial<UserSettings>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;

  // Address Actions
  addAddress: (address: Omit<Address, 'id'>) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;

  // Session Actions
  terminateSession: (id: string) => Promise<void>;
  terminateAllSessions: () => Promise<void>;

  // Security Actions
  updatePassword: (current: string, newPass: string) => Promise<void>;
  detectCurrentSession: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  
  // System Actions
  clearProfile: () => void;
  subscribeToProfile: () => (() => void);
}

let profileRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export const useProfileStore = create<ProfileState>((set, get) => ({
  user: null,
  addresses: [],
  sessions: [],
  loading: false,
  error: null,
  settings: {
    language: 'ar',
    currency: 'AED',
    notifications_email: true,
    notifications_push: true,
    notifications_sms: true,
    notifications_offers: true,
    theme: 'dark',
    autoTranslateChat: false
  },

  clearProfile: () => set({ 
    user: null, 
    addresses: [], 
    sessions: [], 
    error: null,
    // Note: Settings preserved based on device or reset to default if preferred
  }),

  fetchProfile: async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      console.warn('[useProfileStore] No user ID found in localStorage');
      set({ user: null, loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {


      // 1. Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, phone, role, avatar, withdrawals_frozen, withdrawal_freeze_note, order_limit, restriction_alert_message, violation_score, total_delivered_orders, total_return_dispute_orders, cached_return_rate')
        .eq('id', userId)
        .maybeSingle();

      const loadProfileFromApi = async (): Promise<UserProfile | null> => {
        try {
          const { authApi } = await import('../services/api/auth');
          const p = await authApi.getProfile();
          if (!p) return null;
          return {
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            role: p.role,
            avatar: p.avatar,
            withdrawalsFrozen: p.withdrawalsFrozen,
            withdrawalFreezeNote: p.withdrawalFreezeNote,
            orderLimit: p.orderLimit,
            restrictionAlertMessage: p.restrictionAlertMessage,
            violationScore: p.violationScore,
            totalDeliveredOrders: p.totalDeliveredOrders,
            totalReturnDisputeOrders: p.totalReturnDisputeOrders,
            cachedReturnRate: p.cachedReturnRate
          };
        } catch (e) {
          console.warn('[useProfileStore] API profile fetch failed:', e);
          return null;
        }
      };

      let resolvedUser: UserProfile | null = null;

      if (!userError && userData) {
        resolvedUser = {
          id: userData.id,
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          role: userData.role || 'CUSTOMER',
          avatar: userData.avatar,
          withdrawalsFrozen: userData.withdrawals_frozen,
          withdrawalFreezeNote: userData.withdrawal_freeze_note,
          orderLimit: userData.order_limit,
          restrictionAlertMessage: userData.restriction_alert_message,
          violationScore: userData.violation_score,
          totalDeliveredOrders: userData.total_delivered_orders,
          totalReturnDisputeOrders: userData.total_return_dispute_orders,
          cachedReturnRate: userData.cached_return_rate
        };
      } else {
        const fromApi = await loadProfileFromApi();
        if (fromApi) {
          resolvedUser = fromApi;
        } else if (userError) {
          console.error('[useProfileStore] User fetch error:', userError);
          throw userError;
        } else {
          const tokenUser = getCurrentUser();
          if (tokenUser) {
            resolvedUser = {
              id: tokenUser.id,
              name: 'User',
              email: tokenUser.email,
              phone: '',
              role: tokenUser.role || 'CUSTOMER',
              avatar: undefined
            };
          } else {
            throw new Error('User record not found');
          }
        }
      }

      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      let currentSettings = get().settings;
      if (settingsData) {
        const preferredLang = settingsData.preferred_language as 'ar' | 'en' | undefined;
        currentSettings = {
          language: preferredLang || settingsData.language || 'ar',
          currency: settingsData.currency || currentSettings.currency,
          notifications_email: settingsData.notifications_email ?? currentSettings.notifications_email,
          notifications_push: settingsData.notifications_push ?? currentSettings.notifications_push,
          notifications_sms: settingsData.notifications_sms ?? currentSettings.notifications_sms,
          notifications_offers: settingsData.notifications_offers ?? currentSettings.notifications_offers,
          theme: settingsData.theme || currentSettings.theme,
          autoTranslateChat: settingsData.auto_translate_chat ?? false
        };
      }

      set({
        user: resolvedUser,
        settings: currentSettings,
        loading: false
      });
    } catch (err: any) {
      console.error('[useProfileStore] Failed to fetch profile:', err);
      set({ loading: false, error: err.message || 'Failed to load profile' });
    }
  },

  updateUser: async (data) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: data.name,
          phone: data.phone
        })
        .eq('id', userId);

      if (error) throw error;

      set((state) => ({
        user: state.user ? { ...state.user, ...data } : null
      }));
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      set({ error: err.message });
    }
  },

  updateSettings: async (data) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    // Optimistic Update
    set((state) => ({
      settings: { ...state.settings, ...data }
    }));

    try {
      const token = localStorage.getItem('access_token');
      const payload: Record<string, unknown> = { ...data };
      if (data.language) {
        payload.preferredLanguage = data.language;
        delete payload.language;
      }
      await fetch(`${import.meta.env.VITE_API_URL}/users/settings/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      console.error('Failed to update settings:', err);
    }
  },

  deleteAccount: async () => {
    set({ loading: true });
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      // Use Backend API to safely delete user from Supabase Auth & DB
      const { authApi } = await import('../services/api/auth');
      await authApi.deleteAccount();

      // Sign Out locally
      await supabase.auth.signOut();

      set({ user: null, sessions: [], addresses: [] });
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  addAddress: (address) => set((state) => {
    const isFirst = state.addresses.length === 0;
    const newAddress = { ...address, id: Date.now().toString(), isDefault: isFirst || address.isDefault };
    const updatedAddresses = address.isDefault
      ? state.addresses.map(a => ({ ...a, isDefault: false }))
      : state.addresses;
    return { addresses: [...updatedAddresses, newAddress] };
  }),

  removeAddress: (id) => set((state) => ({
    addresses: state.addresses.filter(a => a.id !== id)
  })),

  setDefaultAddress: (id) => set((state) => ({
    addresses: state.addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    }))
  })),

  terminateSession: async (id) => {
    try {
      const { authApi } = await import('../services/api/auth');
      await authApi.terminateSession(id);
      set((state) => ({
        sessions: state.sessions.filter(s => s.id !== id)
      }));
    } catch (err) {
      console.error('Failed to terminate session:', err);
      throw err;
    }
  },

  terminateAllSessions: async () => {
    try {
      const { authApi } = await import('../services/api/auth');
      await authApi.terminateAllSessions();
      set((state) => ({
        sessions: state.sessions.filter(s => s.isCurrent) // Keep only current
      }));
    } catch (err) {
      console.error('Failed to terminate all sessions:', err);
      throw err;
    }
  },

  updatePassword: async (currentPassword, newPassword) => {
    set({ loading: true });
    // Mock API Call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (currentPassword === 'wrong') {
          set({ loading: false, error: 'Incorrect current password' });
          reject(new Error('Incorrect current password'));
        } else {
          set({ loading: false });
          resolve();
        }
      }, 1000);
    });
  },

  uploadAvatar: async (file: File) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    // 1. Validate File
    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload an image file');
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB Limit
      throw new Error('Image size must be less than 2MB');
    }

    set({ loading: true });

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch(`${import.meta.env.VITE_API_URL}/uploads/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!uploadRes.ok) throw new Error('Avatar upload failed');
      const { url: publicUrl } = await uploadRes.json();

      try {
        const { authApi } = await import('../services/api/auth');
        await authApi.updateProfile({ avatar: publicUrl });
      } catch (backendErr) {
        console.error('Backend Update Failed:', backendErr);
        throw backendErr;
      }

      // 5. Update Local State Immediately
      set((state) => ({
        loading: false,
        user: state.user ? { ...state.user, avatar: publicUrl } : null
      }));

    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  detectCurrentSession: async () => {
    try {
      const { authApi } = await import('../services/api/auth');

      // Fetch Real Sessions from Database
      const dbSessions = await authApi.getSessions();

      // Parse token from local storage to identify "current"
      const currentToken = localStorage.getItem('token');

      // Map DB schema to Frontend Store schema
      const mappedSessions = dbSessions.map((s: any) => ({
        id: s.id,
        device: s.device || 'Unknown Device',
        os: s.os || 'Unknown OS',
        location: s.location || 'Unknown Location',
        ip: s.ip || 'Unknown IP',
        lastActive: s.lastActive || s.createdAt,
        isCurrent: s.token === currentToken // Mark whichever matches our active token
      }));

      // Sort so current is always first
      mappedSessions.sort((a: any, b: any) => (a.isCurrent === b.isCurrent) ? 0 : a.isCurrent ? -1 : 1);

      set({ sessions: mappedSessions });

    } catch (err) {
      console.error('Failed to fetch real sessions:', err);
      // Fallback: Clear if it fails to load real DB list
      set({ sessions: [] });
    }
  },

  subscribeToProfile: () => {
    const userId = getCurrentUserId();
    if (!userId) return () => {};

    const channelName = `profile-${userId}`;

    if (profileRealtimeChannel) {
      supabase.removeChannel(profileRealtimeChannel);
      profileRealtimeChannel = null;
    }

    supabase.getChannels().forEach((ch) => {
      if (ch.topic === `realtime:${channelName}`) {
        supabase.removeChannel(ch);
      }
    });

    profileRealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          const newData = payload.new as any;
          set((state) => ({
            user: state.user ? {
              ...state.user,
              withdrawalsFrozen: newData.withdrawals_frozen ?? state.user.withdrawalsFrozen,
              withdrawalFreezeNote: newData.withdrawal_freeze_note ?? state.user.withdrawalFreezeNote,
              orderLimit: newData.order_limit ?? state.user.orderLimit,
              restrictionAlertMessage: newData.restriction_alert_message ?? state.user.restrictionAlertMessage,
              violationScore: newData.violation_score ?? state.user.violationScore,
              totalDeliveredOrders: newData.total_delivered_orders ?? state.user.totalDeliveredOrders,
              totalReturnDisputeOrders: newData.total_return_dispute_orders ?? state.user.totalReturnDisputeOrders,
              cachedReturnRate: newData.cached_return_rate ?? state.user.cachedReturnRate,
            } : null
          }));
        }
      )
      .subscribe();

    return () => {
      if (profileRealtimeChannel) {
        supabase.removeChannel(profileRealtimeChannel);
        profileRealtimeChannel = null;
      }
    };
  }
}));
