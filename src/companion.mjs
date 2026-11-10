import { MINUTE } from './core.mjs';

// 专注计时使用墙上时钟；刷新、切会话和页面后台都不会让倒计时重来。
export function readFocus(raw) {
  if (!raw || !['running','paused','finished'].includes(raw.status) || ![25,45].includes(raw.minutes)) return null;
  if (raw.status === 'running' && !Number.isFinite(raw.deadline)) return null;
  if (raw.status === 'paused' && (!Number.isFinite(raw.remaining) || raw.remaining <= 0 || raw.remaining > raw.minutes*MINUTE)) return null;
  if (raw.status === 'finished' && !Number.isFinite(raw.finishedAt)) return null;
  return {status:raw.status,minutes:raw.minutes,...(raw.status === 'running' ? {deadline:raw.deadline} : raw.status === 'paused' ? {remaining:raw.remaining} : {finishedAt:raw.finishedAt})};
}
export function focusRemaining(focus, now) {
  return !focus || focus.status === 'finished' ? 0 : focus.status === 'paused' ? focus.remaining : Math.max(0,Math.min(focus.minutes*MINUTE,focus.deadline-now));
}
export function changeFocus(raw, action, now, minutes = 25) {
  const focus = readFocus(raw);
  if (action === 'start') return focus && focus.status !== 'finished' ? focus : {status:'running',minutes:minutes === 45 ? 45 : 25,deadline:now+(minutes === 45 ? 45 : 25)*MINUTE};
  if (action === 'end') return null;
  if (action === 'pause' && focus?.status === 'running') {
    const remaining = focusRemaining(focus,now);
    return remaining ? {status:'paused',minutes:focus.minutes,remaining} : {status:'finished',minutes:focus.minutes,finishedAt:focus.deadline};
  }
  if (action === 'resume' && focus?.status === 'paused') return {status:'running',minutes:focus.minutes,deadline:now+focus.remaining};
  return focus;
}
export function finishFocus(raw, now) {
  const focus = readFocus(raw);
  if (focus?.status !== 'running' || now < focus.deadline) return {focus,event:null};
  return {
    focus:{status:'finished',minutes:focus.minutes,finishedAt:focus.deadline},
    event:now-focus.deadline <= 2*MINUTE ? {id:`focus:${focus.deadline}`,kind:'focus',priority:3,time:now,expires:now+MINUTE,text:`一起专注了 ${focus.minutes} 分钟。伸个懒腰，休息一下吧。`} : null,
  };
}
export function quietDeadline(kind, now) {
  if (kind === 'hour') return now+60*MINUTE;
  if (kind === 'today') { const end=new Date(now);end.setHours(24,0,0,0);return end.getTime(); }
  return 0;
}
export function petReaction(count, previous = -1, random = Math.random) {
  if (count >= 4) return {text:'有、有点痒……卡尔先躲一下。',motion:'shy',index:previous};
  const lines=['谢谢你，人类。','摸摸收到。今天也慢慢来。','卡尔在呢。你忙你的。','这颗小脑袋，现在暖乎乎的。','不用每次都很厉害，做一点也很好。'];
  const choices=lines.map((_,i)=>i).filter(i=>i!==previous), index=choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
  return {text:lines[index],motion:'nod',index};
}
