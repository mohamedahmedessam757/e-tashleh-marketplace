
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, User, Shield, Store, Clock } from 'lucide-react';
import { useResolutionStore } from '../../../stores/useResolutionStore';
import { useProfileStore } from '../../../stores/useProfileStore';
import { usePlatformSettingsStore } from '../../../stores/usePlatformSettingsStore';

interface DisputeChatProps {
    caseId: string;
    caseType: 'return' | 'dispute';
    t: any;
}

export const DisputeChat: React.FC<DisputeChatProps> = ({ caseId, caseType, t }) => {
    const [message, setMessage] = useState('');
    const { caseMessages, fetchCaseMessages, sendCaseMessage, subscribeToCases, unsubscribeFromCases } = useResolutionStore();
    const { user } = useProfileStore();
    const { isAttachmentsEnabled, fetchSettings, subscribeToSettings: subscribePlatform } = usePlatformSettingsStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (caseId) {
            fetchCaseMessages(caseId);
            subscribeToCases(user?.role?.toLowerCase() as any);
        }
        fetchSettings();
        const unsub = subscribePlatform();
        return () => {
            unsubscribeFromCases();
            unsub();
        };
    }, [caseId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [caseMessages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        await sendCaseMessage(caseId, caseType, message);
        setMessage('');
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'ADMIN': return <Shield className="w-3 h-3 text-gold-500" />;
            case 'MERCHANT': return <Store className="w-3 h-3 text-blue-400" />;
            default: return <User className="w-3 h-3 text-gray-400" />;
        }
    };

    const getRoleLabel = (role: string) => {
        if (role === 'ADMIN') return t.dashboard.resolution.chat.officialAdmin || 'Official Admin';
        if (role === 'MERCHANT') return t.dashboard.resolution.chat.merchant || 'Merchant';
        return t.dashboard.resolution.chat.customer || 'Customer';
    };

    return (
        <div className="flex flex-col h-[600px] bg-black/40 backdrop-blur-2xl rounded-[32px] border border-white/5 overflow-hidden shadow-3xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                        <Send className="w-5 h-5 text-gold-500 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-white font-black uppercase tracking-widest text-sm">{t.dashboard.resolution.chat.title}</h3>
                        <p className="text-[10px] text-white/40 font-bold flex items-center gap-1 uppercase tracking-tighter">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                            {t.dashboard.resolution.chat.realtimeActive}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Body */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10"
            >
                <AnimatePresence initial={false}>
                    {caseMessages.map((msg) => {
                        const isMe = msg.senderId === user?.id || msg.senderId === 'me';
                        const isAdmin = msg.senderRole === 'ADMIN';

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] group`}>
                                    <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                            {getRoleIcon(msg.senderRole)}
                                            {getRoleLabel(msg.senderRole)}
                                        </span>
                                        <span className="text-[10px] text-gray-600">
                                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </span>
                                    </div>
                                    
                                    <div className={`
                                        px-4 py-3 rounded-2xl text-sm leading-relaxed
                                        ${isMe 
                                            ? 'bg-gold-600 text-black rounded-tr-none font-medium shadow-lg shadow-gold-900/10' 
                                            : isAdmin
                                                ? 'bg-slate-800 border border-gold-500/30 text-gold-100 rounded-tl-none'
                                                : 'bg-white/5 border border-white/10 text-white rounded-tl-none'
                                        }
                                    `}>
                                        {msg.text}
                                    </div>
                                    
                                    {msg.attachments?.length > 0 && (
                                        <div className={`mt-2 flex flex-wrap gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            {msg.attachments.map((url, i) => (
                                                <img 
                                                    key={i} 
                                                    src={url} 
                                                    className="w-20 h-20 rounded-lg object-cover border border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                                                    alt="attachment" 
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-black/20 border-t border-white/10">
                <div className="relative flex items-center gap-2">
                    {isAttachmentsEnabled && (
                        <button 
                            type="button"
                            className="p-2 text-gray-400 hover:text-white transition-colors hover:bg-white/5 rounded-xl"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>
                    )}
                    
                    <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t.dashboard.resolution.chat.placeholder}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold-500/50 transition-all placeholder:text-gray-600"
                    />

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={!message.trim()}
                        type="submit"
                        className={`
                            p-3 rounded-xl transition-all
                            ${message.trim() 
                                ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' 
                                : 'bg-white/5 text-gray-600 cursor-not-allowed'
                            }
                        `}
                    >
                        <Send className="w-5 h-5" />
                    </motion.button>
                </div>
            </form>
        </div>
    );
};
