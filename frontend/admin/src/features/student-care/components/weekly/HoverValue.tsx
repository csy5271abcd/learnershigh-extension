import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './RosterStudies.css'

/** hover와 focus에서 같은 정보. Escape로 닫고, 팝업 위에서도 내용을 읽을 수 있다. */
export function HoverValue({label,children,content}:{label:string;children:ReactNode;content:ReactNode}){
 const id=useId()
 const [position,setPosition]=useState<{left:number;top:number}|null>(null)
 const host=useRef<HTMLSpanElement>(null), timer=useRef<ReturnType<typeof setTimeout>|null>(null)
 const cancel=()=>{if(timer.current)clearTimeout(timer.current)}
 const close=()=>{cancel();timer.current=setTimeout(()=>setPosition(null),100)}
 const open=()=>{cancel();const box=host.current?.getBoundingClientRect();if(box)setPosition({left:Math.max(8,Math.min(box.left,window.innerWidth-310)),top:Math.max(8,Math.min(box.bottom+8,window.innerHeight-310))})}
 useEffect(()=>{if(!position)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setPosition(null);event.preventDefault();event.stopPropagation()}};document.addEventListener('keydown',escape,true);return()=>document.removeEventListener('keydown',escape,true)},[position])
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])
 return <span ref={host} className="dv-hover" tabIndex={0} role="button" aria-label={label} aria-describedby={position?id:undefined} onMouseEnter={open} onMouseLeave={close} onFocus={open} onBlur={close} onClick={open} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}}>
  {children}{position&&createPortal(<aside id={id} className="dv-pop" role="tooltip" style={position} onMouseEnter={cancel} onMouseLeave={close}>{content}</aside>,document.body)}
 </span>
}
