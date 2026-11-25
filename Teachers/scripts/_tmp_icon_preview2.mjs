import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
const root=process.cwd();
const src=path.join(root,'public','icons','icon-512.png');
const outDir=path.join(root,'tmp-icon-preview');
fs.mkdirSync(outDir,{recursive:true});
const srcBuf=fs.readFileSync(src);

// remove near-white background -> transparent
const {data,info}=await sharp(srcBuf).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=0;i<data.length;i+=4){
  const r=data[i],g=data[i+1],b=data[i+2];
  if(r>245 && g>245 && b>245){ data[i+3]=0; }
}
const transparentBuf=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
fs.writeFileSync(path.join(outDir,'logo-transparent.png'), transparentBuf);

async function makePreview(name,{bg,scale,maskShape}){
  const size=512;
  const inner=Math.round(size*scale);
  const pad=Math.round((size-inner)/2);
  const icon=await sharp(transparentBuf).resize(inner,inner,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  let buf=await sharp({create:{width:size,height:size,channels:4,background:bg}}).composite([{input:icon,left:pad,top:pad}]).png().toBuffer();
  if(maskShape==='circle'){
    const mask=Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`);
    buf=await sharp(buf).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  } else if(maskShape==='squircle'){
    const r=Math.round(size*0.22);
    const mask=Buffer.from(`<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="white"/></svg>`);
    buf=await sharp(buf).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  }
  // preview on neutral backdrop
  const backdrop=Buffer.from(`<svg width="${size}" height="${size}"><rect width="100%" height="100%" fill="#111827"/></svg>`);
  const final=await sharp(backdrop).composite([{input:buf}]).png().toBuffer();
  fs.writeFileSync(path.join(outDir,name), final);
}

const white={r:255,g:255,b:255,alpha:1};
const teal={r:13,g:148,b:136,alpha:1};
await makePreview('A_white_circle.png',{bg:white,scale:0.72,maskShape:'circle'});
await makePreview('B_white_rounded.png',{bg:white,scale:0.72,maskShape:'squircle'});
await makePreview('C_teal_circle.png',{bg:teal,scale:0.72,maskShape:'circle'});
await makePreview('D_teal_rounded.png',{bg:teal,scale:0.72,maskShape:'squircle'});
console.log('ok');
