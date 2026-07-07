import React from 'react';

interface StaticPageBodyProps {
  content: string;
  className?: string;
}

/** Renders static page markdown-ish content with line breaks preserved. */
export const StaticPageBody: React.FC<StaticPageBodyProps> = ({ content, className = '' }) => (
  <div className={`whitespace-pre-line leading-relaxed text-white/70 ${className}`}>{content}</div>
);
