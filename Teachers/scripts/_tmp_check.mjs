import sharp from 'sharp';
import fs from 'fs';
const p='tmp-icon-preview/logo-teal-solid.png';
const {data,info}=await sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let nonTeal=0, transparent=0, edgeNonTeal=[];
const bg=[13,148,136];
for(let y=0;y<info.height;y++){
  for(let x=0;x<info.width;x++){
    const i=(y*info.width+x)*4;
    const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
    const isBg = Math.abs(r-bg[0])<5 && Math.abs(g-bg[1])<5 && Math.abs(b-bg[2])<5;
    if(a<250) transparent++;
    if(!isBg) { nonTeal++; if(x<5||y<5||x>info.width-6||y>info.height-6) edgeNonTeal.push([x,y,r,g,b,a]); }
  }
}
console.log({w:info.width,h:info.height,nonTeal,transparent,edgeSample:edgeNonTeal.slice(0,20)});
