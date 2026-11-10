import { normalize, newSchedule, tickSchedule, quiet, deferReminder } from './core.mjs';
import { readFocus, changeFocus, finishFocus, quietDeadline } from './companion.mjs';
export const CONFIG_KEY = 'thanks-carl.config.v1';
export const LEDGER_KEY = 'thanks-carl.ledger.v1';
export const IMAGE_KEY = 'thanks-carl.images.v1';
export const LOCK = 'thanks-carl.scheduler.v1';
export function parse(value, fallback) { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } }
export function createRepository(storage, locks, now = Date.now) {
  let available = true;
  try { storage.setItem('thanks-carl.probe','1'); storage.removeItem('thanks-carl.probe'); } catch { available = false; }
  const read = (key,fallback) => { try { return parse(storage.getItem(key),fallback); } catch { return fallback; } };
  const save = (key,data) => { storage.setItem(key,JSON.stringify(data)); };
  const config = () => normalize(read(CONFIG_KEY,{}));
  const atomic = async fn => {
    // No optimistic localStorage spin-lock: it cannot guarantee exclusion.
    if (!available || !locks?.request) return null;
    return locks.request(LOCK, () => {
      const raw = read(LEDGER_KEY,{});
      const ledger = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      if (!ledger.seen || typeof ledger.seen !== 'object' || Array.isArray(ledger.seen)) ledger.seen = {};
      const t = now();
      for (const [id,time] of Object.entries(ledger.seen)) if (t-time > 7*24*60*60_000) delete ledger.seen[id];
      const result = fn(ledger,t);
      try { save(LEDGER_KEY,ledger); } catch { available = false; return null; }
      return result;
    });
  };
  return {
    get automatic() { return available && !!locks?.request; }, config,
    update(patch) { const c = normalize({...config(),...patch}); save(CONFIG_KEY,c); return c; },
    images:() => read(IMAGE_KEY,null),
    saveImages(images) { save(IMAGE_KEY,images); },
    clearImages() { storage.removeItem(IMAGE_KEY); },
    claimCompletion(event) { return atomic((l,t) => {
      const c = config(), key = `completion:${event.id}`;
      if (l.seen[key]) return false;
      l.seen[key] = t; // consume even when random/cooldown/DND reject
      if (!c.enabled || !c.completion || quiet(c,t) || l.quietUntil > t || (readFocus(l.focus)?.status === 'running' && l.focus.deadline > t) || t-event.time > 120_000 || event.time > t+5_000) return false;
      if (!c.always && ((l.lastCompletion && t-l.lastCompletion < c.cooldown*60_000) || Math.random() >= c.probability)) return false;
      l.lastCompletion = t;
      return true;
    }); },
    activity() {
      const l=read(LEDGER_KEY,{});
      return {focus:readFocus(l?.focus),quietUntil:Number.isFinite(l?.quietUntil) ? l.quietUntil : 0};
    },
    focus(action,minutes) { return atomic((l,t) => { l.focus=changeFocus(l.focus,action,t,minutes); return true; }); },
    setQuiet(kind) { return atomic((l,t) => { l.quietUntil=quietDeadline(kind,t); return true; }); },
    drankWater(zone) { return atomic((l,t) => {
      if (!l.schedule || l.schedule.zone !== zone || !l.schedule.anchors || typeof l.schedule.anchors !== 'object' || !l.schedule.consumed || typeof l.schedule.consumed !== 'object' || !Number.isFinite(l.schedule.last)) l.schedule=newSchedule(t,zone);
      l.schedule.anchors.water=t;
      if (l.schedule.snooze?.kind === 'water') l.schedule.snooze=null;
      return true;
    }); },
    tick(zone) { return atomic((l,t) => {
      const c=config(), result = tickSchedule(l.schedule,c,t,zone), done=finishFocus(l.focus,t);
      l.schedule = result.state; l.focus=done.focus;
      if (!c.enabled || quiet(c,t) || l.quietUntil > t) return null;
      // 专注时仍消费提醒，结束后不集中补弹。
      return done.event ?? (done.focus?.status === 'running' ? null : result.event);
    }); },
    resetTimers(zone) { return atomic((l,t) => { const consumed = l.schedule?.consumed; l.schedule = newSchedule(t,zone); if (consumed && typeof consumed === 'object') l.schedule.consumed = consumed; }); },
    snooze(event,zone) { return atomic((l,t) => {
      l.schedule ??= newSchedule(t,zone); deferReminder(l.schedule,event,t);
    }); },
  };
}
