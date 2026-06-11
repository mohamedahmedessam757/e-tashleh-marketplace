import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, ShieldCheck, AlertCircle, ArrowRight, ArrowLeft, KeyRound, Clock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { authApi } from '../../services/api/auth'; // Ensure this has the new recovery endpoints

interface AccountRecoveryWizardProps {
    onBackToLogin: () => void;
    role: 'customer' | 'merchant';
}

export const AccountRecoveryWizard: React.FC<AccountRecoveryWizardProps> = ({ onBackToLogin, role }) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const [step, setStep] = useState<number>(1);
    const [email, setEmail] = useState('');
    const [emailOtp, setEmailOtp] = useState(['', '', '', '', '', '']);
    const [countryCode, setCountryCode] = useState('+966');
    const [newPhone, setNewPhone] = useState('');
    const [phoneOtp, setPhoneOtp] = useState(['', '', '', '', '', '']);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shake, setShake] = useState(false);

    // Security States
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [showCaptcha, setShowCaptcha] = useState(false);

    const [resultStatus, setResultStatus] = useState<'APPROVED' | 'PENDING_REVIEW' | null>(null);
    const [resultMessage, setResultMessage] = useState('');

    const countries = [
        { code: '+966', name: isAr ? 'السعودية' : 'Saudi Arabia', flag: '🇸🇦' },
        { code: '+971', name: isAr ? 'الإمارات' : 'UAE', flag: '🇦🇪' },
        { code: '+973', name: isAr ? 'البحرين' : 'Bahrain', flag: '🇧🇭' },
        { code: '+974', name: isAr ? 'قطر' : 'Qatar', flag: '🇶🇦' },
        { code: '+965', name: isAr ? 'الكويت' : 'Kuwait', flag: '🇰🇼' },
        { code: '+968', name: isAr ? 'عمان' : 'Oman', flag: '🇴🇲' },
    ];

    const triggerError = (msg: string) => {
        setError(msg);
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleRequestEmailOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.includes('@')) {
            triggerError(isAr ? 'البريد الإلكتروني غير صالح' : 'Invalid email address');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await authApi.requestRecoveryEmailOtp(email, role);
            setStep(2);
        } catch (err: any) {
            triggerError(err.response?.data?.message || err.message || 'Error requesting OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyEmailOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpString = emailOtp.join('');
        if (otpString.length !== 6) {
            triggerError(isAr ? 'الرمز غير مكتمل' : 'Incomplete code');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await authApi.verifyRecoveryEmailOtp(email, otpString, role);
            setStep(3);
        } catch (err: any) {
            triggerError(err.response?.data?.message || err.message || 'Invalid OTP');
            setFailedAttempts(prev => {
                const newCount = prev + 1;
                if (newCount >= 5) setShowCaptcha(true);
                return newCount;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestPhoneOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPhone.length !== 9 || !newPhone.startsWith('5')) {
            triggerError(isAr ? 'رقم الجوال يجب أن يبدأ بـ 5 ومكون من 9 أرقام' : 'Phone must start with 5 and be 9 digits');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await authApi.requestRecoveryPhoneOtp(email, countryCode + newPhone, role);
            setStep(4);
        } catch (err: any) {
            triggerError(err.response?.data?.message || err.message || 'Error requesting OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpString = phoneOtp.join('');
        if (otpString.length !== 6) {
            triggerError(isAr ? 'الرمز غير مكتمل' : 'Incomplete code');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const data = await authApi.submitRecovery(email, countryCode + newPhone, otpString, role);

            setResultStatus(data.action);
            setResultMessage(data.message);
            setStep(5);
        } catch (err: any) {
            triggerError(err.response?.data?.message || err.message || 'Error submitting recovery');
            setFailedAttempts(prev => {
                const newCount = prev + 1;
                if (newCount >= 5) setShowCaptcha(true);
                return newCount;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const renderOtpInputs = (otpArray: string[], setOtpArray: (val: string[]) => void) => {
        return (
            <div className="flex gap-2 justify-center" dir="ltr">
                {otpArray.map((digit, index) => (
                    <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            const newOtp = [...otpArray];
                            newOtp[index] = val;
                            setOtpArray(newOtp);
                            if (val && index < 5) {
                                document.getElementById(`otp-${index + 1}`)?.focus();
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !digit && index > 0) {
                                document.getElementById(`otp-${index - 1}`)?.focus();
                            }
                        }}
                        disabled={showCaptcha}
                        className={`w-12 h-14 text-center text-xl font-bold bg-[#1A1814] text-white border rounded-lg focus:outline-none transition-all disabled:opacity-50 ${(error || showCaptcha) ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] focus:border-red-500' : 'border-white/20 focus:border-gold-500'
                            }`}
                    />
                ))}
            </div>
        );
    };

    const getTitle = () => {
        const roleLabelAr = role === 'merchant' ? 'التاجر' : 'العميل';
        const roleLabelEn = role === 'merchant' ? 'Merchant' : 'Customer';

        if (step === 1) return isAr ? `استرجاع حساب ${roleLabelAr}` : `${roleLabelEn} Account Recovery`;
        if (step === 2) return isAr ? 'تحقق البريد الإلكتروني' : 'Email Verification';
        if (step === 3) return isAr ? 'رقم الجوال الجديد' : 'New Phone Number';
        if (step === 4) return isAr ? 'تحقق رقم الجوال' : 'Phone Verification';
        return isAr ? 'النتيجة' : 'Result';
    };

    return (
        <div className="max-w-md w-full mx-auto space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">{getTitle()}</h2>
                {step < 5 && (
                    <p className="text-white/60 text-sm">
                        {isAr ? 'حماية الحسابات وأموال العملاء هي أولويتنا' : 'Protecting accounts and funds is our priority'}
                    </p>
                )}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: isAr ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isAr ? 20 : -20 }}
                    className={`bg-white/5 border border-white/10 p-6 rounded-2xl ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
                >
                    {error && step < 5 && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-400">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {/* STEP 1: EMAIL */}
                    {step === 1 && (
                        <form onSubmit={handleRequestEmailOtp} className="space-y-6">
                            <div>
                                <label className="block text-sm text-gold-200 mb-2">{isAr ? 'البريد الإلكتروني المرتبط بالحساب' : 'Registered Email'}</label>
                                <div className="relative">
                                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        dir="ltr"
                                        className={`w-full bg-[#1A1814] border rounded-xl py-4 pr-12 pl-4 text-white placeholder-white/20 focus:outline-none transition-all ${error ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] focus:border-red-500' : 'border-white/10 focus:border-gold-500'
                                            }`}
                                        placeholder="example@domain.com"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || !email}
                                className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-white font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isAr ? 'إرسال الرمز' : 'Send Code')}
                            </button>
                        </form>
                    )}

                    {/* STEP 2: identity OTP (WhatsApp on registered number) */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyEmailOtp} className="space-y-6 text-center">
                            <p className="text-sm text-white/70">
                                {isAr
                                    ? 'تم إرسال رمز تحقق ذو 6 أرقام إلى واتساب الرقم المسجّل للحساب'
                                    : 'A 6-digit code was sent to WhatsApp on the phone registered for'}<br />
                                <strong className="text-gold-400">{email}</strong>
                            </p>

                            {renderOtpInputs(emailOtp, setEmailOtp)}

                            {showCaptcha ? (
                                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl space-y-4">
                                    <p className="text-red-400 font-bold text-sm">
                                        {isAr ? 'لقد تجاوزت الحد المسموح من المحاولات 🛑' : 'Too many failed attempts 🛑'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { setFailedAttempts(0); setShowCaptcha(false); setError(null); }}
                                        className="w-full py-3 bg-black/50 hover:bg-black/70 border border-white/20 text-white rounded-lg flex justify-center items-center gap-2 transition-all"
                                    >
                                        <ShieldCheck size={18} className="text-green-500" />
                                        {isAr ? 'أنا لست روبوت (Verify Captcha)' : 'I am human (Verify Captcha)'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isLoading || emailOtp.join('').length !== 6 || showCaptcha}
                                    className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isAr ? 'تحقق' : 'Verify')}
                                </button>
                            )}
                        </form>
                    )}

                    {/* STEP 3: NEW PHONE */}
                    {step === 3 && (
                        <form onSubmit={handleRequestPhoneOtp} className="space-y-6">
                            <div>
                                <label className="block text-sm text-gold-200 mb-2">{isAr ? 'رقم الجوال الجديد' : 'New Phone Number'}</label>
                                <div className="flex gap-2" dir="ltr">
                                    {/* Country Code Dropdown */}
                                    <div className="relative w-1/3 min-w-[120px]">
                                        <select
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            className="w-full h-full bg-[#1A1814] border border-white/10 rounded-xl px-3 py-4 text-white appearance-none outline-none focus:border-gold-500 transition-all text-sm cursor-pointer font-sans"
                                            style={{ direction: 'ltr' }}
                                        >
                                            {countries.map((c) => (
                                                <option key={c.code} value={c.code} className="bg-[#1A1814] text-white">
                                                    {c.flag} {c.code}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                                            <ArrowRight className="w-4 h-4 rotate-90" />
                                        </div>
                                    </div>
                                    <div className="relative flex-1">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                                        <input
                                            type="tel"
                                            required
                                            maxLength={9}
                                            value={newPhone}
                                            onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                                            className="w-full bg-[#1A1814] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-lg tracking-wider placeholder-white/20 focus:border-gold-500 focus:outline-none transition-all"
                                            placeholder="5 XX XXX XXX"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || newPhone.length !== 9}
                                className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isAr ? 'إرسال رمز التفعيل' : 'Send Activation Code')}
                            </button>
                        </form>
                    )}

                    {/* STEP 4: PHONE OTP */}
                    {step === 4 && (
                        <form onSubmit={handleSubmitRecovery} className="space-y-6 text-center">
                            <p className="text-sm text-white/70">
                                {isAr ? 'أدخل الرمز المرسل إلى' : 'Enter the code sent to'}<br />
                                <strong className="text-gold-400" dir="ltr">{countryCode} {newPhone}</strong>
                            </p>

                            {renderOtpInputs(phoneOtp, setPhoneOtp)}

                            {showCaptcha ? (
                                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl space-y-4">
                                    <p className="text-red-400 font-bold text-sm">
                                        {isAr ? 'لقد تجاوزت الحد المسموح من المحاولات 🛑' : 'Too many failed attempts 🛑'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { setFailedAttempts(0); setShowCaptcha(false); setError(null); }}
                                        className="w-full py-3 bg-black/50 hover:bg-black/70 border border-white/20 text-white rounded-lg flex justify-center items-center gap-2 transition-all"
                                    >
                                        <ShieldCheck size={18} className="text-green-500" />
                                        {isAr ? 'أنا لست روبوت (Verify Captcha)' : 'I am human (Verify Captcha)'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isLoading || phoneOtp.join('').length !== 6 || showCaptcha}
                                    className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isAr ? 'إرسال الطلب النهائي' : 'Submit Request')}
                                </button>
                            )}
                        </form>
                    )}

                    {/* STEP 5: FINAL RESULT */}
                    {step === 5 && (
                        <div className="text-center space-y-6 py-4">
                            {resultStatus === 'APPROVED' ? (
                                <>
                                    <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <ShieldCheck size={40} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{isAr ? 'تم تغيير الرقم بنجاح' : 'Phone Updated'}</h3>
                                    <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto">
                                        {isAr ? 'تم استرجاع حسابك وربطه برقم الجوال الجديد فوراً لعدم وجود مخاطر أمنية على الحساب.' : 'Your account was recovered and linked to the new phone securely.'}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                                        <ShieldCheck size={40} className="absolute opacity-20" />
                                        <Clock size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{isAr ? 'قيد المراجعة الأمنية' : 'Pending Security Review'}</h3>
                                    <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto">
                                        {resultMessage || (isAr ? 'حفاظاً على أمان حسابك (لوجود رصيد أو طلبات نشطة)، سيتم مراجعة الطلب من الإدارة خلال 24 ساعة.' : 'For your security due to active balances or orders, this request requires Admin approval within 24 hours.')}
                                    </p>
                                </>
                            )}

                            <button
                                onClick={onBackToLogin}
                                className="mt-8 w-full py-4 bg-[#1A1814] hover:bg-white/5 border border-white/10 text-white font-bold rounded-xl transition-all flex items-center justify-center"
                            >
                                {isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}
                            </button>
                        </div>
                    )}

                </motion.div>
            </AnimatePresence>

            {step < 5 && (
                <button
                    onClick={onBackToLogin}
                    className="w-full mt-4 text-center text-white/40 hover:text-white transition-colors text-sm py-2"
                >
                    {isAr ? 'إلغاء والعودة' : 'Cancel & Return'}
                </button>
            )}
        </div>
    );
};
