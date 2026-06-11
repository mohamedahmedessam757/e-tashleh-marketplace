import { create } from 'zustand';

export interface WalletTransaction {
  id: string;
  orderId?: string;
  paymentId?: string;
  amount: number;
  transactionType?: string;
  type?: 'CREDIT' | 'DEBIT';
  currency: string;
  status: string;
  createdAt: string;
  description?: string;
  metadata?: any;
  order?: any;
}

export interface WalletStats {
  totalSpent: number;
  totalPurchases: number;
  monthlyRewards: number;
  monthlyLoyaltyRewards?: number;
  monthlyReferralRewards?: number;
  loyaltyPoints: number;
  loyaltyTier: string;
  referralCode: string;
  referralCount: number;
  customerBalance: number;
  completedOrders: number;
  totalOrdersCount: number;
  acceptanceRate: number;
  orderCompletionRate?: number;
  refundedAmount: number;
  pendingRewards: number;
  pendingLoyaltyRewards?: number;
  pendingReferralRewards?: number;
  profitPercentage: number;
  tierCashbackRate?: number;
  totalRewardsEarned?: number;
  netRewardsEarned?: number;
  walletDeductions?: number;
  referralRate?: number;
  referralWindowDays?: number;
  name?: string;
  stripeOnboarded?: boolean;
  stripeAccountId?: string;

  // Administrative Restrictions (v2026 Sync)
  withdrawalsFrozen?: boolean;
  withdrawalFreezeNote?: string;
  orderLimit?: number;
  restrictionAlertMessage?: string;
  pointsLastResetAt?: string;
}

export interface BankDetails {
  bankName: string;
  accountHolder: string;
  iban: string;
  swift: string;
  verified: boolean;
  stripeOnboarded: boolean;
  stripeAccountId: string | null;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payoutMethod: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerWalletState {
  stats: WalletStats | null;
  transactions: WalletTransaction[];
  withdrawalRequests: WithdrawalRequest[];
  withdrawalLimits: { min: number; max: number };
  bankDetails: BankDetails | null;
  isLoading: boolean;
  fetchWalletData: (silent?: boolean) => Promise<void>;
  fetchWithdrawals: () => Promise<void>;
  fetchBankDetails: () => Promise<void>;
  saveBankDetails: (details: { bankName: string; accountHolder: string; iban: string; swift?: string }) => Promise<{ success: boolean; message: string }>;
  requestWithdrawal: (amount: number, payoutMethod?: string) => Promise<{ success: boolean; message: string }>;
  getStripeOnboardingUrl: () => Promise<string>;
  refreshStripeStatus: () => Promise<{ success: boolean; onboarded: boolean }>;
  updateStatsLocally: (updates: Partial<WalletStats>) => void;
  addTransactionLocally: (tx: WalletTransaction) => void;
  updateWithdrawalLocally: (request: WithdrawalRequest) => void;
}

export const useCustomerWalletStore = create<CustomerWalletState>((set, get) => ({
  stats: null,
  transactions: [],
  withdrawalRequests: [],
  withdrawalLimits: { min: 50, max: 10000 },
  bankDetails: null,
  isLoading: true,

  fetchWalletData: async (silent = false) => {
    if (!silent) set({ isLoading: true });
    try {
      const { client } = await import('../services/api/client');
      // Use the consolidated dashboard API for maximum speed (single round trip)
      const res = await client.get('/payments/customer/dashboard');

      set({
        stats: res.data.stats,
        transactions: res.data.transactions,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to fetch customer wallet data', error);
      set({ isLoading: false });
    }
  },

  fetchWithdrawals: async () => {
    try {
        const { client } = await import('../services/api/client');
        // Fetch withdrawal requests independently — admin-settings endpoint requires
        // billing:view permission and will 403 for CUSTOMER role.
        // Splitting ensures history is always visible even if limits call fails.
        const reqRes = await client.get('/payments/withdrawals');
        set({ withdrawalRequests: reqRes.data });

        // Fetch limits separately — silently fail if not authorized (e.g. CUSTOMER role)
        try {
            const limitsRes = await client.get('/payments/admin/withdrawal-settings');
            set({ withdrawalLimits: limitsRes.data });
        } catch {
            // Customer role gets 403 here — use safe default limits
        }
    } catch (error) {
        console.error('Failed to fetch withdrawal data', error);
    }
  },

  fetchBankDetails: async () => {
    try {
        const { client } = await import('../services/api/client');
        const response = await client.get('/payments/customer/bank-details');
        set({ bankDetails: response.data });
    } catch (error) {
        console.error('Failed to fetch bank details', error);
    }
  },

  saveBankDetails: async (details) => {
    try {
        const { client } = await import('../services/api/client');
        const response = await client.post('/payments/customer/bank-details', details);
        get().fetchBankDetails();
        return { success: true, message: response.data.message || 'Bank details saved!' };
    } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Failed to save bank details' };
    }
  },

  requestWithdrawal: async (amount, payoutMethod = 'BANK_TRANSFER') => {
    try {
        const { client } = await import('../services/api/client');
        await client.post('/payments/customer/withdraw', { amount, payoutMethod });
        get().fetchWithdrawals();
        get().fetchWalletData(true);
        return { success: true, message: 'Request submitted successfully' };
    } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Failed to submit request' };
    }
  },

  getStripeOnboardingUrl: async () => {
    try {
        const { client } = await import('../services/api/client');
        const response = await client.post('/stripe/onboarding-link');
        return response.data.url;
    } catch (error: any) {
        console.error('Failed to get onboarding URL', error);
        throw error;
    }
  },

  refreshStripeStatus: async () => {
    try {
        const { client } = await import('../services/api/client');
        const response = await client.get('/stripe/status');
        const onboarded = response.data.stripeOnboarded;
        
        if (onboarded) {
          // Force refetch to sync all metadata
          await Promise.all([
            get().fetchWalletData(true),
            get().fetchBankDetails()
          ]);
        }
        
        return { success: true, onboarded };
    } catch (error) {
        console.error('Failed to refresh stripe status', error);
        return { success: false, onboarded: false };
    }
  },

  updateStatsLocally: (updates) => {
    const current = get().stats;
    if (current) {
      set({ stats: { ...current, ...updates } });
    }
  },

  addTransactionLocally: (tx) => {
    const currentTx = get().transactions;
    // Check for duplicates before adding
    if (!currentTx.some(existing => existing.id === tx.id)) {
      set({ transactions: [tx, ...currentTx] });
    }
  },

  updateWithdrawalLocally: (request) => {
    const current = get().withdrawalRequests;
    const exists = current.findIndex(r => r.id === request.id);
    if (exists !== -1) {
        const updated = [...current];
        updated[exists] = { ...updated[exists], ...request };
        set({ withdrawalRequests: updated });
    } else {
        set({ withdrawalRequests: [request, ...current] });
    }
  }
}));

// Setup zero-lag realtime listener
import { supabase } from '../services/supabase';
import { getCurrentUserId } from '../utils/auth';
import type { RealtimeChannel } from '@supabase/supabase-js';

let walletRealtimeRefCount = 0;
let walletRealtimeChannels: RealtimeChannel[] = [];
let walletRealtimeUserId: string | null = null;

export const subscribeToWalletUpdates = () => {
    const userId = getCurrentUserId();
    if (!userId) return;

    // Re-use existing channels when already subscribed (DashboardLayout + WalletView both call this)
    if (walletRealtimeRefCount > 0 && walletRealtimeUserId === userId) {
        walletRealtimeRefCount += 1;
        return {
            unsubscribe: () => {
                walletRealtimeRefCount = Math.max(0, walletRealtimeRefCount - 1);
                if (walletRealtimeRefCount === 0) {
                    walletRealtimeChannels.forEach((ch) => supabase.removeChannel(ch));
                    walletRealtimeChannels = [];
                    walletRealtimeUserId = null;
                }
            },
        };
    }

    // Different user or stale channels — tear down before re-subscribing
    if (walletRealtimeChannels.length > 0) {
        walletRealtimeChannels.forEach((ch) => supabase.removeChannel(ch));
        walletRealtimeChannels = [];
    }

    walletRealtimeUserId = userId;
    walletRealtimeRefCount = 1;

    const txChannel = supabase
        .channel(`wallet-payment-tx-${userId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'payment_transactions', filter: `customer_id=eq.${userId}` },
            () => {
                useCustomerWalletStore.getState().fetchWalletData(true);
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'payment_transactions',
                filter: `customer_id=eq.${userId}`,
            },
            (payload) => {
                if (
                    (payload.new as any).status === 'SUCCESS' &&
                    (payload.old as any)?.status !== 'SUCCESS'
                ) {
                    useCustomerWalletStore.getState().fetchWalletData(true);
                }
            },
        );

    const userChannel = supabase
        .channel(`wallet-user-${userId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
            (payload) => {
                useCustomerWalletStore.getState().updateStatsLocally({
                    customerBalance: Number(payload.new.customer_balance),
                    loyaltyPoints: Number(payload.new.loyalty_points),
                    loyaltyTier: payload.new.loyalty_tier,
                    totalSpent: Number(payload.new.total_spent),
                    referralCount: Number(payload.new.referral_count),
                    referralCode: payload.new.referral_code,
                    withdrawalsFrozen: payload.new.withdrawals_frozen,
                    withdrawalFreezeNote: payload.new.withdrawal_freeze_note,
                    orderLimit: payload.new.order_limit,
                    restrictionAlertMessage: payload.new.restriction_alert_message,
                    pointsLastResetAt: payload.new.points_last_reset_at
                });
            }
        );

    const walletChannel = supabase
        .channel(`wallet-tx-${userId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${userId}` },
            (payload) => {
                const newTx = payload.new as any;
                useCustomerWalletStore.getState().addTransactionLocally({
                    id: newTx.id,
                    amount: Number(newTx.amount),
                    transactionType: newTx.transaction_type,
                    type: newTx.type,
                    currency: newTx.currency,
                    status: newTx.status,
                    createdAt: newTx.created_at,
                    description: newTx.description,
                    metadata: newTx.metadata
                });
                useCustomerWalletStore.getState().fetchWalletData(true);
            }
        );

    const withdrawalChannel = supabase
        .channel(`wallet-withdrawals-${userId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'withdrawal_requests', filter: `user_id=eq.${userId}` },
            (payload) => {
                const req = payload.new as any;
                if (req) {
                    useCustomerWalletStore.getState().updateWithdrawalLocally({
                        id: req.id,
                        amount: Number(req.amount),
                        currency: req.currency,
                        status: req.status,
                        payoutMethod: req.payout_method,
                        adminNotes: req.admin_notes,
                        createdAt: req.created_at,
                        updatedAt: req.updated_at
                    });
                    if (req.status === 'COMPLETED' || req.status === 'APPROVED') {
                        useCustomerWalletStore.getState().fetchWalletData(true);
                    }
                }
            }
        );

    walletRealtimeChannels = [txChannel, userChannel, walletChannel, withdrawalChannel];
    walletRealtimeChannels.forEach((ch) => ch.subscribe());

    return {
        unsubscribe: () => {
            walletRealtimeRefCount = Math.max(0, walletRealtimeRefCount - 1);
            if (walletRealtimeRefCount === 0) {
                walletRealtimeChannels.forEach((ch) => supabase.removeChannel(ch));
                walletRealtimeChannels = [];
                walletRealtimeUserId = null;
            }
        },
    };
};
