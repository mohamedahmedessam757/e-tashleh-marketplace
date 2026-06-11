import React, { useState } from 'react';
import { useOrderChatStore } from '../../../../stores/useOrderChatStore';
import { storageApi } from '../../../../services/api/storage';
import { Send, Upload, X, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';

interface MerchantTicketFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export const MerchantTicketForm: React.FC<MerchantTicketFormProps> = ({ onSuccess, onCancel }) => {
    const { t, language } = useLanguage();
    const { createSupportChat } = useOrderChatStore();
    
    // Form State
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('FINANCIAL');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [attachment, setAttachment] = useState<{ url: string; type: string; name: string } | null>(null);

    const categories = [
        { id: 'FINANCIAL', label: t.dashboard.merchant.support.categories.financial },
        { id: 'DOCUMENTS', label: t.dashboard.merchant.support.categories.documents },
        { id: 'ORDERS', label: t.dashboard.merchant.support.categories.orders },
        { id: 'TECHNICAL', label: t.dashboard.merchant.support.categories.technical },
        { id: 'OTHER', label: t.dashboard.merchant.support.categories.other }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // Include category in the subject for admin clarity
            const finalSubject = `[${category}] ${subject}`;
            
            await createSupportChat(
                finalSubject,
                description,
                undefined, // orderId (if we want to link a specific order later, we can add a selector)
                attachment?.url,
                attachment?.type,
                attachment?.name,
                priority
            );

            onSuccess();
        } catch (err: any) {
            console.error('Failed to submit merchant ticket:', err);
            setError(err.message || 'Failed to submit ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8 pb-10">
            {/* Form Header */}
            <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gold-500/10 text-gold-500">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white">
                            {t.dashboard.merchant.support.newTicketTitle}
                        </h3>
                        <p className="text-white/40 text-sm mt-0.5">
                            {language === 'ar' ? 'نظام تذاكر الدعم الفنى - استجابة خلال 24 ساعة' : 'Support Ticket System - Response within 24h'}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className="p-2.5 hover:bg-white/5 rounded-xl text-white/30 hover:text-white transition-all border border-transparent hover:border-white/10"
                >
                    <X size={20} />
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/5 border border-red-500/20 text-red-400 rounded-2xl text-sm flex items-center gap-3 animate-shake">
                    <AlertCircle size={20} className="shrink-0" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subject */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-white/70 mb-2.5 ml-1">
                        {t.dashboard.merchant.support.subject}
                    </label>
                    <input
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className="w-full bg-[#1A1814] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-gold-500/50 focus:bg-gold-500/[0.02] transition-all placeholder:text-white/20 shadow-inner"
                        placeholder={t.dashboard.merchant.support.form.summaryPlaceholder}
                        required
                    />
                </div>

                {/* Category Selection */}
                <div>
                    <label className="block text-sm font-semibold text-white/70 mb-2.5 ml-1">
                        {language === 'ar' ? 'تصنيف الطلب' : 'Request Category'}
                    </label>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full bg-[#1A1814] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-gold-500/50 focus:bg-gold-500/[0.02] transition-all appearance-none cursor-pointer"
                        required
                    >
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id} className="bg-[#1A1814] text-white py-4">{cat.label}</option>
                        ))}
                    </select>
                </div>

                {/* Priority Selection */}
                <div>
                    <label className="block text-sm font-semibold text-white/70 mb-2.5 ml-1">
                        {t.dashboard.merchant.support.form.priority}
                    </label>
                    <div className="flex p-1.5 bg-[#12110F] border border-white/5 rounded-2xl gap-2">
                        {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPriority(p)}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all relative overflow-hidden ${priority === p
                                    ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/10'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {t.dashboard.merchant.support.form[p.toLowerCase() as keyof typeof t.dashboard.merchant.support.form]}
                                {priority === p && p === 'HIGH' && (
                                    <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-white/70 mb-2.5 ml-1">
                        {t.dashboard.merchant.support.message}
                    </label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full bg-[#1A1814] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-gold-500/50 focus:bg-gold-500/[0.02] transition-all min-h-[180px] placeholder:text-white/20 resize-none shadow-inner"
                        placeholder={t.dashboard.merchant.support.form.descPlaceholder}
                        required
                    />
                </div>

                {/* Attachments */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-white/70 mb-2.5 ml-1">
                        {language === 'ar' ? 'المرفقات (اختياري)' : 'Attachments (Optional)'}
                    </label>
                    <input
                        type="file"
                        id="merchant-file-upload"
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                try {
                                    setIsSubmitting(true);
                                    const url = await storageApi.upload(file, 'support-files', 'merchant-tickets');
                                    const type = file.type.startsWith('image/') ? 'image' : 'video';
                                    setAttachment({ url, type, name: file.name });
                                } catch (err) {
                                    console.error('Upload failed', err);
                                    setError('Failed to upload file');
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }
                        }}
                        accept="image/*,video/*,application/pdf"
                    />
                    <label
                        htmlFor="merchant-file-upload"
                        className={`group border-2 border-dashed rounded-3xl p-8 py-10 text-center transition-all cursor-pointer block relative overflow-hidden ${attachment 
                            ? 'border-gold-500/30 bg-gold-500/5' 
                            : 'border-white/5 hover:border-gold-500/20 hover:bg-white/[0.02]'}`}
                    >
                        {attachment ? (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-2xl bg-gold-500/20 flex items-center justify-center text-gold-500 mb-4 animate-bounce-subtle">
                                    <ShieldCheck size={32} />
                                </div>
                                <p className="text-white font-bold text-lg mb-1">{attachment.name}</p>
                                <p className="text-gold-500/60 text-sm">{language === 'ar' ? 'تم الرفع بنجاح' : 'Uploaded successfully'}</p>
                                <button 
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); setAttachment(null); }}
                                    className="mt-4 px-4 py-2 bg-white/5 rounded-lg text-xs text-white/40 hover:text-red-400 transition-colors"
                                >
                                    {language === 'ar' ? 'إلغاء الملف' : 'Remove file'}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mx-auto mb-4 group-hover:bg-gold-500/10 group-hover:text-gold-500 transition-all duration-500">
                                    <Upload size={32} />
                                </div>
                                <p className="text-white font-bold text-lg mb-2">{t.dashboard.merchant.support.form.upload}</p>
                                <p className="text-white/30 text-sm px-10 leading-relaxed">
                                    {language === 'ar' ? 'يمكنك رفع لقطات شاشة أو ملفات PDF (بحد أقصى 10 ميجا)' : 'JPG, PNG or PDF files are supported (Max 10MB)'}
                                </p>
                            </>
                        )}
                        
                        {/* Status Overlay */}
                        {isSubmitting && !attachment && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
                                <Loader2 className="text-gold-500 animate-spin" size={40} />
                                <p className="text-gold-500 font-bold">{t.dashboard.merchant.support.form.submitting}</p>
                            </div>
                        )}
                    </label>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-8 border-t border-white/5 flex items-center justify-center gap-4 md:gap-6">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-3 group/cancel"
                    disabled={isSubmitting}
                >
                    <X size={20} className="text-white/40 group-hover/cancel:text-red-400 transition-colors" />
                    <span>{t.common.cancel}</span>
                </button>
                <button
                    type="submit"
                    className="flex-1 py-4 bg-gold-500 hover:bg-gold-400 text-black font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-gold-500/10 disabled:opacity-50 disabled:grayscale group/send"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            <span>{t.dashboard.merchant.support.form.submitting}</span>
                        </>
                    ) : (
                        <>
                            <Send size={20} className="group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5 transition-transform" />
                            <span>{t.common.submit}</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};
