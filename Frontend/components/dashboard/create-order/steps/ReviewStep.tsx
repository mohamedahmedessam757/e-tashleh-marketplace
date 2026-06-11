import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Car, Package, Settings, AlertCircle, Loader2, Truck, Video } from 'lucide-react';
import { useCreateOrderStore } from '../../../../stores/useCreateOrderStore';
import { useAdminStore } from '../../../../stores/useAdminStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { GlassCard } from '../../../ui/GlassCard';

interface ReviewStepProps {
    onConfirm: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ onConfirm }) => {
    const { vehicle, parts, requestType, shippingType, preferences, updatePreferences, isSubmitting } = useCreateOrderStore();
    const { systemConfig } = useAdminStore();
    const { t, language } = useLanguage();
    const isRTL = language === 'ar';

    const SummaryItem = ({ icon: Icon, label, value }: any) => (
        <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="p-2 bg-white/5 rounded-lg text-white/60">
                <Icon size={16} />
            </div>
            <div>
                <div className="text-xs text-white/40 mb-1">{label}</div>
                <div className="text-sm font-bold text-white leading-tight">{value || '-'}</div>
            </div>
        </div>
    );

    const [selectedMedia, setSelectedMedia] = React.useState<{ type: 'image' | 'video', url: string } | null>(null);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            {/* Media Lightbox */}
            {selectedMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
                    onClick={() => setSelectedMedia(null)}
                >
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
                        {selectedMedia.type === 'video' ? (
                            <video
                                src={selectedMedia.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[85vh] rounded-lg border border-gold-500/20 shadow-2xl"
                            />
                        ) : (
                            <img
                                src={selectedMedia.url}
                                alt="Full View"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg border border-gold-500/20 shadow-2xl"
                            />
                        )}
                        <button
                            className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                            onClick={() => setSelectedMedia(null)}
                        >
                            {isRTL ? "إغلاق" : "Close"}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-gold-500/10 border border-gold-500/20 rounded-2xl p-4 flex items-center gap-3 text-gold-200 text-sm">
                <AlertCircle size={20} className="shrink-0" />
                <p>
                    {t.dashboard.createOrder.review.alert || (isRTL ? "يرجى مراجعة تفاصيل طلبك بدقة قبل التأكيد" : "Please review your order details carefully before confirming")}
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">

                {/* Vehicle Information */}
                <div className="md:col-span-2 space-y-3">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Car size={18} className="text-gold-500" />
                        {t.dashboard.createOrder.review.vehicleInfo}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <SummaryItem
                            icon={Car}
                            label={isRTL ? "الشركة المصنعة" : "Manufacturer"}
                            value={vehicle.make}
                        />
                        <SummaryItem
                            icon={Car}
                            label={isRTL ? "النوع/الموديل" : "Model"}
                            value={vehicle.model}
                        />
                        <SummaryItem
                            icon={Settings}
                            label={isRTL ? "سنة الصنع" : "Year"}
                            value={vehicle.year}
                        />
                        <SummaryItem
                            icon={Settings}
                            label={isRTL ? "رقم الهيكل (VIN)" : "VIN"}
                            value={vehicle.vin || (isRTL ? "غير محدد" : "Not specified")}
                        />
                    </div>
                </div>

                {/* Request Overview */}
                <div className="md:col-span-2 space-y-3">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Settings size={18} className="text-gold-500" />
                        {isRTL ? "تفاصيل الطلب" : "Request Details"}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <SummaryItem
                            icon={Package}
                            label={isRTL ? "نوع الطلب" : "Request Type"}
                            value={requestType === 'single' ? (isRTL ? "قطعة واحدة" : "Single Part") : (isRTL ? `عدة قطع (${parts.length})` : `Multiple Parts (${parts.length})`)}
                        />
                        <SummaryItem
                            icon={Truck}
                            label={isRTL ? "الشحن" : "Shipping"}
                            value={shippingType === 'combined'
                                ? (isRTL ? "(عدة قطع) تجميع الطلبات" : "(Multiple) Combined")
                                : (requestType === 'multiple'
                                    ? (isRTL ? "(عدة قطع) كل طلب فى شحنه لوحده" : "(Multiple) Separate")
                                    : (isRTL ? "(قطعة واحدة) شحن كل قطعة لوحدها" : "(Single) Separate")
                                )
                            }
                        />
                        {requestType === 'multiple' && (
                            <SummaryItem
                                icon={Package}
                                label={isRTL ? "عدد القطع" : "Parts Count"}
                                value={parts.length}
                            />
                        )}
                        {/* Show Condition ONLY if Preferences Step is Enabled */}
                        {systemConfig.general.enablePreferencesStep && (
                            <SummaryItem
                                icon={Settings}
                                label={t.dashboard.createOrder.prefs.condition}
                                value={preferences.condition === 'new' ? (isRTL ? "جديد" : "New") : (preferences.condition === 'used' ? (isRTL ? "مستعمل" : "Used") : (isRTL ? "غير محدد" : "Not Specified"))}
                            />
                        )}

                    </div>
                </div>

                {/* Parts List */}
                <div className="md:col-span-2 space-y-3">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Package size={18} className="text-gold-500" />
                        {t.dashboard.createOrder.review.partDetails}
                    </h3>

                    <div className="space-y-4">
                        {parts.map((p, idx) => (
                            <GlassCard key={idx} className="bg-white/5 border border-white/10 p-4 relative">
                                <span className="absolute top-4 right-4 text-xs font-bold text-white/30">#{idx + 1}</span>
                                <h4 className="font-bold text-gold-400 mb-2">{p.name}</h4>
                                <div className="text-sm text-white/80 mb-3 bg-black/20 p-3 rounded-lg overflow-hidden text-ellipsis">
                                    {p.description}
                                </div>
                                {p.notes && (
                                    <div className="text-xs text-white/50 mb-3 italic bg-white/5 p-2 rounded">
                                        <span className="text-gold-500/70 mr-1">{isRTL ? "ملاحظات:" : "Notes:"}</span>
                                        "{p.notes}"
                                    </div>
                                )}
                                {p.images.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {p.images.map((img, i) => (
                                            <div key={i} className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:border-gold-500/50 transition-colors" onClick={() => setSelectedMedia({ type: 'image', url: URL.createObjectURL(img) })}>
                                                <img src={URL.createObjectURL(img)} alt="part" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                        {p.video && (
                                            <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:border-gold-500/50 transition-colors relative" onClick={() => setSelectedMedia({ type: 'video', url: URL.createObjectURL(p.video!) })}>
                                                <video src={URL.createObjectURL(p.video)} className="w-full h-full object-cover opacity-60" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Video size={20} className="text-white drop-shadow-md" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </GlassCard>
                        ))}
                    </div>

                </div>

            </div>

            <div className="pt-4">
                <button
                    onClick={onConfirm}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-white rounded-xl font-bold shadow-[0_4px_20px_rgba(168,139,62,0.3)] hover:shadow-[0_6px_25px_rgba(168,139,62,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : (
                        <>
                            <CheckCircle2 size={20} />
                            {t.dashboard.createOrder.review.confirm}
                        </>
                    )}
                </button>
            </div>

        </motion.div >
    );
};
