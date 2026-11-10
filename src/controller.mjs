import { completionText, reminderText, selectEvent } from './core.mjs';
import { createRepository } from './storage.mjs';
import { petReaction } from './companion.mjs';
export function createController(env = window) {
  const repo = createRepository(env.localStorage,env.navigator.locks);
  const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
  let view = {config:repo.config(), images:repo.images(), event:null, automatic:repo.automatic, error:'', hidden:false, ...repo.activity(), now:Date.now(), motion:''};
  const listeners = new Set();
  let stopped = false, busy = false, sessionId, generation = 0, cursor = null, expiry = null, motionTimer=null;
  let lastPat=0, pats=0, lastLine=-1, shyUntil=0;
  const emit = patch => { if (stopped) return; view = {...view,...patch}; for (const f of listeners) f(); };
  function show(event) {
    if (!view.config.enabled) return;
    const chosen = event.kind === 'pet' && view.event?.kind === 'pet' ? event : selectEvent(view.event,event,Date.now());
    if (chosen === view.event) return;
    clearTimeout(expiry);
    emit({event:chosen,hidden:false});
    expiry = setTimeout(() => emit({event:null}), Math.max(0,Math.min(chosen.expires-Date.now(),chosen.priority === 3 ? 60_000 : 18_000)));
    if (view.config.sound) beep();
  }
  function beep() {
    try {
      const Audio = env.AudioContext || env.webkitAudioContext;
      if (!Audio) return;
      const audio = new Audio(), oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.frequency.value = 570; gain.gain.value = 0.025;
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime+0.09);
      oscillator.onended = () => audio.close();
      void audio.resume().catch(() => audio.close());
    } catch { /* browser may require a gesture; silent degradation */ }
  }
  async function tick() {
    if (busy || stopped || env.document.visibilityState !== 'visible') return;
    busy = true;
    const expected = generation;
    try {
      const reminder = await repo.tick(zone());
      if (stopped) return;
      emit({...repo.activity(),now:Date.now(),automatic:repo.automatic});
      if (env.document.visibilityState === 'visible' && reminder) show({...reminder,text:reminder.text ?? reminderText(reminder.kind)});
      if (!sessionId) return;
      const id = sessionId;
      const query = new URLSearchParams({sessionId:id,since:String(cursor ?? 0)});
      const response = await env.fetch(`api/thanks-carl/status?${query}`, {cache:'no-store',signal:AbortSignal.timeout(4500)});
      if (!response.ok) throw new Error(`Host 状态暂不可用 (${response.status})`);
      const data = await response.json();
      if (stopped || generation !== expected || sessionId !== id) return;
      if (!Number.isSafeInteger(data.seq) || !Array.isArray(data.events)) throw new Error('Host 状态格式无效');
      emit({error:'',automatic:repo.automatic});
      const baseline = cursor === null || data.seq < cursor;
      cursor = data.seq;
      if (baseline || env.document.visibilityState !== 'visible') return;
      // Only newest eligible completion; never queue a celebration backlog.
      for (const event of data.events.slice().reverse()) {
        if (event.sessionId !== id || typeof event.id !== 'string') continue;
        if (await repo.claimCompletion(event)) {
          if (!stopped && generation === expected && env.document.visibilityState === 'visible') show({...event,kind:'completion',priority:2,text:completionText(event.kind),expires:event.time+120_000});
          break;
        }
      }
    } catch (e) { emit({error:e.message,automatic:repo.automatic}); }
    finally { busy = false; }
  }
  const reload = event => {
    if (!event || [null,'thanks-carl.config.v1','thanks-carl.images.v1'].includes(event.key)) emit({config:repo.config(),images:repo.images(),event:null});
    if (!event || event.key === null || event.key === 'thanks-carl.ledger.v1') {
      const activity=repo.activity();
      const suppress=activity.quietUntil > Date.now() || activity.focus?.status === 'running';
      const automaticEvent=view.event && !view.event.preview && view.event.kind !== 'pet';
      emit({...activity,now:Date.now(),...(suppress && automaticEvent ? {event:null} : {})});
    }
  };
  env.addEventListener('storage',reload);
  env.document.addEventListener('visibilitychange',tick);
  const timer = setInterval(tick,5000);
  const clockTimer=setInterval(() => { if (!stopped && env.document.visibilityState === 'visible' && (view.focus?.status === 'running' || view.quietUntil > view.now)) emit({now:Date.now()}); },1000);
  async function activityAction(action) {
    try {
      if (!await action()) throw Error('浏览器需要可用的本地存储与 Web Locks。');
      emit({...repo.activity(),now:Date.now(),hidden:false,error:''});
      return true;
    } catch { emit({error:'操作未保存。请确认页面使用 HTTPS 或 localhost，且允许本地存储。'}); return false; }
  }
  queueMicrotask(tick);
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }, getSnapshot:() => view,
    select(id) { if (sessionId === id) return; sessionId = id; cursor = null; generation++; // Previews and local reminders are global to this tab; only discard a completion belonging to the previous session.
      emit({event:view.event?.kind === 'completion' ? null : view.event}); void tick(); },
    async update(patch) {
      try {
        const config = repo.update(patch); emit({config,hidden:false,event:config.enabled ? view.event : null,error:''});
        if (['water','waterMinutes','rest','restMinutes','meals','mealTimes','enabled'].some(k => Object.hasOwn(patch,k))) await repo.resetTimers(zone());
      } catch { emit({error:'本地存储不可用或已满，设置未保存。'}); }
    },
    async saveImages(images) { try { repo.saveImages(images); emit({images,error:''}); } catch { emit({error:'图片无法保存，本地存储可能已满。'}); } },
    clearImages() { repo.clearImages(); emit({images:null}); },
    preview(kind='visit') { const t = Date.now(); emit({event:null}); show({id:`preview:${t}`,kind,priority:kind === 'visit' ? 1 : 3,time:t,expires:t+60_000,text:kind === 'completion' ? completionText('completed') : kind === 'visit' ? '这是卡尔。它来陪你一小会儿。' : reminderText(kind),preview:true}); },
    pet() {
      const now=Date.now(); if (now < shyUntil) return;
      pats=now-lastPat < 1800 ? pats+1 : 1; lastPat=now;
      const reaction=petReaction(pats,lastLine); lastLine=reaction.index;
      if (reaction.motion === 'shy') { shyUntil=now+2500; pats=0; }
      clearTimeout(motionTimer); emit({motion:''});
      show({id:`pet:${now}`,kind:'pet',priority:1,time:now,expires:now+6000,text:reaction.text});
      emit({motion:reaction.motion}); motionTimer=setTimeout(() => emit({motion:''}),reaction.motion === 'shy' ? 2000 : 600);
    },
    focus(action,minutes) { return activityAction(async() => {
      const ok=await repo.focus(action,minutes);
      if (ok && (action === 'start' || action === 'end')) {clearTimeout(expiry);emit({event:null});}
      return ok;
    }); },
    async setQuiet(kind) {
      if (await activityAction(() => repo.setQuiet(kind))) { clearTimeout(expiry); emit({event:null}); }
    },
    async drankWater() {
      if (await activityAction(() => repo.drankWater(zone()))) {
        clearTimeout(expiry); emit({event:null});
        const now=Date.now();show({id:`water-ack:${now}`,kind:'pet',priority:1,time:now,expires:now+5000,text:'喝水收到。下一次从现在开始算。',acknowledgment:true});
        return true;
      }
      return false;
    },
    summon() { emit({hidden:false}); },
    closeBubble() { clearTimeout(expiry); emit({event:null}); },
    dismiss() { clearTimeout(expiry); emit({event:null,hidden:true}); },
    async snooze() { const event = view.event; if (event && ['water','meal','rest'].includes(event.kind)) await repo.snooze(event,zone()); clearTimeout(expiry); emit({event:null,hidden:true}); },
    dispose() { stopped = true; generation++; clearTimeout(expiry); clearTimeout(motionTimer); clearInterval(timer); clearInterval(clockTimer); env.removeEventListener('storage',reload); env.document.removeEventListener('visibilitychange',tick); listeners.clear(); },
  };
}
