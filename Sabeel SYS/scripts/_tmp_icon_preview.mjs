import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const src = path.join(root, 'public', 'icons', 'icon-512.png');
const outDir = path.join(root, 'tmp-icon-preview');
fs.mkdirSync(outDir, { recursive: true });
const srcBuf = fs.readFileSync(src);

async function makePreview(name, { fgScale, bgColor, fgBg='transparent', shape='circle' }) {
  const size = 512;
  const inner = Math.round(size * fgScale);
  const pad = Math.round((size - inner) / 2);
  const icon = await sharp(srcBuf)
    .resize(inner, inner, { fit: 'contain', background: fgBg })
    .png().toBuffer();
  let canvas = sharp({ create: { width: size, height: size, channels: 4, background: bgColor } })
    .composite([{ input: icon, left: pad, top: pad }]);
  let buf = await canvas.png().toBuffer();

  // apply mask
  if (shape === 'circle') {
    const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`);
    buf = await sharp(buf).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  } else if (shape === 'rounded') {
    const r = Math.round(size * 0.22);
    const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="white"/></svg>`);
    buf = await sharp(buf).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  }
  // put on checkerboard-ish dark bg for visibility
  const bg = Buffer.from(`<svg width="${size}" height="${size}"><rect width="100%" height="100%" fill="#1f2937"/></svg>`);
  const final = await sharp(bg).composite([{ input: buf, left: 0, top: 0 }]).png().toBuffer();
  fs.writeFileSync(path.join(outDir, name), final);
}

await makePreview('option1_circle_whitebg_big.png', { fgScale: 0.82, bgColor: {r:255,g:255,b:255,alpha:1}, fgBg:{r:255,g:255,b:255,alpha:1}, shape:'circle' });
await makePreview('option2_circle_tealbg_big.png', { fgScale: 0.82, bgColor: {r:13,g:148,b:136,alpha:1}, fgBg:{r:255,g:255,b:255,alpha:1}, shape:'circle' });
await makePreview('option3_circle_whitebg_full.png', { fgScale: 0.92, bgColor: {r:255,g:255,b:255,alpha:1}, fgBg:{r:255,g:255,b:255,alpha:1}, shape:'circle' });
await makePreview('option4_rounded_whitebg_big.png', { fgScale: 0.82, bgColor: {r:255,g:255,b:255,alpha:1}, fgBg:{r:255,g:255,b:255,alpha:1}, shape:'rounded' });
console.log('done', outDir);
