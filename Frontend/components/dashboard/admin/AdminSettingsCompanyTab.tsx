import React from 'react';
import { Building2, FileText, Upload } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';

interface Props {
  isAr: boolean;
  formData: any;
  updateField: (section: string, field: string, value: unknown) => void;
  updateNested: (section: string, parent: string, field: string, value: unknown) => void;
}

export const AdminSettingsCompanyTab: React.FC<Props> = ({
  isAr,
  formData,
  updateField,
  updateNested,
}) => {
  const company = formData.company || {};

  const uploadNomo = async (file: File) => {
    const token = localStorage.getItem('access_token');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('assetType', 'nomo-document');
    const res = await fetch(`${API_URL}/admin/uploads/platform-asset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) throw new Error('Upload failed');
    const { url } = await res.json();
    updateField('company', 'nomoDocumentUrl', url);
    updateField('company', 'nomoDocumentUpdatedAt', new Date().toISOString());
  };

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white font-bold outline-none focus:border-gold-500/50 text-sm';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in duration-500">
      <div className="space-y-6">
        <header className="border-b border-white/5 pb-4 flex items-center gap-3">
          <Building2 className="text-gold-400" size={20} />
          <h2 className="text-xl font-black text-white">
            {isAr ? 'بيانات الشركة' : 'Company Data'}
          </h2>
        </header>
        {[
          ['legalNameAr', isAr ? 'الاسم القانوني (عربي)' : 'Legal name (AR)'],
          ['legalNameEn', isAr ? 'الاسم القانوني (إنجليزي)' : 'Legal name (EN)'],
          ['crNumber', isAr ? 'السجل التجاري' : 'CR number'],
          ['taxNumber', isAr ? 'الرقم الضريبي' : 'Tax number'],
          ['licenseNumber', isAr ? 'رقم الرخصة' : 'License number'],
          ['licenseExpiry', isAr ? 'انتهاء الرخصة' : 'License expiry'],
        ].map(([key, label]) => (
          <div key={key} className="space-y-2">
            <label className="text-[11px] font-black text-white/30 uppercase">{label}</label>
            <input
              className={inputCls}
              value={company[key] || ''}
              onChange={(e) => updateField('company', key, e.target.value)}
            />
          </div>
        ))}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-white/30 uppercase">
            {isAr ? 'العنوان (عربي)' : 'HQ address (AR)'}
          </label>
          <textarea
            className={`${inputCls} min-h-[80px]`}
            value={company.hqAddressAr || ''}
            onChange={(e) => updateField('company', 'hqAddressAr', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-white/30 uppercase">
            {isAr ? 'العنوان (إنجليزي)' : 'HQ address (EN)'}
          </label>
          <textarea
            className={`${inputCls} min-h-[80px]`}
            value={company.hqAddressEn || ''}
            onChange={(e) => updateField('company', 'hqAddressEn', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-6">
        <header className="border-b border-white/5 pb-4 flex items-center gap-3">
          <FileText className="text-blue-400" size={20} />
          <h2 className="text-xl font-black text-white">
            {isAr ? 'السجل الاقتصادي ونماء' : 'Economic Registry & Nomo'}
          </h2>
        </header>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-white/30 uppercase">
            {isAr ? 'رقم السجل الاقتصادي' : 'Registry number'}
          </label>
          <input
            className={inputCls}
            value={company.economicRegistryNumber || ''}
            onChange={(e) => updateField('company', 'economicRegistryNumber', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-white/30 uppercase">
            {isAr ? 'محتوى الصفحة (عربي)' : 'Page content (AR)'}
          </label>
          <textarea
            className={`${inputCls} min-h-[120px] font-mono text-xs`}
            value={company.economicRegistryContentAr || ''}
            onChange={(e) => updateField('company', 'economicRegistryContentAr', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-white/30 uppercase">
            {isAr ? 'محتوى الصفحة (إنجليزي)' : 'Page content (EN)'}
          </label>
          <textarea
            className={`${inputCls} min-h-[120px] font-mono text-xs`}
            value={company.economicRegistryContentEn || ''}
            onChange={(e) => updateField('company', 'economicRegistryContentEn', e.target.value)}
          />
        </div>
        <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.02] space-y-4">
          <div className="flex items-center gap-3">
            <Upload size={18} className="text-gold-400" />
            <span className="text-sm font-black text-white">
              {isAr ? 'وثيقة نماء' : 'Nomo verification document'}
            </span>
          </div>
          {company.nomoDocumentUrl && (
            <a
              href={company.nomoDocumentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gold-400 underline break-all"
            >
              {company.nomoDocumentUrl}
            </a>
          )}
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadNomo(f).catch(console.error);
            }}
            className="text-xs text-white/60"
          />
        </div>
      </div>
    </div>
  );
};
