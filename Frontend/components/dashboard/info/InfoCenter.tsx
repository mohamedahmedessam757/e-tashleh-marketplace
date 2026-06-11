
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Shield, FileText, HelpCircle, Mail, ChevronDown, CheckCircle2, Loader2, Phone } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';
import { useOrderChatStore } from '../../../stores/useOrderChatStore'; // Import unified store
import { SITE_CONTACT_EMAIL } from '../../../config/site';

export const InfoCenter: React.FC = () => {
  const { t, language } = useLanguage();
  const { createSupportChat } = useOrderChatStore();
  const [activeTab, setActiveTab] = useState('about');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Contact Form State
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const tabs = [
    { id: 'about', label: t.dashboard.infoCenter.tabs.about, icon: Info },
    { id: 'privacy', label: t.dashboard.infoCenter.tabs.privacy, icon: Shield },
    { id: 'terms', label: t.dashboard.infoCenter.tabs.terms, icon: FileText },
    { id: 'faq', label: t.dashboard.infoCenter.tabs.faq, icon: HelpCircle },
    { id: 'contact', label: t.dashboard.infoCenter.tabs.contact, icon: Mail },
  ];

  const faqs = [
    { q: "How long does shipping take?", a: "Shipping usually takes 3-7 business days depending on the location of the part and your address." },
    { q: "Can I return a part?", a: "Yes, you have a 48-hour window after delivery to request a return if the part is defective or not matching description." },
    { q: "Is payment secure?", a: "Absolutely. We use bank-grade SSL encryption and hold funds in escrow until you approve the part." },
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !subject) return;

    setIsSending(true);
    setTimeout(async () => {
      await createSupportChat(subject, message);
      setIsSending(false);
      setShowSuccess(true);
      setMessage('');
      setSubject('');
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.dashboard.infoCenter.title}</h1>
          <p className="text-white/50 text-sm">{t.dashboard.infoCenter.subtitle}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${activeTab === tab.id
                  ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20'
                  : 'text-white/50 hover:bg-white/5 hover:text-white'}
              `}
            >
              <tab.icon size={18} />
              <span className="font-bold text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <GlassCard className="min-h-[500px] p-6 md:p-10 bg-[#1A1814]/80">
            <AnimatePresence mode="wait">

              {/* ABOUT */}
              {activeTab === 'about' && (
                <motion.div key="about" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <h2 className="text-2xl font-bold text-white mb-6">{t.about.title}</h2>
                  <div className="prose prose-invert max-w-none text-white/80">
                    <p className="mb-4 text-white/90 font-medium">{t.about.description}</p>

                    <div className="grid md:grid-cols-2 gap-6 my-8">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <h3 className="text-gold-400 font-bold mb-2">{t.about.missionTitle}</h3>
                        <p className="text-sm">{t.about.missionDesc1}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <h3 className="text-gold-400 font-bold mb-2">{t.about.philosophyTitle}</h3>
                        <ul className="text-sm list-disc list-inside space-y-1">
                          {t.about.values.map((v, i) => <li key={i}>{v}</li>)}
                        </ul>
                      </div>
                    </div>
                    <p className="text-sm text-white/60">{t.about.missionDesc2}</p>
                  </div>
                </motion.div>
              )}

              {/* PRIVACY */}
              {activeTab === 'privacy' && (
                <motion.div key="privacy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <h2 className="text-2xl font-bold text-white mb-6">{t.legal.tabs.privacy}</h2>
                  <div className="space-y-4">
                    {t.legal.privacyContent.map((item, idx) => (
                      <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <h3 className="font-bold text-white mb-2">{item.title}</h3>
                        <div className="text-sm text-white/70 leading-relaxed">
                          {Array.isArray(item.content) ? (
                            <ul className="space-y-2">
                              {item.content.map((line, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-gold-500 mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-current" />
                                  <span>{line.replace(/^•\s*/, '')}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            item.content
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TERMS */}
              {activeTab === 'terms' && (
                <motion.div key="terms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <h2 className="text-2xl font-bold text-white mb-6">{t.legal.tabs.terms}</h2>
                  <div className="space-y-4">
                    {t.legal.termsContent.map((item, idx) => (
                      <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <h3 className="font-bold text-white mb-2">{item.title}</h3>
                        <div className="text-sm text-white/70 leading-relaxed">
                          {Array.isArray(item.content) ? (
                            <ul className="space-y-2">
                              {item.content.map((line, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-gold-500 mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-current" />
                                  <span>{line.replace(/^•\s*/, '')}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            item.content
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* FAQ */}
              {activeTab === 'faq' && (
                <motion.div key="faq" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <h2 className="text-2xl font-bold text-white mb-6">{t.dashboard.infoCenter.tabs.faq}</h2>
                  <div className="space-y-3">
                    {faqs.map((faq, idx) => (
                      <div key={idx} className="border border-white/10 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                          className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors text-left"
                        >
                          <span className="font-bold text-white">{faq.q}</span>
                          <ChevronDown className={`transition-transform duration-300 ${expandedFaq === idx ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {expandedFaq === idx && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="bg-[#151310] overflow-hidden"
                            >
                              <div className="p-4 text-sm text-white/70 border-t border-white/5">
                                {faq.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* CONTACT (Updated with Form) */}
              {activeTab === 'contact' && (
                <motion.div key="contact" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <h2 className="text-2xl font-bold text-white mb-6">{t.dashboard.infoCenter.tabs.contact}</h2>

                  {/* Contact Info Cards */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3">
                      <div className="p-2 bg-gold-500/20 text-gold-400 rounded-lg"><Mail size={20} /></div>
                      <div>
                        <div className="text-[10px] text-white/40 uppercase">Email</div>
                        <div className="text-sm font-bold text-white">{SITE_CONTACT_EMAIL}</div>
                      </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3">
                      <div className="p-2 bg-gold-500/20 text-gold-400 rounded-lg"><Phone size={20} /></div>
                      <div>
                        <div className="text-[10px] text-white/40 uppercase">Phone</div>
                        <div className="text-sm font-bold text-white">0525700525</div>
                      </div>
                    </div>
                  </div>

                  {showSuccess ? (
                    <div className="p-8 bg-green-500/10 border border-green-500/20 rounded-xl text-center flex flex-col items-center">
                      <CheckCircle2 size={48} className="text-green-400 mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">{t.support.successTitle}</h3>
                      <p className="text-white/60">{t.support.successMessage}</p>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4 max-w-lg">
                      <div className="bg-gradient-to-br from-gold-600/20 to-transparent p-6 rounded-2xl border border-gold-500/20 mb-6">
                        <p className="text-white">Need help? Open a support ticket directly.</p>
                      </div>

                      <div>
                        <label className="block text-white/60 text-sm mb-2">Subject</label>
                        <input
                          type="text"
                          required
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500 outline-none"
                          placeholder="What is this about?"
                        />
                      </div>

                      <div>
                        <label className="block text-white/60 text-sm mb-2">Message</label>
                        <textarea
                          rows={4}
                          required
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500 outline-none resize-none"
                          placeholder="Describe your issue..."
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSending}
                        className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-70 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                      >
                        {isSending ? <Loader2 className="animate-spin" /> : <Mail size={18} />}
                        {isSending ? t.support.sending : t.support.submit}
                      </button>
                    </form>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
