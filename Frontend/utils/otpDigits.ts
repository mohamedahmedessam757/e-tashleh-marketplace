/** Shared OTP digit helpers — paste / SMS autofill safe. */

export const OTP_DIGIT_LENGTH = 6;

/** Extract up to `length` numeric digits from any clipboard / autofill string. */
export function extractOtpDigits(raw: string, length: number = OTP_DIGIT_LENGTH): string {
  return String(raw ?? '').replace(/\D/g, '').slice(0, length);
}

/** Build a fixed-length digit array from a raw string (pads with ''). */
export function toOtpDigitArray(
  raw: string,
  length: number = OTP_DIGIT_LENGTH,
): string[] {
  const digits = extractOtpDigits(raw, length).split('');
  return Array.from({ length }, (_, i) => digits[i] ?? '');
}

export function emptyOtpDigits(length: number = OTP_DIGIT_LENGTH): string[] {
  return Array.from({ length }, () => '');
}

export function otpDigitsToCode(digits: string[]): string {
  return digits.join('');
}

export function isOtpComplete(
  digits: string[],
  length: number = OTP_DIGIT_LENGTH,
): boolean {
  return digits.length === length && digits.every((d) => d !== '' && /^\d$/.test(d));
}
