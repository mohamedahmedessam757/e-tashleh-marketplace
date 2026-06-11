import { create } from 'zustand';

export const CREATE_ORDER_PREFILL_KEY = 'create_order_prefill';

export interface CreateOrderPrefillPayload {
  make: string;
  model: string;
  year?: string;
  sourceOrderId?: string;
  sourcePartId?: string;
}

export function writeCreateOrderPrefill(payload: CreateOrderPrefillPayload): void {
  sessionStorage.setItem(CREATE_ORDER_PREFILL_KEY, JSON.stringify(payload));
}

export function consumeCreateOrderPrefill(): CreateOrderPrefillPayload | null {
  try {
    const raw = sessionStorage.getItem(CREATE_ORDER_PREFILL_KEY);
    sessionStorage.removeItem(CREATE_ORDER_PREFILL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.make !== 'string' || typeof parsed.model !== 'string') return null;
    return {
      make: parsed.make,
      model: parsed.model,
      year: typeof parsed.year === 'string' ? parsed.year : undefined,
      sourceOrderId: typeof parsed.sourceOrderId === 'string' ? parsed.sourceOrderId : undefined,
      sourcePartId: typeof parsed.sourcePartId === 'string' ? parsed.sourcePartId : undefined,
    };
  } catch {
    return null;
  }
}

export interface PartItem {
  id: string;
  name: string;
  description: string;
  images: File[];
  video: File | null;
  videoPreview: string | null;
  notes?: string;
}

export interface OrderState {
  step: number;

  // Phase 1: Vehicle
  vehicle: {
    make: string;
    model: string;
    year: string;
    vin: string;
    vinImage?: File | null;
  };

  // Phase 2: Parts
  requestType: 'single' | 'multiple';
  shippingType: 'separate' | 'combined';
  parts: PartItem[];

  // Phase 3 & 4
  preferences: {
    condition: 'new' | 'used' | null;
  };

  isSubmitting: boolean;
  showErrors: boolean; // Controls visual validation display

  // Actions
  setStep: (step: number) => void;
  updateVehicle: (updates: Partial<OrderState['vehicle']>) => void;

  // Part Actions
  setRequestType: (type: 'single' | 'multiple') => void;
  setShippingType: (type: 'separate' | 'combined') => void;
  addPart: () => void;
  removePart: (id: string) => void;
  updatePart: (id: string, field: keyof PartItem, value: any) => void;
  addPartImage: (id: string, file: File) => void;
  removePartImage: (id: string, imageIndex: number) => void;

  updatePreferences: (field: string, value: any) => void;
  reset: () => void;
  prefillVehicle: (data: { make: string; model: string; year?: string }) => void;
  submitOrder: () => Promise<string>;
  setShowErrors: (show: boolean) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const getInitialPart = (): PartItem => ({
  id: generateId(),
  name: '',
  description: '',
  images: [],
  video: null,
  videoPreview: null,
  notes: ''
});

export const useCreateOrderStore = create<OrderState>((set, get) => ({
  step: 1,

  vehicle: {
    make: '',
    model: '',
    year: '',
    vin: '',
    vinImage: null
  },

  requestType: 'single',
  shippingType: 'separate',
  parts: [getInitialPart()],

  preferences: {
    condition: null
  },

  isSubmitting: false,
  showErrors: false,

  setStep: (step) => set({ step, showErrors: false }), // Reset errors on step change

  updateVehicle: (updates) =>
    set((state) => ({ vehicle: { ...state.vehicle, ...updates } })),

  setRequestType: (type) => set((state) => {
    // Logic: If switching to single, keep only first part. If multiple, ensure at least one.
    let newParts = state.parts;
    if (type === 'single' && state.parts.length > 1) {
      newParts = [state.parts[0]];
    }
    return {
      requestType: type,
      parts: newParts,
      shippingType: type === 'single' ? 'separate' : 'combined'
    };
  }),

  setShippingType: (type) => set({ shippingType: type }),

  addPart: () => set((state) => {
    if (state.parts.length >= 12) {
      alert("عذراً، لا يمكنك إضافة أكثر من 12 قطعة في الطلب الواحد.\nSorry, you cannot add more than 12 parts per order.");
      return state; // Max 12
    }
    return {
      parts: [
        ...state.parts,
        getInitialPart()
      ]
    };
  }),

  removePart: (id) => set((state) => {
    if (state.parts.length <= 1) return state; // Min 1
    return { parts: state.parts.filter(p => p.id !== id) };
  }),

  updatePart: (id, field, value) => set((state) => ({
    parts: state.parts.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    )
  })),

  addPartImage: (id, file) => set((state) => ({
    parts: state.parts.map(p =>
      p.id === id ? { ...p, images: [...p.images, file] } : p
    )
  })),

  removePartImage: (id, imageIndex) => set((state) => ({
    parts: state.parts.map(p =>
      p.id === id ? { ...p, images: p.images.filter((_, i) => i !== imageIndex) } : p
    )
  })),

  updatePreferences: (field, value) =>
    set((state) => ({ preferences: { ...state.preferences, [field]: value } })),

  reset: () => set({
    step: 1,
    vehicle: { make: '', model: '', year: '', vin: '', vinImage: null },
    requestType: 'single',
    shippingType: 'separate',
    parts: [getInitialPart()],
    preferences: { condition: null },
    isSubmitting: false,
    showErrors: false
  }),

  prefillVehicle: (data) =>
    set({
      step: 1,
      vehicle: {
        make: data.make,
        model: data.model,
        year: data.year ?? '',
        vin: '',
        vinImage: null,
      },
      requestType: 'single',
      shippingType: 'separate',
      parts: [getInitialPart()],
      preferences: { condition: null },
      isSubmitting: false,
      showErrors: false,
    }),

  setShowErrors: (show) => set({ showErrors: show }),

  submitOrder: async () => {
    set({ isSubmitting: true });
    try {
      const state = get();

      // 1. Upload All Files Concurrently
      const { storageService } = await import('../services/storage');

      // Prepare an array of upload promises
      const uploadPromises: Promise<void>[] = [];
      const processedParts: any[] = [];

      for (const part of state.parts) {
        const partData: any = { ...part, images: [], video: null };
        processedParts.push(partData);

        // Upload images
        part.images.forEach((file, index) => {
          uploadPromises.push(
            storageService.uploadFile(file, 'marketplace-uploads', `orders/parts/${part.id}`).then(url => {
              partData.images[index] = url; // Maintain order
            })
          );
        });

        // Upload video
        if (part.video) {
          uploadPromises.push(
            storageService.uploadFile(part.video, 'marketplace-uploads', `orders/parts/${part.id}/video`).then(url => {
              partData.video = url;
            })
          );
        }
      }

      // Upload VIN Image
      let vinImageUrl = null;
      if (state.vehicle.vinImage) {
        uploadPromises.push(
          storageService.uploadFile(state.vehicle.vinImage, 'marketplace-uploads', 'orders/vin').then(url => {
            vinImageUrl = url;
          })
        );
      }

      // Wait for all uploads to complete simultaneously
      await Promise.all(uploadPromises);

      // 3. Prepare Payload
      const yearInt = parseInt(state.vehicle.year) || new Date().getFullYear();

      const payload = {
        vehicleMake: state.vehicle.make,
        vehicleModel: state.vehicle.model,
        vehicleYear: yearInt,
        vin: state.vehicle.vin,
        vinImage: vinImageUrl,

        requestType: state.requestType,
        shippingType: state.shippingType,
        parts: processedParts.map(p => ({
          name: p.name,
          description: p.description,
          notes: p.notes,
          images: p.images,
          video: p.video || undefined
        })),

        // Legacy Support (First part details)
        partName: state.parts[0].name,
        partDescription: state.parts[0].description,
        partImages: processedParts[0].images,

        conditionPref: state.preferences.condition
      };

      // 4. Call Backend API
      const { ordersApi } = await import('../services/api/orders');
      const newOrder = await ordersApi.create(payload);

      // Return the ID for the success modal
      return newOrder.id;

    } catch (err) {
      console.error('Submission failed', err);
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  }
}));