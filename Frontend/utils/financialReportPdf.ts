import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  FinancialReportDocument,
  type FinancialReportDocumentProps,
} from '../components/dashboard/admin/reports/FinancialReportDocument';

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

async function waitForPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
}

export async function downloadFinancialReportPdf(
  props: FinancialReportDocumentProps,
  filename: string,
): Promise<void> {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    flushSync(() => {
      root.render(React.createElement(FinancialReportDocument, props));
    });
    await waitForPaint();

    const node = host.firstElementChild as HTMLElement | null;
    if (!node) throw new Error('Report document failed to render');

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(node, {
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      onclone: (doc) => {
        const cloned = doc.querySelector('.rpt-print-root') as HTMLElement | null;
        if (cloned) cloned.style.transform = 'none';
      },
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
    root.unmount();
    document.body.removeChild(host);
  }
}
