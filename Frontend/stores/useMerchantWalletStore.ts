import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Transaction {
  id: string;
  createdAt: string;
  type: string;
  transactionType: string;
  orderId?: string;
  amount: number;
  balanceAfter?: number;
  description?: string;
  status?: string;
  payment?: {
    orderId?: string;
    status?: string;
    order?: {
      id?: string;
      orderNumber?: string;
      status?: string;
    };
  };
}

interface BankDetails {
  bankName: string;
  accountHolder: string;
  iban: string;
  swift: string;
  verified: boolean;
  stripeOnboarded: boolean;
  stripeAccountId: string | null;
}

interface MerchantWalletState {
  stats: {
    available: number;
    pending: number;
    frozen: number;
    totalSales: number;
    netEarnings: number;
    totalWalletBalance: number;
    ledgerNetProfit: number;
    merchantShareTotal: number;
    completedOrders: number;
    loyaltyTier: string;
    performanceScore: number;
    rating: number;
    storeName: string;
    referralCode?: string;
    referralCount: number;
    loyaltyPoints: number;
    pendingRewards: number;
    monthlyRewards: number;
    profitPercentage: number;
    referralWindowDays?: number;
    earnedReferralProfits: number;
    storeId?: string;
    tierBenefits: { ar: string; en: string }[];
    nextTierBenefits: { ar: string; en: string }[];
    stripeOnboarded: boolean;
    stripeAccountId?: string;
  };
  withdrawalRequests: any[];
  withdrawalLimits: { min: number; max: number };
  bankDetails: BankDetails | null;
  transactions: Transaction[];
  notifications: any[];
  isLoading: boolean;

  // Actions
  fetchWallet: (filters?: { startDate?: string; endDate?: string }) => Promise<void>;
  fetchWithdrawalData: () => Promise<void>;
  fetchBankDetails: () => Promise<void>;
  saveBankDetails: (details: { bankName: string; accountHolder: string; iban: string; swift?: string }) => Promise<{ success: boolean; message: string }>;
  requestWithdrawal: (amount: number, payoutMethod?: string) => Promise<{ success: boolean; message: string }>;
  getStripeOnboardingUrl: () => Promise<string>;
  refreshStripeStatus: () => Promise<{ success: boolean; onboarded: boolean }>;
}

export const useMerchantWalletStore = create<MerchantWalletState>((set, get) => ({
  stats: {
    available: 0,
    pending: 0,
    frozen: 0,
    totalSales: 0,
    netEarnings: 0,
    totalWalletBalance: 0,
    ledgerNetProfit: 0,
    merchantShareTotal: 0,
    completedOrders: 0,
    loyaltyTier: 'BASIC',
    performanceScore: 0,
    rating: 0,
    storeName: '',
    referralCount: 0,
    loyaltyPoints: 0,
    pendingRewards: 0,
    monthlyRewards: 0,
    profitPercentage: 1,
    referralWindowDays: 180,
    earnedReferralProfits: 0,
    storeId: '',
    tierBenefits: [],
    nextTierBenefits: [],
    stripeOnboarded: false,
    stripeAccountId: ''
  },
  withdrawalRequests: [],
  withdrawalLimits: { min: 50, max: 10000 },
  bankDetails: null,
  transactions: [],
  notifications: [],
  isLoading: true,

  fetchWallet: async (filters) => {
    set({ isLoading: true });
    try {
      const { client } = await import('../services/api/client');
      let url = '/payments/merchant/dashboard';
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await client.get(url);
      const { stats, transactions, notifications } = response.data;

      set({
        stats: stats,
        transactions: transactions,
        notifications: notifications || [],
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to fetch merchant wallet dashboard', error);
      set({ isLoading: false });
    }
  },

  fetchWithdrawalData: async () => {
    try {
        const { client } = await import('../services/api/client');
        const [reqRes, limitsRes] = await Promise.all([
            client.get('/payments/withdrawals'),
            client.get('/payments/admin/withdrawal-settings')
        ]);
        set({ 
            withdrawalRequests: reqRes.data,
            withdrawalLimits: limitsRes.data 
        });
    } catch (error) {
        console.error('Failed to fetch withdrawal data', error);
    }
  },

  fetchBankDetails: async () => {
    try {
        const { client } = await import('../services/api/client');
        const response = await client.get('/payments/merchant/bank-details');
        set({ bankDetails: response.data });
    } catch (error) {
        console.error('Failed to fetch bank details', error);
    }
  },

  saveBankDetails: async (details) => {
    try {
        const { client } = await import('../services/api/client');
        const response = await client.post('/payments/merchant/bank-details', details);
        // Refresh bank details after save
        useMerchantWalletStore.getState().fetchBankDetails();
        return { success: true, message: response.data.message || 'Bank details saved!' };
    } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Failed to save bank details' };
    }
  },

  requestWithdrawal: async (amount, payoutMethod = 'BANK_TRANSFER') => {
    try {
        const { client } = await import('../services/api/client');
        await client.post('/payments/merchant/withdraw', { amount, payoutMethod });
        useMerchantWalletStore.getState().fetchWithdrawalData();
        useMerchantWalletStore.getState().fetchWallet();
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
          const currentStats = get().stats;
          set({ stats: { ...currentStats, stripeOnboarded: true } });
          
          const currentBank = get().bankDetails;
          if (currentBank) {
            set({ bankDetails: { ...currentBank, stripeOnboarded: true } });
          }

          // Refetch in background without blocking the success response
          Promise.all([
            get().fetchWallet(),
            get().fetchBankDetails()
          ]).catch(err => console.error('Background refetch failed', err));
        }
        
        return { success: true, onboarded };
    } catch (error) {
        console.error('Failed to refresh stripe status', error);
        return { success: false, onboarded: false };
    }
  }
}));


// Real-time subscription outside the store so we can call it where needed
let channel: ReturnType<typeof supabase.channel> | null = null;

export const subscribeToMerchantWalletUpdates = (userId: string, storeId?: string) => {
    if (channel) {
        supabase.removeChannel(channel);
    }

    channel = supabase.channel(`merchant-wallet-${userId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${userId}` },
            payload => {

                useMerchantWalletStore.getState().fetchWallet();
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'stores', filter: `owner_id=eq.${userId}` },
            payload => {

                useMerchantWalletStore.getState().fetchWallet();
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'escrow_transactions' },
            () => {
                useMerchantWalletStore.getState().fetchWallet();
            },
        );

    if (storeId) {
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
            payload => {

                useMerchantWalletStore.getState().fetchWallet();
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'withdrawal_requests', filter: `store_id=eq.${storeId}` },
            payload => {

                useMerchantWalletStore.getState().fetchWithdrawalData();
                useMerchantWalletStore.getState().fetchWallet();
            }
        );
    }

    channel.subscribe();

    return () => {
        if (channel) {
            supabase.removeChannel(channel);
            channel = null;
        }
    };
};
