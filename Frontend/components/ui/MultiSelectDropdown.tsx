import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface MultiSelectDropdownProps {
  label: string;
  items: { id: string; name: string; nameAr: string; subtext?: string }[];
  selectedItems: string[];
  onChange: (selected: string[]) => void;
  customValue?: string;
  onCustomValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  customInputPlaceholder?: string;
  hasError?: boolean;
  disabled?: boolean;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  items,
  selectedItems,
  onChange,
  customValue,
  onCustomValueChange,
  placeholder,
  searchPlaceholder,
  customInputPlaceholder,
  hasError = false,
  disabled = false,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  const filteredItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.nameAr.toLowerCase().includes(searchLower)
    );
  });

  const allSelected = filteredItems.length > 0 && filteredItems.every(item => (selectedItems ?? []).includes(item.id));

  const toggleAll = () => {
    if (allSelected) {
      // Deselect all currently filtered visible items
      const newSelected = selectedItems.filter(id => !filteredItems.find(i => i.id === id));
      onChange(newSelected);
    } else {
      // Select all filtered visible items
      const newSelected = new Set([...selectedItems, ...filteredItems.map(i => i.id)]);
      onChange(Array.from(newSelected));
    }
  };

  const toggleItem = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault(); // crucial to prevent form submission or focus loss if inside label
      e.stopPropagation();
    }
    if ((selectedItems ?? []).includes(id)) {
      onChange((selectedItems ?? []).filter(item => item !== id));
    } else {
      onChange([...(selectedItems ?? []), id]);
    }
  };

  const removeTag = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange((selectedItems ?? []).filter(item => item !== id));
  };

  const getDisplayName = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return id;
    return isAr ? item.nameAr : item.name;
  };

  return (
    <div className={`w-full relative ${isOpen ? 'z-[100]' : 'z-0'}`} ref={dropdownRef}>
      <label className="block text-sm font-medium text-gold-200 mb-2">{label}</label>

      <div className="relative">
        {/* Main Trigger Button */}
        <div
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          className={`w-full min-h-[56px] bg-white/5 border rounded-xl px-4 py-2 flex flex-wrap items-center gap-2 transition-all ${
            disabled
              ? 'opacity-50 cursor-not-allowed border-transparent'
              : 'cursor-pointer'
          } ${
            isOpen && !disabled ? 'border-gold-500 bg-white/10 ring-2 ring-gold-500/20' : 
            hasError ? 'border-red-500 ring-2 ring-red-500/50 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 
            'border-white/10 hover:bg-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex-1 flex flex-wrap items-center gap-2">
            {(selectedItems ?? []).length === 0 ? (
              <span className="text-white/40 py-1.5">{placeholder || (isAr ? 'اختر...' : 'Select...')}</span>
            ) : (
              (selectedItems ?? []).map(id => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-300 px-2 py-1 rounded-md text-xs font-medium"
                >
                  {getDisplayName(id)}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={(e) => removeTag(id, e)}
                    className="hover:text-gold-200 focus:outline-none disabled:pointer-events-none"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            )}
          </div>
          <ChevronDown
            size={20}
            className={`text-white/40 justify-self-end flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-gold-500' : ''}`}
          />
        </div>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && !disabled && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute z-[100] w-full top-full left-0 mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl"
              style={{ maxHeight: '400px', display: 'flex', flexDirection: 'column' }}
            >
              {/* Search Header */}
              <div className="p-3 border-b border-white/10 bg-white/5">
                <div className="relative">
                  <Search size={16} className={`absolute top-3 ${isAr ? 'right-3' : 'left-3'} text-white/40`} />
                  <input
                    type="text"
                    placeholder={searchPlaceholder || (isAr ? 'بحث...' : 'Search...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full bg-black/40 border border-white/10 rounded-lg py-2.5 ${isAr ? 'pr-9 pl-4' : 'pl-9 pr-4'} text-sm text-white focus:border-gold-500 outline-none transition-colors`}
                    autoFocus
                  />
                </div>
              </div>

              {/* List Body */}
              <div className="overflow-y-auto overflow-x-hidden flex-1 scrollbar-thin scrollbar-thumb-white/10 p-2 space-y-1">
                {filteredItems.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors text-sm text-gold-400 font-medium mb-2 border-b border-white/5 pb-3"
                  >
                    <span>{allSelected ? (isAr ? 'إلغاء تحديد الكل' : 'Deselect All') : (isAr ? 'تحديد الكل' : 'Select All')}</span>
                    {allSelected && <Check size={16} />}
                  </button>
                )}

                {filteredItems.length === 0 ? (
                  <div className="p-4 text-center text-white/40 text-sm">
                    {isAr ? 'لا توجد نتائج مطابقة' : 'No matching results found.'}
                  </div>
                ) : (
                  filteredItems.map(item => {
                    const isSelected = (selectedItems ?? []).includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={(e) => toggleItem(item.id, e)}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all flex-shrink-0 ${
                            isSelected ? 'bg-gold-500 border-gold-500 text-black' : 'border-white/20 group-hover:border-white/40 bg-black/20'
                          }`}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                          <div className="flex flex-col text-start">
                             <span className={`text-sm transition-colors ${isSelected ? 'text-white font-medium' : 'text-white/70'}`}>
                               {isAr ? item.nameAr : item.name}
                             </span>
                             {item.subtext && (
                                 <span className="text-[10px] text-white/40">{item.subtext}</span>
                             )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer / Custom Input Area */}
              {onCustomValueChange && (
                <div className="p-3 border-t border-white/10 bg-white/5">
                  <label className="text-xs text-white/50 mb-1 block">
                      {language === 'ar' ? 'غير موجود في القائمة؟' : 'Not in the list?'}
                  </label>
                  <input
                    type="text"
                    placeholder={customInputPlaceholder || (isAr ? 'اكتب إضافة مخصصة (أخرى)...' : 'Type custom value (Other)...')}
                    value={customValue || ''}
                    onChange={(e) => onCustomValueChange(e.target.value)}
                    disabled={disabled}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-gold-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom value display outside dropdown if it exists */}
      {customValue && !isOpen && (
         <div className="mt-2 text-xs text-white/60 flex items-center gap-1">
            <span className="text-gold-500/50">+</span> {customValue}
         </div>
      )}
    </div>
  );
};
