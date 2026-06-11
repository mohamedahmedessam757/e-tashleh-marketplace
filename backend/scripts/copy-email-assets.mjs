import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'assets', 'logo-email.png');
const destDir = join(root, 'dist', 'assets');

if (existsSync(src)) {
    mkdirSync(destDir, { recursive: true });
    cpSync(src, join(destDir, 'logo-email.png'));
}
