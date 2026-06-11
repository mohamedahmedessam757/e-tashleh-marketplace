import React from 'react';
import { Container } from '../ui/Container';
import { GlassCard } from '../ui/GlassCard';
import { ShieldCheck, Truck, RefreshCw, Lock, BadgeCheck, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const Guarantees: React.FC = () => {
  const { t } = useLanguage();
  
  const icons = [BadgeCheck, Truck, Lock, RefreshCw, AlertCircle, ShieldCheck];

  return (
    <section id="guarantees" className="py-12 md:py-20 bg-[#151310] relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
      <Container>
        <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 md:mb-4">
                {t.guarantees.title} <br className="sm:hidden" /> <span className="text-gold-400">{t.guarantees.titleHighlight}</span>
            </h2>
            <p className="text-white/60 text-sm md:text-base px-4">{t.guarantees.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {t.guarantees.list.map((item, idx) => {
                const Icon = icons[idx];
                return (
                    <GlassCard key={idx} delay={0.1 * idx} className="hover:border-gold-500/40 transition-all group p-6">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center text-white mb-3 md:mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-gold-500/20">
                            <Icon size={20} className="md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">{item.title}</h3>
                        <p className="text-white/60 text-xs md:text-sm leading-relaxed">{item.desc}</p>
                    </GlassCard>
                );
            })}
        </div>
      </Container>
    </section>
  );
};