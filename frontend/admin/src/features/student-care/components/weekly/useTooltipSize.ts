import {useLayoutEffect,useRef,useState} from 'react'
export function useTooltipSize(active:number|null){
 const ref=useRef<HTMLDivElement>(null),[height,setHeight]=useState(65)
 useLayoutEffect(()=>{if(active===null||!ref.current)return;const observer=new ResizeObserver(([entry])=>setHeight(entry.borderBoxSize?.[0]?.blockSize??entry.contentRect.height));observer.observe(ref.current);return()=>observer.disconnect()},[active])
 return [ref,height] as const
}
