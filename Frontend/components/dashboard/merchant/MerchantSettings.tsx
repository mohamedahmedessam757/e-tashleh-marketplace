
import React, { useState } from 'react';
import { User, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';
import { MerchantAccountTab } from './tabs/MerchantAccountTab';
import { MerchantSessionsTab } from './tabs/MerchantSessionsTab';

export const MerchantSettings: React.FC = () => {
    const { language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'account' | 'sessions'>('account');

    const tabs = [
        { 
            id: 'account', 
            label: language === 'ar' ? 'بيانات الحساب' : 'Account Info', 
            icon: User 
        },
        { 
            id: 'sessions', 
            label: language === 'ar' ? 'الجلسات النشطة' : 'Active Sessions', 
            icon: ShieldCheck 
        },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8 min-w-0 overflow-x-clip animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1 scrollbar-thin shrink-0 min-h-[44px]">
                <div className="mb-4 px-2">
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        {language === 'ar' ? 'الإعدادات' : 'Settings'}
                    </h1>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium mt-1">
                        Management Panel
                    </p>
                </div>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            w-full flex items-center gap-3 px-4 py-3.5 min-h-[44px] rounded-2xl transition-all duration-300 group whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink lg:w-full
                            ${activeTab === tab.id 
                                ? 'bg-gold-500 text-black shadow-[0_8px_20px_rgba(212,175,55,0.25)] font-bold scale-[1.02]' 
                                : 'text-white/40 hover:bg-white/5 hover:text-white'}
                        `}
                    >
                        <tab.icon size={18} className={activeTab === tab.id ? 'text-black' : 'group-hover:text-gold-500 transition-colors'} />
                        <span className="text-sm">{tab.label}</span>
                        {activeTab === tab.id && (
                            <div className="ms-auto w-1 h-4 bg-black/20 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3 min-w-0">
                <GlassCard className="min-h-0 md:min-h-[500px] border-white/5 overflow-hidden min-w-0">
                    <div className="p-4 sm:p-6 md:p-10">
                        {activeTab === 'account' && <MerchantAccountTab />}
                        {activeTab === 'sessions' && <MerchantSessionsTab />}
                    </div>

                    {/* Footer Info */}
                    <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2 opacity-30 group">
                            <ShieldCheck size={14} className="text-gold-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] uppercase tracking-widest text-white">Encrypted Environment</span>
                        </div>
                        <span className="text-[10px] text-white/10 font-mono">2026_SECURE_V1.0</span>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};
