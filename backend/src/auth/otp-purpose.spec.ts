import { OTP_EXPIRY_MINUTES, OTP_MAX_VERIFY_ATTEMPTS } from './otp-purpose';

describe('OTP recovery limits', () => {
    it('uses 3-minute expiry and 4 verify attempts', () => {
        expect(OTP_EXPIRY_MINUTES).toBe(3);
        expect(OTP_MAX_VERIFY_ATTEMPTS).toBe(4);
    });
});
