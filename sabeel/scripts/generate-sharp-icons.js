import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceImgPath = path.resolve(process.cwd(), 'src/assets/images/sabeel_logo_pwa_1787506540665.jpg');

const targetDirs = [
  'public/icons',
  'icons',
  'assets/icons',
  'dist/icons',
  'public'
];

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const sizes = [
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-144.png', size: 144, maskable: false },
  { name: 'icon-96.png', size: 96, maskable: false },
  { name: 'icon-48.png', size: 48, maskable: false },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'icon-maskable-192.png', size: 192, maskable: true },
  { name: 'favicon.png', size: 48, maskable: false },
  { name: 'favicon.ico', size: 48, maskable: false }
];

async function generate() {
  console.log('Generating high quality PWA icons using Sharp from official logo...');
  
  for (const item of sizes) {
    // Normal icon with padding and rounded squircle background if needed
    let pipeline = sharp(sourceImgPath);
    
    if (item.maskable) {
      // Maskable icon requires 10% safe-zone margin
      const innerSize = Math.round(item.size * 0.80);
      const padding = Math.round((item.size - innerSize) / 2);
      
      const resized = await sharp(sourceImgPath)
        .resize(innerSize, innerSize, { fit: 'contain' })
        .toBuffer();
        
      pipeline = sharp({
        create: {
          width: item.size,
          height: item.size,
          channels: 4,
          background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a
        }
      }).composite([{
        input: resized,
        top: padding,
        left: padding
      }]);
    } else {
      pipeline = pipeline.resize(item.size, item.size, {
        fit: 'cover',
        position: 'center'
      });
    }

    const outputBuffer = await pipeline.png({ quality: 100, compressionLevel: 9 }).toBuffer();

    // Write to all target directories
    if (item.name === 'favicon.png' || item.name === 'favicon.ico') {
      fs.writeFileSync(`public/${item.name}`, outputBuffer);
      fs.writeFileSync(`dist/${item.name}`, outputBuffer);
      fs.writeFileSync(`${item.name}`, outputBuffer);
      console.log(`✓ Generated: public/${item.name}`);
    } else {
      fs.writeFileSync(`public/icons/${item.name}`, outputBuffer);
      fs.writeFileSync(`icons/${item.name}`, outputBuffer);
      fs.writeFileSync(`assets/icons/${item.name}`, outputBuffer);
      fs.writeFileSync(`dist/icons/${item.name}`, outputBuffer);
      console.log(`✓ Generated: /icons/${item.name} (${item.size}x${item.size})`);
    }
  }

  console.log('All PWA icon assets generated successfully!');
}

generate().catch(console.error);
