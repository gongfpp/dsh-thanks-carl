import test from 'node:test';
import assert from 'node:assert/strict';
import { canWander, dragPosition, wanderTarget, startWander } from '../src/motion.mjs';
import { normalize } from '../src/core.mjs';

test('activity is opt-in, normalized and independent of appearance mode',()=>{
  assert.equal(normalize().activity,'still');assert.equal(normalize({activity:'bad'}).activity,'still');
  assert.equal(normalize({activity:'wander',mode:'easter'}).activity,'wander');
});
test('wandering stops for every interaction, attention, accessibility and lifecycle gate',()=>{
  const s={enabled:true,activity:'wander',visible:true,menu:false,focus:null,sleeping:false,reduced:false,background:false,dragging:false,interacting:false,event:null};
  assert.equal(canWander(s),true);
  for (const [key,value] of Object.entries({enabled:false,activity:'still',visible:false,menu:true,focus:{status:'paused'},sleeping:true,reduced:true,background:true,dragging:true,interacting:true,event:{kind:'pet'}})) assert.equal(canWander({...s,[key]:value}),false,key);
});
test('drag follows pointer delta without teleporting to an edge; viewport is bounded',()=>{
  const start={left:300,top:200,x:350,y:250};
  assert.deepEqual(dragPosition(start,{x:370,y:280},{width:1440,height:960},100),{left:320,top:230});
  assert.deepEqual(dragPosition(start,{x:-999,y:9999},{width:390,height:600},100),{left:8,top:492});
});
test('wander stays within 48px of its anchor, turns at edges and fits short screens',()=>{
  for(let offset=-48;offset<=48;offset+=4) for(const anchor of [8,100,400,852]) {
    const n=wanderTarget(offset,anchor,100,960,()=>.9);assert.ok(n>=-48&&n<=48);assert.ok(anchor+n>=8&&anchor+n+100<=952);
  }
  assert.ok(wanderTarget(48,400,100,960,()=>.9)<48);
  assert.equal(wanderTarget(0,8,100,80),0);
});
test('wander scheduler eases a real step, cancellation freezes its last pixel and leaves no timers',()=>{
  let timer, frame, time=0, offset=0, writes=0;
  const stop=startWander({read:()=>({offset,anchor:400,height:100,viewport:960}),write:v=>{offset=v;writes++;},random:()=>.75,now:()=>time,request:f=>{frame=f;return 7;},cancel:()=>{frame=null;},setTimer:(f,delay)=>{assert.ok(delay>=20_000);timer=f;return 8;},clearTimer:()=>{timer=null;}});
  timer();time=900;frame();assert.ok(offset>0&&offset<48);const paused=offset;assert.equal(writes,1);
  stop();assert.equal(timer,null);assert.equal(frame,null);assert.equal(offset,paused);
});
