import React, {useEffect,useRef,useState} from 'react';
import {ACTIONS,startFrames} from './actions.mjs';
import {actionImages} from './action-images.mjs';
export function SpritePhoto({animation,image,alt,onDone}) {
  const [loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false),[frame,setFrame]=useState(animation?.still ?? 0);
  const player=useRef(null),done=useRef(onDone);done.current=onDone;
  useEffect(()=>{
    if(!loaded || failed || !animation || animation.still !== undefined)return;
    const running=startFrames({render:setFrame,loop:animation.loop,done:()=>done.current?.()});player.current=running;running.pause(animation.paused);
    return()=>{running.dispose();player.current=null;};
  },[loaded,failed,animation?.key,animation?.name,animation?.loop,animation?.still]);
  useEffect(()=>{player.current?.pause(animation?.paused ?? true);},[animation?.paused]);
  const active=animation && !failed,label=ACTIONS.find(a=>a.id===animation?.name)?.label;
  return <>
    <img className="tc-photo" src={image} draggable="false" alt={alt} style={active && loaded ? {visibility:'hidden'} : undefined}/>
    {active && <span className="tc-sprite-viewport" role="img" aria-label={`卡尔 AI 动作：${label}`} data-carl-action={animation.name} data-frame={frame} data-playing={loaded && !animation.paused && animation.still===undefined ? 'true' : 'false'} style={{visibility:loaded ? 'visible' : 'hidden','--tc-frame':frame}}>
      <img className="tc-sprite-sheet" src={actionImages[animation.name]} alt="" draggable="false" onLoad={()=>setLoaded(true)} onError={()=>{setFailed(true);done.current?.();}}/>
    </span>}
  </>;
}
