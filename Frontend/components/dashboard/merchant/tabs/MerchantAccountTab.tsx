import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVendorStore } from '../../../../stores/useVendorStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Loader2, CheckCircle2, AlertCircle, Lock, Camera } from 'lucide-react';

interface InputGroupProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    onEditRequest?: (() => void) | null;
}

const InputGroup: React.FC<InputGroupProps> = ({ 
    label, value, onChange, type = "text", placeholder = "", disabled = false, onEditRequest = null 
}) => (
    <div className="space-y-2">
        <label className="text-xs text-white/40 uppercase tracking-wider flex items-center justify-between">
            {label}
            {onEditRequest && (
                <button
                    onClick={onEditRequest}
                    className="text-gold-500 hover:text-gold-400 text-[10px] px-2 py-0.5 rounded bg-gold-500/10 transition-colors"
                >
                    {label.includes('البريد') || label.toLowerCase().includes('email') ? 'تعديل' : 'Edit'}
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
                className={`w-full bg-[#151310] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500 outline-none transition-colors placeholder-white/20 ${disabled ? 'opacity-50 cursor-not-allowed bg-black/20' : ''}`}
            />
            {disabled && <div className="absolute inset-y-0 right-4 flex items-center"><Lock size={14} className="text-white/20" /></div>}
        </div>
    </div>
);

export const MerchantAccountTab: React.FC = () => {
    const { 
        account, 
        profile, 
        isLoadingProfile, 
        fetchVendorProfile, 
        updateAccount, 
        updateVendorProfile, 
        uploadLogo 
    } = useVendorStore();
    const { t, language } = useLanguage();
    const [success, setSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Edit Locks (Cyber Security Pattern)
    const [isEmailUnlocked, setIsEmailUnlocked] = useState(false);
    const [isPhoneUnlocked, setIsPhoneUnlocked] = useState(false);
    const [warningModal, setWarningModal] = useState<{ isOpen: boolean; field: 'email' | 'phone' | null }>({ isOpen: false, field: null });

    useEffect(() => {
        fetchVendorProfile();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // updateVendorProfile handles the PATCH /stores/me
            await updateVendorProfile();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('[MerchantAccountTab] Save failed:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            await uploadLogo(file);
        } catch (err: any) {
            console.error('[MerchantAccountTab] Logo upload failed:', err);
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoadingProfile && !account.name) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
                <p className="text-white/40 text-sm">Loading Store Profile...</p>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-8"
        >
            {/* Logo Section */}
            <div className="flex items-center gap-6 mb-8">
                <div className="relative group cursor-pointer w-24 h-24">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-gold-600 to-gold-400 p-[2px]">
                        <div className="w-full h-full rounded-full bg-[#1A1814] flex items-center justify-center overflow-hidden relative">
                            {profile.logo ? (
                                <img 
                                    src={profile.logo} 
                                    alt="Store Logo" 
                                    className={`w-full h-full object-contain p-2 transition-all ${isUploading ? 'opacity-50' : 'group-hover:opacity-50'}`} 
                                />
                            ) : (
                                <Camera size={32} className="text-white/20" />
                            )}

                            {/* Upload Overlay */}
                            <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 bg-black/40'}`}>
                                {isUploading ? (
                                    <Loader2 className="animate-spin text-white w-8 h-8" />
                                ) : (
                                    <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Upload</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleLogoUpload}
                        disabled={isUploading}
                    />
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{account.name || 'Merchant Account'}</h2>
                    <p className="text-white/40 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,0.5)]"></span>
                        {language === 'ar' ? 'تاجر معتمد' : 'Verified Merchant'}
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <InputGroup
                    label={t.dashboard.profile.info.name}
                    value={account.name}
                    onChange={(e) => updateAccount('name', e.target.value)}
                />
                <InputGroup
                    label={t.dashboard.profile.info.email}
                    value={account.email}
                    onChange={(e) => updateAccount('email', e.target.value)}
                    disabled={!isEmailUnlocked}
                    onEditRequest={!isEmailUnlocked ? () => setWarningModal({ isOpen: true, field: 'email' }) : null}
                />
                <InputGroup
                    label={t.dashboard.profile.info.phone}
                    value={account.phone}
                    onChange={(e) => updateAccount('phone', e.target.value)}
                    disabled={!isPhoneUnlocked}
                    onEditRequest={!isPhoneUnlocked ? () => setWarningModal({ isOpen: true, field: 'phone' }) : null}
                />
            </div>

            {/* Security Warning Modal */}
            <AnimatePresence>
                {warningModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#1A1814] w-full max-w-md rounded-2xl border border-red-500/20 overflow-hidden shadow-2xl"
                        >
                            <div className="p-6">
                                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                                    <AlertCircle size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    {language === 'ar' ? 'تحذير أمني هام' : 'Security Warning'}
                                </h3>
                                <p className="text-white/60 text-sm mb-6 leading-relaxed">
                                    {language === 'ar'
                                        ? `أنت على وشك تعديل ${warningModal.field === 'email' ? 'البريد الإلكتروني' : 'رقم الجوال'} الخاص بمتجرك. هذا الإجراء قد يؤثر على بيانات الدخول الخاصة بك. يرجى التأكد من البيانات الجديدة.`
                                        : `You are about to edit your store's ${warningModal.field}. This action will alter your login credentials. Please ensure the new information is correct before proceeding.`
                                    }
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setWarningModal({ isOpen: false, field: null })}
                                        className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-bold text-sm"
                                    >
                                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (warningModal.field === 'email') setIsEmailUnlocked(true);
                                            if (warningModal.field === 'phone') setIsPhoneUnlocked(true);
                                            setWarningModal({ isOpen: false, field: null });
                                        }}
                                        className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-bold shadow-lg shadow-red-500/20 text-sm"
                                    >
                                        {language === 'ar' ? 'أوافق ومسؤول' : 'I Understand'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="pt-6 border-t border-white/5 flex items-center justify-end gap-4">
                <AnimatePresence>
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 text-green-500 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/20"
                        >
                            <CheckCircle2 size={16} />
                            <span className="text-sm font-bold">{language === 'ar' ? 'تم حفظ التغييرات' : 'Changes Saved'}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-3 bg-gold-500 text-black font-bold rounded-xl hover:bg-gold-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    {t.dashboard.merchant.storeProfile.actions.save}
                </button>
            </div>
        </motion.div>
    );
};
