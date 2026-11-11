// Local, user-approved AI sprite actions. No generation or network at runtime.
export const ACTIONS = Object.freeze([
  ['idle','待机','01_idle'],['wave','招手','02_wave'],['petted','摸摸','03_petted'],['shy','害羞','04_shy'],
  ['sleepy','瞌睡','05_sleepy'],['celebrate','庆祝','06_celebrate'],['walk','走路','07_walk'],['roll','翻滚','08_roll'],
  ['fear','受惊','09_fear'],['excited','兴奋','10_excited'],['bristle','炸毛','11_bristle'],['belly_up','肚皮朝上','12_belly_up'],
].map(([id,label,file])=>Object.freeze({id,label,file})));
export const validAction = id => ACTIONS.some(action=>action.id === id);
export function eventAction(event, motion='') {
  if (!event) return null;
  if (event.kind === 'pet') return event.acknowledgment ? 'wave' : motion === 'shy' ? 'shy' : 'petted';
  if (['completion','focus'].includes(event.kind)) return 'celebrate';
  return ['water','meal','rest','visit'].includes(event.kind) ? 'wave' : null;
}
export function spriteState(s) {
  if (!s.enabled || s.custom || s.reduced || !s.visible) return null;
  if (s.pose && validAction(s.pose.name)) return {name:s.pose.name,key:s.pose.id,loop:false,paused:!!(s.background || s.menu || s.dragging || (!s.pose.manual && (s.sleeping || s.dnd || s.focus)))};
  if (s.sleeping || s.dnd) return {name:'sleepy',key:'sleep',loop:false,paused:true,still:8};
  return {name:s.walking ? 'walk' : 'idle',key:s.walking ? 'walk' : 'idle',loop:true,paused:!!(s.background || s.menu || s.dragging || s.focus || s.interacting)};
}
// Run forward then back to the same pose: no hard last-to-first jump or remote GIF decoder.
export function startFrames({render,done=()=>{},loop=false,frameMs=150,count=16,now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}) {
  const order=[...Array.from({length:count},(_,i)=>i),...Array.from({length:Math.max(0,count-1)},(_,i)=>count-2-i)];
  let cursor=0,timer=null,stopped=false,paused=true,remaining=frameMs,deadline=0;
  render(0);
  function schedule(){deadline=now()+remaining;timer=setTimer(tick,remaining);}
  function tick(){
    timer=null;if(stopped || paused)return;
    if(cursor+1>=order.length){if(!loop){stopped=true;done();return;}cursor=1;}else cursor++;
    render(order[cursor]);remaining=frameMs;schedule();
  }
  return {
    pause(value){if(stopped || paused===value)return;paused=value;if(paused){clearTimer(timer);timer=null;remaining=Math.max(1,deadline-now());}else schedule();},
    dispose(){stopped=true;clearTimer(timer);timer=null;},
  };
}
