
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ThreeDSecureModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  amount: number;
}

export const ThreeDSecureModal: React.FC<ThreeDSecureModalProps> = ({ isOpen, onSuccess, onCancel, amount }) => {
  const { t, language } = useLanguage();
  const [otp, setOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (isOpen) {
      setTimer(60);
      setOtp('');
      const interval = setInterval(() => setTimer(t => t > 0 ? t - 1 : 0), 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleVerify = () => {
    if (otp.length < 4) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl relative"
        >
          {/* Bank Header (Simulated) */}
          <div className="bg-[#002B5C] p-4 flex justify-between items-center">
             <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                     <ShieldCheck size={18} className="text-[#002B5C]" />
                 </div>
                 <span className="text-white font-bold text-sm tracking-wider">SECURE BANK</span>
             </div>
             <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4 brightness-200" alt="Visa" />
          </div>

          <div className="p-6">
             <div className="text-center mb-6">
                 <h3 className="text-gray-800 font-bold text-lg mb-1">{t.dashboard.threeDS.title}</h3>
                 <p className="text-gray-500 text-xs">{t.dashboard.threeDS.subtitle}</p>
             </div>

             <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6 space-y-2 text-sm">
                 <div className="flex justify-between">
                     <span className="text-gray-500">{t.dashboard.threeDS.amount}:</span>
                     <span className="font-bold text-gray-800">{amount.toLocaleString()} SAR</span>
                 </div>
                 <div className="flex justify-between">
                     <span className="text-gray-500">{t.dashboard.threeDS.date}:</span>
                     <span className="font-bold text-gray-800">{new Date().toLocaleDateString()}</span>
                 </div>
                 <div className="flex justify-between">
                     <span className="text-gray-500">{t.dashboard.threeDS.card}:</span>
                     <span className="font-bold text-gray-800">**** 4242</span>
                 </div>
             </div>

             <div className="mb-6">
                 <label className="block text-gray-600 text-xs font-bold mb-2">{t.dashboard.threeDS.otpLabel}</label>
                 <input 
                    type="text" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-xl tracking-[0.5em] font-mono focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C] outline-none text-gray-800"
                    placeholder="000000"
                    autoFocus
                 />
                 <div className="flex justify-between items-center mt-2">
                     <span className="text-xs text-red-500 font-medium">00:{timer.toString().padStart(2, '0')}</span>
                     <button className="text-xs text-blue-600 hover:underline" disabled={timer > 0}>
                         {t.dashboard.threeDS.resend}
                     </button>
                 </div>
             </div>

             <div className="flex flex-col gap-3">
                 <button 
                    onClick={handleVerify}
                    disabled={otp.length < 4 || isProcessing}
                    className="w-full bg-[#002B5C] hover:bg-[#001f42] text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                 >
                     {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Lock size={16} />}
                     {t.dashboard.threeDS.verify}
                 </button>
                 <button 
                    onClick={onCancel}
                    className="w-full text-gray-400 hover:text-gray-600 text-sm font-medium"
                 >
                     {t.dashboard.threeDS.cancel}
                 </button>
             </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
