import type { EarnIncomeConfig } from '../types/earnIncome';
import { buildEarnIncomeFromLocale } from './systemConfigDefaults';

type LoyaltyLocale = {
  title: string;
  subtitle: string;
  intro: { title: string; desc1: string; desc2: string; desc3: string };
  howToStart: {
    title: string;
    step1: { title: string; desc: string };
    step2: { title: string; desc: string };
    step3: { title: string; desc: string };
    step4: { title: string; desc: string };
  };
  first: { title: string; subtitle: string; bullet1: string; bullet2: string; bullet3: string };
  second: { title: string; subtitle: string; bullet1: string; bullet2: string; bullet3: string };
  timing: { title: string; subtitle: string; bullet1: string; bullet2: string; bullet3: string; footer: string };
  whyDifferent: { title: string; bullet1: string; bullet2: string; bullet3: string; bullet4: string };
  imagine: { title: string; p1: string; p2: string };
  cta: string;
  stats: { activeUsers: string; totalDistributed: string; referrals: string };
};

export interface EarnIncomeViewModel {
  enabled: boolean;
  heroIconUrl?: string;
  heroTitle: string;
  heroSubtitle: string;
  navBadge: string;
  cta: string;
  intro: { title: string; desc1: string; desc2: string; desc3: string };
  howToStart: {
    title: string;
    steps: Array<{ title: string; desc: string }>;
  };
  first: { title: string; subtitle: string; bullets: string[] };
  second: { title: string; subtitle: string; bullets: string[] };
  timing: { title: string; subtitle: string; bullets: string[]; footer: string };
  whyDifferent: { title: string; bullets: string[] };
  imagine: { title: string; p1: string; p2: string };
  statsLabels: { activeUsers: string; totalDistributed: string; referrals: string };
}

function pick(ar: string, en: string, isAr: boolean): string {
  return isAr ? ar || en : en || ar;
}

function fromConfig(cfg: EarnIncomeConfig, isAr: boolean): EarnIncomeViewModel {
  return {
    enabled: cfg.enabled,
    heroIconUrl: cfg.heroIconUrl,
    heroTitle: pick(cfg.heroTitleAr, cfg.heroTitleEn, isAr),
    heroSubtitle: pick(cfg.heroSubtitleAr, cfg.heroSubtitleEn, isAr),
    navBadge: pick(cfg.navBadgeAr, cfg.navBadgeEn, isAr),
    cta: pick(cfg.ctaAr, cfg.ctaEn, isAr),
    intro: {
      title: pick(cfg.intro.titleAr, cfg.intro.titleEn, isAr),
      desc1: pick(cfg.intro.desc1Ar, cfg.intro.desc1En, isAr),
      desc2: pick(cfg.intro.desc2Ar, cfg.intro.desc2En, isAr),
      desc3: pick(cfg.intro.desc3Ar, cfg.intro.desc3En, isAr),
    },
    howToStart: {
      title: pick(cfg.howToStart.titleAr, cfg.howToStart.titleEn, isAr),
      steps: (cfg.howToStart.steps || []).map((s) => ({
        title: pick(s.titleAr, s.titleEn, isAr),
        desc: pick(s.descAr, s.descEn, isAr),
      })),
    },
    first: {
      title: pick(cfg.first.titleAr, cfg.first.titleEn, isAr),
      subtitle: pick(cfg.first.subtitleAr || '', cfg.first.subtitleEn || '', isAr),
      bullets: isAr ? [...cfg.first.bulletsAr] : [...cfg.first.bulletsEn],
    },
    second: {
      title: pick(cfg.second.titleAr, cfg.second.titleEn, isAr),
      subtitle: pick(cfg.second.subtitleAr || '', cfg.second.subtitleEn || '', isAr),
      bullets: isAr ? [...cfg.second.bulletsAr] : [...cfg.second.bulletsEn],
    },
    timing: {
      title: pick(cfg.timing.titleAr, cfg.timing.titleEn, isAr),
      subtitle: pick(cfg.timing.subtitleAr, cfg.timing.subtitleEn, isAr),
      bullets: isAr ? [...cfg.timing.bulletsAr] : [...cfg.timing.bulletsEn],
      footer: pick(cfg.timing.footerAr, cfg.timing.footerEn, isAr),
    },
    whyDifferent: {
      title: pick(cfg.whyDifferent.titleAr, cfg.whyDifferent.titleEn, isAr),
      bullets: isAr ? [...cfg.whyDifferent.bulletsAr] : [...cfg.whyDifferent.bulletsEn],
    },
    imagine: {
      title: pick(cfg.imagine.titleAr, cfg.imagine.titleEn, isAr),
      p1: pick(cfg.imagine.p1Ar, cfg.imagine.p1En, isAr),
      p2: pick(cfg.imagine.p2Ar, cfg.imagine.p2En, isAr),
    },
    statsLabels: {
      activeUsers: pick(cfg.statsLabels.activeUsersAr, cfg.statsLabels.activeUsersEn, isAr),
      totalDistributed: pick(cfg.statsLabels.totalDistributedAr, cfg.statsLabels.totalDistributedEn, isAr),
      referrals: pick(cfg.statsLabels.referralsAr, cfg.statsLabels.referralsEn, isAr),
    },
  };
}

function fromLocale(locale: LoyaltyLocale): EarnIncomeViewModel {
  return {
    enabled: true,
    heroTitle: locale.title,
    heroSubtitle: locale.subtitle,
    navBadge: '',
    cta: locale.cta,
    intro: locale.intro,
    howToStart: {
      title: locale.howToStart.title,
      steps: [
        locale.howToStart.step1,
        locale.howToStart.step2,
        locale.howToStart.step3,
        locale.howToStart.step4,
      ],
    },
    first: {
      title: locale.first.title,
      subtitle: locale.first.subtitle,
      bullets: [locale.first.bullet1, locale.first.bullet2, locale.first.bullet3],
    },
    second: {
      title: locale.second.title,
      subtitle: locale.second.subtitle,
      bullets: [locale.second.bullet1, locale.second.bullet2, locale.second.bullet3],
    },
    timing: {
      title: locale.timing.title,
      subtitle: locale.timing.subtitle,
      bullets: [locale.timing.bullet1, locale.timing.bullet2, locale.timing.bullet3],
      footer: locale.timing.footer,
    },
    whyDifferent: {
      title: locale.whyDifferent.title,
      bullets: [locale.whyDifferent.bullet1, locale.whyDifferent.bullet2, locale.whyDifferent.bullet3, locale.whyDifferent.bullet4],
    },
    imagine: locale.imagine,
    statsLabels: locale.stats,
  };
}

export function mergeEarnIncome(
  apiEarn: Partial<EarnIncomeConfig> | null | undefined,
  locale: LoyaltyLocale,
  isAr: boolean,
): EarnIncomeViewModel {
  const defaults = buildEarnIncomeFromLocale();
  const merged: EarnIncomeConfig = {
    ...defaults,
    ...(apiEarn || {}),
    intro: { ...defaults.intro, ...(apiEarn?.intro || {}) },
    howToStart: {
      ...defaults.howToStart,
      ...(apiEarn?.howToStart || {}),
      steps: apiEarn?.howToStart?.steps?.length ? apiEarn.howToStart.steps : defaults.howToStart.steps,
    },
    first: { ...defaults.first, ...(apiEarn?.first || {}) },
    second: { ...defaults.second, ...(apiEarn?.second || {}) },
    timing: { ...defaults.timing, ...(apiEarn?.timing || {}) },
    whyDifferent: { ...defaults.whyDifferent, ...(apiEarn?.whyDifferent || {}) },
    imagine: { ...defaults.imagine, ...(apiEarn?.imagine || {}) },
    statsLabels: { ...defaults.statsLabels, ...(apiEarn?.statsLabels || {}) },
  };

  const fromApi = fromConfig(merged, isAr);
  const fromLoc = fromLocale(locale);

  const fill = (apiVal: string, locVal: string) => (apiVal?.trim() ? apiVal : locVal);

  return {
    enabled: merged.enabled,
    heroIconUrl: merged.heroIconUrl,
    heroTitle: fill(fromApi.heroTitle, fromLoc.heroTitle),
    heroSubtitle: fill(fromApi.heroSubtitle, fromLoc.heroSubtitle),
    navBadge: fill(fromApi.navBadge, fromLoc.navBadge || (isAr ? 'نظام الأرباح الذكي 2026' : 'SMART PROFIT ENGINE 2026')),
    cta: fill(fromApi.cta, fromLoc.cta),
    intro: {
      title: fill(fromApi.intro.title, fromLoc.intro.title),
      desc1: fill(fromApi.intro.desc1, fromLoc.intro.desc1),
      desc2: fill(fromApi.intro.desc2, fromLoc.intro.desc2),
      desc3: fill(fromApi.intro.desc3, fromLoc.intro.desc3),
    },
    howToStart: {
      title: fill(fromApi.howToStart.title, fromLoc.howToStart.title),
      steps: fromApi.howToStart.steps.map((s, i) => ({
        title: fill(s.title, fromLoc.howToStart.steps[i]?.title || ''),
        desc: fill(s.desc, fromLoc.howToStart.steps[i]?.desc || ''),
      })),
    },
    first: {
      title: fill(fromApi.first.title, fromLoc.first.title),
      subtitle: fill(fromApi.first.subtitle, fromLoc.first.subtitle),
      bullets: fromApi.first.bullets.map((b, i) => fill(b, fromLoc.first.bullets[i] || '')),
    },
    second: {
      title: fill(fromApi.second.title, fromLoc.second.title),
      subtitle: fill(fromApi.second.subtitle, fromLoc.second.subtitle),
      bullets: fromApi.second.bullets.map((b, i) => fill(b, fromLoc.second.bullets[i] || '')),
    },
    timing: {
      title: fill(fromApi.timing.title, fromLoc.timing.title),
      subtitle: fill(fromApi.timing.subtitle, fromLoc.timing.subtitle),
      bullets: fromApi.timing.bullets.map((b, i) => fill(b, fromLoc.timing.bullets[i] || '')),
      footer: fill(fromApi.timing.footer, fromLoc.timing.footer),
    },
    whyDifferent: {
      title: fill(fromApi.whyDifferent.title, fromLoc.whyDifferent.title),
      bullets: fromApi.whyDifferent.bullets.map((b, i) => fill(b, fromLoc.whyDifferent.bullets[i] || '')),
    },
    imagine: {
      title: fill(fromApi.imagine.title, fromLoc.imagine.title),
      p1: fill(fromApi.imagine.p1, fromLoc.imagine.p1),
      p2: fill(fromApi.imagine.p2, fromLoc.imagine.p2),
    },
    statsLabels: {
      activeUsers: fill(fromApi.statsLabels.activeUsers, fromLoc.statsLabels.activeUsers),
      totalDistributed: fill(fromApi.statsLabels.totalDistributed, fromLoc.statsLabels.totalDistributed),
      referrals: fill(fromApi.statsLabels.referrals, fromLoc.statsLabels.referrals),
    },
  };
}
