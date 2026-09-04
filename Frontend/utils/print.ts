/**
 * Professional Print Utility (v2026)
 * Invoice print uses a hidden off-screen iframe only — no HTML popup window.
 */

import { CONTRACT_PRINT_CSS } from './contractPrintStyles';

const escapeAttr = (value: string): string =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

/** White-paper invoice: organized like screen UI, compact to avoid extra pages */
const INVOICE_ISOLATED_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body {
  background: #ffffff !important;
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  font-family: system-ui, "Segoe UI", Tahoma, Arial, sans-serif;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
@page {
  size: A4 portrait;
  margin: 10mm;
}
.inv-print-root {
  display: block !important;
  position: static !important;
  left: auto !important;
  top: auto !important;
  width: 100% !important;
  max-width: 190mm !important;
  margin: 0 auto !important;
  padding: 0 !important;
  background: #ffffff !important;
  color: #111827 !important;
  overflow: visible !important;
  height: auto !important;
  min-height: 0 !important;
}
.inv-print-root * {
  max-width: 100%;
  box-shadow: none !important;
  text-shadow: none !important;
  filter: none !important;
  transform: none !important;
  animation: none !important;
  transition: none !important;
}

/* Never emit URL after links */
a, a:link, a:visited {
  color: inherit !important;
  text-decoration: none !important;
  pointer-events: none !important;
}
a[href]::after,
a[href]::before {
  content: none !important;
  display: none !important;
}

/* Layout mirrors dashboard structure */
.inv-print-root .flex { display: flex !important; }
.inv-print-root .flex-col { flex-direction: column !important; }
.inv-print-root .flex-row,
.inv-print-root .sm\\:flex-row { flex-direction: row !important; }
.inv-print-root .items-start { align-items: flex-start !important; }
.inv-print-root .items-center { align-items: center !important; }
.inv-print-root .justify-between { justify-content: space-between !important; }
.inv-print-root .justify-center { justify-content: center !important; }
.inv-print-root .gap-2 { gap: 6px !important; }
.inv-print-root .gap-4 { gap: 10px !important; }
.inv-print-root .gap-6,
.inv-print-root .sm\\:gap-6 { gap: 12px !important; }
.inv-print-root .grid {
  display: grid !important;
  gap: 10px !important;
  width: 100% !important;
}
.inv-print-root .md\\:grid-cols-2,
.inv-print-root .sm\\:grid-cols-2,
.inv-print-root .grid-cols-1.md\\:grid-cols-2 {
  grid-template-columns: 1fr 1fr !important;
}
.inv-print-root .min-w-0 { min-width: 0 !important; }
.inv-print-root .shrink-0 { flex-shrink: 0 !important; }
.inv-print-root .truncate {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
.inv-print-root .break-all,
.inv-print-root .break-words {
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  white-space: normal !important;
}
.inv-print-root .space-y-1\\.5 > * + *,
.inv-print-root .space-y-2 > * + * { margin-top: 5px !important; }
.inv-print-root .mt-4 { margin-top: 10px !important; }
.inv-print-root .mt-6 { margin-top: 12px !important; }
.inv-print-root .mt-8 { margin-top: 12px !important; }
.inv-print-root .mt-12 { margin-top: 12px !important; }
.inv-print-root .mb-1 { margin-bottom: 3px !important; }
.inv-print-root .mb-2 { margin-bottom: 5px !important; }
.inv-print-root .mb-4 { margin-bottom: 8px !important; }
.inv-print-root .pb-6 { padding-bottom: 10px !important; }
.inv-print-root .pt-8 { padding-top: 10px !important; }
.inv-print-root .p-4 { padding: 10px !important; }
.inv-print-root .p-5 { padding: 11px !important; }
.inv-print-root .px-6 { padding-left: 12px !important; padding-right: 12px !important; }
.inv-print-root .py-4 { padding-top: 10px !important; padding-bottom: 10px !important; }

.inv-label {
  color: #6b7280 !important;
  -webkit-text-fill-color: #6b7280 !important;
  font-size: 10.5px !important;
  line-height: 1.35 !important;
}
.inv-value {
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
  font-weight: 700 !important;
  font-size: 12px !important;
  line-height: 1.35 !important;
}
.inv-icon {
  color: #b8860b !important;
  -webkit-text-fill-color: #b8860b !important;
  flex-shrink: 0 !important;
  width: 13px !important;
  height: 13px !important;
}

.inv-section {
  background: #fafafa !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 8px !important;
  padding: 10px 12px !important;
  margin: 0 0 8px 0 !important;
  overflow: hidden !important;
  break-inside: auto !important;
  page-break-inside: auto !important;
}
.inv-section-header {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  border-bottom: 1px solid #e5e7eb !important;
  margin-bottom: 8px !important;
  padding-bottom: 5px !important;
}
.inv-section-header h3 {
  color: #b8860b !important;
  -webkit-text-fill-color: #b8860b !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  margin: 0 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
}
.inv-section-header svg {
  color: #b8860b !important;
  width: 13px !important;
  height: 13px !important;
}

.inv-total-box {
  background: #fffbeb !important;
  border: 2px solid #b8860b !important;
  padding: 12px !important;
  margin: 10px 0 !important;
  border-radius: 8px !important;
  text-align: center !important;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.inv-total-box span,
.inv-total-box p {
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
}
.inv-total-amount {
  color: #b8860b !important;
  -webkit-text-fill-color: #b8860b !important;
  font-weight: 900 !important;
  font-size: 24px !important;
}

/* Policies stay on screen only — print body would add empty pages */
.inv-policy-body,
.inv-policy-chevron { display: none !important; }
.inv-screen-img {
  display: block !important;
}
.inv-screen-img img {
  max-height: 100px !important;
  width: auto !important;
  max-width: 100% !important;
  object-fit: cover !important;
  border: 1px solid #d1d5db !important;
  border-radius: 6px !important;
}
.no-print,
.print\\:hidden { display: none !important; }
/* Print-only brand header with E-Tashleh logo */
.hidden.print\\:flex,
.inv-print-logo-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  background: transparent !important;
  border: none !important;
  border-bottom: 2px solid #b8860b !important;
  border-radius: 0 !important;
  margin: 0 0 12px 0 !important;
  padding: 0 0 10px 0 !important;
  page-break-inside: avoid !important;
}
.inv-print-logo-header h1 {
  color: #b8860b !important;
  -webkit-text-fill-color: #b8860b !important;
  font-size: 22px !important;
  font-weight: 900 !important;
  margin: 0 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
}
.hidden:not(.print\\:block):not(.print\\:flex):not(.inv-print-logo-header) { display: none !important; }
.hidden.print\\:block,
.print\\:block { display: block !important; }

.inv-print-qr {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  margin: 6px 0 !important;
}
.inv-footer {
  border-top: 1px solid #e5e7eb !important;
  padding-top: 10px !important;
  margin-top: 10px !important;
  text-align: center !important;
  color: #6b7280 !important;
  -webkit-text-fill-color: #6b7280 !important;
  font-size: 9.5px !important;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}

.text-white,
.text-white\\/80,
.text-white\\/90 {
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
}
.text-gray-300,
.text-gray-400,
.text-gray-500,
.text-gray-600,
.text-gray-800 {
  color: #6b7280 !important;
  -webkit-text-fill-color: #6b7280 !important;
}
.text-gold-500,
.text-gold-400,
.text-\\[\\#b8860b\\] {
  color: #b8860b !important;
  -webkit-text-fill-color: #b8860b !important;
}
.bg-white\\/5,
.bg-black\\/20,
.bg-black\\/40 { background: #f9fafb !important; }
.border-white\\/5,
.border-white\\/10,
.border-b { border-color: #e5e7eb !important; }
.border-gold-500\\/20,
.border-gold-500\\/30,
.border-gold-500 { border-color: rgba(184, 134, 11, 0.4) !important; }
.rounded-xl,
.rounded-lg { border-radius: 8px !important; }

/* Watermarks / absolute layers create phantom empty space */
.inv-print-root .absolute { display: none !important; }
.inv-print-root .relative { position: static !important; }

img { max-width: 56px !important; max-height: 56px !important; height: auto !important; object-fit: contain !important; }
.inv-brand-logo,
.inv-print-logo-header img {
  max-width: 64px !important;
  max-height: 64px !important;
  width: 64px !important;
  height: 64px !important;
  object-fit: contain !important;
  display: block !important;
}
.inv-footer img,
.inv-print-qr svg,
.inv-footer svg { max-width: 110px !important; max-height: 110px !important; }
svg { flex-shrink: 0; }
button { border: 0 !important; background: transparent !important; padding: 0 !important; }
`;

/** Strip SPA chrome that causes URLs / offscreen layout / bloat in print HTML */
function preparePrintHtml(html: string, rootClass: 'inv-print-root' | 'ctr-print-root' = 'inv-print-root'): string {
    try {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const root = parsed.body.firstElementChild as HTMLElement | null;
        if (!root) return html;

        root.removeAttribute('style');
        root.style.cssText = '';
        root.classList.add(rootClass);

        root.querySelectorAll('a[href]').forEach((node) => {
            const a = node as HTMLAnchorElement;
            a.removeAttribute('href');
            a.removeAttribute('target');
            a.removeAttribute('rel');
        });

        root.querySelectorAll('[class*="print:hidden"], .no-print, .inv-policy-body').forEach((el) => {
            el.remove();
        });
        // Prefer printed photos over image-link QR duplicates
        root.querySelectorAll('.inv-screen-img').forEach((photo) => {
            const sibling = photo.parentElement?.querySelector('.inv-print-qr');
            if (sibling) sibling.remove();
        });

        // Keep print-only blocks (logo header / policy hint); drop other hidden chrome
        root.querySelectorAll('.hidden').forEach((el) => {
            const cls = typeof el.className === 'string' ? el.className : '';
            const keepPrint =
                cls.includes('print:block') ||
                cls.includes('print:flex') ||
                cls.includes('inv-print-logo-header');
            if (!keepPrint) {
                el.remove();
                return;
            }
            el.classList.remove('hidden');
            const host = el as HTMLElement;
            if (cls.includes('print:flex') || cls.includes('inv-print-logo-header')) {
                host.style.display = 'flex';
            } else {
                host.style.display = 'block';
            }
        });

        // Absolute image URLs so logo loads inside the print iframe
        root.querySelectorAll('img[src]').forEach((node) => {
            const img = node as HTMLImageElement;
            const src = img.getAttribute('src');
            if (!src || src.startsWith('data:') || src.startsWith('blob:') || /^https?:\/\//i.test(src)) return;
            try {
                img.setAttribute('src', new URL(src, window.location.origin).href);
            } catch {
                /* ignore */
            }
        });

        return root.outerHTML;
    } catch {
        return html;
    }
}

function buildInvoiceDocument(html: string, title: string, dir: 'rtl' | 'ltr'): string {
    const lang = dir === 'rtl' ? 'ar' : 'en';
    const safeTitle = escapeAttr(title);
    const bodyHtml = preparePrintHtml(html, 'inv-print-root');
    return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>${safeTitle}</title>
<style>${INVOICE_ISOLATED_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function buildContractDocument(html: string, title: string, dir: 'rtl' | 'ltr'): string {
    const lang = dir === 'rtl' ? 'ar' : 'en';
    const safeTitle = escapeAttr(title);
    const bodyHtml = preparePrintHtml(html, 'ctr-print-root');
    return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>${safeTitle}</title>
<style>${CONTRACT_PRINT_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function collectStylesheetLinksHtml(): string {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    let out = '';
    links.forEach((link) => {
        const href = (link as HTMLLinkElement).href;
        if (!href) return;
        out += `<link rel="stylesheet" href="${escapeAttr(href)}">`;
    });
    return out;
}

/**
 * Hidden iframe print — no popup tab/window. Only the browser print dialog appears.
 * Resolves right after print() so the app UI unlocks immediately.
 */
function printViaHiddenIframe(docHtml: string, title: string): Promise<void> {
    return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.setAttribute('title', title);
        // Real A4 size, off-screen only — do NOT use opacity/visibility:0 (Chrome prints blank pages)
        iframe.style.cssText =
            'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;opacity:1;background:#fff;z-index:-1;pointer-events:none';

        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
            const cleanup = () => {
                try {
                    if (document.body.contains(iframe)) document.body.removeChild(iframe);
                } catch {
                    /* ignore */
                }
                try {
                    window.focus();
                } catch {
                    /* ignore */
                }
            };
            iframe.contentWindow?.addEventListener('afterprint', cleanup);
            window.setTimeout(cleanup, 60_000);
        };

        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
            resolve();
            return;
        }

        doc.open();
        doc.write(docHtml);
        doc.close();

        const waitForImages = (): Promise<void> => {
            const images = Array.from(doc.images || []);
            if (images.length === 0) return Promise.resolve();
            return Promise.all(
                images.map(
                    (img) =>
                        new Promise<void>((res) => {
                            if (img.complete && img.naturalWidth > 0) {
                                res();
                                return;
                            }
                            const done = () => res();
                            img.addEventListener('load', done, { once: true });
                            img.addEventListener('error', done, { once: true });
                            window.setTimeout(done, 1500);
                        }),
                ),
            ).then(() => undefined);
        };

        void waitForImages().then(() => {
            window.setTimeout(() => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch {
                    /* ignore */
                }
                finish();
            }, 120);
        });
    });
}

/**
 * Legacy helper used by contracts/profiles (keeps app stylesheets).
 */
export const printHtml = (html: string, title: string = 'Print Document') => {
    const safeTitle = escapeAttr(title);
    const docHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
${collectStylesheetLinksHtml()}
<style>
  @page { size: A4; margin: 12mm; }
  html, body { background: #fff; color: #111; margin: 0; padding: 12px; }
  a[href]::after, a[href]::before { content: none !important; display: none !important; }
</style>
</head>
<body>${html}</body>
</html>`;
    void printViaHiddenIframe(docHtml, title);
};

export type PrintIsolatedOptions = {
    dir?: 'rtl' | 'ltr';
};

/**
 * Invoice print via hidden iframe only (no HTML popup window).
 */
export const printIsolatedHtml = (
    html: string,
    title: string = 'Print Document',
    options: PrintIsolatedOptions = {},
): Promise<void> => {
    const dir = options.dir === 'ltr' ? 'ltr' : 'rtl';
    return printViaHiddenIframe(buildInvoiceDocument(html, title, dir), title);
};

/**
 * Contract print via hidden iframe — professional A4 layout matching invoices.
 */
export const printContractHtml = (
    html: string,
    title: string = 'Contract',
    options: PrintIsolatedOptions = {},
): Promise<void> => {
    const dir = options.dir === 'ltr' ? 'ltr' : 'rtl';
    return printViaHiddenIframe(buildContractDocument(html, title, dir), title);
};
