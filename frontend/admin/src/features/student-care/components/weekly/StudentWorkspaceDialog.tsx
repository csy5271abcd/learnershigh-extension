import { useEffect, useRef, type ReactNode } from 'react'
export function StudentWorkspaceDialog({children,onClose}:{children:ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{ref.current?.showModal()},[])
 return <dialog className="wk-student-dialog sc-week" ref={ref} aria-label="학생 상세" onClose={e=>{if(e.target===e.currentTarget)onClose()}}>
  <header className="wk-student-dialog-head"><span>학생 상세</span><button className="sc-button" type="button" autoFocus onClick={()=>ref.current?.close()}>닫기</button></header>
  {children}
 </dialog>
}
