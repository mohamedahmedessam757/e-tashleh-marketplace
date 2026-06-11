
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Building2, Loader2, X, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { GlassCard } from './GlassCard';

export interface SearchResult {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: 'CUSTOMER' | 'MERCHANT';
  storeCode?: string;
}

interface EntitySearchInputProps {
  onSelect: (result: SearchResult | null) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
  error?: boolean;
}

export const EntitySearchInput: React.FC<EntitySearchInputProps> = ({ 
  onSelect, 
  placeholder, 
  className = '', 
  initialValue = '',
  error = false 
}) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<SearchResult | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search logic
  useEffect(() => {
    if (query.length < 2 || selectedEntity) {
      setResults([]);
      if (!selectedEntity) setShowDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      setShowDropdown(true);
      try {
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('token');
        // Correcting API URL: Remove /api suffix and use Vite env variable
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        const response = await fetch(`${baseUrl}/users/admin/search?q=${encodeURIComponent(query)}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept-Language': language 
          }
        });

        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (err) {
        console.error('[EntitySearch] Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, selectedEntity, language]);

  const handleSelect = (entity: SearchResult) => {
    setSelectedEntity(entity);
    setQuery(entity.name);
    setShowDropdown(false);
    onSelect(entity);
  };

  const handleClear = () => {
    setSelectedEntity(null);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    onSelect(null);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {/* Input Field */}
      <div className="relative group">
        <div className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'} text-white/20 group-focus-within:text-gold-500 transition-colors`}>
          {isLoading ? <Loader2 size={18} className="animate-spin text-gold-500" /> : <Search size={18} />}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selectedEntity) {
              setSelectedEntity(null);
              onSelect(null);
            }
          }}
          onFocus={() => query.length >= 2 && !selectedEntity && setShowDropdown(true)}
          placeholder={placeholder || (isAr ? 'ابحث بالاسم أو البريد...' : 'Search by name or email...')}
          className={`
            w-full bg-white/[0.03] border rounded-2xl py-4 
            ${isAr ? 'pr-12 pl-12' : 'pl-12 pr-12'} 
            text-sm text-white placeholder:text-white/20 outline-none transition-all
            ${error ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-white/5 focus:border-gold-500/40 focus:bg-white/[0.05]'}
            ${selectedEntity ? 'border-gold-500/30 bg-gold-500/[0.02]' : ''}
          `}
        />

        {/* Action Buttons (Clear / Selected Check) */}
        <div className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-4' : 'right-4'} flex items-center gap-2`}>
          {selectedEntity && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-500">
              <Check size={18} />
            </motion.div>
          )}
          {query && (
            <button 
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className={`absolute top-full mt-2 z-[60] w-[140%] min-w-[350px] max-w-[450px] ${isAr ? 'right-0' : 'left-0'}`}
          >
            <GlassCard className="overflow-hidden border-white/10 shadow-2xl bg-[#1A1814]/95 backdrop-blur-2xl max-h-[350px] overflow-y-auto custom-scrollbar">
              {results.length > 0 ? (
                <div className="p-2 space-y-1">
                  {results.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => handleSelect(res)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-all text-start group"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 ${res.type === 'MERCHANT' ? 'bg-gold-500/10 text-gold-500' : 'bg-blue-500/10 text-blue-400'}`}>
                        {res.type === 'MERCHANT' ? <Building2 size={20} /> : <User size={20} />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-black text-white truncate group-hover:text-gold-400 transition-colors">{res.name}</p>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border ${res.type === 'MERCHANT' ? 'bg-gold-500/10 text-gold-500 border-gold-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                            {res.type === 'MERCHANT' ? (isAr ? 'تاجر' : 'Merchant') : (isAr ? 'عميل' : 'Customer')}
                          </span>
                        </div>
                        {res.email && (
                          <p className="text-[10px] text-white/40 truncate mt-0.5 font-medium">{res.email}</p>
                        )}
                        {res.storeCode && (
                          <p className="text-[9px] text-gold-500/40 font-mono mt-1 font-bold">{res.storeCode}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : !isLoading && query.length >= 2 ? (
                <div className="p-10 text-center space-y-3 opacity-40">
                  <Search size={32} className="mx-auto text-white/20" />
                  <p className="text-xs font-bold uppercase tracking-widest">
                    {isAr ? 'لا توجد نتائج تطابق بحثك' : 'No results matching your search'}
                  </p>
                </div>
              ) : isLoading && (
                <div className="p-10 text-center">
                  <Loader2 size={24} className="animate-spin text-gold-500 mx-auto" />
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
