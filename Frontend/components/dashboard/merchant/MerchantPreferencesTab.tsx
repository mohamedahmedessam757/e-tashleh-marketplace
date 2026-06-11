import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Globe, Save, Loader2, Smartphone, Mail } from 'lucide-react';
import { useVendorStore } from '../../../stores/useVendorStore';
import { useLanguage } from '../../../contexts/LanguageContext';

export const MerchantPreferencesTab: React.FC = () => {
    const { settings, updateSettings, updateVendorProfile, isLoadingProfile } = useVendorStore();
    const { t, setLanguage, language, toggleLanguage } = useLanguage();

    // Local State for Buffering Changes
    const [localSettings, setLocalSettings] = useState(settings);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    const isAr = language === 'ar';

    // Sync local state with store when store updates (initial load)
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    // Check for changes
    useEffect(() => {
        const isDifferent = JSON.stringify(localSettings) !== JSON.stringify(settings);
        setHasChanges(isDifferent);
    }, [localSettings, settings]);

    const handleToggle = (key: 'whatsapp' | 'email') => {
        setLocalSettings(prev => ({
            ...prev,
            notifications: {
                ...prev.notifications,
                [key]: !prev.notifications[key]
            }
        }));
    };

    const handleLanguageChange = (lang: 'ar' | 'en') => {
        if (lang === language) return;
        setLanguage(lang);
        // Force document direction update immediately for better UX
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
        
        // Update local settings to match context if needed, though context is global
        setLocalSettings(prev => ({ ...prev })); 
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update Store & Backend
            await updateSettings(localSettings);
            // Optionally sync with profile if language is stored there in DB
            // await updateVendorProfile(); 

            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 3000);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="space-y-8"
        >
            {/* Success Toast (Inline) */}
            <AnimatePresence>
                {savedSuccess && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm font-bold flex items-center gap-2 mb-4"
                    >
                        <Save size={16} />
                        {isAr ? 'تم حفظ التفضيلات بنجاح' : 'Preferences saved successfully'}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Global Preferences */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Globe size={20} className="text-gold-500" />
                    {isAr ? 'تفضيلات النظام' : 'Global Preferences'}
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                    {/* Language Selection */}
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between group hover:border-gold-500/30 transition-all">
                        <div>
                            <h4 className="font-bold text-white">{isAr ? 'لغة الواجهة' : 'Interface Language'}</h4>
                            <p className="text-xs text-white/40">{isAr ? 'اختر اللغة المفضلة للوحة التحكم' : 'Select your preferred dashboard language'}</p>
                        </div>
                        <div className="flex gap-1 rounded-xl bg-black/40 p-1 border border-white/5">
                            <button
                                onClick={() => handleLanguageChange('en')}
                                className={`px-4 py-2 rounded-lg text-sm transition-all font-bold ${language === 'en' ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'text-white/40 hover:text-white'}`}
                            >
                                EN
                            </button>
                            <button
                                onClick={() => handleLanguageChange('ar')}
                                className={`px-4 py-2 rounded-lg text-sm transition-all font-bold ${language === 'ar' ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'text-white/40 hover:text-white'}`}
                            >
                                AR
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Bell size={20} className="text-gold-500" />
                    {isAr ? 'تنبيهات المتجر' : 'Store Notifications'}
                </h3>

                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
                    {/* WhatsApp Toggle */}
                    <div className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                <Smartphone size={20} className="text-green-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">{isAr ? 'تنبيهات واتساب' : 'WhatsApp Alerts'}</h4>
                                <p className="text-xs text-white/40">{isAr ? 'استلام إشعارات الطلبات الجديدة عبر الواتساب' : 'Receive new order alerts via WhatsApp'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleToggle('whatsapp')}
                            className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors relative ${localSettings.notifications.whatsapp ? 'bg-green-500' : 'bg-white/10'}`}
                        >
                            <motion.div
                                layout
                                transition={{ type: "spring", stiffness: 700, damping: 30 }}
                                className={`w-4 h-4 rounded-full shadow-md bg-white flex-shrink-0 ${localSettings.notifications.whatsapp ? (isAr ? 'mr-auto' : 'ml-auto') : (isAr ? 'ml-auto' : 'mr-auto')}`}
                            />
                        </button>
                    </div>

                    {/* Email Toggle */}
                    <div className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                <Mail size={20} className="text-blue-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">{isAr ? 'البريد الإلكتروني' : 'Email Newsletter'}</h4>
                                <p className="text-xs text-white/40">{isAr ? 'تلقي ملخص أسبوعي للمبيعات والنشاط' : 'Receive weekly sales and activity summary'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleToggle('email')}
                            className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors relative ${localSettings.notifications.email ? 'bg-gold-500' : 'bg-white/10'}`}
                        >
                            <motion.div
                                layout
                                transition={{ type: "spring", stiffness: 700, damping: 30 }}
                                className={`w-4 h-4 rounded-full shadow-md bg-white flex-shrink-0 ${localSettings.notifications.email ? (isAr ? 'mr-auto' : 'ml-auto') : (isAr ? 'ml-auto' : 'mr-auto')}`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <AnimatePresence>
                {hasChanges && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="flex items-center gap-3 p-4 bg-gold-500/5 border border-gold-500/20 rounded-2xl"
                    >
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-gold-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-gold-400 transition-all flex items-center gap-2 disabled:opacity-70 active:scale-95 shadow-lg shadow-gold-500/20"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {isAr ? 'حفظ التغييرات' : 'Save Changes'}
                        </button>
                        <button
                            onClick={() => setLocalSettings(settings)}
                            className="text-white/50 hover:text-white px-4 py-3 font-medium text-sm transition-colors"
                        >
                            {isAr ? 'إلغاء' : 'Reset'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
