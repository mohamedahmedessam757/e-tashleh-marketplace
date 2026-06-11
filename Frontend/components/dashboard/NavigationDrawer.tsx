import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileStore } from '../../stores/useProfileStore';
import { useAdminStore } from '../../stores/useAdminStore';

interface NavigationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (path: string) => void;
    currentPath: string;
    navItems: any[];
    onLogout: () => void;
    role: string;
    adminRole?: string;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
    isOpen,
    onClose,
    onNavigate,
    currentPath,
    navItems,
    onLogout,
    role,
    adminRole
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const { user } = useProfileStore();
    const { currentAdmin } = useAdminStore();

    const handleNavigation = (id: string) => {
        onNavigate(id);
        onClose();
    };

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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: isAr ? '100%' : '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: isAr ? '100%' : '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={`
              fixed top-0 bottom-0 ${isAr ? 'right-0' : 'left-0'}
              w-[280px] bg-[#151310] border-r border-white/10 z-50
              flex flex-col shadow-2xl
            `}
                    >
                        {/* Header */}
                        <div className="p-6 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gold-500/10 rounded-lg flex items-center justify-center border border-gold-500/20">
                                    <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain brightness-0 invert" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-white text-lg leading-none">E-TASHLEH</h2>
                                    <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{role} PANEL</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
                            >
                                {isAr ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                            </button>
                        </div>

                        {/* Navigation Items */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                            {navItems.map((item) => {
                                // 2026 RBAC: In the new system, we trust the filtered navItems from the layout.
                                // If an item is in this list, the user has permission.
                                const isLocked = false; 

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => !isLocked && handleNavigation(item.id)}
                                        disabled={isLocked}
                                        className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                      ${currentPath === item.id
                                                ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
                                                : isLocked
                                                    ? 'opacity-40 cursor-not-allowed grayscale'
                                                    : 'text-white/60 hover:text-white hover:bg-white/5'}
                    `}
                                    >
                                        <div className="relative">
                                            <item.icon size={20} className={currentPath === item.id ? 'text-gold-400' : ''} />
                                            {isLocked && (
                                                <div className="absolute -top-1 -right-1 bg-black/80 rounded-full p-0.5">
                                                    <Lock size={8} className="text-white/60" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-medium text-sm">{item.label}</span>

                                        {currentPath === item.id && (
                                            <div className={`w-1.5 h-1.5 rounded-full bg-gold-400 ${isAr ? 'mr-auto' : 'ml-auto'}`} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer / Logout */}
                        <div className="p-4 border-t border-white/5 bg-black/20">
                            <button
                                onClick={() => { onLogout(); onClose(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut size={20} />
                                <span className="font-medium text-sm">{t.dashboard.menu.logout}</span>
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
