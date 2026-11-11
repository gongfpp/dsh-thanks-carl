import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createController } from './controller.mjs';
import { thanksText, quiet } from './core.mjs';
import { canWander, dragPosition, startWander } from './motion.mjs';
import { focusRemaining } from './companion.mjs';
import { ACTIONS, spriteState } from './actions.mjs';
import { SpritePhoto } from './SpritePhoto.jsx';
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
  const v=useView(c), config=v.config;
  const current=useSessions(s => Object.values(s.byId).find(row => (row?.retainedBy?.mainView ?? 0) > 0)?.id);
  useEffect(() => { c.select(current); },[c,current]);
  const drag=useRef(null), hold=useRef(null), stage=useRef(null), menuButton=useRef(null), menuClose=useRef(null), homeTimer=useRef(null), snap=useRef(null), roamOffset=useRef(0);
  const [moving,setMoving]=useState(null), [menu,setMenu]=useState(false), [height,setHeight]=useState(100), [stay,setStay]=useState(false), [homePhase,setHomePhase]=useState(''), [hovering,setHovering]=useState(false), [focused,setFocused]=useState(false), [walking,setWalking]=useState(false);
  const [background,setBackground]=useState(document.visibilityState !== 'visible'), [reduced,setReduced]=useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const event=v.event, reminder=event && ['water','meal','rest'].includes(event.kind), sleeping=v.quietUntil > v.now;
  // External-store bubble clearing can render before the queued stay update.
  // Keep the captured button mounted throughout a drag, including easter mode.
  const visible=!!(config.enabled && (homePhase === 'leaving' || (!v.hidden && (stay || drag.current?.moved || menu || event || v.pose || v.focus || config.mode === 'resident'))));
  const roaming=canWander({enabled:config.enabled,activity:config.activity,visible,menu,focus:v.focus,sleeping:sleeping || quiet(config,v.now),reduced,background,dragging:!!moving,interacting:hovering || focused,event:event || homePhase || v.pose});
  const animation=spriteState({enabled:config.animations,custom:validImages(v.images),reduced,visible,background,dragging:!!moving || !!homePhase,menu,focus:v.focus && v.focus.status !== 'finished',sleeping,dnd:quiet(config,v.now),pose:v.pose,walking,interacting:hovering || focused});
  useEffect(()=>{if (v.pose && (reduced || !config.animations || validImages(v.images) || (!v.pose.manual && (background || sleeping || quiet(config,v.now))))) c.finishAction(v.pose.id);},[c,v.pose,reduced,config.animations,v.images,background,sleeping,config.dnd,config.dndStart,config.dndEnd,v.now]);
  useEffect(() => {
    const media=matchMedia('(prefers-reduced-motion: reduce)'), change=() => setReduced(media.matches), visibility=() => setBackground(document.visibilityState !== 'visible');
    media.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);
    return () => {media.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);clearTimeout(hold.current);clearTimeout(homeTimer.current);};
  },[]);
  useEffect(() => {
    if (!config.enabled) {setStay(false);setMenu(false);setHomePhase('');clearTimeout(homeTimer.current);}
    if (v.hidden) setStay(false);
  },[config.enabled,v.hidden]);
  useEffect(() => {roamOffset.current=0;stage.current?.style.setProperty('--tc-roam-y','0px');},[config.top,config.edge,visible]);
  useEffect(() => {
    const element=stage.current;if (!roaming || !element) return;
    return startWander({read:() => ({offset:roamOffset.current,anchor:Math.max(8,Math.min(innerHeight-height-8,config.top*innerHeight-height/2)),height,viewport:innerHeight}),write:value => {roamOffset.current=value;element.style.setProperty('--tc-roam-y',`${value}px`);},onMoving:setWalking});
  },[roaming,height,config.top,config.edge]);
  useLayoutEffect(() => {
    if (moving || !snap.current || !stage.current) return;
    const from=snap.current;snap.current=null;
    if (reduced) return;
    const element=stage.current, to=element.getBoundingClientRect(), dx=from.left-to.left, dy=from.top-to.top;
    const animation=element.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0px,0px)',offset:.85},{transform:'translate(0px,2px)',offset:.94},{transform:'none'}],{duration:320,easing:'ease-out'});
    return () => animation.cancel();
  },[moving,config.edge,config.top,reduced]);
  useEffect(() => {
    if (!config.enabled) setMenu(false);
    const element=stage.current;if (!element) return;
    const observer=new ResizeObserver(() => setHeight(element.getBoundingClientRect().height));observer.observe(element);return () => observer.disconnect();
  },[visible,config.enabled]);
  useLayoutEffect(() => {if (!visible && v.hidden) menuButton.current?.focus();},[visible,v.hidden]);
  useEffect(() => {
    if (!menu) return;
    menuClose.current?.focus();
    const outside=e => {if (!stage.current?.contains(e.target)) setMenu(false);};
    const key=e => {if (e.key === 'Escape') {e.preventDefault();e.stopPropagation();setMenu(false);menuButton.current?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key,true);
    return () => {document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key,true);};
  },[menu]);
  if (!config.enabled) return null;
  const image=(validImages(v.images) ? v.images : builtInImages)[config.quality], pos=config;
  const open=() => {clearTimeout(homeTimer.current);if (!visible) {setHomePhase('entering');homeTimer.current=setTimeout(() => setHomePhase(''),reduced ? 0 : 280);}c.summon();setStay(true);setMenu(true);};
  const closeMenu=() => {setMenu(false);menuButton.current?.focus();};
  const goHome=() => {clearTimeout(homeTimer.current);setMenu(false);setStay(false);setHomePhase('leaving');c.dismiss();homeTimer.current=setTimeout(() => {setHomePhase('');menuButton.current?.focus();},reduced ? 0 : 240);};
  const remaining=Math.ceil(focusRemaining(v.focus,v.now)/1000), time=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
  function pointerDown(e) {
    if (e.button !== 0) return;
    const rect=e.currentTarget.getBoundingClientRect();
    stage.current?.getAnimations().forEach(animation => animation.cancel());
    e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,left:rect.left,top:rect.top,size:rect.width,moved:false,held:false};
    hold.current=setTimeout(() => {if (drag.current && !drag.current.moved) {drag.current.held=true;open();}},550);
  }
  function pointerMove(e) {
    if (!drag.current) return;
    if (Math.hypot(e.clientX-drag.current.x,e.clientY-drag.current.y) < 5 && !drag.current.moved) return;
    clearTimeout(hold.current);drag.current.moved=true;setMenu(false);setStay(true);c.closeBubble();
    roamOffset.current=0;stage.current?.style.setProperty('--tc-roam-y','0px');
    setMoving(dragPosition(drag.current,{x:e.clientX,y:e.clientY},{width:innerWidth,height:innerHeight},drag.current.size));
  }
  function pointerUp(e) {
    clearTimeout(hold.current);if (!drag.current) return;
    if (drag.current.moved) {
      const point=dragPosition(drag.current,{x:e.clientX,y:e.clientY},{width:innerWidth,height:innerHeight},drag.current.size);snap.current=point;
      void c.update({edge:point.left+drag.current.size/2 < innerWidth/2 ? 'left' : 'right',top:(point.top+drag.current.size/2)/innerHeight});
    }
    else if (!drag.current.held) c.pet();
    drag.current=null;setMoving(null);
  }
  function playAction(name) {if(c.playAction(name)){setStay(true);setMenu(false);menuButton.current?.focus();}}
  async function start(minutes) {if (await c.focus('start',minutes)) setMenu(false);}
  async function acknowledgeWater() {if (await c.drankWater()) {setMenu(false);menuButton.current?.focus();}}
  return <div ref={stage} className={`tc-stage tc-${pos.edge} ${sleeping ? 'tc-sleeping' : ''} ${homePhase ? `tc-home-${homePhase}` : ''} ${moving ? 'tc-dragging' : ''}`} data-thanks-carl={visible ? 'overlay' : 'launcher'} data-roaming={roaming ? 'active' : 'paused'} onPointerEnter={() => setHovering(true)} onPointerLeave={() => setHovering(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={e => {if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);}} style={{top:moving ? `${moving.top}px` : `clamp(8px, calc(${pos.top*100}dvh - ${height/2}px + var(--tc-roam-y, 0px)), calc(100dvh - ${height}px - 8px))`,...(moving ? {left:`${moving.left}px`,right:'auto'} : {}), '--tc-size':`${config.size}px`}}>
    <div className="tc-stack">
      {menu && <div className="tc-menu" role="dialog" aria-label="卡尔快捷菜单">
        <div className="tc-menu-heading"><strong>卡尔陪着你</strong><button ref={menuClose} aria-label="关闭菜单" onClick={closeMenu}>×</button></div>
        {!v.focus || v.focus.status === 'finished' ? <div className="tc-focus-start"><button disabled={!v.automatic} onClick={() => start(25)}>专注 25 分钟</button><button disabled={!v.automatic} onClick={() => start(45)}>专注 45 分钟</button></div> : <div className="tc-menu-focus"><strong>{v.focus.status === 'paused' ? '已暂停' : '专注中'} · {time}</strong><div className="tc-actions"><button onClick={() => c.focus(v.focus.status === 'paused' ? 'resume' : 'pause')}>{v.focus.status === 'paused' ? '继续专注' : '暂停专注'}</button><button onClick={() => c.focus('end')}>结束专注</button></div></div>}
        <button disabled={!v.automatic} onClick={acknowledgeWater}>我喝过水了</button>
        {sleeping ? <button onClick={() => c.setQuiet('off')}>唤醒卡尔 · {new Date(v.quietUntil).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})} 前安静</button> : <><button disabled={!v.automatic} onClick={() => c.setQuiet('hour')}>安静一小时</button><button disabled={!v.automatic} onClick={() => c.setQuiet('today')}>今天先休息</button></>}
        <label className="tc-menu-activity"><span>活动方式</span><select aria-label="活动方式" value={config.activity} onChange={e => c.update({activity:e.target.value})}><option value="still">乖乖待着</option><option value="wander">自己逛逛</option></select></label>
        <details className="tc-action-menu"><summary>动作彩蛋</summary><div className="tc-action-grid">{ACTIONS.map(action=><button key={action.id} disabled={!config.animations || validImages(v.images) || reduced} onClick={()=>playAction(action.id)}>{action.label}</button>)}</div>{(!config.animations || validImages(v.images) || reduced) && <p>在设置中启用 AI 动作；自定义照片和系统减少动态时不播放。</p>}</details>
        <button onClick={goHome}>回小窝</button>
      </div>}
      {v.focus && visible && !moving && homePhase !== 'leaving' && !menu && <div className="tc-focus-chip" data-focus-status={v.focus.status}>
        <button aria-label="查看专注计时" onClick={open}>{v.focus.status === 'finished' ? '专注完成 · 休息一下' : `${v.focus.status === 'paused' ? '已暂停' : '专注'} ${time}`}</button>
        {v.focus.status !== 'finished' && <button aria-label={v.focus.status === 'paused' ? '继续专注' : '暂停专注'} onClick={() => c.focus(v.focus.status === 'paused' ? 'resume' : 'pause')}>{v.focus.status === 'paused' ? '▶' : 'Ⅱ'}</button>}
        <button aria-label="结束专注" onClick={() => c.focus('end')}>×</button>
      </div>}
      {event && !moving && !menu && <div className="tc-bubble" role="status" aria-live="polite" data-event-kind={event.kind}>
        <button className="tc-close" aria-label="关闭提示" onClick={() => c.closeBubble()}>×</button>
        {event.preview && <small className="tc-preview">预览</small>}<p>{event.text}</p>
        <div className="tc-actions"><button className="tc-thanks" onClick={() => c.closeBubble()}>{event.acknowledgment ? '知道了' : event.kind === 'pet' ? '摸摸收到' : event.kind === 'focus' ? '好，歇一会儿' : thanksText(reminder && event.kind)}</button>
          {reminder && <button onClick={() => c.snooze()}>稍后 10 分钟</button>}{event.kind === 'water' && <button onClick={acknowledgeWater}>喝过水了</button>}</div>
      </div>}
      {v.error && (menu || v.focus) && <p className="tc-local-error" role="alert">{v.error}</p>}
      <div className="tc-pet-wrap">
        {visible ? <>
          <button ref={menuButton} className="tc-menu-toggle" aria-label="卡尔菜单" aria-expanded={menu} aria-haspopup="dialog" onClick={menu ? closeMenu : open}>···</button>
          <button className={`tc-pet tc-${v.motion} ${animation ? 'tc-has-sprite' : ''}`} aria-label="卡尔：拖动停靠，点按互动" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => {clearTimeout(hold.current);if (moving) snap.current=moving;drag.current=null;setMoving(null);}} onClick={e => {if (e.detail === 0) c.pet();}} onContextMenu={e => {e.preventDefault();clearTimeout(hold.current);open();}}>
            <SpritePhoto key={animation ? `${animation.name}:${animation.key}` : 'original'} animation={animation} image={image} alt={validImages(v.images) ? '自定义 Carl 照片' : '内置 Carl 原版梗图'} onDone={()=>v.pose && c.finishAction(v.pose.id)}/>
          </button>{sleeping && <span className="tc-sleep-mark" aria-label="卡尔休息中">z Z</span>}
        </> : <button ref={menuButton} className="tc-launcher" aria-label="召唤卡尔，打开快捷菜单" title="召唤卡尔" onClick={open}><img src={image} alt="" draggable="false"/></button>}
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
      {check('animations','AI 多帧动作（可关闭恢复原图）')}
      <p className="tc-note">动作来自用户提供的 AI 精灵表，不是原照片连拍；本地播放，不调用模型。自定义照片和系统减少动态时保留静态图片。</p>
      {select('quality','画质',[['patina','包浆版本'],['clear','同图相对清晰版本']])}
      {number('size','大小（px）',76,128)}
      {select('edge','停靠边缘',[['right','右侧'],['left','左侧']])}
      {select('activity','活动方式',[['still','乖乖待着'],['wander','自己逛逛']])}
      <p className="tc-note">闲逛只在边缘小范围移动。专注、睡觉、菜单打开、操作卡尔及页面后台时暂停；遵循系统减少动态效果。</p>
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
