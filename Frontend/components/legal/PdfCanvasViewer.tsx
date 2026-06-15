import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfCanvasViewerProps {
  url: string;
  className?: string;
  isAr?: boolean;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  url,
  className = '',
  isAr = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const renderPdf = async () => {
      setLoading(true);
      setError(false);
      container.innerHTML = '';

      try {
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = 'w-full h-auto bg-white block mx-auto mb-2 shadow-sm';

          await page.render({ canvasContext: context, viewport }).promise;
          if (!cancelled) container.appendChild(canvas);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) {
    return (
      <div className="text-center py-8 text-white/60 text-sm">
        {isAr ? 'تعذر عرض المستند — استخدم زر الفتح أدناه' : 'Could not render document — use Open below'}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-gold-600 mb-2" />
          <p className="text-sm text-gray-600 font-medium">
            {isAr ? 'جاري تحميل المستند...' : 'Loading document...'}
          </p>
        </div>
      )}
      <div ref={containerRef} className="bg-white p-2 md:p-4 max-h-[75vh] overflow-y-auto" />
    </div>
  );
};
