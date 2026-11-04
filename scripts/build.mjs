import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('lib',{recursive:true});
await build({entryPoints:['src/host.mjs'],outfile:'lib/host.js',bundle:true,platform:'node',format:'esm',target:'node22',sourcemap:true});
const result = await build({entryPoints:['src/client.jsx'],bundle:true,write:false,platform:'browser',format:'cjs',target:'es2022',external:['react'],loader:{'.css':'text','.svg':'dataurl','.png':'dataurl'},sourcemap:'inline'});
const code = `window.__ModuleLoader__.load({id:"dsh-thanks-carl",factory:(require)=>{var module={exports:{}};var exports=module.exports;\n${result.outputFiles[0].text}\nreturn module.exports;}});\n`;
await writeFile('lib/client.js',code);
console.log('Built Host ESM and lazy-CJS DSH client factory.');
