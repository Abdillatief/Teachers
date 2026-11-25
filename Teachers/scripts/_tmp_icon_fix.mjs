import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const outDir = path.join(root, 'tmp-icon-preview');
fs.mkdirSync(outDir, { recursive: true });
const orig = fs.readFileSync(path.join(root, 'public', 'icons', 'icon-512.png'));
const trans = fs.readFileSync(path.join(root, 'tmp-icon-preview', 'logo-transparent.png'));

async function save(name, buf) {
  const size = 512;
  const backdrop = Buffer.from(`<svg width="${size}" height="${size}"><rect width="100%" height="100%" fill="#111827"/></svg>`);
  const final = await sharp(backdrop).composite([{ input: buf }]).png().toBuffer();
  fs.writeFileSync(path.join(outDir, name), final);
}

async function circleMask(buf, size=512) {
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`);
  return sharp(buf).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

async function make(bg, logoBuf, scale, name, opts={}) {
  const size=512;
  const inner=Math.round(size*scale);
  const pad=Math.round((size-inner)/2);
  const icon=await sharp(logoBuf).resize(inner,inner,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  let layers=[];
  if (opts.plate) {
    const pr = Math.round(size*0.36);
    const plate = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${pr}" fill="white"/></svg>`);
    layers.push({input: plate});
  }
  layers.push({input: icon, left: pad, top: pad});
  let buf = await sharp({create:{width:size,height:size,channels:4,background:bg}}).composite(layers).png().toBuffer();
  buf = await circleMask(buf, size);
  await save(name, buf);
}

const white={r:255,g:255,b:255,alpha:1};
const teal={r:13,g:148,b:136,alpha:1};
const darkTeal={r:15,g:118,b:110,alpha:1};

await make(white, orig, 0.92, 'F1_white_original_full.png');
await make(white, trans, 0.78, 'F2_white_transparent.png');
await make(teal, trans, 0.72, 'F3_teal_current.png');
await make(teal, trans, 0.82, 'F4_teal_bigger.png');
await make(teal, trans, 0.72, 'F5_teal_white_plate.png', {plate:true});
await make(darkTeal, trans, 0.78, 'F6_darkteal_bigger.png');

console.log('ok');
