import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Wallet, 
  ShieldCheck, 
  Download, 
  TrendingUp, 
  AlertCircle,
  X
} from 'lucide-react';
import { useAdminStore } from '../../stores/useAdminStore';
import { useLanguage } from '../../contexts/LanguageContext';

export const FinancialToast: React.FC = () => {
  const { financialToasts, removeFinancialToast } = useAdminStore();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT':
      case 'PAYMENT_SUCCESS': return <CreditCard size={18} className="text-gold-400" />;
      case 'WALLET': return <Wallet size={18} className="text-blue-400" />;
      case 'ESCROW': return <ShieldCheck size={18} className="text-emerald-400" />;
      case 'WITHDRAWAL': return <Download size={18} className="text-purple-400" />;
      default: return <TrendingUp size={18} className="text-white/40" />;
    }
  };

  const getToastTitle = (toast: any) => {
    if (isAr) {
      switch (toast.type) {
        case 'PAYMENT': return 'عملية دفع جديدة';
        case 'PAYMENT_SUCCESS': return 'تم تأكيد الدفع';
        case 'WALLET': return `معاملة محفظة (${toast.txnType})`;
        case 'ESCROW': return `تحديث الضمان (${toast.status})`;
        case 'WITHDRAWAL': return 'طلب سحب رصيد';
        default: return 'تنبيه مالي';
      }
    } else {
      switch (toast.type) {
        case 'PAYMENT': return 'New Payment Event';
        case 'PAYMENT_SUCCESS': return 'Payment Confirmed';
        case 'WALLET': return `Wallet Txn (${toast.txnType})`;
        case 'ESCROW': return `Escrow Update (${toast.status})`;
        case 'WITHDRAWAL': return 'Withdrawal Request';
        default: return 'Financial Alert';
      }
    }
  };

  return (
    <div className={`fixed bottom-8 ${isAr ? 'left-8' : 'right-8'} z-[200] flex flex-col gap-3 pointer-events-none`}>
      <AnimatePresence>
        {financialToasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: isAr ? -50 : 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            layout
            className="pointer-events-auto group relative w-80 bg-[#0A0908]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Progress Bar Background */}
            <motion.div 
              initial={{ width: '100%' }}
              animate={{ width: 0 }}
              transition={{ duration: 5, ease: 'linear' }}
              className="absolute bottom-0 left-0 h-0.5 bg-gold-500/50"
            />

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                {getToastIcon(toast.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-white uppercase tracking-tight truncate">
                  {getToastTitle(toast)}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-mono font-black text-gold-500">
                    {Number(toast.amount).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gold-500/40 font-bold uppercase">AED</span>
                </div>
              </div>

              <button 
                onClick={() => removeFinancialToast(toast.id)}
                className="text-white/20 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Subtle glow on hover */}
            <div className="absolute inset-0 bg-gold-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
