import type { Language } from './translations';
import { loadTermsContent, type TermsSection } from './loadTermsContent';
import type { LegalSection } from './locales/legal-privacy';

const privacyCache: Partial<Record<Language, LegalSection[]>> = {};

export async function loadPrivacyContent(lang: Language): Promise<LegalSection[]> {
  if (privacyCache[lang]) return privacyCache[lang]!;

  const mod = await import('./locales/legal-privacy');
  privacyCache[lang] = mod.legalPrivacy[lang];
  return privacyCache[lang]!;
}

export async function loadLegalContent(lang: Language): Promise<{
  privacyContent: LegalSection[];
  termsContent: TermsSection[];
}> {
  const [privacyContent, termsContent] = await Promise.all([
    loadPrivacyContent(lang),
    loadTermsContent(lang),
  ]);
  return { privacyContent, termsContent };
}
