
import { create } from 'zustand';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { getCurrentUserId } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface AdminChatMessage {
    id: string;
    chatId?: string;
    senderId: string | null;
    text: string;
    translatedText?: string;
    createdAt: string;
    isRead: boolean;
    isDeletedByAdmin: boolean;
    mediaUrl?: string;
    mediaType?: string;
    mediaName?: string;
    senderRole?: string;
}

export interface AdminChat {
    id: string;
    orderId?: string;
    orderNumber?: string;
    partName?: string;
    customerId: string;
    customerName: string;
    customerAvatar?: string;
    vendorId?: string;
    vendorOwnerId?: string;
    vendorName?: string;
    vendorLogo?: string;
    vendorCode?: string;
    status: string;
    type: 'order' | 'support';
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    isDeletedByAdmin: boolean;
    adminJoinedAt?: string;
    customerTranslationEnabledAt?: string;
    vendorTranslationEnabledAt?: string;
    adminTranslationEnabledAt?: string;
    adminInitReason?: string;
    category?: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    source?: string;
    messages?: AdminChatMessage[];
}

interface AdminChatState {
    orderChats: AdminChat[];
    supportChats: AdminChat[];
    activeChat: AdminChat | null;
    isLoading: boolean;
    currentType: 'order' | 'support' | null;
    error: string | null;
    // Track if initial load has happened per type (prevents flicker on polls)
    _hasLoadedOrder: boolean;
    _hasLoadedSupport: boolean;

    fetchChats: (type?: string) => Promise<void>;
    fetchChatById: (id: string) => Promise<void>;
    adminAction: (chatId: string, action: string, payload?: any) => Promise<any>;
    sendMessage: (chatId: string, text: string, mediaUrl?: string, mediaType?: string, mediaName?: string) => Promise<void>;
    toggleTranslation: (chatId: string, enabled: boolean) => Promise<void>;
    initSupportChat: (params: { targetUserId: string; targetRole: 'CUSTOMER' | 'VENDOR'; reason: string; orderId?: string }) => Promise<AdminChat>;
    clearActiveChat: () => void;
    
    // WebSockets
    socket: Socket | null;
    initSocket: () => void;
    disconnectSocket: () => void;
}

export const useAdminChatStore = create<AdminChatState>((set, get) => ({
    orderChats: [],
    supportChats: [],
    activeChat: null,
    isLoading: false,
    currentType: null,
    error: null,
    _hasLoadedOrder: false,
    _hasLoadedSupport: false,

    socket: null,

    initSocket: () => {
        const { socket } = get();
        if (socket) return;

        const token = localStorage.getItem('access_token');
        const newSocket = io(`${API_URL}/chat`, {
            transports: ['websocket'],
            autoConnect: true,
            auth: token ? { token } : {},
        });

        newSocket.on('connect', () => {
            console.log('Admin Chat Socket Connected');
            if (token) {
                newSocket.emit('joinChat', { chatId: 'admin_global', role: 'admin' });
            }
        });

        // Listen for global chat updates (Phase 4)
        newSocket.on('chatListUpdate', (data: { chatId: string, type: 'order' | 'support' }) => {
            const { currentType, fetchChats } = get();
            // Only refetch if the update matches our current view
            if (currentType === data.type) {
                console.log(`Real-time update for ${data.type} list`);
                fetchChats(data.type);
            }
        });

        newSocket.on('newMessage', (message: AdminChatMessage) => {
            const { activeChat } = get();
            const currentUserId = getCurrentUserId();
            
            // Instantly append if it belongs to the active chat and isn't our own message (we handle our own in sendMessage)
            if (activeChat && activeChat.id === message?.chatId && message.senderId !== currentUserId) {
                // Prevent duplicate if we already refetched or updated
                const exists = activeChat.messages?.some(m => m.id === message.id);
                if (!exists) {
                    set({
                        activeChat: {
                            ...activeChat,
                            messages: [...(activeChat.messages || []), message]
                        }
                    });
                }
            }
        });

        set({ socket: newSocket });
    },

    disconnectSocket: () => {
        const { socket } = get();
        if (socket) {
            socket.disconnect();
            set({ socket: null });
        }
    },

    clearActiveChat: () => {
        const { socket, activeChat } = get();
        if (socket && activeChat) {
            socket.emit('leaveChat', { chatId: activeChat.id });
        }
        set({ activeChat: null });
    },

    fetchChats: async (type?: string) => {
        const effectiveType = (type as 'order' | 'support') || 'order';
        const stateKey = effectiveType === 'support' ? 'supportChats' : 'orderChats';
        const loadedKey = effectiveType === 'support' ? '_hasLoadedSupport' : '_hasLoadedOrder';
        const hasLoaded = get()[loadedKey];

        // CRITICAL FIX 1: When switching type, clear activeChat so old data doesn't leak
        if (get().currentType !== null && get().currentType !== effectiveType) {
            set({ activeChat: null });
        }

        // CRITICAL FIX 2: Only show loading on the very first fetch per type, never on polls
        if (!hasLoaded) {
            set({ isLoading: true });
        }

        set({ currentType: effectiveType });

        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_URL}/chats`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { type: effectiveType }
            });
            set({
                [stateKey]: response.data,
                [loadedKey]: true,
                isLoading: false
            } as any);
        } catch (error: any) {
            set({ error: error.message, isLoading: false, [loadedKey]: true } as any);
        }
    },

    fetchChatById: async (id) => {
        const { orderChats, activeChat: currentActive } = get();
        
        // 1. Optimistic Selection: Set basic chat info immediately from the list
        const chatFromList = orderChats.find(c => c.id === id);
        if (chatFromList) {
            set({ 
                activeChat: { ...chatFromList, messages: [] }, // Clear messages for fresh load
                isLoading: true 
            });
        } else {
            set({ isLoading: true });
        }
        
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_URL}/chats/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // 2. Final Update: Replace with full data from backend
            set({ activeChat: response.data, isLoading: false });

            // Socket Room Management
            const { socket } = get();
            if (socket) {
                if (currentActive && currentActive.id !== id) {
                    socket.emit('leaveChat', { chatId: currentActive.id });
                }
                socket.emit('joinChat', { chatId: id, role: 'admin' });
            }

        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    adminAction: async (chatId, action, payload) => {
        try {
            // 1) Optimistic UI update for 'close' and 'block'
            const activeChat = get().activeChat;
            if (activeChat && activeChat.id === chatId) {
                if (action === 'block') {
                    set({ activeChat: { ...activeChat, status: 'CLOSED' } }); // Blocking can stay optimistic as it's more severe
                }
            }

            const token = localStorage.getItem('access_token');
            const response = await axios.post(`${API_URL}/chats/${chatId}/admin-action`, 
                { action, payload },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // 3) Update status after server confirmation for 'close'
            if (action === 'close' && get().activeChat?.id === chatId) {
                set({ activeChat: { ...get().activeChat!, status: 'CLOSED' } });
            }

            return response.data;
        } catch (error: any) {
            console.error('Admin action failed:', error);
            throw error;
        }
    },

    sendMessage: async (chatId, text, mediaUrl, mediaType, mediaName) => {
        try {
            const token = localStorage.getItem('access_token');
            const activeChat = get().activeChat;

            // 1) Optimistic UI update for instant feedback
            if (activeChat && activeChat.id === chatId) {
                const optimisticMsg: AdminChatMessage = {
                    id: `temp-${Date.now()}`,
                    chatId,
                    senderId: 'admin_optimistic', 
                    text,
                    createdAt: new Date().toISOString(),
                    isRead: true,
                    isDeletedByAdmin: false,
                    mediaUrl,
                    mediaType,
                    mediaName
                };
                
                set({
                    activeChat: {
                        ...activeChat,
                        messages: [...(activeChat.messages || []), optimisticMsg]
                    }
                });
            }

            // 2) Send actual request to server
            const response = await axios.post(`${API_URL}/chats/${chatId}/messages`, 
                { text, mediaUrl, mediaType, mediaName },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // 3) Update optimistic message with real DB data to avoid refetch/loading
            const realMessage = response.data;
            if (get().activeChat?.id === chatId) {
                set((state) => ({
                    activeChat: state.activeChat ? {
                        ...state.activeChat,
                        messages: (state.activeChat.messages || []).map(m => 
                            m.senderId === 'admin_optimistic' && m.text === text ? realMessage : m
                        )
                    } : null
                }));
            }
        } catch (error: any) {
            console.error('Send message failed:', error);
            // On failure, refetch to clean up the optimistic state
            const currentActive = get().activeChat;
            if (currentActive?.id === chatId) {
                await get().fetchChatById(chatId);
            }
        }
    },

    toggleTranslation: async (chatId: string, enabled: boolean) => {
        try {
            const token = localStorage.getItem('access_token');
            await axios.post(`${API_URL}/chats/${chatId}/translation`,
                { enabled },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Update local state optimisticly
            const activeChat = get().activeChat;
            if (activeChat && activeChat.id === chatId) {
                set({
                    activeChat: {
                        ...activeChat,
                        adminTranslationEnabledAt: enabled ? new Date().toISOString() : undefined
                    }
                });
            }
        } catch (error) {
            console.error('Failed to toggle translation:', error);
        }
    },

    initSupportChat: async (params) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.post(`${API_URL}/chats/admin-init-support`, 
                params,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // Refresh support chats list
            await get().fetchChats('support');
            
            return response.data;
        } catch (error: any) {
            console.error('Init support chat failed:', error);
            throw error;
        }
    }
}));
