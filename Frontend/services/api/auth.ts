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

    initiateMobileLogin: async (phone: string) => {
        const response = await client.post('/auth/mobile-login-init', { phone });
        return response.data;
    },

    initiateEmailLogin: async (email: string) => {
        const response = await client.post('/auth/email-login-init', { email });
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

    resendMobileLoginOtp: async (phone: string) => {
        const response = await client.post('/auth/mobile-login-resend', { phone });
        return response.data;
    },

    resendEmailLoginOtp: async (email: string) => {
        const response = await client.post('/auth/email-login-resend', { email });
        return response.data;
    },

    verifyMobileLogin: async (phone: string, code: string, fingerprint?: string) => {
        const response = await client.post('/auth/mobile-login-verify', { phone, code, fingerprint });
        return response.data;
    },

    verifyEmailLogin: async (email: string, code: string, fingerprint?: string) => {
        const response = await client.post('/auth/email-login-verify', { email, code, fingerprint });
        return response.data;
    },

    updateProfile: async (data: any) => {
        const response = await client.post('/users/profile/update', data);
        return response.data;
    },

    // Recovery API endpoints
    requestRecoveryEmailOtp: async (email: string, role: 'customer' | 'merchant') => {
        const response = await client.post('/auth/recovery/request-email-otp', { email, role });
        return response.data;
    },

    verifyRecoveryEmailOtp: async (email: string, otp: string, role: 'customer' | 'merchant') => {
        const response = await client.post('/auth/recovery/verify-email-otp', { email, otp, role });
        return response.data;
    },

    requestRecoveryPhoneOtp: async (email: string, newPhone: string, role: 'customer' | 'merchant') => {
        const response = await client.post('/auth/recovery/request-phone-otp', { email, newPhone, role });
        return response.data;
    },

    submitRecovery: async (email: string, newPhone: string, phoneOtp: string, role: 'customer' | 'merchant') => {
        const response = await client.post('/auth/recovery/submit', { email, newPhone, phoneOtp, role });
        return response.data;
    },

    // Session Management
    getSessions: async () => {
        const response = await client.get('/auth/sessions');
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
