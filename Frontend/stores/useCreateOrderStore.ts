import { create } from 'zustand';
import { isDuplicatePartNameAmong } from '../utils/normalizePartName';

export const CREATE_ORDER_PREFILL_KEY = 'create_order_prefill';
export const MAX_PARTS_PER_ORDER = 10;

export interface CreateOrderPrefillPart {
  name: string;
  description: string;
  notes?: string;
  images: string[];
  video?: string | null;
}

export interface CreateOrderPrefillPayload {
  make: string;
  model: string;
  year?: string;
  sourceOrderId?: string;
  sourcePartId?: string;
  sourcePartIds?: string[];
  parts?: CreateOrderPrefillPart[];
  conditionPref?: 'new' | 'used' | null;
  shippingType?: 'separate' | 'combined';
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
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

    let parts: CreateOrderPrefillPart[] | undefined;
    if (Array.isArray(parsed.parts)) {
      parts = parsed.parts
        .map((p) => {
          if (!p || typeof p !== 'object') return null;
          const row = p as Record<string, unknown>;
          if (typeof row.name !== 'string' || typeof row.description !== 'string') return null;
          const images = Array.isArray(row.images)
            ? row.images.filter(isHttpUrl).map((u) => u.trim())
            : [];
          return {
            name: row.name,
            description: row.description,
            notes: typeof row.notes === 'string' ? row.notes : undefined,
            images,
            video: isHttpUrl(row.video) ? String(row.video).trim() : null,
          } satisfies CreateOrderPrefillPart;
        })
        .filter((p): p is CreateOrderPrefillPart => !!p);
      if (!parts.length) parts = undefined;
    }

    const sourcePartIds = Array.isArray(parsed.sourcePartIds)
      ? parsed.sourcePartIds.filter((id): id is string => typeof id === 'string' && !!id.trim())
      : undefined;

    const conditionPref =
      parsed.conditionPref === 'new' || parsed.conditionPref === 'used'
        ? parsed.conditionPref
        : parsed.conditionPref === null
          ? null
          : undefined;

    const shippingType =
      parsed.shippingType === 'separate' || parsed.shippingType === 'combined'
        ? parsed.shippingType
        : undefined;

    return {
      make: parsed.make,
      model: parsed.model,
      year: typeof parsed.year === 'string' ? parsed.year : undefined,
      sourceOrderId: typeof parsed.sourceOrderId === 'string' ? parsed.sourceOrderId : undefined,
      sourcePartId: typeof parsed.sourcePartId === 'string' ? parsed.sourcePartId : undefined,
      sourcePartIds,
      parts,
      conditionPref,
      shippingType,
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
  /** Parallel to File images, or URL-only list when images=[] (reorder prefill) */
  uploadedImageUrls?: string[];
  uploadedVideoUrl?: string | null;
}

export function partHasMedia(part: PartItem): boolean {
  return part.images.length > 0 || (part.uploadedImageUrls || []).some(Boolean);
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
  vinImageUploadedUrl: string | null;

  // Phase 2: Parts
  requestType: 'single' | 'multiple';
  shippingType: 'separate' | 'combined';
  parts: PartItem[];

  // Phase 3 & 4
  preferences: {
    condition: 'new' | 'used' | null;
  };

  /** Set when wizard opened from multi-order part reorder */
  reorderFromOrderId: string | null;
  reorderPartIds: string[] | null;
  isReorderPrefill: boolean;

  isSubmitting: boolean;
  isUploadingParts: boolean;
  showErrors: boolean; // Controls visual validation display
  /** Full create-rule violation message shown in red glow banner */
  ruleAlertMessage: string | null;

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
  removeUploadedImageUrl: (id: string, urlIndex: number) => void;
  uploadPartImageNow: (partId: string, imageIndex: number) => Promise<void>;
  uploadPartVideoNow: (partId: string) => Promise<void>;

  updatePreferences: (field: string, value: any) => void;
  reset: () => void;
  prefillVehicle: (data: { make: string; model: string; year?: string }) => void;
  applyReorderPrefill: (payload: CreateOrderPrefillPayload) => void;
  ensurePartsUploaded: () => Promise<void>;
  submitOrder: () => Promise<string>;
  setShowErrors: (show: boolean) => void;
  setRuleAlertMessage: (message: string | null) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const getInitialPart = (): PartItem => ({
  id: generateId(),
  name: '',
  description: '',
  images: [],
  video: null,
  videoPreview: null,
  notes: '',
  uploadedImageUrls: [],
  uploadedVideoUrl: null,
});

/** Module-level: one in-flight submit + stable idempotency key across retries */
let submitInflight: Promise<string> | null = null;
let pendingClientRequestId: string | null = null;
let uploadInflight: Promise<void> | null = null;
/** Coalesce concurrent uploads for the same part image/video slot */
const slotUploadInflight = new Map<string, Promise<string>>();

const newClientRequestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const useCreateOrderStore = create<OrderState>((set, get) => ({
  step: 1,

  vehicle: {
    make: '',
    model: '',
    year: '',
    vin: '',
    vinImage: null
  },
  vinImageUploadedUrl: null,

  requestType: 'single',
  shippingType: 'separate',
  parts: [getInitialPart()],

  preferences: {
    condition: null
  },

  reorderFromOrderId: null,
  reorderPartIds: null,
  isReorderPrefill: false,

  isSubmitting: false,
  isUploadingParts: false,
  showErrors: false,
  ruleAlertMessage: null,

  setStep: (step) => set({ step, showErrors: false }), // Reset errors on step change

  setRuleAlertMessage: (message) => set({ ruleAlertMessage: message }),

  updateVehicle: (updates) => {
    set((state) => {
      const next = { vehicle: { ...state.vehicle, ...updates } };
      if ('vinImage' in updates) {
        return { ...next, vinImageUploadedUrl: null };
      }
      return next;
    });
    const vin = get().vehicle.vinImage;
    if (vin instanceof File && !get().vinImageUploadedUrl) {
      void (async () => {
        try {
          const { storageService } = await import('../services/storage');
          const url = await storageService.uploadFile(vin, 'marketplace-uploads', 'orders/vin');
          if (get().vehicle.vinImage === vin) {
            set({ vinImageUploadedUrl: url });
          }
        } catch (err) {
          console.error('Immediate VIN upload failed', err);
        }
      })();
    }
  },

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
    if (state.parts.length >= MAX_PARTS_PER_ORDER) {
      return {
        ...state,
        ruleAlertMessage:
          `عذراً، لا يمكنك إضافة أكثر من ${MAX_PARTS_PER_ORDER} قطع في الطلب الواحد.\nSorry, you cannot add more than ${MAX_PARTS_PER_ORDER} parts per order.`,
      };
    }
    return {
      parts: [
        ...state.parts,
        getInitialPart()
      ],
      ruleAlertMessage: null,
    };
  }),

  removePart: (id) => set((state) => {
    if (state.parts.length <= 1) return state; // Min 1
    return { parts: state.parts.filter(p => p.id !== id) };
  }),

  updatePart: (id, field, value) => {
    if (field === 'name' && typeof value === 'string') {
      const state = get();
      const idx = state.parts.findIndex((p) => p.id === id);
      const otherNames = state.parts.map((p) => p.name);
      if (isDuplicatePartNameAmong(value, otherNames, idx >= 0 ? idx : undefined)) {
        set({
          ruleAlertMessage:
            'لا يمكنك إضافة القطعة نفسها أكثر من مرة داخل هذا الطلب.\nيرجى إضافة قطعة مختلفة.\n\nYou cannot add the same part more than once in this request.\nPlease add a different part.',
        });
        return;
      }
    }
    set((state) => ({
      parts: state.parts.map(p => {
        if (p.id !== id) return p;
        const next = { ...p, [field]: value };
        if (field === 'video') {
          next.uploadedVideoUrl = null;
        }
        return next;
      }),
      ...(field === 'name' ? { ruleAlertMessage: null } : {}),
    }));
    // Start video upload immediately when a file is attached
    if (field === 'video' && value instanceof File) {
      void get().uploadPartVideoNow(id);
    }
  },

  addPartImage: (id, file) => {
    let newIndex = -1;
    set((state) => ({
      parts: state.parts.map(p => {
        if (p.id !== id) return p;
        newIndex = p.images.length;
        return {
          ...p,
          images: [...p.images, file],
          uploadedImageUrls: [...(p.uploadedImageUrls || []), ''],
        };
      })
    }));
    if (newIndex >= 0) {
      void get().uploadPartImageNow(id, newIndex);
    }
  },

  removePartImage: (id, imageIndex) => set((state) => ({
    parts: state.parts.map(p => {
      if (p.id !== id) return p;
      const urls = [...(p.uploadedImageUrls || [])];
      urls.splice(imageIndex, 1);
      return {
        ...p,
        images: p.images.filter((_, i) => i !== imageIndex),
        uploadedImageUrls: urls,
      };
    })
  })),

  removeUploadedImageUrl: (id, urlIndex) => set((state) => ({
    parts: state.parts.map((p) => {
      if (p.id !== id) return p;
      // URL-only prefill: images=[] and uploadedImageUrls holds public URLs
      if (p.images.length === 0) {
        const urls = [...(p.uploadedImageUrls || [])];
        urls.splice(urlIndex, 1);
        return { ...p, uploadedImageUrls: urls };
      }
      return p;
    }),
  })),

  uploadPartImageNow: async (partId: string, imageIndex: number) => {
    const part = get().parts.find((p) => p.id === partId);
    const file = part?.images[imageIndex];
    if (!file) return;
    if (part?.uploadedImageUrls?.[imageIndex]) return;

    const slotKey = `img:${partId}:${imageIndex}:${file.name}:${file.size}:${file.lastModified}`;
    const existing = slotUploadInflight.get(slotKey);
    if (existing) {
      await existing;
      return;
    }

    const job = (async () => {
      const { storageService } = await import('../services/storage');
      return storageService.uploadFile(file, 'marketplace-uploads', `orders/parts/${partId}`);
    })();
    slotUploadInflight.set(slotKey, job);

    try {
      const url = await job;
      set((state) => ({
        parts: state.parts.map((p) => {
          if (p.id !== partId) return p;
          if (p.images[imageIndex] !== file) return p;
          const urls = [...(p.uploadedImageUrls || [])];
          while (urls.length < p.images.length) urls.push('');
          urls[imageIndex] = url;
          return { ...p, uploadedImageUrls: urls };
        }),
      }));
    } catch (err) {
      console.error('Immediate part image upload failed', err);
    } finally {
      slotUploadInflight.delete(slotKey);
    }
  },

  uploadPartVideoNow: async (partId: string) => {
    const part = get().parts.find((p) => p.id === partId);
    const file = part?.video;
    if (!file || part?.uploadedVideoUrl) return;

    const slotKey = `vid:${partId}:${file.name}:${file.size}:${file.lastModified}`;
    const existing = slotUploadInflight.get(slotKey);
    if (existing) {
      await existing;
      return;
    }

    const job = (async () => {
      const { storageService } = await import('../services/storage');
      return storageService.uploadFile(file, 'marketplace-uploads', `orders/parts/${partId}/video`);
    })();
    slotUploadInflight.set(slotKey, job);

    try {
      const url = await job;
      set((state) => ({
        parts: state.parts.map((p) => {
          if (p.id !== partId) return p;
          if (p.video !== file) return p;
          return { ...p, uploadedVideoUrl: url };
        }),
      }));
    } catch (err) {
      console.error('Immediate part video upload failed', err);
    } finally {
      slotUploadInflight.delete(slotKey);
    }
  },

  updatePreferences: (field, value) =>
    set((state) => ({ preferences: { ...state.preferences, [field]: value } })),

  reset: () => {
    pendingClientRequestId = null;
    submitInflight = null;
    uploadInflight = null;
    slotUploadInflight.clear();
    set({
      step: 1,
      vehicle: { make: '', model: '', year: '', vin: '', vinImage: null },
      vinImageUploadedUrl: null,
      requestType: 'single',
      shippingType: 'separate',
      parts: [getInitialPart()],
      preferences: { condition: null },
      reorderFromOrderId: null,
      reorderPartIds: null,
      isReorderPrefill: false,
      isSubmitting: false,
      isUploadingParts: false,
      showErrors: false,
      ruleAlertMessage: null,
    });
  },

  prefillVehicle: (data) => {
    pendingClientRequestId = null;
    submitInflight = null;
    uploadInflight = null;
    slotUploadInflight.clear();
    set({
      step: 1,
      vehicle: {
        make: data.make,
        model: data.model,
        year: data.year ?? '',
        vin: '',
        vinImage: null,
      },
      vinImageUploadedUrl: null,
      requestType: 'single',
      shippingType: 'separate',
      parts: [getInitialPart()],
      preferences: { condition: null },
      reorderFromOrderId: null,
      reorderPartIds: null,
      isReorderPrefill: false,
      isSubmitting: false,
      isUploadingParts: false,
      showErrors: false,
      ruleAlertMessage: null,
    });
  },

  applyReorderPrefill: (payload) => {
    pendingClientRequestId = null;
    submitInflight = null;
    uploadInflight = null;
    slotUploadInflight.clear();

    const prefillParts = payload.parts?.length
      ? payload.parts.slice(0, MAX_PARTS_PER_ORDER).map((p) => ({
          id: generateId(),
          name: p.name,
          description: p.description,
          notes: p.notes || '',
          images: [] as File[],
          video: null as File | null,
          videoPreview: null as string | null,
          uploadedImageUrls: (p.images || []).filter(isHttpUrl),
          uploadedVideoUrl: p.video && isHttpUrl(p.video) ? p.video : null,
        }))
      : [getInitialPart()];

    const requestType: 'single' | 'multiple' =
      prefillParts.length >= 2 ? 'multiple' : 'single';

    const sourcePartIds =
      payload.sourcePartIds?.length
        ? payload.sourcePartIds
        : payload.sourcePartId
          ? [payload.sourcePartId]
          : null;

    set({
      step: 1,
      vehicle: {
        make: payload.make,
        model: payload.model,
        year: payload.year ?? '',
        vin: '',
        vinImage: null,
      },
      vinImageUploadedUrl: null,
      requestType,
      shippingType:
        payload.shippingType ||
        (requestType === 'multiple' ? 'combined' : 'separate'),
      parts: prefillParts,
      preferences: {
        condition:
          payload.conditionPref === 'new' || payload.conditionPref === 'used'
            ? payload.conditionPref
            : null,
      },
      reorderFromOrderId: payload.sourceOrderId || null,
      reorderPartIds: sourcePartIds,
      isReorderPrefill: true,
      isSubmitting: false,
      isUploadingParts: false,
      showErrors: false,
      ruleAlertMessage: null,
    });
  },

  setShowErrors: (show) => set({ showErrors: show }),

  ensurePartsUploaded: async () => {
    if (uploadInflight) return uploadInflight;

    uploadInflight = (async () => {
      set({ isUploadingParts: true });
      const state = get();
      const nextParts = state.parts.map((part) => ({
        ...part,
        uploadedImageUrls: [...(part.uploadedImageUrls || [])],
      }));
      let vinImageUploadedUrl = state.vinImageUploadedUrl;

      try {
        const { storageService } = await import('../services/storage');
        const uploadPromises: Promise<void>[] = [];

        for (const part of nextParts) {
          while (part.uploadedImageUrls!.length < part.images.length) {
            part.uploadedImageUrls!.push('');
          }
          // Only trim URL slots to File length when Files exist; URL-only prefill keeps urls
          if (part.images.length > 0 && part.uploadedImageUrls!.length > part.images.length) {
            part.uploadedImageUrls = part.uploadedImageUrls!.slice(0, part.images.length);
          }
          part.images.forEach((file, index) => {
            if (part.uploadedImageUrls![index]) return;
            const slotKey = `img:${part.id}:${index}:${file.name}:${file.size}:${file.lastModified}`;
            const pending = slotUploadInflight.get(slotKey);
            if (pending) {
              uploadPromises.push(
                pending.then((url) => {
                  part.uploadedImageUrls![index] = url;
                })
              );
              return;
            }
            uploadPromises.push(
              storageService.uploadFile(file, 'marketplace-uploads', `orders/parts/${part.id}`).then((url) => {
                part.uploadedImageUrls![index] = url;
              })
            );
          });
          if (part.video && !part.uploadedVideoUrl) {
            const slotKey = `vid:${part.id}:${part.video.name}:${part.video.size}:${part.video.lastModified}`;
            const pending = slotUploadInflight.get(slotKey);
            if (pending) {
              uploadPromises.push(
                pending.then((url) => {
                  part.uploadedVideoUrl = url;
                })
              );
            } else {
              uploadPromises.push(
                storageService.uploadFile(part.video, 'marketplace-uploads', `orders/parts/${part.id}/video`).then((url) => {
                  part.uploadedVideoUrl = url;
                })
              );
            }
          }
          if (!part.video && !part.uploadedVideoUrl) {
            part.uploadedVideoUrl = null;
          }
        }

        if (state.vehicle.vinImage && !vinImageUploadedUrl) {
          uploadPromises.push(
            storageService.uploadFile(state.vehicle.vinImage, 'marketplace-uploads', 'orders/vin').then((url) => {
              vinImageUploadedUrl = url;
            })
          );
        }
        if (!state.vehicle.vinImage) {
          vinImageUploadedUrl = null;
        }

        await Promise.all(uploadPromises);
        set({ parts: nextParts, vinImageUploadedUrl, isUploadingParts: false });
      } catch (err) {
        // Persist any URLs that finished so a retry only uploads the rest
        set({ parts: nextParts, vinImageUploadedUrl, isUploadingParts: false });
        throw err;
      } finally {
        uploadInflight = null;
      }
    })();

    return uploadInflight;
  },

  submitOrder: async () => {
    // Hard lock: double-tap / concurrent calls share one promise (no second upload)
    if (submitInflight) return submitInflight;
    if (get().isSubmitting) {
      return Promise.reject(new Error('Order submission already in progress'));
    }

    set({ isSubmitting: true });
    if (!pendingClientRequestId) {
      pendingClientRequestId = newClientRequestId();
    }
    const clientRequestId = pendingClientRequestId;

    submitInflight = (async () => {
      try {
        // Ensure uploads finished (no-op if already done in step 2)
        await get().ensurePartsUploaded();

        const state = get();
        const processedParts = state.parts.map((part) => {
          const urls = (part.uploadedImageUrls || []).filter((u) => !!u && isHttpUrl(u));
          if (part.images.length > 0) {
            const paired = [...(part.uploadedImageUrls || [])];
            while (paired.length < part.images.length) paired.push('');
            if (paired.some((u) => !u) || (part.video && !part.uploadedVideoUrl)) {
              throw new Error('Part media upload incomplete');
            }
            return {
              name: part.name,
              description: part.description,
              notes: part.notes,
              images: paired.filter(Boolean),
              video: part.uploadedVideoUrl || undefined,
            };
          }
          if (!urls.length || (part.video && !part.uploadedVideoUrl)) {
            throw new Error('Part media upload incomplete');
          }
          return {
            name: part.name,
            description: part.description,
            notes: part.notes,
            images: urls,
            video: part.uploadedVideoUrl || undefined,
          };
        });

        if (state.vehicle.vinImage && !state.vinImageUploadedUrl) {
          throw new Error('VIN image upload incomplete');
        }

        const yearInt = parseInt(state.vehicle.year) || new Date().getFullYear();

        const payload: Record<string, unknown> = {
          vehicleMake: state.vehicle.make,
          vehicleModel: state.vehicle.model,
          vehicleYear: yearInt,
          vin: state.vehicle.vin,
          vinImage: state.vinImageUploadedUrl,

          requestType: state.requestType,
          shippingType: state.shippingType,
          parts: processedParts,

          // Legacy Support (First part details)
          partName: state.parts[0].name,
          partDescription: state.parts[0].description,
          partImages: processedParts[0].images,

          conditionPref: state.preferences.condition,
          clientRequestId,
        };

        if (
          state.reorderFromOrderId &&
          state.reorderPartIds?.length === processedParts.length
        ) {
          payload.reorderFromOrderId = state.reorderFromOrderId;
          payload.reorderPartIds = state.reorderPartIds;
        }

        const { ordersApi } = await import('../services/api/orders');
        const newOrder = await ordersApi.create(payload);

        pendingClientRequestId = null;
        return newOrder.id as string;

      } catch (err) {
        console.error('Submission failed', err);
        throw err;
      } finally {
        set({ isSubmitting: false });
        submitInflight = null;
      }
    })();

    return submitInflight;
  }
}));
