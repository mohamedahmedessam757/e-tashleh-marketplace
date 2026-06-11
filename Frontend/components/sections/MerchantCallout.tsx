import React from 'react';
import { Container } from '../ui/Container';
import { TrendingUp, Wallet, Headset, Truck, Store, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

interface MerchantCalloutProps {
  onRegister: () => void;
}

export const MerchantCallout: React.FC<MerchantCalloutProps> = ({ onRegister }) => {
  const { t, language } = useLanguage();
  const ArrowIcon = language === 'ar' ? ArrowLeft : ArrowRight;

  const features = [
    { icon: TrendingUp, ...t.merchants.features.expansion, color: "gold" },
    { icon: Wallet, ...t.merchants.features.profit, color: "green" },
    { icon: Truck, ...t.merchants.features.shipping, color: "blue" },
    { icon: Headset, ...t.merchants.features.support, color: "purple" }
  ];

  return (
    <section id="merchants" className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#0F0D0A] z-0" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-900/40 via-transparent to-transparent z-0" />

        <Container className="relative z-10">
            <div className="bg-gradient-to-r from-gold-600/10 to-[#1A1814] border border-gold-500/10 rounded-3xl p-6 md:p-12 overflow-hidden relative backdrop-blur-md">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 text-[10px] md:text-xs font-bold mb-4 md:mb-6 border border-gold-500/20">
                            <Store size={14} />
                            {t.merchants.badge}
                        </div>
                        <h2 className="text-2xl md:text-5xl font-bold text-white mb-4 md:mb-6">
                            {t.merchants.title} <span className="text-gold-500">e-tashleh</span>
                        </h2>
                        <p className="text-white/70 text-sm md:text-lg mb-6 md:mb-8 leading-relaxed max-w-md">
                            {t.merchants.desc}
                        </p>

                        <ul className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                            {t.merchants.benefits.map((feat, i) => (
                                <li key={i} className="flex items-center gap-3 text-white/90 text-sm md:text-base">
                                    <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 shrink-0">
                                        <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    {feat}
                                </li>
                            ))}
                        </ul>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button 
                                onClick={onRegister}
                                className="w-full sm:w-auto px-8 py-3 bg-gold-500 hover:bg-gold-600 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(168,139,62,0.3)] hover:shadow-[0_0_30px_rgba(168,139,62,0.5)] flex items-center justify-center gap-2 group active:scale-[0.98]"
                            >
                                <span>{t.merchants.cta}</span>
                                <ArrowIcon size={18} className={`group-hover:${language === 'ar' ? '-' : ''}translate-x-1 transition-transform`} />
                            </button>
                            <div className="flex items-center justify-center sm:justify-start text-xs md:text-sm text-white/60">
                                <span className="hover:text-gold-300 cursor-pointer transition-colors p-2">{t.merchants.contact}</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative mt-4 lg:mt-0">
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                             {features.map((item, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`
                                        group relative p-4 md:p-6 rounded-2xl bg-[#1F1D19] border border-white/5 
                                        hover:border-gold-500/30 transition-all duration-500 overflow-hidden
                                        ${idx % 2 !== 0 ? 'lg:mt-8' : ''}
                                    `}
                                >
                                    <div className={`absolute -right-10 -top-10 w-24 h-24 bg-${item.color}-500/10 rounded-full blur-2xl group-hover:bg-${item.color}-500/20 transition-all duration-500`} />
                                    
                                    <div className="relative z-10 flex flex-col items-center text-center">
                                        <div className={`
                                            w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl mb-3 md:mb-4 flex items-center justify-center 
                                            bg-gradient-to-br from-white/5 to-white/0 border border-white/10
                                            text-${item.color === 'gold' ? 'yellow' : item.color}-400
                                            group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-${item.color}-500/10
                                            transition-all duration-300
                                        `}>
                                            <item.icon size={20} className="md:w-7 md:h-7" strokeWidth={1.5} />
                                        </div>
                                        <h4 className="font-bold text-white mb-1 text-sm md:text-base group-hover:text-gold-200 transition-colors">
                                            {item.title}
                                        </h4>
                                        <p className="text-[10px] md:text-xs text-white/50 group-hover:text-white/70 transition-colors">
                                            {item.desc}
                                        </p>
                                    </div>
                                </motion.div>
                             ))}
                        </div>
                        
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[200px] max-h-[200px] bg-gold-500/5 blur-[80px] -z-10" />
                    </div>
                </div>
            </div>
        </Container>
    </section>
  );
};