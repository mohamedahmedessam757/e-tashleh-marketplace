export interface EarnIncomeLocalizedPair {
  titleAr: string;
  titleEn: string;
}

export interface EarnIncomeStep {
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}

export interface EarnIncomeBulletsBlock {
  titleAr: string;
  titleEn: string;
  subtitleAr?: string;
  subtitleEn?: string;
  bulletsAr: [string, string, string];
  bulletsEn: [string, string, string];
}

export interface EarnIncomeTimingBlock {
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  bulletsAr: [string, string, string];
  bulletsEn: [string, string, string];
  footerAr: string;
  footerEn: string;
}

export interface EarnIncomeWhyBlock {
  titleAr: string;
  titleEn: string;
  bulletsAr: [string, string, string, string];
  bulletsEn: [string, string, string, string];
}

export interface EarnIncomeImagineBlock {
  titleAr: string;
  titleEn: string;
  p1Ar: string;
  p1En: string;
  p2Ar: string;
  p2En: string;
}

export interface EarnIncomeStatsLabels {
  activeUsersAr: string;
  activeUsersEn: string;
  totalDistributedAr: string;
  totalDistributedEn: string;
  referralsAr: string;
  referralsEn: string;
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
  first: EarnIncomeBulletsBlock;
  second: EarnIncomeBulletsBlock;
  timing: EarnIncomeTimingBlock;
  whyDifferent: EarnIncomeWhyBlock;
  imagine: EarnIncomeImagineBlock;
  statsLabels: EarnIncomeStatsLabels;
  /** @deprecated legacy repeater — kept for backward compatibility */
  sections?: Array<{
    id: string;
    icon?: string;
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
  }>;
}
