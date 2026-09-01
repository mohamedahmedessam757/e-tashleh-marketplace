import {
    signDeepLinkToken,
    verifyDeepLinkToken,
    appendDeepLinkParam,
    type DeepLinkAudienceRole,
} from './deep-link-token.util';

describe('deep-link-token.util', () => {
    const secret = 'test-secret-for-deep-link-hmac-key';

    it('signs and verifies a payload', () => {
        const token = signDeepLinkToken(secret, {
            userId: 'user-1',
            role: 'CUSTOMER',
            orderId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            path: 'order-details',
            search: '?tab=waybills',
            ttlHours: 1,
        });
        const payload = verifyDeepLinkToken(secret, token);
        expect(payload.sub).toBe('user-1');
        expect(payload.orderId).toBe('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
        expect(payload.path).toBe('order-details');
    });

    it('rejects tampered signature', () => {
        const token = signDeepLinkToken(secret, {
            userId: 'user-1',
            role: 'VENDOR' as DeepLinkAudienceRole,
            orderId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            path: 'explore-offer',
        });
        expect(() => verifyDeepLinkToken(secret, `${token}x`)).toThrow();
    });

    it('appends dl query param', () => {
        expect(appendDeepLinkParam('https://x.net/a', 'tok.en')).toBe('https://x.net/a?dl=tok.en');
        expect(appendDeepLinkParam('https://x.net/a?tab=1', 'tok.en')).toBe(
            'https://x.net/a?tab=1&dl=tok.en',
        );
    });
});
