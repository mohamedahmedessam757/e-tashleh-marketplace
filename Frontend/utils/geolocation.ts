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
