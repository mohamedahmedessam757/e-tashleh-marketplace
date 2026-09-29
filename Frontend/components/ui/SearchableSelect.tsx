import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Extra strings the search should match (e.g. the other-language name). */
  keywords?: string[];
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  noResultsText: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  hasError?: boolean;
  isRTL: boolean;
  ariaLabel?: string;
}

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u0640]/g;

export const normalizeSearchText = (text: string): string =>
  text
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\s\-_.]+/g, '')
    .trim();

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  noResultsText,
  icon,
  disabled = false,
  hasError = false,
  isRTL,
  ariaLabel,
}) => {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const searchIndex = useMemo(
    () =>
      options.map((o) => ({
        option: o,
        haystack: [o.label, o.value, ...(o.keywords || [])].map(normalizeSearchText),
      })),
    [options],
  );

  const filtered = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!q) return options;
    const startsWith: SearchableSelectOption[] = [];
    const contains: SearchableSelectOption[] = [];
    for (const { option, haystack } of searchIndex) {
      if (haystack.some((h) => h.startsWith(q))) startsWith.push(option);
      else if (haystack.some((h) => h.includes(q))) contains.push(option);
    }
    return [...startsWith, ...contains];
  }, [query, options, searchIndex]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const openList = () => {
    if (disabled) return;
    setOpen(true);
  };

  const choose = (option: SearchableSelectOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) return openList();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter': {
        const option = filtered[Math.min(activeIndex, filtered.length - 1)];
        if (open && option) {
          e.preventDefault();
          choose(option);
        }
        break;
      }
      case 'Escape':
        if (open) {
          e.preventDefault();
          setOpen(false);
          setQuery('');
        }
        break;
      case 'Tab':
        setOpen(false);
        setQuery('');
        break;
    }
  };

  const borderCls = hasError
    ? 'border-red-500 ring-2 ring-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
    : open
      ? 'border-gold-500 ring-1 ring-gold-500'
      : 'border-white/10';

  return (
    <div ref={rootRef} className="relative">
      {icon && (
        <span
          className={`absolute top-3.5 text-gold-500 pointer-events-none z-10 ${isRTL ? 'right-3.5' : 'left-3.5'}`}
          aria-hidden
        >
          {open ? <Search className="w-5 h-5" /> : icon}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
        autoComplete="off"
        disabled={disabled}
        value={open ? query : selected?.label ?? ''}
        placeholder={open && selected ? selected.label : placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          if (!open) setOpen(true);
        }}
        onFocus={openList}
        onClick={openList}
        onKeyDown={handleKeyDown}
        className={`w-full bg-white/5 border rounded-xl py-3 text-white placeholder:text-white/40 outline-none transition-all ${borderCls} ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-hidden
        onClick={() => {
          if (open) {
            setOpen(false);
            setQuery('');
          } else {
            inputRef.current?.focus();
          }
        }}
        className={`absolute top-0 h-full px-3 flex items-center text-white/40 hover:text-white/70 ${isRTL ? 'left-0' : 'right-0'}`}
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-gold-500/30 bg-[#1A1814] shadow-2xl py-1 custom-scrollbar"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-white/50 text-center">{noResultsText}</li>
          ) : (
            filtered.map((option, i) => {
              const isSelected = option.value === value;
              const isActive = i === activeIndex;
              return (
                <li
                  key={option.value}
                  id={`${listboxId}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => choose(option)}
                  onMouseMove={() => {
                    if (!isActive) setActiveIndex(i);
                  }}
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors text-start ${
                    isActive ? 'bg-gold-500/15 text-white' : 'text-white/80'
                  } ${isSelected ? 'font-bold text-gold-400' : ''}`}
                >
                  {option.label}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableSelect;
