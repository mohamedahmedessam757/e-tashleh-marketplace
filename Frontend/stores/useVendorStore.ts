import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useNotificationStore } from './useNotificationStore';
import { supabase } from '../services/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** Ref-count: multiple components may request vendor profile realtime. */
let vendorProfileRealtimeRefCount = 0;
let vendorProfileRealtimeStoreId: string | null = null;

function teardownVendorProfileChannel(getState: () => { vendorProfileSubscription: RealtimeChannel | null }) {
  const { vendorProfileSubscription } = getState();
  if (vendorProfileSubscription) {
    supabase.removeChannel(vendorProfileSubscription);
  }
  if (vendorProfileRealtimeStoreId) {
    const channelName = `vendor-profile-${vendorProfileRealtimeStoreId}`;
    const orphaned = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${channelName}`);
    if (orphaned) {
      supabase.removeChannel(orphaned);
    }
  }
}

export type MerchantStatus = 'IDLE' | 'PENDING_DOCUMENTS' | 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'BLOCKED' | 'LICENSE_EXPIRED';

export interface DocState {
  file: File | null;
  status: 'empty' | 'uploading' | 'completed' | 'approved' | 'rejected' | 'expired' | 'pending' | 'reupload_requested';
  progress: number;
  expiryDate?: string; // ISO Date String
  rejectionReason?: string;
  reuploadMessage?: string;
  adminName?: string;
  adminSignature?: string;
  lastUpdated?: string;
  fileUrl?: string | null;
  fileName?: string;
}

export interface StoreProfileData {
  logo?: string | null;
  categories: string[];
  workingHours: {
    start: string;
    end: string;
  };
  stripeAccountId?: string | null;
  stripeOnboarded?: boolean;
}

export interface BankDetails {
  iban: string;
  bankName: string;
  accountHolder: string;
  status: 'approved' | 'pending_review';
}

export interface VendorSettings {
  notifications: {
    whatsapp: boolean;
    email: boolean;
  };
  autoTranslateChat: boolean; // NEW
}

export interface PerformanceMetrics {
  responseSpeed: number; // in hours
  prepSpeed: number; // in hours
  acceptanceRate: number; // percentage
  complaintRate: number; // percentage
  rating: number; // 0-5
  weeklyEarnings?: number[];
  activeOrdersCount?: number;
  loyaltyTier?: MerchantStatus; // Sync with StoreLoyaltyTier
  lifetimeEarnings?: number;
  // 2026 Governance Metrics
  totalOffersSent: number;
  editCount: number;
  withdrawalCount: number;
  violationScore: number;
}

export interface VendorState {
  step: number;
  vendorStatus: MerchantStatus;
  storeId: string | null;
  storeRejectionReason: string | null;
  
  // Restrictions (2026 Governance)
  withdrawalsFrozen: boolean;
  withdrawalFreezeNote: string;
  offerLimit: number;
  dailyOfferCount: number;
  visibilityRestricted: boolean;
  visibilityRate: number;
  visibilityNote: string;
  restrictionAlertMessage: string;

  account: {
    name: string;
    email: string;
    phone: string;
    countryCode: string;
    password: string;
  };
  otpVerified: boolean;
  storeInfo: {
    storeName: string;
    selectedMakes: string[];
    selectedModels: string[];
    customMake: string;
    customModel: string;
    bio: string;
    address: string;
    lat: number | null;
    lng: number | null;
  };

  contractFormData: {
    secondPartyData: {
      companyName: string;
      managerName: string;
      crNumber: string;
      licenseNumber: string;
      licenseExpiry: string;
      emirate: string;
      country: string;
    };
    signatureData: {
      signedName: string;
      email: string; // Read-only from account
      phone: string; // Read-only from account
      address: string;
      date: string;
    };
  };

  profile: StoreProfileData;
  bankDetails: BankDetails;
  settings: VendorSettings;
  performance: PerformanceMetrics;

  contractAgreed: boolean;
  contractId: string | null;
  documents: {
    cr: DocState;
    license: DocState;
    id: DocState;
    iban: DocState;
    authLetter: DocState;
  };
  contractAcceptance: any | null;

  isLoadingProfile: boolean;
  
  // Actions
  setStep: (step: number) => void;
  setVendorStatus: (status: MerchantStatus) => void;
  updateAccount: (field: string, value: string) => void;
  updateStoreInfo: (field: string, value: any) => void;
  updateContractFormData: (section: 'secondPartyData' | 'signatureData', field: string, value: string) => void;
  updateProfile: (data: Partial<StoreProfileData>) => void;
  updateBankDetails: (data: Partial<BankDetails>) => void;
  updateSettings: (data: Partial<VendorSettings>) => void;

  setOtpVerified: (verified: boolean) => void;
  setContractAgreed: (agreed: boolean) => void;
  setContractId: (id: string | null) => void;
  updateDocumentStatus: (key: keyof VendorState['documents'], status: DocState['status'], progress?: number) => void;
  updateDocumentMetadata: (key: keyof VendorState['documents'], data: Partial<DocState>) => void;
  setDocumentFile: (key: keyof VendorState['documents'], file: File) => void;
  uploadDocument: (key: keyof VendorState['documents'], file: File) => Promise<void>;
  uploadLogo: (file: File) => Promise<string>;
  simulateUpload: (key: keyof VendorState['documents']) => void;
  reset: () => void;

  // LOGIC ACTIONS
  fetchDashboardStats: () => Promise<void>;
  fetchVendorProfile: () => Promise<void>;
  updateVendorProfile: () => Promise<void>;
  checkLicenseStatus: () => void;
  adminApproveVendor: (id: string) => Promise<void>;
  adminRejectVendor: (id: string, reason: string) => Promise<void>;
  adminBanVendor: () => void;
  connectStripe: () => Promise<void>;
  openStripeDashboard: () => Promise<void>;
  // Real-time
  vendorProfileSubscription: any;
  subscribeToVendorProfile: () => void;
  unsubscribeFromVendorProfile: () => void;
}

const initialDocState: DocState = { file: null, status: 'empty', progress: 0 };

export const useVendorStore = create<VendorState>()(
  persist(
    (set, get) => ({
  step: 1,
  vendorStatus: 'IDLE',
  storeId: null,
  storeRejectionReason: null,
  withdrawalsFrozen: false,
  withdrawalFreezeNote: '',
  offerLimit: -1,
  dailyOfferCount: 0,
  visibilityRestricted: false,
  visibilityRate: 100,
  visibilityNote: '',
  restrictionAlertMessage: '',
  account: { name: '', email: '', phone: '', countryCode: '+966', password: '' },
  otpVerified: false,
  storeInfo: { storeName: '', selectedMakes: [], selectedModels: [], customMake: '', customModel: '', bio: '', address: '', lat: null, lng: null },
  contractFormData: {
    secondPartyData: { companyName: '', managerName: '', crNumber: '', licenseNumber: '', licenseExpiry: '', emirate: '', country: '' },
    signatureData: { signedName: '', email: '', phone: '', address: '', date: '' }
  },
  contractAgreed: false,
  contractId: null,

  profile: {
    logo: null,
    categories: ['Spare Parts'],
    workingHours: { start: '09:00', end: '21:00' }
  },

  bankDetails: {
    iban: 'SA55 8000 0000 0000 0000 1234',
    bankName: 'Al Rajhi Bank',
    accountHolder: 'Mohammed Ali Store',
    status: 'approved'
  },
  isLoadingProfile: true,

  settings: {
    notifications: {
      whatsapp: true,
      email: false
    },
    autoTranslateChat: false
  },

  performance: {
    responseSpeed: 2.5,
    prepSpeed: 20,
    acceptanceRate: 85,
    complaintRate: 1.2,
    rating: 4.8,
    totalOffersSent: 0,
    editCount: 0,
    withdrawalCount: 0,
    violationScore: 0
  },

  // Initialize with empty docs for registration flow, or mock data for demo
  documents: {
    cr: { ...initialDocState },
    license: { ...initialDocState }, // Set expiry here to test: expiryDate: '2023-01-01'
    id: { ...initialDocState },
    iban: { ...initialDocState },
    authLetter: { ...initialDocState }
  },
  contractAcceptance: null,

  setStep: (step) => set({ step }),
  setVendorStatus: (status) => set({ vendorStatus: status }),

  updateAccount: (field, value) =>
    set((state) => ({ account: { ...state.account, [field]: value } })),

  updateStoreInfo: (field, value) =>
    set((state) => ({ storeInfo: { ...state.storeInfo, [field]: value } })),

  updateContractFormData: (section, field, value) => set((state) => ({
    contractFormData: {
      ...state.contractFormData,
      [section]: {
        ...state.contractFormData[section],
        [field]: value
      }
    }
  })),

  updateProfile: (data) => set((state) => ({ profile: { ...state.profile, ...data } })),

  updateBankDetails: (data) => set((state) => ({
    bankDetails: { ...state.bankDetails, ...data, status: 'pending_review' }
  })),

  updateSettings: (data: Partial<VendorSettings>) => set((state) => ({
    settings: {
      ...state.settings,
      ...data,
      notifications: data.notifications
        ? { ...state.settings.notifications, ...data.notifications }
        : state.settings.notifications
    }
  })),

  setOtpVerified: (verified) => set({ otpVerified: verified }),
  setContractAgreed: (agreed) => set({ contractAgreed: agreed }),
  setContractId: (id) => set({ contractId: id }),

  updateDocumentStatus: (key, status, progress) => set((state) => ({
    documents: {
      ...state.documents,
      [key]: {
        ...state.documents[key],
        status,
        progress: progress !== undefined ? progress : state.documents[key].progress
      }
    }
  })),

  updateDocumentMetadata: (key, data) => set((state) => ({
    documents: {
      ...state.documents,
      [key]: { ...state.documents[key], ...data }
    }
  })),

  setDocumentFile: (key, file) => set((state) => ({
    documents: {
      ...state.documents,
      [key]: { ...state.documents[key], file, status: 'uploading', progress: 0 }
    }
  })),

  // REAL LOGO UPLOAD
  uploadLogo: async (file: File) => {
    // 2026 Security: Validate file before hitting Supabase
    if (file.size > 2 * 1024 * 1024) throw new Error('File size exceeds 2MB limit');
    if (!file.type.startsWith('image/')) throw new Error('Invalid file type. Only images allowed.');

    try {
      const { supabase } = await import('../services/supabase');
      const storeName = get().storeInfo.storeName || 'unknown_store';
      const safeName = storeName.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || `store_${Date.now()}`;
      const fileExt = file.name.split('.').pop();
      const fileName = `${safeName}_logo_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to 'profile' bucket
      const { data, error } = await supabase.storage
        .from('profile')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile')
        .getPublicUrl(filePath);

      // Update local state immediately
      set((state) => ({
        profile: { ...state.profile, logo: publicUrl }
      }));

      return publicUrl;
    } catch (error) {
      console.error('Logo Upload Failed:', error);
      throw error;
    }
  },

  // REAL DOCUMENT UPLOAD & SYNC
  uploadDocument: async (key: keyof VendorState['documents'], file: File) => {
    // 2026 Security: File size limit 5MB for documents
    if (file.size > 5 * 1024 * 1024) {
      useNotificationStore.getState().addNotification({ 
        type: 'error', 
        titleEn: 'Error', titleAr: 'خطأ',
        message: 'File size exceeds 5MB limit.', 
        priority: 'high' 
      });
      return;
    }

    const { updateDocumentStatus, updateDocumentMetadata } = get();
    // Start Upload
    updateDocumentStatus(key, 'uploading', 0);

    try {
      const { supabase } = await import('../services/supabase');
      const storeName = get().storeInfo.storeName || 'unknown_store';
      // Sanitize filename
      const safeName = storeName.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || `store_${Date.now()}`;
      const fileExt = file.name.split('.').pop();
      const fileName = `${safeName}_${key}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to 'vendor-documents' bucket
      const { data, error } = await supabase.storage
        .from('vendor-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vendor-documents')
        .getPublicUrl(filePath);

      // SYNC WITH BACKEND (Only if logged in / has token)
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const { client } = await import('../services/api/client');
          const docTypeMap: Record<string, string> = {
            cr: 'CR',
            license: 'LICENSE',
            id: 'ID',
            iban: 'IBAN',
            authLetter: 'AUTH_LETTER'
          };

          await client.post('/stores/onboarding/documents', {
            docType: docTypeMap[key],
            fileUrl: publicUrl
          });
        } catch (syncError) {
          console.warn('Backend sync failed (possibly expired token). File is safe in Supabase and will be linked on final registration.', syncError);
        }
      }

      // Update local state
      updateDocumentStatus(key, 'pending', 100); 
      updateDocumentMetadata(key, {
        lastUpdated: new Date().toISOString(),
        fileUrl: publicUrl,
        fileName: fileName
      });

    } catch (error) {
      console.error('Upload Failed:', error);
      updateDocumentStatus(key, 'empty', 0);
      throw error;
    }
  },

  simulateUpload: (key) => {
    // Deprecated, mapped to uploadDocument internally if needed, or removed.
    // Keeping this solely for API compatibility if called elsewhere, but logic handles actual upload now.
    console.warn('simulateUpload is deprecated. Use uploadDocument instead.');
  },

  fetchDashboardStats: async () => {
    try {
      const { client } = await import('../services/api/client');
      const response = await client.get('/stores/me/dashboard');
      if (response && response.data) {
        set((state) => ({
          performance: {
            ...state.performance,
            ...response.data.performance,
            weeklyEarnings: response.data.weeklyEarnings,
            activeOrdersCount: response.data.activeOrdersCount
          }
        }));
      }
    } catch (error) {
      console.error('Failed to fetch merchant dashboard stats:', error);
    }
  },

      fetchVendorProfile: async () => {
        // Reset loading state and ensure a clean slate before fetching
        // ONLY if we don't already have a storeId (initial load)
        const isInitial = !get().storeId;
        if (isInitial) set({ isLoadingProfile: true });

        try {
          const { client } = await import('../services/api/client');
      const response = await client.get('/stores/me');
      
      if (response && response.data) {
        const data = response.data;
        
        // Persist store ID for analytics/filtering (minimal local leakage)
        if (data.id) localStorage.setItem('merchant_store_id', data.id);
        set({
          storeId: data.id,
          vendorStatus: data.status,
          storeRejectionReason: data.rejectionReason,
          storeInfo: {
            storeName: data.name,
            selectedMakes: data.selectedMakes || [],
            selectedModels: data.selectedModels || [],
            customMake: data.customMake || '',
            customModel: data.customModel || '',
            bio: data.description || '',
            address: data.address || '',
            lat: data.lat,
            lng: data.lng
          },
          profile: {
            logo: data.logo,
            categories: data.categories || ['Spare Parts'],
            workingHours: data.workingHours || { start: '09:00', end: '21:00' },
            stripeAccountId: data.stripeAccountId,
            stripeOnboarded: data.stripeOnboarded
          },
          account: {
            name: data.owner?.name || '',
            email: data.owner?.email || '',
            phone: data.owner?.phone || '',
            countryCode: '+966',
            password: ''
          },
          bankDetails: data.bankDetails || {
            iban: '',
            bankName: '',
            accountHolder: '',
            status: 'pending_review'
          },
          documents: {
            cr: { ...initialDocState, fileUrl: data.documents?.find((d: any) => d.docType === 'CR')?.fileUrl, status: data.documents?.find((d: any) => d.docType === 'CR')?.status || 'empty', expiryDate: data.documents?.find((d: any) => d.docType === 'CR')?.expiresAt, lastUpdated: data.documents?.find((d: any) => d.docType === 'CR')?.updatedAt, reuploadMessage: data.documents?.find((d: any) => d.docType === 'CR')?.reuploadMessage, adminName: data.documents?.find((d: any) => d.docType === 'CR')?.adminName, adminSignature: data.documents?.find((d: any) => d.docType === 'CR')?.adminSignature },
            license: { ...initialDocState, fileUrl: data.documents?.find((d: any) => d.docType === 'LICENSE')?.fileUrl, status: data.documents?.find((d: any) => d.docType === 'LICENSE')?.status || 'empty', expiryDate: data.documents?.find((d: any) => d.docType === 'LICENSE')?.expiresAt, lastUpdated: data.documents?.find((d: any) => d.docType === 'LICENSE')?.updatedAt, reuploadMessage: data.documents?.find((d: any) => d.docType === 'LICENSE')?.reuploadMessage, adminName: data.documents?.find((d: any) => d.docType === 'LICENSE')?.adminName, adminSignature: data.documents?.find((d: any) => d.docType === 'LICENSE')?.adminSignature },
            id: { ...initialDocState, fileUrl: data.documents?.find((d: any) => d.docType === 'ID')?.fileUrl, status: data.documents?.find((d: any) => d.docType === 'ID')?.status || 'empty', expiryDate: data.documents?.find((d: any) => d.docType === 'ID')?.expiresAt, lastUpdated: data.documents?.find((d: any) => d.docType === 'ID')?.updatedAt, reuploadMessage: data.documents?.find((d: any) => d.docType === 'ID')?.reuploadMessage, adminName: data.documents?.find((d: any) => d.docType === 'ID')?.adminName, adminSignature: data.documents?.find((d: any) => d.docType === 'ID')?.adminSignature },
            iban: { ...initialDocState, fileUrl: data.documents?.find((d: any) => d.docType === 'IBAN')?.fileUrl, status: data.documents?.find((d: any) => d.docType === 'IBAN')?.status || 'empty', expiryDate: data.documents?.find((d: any) => d.docType === 'IBAN')?.expiresAt, lastUpdated: data.documents?.find((d: any) => d.docType === 'IBAN')?.updatedAt, reuploadMessage: data.documents?.find((d: any) => d.docType === 'IBAN')?.reuploadMessage, adminName: data.documents?.find((d: any) => d.docType === 'IBAN')?.adminName, adminSignature: data.documents?.find((d: any) => d.docType === 'IBAN')?.adminSignature },
            authLetter: { ...initialDocState, fileUrl: data.documents?.find((d: any) => d.docType === 'AUTH_LETTER')?.fileUrl, status: data.documents?.find((d: any) => d.docType === 'AUTH_LETTER')?.status || 'empty', expiryDate: data.documents?.find((d: any) => d.docType === 'AUTH_LETTER')?.expiresAt, lastUpdated: data.documents?.find((d: any) => d.docType === 'AUTH_LETTER')?.updatedAt, reuploadMessage: data.documents?.find((d: any) => d.docType === 'AUTH_LETTER')?.reuploadMessage, adminName: data.documents?.find((d: any) => d.docType === 'AUTH_LETTER')?.adminName, adminSignature: data.documents?.find((d: any) => d.docType === 'AUTH_LETTER')?.adminSignature }
          },
          withdrawalsFrozen: data.owner?.withdrawalsFrozen || false,
          withdrawalFreezeNote: data.owner?.withdrawalFreezeNote || '',
          offerLimit: data.offerLimit || -1,
          dailyOfferCount: data.dailyOfferCount || 0,
          visibilityRestricted: data.visibilityRestricted || false,
          visibilityRate: data.visibilityRate || 100,
          visibilityNote: data.visibilityNote || '',
          restrictionAlertMessage: data.restrictionAlertMessage || '',
          contractAcceptance: data.contractAcceptances?.[0] || null,
          isLoadingProfile: false
        });
      }
    } catch (error) {
      console.error('Failed to fetch vendor profile:', error);
      set({ isLoadingProfile: false });
    }
  },

  updateVendorProfile: async () => {
    const { storeInfo, profile } = get();
    try {
      const { client } = await import('../services/api/client');
      const payload = {
        name: storeInfo.storeName,
        description: storeInfo.bio,
        selectedMakes: storeInfo.selectedMakes,
        selectedModels: storeInfo.selectedModels,
        customMake: storeInfo.customMake,
        customModel: storeInfo.customModel,
        logo: profile.logo,
        address: storeInfo.address,
        lat: storeInfo.lat,
        lng: storeInfo.lng,
      };

      await client.patch('/stores/me', payload);

      // Refresh data locally
      await get().fetchVendorProfile();
      
      useNotificationStore.getState().addNotification({
        type: 'success',
        titleEn: 'Success',
        titleAr: 'تم بنجاح',
        message: 'Profile updated successfully',
        priority: 'normal'
      });
    } catch (error) {
      console.error('Failed to update vendor profile:', error);
      useNotificationStore.getState().addNotification({
        type: 'error',
        titleEn: 'Error',
        titleAr: 'خطأ',
        message: 'Failed to update profile',
        priority: 'high'
      });
      throw error;
    }
  },

  // --- THE LICENSE WATCHDOG LOGIC ---
  checkLicenseStatus: () => {
    const state = get();
    const license = state.documents.license;

    // Only check if active or already expired (to re-activate)
    if (['PENDING_DOCUMENTS', 'PENDING_REVIEW', 'IDLE'].includes(state.vendorStatus)) return;

    if (license.expiryDate) {
      const today = new Date();
      const expiry = new Date(license.expiryDate);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0 && state.vendorStatus !== 'LICENSE_EXPIRED') {
        // EXPIRED: Block Access
        set({ vendorStatus: 'LICENSE_EXPIRED' });
        state.updateDocumentStatus('license', 'expired');
        useNotificationStore.getState().addNotification({
          type: 'docExpiry',
          titleKey: 'docExpiry',
          message: 'CRITICAL: License Expired. Account Restricted.',
          priority: 'urgent',
          linkTo: 'docs'
        });
      } else if (diffDays > 0 && state.vendorStatus === 'LICENSE_EXPIRED') {
        // RENEWED: Restore Access
        set({ vendorStatus: 'ACTIVE' });
        state.updateDocumentStatus('license', 'approved');
      }
    }
  },

  adminApproveVendor: async (id: string) => {
    try {
      const { client } = await import('../services/api/client');
      await client.patch(`/stores/${id}/status`, { status: 'ACTIVE' });
      
      // Update local status if it happens to be the current vendor (for simulation)
      if (get().vendorStatus !== 'ACTIVE') {
        set({ vendorStatus: 'ACTIVE', storeRejectionReason: null });
      }
      
      useNotificationStore.getState().addNotification({
        titleEn: 'Success', 
        messageEn: 'Store has been activated successfully', 
        type: 'SYSTEM'
      });
    } catch (error) {
      console.error('Failed to approve vendor:', error);
      useNotificationStore.getState().addNotification({ titleEn: 'Error', messageEn: 'Failed to approve store', type: 'SYSTEM' });
    }
  },

  adminRejectVendor: async (id: string, reason: string) => {
    try {
      const { client } = await import('../services/api/client');
      await client.patch(`/stores/${id}/status`, { status: 'REJECTED', reason });
      
      // Update local status if it's the same (for simulation)
      set({ 
        vendorStatus: 'REJECTED', 
        storeRejectionReason: reason 
      });

      useNotificationStore.getState().addNotification({
        titleEn: 'Rejected', 
        messageEn: 'Store has been rejected with reason', 
        type: 'SYSTEM'
      });
    } catch (error) {
      console.error('Failed to reject vendor:', error);
      useNotificationStore.getState().addNotification({ titleEn: 'Error', messageEn: 'Failed to reject store', type: 'SYSTEM' });
    }
  },

  adminBanVendor: () => set({ vendorStatus: 'BLOCKED' }),

  connectStripe: async () => {
    try {
      const { client } = await import('../services/api/client');
      const response = await client.post('/stripe/onboarding-link');
      if (response && response.data && response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Failed to get Stripe link', error);
      useNotificationStore.getState().addNotification({ type: 'error', titleEn: 'Error', message: 'Could not generate Stripe link', priority: 'high' });
    }
  },

  openStripeDashboard: async () => {
    try {
      const { client } = await import('../services/api/client');
      const response = await client.get('/stripe/dashboard-link');
      if (response && response.data && response.data.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to get dashboard link', error);
      useNotificationStore.getState().addNotification({ type: 'error', titleEn: 'Error', message: 'Could not access Stripe dashboard', priority: 'high' });
    }
  },

  vendorProfileSubscription: null,
  subscribeToVendorProfile: () => {
    const { fetchVendorProfile, storeId } = get();
    if (!storeId) return;

    if (
      vendorProfileRealtimeRefCount > 0 &&
      vendorProfileRealtimeStoreId === storeId &&
      get().vendorProfileSubscription
    ) {
      vendorProfileRealtimeRefCount += 1;
      return;
    }

    teardownVendorProfileChannel(get);

    vendorProfileRealtimeRefCount = 1;
    vendorProfileRealtimeStoreId = storeId;

    const channelName = `vendor-profile-${storeId}`;
    const orphaned = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${channelName}`);
    if (orphaned) {
      supabase.removeChannel(orphaned);
    }

    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stores', filter: `id=eq.${storeId}` },
        (payload) => {
          set({
            vendorStatus: payload.new.status,
            withdrawalsFrozen: payload.new.withdrawals_frozen,
            withdrawalFreezeNote: payload.new.withdrawal_freeze_note,
            offerLimit: payload.new.offer_limit,
            dailyOfferCount: payload.new.daily_offer_count,
            visibilityRestricted: payload.new.visibility_restricted,
            visibilityRate: payload.new.visibility_rate,
            restrictionAlertMessage: payload.new.restriction_alert_message,
          });
          fetchVendorProfile();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_acceptances',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          fetchVendorProfile();
        },
      )
      .subscribe();

    set({ vendorProfileSubscription: channel });
  },

  unsubscribeFromVendorProfile: () => {
    vendorProfileRealtimeRefCount = Math.max(0, vendorProfileRealtimeRefCount - 1);
    if (vendorProfileRealtimeRefCount > 0) return;

    teardownVendorProfileChannel(get);
    vendorProfileRealtimeStoreId = null;
    set({ vendorProfileSubscription: null });
  },

  reset: () => {
    vendorProfileRealtimeRefCount = 0;
    teardownVendorProfileChannel(get);
    vendorProfileRealtimeStoreId = null;

    // SECURITY: Explicitly clear local identifiers
    localStorage.removeItem('merchant_store_id');
    
    set({
      step: 1,
      vendorStatus: 'IDLE', // Default to IDLE instead of PENDING_DOCUMENTS for clean state
      storeId: null,
      storeRejectionReason: null,
      account: { name: '', email: '', phone: '', countryCode: '+966', password: '' },
      otpVerified: false,
      storeInfo: { storeName: '', selectedMakes: [], selectedModels: [], customMake: '', customModel: '', bio: '', address: '', lat: null, lng: null },
      contractFormData: {
        secondPartyData: { companyName: '', managerName: '', crNumber: '', licenseNumber: '', licenseExpiry: '', emirate: '', country: '' },
        signatureData: { signedName: '', email: '', phone: '', address: '', date: '' }
      },
      profile: { logo: null, categories: ['Spare Parts'], workingHours: { start: '09:00', end: '21:00' } },
      contractAgreed: false,
      contractId: null,
      bankDetails: {
        iban: '',
        bankName: '',
        accountHolder: '',
        status: 'pending_review'
      },
      settings: {
        notifications: { whatsapp: true, email: false },
        autoTranslateChat: false
      },
      performance: {
        responseSpeed: 0,
        prepSpeed: 0,
        acceptanceRate: 100,
        complaintRate: 0,
        rating: 5.0,
        totalOffersSent: 0,
        editCount: 0,
        withdrawalCount: 0,
        violationScore: 0
      },
      documents: {
        cr: { ...initialDocState },
        license: { ...initialDocState },
        id: { ...initialDocState },
        iban: { ...initialDocState },
        authLetter: { ...initialDocState }
      },
      vendorProfileSubscription: null,
      isLoadingProfile: false // Set to false on reset to avoid perpetual loading UI
    });
  }
}),
{
  name: 'vendor-storage',
  storage: createJSONStorage(() => sessionStorage),
  partialize: (state) => ({ 
    vendorStatus: state.vendorStatus, 
    storeId: state.storeId, 
    storeRejectionReason: state.storeRejectionReason,
    storeInfo: { 
      storeName: state.storeInfo.storeName,
      selectedMakes: state.storeInfo.selectedMakes,
      selectedModels: state.storeInfo.selectedModels
    } 
  }),
}
)
);
