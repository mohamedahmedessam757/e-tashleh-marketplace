import DOMPurify from 'dompurify';

/** Escape text for safe HTML interpolation */
export function escapeHtml(text: string | null | undefined): string {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize CMS/contract HTML snapshots before rendering with dangerouslySetInnerHTML.
 *
 * Uses DOMPurify (battle-tested) instead of hand-rolled regexes, which are trivially
 * bypassable (e.g. `<img onerror>`, `<svg>`, mutation-XSS). We allow only basic formatting
 * tags and forbid anything that can execute script or load remote/interactive content.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'span', 'div',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'a',
    ],
    ALLOWED_ATTR: ['class', 'style', 'dir', 'href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'svg', 'math'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
}
