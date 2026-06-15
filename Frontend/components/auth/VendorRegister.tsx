import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Mail, Phone, Lock, User, CheckCircle2, UploadCloud,
  ChevronRight, ChevronLeft, Loader2, AlertCircle, FileCheck, Check,
  FileText, Eye, MapPin, ArrowLeft, ArrowRight, Car, Wrench, Package
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useVendorStore } from '../../stores/useVendorStore';
import { useAdminStore } from '../../stores/useAdminStore'; // Import AdminStore for contract
import { OTPVerification } from './OTPVerification';
import { OTPMethodSelection } from './OTPMethodSelection';
import { authApi } from '@/services/api/auth';
import { otpSecondsFromMinutes } from '../../utils/otpConfig';
import { consumeRegisterPrefill } from '../../utils/registerPrefill';
import { useCatalogStore } from '../../stores/useCatalogStore';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';

const generateSecurePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

interface VendorRegisterProps {
  onComplete: () => void;
  onBack?: () => void;
}

export const VendorRegister: React.FC<VendorRegisterProps> = ({ onComplete, onBack }) => {
  const { t, language } = useLanguage();
  const store = useVendorStore();
  const { fetchVendorContract, systemConfig } = useAdminStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shake, setShake] = React.useState(false);

  // Local active contract state
  const [liveContractContent, setLiveContractContent] = useState<any>(systemConfig.content.vendorContract);
  const [liveContractId, setLiveContractId] = useState<string | null>(null);

  // Local OTP State
  const [otpStep, setOtpStep] = React.useState<'method' | 'verify'>('method');
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [otpMethodError, setOtpMethodError] = React.useState<string | null>(null);
  const [otpMethod, setOtpMethod] = React.useState<'email' | 'whatsapp'>('email');
  const [otpExpiresInSeconds, setOtpExpiresInSeconds] = React.useState<number | undefined>();

  const { makes, fetchCatalog, isLoading: isLoadingCatalog, subscribeToCatalog, unsubscribeFromCatalog } = useCatalogStore();
  const [errorField, setErrorField] = React.useState<'name' | 'email' | 'phone' | 'storeName' | 'address' | 'makes' | 'models' | 'all' | null>(null);
  const [prefillNotice, setPrefillNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    const prefill = consumeRegisterPrefill();
    if (!prefill || prefill.role !== 'merchant') return;
    setPrefillNotice(
      t.auth.errors?.accountNotFoundRedirect ||
        (language === 'ar' ? 'لا يوجد حساب — أكمل التسجيل أدناه' : 'No account found — complete registration below'),
    );
    if (prefill.email) store.updateAccount('email', prefill.email);
    if (prefill.countryCode) store.updateAccount('countryCode', prefill.countryCode);
    if (prefill.phone) store.updateAccount('phone', prefill.phone);
    if (prefill.method) setOtpMethod(prefill.method);
  }, []);

  // Computed Models list based on selected makes
  const availableModels = React.useMemo(() => {
    return makes
      .filter(m => store.storeInfo.selectedMakes.includes(m.name))
      .flatMap(m => m.models.map(t => ({ ...t, make: m.name })));
  }, [store.storeInfo.selectedMakes, makes]);

  const countries = [
    { code: '+966', name: language === 'ar' ? 'السعودية' : 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+971', name: language === 'ar' ? 'الإمارات' : 'UAE', flag: '🇦🇪' },
    { code: '+973', name: language === 'ar' ? 'البحرين' : 'Bahrain', flag: '🇧🇭' },
    { code: '+974', name: language === 'ar' ? 'قطر' : 'Qatar', flag: '🇶🇦' },
    { code: '+965', name: language === 'ar' ? 'الكويت' : 'Kuwait', flag: '🇰🇼' },
    { code: '+968', name: language === 'ar' ? 'عمان' : 'Oman', flag: '🇴🇲' },
  ];

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 9) val = val.slice(0, 9);
    store.updateAccount('phone', val);

    if (val.length > 0 && !val.startsWith('5')) {
      setError(t.auth.errors?.invalidPhoneStart || 'Mobile number must start with 5');
      setErrorField('phone');
    } else if (val.length > 0 && val.length < 9) {
      setError(null);
      setErrorField(null);
    } else {
      setError(null);
      setErrorField(null);
    }
  };

  const getFormattedPhone = () => {
    const p = store.account.phone;
    if (!p) return '';
    let formatted = '';
    if (p.length > 0) formatted += p[0];
    if (p.length > 1) formatted += ' ' + p.slice(1, 3);
    if (p.length > 3) formatted += ' ' + p.slice(3, 5);
    if (p.length > 5) formatted += ' ' + p.slice(5, 7);
    if (p.length > 7) formatted += ' ' + p.slice(7, 9);
    return formatted;
  };

  const NextIcon = language === 'ar' ? ChevronLeft : ChevronRight;
  const PrevIcon = language === 'ar' ? ChevronRight : ChevronLeft;

  // Reset store on mount
  useEffect(() => {
    store.reset();
    if (makes.length === 0) {
      fetchCatalog();
    }
    subscribeToCatalog();
    return () => unsubscribeFromCatalog();
  }, []);

  // Reset OTP step when entering step 2
  useEffect(() => {
    if (store.step === 2) {
      setOtpStep('method'); // Always start with selection
    }
  }, [store.step]);

  // Bake Contract with Dynamic Values
  const bakeContract = (templateText: string, lang: string) => {
    if (!templateText) return '';
    let text = templateText;

    // Inject First Party Config
    const fp = liveContractContent?.firstPartyConfig || {};
    text = text.replace(/{{FIRST_PARTY_NAME_AR}}/g, fp.companyNameAr || '');
    text = text.replace(/{{FIRST_PARTY_NAME_EN}}/g, fp.companyNameEn || '');
    text = text.replace(/{{FIRST_PARTY_CR}}/g, fp.crNumber || '');
    text = text.replace(/{{FIRST_PARTY_LICENSE}}/g, fp.licenseNumber || '');
    text = text.replace(/{{FIRST_PARTY_EXPIRY}}/g, fp.licenseExpiry || '');
    text = text.replace(/{{FIRST_PARTY_HQ_AR}}/g, fp.headquartersAr || '');
    text = text.replace(/{{FIRST_PARTY_HQ_EN}}/g, fp.headquartersEn || '');

    // Inject Second Party Details
    const sp = store.contractFormData.secondPartyData;
    const sig = store.contractFormData.signatureData;
    const phone = store.account.phone;
    const email = store.account.email;

    text = text.replace(/{{CUSTOMER_COMPANY_NAME}}/g, sp.companyName || '___________');
    text = text.replace(/{{CUSTOMER_CR}}/g, sp.crNumber || '___________');
    text = text.replace(/{{CUSTOMER_LICENSE}}/g, sp.licenseNumber || '___________');
    text = text.replace(/{{CUSTOMER_EXPIRY}}/g, sp.licenseExpiry || '___________');
    text = text.replace(/{{CUSTOMER_NAME}}/g, sp.managerName || '___________');
    text = text.replace(/{{CUSTOMER_EMIRATE}}/g, sp.emirate || '___________');
    text = text.replace(/{{CUSTOMER_COUNTRY}}/g, sp.country || '___________');
    text = text.replace(/{{CUSTOMER_PHONE}}/g, phone || '___________');
    text = text.replace(/{{CUSTOMER_EMAIL}}/g, email || '___________');
    text = text.replace(/{{CUSTOMER_ADDRESS}}/g, sig.address || '___________');
    text = text.replace(/{{CURRENT_DATE}}/g, new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US'));
    return text;
  };

  const getDynamicContract = () => {
    const rawTemplate = language === 'ar' ? liveContractContent?.contentAr : liveContractContent?.contentEn;
    return bakeContract(rawTemplate || '', language);
  };

  // Fetch contract automatically when reaching step 4
  useEffect(() => {
    if (store.step === 4) {
      const getContract = async () => {
        try {
          // Use the project's axios client (correct baseURL from VITE_API_URL)
          const { client } = await import('../../services/api/client');
          const res = await client.get('/contracts/active');
          if (res.data) {
            setLiveContractContent(res.data);
            setLiveContractId(res.data.id);
            store.setContractId(res.data.id);
          }
        } catch (e) {
          console.error("Failed to load active contract:", e);
        }
      };
      getContract();
    }
  }, [store.step]);

  // Validation Logic
  const triggerError = (msg: string, field: 'name' | 'email' | 'phone' | 'storeName' | 'address' | 'makes' | 'models' | 'cr' | 'license' | 'id' | 'iban' | 'authLetter' | 'all' | null = null) => {
    setError(msg);
    if (field) setErrorField(field);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const validateStep = (currentStep: number): boolean => {
    setError(null);
    setErrorField(null);

    if (currentStep === 1) {
      if (!store.account.name || !store.account.email || !store.account.phone) {
        triggerError(t.auth.errors?.fillAll || (language === 'ar' ? 'الرجاء تعبئة جميع الحقول المطلوبة' : 'Please fill in all mandatory fields'), 'all');
        return false;
      }
      if (!store.account.email.includes('@')) {
        triggerError(t.auth.errors?.invalidEmail || (language === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid Email Format'), 'email');
        return false;
      }
      if (!store.account.phone.startsWith('5')) {
        triggerError(t.auth.errors?.invalidPhoneStart || (language === 'ar' ? 'يجب أن يبدأ رقم الجوال بـ 5' : 'Mobile number must start with 5'), 'phone');
        return false;
      }
      if (store.account.phone.length !== 9) {
        triggerError(t.auth.errors?.invalidPhoneLength || (language === 'ar' ? 'يجب أن يتكون رقم الجوال من 9 أرقام' : 'Mobile number must be 9 digits'), 'phone');
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      if (!store.otpVerified) {
        triggerError(t.auth.errors?.verifyOTP || (language === 'ar' ? 'يرجى التحقق من كود التفعيل أولاً' : 'Please verify your OTP first'));
        return false;
      }
    }
    if (currentStep === 3) {
      if (!store.storeInfo.storeName) {
        triggerError(t.auth.vendor.info.enterDetails || (language === 'ar' ? 'الرجاء إدخال اسم المتجر' : 'Please enter store name'), 'storeName');
        return false;
      }
      if (!store.storeInfo.address) {
        triggerError(language === 'ar' ? 'الرجاء إدخال عنوان أو موقع المتجر' : 'Please enter store address', 'address');
        return false;
      }
      if (store.storeInfo.selectedMakes.length === 0 && !store.storeInfo.customMake) {
        triggerError(language === 'ar' ? 'الرجاء تحديد تخصص واحد على الأقل من شركات السيارات' : 'Please select at least one car make', 'makes');
        return false;
      }
      if (store.storeInfo.selectedModels.length === 0 && !store.storeInfo.customModel && store.storeInfo.selectedMakes.length > 0) {
        triggerError(language === 'ar' ? 'الرجاء تحديد موديل واحد على الأقل للشركات المختارة' : 'Please select at least one car model', 'models');
        return false;
      }
    }
    if (currentStep === 4) {
      const sp = store.contractFormData.secondPartyData;
      const sig = store.contractFormData.signatureData;

      if (!sp.companyName || !sp.managerName || !sp.crNumber || !sp.licenseNumber || !sp.licenseExpiry || !sp.emirate || !sp.country || !sig.signedName || !sig.address) {
        triggerError(language === 'ar' ? 'الرجاء تعبئة جميع بيانات العقد المطلوبة' : 'Please fill all required contract data', 'all');
        return false;
      }
      if (!store.contractAgreed) {
        triggerError(t.auth.errors?.contractError || (language === 'ar' ? 'يجب الموافقة على العقد للمتابعة' : 'You must agree to the contract before proceeding'));
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (validateStep(store.step)) {
      if (store.step === 1) {
        setOtpStep('method');
        store.setStep(store.step + 1);
      } else {
        store.setStep(store.step + 1);
      }
    }
  };

  const handlePrev = () => {
    setError(null);
    setErrorField(null);
    store.setStep(store.step - 1);
  };

  const handleVerifyOTP = async (code: string) => {
    if (code.length !== 6) {
      throw new Error(t.auth.errors?.invalidCode || t.auth.otp.invalidCode);
    }

    const fullPhone = `${store.account.countryCode}${store.account.phone}`;

    setIsSubmitting(true);
    try {
      await authApi.registerVerifyOtp({
        email: store.account.email,
        phone: fullPhone,
        channel: otpMethod,
        code,
      });
      store.setOtpVerified(true);
      store.setStep(store.step + 1);
      setOtpStep('method');
    } finally {
      setIsSubmitting(false);
    }
  };

  // GPS Helper
  const handleGPS = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    // Show loading state for GPS if needed (using isSubmitting or local state)
    // For now, assume fast response or implement a local loader

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        store.updateStoreInfo('lat', latitude.toString());
        store.updateStoreInfo('lng', longitude.toString());

        // Auto-fill address with coordinates if reverse geocoding isn't available
        // Or you can leave address empty for user to type, but coordinates are set.
        const coordString = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        if (!store.storeInfo.address) {
          store.updateStoreInfo('address', coordString);
        }
        setError(null);
      },
      (error) => {
        console.error("GPS Error", error);
        setError("Unable to retrieve your location. Please check browser permissions.");
      }
    );
  };

  // Helper for file upload simulation
  const handleFileChange = (key: any, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      // store.setDocumentFile(key, e.target.files[0]); // Optional, uploadDocument handles it
      store.uploadDocument(key, e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    // Validate Step 5 (Files)
    const { cr, license, id, iban, authLetter } = store.documents;

    // Check if all files are uploaded (or at least check status not empty)
    const missingDocs = (['cr', 'license', 'id', 'iban', 'authLetter'] as const).filter(key => 
      store.documents[key].status === 'empty'
    );

    if (missingDocs.length > 0) {
      const errorMsg = language === 'ar' 
        ? 'يرجى رفع المستندات المطلوبة المحددة باللون الأحمر'
        : 'Please upload the required documents highlighted in red';
        
      triggerError(errorMsg, missingDocs[0] as any);
      // We set errorField to the first missing one to trigger the shake on the button, 
      // but the UI loop will handle highlighting ALL missing ones.
      return;
    }

    setIsSubmitting(true);

    try {
      const generatedPassword = generateSecurePassword();
      const fullPhone = `${store.account.countryCode}${store.account.phone}`;

      // Real API Call to Create Vendor Account
      await authApi.registerVendor({
        email: store.account.email,
        password: generatedPassword, // Use auto-generated secure password
        name: store.account.name,
        phone: fullPhone,
        otpChannel: otpMethod,
        // Send Store Details during Registration
        storeName: store.storeInfo.storeName,
        category: "Specialized", // Legacy fallback, backend should use the arrays below
        selectedMakes: store.storeInfo.selectedMakes,
        selectedModels: store.storeInfo.selectedModels,
        customMake: store.storeInfo.customMake,
        customModel: store.storeInfo.customModel,
        contractId: store.contractId,
        contractData: {
          contractId: liveContractId!,
          contractVersion: liveContractContent?.version || 1,
          secondPartyData: store.contractFormData.secondPartyData,
          signatureData: {
            ...store.contractFormData.signatureData,
            email: store.account.email,
            phone: fullPhone,
            date: new Date().toISOString()
          },
          firstPartySnapshot: liveContractContent?.firstPartyConfig || {},
          contentArSnapshot: bakeContract(liveContractContent?.contentAr || '', 'ar'),
          contentEnSnapshot: bakeContract(liveContractContent?.contentEn || '', 'en')
        },
        address: store.storeInfo.address,
        description: store.storeInfo.bio,
        lat: store.storeInfo.lat ? parseFloat(String(store.storeInfo.lat)) : undefined,
        lng: store.storeInfo.lng ? parseFloat(String(store.storeInfo.lng)) : undefined,
        role: 'VENDOR', // Ensure role is sent
        documents: Object.entries(store.documents)
          .filter(([_, doc]) => doc.status === 'completed' || doc.status === 'pending')
          .map(([key, doc]) => ({
            type: {
              cr: 'CR',
              license: 'LICENSE',
              id: 'ID',
              iban: 'IBAN',
              authLetter: 'AUTH_LETTER'
            }[key] || 'OTHER',
            url: doc.fileUrl
          }))
      });

      // NOTE: In Phase 4, we might also want to auto-create the store
      // But for M1, creating the user is the primary goal to enable login.
      // The store details (name, category) and docs are currently held in client store.
      // A full implementation would chain creating the store + uploading docs here.

      setIsSubmitting(false);
      store.setVendorStatus('PENDING_REVIEW'); // Set status to review
      store.setStep(6); // Go to Pending View

    } catch (err: any) {
      console.error('Vendor Registration Error', err);
      if (err.response?.status === 409) {
        setError(t.auth.errors?.phoneExists || 'Phone number already exists');
      } else {
        setError(err.response?.data?.message || t.auth.errors?.registrationFailed);
      }
      setIsSubmitting(false);
    }
  };

  const renderProgressBar = () => (
    <div className="mb-10 px-4 relative">
      <div className="flex items-center justify-between relative z-10">
        {[1, 2, 3, 4, 5].map((s) => {
          const isActive = store.step >= s;
          const isCompleted = store.step > s;
          return (
            <div key={s} className="flex flex-col items-center relative group cursor-default">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isActive ? '#A88B3E' : '#2A200B',
                  borderColor: isActive ? '#C4A95C' : '#ffffff20',
                  scale: isActive ? 1.1 : 1
                }}
                className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 shadow-xl transition-all duration-300 z-20 ${isActive ? 'text-white' : 'text-white/30'}`}
              >
                {isCompleted ? <Check size={16} /> : <span className="text-sm md:text-lg font-bold">{s}</span>}
              </motion.div>
              <div className="absolute top-10 md:top-14 w-20 text-center">
                <span className={`text-[10px] md:text-xs font-bold transition-colors duration-300 ${isActive ? 'text-gold-400' : 'text-white/20'}`}>
                  {t.auth.vendor.steps[s as 1 | 2 | 3 | 4 | 5]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Background Line */}
      <div className="absolute top-[80px] md:top-[96px] left-[10%] w-[80%] h-1 bg-white/10 -z-0 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-gold-600 to-gold-400"
          initial={{ width: '0%' }}
          animate={{ width: `${((store.step - 1) / 4) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
    </div>
  );

  // Step 6: Pending Approval View
  if (store.step === 6) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-10"
      >
        <div className="w-24 h-24 bg-gold-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-gold-500/30">
          <Store size={48} className="text-gold-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">{t.auth.vendor.pending.title}</h2>
        <p className="text-white/60 max-w-md mx-auto leading-relaxed mb-8">
          {t.auth.vendor.pending.subtitle}
        </p>
        <button
          onClick={onComplete}
          className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors"
        >
          {t.auth.vendor.pending.back}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full">
      {store.step < 6 && (
        <div className="text-center mb-8 relative">
          {/* Back Button for Step 1 */}
          {store.step === 1 && onBack && (
            <button
              onClick={onBack}
              className={`absolute top-0 ${language === 'ar' ? 'right-0' : 'left-0'} p-2 text-white/50 hover:text-white transition-colors`}
            >
              <ArrowLeft size={24} className={language === 'ar' ? 'rotate-180' : ''} />
            </button>
          )}

          <h2 className="text-3xl font-bold text-white mb-2">{t.merchants.cta}</h2>
          <p className="text-white/50 text-sm mb-4">{t.merchants.desc}</p>

          {store.step === 1 && onBack && (
            <button onClick={onBack} className="text-gold-400 hover:text-gold-300 text-sm underline underline-offset-4">
              {t.auth.login.title || "Already have an account? Login"}
            </button>
          )}
        </div>
      )}

      {renderProgressBar()}

      <div className="mt-16 md:mt-20 bg-[#000000]/20 rounded-2xl p-1 min-h-[380px] relative">
        <AnimatePresence mode="wait">

          {/* STEP 1: ACCOUNT INFO */}
          {store.step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-6"
            >
              {prefillNotice && (
                <div className="bg-gold-500/10 border border-gold-500/30 rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertCircle size={18} className="text-gold-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gold-200">{prefillNotice}</p>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gold-200 mb-2">{t.auth.vendor.account.name}</label>
                  <div className="relative group">
                    <User className={`absolute top-4 right-4 w-5 h-5 transition-colors pointer-events-none ${(errorField === 'name' || errorField === 'all') ? 'text-red-500' : 'text-white/40 group-focus-within:text-gold-500'}`} />
                    <input
                      type="text"
                      className={`w-full bg-white/5 border rounded-xl px-5 py-4 pr-12 text-white outline-none transition-all placeholder-white/20 ${(errorField === 'name' || errorField === 'all') ? 'border-red-500 ring-2 ring-red-500/50 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.5)] focus:border-red-500' : 'border-white/10 focus:border-gold-500 focus:bg-white/10'}`}
                      value={store.account.name}
                      placeholder={language === 'ar' ? "مثال: محمد أحمد" : "e.g. Mohammad Ahmed"}
                      onChange={e => {
                        store.updateAccount('name', e.target.value);
                        if (errorField === 'name' || errorField === 'all') { setError(null); setErrorField(null); }
                      }}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-gold-200">{t.auth.vendor.account.phone}</label>
                  <div className="flex gap-2" dir="ltr">
                    <div className="relative w-1/3 min-w-[120px]">
                      <select
                        value={store.account.countryCode}
                        onChange={(e) => store.updateAccount('countryCode', e.target.value)}
                        className="w-full h-full bg-white/5 border border-white/10 rounded-xl px-3 py-4 text-white appearance-none outline-none focus:border-gold-500 transition-all text-sm cursor-pointer font-sans"
                        style={{ direction: 'ltr' }}
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code} className="bg-[#1A1814] text-white">
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                        <ArrowRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>

                    <div className="relative flex-1 group">
                      <div className="absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none z-10 transition-colors duration-200">
                        <Phone className={`w-5 h-5 transition-colors ${(errorField === 'phone' || errorField === 'all') ? 'text-red-500' : 'text-white/40 group-focus-within:text-gold-500'}`} />
                      </div>

                      <div
                        className="absolute inset-0 pl-12 pr-4 py-4 flex items-center text-lg tracking-wider pointer-events-none select-none font-sans"
                        aria-hidden="true"
                      >
                        <span className="text-transparent">{getFormattedPhone()}</span>
                        <span className="text-white/20">
                          {getFormattedPhone().length === 0 ? '5 XX XX XX XX' : '5 XX XX XX XX'.slice(getFormattedPhone().length)}
                        </span>
                      </div>

                      <input
                        type="tel"
                        required
                        className={`w-full bg-white/5 border rounded-xl pl-12 pr-4 py-4 text-white outline-none transition-all placeholder-transparent text-lg tracking-wider text-left z-0 font-sans ${(errorField === 'phone' || errorField === 'all') ? 'border-red-500/50 bg-red-500/5 focus:border-red-500 ring-2 ring-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'border-white/10 focus:border-gold-500'} group-focus-within:bg-black/20`}
                        placeholder="5 XX XX XX XX"
                        value={getFormattedPhone()}
                        onChange={handlePhoneChange}
                        maxLength={14}
                      />
                    </div>
                  </div>
                  {error && errorField === 'phone' && (
                    <div className="mt-1 text-xs flex items-center justify-end gap-1 text-red-400 font-bold animate-pulse" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                      <AlertCircle size={12} />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gold-200 mb-2">{t.auth.vendor.account.email}</label>
                  <div className="relative group">
                    <Mail className={`absolute top-4 right-4 w-5 h-5 transition-colors pointer-events-none ${(errorField === 'email' || errorField === 'all') ? 'text-red-500' : 'text-white/40 group-focus-within:text-gold-500'}`} />
                    <input
                      type="email"
                      dir="ltr"
                      className={`w-full bg-white/5 border rounded-xl px-5 py-4 pr-12 text-white outline-none transition-all placeholder-white/20 ${(errorField === 'email' || errorField === 'all') ? 'border-red-500 ring-2 ring-red-500/50 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.5)] focus:border-red-500' : 'border-white/10 focus:border-gold-500 focus:bg-white/10'}`}
                      value={store.account.email}
                      placeholder="merchant@example.com"
                      onChange={e => {
                        store.updateAccount('email', e.target.value);
                        if (errorField === 'email' || errorField === 'all') { setError(null); setErrorField(null); }
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {store.step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4"
            >
              {otpStep === 'method' ? (
                <OTPMethodSelection
                  email={store.account.email}
                  name={store.account.name}
                  isLoading={isSendingOtp}
                  error={otpMethodError}
                  onSelect={async (m) => {
                    setOtpMethod(m);
                    setOtpMethodError(null);
                    setIsSendingOtp(true);
                    try {
                      const fullPhone = `${store.account.countryCode}${store.account.phone}`;
                      const initResult = await authApi.registerInit({
                        email: store.account.email,
                        phone: fullPhone,
                        channel: m,
                        name: store.account.name,
                        role: 'vendor',
                      });
                      setOtpExpiresInSeconds(
                        otpSecondsFromMinutes(initResult?.expiresInMinutes),
                      );
                      setOtpStep('verify');
                    } catch (err: any) {
                      const errorMsg = err.response?.data?.message || err.message;
                      setOtpMethodError(
                        errorMsg ||
                          t.auth.errors?.registrationFailed ||
                          (language === 'ar' ? 'فشل إرسال رمز التحقق' : 'Failed to send verification code'),
                      );
                    } finally {
                      setIsSendingOtp(false);
                    }
                  }}
                />
              ) : (
                <OTPVerification
                  email={store.account.email}
                  phone={`${store.account.countryCode}${store.account.phone}`}
                  method={otpMethod}
                  expiresInSeconds={otpExpiresInSeconds}
                  deliveryHint={
                    otpMethod === 'email'
                      ? `${store.account.countryCode}${store.account.phone}`
                      : undefined
                  }
                  onResend={async () => {
                    const result = await authApi.registerResendOtp({
                      email: store.account.email,
                      phone: `${store.account.countryCode}${store.account.phone}`,
                      channel: otpMethod,
                      name: store.account.name,
                      role: 'vendor',
                    });
                    return { expiresInMinutes: result?.expiresInMinutes };
                  }}
                  onVerify={handleVerifyOTP}
                />
              )}
            </motion.div>
          )}

          {/* STEP 3: STORE INFO */}
          {store.step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">{t.auth.vendor.info.storeName}</label>
                <div className="relative group">
                  <Store className={`absolute top-4 right-4 w-5 h-5 transition-colors pointer-events-none ${(errorField === 'storeName' || errorField === 'all') ? 'text-red-500' : 'text-white/40 group-focus-within:text-gold-500'}`} />
                  <input
                    type="text"
                    className={`w-full bg-white/5 border rounded-xl px-5 py-4 pr-12 text-white outline-none transition-all placeholder-white/20 ${(errorField === 'storeName' || errorField === 'all') ? 'border-red-500 ring-2 ring-red-500/50 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.5)] focus:border-red-500' : 'border-white/10 focus:border-gold-500 focus:bg-white/10'}`}
                    value={store.storeInfo.storeName}
                    placeholder={language === 'ar' ? 'مثال: مركز التقدم للسيارات' : 'e.g. Al-Taqaddum Auto Center'}
                    onChange={e => {
                      store.updateStoreInfo('storeName', e.target.value);
                      if (errorField === 'storeName' || errorField === 'all') { setError(null); setErrorField(null); }
                    }}
                  />
                </div>
              </div>

              {/* New Address Field with GPS */}
              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">{language === 'ar' ? 'عنوان أو موقع المتجر' : 'Store Address & Location'}</label>
                <div className="relative group flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className={`absolute top-4 right-4 w-5 h-5 transition-colors pointer-events-none ${(errorField === 'address' || errorField === 'all') ? 'text-red-500' : 'text-white/40 group-focus-within:text-gold-500'}`} />
                    <input
                      type="text"
                      className={`w-full bg-white/5 border rounded-xl px-5 py-4 pr-12 text-white outline-none transition-all placeholder-white/20 ${(errorField === 'address' || errorField === 'all') ? 'border-red-500 ring-2 ring-red-500/50 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.5)] focus:border-red-500' : 'border-white/10 focus:border-gold-500 focus:bg-white/10'}`}
                      placeholder={language === 'ar' ? 'أدخل عنوان المتجر بوضوح' : 'Enter clear store address'}
                      value={store.storeInfo.address}
                      onChange={e => {
                        store.updateStoreInfo('address', e.target.value);
                        if (errorField === 'address' || errorField === 'all') { setError(null); setErrorField(null); }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGPS}
                    className="px-4 bg-white/10 border border-white/10 rounded-xl hover:bg-gold-500/20 hover:border-gold-500/50 hover:text-gold-400 transition-all flex items-center justify-center text-white/60"
                    title={language === 'ar' ? 'تحديد الموقع GPS' : 'Use GPS'}
                  >
                    <MapPin size={24} />
                  </button>
                </div>
                {store.storeInfo.lat && (
                  <p className="text-xs text-green-400 mt-2 ml-1 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {language === 'ar' ? 'تم التقاط إحداثيات الموقع:' : 'Location Captured:'} {store.storeInfo.lat.toFixed(4)}, {store.storeInfo.lng.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Car Makes Specialization */}
              <div className="pt-4 border-t border-white/10">
                <MultiSelectDropdown
                  label={language === 'ar' ? 'تخصص شركات السيارات' : 'Car Makes Specialization'}
                  items={makes.map(m => ({ id: m.name, name: m.name, nameAr: m.nameAr }))}
                  selectedItems={store.storeInfo.selectedMakes}
                  onChange={(newMakes) => {
                    store.updateStoreInfo('selectedMakes', newMakes as any);
                    if (errorField === 'makes' || errorField === 'all') { setError(null); setErrorField(null); }

                    // Cascading model deselection
                    const stillAvailableModels = makes
                      .filter(m => newMakes.includes(m.name))
                      .flatMap(m => m.models);

                    const stillAvailableModelNames = stillAvailableModels.map(m => m.name);
                    const filteredModels = store.storeInfo.selectedModels.filter(sm => stillAvailableModelNames.includes(sm));

                    if (filteredModels.length !== store.storeInfo.selectedModels.length) {
                      store.updateStoreInfo('selectedModels', filteredModels as any);
                    }
                  }}
                  customValue={store.storeInfo.customMake}
                  onCustomValueChange={(val) => store.updateStoreInfo('customMake', val)}
                  hasError={errorField === 'makes' || errorField === 'all'}
                />
              </div>

              {/* Car Models Specialization (Dependent on Makes) */}
              {store.storeInfo.selectedMakes.length > 0 && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-2"
                  >
                    <MultiSelectDropdown
                      label={language === 'ar' ? 'تخصص موديلات السيارات' : 'Car Models Specialization'}
                      items={availableModels.map(m => ({ id: m.name, name: m.name, nameAr: m.nameAr, subtext: m.make }))}
                      selectedItems={store.storeInfo.selectedModels}
                      onChange={(newModels) => {
                        store.updateStoreInfo('selectedModels', newModels as any);
                        if (errorField === 'models' || errorField === 'all') { setError(null); setErrorField(null); }
                      }}
                      customValue={store.storeInfo.customModel}
                      onCustomValueChange={(val) => store.updateStoreInfo('customModel', val)}
                      hasError={errorField === 'models' || errorField === 'all'}
                    />
                  </motion.div>
                </AnimatePresence>
              )}

              <div className="pt-4 border-t border-white/10">
                <label className="block text-sm font-medium text-gold-200 mb-2">{t.auth.vendor.info.bio}</label>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:border-gold-500 focus:bg-white/10 outline-none transition-all placeholder-white/20 resize-none h-32"
                  value={store.storeInfo.bio}
                  placeholder={language === 'ar' ? 'نبذة قصيرة عن المتجر ورسالتكم...' : 'A short bio about your store...'}
                  onChange={e => store.updateStoreInfo('bio', e.target.value)}
                />
              </div>
            </motion.div>
          )}

          {/* STEP 4: CONTRACT (DYNAMIC) */}
          {store.step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-6"
            >
              <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-6">
                <h4 className="text-lg font-bold text-white border-b border-white/10 pb-2">{language === 'ar' ? 'بيانات الطرف الثاني (التاجر)' : 'Second Party Data'}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-gold-200">{language === 'ar' ? 'إسم الشركة / المؤسسة' : 'Company Name'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" 
                      value={store.contractFormData.secondPartyData.companyName}
                      onChange={e => store.updateContractFormData('secondPartyData', 'companyName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gold-200">{language === 'ar' ? 'إسم المدير المفوض' : 'Manager Name'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" 
                      value={store.contractFormData.secondPartyData.managerName}
                      onChange={e => store.updateContractFormData('secondPartyData', 'managerName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gold-200">{language === 'ar' ? 'رقم السجل التجاري' : 'CR Number'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" 
                      value={store.contractFormData.secondPartyData.crNumber}
                      onChange={e => store.updateContractFormData('secondPartyData', 'crNumber', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gold-200">{language === 'ar' ? 'رقم الرخصة التجارية' : 'License Number'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" 
                      value={store.contractFormData.secondPartyData.licenseNumber}
                      onChange={e => store.updateContractFormData('secondPartyData', 'licenseNumber', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gold-200">{language === 'ar' ? 'تاريخ إنتهاء الرخصة' : 'License Expiry Date'}</label>
                    <input 
                      type="date" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" 
                      value={store.contractFormData.secondPartyData.licenseExpiry}
                      onChange={e => store.updateContractFormData('secondPartyData', 'licenseExpiry', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gold-200">{language === 'ar' ? 'الإمارة / المنطقة' : 'Emirate / Region'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" 
                      value={store.contractFormData.secondPartyData.emirate}
                      onChange={e => store.updateContractFormData('secondPartyData', 'emirate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gold-200">{language === 'ar' ? 'الدولة' : 'Country'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" 
                      value={store.contractFormData.secondPartyData.country}
                      onChange={e => store.updateContractFormData('secondPartyData', 'country', e.target.value)}
                    />
                  </div>
                </div>

                <h4 className="text-lg font-bold text-white border-b border-white/10 pb-2 pt-4">{language === 'ar' ? 'بيانات التوقيع' : 'Signature Data'}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-gold-200">{language === 'ar' ? 'الإسم المعتمد للتوقيع' : 'Signed By'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" 
                      value={store.contractFormData.signatureData.signedName}
                      onChange={e => store.updateContractFormData('signatureData', 'signedName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gold-200">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input 
                      type="email" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white/50 cursor-not-allowed" 
                      value={store.account.email}
                      disabled
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gold-200">{language === 'ar' ? 'رقم الجوال' : 'Phone Number'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white/50 cursor-not-allowed" 
                      value={store.account.countryCode + store.account.phone}
                      disabled
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gold-200">{language === 'ar' ? 'تاريخ التوقيع' : 'Signature Date'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white/50 cursor-not-allowed" 
                      value={new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                      disabled
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm text-gold-200">{language === 'ar' ? 'العنوان / مقر الشركة' : 'Company Address'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" 
                      value={store.contractFormData.signatureData.address}
                      onChange={e => store.updateContractFormData('signatureData', 'address', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl border border-white/10 p-6 h-[400px] overflow-y-auto text-base text-white/90 leading-relaxed scrollbar-thin scrollbar-thumb-gold-500/30 scrollbar-track-transparent">
                <h4 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">{t.auth.vendor.contract.title}</h4>
                <div className="space-y-4 font-normal whitespace-pre-wrap">
                  {getDynamicContract()}
                </div>
              </div>

              <div
                onClick={() => store.setContractAgreed(!store.contractAgreed)}
                className={`
                    flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-300
                    ${store.contractAgreed
                    ? 'bg-gold-500/10 border-gold-500/50 shadow-[0_0_15px_rgba(168,139,62,0.1)]'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'}
                `}
              >
                <div className={`
                    w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                    ${store.contractAgreed ? 'bg-gold-500 border-gold-500 text-white' : 'border-white/30 text-transparent'}
                `}>
                  <CheckCircle2 size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white text-sm md:text-base">{t.auth.vendor.contract.accept}</span>
                  <span className="text-[10px] md:text-xs text-white/40">{t.auth.contract?.disclaimer}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: DOCUMENTS (5 Required) */}
          {store.step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4"
            >
              <div className="flex flex-col gap-4">
                <div className="text-center mb-2">
                  <h3 className="font-bold text-white">{t.auth.vendor.docs.title}</h3>
                  <p className="text-xs text-white/50">يرجى رفع المستندات الـ 5 المطلوبة لإكمال التسجيل</p>
                </div>

                <div className="space-y-3">
                  {(['cr', 'license', 'id', 'iban', 'authLetter'] as const).map((key) => {
                    const doc = store.documents[key];
                    const isMissing = doc.status === 'empty' && (errorField === key || (error && (language === 'ar' ? error.includes('المستندات') : error.includes('documents'))));
                    
                    return (
                      <div 
                        key={key} 
                        className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                          isMissing 
                            ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        } border`}
                      >
                        {/* Icon State */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${doc.status === 'completed' || doc.status === 'pending' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'}`}>
                          {doc.status === 'completed' || doc.status === 'pending' ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                        </div>

                        {/* Label & Progress */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className={`font-bold text-sm truncate transition-colors ${isMissing ? 'text-red-400' : 'text-white'}`}>
                              {(t.auth.vendor.docs as any)[key]}
                            </h4>
                            {doc.status === 'uploading' && <span className="text-xs text-gold-400">{doc.progress}%</span>}
                          </div>
                          {doc.status === 'uploading' && (
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                              <motion.div className="h-full bg-gold-500" initial={{ width: 0 }} animate={{ width: `${doc.progress}%` }} />
                            </div>
                          )}
                          {(doc.status === 'completed' || doc.status === 'pending') && <div className="text-[10px] text-green-400">{t.auth.vendor.docs.completed}</div>}
                          {doc.status === 'empty' && <div className="text-[10px] text-white/30">PDF, JPG, PNG</div>}
                        </div>

                        {/* Action */}
                        <div className="shrink-0">
                          {doc.status === 'empty' && (
                            <label className="flex items-center justify-center w-8 h-8 rounded-lg border border-dashed border-white/30 text-white/40 hover:text-gold-400 hover:border-gold-400 cursor-pointer transition-colors">
                              <UploadCloud size={16} />
                              <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => handleFileChange(key, e)} />
                            </label>
                          )}
                          {(doc.status === 'completed' || doc.status === 'pending') && (
                            <button
                              onClick={() => doc.fileUrl && window.open(doc.fileUrl, '_blank')}
                              className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ERROR MESSAGE */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm justify-center"
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACTIONS */}
      <div className="flex gap-4 pt-6 mt-4 border-t border-white/10">
        {store.step > 1 && (
          <button
            onClick={handlePrev}
            className="w-1/3 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <PrevIcon size={20} />
            {t.auth.vendor.prev}
          </button>
        )}

        {store.step !== 2 && ( // Hide Next button on OTP step
          <button
            onClick={store.step === 5 ? handleSubmit : handleNext}
            disabled={isSubmitting}
            className={`flex-1 py-4 bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20 transition-all active:scale-[0.98] ${isSubmitting ? 'opacity-80 cursor-not-allowed' : ''} ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>{t.common?.processing || 'Processing...'}</span>
              </>
            ) : (
              <>
                {store.step === 5 ? t.auth.vendor.submit : t.auth.vendor.next}
                {store.step < 5 && <NextIcon size={20} />}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
