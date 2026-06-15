/** Mirrors backend/src/auth/otp-purpose.ts OTP_EXPIRY_MINUTES */
export const OTP_EXPIRY_MINUTES = 3;
export const OTP_EXPIRY_SECONDS = OTP_EXPIRY_MINUTES * 60;

export function otpSecondsFromMinutes(minutes?: number): number {
    if (typeof minutes === 'number' && minutes > 0) {
        return Math.round(minutes * 60);
    }
    return OTP_EXPIRY_SECONDS;
}

export function formatOtpCountdown(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
