/**
 * Professional Print Utility (v2026)
 * Isolated iframe printing — visible ink, real layout size, UI unlocks right after print().
 */

const escapeAttr = (value: string): string =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

/** Clean white-paper invoice — same organization as screen, ink-friendly for print */
const INVOICE_ISOLATED_CSS = `
html, body {
  background: #ffffff !important;
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
  margin: 0;
  padding: 0;
  font-family: system-ui, "Segoe UI", Tahoma, Arial, sans-serif;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  opacity: 1 !important;
}
@page { size: A4 portrait; margin: 10mm; }
.inv-print-root {
  display: block !important;
  position: static !important;
  left: auto !important;
  top: auto !important;
  width: 100% !important;
  max-width: 100% !important;
  background: #ffffff !important;
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
  padding: 8mm !important;
  margin: 0 !important;
  box-sizing: border-box;
  opacity: 1 !important;
  overflow: visible !important;
}
.inv-print-root * {
  box-sizing: border-box;
  opacity: 1 !important;
  max-width: 100%;
}
/* Layout: keep screen structure, prevent overlap */
.inv-print-root .flex { display: flex !important; }
.inv-print-root .flex-col { flex-direction: column !important; }
.inv-print-root .flex-row,
.inv-print-root .sm\\:flex-row { flex-direction: row !important; }
.inv-print-root .items-start { align-items: flex-start !important; }
.inv-print-root .items-center { align-items: center !important; }
.inv-print-root .justify-between { justify-content: space-between !important; }
.inv-print-root .justify-center { justify-content: center !important; }
.inv-print-root .gap-2 { gap: 8px !important; }
.inv-print-root .gap-4 { gap: 16px !important; }
.inv-print-root .gap-6,
.inv-print-root .sm\\:gap-6 { gap: 20px !important; }
.inv-print-root .grid {
  display: grid !important;
  gap: 16px !important;
  width: 100% !important;
}
.inv-print-root .grid-cols-1.md\\:grid-cols-2,
.inv-print-root .md\\:grid-cols-2,
.inv-print-root .sm\\:grid-cols-2 {
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
.inv-print-root .space-y-2 > * + * { margin-top: 8px !important; }
.inv-print-root .mt-4 { margin-top: 16px !important; }
.inv-print-root .mt-6 { margin-top: 20px !important; }
.inv-print-root .mt-8 { margin-top: 24px !important; }
.inv-print-root .mb-1 { margin-bottom: 4px !important; }
.inv-print-root .mb-2 { margin-bottom: 8px !important; }
.inv-print-root .pb-6 { padding-bottom: 20px !important; }
.inv-print-root .p-4 { padding: 14px !important; }
.inv-print-root .p-5 { padding: 16px !important; }
.inv-label {
  color: #6b7280 !important;
  -webkit-text-fill-color: #6b7280 !important;
  font-size: 12px !important;
}
.inv-value {
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
  font-weight: 700 !important;
  font-size: 13px !important;
}
.inv-icon {
  color: #b8860b !important;
  -webkit-text-fill-color: #b8860b !important;
  flex-shrink: 0 !important;
}
.inv-section {
  background: #fafafa !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 12px !important;
  padding: 16px !important;
  margin-bottom: 14px !important;
  overflow: hidden !important;
}
.inv-section-header {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  border-bottom: 1px solid #e5e7eb !important;
  margin-bottom: 12px !important;
  padding-bottom: 8px !important;
}
.inv-section-header h3 {
  color: #b8860b !important;
  -webkit-text-fill-color: #b8860b !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  margin: 0 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
}
.inv-section-header svg {
  color: #b8860b !important;
  -webkit-text-fill-color: #b8860b !important;
}
.inv-total-box {
  background: #fffbeb !important;
  border: 2px solid #b8860b !important;
  padding: 18px !important;
  margin: 16px 0 !important;
  border-radius: 12px !important;
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
  font-size: 28px !important;
}
.inv-policy-body { display: block !important; }
.inv-policy-chevron { display: none !important; }
.inv-screen-img { display: none !important; }
.inv-print-qr {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}
.inv-footer {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
  border-top: 1px solid #e5e7eb !important;
  padding-top: 18px !important;
  margin-top: 20px !important;
  text-align: center !important;
  color: #6b7280 !important;
  -webkit-text-fill-color: #6b7280 !important;
}
.no-print,
.print\\:hidden { display: none !important; }
/* Hide duplicate print-only brand strip — SECTION 1 already has branding + QR */
.hidden.print\\:flex { display: none !important; }
.hidden.print\\:block,
.print\\:block { display: block !important; }
/* Remap dark-screen utilities → paper-friendly colors (keep hierarchy) */
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
.text-\\[\\#b8860b\\] {
  color: #b8860b !important;
  -webkit-text-fill-color: #b8860b !important;
}
.bg-white\\/5,
.bg-black\\/20,
.bg-black\\/40 {
  background: #f9fafb !important;
}
.border-white\\/5,
.border-white\\/10,
.border-b {
  border-color: #e5e7eb !important;
}
.border-gold-500\\/20,
.border-gold-500\\/30 {
  border-color: rgba(184, 134, 11, 0.35) !important;
}
.rounded-xl,
.rounded-lg { border-radius: 12px !important; }
.absolute,
.relative { position: static !important; }
.inv-print-root .absolute { display: none !important; } /* drop watermarks/overlays */
img { max-width: 100%; height: auto; }
svg { max-width: 100%; flex-shrink: 0; }
`;

function createPrintIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.id = 'ft-print-iframe-' + Date.now();
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.border = '0';
    // Must stay fully opaque — opacity:0 prints as blank white pages in Chromium
    iframe.style.opacity = '1';
    iframe.style.visibility = 'visible';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-1';
    iframe.style.width = '794px';
    iframe.style.height = '1123px';
    iframe.style.background = '#ffffff';
    document.body.appendChild(iframe);
    return iframe;
}

/** Cleanup iframe after dialog closes — does NOT gate the UI promise */
function bindAfterPrintCleanup(iframe: HTMLIFrameElement): void {
    const win = iframe.contentWindow;
    if (!win) {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        try {
            window.focus();
        } catch {
            /* ignore */
        }
        return;
    }

    let cleaned = false;
    const finish = () => {
        if (cleaned) return;
        cleaned = true;
        win.removeEventListener('afterprint', finish);
        mediaQueryList?.removeEventListener?.('change', onPrintMqChange);
        if (safetyTimer != null) window.clearTimeout(safetyTimer);
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
        try {
            window.focus();
        } catch {
            /* ignore */
        }
    };

    const onPrintMqChange = (e: MediaQueryListEvent) => {
        if (!e.matches) finish();
    };
    const mediaQueryList = win.matchMedia?.('print');
    mediaQueryList?.addEventListener?.('change', onPrintMqChange);
    win.addEventListener('afterprint', finish);
    const safetyTimer = window.setTimeout(finish, 120_000);
}

function collectStylesheetLinksHtml(): string {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    let out = '';
    links.forEach((link) => {
        out += link.outerHTML;
    });
    return out;
}

/**
 * Legacy helper used by contracts/profiles.
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
        iframe.style.opacity = '1';
        iframe.style.height =
            Math.max(1123, (iframe.contentWindow.document.body?.scrollHeight || 0) + 48) + 'px';
        iframe.contentWindow.focus();
        setTimeout(() => {
            bindAfterPrintCleanup(iframe);
            iframe.contentWindow?.print();
            try {
                window.focus();
            } catch {
                /* ignore */
            }
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
 * Invoice print: isolated iframe with original light invoice CSS.
 * Resolves right after print() so the SPA unlocks while the dialog is open.
 * Iframe cleanup still runs on afterprint.
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
        const stylesheetLinks = collectStylesheetLinksHtml();

        doc.open();
        doc.write(`<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
${stylesheetLinks}
<style>${INVOICE_ISOLATED_CSS}</style>
</head>
<body>${html}</body>
</html>`);
        doc.close();

        const triggerPrint = () => {
            if (!iframe.contentWindow) {
                resolve();
                return;
            }

            iframe.style.opacity = '1';
            iframe.style.visibility = 'visible';
            const scrollH = iframe.contentWindow.document.body?.scrollHeight || 0;
            iframe.style.height = Math.max(1123, scrollH + 48) + 'px';

            iframe.contentWindow.focus();
            requestAnimationFrame(() => {
                bindAfterPrintCleanup(iframe);
                iframe.contentWindow?.print();
                try {
                    window.focus();
                } catch {
                    /* ignore */
                }
                // Unlock UI immediately — do not wait for afterprint
                resolve();
            });
        };

        let printTriggered = false;
        const triggerOnce = () => {
            if (printTriggered) return;
            printTriggered = true;
            // Give linked stylesheets a brief moment to apply layout utilities
            setTimeout(triggerPrint, 150);
        };
        iframe.onload = triggerOnce;
        setTimeout(triggerOnce, 400);
    });
};
