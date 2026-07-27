
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MerchantStatus } from './useVendorStore';
import { supabase } from '../services/supabase';
import { storesApi } from '../services/api/stores';
import { client } from '../services/api/client';
import { API_URL } from '../services/api/config';
import { useAdminPermissionsStore } from './useAdminPermissionsStore';
import {
  classifyDashboardFetchError,
  normalizeDashboardStats,
  type DashboardStatsErrorCode,
} from '../utils/dashboardStats';
import { getSystemConfigDefaults, mergeSystemConfig } from '../utils/systemConfigDefaults';
import type { EarnIncomeConfig } from '../types/earnIncome';

let feedRefreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let financialsRefreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleDebouncedFeedRefresh(
  getState: () => Pick<AdminState, 'fetchFinancialFeed' | 'clearNewEventsCount'>,
  silent = true,
  delayMs = 1500,
) {
  if (feedRefreshDebounceTimer) clearTimeout(feedRefreshDebounceTimer);
  feedRefreshDebounceTimer = setTimeout(() => {
    getState().fetchFinancialFeed(true, silent);
    getState().clearNewEventsCount();
    feedRefreshDebounceTimer = null;
  }, delayMs);
}

function clearFinancialRefreshTimers() {
  if (feedRefreshDebounceTimer) {
    clearTimeout(feedRefreshDebounceTimer);
    feedRefreshDebounceTimer = null;
  }
  if (financialsRefreshDebounceTimer) {
    clearTimeout(financialsRefreshDebounceTimer);
    financialsRefreshDebounceTimer = null;
  }
}

function scheduleDebouncedFinancialsRefresh(
  getState: () => Pick<AdminState, 'fetchAdminFinancials' | 'fetchFinancialFeed' | 'clearNewEventsCount'>,
  delayMs = 700,
) {
  if (financialsRefreshDebounceTimer) clearTimeout(financialsRefreshDebounceTimer);
  financialsRefreshDebounceTimer = setTimeout(() => {
    getState().fetchAdminFinancials(undefined, true);
    getState().fetchFinancialFeed(true, true);
    getState().clearNewEventsCount();
    financialsRefreshDebounceTimer = null;
  }, delayMs);
}

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'VERIFICATION_OFFICER';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatar?: string;
}

export interface AdminActivityLog {
  id: string;
  adminId: string;
  email: string;
  action: string;
  ipAddress: string;
  deviceType: string;
  browser: string;
  location: string;
  metadata?: any;
  createdAt: string;
  admin?: {
    name: string;
    role: string;
  };
}

export interface DashboardStats {
  totalSales: number;
  totalCommission: number;
  salesTrendPercent?: number;
  totalOrders: number;
  activeCustomers: number;
  activeStores: number;
  openDisputes: number;
  salesTrend: { date: string; value: number }[];
  topStores: { 
    storeId: string; 
    name: string; 
    logo?: string;
    rating: number;
    revenue: number;
    ordersCount: number; 
    value?: number; 
  }[];
  statusDistribution: { status: string; count: number }[];
  alerts: { type: 'warning' | 'error' | 'critical'; code: string; count: number; priority: string }[];
  recentOrders: any[];
}

export interface ShippingRule {
  id: string;
  minWeight: number;
  maxWeight: number;
  price: number; // Bracket surcharge
}

export interface ShipmentType {
  id: string; // 'standard', 'engine', 'gearbox'
  nameAr: string;
  nameEn: string;
  basePrice: number;
  isWeightBound: boolean;
  hasCylinders?: boolean;
  cylinderRates?: { cylinders: number; price: number }[];
  weightBrackets: ShippingRule[];
}

export interface SystemStatus {
  maintenanceMode: boolean;
  endTime: string | null;
  maintenanceMsgAr: string;
  maintenanceMsgEn: string;
  statusMessageAr: string;
  statusMessageEn: string;
}

export interface SystemConfig {
  general: {
    platformName: string;
    contactEmail: string;
    supportPhone: string;
    enablePreferencesStep: boolean;
    logoUrl?: string;
    logoDarkUrl?: string;
    faviconUrl?: string;
    contacts?: {
      customer: string;
      merchant: string;
      wholesale: string;
      company: string;
    };
    earnIncome?: EarnIncomeConfig;
  };
  company?: {
    legalNameAr: string;
    legalNameEn: string;
    crNumber: string;
    taxNumber: string;
    licenseNumber: string;
    licenseExpiry: string;
    hqAddressAr: string;
    hqAddressEn: string;
    economicRegistryNumber: string;
    economicRegistryContentAr?: string;
    economicRegistryContentEn?: string;
    nomoDocumentUrl?: string;
    nomoDocumentUpdatedAt?: string;
  };
  orderDurations?: {
    assemblyCartDays: number;
    returnWindowHours: number;
    disputeWindowHours: number;
    paymentTimeoutHours: number;
    reminderDaysBeforeAssemblyExpiry: number[];
    offerCollectionHours: number;
    offerSelectionHours: number;
    preparationHours: number;
    delayedPreparationGraceHours: number;
    shippingSlaHours: number;
    correctionPeriodHours: number;
    nonMatchingGraceMinutes: number;
  };
  financial: {
    commissionRate: number;
    minCommission: number;
  };
  logistics: {
    globalMinWeightKg?: number;
    globalMaxWeightKg?: number;
    shipmentTypes: ShipmentType[];
  };
  content: {
    vendorContract: {
      contentAr: string;
      contentEn: string;
      firstPartyConfig: Record<string, string>;
    };
    privacyPolicy: string;
    invoiceFooter: string;
  };
}

export interface Vendor {
  id: string;
  name: string;
  storeName: string;
  email: string;
  status: MerchantStatus;
  licenseExpiry: string;
  rating: number;
  totalSales: number;
  joinedAt: string;
  balance: number;
  docs?: {
    cr: 'approved' | 'pending' | 'expired' | 'rejected';
    license: 'approved' | 'pending' | 'expired' | 'rejected';
  };
  owner?: { name: string; email: string };
  createdAt?: string;
  loyaltyTier?: 'BASIC' | 'SILVER' | 'GOLD' | 'VIP' | 'ELITE';
  performanceScore?: number;
  lifetimeEarnings?: number;
  adminNotes?: string;
  address?: string;
  lat?: number;
  lng?: number;
  orders?: any[];
  documents?: any[];
  _count?: {
    reviews: number;
    offers: number;
  };
  
  // Advanced Restrictions (2026)
  withdrawalsFrozen?: boolean;
  withdrawalFreezeNote?: string;
  withdrawalFreezeSignature?: string;
  offerLimit?: number;
  dailyOfferCount?: number;
  visibilityRestricted?: boolean;
  visibilityNote?: string;
  visibilitySignature?: string;
  visibilityRate?: number;
}
export interface WithdrawalRequest {
  id: string;
  storeId?: string;
  userId?: string;
  role: 'VENDOR' | 'CUSTOMER';
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  payoutMethod: 'STRIPE' | 'BANK_TRANSFER';
  adminNotes?: string;
  createdAt: string;
  store?: {
    id: string;
    name: string;
    balance?: number;
    owner?: { name: string; email: string };
    bankName?: string;
    bankIban?: string;
    bankAccountHolder?: string;
    bankSwift?: string;
    bankDetailsVerified?: boolean;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    customerBalance?: number;
    bankName?: string;
    bankIban?: string;
    bankAccountHolder?: string;
    bankSwift?: string;
    bankDetailsVerified?: boolean;
  };
}

export interface WithdrawalLimits {
  min: number;
  max: number;
}

export interface UnifiedFinancialEvent {
  id: string;
  source: 'PAYMENT' | 'WALLET' | 'ESCROW' | 'WITHDRAWAL';
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  customerCode?: string;
  customerAvatar?: string;
  storeId?: string;
  storeName?: string;
  storeLogo?: string;
  storeCode?: string;
  amount: number;
  currency: string;
  direction: 'CREDIT' | 'DEBIT' | 'HOLD' | 'RELEASE' | 'FREEZE';
  unitPrice?: number;
  shippingCost?: number;
  commission?: number;
  gatewayFee?: number;
  refundedAmount?: number;
  balanceAfter?: number;
  userRole?: string;
  merchantAmount?: number;
  escrowStatus?: string;
  payoutMethod?: string;
  adminNotes?: string;
  stripeTransferId?: string;
  processedAt?: string;
  paymentId?: string;
  walletTxId?: string;
  transactionNumber?: string;
  financialImpact?: string;
  eventType: string;
  eventTypeAr: string;
  eventTypeEn: string;
  status: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  isNew?: boolean;
  executor?: string;
  executorName?: string;
  debit?: number;
  credit?: number;
}

export type AdminFinancialReportId =
  | 'sales-summary'
  | 'commission-summary'
  | 'gateway-fees'
  | 'shipping-collected'
  | 'refunds-summary'
  | 'withdrawals-summary'
  | 'escrow-holdings'
  | 'seller-balances'
  | 'customer-balances'
  | 'penalties-summary'
  | 'platform-reconciliation'
  | 'platform-revenue-summary'
  | 'platform-revenue';

export interface VehicleModel {
  id: string;
  makeId: string;
  name: string;
  nameAr: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleMake {
  id: string;
  name: string;
  nameAr: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  models: VehicleModel[];
}

export interface AdminState {
  currentAdmin: AdminUser | null;
  commissionRate: number;
  systemStatus: SystemStatus;
  adminActivityLogs: AdminActivityLog[];
  isLoadingLogs: boolean;
  vendorsList: Vendor[];
  systemConfig: SystemConfig;
  activeContract: {
    contentAr: string;
    contentEn: string;
    firstPartyConfig: Record<string, any>;
    version?: number;
  } | null;
  dashboardStats: DashboardStats | null;
  isLoadingStats: boolean;
  dashboardStatsError: DashboardStatsErrorCode;
  dashboardFilters: { startDate?: string; endDate?: string };
  stores: any[];
  storesSearchQuery: string;
  currentStoreProfile: any | null;
  isLoadingStores: boolean;
  pendingWithdrawals: WithdrawalRequest[];
  withdrawalLimits: WithdrawalLimits;
  isLoadingWithdrawals: boolean;

  // Unified Financial Feed (2026)
  financialFeed: UnifiedFinancialEvent[];
  isFeedLoading: boolean;
  feedHasMore: boolean;
  feedCursor: string | null;
  feedFilters: { type: string; search: string; startDate?: string; endDate?: string; role?: string };
  fetchFinancialFeed: (reset?: boolean, silent?: boolean) => Promise<void>;
  setFeedFilters: (filters: Partial<AdminState['feedFilters']>) => void;
  markFeedItemAsSeen: (id: string) => void;
  subscribeToFinancialFeed: () => void;
  unsubscribeFromFinancialFeed: () => void;
  financialFeedSubscription: any;
  newEventsCount: number;
  clearNewEventsCount: () => void;
  
  // Real-time Toasts (2026)
  financialToasts: any[];
  addFinancialToast: (toast: any) => void;
  removeFinancialToast: (id: string) => void;

  fetchStoreProfile: (id: string) => Promise<void>;
  silentFetchStoreProfile: (id: string) => Promise<void>;
  clearStoreProfile: () => void;
  getVendorById: (id: string) => Vendor | undefined;
  updateVendorStatus: (id: string, status: MerchantStatus) => void;
  updateVendorDocStatus: (vendorId: string, docType: 'cr' | 'license', status: 'approved' | 'rejected') => void;
  updateStoreNotes: (id: string, notes: string) => Promise<boolean>;
  updateStoreRestrictions: (id: string, data: any) => Promise<boolean>;
  clearStoreRestrictions: (id: string, signatureData?: any) => Promise<boolean>;
  
  // Withdrawal Management
  fetchWithdrawals: (silent?: boolean) => Promise<void>;
  processWithdrawal: (id: string, action: 'approve' | 'reject', notes?: string, method?: string, signature?: string, adminName?: string, adminEmail?: string) => Promise<{ success: boolean; message: string }>;
  approveWithdrawal: (id: string, notes?: string, adminName?: string, adminEmail?: string) => Promise<{ success: boolean; message: string }>;
  rejectWithdrawal: (id: string, notes: string, signature: string, adminName?: string, adminEmail?: string) => Promise<{ success: boolean; message: string }>;
  completeWithdrawal: (id: string, notes: string, signature: string, adminName?: string, adminEmail?: string) => Promise<{ success: boolean; message: string }>;
  releaseWithdrawal: (id: string, notes: string, signature: string, adminName?: string, adminEmail?: string) => Promise<{ success: boolean; message: string }>;
  verifyBankDetails: (targetId: string, role: 'CUSTOMER' | 'VENDOR') => Promise<{ success: boolean }>;
  fetchWithdrawalLimits: () => Promise<void>;
  updateWithdrawalLimits: (limits: WithdrawalLimits) => Promise<boolean>;

  // Activity Logs
  fetchAdminActivityLogs: () => Promise<void>;
  subscribeToActivityLogs: () => void;
  unsubscribeFromActivityLogs: () => void;
  activitySubscription: any;
  publicSystemStatus: any;
  fetchPublicStatus: () => Promise<void>;
  fetchPublicConfig: () => Promise<void>;

  // Contract Management
  fetchVendorContract: () => Promise<void>;
  saveVendorContract: (contractData: any) => Promise<boolean>;

  // Platform Settings (2026 Enhanced)
  fetchSystemSettings: () => Promise<void>;
  saveSystemSetting: (
    key: string,
    value: any,
    audit?: {
      reason?: string;
      adminName?: string;
      adminSignature?: string;
      adminSignatureType?: 'DRAWN' | 'TYPED';
    },
  ) => Promise<boolean>;
  subscribeToSettings: () => void;
  unsubscribeFromSettings: () => void;

  // Real-time
  subscription: any;
  fetchDashboardStats: (filters?: { startDate?: string; endDate?: string }) => Promise<void>;
  silentFetchDashboardStats: (filters?: { startDate?: string; endDate?: string }) => Promise<void>;
  subscribeToStats: () => void;
  unsubscribeFromStats: () => void;

  storeSubscription: any;
  subscribeToStores: () => void;
  unsubscribeFromStores: () => void;

  storeProfileSubscription: any;
  subscribeToStoreProfile: (id: string) => void;
  unsubscribeFromStoreProfile: () => void;

  withdrawalSubscription: any;
  subscribeToWithdrawals: () => void;
  unsubscribeFromWithdrawals: () => void;
  
  // Admin Financial Hub
  adminFinancials: any | null;
  isLoadingFinancials: boolean;
  financialFilters: {
    startDate?: string;
    endDate?: string;
    period?: 'monthly' | 'quarterly' | 'yearly' | '';
    type?: string;
    role?: string;
    status?: string;
    search?: string;
    withdrawalStatus?: string;
  };
  fetchAdminFinancials: (filters?: any, silent?: boolean) => Promise<void>;
  exportFinancialCSV: (filters?: any) => Promise<void>;
  exportUnifiedFinancialCSV: (filters?: any) => Promise<void>;
  sendManualPayout: (dto: any) => Promise<{ success: boolean; message: string }>;
  setFinancialFilters: (filters: any) => void;
  financialSubscription: any;
  subscribeToFinancials: () => void;
  unsubscribeFromFinancials: () => void;

  adminCustomerInvoices: any[];
  adminStoreInvoices: any[];
  adminCustomerInvoicesMeta: { page: number; totalPages: number; total: number } | null;
  adminStoreInvoicesMeta: { page: number; totalPages: number; total: number } | null;
  sellerAccounts: any[];
  customerAccounts: any[];
  financialRefunds: any[];
  settlementSummary: any | null;
  settlementHistory: any[];
  financialPenalties: any[];
  financialAuditLogs: any[];
  financialReportData: any | null;
  isLoadingCustomerInvoices: boolean;
  isLoadingStoreInvoices: boolean;
  isLoadingSellerAccounts: boolean;
  isLoadingCustomerAccounts: boolean;
  isLoadingFinancialRefunds: boolean;
  isLoadingSettlement: boolean;
  isLoadingFinancialPenalties: boolean;
  isLoadingFinancialAudit: boolean;
  isLoadingFinancialReport: boolean;
  fetchAdminCustomerInvoices: (params?: { search?: string; status?: string; page?: number; entityType?: string; invoiceType?: string }) => Promise<void>;
  fetchAdminStoreInvoices: (params?: { search?: string; page?: number; entityType?: string; invoiceType?: string }) => Promise<void>;
  fetchSellerAccounts: (search?: string) => Promise<void>;
  fetchCustomerAccounts: (search?: string) => Promise<void>;
  fetchFinancialRefunds: (search?: string) => Promise<void>;
  fetchSettlementSummary: () => Promise<void>;
  runFinancialSettlement: (payload: { reason: string; adminName: string; adminSignature: string; notes?: string }) => Promise<{ success: boolean; message?: string }>;
  fetchSettlementHistory: () => Promise<void>;
  fetchFinancialPenalties: (search?: string) => Promise<void>;
  fetchFinancialAudit: (params?: { search?: string; page?: number }) => Promise<void>;
  fetchFinancialReport: (reportId: AdminFinancialReportId, params?: Record<string, string>) => Promise<void>;
  exportFinancialReport: (reportId: AdminFinancialReportId, format: 'csv' | 'pdf' | 'xlsx', params?: Record<string, string>) => Promise<void>;
  fetchAdminInvoiceById: (id: string) => Promise<any | null>;
  resendAdminInvoice: (id: string) => Promise<{ success: boolean; message?: string }>;
  
  // Backward compatibility / UI state
  loginAdmin: (user: AdminUser, permissions?: any) => void;
  logoutAdmin: () => void;
  setDashboardFilters: (filters: { startDate?: string; endDate?: string }) => void;
  setCommissionRate: (rate: number) => void;
  toggleSystemStatus: () => void;
  updateSystemConfig: (section: keyof SystemConfig, data: any) => void;
  fetchAllStores: (search?: string) => Promise<void>;
  silentFetchStores: () => Promise<void>;

  orderTimeline: any | null;
  orderTimelineLoading: boolean;
  orderTimelineCache: Record<string, any>;
  orderTimelineActiveId: string | null;
  fetchOrderTimeline: (orderId: string, silent?: boolean) => Promise<void>;
  clearOrderTimeline: () => void;

  // Vehicle Catalog Management (2026)
  vehicleMakes: VehicleMake[];
  isLoadingCatalog: boolean;
  fetchVehicleCatalog: () => Promise<void>;
  createVehicleMake: (dto: { name: string; nameAr: string }) => Promise<boolean>;
  updateVehicleMake: (id: string, dto: { name?: string; nameAr?: string; isActive?: boolean; signatureData?: any }) => Promise<boolean>;
  createVehicleModel: (dto: { makeId: string; name: string; nameAr: string }) => Promise<boolean>;
  updateVehicleModel: (id: string, dto: { name?: string; nameAr?: string; isActive?: boolean; signatureData?: any }) => Promise<boolean>;
  toggleAllModels: (makeId: string, isActive: boolean, signatureData?: any) => Promise<boolean>;
  subscribeToCatalog: () => void;
  unsubscribeFromCatalog: () => void;
  catalogSubscription: any;
}

const DEFAULT_STATUS: SystemStatus = {
  maintenanceMode: false,
  endTime: null,
  maintenanceMsgAr: 'النظام حالياً في وضع الصيانة لترقية الخوادم...',
  maintenanceMsgEn: 'System is currently under maintenance for server upgrades...',
  statusMessageAr: 'النظام يعمل بشكل طبيعي',
  statusMessageEn: 'System is operating normally'
};

function readInitialAdmin(): AdminUser | null {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      sessionStorage.removeItem('admin');
      return null;
    }

    const persisted = sessionStorage.getItem('etashleh-admin-storage');
    if (persisted) {
      const parsed = JSON.parse(persisted);
      if (parsed?.state?.currentAdmin?.id) {
        return parsed.state.currentAdmin as AdminUser;
      }
    }

    return JSON.parse(sessionStorage.getItem('admin') || 'null');
  } catch {
    return null;
  }
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      currentAdmin: readInitialAdmin(),
      commissionRate: 25,
      systemStatus: DEFAULT_STATUS,
      adminActivityLogs: [],
      isLoadingLogs: false,
      publicSystemStatus: null,
      vendorsList: [],
      dashboardStats: null,
      isLoadingStats: false,
      dashboardStatsError: null,
      dashboardFilters: {
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      },
      stores: [],
      storesSearchQuery: '',
      currentStoreProfile: null,
      pendingWithdrawals: [],
      withdrawalLimits: { min: 100, max: 10000 },
      activeContract: null,
      isLoadingWithdrawals: false,
      isLoadingStores: false,

      adminFinancials: null,
      isLoadingFinancials: false,
      adminCustomerInvoices: [],
      adminStoreInvoices: [],
      adminCustomerInvoicesMeta: null,
      adminStoreInvoicesMeta: null,
      sellerAccounts: [],
      customerAccounts: [],
      financialRefunds: [],
      settlementSummary: null,
      settlementHistory: [],
      financialPenalties: [],
      financialAuditLogs: [],
      financialReportData: null,
      isLoadingCustomerInvoices: false,
      isLoadingStoreInvoices: false,
      isLoadingSellerAccounts: false,
      isLoadingCustomerAccounts: false,
      isLoadingFinancialRefunds: false,
      isLoadingSettlement: false,
      isLoadingFinancialPenalties: false,
      isLoadingFinancialAudit: false,
      isLoadingFinancialReport: false,

      // Unified Financial Feed Initial State
      financialFeed: [],
      isFeedLoading: false,
      feedHasMore: true,
      feedCursor: null,
      feedFilters: { type: 'ALL', search: '', role: 'ALL' },
      newEventsCount: 0,
      financialToasts: [],
      financialFilters: {
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        period: '',
        type: 'ALL',
        role: 'ALL',
        status: 'ALL',
        search: '',
        withdrawalStatus: 'PENDING',
      },
      financialSubscription: null,
      activitySubscription: null,

      // Phase 4: Order Financial Timeline
      orderTimeline: null,
      orderTimelineLoading: false,
      orderTimelineCache: {},
      orderTimelineActiveId: null,

      // Vehicle Catalog
      vehicleMakes: [],
      isLoadingCatalog: false,
      catalogSubscription: null,

      systemConfig: getSystemConfigDefaults(),

      loginAdmin: (user, permissions) => {
        // 2026 Defensive Guard: Ensure user object has required shape
        if (!user || typeof user !== 'object' || !user.id || !user.role) {
          console.error('[loginAdmin] Invalid user object received:', user);
          return;
        }

        // Coerce email to string to prevent .includes() TypeError downstream
        const safeUser: AdminUser = {
          id: String(user.id),
          name: String(user.name || ''),
          email: String(user.email || ''),
          role: user.role as AdminRole,
          avatar: user.avatar,
        };

        // Clear any stale session data before writing fresh login
        sessionStorage.removeItem('admin');
        sessionStorage.removeItem('etashleh-admin-storage');

        sessionStorage.setItem('admin', JSON.stringify(safeUser));
        localStorage.setItem('admin_role', safeUser.role);
        
        set({ currentAdmin: safeUser, dashboardStatsError: null });
        
        // Update permissions store if provided
        if (permissions) {
          useAdminPermissionsStore.getState().setMyPermissions(permissions);
        }

        get().fetchDashboardStats();
        get().fetchAllStores();
      },

      logoutAdmin: () => {
        sessionStorage.removeItem('admin');
        localStorage.removeItem('admin_role');
        localStorage.removeItem('access_token');
        set({ currentAdmin: null, dashboardStats: null, dashboardStatsError: null });
        
        // Clear permissions store
        useAdminPermissionsStore.getState().setMyPermissions(null);
      },

      setDashboardFilters: (filters) => set({ dashboardFilters: filters }),

      silentFetchDashboardStats: async (filters) => {
        try {
          const token = localStorage.getItem('access_token');
          if (!token) return;

          const currentFilters = filters || get().dashboardFilters;
          const queryParams = new URLSearchParams(currentFilters as any).toString();
          const res = await client.get(`/dashboard/stats${queryParams ? `?${queryParams}` : ''}`);
          set({ dashboardStats: normalizeDashboardStats(res.data), dashboardStatsError: null });
        } catch (e) {
          console.error('Failed to silently fetch stats', e);
        }
      },

      fetchAdminActivityLogs: async () => {
        set({ isLoadingLogs: true });
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/admin/platform-settings/activity/logs`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            set({ adminActivityLogs: data });
          }
        } catch (e) {
          console.error("Failed to fetch admin logs", e);
        } finally {
          set({ isLoadingLogs: false });
        }
      },

      subscribeToActivityLogs: () => {
        if (get().activitySubscription) return;

        const sub = supabase
          .channel('admin_activity_logs_changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'admin_activity_logs' },
            (payload) => {
              const { eventType, new: newLog } = payload;
              
              set((state) => {
                let logs = [...state.adminActivityLogs];
                if (eventType === 'INSERT') {
                  logs = [newLog as AdminActivityLog, ...logs].slice(0, 50);
                } else if (eventType === 'UPDATE') {
                  const index = logs.findIndex(l => l.id === (newLog as any).id);
                  if (index !== -1) {
                    logs[index] = { ...logs[index], ...(newLog as AdminActivityLog) };
                    // Sort by newest first
                    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                  } else {
                    // If not in current list (maybe pagination), add it
                    logs = [newLog as AdminActivityLog, ...logs].slice(0, 50);
                    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                  }
                } else if (eventType === 'DELETE') {
                  logs = logs.filter(l => l.id !== (payload.old as any).id);
                }
                return { adminActivityLogs: logs };
              });
            }
          )
          .subscribe();

        set({ activitySubscription: sub });
      },

      unsubscribeFromActivityLogs: () => {
        const { activitySubscription } = get();
        if (activitySubscription) {
          supabase.removeChannel(activitySubscription);
          set({ activitySubscription: null });
        }
      },

      fetchSystemSettings: async () => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/admin/platform-settings`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            
            if (data.system_config) {
              const config = mergeSystemConfig(data.system_config);
              if (config.financial && (config.financial as any).vatRate !== undefined && config.financial.minCommission === undefined) {
                config.financial.minCommission = (config.financial as any).vatRate;
              }
              set({ systemConfig: config });
              if (config.financial?.commissionRate) set({ commissionRate: config.financial.commissionRate });
            }
            
            if (data.system_status) set({ systemStatus: data.system_status });
            if (data.withdrawal_limits) set({ withdrawalLimits: data.withdrawal_limits });
          }
        } catch (error) {
          console.error("Failed to fetch system settings", error);
        }
      },

      fetchPublicStatus: async () => {
        try {
          // Dynamic API URL check
          const res = await fetch(`${API_URL}/system/status`);
          if (res.ok) {
            const data = await res.json();
            set({ publicSystemStatus: data });
          }
        } catch (e) {
          console.warn("Public status fetch failed", e);
        }
      },

      fetchPublicConfig: async () => {
        try {
          const res = await fetch(`${API_URL}/system/config`);
          if (res.ok) {
            const config = mergeSystemConfig(await res.json());

            // Sync backward compatibility for commission
            if (config.financial && config.financial.vatRate !== undefined && config.financial.minCommission === undefined) {
              config.financial.minCommission = config.financial.vatRate;
            }

            const prev = get().systemConfig;
            const sameLogistics =
              JSON.stringify(prev?.logistics?.shipmentTypes ?? null) ===
              JSON.stringify(config?.logistics?.shipmentTypes ?? null);
            const sameFinancial =
              JSON.stringify(prev?.financial ?? null) ===
              JSON.stringify(config?.financial ?? null);
            if (sameLogistics && sameFinancial) {
              return;
            }

            set({ systemConfig: config });
            if (config.financial?.commissionRate) set({ commissionRate: config.financial.commissionRate });
          }
        } catch (e) {
          console.warn("Public config fetch failed", e);
        }
      },

      saveSystemSetting: async (key: string, value: any, audit?: {
        reason?: string;
        adminName?: string;
        adminSignature?: string;
        adminSignatureType?: 'DRAWN' | 'TYPED';
      }) => {
        try {
          const token = localStorage.getItem('access_token');
          if (key === 'system_status') {
             const newStatus = { 
               ...get().systemStatus,
               maintenanceMode: value.maintenanceMode,
               maintenanceMsgAr: value.maintenanceMsgAr,
               maintenanceMsgEn: value.maintenanceMsgEn,
               endTime: value.endTime
             };
             set({ 
               systemStatus: newStatus,
               publicSystemStatus: newStatus 
             });
          }

          const res = await fetch(`${API_URL}/admin/platform-settings/${key}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              value,
              reason: audit?.reason,
              adminName: audit?.adminName,
              adminSignature: audit?.adminSignature,
              adminSignatureType: audit?.adminSignatureType,
            })
          });

          if (res.ok) {
            // 2026 FIX: Only re-fetch full settings for core system keys.
            // For atomic boolean toggles (like feature flags), Supabase Realtime
            // handles sync — calling fetchSystemSettings() here would trigger a
            // useEffect cascade in AdminSettings that re-saves system_config (race condition).
            const CORE_KEYS = ['system_config', 'system_status', 'withdrawal_limits'];
            if (CORE_KEYS.includes(key)) {
              await get().fetchSystemSettings();
              await get().fetchPublicStatus();
            }
            return true;
          }
          return false;
        } catch (error) {
          console.error(`Failed to save setting ${key}`, error);
          return false;
        }
      },

      subscribeToSettings: () => {
        if (get().subscription) return;

        const sub = supabase
          .channel('platform_settings_changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'platform_settings' },
            (payload) => {
              const { setting_key, setting_value } = payload.new as any;
              
              if (setting_key === 'system_config') {
                const config = mergeSystemConfig(setting_value);
                if (config.financial && (config.financial as any).vatRate !== undefined && config.financial.minCommission === undefined) {
                  config.financial.minCommission = (config.financial as any).vatRate;
                }
                set({ systemConfig: config });
                if (config.financial?.commissionRate) set({ commissionRate: config.financial.commissionRate });
              } else if (setting_key === 'system_status') {
                set({ systemStatus: setting_value });
              } else if (setting_key === 'withdrawal_limits') {
                set({ withdrawalLimits: setting_value });
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'platform_contracts' },
            (payload) => {
              if (payload.new && (payload.new as any).isActive) {
                set({ activeContract: payload.new as any });
              }
            }
          )
          .subscribe();

        set({ subscription: sub });
      },

      unsubscribeFromSettings: () => {
        const { subscription } = get();
        if (subscription) {
          supabase.removeChannel(subscription);
          set({ subscription: null });
        }
      },

      fetchDashboardStats: async (filters) => {
        const { dashboardStats, dashboardFilters } = get();
        const activeFilters = filters || dashboardFilters;
        const token = localStorage.getItem('access_token');

        if (!token) {
          set({
            dashboardStats: null,
            dashboardStatsError: 'NO_TOKEN',
            isLoadingStats: false,
          });
          return;
        }

        if (!dashboardStats) set({ isLoadingStats: true, dashboardStatsError: null });
        if (filters) set({ dashboardFilters: filters });

        try {
          const queryParams = new URLSearchParams(activeFilters as any).toString();
          const res = await client.get(`/dashboard/stats${queryParams ? `?${queryParams}` : ''}`);
          set({
            dashboardStats: normalizeDashboardStats(res.data),
            dashboardStatsError: null,
          });
        } catch (e) {
          const errorCode = classifyDashboardFetchError(e);
          if (errorCode === 'UNAUTHORIZED') {
            get().logoutAdmin();
          }
          set({ dashboardStatsError: errorCode });
          console.error('Failed to fetch dashboard stats', e);
        } finally {
          set({ isLoadingStats: false });
        }
      },

      setCommissionRate: (rate) => set({ commissionRate: rate }),

      toggleSystemStatus: () => set((state) => ({
        systemStatus: { ...state.systemStatus, maintenanceMode: !state.systemStatus.maintenanceMode }
      })),

      updateSystemConfig: (section, data) => set((state) => {
        const newConfig = {
          ...state.systemConfig,
          [section]: { ...state.systemConfig[section], ...data }
        };
        const newCommission = section === 'financial' && data.commissionRate ? data.commissionRate : state.commissionRate;
        return {
          systemConfig: newConfig,
          commissionRate: newCommission
        };
      }),

      fetchAllStores: async (search) => {
        const query = search !== undefined ? search.trim() : get().storesSearchQuery;
        const { stores } = get();
        if (stores.length === 0) set({ isLoadingStores: true });
        set({ storesSearchQuery: query });
        try {
          const data = await storesApi.getAll(query ? { search: query } : undefined);
          set({ stores: data });
        } catch (error) {
          console.error("Failed to fetch stores", error);
        } finally {
          set({ isLoadingStores: false });
        }
      },

      silentFetchStores: async () => {
        try {
          const query = get().storesSearchQuery;
          const data = await storesApi.getAll(query ? { search: query } : undefined);
          set({ stores: data });
        } catch (error) {
          console.error("Failed to silently fetch stores", error);
        }
      },

      fetchStoreProfile: async (id: string) => {
        set({ isLoadingStores: true, currentStoreProfile: null }); 
        try {
          const { data } = await client.get(`/stores/${id}`);
          set({ currentStoreProfile: data });
        } catch (error) {
          console.error("Failed to fetch store profile", error);
        } finally {
          set({ isLoadingStores: false });
        }
      },

      silentFetchStoreProfile: async (id: string) => {
        try {
          const { data } = await client.get(`/stores/${id}`);
          set({ currentStoreProfile: data });
        } catch (error) {
          console.error("Failed to silently fetch store profile", error);
        }
      },

      clearStoreProfile: () => set({ currentStoreProfile: null }),

      updateStoreNotes: async (id, notes) => {
        try {
          await storesApi.updateNotes(id, notes);
          const { currentStoreProfile } = get();
          if (currentStoreProfile && currentStoreProfile.id === id) {
            set({ currentStoreProfile: { ...currentStoreProfile, adminNotes: notes } });
          }
          return true;
        } catch (error) {
          console.error("Failed to update store notes", error);
          return false;
        }
      },

      getVendorById: (id) => get().vendorsList.find(v => v.id === id),

      updateVendorStatus: (id, status) => set((state) => ({
        vendorsList: state.vendorsList.map(v => v.id === id ? { ...v, status } : v)
      })),

      updateVendorDocStatus: (vendorId, docType, status) => set((state) => ({
        vendorsList: state.vendorsList.map(v => {
          if (v.id !== vendorId) return v;
          return {
            ...v,
            docs: { ...v.docs, [docType]: status } as any
          };
        })
      })),

      fetchVendorContract: async () => {
        try {
          const res = await fetch(`${API_URL}/contracts/active`);
          if (res.ok) {
            const data = await res.json();
            set({ activeContract: data });
          }
        } catch (e) {
          console.error("Failed to fetch contract", e);
        }
      },

      saveVendorContract: async (contractData: any) => {
        try {
          const token = localStorage.getItem('access_token');
          if (!token) return false;
          
          const res = await fetch(`${API_URL}/contracts`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(contractData)
          });
          
          if (res.ok) {
            const data = await res.json();
            set({ activeContract: data });
            return true;
          }
          return false;
        } catch (e) {
          console.error("Failed to save contract", e);
          return false;
        }
      },

      fetchWithdrawals: async (silent = false) => {
        if (!silent) set({ isLoadingWithdrawals: true });
        try {
          const token = localStorage.getItem('access_token');
          const { financialFilters } = get();
          const params = new URLSearchParams();
          const status = financialFilters.withdrawalStatus || 'PENDING';
          params.set('status', status);
          if (financialFilters.startDate) params.set('startDate', financialFilters.startDate);
          if (financialFilters.endDate) params.set('endDate', financialFilters.endDate);
          if (financialFilters.period) params.set('period', financialFilters.period);
          if (financialFilters.search) params.set('search', financialFilters.search);
          if (financialFilters.role && financialFilters.role !== 'ALL') {
            params.set('role', financialFilters.role);
          }
          const res = await fetch(`${API_URL}/payments/withdrawals?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({ pendingWithdrawals: data });
          }
        } catch (error) {
          console.error('Failed to fetch withdrawals:', error);
        } finally {
          if (!silent) set({ isLoadingWithdrawals: false });
        }
      },

      processWithdrawal: async (id, action, notes, method, signature, adminName, adminEmail) => {
        try {
          const token = localStorage.getItem('access_token');
          const endpoint = action === 'reject'
            ? `${API_URL}/payments/admin/withdrawals/${id}/reject`
            : `${API_URL}/payments/admin/withdrawals/${id}/approve`;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ 
              notes,
              adminSignature: signature,
              adminName,
              adminEmail
            })
          });
          
          const result = await res.json();
          if (res.ok) {
            get().fetchWithdrawals();
            return { success: true, message: result.message || 'Processed successfully' };
          }
          return { success: false, message: result.message || 'Processing failed' };
        } catch (error) {
          return { success: false, message: 'An unexpected error occurred' };
        }
      },

      approveWithdrawal: async (id, notes, adminName, adminEmail) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/payments/admin/withdrawals/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ notes, adminName, adminEmail }),
          });
          const result = await res.json();
          if (res.ok) {
            get().fetchWithdrawals();
            return { success: true, message: result.message || 'Approved' };
          }
          return { success: false, message: result.message || 'Approval failed' };
        } catch {
          return { success: false, message: 'An unexpected error occurred' };
        }
      },

      rejectWithdrawal: async (id, notes, signature, adminName, adminEmail) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/payments/admin/withdrawals/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ notes, adminSignature: signature, adminName, adminEmail }),
          });
          const result = await res.json();
          if (res.ok) {
            get().fetchWithdrawals();
            return { success: true, message: result.message || 'Rejected' };
          }
          return { success: false, message: result.message || 'Rejection failed' };
        } catch {
          return { success: false, message: 'An unexpected error occurred' };
        }
      },

      completeWithdrawal: async (id, notes, signature, adminName, adminEmail) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/payments/admin/withdrawals/${id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              notes,
              adminSignature: signature,
              adminName,
              adminEmail,
              idempotencyKey: `complete_${id}_${Date.now()}`,
            }),
          });
          const result = await res.json();
          if (res.ok) {
            get().fetchWithdrawals();
            return { success: true, message: result.message || 'Completed' };
          }
          return { success: false, message: result.message || 'Completion failed' };
        } catch {
          return { success: false, message: 'An unexpected error occurred' };
        }
      },

      releaseWithdrawal: async (id, notes, signature, adminName, adminEmail) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/payments/admin/withdrawals/${id}/release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              notes,
              adminSignature: signature,
              adminName,
              adminEmail,
              idempotencyKey: `release_${id}_${Date.now()}`,
            }),
          });
          const result = await res.json();
          if (res.ok) {
            get().fetchWithdrawals();
            return { success: true, message: result.message || 'Released' };
          }
          return { success: false, message: result.message || 'Release failed' };
        } catch {
          return { success: false, message: 'An unexpected error occurred' };
        }
      },

      verifyBankDetails: async (targetId, role) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/payments/admin/verify-bank-details`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ targetId, role })
          });
          const result = await res.json();
          if (res.ok) {
            // Update local state so the UI reflects immediately without re-fetch
            set(state => ({
              pendingWithdrawals: state.pendingWithdrawals.map(w => {
                if (role === 'CUSTOMER' && w.user?.id === targetId) {
                  return { ...w, user: { ...w.user, bankDetailsVerified: true } };
                }
                if (role === 'VENDOR' && w.store?.id === targetId) {
                  return { ...w, store: { ...w.store, bankDetailsVerified: true } };
                }
                return w;
              })
            }));
            return { success: true };
          }
          return { success: false };
        } catch {
          return { success: false };
        }
      },

      fetchWithdrawalLimits: async () => {
        try {
          const res = await fetch(`${API_URL}/payments/admin/withdrawal-settings`);
          if (res.ok) {
            const data = await res.json();
            set({ withdrawalLimits: { min: data.min, max: data.max } });
          }
        } catch (error) {
          console.error('Failed to fetch withdrawal limits:', error);
        }
      },

      updateWithdrawalLimits: async (limits) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/payments/admin/withdrawal-settings`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ min: Number(limits.min), max: Number(limits.max) })
          });
          if (res.ok) {
            set({ withdrawalLimits: limits });
            return true;
          }
          return false;
        } catch (error) {
          return false;
        }
      },

      subscription: null,

      subscribeToStats: () => {
        const { subscription, silentFetchDashboardStats } = get();
        if (subscription) return;

        const channel = supabase.channel('admin-stats-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            () => {
              silentFetchDashboardStats();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'users' },
            () => {
              silentFetchDashboardStats();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'stores' },
            () => {
              silentFetchDashboardStats();
            }
          )
          .subscribe();

        set({ subscription: channel });
      },

      unsubscribeFromStats: () => {
        const { subscription } = get();
        if (subscription) {
          supabase.removeChannel(subscription);
          set({ subscription: null });
        }
      },

      storeSubscription: null,

      subscribeToStores: () => {
        const { storeSubscription, fetchAllStores, silentFetchStores } = get();
        if (storeSubscription) return;

        fetchAllStores(); // Initial load with spinner

        const channel = supabase.channel('admin-stores-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'stores' },
            () => {
              silentFetchStores();
            }
          )
          .subscribe();

        set({ storeSubscription: channel });
      },

      unsubscribeFromStores: () => {
        const { storeSubscription } = get();
        if (storeSubscription) {
          supabase.removeChannel(storeSubscription);
          set({ storeSubscription: null });
        }
      },

      storeProfileSubscription: null,

      subscribeToStoreProfile: (id: string) => {
        const { storeProfileSubscription, fetchStoreProfile, silentFetchStoreProfile } = get();
        if (storeProfileSubscription) return; 

        fetchStoreProfile(id); 

        const channel = supabase.channel(`admin-store-profile-${id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'stores', filter: `id=eq.${id}` },
            () => {
              silentFetchStoreProfile(id);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'store_documents', filter: `store_id=eq.${id}` },
            () => {
              silentFetchStoreProfile(id);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${id}` },
            () => {
              silentFetchStoreProfile(id);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'reviews', filter: `store_id=eq.${id}` },
            () => {
              silentFetchStoreProfile(id);
            }
          )
          .subscribe();

        set({ storeProfileSubscription: channel });
      },

      unsubscribeFromStoreProfile: () => {
        const { storeProfileSubscription } = get();
        if (storeProfileSubscription) {
          supabase.removeChannel(storeProfileSubscription);
          set({ storeProfileSubscription: null });
        }
      },

      withdrawalSubscription: null,

      subscribeToWithdrawals: () => {
        const { withdrawalSubscription, fetchWithdrawals } = get();
        if (withdrawalSubscription) return;

        fetchWithdrawals();

        const channel = supabase.channel('admin-withdrawals-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'withdrawal_requests' },
            () => {
              fetchWithdrawals();
            }
          )
          .subscribe();

        set({ withdrawalSubscription: channel });
      },

      unsubscribeFromWithdrawals: () => {
        const { withdrawalSubscription } = get();
        if (withdrawalSubscription) {
          supabase.removeChannel(withdrawalSubscription);
          set({ withdrawalSubscription: null });
        }
      },

      // Admin Financial Hub Methods
      setFinancialFilters: (filters) => {
        const next = { ...get().financialFilters, ...filters };
        set({
          financialFilters: next,
          feedFilters: {
            ...get().feedFilters,
            startDate: next.startDate,
            endDate: next.endDate,
            search: next.search ?? get().feedFilters.search,
            role: next.role ?? get().feedFilters.role,
          },
        });
        get().fetchAdminFinancials(undefined, false);
        get().fetchFinancialFeed(true);
        if (filters.withdrawalStatus !== undefined || filters.startDate || filters.endDate || filters.search) {
          get().fetchWithdrawals(true);
        }
      },

      financialFeedSubscription: null,

      subscribeToFinancialFeed: () => {
        if (get().financialFeedSubscription) return;

        const scheduleFeedRefresh = () => {
          scheduleDebouncedFeedRefresh(get, true, 1500);
        };

        const channel = supabase.channel('admin-financial-feed')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payment_transactions' }, scheduleFeedRefresh)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payment_transactions' }, scheduleFeedRefresh)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions' }, scheduleFeedRefresh)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wallet_transactions' }, scheduleFeedRefresh)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'escrow_transactions' }, scheduleFeedRefresh)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, scheduleFeedRefresh)
          .subscribe();

        set({ financialFeedSubscription: channel });
      },

      unsubscribeFromFinancialFeed: () => {
        const { financialFeedSubscription } = get();
        if (financialFeedSubscription) {
          supabase.removeChannel(financialFeedSubscription);
          set({ financialFeedSubscription: null, newEventsCount: 0 });
        }
        clearFinancialRefreshTimers();
      },

      clearNewEventsCount: () => set({ newEventsCount: 0 }),

      addFinancialToast: (toast) => {
        const current = get().financialToasts;
        set({ financialToasts: [toast, ...current].slice(0, 5) }); // Keep last 5
        
        // Play notification sound
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
          audio.volume = 0.2;
          audio.play();
        } catch (e) {}

        // Auto remove after 5s
        setTimeout(() => get().removeFinancialToast(toast.id), 5000);
      },

      removeFinancialToast: (id) => {
        set({ financialToasts: get().financialToasts.filter(t => t.id !== id) });
      },

      setFeedFilters: (filters) => {
        const next = { ...get().feedFilters, ...filters };
        set({
          feedFilters: next,
          feedCursor: null,
          financialFilters: {
            ...get().financialFilters,
            ...(filters.search !== undefined ? { search: filters.search } : {}),
          },
        });
        get().fetchFinancialFeed(true);
      },

      fetchFinancialFeed: async (reset = false, silent = false) => {
        const { feedCursor, feedFilters, financialFeed, financialFilters } = get();
        const cursor = reset ? null : feedCursor;

        if (!silent) {
          if (!reset) set({ isFeedLoading: true });
          else set({ isFeedLoading: true, financialFeed: [], feedCursor: null });
        }

        try {
          const token = localStorage.getItem('access_token');
          const queryParams = new URLSearchParams({
            limit: '15',
            type: feedFilters.type || 'ALL',
            search: feedFilters.search || '',
            ...(feedFilters.startDate || financialFilters.startDate
              ? { startDate: feedFilters.startDate || financialFilters.startDate || '' }
              : {}),
            ...(feedFilters.endDate || financialFilters.endDate
              ? { endDate: feedFilters.endDate || financialFilters.endDate || '' }
              : {}),
            ...(feedFilters.role && feedFilters.role !== 'ALL' ? { role: feedFilters.role } : {}),
            ...(cursor ? { cursor } : {}),
          } as Record<string, string>).toString();

          const res = await fetch(`${API_URL}/payments/admin/financial-feed?${queryParams}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            const { data, hasMore, nextCursor } = await res.json();
            const newFeed = reset ? data : [...financialFeed, ...data];

            set({
              financialFeed: newFeed,
              feedHasMore: hasMore,
              feedCursor: nextCursor || null,
              isFeedLoading: false,
            });
          } else {
            set({ isFeedLoading: false });
          }
        } catch (error) {
          console.error('Failed to fetch financial feed', error);
          set({ isFeedLoading: false });
        }
      },

      markFeedItemAsSeen: (_id: string) => {
        /* no-op: row highlight removed for performance */
      },

      fetchOrderTimeline: async (orderId: string, silent = false) => {
        const cached = get().orderTimelineCache[orderId];
        if (!silent) {
          if (cached) {
            set({ orderTimeline: cached, orderTimelineLoading: false, orderTimelineActiveId: orderId });
          } else {
            set({ orderTimelineLoading: true, orderTimeline: null, orderTimelineActiveId: orderId });
          }
        } else {
          set({ orderTimelineActiveId: orderId });
        }

        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/payments/admin/order-financial-timeline/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (get().orderTimelineActiveId !== orderId) return;

          if (res.ok) {
            const data = await res.json();
            const last = data.timeline?.[data.timeline.length - 1];
            const fp = [
              data.timeline?.length ?? 0,
              last?.id ?? '',
              last?.timestamp ?? '',
              data.summary?.totalPaid ?? 0,
            ].join('|');
            const prevFp = get().orderTimelineCache[`${orderId}__fp`];
            if (silent && fp === prevFp) return;

            set((state) => ({
              orderTimeline: data,
              orderTimelineLoading: false,
              orderTimelineCache: {
                ...state.orderTimelineCache,
                [orderId]: data,
                [`${orderId}__fp`]: fp,
              },
            }));
          } else if (!silent && !cached) {
            set({ orderTimelineLoading: false });
          }
        } catch (error) {
          if (get().orderTimelineActiveId !== orderId) return;
          console.error('Failed to fetch order financial timeline', error);
          if (!silent && !cached) set({ orderTimelineLoading: false });
        }
      },

      clearOrderTimeline: () =>
        set({ orderTimeline: null, orderTimelineLoading: false, orderTimelineActiveId: null }),

      // silent=true: update data in background without showing loading skeleton (prevents flicker on realtime updates)
      // silent=false (default): show full loading state (used on initial mount or manual filter changes)
      fetchAdminFinancials: async (filters?: any, silent: boolean = false) => {
        if (!silent) set({ isLoadingFinancials: true });
        try {
          const token = localStorage.getItem('access_token');
          const currentFilters = { limit: 500, ...(filters || get().financialFilters) };
          const queryParams = new URLSearchParams(currentFilters as any).toString();
          const res = await fetch(`${API_URL}/payments/admin/financials${queryParams ? `?${queryParams}` : ''}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            set({ adminFinancials: data });
          }
        } catch (error) {
          console.error('Failed to fetch admin financials', error);
        } finally {
          if (!silent) set({ isLoadingFinancials: false });
        }
      },

      exportFinancialCSV: async (filters) => {
        get().exportUnifiedFinancialCSV(filters);
      },

      exportUnifiedFinancialCSV: async (filters) => {
        try {
          const token = localStorage.getItem('access_token');
          const ff = get().financialFilters;
          const fd = get().feedFilters;
          const currentFilters = {
            ...(filters || {}),
            startDate: ff.startDate,
            endDate: ff.endDate,
            search: fd.search || ff.search || '',
            type: fd.type || 'ALL',
            role: fd.role || ff.role || 'ALL',
            limit: '100000',
          };
          const queryParams = new URLSearchParams(
            Object.fromEntries(
              Object.entries(currentFilters).filter(([, v]) => v !== undefined && v !== ''),
            ) as Record<string, string>,
          ).toString();
          const res = await fetch(`${API_URL}/payments/admin/financial-feed/export?${queryParams}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (!data || data.length === 0) return;
            const headers = Object.keys(data[0]).join(',');
            const csvRows = data.map((row: Record<string, unknown>) =>
              Object.values(row)
                .map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`)
                .join(','),
            );
            const csvString = '\ufeff' + [headers, ...csvRows].join('\n');
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `financial_ledger_export_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        } catch (error) {
          console.error('Failed to export financial ledger CSV', error);
        }
      },

      sendManualPayout: async (dto) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/payments/admin/manual-payout`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(dto)
          });
          const data = await res.json();
          if (res.ok) {
            // Silent refresh after payout - no flicker needed
            get().fetchAdminFinancials(undefined, true);
            return { success: true, message: data.message || 'Payout successful' };
          }
          return { success: false, message: data.message || 'Failed to process payout' };
        } catch (error) {
          return { success: false, message: 'An unexpected error occurred' };
        }
      },

      subscribeToFinancials: () => {
        const { financialSubscription } = get();
        if (financialSubscription) return;

        const refreshFinancials = () => {
          scheduleDebouncedFinancialsRefresh(get);
        };

        const channel = supabase.channel('admin-financials-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'payment_transactions' },
            (payload) => {
              const newStatus = (payload.new as any)?.status;
              const oldStatus = (payload.old as any)?.status;
              if (
                payload.eventType === 'INSERT' ||
                (payload.eventType === 'UPDATE' &&
                  newStatus &&
                  newStatus !== oldStatus &&
                  ['SUCCESS', 'FAILED', 'REFUNDED'].includes(newStatus))
              ) {
                refreshFinancials();
              }
            },
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'wallet_transactions' },
            refreshFinancials,
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'withdrawal_requests' },
            refreshFinancials,
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'escrow_transactions' },
            refreshFinancials,
          )
          .subscribe();

        set({ financialSubscription: channel });
      },

      unsubscribeFromFinancials: () => {
        const { financialSubscription } = get();
        if (financialSubscription) {
          supabase.removeChannel(financialSubscription);
          set({ financialSubscription: null });
        }
        clearFinancialRefreshTimers();
      },

      fetchAdminCustomerInvoices: async (params) => {
        set({ isLoadingCustomerInvoices: true });
        try {
          const token = localStorage.getItem('access_token');
          const query = new URLSearchParams();
          if (params?.search) query.set('search', params.search);
          if (params?.entityType) query.set('entityType', params.entityType);
          if (params?.status) query.set('status', params.status);
          if (params?.invoiceType) query.set('invoiceType', params.invoiceType);
          if (params?.page) query.set('page', String(params.page));
          query.set('limit', '50');
          const res = await fetch(`${API_URL}/invoices/admin/customers?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({
              adminCustomerInvoices: Array.isArray(data) ? data : data.items ?? data.data ?? [],
              adminCustomerInvoicesMeta: data.meta ?? null,
            });
          }
        } catch (error) {
          console.error('Failed to fetch admin customer invoices', error);
        } finally {
          set({ isLoadingCustomerInvoices: false });
        }
      },

      fetchAdminStoreInvoices: async (params) => {
        set({ isLoadingStoreInvoices: true });
        try {
          const token = localStorage.getItem('access_token');
          const query = new URLSearchParams();
          if (params?.search) query.set('search', params.search);
          if (params?.entityType) query.set('entityType', params.entityType);
          if (params?.invoiceType) query.set('invoiceType', params.invoiceType);
          if (params?.page) query.set('page', String(params.page));
          query.set('limit', '50');
          const res = await fetch(`${API_URL}/invoices/admin/stores?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({
              adminStoreInvoices: Array.isArray(data) ? data : data.items ?? data.data ?? [],
              adminStoreInvoicesMeta: data.meta ?? null,
            });
          }
        } catch (error) {
          console.error('Failed to fetch admin store invoices', error);
        } finally {
          set({ isLoadingStoreInvoices: false });
        }
      },

      fetchSellerAccounts: async (search) => {
        set({ isLoadingSellerAccounts: true });
        try {
          const token = localStorage.getItem('access_token');
          const q = search ?? get().financialFilters.search ?? '';
          const res = await fetch(`${API_URL}/payments/admin/seller-accounts?search=${encodeURIComponent(q)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({ sellerAccounts: Array.isArray(data) ? data : data.items ?? data.data ?? [] });
          }
        } catch (error) {
          console.error('Failed to fetch seller accounts', error);
        } finally {
          set({ isLoadingSellerAccounts: false });
        }
      },

      fetchCustomerAccounts: async (search) => {
        set({ isLoadingCustomerAccounts: true });
        try {
          const token = localStorage.getItem('access_token');
          const q = search ?? get().financialFilters.search ?? '';
          const res = await fetch(`${API_URL}/payments/admin/customer-accounts?search=${encodeURIComponent(q)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({ customerAccounts: Array.isArray(data) ? data : data.items ?? data.data ?? [] });
          }
        } catch (error) {
          console.error('Failed to fetch customer accounts', error);
        } finally {
          set({ isLoadingCustomerAccounts: false });
        }
      },

      fetchFinancialRefunds: async (search) => {
        set({ isLoadingFinancialRefunds: true });
        try {
          const token = localStorage.getItem('access_token');
          const q = search ?? get().financialFilters.search ?? '';
          const res = await fetch(`${API_URL}/payments/admin/financial-refunds?search=${encodeURIComponent(q)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({ financialRefunds: Array.isArray(data) ? data : data.items ?? data.data ?? [] });
          }
        } catch (error) {
          console.error('Failed to fetch financial refunds', error);
        } finally {
          set({ isLoadingFinancialRefunds: false });
        }
      },

      fetchSettlementSummary: async () => {
        set({ isLoadingSettlement: true });
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/payments/admin/settlement/summary`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            set({ settlementSummary: await res.json() });
          }
        } catch (error) {
          console.error('Failed to fetch settlement summary', error);
        } finally {
          set({ isLoadingSettlement: false });
        }
      },

      runFinancialSettlement: async (payload) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/payments/admin/settlement/run`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            await get().fetchSettlementSummary();
            await get().fetchSettlementHistory();
            return { success: true, message: data.message || 'Settlement recorded' };
          }
          return { success: false, message: data.message || data.error || 'Settlement run failed' };
        } catch {
          return { success: false, message: 'An unexpected error occurred' };
        }
      },

      fetchSettlementHistory: async () => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/payments/admin/settlement/history?limit=5`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({ settlementHistory: data.data ?? [] });
          }
        } catch (error) {
          console.error('Failed to fetch settlement history', error);
        }
      },

      fetchFinancialPenalties: async (search) => {
        set({ isLoadingFinancialPenalties: true });
        try {
          const token = localStorage.getItem('access_token');
          const q = search ?? get().financialFilters.search ?? '';
          const res = await fetch(`${API_URL}/payments/admin/financial-penalties?search=${encodeURIComponent(q)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({ financialPenalties: Array.isArray(data) ? data : data.items ?? data.data ?? [] });
          }
        } catch (error) {
          console.error('Failed to fetch financial penalties', error);
        } finally {
          set({ isLoadingFinancialPenalties: false });
        }
      },

      fetchFinancialAudit: async (params) => {
        set({ isLoadingFinancialAudit: true });
        try {
          const token = localStorage.getItem('access_token');
          const query = new URLSearchParams();
          if (params?.search) query.set('search', params.search);
          if (params?.page) query.set('page', String(params.page));
          query.set('limit', '50');
          const res = await fetch(`${API_URL}/payments/admin/financial-audit?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({ financialAuditLogs: Array.isArray(data) ? data : data.items ?? data.data ?? [] });
          }
        } catch (error) {
          console.error('Failed to fetch financial audit logs', error);
        } finally {
          set({ isLoadingFinancialAudit: false });
        }
      },

      fetchFinancialReport: async (reportId, params) => {
        set({ isLoadingFinancialReport: true, financialReportData: null });
        try {
          const token = localStorage.getItem('access_token');
          const { financialFilters } = get();
          const query = new URLSearchParams({
            startDate: params?.startDate ?? financialFilters.startDate ?? '',
            endDate: params?.endDate ?? financialFilters.endDate ?? '',
          });
          if (params?.period) query.set('period', params.period);
          const res = await fetch(`${API_URL}/payments/admin/financial-reports/${reportId}?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            set({ financialReportData: await res.json() });
            return;
          }
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || errBody.error || `Report failed (${res.status})`);
        } catch (error) {
          console.error('Failed to fetch financial report', error);
          throw error;
        } finally {
          set({ isLoadingFinancialReport: false });
        }
      },

      exportFinancialReport: async (reportId, format, params) => {
        try {
          const token = localStorage.getItem('access_token');
          const { financialFilters } = get();
          const query = new URLSearchParams({
            format,
            startDate: params?.startDate ?? financialFilters.startDate ?? '',
            endDate: params?.endDate ?? financialFilters.endDate ?? '',
          });
          if (params?.period) query.set('period', params.period);
          const res = await fetch(`${API_URL}/payments/admin/financial-reports/${reportId}?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.message || `Export failed (${res.status})`);
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const ext = format === 'csv' ? 'csv' : format === 'pdf' ? 'pdf' : 'xlsx';
          link.download = `${reportId}_${Date.now()}.${ext}`;
          link.click();
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Failed to export financial report', error);
          throw error;
        }
      },

      fetchAdminInvoiceById: async (id) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/invoices/admin/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) return res.json();
        } catch (error) {
          console.error('Failed to fetch admin invoice', error);
        }
        return null;
      },

      resendAdminInvoice: async (id) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/invoices/admin/${id}/resend`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          return { success: res.ok, message: data.message };
        } catch {
          return { success: false, message: 'Failed to resend invoice' };
        }
      },

      updateStoreRestrictions: async (id, data) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/stores/${id}/restrictions`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
          });
          if (res.ok) {
            const updatedProfile = await res.json();
            // Update local state if profile is open
            const currentProfile = get().currentStoreProfile;
            if (currentProfile && currentProfile.id === id) {
              set({ currentStoreProfile: updatedProfile });
            }
            return true;
          }
          return false;
        } catch (error) {
          console.error("Failed to update store restrictions", error);
          return false;
        }
      },

      clearStoreRestrictions: async (id, signatureData) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/stores/${id}/clear-restrictions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(signatureData || {})
          });
          if (res.ok) {
            const updatedProfile = await res.json();
            const currentProfile = get().currentStoreProfile;
            if (currentProfile && currentProfile.id === id) {
              set({ currentStoreProfile: updatedProfile });
            }
            return true;
          }
          return false;
        } catch (error) {
          console.error("Failed to clear store restrictions", error);
          return false;
        }
      },

      fetchVehicleCatalog: async () => {
        set({ isLoadingCatalog: true });
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/vehicle-catalog/admin/all`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            set({ vehicleMakes: data });
          }
        } catch (error) {
          console.error('Failed to fetch vehicle catalog', error);
        } finally {
          set({ isLoadingCatalog: false });
        }
      },

      createVehicleMake: async (dto) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/vehicle-catalog/admin/makes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(dto)
          });
          return res.ok;
        } catch (error) {
          return false;
        }
      },

      updateVehicleMake: async (id, dto) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/vehicle-catalog/admin/makes/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(dto)
          });
          
          if (res.ok) {
            const currentMakes = get().vehicleMakes;
            set({
              vehicleMakes: currentMakes.map(m => 
                m.id === id ? { ...m, ...dto } : m
              )
            });
            return true;
          }
          return false;
        } catch (error) {
          return false;
        }
      },

      createVehicleModel: async (dto) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/vehicle-catalog/admin/models`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(dto)
          });
          return res.ok;
        } catch (error) {
          return false;
        }
      },

      updateVehicleModel: async (id, dto) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/vehicle-catalog/admin/models/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(dto)
          });
          
          if (res.ok) {
            const currentMakes = get().vehicleMakes;
            set({
              vehicleMakes: currentMakes.map(m => ({
                ...m,
                models: m.models.map(mod => 
                  mod.id === id ? { ...mod, ...dto } : mod
                )
              }))
            });
            return true;
          }
          return false;
        } catch (error) {
          return false;
        }
      },

      toggleAllModels: async (makeId, isActive, signatureData) => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/vehicle-catalog/admin/makes/${makeId}/toggle-models`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ isActive, signatureData })
          });
          
          if (res.ok) {
            const currentMakes = get().vehicleMakes;
            set({
              vehicleMakes: currentMakes.map(m => 
                m.id === makeId 
                  ? { ...m, models: m.models.map(mod => ({ ...mod, isActive })) }
                  : m
              )
            });
            return true;
          }
          return false;
        } catch (error) {
          return false;
        }
      },

      subscribeToCatalog: () => {
        if (get().catalogSubscription) return;

        const sub = supabase.channel('admin-vehicle-catalog-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_makes' }, () => {
            get().fetchVehicleCatalog();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_models' }, () => {
            get().fetchVehicleCatalog();
          })
          .subscribe();

        set({ catalogSubscription: sub });
        get().fetchVehicleCatalog();
      },

      unsubscribeFromCatalog: () => {
        const { catalogSubscription } = get();
        if (catalogSubscription) {
          supabase.removeChannel(catalogSubscription);
          set({ catalogSubscription: null });
        }
      }
    }),
    {
      name: 'etashleh-admin-storage',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          const token = localStorage.getItem('access_token');
          const state = useAdminStore.getState();
          if (!token && state.currentAdmin) {
            useAdminStore.setState({ currentAdmin: null, dashboardStats: null, dashboardStatsError: 'NO_TOKEN' });
            sessionStorage.removeItem('admin');
            return;
          }
          if (token && state.currentAdmin && !state.dashboardStats && !state.isLoadingStats) {
            void state.fetchDashboardStats();
          }
        });
      },
      partialize: (state) => {
        // Exclude circular/non-serializable objects from persistence
        const { 
          subscription, 
          storeSubscription, 
          storeProfileSubscription, 
          withdrawalSubscription,
          financialSubscription,
          financialFeedSubscription,
          orderTimeline,
          orderTimelineCache,
          orderTimelineActiveId,
          financialToasts,
          activitySubscription,
          catalogSubscription,
          ...rest 
        } = state;
        return rest;
      }
    }
  )
);
