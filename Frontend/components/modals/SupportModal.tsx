import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, ChevronDown, CheckCircle, Loader2, Mail, User, HelpCircle, PhoneCall } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileStore } from '../../stores/useProfileStore';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const { user } = useProfileStore();
  const isRTL = language === 'ar';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [countryCode, setCountryCode] = useState('+966');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [isRegisteredUser, setIsRegisteredUser] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const countries = [
    { code: '+966', flag: '🇸🇦' },
    { code: '+971', flag: '🇦🇪' },
    { code: '+973', flag: '🇧🇭' },
    { code: '+974', flag: '🇶🇦' },
    { code: '+965', flag: '🇰🇼' },
    { code: '+968', flag: '🇴🇲' },
  ];

  useEffect(() => {
    if (isOpen) {
        setStatus('idle');
        setIsRegisteredUser(false);
        setFormError(null);
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                subject: '',
                message: ''
            });
        } else {
            setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        }
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    setFormError(null);

    if (!formData.name || !formData.email || !formData.message) {
        setFormError(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
        return;
    }

    setStatus('sending');
    try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/public-support`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                phone: formData.phone ? `${countryCode}${formData.phone}` : '',
                userId: user?.id,
                source: 'LANDING'
            })
        });
        if (!response.ok) throw new Error();
        
        const data = await response.json();
        setIsRegisteredUser(!!data.isRegistered);
        setStatus('success');
    } catch {
        setStatus('error');
        setFormError(isRTL ? 'فشل الإرسال. حاول مرة أخرى' : 'Failed to send. Try again');
    }
  };

  // Animation variants for 2026 performance standards
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <motion.div
           initial={{ y: 30, opacity: 0, scale: 0.98 }}
           animate={{ y: 0, opacity: 1, scale: 1 }}
           exit={{ y: 30, opacity: 0, scale: 0.98 }}
           transition={{ type: 'spring', stiffness: 400, damping: 40 }}
           className="bg-[#121212] border border-gold-500/20 rounded-[2rem] w-full max-w-[480px] max-h-[min(90vh,700px)] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative flex flex-col"
           onClick={(e) => e.stopPropagation()}
           dir={isRTL ? 'rtl' : 'ltr'}
        >
            <AnimatePresence mode="wait">
                {status === 'success' ? (
                     <motion.div 
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-12 px-6 flex flex-col items-center text-center"
                     >
                        <div className="w-20 h-20 bg-gold-500/10 rounded-full flex items-center justify-center mb-6 border border-gold-500/20">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                            >
                                <CheckCircle size={40} className="text-gold-500" />
                            </motion.div>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">
                            {isRTL ? 'تم استلام رسالتك' : 'Message Received'}
                        </h3>
                        <p className="text-white/50 text-base mb-8 max-w-xs leading-relaxed">
                            {isRegisteredUser ? (
                                isRTL 
                                ? 'أنت مسجل بالفعل على منصتنا، سيصلك الرد قريباً عبر حسابك الخاص بمركز الدعم. شكراً لك.' 
                                : 'You are already registered! Our response will reach your private platform account shortly. Thank you.'
                            ) : (
                                isRTL 
                                ? 'شكراً لتواصلك معنا. سيقوم فريق الدعم بمراجعة طلبك والرد عليك عبر البريد الإلكتروني في أقرب وقت ممكن.' 
                                : 'Thank you for reaching out. Our support team will review your request and reply via email shortly.'
                            )}
                        </p>
                        <button 
                            onClick={onClose}
                            className="bg-gold-500 hover:bg-gold-400 text-black px-10 py-3.5 rounded-xl font-black transition-all active:scale-95 shadow-[0_10px_30px_rgba(184,146,64,0.3)]"
                        >
                            {isRTL ? 'إغلاق' : 'Close'}
                        </button>
                     </motion.div>
                ) : (
                  <motion.div 
                    key="form"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col h-full overflow-hidden"
                  >
                      {/* Header (Fixed) */}
                      <motion.div variants={itemVariants} className="p-6 pb-4 flex justify-between items-start border-b border-white/5 bg-white/[0.01]">
                        <div>
                            <h3 className="text-2xl font-black text-white mb-1 leading-none flex items-center gap-2">
                                {isRTL ? 'تواصل معنا' : 'Get in Touch'}
                                <span className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-pulse" />
                            </h3>
                            <p className="text-gold-500/60 font-medium text-[11px] tracking-wide">
                                {isRTL ? 'نحن هنا لمساعدتك دائماً' : 'We are here to help you'}
                            </p>
                        </div>
                        <button onClick={onClose} className="bg-white/5 hover:bg-gold-500/10 p-2.5 rounded-xl text-white/50 hover:text-gold-500 transition-colors">
                          <X size={18} />
                        </button>
                      </motion.div>

                      {/* Main Form Fields (Scrollable) */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {formError && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-[11px] font-bold flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                                    {formError}
                                </motion.div>
                            )}

                            {/* Name Field */}
                            <motion.div variants={itemVariants} className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-white/20 tracking-[0.15em] px-1 flex items-center gap-2">
                                    <User size={10} className="text-gold-500" />
                                    {isRTL ? 'الاسم بالكامل' : 'Full Name'}
                                    <span className="text-gold-500/50">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-white/[0.02] border border-white/10 hover:border-white/20 focus:border-gold-500 focus:bg-gold-500/[0.01] rounded-xl px-4 py-3 text-white outline-none transition-all placeholder:text-white/5 font-bold text-sm"
                                    placeholder={isRTL ? 'أدخل اسمك هنا' : 'Enter your name'}
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </motion.div>

                            {/* Email Address */}
                            <motion.div variants={itemVariants} className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-white/20 tracking-[0.15em] px-1 flex items-center gap-2">
                                    <Mail size={10} className="text-gold-500" />
                                    {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
                                    <span className="text-gold-500/50">*</span>
                                </label>
                                <input 
                                    type="email" 
                                    required
                                    className="w-full bg-white/[0.02] border border-white/10 hover:border-white/20 focus:border-gold-500 focus:bg-gold-500/[0.01] rounded-xl px-4 py-3 text-white outline-none transition-all placeholder:text-white/5 font-bold text-sm"
                                    placeholder="mail@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </motion.div>

                            {/* Phone Number */}
                            <motion.div variants={itemVariants} className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-white/20 tracking-[0.15em] px-1 flex items-center gap-2">
                                    <PhoneCall size={10} className="text-gold-500" />
                                    {isRTL ? 'رقم الجوال' : 'Phone Number'}
                                </label>
                                <div className="flex bg-white/[0.02] border border-white/10 hover:border-white/20 focus-within:border-gold-500 rounded-xl overflow-hidden transition-all h-[46px]">
                                    <select 
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="bg-transparent text-white px-3 font-bold outline-none cursor-pointer border-r border-white/10 text-xs"
                                    >
                                        {countries.map(c => <option key={c.code} value={c.code} className="bg-[#121212]">{c.flag}</option>)}
                                    </select>
                                    <input 
                                        type="tel" 
                                        className="w-full bg-transparent px-4 text-white outline-none placeholder:text-white/5 font-bold text-sm"
                                        placeholder="5XXXXXXXX"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 9)})}
                                    />
                                </div>
                            </motion.div>

                            {/* Subject Field */}
                            <motion.div variants={itemVariants} className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-white/20 tracking-[0.15em] px-1 flex items-center gap-2">
                                    <HelpCircle size={10} className="text-gold-500" />
                                    {isRTL ? 'الموضوع' : 'Subject'}
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full bg-white/[0.02] border border-white/10 hover:border-white/20 focus:border-gold-500 focus:bg-gold-500/[0.01] rounded-xl px-4 py-3 text-white outline-none transition-all placeholder:text-white/5 font-bold text-sm"
                                    placeholder={isRTL ? 'بماذا يمكننا مساعدتك؟' : 'How can we help?'}
                                    value={formData.subject}
                                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                />
                            </motion.div>

                            {/* Message Field */}
                            <motion.div variants={itemVariants} className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-white/20 tracking-[0.15em] px-1 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1 h-1 bg-gold-500 rounded-full" />
                                        {isRTL ? 'تفاصيل الرسالة' : 'Message Details'}
                                    </div>
                                    <span className="text-[8px] text-white/10 tracking-widest">{formData.message.length}/500</span>
                                </label>
                                <textarea 
                                    rows={3}
                                    required
                                    className="w-full bg-white/[0.02] border border-white/10 hover:border-white/20 focus:border-gold-500 focus:bg-gold-500/[0.01] rounded-xl px-4 py-3 text-white outline-none transition-all placeholder:text-white/5 font-bold text-sm resize-none"
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                />
                            </motion.div>

                            {/* Submit Button */}
                            <motion.div variants={itemVariants} className="pt-2">
                                <button 
                                    type="submit"
                                    disabled={status === 'sending'}
                                    className="w-full group bg-gold-500 hover:bg-gold-400 p-[1px] rounded-xl overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    <div className="bg-[#121212] group-hover:bg-transparent transition-all py-3 px-6 rounded-xl flex items-center justify-center gap-3">
                                        {status === 'sending' ? (
                                            <Loader2 className="animate-spin text-gold-500" size={18} />
                                        ) : (
                                            <>
                                                <span className="text-white font-black uppercase tracking-widest text-[11px]">
                                                    {isRTL ? 'إرسال الرسالة' : 'Send Message'}
                                                </span>
                                                <Send size={14} className={`text-gold-500 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 ${isRTL ? 'rotate-180' : ''}`} />
                                            </>
                                        )}
                                    </div>
                                </button>
                            </motion.div>
                        </form>
                      </div>
                  </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};