import * as geoip from 'geoip-lite';

const UNKNOWN_EN = 'Unknown Location';
const UNKNOWN_AR = 'موقع غير معروف';

export function normalizeClientIp(ip?: string | null): string {
    let cleanIp = (ip || '').trim();
    if (!cleanIp) return 'Unknown';
    if (cleanIp.includes(',')) cleanIp = cleanIp.split(',')[0].trim();
    if (cleanIp.startsWith('::ffff:')) cleanIp = cleanIp.substring(7);
    return cleanIp;
}

export function isPrivateOrLocalIp(ip: string): boolean {
    if (!ip || ip === 'Unknown') return true;
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return true;
    if (ip.startsWith('192.168.') || ip.startsWith('10.')) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
    if (
        ip.startsWith('fe80:') ||
        ip.startsWith('fc') ||
        ip.startsWith('fd') ||
        ip === '::'
    ) {
        return true;
    }
    return false;
}

export function localizedPrivateLocation(ip: string, isAr = false): string {
    if (ip === '127.0.0.1' || ip === '::1') {
        return isAr ? 'جهاز محلي' : 'Localhost';
    }
    return isAr ? 'شبكة محلية' : 'Local Network';
}

function countryLabel(code?: string | null, locale: 'en' | 'ar' = 'en'): string {
    if (!code) return '';
    if (code.length !== 2) return code;
    try {
        return (
            new Intl.DisplayNames([locale], { type: 'region' }).of(
                code.toUpperCase(),
            ) || code
        );
    } catch {
        return code;
    }
}

export function formatGeoLocation(
    city?: string | null,
    region?: string | null,
    country?: string | null,
    locale: 'en' | 'ar' = 'en',
): string {
    const countryName = countryLabel(country, locale);
    return [city, region, countryName].filter(Boolean).join(', ');
}

export function resolveIpLocationSync(
    ip?: string | null,
    locale: 'en' | 'ar' = 'en',
): string | null {
    const cleanIp = normalizeClientIp(ip);
    if (cleanIp === 'Unknown') return null;
    if (isPrivateOrLocalIp(cleanIp)) {
        return localizedPrivateLocation(cleanIp, locale === 'ar');
    }

    const geo = geoip.lookup(cleanIp);
    if (!geo) return null;

    return formatGeoLocation(geo.city, geo.region, geo.country, locale);
}

export function needsLocationRefresh(location?: string | null): boolean {
    if (!location?.trim()) return true;
    const normalized = location.trim().toLowerCase();
    return (
        normalized === UNKNOWN_EN.toLowerCase() ||
        normalized === UNKNOWN_AR ||
        normalized === 'موقع غير محدد' ||
        normalized === 'unknown'
    );
}

async function fetchGeoFromIpWhoIs(
    ip: string,
    locale: 'en' | 'ar',
): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(
            `https://ipwho.is/${encodeURIComponent(ip)}`,
            {
                signal: controller.signal,
                headers: { 'User-Agent': 'Marketplace-Admin-System/1.0' },
            },
        );
        clearTimeout(timeout);
        if (!response.ok) return null;

        const data = (await response.json()) as {
            success?: boolean;
            city?: string;
            region?: string;
            country?: string;
            country_code?: string;
        };

        if (!data.success) return null;

        const formatted = formatGeoLocation(
            data.city,
            data.region,
            data.country_code || data.country,
            locale,
        );
        return formatted || null;
    } catch {
        return null;
    }
}

export async function resolveIpLocationAsync(
    ip?: string | null,
    locale: 'en' | 'ar' = 'en',
): Promise<string> {
    const cleanIp = normalizeClientIp(ip);
    if (cleanIp === 'Unknown') {
        return locale === 'ar' ? UNKNOWN_AR : UNKNOWN_EN;
    }
    if (isPrivateOrLocalIp(cleanIp)) {
        return localizedPrivateLocation(cleanIp, locale === 'ar');
    }

    const syncLocation = resolveIpLocationSync(cleanIp, locale);
    if (syncLocation) return syncLocation;

    const remoteLocation = await fetchGeoFromIpWhoIs(cleanIp, locale);
    if (remoteLocation) return remoteLocation;

    return locale === 'ar' ? UNKNOWN_AR : UNKNOWN_EN;
}

export interface SessionLocationRow {
    id: string;
    ip: string | null;
    location: string | null;
}

export async function enrichSessionLocations<T extends SessionLocationRow>(
    sessions: T[],
    options?: {
        locale?: 'en' | 'ar';
        onPersist?: (id: string, location: string) => Promise<void>;
    },
): Promise<T[]> {
    const locale = options?.locale ?? 'en';

    return Promise.all(
        sessions.map(async (session) => {
            if (!needsLocationRefresh(session.location)) {
                return session;
            }

            const location = await resolveIpLocationAsync(session.ip, locale);
            if (
                location !== session.location &&
                options?.onPersist &&
                !needsLocationRefresh(location)
            ) {
                await options.onPersist(session.id, location).catch(() => undefined);
            }

            return { ...session, location };
        }),
    );
}
