const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

async function waitForPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
}

/**
 * Render the live verification HTML report blob into a multi-page A4 PDF
 * (same content/source as Open HTML report).
 */
export async function downloadVerificationReportPdf(
  htmlBlob: Blob,
  filename: string,
): Promise<void> {
  const html = await htmlBlob.text();
  if (!html.trim()) throw new Error('Report HTML is empty');

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '794px';
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  host.style.background = '#ffffff';
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    await waitForPaint();
    const target = (host.querySelector('body') as HTMLElement | null) || host;

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(target, {
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const imgWidth = A4_WIDTH_PT;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= A4_HEIGHT_PT;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= A4_HEIGHT_PT;
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } finally {
    host.remove();
  }
}
