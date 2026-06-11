import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { violationsApi } from '../services/api/violations';

export interface ViolationType {
  id: string;
  code?: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  points: number;
  fineAmount: number;
  decayDays: number;
  targetType: 'MERCHANT' | 'CUSTOMER';
  isActive: boolean;
  severity?: 'NORMAL' | 'SEVERE';
  loyaltyImpact?: 'NONE' | 'CANCEL_ALL_REWARDS_PROMPT';
}

export interface Violation {
  id: string;
  targetUserId: string;
  targetType: 'MERCHANT' | 'CUSTOMER';
  targetStoreId?: string;
  typeId: string;
  points: number;
  fineAmount: number;
  reason: string;
  evidenceUrl?: string;
  status: 'ACTIVE' | 'APPEALED' | 'DECAYED' | 'CANCELLED';
  decayAt: string;
  createdAt: string;
  issuerId: string;
  type: ViolationType;
  targetUser?: { name: string; email: string };
  targetStore?: { name: string };
}

export interface PenaltyThreshold {
  id: string;
  nameAr: string;
  nameEn: string;
  targetType: 'MERCHANT' | 'CUSTOMER';
  thresholdPoints: number;
  action:
    | 'WARNING'
    | 'TEMPORARY_SUSPENSION'
    | 'FREEZE_BALANCE'
    | 'RESTRICT_PURCHASE'
    | 'PERMANENT_BAN'
    | 'FEE_INCREASE';
  suspendDurationDays: number;
  isActive: boolean;
}

export interface LoyaltyReviewAlert {
  id: string;
  userId: string;
  triggeredByType: 'VIOLATION' | 'DISPUTE' | 'REFUND' | 'MANUAL';
  triggeredById?: string;
  reasonAr: string;
  reasonEn: string;
  status: 'PENDING_REVIEW' | 'REWARDS_CANCELLED' | 'KEPT';
  decidedBy?: string;
  decidedAt?: string;
  adminNotes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    loyaltyTier?: string;
    loyaltyPoints?: number;
    customerBalance?: number;
    violationScore?: number;
  };
  decider?: { id: string; name: string; email: string };
}

export interface ViolationAppeal {
  id: string;
  violationId: string;
  reason: string;
  evidenceUrls?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminResponse?: string;
  reviewedAt?: string;
  reviewedById?: string;
  createdAt: string;
  violation: Violation;
}

export interface PenaltyAction {
  id: string;
  targetUserId: string;
  targetStoreId?: string;
  targetType: 'MERCHANT' | 'CUSTOMER';
  action: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  reason: string;
  expiresAt?: string;
  violationScore: number;
  targetUser?: { name: string; email: string };
}

export interface RiskAlert {
  id: string;
  userId: string;
  returnRate: number;
  deliveredCount: number;
  negativeCount: number;
  status: 'PENDING_REVIEW' | 'DISMISSED' | 'VIOLATION_ISSUED';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  user?: { 
    id: string;
    name: string; 
    email: string; 
    phone?: string;
    avatar?: string;
    totalDeliveredOrders?: number;
    totalReturnDisputeOrders?: number;
    cachedReturnRate?: number;
  };
}

export interface ViolationState {
  violations: Violation[];
  violationTypes: ViolationType[];
  thresholds: PenaltyThreshold[];
  pendingAppeals: ViolationAppeal[];
  pendingPenalties: PenaltyAction[];
  riskAlerts: RiskAlert[];
  loyaltyAlerts: LoyaltyReviewAlert[];
  myViolations: Violation[];
  myScore: number | null;
  isLoading: boolean;
  
  // Actions
  fetchViolations: (filters?: any) => Promise<void>;
  fetchViolationTypes: (targetType?: string) => Promise<void>;
  fetchThresholds: (targetType?: string) => Promise<void>;
  fetchPendingAppeals: () => Promise<void>;
  fetchPendingPenalties: () => Promise<void>;
  fetchRiskAlerts: (status?: string) => Promise<void>;
  fetchLoyaltyAlerts: (status?: string) => Promise<void>;
  fetchMyViolations: () => Promise<void>;
  fetchMyScore: () => Promise<void>;
  
  issueViolation: (data: any) => Promise<{ success: boolean; message: string }>;
  reviewAppeal: (id: string, data: any) => Promise<{ success: boolean; message: string }>;
  reviewPenalty: (id: string, data: any) => Promise<{ success: boolean; message: string }>;
  resolveRiskAlert: (id: string, data: { resolution: string; adminNotes?: string }) => Promise<{ success: boolean; message: string }>;
  decideLoyaltyAlert: (id: string, decision: 'CANCEL_REWARDS' | 'KEEP_REWARDS', adminNotes?: string) => Promise<{ success: boolean; message: string }>;
  dropViolation: (id: string, reason: string) => Promise<{ success: boolean; message: string }>;
  submitAppeal: (violationId: string, data: { reason: string; evidenceUrls?: string[] }) => Promise<{ success: boolean; message: string }>;
  
  createViolationType: (data: any) => Promise<{ success: boolean; message: string }>;
  updateViolationType: (id: string, data: any) => Promise<{ success: boolean; message: string }>;
  createThreshold: (data: any) => Promise<{ success: boolean; message: string }>;
  updateThreshold: (id: string, data: any) => Promise<{ success: boolean; message: string }>;
  deleteThreshold: (id: string) => Promise<{ success: boolean; message: string }>;
  uploadAppealFile: (violationId: string, file: File) => Promise<{ success: boolean; url?: string; message?: string }>;

  // Real-time
  subscribeToViolations: () => () => void;
  /** Customer/merchant scoped real-time subscription. Avoids hitting admin endpoints. */
  subscribeForUser: (userId: string) => () => void;
  unsubscribeFromViolations: () => void;
}

export const useViolationStore = create<ViolationState>((set, get) => ({
  violations: [],
  violationTypes: [],
  thresholds: [],
  pendingAppeals: [],
  pendingPenalties: [],
  riskAlerts: [],
  loyaltyAlerts: [],
  myViolations: [],
  myScore: null,
  isLoading: false,

  fetchViolations: async (filters) => {
    set({ isLoading: true });
    try {
      const data = await violationsApi.getAll(filters);
      set({ violations: data });
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchViolationTypes: async (targetType) => {
    try {
      const data = await violationsApi.getTypes(targetType);
      set({ violationTypes: data });
    } catch (e) {
      console.error(e);
    }
  },

  fetchThresholds: async (targetType) => {
    try {
      const data = await violationsApi.getThresholds(targetType);
      set({ thresholds: data });
    } catch (e) {
      console.error(e);
    }
  },

  fetchPendingAppeals: async () => {
    try {
      const data = await violationsApi.getPendingAppeals();
      set({ pendingAppeals: data });
    } catch (e) {
      console.error(e);
    }
  },

  fetchPendingPenalties: async () => {
    try {
      const data = await violationsApi.getPendingPenalties();
      set({ pendingPenalties: data });
    } catch (e) {
      console.error(e);
    }
  },

  fetchRiskAlerts: async (status) => {
    try {
      const data = await violationsApi.getRiskAlerts(status);
      set({ riskAlerts: data });
    } catch (e) {
      console.error(e);
    }
  },

  fetchLoyaltyAlerts: async (status) => {
    try {
      const data = await violationsApi.getLoyaltyAlerts(status);
      set({ loyaltyAlerts: data });
    } catch (e) {
      console.error(e);
    }
  },

  fetchMyViolations: async () => {
    set({ isLoading: true });
    try {
      const data = await violationsApi.getMyViolations();
      set({ myViolations: data });
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMyScore: async () => {
    try {
      const data = await violationsApi.getMyScore();
      set({ myScore: data.score });
    } catch (e) {
      console.error(e);
    }
  },

  issueViolation: async (data) => {
    try {
      const result = await violationsApi.issue(data);
      return { success: true, message: result.message || 'Violation issued' };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Server error' };
    }
  },

  reviewAppeal: async (id, data) => {
    try {
      const result = await violationsApi.reviewAppeal(id, data);
      get().fetchPendingAppeals();
      return { success: true, message: result.message };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Server error' };
    }
  },

  reviewPenalty: async (id, data) => {
    try {
      const result = await violationsApi.reviewPenalty(id, data);
      get().fetchPendingPenalties();
      return { success: true, message: result.message };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Server error' };
    }
  },

  resolveRiskAlert: async (id, data) => {
    try {
      const result = await violationsApi.resolveRiskAlert(id, data);
      get().fetchRiskAlerts();
      if (data.resolution === 'VIOLATION_ISSUED') {
        get().fetchViolations();
      }
      return { success: true, message: result.message || 'Alert resolved' };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Server error' };
    }
  },

  decideLoyaltyAlert: async (id, decision, adminNotes) => {
    try {
      await violationsApi.decideLoyaltyAlert(id, { decision, adminNotes });
      get().fetchLoyaltyAlerts();
      return { success: true, message: decision === 'CANCEL_REWARDS' ? 'Rewards cancelled' : 'Rewards kept' };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Server error' };
    }
  },

  dropViolation: async (id, reason) => {
    try {
      await violationsApi.dropViolation(id, reason);
      get().fetchViolations();
      return { success: true, message: 'Violation dropped' };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Server error' };
    }
  },

  submitAppeal: async (violationId, data) => {
    try {
      const result = await violationsApi.submitAppeal(violationId, data);
      get().fetchMyViolations();
      return { success: true, message: result.message };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Server error' };
    }
  },

  uploadAppealFile: async (violationId: string, file: File) => {
    try {
      const result = await violationsApi.uploadAppealFile(violationId, file);
      return { success: true, url: result.url };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Upload failed' };
    }
  },

  createViolationType: async (data) => {
    try {
      await violationsApi.createType(data);
      get().fetchViolationTypes();
      return { success: true, message: 'Violation type created successfully' };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Failed to create violation type' };
    }
  },

  updateViolationType: async (id, data) => {
    try {
      await violationsApi.updateType(id, data);
      get().fetchViolationTypes();
      return { success: true, message: 'Violation type updated successfully' };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Failed to update violation type' };
    }
  },

  createThreshold: async (data) => {
    try {
      await violationsApi.createThreshold(data);
      get().fetchThresholds();
      return { success: true, message: 'Threshold created successfully' };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Failed to create threshold' };
    }
  },

  updateThreshold: async (id, data) => {
    try {
      await violationsApi.updateThreshold(id, data);
      get().fetchThresholds();
      return { success: true, message: 'Threshold updated successfully' };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Failed to update threshold' };
    }
  },

  deleteThreshold: async (id) => {
    try {
      await violationsApi.deleteThreshold(id);
      get().fetchThresholds();
      return { success: true, message: 'Threshold deleted successfully' };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Failed to delete threshold' };
    }
  },

  // Real-time (admin scope)
  subscribeToViolations: () => {
    const channel = supabase.channel('admin-violations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'violations' }, () => get().fetchViolations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'violation_appeals' }, () => get().fetchPendingAppeals())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penalty_actions' }, () => get().fetchPendingPenalties())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_risk_alerts' }, () => get().fetchRiskAlerts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loyalty_review_alerts' }, () => get().fetchLoyaltyAlerts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'violation_types' }, () => get().fetchViolationTypes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penalty_thresholds' }, () => get().fetchThresholds())
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  },

  // Real-time (customer/merchant scope) — only refetches "my" data and never hits admin endpoints
  subscribeForUser: (userId: string) => {
    const channel = supabase.channel(`user-violations-realtime-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'violations', filter: `target_user_id=eq.${userId}` },
        () => {
          get().fetchMyViolations();
          get().fetchMyScore();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  unsubscribeFromViolations: () => {
    supabase.removeAllChannels();
  }
}));
