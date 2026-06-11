import React, { useState } from 'react';
import { Container } from '../ui/Container';
import { GlassCard } from '../ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, FileSearch, CreditCard, PackageCheck, Info } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const HowItWorks: React.FC = () => {
  const [activePhase, setActivePhase] = useState<number>(0);
  const { t, language } = useLanguage();

  const phaseIcons = [UserPlus, FileSearch, CreditCard, PackageCheck];

  return (
    <section id="how-it-works" className="py-16 md:py-24 relative overflow-hidden bg-[#12100E]">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className={`absolute top-1/4 ${language === 'ar' ? 'left-0' : 'right-0'} w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-gold-600/10 rounded-full blur-[80px] md:blur-[100px]`} />
         <div className={`absolute bottom-0 ${language === 'ar' ? 'right-0' : 'left-0'} w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-gold-900/10 rounded-full blur-[100px] md:blur-[120px]`} />
      </div>

      <Container className="relative z-10">
        <div className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl md:text-5xl font-bold text-white mb-4 md:mb-6">
                {t.howItWorks.title}
            </h2>
            <p className="text-white/60 text-sm md:text-lg max-w-2xl mx-auto px-4">
                {t.howItWorks.subtitle}
                <br />
                <span className="text-gold-400 text-xs md:text-sm mt-2 block">{t.howItWorks.clickHint}</span>
            </p>
        </div>

        <div className="flex flex-col gap-6 md:gap-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {t.howItWorks.phases.map((phase, idx) => {
                    const isActive = activePhase === idx;
                    const Icon = phaseIcons[idx];
                    return (
                        <button
                            key={idx}
                            onClick={() => setActivePhase(idx)}
                            className={`
                                relative p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 md:gap-3 group
                                ${isActive 
                                    ? 'bg-gold-500 text-white border-gold-400 shadow-[0_0_30px_rgba(168,139,62,0.3)] scale-[1.02] md:scale-105 z-10' 
                                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:border-white/20'
                                }
                            `}
                        >
                            <div className={`
                                w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors duration-300
                                ${isActive ? 'bg-white/20 text-white' : 'bg-black/20 text-gold-500'}
                            `}>
                                <Icon size={18} className="md:w-6 md:h-6" />
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] md:text-xs font-mono opacity-60 mb-1 block">0{idx + 1}</span>
                                <h3 className={`text-xs md:text-base font-bold ${isActive ? 'text-white' : 'text-white/80'}`}>{phase.title}</h3>
                            </div>
                            {isActive && (
                                <motion.div 
                                    layoutId="active-arrow"
                                    className="absolute -bottom-2 w-3 h-3 md:w-4 md:h-4 bg-gold-500 rotate-45"
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="relative min-h-[350px] md:min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activePhase}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                    >
                        <GlassCard className="border-gold-500/20 bg-[#1A1814]/90 p-6 md:p-12 relative overflow-hidden">
                            <div className={`absolute ${language === 'ar' ? '-left-6 md:-left-10' : '-right-6 md:-right-10'} -bottom-10 md:-bottom-20 text-[120px] md:text-[200px] font-bold text-white/[0.03] leading-none select-none pointer-events-none font-sans`}>
                                0{activePhase + 1}
                            </div>

                            <div className="relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                                <div>
                                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                                        <div className="p-2 bg-gold-500/20 rounded-lg text-gold-400">
                                            {React.createElement(phaseIcons[activePhase], { size: 24, className: "md:w-7 md:h-7" })}
                                        </div>
                                        <h3 className="text-xl md:text-3xl font-bold text-white">{t.howItWorks.phases[activePhase].title}</h3>
                                    </div>
                                    <p className={`text-white/60 text-sm md:text-lg mb-6 md:mb-8 ${language === 'ar' ? 'pl-4 border-l-2' : 'pr-4 border-r-2'} border-gold-500/30`}>
                                        {t.howItWorks.phases[activePhase].desc}
                                    </p>
                                    
                                    <div className="space-y-3 md:space-y-4">
                                        {t.howItWorks.phases[activePhase].steps.map((step, i) => (
                                            <motion.div 
                                                key={i}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="flex items-center gap-3 md:gap-4 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5 hover:border-gold-500/20 transition-colors"
                                            >
                                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400 font-mono text-xs md:text-sm shrink-0">
                                                    {activePhase * 3 + i + 1}
                                                </div>
                                                <p className="text-white/90 font-medium text-xs md:text-base">{step}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                <div className="hidden lg:flex justify-center items-center h-full min-h-[300px] bg-gradient-to-br from-white/5 to-transparent rounded-2xl border border-white/10 relative">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                                    <motion.div 
                                        animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                        className="w-48 h-48 rounded-full border border-dashed border-gold-500/30 flex items-center justify-center relative"
                                    >
                                        <motion.div 
                                            className="w-32 h-32 rounded-full bg-gold-500/10 blur-xl absolute"
                                            animate={{ opacity: [0.5, 0.8, 0.5] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                        <div className="text-gold-400">
                                             {React.createElement(phaseIcons[activePhase], { size: 64 })}
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                </AnimatePresence>
            </div>

            <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className={`mt-4 md:mt-8 bg-gradient-to-r from-blue-900/20 to-transparent ${language === 'ar' ? 'border-r-4' : 'border-l-4'} border-blue-500 p-4 md:p-6 rounded-lg backdrop-blur-sm`}
            >
                <div className="flex items-start gap-3 md:gap-4">
                    <Info className="text-blue-400 shrink-0 mt-1 w-5 h-5 md:w-6 md:h-6" />
                    <div>
                        <h4 className="text-blue-200 font-bold mb-1 md:mb-2 text-sm md:text-base">{t.howItWorks.groupShippingNote.title}</h4>
                        <ul className={`text-white/70 text-xs md:text-sm space-y-1 list-disc ${language === 'ar' ? 'list-inside' : 'ml-5'}`}>
                            {t.howItWorks.groupShippingNote.items.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </motion.div>
        </div>
      </Container>
    </section>
  );
};