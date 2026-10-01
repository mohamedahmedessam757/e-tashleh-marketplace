import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    /** Replaces the default border/background colours. */
    className?: string;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, defaultOpen = false, className }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`border rounded-xl overflow-hidden min-w-0 ${className || 'border-white/5 bg-white/5'}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-3 p-4 text-start transition-colors hover:bg-white/5"
            >
                <span className="font-bold text-white min-w-0 break-words">{title}</span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                >
                    <ChevronDown size={20} className="text-white/50" />
                </motion.div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="p-4 pt-0 text-gray-400 border-t border-white/5 text-sm leading-relaxed">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
