import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import { useCreateOrderStore, consumeCreateOrderPrefill } from '../../../stores/useCreateOrderStore';
import { useOrderStore } from '../../../stores/useOrderStore';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { usePlatformSettingsStore } from '../../../stores/usePlatformSettingsStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { VehicleDetailsStep } from './steps/VehicleDetailsStep';
import { PartDetailsStep } from './steps/PartDetailsStep';
import { PreferencesStep } from './steps/PreferencesStep';
import { ReviewStep } from './steps/ReviewStep';
import { GlassCard } from '../../ui/GlassCard';
import { OrderSuccessModal } from './OrderSuccessModal';

interface CreateOrderWizardProps {
  onComplete: () => void;
  onNavigate?: (path: string, id?: string) => void;
}

type StepKey = 'vehicle' | 'part' | 'preferences' | 'review';

export const CreateOrderWizard: React.FC<CreateOrderWizardProps> = ({ onComplete, onNavigate }) => {
  const {
    step,
    setStep,
    submitOrder,
    reset,
    prefillVehicle,
    vehicle,
    parts,
    preferences,
    setShowErrors,
    requestType,
    ensurePartsUploaded,
    isUploadingParts,
  } = useCreateOrderStore();
  const {
    isPreferencesStepEnabled,
    isLoading: isFeatureFlagsLoading,
    fetchSettings: fetchFeatureFlags,
    subscribeToSettings: subscribeFeatureFlags,
  } = usePlatformSettingsStore();
  const { addNotification } = useNotificationStore();
  const { t, language } = useLanguage();

  const NextIcon = language === 'ar' ? ChevronLeft : ChevronRight;
  const PrevIcon = language === 'ar' ? ChevronRight : ChevronLeft;

  const [isReady, setIsReady] = React.useState(false);
  const [shake, setShake] = React.useState(false);
  const [createdOrderId, setCreatedOrderId] = React.useState<string | null>(null);

  useEffect(() => {
    const prefill = consumeCreateOrderPrefill();
    if (prefill) {
      prefillVehicle({
        make: prefill.make,
        model: prefill.model,
        year: prefill.year,
      });
    } else {
      reset();
    }
    void fetchFeatureFlags();
    const unsub = subscribeFeatureFlags();
    setIsReady(true);
    return () => {
      unsub();
    };
  }, [fetchFeatureFlags, subscribeFeatureFlags, prefillVehicle, reset]);

  // Wait for flags so we never flash the step when admin has it OFF
  const SHOW_PREFERENCES_STEP = !isFeatureFlagsLoading && isPreferencesStepEnabled === true;

  // If admin disables preferences while customer is mid-wizard on step 3, skip ahead
  useEffect(() => {
    if (!SHOW_PREFERENCES_STEP && step === 3) {
      setStep(4);
    }
  }, [SHOW_PREFERENCES_STEP, step, setStep]);

  // Logical ids stay 1..4 for navigation; displayNumber is 1..N for visible steps only
  const steps = (
    [
      { id: 1, key: 'vehicle' as StepKey, title: t.dashboard.createOrder.steps.vehicle },
      { id: 2, key: 'part' as StepKey, title: t.dashboard.createOrder.steps.part },
      ...(SHOW_PREFERENCES_STEP
        ? [{ id: 3, key: 'preferences' as StepKey, title: t.dashboard.createOrder.steps.preferences }]
        : []),
      { id: 4, key: 'review' as StepKey, title: t.dashboard.createOrder.steps.review },
    ] as Array<{ id: number; key: StepKey; title: string }>
  ).map((s, index) => ({ ...s, displayNumber: index + 1 }));

  // Adjust step IDs for navigation if preferences is skipped
  const getNextStep = (current: number) => {
    if (current === 2 && !SHOW_PREFERENCES_STEP) return 4;
    return current + 1;
  };

  const getPrevStep = (current: number) => {
    if (current === 4 && !SHOW_PREFERENCES_STEP) return 2;
    return current - 1;
  };

  const handleNext = async () => {
    // Validation Setup
    setShowErrors(true);
    let hasError = false;

    if (step === 1) {
      if (!vehicle.make || !vehicle.model || !vehicle.year) {
        addNotification({ type: 'system', titleKey: 'alert', message: language === 'ar' ? 'يرجى تعبئة جميع بيانات المركبة الإلزامية' : 'Please fill all mandatory vehicle details', priority: 'urgent' });
        hasError = true;
      }
    }

    if (step === 2 && !hasError) {
      if (requestType === 'multiple' && parts.length < 2) {
        addNotification({ type: 'system', titleKey: 'alert', message: language === 'ar' ? 'لقد اخترت (عدة قطع)، يجب إضافة قطعتين على الأقل للمتابعة' : 'You selected (Multiple Parts), please add at least 2 parts to continue', priority: 'urgent' });
        hasError = true;
      } else {
        // Validate ALL parts
        const isValid = parts.every(p => p.name && p.description && p.images.length > 0);
        if (!isValid) {
          addNotification({ type: 'system', titleKey: 'alert', message: language === 'ar' ? 'يرجى تعبئة جميع البيانات الإلزامية وإرفاق صورة واحدة على الأقل لكل قطعة' : 'Please fill all mandatory details and attach at least one image for all parts', priority: 'urgent' });
          hasError = true;
        }
      }
    }

    if (step === 3 && SHOW_PREFERENCES_STEP && !hasError) {
      if (!preferences.condition) {
        addNotification({ type: 'system', titleKey: 'alert', message: language === 'ar' ? 'يرجى اختيار حالة القطعة' : 'Please select part condition', priority: 'urgent' });
        hasError = true;
      }
    }

    if (hasError) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    // Eager upload when leaving the parts step so confirm is API-only
    if (step === 2) {
      try {
        await ensurePartsUploaded();
      } catch (err) {
        console.error('Part upload failed', err);
        addNotification({
          type: 'system',
          titleKey: 'alert',
          message: language === 'ar' ? 'فشل رفع الملفات. حاول مرة أخرى.' : 'Failed to upload files. Please try again.',
          priority: 'urgent',
        });
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
    }

    // Success (Move Next)
    setShowErrors(false);
    setStep(getNextStep(step));
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Mobile UX fix
  };

  const handleBack = () => {
    setStep(getPrevStep(step));
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Mobile UX fix
  };

  const handleSubmit = async () => {
    try {
      const newOrderId = await submitOrder();
      void useOrderStore.getState().fetchOrder(newOrderId);
      addNotification({
        type: 'system',
        titleKey: 'adminAlert',
        message: language === 'ar' ? 'تم استلام طلبك بنجاح' : 'Order received successfully',
        priority: 'urgent'
      });

      setCreatedOrderId(newOrderId); // Trigger Modal instead of immediate redirect
    } catch (error) {
      console.error("Order Creation Failed:", error);
      addNotification({
        type: 'system',
        titleKey: 'adminAlert',
        message: language === 'ar' ? "فشل إنشاء الطلب. حاول مرة أخرى." : "Failed to create order. Please try again.",
        priority: 'urgent'
      });
    }
  };

  const activeStepIndex = Math.max(steps.findIndex((s) => s.id === step), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">{t.dashboard.createOrder.title}</h1>
        <p className="text-white/80 text-base md:text-lg font-medium max-w-2xl mx-auto leading-relaxed">
          {language === 'ar'
            ? 'اطلب قطع غيار أصلية مستعملة من التشاليح في دول الخليج عبر منصة اي-تشليح'
            : 'Order original used auto parts from scrapyards in the GCC via E-Tashleh platform'}
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="relative flex justify-between items-center px-4 md:px-12 mb-12">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -z-10 -translate-y-1/2 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-gold-600 to-gold-400 shadow-[0_0_10px_#A88B3E]"
            initial={{ width: '0%' }}
            animate={{
              width: isReady
                ? `${(activeStepIndex / Math.max(steps.length - 1, 1)) * 100}%`
                : '0%',
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>

        {steps.map((s, index) => {
          const isActive = s.id === step;
          const isCompleted = index < activeStepIndex;

          return (
            <div key={s.key} className="relative flex flex-col items-center group">
              <motion.div
                animate={{
                  backgroundColor: isActive || isCompleted ? '#1A1814' : '#1A1814',
                  borderColor: isActive || isCompleted ? '#C4A95C' : '#ffffff20',
                  scale: isActive ? 1.2 : 1,
                  boxShadow: isActive ? '0 0 20px rgba(168, 139, 62, 0.4)' : '0 0 0px rgba(0,0,0,0)'
                }}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center z-10 transition-colors duration-300`}
              >
                {isCompleted ? (
                  <Check size={20} className="text-gold-400" />
                ) : (
                  <span className={`font-bold ${isActive ? 'text-gold-400' : 'text-white/30'}`}>{s.displayNumber}</span>
                )}
              </motion.div>
              <span className={`absolute top-14 text-xs font-bold transition-colors ${isActive ? 'text-gold-400' : 'text-white/30'}`}>
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Content Card — no nested backdrop-blur (mobile dirty-band fix) */}
      <GlassCard enableHover={false} enableBlur={false} className="bg-[#1A1814]/80 border border-gold-500/10 p-6 md:p-10 min-h-[400px] flex flex-col">
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {step === 1 && <VehicleDetailsStep key="step1" />}
            {step === 2 && <PartDetailsStep key="step2" />}
            {step === 3 && SHOW_PREFERENCES_STEP && <PreferencesStep key="step3" />}
            {step === 4 && <ReviewStep key="step4" onConfirm={handleSubmit} />}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        {step < 4 && (
          <div className="flex justify-between items-center pt-8 mt-8 border-t border-white/5">
            <button
              onClick={handleBack}
              disabled={step === 1 || isUploadingParts}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-colors font-medium ${step === 1 ? 'opacity-0 cursor-default' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              <PrevIcon size={20} />
              {t.dashboard.createOrder.back}
            </button>

            <button
              onClick={() => void handleNext()}
              disabled={isUploadingParts}
              className={`flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-white rounded-xl font-bold shadow-[0_4px_20px_rgba(168,139,62,0.3)] hover:shadow-[0_6px_25px_rgba(168,139,62,0.4)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
            >
              {isUploadingParts ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {t.dashboard.createOrder.uploading || (language === 'ar' ? 'جاري رفع الملفات…' : 'Uploading files…')}
                </>
              ) : (
                <>
                  {t.dashboard.createOrder.next}
                  <NextIcon size={20} />
                </>
              )}
            </button>
          </div>
        )}
      </GlassCard>

      <OrderSuccessModal
        isOpen={!!createdOrderId}
        orderId={createdOrderId}
        onConfirm={() => {
          const id = createdOrderId;
          setCreatedOrderId(null);
          if (onNavigate && id) {
            onNavigate('order-details', id);
          } else {
            onComplete();
          }
        }}
      />

    </div>
  );
};
