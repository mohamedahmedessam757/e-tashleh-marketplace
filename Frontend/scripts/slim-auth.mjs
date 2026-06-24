import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authPath = path.join(__dirname, '../data/locales/auth.ts');
const lines = fs.readFileSync(authPath, 'utf8').split('\n');

function sliceAuthSection(langStartLine) {
  // langStartLine is 1-based index where `  ar: {` or `  en: {` appears
  let i = langStartLine;
  while (i < lines.length && !lines[i].includes('authSection:')) i++;
  const start = i;
  let depth = 0;
  let started = false;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('authSection:')) {
      started = true;
      depth = 1;
      continue;
    }
    if (!started) continue;
    for (const ch of line) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (depth === 0) {
      return lines.slice(start, i + 1).join('\n');
    }
  }
  throw new Error(`authSection not found for line ${langStartLine}`);
}

const arBlock = sliceAuthSection(2); // line 3 = ar
const enBlock = sliceAuthSection(277); // line 278 = en

const out = `/** Auth UI strings only — landing copy in guest-landing.ts */
export const auth = {
  ar: {
${arBlock}
  },
  en: {
${enBlock}
  },
} as const;
`;

fs.writeFileSync(authPath, out, 'utf8');
console.log('Slimmed auth.ts');
