
import React from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Eye, Trash2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useVendorStore, DocState } from '../../../stores/useVendorStore';
import { GlassCard } from '../../ui/GlassCard';

export const DocumentUploadView: React.FC = () => {
  const { t, language } = useLanguage();
  const { documents, setDocumentFile, simulateUpload, vendorStatus, setVendorStatus } = useVendorStore();

  const handleFileChange = (key: any, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setDocumentFile(key, e.target.files[0]);
      simulateUpload(key);
    }
  };

  const allCompleted = Object.values(documents).every((doc: DocState) => doc.status === 'completed');

  const handleSubmit = () => {
    // Simulate Submission
    setVendorStatus('PENDING_REVIEW');
  };

  const docKeys = ['cr', 'license', 'id', 'iban', 'authLetter'] as const;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-8">
      
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">{t.auth.vendor.docs.title}</h1>
        <p className="text-white/60">{t.auth.vendor.docs.subtitle}</p>
      </div>

      <GlassCard className="p-0 overflow-hidden border-gold-500/20 bg-[#1A1814]/80">
        <div className="divide-y divide-white/5">
          {docKeys.map((key) => {
            const doc = documents[key];
            return (
              <div key={key} className="p-6 flex flex-col md:flex-row items-center gap-6 group hover:bg-white/5 transition-colors">
                
                {/* Icon & Label */}
                <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors
                    ${doc.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'}
                  `}>
                    {doc.status === 'completed' ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm md:text-base">{(t.auth.vendor.docs as any)[key]}</h3>
                    <p className="text-xs text-white/40">PDF, JPG, PNG (Max 5MB)</p>
                  </div>
                </div>

                {/* Upload Action / Status */}
                <div className="flex-1 w-full md:w-auto">
                  {doc.status === 'empty' && (
                    <label className="flex flex-col items-center justify-center w-full h-24 md:h-16 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-gold-500/50 hover:bg-white/5 transition-all group/drop">
                      <div className="flex items-center gap-2 text-white/40 group-hover/drop:text-gold-400">
                        <UploadCloud size={20} />
                        <span className="text-sm font-medium">{t.auth.vendor.docs.dragDrop}</span>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".pdf,.jpg,.png"
                        onChange={(e) => handleFileChange(key, e)}
                      />
                    </label>
                  )}

                  {doc.status === 'uploading' && (
                    <div className="w-full">
                      <div className="flex justify-between text-xs text-white/60 mb-2">
                        <span>{t.auth.vendor.docs.uploading}</span>
                        <span>{doc.progress}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gold-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${doc.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {doc.status === 'completed' && (
                    <div className="flex items-center justify-between md:justify-end gap-3 w-full">
                      <div className="flex items-center gap-2 text-green-400 text-sm font-medium bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/10">
                        <CheckCircle2 size={16} />
                        <span>{t.auth.vendor.docs.completed}</span>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                          <Eye size={18} />
                        </button>
                        <button className="p-2 hover:bg-red-500/10 rounded-lg text-white/50 hover:text-red-400 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Submit Footer */}
        <div className="p-6 bg-[#151310] border-t border-white/5 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!allCompleted}
            className={`
              flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all shadow-lg
              ${allCompleted 
                ? 'bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-white shadow-gold-500/20 cursor-pointer' 
                : 'bg-white/5 text-white/30 cursor-not-allowed'}
            `}
          >
            {t.auth.vendor.docs.submitReview}
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
