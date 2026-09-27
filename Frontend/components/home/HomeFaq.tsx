import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

type FaqTab = 'customers' | 'merchants';

export const HomeFaq: React.FC = () => {
    const { t } = useLanguage();
    const faq = t.common.home.faq;
    const [tab, setTab] = useState<FaqTab>('customers');
    const items = tab === 'customers' ? faq.customers : faq.merchants;

    const tabs: { id: FaqTab; label: string }[] = [
        { id: 'customers', label: faq.customersTab },
        { id: 'merchants', label: faq.merchantsTab },
    ];

    return (
        <section id="faq" aria-labelledby="faq-title" className="py-10 md:py-14">
            <h1 id="faq-title" className="text-3xl md:text-4xl lg:text-5xl font-black text-white text-center">{faq.title}</h1>
            <p className="text-white/60 text-sm md:text-base text-center mt-3">{faq.subtitle}</p>

            <div role="tablist" aria-labelledby="faq-title" className="flex justify-center gap-2 mt-6">
                {tabs.map(({ id, label }) => {
                    const selected = tab === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            id={`faq-tab-${id}`}
                            aria-selected={selected}
                            aria-controls="faq-panel"
                            onClick={() => setTab(id)}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${selected ? 'bg-gold-400 text-[#1A1814]' : 'bg-white/5 text-white/70 hover:text-white'
                                }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            <div
                id="faq-panel"
                role="tabpanel"
                aria-labelledby={`faq-tab-${tab}`}
                className="mt-8 max-w-4xl mx-auto flex flex-col gap-3"
            >
                {items.map((item) => (
                    <details
                        key={item.q}
                        className="group rounded-xl border border-white/10 bg-white/[0.03] open:border-gold-500/40 transition-colors"
                    >
                        <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-between gap-3 p-4 md:p-5 font-bold md:text-lg text-white text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded-xl">
                            <span>{item.q}</span>
                            <ChevronDown size={18} className="text-gold-400 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        <p className="px-4 md:px-5 pb-4 md:pb-5 text-sm md:text-base text-white/70 leading-relaxed">{item.a}</p>
                    </details>
                ))}
            </div>
        </section>
    );
};
