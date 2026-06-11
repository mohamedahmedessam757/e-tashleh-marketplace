
import { create } from 'zustand';
import { useSupportStore } from './useSupportStore';

export interface Message {
  id: string;
  sender: 'user' | 'merchant';
  text: string;
  timestamp: string;
  isOffer?: boolean;
  offerDetails?: {
    price: string;
    description: string;
  };
  mediaUrl?: string; // NEW: For images/videos
  mediaType?: 'image' | 'video'; // NEW
}

export interface Chat {
  id: string;
  merchantName: string;
  merchantId?: string; // NEW
  customerName: string;
  customerId?: string; // NEW
  customerPhone: string;
  orderId: string;
  partName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
  type: 'merchant' | 'support';
  createdAt: string; // ISO String
}

export type ChatStatus = 'active' | 'expired' | 'closed_others';

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  acceptedChats: Record<string, string>; // orderId -> chatId
  setActiveChat: (id: string) => void;
  sendMessage: (chatId: string, text: string, attachment?: { mediaUrl: string; mediaType: 'image' | 'video' }) => void;
  openChatForOrder: (orderId: string, merchantName: string, partName?: string) => void;
  syncSupportTickets: () => void;
  acceptOffer: (orderId: string, chatId: string) => void; // NEW
  getChatStatus: (chatId: string) => ChatStatus; // NEW
}

// Helper to generate past dates
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  acceptedChats: {}, // Initial state: No offers accepted

  setActiveChat: (id) => set({ activeChatId: id }),

  sendMessage: (chatId, text, attachment) => {
    const state = get();

    // Guard: Don't allow sending if chat is not active
    if (state.getChatStatus(chatId) !== 'active') {
      console.warn('Cannot send message to closed/expired chat');
      return;
    }

    const chat = state.chats.find(c => c.id === chatId);

    if (chat?.type === 'support') {
      useSupportStore.getState().addMessage(
        chatId,
        text,
        attachment?.mediaUrl,
        attachment?.mediaType
      );
      get().syncSupportTickets();
      return;
    }

    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId
          ? {
            ...c,
            lastMessage: attachment ? (attachment.mediaType === 'image' ? 'Sent an image' : 'Sent a video') : text,
            lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messages: [
              ...c.messages,
              {
                id: Date.now().toString(),
                sender: 'user',
                text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                ...(attachment || {})
              },
            ],
          }
          : c
      ),
    }));
  },

  openChatForOrder: (orderId, merchantName, partName = 'Car Part') => {
    const state = get();
    const existingChat = state.chats.find(c => c.orderId === orderId && c.merchantName === merchantName);

    if (existingChat) {
      set({ activeChatId: existingChat.id });
    } else {
      const newChat: Chat = {
        id: Date.now().toString(),
        merchantName,
        customerName: 'Customer',
        customerPhone: '05XXXXXXXX',
        orderId,
        partName,
        lastMessage: 'Chat started',
        lastMessageTime: 'Now',
        unreadCount: 0,
        type: 'merchant',
        createdAt: new Date().toISOString(),
        messages: [
          { id: 'init', sender: 'merchant', text: `Offer submitted for ${partName}. Chat is now open.`, timestamp: 'Now' }
        ]
      };
      set(state => ({ chats: [newChat, ...state.chats], activeChatId: newChat.id }));
    }
  },

  syncSupportTickets: () => {
    const tickets = useSupportStore.getState().tickets;
    const supportChats: Chat[] = tickets.map(t => ({
      id: t.id,
      merchantName: 'Customer Support',
      customerName: t.userName || 'User',
      customerPhone: '',
      orderId: '0',
      partName: t.subject,
      lastMessage: t.messages && t.messages.length > 0
        ? (t.messages[t.messages.length - 1]?.text || (t.messages[t.messages.length - 1]?.mediaUrl ? '[Attachment]' : t.message))
        : t.message,
      lastMessageTime: new Date(t.lastUpdate || t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unreadCount: t.status === 'RESOLVED' ? 0 : 1,
      type: 'support',
      createdAt: t.created_at || new Date().toISOString(),
      messages: (t.messages || []).map(m => ({
        id: m.id,
        sender: m.senderRole === 'user' ? 'user' : 'merchant',
        text: m.text,
        timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType
      }))
    }));

    set(state => {
      const merchantChats = state.chats.filter(c => c.type !== 'support');
      return {
        chats: [...supportChats, ...merchantChats]
      };
    });
  },

  acceptOffer: (orderId, chatId) => {
    set(state => ({
      acceptedChats: {
        ...state.acceptedChats,
        [orderId]: chatId
      }
    }));
  },

  getChatStatus: (chatId) => {
    const state = get();
    const chat = state.chats.find(c => c.id === chatId);
    if (!chat) return 'expired'; // Default safety

    const createdTime = new Date(chat.createdAt).getTime();
    const now = Date.now();
    const hoursElapsed = (now - createdTime) / (1000 * 60 * 60);

    // Support Tickets never expire by time boundary
    if (chat.type === 'support') {
      return 'active';
    }

    // Merchant Offers SLA (24 hours strict closure or chosen otherwise)
    const acceptedChatId = state.acceptedChats[chat.orderId];

    if (acceptedChatId) {
      if (acceptedChatId === chatId) return 'active';
      return 'closed_others';
    }

    // Unaccepted offers expire after 24h
    if (hoursElapsed > 24) {
      return 'expired';
    }

    return 'active';
  }
}));

// Initial sync of support tickets when the store is created
useChatStore.getState().syncSupportTickets();

// Subscribe to support store changes to keep chat store updated
useSupportStore.subscribe(() => {
  // console.log('Support Store changed, syncing chats...');
  useChatStore.getState().syncSupportTickets();
});
