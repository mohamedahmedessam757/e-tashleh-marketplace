import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';

interface OtpErrorCardProps {
  message: string;
}

function isRateLimitMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('too many') ||
    lower.includes('attempts remaining') ||
    lower.includes('wait before') ||
    lower.includes('محاولات') ||
    lower.includes('انتظر')
  );
}

export const OtpErrorCard: React.FC<OtpErrorCardProps> = ({ message }) => {
  const rateLimited = isRateLimitMessage(message);

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        rateLimited
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
          : 'border-red-500/40 bg-red-500/10 text-red-400'
      }`}
      role="alert"
    >
      {rateLimited ? (
        <Clock className="w-5 h-5 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      )}
      <span className="text-center flex-1 leading-relaxed">{message}</span>
    </div>
  );
};
