import {Fragment,useState} from 'react'
import {BranchStudentMetricDetail} from './BranchStudentMetricDetail.tsx'
import {studentPattern} from '../../model/branchStudentPatterns.ts'
import type {CareRosterRow} from '../../api/loadCareRoster.ts'
import type {BranchMetricKind} from '../../model/branchOverview.ts'
import type {CareSettings} from '../../model/types.ts'
import {dateText,studentColor,weekdayText} from '../../model/careDisplay.ts'


export function BranchStudentPatterns({rows,kind,excluded,settings,selected,onSelect,onOpenStudent,focusedId,onCloseFocus}:{rows:CareRosterRow[];kind:BranchMetricKind;excluded:string[];settings:CareSettings;selected:string[];onSelect:(id:string)=>void;onOpenStudent:(id:string)=>void;focusedId?:string;onCloseFocus:()=>void}){
 const [all,setAll]=useState(true),[expanded,setExpanded]=useState(false),[query,setQuery]=useState('')
 const patterns=rows.filter(r=>!excluded.includes(r.student.studentId)).map(row=>studentPattern(row,kind,settings))
  .sort((a,b)=>Number(b.affected)-Number(a.affected)||b.count-a.count||(a.change??0)-(b.change??0)||a.row.student.studentName.localeCompare(b.row.student.studentName))
 const flagged=patterns.filter(p=>p.affected),filtered=(all?patterns:flagged).filter(p=>p.row.student.studentName.includes(query))
 const shown=expanded?filtered:filtered.slice(0,4),dates=rows[0].review.days.map(d=>d.date)
 const label=kind==='study'?'학습 시간 감소':kind==='arrival'?'입실 지연':kind==='absence'?'결석 학생':'계획 미제출'
 return <section className="bov-patterns" aria-label={`${label} 학생별 날짜 기록`}>
  <header><b>전체 {patterns.length}명 <em>{label} {flagged.length}명</em></b><button type="button" aria-pressed={all} onClick={()=>{setAll(v=>!v);setExpanded(false);onCloseFocus()}}>{all?'변화 학생만':'전체 학생'}</button></header>
  {all&&<input aria-label={`${label} 학생 검색`} placeholder="학생 검색" value={query} onChange={e=>{setQuery(e.target.value);onCloseFocus()}}/>}
  <div className="bov-pattern-legend">{kind==='arrival'?'평소 대비(분) · — 일정 없음 · ? 비교 기록 부족':kind==='study'?'평소 대비(%) · — 일정 없음 · ? 비교 기록 부족':'— 일정 없음 · ? 미확인'}</div>
  {!!shown.length&&<><div className="bov-pattern-head"><span>학생</span>{dates.map(date=><time key={date} dateTime={date}>{dateText(date)}<small>{weekdayText(date)}</small></time>)}<span>일수</span></div>
   {shown.map(p=><Fragment key={p.row.student.studentId}><div className="bov-pattern-row" data-student={p.row.student.studentId}>
    <div className="bov-pattern-name">{(kind==='study'||kind==='arrival')&&<input type="checkbox" aria-label={`${p.row.student.studentName} 그래프 비교`} disabled={selected.length>=6&&!selected.includes(p.row.student.studentId)} checked={selected.includes(p.row.student.studentId)} onChange={()=>onSelect(p.row.student.studentId)} style={{accentColor:selected.includes(p.row.student.studentId)?studentColor(`slot_${selected.indexOf(p.row.student.studentId)+1}`):studentColor(p.row.student.studentId)}}/>}<button type="button" onClick={()=>onOpenStudent(p.row.student.studentId)}>{p.row.student.studentName}</button></div>
    {p.cells.map(c=><button type="button" className="bov-pattern-cell" key={c.date} data-flag={c.flag} aria-label={`${p.row.student.studentName} ${dateText(c.date)} ${c.detail}`} title={`${dateText(c.date)} (${weekdayText(c.date)}) · ${c.detail}`} onClick={()=>onOpenStudent(p.row.student.studentId)}>{c.text}</button>)}
    <strong data-flag={p.affected}>{p.summary}</strong>
   </div>{focusedId===p.row.student.studentId&&<BranchStudentMetricDetail row={p.row} kind={kind} onClose={onCloseFocus}/>}</Fragment>)}</>}
  {!shown.length&&<p className="bov-empty">{query?'검색 결과가 없습니다.':'해당 학생이 없습니다.'}</p>}
  {filtered.length>4&&<button type="button" className="bov-pattern-more" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'접기':`${filtered.length}명 모두 펼치기`}</button>}
 </section>
}
