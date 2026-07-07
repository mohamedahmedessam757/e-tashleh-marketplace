import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';

interface Announcement {
  id: string;
  titleAr?: string | null;
  titleEn?: string | null;
  bodyAr?: string | null;
  bodyEn?: string | null;
}

interface PolicyChangeBannerProps {
  audience?: 'CUSTOMER' | 'VENDOR' | 'ALL';
}

export const PolicyChangeBanner: React.FC<PolicyChangeBannerProps> = ({ audience = 'ALL' }) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('dismissed_announcements');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    fetch(`${API_URL}/platform-announcements/active?audience=${audience}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]));
  }, [audience]);

  const visible = useMemo(
    () => items.filter((a) => !dismissed.has(a.id)),
    [items, dismissed],
  );

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem('dismissed_announcements', JSON.stringify([...next]));
  };

  if (!visible.length) return null;

  return (
    <div className="space-y-3 mb-4">
      <AnimatePresence>
        {visible.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-4 pr-12 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-amber-500/20 p-2 text-amber-400">
                <Bell size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  {isAr ? a.titleAr || a.titleEn : a.titleEn || a.titleAr}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-white/70">
                  {isAr ? a.bodyAr || a.bodyEn : a.bodyEn || a.bodyAr}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(a.id)}
              className="absolute top-3 end-3 rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
