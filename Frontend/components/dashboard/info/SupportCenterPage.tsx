
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { Badge } from '../../ui/Badge';
import { MessageSquare, HelpCircle, Send, Plus, ChevronDown, ChevronUp, Clock, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useOrderChatStore } from '../../../stores/useOrderChatStore';

export const SupportCenterPage: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
    const { t } = useLanguage();
    const { chats, isLoading, fetchChats, createSupportChat, setActiveChat } = useOrderChatStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: '', message: '', priority: 'MEDIUM' });

    // FAQ State
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    const supportTickets = chats.filter(c => c.type === 'support');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await createSupportChat(newTicket.subject, newTicket.message, undefined);
        setIsCreating(false);
        setNewTicket({ subject: '', message: '', priority: 'MEDIUM' });
    }

    const faqs = [
        { q: t.dashboard.support.faq.q1, a: t.dashboard.support.faq.a1 },
        { q: t.dashboard.support.faq.q2, a: t.dashboard.support.faq.a2 },
        { q: t.dashboard.support.faq.q3, a: t.dashboard.support.faq.a3 },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">{t.dashboard.menu.support}</h1>
                <p className="text-white/50">{t.dashboard.support.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Tickets & Contact */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Create Ticket Button */}
                    {!isCreating && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full p-4 rounded-xl bg-gold-500 text-black font-bold flex items-center justify-center gap-2 hover:bg-gold-400 transition-colors"
                        >
                            <Plus size={20} />
                            {t.dashboard.support.createTicket}
                        </button>
                    )}

                    {/* Create Form */}
                    <AnimatePresence>
                        {isCreating && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <GlassCard className="p-6">
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <h3 className="text-white font-bold mb-4">{t.dashboard.support.newTicketTitle}</h3>
                                            <label className="block text-white/60 text-sm mb-1">{t.dashboard.support.subject}</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none"
                                                value={newTicket.subject}
                                                onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-white/60 text-sm mb-1">{t.dashboard.support.message}</label>
                                            <textarea
                                                required
                                                rows={4}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none resize-none"
                                                value={newTicket.message}
                                                onChange={e => setNewTicket({ ...newTicket, message: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsCreating(false)}
                                                className="px-4 py-2 text-white/60 hover:text-white"
                                            >
                                                {t.common.cancel}
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-6 py-2 bg-gold-500 text-black rounded-lg font-bold hover:bg-gold-400 flex items-center gap-2"
                                            >
                                                <Send size={16} />
                                                {t.common.submit}
                                            </button>
                                        </div>
                                    </form>
                                </GlassCard>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* My Tickets List */}
                    <div>
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <MessageSquare size={20} className="text-gold-500" />
                            {t.dashboard.support.myTickets}
                        </h2>
                        <div className="space-y-3">
                            {isLoading ? (
                                <p className="text-white/50 text-center py-8">{t.dashboard.common?.loading || 'Loading tickets...'}</p>
                            ) : supportTickets.length > 0 ? (
                                supportTickets.map(ticket => {
                                    // Calculate display logic since ticket is now an OrderChat
                                    // The subject was mapped inside the first message text [Subject] message
                                    let displaySubject = "Support Ticket";
                                    if (ticket.lastMessage && ticket.lastMessage.startsWith("[")) {
                                        const endBracket = ticket.lastMessage.indexOf("]");
                                        if (endBracket > 0) {
                                            displaySubject = ticket.lastMessage.substring(1, endBracket);
                                        }
                                    }

                                    return (
                                        <GlassCard
                                            key={ticket.id}
                                            onClick={() => { setActiveChat(ticket.id); onNavigate?.('chats'); }}
                                            className="p-4 flex items-center justify-between hover:border-gold-500/30 transition-colors cursor-pointer group"
                                        >
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-xs text-white/30">#{ticket.id?.substring(0, 8) || 'Ticket'}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${ticket.status === 'OPEN' ? 'bg-blue-500/20 text-blue-400' :
                                                        ticket.status === 'CLOSED' ? 'bg-green-500/20 text-green-400' :
                                                            'bg-white/10 text-white/40'
                                                        }`}>
                                                        {ticket.status}
                                                    </span>
                                                </div>
                                                <h4 className="text-white font-medium group-hover:text-gold-500 transition-colors">{displaySubject}</h4>
                                            </div>
                                            <div className="text-right text-xs text-white/40">
                                                <div className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'Recent'}
                                                </div>
                                            </div>
                                        </GlassCard>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                    <MessageSquare className="mx-auto text-white/10 mb-3" size={32} />
                                    <p className="text-white/40">{t.dashboard.support.noTickets}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: FAQ */}
                <div className="lg:col-span-1">
                    <GlassCard className="p-6 sticky top-6">
                        <div className="flex items-center gap-2 mb-6 text-gold-500">
                            <HelpCircle size={24} />
                            <h2 className="text-xl font-bold text-white">FAQ</h2>
                        </div>

                        <div className="space-y-4">
                            {faqs.map((item, idx) => (
                                <div key={idx} className="border-b border-white/5 last:border-0 pb-4 last:pb-0">
                                    <button
                                        onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                                        className="w-full flex items-center justify-between text-left text-white/80 hover:text-gold-500 transition-colors"
                                    >
                                        <span className="font-medium text-sm">{item.q}</span>
                                        {openFaqIndex === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                    <AnimatePresence>
                                        {openFaqIndex === idx && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <p className="text-white/50 text-xs mt-2 leading-relaxed pl-2 border-l-2 border-white/10">
                                                    {item.a}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
