import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');
const input = path.join(publicDir, 'logo.png');
const output = path.join(publicDir, 'logo.webp');

await sharp(input)
  .resize(224, 224, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 78, effort: 6 })
  .toFile(output);

const { size } = await sharp(output).metadata().then(async () => {
  const fs = await import('fs');
  return { size: fs.statSync(output).size };
});

console.log(`Wrote ${output} (${Math.round(size / 1024)} KB)`);
