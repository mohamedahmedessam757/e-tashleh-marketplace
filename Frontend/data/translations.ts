import { common } from './locales/common';
import { auth } from './locales/auth';
import { guestLanding } from './locales/guest-landing';
import { loadTermsContent, type TermsSection } from './loadTermsContent';
import type { LegalSection } from './locales/legal-privacy';
import type { admin as adminLocales } from './locales/admin';
import type { customer as customerLocales } from './locales/customer';
import type { merchant as merchantLocales } from './locales/merchant';

export type Language = 'ar' | 'en';

function buildGuest(lang: Language) {
  const landing = guestLanding[lang];
  return {
    common: common[lang],
    ...landing,
    legal: {
      ...landing.legal,
      privacyContent: [] as LegalSection[],
      termsContent: [] as TermsSection[],
    },
    auth: auth[lang].authSection,
  };
}

/** Lightweight bundle for landing/auth — dashboard locales load on demand */
export const guestTranslations = {
  ar: buildGuest('ar'),
  en: buildGuest('en'),
} as const;

export type GuestTranslationTree = (typeof guestTranslations)['ar'];

export type TranslationTree = GuestTranslationTree & {
  admin: (typeof adminLocales)['ar'];
  dashboard: (typeof customerLocales)['ar'] & {
    merchant: (typeof merchantLocales)['ar'];
  };
};

const dashboardCache: Partial<Record<Language, TranslationTree>> = {};

export async function loadDashboardTranslations(lang: Language): Promise<TranslationTree> {
  if (dashboardCache[lang]) return dashboardCache[lang]!;

  const [adminMod, customerMod, merchantMod, termsContent] = await Promise.all([
    import('./locales/admin'),
    import('./locales/customer'),
    import('./locales/merchant'),
    loadTermsContent(lang),
  ]);

  const guest = buildGuest(lang);
  const full = {
    ...guest,
    legal: {
      ...guest.legal,
      termsContent,
    },
    admin: adminMod.admin[lang],
    dashboard: {
      ...customerMod.customer[lang],
      merchant: merchantMod.merchant[lang],
    },
  } as TranslationTree;

  dashboardCache[lang] = full;
  return full;
}

/** @deprecated Use guestTranslations + loadDashboardTranslations */
export const translations = {
  get ar() {
    return dashboardCache.ar ?? ({ ...guestTranslations.ar, admin: {}, dashboard: {} } as TranslationTree);
  },
  get en() {
    return dashboardCache.en ?? ({ ...guestTranslations.en, admin: {}, dashboard: {} } as TranslationTree);
  },
};
