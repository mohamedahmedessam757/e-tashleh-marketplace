import React, { useState } from 'react';
import { Settings, Bell } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { SettingsTab } from '../profile/tabs/SettingsTab';
import { NotificationCenterTab } from './NotificationCenterTab';
import { useLanguage } from '../../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

export const PreferencesPage: React.FC<{ onNavigate?: (path: string, id?: any) => void }> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'settings' | 'notifications'>('settings');

    const tabs = [
        { id: 'settings', label: t.dashboard.profile.tabs.settings || (language === 'ar' ? 'الإعدادات' : 'Settings'), icon: <Settings size={18} /> },
        { id: 'notifications', label: t.dashboard.notificationsCenter?.title || (language === 'ar' ? 'مركز الإشعارات' : 'Notification Center'), icon: <Bell size={18} /> }
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Settings className="text-gold-500" size={32} />
                        {t.dashboard.profile.tabs.settings || (language === 'ar' ? 'التفضيلات والإشعارات' : 'Preferences & Notifications')}
                    </h1>
                    <p className="text-white/50 mt-2">
                        {t.dashboard.profile.tabs.settingsDesc || (language === 'ar' ? 'إدارة إعدادات حسابك، الإشعارات، وتفضيلات اللغة' : 'Manage your account settings, notifications, and language preferences')}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${activeTab === tab.id
                            ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20'
                            : 'bg-[#151310] text-white/50 hover:text-white hover:bg-white/5 border border-white/5 hover:border-white/10'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <GlassCard className="p-6 md:p-10">
                <AnimatePresence mode="wait">
                    {activeTab === 'settings' ? (
                        <SettingsTab key="settings" />
                    ) : (
                        <NotificationCenterTab key="notifications" role="customer" onNavigate={onNavigate} />
                    )}
                </AnimatePresence>
            </GlassCard>
        </div>
    );
};
