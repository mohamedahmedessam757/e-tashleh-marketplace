import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useAdminStore, ShippingRule, AdminActivityLog } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { refreshOrderSlaFromApi } from '../../../utils/orderSla';
import {
  Settings, DollarSign, Truck, FileText, Save, CheckCircle2,
  Globe, Plus, Trash2, ShieldCheck, Activity, RefreshCw,
  Mail, Phone, Percent, Box, Lock, Unlock, MessageSquare,
  Coins, Languages, Clock, Monitor, MapPin, Hash, User, Calendar,
  CreditCard, Zap, AlertCircle, Building2, Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VehicleCatalogManager } from './VehicleCatalogManager';
import { usePlatformSettingsStore } from '../../../stores/usePlatformSettingsStore';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { BlurredSection } from './BlurredSection';
import { FinancialAuditModal } from './FinancialAuditModal';
import { SettingsAuditModal, SettingsAuditPayload } from './SettingsAuditModal';
import { AdminSettingsGeneralExtras } from './AdminSettingsGeneralExtras';
import { AdminSettingsCompanyTab } from './AdminSettingsCompanyTab';
import { AdminSettingsOrdersTab } from './AdminSettingsOrdersTab';
import { AdminSettingsStaticPagesTab } from './AdminSettingsStaticPagesTab';
import { AdminSettingsEarnIncomeTab } from './AdminSettingsEarnIncomeTab';
import { usePlatformContentStore } from '../../../stores/usePlatformContentStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';

interface AdminSettingsProps {
  onNavigate?: (path: string) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ onNavigate }) => {
  const { t, language, setLanguage } = useLanguage();
  const isAr = language === 'ar';

  const {
    systemConfig, fetchSystemSettings, saveSystemSetting,
    subscribeToSettings, unsubscribeFromSettings,
    currentAdmin, fetchVendorContract, saveVendorContract,
    systemStatus, adminActivityLogs, fetchAdminActivityLogs, isLoadingLogs,
    activeContract, subscribeToActivityLogs, unsubscribeFromActivityLogs
  } = useAdminStore();

  const {
    isAttachmentsEnabled, setAttachmentsEnabled,
    isAccountDeletionEnabled,
    isLoading: isPlatformLoading,
    fetchSettings, subscribeToSettings: subscribeToPlatformSettings
  } = usePlatformSettingsStore();

  const [activeTab, setActiveTab] = useState<'general' | 'earn-income' | 'financial' | 'logistics' | 'content' | 'security' | 'catalog' | 'company' | 'orders'>('general');
  const [showFinancialAudit, setShowFinancialAudit] = useState(false);
  const [showSettingsAudit, setShowSettingsAudit] = useState(false);
  const [pendingAuditSection, setPendingAuditSection] = useState<string | null>(null);
  const [pendingMaintenanceValue, setPendingMaintenanceValue] = useState<boolean | null>(null);
  const [savedStripeConnectEnabled, setSavedStripeConnectEnabled] = useState(false);
  const [pendingStripeConnect, setPendingStripeConnect] = useState<boolean | null>(null);
  const [financialAuditMeta, setFinancialAuditMeta] = useState<{
    title: string;
    subtitle: string;
    mode: 'stripe' | 'general';
  }>({ title: '', subtitle: '', mode: 'general' });
  const [activeShipmentTypeId, setActiveShipmentTypeId] = useState<string>('standard');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local state for forms
  const [formData, setFormData] = useState(typeof systemConfig === 'string' ? JSON.parse(systemConfig) : JSON.parse(JSON.stringify(systemConfig)));
  const [statusDraft, setStatusDraft] = useState(systemStatus);
  const [contractDraft, setContractDraft] = useState(activeContract);
  const [deletionDraft, setDeletionDraft] = useState(isAccountDeletionEnabled);
  const [attachmentsDraft, setAttachmentsDraft] = useState(isAttachmentsEnabled);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const canViewTab = useAdminPermissionsStore(s => s.canViewTab);

  // Permissions-based Tab filtering
  const visibleTabs = React.useMemo(() => {
    const allTabs = [
      { id: 'general', label: t.admin.settingsTabs.general, icon: Globe, color: 'text-blue-400', permissionKey: 'GENERAL' },
      { id: 'earn-income', label: t.admin.settingsTabs.earnIncome, icon: Sparkles, color: 'text-gold-400', permissionKey: 'EARN_INCOME' },
      { id: 'company', label: t.admin.settingsTabs.company, icon: Building2, color: 'text-cyan-400', permissionKey: 'COMPANY' },
      { id: 'orders', label: t.admin.settingsTabs.orders, icon: Clock, color: 'text-indigo-400', permissionKey: 'ORDERS' },
      { id: 'financial', label: t.admin.settingsTabs.financial, icon: DollarSign, color: 'text-green-400', permissionKey: 'FINANCIAL' },
      { id: 'logistics', label: t.admin.settingsTabs.logistics, icon: Truck, color: 'text-purple-400', permissionKey: 'LOGISTICS' },
      { id: 'content', label: t.admin.settingsTabs.content, icon: FileText, color: 'text-gold-400', permissionKey: 'CONTENT' },
      { id: 'catalog', label: isAr ? 'كتالوج المركبات' : 'Vehicle Catalog', icon: Box, color: 'text-orange-400', permissionKey: 'CATALOG' },
      { id: 'security', label: isAr ? 'الصيانة وسجل النشاط' : 'Maintenance & Activity', icon: Activity, color: 'text-red-400', permissionKey: 'MAINTENANCE' },
    ];
    return allTabs.map(tab => ({
      ...tab,
      isLocked: !canViewTab('SETTINGS', tab.permissionKey || tab.id.toUpperCase())
    }));
  }, [canViewTab, isAr, t]);

  // Initial Data Fetch
  useEffect(() => {
    fetchSystemSettings();
    fetchVendorContract();
    subscribeToSettings();
    fetchSettings(); // Fetch initial platform settings
    const unsubscribePlatform = subscribeToPlatformSettings(); // Subscribe to realtime changes
    const unsubscribeContent = usePlatformContentStore.getState().subscribeRealtime();
    usePlatformContentStore.getState().fetchStaticPages();

    return () => {
      unsubscribeFromSettings();
      unsubscribePlatform();
      unsubscribeContent();
    };
  }, []);

  // Auto-switch if current tab is restricted
  useEffect(() => {
    const firstAllowed = visibleTabs.find(t => !t.isLocked);
    if (firstAllowed && visibleTabs.find(t => t.id === activeTab)?.isLocked) {
      setActiveTab(firstAllowed.id as any);
    }
  }, [visibleTabs, activeTab]);

  // Fetch logs and subscribe when entering security tab
  useEffect(() => {
    if (activeTab === 'security') {
      fetchAdminActivityLogs();
      subscribeToActivityLogs();
      return () => unsubscribeFromActivityLogs();
    }
  }, [activeTab]);

  // Handle Catalog Subscription
  const { subscribeToCatalog, unsubscribeFromCatalog } = useAdminStore();
  useEffect(() => {
    if (activeTab === 'catalog') {
      subscribeToCatalog();
      return () => unsubscribeFromCatalog();
    }
  }, [activeTab]);

  // Sync formData when systemConfig or systemStatus updates from backend
  useEffect(() => {
    setFormData(JSON.parse(JSON.stringify(systemConfig)));
    setStatusDraft(systemStatus);
    setContractDraft(activeContract);
  }, [systemConfig, systemStatus, activeContract]);

  useEffect(() => {
    setDeletionDraft(isAccountDeletionEnabled);
  }, [isAccountDeletionEnabled]);

  useEffect(() => {
    setAttachmentsDraft(isAttachmentsEnabled);
  }, [isAttachmentsEnabled]);

  useEffect(() => {
    if (activeTab !== 'financial') return;
    const loadFinancial = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/payments/admin/financial-settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.financial) {
          setFormData((prev: any) => ({
            ...prev,
            financial: { ...(prev.financial || {}), ...data.financial },
          }));
          setSavedStripeConnectEnabled(Boolean(data.financial.stripeConnectEnabled));
        }
      } catch (err) {
        console.error('Failed to load financial settings', err);
      }
    };
    loadFinancial();
  }, [activeTab]);

  const handleSaveSection = async (section: string) => {
    if (section === 'financial') {
      setFinancialAuditMeta({
        mode: 'general',
        title: isAr ? 'تدقيق مالي — حفظ الإعدادات' : 'Financial audit — save settings',
        subtitle: isAr ? 'سبب التعديل والتوقيع مطلوبان قبل حفظ جميع إعدادات المالية' : 'Reason and signature are required before saving all financial settings',
      });
      setShowFinancialAudit(true);
      return;
    }
    if (section === 'catalog') return;
    setPendingAuditSection(section);
    setShowSettingsAudit(true);
  };

  const stripeConnectDisplayed =
    pendingStripeConnect ?? Boolean(formData.financial?.stripeConnectEnabled);

  const handleStripeConnectToggle = (next: boolean) => {
    const current = Boolean(formData.financial?.stripeConnectEnabled);
    if (next === current && pendingStripeConnect === null) return;

    setPendingStripeConnect(next);
    setFinancialAuditMeta({
      mode: 'stripe',
      title: next
        ? (isAr ? 'تفعيل Stripe Connect' : 'Enable Stripe Connect')
        : (isAr ? 'إيقاف Stripe Connect' : 'Disable Stripe Connect'),
      subtitle: next
        ? (isAr
            ? 'سيتم إشعار جميع العملاء والتجار. اكتب سبب التفعيل (10 أحرف على الأقل) والتوقيع للتدقيق.'
            : 'All customers and merchants will be notified. Provide activation reason (min 10 chars) and signature for audit.')
        : (isAr
            ? 'سيتم إخفاء خيار Stripe من المحافظ. اكتب سبب الإيقاف (10 أحرف على الأقل) والتوقيع للتدقيق.'
            : 'Stripe payout option will be hidden from wallets. Provide deactivation reason (min 10 chars) and signature for audit.'),
    });
    setShowFinancialAudit(true);
  };

  const closeFinancialAudit = () => {
    setShowFinancialAudit(false);
    setPendingStripeConnect(null);
  };

  const persistSection = async (section: string, audit?: SettingsAuditPayload) => {
    setIsSaving(true);
    let success = false;

    try {
      if (section === 'security') {
        success = await saveSystemSetting('system_status', statusDraft, audit);
      } else if (section === 'content') {
        success = await saveVendorContract(contractDraft);
      } else {
        await saveSystemSetting('ALLOW_CUSTOMER_ACCOUNT_DELETION', deletionDraft, audit);
        await saveSystemSetting('CHAT_ATTACHMENTS_ENABLED', attachmentsDraft, audit);
        success = await saveSystemSetting('system_config', formData, audit);
      }

      if (success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        await fetchSystemSettings();
        await fetchSettings();
        if (section !== 'security' && section !== 'content') {
          await refreshOrderSlaFromApi(true);
        }
      }
    } catch (err) {
      console.error("Critical Save Error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmSettingsAudit = async (audit: SettingsAuditPayload) => {
    const section = pendingAuditSection || activeTab;

    if (section === 'security-maintenance' && pendingMaintenanceValue !== null) {
      const nextStatus = { ...statusDraft, maintenanceMode: pendingMaintenanceValue };
      setStatusDraft(nextStatus);
      setShowSettingsAudit(false);
      setPendingAuditSection(null);
      setPendingMaintenanceValue(null);
      setIsSaving(true);
      try {
        const success = await saveSystemSetting('system_status', nextStatus, audit);
        if (success) {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
          await fetchSystemSettings();
        }
      } finally {
        setIsSaving(false);
      }
      return;
    }

    setShowSettingsAudit(false);
    setPendingAuditSection(null);
    await persistSection(section, audit);
  };

  const handleMaintenanceToggle = () => {
    setPendingMaintenanceValue(!statusDraft.maintenanceMode);
    setPendingAuditSection('security-maintenance');
    setShowSettingsAudit(true);
  };

  const closeSettingsAudit = () => {
    setShowSettingsAudit(false);
    setPendingAuditSection(null);
    setPendingMaintenanceValue(null);
  };

  const saveFinancialSettings = async (audit: { reason: string; adminName: string; adminSignature: string }) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const financialPayload = {
        ...formData.financial,
        ...(pendingStripeConnect !== null ? { stripeConnectEnabled: pendingStripeConnect } : {}),
        reason: audit.reason,
        adminName: audit.adminName,
        adminSignature: audit.adminSignature,
      };
      const res = await fetch(`${API_URL}/payments/admin/financial-settings`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(financialPayload),
      });
      if (res.ok) {
        const nextStripe = pendingStripeConnect ?? Boolean(formData.financial?.stripeConnectEnabled);
        setFormData((prev: any) => ({
          ...prev,
          financial: { ...prev.financial, stripeConnectEnabled: nextStripe },
        }));
        setSavedStripeConnectEnabled(nextStripe);
        setPendingStripeConnect(null);
        closeFinancialAudit();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        await fetchSystemSettings();
      }
    } catch (err) {
      console.error('Financial settings save failed', err);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (section: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateNested = (section: string, parent: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parent]: {
          ...(prev[section]?.[parent] || {}),
          [field]: value,
        },
      },
    }));
  };

  const updateShipmentType = (typeId: string, field: string, value: any) => {
    setFormData((prev: any) => {
      const types = prev.logistics?.shipmentTypes || [];
      const updatedTypes = types.map((t: any) =>
        t.id === typeId ? { ...t, [field]: value } : t
      );
      return {
        ...prev,
        logistics: {
          ...prev.logistics,
          shipmentTypes: updatedTypes
        }
      };
    });
  };

  const handleAddShipmentType = () => {
    const newId = `type-${Date.now()}`;
    const newType = {
      id: newId,
      nameAr: 'نوع شحن جديد',
      nameEn: 'New Shipment Type',
      basePrice: 0,
      isWeightBound: false,
      weightBrackets: []
    };

    setFormData((prev: any) => ({
      ...prev,
      logistics: {
        ...prev.logistics,
        shipmentTypes: [...(prev.logistics?.shipmentTypes || []), newType]
      }
    }));
    setActiveShipmentTypeId(newId);
  };

  const handleDeleteShipmentType = (typeId: string) => {
    // Protect default core types
    if (['standard', 'engine', 'gearbox'].includes(typeId)) return;

    setFormData((prev: any) => {
      const remainingTypes = (prev.logistics?.shipmentTypes || []).filter((t: any) => t.id !== typeId);
      return {
        ...prev,
        logistics: {
          ...prev.logistics,
          shipmentTypes: remainingTypes
        }
      };
    });
    setActiveShipmentTypeId('standard');
  };

  const isSuperAdmin = currentAdmin?.role === 'SUPER_ADMIN';


  return (
    <>
    <div className="max-w-[1600px] mx-auto space-y-10 px-4 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-gradient-to-br from-[#1A1814] to-black p-8 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-32 bg-gold-500/5 rounded-full blur-3xl -z-10" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full border border-white/5 shadow-inner">
              <span className={`w-2 h-2 rounded-full ${systemStatus.maintenanceMode ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
              <span className="text-[10px] font-black uppercase tracking-tight text-white/70">
                {isAr ? 'حالة النظام' : 'Nexus Status'}: {systemStatus.maintenanceMode ? (isAr ? 'صيانة' : 'MAINTENANCE') : (isAr ? 'نشط' : 'ACTIVE')}
              </span>
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight">
            {t.admin.settings}
          </h1>
          <p className="text-white/40 text-sm font-medium">{isAr ? 'تخصيص هيكلية وسياسات المنصة بتنظيم احترافي لعام 2026.' : 'Orchestrate global platform architecture for 2026 standards.'}</p>
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-4 text-white bg-green-500/20 border border-green-500/30 px-6 py-4 rounded-2xl backdrop-blur-xl shadow-2xl"
            >
              <CheckCircle2 size={24} className="text-green-400" />
              <div className="font-black uppercase tracking-tight text-[10px]">{t.admin.systemSettings.saveSuccess}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5 w-fit overflow-x-auto no-scrollbar shadow-inner">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all whitespace-nowrap group ${activeTab === tab.id ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'
              } ${tab.isLocked ? 'opacity-70' : ''}`}
          >
            <tab.icon size={16} className={activeTab === tab.id ? 'text-black' : tab.color} />
            {tab.label}
            {tab.isLocked && <Lock size={12} className={activeTab === tab.id ? 'text-black/50' : 'text-gold-500/50'} />}
          </button>
        ))}
      </div>

      {/* CONTENT GRID */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          <BlurredSection
            isBlurred={visibleTabs.find(t => t.id === activeTab)?.isLocked}
            titleAr={`إعدادات ${visibleTabs.find(t => t.id === activeTab)?.label} محمية`}
            titleEn={`${visibleTabs.find(t => t.id === activeTab)?.label} Settings Protected`}
            descriptionAr="لا تملك صلاحية الوصول لهذه الإعدادات. يرجى التواصل مع الإدارة العليا."
            descriptionEn="You do not have permission to access these settings."
          >
            <GlassCard className="p-10 border-white/5 bg-[#12100E]/90 shadow-2xl min-h-[650px] flex flex-col backdrop-blur-3xl" enableHover={false}>

              <div className="flex-grow pb-32">
                {/* 1. GENERAL TAB */}
                {activeTab === 'general' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <header className="border-b border-white/5 pb-6">
                        <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                          <Globe size={20} className="text-blue-400" /> {isAr ? 'الهوية والعلامة التجارية' : 'Branding & Identity'}
                        </h2>
                      </header>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-white/30 uppercase tracking-tight">{t.admin.systemSettings.platformName}</label>
                          <input type="text" value={formData.general?.platformName || ''} onChange={(e) => updateField('general', 'platformName', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-gold-500/50 transition-all" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-white/30 uppercase tracking-tight">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</label>
                            <input type="email" value={formData.general?.contactEmail || ''} onChange={(e) => updateField('general', 'contactEmail', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:border-gold-500/50 transition-all" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-white/30 uppercase tracking-tight">{isAr ? 'رقم التواصل' : 'Contact Phone'}</label>
                            <input type="text" value={formData.general?.supportPhone || ''} onChange={(e) => updateField('general', 'supportPhone', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:border-gold-500/50 transition-all" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-8">
                      <header className="border-b border-white/5 pb-6">
                        <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                          <Settings size={20} className="text-gold-500" /> {isAr ? 'سير عمل النظام' : 'Engine Workflow'}
                        </h2>
                      </header>

                      <div className="space-y-6">
                        {/* 2026 Chat Attachments Master Toggle */}
                        <div className="p-8 rounded-3xl bg-gold-500/[0.03] border border-gold-500/10 shadow-inner group hover:border-gold-500/30 transition-all mb-4">
                          <div className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gold-500/10 flex items-center justify-center text-gold-500 group-hover:scale-110 transition-transform">
                                <Plus size={22} />
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-tight">{isAr ? 'مرفقات المحادثة' : 'Chat Attachments'}</h4>
                                <p className="text-[11px] text-white/30 mt-1 leading-relaxed max-w-xs">
                                  {isAr
                                    ? 'التحكم في إمكانية إرفاق الصور والملفات في الدردشة لدى العملاء والتجار.'
                                    : 'Enable or disable image and file attachments for all users.'}
                                </p>
                              </div>
                            </div>
                            {isPlatformLoading ? (
                              <div className="w-14 h-7 flex items-center justify-center">
                                <RefreshCw size={16} className="text-gold-500/50 animate-spin" />
                              </div>
                            ) : (
                              <label className="relative inline-flex items-center cursor-pointer scale-110">
                                <input
                                  type="checkbox"
                                  checked={attachmentsDraft}
                                  onChange={(e) => {
                                    setAttachmentsDraft(e.target.checked);
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-14 h-7 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-gold-500 shadow-[0_0_15px_rgba(234,179,8,0)] peer-checked:shadow-[0_0_15px_rgba(234,179,8,0.2)]"></div>
                              </label>
                            )}
                          </div>
                        </div>

                        {/* 2026 Customer Account Deletion Toggle — saves with Save button */}
                        <div className="p-8 rounded-3xl bg-red-500/[0.03] border border-red-500/10 shadow-inner group hover:border-red-500/30 transition-all mb-4">
                          <div className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                <Trash2 size={22} />
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-tight">{isAr ? 'حذف حسابات العملاء' : 'Customer Account Deletion'}</h4>
                                <p className="text-[11px] text-white/30 mt-1 leading-relaxed max-w-xs">
                                  {isAr
                                    ? 'التحكم في إمكانية حذف العملاء لحساباتهم بشكل مستقل من إعداداتهم.'
                                    : 'Enable or disable the ability for customers to delete their accounts.'}
                                </p>
                              </div>
                            </div>
                            {isPlatformLoading ? (
                              <div className="w-14 h-7 flex items-center justify-center">
                                <RefreshCw size={16} className="text-red-500/50 animate-spin" />
                              </div>
                            ) : (
                              <label className="relative inline-flex items-center cursor-pointer scale-110">
                                <input
                                  type="checkbox"
                                  checked={deletionDraft}
                                  onChange={(e) => {
                                    setDeletionDraft(e.target.checked);
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-14 h-7 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0)] peer-checked:shadow-[0_0_15px_rgba(239,68,68,0.2)]"></div>
                              </label>
                            )}
                          </div>
                        </div>

                        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 shadow-inner">
                          <div className="flex items-center justify-between gap-6">
                            <div>
                              <h4 className="text-sm font-black text-white uppercase tracking-tight">{t.admin.systemSettings.enablePreferences}</h4>
                              <p className="text-[11px] text-white/30 mt-2 leading-relaxed">
                                {isAr
                                  ? 'إضافة خيار قطعة جديدة أو مستعملة لطلبات العملاء (2026 Optimized).'
                                  : 'Toggle new/used part preferences step for customers.'}
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer scale-110">
                              <input type="checkbox" checked={formData.general?.enablePreferencesStep || false} onChange={(e) => updateField('general', 'enablePreferencesStep', e.target.checked)} className="sr-only peer" />
                              <div className="w-14 h-7 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-gold-500"></div>
                            </label>
                          </div>
                        </div>

                        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 shadow-inner">
                          <div className="flex items-center justify-between gap-6">
                            <div>
                              <h3 className="text-sm font-black text-white uppercase tracking-tight">{isAr ? 'لغة واجهة النظام' : 'Interface Language'}</h3>
                              <p className="text-[11px] text-white/30 mt-1 uppercase tracking-tight font-bold">
                                {isAr ? 'تبديل فوري بين لغات لوحة التحكم.' : 'Hot-swap dashboard display language.'}
                              </p>
                            </div>
                            <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                              <button onClick={() => setLanguage('ar')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${language === 'ar' ? 'bg-gold-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}>AR</button>
                              <button onClick={() => setLanguage('en')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${language === 'en' ? 'bg-gold-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}>EN</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <AdminSettingsGeneralExtras
                      isAr={isAr}
                      formData={formData}
                      updateField={updateField}
                      updateNested={updateNested}
                    />
                  </div>
                )}

                {activeTab === 'earn-income' && (
                  <AdminSettingsEarnIncomeTab
                    isAr={isAr}
                    formData={formData}
                    setFormData={setFormData}
                  />
                )}

                {activeTab === 'company' && (
                  <AdminSettingsCompanyTab
                    isAr={isAr}
                    formData={formData}
                    updateField={updateField}
                    updateNested={updateNested}
                  />
                )}

                {activeTab === 'orders' && (
                  <AdminSettingsOrdersTab
                    isAr={isAr}
                    formData={formData}
                    updateField={updateField}
                  />
                )}

                {/* 2. FINANCIAL TAB */}
                {activeTab === 'financial' && (
                  <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] shadow-inner space-y-8">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <Percent size={24} />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">{t.admin.systemSettings.commissionRate}</h3>
                            <p className="text-[11px] text-white/20 font-bold uppercase tracking-tight mt-1">{isAr ? 'نسبة عمولة المنصة الثابتة' : 'Global Commission %'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="number" value={formData.financial?.commissionRate || 0} onChange={(e) => updateField('financial', 'commissionRate', parseInt(e.target.value))}
                            className="w-20 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-center text-xl font-black text-gold-500 outline-none focus:border-gold-500/50" />
                          <span className="text-xl font-black text-white/20">%</span>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <input type="range" min="0" max="40" value={formData.financial?.commissionRate || 0} disabled={!isSuperAdmin} onChange={(e) => updateField('financial', 'commissionRate', parseInt(e.target.value))}
                          className="w-full accent-gold-500 h-2.5 bg-white/5 rounded-full cursor-pointer appearance-none" />
                        <div className="flex justify-between text-[11px] font-black text-white/20 uppercase tracking-tight">
                          <span>0% Min</span>
                          <span>40% Max</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] shadow-inner space-y-8">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400">
                            <Coins size={24} />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">{t.admin.systemSettings.minCommission}</h3>
                            <p className="text-[11px] text-white/20 font-bold uppercase tracking-tight mt-1">{isAr ? 'الحد الأدنى للربح بالدرهم' : 'Minimum Profit (AED)'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" value={formData.financial?.minCommission || 0} onChange={(e) => updateField('financial', 'minCommission', parseInt(e.target.value))}
                            className="w-24 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-center text-xl font-black text-white outline-none focus:border-gold-500/50" />
                          <span className="text-xs font-black text-white/30 uppercase tracking-tight leading-none">AED</span>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <input type="range" min="0" max="500" step="10" value={formData.financial?.minCommission || 0} disabled={!isSuperAdmin} onChange={(e) => updateField('financial', 'minCommission', parseInt(e.target.value))}
                          className="w-full accent-white h-2.5 bg-white/5 rounded-full cursor-pointer appearance-none" />
                        <div className="flex justify-between text-[11px] font-black text-white/20 uppercase tracking-tight">
                          <span>0 AED</span>
                          <span>500 AED</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {[
                      { key: 'gatewayFeePercent', labelAr: 'رسوم بوابة الدفع %', labelEn: 'Gateway Fee %', max: 10 },
                      { key: 'escrowHoldHoursCustomer', labelAr: 'ساعات ضمان العميل', labelEn: 'Customer Escrow Hours', max: 168 },
                      { key: 'escrowHoldHoursMerchant', labelAr: 'ساعات ضمان التاجر', labelEn: 'Merchant Escrow Hours', max: 168 },
                      { key: 'payoutDelayDaysMerchant', labelAr: 'تأخير سحب التاجر (أيام)', labelEn: 'Merchant Payout Delay (days)', max: 30 },
                      { key: 'payoutDelayDaysCustomer', labelAr: 'تأخير سحب العميل (أيام)', labelEn: 'Customer Payout Delay (days)', max: 30 },
                      { key: 'loyaltyPointsRate', labelAr: 'نسبة نقاط الولاء %', labelEn: 'Loyalty Points Rate %', max: 20 },
                      { key: 'minWithdrawalCustomer', labelAr: 'الحد الأدنى للسحب — عميل (AED)', labelEn: 'Min Withdrawal — Customer (AED)', max: 10000 },
                      { key: 'minWithdrawalMerchant', labelAr: 'الحد الأدنى للسحب — تاجر (AED)', labelEn: 'Min Withdrawal — Merchant (AED)', max: 10000 },
                    ].map((field) => (
                      <div key={field.key} className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                        <p className="text-[10px] font-black text-white/30 uppercase mb-3">{isAr ? field.labelAr : field.labelEn}</p>
                        <input
                          type="number"
                          min={0}
                          max={field.max}
                          value={formData.financial?.[field.key] ?? 0}
                          onChange={(e) => updateField('financial', field.key, parseInt(e.target.value) || 0)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg font-black text-white outline-none focus:border-gold-500/50"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="relative overflow-hidden rounded-[2.5rem] border border-[#635BFF]/25 bg-gradient-to-br from-[#635BFF]/10 via-[#0F1014] to-black p-8 shadow-[0_0_60px_rgba(99,91,255,0.12)]">
                    <div className="absolute top-0 left-0 w-48 h-48 bg-[#635BFF]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl translate-x-1/4 translate-y-1/4 pointer-events-none" />

                    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                      <div className="flex items-start gap-5 flex-1">
                        <div className="w-16 h-16 rounded-2xl bg-[#635BFF] flex items-center justify-center shadow-lg shadow-[#635BFF]/30 shrink-0">
                          <CreditCard className="text-white" size={28} />
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-black text-white tracking-tight">
                              Stripe Connect
                            </h3>
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                                stripeConnectDisplayed
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-white/5 text-white/40 border-white/10'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${stripeConnectDisplayed ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
                              {stripeConnectDisplayed
                                ? (isAr ? 'مفعّل' : 'Active')
                                : (isAr ? 'متوقف' : 'Inactive')}
                            </span>
                            {pendingStripeConnect !== null && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <AlertCircle size={10} />
                                {isAr ? 'بانتظار التدقيق' : 'Pending audit'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-white/50 leading-relaxed max-w-xl">
                            {isAr
                              ? 'عند التفعيل يظهر خيار السحب عبر Stripe Connect للعملاء والتجار. عند الإيقاف يبقى التحويل البنكي فقط — مع إشعار فوري لجميع المستخدمين.'
                              : 'When enabled, Stripe Connect appears as a payout option for customers and merchants. When disabled, only bank transfer remains — all users are notified immediately.'}
                          </p>
                          <div className="flex flex-wrap gap-4 pt-1">
                            <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase">
                              <Zap size={12} className="text-[#635BFF]" />
                              {isAr ? 'تحويل أسرع' : 'Faster payouts'}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase">
                              <ShieldCheck size={12} className="text-emerald-500/80" />
                              {isAr ? 'تدقيق إلزامي عند التغيير' : 'Mandatory audit on change'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center lg:items-end gap-3 shrink-0">
                        <label className="relative inline-flex items-center cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={stripeConnectDisplayed}
                            disabled={isSaving}
                            onChange={(e) => handleStripeConnectToggle(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div
                            className={`relative w-[72px] h-9 rounded-full transition-all duration-300 border-2 ${
                              stripeConnectDisplayed
                                ? 'bg-[#635BFF] border-[#635BFF]/50 shadow-[0_0_24px_rgba(99,91,255,0.45)]'
                                : 'bg-white/5 border-white/10'
                            } peer-focus-visible:ring-2 peer-focus-visible:ring-[#635BFF]/50`}
                          >
                            <div
                              className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${
                                stripeConnectDisplayed ? 'translate-x-[34px]' : 'translate-x-0'
                              }`}
                            >
                              {stripeConnectDisplayed ? (
                                <Zap size={14} className="text-[#635BFF]" />
                              ) : (
                                <Lock size={12} className="text-white/40" />
                              )}
                            </div>
                          </div>
                        </label>
                        <p className="text-[9px] text-white/25 font-bold uppercase tracking-wider text-center lg:text-right max-w-[140px]">
                          {isAr ? 'التغيير يتطلب سبباً وتوقيعاً' : 'Change requires reason & signature'}
                        </p>
                      </div>
                    </div>

                    {savedStripeConnectEnabled !== stripeConnectDisplayed && pendingStripeConnect === null && (
                      <p className="relative mt-6 text-[10px] text-amber-400/80 font-bold flex items-center gap-2">
                        <AlertCircle size={12} />
                        {isAr ? 'لديك تغييرات غير محفوظة — استخدم زر حفظ التعديلات' : 'Unsaved changes — use Commit Changes to save'}
                      </p>
                    )}
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
                    <p className="text-[11px] text-white/30 mb-6">{isAr ? 'نسبة استرداد النقاط والحد الشهري لكل مستوى عميل' : 'Cashback percent and monthly cap per customer tier'}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {['BASIC', 'SILVER', 'GOLD', 'VIP', 'PARTNER', 'ELITE'].map((tier) => {
                        const tierData = formData.financial?.loyaltyTiers?.[tier] || { percent: 0.02, monthlyCap: 2000 };
                        return (
                          <div key={tier} className="p-4 rounded-2xl bg-black/30 border border-white/5">
                            <p className="text-[10px] font-black text-gold-500 uppercase mb-3">{tier}</p>
                            <label className="text-[9px] text-white/30 uppercase block mb-1">{isAr ? 'النسبة %' : 'Percent'}</label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              max={1}
                              value={tierData.percent ?? 0}
                              onChange={(e) => {
                                const tiers = { ...(formData.financial?.loyaltyTiers || {}) };
                                tiers[tier] = { ...tierData, percent: parseFloat(e.target.value) || 0 };
                                updateField('financial', 'loyaltyTiers', tiers);
                              }}
                              className="w-full mb-3 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-gold-500/50"
                            />
                            <label className="text-[9px] text-white/30 uppercase block mb-1">{isAr ? 'الحد الشهري' : 'Monthly cap'}</label>
                            <input
                              type="number"
                              value={tierData.monthlyCap ?? 0}
                              onChange={(e) => {
                                const tiers = { ...(formData.financial?.loyaltyTiers || {}) };
                                tiers[tier] = { ...tierData, monthlyCap: parseInt(e.target.value) || 0 };
                                updateField('financial', 'loyaltyTiers', tiers);
                              }}
                              className="w-full mb-3 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-gold-500/50"
                            />
                            <label className="text-[9px] text-white/30 uppercase block mb-1">{isAr ? 'حد السحب الأدنى' : 'Withdrawal min'}</label>
                            <input
                              type="number"
                              min={0}
                              value={tierData.withdrawalMin ?? 100}
                              onChange={(e) => {
                                const tiers = { ...(formData.financial?.loyaltyTiers || {}) };
                                tiers[tier] = { ...tierData, withdrawalMin: parseInt(e.target.value) || 0 };
                                updateField('financial', 'loyaltyTiers', tiers);
                              }}
                              className="w-full mb-3 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-gold-500/50"
                            />
                            <label className="text-[9px] text-white/30 uppercase block mb-1">{isAr ? 'حد السحب الأقصى' : 'Withdrawal max'}</label>
                            <input
                              type="number"
                              min={0}
                              value={tierData.withdrawalMax ?? 10000}
                              onChange={(e) => {
                                const tiers = { ...(formData.financial?.loyaltyTiers || {}) };
                                tiers[tier] = { ...tierData, withdrawalMax: parseInt(e.target.value) || 0 };
                                updateField('financial', 'loyaltyTiers', tiers);
                              }}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-gold-500/50"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">{isAr ? 'ولاء العميل — حدود الإنفاق (AED)' : 'Customer loyalty — spend thresholds (AED)'}</h3>
                    <p className="text-[11px] text-white/30 mb-6">{isAr ? 'الحد الأدنى للإنفاق للترقية بين مستويات العميل' : 'Minimum spend to reach each customer tier'}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { key: 'SILVER', labelAr: 'فضي', labelEn: 'Silver' },
                        { key: 'GOLD', labelAr: 'ذهبي', labelEn: 'Gold' },
                        { key: 'VIP', labelAr: 'VIP', labelEn: 'VIP' },
                        { key: 'PARTNER', labelAr: 'شريك', labelEn: 'Partner' },
                      ].map((tier) => (
                        <div key={tier.key} className="p-4 rounded-2xl bg-black/30 border border-white/5">
                          <p className="text-[10px] font-black text-blue-400 uppercase mb-3">{isAr ? tier.labelAr : tier.labelEn}</p>
                          <input
                            type="number"
                            min={0}
                            value={formData.financial?.customerTierThresholds?.[tier.key] ?? 0}
                            onChange={(e) => {
                              const thresholds = { ...(formData.financial?.customerTierThresholds || {}) };
                              thresholds[tier.key] = parseInt(e.target.value) || 0;
                              updateField('financial', 'customerTierThresholds', thresholds);
                            }}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-gold-500/50"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">{isAr ? 'ولاء التاجر — المستويات والنقاط' : 'Merchant loyalty — tiers & points'}</h3>
                    <p className="text-[11px] text-white/30 mb-6">{isAr ? 'نسبة المكافأة ونقاط الأداء ومعايير الترقية لكل مستوى تاجر' : 'Reward rate, performance points, and upgrade criteria per merchant tier'}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {['BASIC', 'SILVER', 'GOLD', 'VIP', 'ELITE'].map((tier) => {
                        const tierData = formData.financial?.storeLoyaltyTiers?.[tier] || {
                          rate: 0.02,
                          pointsRequired: 0,
                          minRating: 0,
                          maxViolations: 999,
                          minOrders: 0,
                          minAgeDays: 0,
                        };
                        const updateStoreTier = (field: string, value: number) => {
                          const tiers = { ...(formData.financial?.storeLoyaltyTiers || {}) };
                          tiers[tier] = { ...tierData, [field]: value };
                          updateField('financial', 'storeLoyaltyTiers', tiers);
                        };
                        return (
                          <div key={tier} className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
                            <p className="text-[10px] font-black text-purple-400 uppercase mb-1">{tier}</p>
                            {[
                              { key: 'rate', labelAr: 'نسبة المكافأة', labelEn: 'Reward rate', step: 0.01, max: 1 },
                              { key: 'pointsRequired', labelAr: 'نقاط الأداء', labelEn: 'Performance pts', step: 1, max: 1000 },
                              { key: 'minRating', labelAr: 'الحد الأدنى للتقييم', labelEn: 'Min rating', step: 0.1, max: 5 },
                              { key: 'maxViolations', labelAr: 'حد المخالفات', labelEn: 'Max violations', step: 1, max: 999 },
                              { key: 'minOrders', labelAr: 'الحد الأدنى للطلبات', labelEn: 'Min orders', step: 1, max: 1000 },
                              { key: 'minAgeDays', labelAr: 'عمر الحساب (أيام)', labelEn: 'Account age (days)', step: 1, max: 365 },
                            ].map((field) => (
                              <div key={field.key}>
                                <label className="text-[9px] text-white/30 uppercase block mb-1">{isAr ? field.labelAr : field.labelEn}</label>
                                <input
                                  type="number"
                                  step={field.step}
                                  min={0}
                                  max={field.max}
                                  value={tierData[field.key] ?? 0}
                                  onChange={(e) => updateStoreTier(field.key, parseFloat(e.target.value) || 0)}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-gold-500/50"
                                />
                              </div>
                            ))}
                            <div>
                              <label className="text-[9px] text-white/30 uppercase block mb-1">{isAr ? 'حد السحب الأدنى' : 'Withdrawal min'}</label>
                              <input type="number" min={0} value={tierData.withdrawalMin ?? 100} onChange={(e) => updateStoreTier('withdrawalMin', parseInt(e.target.value) || 0)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-gold-500/50" />
                            </div>
                            <div>
                              <label className="text-[9px] text-white/30 uppercase block mb-1">{isAr ? 'حد السحب الأقصى' : 'Withdrawal max'}</label>
                              <input type="number" min={0} value={tierData.withdrawalMax ?? 10000} onChange={(e) => updateStoreTier('withdrawalMax', parseInt(e.target.value) || 0)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-gold-500/50" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">{isAr ? 'العملات المدعومة' : 'Supported Currencies'}</h3>
                    <p className="text-[11px] text-white/30 mb-6">{isAr ? 'AED افتراضي — اختر عملات إضافية للعرض والتسجيل' : 'AED default — select additional currencies for display and recording'}</p>
                    <div className="flex flex-wrap gap-3">
                      {['AED', 'USD', 'EUR', 'SAR'].map((code) => {
                        const selected = (formData.financial?.supportedCurrencies || ['AED']).includes(code);
                        return (
                          <button
                            key={code}
                            type="button"
                            disabled={code === 'AED'}
                            onClick={() => {
                              const current: string[] = formData.financial?.supportedCurrencies || ['AED'];
                              const next = selected
                                ? current.filter((c: string) => c !== code)
                                : [...current, code];
                              updateField('financial', 'supportedCurrencies', next.length ? next : ['AED']);
                            }}
                            className={`px-5 py-3 rounded-xl text-xs font-black uppercase border transition-all ${
                              selected ? 'bg-gold-500 text-black border-gold-500' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                            } ${code === 'AED' ? 'opacity-80 cursor-default' : ''}`}
                          >
                            {code}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  </div>
                )}

                {/* 3. LOGISTICS (2026 Enhanced) */}
                {activeTab === 'logistics' && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Shipment Type Selector */}
                    <div className="flex flex-wrap gap-2 p-1.5 bg-black/20 rounded-2xl border border-white/5 w-fit">
                      {(formData.logistics?.shipmentTypes || []).map((type: any) => (
                        <button
                          key={type.id}
                          onClick={() => setActiveShipmentTypeId(type.id)}
                          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeShipmentTypeId === type.id
                              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                              : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                        >
                          {isAr ? type.nameAr : type.nameEn}
                        </button>
                      ))}
                      <button
                        onClick={handleAddShipmentType}
                        className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center hover:bg-purple-500 hover:text-white transition-all group"
                      >
                        <Plus size={18} className="group-hover:scale-110 transition-transform" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left: Base Configuration */}
                      <div className="space-y-6">
                        {(() => {
                          const activeType = (formData.logistics?.shipmentTypes || []).find((t: any) => t.id === activeShipmentTypeId);
                          if (!activeType) return null;
                          return (
                            <GlassCard className="p-8 bg-white/[0.02]" enableHover={false}>
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                    <Truck size={20} />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-tight">{isAr ? 'الإعدادات الأساسية' : 'Base Config'}</h4>
                                    <p className="text-[9px] text-white/30 font-bold uppercase">{activeShipmentTypeId}</p>
                                  </div>
                                </div>
                                {!['standard', 'engine', 'gearbox'].includes(activeShipmentTypeId) && (
                                  <button
                                    onClick={() => handleDeleteShipmentType(activeShipmentTypeId)}
                                    className="p-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>

                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-tight block mb-2">{isAr ? 'الاسم (عربي)' : 'Name (AR)'}</label>
                                    <input
                                      type="text"
                                      value={activeType.nameAr || ''}
                                      onChange={(e) => updateShipmentType(activeShipmentTypeId, 'nameAr', e.target.value)}
                                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-purple-500/50 shadow-inner"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-tight block mb-2">{isAr ? 'الاسم (انجليزي)' : 'Name (EN)'}</label>
                                    <input
                                      type="text"
                                      value={activeType.nameEn || ''}
                                      onChange={(e) => updateShipmentType(activeShipmentTypeId, 'nameEn', e.target.value)}
                                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-purple-500/50 shadow-inner"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-white/40 uppercase tracking-tight block mb-2">{isAr ? 'التكلفة الأساسية (درهم)' : 'Base Fee (AED)'}</label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      value={activeType.basePrice || 0}
                                      onChange={(e) => updateShipmentType(activeShipmentTypeId, 'basePrice', parseFloat(e.target.value))}
                                      className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-lg text-white font-black outline-none focus:border-purple-500/50 shadow-inner"
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20">AED</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-black text-white/60 uppercase tracking-tight">{isAr ? 'يعتمد على الوزن؟' : 'Weight-based?'}</span>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={activeType.isWeightBound}
                                          onChange={(e) => updateShipmentType(activeShipmentTypeId, 'isWeightBound', e.target.checked)}
                                          className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                                      </label>
                                    </div>
                                  </div>

                                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-black text-white/60 uppercase tracking-tight">{isAr ? 'يعتمد على السلندرات؟' : 'Cylinder-based?'}</span>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={activeType.hasCylinders || false}
                                          onChange={(e) => updateShipmentType(activeShipmentTypeId, 'hasCylinders', e.target.checked)}
                                          className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                                      </label>
                                    </div>
                                  </div>
                                </div>

                                {activeType.isWeightBound && (
                                  <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 animate-in fade-in duration-300">
                                    <div>
                                      <label className="text-[10px] font-black text-white/40 uppercase">{isAr ? 'الحد الأدنى للوزن (كجم)' : 'Min weight (kg)'}</label>
                                      <input type="number" className="w-full mt-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                                        value={formData.logistics?.globalMinWeightKg ?? 0}
                                        onChange={(e) => updateField('logistics', 'globalMinWeightKg', Number(e.target.value))} />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black text-white/40 uppercase">{isAr ? 'الحد الأقصى للوزن (كجم)' : 'Max weight (kg)'}</label>
                                      <input type="number" className="w-full mt-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                                        value={formData.logistics?.globalMaxWeightKg ?? 50}
                                        onChange={(e) => updateField('logistics', 'globalMaxWeightKg', Number(e.target.value))} />
                                    </div>
                                    <p className="col-span-2 text-[10px] text-white/40">{isAr ? 'يُطبَّق عند تفعيل الاعتماد على الوزن لهذا النوع' : 'Applied when weight-based shipping is enabled for this type'}</p>
                                  </div>
                                )}

                                {activeType.hasCylinders && (
                                  <div className="space-y-6 p-8 rounded-[2rem] bg-gold-500/5 border border-gold-500/10 animate-in zoom-in-95 duration-300">
                                    <div className="flex justify-between items-center border-b border-gold-500/10 pb-4">
                                      <h5 className="text-[10px] font-black text-gold-500 uppercase tracking-widest flex items-center gap-2">
                                        <Activity size={14} /> {isAr ? 'تسعير السلندرات (AED)' : 'Cylinder Rates (AED)'}
                                      </h5>
                                      <button
                                        onClick={() => {
                                          const currentRates = activeType.cylinderRates || [];
                                          const newRates = [...currentRates, { cylinders: 0, price: 0 }];
                                          updateShipmentType(activeShipmentTypeId, 'cylinderRates', newRates);
                                        }}
                                        className="px-4 py-1.5 bg-gold-500 text-black text-[9px] font-black uppercase rounded-lg hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/10"
                                      >
                                        + {isAr ? 'إضافة خيار' : 'Add Option'}
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                      {(activeType.cylinderRates || []).map((rate: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-4 p-3 bg-black/40 border border-white/5 rounded-xl group transition-all hover:border-gold-500/30">
                                          <div className="flex-1 grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                              <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">{isAr ? 'عدد السلندرات' : 'Cylinders'}</span>
                                              <input
                                                type="number"
                                                value={rate.cylinders}
                                                onChange={(e) => {
                                                  const newRates = [...activeType.cylinderRates];
                                                  newRates[idx].cylinders = parseInt(e.target.value);
                                                  updateShipmentType(activeShipmentTypeId, 'cylinderRates', newRates);
                                                }}
                                                className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-gold-500/50"
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">{isAr ? 'السعر (درهم)' : 'Price (AED)'}</span>
                                              <input
                                                type="number"
                                                value={rate.price}
                                                onChange={(e) => {
                                                  const newRates = [...activeType.cylinderRates];
                                                  newRates[idx].price = parseFloat(e.target.value);
                                                  updateShipmentType(activeShipmentTypeId, 'cylinderRates', newRates);
                                                }}
                                                className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-gold-500 font-mono font-bold outline-none focus:border-gold-500/50"
                                              />
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => {
                                              const newRates = activeType.cylinderRates.filter((_: any, i: number) => i !== idx);
                                              updateShipmentType(activeShipmentTypeId, 'cylinderRates', newRates);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/10 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      ))}

                                      {(activeType.cylinderRates || []).length === 0 && (
                                        <div className="text-center py-6 text-white/10 text-[9px] font-bold uppercase tracking-widest border border-dashed border-white/10 rounded-xl">
                                          {isAr ? 'لا يوجد خيارات مخصصة' : 'No custom options defined'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </GlassCard>
                          );
                        })()}
                      </div>

                      {/* Right: Weight Brackets List */}
                      <div className="lg:col-span-2 space-y-6">
                        {(() => {
                          const activeType = (formData.logistics?.shipmentTypes || []).find((t: any) => t.id === activeShipmentTypeId);
                          if (!activeType || !activeType.isWeightBound) {
                            return (
                              <div className="h-full flex flex-col items-center justify-center p-12 bg-white/[0.01] border border-dashed border-white/10 rounded-[2.5rem] text-center">
                                <Box size={48} className="text-white/5 mb-4" />
                                <h4 className="text-sm font-black text-white/20 uppercase tracking-widest">{isAr ? 'لا يوجد حسابات وزن لهذا النوع' : 'No weight-based calc for this type'}</h4>
                                <p className="text-[10px] text-white/10 mt-2 uppercase font-bold">{isAr ? 'يتم استخدام التكلفة الأساسية فقط' : 'Only base fee will be applied'}</p>
                              </div>
                            );
                          }

                          return (
                            <>
                              <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/5">
                                <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                                  <Box size={18} className="text-purple-400" />
                                  {isAr ? 'شرائح الأوزان والتسعير' : 'Weight Brackets'}
                                </h3>
                                <button
                                  onClick={() => {
                                    const newBrackets = [...(activeType.weightBrackets || []), { id: Date.now().toString(), minWeight: 0, maxWeight: 0, price: 0 }];
                                    updateShipmentType(activeShipmentTypeId, 'weightBrackets', newBrackets);
                                  }}
                                  className="px-5 py-2 bg-purple-500 text-white text-[10px] font-black uppercase rounded-xl hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/20"
                                >
                                  + {isAr ? 'إضافة قاعدة' : 'New Rule'}
                                </button>
                              </div>

                              <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[450px] pr-2 no-scrollbar">
                                {(activeType.weightBrackets || []).map((rule: any, idx: number) => (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={rule.id}
                                    className="grid grid-cols-4 gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl items-center group hover:border-purple-500/30 transition-all shadow-inner"
                                  >
                                    <div className="space-y-1">
                                      <span className="text-[9px] font-black text-white/20 uppercase tracking-tight">{isAr ? 'من (كجم)' : 'Min (KG)'}</span>
                                      <input
                                        type="number"
                                        value={rule.minWeight}
                                        onChange={(e) => {
                                          const b = [...activeType.weightBrackets]; b[idx].minWeight = parseFloat(e.target.value);
                                          updateShipmentType(activeShipmentTypeId, 'weightBrackets', b);
                                        }}
                                        className="w-full bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-purple-500/50"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[9px] font-black text-white/20 uppercase tracking-tight">{isAr ? 'إلى (كجم)' : 'Max (KG)'}</span>
                                      <input
                                        type="number"
                                        value={rule.maxWeight}
                                        onChange={(e) => {
                                          const b = [...activeType.weightBrackets]; b[idx].maxWeight = parseFloat(e.target.value);
                                          updateShipmentType(activeShipmentTypeId, 'weightBrackets', b);
                                        }}
                                        className="w-full bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-purple-500/50"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[9px] font-black text-white/20 uppercase tracking-tight">{isAr ? 'سعر إضافي' : 'Surcharge'}</span>
                                      <input
                                        type="number"
                                        value={rule.price}
                                        onChange={(e) => {
                                          const b = [...activeType.weightBrackets]; b[idx].price = parseFloat(e.target.value);
                                          updateShipmentType(activeShipmentTypeId, 'weightBrackets', b);
                                        }}
                                        className="w-full bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-xs text-purple-400 font-black outline-none focus:border-purple-500/50"
                                      />
                                    </div>
                                    <div className="flex justify-end pt-5">
                                      <button
                                        onClick={() => {
                                          const b = activeType.weightBrackets.filter((_: any, i: number) => i !== idx);
                                          updateShipmentType(activeShipmentTypeId, 'weightBrackets', b);
                                        }}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/10 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </motion.div>
                                ))}

                                {activeType.weightBrackets?.length === 0 && (
                                  <div className="text-center py-10 text-white/10 text-[10px] font-bold uppercase tracking-widest border border-dashed border-white/5 rounded-2xl">
                                    {isAr ? 'اضغط على إضافة قاعدة للبدء' : 'Click Add Rule to Start'}
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. CONTENT */}
                {activeTab === 'content' && (
                  <div className="grid grid-cols-1 gap-12">
                    <div className="space-y-4">
                      <h3 className="text-lg font-black text-white">{isAr ? 'صفحات المنصة الثابتة' : 'Static platform pages'}</h3>
                      <AdminSettingsStaticPagesTab isAr={isAr} />
                    </div>
                    <div className="border-t border-white/10 pt-10 space-y-4">
                      <h3 className="text-lg font-black text-white">{isAr ? 'عقد التاجر' : 'Vendor contract'}</h3>
                    {[
                      { l: isAr ? 'شروط وأحكام الشراكة الرقمية (العربية)' : 'Partnership Framework (Arabic)', d: 'rtl', k: 'contentAr' },
                      { l: isAr ? 'شروط وأحكام الشراكة الرقمية (الإنجليزية)' : 'Partnership Framework (English)', d: 'ltr', k: 'contentEn' }
                    ].map((doc, i) => (
                      <div key={i} className="space-y-5">
                        <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/5 w-fit">
                          <FileText size={18} className="text-gold-500" />
                          <span className="text-xs font-black text-white/70 uppercase tracking-tight">{doc.l}</span>
                        </div>
                        <textarea
                          dir={doc.d as any}
                          value={contractDraft?.[doc.k as keyof typeof contractDraft] || ''}
                          onChange={(e) => {
                            setContractDraft(prev => prev ? { ...prev, [doc.k]: e.target.value } : { contentAr: '', contentEn: '', firstPartyConfig: {}, [doc.k]: e.target.value });
                          }}
                          className="w-full h-[550px] bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 text-base text-white/80 leading-[1.8] font-medium outline-none focus:border-gold-500/30 transition-all shadow-inner resize-none no-scrollbar"
                        />
                      </div>
                    ))}
                    </div>
                  </div>
                )}

                {/* 5. MAINTENANCE & ACTIVITY (Expanded Security Tab) */}
                {activeTab === 'security' && (
                  <div className="space-y-16">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
                      {/* Maintenance Shield Toggle */}
                      <div className={`p-10 rounded-[3rem] border transition-all duration-700 shadow-2xl flex flex-col items-center text-center space-y-8 ${statusDraft.maintenanceMode ? 'bg-red-500/10 border-red-500/20 shadow-red-500/10' : 'bg-green-500/10 border-green-500/20 shadow-green-500/10'}`}>
                        <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center shadow-inner transition-all duration-700 ${statusDraft.maintenanceMode ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                          {statusDraft.maintenanceMode ? <Lock size={56} /> : <Unlock size={56} />}
                        </div>
                        <div>
                          <h3 className={`text-2xl font-black uppercase tracking-tight ${statusDraft.maintenanceMode ? 'text-red-400' : 'text-green-400'}`}>{isAr ? 'وضع الصيانة' : 'Maintenance Mode'}</h3>
                          <p className="text-[11px] text-white/30 mt-2 font-black uppercase tracking-tight leading-relaxed">
                            {isAr ? 'تجميد كافة العمليات التفاعلية باستثناء المسؤولين.' : 'Freeze all interaction logic for non-admins.'}
                          </p>
                        </div>
                        <button onClick={handleMaintenanceToggle}
                          className={`px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-tight transition-all shadow-2xl active:scale-95 ${statusDraft.maintenanceMode ? 'bg-red-500 text-white' : 'bg-green-500 text-black'}`}>
                          {statusDraft.maintenanceMode ? (isAr ? 'إيقاف الصيانة' : 'Go Online') : (isAr ? 'تنشيط الصيانة' : 'Go Maintenance')}
                        </button>
                      </div>

                      {onNavigate && (
                        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] shadow-inner flex flex-col items-center justify-center text-center gap-4">
                          <ShieldCheck size={32} className="text-gold-500" />
                          <h4 className="text-sm font-black text-white uppercase tracking-tight">
                            {isAr ? 'إدارة الوصول والحسابات' : 'Access Control'}
                          </h4>
                          <p className="text-[11px] text-white/30 max-w-xs">
                            {isAr ? 'تفعيل/إيقاف حسابات المسؤولين مع تدقيق موقّع.' : 'Enable or disable admin accounts with signed audit.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => onNavigate('access-control')}
                            className="px-8 py-3 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-black uppercase tracking-widest hover:bg-gold-500/20 transition-all"
                          >
                            {isAr ? 'فتح إدارة الوصول' : 'Open Access Control'}
                          </button>
                        </div>
                      )}

                      {onNavigate && (
                        <div className="p-8 bg-white/[0.02] border border-red-500/10 rounded-[2.5rem] shadow-inner flex flex-col items-center justify-center text-center gap-4">
                          <AlertCircle size={32} className="text-red-400" />
                          <h4 className="text-sm font-black text-white uppercase tracking-tight">
                            {isAr ? 'مراقبة أخطاء المنصة' : 'Platform Error Monitoring'}
                          </h4>
                          <p className="text-[11px] text-white/30 max-w-xs">
                            {isAr ? 'أخطاء العملاء والتجار والأدمن مع correlation ID وبحث متقدم.' : 'Customer, merchant, and admin errors with correlation ID and advanced search.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => onNavigate('platform-errors')}
                            className="px-8 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                          >
                            {isAr ? 'فتح سجل الأخطاء' : 'Open Error Log'}
                          </button>
                        </div>
                      )}

                      {/* Maintenance Metadata (New Phase 4) */}
                      <div className="space-y-6">
                        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] shadow-inner space-y-6">
                          <div className="flex items-center gap-3">
                            <MessageSquare size={18} className="text-gold-500" />
                            <span className="text-xs font-black text-white/70 uppercase tracking-tight">{isAr ? 'رسائل الإعلان للمستخدمين' : 'Platform Notices'}</span>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <textarea value={statusDraft.maintenanceMsgAr} onChange={(e) => setStatusDraft({ ...statusDraft, maintenanceMsgAr: e.target.value })}
                              placeholder="رسالة العربية..." className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-white outline-none focus:border-gold-500/50 h-20 resize-none" />
                            <textarea value={statusDraft.maintenanceMsgEn} onChange={(e) => setStatusDraft({ ...statusDraft, maintenanceMsgEn: e.target.value })}
                              placeholder="English Notice..." className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-white outline-none focus:border-gold-500/50 h-20 resize-none" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/20 uppercase tracking-tight ml-2">{isAr ? 'برمجة وقت انتهاء الصيانة' : 'Schedule Maintenance End'}</label>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => dateInputRef.current?.showPicker()}
                                className="p-4 bg-gold-500/10 border border-gold-500/20 rounded-2xl text-gold-500 hover:bg-gold-500 hover:text-black transition-all shadow-lg active:scale-95 group"
                              >
                                <Calendar size={20} className="group-hover:scale-110 transition-transform" />
                                <input
                                  ref={dateInputRef}
                                  type="datetime-local"
                                  value={statusDraft.endTime || ''}
                                  onChange={(e) => setStatusDraft({ ...statusDraft, endTime: e.target.value })}
                                  className="sr-only"
                                />
                              </button>
                              <div className="flex-grow p-4 bg-black/40 border border-white/5 rounded-2xl">
                                <div className="text-[10px] font-black text-white/30 uppercase tracking-tight mb-0.5">{isAr ? 'الوقت المختار' : 'Selected Target'}</div>
                                <div className="text-xs font-black text-white tracking-widest">
                                  {statusDraft.endTime ? new Date(statusDraft.endTime).toLocaleString(isAr ? 'ar-EG' : 'en-US') : (isAr ? 'لم يتم التحديد' : 'Not Scheduled')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SESSION ACTIVITY LOG (The Focus Mode) */}
                    <div className="space-y-8">
                      <header className="flex justify-between items-end border-b border-white/5 pb-6">
                        <div>
                          <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                            <ShieldCheck size={20} className="text-red-400" /> {isAr ? 'سجل جلسات الدخول والنشاط' : 'Admin Session Audit Logs'}
                          </h2>
                          <p className="text-[11px] text-white/30 uppercase tracking-tight mt-1 font-bold">{isAr ? 'رصد دقيق لكافة عمليات دخول الإدارة والأجهزة المستخدمة.' : 'Precise monitoring of administrative logins and access devices.'}</p>
                        </div>
                        <button onClick={() => fetchAdminActivityLogs()} className="p-3 bg-white/5 rounded-xl border border-white/5 text-white/40 hover:text-white transition-all">
                          <RefreshCw size={18} className={isLoadingLogs ? 'animate-spin' : ''} />
                        </button>
                      </header>

                      <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-start border-separate border-spacing-y-3">
                          <thead>
                            <tr className="text-[10px] font-black text-white/20 uppercase tracking-widest px-6">
                              <th className="pb-4 px-6 text-start">{isAr ? 'المسؤول' : 'Admin'}</th>
                              <th className="pb-4 px-6 text-start">{isAr ? 'العملية' : 'Action'}</th>
                              <th className="pb-4 px-6 text-start">{isAr ? 'الجهاز والمتصفح' : 'Client Identity'}</th>
                              <th className="pb-4 px-6 text-start">{isAr ? 'الموقع والعنوان' : 'IP & Geo'}</th>
                              <th className="pb-4 px-6 text-end">{isAr ? 'التوقيت' : 'Timestamp'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {isLoadingLogs ? (
                              [1, 2, 3].map(i => (
                                <tr key={i} className="animate-pulse">
                                  <td colSpan={5} className="h-16 bg-white/[0.02] rounded-2xl mb-2"></td>
                                </tr>
                              ))
                            ) : adminActivityLogs.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-white/20 font-black uppercase text-xs tracking-tight">
                                  {isAr ? 'لا يوجد سجلات نشاط حالياً' : 'No Activity Records Found'}
                                </td>
                              </tr>
                            ) : adminActivityLogs.map((log: AdminActivityLog) => {
                              const browser = log.browser || (log.metadata as any)?.browser || (isAr ? 'متصفح' : 'Browser');
                              const device = log.deviceType || (log.metadata as any)?.deviceType || 'Desktop';
                              const location = log.location || (log.metadata as any)?.location || (isAr ? 'موقع غير معروف' : 'Unknown');
                              const ip = log.ipAddress || (log.metadata as any)?.ipAddress || '127.0.0.1';

                              return (
                                <tr key={log.id} className="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-2xl transition-all">
                                  <td className="px-6 py-5 rounded-s-2xl">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-500 font-black text-xs">
                                        {log.admin?.name?.charAt(0) || 'A'}
                                      </div>
                                      <div>
                                        <div className="text-xs font-black text-white tracking-tight">{log.admin?.name || (isAr ? 'مسؤول' : 'Admin')}</div>
                                        <div className="text-[10px] text-white/30 font-bold">{log.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                      <span className="text-[10px] font-black uppercase text-white/70 tracking-tight">{log.action}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="flex items-center gap-3 text-white/60">
                                      <Monitor size={14} className="text-blue-400/50" />
                                      <div className="text-[10px] font-bold tracking-tight">
                                        {browser} <span className="text-white/20 ml-2">/ {device}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                      <MapPin size={14} className="text-red-400/50" />
                                      <div className="text-[10px] font-black text-white/60 tracking-tight">{location}</div>
                                      <div className="text-[9px] bg-white/5 border border-white/5 px-2 py-1 rounded-md text-white/30 font-mono">{ip}</div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 rounded-e-2xl text-end">
                                    <div className="text-[10px] font-black text-white/40 tabular-nums">
                                      {new Date(log.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                      <span className="block text-[9px] text-white/20 mt-0.5">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. VEHICLE CATALOG (2026 Enhanced) */}
                {activeTab === 'catalog' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                    <VehicleCatalogManager />
                  </div>
                )}
              </div>

              {/* STICKY ACTION FOOTER (Phase 4 Final) */}
              {activeTab !== 'catalog' && (
              <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-[#12100E] via-[#12100E]/95 to-transparent flex justify-center lg:justify-end items-center z-40">
                <button onClick={() => handleSaveSection(activeTab)} disabled={isSaving}
                  className="flex items-center gap-4 px-12 py-5 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-black font-black text-xs uppercase tracking-tight rounded-2xl shadow-[0_20px_60px_rgba(234,179,8,0.3)] transition-all active:scale-95 group">
                  {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} className="group-hover:scale-110 transition-transform" />}
                  {isAr ? 'حفظ كافة التعديلات' : 'Commit High-Level Changes'}
                </button>
              </div>
              )}
            </GlassCard>
          </BlurredSection>
        </motion.div>
      </AnimatePresence>
    </div>
      <SettingsAuditModal
        isOpen={showSettingsAudit}
        onClose={closeSettingsAudit}
        onConfirm={confirmSettingsAudit}
        title={isAr ? 'تدقيق إعدادات النظام' : 'System settings audit'}
        subtitle={isAr ? 'سبب التعديل (10 أحرف على الأقل) والتوقيع مطلوبان' : 'Reason (min 10 chars) and signature required'}
      />
      <FinancialAuditModal
        isOpen={showFinancialAudit}
        onClose={closeFinancialAudit}
        onConfirm={saveFinancialSettings}
        title={financialAuditMeta.title || (isAr ? 'تدقيق مالي — حفظ الإعدادات' : 'Financial audit — save settings')}
        subtitle={financialAuditMeta.subtitle || (isAr ? 'سبب التعديل والتوقيع مطلوبان' : 'Reason and signature are required')}
        actionType={financialAuditMeta.mode === 'stripe' && pendingStripeConnect === false ? 'REJECT' : 'APPROVE'}
      />
    </>
  );
};
