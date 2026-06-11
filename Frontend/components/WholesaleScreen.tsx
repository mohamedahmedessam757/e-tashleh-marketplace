import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Mail, ArrowRight, ArrowLeft, Phone, Info, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface WholesaleScreenProps {
    onBack: () => void;
}

export const WholesaleScreen: React.FC<WholesaleScreenProps> = ({ onBack }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

    return (
        <div className="min-h-screen bg-[#1A1814] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl relative z-10"
            >
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl">
                        <img
                            src="/logo.png"
                            alt="E-Tashleh Logo"
                            className="w-full h-full object-contain p-3 brightness-0 invert"
                        />
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-[#1F1D19] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative group">
                    {/* Green Header */}
                    <div className="bg-[#2E965E] p-4 flex items-center justify-center gap-3">
                        <ShoppingCart className="text-white w-6 h-6" />
                        <h1 className="text-xl md:text-2xl font-bold text-white">
                            {t.wholesale?.title || 'طلبات الجملة للشركات'}
                        </h1>
                    </div>

                    <div className="p-6 md:p-10 text-center space-y-8">

                        {/* Welcome Section */}
                        <div>
                            <h2 className="text-2xl font-bold text-white relative inline-block pb-2">
                                {t.wholesale?.welcome || 'مرحباً بكم'}
                                <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#2E965E] rounded-full"></span>
                            </h2>
                        </div>

                        {/* Email Icon */}
                        <div className="flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-[#2E965E]/10 flex items-center justify-center text-[#2E965E]">
                                <Mail size={32} />
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="space-y-4">
                            <p className="text-white/80 text-lg">
                                {t.wholesale?.instruction || 'لطلبات الجملة للشركات فضلاً ارسال خطاب الشركة الى الايميل التالي:'}
                            </p>

                            <div className="border border-[#2E965E]/30 bg-[#2E965E]/5 rounded-xl p-6 py-8">
                                <p className="text-[#2E965E] text-sm mb-2 font-medium">
                                    {t.wholesale?.emailLabel || 'البريد الإلكتروني'}
                                </p>
                                <a
                                    href="mailto:shop@e-tashleh.shop"
                                    className="text-2xl md:text-3xl font-bold text-white hover:text-[#2E965E] transition-colors dir-ltr font-mono"
                                >
                                    {t.wholesale?.email || 'shop@e-tashleh.shop'}
                                </a>
                            </div>

                            <p className="text-white/60">
                                {t.wholesale?.followUp || 'وسيتم التواصل معكم عبر أحد مدراء المبيعات'}
                            </p>
                        </div>

                        {/* Success Banner */}
                        <div className="bg-[#2E965E]/10 border border-[#2E965E]/20 p-4 rounded-xl">
                            <p className="text-[#2E965E] font-bold">
                                {t.wholesale?.thanks || 'شكراً لثقتكم ونتمنى لكم التوفيق'}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            <a
                                href="mailto:shop@e-tashleh.shop"
                                className="flex items-center justify-center gap-2 bg-[#2E965E] hover:bg-[#257a4d] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-[#2E965E]/20 active:scale-95"
                            >
                                <Send size={18} />
                                <span>{t.wholesale?.sendRequest || 'إرسال طلب جملة'}</span>
                            </a>
                            <button
                                onClick={onBack}
                                className="flex items-center justify-center gap-2 bg-[#333] hover:bg-[#444] text-white px-8 py-3 rounded-xl font-bold transition-all active:scale-95 border border-white/5"
                            >
                                <span className="mt-1">{t.wholesale?.backHome || 'العودة للرئيسية'}</span>
                                <ArrowIcon size={18} />
                            </button>
                        </div>

                    </div>
                </div>

                {/* Bottom Info Cards */}
                <div className="grid md:grid-cols-2 gap-4 mt-6">

                    <div className="bg-white/5 border border-white/5 rounded-xl p-5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-blue-500/10 text-blue-400">
                                <Phone size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold mb-1">
                                    {t.wholesale?.contactInfo || 'معلومات التواصل'}
                                </h3>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    {t.wholesale?.contactDesc || 'يمكنكم التواصل معنا عبر البريد الإلكتروني، أو زيارة موقعنا للحصول على المزيد من المعلومات حول خدماتنا'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-xl p-5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-gold-500/10 text-gold-400">
                                <Info size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold mb-1">
                                    {t.wholesale?.howItWorks || 'كيفية العمل'}
                                </h3>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    {t.wholesale?.howItWorksDesc || 'بعد إرسال خطاب الشركة، سيتواصل معكم أحد مدراء المبيعات خلال 24-48 ساعة لمناقشة تفاصيل طلبكم'}
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

            </motion.div>
        </div>
    );
};
