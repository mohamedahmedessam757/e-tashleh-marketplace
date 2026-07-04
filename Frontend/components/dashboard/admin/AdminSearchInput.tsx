import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

interface AdminSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export const AdminSearchInput: React.FC<AdminSearchInputProps> = ({
  value,
  onChange,
  placeholder,
  debounceMs = 400,
  className = '',
}) => {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [local, debounceMs, onChange, value]);

  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="absolute top-1/2 -translate-y-1/2 start-3 text-white/30 pointer-events-none"
      />
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-full ps-10 pe-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold-500/40 transition-colors"
      />
    </div>
  );
};
