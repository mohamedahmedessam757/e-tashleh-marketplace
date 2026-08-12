/**
 * Professional Print Utility (v2026)
 * Isolated iframe printing — real A4-sized iframe so Chromium can layout content.
 */

const escapeAttr = (value: string): string =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

/** Original invoice print look (from prior PrintStyles) — technical fixes only */
const INVOICE_ISOLATED_CSS = `
html, body {
  background: #fff !important;
  color: #111 !important;
  margin: 0;
  padding: 0;
  font-family: system-ui, "Segoe UI", Tahoma, Arial, sans-serif;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
@page { size: A4 portrait; margin: 0; }
.inv-print-root {
  display: block !important;
  width: 100% !important;
  background: #fff !important;
  color: #111 !important;
  padding: 15mm !important;
  margin: 0 !important;
  box-sizing: border-box;
}
.inv-print-root * { box-sizing: border-box; }
.inv-label { color: #666 !important; font-size: 12px !important; }
.inv-value { color: #000 !important; font-weight: 600 !important; font-size: 13px !important; }
.inv-icon { color: #b8860b !important; }
.inv-section {
  background: #fff !important;
  border: 1px solid #ccc !important;
  border-radius: 6px !important;
  padding: 16px !important;
  margin-bottom: 12px !important;
}
.inv-section-header {
  border-bottom: 1px solid #eee !important;
  margin-bottom: 12px !important;
  padding-bottom: 8px !important;
}
.inv-section-header h3 {
  color: #b8860b !important;
  font-size: 14px !important;
  font-weight: bold !important;
  margin: 0 !important;
}
.inv-section-header svg { color: #b8860b !important; }
.inv-total-box {
  background: #fdfbf7 !important;
  border: 2px solid #b8860b !important;
  padding: 16px !important;
  margin-bottom: 12px !important;
  border-radius: 8px !important;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.inv-total-box span, .inv-total-box p { color: #000 !important; opacity: 1 !important; }
.inv-total-amount { color: #b8860b !important; font-weight: 900 !important; }
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
  border-top: 1px solid #eee !important;
  padding-top: 20px !important;
  margin-top: 20px !important;
  text-align: center !important;
}
.no-print,
.print\\:hidden { display: none !important; }
/* Show print-only logo header (Tailwind hidden + print:flex) without blanket .hidden kill */
.hidden.print\\:flex,
.print\\:flex { display: flex !important; }
.hidden.print\\:block,
.print\\:block { display: block !important; }
img { max-width: 100%; }
svg { max-width: 100%; }
`;

function createPrintIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.id = 'ft-print-iframe-' + Date.now();
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-1';
    // Real A4-ish box so Chromium can layout printable content (0x0 → blank pages)
    iframe.style.width = '794px';
    iframe.style.height = '1123px';
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
        if (safetyTimer != null) window.clearTimeout(safetyTimer);
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
        try {
            window.focus();
        } catch {
            /* ignore */
        }
        onDone?.();
    };

    const onPrintMqChange = (e: MediaQueryListEvent) => {
        if (!e.matches) finish();
    };
    const mediaQueryList = win.matchMedia?.('print');
    mediaQueryList?.addEventListener?.('change', onPrintMqChange);
    win.addEventListener('afterprint', finish);
    // If afterprint never fires, do not leave UI waiting forever
    const safetyTimer = window.setTimeout(finish, 120_000);
}

/**
 * Legacy helper used by contracts/profiles.
 * Uses a real-sized iframe and afterprint cleanup (no 1s teardown).
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
 * Invoice print: isolated iframe with original light invoice CSS only.
 * Resolves after print dialog closes (afterprint) or safety timeout.
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
