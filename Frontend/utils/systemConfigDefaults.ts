import type { EarnIncomeConfig } from '../types/earnIncome';
import type { SystemConfig } from '../stores/useAdminStore';
import { guestLanding } from '../data/locales/guest-landing';
import { common } from '../data/locales/common';
import {
  businessLicenseSections,
  BUSINESS_LICENSE_NUMBER,
  NOMO_REGISTRY_PDF_URL,
} from '../data/businessLicense';

function licenseField(labelEn: string): { valueAr: string; valueEn: string } | null {
  for (const section of businessLicenseSections) {
    const f = section.fields.find((x) => x.labelEn === labelEn);
    if (f) return f;
  }
  return null;
}

export function buildEarnIncomeFromLocale(): EarnIncomeConfig {
  const ar = common.ar.loyaltySystem;
  const en = common.en.loyaltySystem;

  return {
    enabled: true,
    heroIconUrl: '/logo_nomo.png',
    heroTitleAr: ar.title,
    heroTitleEn: en.title,
    heroSubtitleAr: ar.subtitle,
    heroSubtitleEn: en.subtitle,
    navBadgeAr: 'نظام الأرباح الذكي 2026',
    navBadgeEn: 'SMART PROFIT ENGINE 2026',
    ctaAr: ar.cta,
    ctaEn: en.cta,
    intro: {
      titleAr: ar.intro.title,
      titleEn: en.intro.title,
      desc1Ar: ar.intro.desc1,
      desc1En: en.intro.desc1,
      desc2Ar: ar.intro.desc2,
      desc2En: en.intro.desc2,
      desc3Ar: ar.intro.desc3,
      desc3En: en.intro.desc3,
    },
    howToStart: {
      titleAr: ar.howToStart.title,
      titleEn: en.howToStart.title,
      steps: [
        { titleAr: ar.howToStart.step1.title, titleEn: en.howToStart.step1.title, descAr: ar.howToStart.step1.desc, descEn: en.howToStart.step1.desc },
        { titleAr: ar.howToStart.step2.title, titleEn: en.howToStart.step2.title, descAr: ar.howToStart.step2.desc, descEn: en.howToStart.step2.desc },
        { titleAr: ar.howToStart.step3.title, titleEn: en.howToStart.step3.title, descAr: ar.howToStart.step3.desc, descEn: en.howToStart.step3.desc },
        { titleAr: ar.howToStart.step4.title, titleEn: en.howToStart.step4.title, descAr: ar.howToStart.step4.desc, descEn: en.howToStart.step4.desc },
      ],
    },
    first: {
      titleAr: ar.first.title,
      titleEn: en.first.title,
      subtitleAr: ar.first.subtitle,
      subtitleEn: en.first.subtitle,
      bulletsAr: [ar.first.bullet1, ar.first.bullet2, ar.first.bullet3],
      bulletsEn: [en.first.bullet1, en.first.bullet2, en.first.bullet3],
    },
    second: {
      titleAr: ar.second.title,
      titleEn: en.second.title,
      subtitleAr: ar.second.subtitle,
      subtitleEn: en.second.subtitle,
      bulletsAr: [ar.second.bullet1, ar.second.bullet2, ar.second.bullet3],
      bulletsEn: [en.second.bullet1, en.second.bullet2, en.second.bullet3],
    },
    timing: {
      titleAr: ar.timing.title,
      titleEn: en.timing.title,
      subtitleAr: ar.timing.subtitle,
      subtitleEn: en.timing.subtitle,
      bulletsAr: [ar.timing.bullet1, ar.timing.bullet2, ar.timing.bullet3],
      bulletsEn: [en.timing.bullet1, en.timing.bullet2, en.timing.bullet3],
      footerAr: ar.timing.footer,
      footerEn: en.timing.footer,
    },
    whyDifferent: {
      titleAr: ar.whyDifferent.title,
      titleEn: en.whyDifferent.title,
      bulletsAr: [ar.whyDifferent.bullet1, ar.whyDifferent.bullet2, ar.whyDifferent.bullet3, ar.whyDifferent.bullet4],
      bulletsEn: [en.whyDifferent.bullet1, en.whyDifferent.bullet2, en.whyDifferent.bullet3, en.whyDifferent.bullet4],
    },
    imagine: {
      titleAr: ar.imagine.title,
      titleEn: en.imagine.title,
      p1Ar: ar.imagine.p1,
      p1En: en.imagine.p1,
      p2Ar: ar.imagine.p2,
      p2En: en.imagine.p2,
    },
    statsLabels: {
      activeUsersAr: ar.stats.activeUsers,
      activeUsersEn: en.stats.activeUsers,
      totalDistributedAr: ar.stats.totalDistributed,
      totalDistributedEn: en.stats.totalDistributed,
      referralsAr: ar.stats.referrals,
      referralsEn: en.stats.referrals,
    },
  };
}

export function getSystemConfigDefaults(): SystemConfig {
  const arAbout = guestLanding.ar.about;
  const enAbout = guestLanding.en.about;
  const ern = licenseField('ERN Number');
  const nameAr = licenseField('Business Name Arabic');
  const nameEn = licenseField('Business Name English');
  const expiry = licenseField('Expiry Date');

  return {
    general: {
      platformName: 'e-tashleh',
      contactEmail: 'shop@e-tashleh.shop',
      supportPhone: '0525700525',
      enablePreferencesStep: true,
      logoUrl: '/logo.png',
      logoDarkUrl: '/logo_nomo.png',
      contacts: {
        customer: 'cs@e-tashleh.shop',
        merchant: 'sl@e-tashleh.shop',
        wholesale: 'wh@e-tashleh.shop',
        company: 'shop@e-tashleh.shop',
      },
      earnIncome: buildEarnIncomeFromLocale(),
    },
    company: {
      legalNameAr: nameAr?.valueAr || 'إليب ش.م.ح. - ذ.م.م',
      legalNameEn: nameEn?.valueEn || 'Ellipp FZ_LLC',
      crNumber: '4036902',
      taxNumber: '',
      licenseNumber: BUSINESS_LICENSE_NUMBER,
      licenseExpiry: expiry?.valueEn?.includes('/') ? expiry.valueEn : '2027-06-19',
      hqAddressAr: `إمارة رأس الخيمة - ${guestLanding.ar.footer.companyInfo.address}`,
      hqAddressEn: `Ras Al Khaimah - ${guestLanding.en.footer.companyInfo.address}`,
      economicRegistryNumber: ern?.valueEn || '41200000000045000927',
      economicRegistryContentAr: businessLicenseSections
        .map((s) => `${s.titleAr}\n${s.fields.map((f) => `${f.labelAr}: ${f.valueAr}`).join('\n')}`)
        .join('\n\n'),
      economicRegistryContentEn: businessLicenseSections
        .map((s) => `${s.titleEn}\n${s.fields.map((f) => `${f.labelEn}: ${f.valueEn}`).join('\n')}`)
        .join('\n\n'),
      nomoDocumentUrl: NOMO_REGISTRY_PDF_URL,
      nomoDocumentUpdatedAt: undefined,
    },
    orderDurations: {
      assemblyCartDays: 7,
      returnWindowHours: 24,
      disputeWindowHours: 24,
      paymentTimeoutHours: 24,
      reminderDaysBeforeAssemblyExpiry: [5, 6],
      offerCollectionHours: 24,
      offerSelectionHours: 24,
      preparationHours: 48,
      delayedPreparationGraceHours: 24,
      shippingSlaHours: 72,
      correctionPeriodHours: 48,
      nonMatchingGraceMinutes: 2,
    },
    financial: {
      commissionRate: 25,
      minCommission: 100,
    },
    logistics: {
      globalMinWeightKg: 0,
      globalMaxWeightKg: 50,
      shipmentTypes: [
        {
          id: 'standard',
          nameAr: 'شحن قياسي (قطع غيار عادية)',
          nameEn: 'Standard Shipping (Normal Parts)',
          basePrice: 60,
          isWeightBound: true,
          weightBrackets: [
            { id: '1', minWeight: 0, maxWeight: 5, price: 0 },
            { id: '2', minWeight: 5.1, maxWeight: 10, price: 40 },
            { id: '3', minWeight: 10.1, maxWeight: 20, price: 90 },
          ],
        },
        {
          id: 'engine',
          nameAr: 'شحن ماكينة (محرك)',
          nameEn: 'Engine Shipping',
          basePrice: 450,
          isWeightBound: false,
          hasCylinders: true,
          cylinderRates: [
            { cylinders: 4, price: 450 },
            { cylinders: 6, price: 650 },
            { cylinders: 8, price: 850 },
          ],
          weightBrackets: [],
        },
        {
          id: 'gearbox',
          nameAr: 'شحن جيربوكس',
          nameEn: 'Gearbox Shipping',
          basePrice: 350,
          isWeightBound: false,
          weightBrackets: [],
        },
        {
          id: 'bumper',
          nameAr: 'صدام أمامى',
          nameEn: 'Front Bumper',
          basePrice: 150,
          isWeightBound: false,
          weightBrackets: [],
        },
      ],
    },
    content: {
      vendorContract: { contentAr: '', contentEn: '', firstPartyConfig: {} },
      privacyPolicy: '...',
      invoiceFooter: 'ELLIPP FZ LLC...',
    },
  } as SystemConfig;
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

export function mergeSystemConfig(api: Partial<SystemConfig> | null | undefined): SystemConfig {
  const defaults = getSystemConfigDefaults();
  if (!api) return defaults;

  const merge = (base: Record<string, unknown>, over: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = { ...base };
    for (const key of new Set([...Object.keys(base), ...Object.keys(over)])) {
      const b = base[key];
      const o = over[key];
      if (o === undefined || o === null) {
        out[key] = b;
      } else if (typeof o === 'object' && !Array.isArray(o) && typeof b === 'object' && b !== null && !Array.isArray(b)) {
        out[key] = merge(b as Record<string, unknown>, o as Record<string, unknown>);
      } else if (!isEmpty(o)) {
        out[key] = o;
      } else {
        out[key] = b;
      }
    }
    return out;
  };

  return merge(defaults as unknown as Record<string, unknown>, api as unknown as Record<string, unknown>) as unknown as SystemConfig;
}
