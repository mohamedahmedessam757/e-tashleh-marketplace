import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Mail, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { OtpErrorCard } from './OtpErrorCard';

interface OTPMethodSelectionProps {
    onSelect: (method: 'email' | 'whatsapp') => void | Promise<void>;
    email: string;
    name?: string;
    isLoading?: boolean;
    error?: string | null;
}

export const OTPMethodSelection: React.FC<OTPMethodSelectionProps> = ({
    onSelect,
    email,
    name,
    isLoading = false,
    error,
}) => {
    const { t } = useLanguage();

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">{t.auth.otp.selectMethod?.title || 'طريقة التحقق'}</h2>
                <div className="text-white/60 text-sm">
                    {name && <div className="text-white font-bold mb-1 text-lg">{name}</div>}
                    {t.auth.otp.selectMethod?.subtitle || 'كيف تود استلام رمز التحقق؟'}
                    <div className="text-gold-400 font-mono mt-1 ltr:font-mono">{email}</div>
                </div>
            </div>

            {error && <OtpErrorCard message={error} />}

            {isLoading && (
                <div className="flex items-center justify-center gap-2 text-white/50 text-sm py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.auth.otp.verifying || 'Sending code...'}
                </div>
            )}

            <div className="space-y-3">
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void onSelect('whatsapp')}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-green-500/5 border border-green-500/10 hover:bg-green-500/10 transition-all group active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                            <MessageSquare size={20} />
                        </div>
                        <div className="text-right rtl:text-right ltr:text-left">
                            <span className="block text-white font-bold text-sm">{t.auth.otp.whatsapp}</span>
                            <span className="text-white/40 text-xs">WhatsApp</span>
                        </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-white/10 group-hover:border-green-500 transition-colors relative flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </button>

                <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void onSelect('email')}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-gold-500/5 border border-gold-500/10 hover:bg-gold-500/10 transition-all group active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-400 group-hover:scale-110 transition-transform">
                            <Mail size={20} />
                        </div>
                        <div className="text-right rtl:text-right ltr:text-left">
                            <span className="block text-white font-bold text-sm">{t.auth.otp.emailAlt}</span>
                            <span className="text-white/40 text-xs">Email</span>
                        </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-white/10 group-hover:border-gold-500 transition-colors relative flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-gold-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </button>
            </div>
        </motion.div>
    );
};
