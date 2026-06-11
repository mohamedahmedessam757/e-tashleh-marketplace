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

const INSTANT_REVEAL_MAX_CHARS = 40;
const MAX_REVEAL_MS = 400;

/** Reveals translated text quickly; instant for short messages */
export const TypewriterText: React.FC<TypewriterTextProps> = ({ text, active, className }) => {
  const [displayed, setDisplayed] = useState(active ? '' : text);

  useEffect(() => {
    if (!active) {
      setDisplayed(text);
      return;
    }
    if (!text) {
      setDisplayed('');
      return;
    }
    if (text.length <= INSTANT_REVEAL_MAX_CHARS) {
      setDisplayed(text);
      return;
    }

    setDisplayed('');
    let index = 0;
    const stepMs = Math.max(4, Math.min(12, Math.floor(MAX_REVEAL_MS / text.length)));
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, stepMs);

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
