const PRODUCTION_API_URL = 'https://api.e-tashleh.net';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getDefaultApiUrl = () => PRODUCTION_API_URL;

export const resolveApiUrl = () => {
    const configuredUrl = import.meta.env.VITE_API_URL?.trim();

    if (!configuredUrl) {
        return trimTrailingSlash(getDefaultApiUrl());
    }

    if (typeof window === 'undefined') {
        return trimTrailingSlash(configuredUrl);
    }

    try {
        const parsedUrl = new URL(configuredUrl);
        const currentHostname = window.location.hostname;

        // When the frontend is opened over the LAN, swap localhost for the current host.
        if (LOCAL_HOSTNAMES.has(parsedUrl.hostname) && !LOCAL_HOSTNAMES.has(currentHostname)) {
            parsedUrl.hostname = currentHostname;
        }

        return trimTrailingSlash(parsedUrl.toString());
    } catch {
        return trimTrailingSlash(configuredUrl);
    }
};

export const API_URL = resolveApiUrl();
