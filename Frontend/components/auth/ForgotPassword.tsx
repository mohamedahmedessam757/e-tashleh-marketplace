import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
  onSuccess: () => void; // Could navigate to ResetPassword for demo flow
}

const InputField = ({ icon: Icon, type, placeholder, value, onChange }: any) => (
  <div className="relative group">
    <Icon className="absolute top-3.5 right-3.5 w-5 h-5 text-white/40 group-focus-within:text-gold-500 transition-colors pointer-events-none" />
    <input 
      type={type}
      required
      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-white focus:border-gold-500 outline-none transition-all placeholder-white/20"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
);

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToLogin, onSuccess }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Security Validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setStatus('loading');

    // Simulate Secure API Call (Token Generation)
    setTimeout(() => {
      setStatus('success');
      // In a real app, this would send an email. 
      // For this demo flow, we might auto-redirect to reset page after a delay
      setTimeout(() => {
        onSuccess();
      }, 3000);
    }, 2000);
  };

  if (status === 'success') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center text-green-400 border border-green-500/20">
          <CheckCircle2 size={40} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{t.auth.forgot.successTitle}</h2>
          <p className="text-white/60 text-sm leading-relaxed px-4">{t.auth.forgot.successMsg}</p>
        </div>
        <div className="p-3 bg-gold-500/10 border border-gold-500/20 rounded-xl text-gold-300 text-xs">
           {t.auth.forgot.otpNote}
        </div>
        <button 
          onClick={onBackToLogin}
          className="text-white/40 hover:text-white text-sm transition-colors pt-4"
        >
          {t.auth.forgot.backToLogin}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{t.auth.forgot.title}</h2>
        <p className="text-white/60 text-sm">{t.auth.forgot.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <InputField 
          icon={Mail} 
          type="email" 
          placeholder={t.auth.forgot.emailPlaceholder} 
          value={email}
          onChange={(e: any) => setEmail(e.target.value)}
        />

        <AnimatePresence>
            {error && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm justify-center"
                >
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </motion.div>
            )}
        </AnimatePresence>

        <button 
          type="submit" 
          disabled={status === 'loading'}
          className="w-full py-3.5 bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-white rounded-xl font-bold shadow-[0_4px_20px_rgba(168,139,62,0.3)] hover:shadow-[0_6px_25px_rgba(168,139,62,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {status === 'loading' ? <Loader2 className="animate-spin" /> : t.auth.forgot.submit}
        </button>
      </form>
      
      <div className="text-center border-t border-white/5 pt-4">
        <button 
          onClick={onBackToLogin}
          className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 mx-auto"
        >
           {t.auth.forgot.backToLogin}
        </button>
      </div>
    </div>
  );
};