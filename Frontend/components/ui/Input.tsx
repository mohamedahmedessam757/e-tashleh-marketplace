
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ElementType;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative group">
          <input
            ref={ref}
            className={`
              ${error
                ? 'border-red-500 ring-2 ring-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)] focus:border-red-500'
                : 'border-white/5 focus:border-gold-500'
              }
              ${Icon ? 'pl-11' : ''}
              ${className}
            `}
            placeholder={label}
            {...props}
          />
          <label
            className={`
              absolute left-4 -top-2.5 bg-[#1A1814] px-2 text-xs text-white/50 transition-all 
              peer-placeholder-shown:text-base peer-placeholder-shown:text-white/40 peer-placeholder-shown:top-3.5 
              peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-gold-500
              ${Icon ? 'peer-placeholder-shown:left-11' : ''}
            `}
          >
            {label}
          </label>
          {Icon && (
            <Icon className="absolute left-4 top-3.5 w-5 h-5 text-white/30 peer-focus:text-gold-500 transition-colors pointer-events-none" />
          )}
        </div>
        {error && (
          <div className="flex items-center gap-1 mt-1 text-red-400 text-xs px-2 animate-in slide-in-from-top-1">
            <AlertCircle size={12} />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
