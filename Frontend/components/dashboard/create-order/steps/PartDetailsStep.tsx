import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, FileText, UploadCloud, X, Plus, Trash2, AlertTriangle, Info, Truck, Video, AlertCircle, Camera } from 'lucide-react';
import { useCreateOrderStore, PartItem } from '../../../../stores/useCreateOrderStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { GlassCard } from '../../../ui/GlassCard';

export const PartDetailsStep: React.FC = () => {
  const {
    parts,
    requestType,
    shippingType,
    setRequestType,
    setShippingType,
    addPart,
    removePart,
    updatePart,
    addPartImage,
    removePartImage,
    showErrors
  } = useCreateOrderStore();
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const fileInputRef = useRef<HTMLInputElement>(null);
  // We need refs for multiple inputs, or handle click with ID

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, partId: string) => {
    if (e.target.files && e.target.files[0]) {
      addPartImage(partId, e.target.files[0]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">{t.dashboard.createOrder.steps.part}</h2>
        <p className="text-white/60">{t.dashboard.createOrder.partSubtitle || (isRTL ? "أدخل تفاصيل القطع المطلوبة بدقة" : "Enter details for the requested parts")}</p>
      </div>

      {/* Request Type Toggle */}
      <div className="flex justify-center mb-6">
        <div className="bg-white/5 p-1 rounded-xl flex gap-1 border border-white/10">
          <button
            onClick={() => setRequestType('single')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${requestType === 'single' ? 'bg-gold-500 text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
          >
            {isRTL ? "قطعة واحدة" : "Single Part"}
          </button>
          <button
            onClick={() => setRequestType('multiple')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${requestType === 'multiple' ? 'bg-gold-500 text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
          >
            {isRTL ? "عدة قطع (حتى 12)" : "Multiple Parts (up to 12)"}
          </button>
        </div>
      </div>

      {/* Shipping Type Info */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col items-center gap-4">
            <label className="text-sm font-medium text-white/80">
              {isRTL ? "طريقة الشحن" : "Shipping Method"} <span className="text-red-500">*</span>
            </label>

            {requestType === 'single' ? (
              <div className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-white/60 flex items-center gap-2 cursor-not-allowed">
                <Truck size={18} />
                {isRTL ? "شحن كل قطعة لوحدها" : "Ship Separately"}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-wrap justify-center gap-3 w-full">
                  <button
                    onClick={() => setShippingType('combined')}
                    className={`flex-1 min-w-[200px] px-6 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${shippingType === 'combined' ? 'border-gold-500 bg-gold-500/10 text-white shadow-lg shadow-gold-500/10' : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'}`}
                  >
                    <Package size={18} />
                    {isRTL ? "تجميع الطلبات (شحنة واحدة)" : "Combined Shipping"}
                  </button>
                  <button
                    onClick={() => setShippingType('separate')}
                    className={`flex-1 min-w-[200px] px-6 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${shippingType === 'separate' ? 'border-gold-500 bg-gold-500/10 text-white shadow-lg shadow-gold-500/10' : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'}`}
                  >
                    <Truck size={18} />
                    {isRTL ? "كل طلب فى شحنه لوحده" : "Ship Separately"}
                  </button>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm p-4 rounded-lg flex items-start gap-3 w-full max-w-2xl text-start leading-relaxed shadow-lg shadow-blue-900/10">
                  <Info size={20} className="shrink-0 mt-1" />
                  <p className="whitespace-pre-line">
                    {isRTL
                      ? <>خيار تجميع الطلبات يتييح شحن من قطعتين الى 12 قطعة في شحنه واحدة بدلا من شحن كل قطعة لوحدها ،<br />على ان لاتبقى في سلتك لتجميع الشحنات أكثر من 7 أيام<br />ولو لم تقم بطلب الشحن قبل ذلك تشحن تلقائياً.</>
                      : "Combined shipping allows 2-12 items in one shipment instead of shipping each part separately.\nItems can remain in your consolidation cart for up to 7 days.\nIf not shipped by then, they will be shipped automatically."
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Parts List */}
      <div className="space-y-6">
        {parts.map((part, index) => (
          <GlassCard key={part.id} className="bg-white/5 border border-white/10 p-6 relative group/card hover:border-white/20 transition-all">
            {requestType === 'multiple' && parts.length > 1 && (
              <button
                onClick={() => removePart(part.id)}
                className={`absolute top-4 p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors ${isRTL ? 'left-4' : 'right-4'}`}
                title={isRTL ? "حذف القطعة" : "Remove Part"}
              >
                <Trash2 size={16} />
              </button>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="bg-gold-500 text-black text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
                  {index + 1}
                </span>
                {isRTL ? "بيانات القطعة" : "Part Details"}
              </h3>
            </div>

            <div className="space-y-4">
              {/* Part Name */}
              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t.dashboard.createOrder.part.name} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={part.name}
                  onChange={(e) => updatePart(part.id, 'name', e.target.value)}
                  className={`w-full bg-black/20 border rounded-xl px-4 py-3 text-white outline-none transition-all placeholder-white/20 ${showErrors && !part.name ? 'border-red-500 ring-2 ring-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)] focus:border-red-500' : 'border-white/10 focus:border-gold-500'}`}
                  placeholder={t.dashboard.createOrder.part.namePlaceholder}
                />
                {showErrors && !part.name && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs flex items-center gap-1 mt-2 font-medium">
                    <AlertCircle size={14} />
                    {isRTL ? 'يرجى إدخال اسم القطعة' : 'Please enter part name'}
                  </motion.p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t.dashboard.createOrder.part.desc} <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={part.description}
                  onChange={(e) => updatePart(part.id, 'description', e.target.value)}
                  rows={3}
                  className={`w-full bg-black/20 border rounded-xl px-4 py-3 text-white outline-none transition-all placeholder-white/20 resize-none ${showErrors && !part.description ? 'border-red-500 ring-2 ring-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)] focus:border-red-500' : 'border-white/10 focus:border-gold-500'}`}
                  placeholder={t.dashboard.createOrder.part.descPlaceholder}
                />
                {showErrors && !part.description && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs flex items-center gap-1 mt-2 font-medium">
                    <AlertCircle size={14} />
                    {isRTL ? 'يرجى إدخال وصف القطعة' : 'Please enter part description'}
                  </motion.p>
                )}
              </div>

              {/* Notes (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gold-200/70 mb-2">
                  {isRTL ? "ملاحظات (اختياري)" : "Notes (Optional)"}
                </label>
                <textarea
                  value={part.notes || ''}
                  onChange={(e) => updatePart(part.id, 'notes', e.target.value)}
                  rows={2}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500 outline-none transition-all placeholder-white/20 resize-none"
                  placeholder={isRTL ? "أي تفاصيل إضافية..." : "Any additional details..."}
                />
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t.dashboard.createOrder.part.images} <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-4">
                  {/* Add Image Button */}
                  <label className={`w-24 h-24 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group/upload ${showErrors && part.images.length === 0 ? 'border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:border-red-400' : 'border-white/10 hover:border-gold-500/50 hover:bg-white/5'}`}>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, part.id)}
                    />
                    <UploadCloud className="w-6 h-6 text-white/20 group-hover/upload:text-gold-400 transition-colors" />
                    <span className="text-[10px] text-white/40 text-center leading-tight px-1">{isRTL ? "رفع صورة" : "Upload Image"}</span>
                  </label>

                  {/* Camera Capture Button */}
                  <label className={`w-24 h-24 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group/camera ${showErrors && part.images.length === 0 ? 'border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:border-red-400' : 'border-white/10 hover:border-gold-500/50 hover:bg-gold-500/5'}`}>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileChange(e, part.id)}
                    />
                    <Camera className="w-6 h-6 text-white/20 group-hover/camera:text-gold-400 transition-colors" />
                    <span className="text-[10px] text-white/40 text-center leading-tight px-1">{isRTL ? "تصوير مباشر" : "Take Photo"}</span>
                  </label>

                  {/* Image Previews */}
                  {part.images.map((file, imgIdx) => (
                    <div key={imgIdx} className="w-24 h-24 rounded-xl bg-black/40 border border-white/10 relative group/img overflow-hidden">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="preview"
                        className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity"
                      />
                      <button
                        onClick={() => removePartImage(part.id, imgIdx)}
                        className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full text-white hover:bg-red-600 transition-colors opacity-0 group-hover/img:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                {showErrors && part.images.length === 0 && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs flex items-center gap-1 mt-2 font-medium">
                    <AlertCircle size={14} />
                    {isRTL ? 'يرجى إرفاق صورة واحدة على الأقل لكل قطعة' : 'Please attach at least one image per part'}
                  </motion.p>
                )}
              </div>

              {/* Video Upload (Optional) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gold-200 mb-2 flex items-center gap-2">
                  <Video size={16} className="text-gold-500" />
                  {isRTL ? "فيديو توضيحي (اختياري)" : "Video Description (Optional)"}
                </label>

                {part.video ? (
                  <div className="relative w-full max-w-[200px] bg-black/40 rounded-lg overflow-hidden border border-white/10">
                    <video
                      src={URL.createObjectURL(part.video)}
                      className="w-full h-32 object-cover"
                      controls
                    />
                    <button
                      onClick={() => updatePart(part.id, 'video', null)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg z-10"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white font-mono">
                      {(part.video.size / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full max-w-[200px] h-32 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-gold-500/50 hover:bg-white/5 transition-all group">
                    <div className="text-center">
                      <Video size={24} className="mx-auto text-white/40 group-hover:text-gold-500 mb-2 transition-colors" />
                      <span className="text-xs text-white/40 group-hover:text-white transition-colors block">
                        {isRTL ? "اضغط لرفع فيديو" : "Click to upload video"}
                      </span>
                      <span className="text-[10px] text-white/20 mt-1 block">Max 50MB</span>
                    </div>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 50 * 1024 * 1024) {
                            alert(isRTL ? "حجم الفيديو يجب أن لا يتجاوز 50 ميجابايت" : "Video size must not exceed 50MB");
                            return;
                          }
                          updatePart(part.id, 'video', file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Media Disclaimer */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mt-2 mb-4 shadow-lg shadow-blue-900/10">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                  <div className="text-sm text-blue-400 leading-relaxed space-y-2 font-bold drop-shadow-sm">
                    <p>
                      {isRTL
                        ? "- يرجى ارفاق صوره او فيديو واضح للطلب كمرجع رسمى عند أى نزاع مع التاجر ."
                        : "- Please attach a clear image or video of the request as an official reference in case of any dispute with the merchant."}
                    </p>
                    <p>
                      {isRTL
                        ? "- اذا لم تتوفر صوره او فيديو يمكن رفع صوره فارغه مع العلم ان العميل يتحمل المسؤليه بذلك ويقر ."
                        : "- If no image or video is available, a blank image can be uploaded, noting that the customer bears responsibility and acknowledges this."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Add Part Button */}
      {requestType === 'multiple' && (
        <div className="space-y-4">
          {parts.length < 12 && (
            <button
              onClick={addPart}
              className={`w-full py-4 rounded-xl border-2 border-dashed transition-all flex items-center justify-center gap-2 font-medium ${showErrors && parts.length < 2 ? 'border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'border-white/10 hover:border-gold-500/50 hover:bg-gold-500/5 text-white/60 hover:text-gold-400'}`}
            >
              <Plus size={20} />
              {isRTL ? "إضافة قطعة أخرى" : "Add Another Part"}
            </button>
          )}
          {showErrors && parts.length < 2 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-200 font-medium">
                {isRTL ? "لقد اخترت (عدة قطع)، يجب إضافة قطعتين على الأقل للمتابعة، أو قم بتغيير نوع الخيار بالاعلى إلى (قطعة واحدة)." : "You selected (Multiple Parts). Please add at least 2 parts to continue, or change the request type above to (Single Part)."}
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* Warning Message */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center gap-3">
        <AlertTriangle className="text-amber-500 shrink-0" size={24} />
        <p className="text-sm text-amber-200/90 font-medium">
          {isRTL
            ? "تحذير: يحظر إرسال أرقام التواصل أو الحسابات الشخصية في وصف القطعة أو الملاحظات، وإلا سيتم حظر الحساب."
            : "Warning: Sending contact numbers or personal accounts in the part description or notes is prohibited and will result in account suspension."}
        </p>
      </div>

    </motion.div>
  );
};
