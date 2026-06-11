import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../services/api/config';
import { getCurrentUserId } from '../utils/auth';
import { notificationsApi } from '../services/api/notifications';
import {
  addDismissedPopupId,
  isPopupDismissed,
} from '../utils/notificationDismissals';

const wsBaseUrl = API_URL.replace(/\/api\/?$/, '');
let socket: Socket | null = null;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function newLocalNotificationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** One payment-success notification per offer (hides legacy DB duplicates). */
function dedupePaymentNotifications(rows: Notification[]): Notification[] {
  const seenOfferIds = new Set<string>();
  return rows.filter((n) => {
    if (n.type !== 'payment') return true;
    const offerId = n.metadata?.offerId != null ? String(n.metadata.offerId) : '';
    if (!offerId) return true;
    if (seenOfferIds.has(offerId)) return false;
    seenOfferIds.add(offerId);
    return true;
  });
}

function mapNotificationRow(n: any): Notification {
  return {
    id: n.id,
    recipientId: n.recipientId ?? n.recipient_id,
    recipientRole: n.recipientRole ?? n.recipient_role,
    titleAr: n.titleAr ?? n.title_ar,
    titleEn: n.titleEn ?? n.title_en,
    messageAr: n.messageAr ?? n.message_ar,
    messageEn: n.messageEn ?? n.message_en,
    type: n.type,
    isRead: n.isRead ?? n.is_read,
    link: n.link,
    metadata: n.metadata,
    createdAt: n.createdAt ?? n.created_at,
  };
}

export type NotificationType = 'ORDER' | 'SYSTEM' | 'OFFER' | 'PAYMENT' | 'SHIPPING' | 'DELIVERED' | 'CANCELED' | 'RATE' | 'DISPUTE' | 'DOC_EXPIRY' | 'SECURITY';

export interface Notification {
  id: string;
  recipientId: string;
  recipientRole: string; // CUSTOMER | MERCHANT | ADMIN
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  type: NotificationType | string; // 'ORDER', 'SYSTEM', etc.
  isRead: boolean;
  link?: string;
  metadata?: any;
  createdAt: string;

  // App-specific legacy UI properties
  titleKey?: string;
  message?: string;
  orderId?: number;
  linkTo?: string;
  priority?: string;
  channels?: string[];
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;

  fetchNotifications: (userId: string, role: string) => Promise<void>;
  markAsRead: (id: string, userId: string) => Promise<void>;
  /** Mark read on server + remember popup dismissed for this browser session */
  dismissNotification: (id: string) => Promise<void>;
  markAllAsRead: (userId: string, role: string) => Promise<void>;
  shouldShowAsPopup: (notification: Notification) => boolean;
  subscribeToNotifications: (userId: string, role: string) => void;
  unsubscribeFromNotifications: () => void;
  addNotification: (notification: Partial<Notification>) => Promise<void>;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isConnected: false,

  clearNotifications: () => set({
    notifications: [],
    unreadCount: 0,
    isLoading: false
  }),

  fetchNotifications: async (userId: string, role: string) => {
    if (!userId) return;
    set({ isLoading: true });
    
    try {
      console.log(`[Notifications] Fetching for user: ${userId} (Role: ${role})`);
      const rows = await notificationsApi.list();
      const mappedNotifications = dedupePaymentNotifications(
        (rows || []).map(mapNotificationRow),
      );

      if (mappedNotifications.length === 0) {
        console.warn('[Notifications] No notifications returned from API for this user.');
      } else {
        console.log(`[Notifications] Successfully loaded ${mappedNotifications.length} items.`);
      }

      const withDismissals = mappedNotifications.map((n) =>
        userId && isPopupDismissed(userId, n.id) ? { ...n, isRead: true } : n,
      );

      set({
        notifications: withDismissals,
        unreadCount: withDismissals.filter((n) => !n.isRead).length,
        isLoading: false,
      });
    } catch (error) {
      console.error('[Notifications] Critical Store Error:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string, userId: string) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.isRead).length,
      };
    });

    if (!UUID_RE.test(id)) {
      return;
    }

    try {
      await notificationsApi.markRead(id);
    } catch (error) {
      console.error('[Notifications] markAsRead failed:', error);
    }
  },

  dismissNotification: async (id: string) => {
    const userId = getCurrentUserId();
    if (!userId) return;
    addDismissedPopupId(userId, id);
    await get().markAsRead(id, userId);
  },

  shouldShowAsPopup: (notification: Notification) => {
    const userId = getCurrentUserId();
    if (!userId || notification.isRead) return false;
    if (isPopupDismissed(userId, notification.id)) return false;
    const popupTypes = new Set(['DISPUTE', 'SECURITY', 'PAYMENT']);
    return popupTypes.has(String(notification.type || '').toUpperCase());
  },

  markAllAsRead: async (userId: string, _role: string) => {
    const popupTypes = new Set(['DISPUTE', 'SECURITY', 'PAYMENT']);
    get().notifications.forEach((n) => {
      if (!n.isRead && popupTypes.has(String(n.type || '').toUpperCase())) {
        addDismissedPopupId(userId, n.id);
      }
    });

    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));

    try {
      await notificationsApi.markAllRead();
    } catch (error) {
      console.error('[Notifications] markAllAsRead failed:', error);
    }
  },

  addNotification: async (notification: Partial<Notification>) => {
    const recipientId = notification.recipientId || getCurrentUserId() || undefined;
    if (!recipientId) return;

    const recipientRole = notification.recipientRole || 'CUSTOMER';

    const newNotif = {
      recipient_id: recipientId,
      recipient_role: recipientRole.toUpperCase(),
      title_ar: notification.titleAr || 'إشعار جديد',
      title_en: notification.titleEn || 'New Notification',
      message_ar: notification.messageAr || notification.message || notification.messageEn || '',
      message_en: notification.messageEn || notification.message || notification.messageAr || '',
      type: notification.type || 'SYSTEM',
      link: notification.link,
      metadata: notification.metadata,
      is_read: false
    };

    // Optimistic
    const optimistic: Notification = {
      id: newLocalNotificationId(),
      recipientId,
      recipientRole: newNotif.recipient_role,
      titleAr: newNotif.title_ar,
      titleEn: newNotif.title_en,
      messageAr: newNotif.message_ar,
      messageEn: newNotif.message_en,
      type: newNotif.type,
      isRead: false,
      link: newNotif.link,
      metadata: newNotif.metadata,
      createdAt: new Date().toISOString()
    };

    set(state => ({
      notifications: [optimistic, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }));

    // Notifications are persisted server-side via WebSocket/API only (no direct Supabase insert)
  },

  subscribeToNotifications: (userId: string, role: string) => {
    // 1. Clean up legacy Supabase channels just in case
    supabase.getChannels().forEach(ch => {
      if (ch.topic.startsWith('public:notifications')) {
        supabase.removeChannel(ch);
      }
    });

    // 2. Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
    }

    // 3. Connect to the NestJS WebSockets Gateway (Phase 1 Infrastructure)
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    console.log(`[Notifications] Connecting to ${wsBaseUrl}/notifications for user ${userId}...`);
    socket = io(`${wsBaseUrl}/notifications`, {
      transports: ['websocket'],
      auth: token ? { token } : {},
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log(`[Notifications] ✅ Connected to WebSocket Gateway! Socket ID: ${socket?.id}`);
      set({ isConnected: true });
    });

    socket.on('disconnect', (reason) => {
      console.warn(`[Notifications] ❌ Disconnected from WebSocket: ${reason}`);
      set({ isConnected: false });
    });

    // 3.1 Common Handler
    const handleNewNotification = (payload: any) => {
      console.log('[Notifications] Received real-time event:', payload);

      const mapped: Notification = {
        id: payload.id || newLocalNotificationId(),
        recipientId: payload.recipientId,
        recipientRole: payload.recipientRole,
        titleAr: payload.titleAr,
        titleEn: payload.titleEn,
        messageAr: payload.messageAr,
        messageEn: payload.messageEn,
        type: payload.type,
        isRead: payload.isRead || false,
        link: payload.link,
        metadata: payload.metadata,
        createdAt: payload.createdAt || new Date().toISOString()
      };

      const uid = getCurrentUserId();
      if (uid && isPopupDismissed(uid, mapped.id)) {
        mapped.isRead = true;
      }

      set((state) => {
        if (state.notifications.some((n) => n.id === mapped.id)) return state;

        const paymentOfferId = mapped.metadata?.offerId != null ? String(mapped.metadata.offerId) : null;
        if (
          paymentOfferId &&
          mapped.type === 'payment' &&
          state.notifications.some(
            (n) =>
              n.type === 'payment' &&
              String(n.metadata?.offerId ?? '') === paymentOfferId,
          )
        ) {
          return state;
        }

        return {
          notifications: [mapped, ...state.notifications],
          unreadCount: mapped.isRead ? state.unreadCount : state.unreadCount + 1,
        };
      });
    };

    // Listen for standard notifications
    socket.on('new_notification', handleNewNotification);

    // Listen for administrative alerts if applicable
    socket.on('admin_alert', handleNewNotification);

    socket.on('connect_error', (err) => {
      console.error('[Notifications] Connection error:', err.message);
    });

    socket.on('disconnect', () => {
      console.log('[Notifications] Disconnected from Gateway');
    });
  },

  unsubscribeFromNotifications: () => {
    // Clean up legacy Supabase just in case
    supabase.getChannels().forEach(ch => {
      if (ch.topic.startsWith('public:notifications')) {
        supabase.removeChannel(ch);
      }
    });

    // Disconnect the WebSocket
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }
}));
