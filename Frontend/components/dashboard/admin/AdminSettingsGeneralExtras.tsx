import React from 'react';
import { Image, Mail } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';

interface Props {
  isAr: boolean;
  formData: any;
  updateField: (section: string, field: string, value: unknown) => void;
  updateNested: (section: string, parent: string, field: string, value: unknown) => void;
}

async function uploadAsset(file: File, assetType: string): Promise<string> {
  const token = localStorage.getItem('access_token');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('assetType', assetType);
  const res = await fetch(`${API_URL}/admin/uploads/platform-asset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) throw new Error('Upload failed');
  const { url } = await res.json();
  return url;
}

export const AdminSettingsGeneralExtras: React.FC<Props> = ({
  isAr,
  formData,
  updateField,
  updateNested,
}) => {
  const contacts = formData.general?.contacts || {};

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-gold-500/50';

  return (
    <div className="col-span-full space-y-10 mt-6 border-t border-white/5 pt-10">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Image size={16} className="text-gold-400" />
            {isAr ? 'الشعار' : 'Platform logo'}
          </h3>
          <div className="flex gap-4 items-center">
            {formData.general?.logoUrl && (
              <img src={formData.general.logoUrl} alt="logo" className="h-14 w-auto rounded-lg bg-white/10 p-2" />
            )}
            <input
              type="file"
              accept="image/*,.svg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAsset(f, 'logo').then((url) => updateField('general', 'logoUrl', url));
              }}
              className="text-xs text-white/50"
            />
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Mail size={16} className="text-blue-400" />
            {isAr ? 'إيميلات التواصل' : 'Contact emails'}
          </h3>
          {[
            ['customer', isAr ? 'العملاء' : 'Customers'],
            ['merchant', isAr ? 'التجار' : 'Merchants'],
            ['wholesale', isAr ? 'الجملة' : 'Wholesale'],
            ['company', isAr ? 'الشركة' : 'Company'],
          ].map(([key, label]) => (
            <div key={key} className="space-y-1">
              <label className="text-[10px] text-white/40 uppercase font-black">{label}</label>
              <input
                type="email"
                className={inputCls}
                value={contacts[key] || ''}
                onChange={(e) => updateNested('general', 'contacts', key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
