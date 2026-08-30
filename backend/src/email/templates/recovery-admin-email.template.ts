import type { OtpEmailBrand, OtpEmailContent, OtpEmailLanguage } from './otp-email.template';

/** Matches Frontend gold palette — same as OTP emails */
const COLORS = {
    gold: '#A88B3E',
    goldLight: '#C9A84C',
    goldDark: '#8B7229',
    bgOuter: '#0F0E0D',
    bgCard: '#1A1814',
    bgMuted: '#2A2418',
    borderGold: 'rgba(168,139,62,0.35)',
    textPrimary: '#FAFAF9',
    textMuted: '#A8A29E',
    textDim: '#78716C',
} as const;

const BRAND_AR = 'E-Tshaleh | إي تشليح';
const BRAND_EN = 'E-Tshaleh';

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function shell(params: {
    dir: 'rtl' | 'ltr';
    lang: string;
    siteUrl: string;
    logoUrl: string;
    title: string;
    greetingHtml: string;
    bodyHtml: string;
    codeBlockHtml?: string;
    security: string;
    footer: string;
    cta: string;
}): string {
    const align = params.dir === 'rtl' ? 'right' : 'left';
    return `<!DOCTYPE html>
<html lang="${params.lang}" dir="${params.dir}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="dark"/>
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bgOuter};font-family:'Segoe UI',Tahoma,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.bgOuter};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:${COLORS.bgCard};border-radius:20px;overflow:hidden;border:1px solid ${COLORS.borderGold};box-shadow:0 8px 32px rgba(0,0,0,0.45);">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,${COLORS.goldDark},${COLORS.gold},${COLORS.goldLight});font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px;text-align:center;background:linear-gradient(180deg,${COLORS.bgMuted} 0%,${COLORS.bgCard} 100%);">
              <a href="${escapeHtml(params.siteUrl)}" style="text-decoration:none;display:inline-block;">
                <img src="${escapeHtml(params.logoUrl)}" alt="E-Tshaleh" width="72" height="72" style="display:block;margin:0 auto 12px;border-radius:16px;border:1px solid ${COLORS.borderGold};"/>
              </a>
              <div style="font-size:18px;font-weight:700;color:${COLORS.textPrimary};letter-spacing:0.5px;">E-Tshaleh</div>
              <div style="font-size:12px;color:${COLORS.gold};margin-top:4px;opacity:0.9;">
                ${params.lang === 'ar' ? 'إي تشليح — سوق قطع الغيار' : 'Auto Parts Marketplace'}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;text-align:${align};">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:${COLORS.textPrimary};line-height:1.4;">
                ${escapeHtml(params.title)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 0;text-align:${align};">
              <p style="margin:0;font-size:15px;line-height:1.7;color:${COLORS.textMuted};">${params.greetingHtml}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;text-align:${align};">
              <p style="margin:0;font-size:15px;line-height:1.7;color:${COLORS.textMuted};">${params.bodyHtml}</p>
            </td>
          </tr>
          ${params.codeBlockHtml || ''}
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.bgMuted};border-radius:12px;border:1px solid rgba(168,139,62,0.15);">
                <tr>
                  <td style="padding:14px 18px;text-align:${align};">
                    <span style="font-size:13px;line-height:1.6;color:${COLORS.textDim};">🔒 ${escapeHtml(params.security)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;text-align:center;">
              <a href="${escapeHtml(params.siteUrl)}" style="display:inline-block;background:linear-gradient(90deg,${COLORS.goldDark},${COLORS.gold});color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px;box-shadow:0 4px 20px rgba(168,139,62,0.35);">
                ${escapeHtml(params.cta)} →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:${COLORS.bgMuted};border-top:1px solid ${COLORS.borderGold};text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:${COLORS.gold};font-weight:600;">${escapeHtml(params.footer)}</p>
              <p style="margin:0;font-size:11px;color:${COLORS.textDim};line-height:1.5;">
                <a href="${escapeHtml(params.siteUrl)}" style="color:${COLORS.textDim};text-decoration:underline;">${escapeHtml(params.siteUrl.replace(/^https?:\/\//, ''))}</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:11px;color:${COLORS.textDim};text-align:center;max-width:520px;">
          ${params.lang === 'ar' ? 'رسالة تلقائية — لا ترد على هذا البريد' : 'Automated message — please do not reply'}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/** Admin-approved Case3 resume token — OTP-like layout, 24h expiry, long hex code */
export function buildRecoveryResumeEmail(params: {
    name: string;
    resumeToken: string;
    expiresAt: Date;
    language?: OtpEmailLanguage;
    brand?: OtpEmailBrand;
}): OtpEmailContent {
    const lang = params.language ?? 'ar';
    const name = params.name.trim() || (lang === 'ar' ? 'مستخدم' : 'User');
    const siteUrl = params.brand?.siteUrl?.replace(/\/$/, '') || 'https://e-tashleh.net';
    const logoUrl = params.brand?.logoUrl || `${siteUrl}/logo.png`;
    const token = params.resumeToken.trim();
    const expiresLabel = params.expiresAt.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    const codeBlockHtml = `
          <tr>
            <td style="padding:28px 24px;text-align:center;">
              <div style="font-size:11px;font-weight:600;color:${COLORS.textDim};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">
                ${lang === 'ar' ? 'رمز الاستكمال من الإدارة' : 'Admin resume token'}
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;width:100%;">
                <tr>
                  <td style="background:linear-gradient(135deg,${COLORS.bgMuted},${COLORS.bgCard});border:2px solid ${COLORS.gold};border-radius:16px;padding:18px 16px;box-shadow:0 4px 24px rgba(168,139,62,0.25);word-break:break-all;">
                    <span style="font-size:14px;font-weight:700;letter-spacing:1px;color:${COLORS.goldLight};font-family:Consolas,'Courier New',monospace;direction:ltr;display:inline-block;line-height:1.6;">
                      ${escapeHtml(token)}
                    </span>
                  </td>
                </tr>
              </table>
              <div style="margin-top:14px;font-size:12px;color:${COLORS.textDim};">
                ${lang === 'ar' ? `صالح حتى ${escapeHtml(expiresLabel)} (24 ساعة)` : `Valid until ${escapeHtml(expiresLabel)} (24 hours)`}
              </div>
            </td>
          </tr>`;

    if (lang === 'en') {
        return {
            subject: `Account recovery resume code — ${BRAND_EN}`,
            html: shell({
                dir: 'ltr',
                lang: 'en',
                siteUrl,
                logoUrl,
                title: 'Account recovery approved',
                greetingHtml: `Hello <strong style="color:${COLORS.goldLight}">${escapeHtml(name)}</strong>,`,
                bodyHtml: `Your high-risk account recovery request was <strong>approved</strong>. Use the resume code below in the recovery wizard to set a new phone and email. Do not share this code.`,
                codeBlockHtml,
                security:
                    'E-Tshaleh staff will never ask you to forward this code. If you did not request recovery, contact support immediately.',
                footer: BRAND_EN,
                cta: 'Open E-Tshaleh',
            }),
            text: [
                `Hello ${name},`,
                '',
                'Your high-risk account recovery was approved.',
                `Resume code: ${token}`,
                `Valid until: ${expiresLabel} (24 hours)`,
                '',
                'Enter this code in the account recovery wizard to continue.',
                siteUrl,
            ].join('\n'),
        };
    }

    return {
        subject: `رمز استكمال استعادة الحساب — ${BRAND_AR}`,
        html: shell({
            dir: 'rtl',
            lang: 'ar',
            siteUrl,
            logoUrl,
            title: 'تمت الموافقة على استعادة الحساب',
            greetingHtml: `مرحباً <strong style="color:${COLORS.goldLight}">${escapeHtml(name)}</strong>،`,
            bodyHtml: `تمت <strong>الموافقة</strong> على طلب استعادة الحساب عالي الخطورة. استخدم رمز الاستكمال أدناه في شاشة الاسترجاع لإدخال جوال وبريد جديدين. لا تشارك هذا الرمز مع أي شخص.`,
            codeBlockHtml,
            security:
                'إدارة E-Tshaleh لن تطلب منك إعادة إرسال هذا الرمز. إذا لم تطلب الاستعادة، تواصل مع الدعم فوراً.',
            footer: BRAND_AR,
            cta: 'فتح المنصة',
        }),
        text: [
            `مرحباً ${name}،`,
            '',
            'تمت الموافقة على طلب استعادة الحساب عالي الخطورة.',
            `رمز الاستكمال: ${token}`,
            `صالح حتى: ${expiresLabel} (24 ساعة)`,
            '',
            'أدخل الرمز في معالج استعادة الحساب للمتابعة.',
            siteUrl,
        ].join('\n'),
    };
}

/** Rejection notice with admin reason to the registered email */
export function buildRecoveryRejectionEmail(params: {
    name: string;
    reason: string;
    language?: OtpEmailLanguage;
    brand?: OtpEmailBrand;
}): OtpEmailContent {
    const lang = params.language ?? 'ar';
    const name = params.name.trim() || (lang === 'ar' ? 'مستخدم' : 'User');
    const reason = params.reason.trim();
    const siteUrl = params.brand?.siteUrl?.replace(/\/$/, '') || 'https://e-tashleh.net';
    const logoUrl = params.brand?.logoUrl || `${siteUrl}/logo.png`;

    const reasonBlock = `
          <tr>
            <td style="padding:20px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.bgMuted};border-radius:12px;border:1px solid ${COLORS.borderGold};">
                <tr>
                  <td style="padding:16px 18px;text-align:${lang === 'ar' ? 'right' : 'left'};">
                    <div style="font-size:11px;font-weight:600;color:${COLORS.textDim};margin-bottom:8px;letter-spacing:0.5px;">
                      ${lang === 'ar' ? 'سبب الرفض من الإدارة' : 'Rejection reason from admin'}
                    </div>
                    <p style="margin:0;font-size:15px;line-height:1.7;color:${COLORS.textPrimary};white-space:pre-wrap;">${escapeHtml(reason)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

    if (lang === 'en') {
        return {
            subject: `Account recovery rejected — ${BRAND_EN}`,
            html: shell({
                dir: 'ltr',
                lang: 'en',
                siteUrl,
                logoUrl,
                title: 'Account recovery rejected',
                greetingHtml: `Hello <strong style="color:${COLORS.goldLight}">${escapeHtml(name)}</strong>,`,
                bodyHtml: `Your high-risk account recovery request was <strong>rejected</strong>. Login details were <strong>not</strong> changed. The reason from our team is below.`,
                codeBlockHtml: reasonBlock,
                security: 'If you believe this is a mistake, contact support through official channels only.',
                footer: BRAND_EN,
                cta: 'Open E-Tshaleh',
            }),
            text: [
                `Hello ${name},`,
                '',
                'Your account recovery request was rejected. Login details were not changed.',
                `Reason: ${reason}`,
                '',
                siteUrl,
            ].join('\n'),
        };
    }

    return {
        subject: `رفض طلب استعادة الحساب — ${BRAND_AR}`,
        html: shell({
            dir: 'rtl',
            lang: 'ar',
            siteUrl,
            logoUrl,
            title: 'تم رفض طلب استعادة الحساب',
            greetingHtml: `مرحباً <strong style="color:${COLORS.goldLight}">${escapeHtml(name)}</strong>،`,
            bodyHtml: `تم <strong>رفض</strong> طلب استعادة الحساب عالي الخطورة. لم يتم تغيير بيانات الدخول. سبب الرفض من الإدارة موضّح أدناه.`,
            codeBlockHtml: reasonBlock,
            security: 'إذا كنت تعتقد أن القرار خاطئ، تواصل مع الدعم عبر القنوات الرسمية فقط.',
            footer: BRAND_AR,
            cta: 'فتح المنصة',
        }),
        text: [
            `مرحباً ${name}،`,
            '',
            'تم رفض طلب استعادة الحساب. لم يتم تغيير بيانات الدخول.',
            `سبب الرفض: ${reason}`,
            '',
            siteUrl,
        ].join('\n'),
    };
}
