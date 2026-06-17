import {
    formatGeoLocation,
    localizePrivateLocation,
    needsLocationRefresh,
    normalizeClientIp,
    resolveIpLocationAsync,
    resolveIpLocationSync,
    isPrivateOrLocalIp,
} from './ip-geolocation.util';

describe('ip-geolocation.util', () => {
    it('normalizes proxy and IPv6-mapped IPs', () => {
        expect(normalizeClientIp('::ffff:156.211.184.48')).toBe('156.211.184.48');
        expect(normalizeClientIp('1.1.1.1, 2.2.2.2')).toBe('1.1.1.1');
    });

    it('labels private LAN IPs', () => {
        expect(isPrivateOrLocalIp('192.168.1.7')).toBe(true);
        expect(localizePrivateLocation('192.168.1.7', false)).toBe('Local Network');
        expect(localizePrivateLocation('192.168.1.7', true)).toBe('شبكة محلية');
    });

    it('resolves public IPs via geoip-lite', () => {
        const location = resolveIpLocationSync('156.211.184.48', 'en');
        expect(location).toBeTruthy();
        expect(location).toContain('Zagazig');
    });

    it('detects stale unknown locations', () => {
        expect(needsLocationRefresh('Unknown Location')).toBe(true);
        expect(needsLocationRefresh('Cairo, Egypt')).toBe(false);
    });

    it('formats geo with localized country names', () => {
        expect(formatGeoLocation('Cairo', 'Cairo', 'EG', 'en')).toContain('Egypt');
    });
});
