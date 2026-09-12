import React from 'react';
import { X } from 'lucide-react';

const SIZE_MAP = {
  sm: { btn: 'w-9 h-9 min-w-[36px] min-h-[36px]', icon: 16 },
  md: { btn: 'w-10 h-10 min-w-[40px] min-h-[40px]', icon: 18 },
  lg: { btn: 'w-11 h-11 min-w-[44px] min-h-[44px]', icon: 22 },
} as const;

export type CloseIconButtonSize = keyof typeof SIZE_MAP;

export interface CloseIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: CloseIconButtonSize;
  /** Override lucide icon pixel size */
  iconSize?: number;
}

/**
 * Shared dismiss control — glowing red X for modal/drawer close affordances.
 * Do not use for status icons (XCircle) or reject/cancel text CTAs.
 */
export const CloseIconButton = React.forwardRef<HTMLButtonElement, CloseIconButtonProps>(
  (
    {
      size = 'md',
      iconSize,
      className = '',
      type = 'button',
      'aria-label': ariaLabel = 'Close',
      ...rest
    },
    ref,
  ) => {
    const dims = SIZE_MAP[size] || SIZE_MAP.md;
    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        className={[
          'inline-flex items-center justify-center shrink-0 rounded-xl',
          'bg-red-500/15 text-red-400 border border-red-500/40',
          'shadow-[0_0_14px_rgba(239,68,68,0.45)]',
          'hover:bg-red-500/30 hover:text-red-200 hover:border-red-400/70',
          'hover:shadow-[0_0_20px_rgba(239,68,68,0.65)]',
          'active:scale-95 transition-all',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60',
          dims.btn,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        <X size={iconSize ?? dims.icon} strokeWidth={2.5} aria-hidden />
      </button>
    );
  },
);

CloseIconButton.displayName = 'CloseIconButton';

export default CloseIconButton;
