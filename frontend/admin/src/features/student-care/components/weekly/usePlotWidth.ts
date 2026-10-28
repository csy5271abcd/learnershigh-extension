import {useEffect,useRef,useState} from 'react'

/** SVG coordinates use actual CSS pixels so labels never shrink with a fixed viewBox. */
export function usePlotWidth(){
 const ref=useRef<HTMLDivElement>(null)
 const [width,setWidth]=useState(760)
 useEffect(()=>{const el=ref.current;if(!el)return;const observer=new ResizeObserver(([entry])=>setWidth(Math.max(220,entry.contentRect.width)));observer.observe(el);return()=>observer.disconnect()},[])
 return [ref,width] as const
}
