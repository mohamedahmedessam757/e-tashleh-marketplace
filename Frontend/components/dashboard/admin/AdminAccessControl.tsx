import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Key, 
  Settings2, 
  CheckCircle2, 
  XCircle,
  ShieldAlert,
  Eye,
  Edit,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Globe,
  User as UserIcon,
  ChevronRight,
  Save,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Settings,
  Layout
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { PERMISSION_PAGES, GRANULAR_PERMISSIONS } from '../../../utils/permissions';
import {
  PHONE_COUNTRY_OPTIONS,
  parseStoredPhone,
} from '../../../utils/phoneCountries';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface AdminAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  country?: string;
  role: string;
  status: string;
  createdAt: string;
  lastActive?: string;
  adminPermission?: any;
}

export const AdminAccessControl: React.FC = () => {
  const { t, language } = useLanguage();
  const { 
    adminList, 
    isLoading, 
    fetchAdminList, 
    createAdmin, 
    updatePermissions, 
    deleteAdmin, 
    updateAdminPassword 
  } = useAdminPermissionsStore();

  // --- UI State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'permissions' | 'advanced'>('basic');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  // --- Form State ---
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+966',
    country: 'Saudi Arabia',
    password: '',
    confirmPassword: '',
    role: 'ADMIN' as 'ADMIN' | 'SUPPORT' | 'VERIFICATION_OFFICER',
    permissions: {} as any,
    supportCategories: [] as string[],
    blurredSections: [] as string[]
  });

  const [formError, setFormError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchAdminList();
  }, []);

  // Initialize permissions map if empty
  const initializePermissions = () => {
    const initial: any = {};
    Object.values(PERMISSION_PAGES).forEach(page => {
      initial[page] = { 
        view: false, 
        edit: false,
        actions: {},
        fields: {},
        tabs: {}
      };
      
      // Seed granular defaults if they exist
      if (GRANULAR_PERMISSIONS[page]) {
        GRANULAR_PERMISSIONS[page].actions.forEach(a => initial[page].actions[a] = false);
        GRANULAR_PERMISSIONS[page].fields.forEach(f => initial[page].fields[f] = false);
        GRANULAR_PERMISSIONS[page].tabs?.forEach(t => initial[page].tabs[t] = false);
      }
    });
    return initial;
  };

  const applyRoleDefaults = (role: string, basePermissions?: any) => {
    const perms = basePermissions ? JSON.parse(JSON.stringify(basePermissions)) : initializePermissions();
    if (role === 'VERIFICATION_OFFICER') {
      const officerPages = ['verification-tasks', 'verification-task-details', 'profile'];
      officerPages.forEach((page) => {
        perms[page] = {
          ...(perms[page] || { view: false, edit: false, actions: {}, fields: {}, tabs: {} }),
          view: true,
          edit: page !== 'profile',
        };
      });
    }
    return perms;
  };

  const handleOpenCreate = () => {
    setEditingAdmin(null);
    setFormError(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      countryCode: '+966',
      country: 'Saudi Arabia',
      password: '',
      confirmPassword: '',
      role: 'ADMIN',
      permissions: applyRoleDefaults('ADMIN', initializePermissions()),
      supportCategories: [],
      blurredSections: []
    });
    setActiveTab('basic');
    setShowCreateModal(true);
  };

  const handleOpenEdit = (admin: AdminAccount) => {
    try {
      const defaults = initializePermissions();
      const existing = admin.adminPermission?.permissions || {};

      const mergedPermissions = { ...defaults };
      Object.keys(existing).forEach((page) => {
        mergedPermissions[page] = {
          ...mergedPermissions[page],
          ...existing[page],
          actions: { ...mergedPermissions[page]?.actions, ...(existing[page]?.actions || {}) },
          fields: { ...mergedPermissions[page]?.fields, ...(existing[page]?.fields || {}) },
          tabs: { ...mergedPermissions[page]?.tabs, ...(existing[page]?.tabs || {}) },
        };
      });

      const role = (admin.role as 'ADMIN' | 'SUPPORT' | 'VERIFICATION_OFFICER') || 'ADMIN';
      const parsedPhone = parseStoredPhone(admin.phone, admin.countryCode, admin.country);

      setEditingAdmin(admin);
      setFormError(null);
      setFormData({
        name: admin.name || '',
        email: admin.email,
        phone: parsedPhone.phone,
        countryCode: parsedPhone.countryCode,
        country: parsedPhone.country,
        password: '',
        confirmPassword: '',
        role,
        permissions: mergedPermissions,
        supportCategories: admin.adminPermission?.supportTicketCategories || [],
        blurredSections: admin.adminPermission?.blurredSections || [],
      });
      setActiveTab('basic');
      setShowCreateModal(true);
    } catch (err) {
      console.error('handleOpenEdit failed', err);
      alert(language === 'ar' ? 'تعذر فتح نافذة التعديل' : 'Could not open edit dialog');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);
    
    try {
      if (!formData.phone || formData.phone.replace(/\D/g, '').length < 8) {
        setFormError(language === 'ar' ? 'رقم الجوال مطلوب (8–12 رقم)' : 'Phone number is required (8–12 digits)');
        setActiveTab('basic');
        setIsSaving(false);
        return;
      }

      if (editingAdmin) {
        if (editingAdmin.role === 'SUPER_ADMIN' && formData.role !== 'SUPER_ADMIN') {
          setFormError(language === 'ar' ? 'لا يمكن تغيير دور Super Admin من هنا' : 'Cannot change Super Admin role here');
          setIsSaving(false);
          return;
        }
        await updatePermissions(editingAdmin.id, {
          role: formData.role,
          phone: formData.phone.replace(/\D/g, ''),
          countryCode: formData.countryCode,
          country: formData.country,
          permissions: formData.permissions,
          supportTicketCategories: formData.supportCategories,
          blurredSections: formData.blurredSections
        });
        setShowCreateModal(false);
      } else {
        if (formData.password.length < 8) {
          setFormError(language === 'ar' ? 'كلمة المرور 8 أحرف على الأقل' : 'Password must be at least 8 characters');
          setActiveTab('basic');
          setIsSaving(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setFormError(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
          setActiveTab('basic');
          setIsSaving(false);
          return;
        }
        await createAdmin({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.replace(/\D/g, ''),
          countryCode: formData.countryCode,
          country: formData.country,
          password: formData.password,
          role: formData.role,
          permissions: formData.permissions,
          supportTicketCategories: formData.supportCategories,
          blurredSections: formData.blurredSections
        });
        setShowCreateModal(false);
      }
    } catch (err: any) {
      setFormError(err?.message || (language === 'ar' ? 'فشل الحفظ' : 'Save failed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCountryCodeChange = (code: string) => {
    const option = PHONE_COUNTRY_OPTIONS.find((c) => c.code === code);
    setFormData((prev) => ({
      ...prev,
      countryCode: code,
      country: option
        ? language === 'ar'
          ? option.countryAr
          : option.country
        : prev.country,
    }));
  };

  const togglePermission = (page: string, action: 'view' | 'edit') => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [page]: {
          ...prev.permissions[page],
          [action]: !prev.permissions[page]?.[action]
        }
      }
    }));
  };

  const toggleGranular = (page: string, type: 'actions' | 'fields' | 'tabs', key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [page]: {
          ...prev.permissions[page],
          [type]: {
            ...prev.permissions[page]?.[type] || {},
            [key]: !prev.permissions[page]?.[type]?.[key]
          }
        }
      }
    }));
  };

  const toggleSupportCategory = (cat: string) => {
    setFormData(prev => ({
      ...prev,
      supportCategories: prev.supportCategories.includes(cat)
        ? prev.supportCategories.filter(c => c !== cat)
        : [...prev.supportCategories, cat]
    }));
  };

  const toggleBlurredSection = (section: string) => {
    setFormData(prev => ({
      ...prev,
      blurredSections: prev.blurredSections.includes(section)
        ? prev.blurredSections.filter(s => s !== section)
        : [...prev.blurredSections, section]
    }));
  };

  // 2026 Localization Helper for Permissions
  // 2026 Localization Mapping for Technical Keys
  const KEY_TRANSLATIONS: Record<string, string> = {
    // Actions
    'DELETE_VENDOR': 'حذف المتجر', 'SUSPEND_VENDOR': 'إيقاف المتجر', 'UPDATE_LICENSE': 'تحديث الرخصة', 'APPROVE_DOCUMENTS': 'اعتماد المستندات', 'EDIT_COMMISSION': 'تعديل العمولة',
    'DELETE_CUSTOMER': 'حذف العميل', 'SUSPEND_CUSTOMER': 'حظر العميل', 'ADJUST_BALANCE': 'تعديل الرصيد', 'RESET_PASSWORD': 'إعادة تعيين كلمة المرور',
    'CANCEL_ORDER': 'إلغاء الطلب', 'MARK_AS_PAID': 'تأكيد الدفع', 'UPDATE_SHIPMENT': 'تحديث الشحنة', 'FORCE_REFUND': 'إرجاع إجباري',
    'FORCE_SHIP_ALL': 'شحن الكل إجبارياً', 'REQUEST_PARTIAL_SHIPMENT': 'طلب شحن جزئي',
    'APPROVE_WITHDRAWAL': 'اعتماد السحب', 'REJECT_WITHDRAWAL': 'رفض السحب', 'GENERATE_INVOICE': 'إصدار فاتورة', 'EXPORT_FINANCIALS': 'تصدير بيانات مالية', 'EXPORT_REPORTS': 'تصدير تقارير', 'EXPORT_REPORT': 'تصدير تقرير', 'REFRESH_STATS': 'تحديث الإحصائيات',
    'CANCEL_WAYBILL': 'إلغاء بوليصة', 'PRINT_WAYBILL': 'طباعة بوليصة', 'REASSIGN_CARRIER': 'تغيير شركة الشحن', 'FORCE_UPDATE_STATUS': 'تحديث حالة إجباري',
    'DELETE_CHAT': 'حذف المحادثة', 'EXPORT_CHAT_LOG': 'تصدير سجل الدردشة',
    'CLOSE_TICKET': 'إغلاق التذكرة', 'REASSIGN_TICKET': 'تحويل التذكرة', 'DELETE_RESPONSE': 'حذف الرد',
    
    // Fields
    'VENDOR_IBAN': 'رقم الآيبان (IBAN)', 'VENDOR_NOTES': 'ملاحظات المسؤول', 'VENDOR_LICENSE': 'رخصة المتجر', 'VENDOR_CR_NUMBER': 'السجل التجاري', 'BANK_SWIFT_CODE': 'رمز السويفت (SWIFT)',
    'CUSTOMER_PHONE': 'رقم الجوال', 'CUSTOMER_WALLET': 'محفظة العميل', 'CUSTOMER_ADDRESS': 'عنوان العميل', 'TRANSACTION_HISTORY': 'سجل العمليات',
    'ORDER_COST': 'تكلفة الطلب', 'VENDOR_REVENUE': 'دخل المتجر', 'PROFIT_MARGIN': 'هامش الربح', 'PLATFORM_FEES': 'رسوم المنصة',
    'BANK_DETAILS': 'تفاصيل البنك', 'TAX_RECORDS': 'السجلات الضريبية', 'PROFIT_STATS': 'إحصائيات الأرباح', 'PAYOUT_QUEUE': 'طابور المدفوعات',
    'WAYBILL_COST': 'تكلفة البوليصة', 'CARRIER_FEES': 'رسوم الشحن', 'SENSITIVE_DATA': 'بيانات حساسة', 'COURIER_DETAILS': 'تفاصيل المندوب',
    'MESSAGE_CONTENT': 'محتوى الرسائل', 'USER_IDENTITY': 'هوية المستخدم',
    'INTERNAL_NOTES': 'ملاحظات داخلية', 'USER_PRIVATE_DATA': 'بيانات خاصة للمستخدم',
    'REVENUE_STATS': 'إحصائيات الدخل', 'USER_GROWTH': 'نمو المستخدمين', 'SYSTEM_HEALTH': 'سلامة النظام',

    // Support Categories
    'TECHNICAL': 'دعم تقني', 'PAYMENT': 'مشاكل الدفع', 'ORDERS': 'مشاكل الطلبات', 'STORES': 'شؤون المتاجر', 'RETURNS': 'المرتجع', 'VIOLATIONS': 'المخالفات', 'DELIVERY': 'التوصيل', 'ACCOUNT': 'الحساب', 'OTHER': 'أخرى',

    // Blurred Sections
    'billing_amounts': 'المبالغ المالية', 'customer_phone': 'أرقام جوالات العملاء', 'merchant_bank_details': 'بيانات بنوك المتاجر', 'payout_logs': 'سجلات المدفوعات',

    // Tabs
    'OVERVIEW': 'نظرة عامة', 'DISPUTES': 'النزاعات والشكاوى', 'REVIEWS': 'التقييمات', 'FINANCIAL': 'السجل المالي', 'SESSIONS': 'الجلسات والأمان', 'CONTRACT': 'بيانات العقد', 'RESTRICTIONS': 'القيود والتحكم',
    'ACTIVE': 'المخالفات النشطة', 'APPEALS': 'طلبات الطعن', 'PENALTIES': 'العقوبات المعلقة', 'RISK_ALERTS': 'تنبيهات مخاطر العملاء', 'TYPES': 'أنواع المخالفات',
    'PENDING': 'بانتظار المراجعة', 'PUBLISHED': 'منشورة', 'REJECTED': 'مرفوضة', 'IMPACT': 'قواعد التأثير',
    'OVERSIGHT': 'الرقابة الشاملة', 'WARRANTY': 'الضمان والتدقيق', 'CLOSED': 'القضايا المغلقة',
    'TRANSACTIONS': 'سجل المعاملات', 'WITHDRAWALS': 'طلبات السحب', 'REVENUE': 'دخل المنصة', 'COMMISSION': 'التحكم بالعمولة', 'ESCROW': 'التحكم في الضمان',
    'CUSTOMERS': 'العملاء', 'MERCHANTS': 'المتاجر',
    'GENERAL': 'عام', 'LOGISTICS': 'اللوجستيات', 'CONTENT': 'المحتوى', 'CATALOG': 'كتالوج المركبات', 'MAINTENANCE': 'الصيانة وسجل النشاط'
  };

  const getPermissionLabel = (pageId: string) => {
    const isAr = language === 'ar';
    switch(pageId) {
      case 'home': return t.admin.dashboard;
      case 'users': return isAr ? 'إدارة المتاجر' : 'Store Management'; 
      case 'STORE_PROFILE': return isAr ? 'ملف المتجر (داخلي)' : 'Store Profile (Internal)';
      case 'customers': return t.admin.customers;
      case 'CUSTOMER_PROFILE': return isAr ? 'ملف العميل (داخلي)' : 'Customer Profile (Internal)';
      case 'orders-control': return t.admin.orders;
      case 'shipping-carts': return isAr ? 'سلال التجميع (Assembly)' : 'Assembly Carts';
      case 'shipping': return t.admin.shipping;
      case 'reviews': return t.admin.reviews;
      case 'resolution': return t.admin.disputes;
      case 'billing': return t.admin.billing.title;
      case 'audit-logs': return t.admin.auditLogs;
      case 'security-audit': return t.admin.security.title;
      case 'settings': return t.admin.settings;
      case 'support': return t.admin.support.title;
      case 'violations': return t.admin.violations;
      case 'chats': return isAr ? 'المحادثات' : 'Messages';
      case 'chat-monitoring': return isAr ? 'مراقبة المحادثات' : 'Chat Monitoring';
      case 'access-control': return isAr ? 'إدارة الوصول' : 'Access Control';
      case 'verification-tasks': return isAr ? 'مهام المطابقة الميدانية' : 'Verification Tasks';
      case 'verification-task-details': return isAr ? 'تفاصيل مهمة المطابقة' : 'Verification Task Details';
      default: return pageId.replace('-', ' ');
    }
  };

  const translateKey = (key: string) => {
    if (language === 'ar' && KEY_TRANSLATIONS[key]) return KEY_TRANSLATIONS[key];
    // Special handling for common keys that might have context in mapping
    return key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const toggleAllGranular = (page: string, type: 'actions' | 'fields' | 'tabs') => {
    const items = GRANULAR_PERMISSIONS[page]?.[type];
    if (!items) return;
    const allSelected = items.every(item => formData.permissions[page]?.[type]?.[item]);
    
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [page]: {
          ...prev.permissions[page],
          [type]: items.reduce((acc, item) => ({ ...acc, [item]: !allSelected }), {})
        }
      }
    }));
  };

  const copyPermissionsFrom = (sourceAdminId: string) => {
    const sourceAdmin = adminList.find(a => a.id === sourceAdminId);
    if (sourceAdmin && sourceAdmin.adminPermission) {
      setFormData(prev => ({
        ...prev,
        permissions: JSON.parse(JSON.stringify(sourceAdmin.adminPermission.permissions)),
        supportCategories: [...(sourceAdmin.adminPermission.supportTicketCategories || [])],
        blurredSections: [...(sourceAdmin.adminPermission.blurredSections || [])]
      }));
    }
  };

  // --- Support Categories List ---
  const SUPPORT_CATEGORIES = [
    'TECHNICAL', 'PAYMENT', 'ORDERS', 'STORES', 'RETURNS', 'VIOLATIONS', 'DELIVERY', 'ACCOUNT', 'OTHER'
  ];

  // --- Blurred Sections List ---
  const BLURRABLE_SECTIONS = [
    'billing_amounts', 'customer_phone', 'merchant_bank_details', 'payout_logs'
  ];

  const filteredAdmins = adminList.filter(admin => 
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
              <ShieldCheck className="w-6 h-6 text-red-500" />
            </div>
            {language === 'ar' ? 'إدارة الصلاحيات والوصول' : 'Access Control & Permissions'}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {language === 'ar' ? 'إدارة حسابات المسؤولين وتحديد صلاحياتهم الدقيقة' : 'Manage administrator accounts and define granular permissions'}
          </p>
        </div>

        <button 
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-red-600/20 text-white rounded-xl border border-white/10 hover:border-red-500/30 transition-all group"
        >
          <UserPlus className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium uppercase tracking-wider">
            {language === 'ar' ? 'إضافة مسؤول جديد' : 'Add New Admin'}
          </span>
        </button>
      </div>

      {/* Stats / Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-white/40 text-xs uppercase tracking-widest mb-2">
            <UserIcon className="w-4 h-4" />
            {language === 'ar' ? 'إجمالي المسؤولين' : 'Total Admins'}
          </div>
          <div className="text-3xl font-bold text-white">{adminList.length}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-white/40 text-xs uppercase tracking-widest mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            {language === 'ar' ? 'حسابات نشطة' : 'Active Accounts'}
          </div>
          <div className="text-3xl font-bold text-white">
            {adminList.filter(a => a.status === 'ACTIVE').length}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-white/40 text-xs uppercase tracking-widest mb-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            {language === 'ar' ? 'صلاحيات Super Admin' : 'Super Admin Roles'}
          </div>
          <div className="text-3xl font-bold text-white">
            {adminList.filter(a => a.role === 'SUPER_ADMIN').length}
          </div>
        </div>
      </div>

      {/* Filter & List */}
      <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-white/20" />
            <input 
              type="text"
              placeholder={language === 'ar' ? 'البحث عن مسؤول...' : 'Search admins...'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-white text-sm outline-none focus:border-red-500/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-white/60 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-sm">
            <Filter className="w-4 h-4" />
            {language === 'ar' ? 'تصفية' : 'Filter'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right rtl">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase tracking-widest">
                <th className="px-6 py-4 font-medium">{language === 'ar' ? 'المسؤول' : 'Admin'}</th>
                <th className="px-6 py-4 font-medium text-center">{language === 'ar' ? 'الدور' : 'Role'}</th>
                <th className="px-6 py-4 font-medium text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="px-6 py-4 font-medium text-center">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}</th>
                <th className="px-6 py-4 font-medium text-center">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-white/20 italic">
                    {language === 'ar' ? 'لا يوجد مسؤولين مطابقين للبحث' : 'No admins matching your search'}
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-bold border border-red-500/20">
                          {(admin.name || admin.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">{admin.name}</div>
                          <div className="text-white/40 text-xs font-mono">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-widest ${
                        admin.role === 'SUPER_ADMIN' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        admin.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        admin.role === 'VERIFICATION_OFFICER' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' :
                        'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${admin.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_8px_rgba(34,197,94,0.5)]`} />
                        <span className="text-white/60 text-xs">{admin.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-white/40 text-xs font-mono">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenEdit(admin)}
                          className="p-2 bg-white/5 hover:bg-blue-500/20 text-white/60 hover:text-blue-400 rounded-lg border border-white/5 transition-all"
                          title={language === 'ar' ? 'تعديل الصلاحيات' : 'Edit Permissions'}
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingAdmin(admin);
                            setShowPasswordModal(true);
                          }}
                          className="p-2 bg-white/5 hover:bg-yellow-500/20 text-white/60 hover:text-yellow-400 rounded-lg border border-white/5 transition-all"
                          title={language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        {admin.role !== 'SUPER_ADMIN' && (
                          <button 
                            onClick={() => {
                              if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المسؤول؟' : 'Are you sure you want to delete this admin?')) {
                                deleteAdmin(admin.id);
                              }
                            }}
                            className="p-2 bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 rounded-lg border border-white/5 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Create/Edit Modal --- */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 backdrop-blur-xl bg-black/60">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    {editingAdmin ? <Settings2 className="w-6 h-6 text-blue-500" /> : <UserPlus className="w-6 h-6 text-red-500" />}
                    {editingAdmin 
                      ? (language === 'ar' ? `تعديل مسؤول: ${editingAdmin.name}` : `Edit Admin: ${editingAdmin.name}`)
                      : (language === 'ar' ? 'إنشاء مسؤول جديد' : 'Create New Administrator')}
                  </h2>
                  
                  {/* Copy Permissions Helper */}
                  {activeTab === 'permissions' && (
                    <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 ml-4">
                      <Settings2 className="w-3.5 h-3.5 text-red-500" />
                      <select 
                        onChange={(e) => copyPermissionsFrom(e.target.value)}
                        className="bg-transparent text-[10px] text-white/60 outline-none border-none cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled className="bg-[#0a0a0a] text-white">{language === 'ar' ? 'نسخ من مسؤول آخر...' : 'Copy from...'}</option>
                        {adminList.filter(a => a.id !== editingAdmin?.id).map(a => (
                          <option key={a.id} value={a.id} className="bg-[#0a0a0a] text-white">{a.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-6 flex border-b border-white/5">
                {[
                  { id: 'basic', labelAr: 'المعلومات الأساسية', labelEn: 'Basic Info', icon: UserIcon },
                  { id: 'permissions', labelAr: 'مصفوفة الصلاحيات', labelEn: 'Permissions Matrix', icon: Lock },
                  { id: 'advanced', labelAr: 'إعدادات متقدمة', labelEn: 'Advanced Config', icon: ShieldAlert }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-6 py-4 flex items-center gap-2 text-xs uppercase tracking-widest font-bold transition-all relative ${
                      activeTab === tab.id ? 'text-red-500' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {language === 'ar' ? tab.labelAr : tab.labelEn}
                    {activeTab === tab.id && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmit} id="admin-form" className="space-y-6">
                  {formError && (
                    <motion.div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </motion.div>
                  )}
                  {/* TAB: Basic Info */}
                  {activeTab === 'basic' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-3 w-5 h-5 text-white/20" />
                            <input 
                              required
                              disabled={!!editingAdmin}
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-red-500/50 outline-none transition-all"
                              placeholder="e.g. Ahmed Admin"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-white/20" />
                            <input 
                              type="email"
                              required
                              disabled={!!editingAdmin}
                              value={formData.email}
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-red-500/50 outline-none transition-all"
                              placeholder="admin@e-tashleh.com"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">
                            {language === 'ar' ? 'رقم الجوال' : 'Mobile Number'} *
                          </label>
                          <div className="flex gap-2">
                            <div className="relative shrink-0">
                              <select
                                value={formData.countryCode}
                                onChange={(e) => handleCountryCodeChange(e.target.value)}
                                className="h-full min-h-[48px] bg-white/5 border border-white/10 rounded-xl py-3 pl-3 pr-8 text-white text-sm focus:border-red-500/50 outline-none appearance-none cursor-pointer"
                              >
                                {PHONE_COUNTRY_OPTIONS.map((c) => (
                                  <option key={c.code} value={c.code} className="bg-[#0a0a0a]">
                                    {c.flag} {c.code}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="relative flex-1">
                              <Phone className="absolute left-3 top-3 w-5 h-5 text-white/20" />
                              <input
                                type="tel"
                                required
                                inputMode="numeric"
                                pattern="[0-9]{8,12}"
                                value={formData.phone}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    phone: e.target.value.replace(/\D/g, '').slice(0, 12),
                                  })
                                }
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-red-500/50 outline-none transition-all"
                                placeholder={language === 'ar' ? '5xxxxxxxx' : '5xxxxxxxx'}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">
                            {language === 'ar' ? 'البلد' : 'Country'} *
                          </label>
                          <div className="relative">
                            <Globe className="absolute left-3 top-3 w-5 h-5 text-white/20" />
                            <input
                              required
                              readOnly
                              value={
                                language === 'ar'
                                  ? PHONE_COUNTRY_OPTIONS.find((c) => c.code === formData.countryCode)?.countryAr ||
                                    formData.country
                                  : formData.country
                              }
                              className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white/70 outline-none cursor-default"
                            />
                          </div>
                        </div>
                      </div>

                      {!editingAdmin && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">{language === 'ar' ? 'كلمة المرور' : 'Password'}</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 w-5 h-5 text-white/20" />
                              <input 
                                type="password"
                                required
                                minLength={8}
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-red-500/50 outline-none transition-all"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">{language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 w-5 h-5 text-white/20" />
                              <input 
                                type="password"
                                required
                                minLength={8}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-red-500/50 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">{language === 'ar' ? 'اختيار الدور الوظيفي' : 'Select Primary Role'}</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { id: 'ADMIN', labelAr: 'مسؤول نظام (ADMIN)', descAr: 'وصول شامل لجميع الأدوات الإدارية مع صلاحيات تعديل واسعة.', labelEn: 'Admin', descEn: 'Full access to administrative tools with extensive edit capabilities.' },
                            { id: 'SUPPORT', labelAr: 'دعم فني (SUPPORT)', descAr: 'مخصص لمعالجة الطلبات، التذاكر، والدردشات بصلاحيات محدودة.', labelEn: 'Support', descEn: 'Dedicated to handling orders, tickets, and chats with limited scope.' },
                            { id: 'VERIFICATION_OFFICER', labelAr: 'موظف مطابقة (VERIFICATION_OFFICER)', descAr: 'مخصص لمطابقة القطع بالمستندات ميدانياً.', labelEn: 'Verification Officer', descEn: 'Dedicated to verifying parts against documents on the field.' }
                          ].map(role => (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  role: role.id as 'ADMIN' | 'SUPPORT' | 'VERIFICATION_OFFICER',
                                  permissions: applyRoleDefaults(role.id, formData.permissions),
                                })
                              }
                              className={`p-4 rounded-2xl border text-right rtl transition-all ${
                                formData.role === role.id 
                                  ? 'bg-red-500/10 border-red-500/50 ring-1 ring-red-500/50' 
                                  : 'bg-white/5 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  formData.role === role.id ? 'border-red-500' : 'border-white/20'
                                }`}>
                                  {formData.role === role.id && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                                </div>
                                <div className="text-sm font-bold text-white">{language === 'ar' ? role.labelAr : role.labelEn}</div>
                              </div>
                              <p className="text-[10px] text-white/40 leading-relaxed">{language === 'ar' ? role.descAr : role.descEn}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: Permissions Matrix */}
                  {activeTab === 'permissions' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex gap-4">
                        <ShieldAlert className="w-6 h-6 text-blue-400 shrink-0" />
                        <div className="text-xs text-blue-400/80 leading-relaxed italic">
                          {language === 'ar' 
                            ? 'ملاحظة: الصلاحيات الممنوحة هنا تتحكم في الوصول الفعلي للـ Endpoints في الواجهة الخلفية وفي ظهور الأيقونات في لوحة التحكم.'
                            : 'Note: Permissions granted here control both backend endpoint access and UI visibility of navigation items.'}
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-right rtl">
                          <thead>
                            <tr className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-white/40 border-b border-white/10">
                              <th className="px-6 py-4 font-bold">{language === 'ar' ? 'الصفحة / الوظيفة' : 'Page / Resource'}</th>
                              <th className="px-6 py-4 font-bold text-center">{language === 'ar' ? 'عرض' : 'View'}</th>
                              <th className="px-6 py-4 font-bold text-center">{language === 'ar' ? 'تعديل' : 'Edit'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {Object.entries(PERMISSION_PAGES).map(([key, page]) => {
                              const isExpanded = expandedRows.includes(page);
                              const hasGranular = !!GRANULAR_PERMISSIONS[page];

                              return (
                                <React.Fragment key={page}>
                                  <tr className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        {hasGranular && (
                                          <button
                                            type="button"
                                            onClick={() => setExpandedRows(prev => 
                                              isExpanded ? prev.filter(p => p !== page) : [...prev, page]
                                            )}
                                            className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-gold-400 transition-all"
                                          >
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                          </button>
                                        )}
                                        <div>
                                          <div className="text-sm text-white font-bold tracking-wide">{getPermissionLabel(page)}</div>
                                          <div className="text-[10px] text-white/20 font-mono mt-0.5 uppercase">ID: {page}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => togglePermission(page, 'view')}
                                        className={`w-10 h-6 rounded-full transition-all relative ${
                                          formData.permissions[page]?.view ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-white/10'
                                        }`}
                                      >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                                          formData.permissions[page]?.view ? 'left-5' : 'left-1'
                                        }`} />
                                      </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => togglePermission(page, 'edit')}
                                        className={`w-10 h-6 rounded-full transition-all relative ${
                                          formData.permissions[page]?.edit ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-white/10'
                                        }`}
                                      >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                                          formData.permissions[page]?.edit ? 'left-5' : 'left-1'
                                        }`} />
                                      </button>
                                    </td>
                                  </tr>
                                  
                                  {/* Granular Controls Row */}
                                  <AnimatePresence>
                                    {isExpanded && hasGranular && (
                                      <tr>
                                        <td colSpan={3} className="px-6 py-0 border-none">
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-black/20 rounded-xl mb-4 border border-white/5"
                                          >
                                            <div className="p-5 space-y-6">
                                              {/* Actions */}
                                              {GRANULAR_PERMISSIONS[page].actions.length > 0 && (
                                                <div className="space-y-3">
                                                  <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-gold-500/80 uppercase tracking-widest">
                                                      <Settings size={12} />
                                                      {language === 'ar' ? 'العمليات المسموحة' : 'Allowed Actions'}
                                                    </div>
                                                    <button 
                                                      type="button"
                                                      onClick={() => toggleAllGranular(page, 'actions')}
                                                      className="text-[9px] text-white/30 hover:text-white transition-all"
                                                    >
                                                      {language === 'ar' ? 'تحديد الكل' : 'Toggle All'}
                                                    </button>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-3">
                                                    {GRANULAR_PERMISSIONS[page].actions.map(action => (
                                                      <button
                                                        key={action}
                                                        type="button"
                                                        onClick={() => toggleGranular(page, 'actions', action)}
                                                        className={`flex items-center justify-between p-3 rounded-xl border text-[11px] font-bold transition-all ${
                                                          formData.permissions[page]?.actions?.[action]
                                                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                                            : 'bg-white/5 border-white/10 text-white/40'
                                                        }`}
                                                      >
                                                        <span>{translateKey(action)}</span>
                                                        <div className={`w-3.5 h-3.5 rounded-full border ${formData.permissions[page]?.actions?.[action] ? 'bg-red-500 border-transparent shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'border-white/20'}`} />
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                              {/* Fields */}
                                              {GRANULAR_PERMISSIONS[page].fields.length > 0 && (
                                                <div className="space-y-3">
                                                  <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-400/80 uppercase tracking-widest">
                                                      <Lock size={12} />
                                                      {language === 'ar' ? 'عرض البيانات الحساسة' : 'Sensitive Field Visibility'}
                                                    </div>
                                                    <button 
                                                      type="button"
                                                      onClick={() => toggleAllGranular(page, 'fields')}
                                                      className="text-[9px] text-white/30 hover:text-white transition-all"
                                                    >
                                                      {language === 'ar' ? 'تحديد الكل' : 'Toggle All'}
                                                    </button>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-3">
                                                    {GRANULAR_PERMISSIONS[page].fields.map(field => (
                                                      <button
                                                        key={field}
                                                        type="button"
                                                        onClick={() => toggleGranular(page, 'fields', field)}
                                                        className={`flex items-center justify-between p-3 rounded-xl border text-[11px] font-bold transition-all ${
                                                          formData.permissions[page]?.fields?.[field]
                                                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                                            : 'bg-white/5 border-white/10 text-white/40'
                                                        }`}
                                                      >
                                                        <span>{translateKey(field)}</span>
                                                        <div className={`w-3.5 h-3.5 rounded-full border ${formData.permissions[page]?.fields?.[field] ? 'bg-blue-500 border-transparent shadow-[0_0_5px_rgba(59,130,246,0.5)]' : 'border-white/20'}`} />
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                              {/* Tabs */}
                                              {GRANULAR_PERMISSIONS[page].tabs && GRANULAR_PERMISSIONS[page].tabs!.length > 0 && (
                                                <div className="space-y-3">
                                                  <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-purple-400/80 uppercase tracking-widest">
                                                      <Layout size={12} />
                                                      {language === 'ar' ? 'صلاحيات التبويبات (Tabs)' : 'Tab Visibility Governance'}
                                                    </div>
                                                    <button 
                                                      type="button"
                                                      onClick={() => toggleAllGranular(page, 'tabs')}
                                                      className="text-[9px] text-white/30 hover:text-white transition-all"
                                                    >
                                                      {language === 'ar' ? 'تحديد الكل' : 'Toggle All'}
                                                    </button>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-3">
                                                    {GRANULAR_PERMISSIONS[page].tabs!.map(tabId => (
                                                      <button
                                                        key={tabId}
                                                        type="button"
                                                        onClick={() => toggleGranular(page, 'tabs', tabId)}
                                                        className={`flex items-center justify-between p-3 rounded-xl border text-[11px] font-bold transition-all ${
                                                          formData.permissions[page]?.tabs?.[tabId]
                                                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                                            : 'bg-white/5 border-white/10 text-white/40'
                                                        }`}
                                                      >
                                                        <span>{translateKey(tabId)}</span>
                                                        <div className={`w-3.5 h-3.5 rounded-full border ${formData.permissions[page]?.tabs?.[tabId] ? 'bg-purple-500 border-transparent shadow-[0_0_5px_rgba(168,85,247,0.5)]' : 'border-white/20'}`} />
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </motion.div>
                                        </td>
                                      </tr>
                                    )}
                                  </AnimatePresence>
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: Advanced Config */}
                  {activeTab === 'advanced' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      {/* Support Categories */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="w-5 h-5 text-red-500" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{language === 'ar' ? 'فئات الدعم المسموحة' : 'Allowed Support Categories'}</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {SUPPORT_CATEGORIES.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => toggleSupportCategory(cat)}
                              className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                                formData.supportCategories.includes(cat)
                                  ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                  : 'bg-white/5 border-white/10 text-white/40'
                              }`}
                            >
                              <div className={`w-3 h-3 rounded-full border ${formData.supportCategories.includes(cat) ? 'bg-red-500 border-transparent' : 'border-white/20'}`} />
                              {translateKey(cat)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Blurred Sections */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <EyeOff className="w-5 h-5 text-red-500" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{language === 'ar' ? 'أقسام البيانات المحمية' : 'Blurred UI Sections'}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {BLURRABLE_SECTIONS.map(section => (
                            <button
                              key={section}
                              type="button"
                              onClick={() => toggleBlurredSection(section)}
                              className={`p-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                                formData.blurredSections.includes(section)
                                  ? 'bg-red-500/10 border-red-500/40 text-red-500'
                                  : 'bg-white/5 border-white/10 text-white/40'
                              }`}
                            >
                              <span>{translateKey(section)}</span>
                              {formData.blurredSections.includes(section) ? <Lock className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      </div>

                    </motion.div>
                  )}
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-between">
                <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                  {editingAdmin ? `MODID: ${editingAdmin.id}` : 'NEW_ADMIN_RECO_INIT'}
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-2.5 text-white/60 hover:text-white text-sm font-medium transition-all"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button 
                    type="submit" 
                    form="admin-form"
                    disabled={isSaving}
                    className={`px-8 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all flex items-center gap-2 ${
                      isSaving ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSaving 
                      ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                      : editingAdmin ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (language === 'ar' ? 'إنشاء الحساب' : 'Create Account')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Password Modal --- */}
      <AnimatePresence>
        {showPasswordModal && editingAdmin && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-xl bg-black/60">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                  <Key className="w-8 h-8 text-yellow-500" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">{language === 'ar' ? 'تغيير كلمة المرور' : 'Reset Secure Key'}</h3>
                <p className="text-white/40 text-xs mt-1 italic">{editingAdmin.email}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                  <input 
                    type="password"
                    autoFocus
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-yellow-500/50 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-3 bg-white/5 text-white/60 hover:text-white rounded-xl text-sm font-medium transition-all"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button 
                  onClick={async () => {
                    if (!newPassword) return;
                    setIsSaving(true);
                    try {
                      const success = await updateAdminPassword(editingAdmin.id, newPassword);
                      if (success) {
                        setShowPasswordModal(false);
                        setNewPassword('');
                        alert(language === 'ar' ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully');
                      }
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  className={`flex-1 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    isSaving ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isSaving ? (language === 'ar' ? 'جاري التحديث...' : 'Updating...') : (language === 'ar' ? 'تحديث' : 'Update')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
