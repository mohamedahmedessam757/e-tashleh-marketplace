/**
 * Professional Print Utility (v2026)
 * Isolated iframe printing — keep iframe until afterprint so Chromium preview is not blank.
 */

const escapeAttr = (value: string): string =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

/**
 * Self-contained light invoice CSS. No Tailwind app theme.
 * Must neutralize offscreen host styles (left:-10000px) copied via outerHTML.
 */
const INVOICE_ISOLATED_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body {
  background: #fff !important;
  color: #111 !important;
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: auto !important;
  overflow: visible !important;
  font-family: system-ui, "Segoe UI", Tahoma, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@page { size: A4 portrait; margin: 12mm; }

/* Kill offscreen host positioning copied from the SPA (left:-10000px etc.) */
.inv-print-root,
#invoice-print-source,
#order-invoice-print-source {
  position: static !important;
  left: auto !important;
  right: auto !important;
  top: auto !important;
  bottom: auto !important;
  transform: none !important;
  inset: auto !important;
  width: 100% !important;
  max-width: 100% !important;
  height: auto !important;
  margin: 0 !important;
  padding: 8mm !important;
  background: #fff !important;
  color: #111 !important;
  overflow: visible !important;
  opacity: 1 !important;
  visibility: visible !important;
  clip: auto !important;
  clip-path: none !important;
}

.inv-print-root *,
#invoice-print-source *,
#order-invoice-print-source * {
  visibility: visible !important;
}

/* Layout utilities (Tailwind classes exist in HTML but CSS is not loaded) */
.flex { display: flex !important; }
.inline-flex { display: inline-flex !important; }
.flex-col { flex-direction: column !important; }
.flex-row { flex-direction: row !important; }
.flex-wrap { flex-wrap: wrap !important; }
.items-start { align-items: flex-start !important; }
.items-center { align-items: center !important; }
.items-end { align-items: flex-end !important; }
.justify-between { justify-content: space-between !important; }
.justify-center { justify-content: center !important; }
.justify-end { justify-content: flex-end !important; }
.gap-1 { gap: 0.25rem !important; }
.gap-2 { gap: 0.5rem !important; }
.gap-3 { gap: 0.75rem !important; }
.gap-4 { gap: 1rem !important; }
.gap-5 { gap: 1.25rem !important; }
.gap-6 { gap: 1.5rem !important; }
.grid { display: grid !important; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
.w-full { width: 100% !important; }
.w-4 { width: 1rem !important; }
.w-5 { width: 1.25rem !important; }
.w-12 { width: 3rem !important; }
.w-16 { width: 4rem !important; }
.h-4 { height: 1rem !important; }
.h-5 { height: 1.25rem !important; }
.h-12 { height: 3rem !important; }
.h-16 { height: 4rem !important; }
.shrink-0 { flex-shrink: 0 !important; }
.truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
.break-all { word-break: break-all !important; }
.text-center { text-align: center !important; }
.text-right { text-align: right !important; }
.text-left { text-align: left !important; }
.font-bold, .font-semibold, .font-black { font-weight: 700 !important; }
.font-mono { font-family: ui-monospace, monospace !important; }
.uppercase { text-transform: uppercase !important; }
.rounded-lg, .rounded-xl { border-radius: 8px !important; }
.border { border: 1px solid #ddd !important; }
.border-b, .border-b-2 { border-bottom: 2px solid #b8860b !important; }
.pb-2 { padding-bottom: 0.5rem !important; }
.pb-6 { padding-bottom: 1.5rem !important; }
.pt-0 { padding-top: 0 !important; }
.pt-4 { padding-top: 1rem !important; }
.p-2 { padding: 0.5rem !important; }
.p-4 { padding: 1rem !important; }
.mb-1 { margin-bottom: 0.25rem !important; }
.mb-2 { margin-bottom: 0.5rem !important; }
.mb-4 { margin-bottom: 1rem !important; }
.mb-8 { margin-bottom: 2rem !important; }
.mt-1 { margin-top: 0.25rem !important; }
.mt-2 { margin-top: 0.5rem !important; }
.mt-4 { margin-top: 1rem !important; }
.mt-8 { margin-top: 2rem !important; }
.space-y-1 > * + * { margin-top: 0.25rem !important; }
.space-y-1\\.5 > * + * { margin-top: 0.375rem !important; }
.space-y-2 > * + * { margin-top: 0.5rem !important; }
.object-contain { object-fit: contain !important; }

.inv-label { color: #555 !important; font-size: 12px !important; }
.inv-value, h1, h2, h3, p, span, td, th, div, label, li {
  color: #111 !important;
}
.text-white, .text-gray-300, .text-gray-400, .text-gray-500, .text-gray-600, .text-gray-700 {
  color: #111 !important;
}
.inv-total-amount, .inv-icon, .inv-section-header h3, .text-gold-500, .text-\\[\\#b8860b\\] {
  color: #b8860b !important;
}
.inv-section {
  border: 1px solid #ccc !important;
  border-radius: 6px !important;
  padding: 12px !important;
  margin-bottom: 10px !important;
  background: #fff !important;
  /* avoid blank pages: do NOT force break-inside:avoid on large blocks */
}
.inv-section-header {
  border-bottom: 1px solid #eee !important;
  margin-bottom: 12px !important;
  padding-bottom: 8px !important;
}
.inv-total-box {
  border: 2px solid #b8860b !important;
  border-radius: 8px !important;
  padding: 16px !important;
  margin: 12px 0 !important;
  background: #fdfbf7 !important;
}
.inv-screen-img { display: none !important; }
.inv-print-qr { display: flex !important; flex-direction: column !important; align-items: center !important; }
.inv-footer {
  border-top: 1px solid #eee !important;
  padding-top: 20px !important;
  margin-top: 20px !important;
  text-align: center !important;
}

/* Screen-only / collapsed → visible for print */
.no-print,
.print\\:hidden { display: none !important; }
.inv-policy-chevron { display: none !important; }
.inv-policy-body {
  display: block !important;
  height: auto !important;
  overflow: visible !important;
}
.hidden.print\\:flex,
.print\\:flex {
  display: flex !important;
}
.hidden.print\\:block,
.print\\:block {
  display: block !important;
}

img { max-width: 100% !important; height: auto !important; }
svg { max-width: 100% !important; overflow: visible !important; color: #b8860b !important; }

@media print {
  html, body, .inv-print-root {
    position: static !important;
    left: auto !important;
    width: 100% !important;
    background: #fff !important;
  }
}
`;

function createPrintIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.id = 'ft-print-iframe-' + Date.now();
    iframe.setAttribute('aria-hidden', 'true');
    // Keep a real layout box so browsers compute print geometry correctly
    iframe.style.position = 'fixed';
    iframe.style.left = '0';
    iframe.style.top = '0';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-1';
    document.body.appendChild(iframe);
    return iframe;
}

function bindAfterPrintCleanup(
    iframe: HTMLIFrameElement,
    onDone?: () => void,
): void {
    const win = iframe.contentWindow;
    if (!win) {
        onDone?.();
        return;
    }

    let cleaned = false;
    const finish = () => {
        if (cleaned) return;
        cleaned = true;
        win.removeEventListener('afterprint', finish);
        mediaQueryList?.removeEventListener?.('change', onPrintMqChange);
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
        onDone?.();
    };

    const onPrintMqChange = (e: MediaQueryListEvent) => {
        if (!e.matches) finish();
    };
    const mediaQueryList = win.matchMedia?.('print');
    mediaQueryList?.addEventListener?.('change', onPrintMqChange);
    win.addEventListener('afterprint', finish);
}

/**
 * Strip SPA offscreen host styles and expand print-only / collapsed nodes
 * so the serialized invoice is actually printable.
 */
function prepareInvoiceHtmlForPrint(html: string): string {
    try {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, 'text/html');
        const root = parsed.body.firstElementChild as HTMLElement | null;
        if (!root) return html;

        root.removeAttribute('style');
        root.removeAttribute('aria-hidden');
        root.classList.add('inv-print-root');

        root.querySelectorAll('.inv-policy-body').forEach((node) => {
            const el = node as HTMLElement;
            el.classList.remove('hidden');
            el.style.display = 'block';
        });

        root.querySelectorAll('.hidden').forEach((node) => {
            const el = node as HTMLElement;
            if (el.classList.contains('print:flex')) {
                el.classList.remove('hidden');
                el.style.display = 'flex';
            } else if (el.classList.contains('print:block')) {
                el.classList.remove('hidden');
                el.style.display = 'block';
            }
        });

        root.querySelectorAll('.print\\:hidden, .no-print').forEach((node) => {
            (node as HTMLElement).style.display = 'none';
        });
        // class token is literally "print:hidden"
        root.querySelectorAll('*').forEach((node) => {
            const el = node as HTMLElement;
            if (el.classList.contains('print:hidden') || el.classList.contains('no-print')) {
                el.style.display = 'none';
            }
        });

        root.querySelectorAll('.inv-print-qr').forEach((node) => {
            const el = node as HTMLElement;
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'center';
        });

        return root.outerHTML;
    } catch {
        return html;
    }
}

/**
 * Legacy helper used by contracts/profiles.
 * Still copies app stylesheets (needed for those docs) but no longer tears down
 * the iframe on a fixed 1s timer (that blanks Chromium print preview).
 */
export const printHtml = (html: string, title: string = 'Print Document') => {
    const iframe = createPrintIframe();
    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const safeTitle = escapeAttr(title);

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <title>${safeTitle}</title>
            <meta charset="utf-8">
            <style>
                body { margin: 0; padding: 0; background: white !important; }
                @media print { body { margin: 0; } }
            </style>
    `);

    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach((style) => {
        doc.write(style.outerHTML);
    });

    doc.write('</head><body>');
    doc.write(html);
    doc.write('</body></html>');
    doc.close();

    const triggerPrint = () => {
        if (!iframe.contentWindow) return;
        iframe.contentWindow.focus();
        setTimeout(() => {
            bindAfterPrintCleanup(iframe);
            iframe.contentWindow?.print();
        }, 500);
    };

    let printTriggered = false;
    const triggerOnce = () => {
        if (printTriggered) return;
        printTriggered = true;
        triggerPrint();
    };
    iframe.onload = triggerOnce;
    setTimeout(triggerOnce, 1000);
};

export type PrintIsolatedOptions = {
    dir?: 'rtl' | 'ltr';
};

/**
 * Invoice / light-document print: isolated iframe with light CSS only.
 * Does NOT copy app Tailwind/dark stylesheets (avoids white-on-white blank pages).
 * Resolves after the print dialog closes (afterprint).
 */
export const printIsolatedHtml = (
    html: string,
    title: string = 'Print Document',
    options: PrintIsolatedOptions = {},
): Promise<void> => {
    return new Promise((resolve) => {
        const iframe = createPrintIframe();
        const doc = iframe.contentWindow?.document;
        if (!doc) {
            resolve();
            return;
        }

        const dir = options.dir === 'ltr' ? 'ltr' : 'rtl';
        const lang = dir === 'rtl' ? 'ar' : 'en';
        const safeTitle = escapeAttr(title);
        const printableHtml = prepareInvoiceHtmlForPrint(html);

        doc.open();
        doc.write(`<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<style>${INVOICE_ISOLATED_CSS}</style>
</head>
<body>${printableHtml}</body>
</html>`);
        doc.close();

        const triggerPrint = () => {
            if (!iframe.contentWindow) {
                resolve();
                return;
            }
            iframe.contentWindow.focus();
            requestAnimationFrame(() => {
                bindAfterPrintCleanup(iframe, resolve);
                iframe.contentWindow?.print();
            });
        };

        let printTriggered = false;
        const triggerOnce = () => {
            if (printTriggered) return;
            printTriggered = true;
            triggerPrint();
        };
        iframe.onload = triggerOnce;
        setTimeout(triggerOnce, 300);
    });
};
