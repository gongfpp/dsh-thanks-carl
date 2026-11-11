import test from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../src/controller.mjs';
function environment() {
  const values=new Map(), events=new EventTarget(), document=new EventTarget();document.visibilityState='visible';
  let tail=Promise.resolve(), requests=0;
  const locks={request:(_,fn)=>{const pending=tail.then(fn);tail=pending.catch(()=>{});return pending;}};
  return {localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},navigator:{locks},document,addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events),fetch:async()=>{requests++;return {ok:true,json:async()=>({seq:0,events:[]})};},get requests(){return requests;}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('pet short lines replace each other, become shy and respect cooldown without network',async t=>{
  t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:new Date('2026-11-10T10:00:00').getTime()});
  const env=environment(),c=createController(env);t.after(()=>c.dispose());await settle();
  c.pet();const first=c.getSnapshot().event.text;c.pet();assert.notEqual(c.getSnapshot().event.text,first);
  c.pet();c.pet();assert.equal(c.getSnapshot().motion,'shy');const shy=c.getSnapshot().event;c.pet();assert.equal(c.getSnapshot().event,shy);
  t.mock.timers.tick(3000);c.pet();assert.equal(c.getSnapshot().motion,'nod');assert.notEqual(c.getSnapshot().event.text,shy.text);assert.equal(env.requests,0);
});
test('shared focus finishes through scheduler; dispose stops clock and callbacks',async t=>{
  t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:new Date('2026-11-10T10:00:00').getTime()});
  const env=environment(),c=createController(env);t.after(()=>c.dispose());await settle();await c.update({water:false,meals:false,dnd:false});
  assert.equal(await c.focus('start',25),true);assert.equal(c.getSnapshot().focus.status,'running');
  t.mock.timers.tick(25*60_000+5000);await settle();assert.equal(c.getSnapshot().focus.status,'finished');assert.equal(c.getSnapshot().event.kind,'focus');
  let callbacks=0;c.subscribe(()=>callbacks++);c.dispose();t.mock.timers.tick(60_000);await settle();assert.equal(callbacks,0);
});
test('remote scheduler writes do not erase manual pet responses during quiet time',async t=>{
  const env=environment(),c=createController(env);t.after(()=>c.dispose());await settle();await c.setQuiet('hour');c.pet();const event=c.getSnapshot().event;
  const storageEvent=new Event('storage');storageEvent.key='thanks-carl.ledger.v1';env.dispatchEvent(storageEvent);assert.equal(c.getSnapshot().event,event);assert.equal(event.kind,'pet');
});
test('water acknowledgment reports success only after saving and exposes confirmation',async t=>{
  const env=environment(),c=createController(env);t.after(()=>c.dispose());await settle();
  assert.equal(await c.drankWater(),true);const event=c.getSnapshot().event;
  assert.equal(event.acknowledgment,true);assert.match(event.text,/喝水收到/);
  assert.ok(JSON.parse(env.localStorage.getItem('thanks-carl.ledger.v1')).schedule.anchors.water>0);
  c.dismiss();env.localStorage.setItem=()=>{throw Error('blocked');};
  assert.equal(await c.drankWater(),false);assert.equal(c.getSnapshot().event,null);assert.match(c.getSnapshot().error,/操作未保存/);
});
test('closing a bubble, returning home and summoning are distinct and preserve focus/quiet',async t=>{
  const env=environment(),c=createController(env);t.after(()=>c.dispose());await settle();
  await c.focus('start',25);await c.setQuiet('hour');const {focus,quietUntil}=c.getSnapshot();
  c.pet();c.closeBubble();assert.equal(c.getSnapshot().event,null);assert.equal(c.getSnapshot().hidden,false);
  c.dismiss();assert.equal(c.getSnapshot().hidden,true);assert.deepEqual(c.getSnapshot().focus,focus);assert.equal(c.getSnapshot().quietUntil,quietUntil);
  c.summon();assert.equal(c.getSnapshot().hidden,false);assert.equal(c.getSnapshot().event,null);assert.deepEqual(c.getSnapshot().focus,focus);assert.equal(c.getSnapshot().quietUntil,quietUntil);
});
test('blocked local storage produces visible action error instead of pretending to start',async t=>{
  const env=environment();env.localStorage.setItem=()=>{throw Error('blocked');};const c=createController(env);t.after(()=>c.dispose());await settle();
  assert.equal(c.getSnapshot().automatic,false);assert.equal(await c.focus('start',25),false);assert.equal(c.getSnapshot().focus,null);assert.match(c.getSnapshot().error,/操作未保存/);
});
test('manual actions are validated, local and protected against stale finish callbacks',async t=>{
  const env=environment(),c=createController(env);t.after(()=>c.dispose());await settle();
  assert.equal(c.playAction('roll'),true);const first=c.getSnapshot().pose;assert.equal(first.name,'roll');assert.equal(first.manual,true);
  assert.equal(c.playAction('belly_up'),true);const next=c.getSnapshot().pose;c.finishAction(first.id);assert.equal(c.getSnapshot().pose,next);c.finishAction(next.id);assert.equal(c.getSnapshot().pose,null);
  assert.equal(c.playAction('unknown'),false);assert.equal(env.requests,0);
  c.pet();assert.equal(c.getSnapshot().pose.name,'petted');c.dismiss();assert.equal(c.getSnapshot().pose,null);
  await c.update({animations:false});assert.equal(c.playAction('wave'),false);c.pet();assert.equal(c.getSnapshot().pose,null);
});
test('custom photos are never replaced by AI actions and quiet changes remain explicit',async t=>{
  const env=environment(),c=createController(env);t.after(()=>c.dispose());await settle();
  await c.setQuiet('hour');assert.equal(c.getSnapshot().pose.name,'sleepy');assert.equal(c.getSnapshot().pose.manual,true);
  await c.setQuiet('off');assert.equal(c.getSnapshot().pose.name,'wave');
  await c.saveImages({clear:'data:image/png;base64,AAAA',patina:'data:image/png;base64,AAAA'});assert.equal(c.getSnapshot().pose,null);assert.equal(c.playAction('wave'),false);
  c.clearImages();assert.equal(c.playAction('wave'),true);await c.focus('start',25);assert.equal(c.getSnapshot().pose,null);
});
