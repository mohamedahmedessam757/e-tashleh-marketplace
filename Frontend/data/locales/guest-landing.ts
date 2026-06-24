/**
 * Guest-facing landing copy (nav, hero, sections).
 * Full strings live in auth.ts; termsContent loads on demand via loadTermsContent().
 * Dashboard-only copy loads via loadDashboardTranslations().
 */
export const GUEST_LANDING_KEYS = [
  'nav',
  'hero',
  'stats',
  'footer',
  'about',
  'guarantees',
  'howItWorks',
  'merchants',
  'support',
  'legal',
] as const;

export type GuestLandingKey = (typeof GUEST_LANDING_KEYS)[number];
