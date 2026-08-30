export enum OtpPurpose {
    REGISTER = 'REGISTER',
    LOGIN = 'LOGIN',
    /** @deprecated Prefer RECOVERY_PROOF / RECOVERY_NEW_CONTACT */
    RECOVERY_STEP1 = 'RECOVERY_STEP1',
    /** @deprecated Prefer RECOVERY_NEW_CONTACT */
    RECOVERY_PHONE = 'RECOVERY_PHONE',
    /** Proof of ownership via the channel the user still has (email or WhatsApp) */
    RECOVERY_PROOF = 'RECOVERY_PROOF',
    /** Confirm ownership of a new phone or email before binding */
    RECOVERY_NEW_CONTACT = 'RECOVERY_NEW_CONTACT',
    PROFILE_CHANGE = 'PROFILE_CHANGE',
}

export type OtpChannel = 'email' | 'whatsapp';

export const OTP_EXPIRY_MINUTES = 3;
export const OTP_MAX_VERIFY_ATTEMPTS = 4;
export const OTP_MAX_ISSUE_PER_WINDOW = 5;
export const OTP_ISSUE_WINDOW_MINUTES = 15;

/** Dev fallback when delivery channels are disabled — set OTP_DEV_BYPASS=false before go-live */
export const OTP_DEV_BYPASS_CODE = '123456';
