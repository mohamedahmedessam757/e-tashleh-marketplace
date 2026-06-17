import React from 'react';
import { motion } from 'framer-motion';
import { FileText, ChevronDown, Wallet } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { walletLoyaltyTermsAr, walletLoyaltyTermsEn } from '../../data/walletLoyaltyTerms';

export const WalletLoyaltyTermsView: React.FC<{ isModal?: boolean }> = ({ isModal = false }) => {
  const { language } = useLanguage();
  const content = language === 'ar' ? walletLoyaltyTermsAr : walletLoyaltyTermsEn;
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto bg-gold-500/10 rounded-full flex items-center justify-center mb-4 border border-gold-500/20 shadow-[0_0_30px_rgba(168,139,62,0.1)]">
          <Wallet className="w-8 h-8 text-gold-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{content.title}</h2>
        <p className="text-white/50 text-sm flex items-center justify-center gap-2">
          <FileText size={14} className="text-gold-500/60" />
          {language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}
        </p>
      </div>

      <div
        className={`space-y-4 ${
          isModal
            ? ''
            : 'max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gold-500/30 scrollbar-track-white/5'
        }`}
      >
        {content.sections.map((section, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white/5 border border-white/5 rounded-xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleAccordion(idx)}
              className={`w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${
                language === 'ar' ? 'text-right' : 'text-left'
              }`}
            >
              <h4
                className={`text-sm md:text-base font-bold flex-1 ${
                  expandedIndex === idx ? 'text-gold-400' : 'text-white'
                }`}
              >
                {section.heading}
              </h4>
              <ChevronDown
                className={`text-white/40 w-4 h-4 shrink-0 transition-transform duration-300 ${
                  expandedIndex === idx ? 'rotate-180 text-gold-500' : ''
                }`}
              />
            </button>
            {expandedIndex === idx && (
              <div className="p-4 pt-0 text-white/70 leading-relaxed border-t border-white/5 text-xs md:text-sm space-y-3">
                {section.blocks.map((block, blockIdx) => (
                  <div key={blockIdx} className="whitespace-pre-line">
                    {block.split('\n').map((line, lineIdx) => (
                      <p
                        key={lineIdx}
                        className={`${lineIdx > 0 ? 'mt-2' : ''} ${
                          line.startsWith('•') ? 'flex items-start gap-2' : ''
                        }`}
                      >
                        {line.startsWith('•') ? (
                          <>
                            <span className="text-gold-500 mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-current" />
                            <span className="flex-1">{line.replace(/^•\s*/, '')}</span>
                          </>
                        ) : (
                          line
                        )}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
