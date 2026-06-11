
/**
 * Professional Print Utility (v2026)
 * Handles isolated printing of HTML content via a hidden iframe
 * to preserve styles and prevent UI flickering.
 */
export const printHtml = (html: string, title: string = 'Print Document') => {
    // 1. Create a unique ID for the iframe to avoid collisions
    const iframeId = 'ft-print-iframe-' + Date.now();
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;

    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.zIndex = '-1';
        document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // 2. Clear previous content
    doc.open();
    
    // 3. Construct the printable shell
    doc.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <title>${title}</title>
            <meta charset="utf-8">
            <style>
                body { margin: 0; padding: 0; background: white !important; }
                @media print {
                    body { margin: 0; }
                }
            </style>
    `);

    // 4. Inject existing styles from the main document (Tailwind, Fonts, etc.)
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach(style => {
        doc.write(style.outerHTML);
    });

    doc.write('</head><body>');
    doc.write(html);
    doc.write('</body></html>');
    doc.close();

    // 5. Trigger print after content and styles are processed
    const triggerPrint = () => {
        if (!iframe.contentWindow) return;
        
        iframe.contentWindow.focus();
        // Modern browsers handle the load event better for printing
        setTimeout(() => {
            iframe.contentWindow?.print();
            // Cleanup to keep DOM clean
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 1000);
        }, 500);
    };

    // Check if fonts or images need loading
    if (iframe.contentWindow) {
        let printTriggered = false;
        const triggerOnce = () => {
            if (!printTriggered) {
                printTriggered = true;
                triggerPrint();
            }
        };
        iframe.onload = triggerOnce;
        // Fallback for immediate print if onload doesn't fire
        setTimeout(triggerOnce, 1000);
    }
};
