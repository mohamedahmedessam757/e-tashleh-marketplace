import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { reviewsApi, type ReviewSubmitResult } from '../services/api/reviews.api';
import { parseApiErrorPayload } from '../utils/parseApiError';

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  storeId: string;
  rating: number;
  comment: string;
  adminStatus: 'PENDING' | 'PUBLISHED' | 'REJECTED';
  createdAt: string;
  customerCode: string;
  store?: { name: string; storeName?: string };
  customer?: { id: string; name: string; avatar?: string };
  order?: { orderNumber: string };
  media?: string[];
}

export interface RatingImpactRule {
  id: string;
  minRating: number;
  maxRating: number;
  actionType: string;
  actionLabelAr: string;
  actionLabelEn: string;
  suspendDurationDays?: number;
  isActive: boolean;
  createdAt: string;
}

interface ReviewState {
  reviews: Review[];
  impactRules: RatingImpactRule[];
  merchantStats: {
    averageRating: number;
    totalReviews: number;
    publishedCount: number;
    satisfaction: number;
    reputationGrowth: number;
    storeRank: number;
  } | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  impactRulesError: string | null;
  fetchAdminReviews: () => Promise<void>;
  fetchMerchantReviews: () => Promise<void>;
  fetchMerchantStats: () => Promise<void>;
  submitReview: (data: {
    orderId: string;
    storeId: string;
    rating: number;
    comment: string;
    offerId?: string;
  }) => Promise<ReviewSubmitResult | null>;
  updateReviewStatus: (id: string, status: 'PENDING' | 'PUBLISHED' | 'REJECTED') => Promise<void>;
  clearReviewError: () => void;
  fetchImpactRules: () => Promise<void>;
  createImpactRule: (data: Partial<RatingImpactRule>) => Promise<boolean>;
  updateImpactRule: (id: string, data: Partial<RatingImpactRule>) => Promise<boolean>;
  deleteImpactRule: (id: string) => Promise<boolean>;
  reviewsSubscription: any;
  subscribeToMerchantReviews: (storeId: string) => void;
  subscribeToAdminReviews: () => void;
  unsubscribeFromMerchantReviews: () => void;
  unsubscribeFromAdminReviews: () => void;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  const anyErr = error as {
    response?: { data?: unknown };
    message?: string;
  };
  if (anyErr?.response?.data) {
    return parseApiErrorPayload(anyErr.response.data, fallback);
  }
  if (typeof anyErr?.message === 'string' && anyErr.message.trim()) {
    return anyErr.message;
  }
  return fallback;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: [],
  impactRules: [],
  merchantStats: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  impactRulesError: null,
  reviewsSubscription: null,

  fetchAdminReviews: async () => {
    set({ isLoading: true });
    try {
      const { client } = await import('../services/api/client');
      const { data } = await client.get<Review[]>('/reviews/admin');
      set({ reviews: data, isLoading: false, error: null });
    } catch (error: unknown) {
      set({
        error: getApiErrorMessage(error, 'Failed to fetch reviews'),
        isLoading: false,
      });
    }
  },

  fetchMerchantReviews: async () => {
    set({ isLoading: true });
    try {
      const { client } = await import('../services/api/client');
      const { data } = await client.get<Review[]>('/reviews/merchant');
      set({ reviews: data, isLoading: false, error: null });
    } catch (error: unknown) {
      set({
        error: getApiErrorMessage(error, 'Failed to fetch reviews'),
        isLoading: false,
      });
    }
  },

  fetchMerchantStats: async () => {
    try {
      const { client } = await import('../services/api/client');
      const { data } = await client.get('/reviews/merchant/stats');
      set({ merchantStats: data });
    } catch (error: unknown) {
      console.error('Fetch Stats Error:', getApiErrorMessage(error, 'Failed'));
    }
  },

  clearReviewError: () => set({ error: null }),

  submitReview: async (data) => {
    set({ isSubmitting: true, error: null });
    try {
      if (!data.storeId?.trim()) {
        throw new Error(
          'Store is missing for this order. Please refresh the page or contact support.',
        );
      }

      const created = await reviewsApi.submit({
        orderId: data.orderId,
        storeId: data.storeId.trim(),
        rating: data.rating,
        comment: data.comment?.trim() || '—',
        offerId: data.offerId,
      });

      set({ error: null });
      return created;
    } catch (error: unknown) {
      set({
        error: getApiErrorMessage(error, 'Failed to submit review'),
      });
      return null;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateReviewStatus: async (id, status) => {
    const previousReviews = get().reviews;
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.id === id ? { ...r, adminStatus: status } : r,
      ),
    }));

    try {
      const { client } = await import('../services/api/client');
      await client.patch(`/reviews/${id}/status`, { status });
    } catch (error: unknown) {
      console.error('Review status update failed:', getApiErrorMessage(error, 'Failed'));
      set({ reviews: previousReviews });
    }
  },

  fetchImpactRules: async () => {
    try {
      const data = await reviewsApi.listImpactRules();
      set({ impactRules: data, impactRulesError: null });
    } catch (error: unknown) {
      set({
        impactRules: [],
        impactRulesError: getApiErrorMessage(error, 'Failed to fetch impact rules'),
      });
    }
  },

  createImpactRule: async (data) => {
    set({ isLoading: true });
    try {
      const { client } = await import('../services/api/client');
      await client.post('/reviews/admin/impact-rules', data);
      await get().fetchImpactRules();
      set({ isLoading: false });
      return true;
    } catch (error: unknown) {
      set({ error: getApiErrorMessage(error, 'Failed to create impact rule'), isLoading: false });
      return false;
    }
  },

  updateImpactRule: async (id, data) => {
    set({ isLoading: true });
    try {
      const { client } = await import('../services/api/client');
      await client.patch(`/reviews/admin/impact-rules/${id}`, data);
      await get().fetchImpactRules();
      set({ isLoading: false });
      return true;
    } catch (error: unknown) {
      set({ error: getApiErrorMessage(error, 'Failed to update impact rule'), isLoading: false });
      return false;
    }
  },

  deleteImpactRule: async (id) => {
    set({ isLoading: true });
    try {
      const { client } = await import('../services/api/client');
      await client.delete(`/reviews/admin/impact-rules/${id}`);
      await get().fetchImpactRules();
      set({ isLoading: false });
      return true;
    } catch (error: unknown) {
      set({ error: getApiErrorMessage(error, 'Failed to delete impact rule'), isLoading: false });
      return false;
    }
  },

  subscribeToMerchantReviews: (storeId: string) => {
    const { reviewsSubscription, fetchMerchantReviews, fetchMerchantStats } = get();
    if (reviewsSubscription || !storeId) return;

    const channel = supabase
      .channel(`merchant-reviews-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          if (
            payload.eventType !== 'UPDATE' ||
            (payload.new as { admin_status?: string }).admin_status === 'PUBLISHED'
          ) {
            fetchMerchantReviews();
            fetchMerchantStats();
          }
        },
      )
      .subscribe();

    set({ reviewsSubscription: channel });
  },

  subscribeToAdminReviews: () => {
    const { reviewsSubscription, fetchAdminReviews } = get();
    if (reviewsSubscription) return;

    const channel = supabase
      .channel('admin-reviews-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        () => {
          fetchAdminReviews();
        },
      )
      .subscribe();

    set({ reviewsSubscription: channel });
  },

  unsubscribeFromMerchantReviews: () => {
    const { reviewsSubscription } = get();
    if (reviewsSubscription) {
      supabase.removeChannel(reviewsSubscription);
      set({ reviewsSubscription: null });
    }
  },

  unsubscribeFromAdminReviews: () => {
    const { reviewsSubscription } = get();
    if (reviewsSubscription) {
      supabase.removeChannel(reviewsSubscription);
      set({ reviewsSubscription: null });
    }
  },
}));
