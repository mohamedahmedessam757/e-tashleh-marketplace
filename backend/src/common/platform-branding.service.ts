import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PlatformContacts {
  customer: string;
  merchant: string;
  wholesale: string;
  company: string;
}

export interface EarnIncomeStep {
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}

export interface EarnIncomeConfig {
  enabled: boolean;
  heroIconUrl?: string;
  heroTitleAr: string;
  heroTitleEn: string;
  heroSubtitleAr: string;
  heroSubtitleEn: string;
  navBadgeAr: string;
  navBadgeEn: string;
  ctaAr: string;
  ctaEn: string;
  intro: {
    titleAr: string;
    titleEn: string;
    desc1Ar: string;
    desc1En: string;
    desc2Ar: string;
    desc2En: string;
    desc3Ar: string;
    desc3En: string;
  };
  howToStart: {
    titleAr: string;
    titleEn: string;
    steps: EarnIncomeStep[];
  };
  first: {
    titleAr: string;
    titleEn: string;
    subtitleAr: string;
    subtitleEn: string;
    bulletsAr: string[];
    bulletsEn: string[];
  };
  second: {
    titleAr: string;
    titleEn: string;
    subtitleAr: string;
    subtitleEn: string;
    bulletsAr: string[];
    bulletsEn: string[];
  };
  timing: {
    titleAr: string;
    titleEn: string;
    subtitleAr: string;
    subtitleEn: string;
    bulletsAr: string[];
    bulletsEn: string[];
    footerAr: string;
    footerEn: string;
  };
  whyDifferent: {
    titleAr: string;
    titleEn: string;
    bulletsAr: string[];
    bulletsEn: string[];
  };
  imagine: {
    titleAr: string;
    titleEn: string;
    p1Ar: string;
    p1En: string;
    p2Ar: string;
    p2En: string;
  };
  statsLabels: {
    activeUsersAr: string;
    activeUsersEn: string;
    totalDistributedAr: string;
    totalDistributedEn: string;
    referralsAr: string;
    referralsEn: string;
  };
}

export interface PlatformBrandingConfig {
  platformName: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  contactEmail: string;
  supportPhone: string;
  contacts: PlatformContacts;
  earnIncome: EarnIncomeConfig;
}

const DEFAULT_CONTACTS: PlatformContacts = {
  customer: 'cs@e-tashleh.shop',
  merchant: 'sl@e-tashleh.shop',
  wholesale: 'wh@e-tashleh.shop',
  company: 'shop@e-tashleh.shop',
};

const DEFAULT_EARN_INCOME: EarnIncomeConfig = {
  enabled: true,
  heroTitleAr: 'اكسب دخل معنا',
  heroTitleEn: 'Earn Income With Us',
  heroSubtitleAr: 'انضم لبرنامج الولاء واكسب مع كل عملية',
  heroSubtitleEn: 'Join our loyalty program and earn on every transaction',
  navBadgeAr: 'نظام الأرباح الذكي 2026',
  navBadgeEn: 'SMART PROFIT ENGINE 2026',
  ctaAr: 'ابدأ الربح الآن',
  ctaEn: 'Start Earning Now',
  intro: {
    titleAr: '💡 مو مجرد شراء… هذا مصدر دخل لك',
    titleEn: '💡 Not just shopping… this is income for you',
    desc1Ar: 'كل طلب تقوم به داخل المنصة',
    desc1En: 'Every order you place on the platform',
    desc2Ar: '= أرباح تُضاف مباشرة إلى محفظتك',
    desc2En: '= Profits added directly to your wallet',
    desc3Ar: 'ابدأ اليوم… وخَلّ مشترياتك تشتغل لصالحك',
    desc3En: 'Start today… let your purchases work for you',
  },
  howToStart: {
    titleAr: '🚀 كيف تبدأ؟',
    titleEn: '🚀 How to start?',
    steps: [],
  },
  first: {
    titleAr: '💼 أولاً: نظام الولاء',
    titleEn: '💼 First: Loyalty system',
    subtitleAr: '',
    subtitleEn: '',
    bulletsAr: [],
    bulletsEn: [],
  },
  second: {
    titleAr: '🔗 ثانياً: نظام الإحالة',
    titleEn: '🔗 Second: Referral system',
    subtitleAr: '',
    subtitleEn: '',
    bulletsAr: [],
    bulletsEn: [],
  },
  timing: {
    titleAr: '⏱ متى تُحتسب الأرباح؟',
    titleEn: '⏱ When are profits counted?',
    subtitleAr: '',
    subtitleEn: '',
    bulletsAr: [],
    bulletsEn: [],
    footerAr: '',
    footerEn: '',
  },
  whyDifferent: {
    titleAr: '⭐ لماذا هذا النظام مختلف؟',
    titleEn: '⭐ Why is this system different?',
    bulletsAr: [],
    bulletsEn: [],
  },
  imagine: {
    titleAr: '🤯 تخيّل',
    titleEn: '🤯 Imagine',
    p1Ar: '',
    p1En: '',
    p2Ar: '',
    p2En: '',
  },
  statsLabels: {
    activeUsersAr: 'مستخدم نشط',
    activeUsersEn: 'Active users',
    totalDistributedAr: 'إجمالي المكافآت',
    totalDistributedEn: 'Total distributed',
    referralsAr: 'إحالات ناجحة',
    referralsEn: 'Successful referrals',
  },
};

const DEFAULTS: PlatformBrandingConfig = {
  platformName: 'e-tashleh',
  contactEmail: 'shop@e-tashleh.shop',
  supportPhone: '0525700525',
  contacts: DEFAULT_CONTACTS,
  earnIncome: DEFAULT_EARN_INCOME,
};

@Injectable()
export class PlatformBrandingService {
  private readonly logger = new Logger(PlatformBrandingService.name);
  private cache: { config: PlatformBrandingConfig; expiresAt: number } | null = null;
  private readonly TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  invalidateCache(): void {
    this.cache = null;
  }

  async getConfig(): Promise<PlatformBrandingConfig> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.config;
    }

    try {
      const row = await this.prisma.platformSettings.findUnique({
        where: { settingKey: 'system_config' },
      });
      const general = (row?.settingValue as Record<string, unknown>)?.general ?? {};
      const config = this.merge(general as Record<string, unknown>);
      this.cache = { config, expiresAt: Date.now() + this.TTL_MS };
      return config;
    } catch (e) {
      this.logger.warn('PlatformBranding fallback to defaults', e);
      return { ...DEFAULTS };
    }
  }

  getPublicSnapshot(config: PlatformBrandingConfig) {
    return {
      platformName: config.platformName,
      logoUrl: config.logoUrl ?? null,
      logoDarkUrl: config.logoDarkUrl ?? null,
      faviconUrl: config.faviconUrl ?? null,
      contactEmail: config.contactEmail,
      supportPhone: config.supportPhone,
      contacts: config.contacts,
      earnIncome: config.earnIncome,
    };
  }

  private str(v: unknown, fallback: string): string {
    return v !== undefined && v !== null && String(v).trim() ? String(v) : fallback;
  }

  private strArr(v: unknown, fallback: string[]): string[] {
    return Array.isArray(v) ? v.map((x) => String(x)) : fallback;
  }

  private mergeEarnIncome(raw: Record<string, unknown>): EarnIncomeConfig {
    const intro = (raw.intro ?? {}) as Record<string, unknown>;
    const how = (raw.howToStart ?? {}) as Record<string, unknown>;
    const first = (raw.first ?? {}) as Record<string, unknown>;
    const second = (raw.second ?? {}) as Record<string, unknown>;
    const timing = (raw.timing ?? {}) as Record<string, unknown>;
    const why = (raw.whyDifferent ?? {}) as Record<string, unknown>;
    const imagine = (raw.imagine ?? {}) as Record<string, unknown>;
    const stats = (raw.statsLabels ?? {}) as Record<string, unknown>;

    const steps = Array.isArray(how.steps)
      ? (how.steps as Record<string, unknown>[]).map((s) => ({
          titleAr: this.str(s.titleAr, ''),
          titleEn: this.str(s.titleEn, ''),
          descAr: this.str(s.descAr, ''),
          descEn: this.str(s.descEn, ''),
        }))
      : DEFAULT_EARN_INCOME.howToStart.steps;

    return {
      enabled: raw.enabled !== false,
      heroIconUrl: raw.heroIconUrl ? String(raw.heroIconUrl) : undefined,
      heroTitleAr: this.str(raw.heroTitleAr, DEFAULT_EARN_INCOME.heroTitleAr),
      heroTitleEn: this.str(raw.heroTitleEn, DEFAULT_EARN_INCOME.heroTitleEn),
      heroSubtitleAr: this.str(raw.heroSubtitleAr, DEFAULT_EARN_INCOME.heroSubtitleAr),
      heroSubtitleEn: this.str(raw.heroSubtitleEn, DEFAULT_EARN_INCOME.heroSubtitleEn),
      navBadgeAr: this.str(raw.navBadgeAr, DEFAULT_EARN_INCOME.navBadgeAr),
      navBadgeEn: this.str(raw.navBadgeEn, DEFAULT_EARN_INCOME.navBadgeEn),
      ctaAr: this.str(raw.ctaAr, DEFAULT_EARN_INCOME.ctaAr),
      ctaEn: this.str(raw.ctaEn, DEFAULT_EARN_INCOME.ctaEn),
      intro: {
        titleAr: this.str(intro.titleAr, DEFAULT_EARN_INCOME.intro.titleAr),
        titleEn: this.str(intro.titleEn, DEFAULT_EARN_INCOME.intro.titleEn),
        desc1Ar: this.str(intro.desc1Ar, DEFAULT_EARN_INCOME.intro.desc1Ar),
        desc1En: this.str(intro.desc1En, DEFAULT_EARN_INCOME.intro.desc1En),
        desc2Ar: this.str(intro.desc2Ar, DEFAULT_EARN_INCOME.intro.desc2Ar),
        desc2En: this.str(intro.desc2En, DEFAULT_EARN_INCOME.intro.desc2En),
        desc3Ar: this.str(intro.desc3Ar, DEFAULT_EARN_INCOME.intro.desc3Ar),
        desc3En: this.str(intro.desc3En, DEFAULT_EARN_INCOME.intro.desc3En),
      },
      howToStart: {
        titleAr: this.str(how.titleAr, DEFAULT_EARN_INCOME.howToStart.titleAr),
        titleEn: this.str(how.titleEn, DEFAULT_EARN_INCOME.howToStart.titleEn),
        steps,
      },
      first: {
        titleAr: this.str(first.titleAr, DEFAULT_EARN_INCOME.first.titleAr),
        titleEn: this.str(first.titleEn, DEFAULT_EARN_INCOME.first.titleEn),
        subtitleAr: this.str(first.subtitleAr, DEFAULT_EARN_INCOME.first.subtitleAr),
        subtitleEn: this.str(first.subtitleEn, DEFAULT_EARN_INCOME.first.subtitleEn),
        bulletsAr: this.strArr(first.bulletsAr, DEFAULT_EARN_INCOME.first.bulletsAr),
        bulletsEn: this.strArr(first.bulletsEn, DEFAULT_EARN_INCOME.first.bulletsEn),
      },
      second: {
        titleAr: this.str(second.titleAr, DEFAULT_EARN_INCOME.second.titleAr),
        titleEn: this.str(second.titleEn, DEFAULT_EARN_INCOME.second.titleEn),
        subtitleAr: this.str(second.subtitleAr, DEFAULT_EARN_INCOME.second.subtitleAr),
        subtitleEn: this.str(second.subtitleEn, DEFAULT_EARN_INCOME.second.subtitleEn),
        bulletsAr: this.strArr(second.bulletsAr, DEFAULT_EARN_INCOME.second.bulletsAr),
        bulletsEn: this.strArr(second.bulletsEn, DEFAULT_EARN_INCOME.second.bulletsEn),
      },
      timing: {
        titleAr: this.str(timing.titleAr, DEFAULT_EARN_INCOME.timing.titleAr),
        titleEn: this.str(timing.titleEn, DEFAULT_EARN_INCOME.timing.titleEn),
        subtitleAr: this.str(timing.subtitleAr, DEFAULT_EARN_INCOME.timing.subtitleAr),
        subtitleEn: this.str(timing.subtitleEn, DEFAULT_EARN_INCOME.timing.subtitleEn),
        bulletsAr: this.strArr(timing.bulletsAr, DEFAULT_EARN_INCOME.timing.bulletsAr),
        bulletsEn: this.strArr(timing.bulletsEn, DEFAULT_EARN_INCOME.timing.bulletsEn),
        footerAr: this.str(timing.footerAr, DEFAULT_EARN_INCOME.timing.footerAr),
        footerEn: this.str(timing.footerEn, DEFAULT_EARN_INCOME.timing.footerEn),
      },
      whyDifferent: {
        titleAr: this.str(why.titleAr, DEFAULT_EARN_INCOME.whyDifferent.titleAr),
        titleEn: this.str(why.titleEn, DEFAULT_EARN_INCOME.whyDifferent.titleEn),
        bulletsAr: this.strArr(why.bulletsAr, DEFAULT_EARN_INCOME.whyDifferent.bulletsAr),
        bulletsEn: this.strArr(why.bulletsEn, DEFAULT_EARN_INCOME.whyDifferent.bulletsEn),
      },
      imagine: {
        titleAr: this.str(imagine.titleAr, DEFAULT_EARN_INCOME.imagine.titleAr),
        titleEn: this.str(imagine.titleEn, DEFAULT_EARN_INCOME.imagine.titleEn),
        p1Ar: this.str(imagine.p1Ar, DEFAULT_EARN_INCOME.imagine.p1Ar),
        p1En: this.str(imagine.p1En, DEFAULT_EARN_INCOME.imagine.p1En),
        p2Ar: this.str(imagine.p2Ar, DEFAULT_EARN_INCOME.imagine.p2Ar),
        p2En: this.str(imagine.p2En, DEFAULT_EARN_INCOME.imagine.p2En),
      },
      statsLabels: {
        activeUsersAr: this.str(stats.activeUsersAr, DEFAULT_EARN_INCOME.statsLabels.activeUsersAr),
        activeUsersEn: this.str(stats.activeUsersEn, DEFAULT_EARN_INCOME.statsLabels.activeUsersEn),
        totalDistributedAr: this.str(stats.totalDistributedAr, DEFAULT_EARN_INCOME.statsLabels.totalDistributedAr),
        totalDistributedEn: this.str(stats.totalDistributedEn, DEFAULT_EARN_INCOME.statsLabels.totalDistributedEn),
        referralsAr: this.str(stats.referralsAr, DEFAULT_EARN_INCOME.statsLabels.referralsAr),
        referralsEn: this.str(stats.referralsEn, DEFAULT_EARN_INCOME.statsLabels.referralsEn),
      },
    };
  }

  private merge(general: Record<string, unknown>): PlatformBrandingConfig {
    const contactsRaw = (general.contacts ?? {}) as Partial<PlatformContacts>;
    const earnRaw = (general.earnIncome ?? {}) as Record<string, unknown>;

    return {
      platformName: String(general.platformName ?? DEFAULTS.platformName),
      logoUrl: general.logoUrl ? String(general.logoUrl) : undefined,
      logoDarkUrl: general.logoDarkUrl ? String(general.logoDarkUrl) : undefined,
      faviconUrl: general.faviconUrl ? String(general.faviconUrl) : undefined,
      contactEmail: String(general.contactEmail ?? DEFAULTS.contactEmail),
      supportPhone: String(general.supportPhone ?? DEFAULTS.supportPhone),
      contacts: {
        customer: String(contactsRaw.customer ?? DEFAULT_CONTACTS.customer),
        merchant: String(contactsRaw.merchant ?? DEFAULT_CONTACTS.merchant),
        wholesale: String(contactsRaw.wholesale ?? DEFAULT_CONTACTS.wholesale),
        company: String(contactsRaw.company ?? DEFAULT_CONTACTS.company),
      },
      earnIncome: this.mergeEarnIncome(earnRaw),
    };
  }
}
