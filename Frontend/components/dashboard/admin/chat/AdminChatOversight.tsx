
import React, { useEffect, useState } from 'react';
import { useAdminChatStore } from '../../../../stores/useAdminChatStore';
import { AdminChatList } from './AdminChatList';
import { AdminChatWindow } from './AdminChatWindow';
import { AdminChatContext } from './AdminChatContext';
import { GlassCard } from '../../../ui/GlassCard';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { admin } from '../../../../data/locales/admin';
import { Search, MessageSquare, Shield, Clock, AlertCircle, Trash2, Camera, UserPlus, FileText, Layout, List, ShieldAlert, X, Loader2 } from 'lucide-react';

export const AdminChatOversight: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const t = admin[language];
    
    const { fetchChats, isLoading, orderChats, activeChat, fetchChatById, clearActiveChat, _hasLoadedOrder, initSocket } = useAdminChatStore();

    const [showList, setShowList] = useState(true);
    const [showContext, setShowContext] = useState(true);

    useEffect(() => {
        // CRITICAL: Clear any stale activeChat from another page (e.g. Support)
        clearActiveChat();
        initSocket();
        fetchChats('order');
    }, [fetchChats, clearActiveChat, initSocket]);

    if (isLoading && !_hasLoadedOrder) {
        return (
            <div className="h-[calc(100vh-140px)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
                    <span className="text-white/60 font-medium">{isAr ? 'جاري تحميل المحادثات...' : 'Loading conversations...'}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <MessageSquare className="text-gold-500" />
                            {t.chatOversight.title}
                        </h1>
                        <p className="text-sm text-white/50">{t.chatOversight.subtitle}</p>
                    </div>
                    <div className="h-10 w-px bg-white/10 hidden md:block" />
                        {/* Sidebar Toggles */}
                        <div className="flex items-center gap-2 p-1 bg-white/[0.03] rounded-xl border border-white/5">
                            <button 
                                onClick={() => setShowList(!showList)}
                                className={`p-2 rounded-lg transition-all ${showList ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'text-white/40 hover:text-white'}`}
                                title={isAr ? 'قائمة المحادثات' : 'Chat List'}
                            >
                                <MessageSquare size={18} />
                            </button>
                            <button 
                                onClick={() => setShowContext(!showContext)}
                                className={`p-2 rounded-lg transition-all ${showContext ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'text-white/40 hover:text-white'}`}
                                title={isAr ? 'أدوات الرقابة' : 'Oversight Tools'}
                            >
                                <Shield size={18} />
                            </button>
                        </div>
                </div>
                {activeChat && (
                    <div className="px-4 py-2 bg-gold-500/10 border border-gold-500/20 rounded-full text-gold-500 text-xs font-bold animate-pulse flex items-center gap-2">
                        <ShieldAlert size={14} />
                        {isAr ? 'وضع الرقابة نشط' : 'Oversight Mode Active'}
                    </div>
                )}
            </div>

            <GlassCard className="flex-1 p-0 flex overflow-hidden border-white/5 min-h-0 bg-transparent">
                <AnimatePresence mode="popLayout" initial={false}>
                    {/* Column 1: Chat List */}
                    {showList && (
                        <motion.div 
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="border-r border-white/5 h-full flex flex-col bg-[#151310] overflow-hidden"
                        >
                            <div className="w-80 h-full">
                                <AdminChatList />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Column 2: Chat Window */}
                <div className="flex-1 h-full border-r border-white/5 flex flex-col min-w-0 bg-[#0F0E0C]/40">
                    <AdminChatWindow />
                </div>

                <AnimatePresence mode="popLayout" initial={false}>
                    {/* Column 3: Context Panel */}
                    {showContext && (
                        <motion.div 
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="h-full flex flex-col bg-[#151310] overflow-hidden"
                        >
                            <div className="w-80 h-full">
                                <AdminChatContext />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </GlassCard>
        </div>
    );
};
