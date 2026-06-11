import { create } from 'zustand';
import { getCurrentUserId } from '../utils/auth';
import { supportApi } from '../services/api/support';
import { supabase } from '../services/supabase';

export interface SupportMessage {
  id: string;
  senderId: string;
  senderRole: 'user' | 'admin' | 'support';
  text: string;
  timestamp: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'CLOSED' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
  user_id: string;
  userName?: string;
  email?: string;
  userType: 'customer' | 'merchant';
  lastUpdate: string;
  messages: SupportMessage[];
}

interface SupportState {
  tickets: SupportTicket[];
  loading: boolean;
  error: string | null;

  fetchTickets: () => Promise<void>;
  createTicket: (subject: string, message: string, priority: string, mediaUrl?: string, mediaType?: 'image' | 'video') => Promise<boolean>;
  addMessage: (ticketId: string, text: string, mediaUrl?: string, mediaType?: 'image' | 'video') => Promise<void>;
  updateStatus: (ticketId: string, status: 'OPEN' | 'CLOSED' | 'RESOLVED') => void;

  // Realtime
  subscribeToTickets: () => void;
  unsubscribe: () => void;
}

export const useSupportStore = create<SupportState>((set, get) => ({
  tickets: [],
  loading: false,
  error: null,
  subscription: null as any,

  fetchTickets: async () => {
    set({ loading: true, error: null });
    try {
      const data = await supportApi.getAll();
      // Map backend response to store interface if needed
      // Backend returns: SupportTicket include messages
      const mappedTickets = data.map((t: any) => ({
        id: t.id,
        ticket_number: t.ticketNumber,
        subject: t.subject,
        message: t.message,
        status: t.status,
        priority: t.priority,
        created_at: t.createdAt,
        user_id: t.userId,
        // userId from auth? or stored..
        userType: t.userType,
        lastUpdate: t.updatedAt,
        messages: t.messages.map((m: any) => ({
          id: m.id,
          senderId: m.senderId,
          senderRole: m.senderRole,
          text: m.text,
          timestamp: m.createdAt,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType
        }))
      }));
      set({ tickets: mappedTickets, loading: false });
    } catch (error: any) {
      console.error('Failed to fetch tickets:', error);
      set({ error: error.message || 'Failed to fetch tickets', loading: false });
    }
  },

  createTicket: async (subject, message, priority, mediaUrl, mediaType) => {
    try {
      await supportApi.createTicket({
        subject,
        message,
        priority,
        // @ts-ignore
        mediaUrl,
        mediaType
      });
      await get().fetchTickets(); // Refresh
      return true;
    } catch (error) {
      console.error('Failed to create ticket:', error);
      return false;
    }
  },

  addMessage: async (ticketId, text, mediaUrl, mediaType) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      // Optimistic update
      const tempId = Date.now().toString();
      const newMessage: SupportMessage = {
        id: tempId,
        senderId: userId,
        senderRole: 'user',
        text,
        timestamp: new Date().toISOString(),
        mediaUrl,
        mediaType
      };

      set(state => ({
        tickets: state.tickets.map(t => {
          if (t.id === ticketId) {
            return {
              ...t,
              messages: [...t.messages, newMessage],
              lastUpdate: new Date().toISOString(),
              status: 'OPEN'
            };
          }
          return t;
        })
      }));

      await supportApi.addMessage(ticketId, {
        text,
        senderId: userId,
        role: 'CUSTOMER',
        mediaUrl,
        mediaType
      });

      // Re-fetch to confirm/sync
      // await get().fetchTickets(); 
    } catch (error) {
      console.error('Failed to add message:', error);
      // Revert on error properly in a real app
    }
  },

  updateStatus: (ticketId, status) => {
    // Backend TODO: Implement status update endpoint
    set(state => ({
      tickets: state.tickets.map(t => t.id === ticketId ? { ...t, status } : t)
    }));
  },

  subscribeToTickets: () => {
    // Subscribe to changes in 'support_tickets' and 'ticket_messages'
    const channel = supabase.channel('support-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => {
          get().fetchTickets();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_messages' },
        () => {
          get().fetchTickets();
        }
      )
      .subscribe();

    // @ts-ignore
    set({ subscription: channel });
  },

  unsubscribe: () => {
    const { subscription } = get() as any;
    if (subscription) supabase.removeChannel(subscription);
  }
}));

