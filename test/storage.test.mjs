import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository, CONFIG_KEY, LEDGER_KEY } from '../src/storage.mjs';
import { validImages } from '../src/images.mjs';
function fixture() {
  const values = new Map(), storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  let tail=Promise.resolve(), t=new Date('2026-11-01T10:00:00').getTime();
  const locks={request:(_,fn)=>{const result=tail.then(fn);tail=result.catch(()=>{});return result;}};
  return {values,storage,locks,get t(){return t;},advance:delta=>t+=delta,repo:()=>createRepository(storage,locks,()=>t)};
}
test('two tabs atomically claim a session+round once, refresh retains ledger',async()=>{
  const f=fixture(),a=f.repo(),b=f.repo();a.update({always:true,dnd:false});const e={id:'session:1',time:f.t};
  assert.equal((await Promise.all([a.claimCompletion(e),b.claimCompletion(e)])).filter(Boolean).length,1);
  assert.equal(await f.repo().claimCompletion(e),false);
  assert.equal(await a.claimCompletion({id:'session:2',time:f.t}),true);
});
test('normal probability zero and cooldown consume without replay',async()=>{
  const f=fixture(),r=f.repo();r.update({probability:0,dnd:false});const e={id:'s:1',time:f.t};assert.equal(await r.claimCompletion(e),false);
  r.update({probability:1});assert.equal(await r.claimCompletion(e),false);assert.equal(await r.claimCompletion({id:'s:2',time:f.t}),true);
  f.advance(60_000);assert.equal(await r.claimCompletion({id:'s:3',time:f.t}),false);
  f.advance(30*60_000);assert.equal(await r.claimCompletion({id:'s:4',time:f.t}),true);
});
test('always bypasses cooldown, but not DND or disabled completion',async()=>{
  const f=fixture(),r=f.repo();r.update({always:true,dnd:false,completion:false});assert.equal(await r.claimCompletion({id:'a',time:f.t}),false);
  r.update({completion:true,dnd:true,dndStart:'09:00',dndEnd:'11:00'});assert.equal(await r.claimCompletion({id:'b',time:f.t}),false);
  r.update({dnd:false});assert.equal(await r.claimCompletion({id:'c',time:f.t}),true);assert.equal(await r.claimCompletion({id:'d',time:f.t}),true);
});
test('expired and future completion timestamps never show',async()=>{
  const f=fixture(),r=f.repo();r.update({always:true,dnd:false});assert.equal(await r.claimCompletion({id:'old',time:f.t-121_000}),false);assert.equal(await r.claimCompletion({id:'future',time:f.t+60_000}),false);
});
test('two tabs schedule reminder once and fresh repo survives reload',async()=>{
  const f=fixture(),a=f.repo(),b=f.repo();a.update({waterMinutes:1,meals:false,dnd:false});await a.tick('Asia/Shanghai');f.advance(60_000);
  assert.equal((await Promise.all([a.tick('Asia/Shanghai'),b.tick('Asia/Shanghai')])).filter(Boolean).length,1);
  assert.equal(await f.repo().tick('Asia/Shanghai'),null);
});
test('snooze is persisted through refresh, just one notification',async()=>{
  const f=fixture(),r=f.repo();r.update({water:false,meals:true,dnd:false});await r.tick('Z');await r.snooze({id:'meal:test',kind:'meal'},'Z');f.advance(10*60_000);
  assert.equal((await f.repo().tick('Z')).id,'meal:test:snooze');assert.equal(await f.repo().tick('Z'),null);
});
test('invalid JSON falls back, unavailable locks/storage fail closed',async()=>{
  const f=fixture();f.values.set(CONFIG_KEY,'{broken');f.values.set(LEDGER_KEY,'{broken');const r=f.repo();assert.equal(r.config().size,100);assert.equal(await r.tick('Z'),null);
  assert.equal(await createRepository(f.storage,null).tick('Z'),null);
  const broken=createRepository({getItem(){throw Error();},setItem(){throw Error();}},f.locks);assert.equal(broken.automatic,false);assert.equal(await broken.claimCompletion({id:'x',time:f.t}),null);
});
test('ledger structural corruption and settings changes cannot replay a meal',async()=>{
  const f=fixture(),r=f.repo();for(const value of ['[]','42','true','{"seen":null}']){f.values.set(LEDGER_KEY,value);assert.equal(await r.tick('Z'),null);}
  f.values.set(LEDGER_KEY,JSON.stringify({seen:{},schedule:{zone:'Z',last:f.t,anchors:{water:f.t,rest:f.t},consumed:{'meal:Z:2026-11-01:12:00':f.t},snooze:null}}));
  await r.resetTimers('Z');assert.ok(JSON.parse(f.values.get(LEDGER_KEY)).schedule.consumed['meal:Z:2026-11-01:12:00']);
});
test('self-chosen images accept raster data only; SVG and external URLs rejected',()=>{
  assert.equal(!!validImages({clear:'https://example.com/a.png',patina:'data:image/png;base64,AAAA'}),false);
  assert.equal(!!validImages({clear:'data:image/svg+xml;base64,AAAA',patina:'data:image/png;base64,AAAA'}),false);
  assert.equal(!!validImages({clear:'data:image/png;base64,AAAA',patina:'data:image/png;base64,AAAA'}),true);
});
