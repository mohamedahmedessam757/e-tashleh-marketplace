import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from './ui/GlassCard';
import { ArrowLeft, ShieldCheck, Zap, BarChart3, ArrowRight, Activity, Search, Users, Settings } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HeroProps {
    onLogin: () => void;
    onRequestNow: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onLogin, onRequestNow }) => {
    const { t, language } = useLanguage();
    const ArrowIcon = language === 'ar' ? ArrowLeft : ArrowRight;

    return (
        <section id="home" className="relative min-h-screen pt-24 md:pt-32 pb-12 md:pb-16 flex flex-col justify-center overflow-hidden">

            {/* Background Elements - Hardware Accelerated */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-[100px] pointer-events-none transform-gpu" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] pointer-events-none transform-gpu" />

            <div className="relative z-20 w-full px-4 md:px-8 lg:px-12">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center my-4 md:my-8">

                    {/* Text Content */}
                    <div className={`${language === 'ar' ? 'text-right' : 'text-left'}`}>
                        <motion.div
                            initial={{ opacity: 0, x: language === 'ar' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            <span className="inline-block px-4 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-300 text-xs md:text-sm font-medium mb-4 md:mb-6 backdrop-blur-sm shadow-sm">
                                {t.hero.badge}
                            </span>

                            <h1 className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 md:mb-6 leading-[1.2] md:leading-[1.1] tracking-tight drop-shadow-2xl">
                                {t.hero.titleLine1}
                                <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gold-100 to-gold-400">
                                    {t.hero.titleLine2}
                                </span>
                            </h1>

                            <p className={`text-sm md:text-lg xl:text-xl text-white/70 mb-8 max-w-xl leading-relaxed ${language === 'ar' ? 'mr-0 ml-auto' : 'ml-0 mr-auto'} drop-shadow-md`}>
                                {t.hero.description}
                            </p>

                            <div className={`flex flex-col sm:flex-row flex-wrap gap-4 ${language === 'ar' ? 'justify-start lg:justify-start' : 'justify-start'}`}>
                                <button
                                    onClick={onRequestNow}
                                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#E31B23] hover:bg-[#C41219] text-white font-semibold transition-all shadow-[0_0_20px_rgba(227,27,35,0.3)] hover:shadow-[0_0_30px_rgba(227,27,35,0.5)] flex items-center justify-center gap-2 group active:scale-[0.98]"
                                >
                                    <span>{t.hero.enterPartsRequests}</span>
                                    <ArrowIcon className={`w-5 h-5 ${language === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'} transition-transform`} />
                                </button>
                                <button
                                    onClick={onLogin}
                                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md transition-all font-medium active:scale-[0.98]"
                                >
                                    {t.hero.discoverBtn}
                                </button>
                            </div>
                        </motion.div>
                    </div>

                    {/* VISUAL CONTENT: Advanced Dashboard Preview */}
                    <div className="relative mt-8 lg:mt-0 perspective-1000">
                        {/* Decorative Background Glow */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-gold-500/10 to-transparent rounded-3xl blur-3xl transform rotate-6 scale-95 opacity-30" />

                        {/* Floating 3D Element (Gear/Engine) */}
                        <motion.div
                            animate={{
                                y: [-10, 10, -10],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className={`absolute -top-8 md:-top-12 ${language === 'ar' ? '-left-8 md:-left-12' : '-right-8 md:-right-12'} z-30`}
                        >
                            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-gold-400 to-gold-700 rounded-2xl flex items-center justify-center shadow-[0_10px_40px_rgba(168,139,62,0.4)] border border-white/20 backdrop-blur-md">
                                <Settings className="w-10 h-10 md:w-12 md:h-12 text-white animate-spin-slow" />
                            </div>
                        </motion.div>

                        {/* Main Glass Dashboard */}
                        <GlassCard delay={0.4} className="relative min-h-[350px] md:min-h-[450px] xl:min-h-[500px] border-gold-500/30 bg-[#0F0E0C]/90 backdrop-blur-2xl p-0 overflow-hidden group">

                            {/* 1. SCANNIG EFFECT */}
                            <motion.div
                                animate={{ top: ['0%', '100%', '0%'] }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400 to-transparent z-20 opacity-50 shadow-[0_0_15px_#C4A95C]"
                            />
                            <motion.div
                                animate={{ top: ['0%', '100%', '0%'] }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                className="absolute left-0 right-0 h-20 bg-gradient-to-b from-gold-500/5 to-transparent z-10 pointer-events-none"
                            />

                            {/* Dashboard Header */}
                            <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 bg-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-1.5 direction-ltr">
                                        <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-sm" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-sm" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-sm" />
                                    </div>
                                    <div className="h-4 w-px bg-white/10"></div>
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/5">
                                        <Search size={12} className="text-white/40" />
                                        <span className="text-[10px] text-white/40 font-mono">{t.hero.dashboard.search}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    <span className="text-[10px] font-bold text-green-400 tracking-wider uppercase">{t.hero.dashboard.status}</span>
                                </div>
                            </div>

                            {/* Dashboard Body */}
                            <div className="p-4 md:p-6 space-y-6">

                                {/* Live Chart Visual - ENHANCED */}
                                <div className="relative h-32 md:h-40 w-full bg-gradient-to-b from-[#1A1814] to-black/40 rounded-xl border border-gold-500/20 overflow-hidden flex items-end justify-center p-4 group/chart">

                                    {/* Grid Background */}
                                    <div
                                        className="absolute inset-0 opacity-20 pointer-events-none"
                                        style={{
                                            backgroundImage: 'linear-gradient(rgba(168, 139, 62, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 139, 62, 0.1) 1px, transparent 1px)',
                                            backgroundSize: '20px 20px'
                                        }}
                                    />

                                    <div className="absolute top-3 start-4 flex items-center gap-2 z-10">
                                        <div className="p-1.5 rounded-full bg-gold-500/20 text-gold-400 animate-pulse">
                                            <Activity size={14} />
                                        </div>
                                        <span className="text-xs text-gold-100 font-bold tracking-wide">{t.hero.dashboard.market}</span>
                                    </div>

                                    {/* CSS Graph Animation */}
                                    <div className="flex items-end gap-1.5 h-full w-full pt-10 px-2 relative z-10">
                                        {[40, 65, 50, 75, 60, 85, 70, 95, 80, 55, 70, 90].map((h, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ height: '10%' }}
                                                animate={{ height: [`${h}%`, `${h - 15}%`, `${h}%`] }}
                                                transition={{ duration: 2.5, delay: i * 0.1, repeat: Infinity, ease: "easeInOut" }}
                                                className="flex-1 bg-gradient-to-t from-gold-900/30 via-gold-500 to-gold-200 rounded-t-[2px] relative group cursor-crosshair hover:via-gold-400 hover:to-white transition-all duration-300"
                                                style={{
                                                    boxShadow: '0 -4px 12px rgba(168, 139, 62, 0.3)'
                                                }}
                                            >
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200 z-20 pointer-events-none">
                                                    <div className="bg-gold-500 text-black text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                                        {h}% {t.hero.dashboard.vol}
                                                    </div>
                                                    <div className="w-2 h-2 bg-gold-500 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#1A1814] p-4 rounded-xl border border-white/5 hover:border-gold-500/30 transition-all group/stat">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover/stat:bg-blue-500 group-hover/stat:text-white transition-colors">
                                                <Users size={16} />
                                            </div>
                                            <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">+12%</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white">2.4k</div>
                                        <div className="text-[10px] text-white/40">{t.hero.dashboard.merchants}</div>
                                    </div>
                                    <div className="bg-[#1A1814] p-4 rounded-xl border border-white/5 hover:border-gold-500/30 transition-all group/stat">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="p-2 bg-gold-500/10 rounded-lg text-gold-400 group-hover/stat:bg-gold-500 group-hover/stat:text-white transition-colors">
                                                <BarChart3 size={16} />
                                            </div>
                                            <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">+28%</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white">$8.2M</div>
                                        <div className="text-[10px] text-white/40">{t.hero.dashboard.volume}</div>
                                    </div>
                                </div>

                                {/* Live Orders Feed */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs text-white/40 px-1">
                                        <span>{t.hero.dashboard.recent}</span>
                                        <span>{t.hero.dashboard.live}</span>
                                    </div>
                                    {[1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 1 + (i * 0.2) }}
                                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-[10px] text-white font-bold border border-white/10">
                                                    {i === 1 ? 'TY' : 'MB'}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-medium text-white">
                                                        {i === 1 ? t.hero.dashboard.item1 : t.hero.dashboard.item2}
                                                    </div>
                                                    <div className="text-[10px] text-white/40">
                                                        {i === 1 ? t.hero.dashboard.loc1 : t.hero.dashboard.loc2}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs font-mono text-gold-400">{i === 1 ? 'SAR 450' : 'SAR 1200'}</div>
                                        </motion.div>
                                    ))}
                                </div>

                            </div>
                        </GlassCard>

                        {/* Floating Security Badge (Bottom) */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
                            transition={{
                                opacity: { duration: 0.5, delay: 0.8 },
                                scale: { duration: 0.5, delay: 0.8 },
                                y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }
                            }}
                            className={`absolute -bottom-4 md:-bottom-6 ${language === 'ar' ? 'right-4 md:-right-6' : 'left-4 md:-left-6'} bg-[#1F1D19] text-white p-3 md:p-4 rounded-xl shadow-xl border border-gold-500/30 flex items-center gap-3 z-30`}
                        >
                            <div className="relative">
                                <ShieldCheck size={24} className="text-gold-500" />
                                <div className="absolute inset-0 bg-gold-500 blur-lg opacity-40 animate-pulse" />
                            </div>
                            <div>
                                <div className="text-[10px] opacity-60 uppercase tracking-wider">{t.hero.security}</div>
                                <div className="font-bold text-xs md:text-sm">{t.hero.dashboard.ssl}</div>
                            </div>
                        </motion.div>
                    </div>

                </div>

                {/* Features Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mt-12 md:mt-20 max-w-7xl mx-auto">
                    {[
                        { icon: ShieldCheck, ...t.hero.features.secure },
                        { icon: Zap, ...t.hero.features.speed },
                        { icon: BarChart3, ...t.hero.features.analytics },
                    ].map((feature, idx) => (
                        <GlassCard key={idx} delay={0.8 + (0.2 * idx)} className="text-center group hover:-translate-y-2 transition-transform bg-white/5 hover:bg-white/10 p-4 md:p-6">
                            <div className="w-10 h-10 md:w-12 md:h-12 mx-auto bg-gold-500/20 rounded-full flex items-center justify-center text-gold-400 mb-3 md:mb-4 group-hover:bg-gold-500 group-hover:text-white transition-colors">
                                <feature.icon size={20} className="md:w-6 md:h-6" />
                            </div>
                            <h3 className="text-white text-base md:text-lg font-bold mb-1 md:mb-2">{feature.title}</h3>
                            <p className="text-white/60 text-xs md:text-sm">{feature.desc}</p>
                        </GlassCard>
                    ))}
                </div>
            </div>
        </section>
    );
};