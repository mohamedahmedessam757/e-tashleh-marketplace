
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { getCurrentUserId } from '../utils/auth';
import { io, Socket } from 'socket.io-client';

interface LoyaltyTransaction {
    id: string;
    points: number;
    type: 'EARN' | 'REDEEM' | 'BONUS' | 'REFUND';
    description: string;
    created_at: string;
}

interface Review {
    id: string;
    store_id: string; // or store_name if joined
    rating: number;
    comment: string;
    status: 'PENDING' | 'PUBLISHED' | 'REJECTED';
    created_at: string;
    store?: { name: string }; // For joined data
}

export interface ReferralHistoryItem {
    id: string;
    firstName: string;
    registeredAt: string;
    windowStartsAt: string;
    windowExpiresAt: string;
    daysRemaining: number;
    isActive: boolean;
    totalEarned: number;
    ordersCount: number;
    lastRewardAt: string | null;
}

export interface ReferralTotals {
    count: number;
    earned: number;
    activeCount: number;
}

interface LoyaltyState {
    points: number; 
    loyaltyPoints: number; // 2026 Field
    tier: 'BASIC' | 'SILVER' | 'GOLD' | 'VIP' | 'PARTNER';
    totalSpent: number;
    referralCode: string;
    referralCount: number; // 2026 Field
    customerBalance: number; // 2026 Profit Balance
    pointsLastResetAt: string | null;
    transactions: LoyaltyTransaction[];
    reviews: Review[];
    referralHistory: ReferralHistoryItem[];
    referralTotals: ReferralTotals;
    referralHistoryLoading: boolean;
    loading: boolean;
    error: string | null;
    socket: Socket | null;
    initSocket: () => void;
    fetchLoyaltyData: () => Promise<void>;
    fetchReferralHistory: () => Promise<void>;
    redeemPoints: (amount: number, description: string) => Promise<boolean>;
    disconnectSocket: () => void;
}

export const useLoyaltyStore = create<LoyaltyState>((set, get) => ({
    points: 0,
    loyaltyPoints: 0,
    tier: 'BASIC',
    totalSpent: 0,
    referralCode: '',
    referralCount: 0,
    customerBalance: 0,
    pointsLastResetAt: null,
    transactions: [],
    reviews: [],
    referralHistory: [],
    referralTotals: { count: 0, earned: 0, activeCount: 0 },
    referralHistoryLoading: false,
    loading: false,
    error: null,
    socket: null,

    initSocket: () => {
        const currentSocket = get().socket;
        if (currentSocket) return;

        const userId = getCurrentUserId();
        if (!userId) return;

        const token = localStorage.getItem('access_token');
        const newSocket = io(`${import.meta.env.VITE_API_URL}/loyalty`, {
            transports: ['websocket'],
            autoConnect: true,
            auth: token ? { token } : {},
        });

        newSocket.on('connect', () => {
            console.log('Connected to Loyalty WebSockets');
            newSocket.emit('joinLoyalty', { targetId: userId, role: 'CUSTOMER' });
        });

        newSocket.on('loyaltyUpdated', (data: any) => {
            console.log('Real-time loyalty update:', data);
            set(state => ({
                tier: data.tier || state.tier,
                totalSpent: data.totalSpent !== undefined ? data.totalSpent : state.totalSpent,
                loyaltyPoints: data.loyaltyPoints !== undefined ? data.loyaltyPoints : state.loyaltyPoints,
                points: data.loyaltyPoints !== undefined ? data.loyaltyPoints : state.points,
                customerBalance: data.customerBalance !== undefined ? data.customerBalance : state.customerBalance
            }));
        });

        set({ socket: newSocket });
    },

    disconnectSocket: () => {
        const socket = get().socket;
        if (socket) {
            socket.disconnect();
            set({ socket: null });
        }
    },

    fetchLoyaltyData: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        // Initialize WebSockets when data is fetched
        get().initSocket();

        set({ loading: true, error: null });
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/loyalty/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch loyalty data');
            const data = await response.json();

            set({
                tier: data.loyaltyTier || 'BASIC',
                loyaltyPoints: data.loyaltyPoints || 0,
                totalSpent: Number(data.totalSpent) || 0,
                referralCode: data.referralCode || '',
                referralCount: data.referralCount || 0,
                customerBalance: data.customerBalance || 0,
                pointsLastResetAt: data.pointsLastResetAt || new Date().toISOString(),
                reviews: data.submittedReviews || []
            });

        } catch (error: any) {
            console.error('Error fetching loyalty data:', error);
            set({ error: error.message });
        } finally {
            set({ loading: false });
        }
    },

    fetchReferralHistory: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        set({ referralHistoryLoading: true });
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/loyalty/referrals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch referral history');
            const data = await response.json();

            set({
                referralHistory: Array.isArray(data.referrals) ? data.referrals : [],
                referralTotals: data.totals || { count: 0, earned: 0, activeCount: 0 },
            });
        } catch (error: any) {
            console.error('Error fetching referral history:', error);
        } finally {
            set({ referralHistoryLoading: false });
        }
    },

    redeemPoints: async (amount: number, description: string) => {
        const userId = getCurrentUserId();
        if (!userId) return false;

        const currentPoints = get().points;
        if (currentPoints < amount) {
            set({ error: 'Insufficient points' });
            return false;
        }

        set({ loading: true, error: null });

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/loyalty/redeem`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ amount, description }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to redeem points');
            }

            const data = await response.json();
            set(state => ({
                points: data.points,
                loyaltyPoints: data.points,
                transactions: data.transaction
                    ? [data.transaction, ...state.transactions]
                    : state.transactions,
            }));

            return true;

        } catch (error: any) {
            console.error('Error redeeming points:', error);
            set({ error: error.message });
            return false;
        } finally {
            set({ loading: false });
        }
    }
}));

