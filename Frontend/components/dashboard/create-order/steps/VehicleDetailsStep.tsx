import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Car, Calendar, Hash, Camera, Info, ChevronDown, AlertCircle, HelpCircle } from 'lucide-react';
import { useCreateOrderStore } from '../../../../stores/useCreateOrderStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useCatalogStore } from '../../../../stores/useCatalogStore';
import { GlassCard } from '../../../ui/GlassCard';
import { useEffect } from 'react';

export const VehicleDetailsStep: React.FC = () => {
  const { vehicle, updateVehicle, showErrors } = useCreateOrderStore();
  const { makes, fetchCatalog, isLoading, subscribeToCatalog, unsubscribeFromCatalog } = useCatalogStore();
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (makes.length === 0) {
      fetchCatalog();
    }
    subscribeToCatalog();
    return () => unsubscribeFromCatalog();
  }, []);

  const selectedManufacturer = useMemo(() => {
    return makes.find(m => m.name === vehicle.make);
  }, [vehicle.make, makes]);

  // Handle Manufacturer Change
  const handleManufacturerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMake = e.target.value;
    updateVehicle({
      make: newMake,
      model: '', // Reset model when make changes
      year: vehicle.year // Keep year
    });
  };

  // Handle Type (Model) Change
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateVehicle({ model: e.target.value });
  };

  // Handle Year Change (Manual Input)
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, ''); // Only numbers
    updateVehicle({ year: val });
  };

  // Handle File Change (VIN Image)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Assuming the store can handle file objects, or we need to convert to base64 if needed.
      // For now, passing the file object as in the original code.
      // We might need to check if updateVehicle supports partial updates merged with existing state deep properties if not handled by store.
      // The store likely takes a Partial<Vehicle>.
      // Let's assume updateVehicle merges top level props.
      // If vinImage is part of vehicle state.
      updateVehicle({ vinImage: e.target.files[0] });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">{t.dashboard.createOrder.steps.vehicle}</h2>
        <p className="text-white/60">{t.dashboard.createOrder.vehicleSubtitle || (isRTL ? "أدخل تفاصيل سيارتك للعثور على قطع الغيار المناسبة" : "Enter your vehicle details to find compatible parts")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manufacturer Selection (Replacing Make) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">
            {language === 'ar' ? "الشركة المصنعة" : "Manufacturer"} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Car className={`absolute top-3.5 w-5 h-5 text-gold-500 pointer-events-none z-10 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
            <select
              value={vehicle.make}
              onChange={handleManufacturerChange}
              className={`w-full bg-white/5 border rounded-xl py-3 text-white outline-none transition-all appearance-none ${showErrors && !vehicle.make ? 'border-red-500 ring-2 ring-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)] focus:border-red-500' : 'border-white/10 focus:border-gold-500 focus:ring-1 focus:ring-gold-500'} ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} ${!vehicle.make ? 'text-white/30' : ''}`}
            >
              <option value="" disabled className="bg-[#1A1814] text-gray-400">
                {isLoading ? (language === 'ar' ? "جاري التحميل..." : "Loading...") : (language === 'ar' ? "اختر الشركة المصنعة" : "Select Manufacturer")}
              </option>
              {makes.map((m) => (
                <option key={m.id} value={m.name} className="bg-[#1A1814] text-white">
                  {language === 'ar' ? m.nameAr : m.name}
                </option>
              ))}
            </select>
            <ChevronDown className={`absolute top-4 w-4 h-4 text-white/30 pointer-events-none ${isRTL ? 'left-3.5' : 'right-3.5'}`} />
          </div>
          {showErrors && !vehicle.make && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs flex items-center gap-1 mt-1.5 font-medium">
              <AlertCircle size={14} />
              {isRTL ? 'يرجى اختيار الشركة المصنعة' : 'Please select a manufacturer'}
            </motion.p>
          )}
        </div>

        {/* Vehicle Type Selection (Replacing Model) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">
            {language === 'ar' ? "نوع السيارة" : "Vehicle Type"} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Hash className={`absolute top-3.5 w-4 h-4 text-gold-500 pointer-events-none z-10 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
            <select
              value={vehicle.model}
              onChange={handleTypeChange}
              disabled={!vehicle.make}
              className={`w-full bg-white/5 border rounded-xl py-3 text-white outline-none transition-all appearance-none ${showErrors && !vehicle.model ? 'border-red-500 ring-2 ring-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)] focus:border-red-500' : 'border-white/10 focus:border-gold-500 focus:ring-1 focus:ring-gold-500'} ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} ${!vehicle.make ? 'opacity-50 cursor-not-allowed' : ''} ${!vehicle.model ? 'text-white/30' : ''}`}
            >
              <option value="" disabled className="bg-[#1A1814] text-gray-400">
                {language === 'ar' ? "اختر نوع السيارة" : "Select Vehicle Type"}
              </option>
              {selectedManufacturer?.models.map((model) => (
                <option key={model.id} value={model.name} className="bg-[#1A1814] text-white">
                  {language === 'ar' ? model.nameAr : model.name}
                </option>
              ))}
            </select>
            <ChevronDown className={`absolute top-4 w-4 h-4 text-white/30 pointer-events-none ${isRTL ? 'left-3.5' : 'right-3.5'}`} />
          </div>
          {showErrors && !vehicle.model && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs flex items-center gap-1 mt-1.5 font-medium">
              <AlertCircle size={14} />
              {isRTL ? 'يرجى اختيار نوع السيارة' : 'Please select vehicle type'}
            </motion.p>
          )}
        </div>

        {/* Year of Manufacture (Manual Input) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">
            {language === 'ar' ? "سنة الصنع" : "Year of Manufacture"} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Calendar className={`absolute top-3.5 w-5 h-5 text-gold-500 pointer-events-none z-10 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
            <input
              type="text"
              value={vehicle.year}
              onChange={handleYearChange}
              placeholder={language === 'ar' ? "مثال: 2020" : "Ex: 2020"}
              maxLength={4}
              className={`w-full bg-white/5 border rounded-xl py-3 text-white placeholder:text-white/20 outline-none transition-all ${showErrors && !vehicle.year ? 'border-red-500 ring-2 ring-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)] focus:border-red-500' : 'border-white/10 focus:border-gold-500 focus:ring-1 focus:ring-gold-500'} ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
            />
          </div>
          {showErrors && !vehicle.year && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs flex items-center gap-1 mt-1.5 font-medium">
              <AlertCircle size={14} />
              {isRTL ? 'يرجى إدخال سنة الصنع' : 'Please enter year of manufacture'}
            </motion.p>
          )}
        </div>

        {/* VIN Number */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80 flex items-center gap-2">
            {t.dashboard.createOrder.vehicle.vin} <span className="text-white/30 text-xs">({t.common.optional})</span>
            <button
              type="button"
              className="text-gold-500/70 hover:text-gold-400 transition-colors"
              title={(t.dashboard.createOrder.vehicle as { vinTooltip?: string }).vinTooltip}
              aria-label={(t.dashboard.createOrder.vehicle as { vinTooltip?: string }).vinTooltip}
            >
              <HelpCircle size={14} />
            </button>
            {vehicle.vinImage && <span className="text-green-400 text-xs px-2 bg-green-500/10 rounded-full">{language === 'ar' ? 'تم إرفاق الصورة' : 'Image Attached'}</span>}
          </label>
          <div className="relative">
            <Hash className={`absolute top-3.5 w-4 h-4 text-gold-500/50 pointer-events-none z-10 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
            <input
              type="text"
              value={vehicle.vin}
              onChange={(e) => updateVehicle({ vin: e.target.value.toUpperCase() })}
              placeholder={language === 'ar' ? "رقم الهيكل (اختياري)" : "VIN (Optional)"}
              className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 text-white placeholder:text-white/20 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition-all uppercase font-mono tracking-wider ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
              maxLength={17}
            />

            {/* Camera Icon Trigger */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`absolute top-2 p-1.5 rounded-lg transition-colors ${vehicle.vinImage ? 'bg-green-500/20 text-green-400' : 'bg-white/10 hover:bg-gold-500 hover:text-white text-white/50'} ${isRTL ? 'left-2' : 'right-2'}`}
              title={language === 'ar' ? "مسح رقم الهيكل" : "Scan VIN"}
            >
              <Camera size={16} />
            </button>
          </div>
        </div>

        {/* Info Card - Helper */}
        <div className="md:col-span-2">
          <GlassCard className="bg-blue-500/10 border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
            <Info className="text-blue-400 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-200/80 leading-relaxed">
              {language === 'ar'
                ? "يرجى التأكد من اختيار نوع السيارة وسنة الصنع بدقة لضمان حصولك على قطع الغيار المناسبة تماماً لسيارتك."
                : "Please ensure you select the correct vehicle type and year to guarantee receiving compatible parts."}
            </p>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
};
