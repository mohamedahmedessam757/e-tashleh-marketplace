import React, { useEffect, useState } from 'react';
import { useCheckoutStore } from '../../../../stores/useCheckoutStore';
import { useProfileStore } from '../../../../stores/useProfileStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useNavigationHistory } from '../../../../utils/useNavigationHistory';
import { LegalModal } from '../../../../components/modals/LegalModal';
import { MapPin, User, Phone, Globe, Mail, AlertTriangle, Edit2, CheckSquare, Square, Package, ChevronDown, ChevronUp } from 'lucide-react';

const InputField = ({ icon: Icon, label, value, field, updateAddress, isError }: any) => (
    <div>
        <label className={`block text-sm mb-2 ${isError ? 'text-red-400' : 'text-gold-200'}`}>{label}</label>
        <div className="relative group">
            <Icon className={`absolute top-3.5 right-3.5 w-5 h-5 transition-colors pointer-events-none ${isError ? 'text-red-500' : 'text-white/40 group-focus-within:text-gold-500'}`} />
            <input
                type="text"
                value={value}
                onChange={(e) => updateAddress(field, e.target.value)}
                className={`w-full rounded-xl px-4 py-3 pr-10 text-white outline-none transition-all ${isError
                    ? 'bg-red-500/10 border border-red-500 focus:border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                    : 'bg-white/5 border border-white/10 focus:border-gold-500 focus:bg-white/10'
                    }`}
                placeholder={label}
            />
        </div>
    </div>
);

export const AddressStep: React.FC<{ showValidationErrors?: boolean; order?: any, onNavigate?: (path: string, id?: any) => void }> = ({ showValidationErrors, order }) => {
    const {
        address, updateAddress,
        termsAccepted, setTermsAccepted,
        returnPolicyAccepted, setReturnPolicyAccepted,
        isEditingShipping, setIsEditingShipping,
        partAddresses, setPartAddress
    } = useCheckoutStore();
    const { user } = useProfileStore();
    const { t, language } = useLanguage();
    const isAr = language === 'ar';

    // Legal Modal State
    const [legalModalOpen, setLegalModalOpen] = useState(false);
    const [legalSection, setLegalSection] = useState<'terms' | 'privacy'>('terms');

    const openLegalModal = (section: 'terms' | 'privacy') => {
        setLegalSection(section);
        setLegalModalOpen(true);
    };

    // Auto-fill from profile once on mount
    useEffect(() => {
        let needsUpdate = false;
        if (!address.fullName && user?.name) {
            updateAddress('fullName', user.name);
            needsUpdate = true;
        }
        if (!address.phone && user?.phone) {
            updateAddress('phone', user.phone);
            needsUpdate = true;
        }
        if (!address.email && user?.email) {
            updateAddress('email', user.email);
            needsUpdate = true;
        }
        // If we auto-filled successfully and city/details exist from a previous session, we can start in read-only.
        // Else, force them into edit mode so they enter city/address.
        if (!address.city || !address.details) {
            setIsEditingShipping(true);
        }
    }, [user]);

    const tC = (t as any).dashboard.checkout;

    // Validation checks for rendering red glow
    const isAddressInvalid = !address.fullName || !address.phone || !address.email || !address.country || !address.city || !address.details;
    const canHaveMultiShipping = order?.parts?.length > 1 && order?.shippingType === 'separate';
    const [showMultiPart, setShowMultiPart] = useState(false);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

            {/* Warning Alert */}
            <div className="bg-orange-500/10 border border-orange-500/50 rounded-xl px-4 py-3 flex items-start gap-3 rtl:flex-row-reverse" dir={isAr ? 'rtl' : 'ltr'}>
                <AlertTriangle className="text-orange-500 shrink-0 size-5 mt-0.5" aria-hidden />
                <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-orange-500 text-sm mb-1.5 leading-snug">{tC.address.alertTitle}</h4>
                    <ul className="m-0 p-0 list-none space-y-1 text-sm text-orange-200/80 leading-normal text-right ltr:text-left">
                        {(tC.address.alertTextLines as string[]).map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Form / Summary Box */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5" dir={isAr ? 'rtl' : 'ltr'}>
                    <div className="flex items-center gap-3">
                        <User className="text-gold-500" size={24} />
                        <h3 className="text-xl font-bold text-white">{tC.steps.address}</h3>
                    </div>
                    <button
                        onClick={() => setIsEditingShipping(!isEditingShipping)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-sm font-bold text-white/80"
                    >
                        <Edit2 size={16} />
                        <span>{tC.common.editData}</span>
                    </button>
                </div>

                {/* Content Body */}
                {isEditingShipping ? (
                    // EDIT MODE
                    <div className="bg-black/20 p-6 rounded-xl border border-white/5" dir={isAr ? 'rtl' : 'ltr'}>
                        <div className="grid md:grid-cols-2 gap-6 text-right ltr:text-left">
                            <InputField icon={User} label={tC.address.name} value={address.fullName} field="fullName" updateAddress={updateAddress} isError={showValidationErrors && !address.fullName} />
                            <InputField icon={Phone} label={tC.address.phone} value={address.phone} field="phone" updateAddress={updateAddress} isError={showValidationErrors && !address.phone} />
                            <InputField icon={Mail} label={tC.address.email || 'Email'} value={address.email} field="email" updateAddress={updateAddress} isError={showValidationErrors && !address.email} />
                            <InputField icon={Globe} label={tC.address.country || 'Country'} value={address.country} field="country" updateAddress={updateAddress} isError={showValidationErrors && !address.country} />
                            <InputField icon={MapPin} label={tC.address.city} value={address.city} field="city" updateAddress={updateAddress} isError={showValidationErrors && !address.city} />
                            <div className="md:col-span-2">
                                <InputField icon={MapPin} label={tC.address.address} value={address.details} field="details" updateAddress={updateAddress} isError={showValidationErrors && !address.details} />
                            </div>
                        </div>
                    </div>
                ) : (
                    // READ-ONLY MODE
                    <div className={`grid md:grid-cols-2 gap-6 p-6 rounded-xl border transition-all ${showValidationErrors && isAddressInvalid ? 'bg-red-500/10 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-[#1A1814] border-white/5'}`} dir={isAr ? 'rtl' : 'ltr'}>
                        <div className="space-y-4 text-right ltr:text-left">
                            <div><span className="text-white/40 text-sm block mb-1">{tC.address.name}:</span> <span className="font-bold text-lg">{address.fullName || '-'}</span></div>
                            <div><span className="text-white/40 text-sm block mb-1">{tC.address.phone}:</span> <span className="font-bold font-mono tracking-wider">{address.phone || '-'}</span></div>
                            <div><span className="text-white/40 text-sm block mb-1">{tC.address.email || 'Email'}:</span> <span className="font-mono text-white/80">{address.email || '-'}</span></div>
                        </div>
                        <div className="space-y-4 text-right ltr:text-left">
                            <div><span className="text-white/40 text-sm block mb-1">{tC.address.country || 'الدولة'}:</span> <span className="font-bold">{address.country || '-'}</span></div>
                            <div><span className="text-white/40 text-sm block mb-1">{tC.address.city}:</span> <span className="font-bold">{address.city || '-'}</span></div>
                            <div><span className="text-white/40 text-sm block mb-1">{tC.address.address}:</span> <span className="text-white/80 leading-relaxed">{address.details || '-'}</span></div>
                        </div>
                    </div>
                )}

                {/* Terms Checkboxes */}
                <div className={`mt-6 p-5 rounded-xl border transition-colors flex flex-col gap-4 text-right ltr:text-left ${showValidationErrors && (!termsAccepted || !returnPolicyAccepted)
                    ? 'bg-red-500/10 border-red-500 shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]'
                    : 'bg-gold-500/5 border-gold-500/20'
                    }`} dir={isAr ? 'rtl' : 'ltr'}>

                    <div
                        onClick={() => setTermsAccepted(!termsAccepted)}
                        className="flex items-center gap-3 w-full group text-right ltr:text-left hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer"
                    >
                        {termsAccepted ? (
                            <CheckSquare className="text-gold-500 shrink-0" size={24} />
                        ) : (
                            <Square className={`shrink-0 transition-colors ${showValidationErrors ? 'text-red-400' : 'text-white/40 group-hover:text-gold-500'}`} size={24} />
                        )}
                        <span className={`font-bold text-sm md:text-base transition-colors flex-wrap flex gap-1 ${termsAccepted ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                            <span>{tC.address.termsCheckboxStart}</span>
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); openLegalModal('terms'); }}
                                className="text-gold-500 hover:text-gold-400 underline underline-offset-4 decoration-gold-500/30"
                            >
                                {tC.address.termsCheckboxLink}
                            </a>
                        </span>
                    </div>

                    <div
                        onClick={() => setReturnPolicyAccepted(!returnPolicyAccepted)}
                        className="flex items-center gap-3 w-full group text-right ltr:text-left hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer"
                    >
                        {returnPolicyAccepted ? (
                            <CheckSquare className="text-gold-500 shrink-0" size={24} />
                        ) : (
                            <Square className={`shrink-0 transition-colors ${showValidationErrors ? 'text-red-400' : 'text-white/40 group-hover:text-gold-500'}`} size={24} />
                        )}
                        <span className={`font-bold text-sm md:text-base transition-colors flex-wrap flex gap-1 ${returnPolicyAccepted ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                            <span>{tC.address.policyCheckboxStart}</span>
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); openLegalModal('privacy'); }}
                                className="text-gold-500 hover:text-gold-400 underline underline-offset-4 decoration-gold-500/30"
                            >
                                {tC.address.policyCheckboxLink}
                            </a>
                            <span>{tC.address.policyCheckboxEnd}</span>
                        </span>
                    </div>

                </div>

            </div>

            {/* Optional Multi-Part Shipping Toggle */}
            {canHaveMultiShipping && (
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden transition-all text-right ltr:text-left" dir={isAr ? 'rtl' : 'ltr'}>
                    <button
                        onClick={() => setShowMultiPart(!showMultiPart)}
                        className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Package className="text-gold-500" size={24} />
                            <div className="text-right ltr:text-left">
                                <h4 className="font-bold text-white mb-1">تخصيص عناوين شحن مستقلة</h4>
                                <p className="text-sm text-white/50">لقد اخترت شحن القطع بشكل منفصل، هل تريد توجيه بعض القطع لورش أخرى؟</p>
                            </div>
                        </div>
                        {showMultiPart ? <ChevronUp className="text-white/40" /> : <ChevronDown className="text-white/40" />}
                    </button>

                    {showMultiPart && (
                        <div className="p-6 border-t border-white/10 bg-black/20 space-y-8">
                            {order.parts.map((p: any) => {
                                const pAddr = partAddresses[p.id] || { fullName: '', phone: '', email: '', country: '', city: '', details: '' };
                                const updatePAddr = (field: any, val: any) => setPartAddress(p.id, { ...pAddr, [field]: val });

                                return (
                                    <div key={p.id} className="bg-white/5 rounded-xl border border-white/10 p-5">
                                        <h5 className="font-bold text-gold-400 mb-4">{p.name}</h5>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <InputField icon={User} label={tC.address.name} value={pAddr.fullName} field="fullName" updateAddress={updatePAddr} />
                                            <InputField icon={Phone} label={tC.address.phone} value={pAddr.phone} field="phone" updateAddress={updatePAddr} />
                                            <InputField icon={Mail} label={tC.address.email || 'Email'} value={pAddr.email} field="email" updateAddress={updatePAddr} />
                                            <InputField icon={Globe} label={tC.address.country || 'Country'} value={pAddr.country} field="country" updateAddress={updatePAddr} />
                                            <InputField icon={MapPin} label={tC.address.city} value={pAddr.city} field="city" updateAddress={updatePAddr} />
                                            <div className="md:col-span-2">
                                                <InputField icon={MapPin} label={tC.address.address} value={pAddr.details} field="details" updateAddress={updatePAddr} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <LegalModal
                isOpen={legalModalOpen}
                onClose={() => setLegalModalOpen(false)}
                initialSection={legalSection}
            />
        </div>
    );
};
