// Pure policy. No model calls, chat parsing, network, or DSH runtime dependency.
export const MINUTE = 60_000;
export const DEFAULTS = Object.freeze({
  enabled: true, completion: true, always: false, probability: 0.15, cooldown: 30,
  mode: 'easter', quality: 'patina', size: 100, sound: false,
  water: true, waterMinutes: 60, meals: true, mealTimes: ['12:00', '18:00'],
  rest: false, restMinutes: 120, dnd: true, dndStart: '00:00', dndEnd: '08:00',
  edge: 'right', top: 0.48, activity: 'still',
});
const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
export function normalize(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  const c = { ...DEFAULTS, mealTimes: [...DEFAULTS.mealTimes] };
  for (const k of ['enabled','completion','always','sound','water','meals','rest','dnd']) if (typeof raw[k] === 'boolean') c[k] = raw[k];
  for (const [k,min,max] of [['probability',0,1],['cooldown',0,1440],['size',76,128],['waterMinutes',1,1440],['restMinutes',1,1440],['top',0,1]]) {
    if (Number.isFinite(raw[k])) c[k] = Math.max(min, Math.min(max, raw[k]));
  }
  for (const [k,values] of Object.entries({ mode:['easter','resident'], quality:['patina','clear'], edge:['left','right'], activity:['still','wander'] })) if (values.includes(raw[k])) c[k] = raw[k];
  for (const k of ['dndStart','dndEnd']) if (clock.test(raw[k])) c[k] = raw[k];
  if (Array.isArray(raw.mealTimes)) c.mealTimes = [...new Set(raw.mealTimes.filter(t => typeof t === 'string' && clock.test(t)))].sort().slice(0,12);
  return c;
}
export function thanksText(reminderKind) {
  return reminderKind === 'water' ? '谢谢谢谢卡尔' : '谢谢卡尔';
}
const minutesOf = t => Number(t.slice(0,2))*60 + Number(t.slice(3));
export function quiet(c, now) {
  if (!c.dnd || c.dndStart === c.dndEnd) return false;
  const d = new Date(now), m = d.getHours()*60+d.getMinutes(), a = minutesOf(c.dndStart), b = minutesOf(c.dndEnd);
  return a < b ? m >= a && m < b : m >= a || m < b;
}
export function completionText(kind) {
  return kind === 'completed' ? '卡尔看见这一轮完成了。辛苦啦。' : '本轮结束了。卡尔来看看你。';
}
export const rejectedReasons = new Set(['error','aborted','blocked','max-tokens','interrupted']);
// Track exact live agent identities. Historical seeds never enter this observer.
export class CompletionTracker {
  constructor(publish, now = Date.now) { this.publish = publish; this.now = now; this.states = new Map(); }
  status(agent, status) {
    const id = agent?.session?.id;
    if (!id) return;
    let s = this.states.get(id);
    if (status === 'running') {
      if (!s || s.agent !== agent || !s.running) s = { agent, running: true, starts: new Set(), ends: new Map() };
      this.states.set(id, s);
    } else if (status === 'idle' && s?.agent === agent && s.running) {
      s.running = false;
      for (const [turn,kind] of s.ends) if (!rejectedReasons.has(kind)) this.publish({
        id: `${id}:${turn}`, sessionId:id, turn, kind, time:this.now(),
      });
      // Idle state is no longer needed. The durable round id provides deduplication.
      this.states.delete(id);
    }
  }
  event(session, event) {
    const s = this.states.get(session?.id);
    if (!s?.running || s.agent.session !== session) return;
    const turn = event?.data?.turn;
    if (!Number.isSafeInteger(turn) || turn < 1) return;
    if (event.type === 'turn/start') s.starts.add(turn);
    if (event.type === 'turn/end' && s.starts.has(turn)) s.ends.set(turn, event.data.reason?.kind ?? 'unknown');
  }
  dispose(agent) { if (this.states.get(agent?.session?.id)?.agent === agent) this.states.delete(agent.session.id); }
}
const localDay = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function reminderText(kind) {
  return ({ water:'卡尔提醒你：喝口水吧。', meal:'卡尔提醒你：该吃饭啦。', rest:'卡尔提醒你：起来活动一下吧。' })[kind] ?? '卡尔来看看你。';
}
export function newSchedule(now, zone) { return { zone, last:now, anchors:{water:now,rest:now}, consumed:{}, snooze:null }; }
// Mutates only the small caller-owned schedule, which must be saved atomically.
export function tickSchedule(s, c, now, zone) {
  if (!s || typeof s !== 'object' || !s.anchors || typeof s.anchors !== 'object' || !s.consumed || typeof s.consumed !== 'object' || !Number.isFinite(s.last)) return { state:newSchedule(now,zone), event:null };
  if (s.zone !== zone || now < s.last || now-s.last > 24*60*MINUTE) {
    const fresh = newSchedule(now,zone);
    // Keep wall-clock occurrence receipts across clock rollback / DST repeats.
    for (const [id,t] of Object.entries(s.consumed)) if (Number.isFinite(t) && Math.abs(now-t) < 3*24*60*MINUTE) fresh.consumed[id]=t;
    return {state:fresh,event:null};
  }
  const gap = now-s.last;
  s.last = now;
  for (const [id,time] of Object.entries(s.consumed)) if (now-time > 3*24*60*MINUTE) delete s.consumed[id];
  const candidates = [];
  if (s.snooze) {
    const item = s.snooze;
    if (!c[item.kind === 'meal' ? 'meals' : item.kind]) s.snooze = null;
    else if (now >= item.due) {
      s.snooze = null;
      if (now <= item.expires) candidates.push({ ...item, priority:3, expires:item.expires });
    }
  }
  for (const kind of ['water','rest']) {
    const period = c[`${kind}Minutes`]*MINUTE;
    if (!c[kind] || !Number.isFinite(s.anchors[kind])) { s.anchors[kind] = now; continue; }
    const anchor = s.anchors[kind], due = anchor + period;
    if (now >= due) {
      s.anchors[kind] = now; // no burst catch-up after sleep or hidden tab
      const id = `${kind}:${Math.floor(due)}`;
      if (now-due <= 2*MINUTE && gap <= 2*MINUTE && !s.consumed[id]) candidates.push({ id, kind, time:now, expires:now+2*MINUTE, priority:3 });
      s.consumed[id] = now;
    }
  }
  const d = new Date(now);
  if (c.meals) for (const time of c.mealTimes) {
    const dueDate = new Date(d); dueDate.setHours(Number(time.slice(0,2)), Number(time.slice(3)),0,0);
    const due = dueDate.getTime(), id = `meal:${zone}:${localDay(d)}:${time}`;
    if (now >= due && !s.consumed[id]) {
      s.consumed[id] = now;
      if (now-due <= 5*MINUTE) candidates.push({ id, kind:'meal', time:now, expires:due+5*MINUTE, priority:3 });
    }
  }
  candidates.sort((a,b) => Number(b.kind === 'meal')-Number(a.kind === 'meal') || b.time-a.time);
  return { state:s, event:c.enabled && !quiet(c,now) ? candidates[0] ?? null : null };
}
export function deferReminder(s, event, now) {
  s.snooze = { id:`${event.id}:snooze`, kind:event.kind, time:now, due:now+10*MINUTE, expires:now+15*MINUTE };
}
export function selectEvent(current, next, now) {
  if (next.expires < now) return current;
  return !current || current.expires < now || next.priority > current.priority ? next : current;
}
