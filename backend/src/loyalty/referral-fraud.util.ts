/**
 * Referral signup fraud heuristics (2026).
 * Pure functions — no DB. Callers decide whether to link the referral.
 */

export const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;
/** Max successful referral links from the same client IP to one referrer / 24h */
export const REFERRAL_SAME_IP_DAILY_CAP = 3;

export type ReferralFraudReason =
  | 'INVALID_FORMAT'
  | 'SAME_IP_AS_REFERRER'
  | 'IP_VELOCITY_CAP';

export interface ReferralFraudDecision {
  allowLink: boolean;
  reason?: ReferralFraudReason;
}

/** Strip IPv4-mapped IPv6 and take first X-Forwarded-For hop. */
export function normalizeClientIp(raw?: string | string[] | null): string | null {
  if (!raw) return null;
  const first = Array.isArray(raw) ? raw[0] : String(raw).split(',')[0];
  let ip = first.trim().toLowerCase();
  if (!ip || ip === 'unknown') return null;
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') ip = '127.0.0.1';
  // Drop obviously unusable placeholders
  if (ip === '0.0.0.0') return null;
  return ip.slice(0, 45);
}

export function normalizeReferralCode(raw?: string | null): string {
  if (!raw) return '';
  return String(raw).trim().toUpperCase();
}

export function isValidReferralCodeFormat(code: string): boolean {
  return REFERRAL_CODE_PATTERN.test(code);
}

/**
 * Decide whether a referral link is safe to attach at signup.
 * Does not replace unique email/phone — only network heuristics.
 */
export function evaluateReferralSignupRisk(input: {
  signupIp: string | null;
  referrerLastLoginIp?: string | null;
  referrerRecentIps?: Array<string | null | undefined>;
  recentSameIpLinksForReferrer: number;
  sameIpDailyCap?: number;
}): ReferralFraudDecision {
  const signupIp = normalizeClientIp(input.signupIp);
  const cap = input.sameIpDailyCap ?? REFERRAL_SAME_IP_DAILY_CAP;

  if (signupIp) {
    const referrerIps = new Set<string>();
    const primary = normalizeClientIp(input.referrerLastLoginIp);
    if (primary) referrerIps.add(primary);
    for (const candidate of input.referrerRecentIps || []) {
      const n = normalizeClientIp(candidate);
      if (n) referrerIps.add(n);
    }

    if (referrerIps.has(signupIp)) {
      return { allowLink: false, reason: 'SAME_IP_AS_REFERRER' };
    }

    if (input.recentSameIpLinksForReferrer >= cap) {
      return { allowLink: false, reason: 'IP_VELOCITY_CAP' };
    }
  }

  return { allowLink: true };
}
