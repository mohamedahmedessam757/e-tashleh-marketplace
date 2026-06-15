import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LandingFooter } from './LandingFooter';
import { LanguageToggle } from './ui/LanguageToggle';

interface HowWeWorkTutorialProps {
    onComplete: () => void; // "انتقل للطلب الآن"
    onBack: () => void;     // Back to previous
    onOpenSupport: () => void;
    onAdminClick: () => void;
    onNavigateToLegal: (section: 'terms' | 'privacy') => void;
    onNavigateToLandingSection: (section: string) => void;
    onNavigateToLicense?: () => void;
}

export const HowWeWorkTutorial: React.FC<HowWeWorkTutorialProps> = ({
    onComplete,
    onBack,
    onOpenSupport,
    onAdminClick,
    onNavigateToLegal,
    onNavigateToLandingSection,
    onNavigateToLicense,
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

    const steps = [
        "التسجيل.",
        "إدخال بيانات السيارة والقطع المطلوبة.",
        {
            title: "اختيار نوعية الشحن:",
            items: [
                { title: "الشحن المفرد:", desc: "يتم شحن طلب واحد بشحنة واحدة" },
                { title: "تجميع الشحنات:", desc: "في حالة وجود أكثر من قطعة في الطلب الواحد يتم اختيار تجميع القطع لشحنها بشحنة واحدة." }
            ],
            warning: {
                title: "يشترط في حال طلب تجميع الشحنات:",
                items: [
                    "دفع قيمة المنتجات قبل انتقالها لسلة التجميع.",
                    "أقصى مدة لبقائها في سلة تجميع الشحنات 7 أيام."
                ]
            }
        },
        "استقبال العروض المقدمة من التشاليح في الإمارات خلال ٢٤ ساعة من تقديم طلبك.",
        "يختار العميل العرض المناسب بالاتفاق مع البائع عبر الموقع ومدة العرض 48 ساعة فقط.",
        "بعد اختيار العرض المناسب تأكيد عنوان الشحن.",
        "الموافقة على الشروط والأحكام.",
        "الدفع وإصدار الفاتورة.",
        "طلبات التجميع ستذهب لسلة التجميع ولن تشحن إلا بطلب من العميل.",
        "إصدار بوليصة الشحن وتجهيز الطلب لشركة الشحن.",
        "تسليم الطلب للعميل والتأكد منه ومطابقته للفاتورة."
    ];

    return (
        <div className="min-h-screen bg-[#1A1814] flex flex-col relative overflow-x-hidden">
            <div className="fixed top-4 z-20 end-4">
                <LanguageToggle compact />
            </div>
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-luxury-gradient opacity-20" />
                <div className="absolute top-0 left-0 w-full h-full "
                    style={{
                        backgroundImage: `
                        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
                    `,
                        backgroundSize: '60px 60px',
                    }}
                />
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 flex-grow">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-10"
                >
                    <button
                        onClick={onBack}
                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        {isAr ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
                    </button>
                    <h1 className="text-3xl font-bold text-white tracking-wide">
                        {isAr ? 'كيف نعمل:' : 'How We Work:'}
                    </h1>
                </motion.div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl">
                    <div className="space-y-6">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: isAr ? 20 : -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-start gap-4"
                            >
                                <span className="bg-gradient-to-br from-gold-500 to-gold-700 text-[#1A1814] font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                                    {index + 1}
                                </span>

                                <div className="flex-1 mt-1 text-white/90 text-sm md:text-base leading-relaxed">
                                    {typeof step === 'string' ? (
                                        <p>{step}</p>
                                    ) : (
                                        <div>
                                            <p className="font-semibold text-gold-400 mb-3">{step.title}</p>
                                            <div className="space-y-3 pr-2 md:pr-4">
                                                {step.items.map((sub, i) => (
                                                    <p key={i}>
                                                        <span className="font-semibold text-gold-300">{sub.title}</span> {sub.desc}
                                                    </p>
                                                ))}

                                                {step.warning && (
                                                    <div className="bg-orange-500/10 border-r-4 border-orange-500 p-4 mt-4 rounded-lg">
                                                        <p className="font-semibold text-orange-400 mb-2">{step.warning.title}</p>
                                                        <ul className="space-y-2 text-orange-200/80 pr-4">
                                                            {step.warning.items.map((warn, i) => (
                                                                <li key={i} className="flex items-start gap-2">
                                                                    <span className="text-orange-500 mt-1">•</span>
                                                                    <span>{warn}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Disclaimer Box */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-12 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6"
                    >
                        <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                            <Info size={24} />
                            {isAr ? 'تنويه:' : 'Disclaimer:'}
                        </h3>
                        <ul className="space-y-4 text-white/80">
                            {[
                                "يضمن الموقع قيمة المشتريات وعدم تسليم قيمتها للبائع إلا بعد استلام العميل للقطعة والتأكد منها.",
                                "يضمن الموقع تطبيق سياسة الإرجاع والاستبدال والإلغاء.",
                                "يضمن الموقع تطبيق سياسة عدم تضرر السلع من الشحن أو تأخرها عن المتفق عليه مع شركات الشحن."
                            ].map((text, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <CheckCircle2 className="text-blue-400 shrink-0 mt-0.5" size={20} />
                                    <span>{text}</span>
                                </li>
                            ))}
                            <li className="flex items-start gap-3">
                                <AlertCircle className="text-gold-400 shrink-0 mt-0.5" size={20} />
                                <span>
                                    {isAr ? 'تطبق ' : 'Subject to '}
                                    <button
                                        onClick={() => onNavigateToLegal('terms')}
                                        className="text-gold-400 hover:text-gold-300 underline font-semibold mx-1"
                                    >
                                        {isAr ? 'الشروط والأحكام' : 'Terms and Conditions'}
                                    </button>
                                </span>
                            </li>
                        </ul>
                    </motion.div>
                </div>

                {/* Main Action Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex justify-center mt-12 mb-8"
                >
                    <button
                        onClick={onComplete}
                        className="px-8 md:px-12 py-4 bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-white rounded-xl font-bold shadow-[0_4px_20px_rgba(168,139,62,0.3)] hover:shadow-[0_6px_25px_rgba(168,139,62,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
                    >
                        {isAr && <ArrowIcon size={24} />}
                        {isAr ? 'انتقل للطلب الآن' : 'Order Now'}
                        {!isAr && <ArrowIcon size={24} />}
                    </button>
                </motion.div>
            </div>

            {/* Footer Section */}
            <div className="relative z-10 w-full mt-auto bg-[#1A1814]">
                <LandingFooter
                    onOpenSupport={onOpenSupport}
                    onAdminClick={onAdminClick}
                    onNavigateToLegal={onNavigateToLegal}
                    onNavigateToLandingSection={onNavigateToLandingSection}
                    onNavigateToLicense={onNavigateToLicense}
                />
            </div>
        </div>
    );
};
