
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  guestTranslations,
  loadDashboardTranslations,
  type TranslationTree,
  type Language,
} from '../data/translations';
import { loadTermsContent } from '../data/loadTermsContent';
import { loadPrivacyContent } from '../data/loadLegalContent';
import { getCurrentUserId } from '../utils/auth';
import { loadExtendedFonts } from '../utils/loadExtendedFonts';

const GUEST_LANGUAGE_KEY = 'preferred_language';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: TranslationTree;
  dir: 'rtl' | 'ltr';
  ensureDashboardTranslations: () => Promise<void>;
  ensureLegalTerms: () => Promise<void>;
  ensureLegalContent: () => Promise<void>;
  ensureLegalPrivacy: () => Promise<void>;
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

function isDashboardPath(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard');
}

async function persistLanguageToProfile(lang: Language): Promise<void> {
  if (!getCurrentUserId()) return;
  const { useProfileStore } = await import('../stores/useProfileStore');
  useProfileStore.getState().updateSettings({ language: lang });
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => readGuestLanguage() ?? 'ar');
  const [t, setT] = useState<TranslationTree>(() => ({
    ...guestTranslations[readGuestLanguage() ?? 'ar'],
    admin: {} as TranslationTree['admin'],
    dashboard: {} as TranslationTree['dashboard'],
  }));

  const persistLanguage = useCallback((lang: Language) => {
    writeGuestLanguage(lang);
    void persistLanguageToProfile(lang);
  }, []);

  const ensureDashboardTranslations = useCallback(async () => {
    const full = await loadDashboardTranslations(language);
    setT(full);
  }, [language]);

  const ensureLegalTerms = useCallback(async () => {
    if (t.legal?.termsContent?.length) return;
    const termsContent = await loadTermsContent(language);
    setT((prev) => ({
      ...prev,
      legal: {
        ...prev.legal,
        termsContent,
      },
    }));
  }, [language, t.legal?.termsContent?.length]);

  const ensureLegalPrivacy = useCallback(async () => {
    if (t.legal?.privacyContent?.length) return;
    const privacyContent = await loadPrivacyContent(language);
    setT((prev) => ({
      ...prev,
      legal: {
        ...prev.legal,
        privacyContent,
      },
    }));
  }, [language, t.legal?.privacyContent?.length]);

  const ensureLegalContent = useCallback(async () => {
    const needsPrivacy = !t.legal?.privacyContent?.length;
    const needsTerms = !t.legal?.termsContent?.length;
    if (!needsPrivacy && !needsTerms) return;

    const [privacyContent, termsContent] = await Promise.all([
      needsPrivacy ? loadPrivacyContent(language) : Promise.resolve(t.legal.privacyContent),
      needsTerms ? loadTermsContent(language) : Promise.resolve(t.legal.termsContent),
    ]);

    setT((prev) => ({
      ...prev,
      legal: {
        ...prev.legal,
        privacyContent,
        termsContent,
      },
    }));
  }, [
    language,
    t.legal?.privacyContent?.length,
    t.legal?.termsContent?.length,
    t.legal.privacyContent,
    t.legal.termsContent,
  ]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    persistLanguage(lang);
  }, [persistLanguage]);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar';
      writeGuestLanguage(next);
      void persistLanguageToProfile(next);
      return next;
    });
  }, []);

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  useEffect(() => {
    if (language === 'en') {
      loadExtendedFonts();
      return;
    }

    if (typeof window === 'undefined') return;

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => loadExtendedFonts(), { timeout: 5000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(() => loadExtendedFonts(), 4000);
    return () => clearTimeout(timeoutId);
  }, [language]);

  useEffect(() => {
    if (isDashboardPath()) {
      void ensureDashboardTranslations();
      return;
    }
    setT({
      ...guestTranslations[language],
      admin: {} as TranslationTree['admin'],
      dashboard: {} as TranslationTree['dashboard'],
    });
  }, [language, ensureDashboardTranslations]);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;

    let unsub: (() => void) | undefined;

    void (async () => {
      const { useProfileStore } = await import('../stores/useProfileStore');

      const syncFromProfile = (settings: { language?: Language }) => {
        if (settings.language === 'ar' || settings.language === 'en') {
          setLanguageState(settings.language);
          writeGuestLanguage(settings.language);
        }
      };

      syncFromProfile(useProfileStore.getState().settings);

      unsub = useProfileStore.subscribe((state, prev) => {
        if (state.settings.language !== prev.settings.language) {
          syncFromProfile(state.settings);
        }
      });
    })();

    return () => unsub?.();
  }, []);

  return (
    <LanguageContext.Provider
      value={{ language, toggleLanguage, setLanguage, t, dir, ensureDashboardTranslations, ensureLegalTerms, ensureLegalContent, ensureLegalPrivacy }}
    >
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
