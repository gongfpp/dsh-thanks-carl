import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createController } from './controller.mjs';
import { thanksText } from './core.mjs';
import { importImage, validImages } from './images.mjs';
import css from './style.css';
import placeholder from '../assets/choose-photo.svg';
import builtInClear from '../assets/carl-clear.png';
import builtInPatina from '../assets/carl-patina.png';
const builtInImages = {clear:builtInClear,patina:builtInPatina};
export const name = 'thanks-carl';
export const inject = ['slots'];
const useView = c => useSyncExternalStore(c.subscribe,c.getSnapshot);
function Overlay({controller:c, useSessions}) {
  const v = useView(c), config = v.config;
  const current = useSessions(s => Object.values(s.byId).find(row => (row?.retainedBy?.mainView ?? 0) > 0)?.id);
  useEffect(() => { c.select(current); },[c,current]);
  const drag = useRef(null), pet = useRef(null), nodTimer = useRef(null), [moving,setMoving] = useState(null), [nodding,setNodding] = useState(false);
  useEffect(() => () => clearTimeout(nodTimer.current),[]);
  const event = v.event, reminder = event && ['water','meal','rest'].includes(event.kind);
  const visible = config.enabled && (event || (config.mode === 'resident' && !v.hidden));
  if (!visible) return null;
  const image = (validImages(v.images) ? v.images : builtInImages)[config.quality];
  function pointerDown(e) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {x:e.clientX,y:e.clientY,moved:false};
  }
  function pointerMove(e) {
    if (!drag.current) return;
    if (Math.hypot(e.clientX-drag.current.x,e.clientY-drag.current.y) < 5 && !drag.current.moved) return;
    drag.current.moved = true;
    setMoving({edge:e.clientX < innerWidth/2 ? 'left' : 'right',top:Math.max(0.08,Math.min(0.7,e.clientY/innerHeight))});
  }
  function pointerUp(e) {
    if (!drag.current) return;
    if (drag.current.moved) {
      const edge = e.clientX < innerWidth/2 ? 'left' : 'right', top = Math.max(0.08,Math.min(0.7,e.clientY/innerHeight));
      void c.update({edge,top});
    } else { clearTimeout(nodTimer.current); setNodding(true); nodTimer.current = setTimeout(() => setNodding(false),500); }
    drag.current = null; setMoving(null);
  }
  const pos = moving ?? config;
  return <div className={`tc-stage tc-${pos.edge}`} data-thanks-carl="overlay" style={{top:`${Math.min(70,pos.top*100)}%`, '--tc-size':`${config.size}px`}}>
    <div className="tc-stack">
      {event && <div className="tc-bubble" role="status" aria-live="polite" data-event-kind={event.kind}>
        <button className="tc-close" aria-label="关闭卡尔" onClick={() => c.dismiss()}>×</button>
        {event.preview && <small className="tc-preview">预览</small>}
        <p>{event.text}</p>
        <div className="tc-actions"><button className="tc-thanks" onClick={() => c.dismiss()}>{thanksText(reminder && event.kind)}</button>
          {reminder && <button onClick={() => c.snooze()}>稍后 10 分钟</button>}</div>
      </div>}
      <div className="tc-pet-wrap">
        {!event && <button className="tc-close tc-resident-close" aria-label="关闭卡尔" onClick={() => c.dismiss()}>×</button>}
        <button ref={pet} className={`tc-pet ${nodding ? 'tc-nod' : ''}`} aria-label="卡尔：拖动停靠，点按互动" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => {drag.current=null;setMoving(null);}}>
          <img src={image} draggable="false" alt={validImages(v.images) ? '自定义 Carl 照片' : '内置 Carl 原版梗图'} />
        </button>
      </div>
    </div>
  </div>;
}
function Settings({controller:c}) {
  const v = useView(c), a = v.config, [imageError,setImageError] = useState(''), [times,setTimes] = useState(a.mealTimes.join(', '));
  useEffect(() => setTimes(a.mealTimes.join(', ')),[a.mealTimes.join(',')]);
  const update = (key,value) => c.update({[key]:value});
  const check = (key,label) => <label className="tc-check"><input type="checkbox" checked={a[key]} onChange={e => update(key,e.target.checked)}/>{label}</label>;
  const number = (key,label,min,max) => <label className="tc-field"><span>{label}</span><input type="number" aria-label={label} min={min} max={max} value={a[key]} onChange={e => {if(e.target.value !== '') update(key,Number(e.target.value));}}/></label>;
  const select = (key,label,options) => <label className="tc-field"><span>{label}</span><select aria-label={label} value={a[key]} onChange={e => update(key,e.target.value)}>{options.map(([value,text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
  async function choose(e) {
    const file=e.target.files?.[0]; if (!file) return;
    try { const images = await importImage(file); await c.saveImages(images); setImageError(''); } catch(e) { setImageError(e.message); }
    e.target.value='';
  }
  return <section className="tc-settings" data-thanks-carl="settings">
    <div className="tc-heading"><h2>插件设置</h2><button onClick={() => c.preview()}>召唤卡尔</button></div>
    {check('enabled','启用卡尔')}
    <fieldset><legend>出现方式</legend>
      {select('mode','模式',[['easter','事件彩蛋'],['resident','常驻桌宠']])}
      {check('completion','本轮完成彩蛋')}{check('always','任务完成必出现')}
      {!a.always && <>{number('probability','出现概率（0–1）',0,1)}{number('cooldown','彩蛋间隔（分钟）',0,1440)}</>}
      <div className="tc-preview-row"><button onClick={() => c.preview('completion')}>预览完成彩蛋</button></div>
    </fieldset>
    <fieldset><legend>照片与互动</legend>
      <div className="tc-image-row"><img src={(validImages(v.images) ? v.images : builtInImages)[a.quality]} alt="当前 Carl 图片预览"/><div><label className="tc-upload">自定义替换<input type="file" accept="image/png,image/jpeg,image/webp" onChange={choose}/></label><button onClick={() => c.clearImages()}>恢复 Carl 原图</button></div></div>
      <p className="tc-note">默认已内置真实 Carl 梗图；自定义替换仅保存在本地浏览器，不会上传。</p>
      {imageError && <p role="alert">{imageError}</p>}
      {select('quality','画质',[['patina','包浆版本'],['clear','同图相对清晰版本']])}
      {number('size','大小（px）',76,128)}
      {select('edge','停靠边缘',[['right','右侧'],['left','左侧']])}
      {check('sound','轻提示音（默认静音）')}
    </fieldset>
    <fieldset><legend>本地提醒</legend>
      {check('water','喝水提醒')}{a.water && number('waterMinutes','每隔多少分钟',1,1440)}
      {check('meals','吃饭提醒')}
      {a.meals && <label className="tc-field"><span>吃饭时刻</span><input aria-label="吃饭时刻" value={times} placeholder="12:00, 18:00" onChange={e => setTimes(e.target.value)} onBlur={() => {const parts=times.split(/[,，\s]+/).filter(Boolean);if(parts.length<=12 && parts.every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t))){void update('mealTimes',parts);setImageError('');}else setImageError('时刻应为 HH:mm，最多 12 个，用逗号分隔。');}}/></label>}
      {check('rest','工作间歇提醒')}{a.rest && number('restMinutes','工作间歇（分钟）',1,1440)}
      {check('dnd','勿扰时段')}
      {a.dnd && <div className="tc-time-row"><input aria-label="勿扰开始" type="time" value={a.dndStart} onChange={e => update('dndStart',e.target.value)}/><span>—</span><input aria-label="勿扰结束" type="time" value={a.dndEnd} onChange={e => update('dndEnd',e.target.value)}/></div>}
      <div className="tc-preview-row"><button onClick={() => c.preview('water')}>预览喝水</button><button onClick={() => c.preview('meal')}>预览吃饭</button><button onClick={() => c.preview('rest')}>预览休息</button></div>
      <p className="tc-note">时区：{Intl.DateTimeFormat().resolvedOptions().timeZone} · 后台不弹出，过期不补发。预览忽略勿扰，不发送消息。</p>
    </fieldset>
    {!v.automatic && <p role="alert">此浏览器缺少 Web Locks 或可用本地存储，自动彩蛋与提醒已安全停用；仍可手动预览。</p>}
    {v.error && <p role="alert">{v.error}</p>}
  </section>;
}
export function apply(ctx) {
  const controller = createController();
  ctx.effect(() => { const style=document.createElement('style'); style.textContent=css; document.head.append(style); return () => style.remove(); },'thanks-carl: owned styles');
  ctx.effect(() => () => controller.dispose(),'thanks-carl: local scheduler');
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({name:'shell.overlay',id:'thanks-carl',order:45}, props => <Overlay {...props} controller={controller}/>));
  ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({name:'plugins.bundle.config',key:'dsh-thanks-carl'}, ({view}) => view === 'page' ? <Settings controller={controller}/> : null));
}
