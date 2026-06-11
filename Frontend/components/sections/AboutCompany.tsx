import React from 'react';
import { Container } from '../ui/Container';
import { GlassCard } from '../ui/GlassCard';
import { motion } from 'framer-motion';
import { Target, Lightbulb, HeartHandshake, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const AboutCompany: React.FC = () => {
  const { t, language } = useLanguage();

  return (
    <section id="about" className="py-12 md:py-20 relative overflow-hidden">
        {/* Ambient Background */}
        <div className={`absolute top-0 ${language === 'ar' ? 'right-0' : 'left-0'} w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-gold-600/5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none`} />

        <Container>
            {/* Header */}
            <div className="text-center mb-8 md:mb-16">
                <span className="text-gold-400 text-xs md:text-sm font-bold tracking-wider uppercase mb-2 block">{t.about.title}</span>
                <h2 className="text-2xl md:text-5xl font-bold text-white mb-4 md:mb-6">
                    {t.about.companyName}
                </h2>
                <p className="text-white/70 max-w-3xl mx-auto leading-relaxed text-sm md:text-lg px-2">
                    {t.about.description}
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-start">
                {/* Mission Section */}
                <GlassCard className="h-full relative overflow-hidden group p-6">
                    <div className={`absolute top-0 ${language === 'ar' ? 'left-0' : 'right-0'} w-full h-1 bg-gradient-to-r from-gold-300 to-gold-600`} />
                    <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                        <div className="p-2 md:p-3 rounded-full bg-gold-500/20 text-gold-400">
                            <Target size={20} className="md:w-7 md:h-7" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-white">{t.about.missionTitle}</h3>
                    </div>
                    <p className="text-white/70 leading-relaxed text-sm md:text-base mb-4 md:mb-6">
                        {t.about.missionDesc1}
                    </p>
                    <p className="text-white/70 leading-relaxed text-sm md:text-base">
                        {t.about.missionDesc2}
                    </p>
                </GlassCard>

                {/* Philosophy Section */}
                <div className="space-y-4">
                     <h3 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
                        <Lightbulb className="text-gold-400 w-5 h-5 md:w-6 md:h-6" />
                        {t.about.philosophyTitle}
                     </h3>
                     
                     {[
                        { icon: HeartHandshake, text: t.about.values[0] },
                        { icon: ShieldCheck, text: t.about.values[1] },
                        { icon: Target, text: t.about.values[2] },
                     ].map((item, idx) => (
                        <GlassCard key={idx} delay={0.2 * idx} className="flex items-center gap-3 md:gap-4 p-4 hover:bg-white/10 transition-colors">
                            <div className="text-gold-300 shrink-0">
                                <item.icon size={18} className="md:w-5 md:h-5" />
                            </div>
                            <p className="text-white/80 text-xs md:text-sm font-medium">{item.text}</p>
                        </GlassCard>
                     ))}
                </div>
            </div>
        </Container>
    </section>
  );
};