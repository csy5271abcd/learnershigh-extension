import { Fragment, useEffect, useRef, useState } from 'react'
import type { CareApi } from '../../api/httpStudentCareApi.ts'
import { loadCareRoster, type CareRosterRow as Row } from '../../api/loadCareRoster.ts'
import { weeklyReview } from '../../model/weeklyReview.ts'
import { useRemote, loadFailure } from '../../model/useRemote.ts'
import type { WeeklyReview } from '../../model/weeklyReviewTypes.ts'
import { shortDate } from '../../model/format.ts'
import { CounselForm } from '../CounselForm.tsx'
import { RecheckPanel } from '../RecheckPanel.tsx'
import { CareStudentMetrics } from './CareStudentMetrics.tsx'
import './RosterStudies.css'

const duration=(v:number|null)=>v===null?'기록 없음':`${Math.floor(Math.round(v)/60)}시간 ${Math.round(v)%60}분`
const metric=(r:WeeklyReview,type:string)=>r.metrics.find(m=>m.type===type)
const status=(r:Row)=>r.priority===0?'확인 필요':r.priority===1?'상담 필요':r.priority===2?'관리 중':r.priority===3?'기록 부족':'—'

function StudentExpanded({api,row,version,onClose,onSaved}:{api:CareApi;row:Row;version:number;onClose:()=>void;onSaved:(message:string)=>void}){
 const [historyOpen,setHistoryOpen]=useState(false)
 const detail=useRemote(row.student.studentId,()=>api.detail(row.student.branchId,row.student.studentId),version)
 const history=useRemote(historyOpen?row.student.studentId:null,()=>api.history(row.student.branchId,row.student.studentId),version)
 const selected=useRef<HTMLElement>(null)
 useEffect(()=>{if(detail.revision===1)selected.current?.focus({preventScroll:true})},[detail.revision])
 if(loadFailure(detail))return <section className="rs-detail"><p role="alert">학생 상세를 불러오지 못했습니다.</p><button onClick={detail.reload}>다시 시도</button><button onClick={onClose}>접기</button></section>
 if(!detail.data)return <section className="rs-detail"><p role="status">학생 상세 불러오는 중</p></section>
 const data=detail.data,active=data.activeCase,review=weeklyReview(data)
 return <section className="rs-detail" ref={selected} tabIndex={-1} aria-label={`${row.student.studentName} 상세 지표`}>
  <header className="rs-detail-head"><div><h2>{row.student.studentName}</h2><span>{row.student.className}</span><span>{status(row)}</span></div><button className="sc-button" onClick={onClose}>접기</button></header>
  <CareStudentMetrics review={review}/>
  <section className="rs-counsel"><div className="rs-counsel-body">
   {active?.recheckDue?<RecheckPanel api={api} branchId={row.student.branchId} asOf={data.today??data.asOf} careCase={active} onSaved={onSaved} onStale={onClose}/>:active||data.signals.length?<CounselForm api={api} branchId={row.student.branchId} studentId={row.student.studentId} caseId={active?.caseId??null} asOf={data.today??data.asOf} onSaved={onSaved} onStale={onClose}/>:null}
   <button className="cm-history-toggle" aria-expanded={historyOpen} onClick={()=>setHistoryOpen(v=>!v)}>과거 관리 이력 <span aria-hidden="true">{historyOpen?'⌃':'⌄'}</span></button>{historyOpen&&<div className="cm-history">{loadFailure(history)?<p role="alert">이력을 불러오지 못했습니다.<button onClick={history.reload}>다시 시도</button></p>:history.status==='loading'?<p role="status">이력 불러오는 중</p>:history.data?.items.length?history.data.items.map(item=><p key={item.eventId}>{item.occurredOn} · {item.content}</p>):<p>상담 이력 없음</p>}</div>}
  </div></section>
 </section>
}

export function RosterStudies({api,branchId,version,selectedId,onSaved}:{api:CareApi;branchId:string;version:number;design?:5|6|7;selectedId?:string|null;onSaved:(message:string)=>void}){
 const [query,setQuery]=useState(''),[expanded,setExpanded]=useState<string|null>(selectedId??null),[notice,setNotice]=useState(''),[refresh,setRefresh]=useState(0)
 const remote=useRemote(branchId,()=>loadCareRoster(api,branchId),version+refresh)
 if(loadFailure(remote))return <p role="alert">학생 기록을 불러오지 못했습니다. <button onClick={remote.reload}>다시 시도</button></p>
 if(!remote.data)return <p role="status">학생 기록 불러오는 중</p>
 const rows=[...remote.data.rows].sort((a,b)=>Number(b.student.studentId===selectedId)-Number(a.student.studentId===selectedId)||a.priority-b.priority||a.student.studentName.localeCompare(b.student.studentName,'ko'))
 const shown=rows.filter(r=>`${r.student.studentName} ${r.student.className??''}`.includes(query))
 const first=rows[0]?.review
 const close=(id:string)=>{setExpanded(null);requestAnimationFrame(()=>document.getElementById(`rs-open-${id}`)?.focus({preventScroll:true}))}
 return <section className="rs-roster" aria-label="전체 학생 간략 지표">
  <header className="rs-head"><div><h2>전체 학생 <small>{rows.length}명</small></h2><p>최근 7일 {first&&`${shortDate(first.days[0].date)}–${shortDate(first.asOf)}`} <span>비교 {first&&`${shortDate(first.baselineFrom)}–${shortDate(first.baselineTo)}`} · 28일</span></p></div><input className="sc-input" aria-label="학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={e=>setQuery(e.target.value)}/></header>
  {notice&&<p role="status">{notice}</p>}
  <div className="rs-list-scroll"><table className="rs-list"><thead><tr><th>학생</th><th>상태</th><th>학습 시간<small>7일 합계 / 기준 주평균</small></th><th>입실<small>최근 7일</small></th><th>계획 제출<small>제출 / 기록 일수</small></th><th>계획 대비 진행률</th></tr></thead><tbody>{shown.map(row=>{
   const id=row.student.studentId,review=row.review,study=metric(review,'STUDY_DROP'),execution=metric(review,'EXECUTION_GAP')?.current??null
   const entered=review.days.filter(d=>d.attendance==='present').length,known=review.days.filter(d=>d.scheduled!==false&&(d.submission==='submitted'||d.submission==='missing')).length,submitted=review.days.filter(d=>d.scheduled!==false&&d.submission==='submitted').length
   return <Fragment key={id}><tr className="rs-summary" data-attention={row.priority<2} data-selected={expanded===id} onClick={()=>setExpanded(expanded===id?null:id)}>
    <th><button id={`rs-open-${id}`} type="button" className="rs-open" aria-label={`${row.student.studentName} 상세 ${expanded===id?'접기':'펼치기'}`} aria-expanded={expanded===id} onClick={e=>{e.stopPropagation();setExpanded(expanded===id?null:id)}}><b>{row.student.studentName}<i aria-hidden="true">{expanded===id?'⌄':'›'}</i></b><small>{row.student.className}</small></button></th>
    <td><div className="cm-list-cell"><span className="rs-status">{status(row)}</span><small>{row.priority===0?`확인일 ${shortDate(row.recheckDate??review.asOf)}`:row.recheckDate?`다음 확인 ${shortDate(row.recheckDate)}`:row.priority===1?'신규':' '}</small></div></td>
    <td><div className="cm-list-cell"><b>{duration(study?.current??null)}</b><small>{duration(study?.before??null)}</small></div></td><td><div className="cm-list-cell"><b>{review.days.some(d=>d.attendance!=='unknown'||d.minutes!==null)?`${entered}일`:'—'}</b><small> </small></div></td><td><div className="cm-list-cell"><b>{known?`${submitted} / ${known}일`:'—'}</b><small> </small></div></td><td><div className="cm-list-cell"><b>{execution===null?'—':`${Math.round(execution)}%`}</b><small>비교 {review.recent.comparablePlanDays}일</small></div></td>
   </tr>{expanded===id&&<tr className="rs-expanded"><td colSpan={6}><StudentExpanded api={api} row={row} version={version+refresh} onClose={()=>close(id)} onSaved={message=>{setNotice(message);setRefresh(v=>v+1);onSaved(message)}}/></td></tr>}</Fragment>
  })}</tbody></table></div>{!shown.length&&<p>조건에 맞는 학생이 없습니다.</p>}
 </section>
}
