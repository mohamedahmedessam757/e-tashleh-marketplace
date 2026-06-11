import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

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
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      onClick={onClick}
      className={`
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
    </motion.div>
  );
});

GlassCard.displayName = 'GlassCard';