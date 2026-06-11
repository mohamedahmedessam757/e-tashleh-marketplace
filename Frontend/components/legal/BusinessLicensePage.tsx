import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, Globe, FileCheck, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Container } from '../ui/Container';
import { GlassCard } from '../ui/GlassCard';
import { businessLicenseSections } from '../../data/businessLicense';

interface BusinessLicensePageProps {
  onBack: () => void;
  onVerifyRegistry?: () => void;
}

export const BusinessLicensePage: React.FC<BusinessLicensePageProps> = ({ onBack, onVerifyRegistry }) => {
  const { language, setLanguage } = useLanguage();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowRight : ArrowLeft;

  const toggleLanguage = () => setLanguage(isAr ? 'en' : 'ar');

  return (
    <div className="min-h-screen bg-[#1A1814] text-white">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-gold-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px]" />
      </div>

      <Container className="relative z-10 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-white/70 hover:text-gold-400 transition-colors text-sm font-bold"
          >
            <ArrowIcon size={18} />
            <span>{isAr ? 'العودة' : 'Back'}</span>
          </button>

          <button
            onClick={toggleLanguage}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-gold-500/30 hover:bg-gold-500/10 transition-all text-sm font-bold"
          >
            <Globe size={16} className="text-gold-500" />
            <span>{isAr ? 'English' : 'العربية'}</span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white flex items-center justify-center shadow-xl">
            <img src="/logo_nomo.png" alt="Nomo" className="w-14 h-14 object-contain" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-400 text-xs font-bold mb-3">
            <FileCheck size={14} />
            <span>{isAr ? 'تفاصيل الرخصة الاقتصادية' : 'Business License Details'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {isAr ? 'السجل الاقتصادي الوطني' : 'National Economic Register'}
          </h1>
          <p className="text-white/50 text-sm">
            {isAr ? 'إليب ش.م.ح. - ذ.م.م | Ellipp FZ_LLC' : 'Ellipp FZ_LLC | إليب ش.م.ح. - ذ.م.م'}
          </p>

          {onVerifyRegistry && (
            <button
              type="button"
              onClick={onVerifyRegistry}
              className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gold-600 to-gold-500 text-white font-bold text-sm shadow-lg hover:shadow-gold-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ExternalLink size={16} />
              <span>
                {isAr ? 'للتحقق من صحة السجل اضغط هنا' : 'Click here to verify registry authenticity'}
              </span>
            </button>
          )}
        </motion.div>

        <div className="space-y-6 max-w-4xl mx-auto">
          {businessLicenseSections.map((section, sectionIdx) => (
            <GlassCard key={sectionIdx} delay={sectionIdx * 0.05} className="p-0 overflow-hidden border-gold-500/10">
              <div className="px-4 md:px-6 py-3 bg-gold-500/10 border-b border-white/10 flex items-center gap-2">
                <Building2 size={18} className="text-gold-500 shrink-0" />
                <h2 className="text-sm md:text-base font-bold text-gold-400">
                  {isAr ? section.titleAr : section.titleEn}
                </h2>
              </div>

              <div className="divide-y divide-white/5">
                {section.fields.map((field, fieldIdx) => (
                  <div
                    key={fieldIdx}
                    className="px-4 md:px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6"
                  >
                    <div className={`text-xs md:text-sm font-bold text-white/50 ${isAr ? 'md:text-right' : 'md:text-left'}`}>
                      {isAr ? field.labelAr : field.labelEn}
                    </div>
                    <div
                      className={`text-sm md:text-base text-white/90 break-words ${isAr ? 'md:text-right' : 'md:text-left'} ${
                        field.valueEn === field.valueAr && /[A-Za-z]/.test(field.valueEn) ? 'dir-ltr font-mono' : ''
                      }`}
                    >
                      {isAr ? field.valueAr : field.valueEn}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      </Container>
    </div>
  );
};
