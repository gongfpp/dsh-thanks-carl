import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { apply } from '../src/host.mjs';
test('Host registers exactly one authenticated owner route with cleanup',async()=>{
  const listeners=new Map(), routes=[],effects=[];
  const session={id:'s'},agent={session};
  const ctx={on(name,fn,opts){assert.equal(opts.global,true);listeners.set(name,fn);},connection:{fetch:{register(route){routes.push(route);return async()=>routes.splice(routes.indexOf(route),1);}}},effect(fn){effects.push(fn());}};
  apply(ctx);assert.equal(routes.length,1);assert.equal(routes[0].path,'/api/thanks-carl/status');assert.deepEqual(routes[0].methods,['GET']);
  const status=()=>routes[0].fetch(new Request('http://localhost/api/thanks-carl/status?sessionId=s&since=0')).then(r=>r.json());
  assert.equal((await status()).provider,undefined);
  listeners.get('agent/status')({agent,status:'running'});listeners.get('session/event')(session,{type:'turn/start',data:{turn:1}});listeners.get('session/event')(session,{type:'turn/end',data:{turn:1,reason:{kind:'completed'}}});listeners.get('agent/status')({agent,status:'idle'});
  const value=await status();assert.equal(value.events.length,1);assert.equal(value.events[0].id,'s:1');assert.equal(JSON.stringify(value).includes('content'),false);
  assert.equal((await routes[0].fetch(new Request('http://localhost/api/thanks-carl/status?sessionId=other&since=0')).then(r=>r.json())).events.length,0);
  await effects[0]();assert.equal(routes.length,0);
});
test('built client registers factory lazily and never runs at script arrival',async()=>{
  const text=await readFile('client.js','utf8');let factory;
  vm.runInNewContext(text,{window:{__ModuleLoader__:{load(row){assert.equal(row.id,'dsh-thanks-carl');factory=row.factory;}}}});
  assert.equal(typeof factory,'function');
  const exports=factory(name=>{assert.equal(name,'react');return {};});
  assert.equal(typeof exports.apply,'function');assert.deepEqual([...exports.inject],['slots']);
});
test('no removed provider-specific copy survives anywhere in source, build, or docs',async()=>{
  const files=['package.json','README.md','cordis.patch.yml','src/core.mjs','src/host.mjs','src/controller.mjs','src/client.jsx','src/storage.mjs','src/images.mjs','index.js','client.js','locale/zh.json','locale/en.json','test/core.test.mjs','test/fixture-host.mjs','scripts/verify-browser.mjs','scripts/build.mjs','scripts/check-package.mjs','docs/technical-decisions.md','screenshots.json'];
  // 关键词用 \u 转义写，避免扫描清单自身命中目标文案。
  const forbidden=[/\u8C22\u8C22\s*DS/i,/\u6587\u6848\u5207\u6362/,/wording/i,/projectedProvider/,/deepseek-account/,/sessionProjections/];
  for(const file of files){
    const text=await readFile(file,'utf8').catch(()=>null);assert.ok(text!==null,`${file} must exist`);
    for(const pattern of forbidden)assert.doesNotMatch(text,pattern,`${file} still matches ${pattern}`);
  }
});
test('package exports and public asset boundary are explicit',async()=>{
  const pkg=JSON.parse(await readFile('package.json','utf8'));assert.equal(pkg.dsh.client.platform,'web');assert.equal(pkg.dsh.client.immediately,true);assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-plugin-manager'));assert.ok(!pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-settings'));assert.equal(pkg.exports['.'],'./index.js');assert.equal(pkg.exports['./client'],'./client.js');assert.equal(pkg.exports['./icon'],'./icon.svg');assert.equal(pkg.exports['./locale/*.json'],'./locale/*.json');
  assert.ok(!pkg.files.includes('test/'));assert.ok(!pkg.files.includes('.local-assets/'));assert.ok(!pkg.files.includes('artifacts/'));
  const clear=await readFile('assets/carl-clear.png');const patina=await readFile('assets/carl-patina.png');assert.ok(clear.length>100_000);assert.ok(patina.length>5_000);const build=await readFile('scripts/build.mjs','utf8');assert.match(build,/\.png.*dataurl/);
  const source=await readFile('src/client.jsx','utf8');assert.match(source,/builtInClear/);assert.match(source,/builtInPatina/);assert.match(source,/shell\.overlay/);assert.match(source,/plugins\.bundle\.config/);assert.doesNotMatch(source,/settings\.section/);assert.match(source,/key:\x27dsh-thanks-carl\x27/);assert.doesNotMatch(source,/querySelector|MutationObserver/);
});
