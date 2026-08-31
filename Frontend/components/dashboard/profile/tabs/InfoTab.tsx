import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '../../../../stores/useProfileStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Loader2, CheckCircle2, Lock } from 'lucide-react';
import { ContactChangeModal } from './ContactChangeModal';

// 7. Input Group Component
const InputGroup = ({ label, value, onChange, type = "text", placeholder = "", disabled = false, onEditRequest = null, editLabel = "Edit" }: any) => (
    <div className="space-y-2 min-w-0">
        <label className="text-xs text-white/40 uppercase tracking-wider flex items-center justify-between gap-2">
            <span className="truncate">{label}</span>
            {onEditRequest && (
                <button
                    type="button"
                    onClick={onEditRequest}
                    className="text-gold-500 hover:text-gold-400 text-[10px] px-2.5 py-1 rounded-lg bg-gold-500/10 transition-colors shrink-0 min-h-[28px]"
                >
                    {editLabel}
                </button>
            )}
        </label>
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full bg-[#151310] border border-white/10 rounded-xl px-4 py-3 text-white text-sm sm:text-base focus:border-gold-500 outline-none transition-colors placeholder-white/20 ${disabled ? 'opacity-50 cursor-not-allowed bg-black/20 pe-10' : ''}`}
            />
            {disabled && <div className="absolute inset-y-0 end-3 sm:end-4 flex items-center pointer-events-none"><Lock size={14} className="text-white/20" /></div>}
        </div>
    </div>
);

export const InfoTab: React.FC = () => {
    const { user, loading, fetchProfile, updateUser, uploadAvatar } = useProfileStore();
    const { t, language } = useLanguage();
    const [success, setSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [contactModalField, setContactModalField] = useState<'email' | 'phone' | null>(null);
    const [nameDraft, setNameDraft] = useState('');

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        if (user?.name) setNameDraft(user.name);
    }, [user?.name]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateUser({ name: nameDraft });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            await uploadAvatar(file);
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Failed to upload");
        } finally {
            setIsUploading(false);
        }
    };

    const handleContactSuccess = (field: 'email' | 'phone', value: string) => {
        useProfileStore.setState((state) => ({
            user: state.user
                ? {
                    ...state.user,
                    ...(field === 'email' ? { email: value } : { phone: value }),
                }
                : null,
        }));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
    };

    if (loading && !user) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
                <p className="text-white/40 text-sm">Loading Profile...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="text-white/50 text-lg">
                    {t.dashboard.common?.notFound || 'User profile could not be loaded.'}
                </div>
                <button
                    onClick={() => fetchProfile()}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const isCustomer = user.role === 'CUSTOMER';

    return (
        <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 sm:space-y-8 min-w-0">
            <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-8">
                <div className="relative group cursor-pointer w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-gold-600 to-gold-400 p-[2px]">
                        <div className="w-full h-full rounded-full bg-[#1A1814] flex items-center justify-center overflow-hidden relative">
                            {user.avatar ? (
                                <img src={user.avatar} alt="Profile" className={`w-full h-full object-cover transition-all ${isUploading ? 'opacity-50' : 'group-hover:opacity-50'}`} />
                            ) : (
                                <span className="text-2xl sm:text-3xl font-bold text-white transition-all">
                                    {user.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
                                </span>
                            )}

                            <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                {isUploading ? (
                                    <div className="bg-black/50 absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-white w-8 h-8" />
                                    </div>
                                ) : (
                                    <span className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded backdrop-blur-sm">Upload</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleAvatarUpload}
                        disabled={isUploading}
                    />
                </div>

                <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{user.name || user.email}</h2>
                    <p className="text-white/40 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                        {user.role}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <InputGroup
                    label={t.dashboard.profile.info.name}
                    value={nameDraft}
                    onChange={(e: any) => setNameDraft(e.target.value)}
                />
                <InputGroup
                    label={t.dashboard.profile.info.email}
                    value={user.email || ''}
                    onChange={() => undefined}
                    disabled
                    editLabel={language === 'ar' ? 'تعديل' : 'Edit'}
                    onEditRequest={isCustomer ? () => setContactModalField('email') : null}
                />
                <InputGroup
                    label={t.dashboard.profile.info.phone}
                    value={user.phone || ''}
                    onChange={() => undefined}
                    disabled
                    editLabel={language === 'ar' ? 'تعديل' : 'Edit'}
                    onEditRequest={isCustomer ? () => setContactModalField('phone') : null}
                />
            </div>

            <AnimatePresence>
                {contactModalField && (
                    <ContactChangeModal
                        field={contactModalField}
                        language={language === 'ar' ? 'ar' : 'en'}
                        onClose={() => setContactModalField(null)}
                        onSuccess={handleContactSuccess}
                    />
                )}
            </AnimatePresence>

            <div className="pt-4 sm:pt-6 border-t border-white/5 flex flex-wrap items-center justify-end gap-3 sm:gap-4">
                <AnimatePresence>
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 text-green-500 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/20"
                        >
                            <CheckCircle2 size={16} />
                            <span className="text-sm font-bold">{language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved Successfully'}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-3 bg-gold-500 text-black font-bold rounded-xl hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    {t.dashboard.profile.info.save}
                </button>
            </div>
        </motion.div>
    );
};
