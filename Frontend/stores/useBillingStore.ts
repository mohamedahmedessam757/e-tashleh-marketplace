import { create } from 'zustand';
import { Order } from '../types';

interface Invoice extends Order {
    invoice_number: string;
    shipping_bill_number: string;
}

export interface SavedCard {
    id: string;
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
    cardHolderName?: string;
}

interface BillingState {
    invoices: Invoice[];
    cards: SavedCard[];
    pendingPayments: Order[];
    walletBalance: number;
    loading: boolean;
    cardsLoading: boolean;
    error: string | null;
    invoicesFetched: boolean;
    pendingPaymentsFetched: boolean;

    fetchInvoices: () => Promise<void>;
    fetchPendingPayments: () => Promise<void>;
    fetchWallet: () => Promise<void>;
    fetchCards: () => Promise<void>;
    addCard: (card: Omit<SavedCard, 'id' | 'isDefault'>) => Promise<void>;
    deleteCard: (id: string) => Promise<void>;
    setDefaultCard: (id: string) => Promise<void>;
}

const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';
const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const useBillingStore = create<BillingState>((set, get) => ({
    invoices: [],
    cards: [],
    pendingPayments: [],
    walletBalance: 0,
    loading: false,
    cardsLoading: false,
    error: null,
    invoicesFetched: false,
    pendingPaymentsFetched: false,

    fetchInvoices: async () => {
        const isInitial = !get().invoicesFetched;
        if (isInitial) set({ loading: true });
        set({ error: null });
        try {
            const token = localStorage.getItem('access_token');
            const userJson = localStorage.getItem('user');
            if (!token || !userJson) {
                set({ invoices: [], loading: false });
                return;
            }

            const user = JSON.parse(userJson);
            const isMerchant = user.role === 'VENDOR';

            const endpoint = isMerchant ? 'invoices/merchant' : 'invoices';
            const response = await fetch(`${getApiUrl()}/${endpoint}`, {
                headers: getHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch invoices');
            const data = await response.json();

            // Preserve all invoice + order + relational data for the InvoiceModal
            const mappedInvoices = data.map((inv: any) => ({
                ...inv.order,
                // Invoice-level financial data
                invoiceId: inv.id,
                invoice_number: inv.invoiceNumber ?? inv.invoice_number,
                invoiceTotal: Number(inv.total || 0),
                invoiceSubtotal: Number(inv.subtotal || 0),
                invoiceCommission: Number(inv.commission || 0),
                invoiceCurrency: inv.currency || 'AED',
                invoiceStatus: inv.status || 'PAID',
                invoiceIssuedAt: inv.issuedAt ?? inv.issued_at,
                shipping_bill_number: `SHP-${inv.order?.orderNumber || ''}`,
                // Order-level relational data
                customer: inv.order?.customer || null,
                offers: inv.order?.offers || [],
                store: inv.order?.store || undefined,
                parts: inv.order?.parts || [],
                shippingAddresses: inv.order?.shippingAddresses || [],
                status: inv.status
            }));

            set({ invoices: mappedInvoices, invoicesFetched: true });
        } catch (err: any) {
            console.error('Error fetching invoices:', err);
            set({ error: err.message });
        } finally {
            set({ loading: false });
        }
    },

    fetchPendingPayments: async () => {
        const isInitial = !get().pendingPaymentsFetched;
        if (isInitial) set({ loading: true });
        set({ error: null });
        try {
            const token = localStorage.getItem('access_token');
            const userJson = localStorage.getItem('user');
            if (!token || !userJson) return;

            const user = JSON.parse(userJson);
            const isMerchant = user.role === 'VENDOR';

            const endpoint = isMerchant ? 'payments/merchant/pending' : 'payments/pending';
            const response = await fetch(`${getApiUrl()}/${endpoint}`, {
                headers: getHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch pending payments');
            const data = await response.json();

            set({ pendingPayments: data, pendingPaymentsFetched: true });
        } catch (err: any) {
            console.error('Error fetching pending payments:', err);
            set({ error: err.message });
        } finally {
            set({ loading: false });
        }
    },

    fetchWallet: async () => {
        // Future: Fetch wallet balance from transactions table
        set({ walletBalance: 0 });
    },

    fetchCards: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        set({ cardsLoading: true, error: null });
        try {
            const response = await fetch(`${getApiUrl()}/cards`, {
                headers: getHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch cards');
            const data = await response.json();

            // Map snake_case from DB to camelCase for frontend
            const mappedCards: SavedCard[] = data.map((c: any) => ({
                id: c.id,
                last4: c.last4,
                brand: c.brand,
                expiryMonth: c.expiryMonth ?? c.expiry_month,
                expiryYear: c.expiryYear ?? c.expiry_year,
                isDefault: c.isDefault ?? c.is_default ?? false,
                cardHolderName: c.cardHolderName ?? c.card_holder_name ?? '',
            }));

            set({ cards: mappedCards });
        } catch (err: any) {
            console.error('Error fetching cards:', err);
        } finally {
            set({ cardsLoading: false });
        }
    },

    addCard: async (cardData) => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        set({ cardsLoading: true, error: null });
        try {
            const response = await fetch(`${getApiUrl()}/cards`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(cardData)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to add card');
            }

            // Re-fetch to guarantee correct `isDefault` sorting & data shape
            await get().fetchCards();
        } catch (err: any) {
            set({ error: err.message, cardsLoading: false });
            throw err;
        }
    },

    deleteCard: async (id) => {
        set({ error: null });
        try {
            const response = await fetch(`${getApiUrl()}/cards/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (!response.ok) throw new Error('Failed to delete card');

            set((state) => ({
                cards: state.cards.filter(c => c.id !== id)
            }));

            // Re-fetch to guarantee correct `isDefault` flag if default was deleted
            await get().fetchCards();
        } catch (err: any) {
            set({ error: err.message });
        }
    },

    setDefaultCard: async (id) => {
        set({ error: null });
        try {
            // Optimistic update
            set((state) => ({
                cards: state.cards.map(c => ({
                    ...c,
                    isDefault: c.id === id
                }))
            }));

            const response = await fetch(`${getApiUrl()}/cards/${id}/default`, {
                method: 'PATCH',
                headers: getHeaders()
            });

            if (!response.ok) {
                // Revert on fail
                await get().fetchCards();
                throw new Error('Failed to set default card');
            }
        } catch (err: any) {
            set({ error: err.message });
        }
    }
}));
