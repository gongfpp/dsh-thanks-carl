import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import {ACTIONS,validAction,eventAction,spriteState,startFrames} from '../src/actions.mjs';
import {normalize} from '../src/core.mjs';
test('all twelve approved actions are local transparent 16-frame sprites with bounded size',async()=>{
  assert.equal(ACTIONS.length,12);assert.equal(new Set(ACTIONS.map(a=>a.id)).size,12);let bytes=0;
  for(const action of ACTIONS){const buffer=await readFile(`assets/actions/${action.file}.webp`),meta=await sharp(buffer).metadata();assert.equal(meta.width,192*16);assert.equal(meta.height,144);assert.ok(meta.hasAlpha);assert.ok(buffer.length<300_000);bytes+=buffer.length;}
  assert.ok(bytes<2_000_000);assert.equal(validAction('__proto__'),false);assert.equal(validAction('../roll'),false);
  assert.equal(normalize().animations,true);assert.equal(normalize({animations:false}).animations,false);assert.equal(normalize({animations:'false'}).animations,true);
});
test('only real eligible completion/focus events celebrate; ordinary reminders wave',()=>{
  assert.equal(eventAction({kind:'completion'}),'celebrate');assert.equal(eventAction({kind:'focus'}),'celebrate');
  assert.equal(eventAction({kind:'pet'},'shy'),'shy');assert.equal(eventAction({kind:'pet'}),'petted');
  assert.equal(eventAction({kind:'pet',acknowledgment:true}),'wave');assert.equal(eventAction({kind:'water'}),'wave');
  assert.equal(eventAction({kind:'error'}),null);assert.equal(eventAction(null),null);
});
test('custom photos, reduced motion and hidden pets never animate; other gates pause',()=>{
  const base={enabled:true,visible:true};assert.equal(spriteState(base).name,'idle');assert.equal(spriteState({...base,walking:true}).name,'walk');
  for(const [key,value] of [['enabled',false],['custom',true],['reduced',true],['visible',false]])assert.equal(spriteState({...base,[key]:value}),null);
  for(const key of ['background','menu','dragging','focus','interacting'])assert.equal(spriteState({...base,[key]:true}).paused,true,key);
  assert.equal(spriteState({...base,sleeping:true}).still,8);
  const pose={name:'roll',id:9,manual:true};assert.equal(spriteState({...base,pose,sleeping:true,focus:true}).paused,false);
  assert.equal(spriteState({...base,pose,menu:true}).paused,true);assert.equal(spriteState({...base,pose:{...pose,manual:false},focus:true}).paused,true);
});
test('one-shot frames return to their starting pose, complete once and dispose safely',t=>{
  t.mock.timers.enable({apis:['Date','setTimeout'],now:1000});const frames=[];let done=0;
  const p=startFrames({count:4,render:n=>frames.push(n),done:()=>done++,now:Date.now});p.pause(false);
  for(let n=0;n<7;n++)t.mock.timers.tick(150);
  assert.deepEqual(frames,[0,1,2,3,2,1,0]);assert.equal(done,1);t.mock.timers.tick(10000);assert.equal(done,1);p.dispose();
});
test('pause freezes the frame and preserves its remaining duration, with no catch-up',t=>{
  t.mock.timers.enable({apis:['Date','setTimeout'],now:1000});const frames=[];
  const p=startFrames({count:4,loop:true,render:n=>frames.push(n),now:Date.now});p.pause(false);t.mock.timers.tick(75);p.pause(true);t.mock.timers.tick(10000);assert.deepEqual(frames,[0]);p.pause(false);t.mock.timers.tick(74);assert.deepEqual(frames,[0]);t.mock.timers.tick(1);assert.deepEqual(frames,[0,1]);p.dispose();t.mock.timers.tick(10000);assert.deepEqual(frames,[0,1]);
});
