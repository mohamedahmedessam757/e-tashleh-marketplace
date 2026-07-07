import { guestLanding } from '../data/locales/guest-landing';
import { legalPrivacy } from '../data/locales/legal-privacy';
import { common } from '../data/locales/common';
import { customerTermsAr } from '../data/customerTerms';
import { customerTermsEn } from '../data/customerTerms';

type Section = { title: string; content: string | string[] };

function formatSections(sections: Section[]): string {
  return sections
    .map((s) => {
      const lines = Array.isArray(s.content) ? s.content : [s.content];
      return `## ${s.title}\n${lines.map((l) => `• ${l.replace(/^•\s*/, '')}`).join('\n')}`;
    })
    .join('\n\n');
}

function pickTerms(keywords: string[]): { ar: string; en: string } {
  const match = (sections: Section[], words: string[]) =>
    sections.filter((s) => words.some((w) => s.title.toLowerCase().includes(w.toLowerCase())));
  const ar = match(customerTermsAr as Section[], keywords);
  const en = match(customerTermsEn as Section[], keywords);
  return { ar: formatSections(ar), en: formatSections(en) };
}

export function getStaticPageFallback(slug: string): {
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
} | null {
  const arAbout = guestLanding.ar.about;
  const enAbout = guestLanding.en.about;

  switch (slug) {
    case 'about':
      return {
        titleAr: arAbout.title,
        titleEn: enAbout.title,
        contentAr: [arAbout.companyName, arAbout.description, arAbout.missionDesc1, arAbout.missionDesc2].join('\n\n'),
        contentEn: [enAbout.companyName, enAbout.description, enAbout.missionDesc1, enAbout.missionDesc2].join('\n\n'),
      };
    case 'terms': {
      return {
        titleAr: 'الشروط والأحكام',
        titleEn: 'Terms & Conditions',
        contentAr: formatSections(customerTermsAr as Section[]),
        contentEn: formatSections(customerTermsEn as Section[]),
      };
    }
    case 'privacy':
      return {
        titleAr: 'سياسة الخصوصية',
        titleEn: 'Privacy Policy',
        contentAr: formatSections(legalPrivacy.ar as Section[]),
        contentEn: formatSections(legalPrivacy.en as Section[]),
      };
    case 'return-policy': {
      const t = pickTerms(['إرجاع', 'استرجاع', 'return', 'refund']);
      return {
        titleAr: 'سياسة الإرجاع والاستبدال',
        titleEn: 'Return & Refund Policy',
        contentAr: t.ar || formatSections(customerTermsAr as Section[]),
        contentEn: t.en || formatSections(customerTermsEn as Section[]),
      };
    }
    case 'payment-policy': {
      const t = pickTerms(['دفع', 'payment', 'رسوم']);
      return {
        titleAr: 'سياسة الدفع',
        titleEn: 'Payment Policy',
        contentAr: t.ar,
        contentEn: t.en,
      };
    }
    case 'shipping-policy': {
      const t = pickTerms(['شحن', 'shipping', 'توصيل']);
      return {
        titleAr: 'سياسة الشحن',
        titleEn: 'Shipping Policy',
        contentAr: t.ar,
        contentEn: t.en,
      };
    }
    case 'loyalty-policy':
      return {
        titleAr: 'سياسة برنامج الولاء',
        titleEn: 'Loyalty Program Policy',
        contentAr: [
          common.ar.loyaltySystem.title,
          common.ar.loyaltySystem.subtitle,
          common.ar.loyaltySystem.first.title,
          common.ar.loyaltySystem.second.title,
        ].join('\n\n'),
        contentEn: [
          common.en.loyaltySystem.title,
          common.en.loyaltySystem.subtitle,
          common.en.loyaltySystem.first.title,
          common.en.loyaltySystem.second.title,
        ].join('\n\n'),
      };
    default:
      return null;
  }
}
