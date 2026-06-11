import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface VehicleModel {
  id: string;
  name: string;
  nameAr: string;
  isActive: boolean;
}

export interface VehicleMake {
  id: string;
  name: string;
  nameAr: string;
  isActive: boolean;
  models: VehicleModel[];
}

interface CatalogState {
  makes: VehicleMake[];
  isLoading: boolean;
  error: string | null;
  fetchCatalog: () => Promise<void>;
  subscribeToCatalog: () => void;
  unsubscribeFromCatalog: () => void;
  getModelsByMake: (makeName: string) => VehicleModel[];
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useCatalogStore = create<CatalogState>((set, get) => ({
  makes: [],
  isLoading: false,
  error: null,

  fetchCatalog: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/vehicle-catalog/active`);
      if (!response.ok) throw new Error('Failed to fetch catalog');
      const data = await response.json();
      set({ makes: data, isLoading: false });
    } catch (err: any) {
      console.error('Catalog Fetch Error:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  subscribeToCatalog: () => {
    const channel = supabase
      .channel('public:vehicle_catalog')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_makes' }, () => get().fetchCatalog())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_models' }, () => get().fetchCatalog())
      .subscribe();
    
    (window as any).catalogChannel = channel;
  },

  unsubscribeFromCatalog: () => {
    if ((window as any).catalogChannel) {
      supabase.removeChannel((window as any).catalogChannel);
      (window as any).catalogChannel = null;
    }
  },

  getModelsByMake: (makeName: string) => {
    const { makes } = get();
    const make = makes.find(m => m.name === makeName || m.nameAr === makeName);
    return make ? make.models : [];
  }
}));
