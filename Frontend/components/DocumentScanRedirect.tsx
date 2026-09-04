import React, { useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { invoicesApi } from '../services/api/invoices';
import { waybillsApi } from '../services/api/waybills';
import { isAccessTokenValid, getCurrentUser } from '../utils/auth';
import { useLanguage } from '../contexts/LanguageContext';
import {
  clearDocumentScanPending,
  persistDocumentScanPending,
  type DocumentScanKind,
} from '../utils/widersDeepLink';

interface DocumentScanRedirectProps {
  kind: DocumentScanKind;
  documentId: string;
  onNeedLogin: (kind: DocumentScanKind, id: string) => void;
  onResolved: (payload: {
    orderId: string;
    tab: 'invoices' | 'waybills';
    roleHint?: 'customer' | 'merchant';
  }) => void;
}

export const DocumentScanRedirect: React.FC<DocumentScanRedirectProps> = ({
  kind,
  documentId,
  onNeedLogin,
  onResolved,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!documentId || !/^[a-zA-Z0-9_-]+$/.test(documentId)) {
        setError(isAr ? 'رابط غير صالح' : 'Invalid link');
        return;
      }

      if (!isAccessTokenValid()) {
        persistDocumentScanPending({ kind, id: documentId });
        onNeedLogin(kind, documentId);
        return;
      }

      clearDocumentScanPending();

      try {
        if (kind === 'invoice') {
          const invoice = await invoicesApi.getById(documentId);
          const orderId = invoice?.orderId || invoice?.order?.id;
          if (!orderId) {
            throw new Error('missing_order');
          }
          if (cancelled) return;
          const role = getCurrentUser()?.role;
          onResolved({
            orderId: String(orderId),
            tab: 'invoices',
            roleHint: role === 'VENDOR' || role === 'MERCHANT' ? 'merchant' : 'customer',
          });
          return;
        }

        const res = await waybillsApi.getById(documentId);
        const waybill = res?.waybill || res;
        const orderId = waybill?.orderId || waybill?.order?.id;
        if (!orderId) {
          throw new Error('missing_order');
        }
        if (cancelled) return;
        const role = getCurrentUser()?.role;
        onResolved({
          orderId: String(orderId),
          tab: 'waybills',
          roleHint: role === 'VENDOR' || role === 'MERCHANT' ? 'merchant' : 'customer',
        });
      } catch {
        if (!cancelled) {
          setError(
            isAr
              ? 'غير مصرح أو المستند غير موجود'
              : 'Unauthorized or document not found',
          );
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [kind, documentId, isAr, onNeedLogin, onResolved]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
      {error ? (
        <>
          <ShieldAlert className="text-red-400" size={40} />
          <p className="text-white/80 text-sm font-bold">{error}</p>
        </>
      ) : (
        <>
          <Loader2 className="animate-spin text-gold-500" size={36} />
          <p className="text-white/50 text-sm">
            {isAr ? 'جاري فتح المستند…' : 'Opening document…'}
          </p>
        </>
      )}
    </div>
  );
};
