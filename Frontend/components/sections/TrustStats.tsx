import React from 'react';
import { Container } from '../ui/Container';
import { GlassCard } from '../ui/GlassCard';
import { Building2, Calendar, Wallet, Globe2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

export const TrustStats: React.FC = () => {
  const { t } = useLanguage();

  const stats = [
    { ...t.stats.established, icon: Calendar },
    { ...t.stats.capital, icon: Wallet },
    { ...t.stats.hq, icon: Building2 },
    { ...t.stats.scope, icon: Globe2 },
  ];

  return (
    <section className="relative py-8 md:py-10 -mt-6 md:-mt-8 z-20">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {stats.map((stat, idx) => (
            <GlassCard key={idx} delay={0.2 * idx} className="text-center py-4 md:py-6 px-2 md:px-6 border-gold-500/10 bg-[#1A1814]/80">
              <div className="flex justify-center mb-2 md:mb-3 text-gold-400">
                <stat.icon size={20} className="md:w-6 md:h-6" />
              </div>
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + (0.1 * idx) }}
                className="text-xl md:text-3xl font-bold text-white mb-1"
              >
                {stat.value}
              </motion.div>
              <div className="text-xs md:text-sm text-gold-200 font-medium">{stat.label}</div>
              <div className="text-[10px] md:text-xs text-white/40 mt-1 hidden sm:block">{stat.sub}</div>
            </GlassCard>
          ))}
        </div>
        <div className="text-center mt-4 md:mt-6 text-white/30 text-[10px] md:text-xs px-4">
          {t.stats.cr}
        </div>
      </Container>
    </section>
  );
};