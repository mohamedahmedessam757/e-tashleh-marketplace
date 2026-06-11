import React, { useState, useMemo, memo } from 'react';
import { 
  Search, Plus, ChevronDown, ChevronUp, Power, PowerOff, 
  Settings2, Edit3, Trash2, Box, Car, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminStore, VehicleMake, VehicleModel } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';
import { AdminSignatureModal } from './AdminSignatureModal';

// Memoized Individual Make Card
const VehicleMakeCard = memo(({ 
  make, 
  isAr, 
  isExpanded, 
  onToggleExpand, 
  onInitiateUpdateMake, 
  onInitiateToggleAll, 
  onSetAddingModel, 
  isAddingModel,
  newModel,
  setNewModel,
  onCreateModel,
  isSubmitting,
  onInitiateUpdateModel,
  loadingItems
}: any) => {
  return (
    <GlassCard className={`overflow-hidden border-white/5 transition-opacity duration-300 ${!make.isActive ? 'opacity-60' : ''}`} enableHover={false} enableBlur={false}>
      {/* Make Header */}
      <div className="p-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all ${make.isActive ? 'bg-gold-500/10 text-gold-500' : 'bg-white/5 text-white/20'}`}>
            <Car size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">{isAr ? make.nameAr : make.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{make.models.length} {isAr ? 'موديلات' : 'Models'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${make.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {make.isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Disabled')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => onInitiateUpdateMake(make)}
            disabled={loadingItems[`make_${make.id}`]}
            className={`p-3 rounded-xl border transition-all ${make.isActive ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500 hover:text-black'} disabled:opacity-50`}
          >
            {loadingItems[`make_${make.id}`] ? <Loader2 size={18} className="animate-spin" /> : (make.isActive ? <PowerOff size={18} /> : <Power size={18} />)}
          </button>
          
          <button 
            onClick={() => onToggleExpand(make.id)}
            className={`p-3 rounded-xl border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all ${isExpanded ? 'bg-white/10 text-white' : ''}`}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Models Section */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-white/5 bg-black/20"
          >
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{isAr ? 'إدارة الموديلات' : 'Models Governance'}</h4>
                <div className="flex items-center gap-3">
                  <button 
                    disabled={loadingItems[`bulk_${make.id}`]}
                    onClick={() => onInitiateToggleAll(make, true)} 
                    className="text-[9px] font-black text-green-400 uppercase tracking-tight hover:text-green-300 transition-colors disabled:opacity-50"
                  >
                    {loadingItems[`bulk_${make.id}`] ? <Loader2 size={10} className="animate-spin" /> : (isAr ? 'تفعيل الكل' : 'Enable All')}
                  </button>
                  <span className="w-1 h-1 bg-white/10 rounded-full" />
                  <button 
                    disabled={loadingItems[`bulk_${make.id}`]}
                    onClick={() => onInitiateToggleAll(make, false)} 
                    className="text-[9px] font-black text-red-400 uppercase tracking-tight hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    {loadingItems[`bulk_${make.id}`] ? <Loader2 size={10} className="animate-spin" /> : (isAr ? 'تعطيل الكل' : 'Disable All')}
                  </button>
                  <button 
                    onClick={() => onSetAddingModel(make.id)}
                    className="ml-4 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-tight transition-all"
                  >
                    <Plus size={14} />
                    {isAr ? 'موديل جديد' : 'New Model'}
                  </button>
                </div>
              </div>

              {isAddingModel && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                  className="p-6 bg-white/5 border border-white/10 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
                >
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-white/30 uppercase">{isAr ? 'اسم الموديل' : 'Model Name'}</label>
                    <input type="text" value={newModel.name} onChange={e => setNewModel({...newModel, name: e.target.value})} 
                      placeholder="Ex: Corolla" className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-gold-500/50"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-white/30 uppercase">{isAr ? 'الاسم بالعربية' : 'Arabic Name'}</label>
                    <input type="text" value={newModel.nameAr} onChange={e => setNewModel({...newModel, nameAr: e.target.value})} 
                      placeholder="مثال: كورولا" className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white text-right outline-none focus:border-gold-500/50" dir="rtl"/>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onCreateModel(make.id)}
                      disabled={isSubmitting || !newModel.name || !newModel.nameAr}
                      className="flex-grow py-2.5 bg-gold-500 text-black rounded-xl font-black text-[10px] uppercase tracking-tight shadow-lg shadow-gold-500/10 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 size={14} className="animate-spin mx-auto" /> : (isAr ? 'إضافة الموديل' : 'Add Model')}
                    </button>
                    <button onClick={() => onSetAddingModel(null)} className="p-2.5 text-white/30 hover:text-white transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {make.models.map((model: any) => (
                  <div 
                    key={model.id} 
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${model.isActive ? 'bg-white/5 border-white/5 hover:border-gold-500/30' : 'bg-red-500/5 border-red-500/10 opacity-60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Box size={14} className={model.isActive ? 'text-gold-500/50' : 'text-red-400/50'} />
                      <div className="text-[11px] font-black text-white tracking-tight">{isAr ? model.nameAr : model.name}</div>
                    </div>
                    <button 
                      disabled={loadingItems[`model_${model.id}`]}
                      onClick={() => onInitiateUpdateModel(model)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${model.isActive ? 'text-white/20 hover:text-red-400 hover:bg-red-400/10' : 'text-red-400 bg-red-400/10 hover:bg-red-400 hover:text-white'} disabled:opacity-50`}
                    >
                      {loadingItems[`model_${model.id}`] ? <Loader2 size={12} className="animate-spin" /> : (model.isActive ? <PowerOff size={14} /> : <Power size={14} />)}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
});

VehicleMakeCard.displayName = 'VehicleMakeCard';

export const VehicleCatalogManager: React.FC = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  
  const { 
    vehicleMakes, isLoadingCatalog, 
    createVehicleMake, updateVehicleMake,
    createVehicleModel, updateVehicleModel,
    toggleAllModels
  } = useAdminStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMakes, setExpandedMakes] = useState<string[]>([]);
  const [isAddingMake, setIsAddingMake] = useState(false);
  const [addingModelToMakeId, setAddingModelToMakeId] = useState<string | null>(null);
  
  const [newMake, setNewMake] = useState({ name: '', nameAr: '' });
  const [newModel, setNewModel] = useState({ name: '', nameAr: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

  // Signature Modal States
  const [signatureModal, setSignatureModal] = useState<{
    isOpen: boolean;
    type: 'MAKE' | 'MODEL' | 'BULK';
    action: boolean;
    targetId: string;
    targetName: string;
  }>({
    isOpen: false,
    type: 'MAKE',
    action: false,
    targetId: '',
    targetName: ''
  });

  const toggleExpand = (id: string) => {
    setExpandedMakes(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const filteredMakes = useMemo(() => {
    if (!searchQuery) return vehicleMakes;
    const lowerQuery = searchQuery.toLowerCase();
    return vehicleMakes.filter(m => 
      m.name.toLowerCase().includes(lowerQuery) ||
      m.nameAr.includes(searchQuery) ||
      m.models.some(mod => mod.name.toLowerCase().includes(lowerQuery) || mod.nameAr.includes(searchQuery))
    );
  }, [vehicleMakes, searchQuery]);

  const handleInitiateUpdateMake = (make: VehicleMake) => {
    setSignatureModal({
      isOpen: true,
      type: 'MAKE',
      action: !make.isActive,
      targetId: make.id,
      targetName: isAr ? make.nameAr : make.name
    });
  };

  const handleInitiateUpdateModel = (model: VehicleModel) => {
    setSignatureModal({
      isOpen: true,
      type: 'MODEL',
      action: !model.isActive,
      targetId: model.id,
      targetName: isAr ? model.nameAr : model.name
    });
  };

  const handleInitiateToggleAll = (make: VehicleMake, action: boolean) => {
    setSignatureModal({
      isOpen: true,
      type: 'BULK',
      action,
      targetId: make.id,
      targetName: isAr ? make.nameAr : make.name
    });
  };

  const handleSignatureConfirm = async (signatureData: any) => {
    const { type, action, targetId } = signatureModal;
    setSignatureModal(prev => ({ ...prev, isOpen: false }));
    
    const loadingKey = type === 'MAKE' ? `make_${targetId}` : type === 'MODEL' ? `model_${targetId}` : `bulk_${targetId}`;
    setLoadingItems(prev => ({ ...prev, [loadingKey]: true }));

    try {
      if (type === 'MAKE') {
        await updateVehicleMake(targetId, { isActive: action, signatureData });
      } else if (type === 'MODEL') {
        await updateVehicleModel(targetId, { isActive: action, signatureData });
      } else if (type === 'BULK') {
        await toggleAllModels(targetId, action, signatureData);
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoadingItems(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleCreateMake = async () => {
    if (!newMake.name || !newMake.nameAr) return;
    setIsSubmitting(true);
    if (await createVehicleMake(newMake)) {
      setNewMake({ name: '', nameAr: '' });
      setIsAddingMake(false);
    }
    setIsSubmitting(false);
  };

  const handleCreateModel = async (makeId: string) => {
    if (!newModel.name || !newModel.nameAr) return;
    setIsSubmitting(true);
    if (await createVehicleModel({ ...newModel, makeId })) {
      setNewModel({ name: '', nameAr: '' });
      setAddingModelToMakeId(null);
    }
    setIsSubmitting(false);
  };

  if (isLoadingCatalog && vehicleMakes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">{isAr ? 'جاري التحميل...' : 'Synchronizing...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-full overflow-hidden">
      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] p-6 rounded-3xl border border-white/5 shadow-inner backdrop-blur-xl">
        <div className="relative w-full md:w-96">
          <Search className={`absolute top-1/2 -translate-y-1/2 text-white/20 w-4 h-4 ${isAr ? 'right-4' : 'left-4'}`} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'البحث...' : 'Search...'}
            className={`w-full bg-black/40 border border-white/10 rounded-2xl py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-gold-500/50 transition-all ${isAr ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
          />
        </div>
        
        <button 
          onClick={() => setIsAddingMake(true)}
          className="flex items-center gap-3 px-6 py-3 bg-gold-500 text-black rounded-2xl font-black text-xs uppercase tracking-tight hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 active:scale-95"
        >
          <Plus size={18} />
          {isAr ? 'إضافة شركة' : 'Add Make'}
        </button>
      </div>

      {/* ADD MAKE FORM */}
      <AnimatePresence>
        {isAddingMake && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ opacity: 0, height: 0 }}
            className="p-8 bg-gold-500/5 border border-gold-500/20 rounded-3xl space-y-6 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase">English Name</label>
                <input type="text" value={newMake.name} onChange={e => setNewMake({...newMake, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-gold-500/50"/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase">الاسم بالعربية</label>
                <input type="text" value={newMake.nameAr} onChange={e => setNewMake({...newMake, nameAr: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white text-right outline-none focus:border-gold-500/50" dir="rtl"/>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAddingMake(false)} className="px-6 py-3 text-white/40 font-black text-[10px] uppercase">{isAr ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleCreateMake} disabled={isSubmitting || !newMake.name || !newMake.nameAr} className="px-8 py-3 bg-gold-500 text-black rounded-xl font-black text-[10px] uppercase disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (isAr ? 'حفظ' : 'Save')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAKES LIST */}
      <div className="grid grid-cols-1 gap-6 pb-20">
        {filteredMakes.map((make) => (
          <VehicleMakeCard 
            key={make.id}
            make={make}
            isAr={isAr}
            isExpanded={expandedMakes.includes(make.id)}
            onToggleExpand={toggleExpand}
            onInitiateUpdateMake={handleInitiateUpdateMake}
            onInitiateToggleAll={handleInitiateToggleAll}
            onSetAddingModel={setAddingModelToMakeId}
            isAddingModel={addingModelToMakeId === make.id}
            newModel={newModel}
            setNewModel={setNewModel}
            onCreateModel={handleCreateModel}
            isSubmitting={isSubmitting}
            onInitiateUpdateModel={handleInitiateUpdateModel}
            loadingItems={loadingItems}
          />
        ))}
        
        {filteredMakes.length === 0 && (
          <div className="py-20 text-center opacity-20 text-xs font-black uppercase tracking-[0.4em]">
            {isAr ? 'لا توجد نتائج' : 'No Results Found'}
          </div>
        )}
      </div>

      {/* Audit Signature Modal */}
      <AdminSignatureModal 
        isOpen={signatureModal.isOpen}
        onClose={() => setSignatureModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleSignatureConfirm}
        actionType={signatureModal.action ? 'APPROVE' : 'REJECT'}
        title={isAr ? `تأكيد تغيير حالة ${signatureModal.targetName}` : `Confirm status change for ${signatureModal.targetName}`}
      />
    </div>
  );
};
