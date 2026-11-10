import test from 'node:test';
import assert from 'node:assert/strict';
import { readFocus, focusRemaining, changeFocus, finishFocus, quietDeadline, petReaction } from '../src/companion.mjs';
const M=60_000, now=new Date('2026-11-10T22:00:00').getTime();
test('focus starts only at 25 or 45 minutes; starting twice never resets a live focus',()=>{
  const f=changeFocus(null,'start',now,45);assert.equal(f.deadline,now+45*M);
  assert.deepEqual(changeFocus(f,'start',now+M,25),f);
  assert.equal(changeFocus(null,'start',now,123).minutes,25);
  assert.equal(focusRemaining(f,now-10*M),45*M);
});
test('pause, resume, finish and end retain remaining time without background drift',()=>{
  const f=changeFocus(null,'start',now,25), paused=changeFocus(f,'pause',now+5*M);
  assert.equal(paused.remaining,20*M);assert.equal(focusRemaining(paused,now+10*M),20*M);
  const resumed=changeFocus(paused,'resume',now+10*M);assert.equal(resumed.deadline,now+30*M);
  assert.equal(finishFocus(resumed,now+29*M).event,null);
  const done=finishFocus(resumed,now+30*M);assert.equal(done.event.kind,'focus');assert.equal(done.focus.status,'finished');
  assert.equal(finishFocus(done.focus,now+30*M+1).event,null);
  assert.equal(changeFocus(done.focus,'end',now),null);
  assert.equal(changeFocus(f,'pause',now+25*M).status,'finished');
});
test('returning long after a focus ends retains finished state but never replays celebration',()=>{
  const f=changeFocus(null,'start',now);const done=finishFocus(f,now+40*M);
  assert.equal(done.focus.status,'finished');assert.equal(done.event,null);
});
test('corrupt focus state is ignored',()=>{
  for (const f of [null,{},[],{status:'running',minutes:25,deadline:'bad'},{status:'running',minutes:99,deadline:now},{status:'paused',minutes:25,remaining:0},{status:'paused',minutes:25,remaining:26*M},{status:'finished',minutes:45}]) assert.equal(readFocus(f),null);
});
test('quiet shortcuts expire after one hour or next local midnight, off clears them',()=>{
  assert.equal(quietDeadline('hour',now),now+60*M);assert.equal(quietDeadline('off',now),0);
  const midnight=new Date(quietDeadline('today',now));assert.equal(midnight.getHours(),0);assert.equal(midnight.getDate(),11);
});
test('pet responses avoid immediate repeats; four fast pats become shy',()=>{
  const first=petReaction(1,-1,()=>0), second=petReaction(2,first.index,()=>0);
  assert.notEqual(first.text,second.text);assert.equal(first.motion,'nod');assert.equal(petReaction(4).motion,'shy');
});
