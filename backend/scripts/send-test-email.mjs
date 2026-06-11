/**
 * Send branded OTP preview email (run after: npm run build).
 * Usage: node scripts/send-test-email.mjs <email> [ar|en]
 */
import 'dotenv/config';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL_LOGO_CID = 'brand-logo';

const require = createRequire(import.meta.url);
let buildOtpEmail;
try {
  ({ buildOtpEmail } = require('../dist/src/email/templates/otp-email.template.js'));
} catch {
  console.error('Run "npm run build" first, then retry.');
  process.exit(1);
}

const to = process.argv[2];
const lang = process.argv[3] === 'en' ? 'en' : 'ar';

if (!to) {
  console.error('Usage: node scripts/send-test-email.mjs <email> [ar|en]');
  process.exit(1);
}

const siteUrl =
  process.env.RESEND_SITE_URL?.trim() ||
  (process.env.FRONTEND_URL?.includes('localhost')
    ? 'https://e-tashleh.net'
    : process.env.FRONTEND_URL?.replace(/\/$/, '')?.replace(/^["']|["']$/g, '')) ||
  'https://e-tashleh.net';

const externalLogo = process.env.RESEND_LOGO_URL?.trim();
const logoCandidates = [
  join(__dirname, '..', 'assets', 'logo-email.png'),
  join(__dirname, '..', 'dist', 'assets', 'logo-email.png'),
];
const embeddedLogo = !externalLogo
  ? logoCandidates.map((p) => (existsSync(p) ? readFileSync(p) : null)).find(Boolean)
  : null;
const logoUrl = externalLogo || (embeddedLogo ? `cid:${EMAIL_LOGO_CID}` : `${siteUrl}/logo.png`);

const content = buildOtpEmail({
  name: lang === 'ar' ? 'محمد' : 'Mohamed',
  code: '482910',
  language: lang,
  purposeLabel: lang === 'ar' ? 'تسجيل الدخول' : 'Sign in',
  brand: { siteUrl, logoUrl },
});

const attachments = embeddedLogo
  ? [{ filename: 'logo.png', content: embeddedLogo, contentId: EMAIL_LOGO_CID }]
  : undefined;

const resend = new Resend(process.env.RESEND_API_KEY);
const { data, error } = await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL,
  to,
  subject: content.subject,
  html: content.html,
  text: content.text,
  attachments,
});

if (error) {
  console.error('FAIL:', error.message);
  process.exit(1);
}

console.log(`OK sent id=${data.id} → ${to} (${lang})`);
