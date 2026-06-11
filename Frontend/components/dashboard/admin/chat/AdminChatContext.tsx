import React, { useState } from 'react';
import { useAdminChatStore } from '../../../../stores/useAdminChatStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { admin } from '../../../../data/locales/admin';
import { 
    FileText, User, Store, ShieldAlert, Trash2, 
    Download, HandMetal, CheckCircle2, AlertTriangle,
    Activity, Clock, MapPin, Hash, Package, Shield, ShieldCheck,
    Headphones // Added for Phase 3 support icon
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { escapeHtml } from '../../../../utils/htmlSanitize';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const AdminChatContext: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const t = admin[language];
    const { activeChat, adminAction } = useAdminChatStore();
    const [capturing, setCapturing] = useState(false);

    const [supportTarget, setSupportTarget] = useState<{ id: string, name: string, role: 'CUSTOMER' | 'VENDOR' } | null>(null);
    const [supportReason, setSupportReason] = useState('');
    const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
    const { fetchChats, initSupportChat, fetchChatById } = useAdminChatStore();
    const [blockingUser, setBlockingUser] = useState<{ id: string, name: string } | null>(null);
    const [riskData, setRiskData] = useState<any>(null);
    const [isFetchingRisk, setIsFetchingRisk] = useState(false);
    const [blockDuration, setBlockDuration] = useState(0); // 0 = permanent
    const [blockReason, setBlockReason] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleOpenSupportChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supportTarget || !supportReason.trim()) return;

        setIsSubmittingSupport(true);
        try {
            const newChat = await initSupportChat({
                targetUserId: supportTarget.id,
                targetRole: supportTarget.role,
                reason: supportReason,
                orderId: activeChat.orderId
            });
            
            // Navigate to support page and select the new chat automatically
            window.dispatchEvent(new CustomEvent('admin-nav', { 
                detail: { path: 'support', id: newChat.id } 
            }));

            setSupportTarget(null);
            setSupportReason('');
        } catch (error) {
            console.error('Failed to init support:', error);
            alert(isAr ? 'حدث خطأ أثناء فتح المحادثة' : 'Error opening support conversation');
        } finally {
            setIsSubmittingSupport(false);
        }
    };

    const handleDeleteChat = async () => {
        setShowDeleteConfirm(false);
        await adminAction(activeChat.id, 'deleteChat');
    };

    const handleBlockUser = async (userId: string, userName: string) => {
        setBlockingUser({ id: userId, name: userName });
        setIsFetchingRisk(true);
        setBlockDuration(0);
        setBlockReason('');
        
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_URL}/chats/admin/user-risk/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRiskData(response.data);
        } catch (error) {
            console.error('Failed to fetch risk profile:', error);
        } finally {
            setIsFetchingRisk(false);
        }
    };

    const confirmBlockAction = async () => {
        if (!blockingUser || !blockReason.trim()) return;
        
        const success = await adminAction(activeChat.id, 'block', {
            userId: blockingUser.id,
            durationDays: blockDuration,
            reason: blockReason
        });

        if (success) {
            setBlockingUser(null);
            setRiskData(null);
        }
    };

    const handleTakeEvidence = async () => {
        if (!activeChat) return;
        setCapturing(true);

        try {
            // 1. Fetch comprehensive history first to ensure no missing messages
            const response = await adminAction(activeChat.id, 'evidence');
            const { chatMetadata, evidenceSnapshot } = response;

            // 2. Create a high-fidelity HTML template for the report
            const reportNode = document.createElement('div');
            reportNode.style.position = 'fixed';
            reportNode.style.left = '-9999px';
            reportNode.style.top = '0';
            reportNode.style.width = '700px';
            reportNode.style.padding = '40px';
            reportNode.style.boxSizing = 'border-box';
            reportNode.style.backgroundColor = '#ffffff';
            reportNode.style.color = '#111827';
            reportNode.style.fontFamily = "'Inter', 'Arial', sans-serif";
            reportNode.style.direction = 'rtl'; // Standardize RTL for oversight

            // 3. Build a PROFESSIONAL chat-bubble style layout
            reportNode.innerHTML = `
                <div style="border-bottom: 2px solid #1a1814; padding-bottom: 25px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <h1 style="font-size: 28px; font-weight: 900; color: #1a1814; margin: 0; letter-spacing: -1px;">E-TASHLEH <span style="color: #d4af37;">OVERSIGHT</span></h1>
                        <p style="font-size: 11px; color: #6B7280; margin: 5px 0 0 0; text-transform: uppercase; font-weight: 600;">Official Registry Transcript • Proof of Conversation</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-size: 10px; color: #9CA3AF; margin: 0;">GEN ON: ${new Date().toLocaleString()}</p>
                        <p style="font-size: 10px; color: #9CA3AF; margin: 2px 0 0 0;">REF ID: ${chatMetadata.chatId.toUpperCase()}</p>
                    </div>
                </div>

                <div style="background-color: #fcfcfc; border: 1px solid #f3f4f6; border-radius: 12px; padding: 25px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <p style="font-size: 10px; font-weight: 800; color: #d4af37; text-transform: uppercase; margin: 0 0 8px 0;">Participants</p>
                        <p style="font-size: 13px; color: #111827; margin: 0;"><strong>${isAr ? 'العميل:' : 'Customer:'}</strong> ${chatMetadata.customer?.name || 'N/A'}</p>
                        <p style="font-size: 13px; color: #111827; margin: 4px 0 0 0;"><strong>${isAr ? 'التاجر:' : 'Vendor:'}</strong> ${chatMetadata.vendor?.name || 'N/A'}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-size: 10px; font-weight: 800; color: #d4af37; text-transform: uppercase; margin: 0 0 8px 0;">Order Context</p>
                        <p style="font-size: 20px; font-weight: 900; color: #111827; margin: 0;">#${chatMetadata.orderNumber || 'SYSTEM'}</p>
                        <p style="font-size: 12px; color: #6B7280; margin-top: 4px;">${chatMetadata.status} • Registry Record</p>
                    </div>
                </div>

                <div style="background: #f9fafb; border-radius: 12px; padding: 20px 15px;">
                    ${evidenceSnapshot.map((msg: any) => {
                        // CORRECT attribution using vendorOwnerId from backend
                        const isCustomer = msg.senderId === chatMetadata.customer?.id;
                        const isVendor = msg.senderId === chatMetadata.vendor?.id || msg.senderId === chatMetadata.vendorOwnerId;
                        const isSystem = !msg.senderId || msg.senderId === null || (!isCustomer && !isVendor);

                        if (isSystem) {
                            return `
                                <div style="text-align: center; margin: 16px 0;">
                                    <span style="font-size: 10px; background: #e5e7eb; color: #4B5563; padding: 5px 14px; border-radius: 99px; font-weight: 600;">${msg.text}</span>
                                </div>
                            `;
                        }

                        const senderName = isCustomer
                            ? (chatMetadata.customer?.name || 'Customer')
                            : (chatMetadata.vendor?.name || 'Vendor');
                        const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        if (isCustomer) {
                            // Customer: RIGHT side (flex-start in RTL)
                            return `
                                <div style="display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 15px;">
                                    <span style="font-size: 10px; font-weight: 700; color: #b8860b; margin-bottom: 4px;">${escapeHtml(senderName)}</span>
                                    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 15px 0px 15px 15px; padding: 12px 16px; max-width: 80%; text-align: right;">
                                        <p style="font-size: 13px; color: #1f2937; margin: 0; line-height: 1.6;">${escapeHtml(msg.text || '')}</p>
                                    </div>
                                    <span style="font-size: 9px; color: #9CA3AF; margin-top: 4px;">${time}</span>
                                </div>
                            `;
                        } else {
                            // Vendor: LEFT side (flex-end in RTL)
                            return `
                                <div style="display: flex; flex-direction: column; align-items: flex-end; margin-bottom: 15px;">
                                    <span style="font-size: 10px; font-weight: 700; color: #374151; margin-bottom: 4px;">${escapeHtml(senderName)}</span>
                                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0px 15px 15px 15px; padding: 12px 16px; max-width: 80%; text-align: left;">
                                        <p style="font-size: 13px; color: #1f2937; margin: 0; line-height: 1.6;">${escapeHtml(msg.text || '')}</p>
                                    </div>
                                    <span style="font-size: 9px; color: #9CA3AF; margin-top: 4px;">${time}</span>
                                </div>
                            `;
                        }
                    }).join('')}
                </div>

                <div style="margin-top: 40px; border-top: 2px solid #f3f4f6; padding-top: 20px; text-align: center;">
                    <p style="font-size: 11px; color: #9CA3AF; font-weight: 500;">Secure Registry Document • End of Transcript • E-TASHLEH Platform Oversight</p>
                    <p style="font-size: 9px; color: #cbd5e1; margin-top: 5px;">This document is legally binding as a record of communication within the platform environment.</p>
                </div>
            `;

            document.body.appendChild(reportNode);

            // 4. ESSENTIAL: Wait for rendering & font application
            await new Promise(resolve => setTimeout(resolve, 800));

            // 5. High-Resolution Capture using Native Browser Rendering (Supports Arabic Perfectly)
            const canvas = await html2canvas(reportNode, {
                scale: 2,
                logging: false,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 700
            });

            // 6. Generate PDF from Image
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width / 2, canvas.height / 2]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
            
            // 7. Cleanup & Save
            pdf.save(`Transcript_${chatMetadata.orderNumber || 'REGISTRY'}_${Date.now()}.pdf`);
            document.body.removeChild(reportNode);
            
            alert(isAr ? 'تم استخراج السجل الرسمي بنجاح' : 'Official record exported successfully');
        } catch (error) {
            console.error('Evidence snapshot failed:', error);
            alert(isAr ? 'فشل استخراج السجل' : 'Failed to export official record');
        } finally {
            setCapturing(false);
        }
    };


    if (!activeChat) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] flex items-center justify-center text-white/5 mb-4 border border-white/5">
                    <Shield size={32} />
                </div>
                <h3 className="text-sm font-bold text-white/20 mb-1">
                    {isAr ? 'لا يوجد محادثة نشطة' : 'No Active Chat'}
                </h3>
                <p className="text-[10px] text-white/10 uppercase tracking-widest font-medium">
                    {isAr ? 'اختر محادثة من القائمة للبدء' : 'Select a conversation to begin'}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-8">

            {/* Moderation Actions */}
            <div>
                <h4 className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-4 flex items-center gap-2">
                    <ShieldAlert size={14} className="text-gold-500" />
                    {isAr ? 'أدوات الرقابة' : 'Oversight Tools'}
                </h4>
                <div className="grid grid-cols-1 gap-2">
                    <button 
                        onClick={handleTakeEvidence}
                        disabled={capturing}
                        className="w-full py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {capturing ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Download size={14} />}
                        {t.chatOversight.takeEvidence}
                    </button>

                    <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 size={14} />
                        {t.chatOversight.deleteChat}
                    </button>
                </div>
            </div>

            {/* Context Details (Dynamic) */}
            <div>
                <h4 className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-4 flex items-center gap-2">
                    {activeChat.type === 'support' ? <FileText size={14} /> : <Package size={14} />}
                    {activeChat.type === 'support' 
                        ? (isAr ? 'بيانات تذكرة الدعم' : 'Support Ticket Details')
                        : (isAr ? 'تفاصيل الطلب' : 'Order Details')}
                </h4>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-500 border border-gold-500/20">
                            <Hash size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-white/40 uppercase font-bold">
                                {activeChat.type === 'support' ? (isAr ? 'رقم التذكرة' : 'Ticket ID') : (isAr ? 'رقم الطلب' : 'Order Number')}
                            </p>
                            <p className="text-sm font-bold text-white truncate">
                                {activeChat.type === 'support' ? `#TKT-${activeChat.id.substring(0, 8)}` : `#${activeChat.orderNumber || 'N/A'}`}
                            </p>
                        </div>
                    </div>
                    {activeChat.type === 'order' && activeChat.partName && (
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 border border-white/10">
                                <Activity size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-white/40 uppercase font-bold">{isAr ? 'القطعة المطلوبة' : 'Requested Part'}</p>
                                <p className="text-sm font-bold text-white truncate max-w-[160px]">{activeChat.partName}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Participants */}
            <div>
                <h4 className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-4 flex items-center gap-2">
                    <Activity size={14} />
                    {isAr ? 'الأطراف المشاركة' : 'Participants'}
                </h4>
                <div className="space-y-3">
                    {/* Customer */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 group">
                        <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500 border border-gold-500/10">
                            <User size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{activeChat.customerName}</p>
                            <p className="text-[10px] text-white/40">{isAr ? 'عميل' : 'Customer'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => setSupportTarget({ id: activeChat.customerId, name: activeChat.customerName, role: 'CUSTOMER' })}
                                className="p-2 bg-gold-500/10 text-gold-500 rounded-lg transition-all hover:bg-gold-500 hover:text-[#1A1814]"
                                title={isAr ? 'فتح محادثة دعم' : 'Open Support Chat'}
                            >
                                <Headphones size={14} />
                            </button>
                            <button 
                                onClick={() => handleBlockUser(activeChat.customerId, activeChat.customerName)}
                                className="p-2 bg-red-500/10 text-red-500 rounded-lg transition-opacity hover:bg-red-500 hover:text-white"
                                title={isAr ? 'حظر المستخدم' : 'Block User'}
                            >
                                <AlertTriangle size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Vendor */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 group">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/40 border border-white/10">
                            <Store size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{activeChat.vendorName || (isAr ? 'تاجر غير محدد' : 'Unknown Vendor')}</p>
                            <p className="text-[10px] text-white/40">{isAr ? 'تاجر' : 'Vendor'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {activeChat.vendorId && (
                                <button 
                                    onClick={() => setSupportTarget({ id: activeChat.vendorId!, name: activeChat.vendorName!, role: 'VENDOR' })}
                                    className="p-2 bg-gold-500/10 text-gold-500 rounded-lg transition-all hover:bg-gold-500 hover:text-[#1A1814]"
                                    title={isAr ? 'فتح محادثة دعم' : 'Open Support Chat'}
                                >
                                    <Headphones size={14} />
                                </button>
                            )}
                            {activeChat.vendorId && (
                                <button 
                                    onClick={() => handleBlockUser(activeChat.vendorId!, activeChat.vendorName!)}
                                    className="p-2 bg-red-500/10 text-red-500 rounded-lg transition-opacity hover:bg-red-500 hover:text-white"
                                    title={isAr ? 'حظر المستخدم' : 'Block User'}
                                >
                                    <AlertTriangle size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Safety Tips for Admin */}
            <div className="mt-auto bg-gold-500/5 rounded-2xl p-4 border border-gold-500/10">
                <div className="flex items-center gap-2 mb-2 text-gold-500">
                    <AlertTriangle size={14} />
                    <span className="text-[10px] font-bold uppercase">{isAr ? 'تنبيه إداري' : 'Admin Alert'}</span>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed italic">
                    {isAr ? 'تذكر أن أي إجراء (حذف أو انضمام) يتم تسجيله في سجلات النظام لأغراض التدقيق.' : 'Remember that any action (deletion or join) is recorded in system logs for auditing purposes.'}
                </p>
            </div>

            {/* MODALS SECTION */}
            <AnimatePresence>
                {/* 1. DELETE CONFIRMATION MODAL */}
                {showDeleteConfirm && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1A1814] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6 mx-auto">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white text-center mb-2">
                                {isAr ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Deletion'}
                            </h3>
                            <p className="text-sm text-white/50 text-center mb-8 leading-relaxed">
                                {isAr 
                                    ? 'سيتم حذف هذه المحادثة بالكامل من سجلات العميل والتاجر نهائياً. هذا الإجراء لا يمكن التراجع عنه.' 
                                    : 'This conversation will be permanently removed from both customer and vendor records. This action cannot be undone.'}
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
                                >
                                    {isAr ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button 
                                    onClick={handleDeleteChat}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all"
                                >
                                    {isAr ? 'حذف الآن' : 'Delete Now'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* 2. SUPPORT TICKET MODAL */}
                {supportTarget && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1A1814] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-500">
                                        <Headphones size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white leading-tight">
                                            {isAr ? 'فتح محادثة دعم' : 'Open Support Ticket'}
                                        </h3>
                                        <p className="text-xs text-white/40">{isAr ? 'تواصل مع:' : 'Contact:'} {supportTarget.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSupportTarget(null)} className="text-white/20 hover:text-white"><ShieldAlert size={20} /></button>
                            </div>

                            <form onSubmit={handleOpenSupportChat} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-white/30 uppercase block mb-2">{isAr ? 'سبب فتح التذكرة / الموضوع' : 'Reason / Subject'}</label>
                                    <textarea 
                                        required
                                        value={supportReason}
                                        onChange={(e) => setSupportReason(e.target.value)}
                                        placeholder={isAr ? 'مثال: الاستفسار عن حالة الشحن للعميل...' : 'Ex: Inquiry about shipping status...'}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-gold-500/50 min-h-[120px] transition-colors"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setSupportTarget(null)}
                                        className="flex-1 py-3 bg-white/5 text-white font-bold rounded-xl"
                                    >
                                        {isAr ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isSubmittingSupport}
                                        className="flex-1 py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-[#1A1814] font-bold rounded-xl shadow-lg shadow-gold-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingSupport ? (
                                            <Activity className="animate-spin" size={18} />
                                        ) : (
                                            <>
                                                <CheckCircle2 size={18} />
                                                {isAr ? 'بدء المحادثة' : 'Start Ticket'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {/* 3. ADVANCED BLOCK MODAL (MATCHING IMAGE DESIGN) */}
                {blockingUser && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                            className="bg-[#1A1814] border border-gold-500/20 rounded-[32px] p-6 md:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <h2 className="text-xl md:text-2xl font-black text-white text-center">
                                    {isAr ? 'إجراء إداري على الحساب' : 'Account Admin Action'}
                                </h2>
                                <Activity className="text-gold-500" size={24} />
                            </div>

                            {/* Risk Assessment Section */}
                            {isFetchingRisk ? (
                                <div className="py-6 flex flex-col items-center gap-4">
                                    <Activity className="animate-spin text-gold-500" size={24} />
                                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">{isAr ? 'جاري التقييم...' : 'Analyzing Risk...'}</p>
                                </div>
                            ) : riskData && (
                                <div className="mb-6 space-y-4">
                                    {(riskData.activeOrdersCount > 0 || riskData.pendingBalance > 0) && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-pulse">
                                            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                                            <div>
                                                <p className="text-red-500 font-bold text-xs mb-0.5">{isAr ? 'تحذير أمني!' : 'Security Alert!'}</p>
                                                <p className="text-red-500/80 text-[10px] leading-relaxed">
                                                    {isAr 
                                                        ? `المستخدم لديه (${riskData.activeOrdersCount}) طلبات نشطة و (${riskData.pendingBalance}) رصيد معلق.`
                                                        : `User has (${riskData.activeOrdersCount}) active orders and (${riskData.pendingBalance}) pending balance.`}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Type Selection */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <button 
                                    onClick={() => setBlockDuration(7)}
                                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${blockDuration > 0 ? 'bg-gold-500/10 border-gold-500 text-gold-500 ring-2 ring-gold-500/20' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                                >
                                    <Activity size={20} />
                                    <span className="font-bold text-xs">{isAr ? 'إيقاف مؤقت' : 'Suspend'}</span>
                                </button>
                                <button 
                                    onClick={() => setBlockDuration(0)}
                                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${blockDuration === 0 ? 'bg-red-500/10 border-red-500 text-red-500 ring-2 ring-red-500/20' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                                >
                                    <ShieldAlert size={20} />
                                    <span className="font-bold text-xs">{isAr ? 'حظر دائم' : 'Permanent'}</span>
                                </button>
                            </div>

                            {/* Duration & Reason Fields */}
                            <div className="space-y-4">
                                {blockDuration > 0 && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                                        <label className="text-[10px] font-bold text-white/30 uppercase block mb-2">{isAr ? 'مدة الإيقاف' : 'Duration'}</label>
                                        <select 
                                            value={blockDuration}
                                            onChange={(e) => setBlockDuration(parseInt(e.target.value))}
                                            className="w-full bg-[#1A1814] border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:outline-none appearance-none"
                                        >
                                            <option value={7} className="bg-[#1A1814] text-white">{isAr ? '٧ أيام' : '7 Days'}</option>
                                            <option value={30} className="bg-[#1A1814] text-white">{isAr ? '٣٠ يوم' : '30 Days'}</option>
                                            <option value={90} className="bg-[#1A1814] text-white">{isAr ? '٩٠ يوم' : '90 Days'}</option>
                                        </select>
                                    </motion.div>
                                )}

                                <div>
                                    <label className="text-[10px] font-bold text-white/30 uppercase block mb-2">{isAr ? 'سبب الإجراء (سيظهر للمستخدم)' : 'Reason (Visible to user)'}</label>
                                    <textarea 
                                        value={blockReason}
                                        onChange={(e) => setBlockReason(e.target.value)}
                                        placeholder={isAr ? 'اكتب السبب هنا بالتفصيل...' : 'Type the reason here...'}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-gold-500/50 min-h-[100px] transition-colors shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Final Actions */}
                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <button 
                                    onClick={() => setBlockingUser(null)}
                                    className="py-3.5 bg-white/[0.03] hover:bg-white/[0.08] text-white font-bold text-base rounded-2xl transition-all"
                                >
                                    {isAr ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button 
                                    disabled={!blockReason.trim() || isFetchingRisk}
                                    onClick={confirmBlockAction}
                                    className={`py-3.5 font-bold text-base rounded-2xl transition-all shadow-xl disabled:opacity-30 ${blockDuration === 0 ? 'bg-red-500 hover:bg-red-600' : 'bg-gold-500 hover:bg-gold-600 text-[#1A1814]'}`}
                                >
                                    {isAr ? 'تأكيد الإجراء' : 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
