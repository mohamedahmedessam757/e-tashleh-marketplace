/**
 * Isolated HTML printing via a hidden iframe.
 * Avoids blank Chromium print previews caused by main-document @media print races.
 */

export type PrintHtmlOptions = {
  dir?: 'rtl' | 'ltr';
  extraCss?: string;
  onAfterPrint?: () => void;
};

const INVOICE_PRINT_CSS = `
  * { box-sizing: border-box; }
  :root, html, body {
    margin: 0;
    padding: 0;
    background: #fff !important;
    color: #111 !important;
    color-scheme: only light !important;
    font-family: "IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  @page { size: A4 portrait; margin: 12mm; }
  img { max-width: 100%; height: auto; }
  svg { max-width: 100%; }

  /* Force readable print colors over dark-theme Tailwind utilities */
  .invoice-print-root,
  .invoice-print-root * {
    color: #111 !important;
    background-color: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    text-shadow: none !important;
    opacity: 1 !important;
  }
  .invoice-print-root {
    background: #fff !important;
    padding: 8px;
    width: 100%;
  }
  .invoice-print-root .inv-section,
  .invoice-print-root .inv-total-box {
    background: #fff !important;
    border: 1px solid #ccc !important;
    border-radius: 6px !important;
    padding: 14px !important;
    margin: 10px 0 !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  .invoice-print-root .inv-section-header {
    border-bottom: 1px solid #eee !important;
    margin-bottom: 10px !important;
    padding-bottom: 6px !important;
  }
  .invoice-print-root .inv-section-header h3,
  .invoice-print-root .inv-icon,
  .invoice-print-root .inv-total-amount,
  .invoice-print-root .text-gold-500,
  .invoice-print-root .text-gold-400,
  .invoice-print-root .text-\\[\\#b8860b\\] {
    color: #b8860b !important;
  }
  .invoice-print-root .inv-value { color: #000 !important; font-weight: 600 !important; }
  .invoice-print-root .inv-label { color: #555 !important; }
  .invoice-print-root .inv-policy-body { display: block !important; }
  .invoice-print-root .inv-policy-chevron { display: none !important; }
  .invoice-print-root .inv-screen-img { display: none !important; }
  .invoice-print-root .inv-print-qr {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
  }
  .invoice-print-root .inv-footer {
    break-inside: avoid !important;
    border-top: 1px solid #eee !important;
    padding-top: 16px !important;
    margin-top: 16px !important;
    text-align: center !important;
  }
  .invoice-print-root .print-only-header,
  .invoice-print-root .hidden.print-only-header {
    display: flex !important;
  }
  /* Screen-only / accordion chrome */
  .invoice-print-root .print\\:hidden,
  .invoice-print-root button { display: none !important; }
`;

export const printHtml = (
  html: string,
  title: string = 'Print Document',
  options: PrintHtmlOptions = {},
) => {
  const { dir = 'rtl', extraCss = '', onAfterPrint } = options;
  const iframeId = 'ft-print-iframe-' + Date.now();
  const iframe = document.createElement('iframe');
  iframe.id = iframeId;
  iframe.setAttribute('title', title);
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

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    onAfterPrint?.();
    return;
  }

  const origin = window.location.origin;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html dir="${dir}" lang="${dir === 'rtl' ? 'ar' : 'en'}">
<head>
  <meta charset="utf-8" />
  <base href="${origin}/" />
  <title>${title.replace(/</g, '')}</title>
`);

  // Clone app stylesheets for layout (Tailwind), then force print colors after.
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    doc.write(node.outerHTML);
  });

  doc.write(`<style>${INVOICE_PRINT_CSS}\n${extraCss}</style></head><body>
  <div class="invoice-print-root">${html}</div>
</body>
</html>`);
  doc.close();

  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    win.removeEventListener('afterprint', cleanup);
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
    onAfterPrint?.();
  };

  const triggerPrint = () => {
    win.focus();
    win.addEventListener('afterprint', cleanup);
    try {
      win.print();
    } catch {
      cleanup();
      return;
    }
    // Safety if afterprint never fires (some browsers)
    window.setTimeout(cleanup, 120_000);
  };

  // Wait for images/fonts inside the iframe before opening the dialog
  const images = Array.from(doc.images || []);
  const waitForImages = Promise.all(
    images.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
    ),
  );

  waitForImages.then(() => {
    window.setTimeout(triggerPrint, 100);
  });
};

/** Clone a live DOM node into an isolated iframe print job. */
export const printElement = (
  element: HTMLElement,
  title?: string,
  options?: PrintHtmlOptions,
) => {
  printHtml(element.innerHTML, title, options);
};
