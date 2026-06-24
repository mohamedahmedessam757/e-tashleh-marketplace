import { create } from 'zustand';

export interface Device {
  id: string;
  name: string;
  type: string;
  lastActive: string;
  ip: string;
}

export interface SecurityLog {
  id: string;
  action: string;
  createdAt: string;
  ipAddress: string;
  details: any;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  joinedAt?: string; // Kept for legacy if needed
  createdAt: string;
  avatar?: string;
  balance?: number; // Legacy, kept for compatibility
  ltv?: number;
  successRate?: number;
  ordersCount?: number;
  adminNotes?: string;
  Session?: any[];
  securityLogs?: SecurityLog[];
  orders?: any[];
  disputes?: any[];
  payments?: any[]; // Enriched with order/offer in Phase 3.1
  invoices?: any[]; // New field from Phase 3.1
  withdrawalRequests?: any[];
  returns?: any[];
  lastLoginIp?: string;

  // 2026 Enhanced Fields
  customerBalance?: number;
  totalSpent?: number;
  loyaltyTier?: 'BASIC' | 'SILVER' | 'GOLD' | 'VIP' | 'ELITE';
  loyaltyPoints?: number;
  referralCode?: string;
  referralCount?: number;
  violationScore?: number;
  country?: string;
  countryCode?: string;
  emailVerifiedAt?: string;
  suspendedUntil?: string;
  suspendReason?: string;
  _count?: {
    violations: number;
    disputes: number;
    orders: number;
    referredUsers: number;
  };

  // Advanced Restrictions (2026)
  withdrawalsFrozen?: boolean;
  withdrawalFreezeNote?: string;
  withdrawalFreezeSignature?: string;
  orderLimit?: number;
  dailyOrderCount?: number;
  restrictionAlertMessage?: string;
}

interface CustomerState {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<void>;
  fetchCustomerById: (id: string) => Promise<Customer | null>;
  toggleStatus: (id: string, reason?: string, currentStatus?: Customer['status']) => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  updateCustomerRestrictions: (id: string, data: any) => Promise<void>;
  clearCustomerRestrictions: (id: string, signatureData?: any) => Promise<void>;
  subscribeToCustomerChanges: (id: string, onUpdate: () => void) => { unsubscribe: () => void };
}

import { supabase } from '../services/supabase';

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  isLoading: false,
  error: null,

  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('access_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/users/admin/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.ok ? await response.json() : [];
      set({ customers: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchCustomerById: async (id: string) => {
    const token = localStorage.getItem('access_token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${API_URL}/users/admin/customers/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return null;
    return response.json();
  },

  toggleStatus: async (id: string, reason?: string, currentStatus?: Customer['status']) => {
    let status = currentStatus ?? get().customers.find(c => c.id === id)?.status;

    if (!status) {
      const fetched = await get().fetchCustomerById(id);
      if (!fetched) throw new Error('Customer not found');
      status = fetched.status;
    }

    const newStatus: Customer['status'] = status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const previousCustomers = get().customers;

    if (previousCustomers.some(c => c.id === id)) {
      set((state) => ({
        customers: state.customers.map(c =>
          c.id === id ? { ...c, status: newStatus, suspendReason: newStatus === 'SUSPENDED' ? reason : undefined } : c
        )
      }));
    }

    try {
      const token = localStorage.getItem('access_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/users/admin/customers/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, reason })
      });
      if (!response.ok) throw new Error('Failed to toggle status');
    } catch (err) {
      console.error(err);
      if (previousCustomers.some(c => c.id === id)) {
        set({ customers: previousCustomers });
      }
      throw err;
    }
  },

  updateCustomer: async (id, data) => {
    const previousCustomers = get().customers;
    
    // Optimistic Update
    set((state) => ({
      customers: state.customers.map(c => String(c.id) === String(id) ? { ...c, ...data } : c)
    }));

    try {
      const token = localStorage.getItem('access_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/users/admin/customers/${id}/update`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update customer');
    } catch (err) {
      console.error(err);
      // Revert on failure
      set({ customers: previousCustomers });
    }
  },

  updateNotes: async (id: string, notes: string) => {
    const previousCustomers = get().customers;

    // Optimistic Update
    set((state) => ({
      customers: state.customers.map(c => String(c.id) === String(id) ? { ...c, adminNotes: notes } : c)
    }));

    try {
      const token = localStorage.getItem('access_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/users/admin/customers/${id}/notes`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      });
      if (!response.ok) throw new Error('Failed to update notes');
    } catch (err) {
      console.error(err);
      // Revert on failure
      set({ customers: previousCustomers });
    }
  },

  updateCustomerRestrictions: async (id, data) => {
    try {
      const token = localStorage.getItem('access_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/users/admin/customers/${id}/restrictions`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update restrictions');
      
      // Update local state
      set((state) => ({
        customers: state.customers.map(c => c.id === id ? { ...c, ...data } : c)
      }));
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  clearCustomerRestrictions: async (id, signatureData) => {
    try {
      const token = localStorage.getItem('access_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/users/admin/customers/${id}/clear-restrictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signatureData || {})
      });
      if (!response.ok) throw new Error('Failed to clear restrictions');
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  subscribeToCustomerChanges: (id: string, onUpdate: () => void) => {
    // Phase 5: Luxury Real-time Sync (2026 Standard)
    // Subscribe to all relevant financial tables for this specific customer
    const channel = supabase
      .channel(`customer-finance-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_transactions', filter: `customer_id=eq.${id}` }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${id}` }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests', filter: `user_id=eq.${id}` }, onUpdate)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${id}` }, onUpdate)
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      }
    };
  }
}));

// Helper for fetch PATCH
async function Patch(url: string, token: string | null) {
  return fetch(url, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
