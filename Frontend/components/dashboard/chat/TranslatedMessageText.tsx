import React, { useEffect, useState } from 'react';

/** Animated typing dots while translation is in progress */
export const TranslationTypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1.5 py-1" aria-label="Translating">
    <span
      className="w-2 h-2 rounded-full bg-gold-400/70 animate-bounce"
      style={{ animationDelay: '0ms' }}
    />
    <span
      className="w-2 h-2 rounded-full bg-gold-400/70 animate-bounce"
      style={{ animationDelay: '120ms' }}
    />
    <span
      className="w-2 h-2 rounded-full bg-gold-400/70 animate-bounce"
      style={{ animationDelay: '240ms' }}
    />
  </div>
);

interface TypewriterTextProps {
  text: string;
  active: boolean;
  className?: string;
}

/** Reveals translated text character-by-character for a live-typing feel */
export const TypewriterText: React.FC<TypewriterTextProps> = ({ text, active, className }) => {
  const [displayed, setDisplayed] = useState(active ? '' : text);

  useEffect(() => {
    if (!active) {
      setDisplayed(text);
      return;
    }
    setDisplayed('');
    if (!text) return;

    let index = 0;
    const chars = Math.max(12, Math.min(40, Math.floor(600 / text.length)));
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, chars);

    return () => window.clearInterval(timer);
  }, [text, active]);

  return (
    <p className={className}>
      {displayed}
      {active && displayed.length < text.length && (
        <span className="inline-block w-0.5 h-4 ms-0.5 bg-gold-400/80 animate-pulse align-middle" />
      )}
    </p>
  );
};
