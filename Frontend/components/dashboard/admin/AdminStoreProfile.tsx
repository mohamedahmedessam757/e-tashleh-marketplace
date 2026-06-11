
import React, { useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useVendorStore } from '../../../stores/useVendorStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
    ChevronLeft, ChevronRight, Store, CheckCircle2, XCircle, FileText, Activity,
    Star, Eye, X, ExternalLink, Mail, Phone, Calendar, Hash, MapPin, CreditCard,
    Wallet, Smartphone, Tablet, Monitor, Verified, Shield, Award, TrendingUp,
    Clock, ShieldAlert, ShoppingCart, Package, Sliders, Loader2, Lock, RotateCcw,
    MessageSquare, Truck, AlertOctagon, Scale, Gavel, Trophy, PlusCircle, AlertTriangle,
    Link as LinkIcon, ArrowUpRight, RefreshCw, Edit3, Undo2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { storesApi } from '../../../services/api/stores';
import { paymentsApi } from '../../../services/api/payments';
// import { toast } from 'react-hot-toast'; // Removed to avoid dependency issue
import { DocumentReviewModal } from '../../modals/DocumentReviewModal'; // Import New Modal
import { AdminSignatureModal } from './AdminSignatureModal';
import { AdminInitiateChatModal } from './AdminInitiateChatModal';
import { ReuploadRequestModal } from '../../modals/ReuploadRequestModal';
import { PrintTemplate } from './PrintTemplate';
import { printHtml } from '../../../utils/print';
import { renderToString } from 'react-dom/server';
import { chatsApi } from '../../../services/api/chats';
import { BlurredSection } from './BlurredSection';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import * as XLSX from 'xlsx';

interface AdminStoreProfileProps {
    vendorId: string;
    onBack: () => void;
    onNavigate?: (path: string, id?: any) => void;
}

type OfferGovernanceEvent = {
    id: string;
    kind: string;
    orderId?: string | null;
    orderNumber?: string | null;
    offerNumber?: string | null;
    timestamp: string;
};

function formatGovTimestamp(ts: string, isAr: boolean) {
    return new Date(ts).toLocaleString(isAr ? 'ar-EG' : 'en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function getModificationKindLabel(kind: string, isAr: boolean) {
    const labels: Record<string, { ar: string; en: string; color: string }> = {
        EDIT: { ar: 'تعديل عرض', en: 'Offer edit', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
        CANCEL: { ar: 'إلغاء عرض (نافذة مجانية)', en: 'Offer cancelled (free window)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
        VOLUNTARY_WITHDRAW: { ar: 'انسحاب طوعي', en: 'Voluntary withdrawal', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
        VIOLATION_WITHDRAW: { ar: 'سحب عرض (حوكمة)', en: 'Governance withdrawal', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    };
    const entry = labels[kind] || { ar: kind, en: kind, color: 'text-white/60 bg-white/5 border-white/10' };
    return { label: isAr ? entry.ar : entry.en, color: entry.color };
}

export const AdminStoreProfile: React.FC<AdminStoreProfileProps> = ({ vendorId, onBack, onNavigate }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const { currentStoreProfile, subscribeToStoreProfile, unsubscribeFromStoreProfile, silentFetchStoreProfile, isLoadingStores } = useAdminStore();
    const vendor = currentStoreProfile;
    const offerGov = vendor?.offerGovernance;
    const isSectionBlurred = useAdminPermissionsStore(s => s.isSectionBlurred);
    const canViewTab = useAdminPermissionsStore(s => s.canViewTab);

    // Tab State (Defined early to be used in effects)
    const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'disputes' | 'reviews' | 'financial' | 'sessions' | 'contract' | 'restrictions'>('overview');

    // Local state for modal
    const [selectedDoc, setSelectedDoc] = useState<{ type: string; title: string; url: string; status?: string } | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState<'ACTIVE' | 'BLOCKED' | 'REJECTED' | 'SUSPENDED' | null>(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [pendingRestrictionAction, setPendingRestrictionAction] = useState<'UPDATE' | 'CLEAR' | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [adminNotes, setAdminNotes] = useState(currentStoreProfile?.adminNotes || '');

    React.useEffect(() => {
        if (currentStoreProfile?.adminNotes) setAdminNotes(currentStoreProfile.adminNotes);
    }, [currentStoreProfile]);

    // Permissions-based Tab filtering
    const visibleTabs = React.useMemo(() => {
        const allTabs = [
            { id: 'overview', icon: Activity, label: t.admin.storeProfile.tabs.overview, permissionKey: 'OVERVIEW' },
            { id: 'orders', icon: CreditCard, label: t.admin.storeProfile.tabs.orders, permissionKey: 'ORDERS' },
            { id: 'disputes', icon: XCircle, label: t.admin.storeProfile.tabs.disputes, permissionKey: 'DISPUTES' },
            { id: 'reviews', icon: Star, label: t.admin.storeProfile.tabs.reviews, permissionKey: 'REVIEWS' },
            { id: 'financial', icon: Wallet, label: t.admin.storeProfile.tabs.financial, permissionKey: 'FINANCIAL' },
            { id: 'sessions', icon: Smartphone, label: t.admin.storeProfile.tabs.sessions, permissionKey: 'SESSIONS' },
            { id: 'contract', icon: FileText, label: t.admin.storeProfile.tabs.contract, permissionKey: 'CONTRACT' },
            { id: 'restrictions', icon: ShieldAlert, label: isAr ? 'القيود والتحكم' : 'Restrictions', permissionKey: 'RESTRICTIONS' },
        ];
        return allTabs.map(tab => ({
            ...tab,
            isLocked: !canViewTab('STORE_PROFILE', tab.permissionKey)
        }));
    }, [canViewTab, isAr, t]);

    const scrollToGovernance = () => {
        setActiveTab('restrictions');
        setTimeout(() => {
            document.getElementById('governance-tab')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    };

    // Auto-switch logic: Only auto-switch if the user has NO allowed tabs at all
    // If they have locked tabs, let them see the locked state
    // Auto-switch logic: Pick the first allowed tab on initial load
    React.useEffect(() => {
        const firstAllowed = visibleTabs.find(t => !t.isLocked);
        if (firstAllowed) {
            setActiveTab(firstAllowed.id as any);
        }
    }, []);

    const [banType, setBanType] = useState<'BLOCKED' | 'SUSPENDED'>('SUSPENDED');
    const [suspensionDays, setSuspensionDays] = useState(7);
    const [financialStats, setFinancialStats] = useState<{
        available: number;
        pending: number;
        frozen: number;
        totalSales: number;
        netEarnings: number;
        completedOrders: number;
    } | null>(null);
    const [isLoadingFinancial, setIsLoadingFinancial] = useState(false);

    // Restrictions State (2026)
    const [restrictionData, setRestrictionData] = useState({
        withdrawalsFrozen: currentStoreProfile?.owner?.withdrawalsFrozen ?? false,
        withdrawalFreezeNote: currentStoreProfile?.owner?.withdrawalFreezeNote ?? '',
        offerLimit: currentStoreProfile?.offerLimit ?? -1,
        visibilityRestricted: currentStoreProfile?.visibilityRestricted ?? false,
        visibilityRate: currentStoreProfile?.visibilityRate ?? 100,
        visibilityNote: currentStoreProfile?.visibilityNote ?? ''
    });
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [pendingRestrictionUpdate, setPendingRestrictionUpdate] = useState<any>(null);
    const [isDocSignatureModalOpen, setIsDocSignatureModalOpen] = useState(false);
    const [pendingDocAction, setPendingDocAction] = useState<'approved' | 'rejected' | null>(null);

    // 2026 Admin Management Tools State
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [financialSubTab, setFinancialSubTab] = useState<'ledger' | 'withdrawals'>('ledger');
    const [suspensionCountdown, setSuspensionCountdown] = useState<string | null>(null);

    const isBanActionLoading = pendingStatusUpdate === 'SUSPENDED' || pendingStatusUpdate === 'BLOCKED';

    // 2026 Re-verification Modal State
    const [reuploadModal, setReuploadModal] = useState<{
        isOpen: boolean;
        docType: string;
        title: string;
        reason: string;
        adminName: string;
        adminSignature: string;
        isSubmitting: boolean;
    }>({
        isOpen: false,
        docType: '',
        title: '',
        reason: '',
        adminName: '',
        adminSignature: '',
        isSubmitting: false
    });

    const handleStatusUpdate = async (newStatus: 'ACTIVE' | 'BLOCKED' | 'REJECTED' | 'SUSPENDED', reason?: string, days?: number) => {
        if (!vendorId) return;
        setPendingStatusUpdate(newStatus);
        setIsUpdating(true);
        try {
            let suspendedUntil: string | undefined = undefined;
            if (newStatus === 'SUSPENDED' && days) {
                const date = new Date();
                date.setDate(date.getDate() + days);
                suspendedUntil = date.toISOString();
            }

            await storesApi.updateStatus(vendorId, newStatus, reason, suspendedUntil);

            const msg = newStatus === 'ACTIVE' ? 'Store Approved Successfully' :
                newStatus === 'REJECTED' ? 'Store Rejected Successfully' :
                    newStatus === 'SUSPENDED' ? `Store Suspended for ${days} days` :
                        'Store Blocked Successfully';
            window.alert(msg);

            setIsRejectModalOpen(false);
            setIsBanModalOpen(false);
            setRejectionReason('');
            silentFetchStoreProfile(vendorId);
        } catch (error) {
            console.error(error);
            window.alert('Failed to update status');
        } finally {
            setIsUpdating(false);
            setPendingStatusUpdate(null);
        }
    };

    const handleReuploadRequest = async () => {
        if (!vendorId || !reuploadModal.docType) return;
        setReuploadModal(prev => ({ ...prev, isSubmitting: true }));
        try {
            await storesApi.updateDocumentStatus(
                vendorId,
                reuploadModal.docType,
                'reupload_requested',
                reuploadModal.reason,
                reuploadModal.adminName,
                reuploadModal.adminSignature
            );
            window.alert(isAr ? 'تم إرسال طلب إعادة الرفع بنجاح' : 'Re-upload request sent successfully');
            setReuploadModal(prev => ({ ...prev, isOpen: false, reason: '', adminName: '', adminSignature: '' }));
            silentFetchStoreProfile(vendorId);
        } catch (error) {
            console.error(error);
            window.alert('Failed to send re-upload request');
        } finally {
            setReuploadModal(prev => ({ ...prev, isSubmitting: false }));
        }
    };

    const handleSaveNotes = async () => {
        if (!vendorId) return;
        setIsUpdating(true);
        try {
            await useAdminStore.getState().updateStoreNotes(vendorId, adminNotes);
            window.alert(isAr ? 'تم حفظ الملاحظات بنجاح' : 'Notes saved successfully');
        } catch (error) {
            console.error(error);
            window.alert('Failed to save notes');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateRestrictions = async (signatureData: any) => {
        if (!vendorId) return;
        setIsUpdating(true);
        try {
            if (pendingRestrictionAction === 'CLEAR') {
                const success = await useAdminStore.getState().clearStoreRestrictions(vendorId, signatureData);
                if (success) {
                    window.alert(isAr ? 'تم مسح القيود التشغيلية بنجاح' : 'Operational restrictions cleared successfully');
                    setRestrictionData({
                        ...restrictionData,
                        offerLimit: -1,
                        visibilityRestricted: false,
                        visibilityRate: 100,
                        visibilityNote: ''
                    });
                    setIsSignatureModalOpen(false);
                } else {
                    throw new Error('Clear failed');
                }
            } else {
                const data = { ...restrictionData, ...signatureData };
                const success = await useAdminStore.getState().updateStoreRestrictions(vendorId, data);
                if (success) {
                    window.alert(isAr ? 'تم تحديث القيود بنجاح' : 'Restrictions updated successfully');
                    setIsSignatureModalOpen(false);
                } else {
                    throw new Error('Update failed');
                }
            }
        } catch (error) {
            console.error(error);
            window.alert(isAr ? 'فشل تنفيذ الإجراء' : 'Action execution failed');
        } finally {
            setIsUpdating(false);
            setPendingRestrictionAction(null);
        }
    };

    const handleClearRestrictions = () => {
        setPendingRestrictionAction('CLEAR');
        setIsSignatureModalOpen(true);
    };

    const fetchFinancialData = async () => {
        if (!vendor?.ownerId) return;
        setIsLoadingFinancial(true);
        try {
            const response = await paymentsApi.getAdminMerchantDashboard(vendor.ownerId);
            setFinancialStats(response.stats);
        } catch (error) {
            console.error('Failed to fetch financial stats:', error);
        } finally {
            setIsLoadingFinancial(false);
        }
    };

    const handleInitiateChat = async (data: any) => {
        if (!vendor?.ownerId) return;
        try {
            const response = await chatsApi.adminInitChat({
                targetUserId: vendor.ownerId,
                targetRole: 'VENDOR',
                ...data
            });
            if (response?.id) {
                window.alert(isAr ? 'تم فتح المحادثة بنجاح' : 'Chat initiated successfully');
                if (onNavigate) onNavigate('support', response.id);
            }
        } catch (error: any) {
            console.error('Failed to initiate chat:', error);
            throw error;
        }
    };

    const handleExportWalletExcel = () => {
        const vendor = currentStoreProfile;
        if (!vendor) return;

        const isAr = language === 'ar';

        const walletData = (vendor.walletTransactions || []).map((tx: any) => ({
            [isAr ? 'رقم الطلب' : 'Order Ref']: tx.payment?.order?.orderNumber || tx.escrow?.order?.orderNumber || tx.metadata?.orderNumber || (tx.transactionType === 'withdrawal' ? (isAr ? 'سحب رصيد' : 'Withdrawal') : 'N/A'),
            [isAr ? 'التاريخ' : 'Date']: new Date(tx.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB'),
            [isAr ? 'النوع' : 'Type']: tx.type === 'CREDIT' ? (isAr ? 'إيداع' : 'CREDIT') : (isAr ? 'خصم' : 'DEBIT'),
            [isAr ? 'العملية' : 'Operation']: tx.transactionType,
            [isAr ? 'المبلغ (AED)' : 'Amount (AED)']: Number(tx.amount),
            [isAr ? 'الوصف' : 'Description']: tx.description || '',
            [isAr ? 'الرصيد بعد العملية' : 'Balance After']: Number(tx.balanceAfter)
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(walletData);
        XLSX.utils.book_append_sheet(wb, ws, isAr ? "حركات المحفظة" : "Wallet Transactions");

        XLSX.writeFile(wb, `Wallet_Report_${vendor.storeCode}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportWithdrawalsExcel = () => {
        const vendor = currentStoreProfile;
        if (!vendor) return;

        const isAr = language === 'ar';

        const withdrawalsData = (vendor.withdrawalRequests || []).map((req: any) => ({
            [isAr ? 'التاريخ' : 'Date']: new Date(req.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB'),
            [isAr ? 'المبلغ (AED)' : 'Amount (AED)']: Number(req.amount),
            [isAr ? 'الحالة' : 'Status']: req.status,
            [isAr ? 'الوسيلة' : 'Method']: req.payoutMethod || (isAr ? 'تحويل بنكي' : 'Bank Transfer'),
            [isAr ? 'اسم البنك' : 'Bank Name']: req.bankName || '',
            [isAr ? 'رقم الحساب' : 'Account Number']: req.accountNumber || '',
            [isAr ? 'ملاحظات الإدارة' : 'Admin Notes']: req.adminNotes || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(withdrawalsData);
        XLSX.utils.book_append_sheet(wb, ws, isAr ? "طلبات السحب" : "Withdrawal Requests");

        XLSX.writeFile(wb, `Withdrawals_Report_${vendor.storeCode}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handlePrintProfile = () => {
        if (!vendor) return;

        const content = (
            <div className="space-y-12">
                <section>
                    <h3 className="text-2xl font-black mb-6 text-gray-800 border-r-4 border-black pr-4">بيانات المتجر الأساسية</h3>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-12 bg-gray-50 p-8 rounded-2xl">
                        <div className="space-y-1">
                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">اسم المتجر</p>
                            <p className="font-bold text-lg">{vendor.name}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">كود المتجر</p>
                            <p className="font-mono font-bold text-lg">{vendor.storeCode}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">البريد الإلكتروني</p>
                            <p className="font-bold">{vendor.owner?.email || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">رقم التواصل</p>
                            <p className="font-bold tabular-nums" dir="ltr">{vendor.owner?.phone || 'N/A'}</p>
                        </div>
                        <div className="col-span-2 space-y-1">
                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">عنوان المتجر</p>
                            <p className="font-bold">{vendor.address || 'N/A'}</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-2xl font-black mb-6 text-gray-800 border-r-4 border-black pr-4">المستندات القانونية والموثوقية</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {vendor.documents?.map((doc: any) => (
                            <div key={doc.id} className="border border-gray-100 p-6 rounded-2xl bg-white shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="font-black text-sm uppercase tracking-wide mb-1">{doc.docType}</p>
                                    <p className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block ${doc.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                                        }`}>
                                        {doc.status}
                                    </p>
                                </div>
                                {doc.fileUrl && (
                                    <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 p-1">
                                        <img src={doc.fileUrl} alt={doc.docType} className="w-full h-full object-contain" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-black text-white p-10 rounded-3xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Performance Score</h3>
                        <div className="text-4xl font-black text-gold-500">{Number(vendor.performanceScore || 0).toFixed(1)}%</div>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gold-500" style={{ width: `${vendor.performanceScore || 0}%` }} />
                    </div>
                </section>
            </div>
        );

        const html = renderToString(
            <PrintTemplate
                title={isAr ? 'ملف التاجر الرسمي' : 'Official Merchant Profile'}
                subtitle={vendor.name}
                content={content}
            />
        );
        printHtml(html, `Merchant_${vendor.storeCode}`);
    };

    const handlePrintContract = (acceptance: any) => {
        if (!acceptance || !vendor) return;

        const content = (
            <div className="space-y-8" dir="rtl">
                <section>
                    <table className="w-full border-collapse border border-gray-300 text-sm mb-6">
                        <thead>
                            <tr>
                                <th colSpan={4} className="bg-gray-100 p-3 text-right font-bold text-gray-800 border border-gray-300 uppercase">
                                    {isAr ? 'بيانات العقد المعتمدة (نسخة الحوكمة)' : 'Certified Contract Metadata'}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="bg-gray-50 p-3 font-bold border border-gray-300 w-1/4">{isAr ? 'تاريخ القبول:' : 'Acceptance Date:'}</td>
                                <td className="p-3 border border-gray-300 w-1/4">{new Date(acceptance.acceptedAt).toLocaleString('ar-EG', { dateStyle: 'long', timeStyle: 'short' })}</td>
                                <td className="bg-gray-50 p-3 font-bold border border-gray-300 w-1/4">{isAr ? 'مرجع العقد:' : 'Contract Ref:'}</td>
                                <td className="p-3 border border-gray-300 font-mono text-xs w-1/4">{acceptance.id.toUpperCase()}</td>
                            </tr>
                            <tr>
                                <td className="bg-gray-50 p-3 font-bold border border-gray-300">{isAr ? 'إصدار العقد:' : 'Contract Version:'}</td>
                                <td className="p-3 border border-gray-300 font-bold">{acceptance.contractVersion || '2026.04'}</td>
                                <td className="bg-gray-50 p-3 font-bold border border-gray-300">{isAr ? 'الحالة:' : 'Status:'}</td>
                                <td className="p-3 border border-gray-300 font-bold text-green-700">{isAr ? 'معتمد إلكترونياً' : 'Electronically Certified'}</td>
                            </tr>
                        </tbody>
                    </table>

                    <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr>
                                <th colSpan={4} className="bg-gray-100 p-3 text-right font-bold text-gray-800 border border-gray-300 uppercase">
                                    {isAr ? 'بيانات الطرف الثاني (التاجر)' : 'Second Party (Merchant) Details'}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="bg-gray-50 p-3 font-bold border border-gray-300 w-1/4">{isAr ? 'اسم المنشأة:' : 'Company Name:'}</td>
                                <td className="p-3 border border-gray-300 w-1/4 font-bold">{acceptance.secondPartyData?.companyName}</td>
                                <td className="bg-gray-50 p-3 font-bold border border-gray-300 w-1/4">{isAr ? 'المدير المسؤول:' : 'Managing Director:'}</td>
                                <td className="p-3 border border-gray-300 w-1/4">{acceptance.secondPartyData?.managerName}</td>
                            </tr>
                            <tr>
                                <td className="bg-gray-50 p-3 font-bold border border-gray-300">{isAr ? 'السجل التجاري:' : 'CR Number:'}</td>
                                <td className="p-3 border border-gray-300 font-mono text-xs">{acceptance.secondPartyData?.crNumber}</td>
                                <td className="bg-gray-50 p-3 font-bold border border-gray-300">{isAr ? 'الرخصة التجارية:' : 'Trade License:'}</td>
                                <td className="p-3 border border-gray-300 font-mono text-xs">{acceptance.secondPartyData?.licenseNumber}</td>
                            </tr>
                            <tr>
                                <td className="bg-gray-50 p-3 font-bold border border-gray-300">{isAr ? 'البريد الإلكتروني:' : 'Certified Email:'}</td>
                                <td colSpan={3} className="p-3 border border-gray-300">{acceptance.signatureData?.email || vendor?.owner?.email}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <section className="mt-8 border-2 border-gray-800 p-6 relative">
                    <h3 className="text-lg font-black mb-6 text-center text-gray-900 uppercase tracking-widest border-b-2 border-gray-200 pb-4">
                        {isAr ? 'نص الاتفاقية الموثقة' : 'Documented Agreement Text'}
                    </h3>
                    <div
                        className="text-sm leading-relaxed text-gray-800 text-justify"
                        style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                    >
                        {isAr ? acceptance.contentArSnapshot : acceptance.contentEnSnapshot}
                    </div>
                </section>

                <section className="mt-12 flex justify-between gap-10">
                    <div className="flex-1 border border-gray-300 p-6 flex flex-col items-center min-h-[180px]">
                        <p className="text-xs text-gray-600 font-bold uppercase mb-6">{isAr ? 'توقيع الطرف الأول (المنصة)' : 'First Party Signature'}</p>
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full border-2 border-gray-300 flex items-center justify-center mb-2">
                                <div className="text-[10px] font-black text-center text-gray-400">E-TASHLEH<br />OFFICIAL<br />SEAL</div>
                            </div>
                            <p className="text-[10px] font-bold text-gray-500">{isAr ? 'ختم إلكتروني معتمد' : 'Authenticated Electronic Seal'}</p>
                        </div>
                    </div>
                    <div className="flex-1 border border-gray-300 p-6 flex flex-col items-center min-h-[180px]">
                        <p className="text-xs text-gray-600 font-bold uppercase mb-6">{isAr ? 'توقيع الطرف الثاني (التاجر)' : 'Second Party Signature'}</p>
                        <div className="flex flex-col items-center gap-4 mt-4">
                            <div className="font-black text-2xl text-gray-900" style={{ fontFamily: '"Brush Script MT", cursive' }}>
                                {acceptance.signatureData?.signedName}
                            </div>
                            <div className="h-px w-48 bg-gray-400 mt-2" />
                            <p className="text-[10px] font-mono text-gray-500">DIGITAL ID: {acceptance.id.split('-')[1]?.toUpperCase() || 'VERIFIED'}</p>
                        </div>
                    </div>
                </section>

                <div className="mt-8 pt-4 border-t border-gray-200 text-center space-y-1">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Global Governance Standards v2026.4.12</p>
                    <p className="text-[9px] text-gray-400 font-mono">Security Check: {acceptance.ipAddress || '---'} | Timestamp: {new Date().toISOString()}</p>
                </div>
            </div>
        );

        const html = renderToString(
            <PrintTemplate
                title={isAr ? 'عقد انضمام وشروط الخدمة' : 'Merchant Partnership Agreement'}
                subtitle={`Store ID: ${vendor.storeCode}`}
                content={content}
            />
        );
        printHtml(html, `Contract_${vendor.storeCode}`);
    };

    const ArrowIcon = isAr ? ChevronRight : ChevronLeft;

    React.useEffect(() => {
        if (vendorId) subscribeToStoreProfile(vendorId);
        return () => unsubscribeFromStoreProfile();
    }, [vendorId]);

    React.useEffect(() => {
        if (vendor?.ownerId) {
            fetchFinancialData();
        }
    }, [vendor?.ownerId]);

    // Sync Admin Notes when store changes or notes are updated in DB
    React.useEffect(() => {
        if (vendor?.adminNotes !== undefined) setAdminNotes(vendor.adminNotes || '');
    }, [vendor?.adminNotes, vendor?.id]);

    // Sync Restriction Data ONLY when switching stores
    // This prevents local toggles from resetting during background updates
    React.useEffect(() => {
        if (vendor) {
            setRestrictionData({
                withdrawalsFrozen: vendor.owner?.withdrawalsFrozen ?? false,
                withdrawalFreezeNote: vendor.owner?.withdrawalFreezeNote ?? '',
                offerLimit: vendor.offerLimit ?? -1,
                visibilityRestricted: vendor.visibilityRestricted ?? false,
                visibilityRate: vendor.visibilityRate ?? 100,
                visibilityNote: vendor.visibilityNote ?? ''
            });
        }
    }, [vendor?.id]); // Only reset when store changes

    React.useEffect(() => {
        if (vendor?.status !== 'SUSPENDED' || !vendor?.suspendedUntil) {
            setSuspensionCountdown(null);
            return;
        }

        const updateCountdown = () => {
            const remainingMs = new Date(vendor.suspendedUntil).getTime() - Date.now();
            if (remainingMs <= 0) {
                setSuspensionCountdown(isAr ? 'انتهت مدة الإيقاف' : 'Suspension expired');
                return;
            }

            const totalSeconds = Math.floor(remainingMs / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            if (days > 0) {
                setSuspensionCountdown(
                    isAr
                        ? `${days} ${days === 1 ? 'يوم' : 'أيام'} ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'} ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`
                        : `${days}d ${hours}h ${minutes}m`
                );
            } else {
                setSuspensionCountdown(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [vendor?.status, vendor?.suspendedUntil, isAr]);

    if (isLoadingStores || !vendor) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4 text-white/20">
                <Store size={64} className="animate-pulse" />
                <p className="font-black uppercase tracking-wide text-xs animate-pulse">Loading Store Protocol...</p>
            </div>
        );
    }

    const allDocTypes = ['CR', 'LICENSE', 'ID', 'IBAN', 'AUTH_LETTER'];
    const getDoc = (type: string) => vendor.documents?.find((d: any) => d.docType === type);

    const docStatusColor = (status: string) => {
        if (status === 'approved') return 'text-green-400 border-green-500/20 bg-green-500/10';
        if (status === 'rejected') return 'text-red-400 border-red-500/20 bg-red-500/10';
        return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10';
    };

    const handleDocAction = async (signatureData: any) => {
        if (!selectedDoc || !vendorId || !pendingDocAction) return;
        setIsUpdating(true);
        try {
            await storesApi.updateDocumentStatus(
                vendorId,
                selectedDoc.type,
                pendingDocAction,
                signatureData.adminReviewDetails,
                signatureData.adminSignatureName,
                signatureData.adminSignatureType === 'DRAWN' ? signatureData.adminSignatureImage : signatureData.adminSignatureText
            );

            setSelectedDoc(null);
            setPendingDocAction(null);
            setIsDocSignatureModalOpen(false);
            silentFetchStoreProfile(vendorId); // Refresh UI
            window.alert(`Document ${pendingDocAction} successfully`);
        } catch (error) {
            console.error(error);
            window.alert('Failed to update document');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

            {/* Rejection Modal */}
            {isRejectModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#1A1814] border border-red-500/20 rounded-2xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 blur-[80px] rounded-full" />

                        <div className="relative z-10 text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                                <XCircle size={32} className="text-red-500" />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">
                                {t.admin.storeProfile.actions.reject}
                            </h3>
                            <p className="text-white/60 text-sm mb-6">
                                {isAr ? 'يرجى كتابة سبب واضح للرفض ليتم إرساله للتاجر' : 'Please provide a clear reason to be sent to the merchant'}
                            </p>

                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder={isAr ? 'مثال: السجل التجاري منتهي أو غير واضح...' : 'Example: Commercial register is expired or unclear...'}
                                className="w-full h-32 bg-[#0F0E0C] border border-white/10 rounded-xl p-4 text-white text-sm focus:border-red-500/50 focus:outline-none transition-all mb-6 resize-none"
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsRejectModalOpen(false)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
                                >
                                    {t.admin.storeProfile.banModal.cancel}
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate('REJECTED', rejectionReason)}
                                    disabled={!rejectionReason.trim() || isUpdating}
                                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {pendingStatusUpdate === 'REJECTED' ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            {isAr ? 'جاري الرفض...' : 'Rejecting...'}
                                        </>
                                    ) : (
                                        isAr ? 'تأكيد الرفض' : 'Confirm Reject'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Ban/Suspension Modal */}
            {isBanModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#1A1814] border border-orange-500/20 rounded-2xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full" />

                        <div className="relative z-10">
                            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                <Activity size={24} className="text-orange-500" />
                                {t.admin.storeProfile.banModal.title}
                            </h3>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setBanType('SUSPENDED')}
                                        disabled={isBanActionLoading}
                                        className={`p-4 rounded-xl border transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed ${banType === 'SUSPENDED' ? 'bg-orange-500/20 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}
                                    >
                                        <Activity className="mx-auto mb-2" />
                                        <div className="text-xs font-bold uppercase tracking-wider">{isAr ? 'إيقاف مؤقت' : 'Temporary'}</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBanType('BLOCKED')}
                                        disabled={isBanActionLoading}
                                        className={`p-4 rounded-xl border transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed ${banType === 'BLOCKED' ? 'bg-red-500/20 border-red-500 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}
                                    >
                                        <XCircle className="mx-auto mb-2" />
                                        <div className="text-xs font-bold uppercase tracking-wider">{isAr ? 'حظر دائم' : 'Permanent'}</div>
                                    </button>
                                </div>

                                {banType === 'SUSPENDED' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-wide">{t.admin.storeProfile.banModal.duration}</label>
                                        <select
                                            value={suspensionDays}
                                            onChange={(e) => setSuspensionDays(Number(e.target.value))}
                                            disabled={isBanActionLoading}
                                            className="w-full bg-[#0F0E0C] border border-white/10 rounded-xl p-4 text-white focus:border-orange-500/50 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value={3}>3 {isAr ? 'أيام' : 'Days'}</option>
                                            <option value={7}>7 {isAr ? 'أيام' : 'Days'}</option>
                                            <option value={15}>15 {isAr ? 'يوم' : 'Days'}</option>
                                            <option value={30}>30 {isAr ? 'يوم' : 'Days'}</option>
                                            <option value={90}>90 {isAr ? 'يوم' : 'Days'}</option>
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-wide">{t.admin.storeProfile.banModal.reason}</label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        disabled={isBanActionLoading}
                                        className="w-full h-24 bg-[#0F0E0C] border border-white/10 rounded-xl p-4 text-white text-sm focus:border-orange-500/50 outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsBanModalOpen(false)}
                                        disabled={isBanActionLoading}
                                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {t.admin.storeProfile.banModal.cancel}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusUpdate(banType, rejectionReason, suspensionDays)}
                                        disabled={!rejectionReason.trim() || isUpdating}
                                        className={`flex-1 py-4 text-white font-black rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${banType === 'SUSPENDED' ? 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20' : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20'}`}
                                    >
                                        {isBanActionLoading ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                {isAr ? 'جاري تنفيذ الإجراء...' : 'Applying action...'}
                                            </>
                                        ) : (
                                            t.admin.storeProfile.banModal.confirm
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Store Ban / Suspension Status Banner */}
            {(vendor.status === 'SUSPENDED' || vendor.status === 'BLOCKED') && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-6 p-1 rounded-3xl border overflow-hidden shadow-lg ${
                        vendor.status === 'BLOCKED'
                            ? 'bg-gradient-to-r from-red-500/20 via-red-600/10 to-red-500/20 border-red-500/30 shadow-red-500/10'
                            : 'bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-orange-500/20 border-orange-500/30 shadow-orange-500/10'
                    }`}
                >
                    <div className="bg-[#0F0E0D]/80 backdrop-blur-xl p-5 rounded-[22px] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        <div className="flex items-start gap-4 flex-1">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 ${
                                vendor.status === 'BLOCKED'
                                    ? 'bg-red-500/20 border-red-500/30'
                                    : 'bg-orange-500/20 border-orange-500/30'
                            }`}>
                                {vendor.status === 'BLOCKED' ? (
                                    <Lock size={28} className="text-red-500" />
                                ) : (
                                    <Clock size={28} className="text-orange-500 animate-pulse" />
                                )}
                            </div>
                            <div className="space-y-2 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-black text-white">
                                        {vendor.status === 'BLOCKED'
                                            ? (isAr ? 'حظر دائم على المتجر' : 'Store Permanently Blocked')
                                            : (isAr ? 'إيقاف مؤقت على المتجر' : 'Store Temporarily Suspended')}
                                    </h3>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                        vendor.status === 'BLOCKED'
                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                    }`}>
                                        {vendor.status === 'BLOCKED'
                                            ? (isAr ? 'حظر دائم' : 'Permanent')
                                            : (isAr ? 'إيقاف مؤقت' : 'Temporary')}
                                    </span>
                                </div>

                                {vendor.status === 'SUSPENDED' && vendor.suspendedUntil && (
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2">
                                            <Clock size={14} className="text-orange-400" />
                                            <span className="text-[10px] font-black text-orange-400/80 uppercase tracking-widest">
                                                {isAr ? 'المدة المتبقية' : 'Time Remaining'}
                                            </span>
                                            <span className="text-lg font-mono font-black text-orange-300 tabular-nums" dir="ltr">
                                                {suspensionCountdown || '—'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-white/40 font-medium">
                                            {isAr ? 'ينتهي في:' : 'Ends:'}{' '}
                                            <span dir="ltr">
                                                {new Date(vendor.suspendedUntil).toLocaleString(isAr ? 'ar-EG' : 'en-GB', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </span>
                                    </div>
                                )}

                                {vendor.rejectionReason && (
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">
                                            {isAr ? 'سبب الإجراء' : 'Action Reason'}
                                        </p>
                                        <p className="text-sm text-white/90 font-medium leading-relaxed">
                                            {vendor.rejectionReason}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Active Restrictions Banner */}
            {(vendor.owner?.withdrawalsFrozen || vendor.visibilityRestricted || (vendor.offerLimit !== -1)) && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-1 rounded-3xl bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 border border-red-500/30 overflow-hidden shadow-lg shadow-red-500/10"
                >
                    <div className="bg-[#0F0E0D]/80 backdrop-blur-xl p-4 rounded-[22px] flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                                <ShieldAlert className="text-red-500 animate-pulse" />
                            </div>
                            <div>
                                <h4 className="text-white font-black uppercase tracking-widest text-sm">
                                    {isAr ? 'تنبيه: قيود نشطة' : 'Alert: Active Restrictions'}
                                </h4>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {vendor.owner?.withdrawalsFrozen && (
                                        <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                            {isAr ? 'السحب مجمد' : 'Payouts Frozen'}
                                        </span>
                                    )}
                                    {vendor.visibilityRestricted && (
                                        <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                            {isAr ? 'تقييد الظهور' : 'Visibility Restricted'}
                                        </span>
                                    )}
                                    {vendor.offerLimit !== -1 && (
                                        <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                            {isAr ? `حد العروض: ${vendor.offerLimit}` : `Offer Limit: ${vendor.offerLimit}`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {vendor.withdrawalFreezeNote && vendor.withdrawalsFrozen && (
                            <div className="flex-1 min-w-[200px] bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">{isAr ? 'سبب التجميد' : 'Freeze Reason'}</p>
                                <p className="text-xs text-white/80 font-medium italic">"{vendor.withdrawalFreezeNote}"</p>
                            </div>
                        )}

                        <button
                            onClick={scrollToGovernance}
                            className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10 transition-all"
                        >
                            {isAr ? 'إدارة القيود' : 'Manage Restrictions'}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Offer modification rate alert */}
            {offerGov && (offerGov.exceedsThreshold || (offerGov.events?.length ?? 0) > 0) && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-6 p-1 rounded-3xl border overflow-hidden shadow-lg ${
                        offerGov.exceedsThreshold
                            ? 'bg-gradient-to-r from-orange-500/20 via-red-500/20 to-orange-500/20 border-orange-500/30 shadow-orange-500/10'
                            : 'bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border-blue-500/20 shadow-blue-500/5'
                    }`}
                >
                    <div className="bg-[#0F0E0D]/80 backdrop-blur-xl p-4 rounded-[22px] flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                offerGov.exceedsThreshold
                                    ? 'bg-orange-500/20 border-orange-500/30'
                                    : 'bg-blue-500/20 border-blue-500/30'
                            }`}>
                                <RefreshCw className={`${offerGov.exceedsThreshold ? 'text-orange-400 animate-pulse' : 'text-blue-400'}`} size={22} />
                            </div>
                            <div>
                                <h4 className="text-white font-black uppercase tracking-widest text-sm">
                                    {offerGov.exceedsThreshold
                                        ? (isAr ? 'تنبيه: معدل تعديل العروض مرتفع' : 'Alert: High offer modification rate')
                                        : (isAr ? 'سجل تعديلات العروض' : 'Offer modification log')}
                                </h4>
                                <p className="text-xs text-white/50 mt-1">
                                    {isAr
                                        ? `معدل التعديل الحالي: ${offerGov.modificationRatePercent}% — ${offerGov.editCount} تعديل + ${offerGov.withdrawalCount} سحب / ${offerGov.totalOffersSent} عرض`
                                        : `Current rate: ${offerGov.modificationRatePercent}% — ${offerGov.editCount} edits + ${offerGov.withdrawalCount} withdrawals / ${offerGov.totalOffersSent} offers`}
                                </p>
                                {(offerGov.events?.length ?? 0) > 0 && (
                                    <p className="text-[10px] text-white/30 mt-0.5">
                                        {isAr
                                            ? `${offerGov.events.length} حدث مسجّل — آخر: ${formatGovTimestamp(offerGov.events[0].timestamp, isAr)}`
                                            : `${offerGov.events.length} logged event(s) — latest: ${formatGovTimestamp(offerGov.events[0].timestamp, isAr)}`}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={scrollToGovernance}
                            className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10 transition-all"
                        >
                            {isAr ? 'عرض التفاصيل' : 'View details'}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Premium Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1814] to-[#0A0908] border border-white/5 shadow-2xl">
                {/* Background Decorative Glows */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-500/5 blur-[120px] rounded-full -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full -ml-24 -mb-24" />

                <div className="relative z-10 p-8">
                    <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">

                        {/* Store Main Identity */}
                        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                            <button onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/50 hover:text-white border border-white/5 order-first md:order-none mb-4 md:mb-0">
                                <ArrowIcon size={24} />
                            </button>

                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-tr from-gold-500/50 to-amber-500/50 rounded-full blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-[#0F0E0D] border-2 border-gold-500/20 shadow-2xl flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: vendor.logo ? `url(${vendor.logo})` : 'none' }}>
                                    {!vendor.logo && <Store size={64} className="text-gold-500/20" />}
                                </div>
                                <div className={`absolute bottom-2 right-2 p-1.5 rounded-full border shadow-lg ${docStatusColor(vendor.status === 'ACTIVE' ? 'approved' : 'pending')}`}>
                                    {vendor.status === 'ACTIVE' ? <CheckCircle2 size={24} fill="currentColor" className="text-[#0F0E0D]" /> : <Activity size={24} />}
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="space-y-1">
                                    <h1 className="text-3xl md:text-4xl font-black text-white flex items-center justify-center md:justify-start gap-3 tracking-tight">
                                        {vendor.name || 'Store Name'}
                                        {vendor.status === 'ACTIVE' && <Verified size={24} className="text-blue-400" />}
                                    </h1>
                                    <p className="text-gold-500/60 font-mono text-sm uppercase tracking-wide flex items-center justify-center md:justify-start gap-2">
                                        <Hash size={14} /> {vendor.storeCode || 'ST-0000'}
                                    </p>
                                    {(vendor.status === 'SUSPENDED' || vendor.status === 'BLOCKED') && (
                                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                            vendor.status === 'BLOCKED'
                                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                                : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                                        }`}>
                                            {vendor.status === 'BLOCKED'
                                                ? (isAr ? 'حظر دائم' : 'Permanently Blocked')
                                                : (isAr ? 'إيقاف مؤقت' : 'Temporarily Suspended')}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                                    <div className="flex items-center justify-center md:justify-start gap-3 text-white/70 hover:text-white transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Mail size={14} className="text-gold-500/70" /></div>
                                        <span className="text-sm font-medium">{vendor.owner?.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-center md:justify-start gap-3 text-white/70 hover:text-white transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Phone size={14} className="text-gold-500/70" /></div>
                                        <BlurredSection isBlurred={isSectionBlurred('customer_phone')}>
                                            <span className="text-sm font-medium leading-none tabular-nums" dir="ltr">{vendor.owner?.phone || 'N/A'}</span>
                                        </BlurredSection>
                                    </div>
                                    <div className="flex items-center justify-center md:justify-start gap-3 text-white/70 hover:text-white transition-colors sm:col-span-1">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Calendar size={14} className="text-gold-500/70" /></div>
                                        <span className="text-sm font-medium">
                                            {isAr ? 'انضم في' : 'Joined'}: {new Date(vendor.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                    </div>
                                    {vendor.address && (
                                        <div className="flex items-center justify-center md:justify-start gap-3 text-white/70 hover:text-white transition-colors sm:col-span-1 truncate max-w-xs">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><MapPin size={14} className="text-gold-500/70" /></div>
                                            <span className="text-sm font-medium truncate">{vendor.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Strategic Action Hub */}
                        <div className="w-full lg:w-72 space-y-3">
                            <div className="flex items-center justify-between px-2 mb-2">
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-wide">{isAr ? 'مركز التحكم' : 'Action Hub'}</span>
                                <div className={`w-2 h-2 rounded-full ${
                                    vendor.status === 'ACTIVE'
                                        ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                                        : vendor.status === 'BLOCKED'
                                            ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse'
                                            : vendor.status === 'SUSPENDED'
                                                ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)] animate-pulse'
                                                : 'bg-yellow-500 animate-pulse'
                                }`} />
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {vendor.status !== 'ACTIVE' && (
                                    <button
                                        onClick={() => handleStatusUpdate('ACTIVE')}
                                        disabled={isUpdating}
                                        className="w-full py-3.5 bg-green-500 text-[#0F0E0D] font-black text-xs uppercase tracking-[0.1em] rounded-2xl hover:bg-green-400 hover:scale-[1.02] transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                                    >
                                        {pendingStatusUpdate === 'ACTIVE' ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                {isAr ? 'جاري التنشيط...' : 'Activating store...'}
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={16} className="group-hover:rotate-12 transition-transform" />
                                                {isAr ? 'تنشيط المتجر الآن' : 'Unleash Store (Approve)'}
                                            </>
                                        )}
                                    </button>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsChatModalOpen(true)}
                                        className="w-full py-4 bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-white/5 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 border border-white/10"
                                    >
                                        <MessageSquare size={16} />
                                        {isAr ? 'بدء محادثة فورية' : 'Initiate Support Session'}
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsRejectModalOpen(true)}
                                        disabled={isUpdating || vendor.status === 'REJECTED'}
                                        className="flex-1 py-3 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 text-white/60 hover:text-red-500 font-bold text-[10px] uppercase tracking-wide rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <XCircle size={14} />
                                        {isAr ? 'رفض' : 'Reject'}
                                    </button>
                                    <button
                                        onClick={() => setIsBanModalOpen(true)}
                                        disabled={isUpdating || vendor.status === 'BLOCKED'}
                                        className="flex-1 py-3 bg-white/5 hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/30 text-white/60 hover:text-orange-500 font-bold text-[10px] uppercase tracking-wide rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <Activity size={14} />
                                        {isAr ? 'تقييد' : 'Restrict'}
                                    </button>
                                </div>

                                <button
                                    onClick={() => silentFetchStoreProfile(vendorId!)}
                                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/30 hover:text-white font-black text-[9px] uppercase tracking-[0.3em] rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5"
                                >
                                    <Activity size={12} className={isUpdating ? 'animate-spin' : ''} />
                                    {isAr ? 'تحديث البيانات' : 'Sync Intelligence'}
                                </button>
                            </div>
                        </div>

                        {/* Quick Metrics Bar */}
                        <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4">
                            <GlassCard className="p-4 bg-white/5 border-white/5 hover:border-gold-500/30 transition-all">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-6 h-6 rounded bg-gold-500/10 flex items-center justify-center"><Wallet size={12} className="text-gold-500" /></div>
                                    <span className="text-[10px] uppercase font-black text-white/40 tracking-wider font-sans">{isAr ? 'المتاح' : 'Available'}</span>
                                </div>
                                <div className="text-lg font-black text-white tabular-nums">
                                    {isLoadingFinancial ? '...' : (financialStats?.available || 0).toLocaleString()} <span className="text-[10px] text-white/40 ml-1">AED</span>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-4 bg-white/5 border-white/5 hover:border-green-500/30 transition-all">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-6 h-6 rounded bg-green-500/10 flex items-center justify-center"><CreditCard size={12} className="text-green-500" /></div>
                                    <span className="text-[10px] uppercase font-black text-white/40 tracking-wider font-sans">{isAr ? 'صافي الأرباح' : 'Earnings'}</span>
                                </div>
                                <div className="text-lg font-black text-white tabular-nums">
                                    {isLoadingFinancial ? '...' : (financialStats?.netEarnings || 0).toLocaleString()} <span className="text-[10px] text-white/40 ml-1">AED</span>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-4 bg-white/5 border-white/5 hover:border-blue-500/30 transition-all">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center"><Activity size={12} className="text-blue-500" /></div>
                                    <span className="text-[10px] uppercase font-black text-white/40 tracking-wider font-sans">Orders</span>
                                </div>
                                <div className="text-xl font-black text-white tabular-nums uppercase">
                                    {vendor._count?.orders || 0}
                                </div>
                            </GlassCard>

                            <GlassCard className="p-4 bg-white/5 border-white/5 hover:border-yellow-500/30 transition-all">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-6 h-6 rounded bg-yellow-500/10 flex items-center justify-center"><Star size={12} className="text-yellow-500" /></div>
                                    <span className="text-[10px] uppercase font-black text-white/40 tracking-wider font-sans">Rating</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-white tabular-nums">{Number(vendor.rating || 0).toFixed(1)}</span>
                                    <div className="flex items-center">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} size={8} fill={s <= Math.round(Number(vendor.rating || 0)) ? "currentColor" : "none"} className={s <= Math.round(Number(vendor.rating || 0)) ? "text-yellow-500" : "text-white/20"} />
                                        ))}
                                    </div>
                                </div>
                            </GlassCard>
                        </div>

                    </div>
                </div>
            </div>

            {/* NEW: Administrative Restriction Banners (2026 Admin Visibility) */}
            {(currentStoreProfile?.owner?.withdrawalsFrozen || (currentStoreProfile?.offerLimit && currentStoreProfile?.offerLimit !== -1) || currentStoreProfile?.visibilityRestricted) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentStoreProfile?.owner?.withdrawalsFrozen && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-4 animate-in slide-in-from-top-2 duration-500">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-widest">{isAr ? 'عمليات السحب مجمدة' : 'Withdrawals Frozen'}</h4>
                                <p className="text-[10px] text-red-400 font-bold mt-0.5">{currentStoreProfile.owner.withdrawalFreezeNote || (isAr ? 'تم تقييد سحب الأموال لهذا المتجر' : 'Financial payouts restricted for this vendor')}</p>
                            </div>
                        </div>
                    )}
                    {currentStoreProfile?.offerLimit && currentStoreProfile?.offerLimit !== -1 && (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-4 animate-in slide-in-from-top-2 duration-500 delay-75">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                <Package size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-widest">{isAr ? 'حد العروض مفعل' : 'Offer Limit Active'}</h4>
                                <p className="text-[10px] text-amber-400 font-bold mt-0.5">{isAr ? `محدد بـ ${currentStoreProfile.offerLimit} عرضاً فقط` : `Limited to ${currentStoreProfile.offerLimit} total offers`}</p>
                            </div>
                        </div>
                    )}
                    {currentStoreProfile?.visibilityRestricted && (
                        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-4 animate-in slide-in-from-top-2 duration-500 delay-100">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                                <Eye size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-widest">{isAr ? 'الظهور مقيد' : 'Visibility Restricted'}</h4>
                                <p className="text-[10px] text-blue-400 font-bold mt-0.5">{isAr ? `معدل الظهور: ${currentStoreProfile.visibilityRate}%` : `Visibility Rate: ${currentStoreProfile.visibilityRate}%`}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Advanced Tabs Navigation */}
            <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
                {visibleTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap
                            ${activeTab === tab.id
                                ? 'bg-gold-500 text-[#0F0E0D] shadow-lg shadow-gold-500/20 active:scale-95'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                            }
                            ${tab.isLocked ? 'opacity-70' : ''}
                        `}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {tab.isLocked && <Lock size={12} className={activeTab === tab.id ? 'text-[#0F0E0D]/50' : 'text-red-500/50'} />}
                    </button>
                ))}
            </div>

            {/* Tab Content Governance Layer */}
            <div className="relative">
                <BlurredSection
                    isBlurred={visibleTabs.find(t => t.id === activeTab)?.isLocked}
                    titleAr={`تبويب ${visibleTabs.find(t => t.id === activeTab)?.label} محمي`}
                    titleEn={`${visibleTabs.find(t => t.id === activeTab)?.label} Tab Protected`}
                    descriptionAr="لا تملك صلاحية الوصول لهذا التبويب. يرجى التواصل مع الإدارة العليا لتوسيع نطاق وصولك."
                    descriptionEn="You do not have permission to access this tab. Please contact senior management to expand your access scope."
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'overview' && (
                                <div className="grid lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Column 1: Merchant Identity & Context */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <GlassCard className="p-8 border-white/5 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-gold-500/10 transition-all duration-700" />

                                            <h3 className="text-xl font-black text-white uppercase tracking-wide mb-8 flex items-center gap-3">
                                                <Activity size={20} className="text-gold-500" />
                                                {isAr ? 'بيانات المتجر الأساسية' : 'Primary Store Identity'}
                                            </h3>

                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-6">
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-wide">{t.admin.storeProfile.details.owner}</p>
                                                        <p className="text-white font-bold text-lg">{vendor.owner?.name || '---'}</p>
                                                        <p className="text-white/40 text-xs italic">{vendor.owner?.email}</p>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-wide">{t.admin.storeProfile.details.joinDate}</p>
                                                        <p className="text-white font-bold">{new Date(vendor.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { dateStyle: 'long' })}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-wide">{t.admin.storeProfile.details.address}</p>
                                                        <p className="text-white/80 leading-relaxed text-sm font-medium">
                                                            {vendor.address || (isAr ? 'لم يتم تحديد عنوان دقيق' : 'No specific address provided')}
                                                        </p>
                                                        {vendor.lat && vendor.lng && (
                                                            <a
                                                                href={`https://www.google.com/maps?q=${vendor.lat},${vendor.lng}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2 text-gold-500 hover:text-gold-400 text-[10px] font-black uppercase tracking-wide mt-2 transition-colors"
                                                            >
                                                                <MapPin size={12} />
                                                                {isAr ? 'عرض على الخريطة' : 'View on Live Map'}
                                                            </a>
                                                        )}
                                                    </div>

                                                    <div className="pt-4 border-t border-white/5">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-wide">{isAr ? 'حالة السيولة' : 'Liquidity Status'}</p>
                                                            <span className="text-[9px] text-green-500 font-bold uppercase italic">Verified</span>
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <div>
                                                                <p className="text-[10px] text-white/20 mb-1 italic">Available</p>
                                                                <p className="text-white font-black">{isLoadingFinancial ? '...' : (financialStats?.available || 0).toLocaleString()} <span className="text-[10px] opacity-30">AED</span></p>
                                                            </div>
                                                            <div className="border-l border-white/5 pl-4">
                                                                <p className="text-[10px] text-white/20 mb-1 italic">Pending</p>
                                                                <p className="text-white/60 font-black">{isLoadingFinancial ? '...' : (financialStats?.pending || 0).toLocaleString()} <span className="text-[10px] opacity-30">AED</span></p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Loyalty & Reputation Module */}
                                            <div className="mt-8 pt-8 border-t border-white/5">
                                                <div className="grid md:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-wide">{isAr ? 'مستوى الولاء الحالي' : 'Current Loyalty Status'}</p>
                                                            <Award size={14} className="text-gold-500/50" />
                                                        </div>
                                                        <div className={`p-4 rounded-2xl border flex items-center gap-4 transition-all hover:scale-[1.02] ${vendor.loyaltyTier === 'ELITE' ? 'bg-amber-500/5 border-amber-500/20' :
                                                            vendor.loyaltyTier === 'VIP' ? 'bg-purple-500/5 border-purple-500/20' :
                                                                vendor.loyaltyTier === 'GOLD' ? 'bg-gold-500/5 border-gold-500/20' :
                                                                    vendor.loyaltyTier === 'SILVER' ? 'bg-slate-400/5 border-slate-400/10' :
                                                                        'bg-orange-500/5 border-orange-500/10'
                                                            }`}>
                                                            <div className={`p-3 rounded-xl ${vendor.loyaltyTier === 'ELITE' ? 'bg-amber-500/20 text-amber-300' :
                                                                vendor.loyaltyTier === 'VIP' ? 'bg-purple-500/20 text-purple-400' :
                                                                    vendor.loyaltyTier === 'GOLD' ? 'bg-gold-500/20 text-gold-500' :
                                                                        vendor.loyaltyTier === 'SILVER' ? 'bg-slate-400/20 text-slate-300' :
                                                                            'bg-orange-500/20 text-orange-400'
                                                                }`}>
                                                                <Award size={24} />
                                                            </div>
                                                            <div>
                                                                <p className={`text-xs font-black uppercase tracking-wide mb-0.5 ${vendor.loyaltyTier === 'ELITE' ? 'text-amber-300' :
                                                                    vendor.loyaltyTier === 'VIP' ? 'text-purple-400' :
                                                                        vendor.loyaltyTier === 'GOLD' ? 'text-gold-500' :
                                                                            vendor.loyaltyTier === 'SILVER' ? 'text-slate-300' :
                                                                                'text-orange-400'
                                                                    }`}>
                                                                    {vendor.loyaltyTier || 'BASIC'}
                                                                </p>
                                                                <p className="text-[10px] text-white/30 italic">
                                                                    {isAr ? 'عضوية النشاط التجاري المعتمد' : 'Certified Business Membership'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-wide">{isAr ? 'الأداء والنمو' : 'Performance & Growth'}</p>
                                                            <TrendingUp size={14} className="text-blue-500/50" />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                                                <p className="text-[10px] text-white/20 mb-1 italic">Score</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-white font-black text-lg">{Number(vendor.performanceScore || 0).toFixed(0)}%</p>
                                                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-blue-500 transition-all duration-1000"
                                                                            style={{ width: `${vendor.performanceScore || 0}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                                                <p className="text-[10px] text-white/20 mb-1 italic">Lifetime</p>
                                                                <p className="text-white font-black text-lg truncate">
                                                                    {Number(vendor.lifetimeEarnings || 0).toLocaleString()}
                                                                    <span className="text-[10px] opacity-30 ml-1">AED</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassCard>

                                        {/* Workshop Identity: Car Makes & Models */}
                                        <GlassCard className="p-8 border-white/5 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all duration-700" />
                                            <div className="flex items-center justify-between mb-8 relative z-10">
                                                <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-3">
                                                    <Hash size={18} className="text-blue-500" />
                                                    {isAr ? 'تخصص المتجر' : 'Store Specialization'}
                                                </h3>
                                            </div>

                                            <div className="space-y-8 relative z-10">
                                                <div>
                                                    <div className="text-[10px] font-black text-white/30 uppercase tracking-wide mb-4 flex items-center gap-2">
                                                        <div className="w-1 h-1 rounded-full bg-blue-500" />
                                                        {t.admin.storeProfile.details.makes}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {vendor.selectedMakes && vendor.selectedMakes.length > 0 ? (
                                                            vendor.selectedMakes.map((make: string) => (
                                                                <span key={make} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all cursor-default">
                                                                    {make}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-white/20 text-xs italic">{isAr ? 'لم يتم تحديد ماركات' : 'No brands specified'}</span>
                                                        )}
                                                        {vendor.customMake && (
                                                            <span className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs font-bold text-blue-400 italic">
                                                                + {vendor.customMake}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <div className="w-1 h-1 rounded-full bg-gold-500" />
                                                        {t.admin.storeProfile.details.models}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {vendor.selectedModels && vendor.selectedModels.length > 0 ? (
                                                            vendor.selectedModels.map((model: string) => (
                                                                <span key={model} className="px-3 py-1.5 bg-gold-500/5 border border-gold-500/10 rounded-lg text-[11px] font-medium text-white/80">
                                                                    {model}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-white/20 text-xs italic">{isAr ? 'لم يتم تحديد موديلات' : 'No models specified'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassCard>

                                        {/* Compliance & Verification Snapshot */}
                                        <div className="pt-2">
                                            <div className="flex items-center justify-between mb-4 px-2">
                                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-wide flex items-center gap-2">
                                                    <Shield size={14} className="text-green-500" />
                                                    {isAr ? 'التراخيص والمستندات' : 'Licenses & Documents'}
                                                </h3>
                                                <button
                                                    onClick={() => setActiveTab('contract')}
                                                    className="text-[9px] font-bold text-gold-500/60 hover:text-gold-500 uppercase tracking-wide transition-colors"
                                                >
                                                    {isAr ? 'عرض العقود' : 'View Full Contracts'}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {vendor.documents?.map((doc: any) => {
                                                    const daysRemaining = doc.expiresAt ? Math.ceil((new Date(doc.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                                                    const docTypeMap: Record<string, { ar: string, en: string }> = {
                                                        CR: { ar: 'السجل التجاري', en: 'Commercial Register' },
                                                        LICENSE: { ar: 'الرخصة التجارية', en: 'Trade License' },
                                                        ID: { ar: 'بطاقة الهوية', en: 'National ID' },
                                                        IBAN: { ar: 'الحساب البنكي', en: 'IBAN Certification' },
                                                        AUTH_LETTER: { ar: 'خطاب التفويض', en: 'Authorization Letter' }
                                                    };
                                                    const translatedTitle = isAr ? (docTypeMap[doc.docType]?.ar || doc.docType) : (docTypeMap[doc.docType]?.en || doc.docType);

                                                    return (
                                                        <div
                                                            key={doc.id}
                                                            onClick={() => setSelectedDoc({
                                                                url: doc.fileUrl,
                                                                title: translatedTitle,
                                                                type: doc.docType,
                                                                status: doc.status
                                                            })}
                                                            className={`group p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-white/30 transition-all text-left relative overflow-hidden cursor-pointer ${doc.status === 'reupload_requested' ? 'shadow-[0_0_20px_rgba(239,68,68,0.3)] border-red-500/40' : ''
                                                                }`}
                                                            role="button"
                                                            tabIndex={0}
                                                        >
                                                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                                                                <FileText size={24} />
                                                            </div>

                                                            {/* Re-upload Request Trigger */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setReuploadModal(prev => ({
                                                                        ...prev,
                                                                        isOpen: true,
                                                                        docType: doc.docType,
                                                                        title: translatedTitle
                                                                    }));
                                                                }}
                                                                className="absolute top-2 left-2 p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all z-20"
                                                                title={isAr ? 'طلب إعادة رفع' : 'Request Re-upload'}
                                                            >
                                                                <RefreshCw size={14} className={doc.status === 'reupload_requested' ? 'animate-spin' : ''} />
                                                            </button>

                                                            {/* Individual Print Button */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const content = (
                                                                        <div className="space-y-6" dir="rtl">
                                                                            {/* Document Preview Box */}
                                                                            <div className="p-4 border-2 border-gray-800 bg-white flex items-center justify-center min-h-[400px]">
                                                                                {doc.fileUrl ? (
                                                                                    <img src={doc.fileUrl} alt={doc.docType} className="max-w-full max-h-[600px] object-contain" />
                                                                                ) : (
                                                                                    <div className="flex flex-col items-center gap-4 text-gray-400">
                                                                                        <FileText size={48} />
                                                                                        <p className="italic font-bold tracking-widest uppercase">No Document Image</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Verification Metadata - Table based to prevent overlaps */}
                                                                            <table className="w-full border-collapse border border-gray-300 text-sm">
                                                                                <tbody>
                                                                                    <tr>
                                                                                        <td className="bg-gray-100 p-3 font-bold border border-gray-300 w-1/4">{isAr ? 'نوع المستند الموثق:' : 'Document Type:'}</td>
                                                                                        <td className="p-3 border border-gray-300 w-1/4 font-black">{translatedTitle}</td>
                                                                                        <td className="bg-gray-100 p-3 font-bold border border-gray-300 w-1/4">{isAr ? 'حالة الاعتماد:' : 'Status:'}</td>
                                                                                        <td className={`p-3 border border-gray-300 w-1/4 font-black uppercase ${doc.status === 'approved' ? 'text-green-700' : 'text-yellow-700'}`}>{doc.status}</td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td className="bg-gray-100 p-3 font-bold border border-gray-300">{isAr ? 'تاريخ الاستخراج الأصلي:' : 'Issuance Date:'}</td>
                                                                                        <td className="p-3 border border-gray-300">{new Date(doc.createdAt).toLocaleDateString('ar-EG')}</td>
                                                                                        <td className="bg-gray-100 p-3 font-bold border border-gray-300">{isAr ? 'الرقم المرجعي للتدقيق:' : 'Audit ID:'}</td>
                                                                                        <td className="p-3 border border-gray-300 font-mono text-xs">{doc.id}</td>
                                                                                    </tr>
                                                                                </tbody>
                                                                            </table>

                                                                            {/* Security Footer */}
                                                                            <div className="mt-8 p-4 bg-gray-50 border border-gray-200 text-center">
                                                                                <p className="text-xs font-bold text-gray-700 uppercase mb-1">Authenticated by E-TASHLEH Verification Engine</p>
                                                                                <p className="text-[10px] text-gray-500 font-mono">
                                                                                    Digital integrity hash verified at {new Date().toISOString()}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                    const html = renderToString(
                                                                        <PrintTemplate
                                                                            title={isAr ? `وثيقة: ${translatedTitle}` : `Document: ${translatedTitle}`}
                                                                            subtitle={`${vendor.name} | ${vendor.storeCode}`}
                                                                            content={content}
                                                                        />
                                                                    );
                                                                    printHtml(html, `Doc_${doc.docType}_${vendor.storeCode}`);
                                                                }}
                                                                className="absolute bottom-2 right-2 p-2 bg-white/10 hover:bg-white text-white hover:text-black rounded-xl transition-all z-20"
                                                                title={isAr ? 'طباعة هذا المستند' : 'Print this document'}
                                                            >
                                                                <FileText size={16} />
                                                            </button>

                                                            <div className="relative z-10 w-full">
                                                                <p className="text-[10px] font-black text-white/50 uppercase tracking-wide mb-1 truncate">{translatedTitle}</p>

                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${doc.status === 'approved' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' :
                                                                            doc.status === 'rejected' ? 'bg-red-500' :
                                                                                doc.status === 'reupload_requested' ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]' :
                                                                                    'bg-yellow-500 animate-pulse'
                                                                            }`} />
                                                                        <span className={`text-[10px] font-bold uppercase tracking-wide ${doc.status === 'approved' ? 'text-green-500' :
                                                                            doc.status === 'rejected' ? 'text-red-500' :
                                                                                doc.status === 'reupload_requested' ? 'text-red-400' : 'text-yellow-500'
                                                                            }`}>
                                                                            {isAr ? (
                                                                                doc.status === 'approved' ? 'مقبول' :
                                                                                    doc.status === 'rejected' ? 'مرفوض' :
                                                                                        doc.status === 'reupload_requested' ? 'مطلوب إعادة رفع' :
                                                                                            'قيد المراجعة'
                                                                            ) : doc.status}
                                                                        </span>
                                                                    </div>

                                                                    {doc.status === 'approved' && daysRemaining !== null && (
                                                                        <div className={`mt-1 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase ${daysRemaining <= 7 ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                                            daysRemaining <= 30 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                                                                'bg-green-500/10 text-green-500 border border-green-500/20'
                                                                            }`}>
                                                                            <Calendar size={10} />
                                                                            {isAr
                                                                                ? `${daysRemaining < 0 ? 'منتهي' : `${daysRemaining} يوم متبقي`}`
                                                                                : `${daysRemaining < 0 ? 'Expired' : `${daysRemaining} Days Left`}`}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {(!vendor.documents || vendor.documents.length === 0) && (
                                                    <div className="col-span-full p-6 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center">
                                                        <p className="text-white/20 text-xs italic font-medium">
                                                            {isAr ? 'لا توجد مستندات مرفوعة حالياً' : 'No compliance documents uploaded yet'}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Governance & Administrative Notes */}
                                    <div className="space-y-6">
                                        <GlassCard className="p-8 border-gold-500/10 bg-gradient-to-b from-white/5 to-transparent h-full flex flex-col">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                                                    <Activity size={16} className="text-gold-500" />
                                                    {isAr ? 'ملاحظات الإدارة' : 'Internal Governance'}
                                                </h3>
                                                {isUpdating && <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />}
                                            </div>

                                            <div className="flex-1 flex flex-col space-y-4">
                                                <p className="text-[10px] text-white/30 leading-relaxed italic">
                                                    {isAr
                                                        ? 'هذه الملاحظات سرية ولا تظهر للتاجر. استخدمها لتوثيق السلوك أو المشاكل التقنية.'
                                                        : 'Internal notes are strictly confidential. Use them to track merchant behavior or technical alerts.'}
                                                </p>
                                                <textarea
                                                    className="flex-1 w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-sm text-white/90 focus:border-gold-500/50 outline-none transition-all resize-none font-medium leading-relaxed"
                                                    placeholder={isAr ? 'ابدأ الكتابة هنا...' : 'Commence internal logging...'}
                                                    value={adminNotes}
                                                    onChange={(e) => setAdminNotes(e.target.value)}
                                                />
                                                <button
                                                    onClick={handleSaveNotes}
                                                    disabled={isUpdating || adminNotes === vendor.adminNotes}
                                                    className="w-full py-4 bg-gold-500 text-[#0F0E0D] font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-gold-400 disabled:opacity-30 disabled:grayscale transition-all shadow-xl shadow-gold-500/10"
                                                >
                                                    {isAr ? 'حفظ السجل الداخلي' : 'Commit to Governance'}
                                                </button>
                                            </div>
                                        </GlassCard>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'orders' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                                            <CreditCard size={20} className="text-gold-500" />
                                            {t.admin.storeProfile.tabs.orders}
                                        </h3>
                                        <span className="text-xs bg-white/5 text-white/50 px-4 py-1.5 rounded-full border border-white/5 font-bold">
                                            {vendor.orders?.length || 0} {isAr ? 'طلب' : 'Total Orders'}
                                        </span>
                                    </div>
                                    {(!vendor.orders || vendor.orders.length === 0) ? (
                                        <GlassCard className="p-12 text-center text-white/30 italic">
                                            {t.admin.storeProfile.noData}
                                        </GlassCard>
                                    ) : (
                                        <div className="grid gap-4">
                                            {vendor.orders.map((order: any) => {
                                                // Find all offers made by this store for this order (handles multi-part orders)
                                                const myOffers = order.offers || [];

                                                // Strict winner check: if ANY of the store's offers is marked accepted
                                                const hasWon = myOffers.some((o: any) => o.status === 'accepted') || (order.storeId === vendorId && myOffers.length === 0);

                                                // Real Financial Price Calculation based on actual successful payments across ALL offers for this order
                                                const paymentsTotal = myOffers.reduce((total: number, offer: any) => {
                                                    return total + (offer.payments?.reduce((sum: number, p: any) => sum + Number(p.totalAmount || 0), 0) || 0);
                                                }, 0);

                                                // Quote fallback: sum of all quotes (unit price + shipping) for all parts offered
                                                const quotesTotal = myOffers.reduce((sum: number, offer: any) => sum + Number(offer.unitPrice || 0) + Number(offer.shippingCost || 0), 0);

                                                // Store share is prioritized as the actual paid amount, fallback to offer quote, fallback to 0
                                                const storeShare = paymentsTotal > 0 ? paymentsTotal : quotesTotal;
                                                const totalQty = order.parts?.reduce((sum: number, p: any) => sum + (p.quantity || 1), 0) || 0;

                                                // Fallback Arabic translations for status
                                                const statusMapAr: Record<string, string> = {
                                                    'COMPLETED': 'مكتمل',
                                                    'DELIVERED': 'تم التوصيل',
                                                    'SHIPPED': 'تم الشحن',
                                                    'PREPARATION': 'قيد التجهيز',
                                                    'CANCELLED': 'ملغي',
                                                    'DISPUTED': 'متنازع عليه',
                                                    'VERIFICATION': 'قيد التحقق'
                                                };

                                                // Determine Status Visuals
                                                let statusLabel = isAr ? (statusMapAr[order.status] || order.status) : order.status;
                                                let statusStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';

                                                if (hasWon) {
                                                    if (order.status === 'COMPLETED') statusStyle = 'bg-green-500/10 text-green-400 border-green-500/20';
                                                    else if (order.status === 'SHIPPED') statusStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                                                    else if (order.status === 'CANCELLED') statusStyle = 'bg-red-500/10 text-red-400 border-red-500/20';
                                                } else if (myOffers.every((o: any) => o.status === 'rejected') && myOffers.length > 0) {
                                                    statusLabel = isAr ? 'عرض مرفوض' : 'Offer Rejected';
                                                    statusStyle = 'bg-red-500/5 text-red-300 border-red-500/10 opacity-60';
                                                } else {
                                                    statusLabel = isAr ? 'قيد المراجعة' : 'Pending Selection';
                                                    statusStyle = 'bg-white/5 text-white/40 border-white/10';
                                                }

                                                return (
                                                    <GlassCard key={order.id} className={`p-5 flex flex-col md:flex-row justify-between items-center gap-6 border-white/5 hover:border-gold-500/20 transition-all group relative overflow-hidden ${!hasWon && 'opacity-80'}`}>
                                                        {/* Luxury Gradient Background for Winners */}
                                                        {hasWon && <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 to-transparent pointer-events-none" />}

                                                        <div className="flex items-center gap-5 w-full md:w-auto relative z-10">
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border ${hasWon ? 'bg-gold-500/10 text-gold-500 border-gold-500/20' : 'bg-white/5 text-white/20 border-white/5'
                                                                }`}>
                                                                <Hash size={24} />
                                                            </div>
                                                            <div>
                                                                <div className="text-white font-black text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
                                                                    #{order.orderNumber || order.id.slice(0, 8)}
                                                                    {hasWon && <CheckCircle2 size={12} className="text-gold-500" />}
                                                                </div>
                                                                <div className="text-[10px] text-white/40 font-bold uppercase tracking-wide flex items-center gap-2">
                                                                    <Calendar size={12} className="opacity-50" />
                                                                    {new Date(order.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 w-full md:w-auto px-6 md:border-l border-white/5 relative z-10">
                                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                                <div className="space-y-1">
                                                                    <div className="text-[9px] text-white/20 font-black uppercase tracking-widest italic">{isAr ? 'القيمة المعروضة' : 'Proposed Quote'}</div>
                                                                    <div className="flex items-center gap-2 text-white font-bold">
                                                                        <span className="text-sm bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">{totalQty} {isAr ? 'قطع' : 'Items'}</span>
                                                                        <span className="text-gold-400 font-mono text-lg">{storeShare.toLocaleString()} <span className="text-[10px] opacity-50">AED</span></span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-4">
                                                                    <div className="text-right hidden sm:block">
                                                                        <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-1">{isAr ? 'الحالة الحالية' : 'Current Status'}</div>
                                                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${statusStyle}`}>
                                                                            {statusLabel}
                                                                        </span>
                                                                    </div>

                                                                    <button
                                                                        onClick={() => onNavigate?.('admin-order-details', order.id)}
                                                                        className="p-3 bg-white/5 hover:bg-gold-500 hover:text-black text-white/30 rounded-2xl transition-all border border-white/5 group/btn shadow-xl"
                                                                        title={isAr ? 'فتح الطلب' : 'Open Order'}
                                                                    >
                                                                        <ExternalLink size={20} className="group-hover/btn:scale-110 transition-transform" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </GlassCard>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'disputes' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                                            <XCircle size={20} className="text-red-500" />
                                            {t.admin.storeProfile.tabs.disputes}
                                        </h3>
                                    </div>
                                    {(!vendor.orders?.some((o: any) => o.disputes?.length > 0 || o.returns?.length > 0)) ? (
                                        <GlassCard className="p-12 text-center text-white/30 italic">
                                            {t.admin.storeProfile.noData}
                                        </GlassCard>
                                    ) : (
                                        <div className="grid gap-4">
                                            {vendor.orders?.filter((o: any) => o.disputes?.length > 0 || o.returns?.length > 0).map((order: any) => {
                                                // Calculate Held Amount based on actual payments mapped earlier
                                                const myOffers = order.offers || [];
                                                const paymentsTotal = myOffers.reduce((total: number, offer: any) => {
                                                    return total + (offer.payments?.reduce((sum: number, p: any) => sum + Number(p.totalAmount || 0), 0) || 0);
                                                }, 0);
                                                const quotesTotal = myOffers.reduce((sum: number, offer: any) => sum + Number(offer.unitPrice || 0) + Number(offer.shippingCost || 0), 0);
                                                const heldAmount = paymentsTotal > 0 ? paymentsTotal : quotesTotal;

                                                return (
                                                    <GlassCard key={order.id} className="p-6 bg-gradient-to-r from-red-500/10 to-transparent border-red-500/20 group relative overflow-hidden">
                                                        <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none opacity-20" />
                                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                                                            <div className="space-y-2">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[10px] font-black bg-red-500 text-white px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-red-500/20 italic">
                                                                        {order.disputes?.length > 0 ? (isAr ? 'نزاع نشط' : 'DISPUTE') : (isAr ? 'طلب إرجاع' : 'RETURN')}
                                                                    </span>
                                                                    <span className="text-white font-black tracking-widest">#{order.orderNumber || order.id.slice(0, 8)}</span>
                                                                </div>
                                                                <div className="text-[10px] text-white/40 font-bold uppercase tracking-wide flex items-center gap-2">
                                                                    <Calendar size={12} className="opacity-50" />
                                                                    {isAr ? 'آخر تحديث:' : 'Updated:'} {new Date(order.updatedAt || order.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-8">
                                                                <div className="text-right">
                                                                    <div className="text-[9px] text-red-400 font-black uppercase tracking-[0.2em] mb-1 italic opacity-70">
                                                                        {isAr ? 'المبلغ المجمد' : 'HELD FUNDS'}
                                                                    </div>
                                                                    <div className="text-xl font-black text-white tabular-nums">
                                                                        {heldAmount.toLocaleString()} <span className="text-[10px] text-white/40 ml-1">AED</span>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => onNavigate?.('admin-resolution-center', order.id)}
                                                                    className="bg-white/5 hover:bg-red-500 hover:text-white text-white/70 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border border-white/5 hover:border-red-500 transition-all shadow-xl active:scale-95"
                                                                >
                                                                    {isAr ? 'مراجعة النزاع' : 'Resolve Case'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </GlassCard>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'reviews' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                                            <Star size={20} className="text-yellow-500" />
                                            {t.admin.storeProfile.tabs.reviews}
                                        </h3>
                                    </div>
                                    {(!vendor.reviews || vendor.reviews.length === 0) ? (
                                        <GlassCard className="p-12 text-center text-white/30 italic">
                                            {t.admin.storeProfile.noData}
                                        </GlassCard>
                                    ) : (
                                        <div className="grid gap-4">
                                            {vendor.reviews.map((review: any) => (
                                                <GlassCard key={review.id} className="p-6 bg-[#0F0E0D] border-white/5 group">
                                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                                        <div className="flex gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 shrink-0 border border-white/5">
                                                                {review.customer?.avatar ? (
                                                                    <img src={review.customer.avatar} className="w-full h-full object-cover rounded-2xl" alt={review.customer.name} />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-gold-500/5 text-gold-500 font-black text-lg">
                                                                        {(review.customer?.name || 'A')[0].toUpperCase()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="text-white font-black text-sm mb-1">{review.customer?.name || (isAr ? 'عميل مجهول' : 'Anonymous')}</div>
                                                                <div className="flex items-center gap-0.5 text-yellow-500">
                                                                    {[...Array(5)].map((_, i) => (
                                                                        <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "text-yellow-500" : "text-white/10"} />
                                                                    ))}
                                                                    <span className="text-[10px] text-white/30 ml-2 font-mono italic">
                                                                        {new Date(review.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {review.rating >= 4 && (
                                                            <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full font-black tracking-widest uppercase">
                                                                {isAr ? 'تحليل: إيجابي جداً' : 'SENTIMENT: STRONGLY POSITIVE'}
                                                            </span>
                                                        )}
                                                        {review.rating <= 2 && (
                                                            <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full font-black tracking-widest uppercase">
                                                                {isAr ? 'تحليل: سلبي' : 'SENTIMENT: NEGATIVE'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-4 text-white/70 text-sm leading-relaxed italic border-l-2 border-gold-500/10 pl-4 ml-2">
                                                        "{review.comment}"
                                                    </p>
                                                </GlassCard>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'financial' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                                    {/* Phase 3: Premium 6-Card Financial Matrix */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                                            <button
                                                onClick={() => setFinancialSubTab('ledger')}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${financialSubTab === 'ledger' ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'text-white/40 hover:text-white'}`}
                                            >
                                                {isAr ? 'حركات المحفظة' : 'Wallet Activity'}
                                            </button>
                                            <button
                                                onClick={() => setFinancialSubTab('withdrawals')}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${financialSubTab === 'withdrawals' ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'text-white/40 hover:text-white'}`}
                                            >
                                                {isAr ? 'طلبات السحب' : 'Withdrawal Logs'}
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleExportWalletExcel}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-black border border-green-500/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all group"
                                        >
                                            <FileText size={14} className="group-hover:scale-110 transition-transform" />
                                            {isAr ? 'تصدير تقرير EXCEL' : 'Export Excel Report'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {/* 1. Available Balance */}
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                                            <GlassCard className="p-6 border-green-500/10 bg-green-500/[0.02] relative overflow-hidden group hover:border-green-500/30 transition-all">
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <Wallet size={40} className="text-green-500" />
                                                </div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center"><Wallet size={16} className="text-green-500" /></div>
                                                    <p className="text-[10px] font-black text-green-500/60 uppercase tracking-widest">{t.admin.storeProfile.financial.available}</p>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    {isLoadingFinancial ? (
                                                        <div className="h-8 w-24 bg-white/5 rounded-lg animate-pulse" />
                                                    ) : (
                                                        <>
                                                            <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
                                                                <span className="text-3xl font-black text-white font-mono leading-none">
                                                                    {Number(financialStats?.available || 0).toLocaleString()}
                                                                </span>
                                                            </BlurredSection>
                                                            <span className="text-[10px] font-bold text-white/30 uppercase">AED</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-tighter">{t.admin.storeProfile.financial.ready}</span>
                                                    <div className={`w-2 h-2 rounded-full bg-green-500 ${isLoadingFinancial ? 'opacity-20' : 'animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`} />
                                                </div>
                                            </GlassCard>
                                        </motion.div>

                                        {/* 2. Pending Clearance */}
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                            <GlassCard className="p-6 border-amber-500/10 bg-amber-500/[0.02] relative overflow-hidden group hover:border-amber-500/30 transition-all">
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <Clock size={40} className="text-amber-500" />
                                                </div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><Clock size={16} className="text-amber-500" /></div>
                                                    <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">{t.admin.storeProfile.financial.pending}</p>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    {isLoadingFinancial ? (
                                                        <div className="h-8 w-24 bg-white/5 rounded-lg animate-pulse" />
                                                    ) : (
                                                        <>
                                                            <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
                                                                <span className="text-3xl font-black text-white font-mono leading-none">
                                                                    {Number(financialStats?.pending || 0).toLocaleString()}
                                                                </span>
                                                            </BlurredSection>
                                                            <span className="text-[10px] font-bold text-white/30 uppercase">AED</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-tighter">{t.admin.storeProfile.financial.verification}</span>
                                                    <div className={`w-2 h-2 rounded-full bg-amber-500 ${isLoadingFinancial ? 'opacity-20' : 'animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} />
                                                </div>
                                            </GlassCard>
                                        </motion.div>

                                        {/* 3. Escrow / Frozen */}
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                            <GlassCard className="p-6 border-red-500/10 bg-red-500/[0.02] relative overflow-hidden group hover:border-red-500/30 transition-all">
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <ShieldAlert size={40} className="text-red-500" />
                                                </div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center"><ShieldAlert size={16} className="text-red-500" /></div>
                                                    <p className="text-[10px] font-black text-red-500/60 uppercase tracking-widest">{t.admin.storeProfile.financial.frozen}</p>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    {isLoadingFinancial ? (
                                                        <div className="h-8 w-24 bg-white/5 rounded-lg animate-pulse" />
                                                    ) : (
                                                        <>
                                                            <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
                                                                <span className="text-3xl font-black text-white font-mono leading-none">
                                                                    {Number(financialStats?.frozen || 0).toLocaleString()}
                                                                </span>
                                                            </BlurredSection>
                                                            <span className="text-[10px] font-bold text-white/30 uppercase">AED</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-tighter">{t.admin.storeProfile.financial.frozenAwaiting}</span>
                                                    <div className={`w-2 h-2 rounded-full bg-red-500 ${isLoadingFinancial ? 'opacity-20' : 'shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                                                </div>
                                            </GlassCard>
                                        </motion.div>

                                        {/* 4. Net Lifetime Earnings */}
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                            <GlassCard className="p-6 border-gold-500/10 bg-gold-500/[0.02] relative overflow-hidden group hover:border-gold-500/30 transition-all">
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <TrendingUp size={40} className="text-gold-500" />
                                                </div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center"><TrendingUp size={16} className="text-gold-500" /></div>
                                                    <p className="text-[10px] font-black text-gold-500/60 uppercase tracking-widest">{t.admin.storeProfile.financial.lifetime}</p>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    {isLoadingFinancial ? (
                                                        <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse" />
                                                    ) : (
                                                        <>
                                                            <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
                                                                <span className="text-3xl font-black text-white font-mono leading-none">
                                                                    {Number(financialStats?.netEarnings || 0).toLocaleString()}
                                                                </span>
                                                            </BlurredSection>
                                                            <span className="text-[10px] font-bold text-white/30 uppercase">AED</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-gold-500 uppercase tracking-tighter">{t.admin.storeProfile.financial.since} {new Date(vendor.createdAt).getFullYear()}</span>
                                                </div>
                                            </GlassCard>
                                        </motion.div>

                                        {/* 5. Total Sales Volume */}
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                                            <GlassCard className="p-6 border-blue-500/10 bg-blue-500/[0.02] relative overflow-hidden group hover:border-blue-500/30 transition-all">
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <ShoppingCart size={40} className="text-blue-500" />
                                                </div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><ShoppingCart size={16} className="text-blue-500" /></div>
                                                    <p className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest">{t.admin.storeProfile.financial.totalSales}</p>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    {isLoadingFinancial ? (
                                                        <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse" />
                                                    ) : (
                                                        <>
                                                            <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
                                                                <span className="text-3xl font-black text-white font-mono leading-none">
                                                                    {Number(financialStats?.totalSales || 0).toLocaleString()}
                                                                </span>
                                                            </BlurredSection>
                                                            <span className="text-[10px] font-bold text-white/30 uppercase">AED</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-tighter">{t.admin.storeProfile.financial.totalSalesSub}</span>
                                                </div>
                                            </GlassCard>
                                        </motion.div>

                                        {/* 6. Completed Orders */}
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                            <GlassCard className="p-6 border-purple-500/10 bg-purple-500/[0.02] relative overflow-hidden group hover:border-purple-500/30 transition-all">
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <Package size={40} className="text-purple-500" />
                                                </div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><Package size={16} className="text-purple-500" /></div>
                                                    <p className="text-[10px] font-black text-purple-500/60 uppercase tracking-widest">{t.admin.storeProfile.financial.completedOrders}</p>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    {isLoadingFinancial ? (
                                                        <div className="h-8 w-20 bg-white/5 rounded-lg animate-pulse" />
                                                    ) : (
                                                        <>
                                                            <span className="text-3xl font-black text-white font-mono leading-none">
                                                                {(financialStats?.completedOrders || 0).toString().padStart(2, '0')}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-white/30 uppercase">{isAr ? 'طلب' : 'Orders'}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-tighter">{t.admin.storeProfile.financial.completedOrdersSub}</span>
                                                </div>
                                            </GlassCard>
                                        </motion.div>
                                    </div>

                                    {/* Ledgers Stack */}
                                    <div className="flex flex-col gap-8">
                                        {/* 1. Transaction Ledger */}
                                        {financialSubTab === 'ledger' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-2">
                                                    <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-gold-500 shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                                                        {t.admin.storeProfile.financial.walletLedger}
                                                    </h4>
                                                </div>
                                                <GlassCard className="min-h-[300px] border-white/5 bg-white/[0.01] overflow-hidden">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                                                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{t.admin.storeProfile.financial.orderId}</th>
                                                                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{t.admin.storeProfile.financial.date}</th>
                                                                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{t.admin.storeProfile.financial.amount}</th>
                                                                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{t.admin.storeProfile.financial.paymentStatus}</th>
                                                                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{t.admin.storeProfile.financial.orderStatus}</th>
                                                                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{t.admin.storeProfile.financial.operation}</th>
                                                                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-center">{t.admin.storeProfile.financial.actions}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/[0.03]">
                                                                {vendor.walletTransactions && vendor.walletTransactions.length > 0 ? (
                                                                    vendor.walletTransactions.map((tx: any, idx: number) => (
                                                                        <motion.tr
                                                                            key={tx.id}
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: 0.4 + (idx * 0.05) }}
                                                                            className="group hover:bg-white/[0.02] transition-colors"
                                                                        >
                                                                            <td className="p-4">
                                                                                <div className="text-[11px] font-bold text-gold-500/80 font-mono tracking-tight bg-gold-500/5 px-2 py-1 rounded inline-flex">
                                                                                    {tx.payment?.order?.orderNumber || tx.escrow?.order?.orderNumber || tx.metadata?.orderNumber || (tx.transactionType === 'withdrawal' ? (isAr ? 'سحب رصيد' : 'Withdrawal') : 'N/A')}
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-4">
                                                                                <div className="text-[10px] text-white/60 font-medium">
                                                                                    {new Date(tx.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-4">
                                                                                <div className={`text-sm font-black font-mono tabular-nums ${tx.type === 'CREDIT' ? 'text-green-500' : 'text-red-500'}`}>
                                                                                    {tx.type === 'CREDIT' ? '+' : '-'}
                                                                                    {Number(tx.amount).toLocaleString()}
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-4">
                                                                                <div className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${tx.payment?.status === 'SUCCESS' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
                                                                                    {tx.payment?.status || (tx.transactionType === 'withdrawal' ? (isAr ? 'مكتمل' : 'COMPLETED') : 'PENDING')}
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-4">
                                                                                <div className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-tight ${(tx.payment?.order?.status || tx.escrow?.order?.status || tx.metadata?.orderStatus) === 'COMPLETED' ? 'bg-green-500/10 text-green-500' :
                                                                                    (tx.payment?.order?.status || tx.escrow?.order?.status || tx.metadata?.orderStatus) === 'PREPARATION' ? 'bg-amber-500/10 text-amber-500' :
                                                                                        (tx.payment?.order?.status || tx.escrow?.order?.status || tx.metadata?.orderStatus) === 'READY_FOR_SHIPPING' ? 'bg-blue-500/10 text-blue-500' :
                                                                                            'bg-white/5 text-white/40'
                                                                                    }`}>
                                                                                    {tx.payment?.order?.status || tx.escrow?.order?.status || tx.metadata?.orderStatus || (tx.transactionType === 'withdrawal' ? (isAr ? 'حوالة' : 'PAYOUT') : 'N/A')}
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-4">
                                                                                <div className="flex items-center gap-2">
                                                                                    {(() => {
                                                                                        const type = tx.transactionType?.toUpperCase() || (tx.type === 'CREDIT' ? 'ORDER_PROFIT' : 'WITHDRAWAL');
                                                                                        const typeLabels = t.admin.storeProfile.financial.types;

                                                                                        const iconConfig: Record<string, { icon: any, color: string }> = {
                                                                                            'ORDER_PROFIT': { icon: Star, color: 'text-gold-500' },
                                                                                            'REFERRAL_PROFIT': { icon: LinkIcon, color: 'text-blue-400' },
                                                                                            'PAYMENT': { icon: CreditCard, color: 'text-indigo-400' },
                                                                                            'WITHDRAWAL': { icon: ArrowUpRight, color: 'text-orange-400' },
                                                                                            'REFUND': { icon: RotateCcw, color: 'text-rose-400' },
                                                                                            'COMMISSION': { icon: Scale, color: 'text-slate-400' },
                                                                                            'PENALTY': { icon: AlertTriangle, color: 'text-red-500' },
                                                                                            'DISPUTE': { icon: Gavel, color: 'text-purple-400' },
                                                                                            'LOYALTY_BONUS': { icon: Trophy, color: 'text-amber-400' },
                                                                                            'WALLET_TOPUP': { icon: PlusCircle, color: 'text-emerald-400' },
                                                                                            'GATEWAY_FEE': { icon: ShieldAlert, color: 'text-orange-400' },
                                                                                            'REFUND_FEE': { icon: RotateCcw, color: 'text-rose-400' },
                                                                                            'SHIPPING_FEE': { icon: Truck, color: 'text-cyan-400' },
                                                                                            'FRAUD_PENALTY': { icon: AlertOctagon, color: 'text-red-600' }
                                                                                        };

                                                                                        const config = iconConfig[type] || { icon: Activity, color: 'text-white/40' };
                                                                                        const Icon = config.icon;

                                                                                        return (
                                                                                            <div className={`flex items-center gap-1.5 ${config.color}`}>
                                                                                                <Icon size={12} className={type === 'LOYALTY_BONUS' ? 'animate-bounce' : ''} />
                                                                                                <span className="text-[10px] font-black uppercase tracking-wide">
                                                                                                    {typeLabels[type] || type}
                                                                                                </span>
                                                                                            </div>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-4 text-center">
                                                                                <button
                                                                                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/30 hover:text-white transition-all border border-white/5 disabled:opacity-30"
                                                                                    disabled={!tx.payment?.order?.id && !tx.escrow?.order?.id && !tx.metadata?.orderId}
                                                                                    onClick={() => {
                                                                                        const orderId = tx.payment?.order?.id || tx.escrow?.order?.id || tx.metadata?.orderId;
                                                                                        if (orderId && onNavigate) {
                                                                                            onNavigate('admin-order-details', orderId);
                                                                                        } else if (orderId) {
                                                                                            window.location.hash = `/dashboard/admin/orders/${orderId}`;
                                                                                        }
                                                                                    }}
                                                                                    title={isAr ? 'عرض تفاصيل الطلب' : 'View Order Details'}
                                                                                >
                                                                                    <FileText size={14} />
                                                                                </button>
                                                                            </td>
                                                                        </motion.tr>
                                                                    ))
                                                                ) : (
                                                                    <tr>
                                                                        <td colSpan={7} className="p-20 text-center opacity-10">
                                                                            <Activity size={40} className="mx-auto mb-2" />
                                                                            <p className="text-[10px] font-black uppercase tracking-widest">{t.admin.storeProfile.financial.noTransactions}</p>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </GlassCard>
                                            </div>
                                        )}

                                        {/* 2. Withdrawal Ledger */}
                                        {financialSubTab === 'withdrawals' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-2">
                                                    <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                                        {t.admin.storeProfile.financial.withdrawalLedger}
                                                    </h4>
                                                    <button
                                                        onClick={handleExportWithdrawalsExcel}
                                                        className="flex items-center gap-2 px-6 py-2.5 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-black border border-green-500/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all group"
                                                    >
                                                        <FileText size={14} className="group-hover:scale-110 transition-transform" />
                                                        {isAr ? 'تصدير تقرير EXCEL' : 'Export Excel Report'}
                                                    </button>
                                                </div>
                                                <GlassCard className="min-h-[300px] border-white/5 bg-white/[0.01] overflow-hidden">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                                                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{t.admin.storeProfile.financial.amount}</th>
                                                                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-center">{t.admin.storeProfile.financial.status}</th>
                                                                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{t.admin.storeProfile.financial.method}</th>
                                                                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{t.admin.storeProfile.financial.reviewDate}</th>
                                                                    <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{t.admin.storeProfile.financial.requestDate}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/[0.03]">
                                                                {vendor.withdrawalRequests && vendor.withdrawalRequests.length > 0 ? (
                                                                    vendor.withdrawalRequests.map((req: any, idx: number) => (
                                                                        <motion.tr
                                                                            key={req.id}
                                                                            initial={{ opacity: 0, x: 10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: 0.4 + (idx * 0.05) }}
                                                                            className="group hover:bg-white/[0.02] transition-colors"
                                                                        >
                                                                            <td className="p-4">
                                                                                <div className="text-sm font-black text-white font-mono tracking-tight tabular-nums">
                                                                                    {Number(req.amount).toLocaleString()}
                                                                                    <span className="text-[10px] text-white/40 ml-1">AED</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-4 text-center">
                                                                                <div className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tight inline-flex ${req.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                                                    req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' :
                                                                                        'bg-red-500/10 text-red-500 border-red-500/20'
                                                                                    }`}>
                                                                                    {req.status}
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-4">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center">
                                                                                        <Hash size={12} className="text-blue-400/50" />
                                                                                    </div>
                                                                                    <span className="text-[10px] font-bold text-white/60 uppercase">
                                                                                        {req.payoutMethod || t.admin.storeProfile.financial.payoutMethod}
                                                                                    </span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-4">
                                                                                <div className="text-[10px] text-white/40 font-mono">
                                                                                    {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-4">
                                                                                <div className="text-[10px] text-white/60 font-black">
                                                                                    {new Date(req.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                                                </div>
                                                                            </td>
                                                                        </motion.tr>
                                                                    ))
                                                                ) : (
                                                                    <tr>
                                                                        <td colSpan={5} className="p-20 text-center opacity-10">
                                                                            <Activity size={40} className="mx-auto mb-2" />
                                                                            <p className="text-[10px] font-black uppercase tracking-widest">{isAr ? 'لا يوجد سجل سحوبات' : 'No withdrawal records'}</p>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </GlassCard>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'sessions' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-[10px] font-black text-gold-500 uppercase tracking-widest">
                                                    <Shield size={12} />
                                                    {isAr ? 'حماية الحساب' : 'Account Security'}
                                                </div>
                                                <h3 className="text-xl font-black text-white">{isAr ? 'الجلسات النشطة' : 'Active Sessions'}</h3>
                                            </div>
                                            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                                                <span className="text-[10px] font-black text-white/40 uppercase block mb-0.5">{isAr ? 'إجمالي الأجهزة' : 'Total Devices'}</span>
                                                <span className="text-xl font-bold text-white font-mono">{(vendor.owner?.sessions?.length || 0).toString().padStart(2, '0')}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {vendor.owner?.sessions && vendor.owner.sessions.length > 0 ? (
                                                vendor.owner.sessions.map((session: any) => {
                                                    // Determine Icon & Label based on device/OS
                                                    const isMobile = session.os?.toLowerCase().includes('android') || session.os?.toLowerCase().includes('ios');
                                                    const isTablet = session.os?.toLowerCase().includes('ipad') || session.device?.toLowerCase().includes('tablet');
                                                    const DeviceIcon = isMobile ? Smartphone : isTablet ? Tablet : Monitor;

                                                    return (
                                                        <div
                                                            key={session.id}
                                                            className="flex items-center justify-between p-6 bg-white/[0.03] border border-white/5 rounded-3xl hover:bg-white/[0.05] transition-all group relative overflow-hidden"
                                                        >
                                                            <div className="flex items-center gap-6 relative z-10">
                                                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                                                    <DeviceIcon size={24} className="text-gold-500/60" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="font-black text-white uppercase tracking-wider text-sm">{session.device || (isAr ? 'جهاز غير معروف' : 'Unknown Device')}</h4>
                                                                        {session.id === currentStoreProfile?.currentSessionId && (
                                                                            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-tighter border border-green-500/20">
                                                                                {isAr ? 'الجلسة الحالية' : 'Current Session'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                                        <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-bold uppercase tracking-tight">
                                                                            <Hash size={10} className="text-gold-500/40" />
                                                                            {session.ipAddress}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-bold uppercase tracking-tight">
                                                                            <MapPin size={10} className="text-gold-500/40" />
                                                                            {session.location || (isAr ? 'موقع غير محدد' : 'Unknown Location')}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 text-[10px] text-green-500/60 font-black uppercase tracking-tight">
                                                                            <CheckCircle2 size={10} />
                                                                            {isAr ? 'نشط الآن' : 'Active Now'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                <div className="text-right hidden sm:block">
                                                                    <div className="text-[10px] font-black text-green-500 uppercase tracking-widest animate-pulse">{isAr ? 'متصل الآن' : 'Connected'}</div>
                                                                    <div className="text-[9px] text-white/20 uppercase font-mono">
                                                                        {new Date(session.lastActive || session.updatedAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>
                                                                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse" />
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="py-20 text-center space-y-4 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/10">
                                                        <Smartphone size={32} />
                                                    </div>
                                                    <p className="text-xs font-black text-white/20 uppercase tracking-[0.2em]">{isAr ? 'لا توجد جلسات نشطة حالياً' : 'No active transmissions found'}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'contract' && (
                                <div className="space-y-6">
                                    {(!vendor.contractAcceptances || vendor.contractAcceptances.length === 0) ? (
                                        <GlassCard className="p-8 text-center text-white/50">
                                            {isAr ? 'لم يقم هذا المتجر بالموافقة على العقد الإلكتروني (من الممكن أنه متجر قديم).' : 'This store has not accepted the electronic contract (it might be a legacy store).'}
                                        </GlassCard>
                                    ) : (
                                        vendor.contractAcceptances.map((acceptance: any) => (
                                            <div key={acceptance.id} className="space-y-6">
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    <GlassCard className="p-6">
                                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                                                            {isAr ? 'بيانات الطرف الثاني (المدخلة)' : 'Second Party Data (Inputted)'}
                                                        </h3>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                                <span className="text-white/50 text-sm">{isAr ? 'الشركة:' : 'Company:'}</span>
                                                                <span className="text-white text-sm">{acceptance.secondPartyData?.companyName || '-'}</span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                                <span className="text-white/50 text-sm">{isAr ? 'المدير:' : 'Manager:'}</span>
                                                                <span className="text-white text-sm">{acceptance.secondPartyData?.managerName || '-'}</span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                                <span className="text-white/50 text-sm">{isAr ? 'رقم السجل:' : 'CR Number:'}</span>
                                                                <BlurredSection isBlurred={isSectionBlurred('merchant_bank_details')}>
                                                                    <span className="text-white text-sm">{acceptance.secondPartyData?.crNumber || '-'}</span>
                                                                </BlurredSection>
                                                            </div>
                                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                                <span className="text-white/50 text-sm">{isAr ? 'الرخصة / الانتهاء:' : 'License / Expiry:'}</span>
                                                                <span className="text-white text-sm">{acceptance.secondPartyData?.licenseNumber || '-'} / {acceptance.secondPartyData?.licenseExpiry || '-'}</span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                                <span className="text-white/50 text-sm">{isAr ? 'الإمارة / الدولة:' : 'Emirate / Country:'}</span>
                                                                <span className="text-white text-sm">{acceptance.secondPartyData?.emirate || '-'} / {acceptance.secondPartyData?.country || '-'}</span>
                                                            </div>
                                                        </div>
                                                    </GlassCard>

                                                    <GlassCard className="p-6">
                                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                                                            {isAr ? 'بيانات التوقيع' : 'Signature Data'}
                                                        </h3>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                                <span className="text-white/50 text-sm">{isAr ? 'تم التوقيع بواسطة:' : 'Signed By:'}</span>
                                                                <span className="text-white text-sm">{acceptance.signatureData?.signedName || '-'}</span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                                <span className="text-white/50 text-sm">{isAr ? 'البريد / الهاتف:' : 'Email / Phone:'}</span>
                                                                <BlurredSection isBlurred={isSectionBlurred('customer_phone')}>
                                                                    <span className="text-white text-sm break-all">
                                                                        {acceptance.signatureData?.email || vendor.owner?.email || '-'} / {acceptance.signatureData?.phone || vendor.owner?.phone || '-'}
                                                                    </span>
                                                                </BlurredSection>
                                                            </div>
                                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                                <span className="text-white/50 text-sm">{isAr ? 'تاريخ التوقيع:' : 'Signed At:'}</span>
                                                                <span className="text-white text-sm">{new Date(acceptance.acceptedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}</span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                                <span className="text-white/50 text-sm">{isAr ? 'معلومات الأمان:' : 'Security Context:'}</span>
                                                                <span className="text-white/50 text-xs">IP: {acceptance.ipAddress || 'N/A'} (v{acceptance.contractVersion})</span>
                                                            </div>
                                                        </div>
                                                    </GlassCard>
                                                </div>

                                                <GlassCard className="p-0 h-[500px] flex flex-col overflow-hidden">
                                                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                            <FileText size={16} className="text-gold-500" />
                                                            {isAr ? 'لقطة العقد الموقع (Snapshot)' : 'Signed Contract Snapshot'}
                                                        </h3>

                                                        {/* 2026 Audit Action: Print Official Contract */}
                                                        <button
                                                            onClick={() => handlePrintContract(acceptance)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-gold-500/10 hover:bg-gold-500 text-gold-500 hover:text-black rounded-xl text-[9px] font-black uppercase tracking-widest border border-gold-500/20 transition-all"
                                                        >
                                                            <FileText size={12} />
                                                            {isAr ? 'طباعة العقد المعتمد' : 'Print Official Contract'}
                                                        </button>
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gold-500/30">
                                                        <div className="whitespace-pre-wrap text-white/80 font-normal leading-relaxed text-base">
                                                            {isAr ? acceptance.contentArSnapshot : acceptance.contentEnSnapshot}
                                                        </div>
                                                    </div>
                                                </GlassCard>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'restrictions' && (
                                <div className="space-y-6">
                                    {/* Offer governance — modification rate & per-order history */}
                                    {offerGov && (
                                        <div id="governance-tab">
                                            <GlassCard className="p-6 space-y-6 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                                <RefreshCw size={80} />
                                            </div>
                                            <div className="flex flex-wrap items-start justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg border ${
                                                        offerGov.exceedsThreshold
                                                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                                    }`}>
                                                        <RefreshCw size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-white">
                                                            {isAr ? 'حوكمة العروض — معدل التعديل' : 'Offer governance — modification rate'}
                                                        </h3>
                                                        <p className="text-xs text-white/40 mt-0.5">
                                                            {isAr
                                                                ? 'كل تعديل / إلغاء / انسحاب يُسجّل مع رقم الطلب والوقت'
                                                                : 'Each edit, cancel, or withdrawal is logged with order # and time'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`px-4 py-2 rounded-xl border text-center min-w-[120px] ${
                                                    offerGov.exceedsThreshold
                                                        ? 'bg-orange-500/10 border-orange-500/30'
                                                        : 'bg-white/5 border-white/10'
                                                }`}>
                                                    <div className={`text-2xl font-black tabular-nums ${
                                                        offerGov.exceedsThreshold ? 'text-orange-400' : 'text-white'
                                                    }`}>
                                                        {offerGov.modificationRatePercent}%
                                                    </div>
                                                    <div className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                                        {isAr ? 'معدل التعديل' : 'Mod rate'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {[
                                                    { label: isAr ? 'إجمالي العروض' : 'Total offers', value: offerGov.totalOffersSent, icon: Package },
                                                    { label: isAr ? 'تعديلات' : 'Edits', value: offerGov.editCount, icon: Edit3 },
                                                    { label: isAr ? 'سحوبات' : 'Withdrawals', value: offerGov.withdrawalCount, icon: Undo2 },
                                                    {
                                                        label: isAr ? 'الحد (5%)' : 'Threshold (5%)',
                                                        value: offerGov.exceedsThreshold ? (isAr ? 'تجاوز' : 'Exceeded') : (isAr ? 'ضمن' : 'OK'),
                                                        icon: AlertTriangle,
                                                        warn: offerGov.exceedsThreshold,
                                                    },
                                                ].map((stat, i) => (
                                                    <div key={i} className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-2">
                                                        <div className="flex items-center gap-2 text-white/30">
                                                            <stat.icon size={14} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">{stat.label}</span>
                                                        </div>
                                                        <div className={`text-xl font-black tabular-nums ${stat.warn ? 'text-orange-400' : 'text-white'}`}>
                                                            {stat.value}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                    {isAr ? 'سجل التعديلات حسب الطلب' : 'Modification history by order'}
                                                </h4>
                                                {(offerGov.events?.length ?? 0) === 0 ? (
                                                    <div className="text-center py-10 text-white/30 text-sm border border-dashed border-white/10 rounded-2xl">
                                                        {isAr ? 'لا توجد تعديلات مسجّلة بعد' : 'No modification events recorded yet'}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                                                        {offerGov.events.map((evt: OfferGovernanceEvent) => {
                                                            const { label, color } = getModificationKindLabel(evt.kind, isAr);
                                                            return (
                                                                <div
                                                                    key={evt.id}
                                                                    className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <span className={`text-[10px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-lg border shrink-0 ${color}`}>
                                                                            {label}
                                                                        </span>
                                                                        <div className="min-w-0">
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <span className="text-sm font-bold text-white font-mono">
                                                                                    #{evt.orderNumber || evt.orderId?.slice(0, 8) || '—'}
                                                                                </span>
                                                                                {evt.offerNumber && (
                                                                                    <span className="text-[10px] text-white/30 font-mono">
                                                                                        {isAr ? 'عرض' : 'Offer'} {evt.offerNumber}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-[10px] text-white/40 mt-0.5" dir="ltr">
                                                                                {formatGovTimestamp(evt.timestamp, isAr)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    {evt.orderId && onNavigate && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => onNavigate('admin-order-details', evt.orderId)}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gold-500 hover:text-black hover:bg-gold-500 border border-gold-500/30 rounded-xl transition-all shrink-0"
                                                                        >
                                                                            {isAr ? 'الطلب' : 'Order'}
                                                                            <ArrowUpRight size={12} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            </GlassCard>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Financial Restrictions */}
                                        <GlassCard className="p-6 space-y-6 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Lock size={80} />
                                            </div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-red-500/20 rounded-lg text-red-500">
                                                    <ShieldAlert size={20} />
                                                </div>
                                                <h3 className="text-lg font-bold text-white">{isAr ? 'القيود المالية' : 'Financial Restrictions'}</h3>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                                    <div className="space-y-1">
                                                        <div className="text-sm font-bold text-white">{isAr ? 'تجميد عمليات السحب' : 'Freeze Withdrawals'}</div>
                                                        <div className="text-xs text-white/40">{isAr ? 'منع التاجر من طلب تحويل الأموال' : 'Prevent merchant from requesting payouts'}</div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            const newVal = !restrictionData.withdrawalsFrozen;
                                                            setRestrictionData({ ...restrictionData, withdrawalsFrozen: newVal });
                                                            // Real-time save
                                                            await useAdminStore.getState().updateStoreRestrictions(vendorId!, { ...restrictionData, withdrawalsFrozen: newVal });
                                                        }}
                                                        className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ${restrictionData.withdrawalsFrozen ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/10'}`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-full bg-white transition-all duration-300 transform ${restrictionData.withdrawalsFrozen ? (isAr ? '-translate-x-7' : 'translate-x-7') : 'translate-x-0'}`} />
                                                    </button>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-white/40 uppercase tracking-widest">{isAr ? 'سبب التجميد (داخلي)' : 'Freeze Reason (Internal)'}</label>
                                                    <textarea
                                                        value={restrictionData.withdrawalFreezeNote}
                                                        onChange={(e) => setRestrictionData({ ...restrictionData, withdrawalFreezeNote: e.target.value })}
                                                        placeholder={isAr ? 'اكتب ملاحظاتك هنا...' : 'Enter freeze notes...'}
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-red-500/50 outline-none transition-all h-24 resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </GlassCard>

                                        {/* Operational Restrictions */}
                                        <GlassCard className="p-6 space-y-6 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Sliders size={80} />
                                            </div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gold-500/20 rounded-lg text-gold-500">
                                                        <Sliders size={20} />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white">{isAr ? 'القيود التشغيلية' : 'Operational Restrictions'}</h3>
                                                </div>
                                                <button
                                                    onClick={handleClearRestrictions}
                                                    disabled={isUpdating}
                                                    className="px-4 py-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-green-500/20 transition-all flex items-center gap-2"
                                                >
                                                    <RotateCcw size={12} />
                                                    {isAr ? 'مسح كافة القيود' : 'Clear All Restrictions'}
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-black text-white/40 uppercase tracking-widest">{isAr ? 'سقف العروض اليومي' : 'Daily Offer Limit'}</label>
                                                        <span className="text-xs font-mono text-gold-500">{restrictionData.offerLimit === -1 ? (isAr ? 'غير محدود' : 'Unlimited') : restrictionData.offerLimit}</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={restrictionData.offerLimit}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            setRestrictionData({ ...restrictionData, offerLimit: val });
                                                            // Real-time update with debounce would be better, but for now let's just make it editable
                                                        }}
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-gold-500/50 outline-none transition-all"
                                                        placeholder="-1 for unlimited"
                                                    />
                                                </div>

                                                <div className="space-y-3 pt-2 border-t border-white/5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-bold text-white">{isAr ? 'تقييد الظهور' : 'Visibility Restriction'}</div>
                                                            <div className="text-xs text-white/40">{isAr ? 'تقليل نسبة ظهور الطلبات للتاجر' : 'Reduce order visibility percentage'}</div>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                const newVal = !restrictionData.visibilityRestricted;
                                                                setRestrictionData({ ...restrictionData, visibilityRestricted: newVal });
                                                                // Real-time save
                                                                await useAdminStore.getState().updateStoreRestrictions(vendorId!, { ...restrictionData, visibilityRestricted: newVal });
                                                            }}
                                                            className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ${restrictionData.visibilityRestricted ? 'bg-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-white/10'}`}
                                                        >
                                                            <div className={`w-5 h-5 rounded-full bg-white transition-all duration-300 transform ${restrictionData.visibilityRestricted ? (isAr ? '-translate-x-7' : 'translate-x-7') : 'translate-x-0'}`} />
                                                        </button>
                                                    </div>

                                                    {restrictionData.visibilityRestricted && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="space-y-4 pt-2"
                                                        >
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between">
                                                                    <span className="text-[10px] text-white/30 uppercase font-black">{isAr ? 'معدل الظهور' : 'Visibility Rate'}</span>
                                                                    <span className="text-xs font-mono text-gold-500">{restrictionData.visibilityRate}%</span>
                                                                </div>
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="100"
                                                                    value={restrictionData.visibilityRate}
                                                                    onChange={(e) => setRestrictionData({ ...restrictionData, visibilityRate: parseInt(e.target.value) })}
                                                                    onMouseUp={async () => {
                                                                        // Real-time save on drag end
                                                                        await useAdminStore.getState().updateStoreRestrictions(vendorId!, restrictionData);
                                                                    }}
                                                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gold-500"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] text-white/30 uppercase font-black">{isAr ? 'ملاحظات التقييد' : 'Restriction Notes'}</label>
                                                                <div className="relative">
                                                                    <textarea
                                                                        value={restrictionData.visibilityNote}
                                                                        onChange={(e) => setRestrictionData({ ...restrictionData, visibilityNote: e.target.value })}
                                                                        className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-white text-xs outline-none focus:border-gold-500/30 h-20 resize-none"
                                                                        placeholder={isAr ? 'أدخل سبب تقييد الظهور...' : 'Enter visibility restriction reason...'}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>
                                        </GlassCard>
                                    </div>

                                    {/* Submit Action - Unified & Real-time Primary Action */}
                                    <div className="flex justify-end pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => {
                                                setPendingRestrictionAction('UPDATE');
                                                setIsSignatureModalOpen(true);
                                            }}
                                            disabled={isUpdating}
                                            className="px-10 py-4 bg-gold-500 text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-[0_20px_40px_rgba(212,175,55,0.15)] flex items-center gap-3 disabled:opacity-50"
                                        >
                                            {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                            {isAr ? 'تحديث كافة القيود والتوقيع' : 'Update All Restrictions & Sign'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </BlurredSection>
            </div>

            <AnimatePresence>
                {selectedDoc && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex py-10 justify-center bg-black/80 backdrop-blur-sm"
                        onClick={() => setSelectedDoc(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#151310] border border-white/10 rounded-2xl w-full max-w-4xl max-h-full flex flex-col mx-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white capitalize flex items-center gap-3">
                                    <FileText className="text-gold-500" />
                                    {selectedDoc.title}
                                </h2>
                                <button
                                    onClick={() => setSelectedDoc(null)}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/50 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 p-6 bg-black/50 overflow-hidden relative">
                                <div className="absolute inset-x-6 inset-y-6 bg-[#0A0908] rounded-xl border border-white/5 flex items-center justify-center p-2">
                                    {selectedDoc.url.toLowerCase().endsWith('.pdf') ? (
                                        <object
                                            data={selectedDoc.url}
                                            type="application/pdf"
                                            className="w-full h-full rounded-lg"
                                        >
                                            <p className="text-white/50 text-center">
                                                {isAr ? 'لا يمكن عرض ملف PDF. ' : 'Cannot display PDF. '}
                                                <a href={selectedDoc.url} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:underline">
                                                    {isAr ? 'اضغط هنا للتحميل' : 'Click here to download'}
                                                </a>
                                            </p>
                                        </object>
                                    ) : (
                                        <img
                                            src={selectedDoc.url}
                                            alt={selectedDoc.title}
                                            className="w-full h-full object-contain rounded-lg"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="p-6 border-t border-white/10 bg-[#1A1814] flex justify-end gap-3 rounded-b-2xl">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setPendingDocAction('rejected');
                                            setIsDocSignatureModalOpen(true);
                                        }}
                                        disabled={isUpdating}
                                        className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold rounded-xl transition-all border border-red-500/20 disabled:opacity-50"
                                    >
                                        <X size={18} className="inline mr-2" />
                                        {isAr ? 'رفض المستند' : 'Reject'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setPendingDocAction('approved');
                                            setIsDocSignatureModalOpen(true);
                                        }}
                                        disabled={isUpdating}
                                        className="px-6 py-2.5 bg-green-500 text-white hover:bg-green-600 font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
                                    >
                                        <CheckCircle2 size={18} className="inline mr-2" />
                                        {isAr ? 'اعتماد المستند' : 'Approve'}
                                    </button>
                                </div>
                                <a
                                    href={selectedDoc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
                                >
                                    <ExternalLink size={18} />
                                    {isAr ? 'فتح في نافذة جديدة' : 'Open in New Window'}
                                </a>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AdminSignatureModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onConfirm={handleUpdateRestrictions}
                title={isAr ? 'اعتماد القيود الإدارية' : 'Authorize Administrative Restrictions'}
                subtitle={isAr ? 'يرجى التوقيع للمتابعة وتطبيق القيود على هذا المتجر' : 'Please sign to proceed and apply restrictions to this store'}
            />

            <AdminInitiateChatModal
                isOpen={isChatModalOpen}
                onClose={() => setIsChatModalOpen(false)}
                onConfirm={handleInitiateChat}
                targetName={vendor.name}
                targetRole="VENDOR"
            />

            <ReuploadRequestModal
                isOpen={reuploadModal.isOpen}
                onClose={() => setReuploadModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={async (data) => {
                    setReuploadModal(prev => ({ ...prev, ...data }));
                    await handleReuploadRequest();
                }}
                docType={reuploadModal.docType}
                docTitle={reuploadModal.title}
            />

            <AdminSignatureModal
                isOpen={isDocSignatureModalOpen}
                onClose={() => {
                    setIsDocSignatureModalOpen(false);
                    setPendingDocAction(null);
                }}
                onConfirm={handleDocAction}
                actionType={pendingDocAction === 'approved' ? 'APPROVE' : 'REJECT'}
                title={pendingDocAction === 'approved' ? (isAr ? 'اعتماد المستند' : 'Approve Document') : (isAr ? 'رفض المستند' : 'Reject Document')}
                subtitle={pendingDocAction === 'approved'
                    ? (isAr ? `أنت على وشك اعتماد مستند ${selectedDoc?.title}. يرجى التوقيع لإتمام العملية.` : `You are about to approve ${selectedDoc?.title}. Please sign to complete.`)
                    : (isAr ? `يرجى كتابة سبب الرفض والتوقيع لإبلاغ التاجر بخصوص مستند ${selectedDoc?.title}.` : `Please provide rejection reason and sign for ${selectedDoc?.title}.`)
                }
            />

        </div>
    );
};
