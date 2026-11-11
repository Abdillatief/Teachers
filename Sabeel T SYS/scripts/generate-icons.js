import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

// Color Palette
// Primary Teal: #0d9488 -> (13, 148, 136)
// Dark Teal: #0f766e -> (15, 118, 110)
// Deep Navy / Background: #0f172a -> (15, 23, 42)
// Slate: #1e293b -> (30, 41, 59)
// White: #ffffff -> (255, 255, 255)
// Gold / Amber: #f59e0b -> (245, 158, 11)

function createIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });
  const center = size / 2;
  const radius = size * (isMaskable ? 0.5 : 0.44);
  const cornerRadius = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      let r = 15, g = 23, b = 42, a = 255; // Default deep background

      // Distance from center
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (isMaskable) {
        // Full square gradient background
        const gradT = (x + y) / (size * 2);
        r = Math.round(15 * (1 - gradT) + 13 * gradT);
        g = Math.round(23 * (1 - gradT) + 148 * gradT);
        b = Math.round(42 * (1 - gradT) + 136 * gradT);
      } else {
        // Squircle with smooth anti-aliased border
        const absX = Math.abs(x - center);
        const absY = Math.abs(y - center);
        const qx = Math.max(absX - (center - cornerRadius), 0);
        const qy = Math.max(absY - (center - cornerRadius), 0);
        const cornerDist = Math.sqrt(qx * qx + qy * qy);

        if (cornerDist > cornerRadius) {
          a = 0; // Transparent outside
        } else {
          // Inside squircle
          const gradT = (y) / size;
          r = Math.round(13 * (1 - gradT) + 15 * gradT);
          g = Math.round(148 * (1 - gradT) + 118 * gradT);
          b = Math.round(136 * (1 - gradT) + 110 * gradT);

          // Subtle inner shadow / border ring
          if (cornerDist > cornerRadius - size * 0.02) {
            r = Math.round(r * 0.8 + 245 * 0.2);
            g = Math.round(g * 0.8 + 158 * 0.2);
            b = Math.round(b * 0.8 + 11 * 0.2);
          }
        }
      }

      if (a > 0) {
        // Draw Academic Graduation Cap / Book Symbol in Center
        // 1. Cap Diamond
        // Center of diamond is at (center, center - size * 0.08)
        const capCy = center - size * 0.06;
        const capW = size * 0.46;
        const capH = size * 0.22;

        const relX = (x - center) / (capW / 2);
        const relY = (y - capCy) / (capH / 2);

        if (Math.abs(relX) + Math.abs(relY) <= 1.0) {
          // Inside cap diamond
          const isGoldEdge = (Math.abs(relX) + Math.abs(relY) >= 0.88);
          if (isGoldEdge) {
            r = 245; g = 158; b = 11; // Gold accent
          } else {
            r = 255; g = 255; b = 255; // White
          }
        }

        // 2. Cap Base / Headband
        const baseCy = center + size * 0.08;
        const baseW = size * 0.28;
        const baseH = size * 0.12;
        const bRelX = (x - center) / (baseW / 2);
        const bRelY = (y - baseCy) / (baseH / 2);

        if (bRelX * bRelX + bRelY * bRelY <= 1.0 && y >= capCy + size * 0.04 && y <= baseCy + baseH / 2) {
          r = 255; g = 255; b = 255;
        }

        // 3. Tassel (Side String & Bead)
        const tasselX = center - size * 0.22;
        const tasselY1 = capCy;
        const tasselY2 = center + size * 0.14;
        if (Math.abs(x - tasselX) <= Math.max(1, size * 0.015) && y >= tasselY1 && y <= tasselY2) {
          r = 245; g = 158; b = 11; // Gold tassel string
        }
        const tasselBallDist = Math.sqrt((x - tasselX) ** 2 + (y - tasselY2) ** 2);
        if (tasselBallDist <= size * 0.035) {
          r = 245; g = 158; b = 11; // Gold tassel bead
        }

        // 4. Open Book Pages Below
        const bookCy = center + size * 0.22;
        const bookW = size * 0.38;
        const bookH = size * 0.14;
        const bookRelX = (x - center) / (bookW / 2);
        const bookRelY = (y - bookCy) / (bookH / 2);

        if (Math.abs(bookRelX) <= 1.0 && bookRelY >= -0.6 && bookRelY <= 0.8) {
          const curve = 0.2 * Math.sin(Math.abs(bookRelX) * Math.PI);
          if (bookRelY >= curve - 0.3 && bookRelY <= curve + 0.3) {
            // Book page
            if (Math.abs(x - center) > size * 0.015) {
              r = 245; g = 245; b = 250;
            } else {
              r = 13; g = 148; b = 136; // Spine gap
            }
          }
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return PNG.sync.write(png);
}

// Generate all target icon files
const dirs = ['public/icons', 'assets/icons', 'public'];
dirs.forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

const iconsToGenerate = [
  { path: 'public/icons/icon-192.png', size: 192, maskable: false },
  { path: 'public/icons/icon-512.png', size: 512, maskable: false },
  { path: 'public/icons/icon-maskable-192.png', size: 192, maskable: true },
  { path: 'public/icons/icon-maskable-512.png', size: 512, maskable: true },
  { path: 'public/icons/icon-144.png', size: 144, maskable: false },
  { path: 'public/icons/icon-96.png', size: 96, maskable: false },
  { path: 'public/icons/icon-48.png', size: 48, maskable: false },
  
  // Copies in assets/icons as well
  { path: 'assets/icons/icon-192.png', size: 192, maskable: false },
  { path: 'assets/icons/icon-512.png', size: 512, maskable: false },
  { path: 'assets/icons/icon-maskable-192.png', size: 192, maskable: true },
  { path: 'assets/icons/icon-maskable-512.png', size: 512, maskable: true },
  { path: 'assets/icons/icon-144.png', size: 144, maskable: false },
  { path: 'assets/icons/icon-96.png', size: 96, maskable: false },
  { path: 'assets/icons/icon-48.png', size: 48, maskable: false },

  // Favicons
  { path: 'public/favicon.png', size: 48, maskable: false },
  { path: 'public/favicon.ico', size: 48, maskable: false }
];

console.log('Generating PWA Icons...');
for (const item of iconsToGenerate) {
  const buffer = createIcon(item.size, item.maskable);
  fs.writeFileSync(item.path, buffer);
  console.log(`✓ Created: ${item.path} (${item.size}x${item.size})`);
}
console.log('All icons generated successfully!');
