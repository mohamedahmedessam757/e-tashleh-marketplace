import React, { useState, useMemo } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { useLanguage } from './../../../contexts/LanguageContext';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface StripePaymentFormProps {
  clientSecret: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  amount: number;
  savedPaymentMethodId?: string | null;
  onSwitchToNewCard?: () => void;
  onStalePaymentMethod?: (paymentMethodId: string) => void | Promise<void>;
}

function isStalePaymentMethodError(message?: string | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('no such paymentmethod') ||
    m.includes('does not belong to a customer') ||
    m.includes('connected accounts')
  );
}

const CheckoutForm: React.FC<StripePaymentFormProps> = ({
  onSuccess,
  onError,
  amount,
  savedPaymentMethodId,
  clientSecret,
  onSwitchToNewCard,
  onStalePaymentMethod,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe) return;

    setIsProcessing(true);

    let result;
    if (savedPaymentMethodId) {
      result = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          payment_method: savedPaymentMethodId,
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });
    } else {
      if (!elements) {
        setIsProcessing(false);
        return;
      }
      result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
    }

    const { error, paymentIntent } = result;

    if (error) {
      if (savedPaymentMethodId && isStalePaymentMethodError(error.message)) {
        try {
          await onStalePaymentMethod?.(savedPaymentMethodId);
        } catch {
          /* non-blocking */
        }
        onSwitchToNewCard?.();
        onError(
          isAr
            ? 'البطاقة المحفوظة لم تعد صالحة في Stripe. أدخل بطاقة جديدة لإتمام الدفع.'
            : 'Your saved card is no longer valid in Stripe. Enter a new card to complete payment.',
        );
      } else {
        onError(error.message || (isAr ? 'فشلت عملية الدفع' : 'Payment failed'));
      }
      setIsProcessing(false);
    } else if (paymentIntent) {
      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
        onSuccess(paymentIntent);
      } else {
        onError(
          isAr
            ? `حالة دفع غير متوقعة: ${paymentIntent.status}`
            : `Unexpected payment status: ${paymentIntent.status}`,
        );
        setIsProcessing(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!savedPaymentMethodId ? (
        <div className="space-y-3">
          <PaymentElement options={{ layout: 'tabs' }} />
          <p className="text-[11px] text-white/40 text-center">
            {isAr
              ? 'سيتم حفظ البطاقة تلقائياً بعد الدفع الناجح لاستخدامها لاحقاً.'
              : 'Your card will be saved automatically after successful payment for future use.'}
          </p>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/20 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center">
            <ShieldCheck className="text-gold-500" size={32} />
          </div>
          <div>
            <p className="text-white font-bold">{isAr ? 'جاهز للدفع السريع' : 'Ready for Quick Pay'}</p>
            <p className="text-white/40 text-xs mt-1">
              {isAr
                ? 'سيتم استخدام البطاقة المختارة بأمان عبر Stripe'
                : 'Your selected saved card will be used securely via Stripe'}
            </p>
          </div>
          {onSwitchToNewCard && (
            <button
              type="button"
              onClick={onSwitchToNewCard}
              className="text-xs text-gold-400 hover:text-gold-300 underline underline-offset-2 transition-colors"
            >
              {isAr ? 'استخدم بطاقة أخرى' : 'Use a different card'}
            </button>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-colors relative overflow-hidden group ${
          isProcessing
            ? 'bg-gold-500/20 text-gold-300 cursor-wait'
            : 'bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-black shadow-[0_8px_30px_rgb(212,175,55,0.2)]'
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            <span className="relative z-10">
              {isAr ? 'جاري معالجة الدفع...' : 'Processing Payment...'}
            </span>
          </>
        ) : (
          <>
            <Lock size={18} />
            <span className="relative z-10">
              {savedPaymentMethodId
                ? isAr
                  ? `تأكيد الدفع (AED ${amount.toLocaleString()})`
                  : `Confirm Payment (AED ${amount.toLocaleString()})`
                : isAr
                  ? `دفع الآن (AED ${amount.toLocaleString()})`
                  : `Pay Now (AED ${amount.toLocaleString()})`}
            </span>
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-[10px] text-white/30 uppercase tracking-widest">
        <ShieldCheck size={12} />
        {isAr ? 'دفع آمن بنسبة 100%' : '100% Secure Payment'}
      </div>
    </form>
  );
};

const STRIPE_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#D4AF37',
    colorBackground: '#1A1A1A',
    colorText: '#ffffff',
    colorDanger: '#ef4444',
    colorTextPlaceholder: '#71717A',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacingUnit: '5px',
    borderRadius: '16px',
  },
  rules: {
    '.Tab': {
      border: '1px solid rgba(212, 175, 55, 0.1)',
      backgroundColor: '#121212',
    },
    '.Tab--selected': {
      borderColor: '#D4AF37',
      backgroundColor: 'rgba(212, 175, 55, 0.05)',
    },
    '.Input': {
      backgroundColor: '#121212',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      padding: '12px',
    },
    '.Input:focus': {
      borderColor: '#D4AF37',
      boxShadow: '0 0 0 3px rgba(212, 175, 55, 0.1)',
    },
  },
};

export const StripePaymentForm: React.FC<StripePaymentFormProps> = (props) => {
  const elementsOptions = useMemo(
    () => ({
      clientSecret: props.clientSecret,
      appearance: STRIPE_APPEARANCE,
      loader: 'auto' as const,
    }),
    [props.clientSecret],
  );

  return (
    <div className="mt-4">
      <Elements stripe={stripePromise} options={elementsOptions}>
        <CheckoutForm {...props} />
      </Elements>
    </div>
  );
};
