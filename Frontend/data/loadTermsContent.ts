export type Language = 'ar' | 'en';

export type TermsSection = { title: string; content: string[] };

const termsCache: Partial<Record<Language, TermsSection[]>> = {};

export async function loadTermsContent(lang: Language): Promise<TermsSection[]> {
  if (termsCache[lang]) return termsCache[lang]!;

  const mod = await import('./customerTerms');
  const content = lang === 'ar' ? mod.customerTermsAr : mod.customerTermsEn;
  termsCache[lang] = content;
  return content;
}
