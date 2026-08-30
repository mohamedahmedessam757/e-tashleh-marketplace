import { client } from './client';

export type OtpChannel = 'email' | 'whatsapp';

export const authApi = {
    login: async (email: string, password: string, fingerprint?: string) => {
        const response = await client.post('/auth/login', { email, password, fingerprint });
        return response.data;
    },

    registerCustomer: async (data: any) => {
        const response = await client.post('/auth/register/customer', data);
        return response.data;
    },

    registerInit: async (data: {
        email: string;
        phone: string;
        channel: OtpChannel;
        name?: string;
        role?: 'customer' | 'vendor';
    }) => {
        const response = await client.post('/auth/register-init', data);
        return response.data;
    },

    registerVerifyOtp: async (data: {
        email: string;
        phone: string;
        channel: OtpChannel;
        code: string;
    }) => {
        const response = await client.post('/auth/register-verify-otp', data);
        return response.data;
    },

    registerResendOtp: async (data: {
        email: string;
        phone: string;
        channel: OtpChannel;
        name?: string;
        role?: 'customer' | 'vendor';
    }) => {
        const response = await client.post('/auth/register-resend-otp', data);
        return response.data;
    },

    registerVendor: async (data: any) => {
        const response = await client.post('/auth/register/vendor', data);
        return response.data;
    },

    getProfile: async () => {
        const response = await client.get('/auth/profile');
        return response.data;
    },

    initiateMobileLogin: async (phone: string, role: 'customer' | 'merchant') => {
        const response = await client.post('/auth/mobile-login-init', { phone, role });
        return response.data;
    },

    initiateEmailLogin: async (email: string, role: 'customer' | 'merchant') => {
        const response = await client.post('/auth/email-login-init', { email, role });
        return response.data;
    },

    sendOTP: async (email: string, channel: OtpChannel) => {
        const response = await client.post('/auth/otp/send', { email, channel });
        return response.data;
    },

    verifyOTP: async (email: string, code: string, channel: OtpChannel) => {
        const response = await client.post('/auth/otp/verify', { email, code, channel });
        return response.data;
    },

    resendMobileLoginOtp: async (phone: string, role: 'customer' | 'merchant') => {
        const response = await client.post('/auth/mobile-login-resend', { phone, role });
        return response.data;
    },

    resendEmailLoginOtp: async (email: string, role: 'customer' | 'merchant') => {
        const response = await client.post('/auth/email-login-resend', { email, role });
        return response.data;
    },

    verifyMobileLogin: async (
        phone: string,
        code: string,
        role: 'customer' | 'merchant',
        fingerprint?: string,
    ) => {
        const response = await client.post('/auth/mobile-login-verify', {
            phone,
            code,
            role,
            fingerprint,
        });
        return response.data;
    },

    verifyEmailLogin: async (
        email: string,
        code: string,
        role: 'customer' | 'merchant',
        fingerprint?: string,
    ) => {
        const response = await client.post('/auth/email-login-verify', {
            email,
            code,
            role,
            fingerprint,
        });
        return response.data;
    },

    updateProfile: async (data: any) => {
        const response = await client.post('/users/profile/update', data);
        return response.data;
    },

    initContactChange: async (field: 'email' | 'phone', newValue: string) => {
        const response = await client.post('/users/profile/contact-change/init', { field, newValue });
        return response.data;
    },

    verifyContactChange: async (field: 'email' | 'phone', newValue: string, otp: string) => {
        const response = await client.post('/users/profile/contact-change/verify', {
            field,
            newValue,
            otp,
        });
        return response.data;
    },

    // Recovery API — redesigned 3-case flow
    recoveryLostPhoneStart: async (payload: {
        role: 'customer' | 'merchant';
        oldPhone: string;
        countryCode?: string;
    }) => {
        const response = await client.post('/auth/recovery/case/lost-phone/start', payload);
        return response.data;
    },
    recoveryLostPhoneVerifyProof: async (payload: {
        role: 'customer' | 'merchant';
        oldPhone: string;
        countryCode?: string;
        otp: string;
    }) => {
        const response = await client.post('/auth/recovery/case/lost-phone/verify-proof', payload);
        return response.data;
    },
    recoveryLostPhoneRequestNewOtp: async (payload: {
        role: 'customer' | 'merchant';
        oldPhone: string;
        countryCode?: string;
        newPhone: string;
        newCountryCode?: string;
    }) => {
        const response = await client.post(
            '/auth/recovery/case/lost-phone/request-new-phone-otp',
            payload,
        );
        return response.data;
    },
    recoveryLostPhoneConfirm: async (payload: {
        role: 'customer' | 'merchant';
        oldPhone: string;
        countryCode?: string;
        newPhone: string;
        newCountryCode?: string;
        phoneOtp: string;
    }) => {
        const response = await client.post('/auth/recovery/case/lost-phone/confirm', payload);
        return response.data;
    },
    recoveryLostEmailStart: async (payload: {
        role: 'customer' | 'merchant';
        oldEmail: string;
    }) => {
        const response = await client.post('/auth/recovery/case/lost-email/start', payload);
        return response.data;
    },
    recoveryLostEmailVerifyProof: async (payload: {
        role: 'customer' | 'merchant';
        oldEmail: string;
        otp: string;
    }) => {
        const response = await client.post('/auth/recovery/case/lost-email/verify-proof', payload);
        return response.data;
    },
    recoveryLostEmailRequestNewOtp: async (payload: {
        role: 'customer' | 'merchant';
        oldEmail: string;
        newEmail: string;
    }) => {
        const response = await client.post(
            '/auth/recovery/case/lost-email/request-new-email-otp',
            payload,
        );
        return response.data;
    },
    recoveryLostEmailConfirm: async (payload: {
        role: 'customer' | 'merchant';
        oldEmail: string;
        newEmail: string;
        emailOtp: string;
    }) => {
        const response = await client.post('/auth/recovery/case/lost-email/confirm', payload);
        return response.data;
    },
    recoveryLostBothSubmit: async (payload: {
        role: 'customer' | 'merchant';
        oldPhone: string;
        countryCode?: string;
        oldEmail: string;
    }) => {
        const response = await client.post('/auth/recovery/case/lost-both/submit', payload);
        return response.data;
    },
    recoveryLostBothRequestOtps: async (payload: {
        resumeToken: string;
        newPhone: string;
        newCountryCode?: string;
        newEmail: string;
    }) => {
        const response = await client.post('/auth/recovery/case/lost-both/request-otps', payload);
        return response.data;
    },
    recoveryLostBothComplete: async (payload: {
        resumeToken: string;
        newPhone: string;
        newCountryCode?: string;
        newEmail: string;
        phoneOtp: string;
        emailOtp: string;
    }) => {
        const response = await client.post('/auth/recovery/case/lost-both/complete', payload);
        return response.data;
    },

    // Session Management
    getSessions: async (lang?: 'ar' | 'en') => {
        const response = await client.get('/auth/sessions', {
            params: lang ? { lang } : undefined,
        });
        return response.data;
    },

    terminateAllSessions: async () => {
        const response = await client.delete('/auth/sessions/all');
        return response.data;
    },

    terminateSession: async (sessionId: string) => {
        const response = await client.delete(`/auth/sessions/${sessionId}`);
        return response.data;
    },

    deleteAccount: async () => {
        const response = await client.delete('/auth/me');
        return response.data;
    }
};
