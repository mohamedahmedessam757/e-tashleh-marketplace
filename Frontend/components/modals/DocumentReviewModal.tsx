
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle, ZoomIn, ZoomOut, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface DocumentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  docTitle: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({ isOpen, onClose, docTitle, onApprove, onReject }) => {
  const { t, language } = useLanguage();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [zoom, setZoom] = useState(1);

  const isAr = language === 'ar';

  const handleRejectSubmit = () => {
      if (rejectReason) {
          onReject(rejectReason);
          onClose();
      }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      >
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#1A1814] border border-white/10 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col relative overflow-hidden"
        >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#151310]">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Reviewing: <span className="text-gold-400">{docTitle}</span>
                </h3>
                <div className="flex gap-2">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white">
                        <ZoomOut size={20} />
                    </button>
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white">
                        <ZoomIn size={20} />
                    </button>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Document Viewer (Mock Image) */}
            <div className="flex-1 overflow-auto p-8 bg-[#0a0a0a] flex items-center justify-center relative">
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.2 }} />
                
                <motion.div 
                    style={{ scale: zoom }} 
                    className="relative shadow-2xl origin-center transition-transform duration-200"
                >
                    <div className="w-[500px] h-[700px] bg-white text-black p-10 flex flex-col">
                        {/* Mock Document Content */}
                        <div className="border-b-2 border-black pb-4 mb-8 flex justify-between items-end">
                            <h1 className="text-2xl font-bold uppercase">{docTitle}</h1>
                            <div className="text-sm">Ref: 123-456</div>
                        </div>
                        <div className="space-y-4 text-xs font-mono opacity-60">
                            <p>This is a certified document simulation.</p>
                            <p>Issued by: Ministry of Commerce</p>
                            <p>Date: 2024-01-01</p>
                            <p>Expiry: 2025-01-01</p>
                            <div className="w-full h-32 bg-gray-100 border border-gray-300 mt-10 flex items-center justify-center text-gray-400">
                                [ Official Seal / QR ]
                            </div>
                            <div className="mt-20 space-y-2">
                                <div className="h-2 bg-gray-200 w-full rounded"></div>
                                <div className="h-2 bg-gray-200 w-[90%] rounded"></div>
                                <div className="h-2 bg-gray-200 w-[95%] rounded"></div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Actions Bar */}
            <div className="p-4 border-t border-white/10 bg-[#151310] flex justify-between items-center">
                <div className="text-xs text-white/40">
                    Press Approve to verify validity.
                </div>
                
                <div className="flex gap-3">
                    {showRejectForm ? (
                        <div className="flex gap-2 items-center animate-in slide-in-from-right">
                            <input 
                                type="text" 
                                placeholder="Reason for rejection..."
                                className="bg-black/30 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 outline-none w-64"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                autoFocus
                            />
                            <button 
                                onClick={handleRejectSubmit}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold"
                            >
                                Confirm Reject
                            </button>
                            <button 
                                onClick={() => setShowRejectForm(false)}
                                className="p-2 text-white/50 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <button 
                                onClick={() => setShowRejectForm(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold transition-all"
                            >
                                <XCircle size={18} />
                                Reject
                            </button>
                            <button 
                                onClick={() => { onApprove(); onClose(); }}
                                className="flex items-center gap-2 px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all"
                            >
                                <CheckCircle2 size={18} />
                                Approve
                            </button>
                        </>
                    )}
                </div>
            </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
