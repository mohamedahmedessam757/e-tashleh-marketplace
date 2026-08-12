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

const INVOICE_ISOLATED_CSS = `
html, body {
  background: #fff !important;
  color: #111 !important;
  margin: 0;
  padding: 0;
  font-family: system-ui, "Segoe UI", Tahoma, Arial, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@page { size: A4 portrait; margin: 12mm; }
.inv-print-root { color: #111 !important; background: #fff !important; padding: 8mm; }
.inv-print-root * { box-sizing: border-box; }
.inv-label { color: #555 !important; }
.inv-value, h1, h2, h3, p, span, td, th, div, label { color: #111 !important; }
.inv-total-amount, .inv-icon, .inv-section-header h3 { color: #b8860b !important; }
.inv-section {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  break-inside: avoid;
  page-break-inside: avoid;
  background: #fff !important;
}
.inv-section-header { border-bottom: 1px solid #eee; margin-bottom: 12px; padding-bottom: 8px; }
.inv-total-box {
  border: 2px solid #b8860b;
  border-radius: 8px;
  padding: 16px;
  margin: 12px 0;
  background: #fdfbf7 !important;
}
.inv-screen-img { display: none !important; }
.inv-print-qr { display: flex !important; flex-direction: column; align-items: center; }
.inv-policy-body { display: block !important; }
.inv-policy-chevron { display: none !important; }
.inv-footer { break-inside: avoid; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; text-align: center; }
.no-print, .print\\:hidden { display: none !important; }
.hidden { display: none !important; }
.hidden.print\\:flex, .print\\:flex { display: flex !important; }
.hidden.print\\:block, .print\\:block { display: block !important; }
img { max-width: 100%; }
svg { max-width: 100%; }
`;

function createPrintIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.id = 'ft-print-iframe-' + Date.now();
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
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

        doc.open();
        doc.write(`<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
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
