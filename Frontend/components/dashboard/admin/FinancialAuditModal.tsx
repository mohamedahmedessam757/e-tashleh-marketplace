import React, { useState } from 'react';
import { AdminSignatureModal } from './AdminSignatureModal';

export interface FinancialAuditPayload {
  reason: string;
  adminName: string;
  adminSignature: string;
  adminSignatureType: 'DRAWN' | 'TYPED';
}

interface FinancialAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: FinancialAuditPayload) => Promise<void>;
  title?: string;
  subtitle?: string;
  actionType?: 'APPROVE' | 'REJECT';
}

export const FinancialAuditModal: React.FC<FinancialAuditModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  actionType = 'APPROVE',
}) => {
  const [error, setError] = useState('');

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-red-500/90 text-white px-4 py-2 rounded-xl text-xs">
          {error}
        </div>
      )}
      <AdminSignatureModal
        isOpen={isOpen}
        onClose={onClose}
        actionType={actionType}
        title={title}
        subtitle={subtitle}
        onConfirm={async (sig) => {
          const reason = (sig.adminReviewDetails || '').trim();
          if (reason.length < 10) {
            setError('Reason is required (minimum 10 characters)');
            throw new Error('Reason required');
          }
          setError('');
          await onConfirm({
            reason,
            adminName: sig.adminSignatureName,
            adminSignature: sig.adminSignatureImage || sig.adminSignatureText || sig.adminSignatureName,
            adminSignatureType: sig.adminSignatureType,
          });
        }}
      />
    </>
  );
};
