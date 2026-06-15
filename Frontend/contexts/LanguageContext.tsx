
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '../data/translations';
import { useProfileStore } from '../stores/useProfileStore';
import { getCurrentUserId } from '../utils/auth';

type Language = 'ar' | 'en';

const GUEST_LANGUAGE_KEY = 'preferred_language';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: typeof translations.ar;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function readGuestLanguage(): Language | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(GUEST_LANGUAGE_KEY);
  return stored === 'ar' || stored === 'en' ? stored : null;
}

function writeGuestLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_LANGUAGE_KEY, lang);
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => readGuestLanguage() ?? 'ar');

  const persistLanguage = useCallback((lang: Language) => {
    writeGuestLanguage(lang);
    if (!getCurrentUserId()) return;
    useProfileStore.getState().updateSettings({ language: lang });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    persistLanguage(lang);
  }, [persistLanguage]);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar';
      writeGuestLanguage(next);
      if (getCurrentUserId()) {
        useProfileStore.getState().updateSettings({ language: next });
      }
      return next;
    });
  }, []);

  const t = translations[language];
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  useEffect(() => {
    const syncFromProfile = (settings: { language?: Language }) => {
      if (settings.language === 'ar' || settings.language === 'en') {
        setLanguageState(settings.language);
        writeGuestLanguage(settings.language);
      }
    };

    syncFromProfile(useProfileStore.getState().settings);

    const unsub = useProfileStore.subscribe((state, prev) => {
      if (state.settings.language !== prev.settings.language) {
        syncFromProfile(state.settings);
      }
    });

    return unsub;
  }, []);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
