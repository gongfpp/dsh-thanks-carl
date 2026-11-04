import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, normalize, thanksText, quiet, CompletionTracker, tickSchedule, newSchedule, deferReminder, selectEvent, completionText, MINUTE } from '../src/core.mjs';
const time = (day='2026-11-01',hm='10:00') => new Date(`${day}T${hm}:00`).getTime();
const config = patch => normalize({dnd:false,...patch});
function harness() {
  const seen=[], tracker=new CompletionTracker(e=>seen.push(e),()=>1234);
  const session={id:'s1'}, agent={session};
  const event=(type,turn=1,kind='completed') => tracker.event(session,{type,data:{turn,reason:{kind}}});
  return {seen,tracker,session,agent,event};
}
test('defaults are quiet and normalize rejects malformed settings',()=>{
  assert.equal(DEFAULTS.probability,.15); assert.equal(DEFAULTS.sound,false); assert.equal(DEFAULTS.mode,'easter');
  const c=normalize({size:300,waterMinutes:-1,enabled:'yes',mealTimes:['25:00','12:00','12:00','18:30',123]});
  assert.equal(c.size,128);assert.equal(c.waterMinutes,1);assert.equal(c.enabled,true);assert.deepEqual(c.mealTimes,['12:00','18:30']);
  for(const raw of [null,[],true,'bad'])assert.equal(normalize(raw).size,100);
});
test('the thank-you button only ever says thanks to Carl',()=>{
  assert.equal(thanksText('water'),'谢谢谢谢卡尔');
  assert.equal(thanksText('meal'),'谢谢卡尔');assert.equal(thanksText('rest'),'谢谢卡尔');
  assert.equal(thanksText('completion'),'谢谢卡尔');assert.equal(thanksText(undefined),'谢谢卡尔');
});
test('one completed turn needs real running/start/end/idle and fires once',()=>{
  const {tracker,agent,event,seen}=harness();tracker.status(agent,'running');event('turn/start');event('turn/end');assert.equal(seen.length,0);
  tracker.status(agent,'idle');tracker.status(agent,'idle');assert.equal(seen.length,1);assert.equal(seen[0].id,'s1:1');assert.equal(seen[0].kind,'completed');
});
for(const kind of ['error','aborted','blocked','max-tokens','interrupted'])test(`${kind} is not congratulated`,()=>{
  const {tracker,agent,event,seen}=harness();tracker.status(agent,'running');event('turn/start');event('turn/end',1,kind);tracker.status(agent,'idle');assert.equal(seen.length,0);
});
test('waiting for user and missing boundaries do not count as completion',()=>{
  const {tracker,agent,event,seen}=harness();tracker.status(agent,'idle');event('turn/end');tracker.status(agent,'running');event('turn/start');assert.equal(seen.length,0);tracker.status(agent,'idle');assert.equal(seen.length,0);
});
test('unknown reason uses neutral round-ended copy',()=>{
  const {tracker,agent,event,seen}=harness();tracker.status(agent,'running');event('turn/start');event('turn/end',1,'future-extension');tracker.status(agent,'idle');assert.equal(seen.length,1);assert.match(completionText(seen[0].kind),/本轮结束了/);assert.doesNotMatch(completionText('completed'),/测试通过/);
});
test('two sessions, multiple turns, and late disposed agents stay separate',()=>{
  const {tracker,agent,event,seen}=harness();const session2={id:'s2'},agent2={session:session2};
  tracker.status(agent,'running');tracker.status(agent2,'running');event('turn/start');event('turn/end');event('turn/start',2);event('turn/end',2);
  tracker.event(session2,{type:'turn/start',data:{turn:1}});tracker.event(session2,{type:'turn/end',data:{turn:1,reason:{kind:'completed'}}});
  tracker.status(agent,'idle');tracker.status(agent2,'idle');assert.deepEqual(seen.map(e=>e.id),['s1:1','s1:2','s2:1']);
  tracker.status(agent,'running');tracker.dispose(agent);event('turn/start',3);event('turn/end',3);tracker.status(agent,'idle');assert.equal(seen.length,3);
});
test('replaced agent cannot close another exact live session',()=>{
  const {tracker,agent,event,seen}=harness();tracker.status(agent,'running');event('turn/start');event('turn/end');const replacement={session:{id:'s1'}};tracker.status(replacement,'idle');assert.equal(seen.length,0);tracker.status(agent,'idle');assert.equal(seen.length,1);
});
test('DND midnight boundary and daytime interval',()=>{
  const c=normalize();assert.equal(quiet(c,time('2026-11-01','00:00')),true);assert.equal(quiet(c,time('2026-11-01','07:59')),true);assert.equal(quiet(c,time('2026-11-01','08:00')),false);
  const x=config({dnd:true,dndStart:'23:00',dndEnd:'07:00'});assert.equal(quiet(x,time('2026-11-01','23:30')),true);assert.equal(quiet(x,time('2026-11-02','06:30')),true);
  const y=config({dnd:true,dndStart:'12:00',dndEnd:'13:00'});assert.equal(quiet(y,time('2026-11-01','12:30')),true);assert.equal(quiet(y,time('2026-11-01','13:00')),false);
});
test('water arrives at deadline once, interval advances without drift catch-up',()=>{
  const t=time(),c=config({waterMinutes:1,meals:false}),s=newSchedule(t,'Asia/Shanghai');
  assert.equal(tickSchedule(s,c,t+MINUTE-1,'Asia/Shanghai').event,null);
  assert.equal(tickSchedule(s,c,t+MINUTE,'Asia/Shanghai').event.kind,'water');
  assert.equal(tickSchedule(s,c,t+MINUTE+1,'Asia/Shanghai').event,null);
});
test('sleep and hidden-tab long gaps do not burst interval notifications',()=>{
  const t=time(),c=config({waterMinutes:60,rest:true,restMinutes:60,meals:false}),s=newSchedule(t,'Z');
  assert.equal(tickSchedule(s,c,t+5*60*MINUTE,'Z').event,null);
  assert.equal(tickSchedule(s,c,t+5*60*MINUTE+1,'Z').event,null);
  assert.equal(s.anchors.water,t+5*60*MINUTE);
});
test('meals use stable local date/time ID, expired meals consumed, midnight is separate',()=>{
  const t=time('2026-11-01','11:59'),c=config({water:false}),s=newSchedule(t,'Asia/Shanghai');
  const result=tickSchedule(s,c,t+MINUTE,'Asia/Shanghai');assert.equal(result.event.kind,'meal');assert.match(result.event.id,/2026-11-01:12:00/);
  assert.equal(tickSchedule(s,c,t+2*MINUTE,'Asia/Shanghai').event,null);
  assert.equal(tickSchedule(s,c,time('2026-11-01','19:00'),'Asia/Shanghai').event,null);
  assert.equal(tickSchedule(s,c,time('2026-11-02','12:00'),'Asia/Shanghai').event.kind,'meal');
});
test('DND consumes due meals and does not replay after quiet period',()=>{
  const t=time('2026-11-01','07:59'),c=normalize({water:false,mealTimes:['08:00'],dndEnd:'08:01'}),s=newSchedule(t,'Z');
  assert.equal(tickSchedule(s,c,t+MINUTE,'Z').event,null);assert.equal(tickSchedule(s,c,t+2*MINUTE,'Z').event,null);
});
test('coincident meal/water/rest produces only highest priority reminder',()=>{
  const t=time('2026-11-01','11:59'),c=config({waterMinutes:1,rest:true,restMinutes:1}),s=newSchedule(t,'Z');
  assert.equal(tickSchedule(s,c,t+MINUTE,'Z').event.kind,'meal');assert.equal(tickSchedule(s,c,t+MINUTE+1000,'Z').event,null);
});
test('clock rollback, timezone change and multi-day sleep reset safely',()=>{
  for(const [offset,zone] of [[-MINUTE,'Z'],[MINUTE,'new-zone'],[2*24*60*MINUTE,'Z']]){
    const t=time(),s=newSchedule(t,'Z'),r=tickSchedule(s,config(),t+offset,zone);assert.equal(r.event,null);assert.equal(r.state.last,t+offset);
  }
});
test('snooze is one stable delayed item and expires after wake',()=>{
  const t=time(),c=config({water:false,meals:true}),s=newSchedule(t,'Z');
  deferReminder(s,{id:'meal:1',kind:'meal'},t);assert.equal(tickSchedule(s,c,t+9*MINUTE,'Z').event,null);
  assert.equal(tickSchedule(s,c,t+10*MINUTE,'Z').event.id,'meal:1:snooze');assert.equal(s.snooze,null);
  deferReminder(s,{id:'meal:1',kind:'meal'},t);assert.equal(tickSchedule(s,c,t+16*MINUTE,'Z').event,null);
});
test('disabled reminders drop snoozes and disabled master shows nothing',()=>{
  const t=time(),s=newSchedule(t,'Z');deferReminder(s,{id:'w',kind:'water'},t);
  assert.equal(tickSchedule(s,config({water:false}),t+10*MINUTE,'Z').event,null);assert.equal(s.snooze,null);
  assert.equal(tickSchedule(newSchedule(t,'Z'),config({enabled:false,waterMinutes:1}),t+MINUTE,'Z').event,null);
});
test('clock rollback does not repeat the same wall-clock meal',()=>{
  const t=time('2026-11-01','11:59'),c=config({water:false}),s=newSchedule(t,'Z');
  assert.equal(tickSchedule(s,c,t+MINUTE,'Z').event.kind,'meal');
  const rebound=tickSchedule(s,c,t,'Z').state;
  assert.equal(tickSchedule(rebound,c,t+MINUTE,'Z').event,null);
});
test('structurally corrupt schedule fails safely to a fresh baseline',()=>{
  for(const s of [{last:123},[],true,'x',{last:123,anchors:null,consumed:{}}])assert.equal(tickSchedule(s,config(),time(),'Z').event,null);
});
test('event arbitration never displays multiple or demotes reminder',()=>{
  const t=time(),completion={priority:2,expires:t+1000},reminder={priority:3,expires:t+1000};
  assert.equal(selectEvent(completion,reminder,t),reminder);assert.equal(selectEvent(reminder,completion,t),reminder);assert.equal(selectEvent(null,{priority:3,expires:t-1},t),null);
});
