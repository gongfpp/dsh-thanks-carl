import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
await build({entryPoints:['src/host.mjs'],outfile:'index.js',bundle:true,platform:'node',format:'esm',target:'node22'});
const result = await build({entryPoints:['src/client.jsx'],bundle:true,write:false,platform:'browser',format:'cjs',target:'es2022',external:['react'],loader:{'.css':'text','.svg':'dataurl','.png':'dataurl'},sourcemap:'inline'});
const code = `window.__ModuleLoader__.load({id:"dsh-thanks-carl",factory:(require)=>{var module={exports:{}};var exports=module.exports;\n${result.outputFiles[0].text}\nreturn module.exports;}});\n`;
await writeFile('client.js',code);
console.log('Built root index.js (Host ESM) and client.js (lazy-CJS DSH client factory).');
