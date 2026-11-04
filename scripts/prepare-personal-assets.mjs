// Explicitly local personal-use fixture. Never imported by build or npm package.
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await mkdir('.local-assets',{recursive:true});
const source = await readFile('.research/carl-meme.png');
const hash = createHash('sha256').update(source).digest('hex');
if (hash !== 'a1b4d6b414ad292458d0de585e10c22c92193d691b875d08b7818284063eb9bd') throw new Error('Unexpected reference image. Recheck provenance.');
// Crop existing pixels only; no generative tools, no re-drawing or new animal.
const crop = await sharp(source).extract({left:704,top:421,width:933,height:700}).resize({width:384}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=0;i<crop.data.length;i+=4){ const r=crop.data[i],g=crop.data[i+1],b=crop.data[i+2]; const x=(i/4)%crop.info.width, y=Math.floor(i/4/crop.info.width); if(Math.min(r,g,b)>243 || (x<96 && y<63)) crop.data[i+3]=0; }
const clear = await sharp(crop.data,{raw:crop.info}).png().toBuffer();
const lowRgb = await sharp(clear).flatten({background:'#fff'}).resize({width:72}).jpeg({quality:24}).toBuffer();
const low = await sharp(lowRgb).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const alpha = await sharp(clear).resize(low.info.width,low.info.height).ensureAlpha().raw().toBuffer();
for(let i=3;i<low.data.length;i+=4) low.data[i]=alpha[i];
const patina = await sharp(low.data,{raw:low.info}).png().toBuffer();
await writeFile('.local-assets/carl-clear.png',clear); await writeFile('.local-assets/carl-patina.png',patina);
const manifest = {privatePersonalUse:true,source:hash,transforms:'Existing 2019 Carl meme crop (704,421,933,700); white transparency and removal of caption-only upper-left rectangle; resize384; patina resize72 JPEG quality24 with same alpha',files:{}};
for(const [key,bytes] of Object.entries({clear,patina}))manifest.files[key]={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
await writeFile('.local-assets/manifest.json',JSON.stringify(manifest,null,2));
console.log(manifest);
