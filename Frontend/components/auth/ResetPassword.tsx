import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ResetPasswordProps {
  onLoginClick: () => void;
}

const PasswordField = ({ placeholder, value, onChange }: any) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative group">
      <Lock className="absolute top-3.5 right-3.5 w-5 h-5 text-white/40 group-focus-within:text-gold-500 transition-colors pointer-events-none" />
      <input 
        type={show ? "text" : "password"}
        required
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 pl-10 text-white focus:border-gold-500 outline-none transition-all placeholder-white/20"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <button 
        type="button"
        onClick={() => setShow(!show)}
        className="absolute top-3.5 left-3.5 text-white/30 hover:text-white transition-colors"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onLoginClick }) => {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({ password: '', confirm: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Secure Validation
    if (formData.password.length < 8) {
      setError(language === 'ar' ? 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirm) {
      setError(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    setStatus('loading');

    // Simulate Secure API Call
    setTimeout(() => {
      setStatus('success');
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
          <h2 className="text-2xl font-bold text-white mb-2">{t.auth.reset.successTitle}</h2>
          <p className="text-white/60 text-sm leading-relaxed px-4">{t.auth.reset.successMsg}</p>
        </div>
        <button 
          onClick={onLoginClick}
          className="w-full py-3.5 bg-gold-500 hover:bg-gold-600 text-white rounded-xl font-bold transition-all shadow-lg active:scale-[0.98]"
        >
          {t.auth.register.login}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{t.auth.reset.title}</h2>
        <p className="text-white/60 text-sm">{t.auth.reset.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        <PasswordField 
          placeholder={t.auth.reset.newPass} 
          value={formData.password}
          onChange={(e: any) => setFormData({...formData, password: e.target.value})}
        />

        <PasswordField 
          placeholder={t.auth.reset.confirmPass} 
          value={formData.confirm}
          onChange={(e: any) => setFormData({...formData, confirm: e.target.value})}
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
          {status === 'loading' ? <Loader2 className="animate-spin" /> : t.auth.reset.submit}
        </button>
      </form>
    </div>
  );
};