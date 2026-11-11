// Owned-overlay motion only: no host DOM inspection, assets, network or physics engine.
export function canWander(s) {
  return s.enabled && s.activity === 'wander' && s.visible && !s.menu && !s.focus && !s.sleeping && !s.reduced && !s.background && !s.dragging && !s.interacting && !s.event;
}
export function dragPosition(start, pointer, viewport, size) {
  return {left:Math.max(8,Math.min(Math.max(8,viewport.width-size-8),start.left+pointer.x-start.x)),top:Math.max(8,Math.min(Math.max(8,viewport.height-size-8),start.top+pointer.y-start.y))};
}
export function wanderTarget(current, anchor, height, viewport, random = Math.random) {
  const low=Math.max(-48,8-anchor), high=Math.min(48,viewport-height-8-anchor);
  if (high <= low) return 0;
  const direction=current >= high-8 ? -1 : current <= low+8 ? 1 : random() < .5 ? -1 : 1;
  return Math.max(low,Math.min(high,current+direction*(24+random()*24)));
}
export function startWander({read,write,onMoving=()=>{},random=Math.random,now=()=>performance.now(),request=requestAnimationFrame,cancel=cancelAnimationFrame,setTimer=setTimeout,clearTimer=clearTimeout}) {
  let timer, frame, stopped=false;
  const schedule=() => {timer=setTimer(step,20_000+random()*20_000);};
  function step() {
    if (stopped) return;
    onMoving(true);
    const {offset,anchor,height,viewport}=read(), target=wanderTarget(offset,anchor,height,viewport,random), began=now();
    function tick() {
      if (stopped) return;
      const t=Math.min(1,Math.max(0,(now()-began)/1800));
      write(offset+(target-offset)*t*t*(3-2*t));
      if (t < 1) frame=request(tick);else {onMoving(false);schedule();}
    }
    frame=request(tick);
  }
  schedule();
  return () => {stopped=true;clearTimer(timer);cancel(frame);onMoving(false);};
}
