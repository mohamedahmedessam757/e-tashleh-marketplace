import React, { useState } from 'react';
import { ChevronDown, Image, RotateCcw, Sparkles } from 'lucide-react';
import type { EarnIncomeConfig } from '../../../types/earnIncome';
import { buildEarnIncomeFromLocale } from '../../../utils/systemConfigDefaults';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';

interface Props {
  isAr: boolean;
  formData: { general?: { earnIncome?: EarnIncomeConfig } };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
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

function patchEarn(
  setFormData: Props['setFormData'],
  patch: Partial<EarnIncomeConfig> | ((prev: EarnIncomeConfig) => EarnIncomeConfig),
) {
  setFormData((prev: any) => {
    const current = prev.general?.earnIncome || buildEarnIncomeFromLocale();
    const next = typeof patch === 'function' ? patch(current) : { ...current, ...patch };
    return {
      ...prev,
      general: { ...prev.general, earnIncome: next },
    };
  });
}

function patchEarnBlock<K extends keyof EarnIncomeConfig>(
  setFormData: Props['setFormData'],
  block: K,
  field: string,
  value: unknown,
) {
  setFormData((prev: any) => {
    const earn = prev.general?.earnIncome || buildEarnIncomeFromLocale();
    const blockVal = (earn[block] || {}) as Record<string, unknown>;
    return {
      ...prev,
      general: {
        ...prev.general,
        earnIncome: {
          ...earn,
          [block]: { ...blockVal, [field]: value },
        },
      },
    };
  });
}

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-gold-500/50';

function FieldPair({
  label,
  arValue,
  enValue,
  onAr,
  onEn,
  multiline,
}: {
  label: string;
  arValue: string;
  enValue: string;
  onAr: (v: string) => void;
  onEn: (v: string) => void;
  multiline?: boolean;
}) {
  const Input = multiline ? 'textarea' : 'input';
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-white/40 uppercase">{label}</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input className={`${inputCls}${multiline ? ' min-h-[72px]' : ''}`} value={arValue} onChange={(e) => onAr(e.target.value)} placeholder="AR" />
        <Input className={`${inputCls}${multiline ? ' min-h-[72px]' : ''}`} value={enValue} onChange={(e) => onEn(e.target.value)} placeholder="EN" />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-black text-white hover:bg-white/5"
      >
        {title}
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">{children}</div>}
    </div>
  );
}

export const AdminSettingsEarnIncomeTab: React.FC<Props> = ({ isAr, formData, setFormData }) => {
  const earn = formData.general?.earnIncome || buildEarnIncomeFromLocale();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <Sparkles className="text-gold-400" size={22} />
          <h2 className="text-xl font-black text-white">
            {isAr ? 'صفحة اكسب دخل معنا' : 'Earn Income Landing CMS'}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-bold text-white/70">
            <input
              type="checkbox"
              checked={earn.enabled}
              onChange={(e) => patchEarn(setFormData, { enabled: e.target.checked })}
              className="rounded"
            />
            {isAr ? 'الصفحة مفعّلة' : 'Page enabled'}
          </label>
          <button
            type="button"
            onClick={() => patchEarn(setFormData, buildEarnIncomeFromLocale())}
            className="flex items-center gap-2 text-xs font-black text-gold-400 hover:text-gold-300"
          >
            <RotateCcw size={14} />
            {isAr ? 'استعادة الافتراضي' : 'Reset defaults'}
          </button>
        </div>
      </header>

      <Section title={isAr ? 'البطل والتنقل' : 'Hero & navigation'} defaultOpen>
        <div className="flex flex-wrap gap-4 items-center mb-4">
          {earn.heroIconUrl && (
            <img src={earn.heroIconUrl} alt="" className="h-12 w-12 rounded-lg bg-white/10 p-1 object-contain" />
          )}
          <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
            <Image size={14} className="text-gold-400" />
            <input
              type="file"
              accept="image/*,.svg"
              className="text-xs"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAsset(f, 'earn-income-icon').then((url) => patchEarn(setFormData, { heroIconUrl: url }));
              }}
            />
          </label>
        </div>
        <FieldPair
          label={isAr ? 'عنوان البطل' : 'Hero title'}
          arValue={earn.heroTitleAr}
          enValue={earn.heroTitleEn}
          onAr={(v) => patchEarn(setFormData, { heroTitleAr: v })}
          onEn={(v) => patchEarn(setFormData, { heroTitleEn: v })}
        />
        <FieldPair
          label={isAr ? 'العنوان الفرعي' : 'Hero subtitle'}
          arValue={earn.heroSubtitleAr}
          enValue={earn.heroSubtitleEn}
          onAr={(v) => patchEarn(setFormData, { heroSubtitleAr: v })}
          onEn={(v) => patchEarn(setFormData, { heroSubtitleEn: v })}
          multiline
        />
        <FieldPair
          label={isAr ? 'شارة التنقل' : 'Nav badge'}
          arValue={earn.navBadgeAr}
          enValue={earn.navBadgeEn}
          onAr={(v) => patchEarn(setFormData, { navBadgeAr: v })}
          onEn={(v) => patchEarn(setFormData, { navBadgeEn: v })}
        />
      </Section>

      <Section title={isAr ? 'المقدمة' : 'Intro'}>
        <FieldPair
          label={isAr ? 'العنوان' : 'Title'}
          arValue={earn.intro.titleAr}
          enValue={earn.intro.titleEn}
          onAr={(v) => patchEarnBlock(setFormData, 'intro', 'titleAr', v)}
          onEn={(v) => patchEarnBlock(setFormData, 'intro', 'titleEn', v)}
        />
        <FieldPair label="Desc 1" arValue={earn.intro.desc1Ar} enValue={earn.intro.desc1En} onAr={(v) => patchEarnBlock(setFormData, 'intro', 'desc1Ar', v)} onEn={(v) => patchEarnBlock(setFormData, 'intro', 'desc1En', v)} multiline />
        <FieldPair label="Desc 2" arValue={earn.intro.desc2Ar} enValue={earn.intro.desc2En} onAr={(v) => patchEarnBlock(setFormData, 'intro', 'desc2Ar', v)} onEn={(v) => patchEarnBlock(setFormData, 'intro', 'desc2En', v)} />
        <FieldPair label="Desc 3" arValue={earn.intro.desc3Ar} enValue={earn.intro.desc3En} onAr={(v) => patchEarnBlock(setFormData, 'intro', 'desc3Ar', v)} onEn={(v) => patchEarnBlock(setFormData, 'intro', 'desc3En', v)} />
      </Section>

      <Section title={isAr ? 'كيف تبدأ (4 خطوات)' : 'How to start (4 steps)'}>
        <FieldPair
          label={isAr ? 'عنوان القسم' : 'Section title'}
          arValue={earn.howToStart.titleAr}
          enValue={earn.howToStart.titleEn}
          onAr={(v) => patchEarnBlock(setFormData, 'howToStart', 'titleAr', v)}
          onEn={(v) => patchEarnBlock(setFormData, 'howToStart', 'titleEn', v)}
        />
        {(earn.howToStart.steps || []).map((step, idx) => (
          <div key={idx} className="p-4 rounded-xl border border-white/5 space-y-3">
            <p className="text-[10px] font-black text-gold-500 uppercase">{isAr ? `الخطوة ${idx + 1}` : `Step ${idx + 1}`}</p>
            <FieldPair
              label={isAr ? 'العنوان' : 'Title'}
              arValue={step.titleAr}
              enValue={step.titleEn}
              onAr={(v) => {
                const steps = [...earn.howToStart.steps];
                steps[idx] = { ...steps[idx], titleAr: v };
                patchEarnBlock(setFormData, 'howToStart', 'steps', steps);
              }}
              onEn={(v) => {
                const steps = [...earn.howToStart.steps];
                steps[idx] = { ...steps[idx], titleEn: v };
                patchEarnBlock(setFormData, 'howToStart', 'steps', steps);
              }}
            />
            <FieldPair
              label={isAr ? 'الوصف' : 'Description'}
              arValue={step.descAr}
              enValue={step.descEn}
              onAr={(v) => {
                const steps = [...earn.howToStart.steps];
                steps[idx] = { ...steps[idx], descAr: v };
                patchEarnBlock(setFormData, 'howToStart', 'steps', steps);
              }}
              onEn={(v) => {
                const steps = [...earn.howToStart.steps];
                steps[idx] = { ...steps[idx], descEn: v };
                patchEarnBlock(setFormData, 'howToStart', 'steps', steps);
              }}
              multiline
            />
          </div>
        ))}
      </Section>

      {(['first', 'second'] as const).map((key) => {
        const block = earn[key];
        const label = key === 'first' ? (isAr ? 'نظام الولاء' : 'Loyalty') : (isAr ? 'نظام الإحالة' : 'Referral');
        return (
          <Section key={key} title={label}>
            <FieldPair label={isAr ? 'العنوان' : 'Title'} arValue={block.titleAr} enValue={block.titleEn} onAr={(v) => patchEarnBlock(setFormData, key, 'titleAr', v)} onEn={(v) => patchEarnBlock(setFormData, key, 'titleEn', v)} />
            <FieldPair label={isAr ? 'العنوان الفرعي' : 'Subtitle'} arValue={block.subtitleAr || ''} enValue={block.subtitleEn || ''} onAr={(v) => patchEarnBlock(setFormData, key, 'subtitleAr', v)} onEn={(v) => patchEarnBlock(setFormData, key, 'subtitleEn', v)} multiline />
            {[0, 1, 2].map((i) => (
              <FieldPair
                key={i}
                label={`${isAr ? 'نقطة' : 'Bullet'} ${i + 1}`}
                arValue={block.bulletsAr[i] || ''}
                enValue={block.bulletsEn[i] || ''}
                onAr={(v) => {
                  const bulletsAr = [...block.bulletsAr] as [string, string, string];
                  bulletsAr[i] = v;
                  patchEarnBlock(setFormData, key, 'bulletsAr', bulletsAr);
                }}
                onEn={(v) => {
                  const bulletsEn = [...block.bulletsEn] as [string, string, string];
                  bulletsEn[i] = v;
                  patchEarnBlock(setFormData, key, 'bulletsEn', bulletsEn);
                }}
              />
            ))}
          </Section>
        );
      })}

      <Section title={isAr ? 'توقيت الأرباح' : 'Profit timing'}>
        <FieldPair label={isAr ? 'العنوان' : 'Title'} arValue={earn.timing.titleAr} enValue={earn.timing.titleEn} onAr={(v) => patchEarnBlock(setFormData, 'timing', 'titleAr', v)} onEn={(v) => patchEarnBlock(setFormData, 'timing', 'titleEn', v)} />
        <FieldPair label={isAr ? 'العنوان الفرعي' : 'Subtitle'} arValue={earn.timing.subtitleAr} enValue={earn.timing.subtitleEn} onAr={(v) => patchEarnBlock(setFormData, 'timing', 'subtitleAr', v)} onEn={(v) => patchEarnBlock(setFormData, 'timing', 'subtitleEn', v)} multiline />
        {[0, 1, 2].map((i) => (
          <FieldPair
            key={i}
            label={`${isAr ? 'نقطة' : 'Bullet'} ${i + 1}`}
            arValue={earn.timing.bulletsAr[i] || ''}
            enValue={earn.timing.bulletsEn[i] || ''}
            onAr={(v) => {
              const bulletsAr = [...earn.timing.bulletsAr] as [string, string, string];
              bulletsAr[i] = v;
              patchEarnBlock(setFormData, 'timing', 'bulletsAr', bulletsAr);
            }}
            onEn={(v) => {
              const bulletsEn = [...earn.timing.bulletsEn] as [string, string, string];
              bulletsEn[i] = v;
              patchEarnBlock(setFormData, 'timing', 'bulletsEn', bulletsEn);
            }}
          />
        ))}
        <FieldPair label={isAr ? 'التذييل' : 'Footer'} arValue={earn.timing.footerAr} enValue={earn.timing.footerEn} onAr={(v) => patchEarnBlock(setFormData, 'timing', 'footerAr', v)} onEn={(v) => patchEarnBlock(setFormData, 'timing', 'footerEn', v)} multiline />
      </Section>

      <Section title={isAr ? 'لماذا مختلف' : 'Why different'}>
        <FieldPair label={isAr ? 'العنوان' : 'Title'} arValue={earn.whyDifferent.titleAr} enValue={earn.whyDifferent.titleEn} onAr={(v) => patchEarnBlock(setFormData, 'whyDifferent', 'titleAr', v)} onEn={(v) => patchEarnBlock(setFormData, 'whyDifferent', 'titleEn', v)} />
        {[0, 1, 2, 3].map((i) => (
          <FieldPair
            key={i}
            label={`${isAr ? 'نقطة' : 'Bullet'} ${i + 1}`}
            arValue={earn.whyDifferent.bulletsAr[i] || ''}
            enValue={earn.whyDifferent.bulletsEn[i] || ''}
            onAr={(v) => {
              const bulletsAr = [...earn.whyDifferent.bulletsAr] as [string, string, string, string];
              bulletsAr[i] = v;
              patchEarnBlock(setFormData, 'whyDifferent', 'bulletsAr', bulletsAr);
            }}
            onEn={(v) => {
              const bulletsEn = [...earn.whyDifferent.bulletsEn] as [string, string, string, string];
              bulletsEn[i] = v;
              patchEarnBlock(setFormData, 'whyDifferent', 'bulletsEn', bulletsEn);
            }}
          />
        ))}
      </Section>

      <Section title={isAr ? 'تخيّل' : 'Imagine'}>
        <FieldPair label={isAr ? 'العنوان' : 'Title'} arValue={earn.imagine.titleAr} enValue={earn.imagine.titleEn} onAr={(v) => patchEarnBlock(setFormData, 'imagine', 'titleAr', v)} onEn={(v) => patchEarnBlock(setFormData, 'imagine', 'titleEn', v)} />
        <FieldPair label="P1" arValue={earn.imagine.p1Ar} enValue={earn.imagine.p1En} onAr={(v) => patchEarnBlock(setFormData, 'imagine', 'p1Ar', v)} onEn={(v) => patchEarnBlock(setFormData, 'imagine', 'p1En', v)} />
        <FieldPair label="P2" arValue={earn.imagine.p2Ar} enValue={earn.imagine.p2En} onAr={(v) => patchEarnBlock(setFormData, 'imagine', 'p2Ar', v)} onEn={(v) => patchEarnBlock(setFormData, 'imagine', 'p2En', v)} multiline />
      </Section>

      <Section title={isAr ? 'CTA والإحصائيات' : 'CTA & stats labels'}>
        <FieldPair label="CTA" arValue={earn.ctaAr} enValue={earn.ctaEn} onAr={(v) => patchEarn(setFormData, { ctaAr: v })} onEn={(v) => patchEarn(setFormData, { ctaEn: v })} />
        <FieldPair label={isAr ? 'مستخدمون نشطون' : 'Active users'} arValue={earn.statsLabels.activeUsersAr} enValue={earn.statsLabels.activeUsersEn} onAr={(v) => patchEarnBlock(setFormData, 'statsLabels', 'activeUsersAr', v)} onEn={(v) => patchEarnBlock(setFormData, 'statsLabels', 'activeUsersEn', v)} />
        <FieldPair label={isAr ? 'إجمالي الموزع' : 'Total distributed'} arValue={earn.statsLabels.totalDistributedAr} enValue={earn.statsLabels.totalDistributedEn} onAr={(v) => patchEarnBlock(setFormData, 'statsLabels', 'totalDistributedAr', v)} onEn={(v) => patchEarnBlock(setFormData, 'statsLabels', 'totalDistributedEn', v)} />
        <FieldPair label={isAr ? 'الإحالات' : 'Referrals'} arValue={earn.statsLabels.referralsAr} enValue={earn.statsLabels.referralsEn} onAr={(v) => patchEarnBlock(setFormData, 'statsLabels', 'referralsAr', v)} onEn={(v) => patchEarnBlock(setFormData, 'statsLabels', 'referralsEn', v)} />
      </Section>
    </div>
  );
};
