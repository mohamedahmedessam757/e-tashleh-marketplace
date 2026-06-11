
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { client as api } from '../services/api/client';
import { io, Socket } from 'socket.io-client';

export interface OrderChatMessage {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    translatedText?: string;
    /** Play typewriter reveal once when translation just arrived */
    revealTranslation?: boolean;
    /** Optimistic: waiting for translation (show typing dots, hide source language) */
    translationPending?: boolean;
    mediaUrl?: string;
    mediaType?: string;
    mediaName?: string;
    isRead: boolean;
    createdAt: string;
    priority?: string;
    subject?: string;
}

export interface OrderChat {
    id: string;
    orderId: string;
    vendorId?: string;
    customerId: string;
    status: 'OPEN' | 'CLOSED' | 'EXPIRED';
    type: 'order' | 'support';
    expiryAt?: string;
    createdAt?: string;
    updatedAt?: string;
    customerTranslationEnabledAt?: string;
    vendorTranslationEnabledAt?: string;
    adminTranslationEnabledAt?: string;
    messages: OrderChatMessage[];

    // Mapped DTO Fields
    vendorName?: string;
    vendorLogo?: string;
    vendorCode?: string; // ADDED
    customerName?: string;
    customerAvatar?: string;
    customerCode?: string; // ADDED
    orderNumber?: string;
    partName?: string;
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount?: number;
}

interface OrderChatState {
    chats: OrderChat[];
    activeChat: OrderChat | null;
    isLoading: boolean;
    error: string | null;
    socket: Socket | null;
    isTyping: boolean;
    typingUserId: string | null;
    isChatContentLoading: boolean;
    globalChatSubscription: any;

    // Actions
    fetchChat: (orderId: string, vendorId: string) => Promise<any>;
    loadChat: (chatId: string) => Promise<void>;
    fetchChats: (silent?: boolean) => Promise<void>;
    createSupportChat: (subject: string, message: string, orderId?: string, mediaUrl?: string, mediaType?: string, mediaName?: string, priority?: string) => Promise<void>;
    setActiveChat: (chatId: string) => void;
    sendMessage: (payload: { text?: string; mediaUrl?: string; mediaType?: string; mediaName?: string; userId?: string; priority?: string; subject?: string; translationEnabled?: boolean }) => Promise<void>;
    toggleTranslation: (chatId: string, enabled: boolean, userRole?: string) => Promise<void>;
    markAsRead: (chatId: string) => Promise<void>;
    subscribeToChat: (chatId: string) => void;
    subscribeToAllChats: () => void;
    unsubscribeFromChat: () => void;
    clearChat: () => void;
    setTypingStatus: (chatId: string, isTyping: boolean, userId: string) => void;
}

/**
 * Maps Supabase snake_case response to TypeScript camelCase interface.
 * Supabase returns: sender_id, chat_id, is_read, created_at, translated_text, media_url, media_type, media_name
 * TypeScript expects: senderId, chatId, isRead, createdAt, translatedText, mediaUrl, mediaType, mediaName
 */
function mapSupabaseMessage(raw: any): OrderChatMessage {
    return {
        id: raw.id,
        chatId: raw.chat_id ?? raw.chatId,
        senderId: raw.sender_id ?? raw.senderId,
        text: raw.text || '',
        translatedText: raw.translated_text ?? raw.translatedText,
        mediaUrl: raw.media_url ?? raw.mediaUrl,
        mediaType: raw.media_type ?? raw.mediaType,
        mediaName: raw.media_name ?? raw.mediaName,
        isRead: raw.is_read ?? raw.isRead ?? false,
        createdAt: raw.created_at ?? raw.createdAt,
        priority: raw.priority,
        subject: raw.subject,
    };
}

// Module-level variable for typing timeout
let typingTimeout: any = null;
let previousChatRoom: string | null = null;

export const useOrderChatStore = create<OrderChatState>((set, get) => ({
    chats: [],
    activeChat: null,
    isLoading: false,
    isChatContentLoading: false,
    error: null,
    socket: null,
    isTyping: false,
    typingUserId: null,
    globalChatSubscription: null,

    fetchChat: async (orderId: string, vendorId: string) => {
        set({ isChatContentLoading: true, error: null });
        try {
            // Initiate via Backend to ensure it exists and runs guards
            const response = await api.post('/chats/init', { orderId, vendorId });
            const chat = response.data;

            // Use the messages included in the API response
            const mappedMessages = (chat.messages || []).map(mapSupabaseMessage);
            const activeChatData = { ...chat, messages: mappedMessages };
            
            set((state) => {
                const existingChatIndex = state.chats.findIndex(c => c.id === chat.id);
                const newChats = [...state.chats];
                if (existingChatIndex >= 0) {
                    newChats[existingChatIndex] = { ...newChats[existingChatIndex], ...chat };
                } else {
                    newChats.unshift(chat); // Add new chat to the top of the list
                }
                return {
                    chats: newChats,
                    activeChat: activeChatData,
                    isChatContentLoading: false
                };
            });

            // Auto subscribe for Realtime updates
            get().subscribeToChat(chat.id);
            
            return activeChatData;

        } catch (error: any) {
            console.error('Failed to fetch chat:', error);
            set({ error: error.message || 'Failed to load chat', isChatContentLoading: false });
            throw error;
        }
    },
    loadChat: async (chatId: string) => {
        // Use a separate loading state specifically for chat content
        set({ isChatContentLoading: true, error: null });
        try {
            const response = await api.get(`/chats/${chatId}`);
            const chat = response.data;

            // Use the messages included in the API response
            const mappedMessages = (chat.messages || []).map(mapSupabaseMessage);
            set({ activeChat: { ...chat, messages: mappedMessages }, isChatContentLoading: false });

            get().subscribeToChat(chat.id);
        } catch (error: any) {
            console.error('Failed to load chat by ID:', error);
            set({ error: error.message || 'Failed to load chat', isChatContentLoading: false });
        }
    },
    createSupportChat: async (subject: string, message: string, orderId?: string, mediaUrl?: string, mediaType?: string, mediaName?: string, priority?: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/chats/support', { orderId, subject, message, mediaUrl, mediaType, mediaName, priority });
            // Successfully created, fetch chats to refresh the list
            await get().fetchChats();
            get().setActiveChat(response.data.id); // Auto open
        } catch (error: any) {
            console.error('Failed to create support chat:', error);
            set({ error: error.message || 'Failed to create support chat', isLoading: false });
        }
    },

    sendMessage: async ({ text, mediaUrl, mediaType, mediaName, userId, priority, subject, translationEnabled }) => {
        const { activeChat } = get();
        if (!activeChat) return;

        // Use the passed resilient userId, fallback to LocalStorage ONLY as last resort
        let currentUserId = userId || 'unknown';
        if (currentUserId === 'unknown') {
            try {
                const profileData = localStorage.getItem('profile-storage');
                if (profileData) currentUserId = JSON.parse(profileData)?.state?.user?.id || 'unknown';
            } catch (e) { /* fallback */ }
        }

        // Optimistic UI: instant message render (0ms latency)
        const tempId = `temp-${Date.now()}`;
        const tempMessage: OrderChatMessage = {
            id: tempId,
            chatId: activeChat.id,
            senderId: currentUserId,
            text: text || '',
            isRead: false,
            createdAt: new Date().toISOString(),
            mediaUrl,
            mediaType,
            mediaName,
            priority,
            subject,
            translationPending: !!(translationEnabled && text?.trim()),
        };

        set((state) => ({
            activeChat: state.activeChat ? {
                ...state.activeChat,
                messages: [...state.activeChat.messages, tempMessage]
            } : null
        }));

        try {
            const response = await api.post(`/chats/${activeChat.id}/messages`, {
                text: text || '',
                mediaUrl,
                mediaType,
                mediaName,
                priority,
                subject
            });

            // Replace temp message with real DB message immediately (no wait for WebSocket)
            const realMessage = {
                ...mapSupabaseMessage(response.data),
                revealTranslation: !!(translationEnabled && mapSupabaseMessage(response.data).translatedText),
            };
            set((state) => {
                if (!state.activeChat) return state;
                const withoutTemp = state.activeChat.messages.filter(m => m.id !== tempId);
                if (withoutTemp.some(m => m.id === realMessage.id)) {
                    return { activeChat: { ...state.activeChat, messages: withoutTemp } };
                }
                return {
                    activeChat: {
                        ...state.activeChat,
                        messages: [...withoutTemp, realMessage]
                    }
                };
            });

        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message;
            console.error('Failed to send message:', errorMessage);
            // Revert optimistic message on failure
            set((state) => ({
                error: errorMessage,
                activeChat: state.activeChat ? {
                    ...state.activeChat,
                    messages: state.activeChat.messages.filter(m => m.id !== tempId)
                } : null
            }));
            throw new Error(errorMessage);
        }
    },

    fetchChats: async (silent = false) => {
        if (!silent) set({ isLoading: true, error: null });
        try {
            const response = await api.get('/chats'); // GET /chats endpoint
            if (silent) {
                set({ chats: response.data });
            } else {
                set({ chats: response.data, isLoading: false });
            }
            get().subscribeToAllChats();
        } catch (error: any) {
            console.error('Failed to fetch chats:', error);
            if (!silent) set({ error: error.message, isLoading: false });
        }
    },

    setActiveChat: (chatId: string) => {
        const { chats, activeChat: currentActive, unsubscribeFromChat } = get();

        // Skip if already viewing this chat (no unnecessary reload)
        if (currentActive?.id === chatId) return;

        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            // Clean up previous realtime subscriptions
            unsubscribeFromChat();

            // Set chat immediately with empty messages (instant UI response)
            set({ activeChat: { ...chat, messages: [] }, error: null });
            // Load messages in background (silent, no skeleton)
            get().loadChat(chat.id);
        }
    },

    toggleTranslation: async (chatId: string, enabled: boolean, rolePreference?: string) => {
        const { activeChat } = get();
        if (!activeChat || activeChat.id !== chatId) return;

        // Use the passed reliable role from the UI or fallback
        let userRole = rolePreference || 'CUSTOMER';
        if (!rolePreference) {
            try {
                const profileData = localStorage.getItem('profile-storage');
                if (profileData) userRole = JSON.parse(profileData)?.state?.user?.role || 'CUSTOMER';
            } catch (e) { }
        }

        const timestamp = enabled ? new Date().toISOString() : null;

        // Optimistic UI Update for zero latency toggling
        set((state) => {
            if (!state.activeChat) return state;
            const updated = { ...state.activeChat };
            if (userRole === 'CUSTOMER') updated.customerTranslationEnabledAt = timestamp;
            else if (userRole === 'VENDOR') updated.vendorTranslationEnabledAt = timestamp;
            else if (userRole === 'ADMIN') updated.adminTranslationEnabledAt = timestamp;

            return { activeChat: updated };
        });

        try {
            await api.post(`/chats/${chatId}/translation`, { enabled });
        } catch (error: any) {
            console.error('Translation toggle failed:', error);
            // Revert changes on fail
            set((state) => ({ error: error.message || 'Failed to toggle translation', activeChat }));
        }
    },

    markAsRead: async (chatId: string) => {
        try {
            await api.post(`/chats/${chatId}/read`);
            // Optimistic: update local state
            set((state) => ({
                activeChat: state.activeChat && state.activeChat.id === chatId ? {
                    ...state.activeChat,
                    messages: state.activeChat.messages.map(m => ({ ...m, isRead: true }))
                } : state.activeChat,
                chats: state.chats.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c)
            }));
        } catch (e) {
            console.error('Failed to mark messages as read:', e);
        }
    },

    subscribeToChat: (chatId: string) => {
        const initSocket = () => {
            const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');
            const token = localStorage.getItem('access_token');
            const socket = io(`${baseUrl}/chat`, {
                path: '/socket.io',
                transports: ['websocket'],
                auth: token ? { token } : {},
            });
            set({ socket });

            socket.on('connect', () => {
                console.log('Connected to Chat WebSockets');
                const room = get().activeChat?.id || chatId;
                socket.emit('joinChat', { chatId: room });
                previousChatRoom = room;
            });

            socket.on('newMessage', (rawMessage: any) => {
                const mapped = mapSupabaseMessage(rawMessage);
                const message: OrderChatMessage = {
                    ...mapped,
                    revealTranslation: !!mapped.translatedText,
                };
                const targetChatId = message.chatId || rawMessage.chat_id;
                set((state) => {
                    if (!state.activeChat || state.activeChat.id !== targetChatId) return state;
                    if (state.activeChat.messages.some(m => m.id === message.id)) return state;
                    const cleaned = state.activeChat.messages.filter(
                        m => !(m.id.startsWith('temp-') && m.text === message.text && m.senderId === message.senderId)
                    );
                    return {
                        isTyping: false,
                        activeChat: {
                            ...state.activeChat,
                            messages: [...cleaned, message]
                        }
                    };
                });

                if (typingTimeout) {
                    clearTimeout(typingTimeout);
                    typingTimeout = null;
                }
            });

            socket.on('messageUpdated', (rawMessage: any) => {
                const message = mapSupabaseMessage(rawMessage);
                const targetChatId = message.chatId || rawMessage.chat_id;
                set((state) => {
                    if (!state.activeChat || state.activeChat.id !== targetChatId) return state;
                    return {
                        activeChat: {
                            ...state.activeChat,
                            messages: state.activeChat.messages.map(m =>
                                m.id === message.id
                                    ? {
                                        ...m,
                                        translatedText: message.translatedText,
                                        revealTranslation: !!message.translatedText,
                                    }
                                    : m
                            )
                        }
                    };
                });
            });

            socket.on('userTyping', ({ userId, isTyping }) => {
                set({ isTyping, typingUserId: userId });

                if (typingTimeout) clearTimeout(typingTimeout);
                if (isTyping) {
                    typingTimeout = setTimeout(() => {
                        set({ isTyping: false });
                    }, 3000);
                }
            });

            socket.on('messagesRead', ({ chatId: readChatId, readByUserId }) => {
                set((state) => {
                    if (!state.activeChat || state.activeChat.id !== readChatId) return state;
                    return {
                        activeChat: {
                            ...state.activeChat,
                            messages: state.activeChat.messages.map(m =>
                                m.senderId !== readByUserId ? { ...m, isRead: true } : m
                            )
                        }
                    };
                });
            });

            socket.on('chatStatusChanged', ({ chatId: changedChatId, status }) => {
                set((state) => {
                    if (!state.activeChat || state.activeChat.id !== changedChatId) return state;
                    return {
                        activeChat: {
                            ...state.activeChat,
                            status: status as 'OPEN' | 'CLOSED' | 'EXPIRED'
                        }
                    };
                });
            });

        };

        // 1. Socket.IO Connection (real-time delivery)
        let socket = get().socket;
        if (!socket) {
            initSocket();
            socket = get().socket;
        } else {
            if (previousChatRoom && previousChatRoom !== chatId) {
                socket.emit('leaveChat', { chatId: previousChatRoom });
            }
            socket.emit('joinChat', { chatId });
            previousChatRoom = chatId;
        }

        // 2. Supabase Realtime (Failsafe & DB Updates)
        const channel = supabase
            .channel(`chat:${chatId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'order_chat_messages',
                    filter: `chat_id=eq.${chatId}`,
                },
                (payload) => {
                    const raw = payload.new;
                    const newMessage = mapSupabaseMessage(raw);
                    set((state) => {
                        if (!state.activeChat || state.activeChat.id !== chatId) return state;
                        // Dedup: skip if Socket.IO already added this message
                        if (state.activeChat.messages.some(m => m.id === newMessage.id)) return state;
                        // Clean up any lingering temp messages matching this real one
                        const cleaned = state.activeChat.messages.filter(
                            m => !(m.id.startsWith('temp-') && m.text === newMessage.text && m.senderId === newMessage.senderId)
                        );
                        return {
                            activeChat: {
                                ...state.activeChat,
                                messages: [...cleaned, newMessage]
                            }
                        };
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'order_chat_messages',
                    filter: `chat_id=eq.${chatId}`,
                },
                (payload) => {
                    const updated = mapSupabaseMessage(payload.new);
                    set((state) => {
                        if (!state.activeChat || state.activeChat.id !== chatId) return state;
                        return {
                            activeChat: {
                                ...state.activeChat,
                                messages: state.activeChat.messages.map(m =>
                                    m.id === updated.id ? { ...m, translatedText: updated.translatedText } : m
                                )
                            }
                        };
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE', // Catch status changes (EXPIRED/CLOSED)
                    schema: 'public',
                    table: 'order_chats',
                    filter: `id=eq.${chatId}`,
                },
                (payload) => {
                    const dbChat: any = payload.new;
                    set((state) => {
                        if (!state.activeChat || state.activeChat.id !== chatId) return state;
                        return {
                            activeChat: {
                                ...state.activeChat,
                                status: dbChat.status || state.activeChat.status,
                                customerTranslationEnabledAt: dbChat.customer_translation_enabled_at !== undefined ? dbChat.customer_translation_enabled_at : state.activeChat.customerTranslationEnabledAt,
                                vendorTranslationEnabledAt: dbChat.vendor_translation_enabled_at !== undefined ? dbChat.vendor_translation_enabled_at : state.activeChat.vendorTranslationEnabledAt,
                                adminTranslationEnabledAt: dbChat.admin_translation_enabled_at !== undefined ? dbChat.admin_translation_enabled_at : state.activeChat.adminTranslationEnabledAt,
                            }
                        };
                    });
                }
            )
            .subscribe();
    },

    setTypingStatus: (chatId: string, isTyping: boolean, userId: string) => {
        const socket = get().socket;
        if (socket) {
            socket.emit('typing', { chatId, isTyping, userId });
        }
    },

    subscribeToAllChats: () => {
        const { globalChatSubscription } = get();
        if (globalChatSubscription) return;

        const channel = supabase
            .channel('global_chats_list')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'order_chats' },
                (payload) => {
                    get().fetchChats(true); // silent fetch
                    
                    // If the updated chat is currently active, update its status in real-time
                    const dbChat: any = payload.new;
                    if (dbChat && dbChat.id) {
                        set((state) => {
                            if (!state.activeChat || state.activeChat.id !== dbChat.id) return state;
                            return {
                                activeChat: {
                                    ...state.activeChat,
                                    status: dbChat.status || state.activeChat.status
                                }
                            };
                        });
                    }
                }
            )
            .subscribe();

        set({ globalChatSubscription: channel });
    },

    unsubscribeFromChat: () => {
        const socket = get().socket;
        if (socket) {
            if (previousChatRoom) {
                socket.emit('leaveChat', { chatId: previousChatRoom });
                previousChatRoom = null;
            }
            socket.disconnect();
            set({ socket: null });
        }
        supabase.removeAllChannels();
    },

    clearChat: () => {
        get().unsubscribeFromChat();
        set({ activeChat: null, error: null, isTyping: false });
    }
}));
