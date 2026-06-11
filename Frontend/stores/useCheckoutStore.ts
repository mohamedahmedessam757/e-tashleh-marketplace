import { create } from 'zustand';
import { client } from '../services/api/client';
import { paymentsApi } from '../services/api/payments';
import { formatApiErrorMessage } from '../utils/formatApiErrorMessage';
import {
  clearCheckoutSession,
  hasMeaningfulAddress,
  loadCheckoutSession,
  saveCheckoutSession,
  type PersistedCheckoutSession,
} from '../utils/checkoutSessionStorage';

/** Dedupes concurrent create-intent calls (expand prefetch + pay button race). */
const paymentIntentInflight = new Map<string, Promise<string | null>>();

export interface Address {
  fullName: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  details: string;
}

export interface OfferDetails {
  id: string;
  merchantName: string;
  price: number;
  partName: string;
}

export interface CardDetails {
  number: string;
  expiry: string;
  cvv: string;
  holder: string;
}

interface PaymentResult {
  success: boolean;
  transactionNumber?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  allPaid?: boolean;
  orderTransitioned?: boolean;
  remainingOffers?: number;
  error?: string;
}

interface CheckoutState {
  orderId: string | null;
  step: number;
  address: Address;
  selectedOffer: OfferDetails | null;
  isProcessing: boolean;
  openDrawerForPartId: string | null;

  // Shipping Confirmation States
  termsAccepted: boolean;
  returnPolicyAccepted: boolean;
  isEditingShipping: boolean;
  partAddresses: Record<string, Address>;

  // Payment States
  paidOfferIds: string[];
  paymentError: string | null;
  lastPaymentResult: PaymentResult | null;
  clientSecret: string | null;
  isOnline: boolean;

  setOrderId: (id: string | null) => void;
  setStep: (step: number) => void;
  setOpenDrawerForPartId: (id: string | null) => void;
  updateAddress: (field: keyof Address, value: string) => void;
  setSelectedOffer: (offer: OfferDetails) => void;

  // Shipping Confirmation Actions
  setTermsAccepted: (accepted: boolean) => void;
  setReturnPolicyAccepted: (accepted: boolean) => void;
  setIsEditingShipping: (isEditing: boolean) => void;
  setPartAddress: (partId: string, address: Address) => void;

  saveOrderData: () => Promise<boolean>;
  processPayment: (orderId: string, offerId: string, card: CardDetails) => Promise<PaymentResult>;
  createPaymentIntent: (orderId: string, offerId: string) => Promise<string | null>;
  clearPaymentError: () => void;
  submitPayment: () => Promise<void>;
  setIsOnline: (online: boolean) => void;
  resetPaymentState: () => void;
  fetchPaymentStatus: (offerId: string) => Promise<any>;
  /** Merge SUCCESS payments from API for each offer (source of truth). */
  syncPaidOffersForOrder: (offerIds: string[]) => Promise<string[]>;
  persistCheckoutSession: () => void;
  /** Restore local session + optional server shipping; avoid wipe on re-entry. */
  initCheckoutForOrder: (
    orderId: string,
    options?: { defaultStep?: number; forceReset?: boolean },
  ) => void;
  hydrateShippingFromOrder: (order: {
    shippingAddresses?: Array<{
      orderPartId?: string | null;
      fullName?: string;
      phone?: string;
      email?: string;
      country?: string;
      city?: string;
      details?: string;
    }>;
  }) => void;
  reset: () => void;
  clearCheckoutForOrder: (orderId: string) => void;
}

const emptyAddress = (): Address => ({
  fullName: '',
  phone: '',
  email: '',
  country: '',
  city: '',
  details: '',
});

const snapshotForPersist = (s: CheckoutState): PersistedCheckoutSession => ({
  step: s.step,
  address: s.address,
  partAddresses: s.partAddresses,
  termsAccepted: s.termsAccepted,
  returnPolicyAccepted: s.returnPolicyAccepted,
  isEditingShipping: s.isEditingShipping,
  paidOfferIds: s.paidOfferIds.map(String),
  selectedOffer: s.selectedOffer,
});

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  orderId: null,
  step: 1,
  address: {
    fullName: '',
    phone: '',
    email: '',
    country: '',
    city: '',
    details: ''
  },
  selectedOffer: null,
  isProcessing: false,
  openDrawerForPartId: null,

  termsAccepted: false,
  returnPolicyAccepted: false,
  isEditingShipping: false,
  partAddresses: {},

  paidOfferIds: [],
  paymentError: null,
  lastPaymentResult: null,
  clientSecret: null,
  isOnline: navigator.onLine,

  setOrderId: (id) => set({ orderId: id }),

  persistCheckoutSession: () => {
    const s = get();
    if (!s.orderId) return;
    saveCheckoutSession(s.orderId, snapshotForPersist(s));
  },

  initCheckoutForOrder: (orderId, options) => {
    const forceReset = options?.forceReset === true;
    const saved = !forceReset ? loadCheckoutSession(orderId) : null;
    const current = get();

    if (saved) {
      set({
        orderId,
        step: saved.step,
        address: saved.address,
        partAddresses: saved.partAddresses,
        termsAccepted: saved.termsAccepted,
        returnPolicyAccepted: saved.returnPolicyAccepted,
        isEditingShipping: saved.isEditingShipping,
        paidOfferIds: saved.paidOfferIds,
        selectedOffer: saved.selectedOffer,
        paymentError: null,
        clientSecret: null,
        isProcessing: false,
      });
      get().persistCheckoutSession();
      return;
    }

    const keepInMemory =
      !forceReset &&
      current.orderId === orderId &&
      (hasMeaningfulAddress(current.address) ||
        Object.keys(current.partAddresses).length > 0);

    if (keepInMemory) {
      set({
        orderId,
        step: options?.defaultStep ?? current.step,
        paymentError: null,
        clientSecret: null,
        isProcessing: false,
      });
      get().persistCheckoutSession();
      return;
    }

    set({
      orderId,
      step: options?.defaultStep ?? 1,
      address: emptyAddress(),
      isProcessing: false,
      selectedOffer: null,
      openDrawerForPartId: null,
      termsAccepted: false,
      returnPolicyAccepted: false,
      isEditingShipping: true,
      partAddresses: {},
      paidOfferIds: [],
      paymentError: null,
      lastPaymentResult: null,
      clientSecret: null,
      isOnline: navigator.onLine,
    });
    get().persistCheckoutSession();
  },

  hydrateShippingFromOrder: (order) => {
    const addrs = order.shippingAddresses;
    if (!addrs?.length) return;
    if (hasMeaningfulAddress(get().address)) return;

    const toAddress = (a: (typeof addrs)[0]): Address => ({
      fullName: a.fullName || '',
      phone: a.phone || '',
      email: a.email || '',
      country: a.country || '',
      city: a.city || '',
      details: a.details || '',
    });

    const main = addrs.find((a) => !a.orderPartId) || addrs[0];
    const partAddresses: Record<string, Address> = {};
    for (const a of addrs) {
      if (a.orderPartId) {
        partAddresses[String(a.orderPartId)] = toAddress(a);
      }
    }

    set({
      address: toAddress(main),
      partAddresses,
      termsAccepted: true,
      returnPolicyAccepted: true,
      isEditingShipping: false,
    });
    get().persistCheckoutSession();
  },

  setStep: (step) => {
    set({ step });
    get().persistCheckoutSession();
  },
  setOpenDrawerForPartId: (id) => set({ openDrawerForPartId: id }),
  updateAddress: (field, value) => {
    set((state) => ({ address: { ...state.address, [field]: value } }));
    get().persistCheckoutSession();
  },
  setSelectedOffer: (offer) => {
    set({ selectedOffer: offer });
    get().persistCheckoutSession();
  },

  setTermsAccepted: (accepted) => {
    set({ termsAccepted: accepted });
    get().persistCheckoutSession();
  },
  setReturnPolicyAccepted: (accepted) => {
    set({ returnPolicyAccepted: accepted });
    get().persistCheckoutSession();
  },
  setIsEditingShipping: (isEditing) => {
    set({ isEditingShipping: isEditing });
    get().persistCheckoutSession();
  },
  setPartAddress: (partId, addr) => {
    set((state) => ({ partAddresses: { ...state.partAddresses, [partId]: addr } }));
    get().persistCheckoutSession();
  },

  saveOrderData: async () => {
    const { orderId, address, partAddresses } = useCheckoutStore.getState();
    if (!orderId) return false;

    set({ isProcessing: true });
    try {
      const payloadAddresses: any[] = [];
      const partKeys = Object.keys(partAddresses);

      if (partKeys.length > 0) {
        partKeys.forEach(partId => {
          payloadAddresses.push({ ...partAddresses[partId], orderPartId: partId });
        });
      } else {
        payloadAddresses.push({ ...address, orderPartId: null });
      }

      await client.patch(`/orders/${orderId}/checkout-data`, { addresses: payloadAddresses });
      get().persistCheckoutSession();

      return true;
    } catch (e) {
      console.error('saveOrderData failed:', e);
      return false;
    } finally {
      set({ isProcessing: false });
    }
  },

  processPayment: async (orderId: string, offerId: string, card: CardDetails): Promise<PaymentResult> => {
    // legacy support or manual override
    if (!orderId) return { success: false, error: 'No order ID' };

    set({ isProcessing: true, paymentError: null });
    try {
      const result = await paymentsApi.process({
        orderId: String(orderId),
        offerId,
        card,
      });

      set((state) => ({
        paidOfferIds: [...state.paidOfferIds, offerId],
        lastPaymentResult: result,
      }));

      return result;
    } catch (e: unknown) {
      const errorMessage = formatApiErrorMessage(e, 'Payment failed');
      set({ paymentError: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      set({ isProcessing: false });
    }
  },

  createPaymentIntent: async (orderId: string, offerId: string) => {
    if (!orderId || !offerId) return null;

    const inflightKey = `${orderId}:${offerId}`;
    const existing = paymentIntentInflight.get(inflightKey);
    if (existing) return existing;

    const request = (async () => {
      set({ isProcessing: true, paymentError: null });
      try {
        const result = await paymentsApi.createIntent({ orderId, offerId });
        return result.clientSecret;
      } catch (e: unknown) {
        const errorMessage = formatApiErrorMessage(e, 'Failed to initialize payment');
        set({ paymentError: errorMessage });
        return null;
      } finally {
        set({ isProcessing: false });
        paymentIntentInflight.delete(inflightKey);
      }
    })();

    paymentIntentInflight.set(inflightKey, request);
    return request;
  },

  clearPaymentError: () => set({ paymentError: null }),

  setIsOnline: (online) => set({ isOnline: online }),

  resetPaymentState: () => set({ 
    paymentError: null, 
    clientSecret: null,
    isProcessing: false 
  }),

  fetchPaymentStatus: async (offerId: string) => {
    try {
      return await paymentsApi.getStatus(offerId);
    } catch (e) {
      console.error('Failed to fetch payment status:', e);
      return null;
    }
  },

  syncPaidOffersForOrder: async (offerIds: string[]) => {
    if (!offerIds.length) return [];

    const results = await Promise.allSettled(
      offerIds.map((id) => paymentsApi.getStatus(String(id))),
    );

    const confirmedPaid: string[] = [];
    results.forEach((result, index) => {
      if (
        result.status === 'fulfilled' &&
        String(result.value?.status || '').toUpperCase() === 'SUCCESS'
      ) {
        confirmedPaid.push(String(offerIds[index]));
      }
    });

    if (confirmedPaid.length > 0) {
      set((state) => ({
        paidOfferIds: [
          ...new Set([
            ...state.paidOfferIds.map(String),
            ...confirmedPaid,
          ]),
        ],
      }));
    }

    return confirmedPaid;
  },

  submitPayment: async () => {
    set({ isProcessing: true });
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        set({ isProcessing: false });
        resolve();
      }, 3000);
    });
  },

  clearCheckoutForOrder: (orderId) => {
    clearCheckoutSession(orderId);
  },

  reset: () => set({
    orderId: null,
    step: 1,
    address: emptyAddress(),
    isProcessing: false,
    selectedOffer: null,
    openDrawerForPartId: null,
    termsAccepted: false,
    returnPolicyAccepted: false,
    isEditingShipping: false,
    partAddresses: {},
    paidOfferIds: [],
    paymentError: null,
    lastPaymentResult: null,
    clientSecret: null,
    isOnline: navigator.onLine,
  }),
}));

/** Auto-save checkout progress while the customer is on the checkout flow. */
if (typeof window !== 'undefined') {
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  useCheckoutStore.subscribe((state) => {
    if (!state.orderId) return;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      saveCheckoutSession(state.orderId!, snapshotForPersist(state));
    }, 400);
  });
}