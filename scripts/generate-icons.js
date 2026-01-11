import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple SVG and convert to different sizes
const createIcon = (size, outputPath) => {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#3b82f6"/>
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.5}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">WB</text>
  </svg>`;

  fs.writeFileSync(outputPath, svg);
  console.log(`Created ${outputPath}`);
};

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Create SVG files (browsers support SVG as icons)
createIcon(192, path.join(iconsDir, 'icon-192x192.svg'));
createIcon(512, path.join(iconsDir, 'icon-512x512.svg'));
createIcon(152, path.join(iconsDir, 'icon-152x152.svg'));

// Also create the sizes referenced in manifest.json
createIcon(72, path.join(iconsDir, 'icon-72.svg'));
createIcon(96, path.join(iconsDir, 'icon-96.svg'));
createIcon(128, path.join(iconsDir, 'icon-128.svg'));
createIcon(144, path.join(iconsDir, 'icon-144.svg'));
createIcon(384, path.join(iconsDir, 'icon-384.svg'));

console.log('All icons generated successfully!');
