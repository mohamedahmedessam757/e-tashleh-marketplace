export type GeolocationResult = {
  lat: number;
  lng: number;
  source: 'gps' | 'dev_bypass';
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isGeolocationSecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  return LOCAL_HOSTS.has(window.location.hostname);
}

export function isDevGpsBypassEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_VERIFICATION_GPS_DEV_BYPASS === 'true';
}

function insecureOriginMessage(isAr: boolean): string {
  return isAr
    ? 'الموقع (GPS) يتطلب HTTPS أو فتح التطبيق عبر localhost. للتطوير المحلي يمكنك المتابعة بدون GPS من الزر أدناه.'
    : 'GPS requires HTTPS or localhost. In local dev you can continue without GPS using the button below.';
}

export function mapGeolocationError(error: unknown, isAr: boolean): string {
  const geo = error as GeolocationPositionError & { message?: string };
  const msg = geo?.message ?? '';

  if (msg.includes('Only secure origins') || msg.includes('secure origins')) {
    return insecureOriginMessage(isAr);
  }

  if (geo?.code === 1) {
    return isAr
      ? 'تم رفض إذن الموقع. فعّل الموقع من إعدادات المتصفح.'
      : 'Location permission denied. Enable location in browser settings.';
  }
  if (geo?.code === 2) {
    return isAr ? 'تعذر تحديد الموقع.' : 'Position unavailable.';
  }
  if (geo?.code === 3) {
    return isAr ? 'انتهت مهلة تحديد الموقع.' : 'Location request timed out.';
  }

  if (error instanceof Error && error.message) return error.message;
  return isAr ? 'تعذر الحصول على الموقع' : 'Could not get location';
}

/** Request GPS; in dev on HTTP, returns bypass coords when allowDevBypass is true. */
export async function requestGeolocationCoords(
  isAr: boolean,
  allowDevBypass = isDevGpsBypassEnabled(),
): Promise<GeolocationResult> {
  if (!navigator.geolocation) {
    if (allowDevBypass) return { lat: 0, lng: 0, source: 'dev_bypass' };
    throw new Error(isAr ? 'المتصفح لا يدعم GPS' : 'Geolocation not supported');
  }

  if (!isGeolocationSecureContext()) {
    if (allowDevBypass) return { lat: 0, lng: 0, source: 'dev_bypass' };
    throw new Error(insecureOriginMessage(isAr));
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 0,
      });
    });
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      source: 'gps',
    };
  } catch (err) {
    if (allowDevBypass) return { lat: 0, lng: 0, source: 'dev_bypass' };
    throw new Error(mapGeolocationError(err, isAr));
  }
}

type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  state?: string;
  country?: string;
};

type NominatimReverseResponse = {
  display_name?: string;
  address?: NominatimAddress;
};

function buildPlaceNameFromNominatim(data: NominatimReverseResponse): string | null {
  const a = data.address;
  if (a) {
    const parts = [
      a.road || a.pedestrian,
      a.neighbourhood || a.suburb,
      a.village || a.town || a.city,
      a.state,
      a.country,
    ].filter((p): p is string => Boolean(p && String(p).trim()));
    if (parts.length > 0) {
      // Unique consecutive parts only
      const unique = parts.filter((p, i) => i === 0 || p !== parts[i - 1]);
      return unique.join(', ');
    }
  }
  const display = String(data.display_name || '').trim();
  if (!display) return null;
  // Keep a short readable place name (first ~4 comma segments)
  return display.split(',').slice(0, 4).map((s) => s.trim()).filter(Boolean).join(', ');
}

/**
 * Reverse-geocode lat/lng to a human place name (not raw coordinates).
 * Uses OpenStreetMap Nominatim — no API key. Returns null on failure.
 */
export async function reverseGeocodeLatLng(
  lat: number,
  lng: number,
  lang: 'ar' | 'en',
): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('accept-language', lang === 'ar' ? 'ar,en' : 'en,ar');

    const res = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Accept-Language': lang === 'ar' ? 'ar,en;q=0.8' : 'en,ar;q=0.8',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimReverseResponse;
    return buildPlaceNameFromNominatim(data);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
