import {useId,useState,type ReactNode} from 'react'
import type {WeeklyReview} from '../../model/weeklyReviewTypes.ts'
import {attendanceText,submissionText,compactMinutes,displayClock,dateText,weekdayText,executionPercent,subjectDifference} from '../../model/careDisplay.ts'
import './CareMetrics.css'
import {usePlotWidth} from './usePlotWidth.ts'
import {useTooltipSize} from './useTooltipSize.ts'
import {tooltipPlacement} from '../../model/tooltipPlacement.ts'

export function SubjectAllocation({subjects}:{subjects:{name:string;plan:number;actual:number}[]}){
 return <div className="cm-subjects"><div className="cm-subject-axis"><span>계획 / 실제</span><span>0%</span><span>50%</span><span>100%</span></div>{subjects.map(s=>{const delta=subjectDifference(s.plan,s.actual);return <div className="cm-subject" key={s.name}>
  <header><b>{s.name}</b><span data-large={Math.abs(delta)>=20}>{delta===0?'차이 없음':`${delta>0?'+':''}${delta}%p`}</span></header>
  <div className="cm-subject-pair"><span>계획</span><div><i data-value={s.plan} style={{width:`${Math.max(0,Math.min(100,s.plan))}%`}}/></div><b>{Number(s.plan.toFixed(1))}%</b></div>
  <div className="cm-subject-pair cm-subject-actual"><span>실제</span><div><i data-value={s.actual} style={{width:`${Math.max(0,Math.min(100,s.actual))}%`}}/></div><b>{Number(s.actual.toFixed(1))}%</b></div>
 </div>})}</div>
}

export function TimelineChart({snapshot,kind}:{snapshot:WeeklyReview;kind:'study'|'start'|'execution'}){
 const tipId=useId()
 const [plotRef,width]=usePlotWidth()
 const [active,setActive]=useState<number|null>(null)
 const [tipRef,tipHeight]=useTooltipSize(active)
 const {days,weekdayBaseline}=snapshot
 const base=days.map(d=>weekdayBaseline.find(b=>b.date===d.date))
 const points=days.map(d=>kind==='start'?d.attendance==='present'?d.start:null:kind==='execution'?executionPercent(d):d.minutes)
 const reference=days.map((_,i)=>kind==='start'?base[i]?.start??null:kind==='execution'?100:base[i]?.minutes??null)
 const values=[...points,...reference].filter((v):v is number=>v!==null)
 const min=kind==='start'?Math.max(0,Math.floor((Math.min(...values,1440)-30)/60)*60):0
 const max=kind==='start'?Math.min(1440,Math.ceil((Math.max(...values,0)+30)/60)*60):kind==='execution'?Math.max(120,Math.ceil(Math.max(...values,100)/50)*50):Math.max(120,Math.ceil(Math.max(...values,0)/120)*120)
 const left=width<400?48:56,step=(width-left-20)/7
 const x=(i:number)=>left+(i+.5)*step,y=(v:number)=>180-(v-min)/Math.max(1,max-min)*142
 const tipWidth=width<420?168:240
 const label=kind==='study'?'학습 시간':kind==='start'?'입실 시각':'계획 대비 진행률'
 const fmt=(v:number|null)=>kind==='start'?displayClock(v):kind==='execution'?v===null?'—':`${Math.round(v)}%`:compactMinutes(v)
 const series=(vs:(number|null)[],cls:string)=><g className={cls}>{vs.map((v,i)=>v===null?null:<g key={i}>{i>0&&vs[i-1]!==null&&<line x1={x(i-1)} x2={x(i)} y1={y(vs[i-1]!)} y2={y(v)}/>}<circle cx={x(i)} cy={y(v)} r={cls==='cm-baseline'?3.5:6.5}/></g>)}</g>
 const d=active===null?null:days[active]
 return <figure className="cm-timeline" onMouseLeave={()=>setActive(null)} onKeyDown={e=>{if(e.key==='Escape')setActive(null)}}>
  <div className="cm-chart-key"><span><i/>{kind==='execution'?'진행률':label}</span><span><i className="cm-key-base"/>{kind==='execution'?'계획 100%':'요일 평균'}</span></div>
  <div className="cm-plot" ref={plotRef}><svg viewBox={`0 0 ${width} ${width<420?294:264}`} role="group" aria-label={`${label} 날짜별 그래프`}>
   {[min,(min+max)/2,max].map(v=><g className="cm-grid" key={v}><line x1={left} x2={width-20} y1={y(v)} y2={y(v)}/><text x={left-8} y={y(v)+5} textAnchor="end">{kind==='start'?displayClock(v):kind==='execution'?`${Math.round(v)}%`:`${Number((v/60).toFixed(1))}h`}</text></g>)}
   {series(reference,'cm-baseline')}{series(points,'cm-series')}
   {active!==null&&<line className="cm-guide" x1={x(active)} x2={x(active)} y1="32" y2="185"/>}
   {days.map((day,i)=><g className="cm-day-target" role="button" tabIndex={0} aria-label={`${dateText(day.date)} ${label} ${fmt(points[i])}`} aria-describedby={active===i?tipId:undefined} key={day.date} onMouseEnter={()=>setActive(i)} onFocus={()=>setActive(i)} onBlur={()=>setActive(null)} onClick={()=>setActive(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setActive(i)}}}>
    <rect x={x(i)-step/2} y="26" width={step} height="220" fill="transparent"/>
    <text x={x(i)} y="208" textAnchor="middle">{width<420?<><tspan x={x(i)}>{Number(day.date.slice(8))}</tspan></>:dateText(day.date)}</text><text className="cm-weekday" x={x(i)} y="229" textAnchor="middle">{weekdayText(day.date)}</text>
    {kind==='start'&&points[i]===null?<text className="cm-absence" x={x(i)} y={width<420?277:253} textAnchor="middle">{day.attendance==='present'?'시각 없음':attendanceText(day)}</text>:kind==='execution'&&points[i]===null?<text className="cm-absence" x={x(i)} y={width<420?277:253} textAnchor="middle">{day.scheduled===false?'—':day.submission==='missing'?'미제출':'—'}</text>:null}
   </g>)}
   {width<420&&[...new Set(days.map(d=>d.date.slice(0,7)))].map(month=>{const indices=days.flatMap((d,i)=>d.date.startsWith(month)?[i]:[]);return <text className="cm-month" key={month} x={indices.reduce((sum,i)=>sum+x(i),0)/indices.length} y="253" textAnchor="middle">{Number(month.slice(5))}월</text>})}
  </svg>{active!==null&&d&&<div role="tooltip" ref={tipRef} id={tipId} className="cm-tooltip" style={{width:tipWidth,...tooltipPlacement({width,boxWidth:tipWidth,boxHeight:tipHeight,left,bottom:180,anchor:{x:x(active),y:points[active]===null?180:y(points[active]!)},series:[points,reference].map(values=>values.map((v,i)=>v===null?null:{x:x(i),y:y(v)}))})}}><b>{dateText(d.date)} ({weekdayText(d.date)})</b><div><span>{label}</span><strong>{points[active]===null?kind==='start'?d.attendance==='present'?'시각 없음':attendanceText(d):kind==='execution'&&d.scheduled===false?'등원 일정 없음':kind==='execution'&&d.submission==='missing'?'미제출':'미확인':kind==='study'&&points[active]===0&&d.attendance==='absent'?'0분 · 결석':fmt(points[active])}</strong></div>{kind==='execution'?<><div><span>계획</span><strong>{compactMinutes(d.planned)}</strong></div><div><span>실제</span><strong>{compactMinutes(d.actual)}</strong></div></>:<div><span>요일 평균</span><strong>{fmt(reference[active])}</strong></div>}</div>}</div>
 </figure>
}

export function CareStudentMetrics({review}:{review:WeeklyReview}){
 const find=(type:string)=>review.metrics.find(m=>m.type===type)
 const section=(type:string,title:string,content:ReactNode)=>{const m=find(type);return <section className="cm-card" data-attention={m?.attention}><header><h3>{title}</h3>{m&&<span>{type==='START_TIME_SHIFT'?displayClock(m.current):type==='STUDY_DROP'?compactMinutes(m.current):m.current===null?'—':`${Math.round(m.current)}%`}{m.before!==null&&<small>기준 {type==='START_TIME_SHIFT'?displayClock(m.before):type==='STUDY_DROP'?compactMinutes(m.before):`${Math.round(m.before)}%`}</small>}</span>}</header>{content}</section>}
 const subjects=find('SUBJECT_SHARE')?.view
 return <div className="cm-student-metrics"><div className="cm-period">{dateText(review.days[0].date)}–{dateText(review.asOf)} · 최근 7일 <span>비교 {dateText(review.baselineFrom)}–{dateText(review.baselineTo)}</span></div>
  <section className="cm-card cm-status-card"><h3>출결·계획 제출</h3><table><thead><tr>{review.days.map(d=><th key={d.date}>{dateText(d.date)}<small>{weekdayText(d.date)}</small></th>)}</tr></thead><tbody><tr aria-label="출결">{review.days.map(d=><td key={d.date} data-state={d.attendance}>{attendanceText(d)}</td>)}</tr><tr aria-label="계획 제출">{review.days.map(d=><td key={d.date} data-state={d.submission==='submitted'?'submitted':d.scheduled===false?'excluded':d.submission}>{submissionText(d)}</td>)}</tr></tbody></table></section>
  {section('STUDY_DROP','학습 시간',<TimelineChart snapshot={review} kind="study"/>)}
  {section('START_TIME_SHIFT','입실 시각',<TimelineChart snapshot={review} kind="start"/>)}
  {section('EXECUTION_GAP','계획 대비 진행률',<TimelineChart snapshot={review} kind="execution"/>)}
  {subjects?.kind==='share'&&<section className="cm-card"><h3>과목별 계획·실제 비중</h3><SubjectAllocation subjects={subjects.subjects}/></section>}
 </div>
}
