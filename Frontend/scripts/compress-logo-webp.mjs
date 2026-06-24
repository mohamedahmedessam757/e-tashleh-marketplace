import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');

async function compressToWebp(inputName, outputName, size = 224) {
  const input = path.join(publicDir, inputName);
  const output = path.join(publicDir, outputName);

  if (!fs.existsSync(input)) {
    console.warn(`Skip ${inputName}: file not found`);
    return;
  }

  await sharp(input)
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 })
    .toFile(output);

  const bytes = fs.statSync(output).size;
  console.log(`Wrote ${output} (${Math.round(bytes / 1024)} KB)`);
}

await compressToWebp('logo.png', 'logo.webp', 224);
await compressToWebp('logo_nomo.png', 'logo_nomo.webp', 112);
