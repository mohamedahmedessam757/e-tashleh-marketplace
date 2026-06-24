import React, { forwardRef } from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
  enableHover?: boolean;
  enableBlur?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({
  children,
  className = '',
  delay = 0,
  onClick,
  enableHover = true,
  enableBlur = true
}, ref) => {
  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{ animationDelay: `${delay}s` }}
      className={`
        animate-fade-in-up
        bg-white/5 
        ${enableBlur ? 'backdrop-blur-xl' : ''} 
        border border-white/10 
        shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] 
        rounded-2xl 
        p-6 
        ${enableHover ? 'hover:bg-white/10 hover:border-gold-400/30' : ''}
        transition-colors 
        duration-300
        ${className}
      `}
    >
      {children}
    </div>
  );
});

GlassCard.displayName = 'GlassCard';
