import axios from 'axios';
import { API_URL } from './config';
import { clearAuthStorage } from '../../utils/clearAuthStorage';
import { getCorrelationId, setCorrelationIdFromResponse } from '../../utils/correlationId';
import { reportPlatformError } from '../../utils/platformErrorReporter';

const AUTH_API_PATHS = [
    '/auth/login',
    '/auth/mobile-login-init',
    '/auth/email-login-init',
    '/auth/mobile-login-verify',
    '/auth/email-login-verify',
    '/auth/mobile-login-resend',
    '/auth/email-login-resend',
    '/auth/register',
    '/auth/register-customer',
    '/auth/register-vendor',
    '/auth/otp',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/recovery',
    '/auth/admin-otp',
];

function isAuthApiRequest(url?: string): boolean {
    if (!url) return false;
    return AUTH_API_PATHS.some((path) => url.includes(path));
}

function isAuthPage(): boolean {
    if (typeof window === 'undefined') return false;
    return /^\/auth(\/|$)/.test(window.location.pathname);
}

export const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Correlation-Id'] = getCorrelationId();
    // Let the browser set multipart boundary — manual Content-Type breaks uploads
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
});

client.interceptors.response.use(
    (response) => {
        const cid = response.headers?.['x-correlation-id'] as string | undefined;
        setCorrelationIdFromResponse(cid);
        return response;
    },
    (error) => {
        const cid = error.response?.headers?.['x-correlation-id'] as string | undefined;
        setCorrelationIdFromResponse(cid);

        if (error.response?.status && error.response.status >= 500) {
            void reportPlatformError({
                errorName: 'ApiError',
                message: String(error.response?.data?.message || error.message || 'API error'),
                httpStatus: error.response.status,
                requestPath: error.config?.url,
            });
        }

        if (error.response?.status === 401) {
            const requestUrl = error.config?.url as string | undefined;
            const skipRedirect = isAuthApiRequest(requestUrl) || isAuthPage();

            if (!skipRedirect) {
                clearAuthStorage();
                if (typeof window !== 'undefined') {
                    window.location.href = '/';
                }
            }
        }
        return Promise.reject(error);
    }
);
