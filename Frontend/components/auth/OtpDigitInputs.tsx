import React, { useRef } from 'react';
import {
  OTP_DIGIT_LENGTH,
  extractOtpDigits,
  toOtpDigitArray,
} from '../../utils/otpDigits';

export interface OtpDigitInputsProps {
  value: string[];
  onChange: (digits: string[]) => void;
  length?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  /** Optional key prefix when multiple OTP rows exist on one screen */
  idPrefix?: string;
  autoFocus?: boolean;
}

const DEFAULT_INPUT_CLASS =
  'w-9 h-11 sm:w-11 sm:h-12 md:w-12 md:h-14 shrink-0 rounded-xl bg-white/5 border border-white/10 text-center text-lg sm:text-xl font-bold text-white focus:border-gold-500 outline-none transition-all focus:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * 6-box OTP input with full paste + SMS autofill support.
 * Pasting "123456" or "Your code is 123456" fills every cell.
 */
export const OtpDigitInputs: React.FC<OtpDigitInputsProps> = ({
  value,
  onChange,
  length = OTP_DIGIT_LENGTH,
  disabled = false,
  className = 'flex w-full max-w-[320px] sm:max-w-sm mx-auto justify-between gap-1.5 sm:gap-2',
  inputClassName = DEFAULT_INPUT_CLASS,
  idPrefix = 'otp',
  autoFocus = false,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusAt = (index: number) => {
    const clamped = Math.max(0, Math.min(index, length - 1));
    // rAF: focus after React commits the new controlled values
    requestAnimationFrame(() => inputRefs.current[clamped]?.focus());
  };

  const commitDigits = (next: string[], focusIndex: number) => {
    onChange(next);
    focusAt(focusIndex);
  };

  /**
   * Distribute digits into boxes.
   * - Full-length codes always replace the whole row (best paste UX).
   * - Shorter pastes fill from the focused cell forward.
   */
  const applyDigits = (raw: string, startIndex = 0) => {
    const incoming = extractOtpDigits(raw, length);
    if (!incoming) return;

    if (incoming.length >= length || (incoming.length > 1 && startIndex === 0)) {
      const next = toOtpDigitArray(incoming, length);
      commitDigits(next, Math.min(incoming.length, length) - 1);
      return;
    }

    const next = Array.from({ length }, (_, i) => value[i] ?? '');
    for (let i = 0; i < incoming.length && startIndex + i < length; i++) {
      next[startIndex + i] = incoming[i];
    }
    commitDigits(next, Math.min(startIndex + incoming.length, length) - 1);
  };

  const handleChange = (index: number, raw: string) => {
    if (disabled) return;
    const cleaned = extractOtpDigits(raw, length);

    // SMS autofill / OS paste often lands as a multi-digit onChange on one cell
    if (cleaned.length > 1) {
      applyDigits(cleaned, index);
      return;
    }

    const next = Array.from({ length }, (_, i) => value[i] ?? '');
    next[index] = cleaned;
    onChange(next);
    if (cleaned && index < length - 1) focusAt(index + 1);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (value[index]) {
        // Let controlled onChange clear the current cell
        return;
      }
      if (index > 0) {
        e.preventDefault();
        const next = Array.from({ length }, (_, i) => value[i] ?? '');
        next[index - 1] = '';
        commitDigits(next, index - 1);
      }
      return;
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      focusAt(index + 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusAt(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusAt(length - 1);
    }
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    applyDigits(e.clipboardData.getData('text'), index);
  };

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  return (
    <div className={className} dir="ltr" role="group" aria-label="One-time password">
      {digits.map((digit, index) => (
        <input
          key={`${idPrefix}-${index}`}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint={index === length - 1 ? 'done' : 'next'}
          autoFocus={autoFocus && index === 0}
          maxLength={length}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={(e) => e.target.select()}
          className={inputClassName}
        />
      ))}
    </div>
  );
};
