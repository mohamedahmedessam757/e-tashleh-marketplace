import React, { useEffect } from 'react';
import { useOrderChatStore } from '../../../stores/useOrderChatStore';
import { MessageSquare, Clock, CheckCircle, AlertCircle, ChevronRight, Plus, ShieldQuestion } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';

export const TicketList: React.FC<{ onNewClick: () => void; onNavigate?: (chatId: string) => void }> = ({ onNewClick, onNavigate }) => {
    const { t, language } = useLanguage();
    const { chats, isLoading, fetchChats } = useOrderChatStore();

    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    const tickets = chats.filter(c => c.type === 'support');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'PENDING': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            case 'CLOSED': return 'text-white/30 bg-white/5 border-white/10';
            default: return 'text-white/60 bg-white/5 border-white/10';
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-gold-500/20 border-t-gold-500 animate-spin" />
                <p className="text-white/40 font-medium">{t.dashboard.common?.loading || 'Loading tickets...'}</p>
            </div>
        );
    }

    if (tickets.length === 0) {
        return (
            <div className="text-center py-24 flex flex-col items-center">
                <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/10 mb-6 group-hover:text-gold-500 transition-all duration-500">
                    <ShieldQuestion size={40} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{t.dashboard.support.noTickets}</h3>
                <p className="text-white/40 mb-10 max-w-sm mx-auto leading-relaxed">{t.dashboard.support.noTicketsDesc}</p>
                <button
                    onClick={onNewClick}
                    className="px-8 py-4 bg-gold-500 hover:bg-gold-400 text-black font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shadow-xl shadow-gold-500/20 group"
                >
                    <Plus size={22} className="group-hover:rotate-90 transition-transform duration-500" />
                    <span>{t.dashboard.support.createTicket}</span>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {tickets.map((ticket) => {
                let displaySubject = t.dashboard.support.title;
                if (ticket.lastMessage && ticket.lastMessage.startsWith("[")) {
                    const endBracket = ticket.lastMessage.indexOf("]");
                    if (endBracket > 0) {
                        displaySubject = ticket.lastMessage.substring(1, endBracket);
                    }
                }

                return (
                    <GlassCard
                        key={ticket.id}
                        onClick={() => onNavigate && onNavigate(ticket.id)}
                        className="p-5 hover:bg-white/[0.04] border-white/5 hover:border-gold-500/30 transition-all cursor-pointer group relative overflow-hidden"
                    >
                         {/* Hover Glow */}
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gold-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left opacity-30" />
                        
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${getStatusColor(ticket.status)} border shadow-sm`}>
                                    {ticket.status === 'CLOSED' ? <CheckCircle size={24} /> : <Clock size={24} />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg group-hover:text-gold-500 transition-colors">
                                        {displaySubject}
                                    </h4>
                                    <div className="flex items-center gap-3 text-xs text-white/30 mt-1.5 font-medium">
                                        <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5">#{ticket.id?.substring(0, 8).toUpperCase()}</span>
                                        <span>•</span>
                                        <span className="italic">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex flex-col items-end">
                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter border shadow-sm ${getStatusColor(ticket.status)}`}>
                                        {ticket.status}
                                    </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white/5 text-white/20 group-hover:bg-gold-500 group-hover:text-black transition-all duration-300">
                                    <ChevronRight size={20} className={language === 'ar' ? 'rotate-180' : ''} />
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                );
            })}
        </div>
    );
};
