import { completionText, reminderText, selectEvent } from './core.mjs';
import { createRepository } from './storage.mjs';
export function createController(env = window) {
  const repo = createRepository(env.localStorage,env.navigator.locks);
  const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
  let view = {config:repo.config(), images:repo.images(), event:null, automatic:repo.automatic, error:'', hidden:false};
  const listeners = new Set();
  let stopped = false, busy = false, sessionId, generation = 0, cursor = null, expiry = null;
  const emit = patch => { if (stopped) return; view = {...view,...patch}; for (const f of listeners) f(); };
  function show(event) {
    if (!view.config.enabled) return;
    const chosen = selectEvent(view.event,event,Date.now());
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
      if (env.document.visibilityState === 'visible' && reminder) show({...reminder,text:reminderText(reminder.kind)});
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
  };
  env.addEventListener('storage',reload);
  env.document.addEventListener('visibilitychange',tick);
  const timer = setInterval(tick,5000);
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
    dismiss() { clearTimeout(expiry); emit({event:null,hidden:true}); },
    async snooze() { const event = view.event; if (event && ['water','meal','rest'].includes(event.kind)) await repo.snooze(event,zone()); clearTimeout(expiry); emit({event:null,hidden:true}); },
    dispose() { stopped = true; generation++; clearTimeout(expiry); clearInterval(timer); env.removeEventListener('storage',reload); env.document.removeEventListener('visibilitychange',tick); listeners.clear(); },
  };
}
