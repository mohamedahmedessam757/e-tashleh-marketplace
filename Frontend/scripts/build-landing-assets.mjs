import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../..');
const outDir = path.join(__dirname, '../public/landing');
fs.mkdirSync(outDir, { recursive: true });

const heroSrc = path.join(repoRoot, 'main background.png');
for (const w of [640, 1024, 1600, 2400]) {
  await sharp(heroSrc).resize({ width: w, withoutEnlargement: true })
    .webp({ quality: 72, effort: 6 }).toFile(path.join(outDir, `hero-${w}.webp`));
  await sharp(heroSrc).resize({ width: w, withoutEnlargement: true })
    .avif({ quality: 50, effort: 6 }).toFile(path.join(outDir, `hero-${w}.avif`));
}

const crestalSrc = path.join(repoRoot, 'crestal.png');
for (const h of [160, 320]) {
  await sharp(crestalSrc).trim().resize({ height: h, withoutEnlargement: true })
    .webp({ quality: 80, effort: 6, alphaQuality: 90 }).toFile(path.join(outDir, `crestal-${h}.webp`));
}

for (const f of fs.readdirSync(outDir)) {
  console.log(f, Math.round(fs.statSync(path.join(outDir, f)).size / 1024) + ' KB');
}
