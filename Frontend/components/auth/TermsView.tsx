import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const TermsView: React.FC<{ initialSection?: 'terms' | 'privacy', isModal?: boolean }> = ({ initialSection = 'terms', isModal = false }) => {
    const { t, language } = useLanguage();
    // Default to first item if terms, or first privacy item if privacy.
    // Logic below will handle valid setting.
    const [expandedIndex, setExpandedIndex] = React.useState<number | null>(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const privacyRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (initialSection === 'privacy') {
            // Expand first privacy item (index 100)
            setExpandedIndex(100);
            // Scroll to Privacy Section
            setTimeout(() => {
                privacyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300); // 300ms delay to allow animation/rendering
        } else {
            // Expand first terms item
            setExpandedIndex(0);
            // Scroll to top
            if (containerRef.current) containerRef.current.scrollTop = 0;
        }
    }, [initialSection]);

    const toggleAccordion = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto bg-gold-500/10 rounded-full flex items-center justify-center mb-4 border border-gold-500/20 shadow-[0_0_30px_rgba(168,139,62,0.1)]">
                    <FileText className="w-8 h-8 text-gold-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t.legal.title}</h2>
                <p className="text-white/60 text-sm">{t.legal.summary.termsTitle}</p>
            </div>

            <div ref={containerRef} className={`space-y-4 ${isModal ? '' : 'h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gold-500/30 scrollbar-track-white/5'}`}>
                {/* Terms Content */}
                {t.legal.termsContent.map((item, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white/5 border border-white/5 rounded-xl overflow-hidden"
                    >
                        <button
                            onClick={() => toggleAccordion(idx)}
                            className={`w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${language === 'ar' ? 'text-right' : 'text-left'}`}
                        >
                            <h4 className={`text-sm md:text-base font-bold ${expandedIndex === idx ? 'text-gold-400' : 'text-white'}`}>
                                {item.title}
                            </h4>
                            <ChevronDown
                                className={`text-white/40 w-4 h-4 transition-transform duration-300 ${expandedIndex === idx ? 'rotate-180 text-gold-500' : ''}`}
                            />
                        </button>
                        {expandedIndex === idx && (
                            <div className="p-4 pt-0 text-white/70 leading-relaxed border-t border-white/5 text-xs md:text-sm">
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
                        )}
                    </motion.div>
                ))}

                {/* Privacy Content appended for completeness in this view */}
                <div ref={privacyRef} className="pt-6 border-t border-white/10 mt-6">
                    <div className="flex items-center gap-2 mb-4 text-white/80 font-bold">
                        <Shield className="w-5 h-5 text-gold-500" />
                        <span>{t.legal.tabs.privacy}</span>
                    </div>
                    {t.legal.privacyContent.map((item, idx) => (
                        <motion.div
                            key={`p-${idx}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + (idx * 0.1) }}
                            className="bg-white/5 border border-white/5 rounded-xl overflow-hidden mb-4"
                        >
                            <button
                                onClick={() => toggleAccordion(idx + 100)}
                                className={`w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${language === 'ar' ? 'text-right' : 'text-left'}`}
                            >
                                <h4 className={`text-sm md:text-base font-bold ${expandedIndex === idx + 100 ? 'text-gold-400' : 'text-white'}`}>
                                    {item.title}
                                </h4>
                                <ChevronDown
                                    className={`text-white/40 w-4 h-4 transition-transform duration-300 ${expandedIndex === idx + 100 ? 'rotate-180 text-gold-500' : ''}`}
                                />
                            </button>
                            {expandedIndex === idx + 100 && (
                                <div className="p-4 pt-0 text-white/70 leading-relaxed border-t border-white/5 text-xs md:text-sm">
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
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="text-center text-xs text-white/30 pt-4 border-t border-white/10">
                {t.legal.summary.termsNote}
            </div>
        </div>
    );
};