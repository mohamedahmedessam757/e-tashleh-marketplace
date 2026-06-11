import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, FileWarning, Loader2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Container } from '../ui/Container';
import { NOMO_REGISTRY_PDF_URL } from '../../data/businessLicense';

interface RegistryPdfViewerProps {
  onBack: () => void;
}

export const RegistryPdfViewer: React.FC<RegistryPdfViewerProps> = ({ onBack }) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowRight : ArrowLeft;
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const loadPdf = async () => {
      try {
        const response = await fetch(NOMO_REGISTRY_PDF_URL, { method: 'GET' });
        if (!response.ok) throw new Error('PDF unavailable');
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfObjectUrl(objectUrl);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  const viewerSrc = pdfObjectUrl
    ? `${pdfObjectUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`
    : undefined;

  return (
    <div
      className="min-h-screen bg-[#1A1814] text-white"
      onContextMenu={(e) => e.preventDefault()}
    >
      <Container className="relative z-10 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-white/70 hover:text-gold-400 transition-colors text-sm font-bold"
          >
            <ArrowIcon size={18} />
            <span>{isAr ? 'العودة لتفاصيل الرخصة' : 'Back to license details'}</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-400 text-xs font-bold">
            <ShieldCheck size={14} />
            <span>{isAr ? 'عرض للتحقق فقط' : 'View-only verification'}</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
            {isAr ? 'التحقق من صحة السجل الاقتصادي' : 'Economic Register Verification'}
          </h1>
          <p className="text-white/50 text-sm max-w-2xl mx-auto">
            {isAr
              ? 'هذا المستند للعرض والتحقق فقط. لا يتوفر زر تنزيل مباشر من المنصة.'
              : 'This document is for viewing and verification only. Direct download is disabled on the platform.'}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/60">
            <Loader2 className="w-10 h-10 animate-spin text-gold-500 mb-4" />
            <p className="text-sm font-bold">
              {isAr ? 'جاري تحميل مستند التحقق...' : 'Loading verification document...'}
            </p>
          </div>
        ) : loadError ? (
          <div className="max-w-2xl mx-auto rounded-2xl border border-amber-500/20 bg-amber-500/10 p-8 text-center">
            <FileWarning className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <p className="text-white font-bold mb-2">
              {isAr ? 'مستند التحقق غير متاح حالياً' : 'Verification document is not available'}
            </p>
            <p className="text-white/60 text-sm">
              {isAr
                ? 'تأكد من رفع ملف PDF في backend/assets/nomo-registry.pdf ثم أعد المحاولة.'
                : 'Ensure the PDF is placed at backend/assets/nomo-registry.pdf and try again.'}
            </p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl">
            <iframe
              title={isAr ? 'مستند السجل الاقتصادي' : 'Economic register document'}
              src={viewerSrc}
              className="w-full h-[75vh] min-h-[480px] bg-white"
            />
          </div>
        )}
      </Container>
    </div>
  );
};
