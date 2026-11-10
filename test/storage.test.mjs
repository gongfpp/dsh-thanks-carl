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
test('focus is shared, reload-safe, and completion is claimed once by two tabs',async()=>{
  const f=fixture(),a=f.repo(),b=f.repo();a.update({water:false,meals:false,dnd:false});
  await Promise.all([a.focus('start',25),b.focus('start',45)]);
  assert.equal(a.activity().focus.minutes,25);assert.deepEqual(f.repo().activity(),a.activity());
  f.advance(5*60_000);await b.focus('pause');const remaining=a.activity().focus.remaining;
  f.advance(10*60_000);assert.equal(f.repo().activity().focus.remaining,remaining);
  await a.focus('resume');f.advance(remaining);
  const events=await Promise.all([a.tick('Z'),b.tick('Z')]);assert.equal(events.filter(Boolean).length,1);assert.equal(events.find(Boolean).kind,'focus');
  assert.equal(f.repo().activity().focus.status,'finished');assert.equal(await f.repo().tick('Z'),null);
  await b.focus('end');assert.equal(a.activity().focus,null);
});
test('focus and quiet suppress automatic events without replay; quiet also suppresses focus end',async()=>{
  const f=fixture(),r=f.repo();r.update({always:true,waterMinutes:1,meals:false,dnd:false});await r.tick('Z');await r.focus('start',25);
  f.advance(60_000);assert.equal(await r.tick('Z'),null);assert.equal(await r.claimCompletion({id:'focus-round',time:f.t}),false);
  await r.focus('end');assert.equal(await r.claimCompletion({id:'focus-round',time:f.t}),false);
  await r.setQuiet('hour');assert.equal(f.repo().activity().quietUntil,f.t+60*60_000);
  assert.equal(await r.claimCompletion({id:'quiet-round',time:f.t}),false);await r.focus('start',25);
  f.advance(25*60_000);assert.equal(await r.tick('Z'),null);assert.equal(r.activity().focus.status,'finished');
  await r.setQuiet('off');assert.equal(await r.tick('Z'),null);assert.equal(await r.claimCompletion({id:'quiet-round',time:f.t}),false);
});
test('water acknowledgement resets only water and clears its snooze without consuming meals',async()=>{
  const f=fixture(),r=f.repo();r.update({waterMinutes:1,meals:true,mealTimes:['10:01'],dnd:false});await r.tick('Z');
  f.advance(30_000);await r.snooze({id:'water:ack',kind:'water'},'Z');await r.drankWater('Z');
  const schedule=JSON.parse(f.values.get(LEDGER_KEY)).schedule;assert.equal(schedule.anchors.water,f.t);assert.equal(schedule.snooze,null);
  f.advance(30_000);assert.equal((await r.tick('Z')).kind,'meal');
  f.advance(30_000);assert.equal((await r.tick('Z')).kind,'water');
});
test('focus stays finished without overdue popup, and unavailable storage cannot start timers',async()=>{
  const f=fixture(),r=f.repo();r.update({water:false,meals:false,dnd:false});await r.focus('start',25);f.advance(40*60_000);
  assert.equal(await r.tick('Z'),null);assert.equal(r.activity().focus.status,'finished');
  assert.equal(await createRepository(f.storage,null).focus('start',25),null);
  const bad=createRepository({getItem(){return null;},setItem(){throw Error();}},f.locks);assert.equal(await bad.focus('start',25),null);
});
test('self-chosen images accept raster data only; SVG and external URLs rejected',()=>{
  assert.equal(!!validImages({clear:'https://example.com/a.png',patina:'data:image/png;base64,AAAA'}),false);
  assert.equal(!!validImages({clear:'data:image/svg+xml;base64,AAAA',patina:'data:image/png;base64,AAAA'}),false);
  assert.equal(!!validImages({clear:'data:image/png;base64,AAAA',patina:'data:image/png;base64,AAAA'}),true);
});
