import React, { useEffect, useState } from 'react';
import { FileText, Eye } from 'lucide-react';
import { SettingsAuditModal, SettingsAuditPayload } from './SettingsAuditModal';

import { getStaticPageFallback } from '../../../utils/staticPageFallbacks';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';

const PAGE_SLUGS = [
  { slug: 'about', ar: 'من نحن', en: 'About' },
  { slug: 'terms', ar: 'الشروط', en: 'Terms' },
  { slug: 'privacy', ar: 'الخصوصية', en: 'Privacy' },
  { slug: 'payment-policy', ar: 'الدفع', en: 'Payment' },
  { slug: 'return-policy', ar: 'الإرجاع', en: 'Returns' },
  { slug: 'shipping-policy', ar: 'الشحن', en: 'Shipping' },
  { slug: 'loyalty-policy', ar: 'الولاء', en: 'Loyalty' },
];

interface Props {
  isAr: boolean;
}

export const AdminSettingsStaticPagesTab: React.FC<Props> = ({ isAr }) => {
  const [activeSlug, setActiveSlug] = useState('about');
  const [draft, setDraft] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const load = async (slug: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/admin/static-pages/${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const fallback = getStaticPageFallback(slug);
        setDraft({
          ...(fallback || {}),
          ...data,
          titleAr: data.titleAr || fallback?.titleAr || '',
          titleEn: data.titleEn || fallback?.titleEn || '',
          contentAr: data.contentAr?.length > 20 ? data.contentAr : (fallback?.contentAr || data.contentAr || ''),
          contentEn: data.contentEn?.length > 20 ? data.contentEn : (fallback?.contentEn || data.contentEn || ''),
        });
      } else {
        const fallback = getStaticPageFallback(slug);
        if (fallback) setDraft({ ...fallback, isPublished: true });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(activeSlug);
  }, [activeSlug]);

  const save = async (audit: SettingsAuditPayload) => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_URL}/admin/static-pages/${activeSlug}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        titleAr: draft.titleAr,
        titleEn: draft.titleEn,
        contentAr: draft.contentAr,
        contentEn: draft.contentEn,
        isPublished: draft.isPublished !== false,
        value: {},
        ...audit,
      }),
    });
    if (res.ok) {
      setShowAudit(false);
      await load(activeSlug);
    }
  };

  const ta = 'w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white min-h-[200px] font-mono';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap gap-2">
        {PAGE_SLUGS.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setActiveSlug(p.slug)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${
              activeSlug === p.slug ? 'bg-gold-500 text-black' : 'bg-white/5 text-white/50'
            }`}
          >
            {isAr ? p.ar : p.en}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-white/40 text-sm">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
              value={draft.titleAr || ''}
              onChange={(e) => setDraft({ ...draft, titleAr: e.target.value })}
              placeholder={isAr ? 'العنوان عربي' : 'Title AR'}
            />
            <textarea
              className={ta}
              value={draft.contentAr || ''}
              onChange={(e) => setDraft({ ...draft, contentAr: e.target.value })}
              placeholder={isAr ? 'المحتوى عربي' : 'Content AR'}
            />
          </div>
          <div className="space-y-4">
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
              value={draft.titleEn || ''}
              onChange={(e) => setDraft({ ...draft, titleEn: e.target.value })}
              placeholder="Title EN"
            />
            <textarea
              className={ta}
              value={draft.contentEn || ''}
              onChange={(e) => setDraft({ ...draft, contentEn: e.target.value })}
              placeholder="Content EN"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={draft.isPublished !== false}
            onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })}
          />
          {isAr ? 'منشور' : 'Published'}
        </label>
        <a
          href={`/${activeSlug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white/70 text-xs font-bold"
        >
          <Eye size={14} /> {isAr ? 'معاينة' : 'Preview'}
        </a>
        <button
          type="button"
          onClick={() => setShowAudit(true)}
          className="px-6 py-2 rounded-xl bg-gold-500 text-black text-xs font-black uppercase"
        >
          {isAr ? 'حفظ مع التدقيق' : 'Save with audit'}
        </button>
      </div>

      <SettingsAuditModal
        isOpen={showAudit}
        onClose={() => setShowAudit(false)}
        title={isAr ? 'تدقيق تحديث المحتوى' : 'Content update audit'}
        subtitle={isAr ? 'سبب التعديل والتوقيع مطلوبان' : 'Reason and signature required'}
        onConfirm={save}
      />
    </div>
  );
};
