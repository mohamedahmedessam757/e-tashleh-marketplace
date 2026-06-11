
import React, { useState, useEffect, useCallback, useMemo, useDeferredValue, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, UploadCloud, Car, Loader2, Calculator, ShieldCheck, PlayCircle, AlertCircle, Check, Package, CheckCircle2, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useOrderStore } from '../../../stores/useOrderStore';
import { useVendorStore } from '../../../stores/useVendorStore';
import { offersApi } from '../../../services/api/offers';
import { supabase } from '../../../services/supabase';

interface SubmitOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    requestDetails: {
        id: string | number;
        car: string;
        part: string;
        parts?: any[];
        vehicle?: any;
        vin?: string;
        date: string;
        createdAt?: string;
        offers?: any[];
    } | null;
    existingOffers?: any[];  // Merchant's existing offers for this order (from API)
    onSubmit: (offerData: any) => void;
}

// Logic Types
type PartType = string; // Dynamic from systemConfig.logistics.shipmentTypes

interface PartFormData {
    basePrice: string;
    weight: string;
    partType: PartType;
    hasWarranty: boolean;
    warrantyDuration: string;
    deliveryTime: string;
    condition: string;
    notes: string;
    imageUrl: string | null;
    cylinders?: number;
}

const DEFAULT_FORM: PartFormData = {
    basePrice: '',
    weight: '',
    partType: 'standard',
    hasWarranty: false,
    warrantyDuration: '15days',
    deliveryTime: 'd1_3',
    condition: 'used_clean',
    notes: '',
    imageUrl: null,
    cylinders: undefined,
};

const EMPTY_PARTS: any[] = [];
const EMPTY_OFFERS: any[] = [];

/** Stable thumbnail — avoids createObjectURL on every parent render. */
const PartThumb = memo(function PartThumb({
    src,
    className,
}: {
    src: string | File;
    className?: string;
}) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (typeof src === 'string') {
            setUrl(src);
            return;
        }
        const objectUrl = URL.createObjectURL(src);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [src]);
    if (!url) return null;
    return <img src={url} className={className} alt="" loading="lazy" decoding="async" />;
});

type QuoteCalcResult = {
    shipping: number;
    subtotal: number;
    commission: number;
    finalPrice: number;
    merchantEarnings: number;
};

const LivePriceCalculator = memo(function LivePriceCalculator({
    calculations,
    basePriceDisplay,
    isPriceSyncing,
    isAr,
    calcTitle,
    merchantNetLabel,
    finalPriceLabel,
}: {
    calculations: QuoteCalcResult;
    basePriceDisplay: string;
    isPriceSyncing: boolean;
    isAr: boolean;
    calcTitle: string;
    merchantNetLabel: string;
    finalPriceLabel: string;
}) {
    return (
        <div className="bg-[#12110F] rounded-3xl border border-gold-500/20 p-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-50" />
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-500 shadow-lg shadow-gold-500/5">
                    <Calculator size={20} />
                </div>
                <div>
                    <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">{calcTitle}</h3>
                    <p className="text-[10px] text-gold-500/60 font-black uppercase tracking-tighter">
                        {isAr ? 'تحديث حي' : 'Live Analytics'}
                    </p>
                </div>
            </div>
            <div className="space-y-6">
                <div className="flex justify-between items-center group">
                    <span className="text-xs font-bold text-white/30 uppercase tracking-wider group-hover:text-white/60 transition-colors">
                        {merchantNetLabel}
                    </span>
                    <span
                        className={`font-mono text-xl text-white font-black transition-opacity ${isPriceSyncing ? 'opacity-60' : 'opacity-100'}`}
                    >
                        {(parseFloat(basePriceDisplay || '0')).toLocaleString()}{' '}
                        <span className="text-[10px] text-white/20 ml-1">AED</span>
                    </span>
                </div>
                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-gold-500/10 via-gold-500/[0.02] to-transparent border border-gold-500/20 shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-gold-500 uppercase tracking-widest">{finalPriceLabel}</span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[7px] text-green-500 font-black uppercase tracking-tighter">Live Price</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span
                            className={`text-4xl font-black text-white font-mono tracking-tighter transition-opacity ${isPriceSyncing ? 'opacity-70' : 'opacity-100'}`}
                        >
                            {calculations.finalPrice.toLocaleString()}
                        </span>
                        <span className="text-sm font-black text-gold-500/40 font-mono">AED</span>
                    </div>
                </div>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">
                    <ShieldCheck size={12} className="text-gold-500/30" />
                    {isAr ? 'نظام تسعير ذكي معتمد' : 'Smart Certified Engine'}
                </div>
            </div>
        </div>
    );
});

const SubmitOfferModalInner: React.FC<SubmitOfferModalProps> = ({ onClose, requestDetails, existingOffers, onSubmit }) => {
    const { t, language } = useLanguage();
    const shipmentTypes = useAdminStore((s) => s.systemConfig.logistics?.shipmentTypes) ?? [];
    const financialConfig = useAdminStore((s) => s.systemConfig.financial);
    const fetchPublicConfig = useAdminStore((s) => s.fetchPublicConfig);
    const addOfferToOrder = useOrderStore((s) => s.addOfferToOrder);
    const storeId = useVendorStore((s) => s.storeId);
    const offerLimit = useVendorStore((s) => s.offerLimit);
    const dailyOfferCount = useVendorStore((s) => s.dailyOfferCount);
    const fetchDashboardStats = useVendorStore((s) => s.fetchDashboardStats);

    const isAr = language === 'ar';
    const offersT = t.dashboard.merchant.offerModal;
    const parts = requestDetails?.parts ?? EMPTY_PARTS;
    const isMultiPart = parts.length > 1;
    const safeExistingOffers = existingOffers ?? EMPTY_OFFERS;

    // --- Per-Part State ---
    const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());
    const [activePartId, setActivePartId] = useState<string | null>(null);
    const [formDataMap, setFormDataMap] = useState<Record<string, PartFormData>>({});

    // UI State
    const [uploading, setUploading] = useState(false);
    const [activeMedia, setActiveMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shake, setShake] = useState(false);
    const [submitProgress, setSubmitProgress] = useState<{ current: number; total: number } | null>(null);
    const [customWarranties, setCustomWarranties] = useState<Record<string, string>>({}); // NEW for custom free text warranty

    // Build a map of existing offers by partId for quick lookup
    const existingOfferMap = useMemo(() => {
        const map = new Map<string, any>();
        safeExistingOffers.forEach((o: any) => {
            const partId = o.orderPartId || o.order_part_id;
            if (partId) map.set(partId, o);
        });
        return map;
    }, [safeExistingOffers]);

    // Map partId -> check if awarded to ANOTHER merchant
    const awardedToOthersMap = useMemo(() => {
        const map = new Map<string, boolean>();
        if (parts && requestDetails?.offers) {
            parts.forEach((p: any) => {
                const isAwardedToOther = requestDetails.offers!.some((of: any) => 
                    (of.orderPartId === p.id || of.order_part_id === p.id) && 
                    of.status === 'accepted' && 
                    String(of.storeId) !== String(storeId)
                );
                map.set(p.id, isAwardedToOther);
            });
        }
        return map;
    }, [parts, requestDetails?.offers, storeId]);

    const getShipmentTypeById = useCallback(
        (partType: string) =>
            shipmentTypes.find((type: any) => type.id === partType) ||
            shipmentTypes.find((type: any) => type.id === 'standard'),
        [shipmentTypes],
    );

    useEffect(() => {
        if (shipmentTypes.length > 0) return;
        fetchPublicConfig();
    }, [shipmentTypes.length, fetchPublicConfig]);

    // Initialize: auto-select single part or reset for multi-part
    // If existingOffers exist, pre-fill form data from them
    useEffect(() => {
        if (!requestDetails) return;

        const buildFormFromOffer = (offer: any): PartFormData => {
            return {
                basePrice: offer.unitPrice?.toString() || offer.unit_price?.toString() || '',
                weight: offer.weightKg?.toString() || offer.weight_kg?.toString() || '',
                partType: offer.partType || offer.part_type || 'standard',
                hasWarranty: offer.hasWarranty ?? offer.has_warranty ?? false,
                warrantyDuration: offer.warrantyDuration || offer.warranty_duration || '15days',
                deliveryTime: offer.deliveryDays || offer.delivery_days || 'd1_3',
                condition: offer.condition || 'used_clean',
                notes: offer.notes || '',
                imageUrl: offer.offerImage || offer.offer_image || null,
                cylinders: offer.cylinders ? Number(offer.cylinders) : undefined,
            };
        };

        if (parts.length === 1) {
            const partId = parts[0].id || 'single';
            const existingOffer = existingOfferMap.get(partId);
            setSelectedPartIds(new Set([partId]));
            setActivePartId(partId);
            setFormDataMap({ [partId]: existingOffer ? buildFormFromOffer(existingOffer) : { ...DEFAULT_FORM } });
        } else if (parts.length > 1) {
            const preSelectedIds = new Set<string>();
            const map: Record<string, PartFormData> = {};
            parts.forEach((p: any) => {
                const existingOffer = existingOfferMap.get(p.id);
                // We use existingOffer to know it's locked, but we don't prefill or select it 
                // because editing requires cancellation first in 2026 UX.
                map[p.id] = { ...DEFAULT_FORM };
            });
            // Auto-select first available part that:
            // 1. the merchant has NO existing offer on
            // 2. is not awarded to someone else
            const availableParts = parts.filter((p: any) => !existingOfferMap.has(p.id) && !awardedToOthersMap.get(p.id));
            if (availableParts.length > 0) {
                preSelectedIds.add(availableParts[0].id);
            }
            setSelectedPartIds(preSelectedIds);
            setActivePartId(preSelectedIds.size > 0 ? Array.from(preSelectedIds)[0] : null);
            setFormDataMap(map);
        } else {
            const partId = 'legacy';
            const existingOffer = safeExistingOffers.length > 0 ? safeExistingOffers[0] : null;
            setSelectedPartIds(new Set([partId]));
            setActivePartId(partId);
            setFormDataMap({ [partId]: existingOffer ? buildFormFromOffer(existingOffer) : { ...DEFAULT_FORM } });
        }
    }, [requestDetails?.id, existingOfferMap, parts, awardedToOthersMap, safeExistingOffers]);

    // Get active form data
    const activeForm = activePartId ? (formDataMap[activePartId] || DEFAULT_FORM) : DEFAULT_FORM;

    // --- Performance Optimization: Deferred Pricing ---
    const deferredBasePrice = useDeferredValue(activeForm.basePrice);
    const deferredWeight = useDeferredValue(activeForm.weight);
    const deferredCylinders = useDeferredValue(activeForm.cylinders);
    const deferredPartType = useDeferredValue(activeForm.partType);

    // Update a field in the active form
    const updateField = useCallback(<K extends keyof PartFormData>(field: K, value: PartFormData[K]) => {
        if (!activePartId) return;
        setFormDataMap(prev => {
            if (prev[activePartId]?.[field] === value) return prev;
            return {
                ...prev,
                [activePartId]: { ...prev[activePartId], [field]: value }
            };
        });
        if (error) setError(null);
    }, [activePartId, error]);

    const handlePartTypeChange = useCallback((nextPartType: string) => {
        if (!activePartId) return;

        const nextShipmentType = getShipmentTypeById(nextPartType);

        setFormDataMap(prev => {
            const currentForm = prev[activePartId] || DEFAULT_FORM;
            return {
                ...prev,
                [activePartId]: {
                    ...currentForm,
                    partType: nextPartType,
                    weight: nextShipmentType?.isWeightBound ? currentForm.weight : '',
                    cylinders: nextShipmentType?.hasCylinders ? currentForm.cylinders : undefined,
                }
            };
        });

        if (error) setError(null);
    }, [activePartId, error, getShipmentTypeById]);

    // Shared Calculation Logic for 2026 Resiliency
    const getQuoteCalculations = useCallback((basePriceStr: string, weightStr: string, partType: string, cylinders?: number) => {
        const price = parseFloat(basePriceStr) || 0;
        const w = parseFloat(weightStr) || 0;
        
        const shipmentType = getShipmentTypeById(partType);

        let shippingCost = 0;
        if (shipmentType) {
            if (shipmentType.hasCylinders) {
                const rate = (shipmentType.cylinderRates || []).find((r: any) => r.cylinders === cylinders);
                if (rate) shippingCost = rate.price;
            } else {
                shippingCost = shipmentType.basePrice || 0;
            }

            if (!shipmentType.hasCylinders && shipmentType.isWeightBound && w > 0) {
                const brackets = shipmentType.weightBrackets || [];
                const bracket = brackets.find((b: any) => w >= b.minWeight && w <= b.maxWeight);
                if (bracket) {
                    shippingCost += bracket.price || 0;
                } else if (brackets.length > 0) {
                    const sorted = [...brackets].sort((a, b) => b.maxWeight - a.maxWeight);
                    if (w > sorted[0].maxWeight) {
                        shippingCost += sorted[0].price || 0;
                    }
                }
            }
        }

        const subtotal = price + shippingCost;
        const rate = (financialConfig?.commissionRate || 25) / 100;
        const minComm = financialConfig?.minCommission || 100;
        const percentCommission = Math.round(price * rate);
        const commission = price > 0 ? Math.max(percentCommission, minComm) : 0;
        const finalPrice = subtotal + commission;

        return { 
            shipping: shippingCost, 
            subtotal, 
            commission, 
            finalPrice,
            merchantEarnings: price 
        };
    }, [getShipmentTypeById, financialConfig]);

    // --- Calculations for active part (Optimized with Deferred Values) ---
    const calculations = useMemo(() => {
        return getQuoteCalculations(deferredBasePrice, deferredWeight, deferredPartType, deferredCylinders);
    }, [deferredBasePrice, deferredWeight, deferredPartType, deferredCylinders, getQuoteCalculations]);

    const togglePart = useCallback(
        (partId: string) => {
            if (awardedToOthersMap.get(partId)) return;
            if (existingOfferMap.has(partId)) return;

            setSelectedPartIds((prev) => {
                const next = new Set(prev);
                if (next.has(partId)) {
                    next.delete(partId);
                    if (activePartId === partId) {
                        setActivePartId(next.size > 0 ? Array.from(next)[0] : null);
                    }
                } else {
                    next.add(partId);
                    if (!activePartId) setActivePartId(partId);
                }
                return next;
            });
        },
        [activePartId, awardedToOthersMap, existingOfferMap],
    );

    const isPriceSyncing =
        activeForm.basePrice !== deferredBasePrice ||
        activeForm.weight !== deferredWeight ||
        activeForm.partType !== deferredPartType ||
        activeForm.cylinders !== deferredCylinders;

    const activePartName = useMemo(() => {
        if (!activePartId) return '';
        if (activePartId === 'legacy' || activePartId === 'single') return requestDetails?.part || '';
        return parts.find((p: any) => p.id === activePartId)?.name || '';
    }, [activePartId, parts, requestDetails?.part]);

    const activePartPreview = useMemo(() => {
        if (!activePartId) return null;
        return parts.find((p: any) => p.id === activePartId) ?? null;
    }, [activePartId, parts]);

    const shipmentTypeOptions = useMemo(
        () => (shipmentTypes.length > 0 ? shipmentTypes : []),
        [shipmentTypes],
    );

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !activePartId) return;

        const file = e.target.files[0];
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const { data, error } = await supabase.storage
                .from('offer-attachments')
                .upload(fileName, file);

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('offer-attachments')
                .getPublicUrl(fileName);

            updateField('imageUrl', urlData.publicUrl);
        } catch (error) {
            console.error('Upload failed:', error);
            alert(isAr ? 'فشل رفع الصورة. حاول مرة أخرى.' : 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const triggerError = (msg: string) => {
        setError(msg);
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (selectedPartIds.size === 0) {
            triggerError(isAr ? 'يرجى اختيار قطعة واحدة على الأقل' : 'Please select at least one part');
            return;
        }

        // Check Daily Limit before starting loop
        if (offerLimit !== -1) {
            const available = offerLimit - dailyOfferCount;
            if (selectedPartIds.size > available) {
                triggerError(isAr 
                    ? `لا يمكنك إرسال ${selectedPartIds.size} عروض. المتبقي لك اليوم: ${available}` 
                    : `Cannot send ${selectedPartIds.size} offers. Remaining today: ${available}`);
                return;
            }
        }


        // Validate all selected parts
        for (const partId of selectedPartIds) {
            const form = formDataMap[partId];
            const shipmentType = getShipmentTypeById(form.partType);
            if (!form?.basePrice) {
                const partName = parts.find((p: any) => p.id === partId)?.name || requestDetails?.part || '';
                triggerError(isAr ? `أدخل سعر القطعة: ${partName}` : `Enter price for: ${partName}`);
                setActivePartId(partId);
                return;
            }
            if (shipmentType?.hasCylinders && !form.cylinders) {
                const partName = parts.find((p: any) => p.id === partId)?.name || requestDetails?.part || '';
                triggerError(isAr ? `حدد عدد السلندرات: ${partName}` : `Select cylinder count for: ${partName}`);
                setActivePartId(partId);
                return;
            }
            if (shipmentType?.isWeightBound && !form.weight) {
                const partName = parts.find((p: any) => p.id === partId)?.name || requestDetails?.part || '';
                triggerError(isAr ? `أدخل وزن القطعة: ${partName}` : `Enter weight for: ${partName}`);
                setActivePartId(partId);
                return;
            }
            if (!form.imageUrl) {
                const partName = parts.find((p: any) => p.id === partId)?.name || requestDetails?.part || '';
                triggerError(isAr ? `يرجى رفع صورة للقطعة: ${partName}` : `Please upload an image for: ${partName}`);
                setActivePartId(partId);
                return;
            }
        }

        setIsSubmitting(true);
        const selectedParts = Array.from(selectedPartIds);
        setSubmitProgress({ current: 0, total: selectedParts.length });

        try {
            let lastStoreId = '';
            for (let i = 0; i < selectedParts.length; i++) {
                const partId = selectedParts[i];
                const form = formDataMap[partId];
                const part = parts.find((p: any) => p.id === partId);
                const shipmentType = getShipmentTypeById(form.partType);
                const normalizedWeightKg = shipmentType?.isWeightBound ? (parseFloat(form.weight) || 0) : 0;
                const normalizedCylinders = shipmentType?.hasCylinders ? form.cylinders : undefined;

                // Dynamic calculation using shared logic (2026 Standard)
                const { shipping: shippingCost, finalPrice, merchantEarnings: price, weightKg: w } = {
                    ...getQuoteCalculations(form.basePrice, form.weight, form.partType, normalizedCylinders),
                    weightKg: normalizedWeightKg
                };

                // Determine if this is an update or a new offer
                const existingOffer = existingOfferMap.get(partId);

                // Editable fields (shared between create and update)
                const editableFields = {
                    unitPrice: price,
                    weightKg: w,
                    partType: form.partType,
                    condition: form.condition,
                    hasWarranty: form.hasWarranty,
                    warrantyDuration: form.hasWarranty 
                        ? (form.warrantyDuration === 'custom' ? customWarranties[partId] : form.warrantyDuration) 
                        : undefined,
                    deliveryDays: form.deliveryTime,
                    notes: form.notes,
                    offerImage: form.imageUrl || undefined,
                    shippingCost,
                    cylinders: normalizedCylinders,
                };

                // CREATE — Always create new (Edit is locked, requires cancel first)
                let resultData = await offersApi.create({
                    ...editableFields,
                    orderId: String(requestDetails?.id),
                    orderPartId: partId !== 'legacy' && partId !== 'single' ? partId : undefined,
                });

                // Optimistic UI Update
                if (requestDetails?.id) {
                    addOfferToOrder(String(requestDetails.id), {
                        storeId: resultData?.store?.id || resultData?.storeId || 'my-store-session',
                        offerNumber: resultData?.offerNumber || '---',
                        storeCode: resultData?.store?.storeCode || resultData?.storeCode || '---',
                        submittedAt: resultData?.createdAt || new Date().toISOString(),
                        merchantName: resultData?.store?.name || 'My Store',
                        storeRating: 5,
                        storeReviewCount: 0,
                        price: finalPrice,
                        unitPrice: price,
                        shippingCost,
                        isShippingIncluded: shippingCost === 0,
                        condition: form.condition,
                        warranty: form.hasWarranty ? form.warrantyDuration : 'No',
                        deliveryTime: form.deliveryTime,
                        notes: form.notes,
                        offerImage: form.imageUrl || undefined,
                        weight: w,
                        cylinders: normalizedCylinders,
                        partType: form.partType,
                        orderPartId: partId !== 'legacy' && partId !== 'single' ? String(partId) : undefined,
                        partName: part?.name || requestDetails?.part,
                    });
                }

                setSubmitProgress({ current: i + 1, total: selectedParts.length });
                // Track storeId from last submission for chat init
                if (resultData?.store?.id || resultData?.storeId) {
                    lastStoreId = resultData?.store?.id || resultData?.storeId;
                }
            }

            // 2026 Blind Auction: Customer notification suppressed during bidding phase
            /*
            if (requestDetails) {
                const orderData = getOrder(requestDetails.id);
                if (orderData?.customer?.id) {
                    addNotification({
                        recipientId: orderData.customer.id,
                        recipientRole: 'CUSTOMER',
                        type: 'offer',
                        titleKey: 'newOffer',
                        message: isAr
                            ? `عرض سعر جديد على ${selectedParts.length > 1 ? `${selectedParts.length} قطع` : 'قطعة'} من طلبك #${requestDetails.id}`
                            : `New offer on ${selectedParts.length > 1 ? `${selectedParts.length} parts` : '1 part'} for Order #${requestDetails.id}`,
                        orderId: requestDetails.id,
                        linkTo: 'order-details',
                        priority: 'normal'
                    });
                }
            }
            */

            await fetchDashboardStats();
            onSubmit({});

            // Reset all form state
            setFormDataMap({});
            setSelectedPartIds(new Set());
            setActivePartId(null);
            setError(null);
            setSubmitProgress(null);

        } catch (err: any) {
            console.error('Offer submission failed:', err);
            const apiMsg = err?.response?.data?.message;
            triggerError(apiMsg || (isAr ? 'فشل إرسال العرض. حاول مرة أخرى.' : 'Failed to submit offer. Please try again.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!requestDetails) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-[3px]"
            >
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="bg-[#1A1814] border border-gold-500/20 rounded-2xl w-full max-w-5xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative flex flex-col max-h-[90vh] overflow-hidden"
                >
                    {/* Offer Limit Warning Banner [2026 Governance] */}
                    {offerLimit !== -1 && dailyOfferCount >= offerLimit && (
                        <div className="bg-red-500/10 border-b border-red-500/20 p-4 flex items-center justify-between gap-4 animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-500">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-tight">
                                        {isAr ? 'تم الوصول للحد اليومي للعروض' : 'Daily Offer Limit Reached'}
                                    </h4>
                                    <p className="text-red-400/80 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                                        {isAr ? `لقد استهلكت جميع عروضك المتاحة اليوم (${offerLimit}/${offerLimit})` : `You have consumed all your available offers today (${offerLimit}/${offerLimit})`}
                                    </p>
                                </div>
                            </div>
                            <div className="text-[10px] font-black text-red-500 uppercase border border-red-500/30 px-3 py-1.5 rounded-lg">
                                {isAr ? 'مقيد إدارياً' : 'Restricted'}
                            </div>
                        </div>
                    )}


                    {/* ====== PART SELECTION BAR (Multi-Part Only) ====== */}
                    {isMultiPart && (
                        <div className="border-b border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Package size={16} className="text-gold-400" />
                                    {isAr ? 'اختر القطع للعرض عليها' : 'Select Parts to Bid On'}
                                </h3>
                                <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {parts.map((p: any) => {
                                    const isSelected = selectedPartIds.has(p.id);
                                    const isActive = activePartId === p.id;
                                    const hasExistingOffer = existingOfferMap.has(p.id);
                                    const isAwardedToOther = awardedToOthersMap.get(p.id);

                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            disabled={isAwardedToOther || hasExistingOffer}
                                            onClick={() => {
                                                if (isAwardedToOther || hasExistingOffer) return;
                                                togglePart(p.id);
                                                if (!isSelected) setActivePartId(p.id);
                                                else if (isActive && selectedPartIds.size > 1) {
                                                    const remaining = Array.from(selectedPartIds).filter(id => id !== p.id);
                                                    setActivePartId(remaining[0]);
                                                }
                                            }}
                                            className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                                                isAwardedToOther
                                                    ? 'bg-red-500/5 border-red-500/10 text-red-400/50 cursor-not-allowed opacity-60'
                                                : hasExistingOffer
                                                    ? 'bg-green-500/5 border-green-500/20 text-green-400/60 cursor-not-allowed opacity-75'
                                                : isSelected
                                                    ? (isActive
                                                        ? 'bg-gold-500/20 border-gold-500/50 text-gold-400 ring-2 ring-gold-500/30'
                                                        : 'bg-gold-500/10 border-gold-500/30 text-gold-400')
                                                    : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                                isAwardedToOther ? 'bg-red-500/10 border-red-500/30' 
                                                : hasExistingOffer ? 'bg-green-500/10 border-green-500/30' 
                                                : isSelected ? 'bg-gold-500 border-gold-500' 
                                                : 'border-white/20'
                                            }`}>
                                                {isAwardedToOther ? <AlertCircle size={12} className="text-red-400" /> : isSelected ? <Check size={12} className="text-black" /> : hasExistingOffer ? <CheckCircle2 size={12} className="text-green-400" /> : null}
                                            </div>
                                            {p.images?.[0] && (
                                                <PartThumb
                                                    src={p.images[0]}
                                                    className={`w-6 h-6 rounded object-cover ${isAwardedToOther ? 'grayscale' : ''}`}
                                                />
                                            )}
                                            <span className="truncate max-w-[120px]">{p.name}</span>
                                            {isAwardedToOther ? (
                                                <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full border border-red-500/20 whitespace-nowrap">
                                                    {isAr ? 'تم الاختيار' : 'Sold'}
                                                </span>
                                            ) : hasExistingOffer && (
                                                <span className="text-[9px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full border border-green-500/20 whitespace-nowrap">
                                                    {isAr ? 'عرض مقدم' : 'Offered'}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Part Tabs for switching */}
                            {selectedPartIds.size > 1 && (
                                <div className="flex gap-1 mt-3 border-t border-white/5 pt-3">
                                    {Array.from(selectedPartIds).map((partId) => {
                                        const part = parts.find((p: any) => p.id === partId);
                                        const isActive = activePartId === partId;
                                        const form = formDataMap[partId];
                                        const hasData = form?.basePrice;
                                        return (
                                            <button
                                                key={partId}
                                                type="button"
                                                onClick={() => setActivePartId(partId)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive
                                                    ? 'bg-gold-500 text-black'
                                                    : hasData
                                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                        : 'bg-white/5 text-white/50 hover:text-white/70'
                                                    }`}
                                            >
                                                {hasData && !isActive && <Check size={10} />}
                                                {part?.name || partId}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ====== MAIN CONTENT ====== */}
                    {activePartId && selectedPartIds.size > 0 ? (
                        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

                            {/* LEFT SIDE: Order Details & Live Calc */}
                            <div className="w-full lg:w-[45%] p-6 bg-white/5 border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto overscroll-contain [contain:layout]">

                                {/* Active Part Name Header */}
                                <div className="mb-4 px-3 py-2.5 bg-gold-500/10 border border-gold-500/20 rounded-xl">
                                    <div className="flex items-center gap-2 text-gold-400 text-xs font-bold uppercase tracking-wider mb-1">
                                        <Package size={14} />
                                        {isAr ? 'تقديم عرض على' : 'Bidding On'}
                                    </div>
                                    <div className="text-white font-bold text-base">{activePartName}</div>
                                </div>

                                {/* Order Info */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-gold-500/20 text-gold-400 text-xs font-mono px-2 py-1 rounded border border-gold-500/20">#{requestDetails.id}</span>
                                        <span className="text-white/40 text-xs">{requestDetails.date}</span>
                                    </div>

                                    {/* Show current part media only */}
                                    {activePartPreview ? (
                                            <div className="bg-white/5 p-3 rounded-lg space-y-2">
                                                <div className="text-xs text-white/50 line-clamp-2">{activePartPreview.description}</div>
                                                <div className="flex gap-2 overflow-x-auto pb-1">
                                                    {activePartPreview.images?.map((img: string | File, i: number) =>
                                                        typeof img === 'string' ? (
                                                            <div
                                                                key={`img-${i}`}
                                                                className="w-12 h-12 shrink-0 rounded bg-black/40 border border-white/10 overflow-hidden cursor-pointer hover:border-gold-500/50"
                                                                onClick={() => setActiveMedia({ type: 'image', url: img })}
                                                            >
                                                                <img src={img} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                                            </div>
                                                        ) : null,
                                                    )}
                                                    {typeof activePartPreview.video === 'string' && activePartPreview.video && (
                                                        <div
                                                            className="w-12 h-12 shrink-0 rounded bg-black/40 border border-white/10 overflow-hidden cursor-pointer hover:border-gold-500/50 relative group"
                                                            onClick={() => setActiveMedia({ type: 'video', url: activePartPreview.video as string })}
                                                        >
                                                            <video src={activePartPreview.video as string} className="w-full h-full object-cover opacity-50" preload="none" />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <PlayCircle size={16} className="text-white" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <h2 className="text-xl font-bold text-white mb-1 line-clamp-2">{requestDetails.part}</h2>
                                        )}

                                    <p className="text-white/60 text-sm flex items-center gap-2 mt-3">
                                        <Car size={14} />
                                        {requestDetails.vehicle ? `${requestDetails.vehicle.make} ${requestDetails.vehicle.model} ${requestDetails.vehicle.year}` : requestDetails.car}
                                    </p>
                                </div>

                                <LivePriceCalculator
                                    calculations={calculations}
                                    basePriceDisplay={activeForm.basePrice}
                                    isPriceSyncing={isPriceSyncing}
                                    isAr={isAr}
                                    calcTitle={t.dashboard.merchant.offerModal.calc.title}
                                    merchantNetLabel={t.dashboard.merchant.offerModal.calc.merchantNet}
                                    finalPriceLabel={t.dashboard.merchant.offerModal.calc.finalCustomerPrice}
                                />
                            </div>

                            {/* RIGHT SIDE: Offer Form */}
                            <div className="w-full lg:w-[55%] flex flex-col min-h-0 bg-[#1A1814] overflow-y-auto overscroll-contain [contain:layout]">
                                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{t.dashboard.merchant.offerModal.yourOffer}</h3>
                                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-1">{isAr ? 'أدخل تفاصيل عرضك بدقة' : 'Enter your offer details with precision'}</p>
                                    </div>
                                    {!isMultiPart && (
                                        <button 
                                            onClick={onClose} 
                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>

                                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">

                                    {/* SECTION 1: PRICE & LOGISTICS */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{isAr ? 'السعر واللوجستيات' : 'Price & Logistics'}</span>
                                            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="group">
                                                <label className="block text-[10px] font-black text-white/40 mb-2 uppercase tracking-widest group-focus-within:text-gold-500 transition-colors">
                                                    {t.dashboard.merchant.offerModal.priceLabel} <span className="text-gold-500">*</span>
                                                </label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
                                                        <span className="font-black text-xs text-gold-500/40 group-focus-within:text-gold-500">AED</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        required
                                                        min="1"
                                                        value={activeForm.basePrice}
                                                        onChange={(e) => updateField('basePrice', e.target.value)}
                                                        className={`w-full bg-black/60 border rounded-2xl py-4 pl-14 pr-4 text-white font-black text-xl outline-none transition-all placeholder-white/5 ${error && !activeForm.basePrice ? 'border-red-500/50 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-white/5 hover:border-white/10 focus:border-gold-500/50 focus:bg-gold-500/5 focus:shadow-[0_0_25px_rgba(212,175,55,0.05)]'}`}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-white/40 mb-2 uppercase tracking-widest">
                                                    {t.dashboard.merchant.offerModal.partTypeLabel}
                                                </label>
                                                <div className="relative group">
                                                    <select
                                                        value={activeForm.partType}
                                                        onChange={(e) => handlePartTypeChange(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/5 hover:border-white/10 focus:border-gold-500/50 rounded-2xl py-4 px-4 text-white text-sm font-bold focus:bg-gold-500/5 outline-none appearance-none transition-all cursor-pointer"
                                                    >
                                                        {shipmentTypeOptions.map((type: any) => (
                                                            <option key={type.id} value={type.id} className="bg-[#1A1814]">
                                                                {isAr ? type.nameAr : type.nameEn}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-white/20 group-hover:text-gold-500 transition-colors">
                                                        <ChevronDown size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 1.5 Cylinder Count (2026 Engine Logic) */}
                                    {(() => {
                                        const activeType = shipmentTypeOptions.find((t: any) => t.id === activeForm.partType);
                                        if (!activeType?.hasCylinders) return null;

                                        return (
                                            <div className="p-6 rounded-3xl bg-gold-500/5 border border-gold-500/20 shadow-inner">
                                                <label className="block text-[10px] font-black text-gold-500 mb-4 uppercase tracking-[0.2em]">
                                                    {offersT?.cylinderCount || (isAr ? 'عدد السلندرات' : 'Cylinder Count')}
                                                </label>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                                    {(activeType.cylinderRates || []).sort((a: any, b: any) => a.cylinders - b.cylinders).map((rate: any) => (
                                                        <button
                                                            key={rate.cylinders}
                                                            type="button"
                                                            onClick={() => updateField('cylinders', rate.cylinders)}
                                                            className={`group flex flex-col items-center py-3 px-2 rounded-2xl border transition-all duration-300 ${activeForm.cylinders === rate.cylinders ? 'bg-gold-500 border-gold-500 text-black shadow-lg shadow-gold-500/30' : 'bg-black/40 border-white/5 text-white/30 hover:border-gold-500/30 hover:text-white/60'}`}
                                                        >
                                                            <span className="text-lg font-black font-mono leading-none">{rate.cylinders}</span>
                                                            <span className={`text-[8px] uppercase font-black tracking-tighter mt-1 ${activeForm.cylinders === rate.cylinders ? 'text-black/60' : 'text-white/20 group-hover:text-gold-500'}`}>
                                                                {isAr ? 'سلندر' : 'Cyl'}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2 mt-4 text-[9px] text-white/30 font-bold italic">
                                                    <div className="w-1 h-1 rounded-full bg-gold-500/40" />
                                                    {offersT?.cylinderNote || (isAr ? '* شحن المكائن يعتمد على عدد السلندرات بسعر ثابت.' : '* Engine shipping cost is fixed based on cylinder count.')}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* 2. Weight */}
                                    <AnimatePresence>
                                        {(() => {
                                            const activeType = shipmentTypeOptions.find((t: any) => t.id === activeForm.partType);
                                            if (!activeType?.isWeightBound) return null;
                                            
                                            return (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <label className="block text-xs text-white/60 mb-2 uppercase tracking-wider">
                                                        {t.dashboard.merchant.offerModal.weightLabel} <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            required
                                                            min="0.1"
                                                            step="0.1"
                                                            value={activeForm.weight}
                                                            onChange={(e) => updateField('weight', e.target.value)}
                                                            className={`w-full bg-black/40 border rounded-xl py-3 px-4 text-white font-mono outline-none transition-all placeholder-white/10 ${error && !activeForm.weight ? 'border-red-500 ring-2 ring-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)] focus:border-red-500' : 'border-white/10 focus:border-gold-500'}`}
                                                            placeholder="0.0"
                                                        />
                                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-white/30 text-xs">
                                                            {t.dashboard.merchant.offerModal.weightUnit}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })()}
                                    </AnimatePresence>

                                    <div className="h-px bg-white/5 my-4" />

                                    {/* SECTION 2: PART SPECS & WARRANTY */}
                                    <div className="space-y-4 pt-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{isAr ? 'المواصفات والضمان' : 'Specs & Warranty'}</span>
                                            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-white/40 mb-2 uppercase tracking-widest">
                                                    {t.dashboard.merchant.offerModal.conditionLabel}
                                                </label>
                                                <div className="relative group">
                                                    <select
                                                        value={activeForm.condition}
                                                        onChange={(e) => updateField('condition', e.target.value)}
                                                        className="w-full bg-black/40 border border-white/5 hover:border-white/10 focus:border-gold-500/50 rounded-2xl py-4 px-4 text-white text-sm font-bold focus:bg-gold-500/5 outline-none appearance-none transition-all cursor-pointer"
                                                    >
                                                        <option value="new" className="bg-[#1A1814]">{t.dashboard.merchant.offerModal.conditions.new}</option>
                                                        <option value="used_clean" className="bg-[#1A1814]">{t.dashboard.merchant.offerModal.conditions.used_clean}</option>
                                                    </select>
                                                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-white/20 group-hover:text-gold-500 transition-colors">
                                                        <ChevronDown size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. Warranty */}
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck size={18} className={activeForm.hasWarranty ? 'text-green-400' : 'text-white/30'} />
                                                <span className="text-sm font-bold text-white">{t.dashboard.merchant.offerModal.warrantyLabel}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => updateField('hasWarranty', !activeForm.hasWarranty)}
                                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${activeForm.hasWarranty ? 'bg-green-500' : 'bg-white/20'}`}
                                            >
                                                <div
                                                    className="w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300"
                                                    style={{
                                                        transform: activeForm.hasWarranty
                                                            ? `translateX(${isAr ? -24 : 24}px)`
                                                            : 'translateX(0)',
                                                    }}
                                                />
                                            </button>
                                        </div>

                                        <AnimatePresence>
                                            {activeForm.hasWarranty && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider mt-2">
                                                        {t.dashboard.merchant.offerModal.warrantyDurationLabel}
                                                    </label>
                                                    <select
                                                        value={activeForm.warrantyDuration}
                                                        onChange={(e) => updateField('warrantyDuration', e.target.value)}
                                                        className="w-full bg-[#1A1814] border border-white/10 rounded-lg py-3 px-3 text-white text-sm focus:border-green-500 outline-none"
                                                    >
                                                        <option value="15days" className="bg-[#1A1814]">{isAr ? '15 يوم' : '15 Days'}</option>
                                                        <option value="1month" className="bg-[#1A1814]">{isAr ? 'شهر' : '1 Month'}</option>
                                                        <option value="3months" className="bg-[#1A1814]">{isAr ? '3 أشهر' : '3 Months'}</option>
                                                        <option value="12months" className="bg-[#1A1814]">{isAr ? '12 شهر' : '12 Months'}</option>
                                                        <option value="custom" className="bg-[#1A1814]">{isAr ? 'إدخال مدة مخصصة...' : 'Enter Custom Duration...'}</option>
                                                    </select>

                                                    {/* Custom Warranty Input */}
                                                    {activeForm.warrantyDuration === 'custom' && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="mt-2"
                                                        >
                                                            <input
                                                                type="text"
                                                                placeholder={isAr ? 'مثال: 45 يوم أو شهرين' : 'e.g., 45 days or 2 months'}
                                                                value={customWarranties[activePartId!] || ''}
                                                                onChange={(e) => setCustomWarranties(prev => ({ ...prev, [activePartId!]: e.target.value }))}
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white text-sm focus:border-gold-500 outline-none placeholder-white/20"
                                                            />
                                                        </motion.div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* 5. Notes */}
                                    <div>
                                        <label className="block text-xs text-white/60 mb-2 uppercase tracking-wider">
                                            {t.dashboard.merchant.offerModal.notesLabel}
                                        </label>
                                        <textarea
                                            value={activeForm.notes}
                                            onChange={(e) => updateField('notes', e.target.value)}
                                            rows={2}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-gold-500 outline-none resize-none placeholder-white/20"
                                            placeholder="..."
                                        />
                                    </div>

                                    {/* 6. Image Upload */}
                                    <div className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-white/30 hover:bg-white/5 cursor-pointer transition-all group overflow-hidden ${error && !activeForm.imageUrl ? 'border-red-500 ring-2 ring-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-white/10 hover:border-gold-500/30'}`}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        {uploading ? (
                                            <Loader2 className="animate-spin text-gold-500" />
                                        ) : activeForm.imageUrl ? (
                                            <div className="relative w-full h-32">
                                                <img src={activeForm.imageUrl} alt="Uploaded" className="w-full h-full object-contain rounded-lg" />
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs">
                                                    {isAr ? 'اضغط لتغيير' : 'Click to Change'}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <UploadCloud size={24} className="mb-2 group-hover:text-gold-400 transition-colors" />
                                                <span className="text-xs font-bold">{t.dashboard.merchant.offerModal.uploadLabel}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Error */}
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm justify-center"
                                            >
                                                <AlertCircle size={16} />
                                                <span>{error}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Submit Progress */}
                                    {submitProgress && (
                                        <div className="mt-2 p-3 bg-gold-500/10 border border-gold-500/20 rounded-xl">
                                            <div className="flex justify-between items-center text-xs text-gold-300 mb-2">
                                                <span>{isAr ? 'جاري إرسال العروض...' : 'Submitting offers...'}</span>
                                                <span className="font-mono">{submitProgress.current}/{submitProgress.total}</span>
                                            </div>
                                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gold-500 rounded-full transition-all duration-300"
                                                    style={{ width: `${(submitProgress.current / submitProgress.total) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* ENHANCED FOOTER ACTIONS */}
                                    <div className="pt-8 mt-8 border-t border-white/5 flex flex-col sm:flex-row gap-4">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl font-black transition-all border border-white/5 uppercase tracking-widest text-[10px]"
                                        >
                                            {t.common.cancel || (isAr ? "إلغاء" : "Cancel")}
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting || (offerLimit !== -1 && dailyOfferCount >= offerLimit)}
                                            className={`flex-1 relative group overflow-hidden bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-black font-black py-4 rounded-2xl transition-all shadow-xl shadow-gold-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                            {isSubmitting ? (
                                                <Loader2 className="animate-spin" size={24} />
                                            ) : (
                                                <>
                                                    <DollarSign size={20} />
                                                    <span className="uppercase tracking-widest">{t.dashboard.merchant.offerModal.submit}</span>
                                                    {selectedPartIds.size > 1 && (
                                                        <div className="bg-black/20 px-2 py-0.5 rounded-lg text-[10px] font-mono border border-black/10">
                                                            {selectedPartIds.size}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    ) : (
                        /* No part selected message */
                        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                            <Package size={48} className="text-white/20 mb-4" />
                            <p className="text-white/40 text-sm">
                                {isAr ? 'اختر قطعة واحدة على الأقل من القائمة أعلاه للبدء' : 'Select at least one part from the list above to start'}
                            </p>
                        </div>
                    )}

                </motion.div>
            </motion.div>

            {/* Lightbox Overlay */}
            {activeMedia && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-[3px]"
                    onClick={() => setActiveMedia(null)}
                >
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
                        {activeMedia.type === 'video' ? (
                            <video
                                src={activeMedia.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[85vh] rounded-lg border border-gold-500/20 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <img
                                src={activeMedia.url}
                                alt="Full View"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg border border-gold-500/20 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                        )}
                        <button
                            className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                            onClick={() => setActiveMedia(null)}
                        >
                            {isAr ? 'إغلاق' : 'Close'}
                        </button>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

/** Mount heavy form only while open — keeps marketplace page light when modal is closed. */
export const SubmitOfferModal: React.FC<SubmitOfferModalProps> = (props) => {
    if (!props.isOpen || !props.requestDetails) return null;
    return <SubmitOfferModalInner key={String(props.requestDetails.id)} {...props} />;
};
