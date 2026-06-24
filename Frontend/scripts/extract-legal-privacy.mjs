import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authPath = path.join(__dirname, '../data/locales/auth.ts');
const outPath = path.join(__dirname, '../data/locales/legal-privacy.ts');

const src = fs.readFileSync(authPath, 'utf8');

function extractPrivacy(lang) {
  const marker = `  ${lang}: {`;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`lang ${lang} not found`);
  const privacyStart = src.indexOf('privacyContent: [', start);
  const privacyEnd = src.indexOf('],\n      termsContent:', privacyStart);
  if (privacyStart < 0 || privacyEnd < 0) throw new Error(`privacy block ${lang} not found`);
  return src.slice(privacyStart + 'privacyContent: '.length, privacyEnd + 1);
}

const ar = extractPrivacy('ar');
const en = extractPrivacy('en');

const out = `export type LegalSection = { title: string; content: string[] };

export const legalPrivacy = {
  ar: ${ar},
  en: ${en},
} as const satisfies Record<'ar' | 'en', LegalSection[]>;
`;

fs.writeFileSync(outPath, out, 'utf8');
console.log('Wrote', outPath);
