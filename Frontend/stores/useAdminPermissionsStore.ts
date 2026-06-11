import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { client } from '../services/api/client';
import { getCurrentUser } from '../utils/auth';

export interface AdminPermissions {
  id: string;
  userId: string;
  permissions: Record<string, { 
    view: boolean; 
    edit: boolean;
    actions?: Record<string, boolean>;
    fields?: Record<string, boolean>;
    tabs?: Record<string, boolean>;
  }>;
  supportTicketCategories: string[];
  blurredSections: string[];
  isActive: boolean;
}

interface AdminPermissionsState {
  myPermissions: AdminPermissions | null;
  adminList: any[];
  isLoading: boolean;
  
  // Actions
  setMyPermissions: (permissions: AdminPermissions | null) => void;
  fetchMyPermissions: () => Promise<void>;
  fetchAdminList: () => Promise<void>;
  createAdmin: (data: any) => Promise<boolean>;
  updatePermissions: (userId: string, data: any) => Promise<boolean>;
  deleteAdmin: (userId: string) => Promise<boolean>;
  updateAdminPassword: (userId: string, password: string) => Promise<boolean>;
  
  // Helpers
  _getRole: () => string | null;
  canView: (page: string) => boolean;
  canEdit: (page: string) => boolean;
  canPerform: (page: string, action: string) => boolean;
  canViewField: (page: string, field: string) => boolean;
  canViewTab: (page: string, tabId: string) => boolean;
  isSectionBlurred: (section: string) => boolean;
  getTicketCategories: () => string[];
  
  // Realtime
  subscribeToPermissions: (userId: string) => () => void;
}

let permissionsRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export const useAdminPermissionsStore = create<AdminPermissionsState>((set, get) => ({
  myPermissions: null,
  adminList: [],
  isLoading: false,

  setMyPermissions: (permissions) => set({ myPermissions: permissions }),

  fetchMyPermissions: async () => {
    try {
      const res = await client.get('/admin-permissions/me');
      set({ myPermissions: res.data });
    } catch (error) {
      console.error('Failed to fetch my permissions', error);
    }
  },

  fetchAdminList: async () => {
    set({ isLoading: true });
    try {
      const res = await client.get('/admin-permissions');
      set({ adminList: res.data });
    } catch (error) {
      console.error('Failed to fetch admin list', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createAdmin: async (data) => {
    try {
      await client.post('/admin-permissions/create-admin', data);
      await get().fetchAdminList();
      return true;
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      const text = Array.isArray(msg)
        ? msg.join(', ')
        : msg || 'Failed to create admin account';
      console.error('Failed to create admin', text, error);
      throw new Error(text);
    }
  },

  updatePermissions: async (userId, data) => {
    try {
      await client.put(`/admin-permissions/${userId}`, data);
      await get().fetchAdminList();
      return true;
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      console.error('Failed to update permissions', msg || error);
      throw new Error(Array.isArray(msg) ? msg.join(', ') : msg || 'Update failed');
    }
  },

  deleteAdmin: async (userId) => {
    try {
      await client.delete(`/admin-permissions/${userId}`);
      await get().fetchAdminList();
      return true;
    } catch (error) {
      console.error('Failed to delete admin', error);
      return false;
    }
  },

  updateAdminPassword: async (userId, password) => {
    try {
      await client.put(`/admin-permissions/${userId}/password`, { newPassword: password });
      return true;
    } catch (error) {
      console.error('Failed to update admin password', error);
      return false;
    }
  },

  // Internal helper to get current role reliably
  _getRole: () => {
    const jwtUser = getCurrentUser();
    return jwtUser?.role ?? null;
  },

  canView: (page) => {
    const role = get()._getRole();
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
    if (role === 'VERIFICATION_OFFICER') {
      return page === 'verification-tasks' || page === 'verification-task-details' || page === 'profile';
    }

    const { myPermissions } = get();
    if (!myPermissions) return false;
    return myPermissions.permissions[page]?.view || false;
  },

  canEdit: (page) => {
    const role = get()._getRole();
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
    if (role === 'VERIFICATION_OFFICER') {
      return page === 'verification-tasks' || page === 'verification-task-details';
    }

    const { myPermissions } = get();
    if (!myPermissions) return false;
    return myPermissions.permissions[page]?.edit || false;
  },

  canPerform: (page, action) => {
    const role = get()._getRole();
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
    
    const { myPermissions } = get();
    if (!myPermissions) return false;
    
    const pagePerms = myPermissions.permissions[page];
    if (typeof pagePerms?.actions === 'object') {
        return pagePerms.actions[action] === true;
    }
    return false;
  },

  canViewField: (page, field) => {
    const role = get()._getRole();
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
    
    const { myPermissions } = get();
    if (!myPermissions) return false;

    const pagePerms = myPermissions.permissions[page];
    if (typeof pagePerms?.fields === 'object') {
        return pagePerms.fields[field] === true;
    }
    return false;
  },

  canViewTab: (page, tabId) => {
    const role = get()._getRole();
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
    
    const { myPermissions } = get();
    if (!myPermissions) return false;

    const pagePerms = myPermissions.permissions[page];
    if (pagePerms && typeof pagePerms.tabs === 'object' && pagePerms.tabs !== null) {
        return pagePerms.tabs[tabId] === true;
    }
    
    return get().canView(page);
  },

  isSectionBlurred: (section) => {
    const role = get()._getRole();
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return false;
    
    const { myPermissions } = get();
    if (!myPermissions) return false;
    return myPermissions.blurredSections?.includes(section) || false;
  },

  getTicketCategories: () => {
    const role = get()._getRole();
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return [];
    
    const { myPermissions } = get();
    if (!myPermissions || !myPermissions.supportTicketCategories) return ['__NONE__']; // Strict default
    return myPermissions.supportTicketCategories;
  },

  subscribeToPermissions: (userId) => {
    const channelName = `admin_permissions:${userId}`;

    if (permissionsRealtimeChannel) {
      supabase.removeChannel(permissionsRealtimeChannel);
      permissionsRealtimeChannel = null;
    }

    supabase.getChannels().forEach((ch) => {
      if (ch.topic === `realtime:${channelName}`) {
        supabase.removeChannel(ch);
      }
    });

    permissionsRealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'admin_permissions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.new) {
            set({ myPermissions: payload.new as AdminPermissions });
          }
        }
      )
      .subscribe();

    return () => {
      if (permissionsRealtimeChannel) {
        supabase.removeChannel(permissionsRealtimeChannel);
        permissionsRealtimeChannel = null;
      }
    };
  }
}));
