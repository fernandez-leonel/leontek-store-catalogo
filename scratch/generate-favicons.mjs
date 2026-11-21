import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const srcLogo = 'src/assets/leontek-logo.png';
const publicDir = 'public';

const sizes = [
  { file: 'favicon-16x16.png', size: 16 },
  { file: 'favicon-32x32.png', size: 32 },
  { file: 'favicon-48x48.png', size: 48 },
  { file: 'favicon.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon-192.png', size: 192 },
  { file: 'favicon-512.png', size: 512 },
];

for (const { file, size } of sizes) {
  const outPath = path.join(publicDir, file);
  const cmd = `ffmpeg -y -i "${srcLogo}" -vf "scale=${size}:${size}:flags=lanczos" "${outPath}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log(`Generated ${file} (${size}x${size})`);
}

// Generate multi-resolution favicon.ico
const icoPath = path.join(publicDir, 'favicon.ico');
const cmdIco = `ffmpeg -y -i "${path.join(publicDir, 'favicon-16x16.png')}" -i "${path.join(publicDir, 'favicon-32x32.png')}" -i "${path.join(publicDir, 'favicon-48x48.png')}" "${icoPath}"`;
execSync(cmdIco, { stdio: 'inherit' });
console.log('Generated multi-resolution favicon.ico');

// Generate favicon.svg embedding the high-resolution logo
const logoBase64 = fs.readFileSync(srcLogo).toString('base64');
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 744 744">
  <image width="744" height="744" href="data:image/png;base64,${logoBase64}" />
</svg>`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8');
console.log('Generated favicon.svg');
