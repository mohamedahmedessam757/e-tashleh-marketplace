import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { TermsView } from '../auth/TermsView';

interface LegalModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSection?: 'terms' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, initialSection = 'terms' }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 py-8 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#151310] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto overflow-hidden shadow-2xl relative"
                        >
                            {/* Header */}
                            <div className="flex justify-end p-4 absolute top-0 right-0 z-10">
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content wrapper with custom scrollbar padding */}
                            <div className="flex-1 overflow-y-auto p-2 pt-10 pb-6 custom-scrollbar">
                                <div className="px-4 md:px-6">
                                    <TermsView initialSection={initialSection} isModal />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
