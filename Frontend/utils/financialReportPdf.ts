import React from 'react';
import { createRoot } from 'react-dom/client';
import { FinancialReportDocument, type FinancialReportDocumentProps } from '../components/dashboard/admin/reports/FinancialReportDocument';

export async function downloadFinancialReportPdf(
  props: FinancialReportDocumentProps,
  filename: string,
): Promise<void> {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.zIndex = '-1';
  document.body.appendChild(host);

  const root = createRoot(host);
  root.render(React.createElement(FinancialReportDocument, props));

  await new Promise((resolve) => setTimeout(resolve, 600));

  try {
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
      backgroundColor: '#ffffff',
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdfWidth = 595.28;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [pdfWidth, pdfHeight] });
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  } finally {
    root.unmount();
    document.body.removeChild(host);
  }
}
