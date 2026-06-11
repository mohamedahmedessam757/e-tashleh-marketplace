import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trash2, Globe, DollarSign, Save, Loader2, AlertTriangle } from 'lucide-react';
import { useProfileStore } from '../../../../stores/useProfileStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { usePlatformSettingsStore } from '../../../../stores/usePlatformSettingsStore';

export const SettingsTab: React.FC = () => {
    const { settings, updateSettings, deleteAccount, loading } = useProfileStore();
    const { t, setLanguage, language } = useLanguage();
    const { isAccountDeletionEnabled, fetchSettings } = usePlatformSettingsStore();

    useEffect(() => {
        fetchSettings();
    }, []);

    // Local State for Buffering Changes
    const [localSettings, setLocalSettings] = useState(settings);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    // Delete Confirmation State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Sync local state with store when store updates (initial load)
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    // Check for changes
    useEffect(() => {
        const isDifferent = JSON.stringify(localSettings) !== JSON.stringify(settings);
        setHasChanges(isDifferent);
    }, [localSettings, settings]);

    const handleToggle = (key: keyof typeof settings) => {
        setLocalSettings(prev => ({
            ...prev,
            [key]: !prev[key as keyof typeof settings]
        }));
    };

    const handleChange = (key: keyof typeof settings, value: any) => {
        setLocalSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Apply Language Change Global Context
            if (localSettings.language !== language) {
                setLanguage(localSettings.language);
                // Force document direction update immediately for better UX
                document.documentElement.dir = localSettings.language === 'ar' ? 'rtl' : 'ltr';
                document.documentElement.lang = localSettings.language;
            }

            // Update Store & Backend
            await updateSettings(localSettings);

            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 3000);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteInput !== 'DELETE') return;
        setIsDeleting(true);
        try {
            await deleteAccount();
        } catch (error) {
            console.error('Delete failed', error);
            setIsDeleting(false);
        }
    };

    return (
        <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 relative pb-20">

            {/* Global Preferences */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Globe size={20} className="text-gold-500" />
                    {t.dashboard.profile.settings?.global || 'Global Preferences'}
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                    {/* Language */}
                    <div className="p-4 bg-[#151310] rounded-xl border border-white/10 flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-white">{t.dashboard.profile.settings?.lang || 'Language'}</h4>
                            <p className="text-xs text-white/40">{t.dashboard.profile.settings?.langDesc || 'Select display language'}</p>
                        </div>
                        <div className="flex gap-2 rounded-lg bg-black/40 p-1">
                            <button
                                onClick={() => handleChange('language', 'en')}
                                className={`px-4 py-1.5 rounded-md text-sm transition-all ${localSettings.language === 'en' ? 'bg-gold-500 text-black font-bold shadow-lg' : 'text-white/50 hover:text-white'}`}
                            >
                                English
                            </button>
                            <button
                                onClick={() => handleChange('language', 'ar')}
                                className={`px-4 py-1.5 rounded-md text-sm transition-all ${localSettings.language === 'ar' ? 'bg-gold-500 text-black font-bold shadow-lg' : 'text-white/50 hover:text-white'}`}
                            >
                                العربية
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Bell size={20} className="text-gold-500" />
                    {t.dashboard.profile.settings?.notif || 'Notifications'}
                </h3>

                <div className="bg-[#151310] rounded-xl border border-white/10 divide-y divide-white/5">
                    {[
                        { key: 'notifications_email', label: t.dashboard.profile.settings?.notificationTypes?.email || 'Email Notifications' },
                        { key: 'notifications_push', label: t.dashboard.profile.settings?.notificationTypes?.push || 'Push Notifications' },
                        { key: 'notifications_offers', label: t.dashboard.profile.settings?.notificationTypes?.offers || 'Offer Updates' }
                    ].map((item: any) => (
                        <div key={item.key} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                            <h4 className="font-bold text-white text-sm">{item.label}</h4>
                            <button
                                onClick={() => handleToggle(item.key)}
                                className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors relative ${localSettings[item.key as keyof typeof localSettings] ? 'bg-gold-500' : 'bg-white/10'}`}
                            >
                                <motion.div
                                    layout
                                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                                    className={`w-4 h-4 rounded-full shadow-md bg-white flex-shrink-0 ${localSettings[item.key as keyof typeof localSettings] ? 'ml-auto' : 'mr-auto'}`}
                                    style={{
                                        [language === 'ar' ? 'marginRight' : 'marginLeft']: localSettings[item.key as keyof typeof localSettings] ? 'auto' : '0',
                                        [language === 'ar' ? 'marginLeft' : 'marginRight']: !localSettings[item.key as keyof typeof localSettings] ? 'auto' : '0'
                                    }}
                                />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action Buttons (Save & Reset) */}
            <AnimatePresence>
                {hasChanges && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex items-center gap-3 pt-4 border-t border-white/10"
                    >
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-gold-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-gold-400 transition-colors flex items-center gap-2 disabled:opacity-70"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                        </button>
                        <button
                            onClick={() => setLocalSettings(settings)}
                            className="text-white/50 hover:text-white px-4 py-3 font-medium text-sm transition-colors"
                        >
                            {language === 'ar' ? 'إلغاء' : 'Reset'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Danger Zone */}
            {isAccountDeletionEnabled && (
                <>
                    <div className="pt-8 mt-8 border-t border-red-500/10">
                        <div className="p-4 border border-red-500/20 rounded-xl bg-red-500/5 flex items-center justify-between group hover:border-red-500/40 transition-colors">
                            <div>
                                <h4 className="font-bold text-red-500">{t.dashboard.profile.settings?.delete || 'Delete Account'}</h4>
                                <p className="text-xs text-red-400/60 mt-1">{t.dashboard.profile.settings?.dangerDesc || 'Permanently remove account and data'}</p>
                            </div>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={16} />
                                {t.dashboard.profile.settings?.cancel || 'Delete'}
                            </button>
                        </div>
                    </div>

                    {/* Delete Confirmation Modal */}
                    <AnimatePresence>
                        {showDeleteConfirm && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    className="bg-[#1A1814] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-900/20"
                                >
                                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-red-500">
                                        <AlertTriangle size={32} />
                                    </div>

                                    <h3 className="text-xl font-bold text-white text-center mb-2">
                                        {t.dashboard.profile.settings?.deleteConfirm || 'Are you sure?'}
                                    </h3>
                                    <p className="text-white/60 text-center text-sm mb-6">
                                        {t.dashboard.profile.settings?.deleteWarning || 'This action cannot be undone. All your data and invoices will be permanently deleted.'}
                                    </p>

                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 mb-6">
                                        <label className="text-xs text-white/40 uppercase block mb-2">
                                            {t.dashboard.profile.settings?.typeToConfirm || 'Type "DELETE" to confirm'}
                                        </label>
                                        <input
                                            type="text"
                                            value={deleteInput}
                                            onChange={(e) => setDeleteInput(e.target.value)}
                                            className="w-full bg-transparent text-white font-bold outline-none border-b border-white/20 focus:border-red-500 pb-2 transition-colors uppercase placeholder-white/10"
                                            placeholder="DELETE"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="flex-1 py-3 rounded-xl font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                                        >
                                            {t.common?.cancel || 'Cancel'}
                                        </button>
                                        <button
                                            onClick={handleDeleteAccount}
                                            disabled={deleteInput !== 'DELETE' || isDeleting}
                                            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                                        >
                                            {isDeleting && <Loader2 size={16} className="animate-spin" />}
                                            {t.dashboard.profile.settings?.delete || 'Delete Account'}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>
            )}

        </motion.div>
    );
};
