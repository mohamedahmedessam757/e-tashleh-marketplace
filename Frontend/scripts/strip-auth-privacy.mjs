import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authPath = path.join(__dirname, '../data/locales/auth.ts');
let src = fs.readFileSync(authPath, 'utf8');

src = src.replace(/privacyContent: \[[\s\S]*?\],\n      termsContent:/g, 'privacyContent: [],\n      termsContent:');

fs.writeFileSync(authPath, src, 'utf8');
console.log('Stripped privacyContent from auth.ts');
