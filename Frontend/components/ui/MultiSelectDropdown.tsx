import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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

const PREVIEW_CHIP_COUNT = 4;

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
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isMobile && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen, isMobile]);

  const filteredItems = items.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.nameAr.toLowerCase().includes(searchLower)
    );
  });

  const selected = selectedItems ?? [];
  const allSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selected.includes(item.id));

  const previewIds = useMemo(() => selected.slice(0, PREVIEW_CHIP_COUNT), [selected]);
  const extraCount = Math.max(0, selected.length - PREVIEW_CHIP_COUNT);

  const toggleAll = () => {
    if (allSelected) {
      const newSelected = selected.filter((id) => !filteredItems.find((i) => i.id === id));
      onChange(newSelected);
    } else {
      const newSelected = new Set([...selected, ...filteredItems.map((i) => i.id)]);
      onChange(Array.from(newSelected));
    }
  };

  const toggleItem = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const removeTag = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== id));
  };

  const getDisplayName = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return id;
    return isAr ? item.nameAr : item.name;
  };

  const panelBody = (
    <>
      <div className="p-3 border-b border-white/10 bg-white/5 shrink-0">
        <div className="relative min-w-0">
          <Search
            size={16}
            className="absolute top-3.5 start-3 text-white/40 pointer-events-none"
          />
          <input
            type="text"
            placeholder={searchPlaceholder || (isAr ? 'بحث...' : 'Search...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg py-3 min-h-[44px] ps-9 pe-4 text-sm text-white focus:border-gold-500 outline-none transition-colors"
            autoFocus
          />
        </div>
      </div>

      <div className="overflow-y-auto overflow-x-hidden flex-1 scrollbar-thin scrollbar-thumb-white/10 p-2 space-y-1 overscroll-contain">
        {filteredItems.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="w-full flex items-center justify-between p-3 min-h-[44px] rounded-lg hover:bg-white/5 transition-colors text-sm text-gold-400 font-medium mb-2 border-b border-white/5 pb-3"
          >
            <span>
              {allSelected
                ? isAr
                  ? 'إلغاء تحديد الكل'
                  : 'Deselect All'
                : isAr
                  ? 'تحديد الكل'
                  : 'Select All'}
            </span>
            {allSelected && <Check size={16} />}
          </button>
        )}

        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-white/40 text-sm">
            {isAr ? 'لا توجد نتائج مطابقة' : 'No matching results found.'}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={(e) => toggleItem(item.id, e)}
                className="w-full flex items-center justify-between p-3 min-h-[44px] rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all flex-shrink-0 ${
                      isSelected
                        ? 'bg-gold-500 border-gold-500 text-black'
                        : 'border-white/20 group-hover:border-white/40 bg-black/20'
                    }`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div className="flex flex-col text-start min-w-0">
                    <span
                      className={`text-sm truncate transition-colors ${isSelected ? 'text-white font-medium' : 'text-white/70'}`}
                    >
                      {isAr ? item.nameAr : item.name}
                    </span>
                    {item.subtext && (
                      <span className="text-[10px] text-white/40 truncate">{item.subtext}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {onCustomValueChange && (
        <div className="p-3 border-t border-white/10 bg-white/5 shrink-0">
          <label className="text-xs text-white/50 mb-1 block">
            {language === 'ar' ? 'غير موجود في القائمة؟' : 'Not in the list?'}
          </label>
          <input
            type="text"
            placeholder={
              customInputPlaceholder ||
              (isAr ? 'اكتب إضافة مخصصة (أخرى)...' : 'Type custom value (Other)...')
            }
            value={customValue || ''}
            onChange={(e) => onCustomValueChange(e.target.value)}
            disabled={disabled}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-gold-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      )}
    </>
  );

  return (
    <div className={`w-full relative ${isOpen ? 'z-[100]' : 'z-0'}`} ref={dropdownRef}>
      <label className="block text-sm font-medium text-gold-200 mb-2">{label}</label>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          className={`w-full min-h-[56px] bg-white/5 border rounded-xl px-4 py-2.5 flex items-center gap-2 transition-all text-start ${
            disabled
              ? 'opacity-50 cursor-not-allowed border-transparent'
              : 'cursor-pointer'
          } ${
            isOpen && !disabled
              ? 'border-gold-500 bg-white/10 ring-2 ring-gold-500/20'
              : hasError
                ? 'border-red-500 ring-2 ring-red-500/50 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                : 'border-white/10 hover:bg-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
            {selected.length === 0 ? (
              <span className="text-white/40 py-1.5">
                {placeholder || (isAr ? 'اختر...' : 'Select...')}
              </span>
            ) : isMobile ? (
              <span className="text-sm font-bold text-white/80 py-1.5">
                {isAr
                  ? `${selected.length} محدد`
                  : `${selected.length} selected`}
              </span>
            ) : (
              <>
                {previewIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 max-w-[9rem] bg-gold-500/10 border border-gold-500/30 text-gold-300 px-2 py-1 rounded-md text-xs font-medium"
                  >
                    <span className="truncate">{getDisplayName(id)}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => removeTag(id, e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') removeTag(id, e as any);
                      }}
                      className="hover:text-gold-200 focus:outline-none shrink-0"
                    >
                      <X size={12} />
                    </span>
                  </span>
                ))}
                {extraCount > 0 && (
                  <span className="text-[10px] font-black text-gold-500/80 px-2 py-1 rounded-md bg-gold-500/5 border border-gold-500/20">
                    +{extraCount}
                  </span>
                )}
              </>
            )}
          </div>
          <ChevronDown
            size={20}
            className={`text-white/40 shrink-0 ms-auto transition-transform duration-300 ${isOpen ? 'rotate-180 text-gold-500' : ''}`}
          />
        </button>

        {/* Horizontal chip strip on mobile (summary under trigger) */}
        {isMobile && selected.length > 0 && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {previewIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 shrink-0 max-w-[8rem] bg-gold-500/10 border border-gold-500/30 text-gold-300 px-2 py-1 rounded-md text-xs font-medium"
              >
                <span className="truncate">{getDisplayName(id)}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => removeTag(id, e)}
                    className="hover:text-gold-200 shrink-0"
                    aria-label={isAr ? 'إزالة' : 'Remove'}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="shrink-0 text-[10px] font-black text-gold-500/80 px-2 py-1 rounded-md bg-gold-500/5 border border-gold-500/20 self-center">
                +{extraCount}
              </span>
            )}
          </div>
        )}

        <AnimatePresence>
          {isOpen && !disabled && !isMobile && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute z-[100] w-full top-full inset-inline-start-0 mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl max-h-[min(60vh,420px)] flex flex-col"
            >
              {panelBody}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && !disabled && isMobile && (
              <div className="fixed inset-0 z-[9999] flex items-end justify-center isolate">
                <motion.button
                  type="button"
                  aria-label="Close"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  onClick={() => setIsOpen(false)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  className="relative z-10 w-full max-h-[85vh] bg-[#12100E] border border-white/10 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                >
                  <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10 shrink-0">
                    <h3 className="text-base font-black text-white truncate min-w-0">{label}</h3>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 min-h-[44px] rounded-xl bg-gold-500 text-black font-black text-sm shrink-0"
                    >
                      {isAr ? 'تم' : 'Done'}
                    </button>
                  </div>
                  {panelBody}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {customValue && !isOpen && (
        <div className="mt-2 text-xs text-white/60 flex items-center gap-1">
          <span className="text-gold-500/50">+</span> {customValue}
        </div>
      )}
    </div>
  );
};
