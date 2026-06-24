import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authPath = path.join(__dirname, '../data/locales/auth.ts');
const outPath = path.join(__dirname, '../data/locales/guest-landing.ts');

const src = fs.readFileSync(authPath, 'utf8');

function extractLanding(lang) {
  const marker = `  ${lang}: {`;
  const start = src.indexOf(marker);
  const authSectionStart = src.indexOf('    authSection: {', start);
  if (start < 0 || authSectionStart < 0) throw new Error(`landing ${lang} not found`);
  const block = src.slice(start + marker.length, authSectionStart).trim();
  return block.replace(/,\s*$/, '');
}

const ar = extractLanding('ar');
const en = extractLanding('en');

const out = `/** Landing copy — legal body loads via loadLegalContent() */
export const guestLanding = {
  ar: {
${ar}
  },
  en: {
${en}
  },
} as const;
`;

fs.writeFileSync(outPath, out, 'utf8');
console.log('Wrote', outPath);
