import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, LifeBuoy, Plus, History, HelpCircle, ChevronRight, Calculator, FileText, Scale, Zap } from 'lucide-react';
import { GlassCard } from '../../../ui/GlassCard';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { TicketList } from '../../support/TicketList';
import { MerchantTicketForm } from './MerchantTicketForm';
import { AccordionItem } from '../../../ui/Accordion';
import { SITE_CONTACT_EMAIL } from '../../../../config/site';

interface MerchantSupportPageProps {
    onNavigate?: (path: string, id?: any) => void;
}

export const MerchantSupportPage: React.FC<MerchantSupportPageProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const [view, setView] = useState<'list' | 'new'>('list');

    const faqs = [
        { q: t.dashboard.merchant.support.faq.q1, a: t.dashboard.merchant.support.faq.a1 },
        { q: t.dashboard.merchant.support.faq.q2, a: t.dashboard.merchant.support.faq.a2 },
        { q: t.dashboard.merchant.support.faq.q3, a: t.dashboard.merchant.support.faq.a3 },
        { q: t.dashboard.merchant.support.faq.q4, a: t.dashboard.merchant.support.faq.a4 },
    ];

    const quickActions = [
        {
            id: 'financial',
            icon: Calculator,
            title: t.dashboard.merchant.support.categories.financial,
            desc: language === 'ar' ? 'الاستفسار عن التحويلات والأرباح' : 'Inquire about payouts and earnings',
            color: 'text-emerald-400 bg-emerald-400/10'
        },
        {
            id: 'documents',
            icon: FileText,
            title: t.dashboard.merchant.support.categories.documents,
            desc: language === 'ar' ? 'تحديث السجل التجاري أو الرخص' : 'Update CR or Municipality licenses',
            color: 'text-blue-400 bg-blue-400/10'
        },
        {
            id: 'orders',
            icon: Scale,
            title: t.dashboard.merchant.support.categories.orders,
            desc: language === 'ar' ? 'المساعدة في النزاعات أو الشحن' : 'Help with disputes or shipping',
            color: 'text-amber-400 bg-amber-400/10'
        },
        {
            id: 'technical',
            icon: Zap,
            title: t.dashboard.merchant.support.categories.technical,
            desc: language === 'ar' ? 'الإبلاغ عن مشكلة تقنية في المنصة' : 'Report a platform technical issue',
            color: 'text-purple-400 bg-purple-400/10'
        }
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gold-500/10 text-gold-500 border border-gold-500/20">
                            <LifeBuoy size={32} />
                        </div>
                        {t.dashboard.merchant.support.title}
                    </h1>
                    <p className="text-white/50 mt-2 text-lg">
                        {t.dashboard.merchant.support.subtitle}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {view === 'list' ? (
                        <button
                            onClick={() => setView('new')}
                            className="px-6 py-3 bg-gold-500 hover:bg-gold-400 text-black font-bold rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg shadow-gold-500/20"
                        >
                            <Plus size={20} />
                            {t.dashboard.merchant.support.createTicket}
                        </button>
                    ) : (
                        <button
                            onClick={() => setView('list')}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10 flex items-center gap-2"
                        >
                            <History size={20} />
                            {t.dashboard.merchant.support.myTickets}
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Support Scenarios Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, idx) => (
                    <GlassCard 
                        key={idx}
                        className="p-5 hover:bg-white/5 transition-all cursor-pointer group border-white/5 hover:border-gold-500/30"
                        onClick={() => setView('new')}
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${action.color}`}>
                            <action.icon size={24} />
                        </div>
                        <h3 className="font-bold text-white mb-1 group-hover:text-gold-500 transition-colors">{action.title}</h3>
                        <p className="text-white/40 text-xs leading-relaxed">{action.desc}</p>
                    </GlassCard>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Interaction Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Live Chat Bridge */}
                    <GlassCard
                        className="p-6 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer border-blue-500/20 bg-blue-500/5 group"
                        onClick={() => onNavigate && onNavigate('chats')}
                    >
                        <div className="flex items-center gap-5">
                            <div className="p-4 rounded-2xl bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-colors">
                                <MessageSquare size={28} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-xl">{t.dashboard.merchant.support.liveChat}</h3>
                                <p className="text-white/50">{t.dashboard.merchant.support.liveChatDesc}</p>
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 text-white/30 group-hover:text-white transition-colors">
                            <ChevronRight size={24} className={language === 'ar' ? 'rotate-180' : ''} />
                        </div>
                    </GlassCard>

                    {/* Support Content (List or Form) */}
                    <GlassCard className="p-6 md:p-10 min-h-[550px] relative overflow-hidden">
                         {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 blur-[100px] pointer-events-none" />
                        
                        <AnimatePresence mode="wait">
                            {view === 'list' ? (
                                <motion.div
                                    key="list"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                                        <History className="text-gold-500" />
                                        {t.dashboard.merchant.support.myTickets}
                                    </h2>
                                    <TicketList
                                        onNewClick={() => setView('new')}
                                        onNavigate={(ticketId) => {
                                            if (onNavigate) onNavigate('chats', ticketId);
                                        }}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="new"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <MerchantTicketForm 
                                        onSuccess={() => setView('list')} 
                                        onCancel={() => setView('list')} 
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </GlassCard>
                </div>

                {/* FAQ & Quick Links Area */}
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard className="p-6 sticky top-6 border-white/5 bg-[#12110F]">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
                            <div className="p-2 rounded-lg bg-gold-500/10 text-gold-500">
                                <HelpCircle size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-white">{t.dashboard.merchant.support.faq.title}</h2>
                        </div>
                        
                        <div className="space-y-4">
                            {faqs.map((faq, idx) => (
                                <AccordionItem 
                                    key={idx} 
                                    title={faq.q}
                                    className="border-white/5 bg-white/[0.02]"
                                >
                                    <p className="text-white/60 leading-relaxed text-sm antialiased">
                                        {faq.a}
                                    </p>
                                </AccordionItem>
                            ))}
                        </div>

                        {/* Direct Contact Info */}
                        <div className="mt-12 p-5 rounded-2xl bg-gold-500/5 border border-gold-500/10">
                            <p className="text-xs text-gold-500/60 uppercase tracking-wider font-bold mb-3">
                                {language === 'ar' ? 'اتصال مباشر' : 'Direct Contact'}
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-white/40">Email:</span>
                                    <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="text-white/80 font-medium tracking-tight hover:text-gold-500 transition-colors">{SITE_CONTACT_EMAIL}</a>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-white/40">WhatsApp:</span>
                                    <a href="tel:0525700525" className="text-white/80 font-medium hover:text-gold-500 transition-colors">0525700525</a>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
