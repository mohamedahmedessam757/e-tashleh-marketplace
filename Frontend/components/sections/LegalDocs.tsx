import React, { useState } from 'react';
import { Container } from '../ui/Container';
import { GlassCard } from '../ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileText, Lock, ChevronDown, CheckCircle2, AlertOctagon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

type Tab = 'privacy' | 'terms';

export const LegalDocs: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('privacy');
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const { t, language } = useLanguage();

    const toggleAccordion = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const currentContent = activeTab === 'privacy' ? t.legal.privacyContent : t.legal.termsContent;

    return (
        <section className="py-16 md:py-24 relative overflow-hidden bg-[#0A0908]">
            <Container>
                <div className="flex flex-col items-center mb-8 md:mb-12">
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                        <Shield className="text-gold-500 w-6 h-6 md:w-8 md:h-8" />
                        {t.legal.title}
                    </h2>

                    <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('privacy')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${activeTab === 'privacy' ? 'bg-gold-500 text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
                        >
                            <Lock size={14} className="md:w-4 md:h-4" />
                            {t.legal.tabs.privacy}
                        </button>
                        <button
                            onClick={() => setActiveTab('terms')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${activeTab === 'terms' ? 'bg-gold-500 text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
                        >
                            <FileText size={14} className="md:w-4 md:h-4" />
                            {t.legal.tabs.terms}
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-6 md:gap-8 items-start">
                    <div className={`lg:col-span-4 ${language === 'ar' ? 'order-2 lg:order-1' : 'order-2 lg:order-3'}`}>
                        <GlassCard className="lg:sticky lg:top-24 border-gold-500/10 p-5 md:p-6">
                            <h3 className="text-lg md:text-xl font-bold text-white mb-4 border-b border-white/10 pb-4">
                                {activeTab === 'privacy' ? t.legal.summary.privacyTitle : t.legal.summary.termsTitle}
                            </h3>
                            <ul className="space-y-3 md:space-y-4">
                                {(activeTab === 'privacy' ? t.legal.summary.privacyItems : t.legal.summary.termsItems).map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-white/70 text-xs md:text-sm">
                                        <CheckCircle2 className="text-gold-400 w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-6 p-4 bg-gold-500/10 rounded-xl border border-gold-500/20">
                                <div className="flex items-center gap-2 text-gold-400 mb-2 font-bold text-xs md:text-sm">
                                    <AlertOctagon size={16} />
                                    {t.legal.summary.noteTitle}
                                </div>
                                <p className="text-[10px] md:text-xs text-white/60 leading-relaxed">
                                    {activeTab === 'privacy' ? t.legal.summary.privacyNote : t.legal.summary.termsNote}
                                </p>
                            </div>
                        </GlassCard>
                    </div>

                    <div className="lg:col-span-8 order-1 lg:order-2">
                        <div className="space-y-3 md:space-y-4">
                            {currentContent.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-[#1A1814] border border-white/5 rounded-xl md:rounded-2xl overflow-hidden"
                                >
                                    <button
                                        onClick={() => toggleAccordion(idx)}
                                        className={`w-full flex items-center justify-between p-4 md:p-6 hover:bg-white/5 transition-colors ${language === 'ar' ? 'text-right' : 'text-left'}`}
                                    >
                                        <h4 className={`text-sm md:text-lg font-bold ${expandedIndex === idx ? 'text-gold-400' : 'text-white'}`}>
                                            {item.title}
                                        </h4>
                                        <ChevronDown
                                            className={`text-white/40 w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 ${expandedIndex === idx ? 'rotate-180 text-gold-500' : ''}`}
                                        />
                                    </button>
                                    <AnimatePresence>
                                        {expandedIndex === idx && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <div className="p-4 pt-0 md:p-6 md:pt-0 text-white/70 leading-relaxed border-t border-white/5 text-xs md:text-base">
                                                    {Array.isArray(item.content) ? (
                                                        <ul className={`space-y-3 ${language === 'ar' ? 'pr-2' : 'pl-2'}`}>
                                                            {item.content.map((line, i) => (
                                                                <li key={i} className="flex items-start gap-3">
                                                                    <span className="text-gold-500 mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-current" />
                                                                    <span className="flex-1">{line.replace(/^•\s*/, '')}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <div className="whitespace-pre-line">{item.content}</div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </Container>
        </section>
    );
};