import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatContractContentForPrint } from '../../../../utils/contractPrintFormat';

export type ContractPrintAcceptance = {
    acceptedAt: string;
    contractId: string;
    contractVersion?: string;
    secondPartyData?: {
        companyName?: string;
        managerName?: string;
        crNumber?: string;
        municipalityLicense?: string;
        licenseNumber?: string;
    };
    signatureData?: {
        email?: string;
        phone?: string;
        signedName?: string;
        signerName?: string;
    };
    contentArSnapshot?: string;
    contentEnSnapshot?: string;
    ipAddress?: string;
};

export type ContractPrintDocumentProps = {
    acceptance: ContractPrintAcceptance;
    storeName: string;
    storeCode?: string;
    language: 'ar' | 'en';
};

export const ContractPrintDocument: React.FC<ContractPrintDocumentProps> = ({
    acceptance,
    storeName,
    storeCode,
    language,
}) => {
    const isAr = language === 'ar';
    const dir = isAr ? 'rtl' : 'ltr';
    const signerName =
        acceptance.signatureData?.signedName ||
        acceptance.signatureData?.signerName ||
        acceptance.secondPartyData?.managerName ||
        '—';
    const rawAgreement = isAr ? acceptance.contentArSnapshot || '' : acceptance.contentEnSnapshot || '';
    const agreementHtml = formatContractContentForPrint(rawAgreement, isAr ? 'ar' : 'en');
    const qrValue = `https://e-tashleh.net/contract/${acceptance.contractId}`;
    const acceptedLabel = new Date(acceptance.acceptedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
    });

    const MetaRow = ({ label, value }: { label: string; value?: string | null }) => (
        <tr>
            <td className="ctr-label">{label}</td>
            <td className="ctr-value">{value || '—'}</td>
        </tr>
    );

    return (
        <div className="ctr-print-root" dir={dir}>
            <div className="ctr-sheet-bar" aria-hidden="true" />

            <header className="ctr-print-logo-header">
                <div className="ctr-brand-row">
                    <img src="/logo.png" alt="E-Tashleh" className="inv-brand-logo" />
                    <div>
                        <h1>E-Tashleh</h1>
                        <p className="ctr-subtitle">{isAr ? 'منصة إي-تشليح' : 'E-Tashleh Marketplace'}</p>
                    </div>
                </div>
                <div className="ctr-title-block">
                    <p className="ctr-doc-type">
                        {isAr ? 'عقد انضمام وشروط الخدمة' : 'Merchant Partnership Agreement'}
                    </p>
                    <p className="ctr-store-ref">
                        {storeName}
                        {storeCode ? ` · ${storeCode}` : ''}
                    </p>
                    <span className="ctr-status-pill">
                        {isAr ? 'معتمد إلكترونياً' : 'Electronically Certified'}
                    </span>
                </div>
            </header>

            <div className="ctr-meta-row">
                <section className="ctr-section">
                    <h3 className="ctr-section-title">
                        {isAr ? 'بيانات العقد' : 'Contract Details'}
                    </h3>
                    <table className="ctr-meta-table">
                        <tbody>
                            <MetaRow label={isAr ? 'تاريخ القبول' : 'Accepted'} value={acceptedLabel} />
                            <MetaRow label={isAr ? 'مرجع العقد' : 'Reference'} value={acceptance.contractId} />
                            <MetaRow
                                label={isAr ? 'الإصدار' : 'Version'}
                                value={acceptance.contractVersion || '1.0'}
                            />
                        </tbody>
                    </table>
                </section>

                <section className="ctr-section">
                    <h3 className="ctr-section-title">
                        {isAr ? 'الطرف الثاني — التاجر' : 'Second Party — Merchant'}
                    </h3>
                    <table className="ctr-meta-table">
                        <tbody>
                            <MetaRow
                                label={isAr ? 'المنشأة' : 'Company'}
                                value={acceptance.secondPartyData?.companyName}
                            />
                            <MetaRow
                                label={isAr ? 'المدير' : 'Director'}
                                value={acceptance.secondPartyData?.managerName}
                            />
                            <MetaRow
                                label={isAr ? 'السجل التجاري' : 'CR No.'}
                                value={acceptance.secondPartyData?.crNumber}
                            />
                            <MetaRow
                                label={isAr ? 'الرخصة' : 'License'}
                                value={
                                    acceptance.secondPartyData?.municipalityLicense ||
                                    acceptance.secondPartyData?.licenseNumber
                                }
                            />
                            <MetaRow label={isAr ? 'البريد' : 'Email'} value={acceptance.signatureData?.email} />
                            <MetaRow label={isAr ? 'الهاتف' : 'Phone'} value={acceptance.signatureData?.phone} />
                        </tbody>
                    </table>
                </section>
            </div>

            <section className="ctr-agreement-section">
                <div className="ctr-agreement-head">
                    <h3 className="ctr-agreement-title">
                        {isAr ? 'نص الاتفاقية المعتمدة' : 'Approved Agreement Text'}
                    </h3>
                    <div className="ctr-agreement-rule" aria-hidden="true" />
                </div>
                <div className="ctr-body-wrap">
                    <div className="ctr-body" dangerouslySetInnerHTML={{ __html: agreementHtml }} />
                </div>
            </section>

            <div className="ctr-signatures">
                <div className="ctr-signature-box">
                    <p className="ctr-signature-label">
                        {isAr ? 'الطرف الأول — المنصة' : 'First Party — Platform'}
                    </p>
                    <p className="ctr-platform-seal">E-TASHLEH</p>
                    <div className="ctr-signature-line" aria-hidden="true" />
                    <p className="ctr-signature-note">
                        {isAr ? 'ELLIPP FZ LLC · ختم إلكتروني' : 'ELLIPP FZ LLC · Electronic Seal'}
                    </p>
                </div>
                <div className="ctr-signature-box">
                    <p className="ctr-signature-label">
                        {isAr ? 'الطرف الثاني — التاجر' : 'Second Party — Merchant'}
                    </p>
                    <p className="ctr-signer-name">{signerName}</p>
                    <div className="ctr-signature-line" aria-hidden="true" />
                    <p className="ctr-signature-note">
                        {isAr ? 'توقيع إلكتروني موثق' : 'Digitally Verified Signature'}
                    </p>
                    {acceptance.ipAddress && (
                        <p className="ctr-signature-meta">IP {acceptance.ipAddress}</p>
                    )}
                </div>
            </div>

            <footer className="ctr-footer">
                <div className="ctr-qr-wrap">
                    <QRCodeSVG value={qrValue} size={72} level="M" includeMargin={false} />
                </div>
                <p className="ctr-footer-note">
                    {isAr
                        ? 'وثيقة إلكترونية موثقة — صالحة دون ختم تقليدي'
                        : 'Verified electronic document — valid without physical stamp'}
                </p>
                <p className="ctr-footer-meta">
                    REF {acceptance.contractId.slice(0, 8).toUpperCase()} · E-TASHLEH · {acceptedLabel}
                </p>
            </footer>
        </div>
    );
};

/** Normalize merchant-panel acceptance shape */
export function mapMerchantContractAcceptance(acceptance: any): ContractPrintAcceptance {
    return {
        acceptedAt: acceptance.acceptedAt,
        contractId: acceptance.contractId || acceptance.id,
        contractVersion: acceptance.contract?.version || acceptance.contractVersion,
        secondPartyData: acceptance.secondPartyData,
        signatureData: acceptance.signatureData,
        contentArSnapshot: acceptance.contentArSnapshot,
        contentEnSnapshot: acceptance.contentEnSnapshot,
        ipAddress: acceptance.ipAddress,
    };
}

/** Normalize admin-panel acceptance shape */
export function mapAdminContractAcceptance(acceptance: any): ContractPrintAcceptance {
    return {
        acceptedAt: acceptance.acceptedAt,
        contractId: acceptance.id,
        contractVersion: acceptance.contractVersion,
        secondPartyData: {
            companyName: acceptance.secondPartyData?.companyName,
            managerName: acceptance.secondPartyData?.managerName,
            crNumber: acceptance.secondPartyData?.crNumber,
            licenseNumber: acceptance.secondPartyData?.licenseNumber,
        },
        signatureData: acceptance.signatureData,
        contentArSnapshot: acceptance.contentArSnapshot,
        contentEnSnapshot: acceptance.contentEnSnapshot,
        ipAddress: acceptance.ipAddress,
    };
}
