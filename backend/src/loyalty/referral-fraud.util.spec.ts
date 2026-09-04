import {
  evaluateReferralSignupRisk,
  isValidReferralCodeFormat,
  normalizeClientIp,
  normalizeReferralCode,
  REFERRAL_SAME_IP_DAILY_CAP,
} from './referral-fraud.util';

describe('referral-fraud.util', () => {
  it('normalizes X-Forwarded-For and IPv4-mapped IPv6', () => {
    expect(normalizeClientIp('203.0.113.10, 10.0.0.1')).toBe('203.0.113.10');
    expect(normalizeClientIp('::ffff:203.0.113.10')).toBe('203.0.113.10');
    expect(normalizeClientIp('::1')).toBe('127.0.0.1');
  });

  it('uppercases and validates referral code format', () => {
    expect(normalizeReferralCode(' ab12cd ')).toBe('AB12CD');
    expect(isValidReferralCodeFormat('AB12CD')).toBe(true);
    expect(isValidReferralCodeFormat('AB')).toBe(false);
    expect(isValidReferralCodeFormat('BAD CODE')).toBe(false);
  });

  it('blocks when signup IP matches referrer last login IP', () => {
    const decision = evaluateReferralSignupRisk({
      signupIp: '203.0.113.5',
      referrerLastLoginIp: '203.0.113.5',
      recentSameIpLinksForReferrer: 0,
    });
    expect(decision).toEqual({ allowLink: false, reason: 'SAME_IP_AS_REFERRER' });
  });

  it('blocks when signup IP appears in referrer session history', () => {
    const decision = evaluateReferralSignupRisk({
      signupIp: '198.51.100.2',
      referrerLastLoginIp: '10.0.0.1',
      referrerRecentIps: ['198.51.100.2', '192.0.2.1'],
      recentSameIpLinksForReferrer: 0,
    });
    expect(decision.allowLink).toBe(false);
    expect(decision.reason).toBe('SAME_IP_AS_REFERRER');
  });

  it('blocks when same-IP velocity cap is reached', () => {
    const decision = evaluateReferralSignupRisk({
      signupIp: '203.0.113.9',
      referrerLastLoginIp: '10.0.0.9',
      recentSameIpLinksForReferrer: REFERRAL_SAME_IP_DAILY_CAP,
    });
    expect(decision).toEqual({ allowLink: false, reason: 'IP_VELOCITY_CAP' });
  });

  it('allows clean cross-network referral', () => {
    const decision = evaluateReferralSignupRisk({
      signupIp: '203.0.113.50',
      referrerLastLoginIp: '198.51.100.50',
      recentSameIpLinksForReferrer: 1,
    });
    expect(decision.allowLink).toBe(true);
  });

  it('allows link when signup IP is unknown (fail-open on missing signal)', () => {
    const decision = evaluateReferralSignupRisk({
      signupIp: null,
      referrerLastLoginIp: '203.0.113.1',
      recentSameIpLinksForReferrer: 10,
    });
    expect(decision.allowLink).toBe(true);
  });
});
