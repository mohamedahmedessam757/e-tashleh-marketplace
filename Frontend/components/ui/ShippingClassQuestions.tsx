import React from 'react';
import {
  applyShippingClassAnswer,
  answersFromShippingClass,
  shippingClassFromAnswers,
  SHIPPING_CLASS_QUESTIONS_AR,
  SHIPPING_CLASS_QUESTIONS_EN,
  type ShippingClass,
  type ShippingClassAnswers,
} from '../../utils/shippingClass';

interface ShippingClassQuestionsProps {
  value: ShippingClass | null | undefined;
  onChange: (next: ShippingClass | null) => void;
  disabled?: boolean;
  showError?: boolean;
  isAr: boolean;
  title?: string;
}

export const ShippingClassQuestions: React.FC<ShippingClassQuestionsProps> = ({
  value,
  onChange,
  disabled = false,
  showError = false,
  isAr,
  title,
}) => {
  const answers: ShippingClassAnswers = answersFromShippingClass(value ?? null);
  const q = isAr ? SHIPPING_CLASS_QUESTIONS_AR : SHIPPING_CLASS_QUESTIONS_EN;
  const yesLabel = isAr ? 'نعم' : 'Yes';
  const noLabel = isAr ? 'لا' : 'No';

  const setAnswer = (key: keyof ShippingClassAnswers, yes: boolean) => {
    const nextAnswers = applyShippingClassAnswer(answers, key, yes);
    onChange(shippingClassFromAnswers(nextAnswers));
  };

  const invalidAllNo =
    answers.engine === false && answers.gearbox === false && answers.other === false;
  const missing = !value && showError;

  const btnYes = (active: boolean) =>
    `min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold border transition-all disabled:opacity-50 ${
      active
        ? 'bg-gold-500 text-black border-gold-400 shadow-[0_0_16px_rgba(212,175,55,0.35)]'
        : 'bg-white/5 text-white/70 border-white/10 hover:border-gold-500/40'
    }`;
  const btnNo = (active: boolean) =>
    `min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold border transition-all disabled:opacity-50 ${
      active
        ? 'bg-white/15 text-white border-white/30'
        : 'bg-white/5 text-white/70 border-white/10 hover:border-white/30'
    }`;

  return (
    <div
      className={`w-full min-w-0 space-y-4 p-4 rounded-2xl border ${
        missing || invalidAllNo
          ? 'border-red-500/50 bg-red-500/5 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
          : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      {title && (
        <h4 className="text-xs font-black uppercase tracking-widest text-gold-500/80">{title}</h4>
      )}

      <div className="space-y-2 min-w-0">
        <p className="text-sm text-white/90 font-medium leading-relaxed break-words">{q.engine}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={disabled} onClick={() => setAnswer('engine', true)} className={btnYes(answers.engine === true)}>
            {yesLabel}
          </button>
          <button type="button" disabled={disabled} onClick={() => setAnswer('engine', false)} className={btnNo(answers.engine === false)}>
            {noLabel}
          </button>
        </div>
      </div>

      {answers.engine === false && (
        <div className="space-y-2 min-w-0">
          <p className="text-sm text-white/90 font-medium leading-relaxed break-words">{q.gearbox}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={disabled} onClick={() => setAnswer('gearbox', true)} className={btnYes(answers.gearbox === true)}>
              {yesLabel}
            </button>
            <button type="button" disabled={disabled} onClick={() => setAnswer('gearbox', false)} className={btnNo(answers.gearbox === false)}>
              {noLabel}
            </button>
          </div>
        </div>
      )}

      {answers.engine === false && answers.gearbox === false && (
        <div className="space-y-2 min-w-0">
          <p className="text-sm text-white/90 font-medium leading-relaxed break-words">{q.other}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={disabled} onClick={() => setAnswer('other', true)} className={btnYes(answers.other === true)}>
              {yesLabel}
            </button>
            <button type="button" disabled={disabled} onClick={() => setAnswer('other', false)} className={btnNo(answers.other === false)}>
              {noLabel}
            </button>
          </div>
        </div>
      )}

      {(missing || invalidAllNo) && (
        <p className="text-xs text-red-300 font-bold">
          {isAr
            ? 'يجب اختيار إجابة واحدة بنعم (محرك أو ناقل حركة أو أخرى). لا يمكن اختيار الكل لا.'
            : 'You must answer Yes to exactly one option (Engine, Transmission, or Other). All-No is not allowed.'}
        </p>
      )}
    </div>
  );
};
