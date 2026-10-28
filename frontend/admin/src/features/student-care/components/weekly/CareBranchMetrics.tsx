import {useId,useState,type CSSProperties} from 'react'
import {studentCareApi} from '../../api/studentCareApi.ts'
import type {CareApi} from '../../api/httpStudentCareApi.ts'
import {loadCareRoster,type CareRosterRow} from '../../api/loadCareRoster.ts'
import {branchDistribution} from '../../model/branchDistribution.ts'
import {attendanceText,compactMinutes,displayClock,dateText,weekdayText,relativeStarts,studentColor} from '../../model/careDisplay.ts'
import {useRemote,loadFailure} from '../../model/useRemote.ts'
import {SubjectAllocation} from './CareStudentMetrics.tsx'
import {BranchCareQueue} from './BranchCareQueue.tsx'
import './CareMetrics.css'
import {usePlotWidth} from './usePlotWidth.ts'
import {useTooltipSize} from './useTooltipSize.ts'
import {tooltipPlacement} from '../../model/tooltipPlacement.ts'

type Row=CareRosterRow
const average=(values:(number|null)[])=>{const valid=values.filter((v):v is number=>v!==null);return valid.length?valid.reduce((s,v)=>s+v,0)/valid.length:null}

function BranchChart({rows,relative=false,selected,setSelected,onOpenStudent}:{rows:Row[];relative?:boolean;selected:string[];setSelected:(value:string[]|((previous:string[])=>string[]))=>void;onOpenStudent:(id:string)=>void}){
 const tipId=useId()
 const [plotRef,width]=usePlotWidth()
 const [hover,setHover]=useState<number|null>(null),[dateIndex,setDateIndex]=useState(-1)
 const [tipRef,tipHeight]=useTooltipSize(hover)
 const points=rows.map(row=>({id:row.student.studentId,name:row.student.studentName,values:relative?relativeStarts(row.review.days,row.review.weekdayBaseline):row.review.days.map(d=>d.minutes)}))
 const students=points.map((p,j)=>({...p,days:rows[j].review.days.map((d,i)=>({date:d.date,minutes:p.values[i],start:null}))}))
 const dist=branchDistribution(students,'minutes'),dates=dist.map(d=>d.date)
 const focus=selected.length?undefined:rows.find(r=>r.priority===1&&r.review.metrics.some(m=>m.attention&&(relative?m.type==='START_TIME_SHIFT':['STUDY_DROP','CONSECUTIVE_ABSENCE','EXECUTION_GAP'].includes(m.type))))
 const focusPoint=focus?points.find(p=>p.id===focus.student.studentId):undefined
 const visiblePoints=points.filter(p=>selected.includes(p.id)||p.id===focusPoint?.id)
 const all=[...dist.flatMap(d=>[d.mean,d.q25,d.q75]),...visiblePoints.flatMap(p=>p.values)].filter((v):v is number=>v!==null)
 const bound=relative?Math.max(60,Math.ceil(Math.max(...all.map(Math.abs),0)/60)*60):Math.max(120,Math.ceil(Math.max(...all,0)/120)*120)
 const tipWidth=width<420?168:240
 const left=width<400?48:56,step=(width-left-20)/6
 const min=relative?-bound:0,max=bound,x=(i:number)=>left+i*step,y=(v:number)=>200-(v-min)/(max-min)*160
 const color=studentColor
 const format=(v:number|null)=>v===null?'—':relative?`${v>0?'+':''}${Math.round(v)}분`:compactMinutes(v)
 const toggle=(id:string)=>setSelected(s=>s.includes(id)?s.filter(v=>v!==id):[...s,id])
 const line=(vs:(number|null)[],cls:string,c:string)=><g className={cls} style={{stroke:c,fill:c}}>{vs.map((v,i)=>v===null?null:<g key={i}>{i>0&&vs[i-1]!==null&&<line x1={x(i-1)} x2={x(i)} y1={y(vs[i-1]!)} y2={y(v)}/>}<circle cx={x(i)} cy={y(v)} r={cls==='cm-branch-mean'?4:5.5}/></g>)}</g>
 const active=hover===null?null:dist[hover]
 return <section className="cm-card cm-branch-chart" onKeyDown={e=>{if(e.key==='Escape')setHover(null)}}><header><h3>{relative?'평소보다 늦은 입실':'학습 시간'}</h3><span>{relative?'본인의 요일 평균 대비':'최근 7일'}</span></header>
  <div className="cm-chart-key"><span><i/>학습관 평균</span><span title="기록 있는 학생 값의 25~75백분위 범위"><i className="cm-key-band"/>중간 50%</span>{focusPoint&&<button type="button" className="cm-care-link" onClick={()=>onOpenStudent(focusPoint.id)} aria-label={`${focusPoint.name} 상담 상세`}><i/>{focusPoint.name} · 상담 필요 →</button>}{relative&&<span>+ 늦음 · − 빠름</span>}</div>
  <div className="cm-branch-layout"><div className="cm-plot" ref={plotRef} onMouseLeave={()=>setHover(null)}><svg viewBox={`0 0 ${width} ${width<420?300:272}`} role="group" aria-label={relative?'학생별 평소 입실 대비 변화':'학습관 7일 학습 시간 분포'}>
   {[min,(min+max)/2,max].map(v=><g className="cm-grid" key={v}><line x1={left} x2={width-20} y1={y(v)} y2={y(v)}/><text x={left-8} y={y(v)+5} textAnchor="end">{relative?`${v>0?'+':''}${Math.round(v)}분`:`${Number((v/60).toFixed(1))}h`}</text></g>)}
   <g className="cm-band">{dist.map((d,i)=>d.q25!==null&&d.q75!==null&&dist[i+1]?.q25!==null&&dist[i+1]?.q25!==undefined&&dist[i+1]?.q75!==null?<polygon key={d.date} points={`${x(i)},${y(d.q25)} ${x(i+1)},${y(dist[i+1].q25!)} ${x(i+1)},${y(dist[i+1].q75!)} ${x(i)},${y(d.q75)}`}/>:null)}</g>
   {line(dist.map(d=>d.mean),'cm-branch-mean','var(--color-accent)')}
   {focusPoint&&line(focusPoint.values,'cm-care-line','var(--color-flag)')}
   {selected.filter(id=>points.some(p=>p.id===id)).map(id=>line(points.find(p=>p.id===id)!.values,'cm-selected-line',color(id)))}
   {hover!==null&&<line className="cm-guide" x1={x(hover)} x2={x(hover)} y1="30" y2="204"/>}
   {dist.map((d,i)=><g className="cm-day-target" key={d.date} role="button" tabIndex={0} aria-label={`${dateText(d.date)} 학생별 값`} aria-describedby={hover===i?tipId:undefined} onMouseEnter={()=>setHover(i)} onFocus={()=>setHover(i)} onBlur={()=>setHover(null)} onClick={()=>setDateIndex(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setDateIndex(i)}}}><rect x={Math.max(0,x(i)-step/2)} y="25" width={Math.min(step,width-x(i)+step/2)} height="225" fill="transparent"/><text x={x(i)} y="230" textAnchor="middle">{width<420?<><tspan x={x(i)}>{Number(d.date.slice(8))}</tspan></>:dateText(d.date)}</text><text className="cm-weekday" x={x(i)} y="252" textAnchor="middle">{weekdayText(d.date)}</text></g>)}
   {width<420&&[...new Set(dates.map(d=>d.slice(0,7)))].map(month=>{const indices=dates.flatMap((d,i)=>d.startsWith(month)?[i]:[]);return <text className="cm-month" key={month} x={indices.reduce((sum,i)=>sum+x(i),0)/indices.length} y="279" textAnchor="middle">{Number(month.slice(5))}월</text>})}
  </svg>{active&&hover!==null&&<div role="tooltip" ref={tipRef} id={tipId} className="cm-tooltip" style={{width:tipWidth,...tooltipPlacement({width,boxWidth:tipWidth,boxHeight:tipHeight,left,bottom:200,anchor:{x:x(hover),y:active.mean===null?120:y(active.mean)},series:[dist.map(d=>d.mean),...visiblePoints.map(p=>p.values)].map(vs=>vs.map((v,i)=>v===null?null:{x:x(i),y:y(v)}))})}}><b>{dateText(active.date)} ({weekdayText(active.date)})</b><div><span>평균</span><strong>{format(active.mean)}</strong></div>{focusPoint&&<div><span>{focusPoint.name}</span><strong>{format(focusPoint.values[hover])}</strong></div>}{selected.filter(id=>points.some(p=>p.id===id)).slice(0,3).map(id=><div key={id}><span >{points.find(p=>p.id===id)!.name}</span><strong>{format(points.find(p=>p.id===id)!.values[hover])}</strong></div>)}{selected.length>3&&<div><span>추가 선택</span><strong>{selected.length-3}명</strong></div>}</div>}</div>
  <aside className="cm-student-picker"><header><b>학생 비교</b><select aria-label={`${relative?'입실 변화':'학습 시간'} 비교 날짜`} value={dateIndex} onChange={e=>setDateIndex(Number(e.target.value))}><option value={-1}>7일 평균</option>{dates.map((d,i)=><option key={d} value={i}>{dateText(d)} ({weekdayText(d)})</option>)}</select></header>
   {rows.map((r,i)=>{const id=r.student.studentId,d=r.review.days[dateIndex],v=dateIndex<0?average(points[i].values):points[i].values[dateIndex],rawStart=dateIndex<0?average(r.review.days.map(day=>day.start)):d.start;return <button type="button" key={id} aria-label={`${r.student.studentName} 비교`} aria-description={format(v)} aria-pressed={selected.includes(id)} onClick={()=>toggle(id)} style={{'--student-color':color(id)} as CSSProperties}><i/>{r.student.studentName}{r.priority<=1&&<span className="cm-care-tag">{r.priority===0?'확인일':'상담'}</span>}<strong>{v===null?d?attendanceText(d):'미확인':format(v)}</strong>{relative&&rawStart!==null&&<small>{displayClock(rawStart)}</small>}</button>})}
   {selected.length>0&&<button className="cm-clear" onClick={()=>setSelected([])}>선택 해제</button>}
  </aside></div>
 </section>
}

function BranchAttendance({rows,onOpenStudent}:{rows:Row[];onOpenStudent:(id:string)=>void}){
 const [dayIndex,setDayIndex]=useState<number|null>(null),[hover,setHover]=useState<number|null>(null)
 const dates=rows[0].review.days.map(d=>d.date)
 const totals=(index:number,plan:boolean)=>{const ds=rows.map(r=>r.review.days[index]);const good=ds.filter(d=>plan?d.submission==='submitted':d.attendance==='present').length,bad=ds.filter(d=>plan?d.submission==='missing':d.attendance==='absent').length;return {good,bad,other:rows.length-good-bad}}
 return <section className="cm-card cm-attendance"><header><h3>입실·계획 제출</h3><span>전체 {rows.length}명</span></header><div className="cm-chart-key"><span><i/>입실</span><span><i className="cm-key-plan"/>계획 제출</span><span><i className="cm-key-outlier"/>결석·미제출</span><span><i className="cm-key-base"/>미확인·일정 없음</span></div>
  <div className="cm-attendance-days" onMouseLeave={()=>setHover(null)}>{dates.map((date,index)=>{const attendance=totals(index,false),plan=totals(index,true);return <div className="cm-attendance-day" key={date} onClick={()=>setDayIndex(index)}>
   <button type="button" className="cm-attendance-bars" aria-label={`${dateText(date)} 입실 ${attendance.good}명 결석 ${attendance.bad}명 계획 제출 ${plan.good}명 미제출 ${plan.bad}명`} onMouseEnter={()=>setHover(index)} onFocus={()=>setHover(index)} onBlur={()=>setHover(null)} onKeyDown={e=>{if(e.key==='Escape')setHover(null)}} onClick={()=>setDayIndex(index)}>
    {[attendance,plan].map((v,j)=><span className={`cm-stack cm-stack-${j}`} key={j}><b>{v.good}/{rows.length}</b><span style={{height:`${v.other/rows.length*100}%`}}/><span className="cm-stack-bad" style={{height:`${v.bad/rows.length*100}%`}}/><span className="cm-stack-good" style={{height:`${v.good/rows.length*100}%`}}/></span>)}
   </button><b>{dateText(date)}</b><small>{weekdayText(date)}</small>{hover===index&&<div role="tooltip" className="cm-tooltip" style={{left:`clamp(0px, ${(index+.5)/7*100-15}%, calc(100% - 248px))`}}><b>{dateText(date)}</b><div><span>입실 / 결석</span><strong>{attendance.good} / {attendance.bad}명</strong></div><div><span>제출 / 미제출</span><strong>{plan.good} / {plan.bad}명</strong></div><div><span>출결 미확인·일정 없음</span><strong>{attendance.other}명</strong></div></div>}</div>})}</div>
  {dayIndex!==null&&<div className="cm-absentees"><b>{dateText(dates[dayIndex])} 결석·미제출</b>{rows.filter(r=>r.review.days[dayIndex].attendance==='absent'||r.review.days[dayIndex].submission==='missing').map(r=><button key={r.student.studentId} onClick={()=>onOpenStudent(r.student.studentId)}>{r.student.studentName}<span>{r.review.days[dayIndex].attendance==='absent'?'결석 ':''}{r.review.days[dayIndex].submission==='missing'?'미제출':''}</span></button>)}</div>}
 </section>
}

export function CareBranchMetrics({api=studentCareApi,branchId,version,onOpenStudent}:{api?:CareApi;branchId:string;version:number;onOpenStudent:(id:string)=>void}){
 const [selected,setSelected]=useState<string[]>([])
 const remote=useRemote(`care5-branch/${branchId}`,()=>loadCareRoster(api,branchId),version)
 if(loadFailure(remote))return <p role="alert">학습관 기록을 불러오지 못했습니다. <button onClick={remote.reload}>다시 시도</button></p>
 if(!remote.data)return <p role="status">학습관 기록 불러오는 중</p>
 const rows=remote.data.rows
 if(!rows.length)return <p>등록된 학생이 없습니다.</p>
 const subjectRows=rows.flatMap(r=>{const v=r.review.metrics.find(m=>m.type==='SUBJECT_SHARE')?.view;return v?.kind==='share'?v.subjects:[]})
 const subjects=[...new Set(subjectRows.map(s=>s.name))].map(name=>{const ss=subjectRows.filter(s=>s.name===name);return {name,plan:average(ss.map(s=>s.plan))??0,actual:average(ss.map(s=>s.actual))??0}})
 return <section className="cm-branch"><header className="cm-branch-heading"><h2>{remote.data.board.branch.name}</h2><span>{rows.length}명 · {dateText(rows[0].review.days[0].date)}–{dateText(rows[0].review.asOf)}</span></header><BranchCareQueue board={remote.data.board} onOpenStudent={onOpenStudent}/><BranchChart rows={rows} selected={selected} setSelected={setSelected} onOpenStudent={onOpenStudent}/><BranchAttendance rows={rows} onOpenStudent={onOpenStudent}/><BranchChart rows={rows} relative selected={selected} setSelected={setSelected} onOpenStudent={onOpenStudent}/>{subjects.length>0&&<section className="cm-card"><h3>과목별 계획·실제 비중</h3><SubjectAllocation subjects={subjects}/></section>}</section>
}
