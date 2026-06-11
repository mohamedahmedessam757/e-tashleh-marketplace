import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Gift, 
  Wallet, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Share2,
  Sparkles,
  Zap,
  Activity,
  ChevronDown,
  ShieldCheck,
  Star
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { GlassCard } from './ui/GlassCard';

interface EarnIncomeLandingProps {
  onBack: () => void;
  onStart: () => void;
}

interface PlatformStats {
  totalUsers: number;
  totalReferrals: number;
  totalDistributed: number;
  currency: string;
}

export const EarnIncomeLanding: React.FC<EarnIncomeLandingProps> = ({ onBack, onStart }) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 1250,
    totalReferrals: 850,
    totalDistributed: 45000,
    currency: 'AED'
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/loyalty/public-stats`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch platform stats:', error);
      }
    };
    fetchStats();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
  };

  const loyalty = t.common.loyaltySystem;

  return (
    <div className="min-h-screen bg-[#0F0E0C] text-white selection:bg-gold-500 selection:text-black relative overflow-hidden font-sans">
      
      {/* 1. BRANDED BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-gold-500/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '3s' }} />
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} 
        />
      </div>

      <div className="relative z-10">
        
        {/* TOP NAVIGATION BAR */}
        <nav className="p-4 md:p-6 flex items-center justify-between backdrop-blur-xl bg-black/40 sticky top-0 border-b border-white/5 z-50">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 group"
          >
            {isAr ? <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /> : <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />}
            <span className="text-sm font-bold uppercase tracking-widest">{t.common.back}</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/20">
              <TrendingUp size={20} className="text-black" />
            </div>
            <div className="flex flex-col">
                <span className="text-lg font-black italic tracking-tighter uppercase leading-none">Loyalty</span>
                <span className="text-[10px] text-gold-500 font-bold uppercase tracking-widest leading-none mt-1">Version 2026</span>
            </div>
          </div>

          <button 
            onClick={onStart}
            className="px-6 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-black font-black text-sm transition-all shadow-lg shadow-gold-500/20 active:scale-95"
          >
            {loyalty?.cta || 'ابدأ الربح الآن'}
          </button>
        </nav>

        {/* HERO SECTION */}
        <section className="px-4 py-20 md:py-32 max-w-7xl mx-auto text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-12"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-400 text-xs md:text-sm font-bold uppercase tracking-[0.2em] shadow-lg">
              <Sparkles size={16} className="text-gold-500" />
              {isAr ? 'نظام الأرباح الذكي 2026' : 'SMART PROFIT ENGINE 2026'}
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-4xl md:text-8xl font-black leading-[1.2] tracking-tight flex flex-col gap-6 md:gap-8">
              <span>{loyalty?.title}</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-200 via-gold-500 to-gold-200">
                {loyalty?.subtitle}
              </span>
            </motion.h1>

            <motion.div variants={itemVariants} className="bg-gradient-to-br from-[#1A1814] to-[#0F0E0C] border border-gold-500/20 p-10 md:p-16 rounded-[3rem] max-w-4xl mx-auto backdrop-blur-2xl shadow-2xl relative group">
                <div className="absolute -inset-1 bg-gold-500/5 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <h2 className="text-2xl md:text-4xl font-bold mb-8 text-gold-400 leading-tight">
                    {loyalty?.intro?.title}
                </h2>
                <div className="space-y-4 text-white/70 text-lg md:text-xl leading-relaxed">
                    <p>{loyalty?.intro?.desc1}</p>
                    <p className="text-white font-black text-3xl md:text-5xl my-4 drop-shadow-lg">{loyalty?.intro?.desc2}</p>
                    <p className="pt-6 text-gold-500 font-bold uppercase tracking-wider">{loyalty?.intro?.desc3}</p>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex justify-center pt-4">
               <ChevronDown className="animate-bounce text-gold-500/30" size={40} />
            </motion.div>
          </motion.div>
        </section>

        {/* HOW IT WORKS SECTION (4 STEPS) */}
        <section className="px-4 py-28 bg-[#151310]/50 border-y border-white/5 relative">
          <div className="absolute inset-0 bg-gold-500/[0.02] pointer-events-none" />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-6xl font-black mb-6 uppercase tracking-tight">
                {loyalty?.howToStart?.title}
              </h2>
              <div className="w-24 h-1.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent mx-auto rounded-full" />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {[
                { step: '1', icon: Activity, color: 'text-gold-400', ...loyalty?.howToStart?.step1 },
                { step: '2', icon: CheckCircle2, color: 'text-emerald-400', ...loyalty?.howToStart?.step2 },
                { step: '3', icon: ShieldCheck, color: 'text-blue-400', ...loyalty?.howToStart?.step3 },
                { step: '4', icon: Wallet, color: 'text-gold-500', ...loyalty?.howToStart?.step4 }
              ].map((item, idx) => (
                <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="relative group p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-gold-500/10 hover:border-gold-500/40 transition-all duration-500"
                >
                  <div className="absolute -top-5 -start-5 w-14 h-14 rounded-2xl bg-gold-500 flex items-center justify-center font-black text-2xl text-black shadow-xl shadow-gold-500/30 group-hover:scale-110 transition-transform">
                    {item.step}
                  </div>
                  <div className="space-y-6 pt-6 text-center">
                    <div className="w-16 h-16 mx-auto bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center group-hover:bg-gold-500/20 transition-colors">
                      <item.icon size={32} className={item.color} />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{item.title}</h3>
                    <p className="text-white/40 text-sm md:text-base leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* DUAL SYSTEM SECTION */}
        <section className="px-4 py-32 max-w-7xl mx-auto space-y-32">
          
          {/* First: Loyalty */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                    {loyalty?.first?.title}
                </h2>
                <div className="h-1 w-20 bg-gold-500 rounded-full" />
              </div>
              <p className="text-2xl text-gold-400 font-bold italic">{loyalty?.first?.subtitle}</p>
              <div className="space-y-6">
                {[loyalty?.first?.bullet1, loyalty?.first?.bullet2, loyalty?.first?.bullet3].map((bullet, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ x: isAr ? -10 : 10 }}
                    className="flex items-center gap-5 p-6 rounded-[1.5rem] bg-white/5 border border-white/5 hover:border-gold-500/30 transition-all"
                  >
                    <div className="w-10 h-10 bg-gold-500/10 rounded-full flex items-center justify-center text-gold-500 shrink-0">
                        <Star size={20} fill="currentColor" />
                    </div>
                    <span className="text-xl font-bold text-white/90">{bullet}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-4 bg-gold-500/10 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
              <GlassCard className="relative p-12 bg-[#1A1814] border-gold-500/30 aspect-square flex flex-col items-center justify-center gap-8 rounded-[3rem] overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                    <Sparkles size={400} />
                </div>
                <div className="w-32 h-32 bg-gold-500/20 rounded-[2rem] flex items-center justify-center text-gold-500 shadow-2xl shadow-gold-500/20">
                    <Wallet size={64} />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xs uppercase font-black tracking-widest text-gold-500/60">Total Earnings Distributed</p>
                  <p className="text-6xl font-black text-white tabular-nums">{stats.totalDistributed.toLocaleString()} <span className="text-2xl text-gold-500">{stats.currency}</span></p>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Second: Referral */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="lg:order-2 space-y-10">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                    {loyalty?.second?.title}
                </h2>
                <div className="h-1 w-20 bg-gold-500 rounded-full" />
              </div>
              <p className="text-2xl text-gold-400 font-bold italic">{loyalty?.second?.subtitle}</p>
              <div className="space-y-6">
                {[loyalty?.second?.bullet1, loyalty?.second?.bullet2, loyalty?.second?.bullet3].map((bullet, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ x: isAr ? -10 : 10 }}
                    className="flex items-center gap-5 p-6 rounded-[1.5rem] bg-white/5 border border-white/5 hover:border-gold-500/30 transition-all"
                  >
                    <div className="w-10 h-10 bg-gold-500/10 rounded-full flex items-center justify-center text-gold-500 shrink-0">
                        <Share2 size={20} />
                    </div>
                    <span className="text-xl font-bold text-white/90">{bullet}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="lg:order-1 relative group">
              <div className="absolute -inset-4 bg-gold-500/10 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
              <GlassCard className="relative p-12 bg-[#1A1814] border-gold-500/30 aspect-square flex flex-col items-center justify-center gap-8 rounded-[3rem] overflow-hidden">
                <div className="w-32 h-32 bg-gold-500/20 rounded-[2rem] flex items-center justify-center text-gold-500 shadow-2xl shadow-gold-500/20">
                    <Users size={64} />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xs uppercase font-black tracking-widest text-gold-500/60">Successful Referrals</p>
                  <p className="text-6xl font-black text-white tabular-nums">{stats.totalReferrals.toLocaleString()}</p>
                </div>
                <div className="flex -space-x-3 mt-8 justify-center">
                    {[
                      'https://api.dicebear.com/7.x/notionists/svg?seed=Jordan&backgroundColor=ffdfbf',
                      'https://api.dicebear.com/7.x/notionists/svg?seed=Taylor&backgroundColor=c0aede',
                      'https://api.dicebear.com/7.x/notionists/svg?seed=Morgan&backgroundColor=b6e3f4',
                      'https://api.dicebear.com/7.x/notionists/svg?seed=Charlie&backgroundColor=ffdfbf',
                      'https://api.dicebear.com/7.x/notionists/svg?seed=Skyler&backgroundColor=d1d4f9'
                    ].map((src, i) => (
                        <div key={i} className="w-14 h-14 rounded-full border-2 border-[#1A1814] overflow-hidden bg-[#2A2824] shadow-2xl transition-transform hover:-translate-y-2 cursor-pointer z-10">
                            <img src={src} alt="Character" className="w-full h-full object-contain" />
                        </div>
                    ))}
                    <div className="w-14 h-14 rounded-full border-2 border-[#1A1814] bg-gold-500 text-black flex items-center justify-center font-black text-lg shadow-xl shadow-gold-500/20 transition-transform hover:scale-110 cursor-pointer z-20">+</div>
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* TIMING & WHY DIFFERENT */}
        <section className="px-4 py-28 bg-[#151310] border-y border-white/5 relative">
           <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20">
              <div className="space-y-12">
                 <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">{loyalty?.timing?.title}</h2>
                 <p className="text-xl text-gold-500 font-bold leading-relaxed">{loyalty?.timing?.subtitle}</p>
                 <div className="space-y-5">
                    {[loyalty?.timing?.bullet1, loyalty?.timing?.bullet2, loyalty?.timing?.bullet3].map((b, i) => (
                      <div key={i} className="flex items-center gap-4 text-white/80 text-lg">
                        <CheckCircle2 size={24} className="text-gold-500" />
                        <span>{b}</span>
                      </div>
                    ))}
                 </div>
                 <div className="p-6 bg-gold-500/10 border-s-4 border-gold-500 rounded-xl text-gold-200 text-sm md:text-base font-bold italic">
                    {loyalty?.timing?.footer}
                 </div>
              </div>

              <div className="space-y-12">
                 <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">{loyalty?.whyDifferent?.title}</h2>
                 <div className="grid gap-4">
                    {[loyalty?.whyDifferent?.bullet1, loyalty?.whyDifferent?.bullet2, loyalty?.whyDifferent?.bullet3, loyalty?.whyDifferent?.bullet4].map((b, i) => (
                      <motion.div 
                        key={i} 
                        whileHover={{ scale: 1.02 }}
                        className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-gold-500/40 hover:bg-gold-500/5 transition-all font-bold text-lg flex items-center gap-4"
                      >
                         <div className="w-2 h-2 rounded-full bg-gold-500" />
                         {b}
                      </motion.div>
                    ))}
                 </div>
              </div>
           </div>
        </section>

        {/* IMAGINE SECTION */}
        <section className="px-4 py-32 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="max-w-5xl mx-auto p-16 md:p-28 relative overflow-hidden bg-gradient-to-br from-[#1A1814] via-[#0F0E0C] to-[#1A1814] border-2 border-gold-500/30 rounded-[4rem] shadow-2xl"
          >
            <div className="absolute top-0 right-0 p-12 opacity-5 text-gold-500">
              <Sparkles size={200} />
            </div>
            
            <div className="relative z-10 space-y-12">
              <h2 className="text-5xl md:text-8xl font-black tracking-tight leading-tight">
                {loyalty?.imagine?.title}
              </h2>
              <div className="space-y-6">
                <p className="text-3xl md:text-5xl text-white font-black drop-shadow-lg">{loyalty?.imagine?.p1}</p>
                <p className="text-xl md:text-2xl text-white/50 max-w-2xl mx-auto">{loyalty?.imagine?.p2}</p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
                <button 
                  onClick={onStart}
                  className="w-full sm:w-auto px-12 py-6 rounded-2xl bg-gold-500 hover:bg-gold-600 text-black font-black text-2xl transition-all shadow-2xl shadow-gold-500/40 hover:-translate-y-2 active:scale-95 flex items-center justify-center gap-4 group"
                >
                  <span>{loyalty?.cta}</span>
                  <ArrowIcon size={28} className="group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* FOOTER MINI */}
        <footer className="p-12 text-center border-t border-white/5 opacity-40">
          <p className="text-[10px] uppercase font-black tracking-[0.4em] text-gold-500">
            © 2026 E-TASHLEH PROFIT ENGINE v5.0 - SECURE & TRANSPARENT
          </p>
        </footer>

      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};
