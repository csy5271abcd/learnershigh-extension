import {useId,useState} from 'react'
import type {CareRosterRow} from '../../api/loadCareRoster.ts'
import {personalDistribution,type PersonalDistributionKind,type PersonalPoint} from '../../model/personalDistribution.ts'
import {compactMinutes,dateText,displayClock,studentColor,weekdayText} from '../../model/careDisplay.ts'
import {usePlotWidth} from './usePlotWidth.ts'
import {useTooltipSize} from './useTooltipSize.ts'
import {tooltipPlacement} from '../../model/tooltipPlacement.ts'

const delta=(v:number,unit:string)=>`${v>0?'+':v<0?'−':''}${Math.abs(Number(v.toFixed(1)))}${unit}`
export function BranchDistributionChart({rows,kind,excluded,selected,threshold,onDeselect,onStudent,onDate,onAll}:{rows:CareRosterRow[];kind:PersonalDistributionKind;excluded:string[];selected:string[];threshold:number;onDeselect:(id:string)=>void;onStudent:(id:string)=>void;onDate:(date:string)=>void;onAll:()=>void}){
 const [showMeaning,setShowMeaning]=useState(false)
 const [ref,width]=usePlotWidth(),[hover,setHover]=useState<{index:number;point:PersonalPoint|null}|null>(null)
 const days=personalDistribution(rows,kind,excluded,threshold),unit=kind==='study'?'%':'분',id=useId()
 const [tipRef,tipHeight]=useTooltipSize(hover?.index??null)
 const all=days.flatMap(d=>d.points.map(p=>p.value)),bottom=176,left=36,right=width<400?58:68
 const tipWidth=Math.min(230,width-right-left-12)
 const low=Math.min(-20,Math.floor(Math.min(...all,0)/20)*20),high=Math.max(20,Math.ceil(Math.max(...all,0)/20)*20)
 const step=(width-left-right)/7,x=(i:number)=>left+(i+.5)*step,y=(v:number)=>bottom-(v-low)/(high-low)*152
 const changedDays=(id:string)=>days.filter(d=>d.changed.some(p=>p.id===id)).length
 const flagged=[...new Map(days.flatMap(d=>d.changed.map(p=>[p.id,p] as const))).values()].sort((a,b)=>changedDays(b.id)-changedDays(a.id)||Math.abs(b.value)-Math.abs(a.value)||a.name.localeCompare(b.name))
 const colorIds=[...new Set([...selected,...flagged.slice(0,6).map(p=>p.id)])]
 const color=(id:string)=>colorIds.includes(id)?studentColor(`slot_${colorIds.indexOf(id)+1}`):'var(--color-flag)'
 const lineIds=[...new Set([...flagged.slice(0,6).map(p=>p.id),...selected])]
 const jitter=(id:string)=>((Number(id.match(/\d+$/)?.[0]??0)%5)-2)*2
 const bands=days.flatMap((day,i)=>i===0||day.q25===null||day.q75===null||days[i-1].q25===null||days[i-1].q75===null?[]:[`${x(i-1)},${y(days[i-1].q25!)} ${x(i)},${y(day.q25)} ${x(i)},${y(day.q75)} ${x(i-1)},${y(days[i-1].q75!)}`])
 const d=hover?days[hover.index]:null,p=hover?.point
 const anchors=days.map((day,i)=>day.mean===null?null:{x:x(i),y:y(day.mean)})
 const positions=flagged.slice(0,6).map((point,i)=>{
  let last=0;days.forEach((d,j)=>{if(d.changed.some(p=>p.id===point.id))last=j})
  const lastPoint=days[last].changed.find(p=>p.id===point.id)!
  return {point:lastPoint,index:last,labelY:36+i*23}
 })
 return <figure className="bov-distribution" onMouseLeave={()=>setHover(null)} onKeyDown={e=>{if(e.key==='Escape')setHover(null)}}>
  <div className="bov-distribution-key"><span><i className="bov-record-key"/>학생 기록</span><span><i className="bov-mean-key"/>평균 변화</span><span><i className="bov-band-key"/>학생 분포 · 중간 50%</span><button type="button" className="bov-meaning-button" aria-label={`${kind==='study'?'학습 감소':'입실 지연'} 표시 기준`} aria-expanded={showMeaning} onClick={()=>setShowMeaning(v=>!v)}><i className="bov-tail-key"/>{kind==='study'?'학습 감소':'입실 지연'}</button></div>
  {showMeaning&&<p className="bov-meaning">{kind==='study'?`최근 7일 중 입실한 날의 학습 시간이 본인의 같은 요일 평소보다 ${threshold}% 이상 줄어든 학생입니다.`:`최근 7일 중 본인의 같은 요일 평소보다 ${threshold}분 이상 늦은 입실이 있는 학생입니다.`}</p>}
  <div className="bov-distribution-unit">{kind==='study'?'본인 평소 대비 학습 시간(%)':'본인 평소 대비 입실 변화(분)'}</div>
  <div className="bov-plot" ref={ref}>{!all.length&&<p className="bov-empty" role="status">평소 기록과 비교할 수 있는 입실 기록이 없습니다.</p>}<svg viewBox={`0 0 ${width} 226`} style={!all.length?{display:'none'}:undefined} role="group" aria-label={`${kind==='study'?'학습 시간':'입실 변화'} 전체 학생 분포 그래프`}>
   {[low,0,high].filter((v,i,a)=>a.indexOf(v)===i).map(v=><g className="bov-grid" key={v}><line x1={left} x2={width-right} y1={y(v)} y2={y(v)} strokeDasharray={v===0?'4 3':undefined}/><text x={left-5} y={y(v)+4} textAnchor="end">{v>0?'+':''}{v}{kind==='study'?'%':''}</text></g>)}
   {bands.map((points,i)=><polygon className="bov-distribution-band" key={i} points={points}/>)}
   {days.map((day,i)=><g key={day.date}>
    <rect className="bov-distribution-date-hit" role="button" tabIndex={0} aria-label={`${dateText(day.date)} ${kind==='study'?'학습 시간':'입실 시각 변화'} 상세`} x={x(i)-step/2} y="10" width={step} height="174" fill="transparent" onMouseEnter={()=>setHover({index:i,point:null})} onFocus={()=>setHover({index:i,point:null})} onBlur={()=>setHover(null)} onClick={()=>onDate(day.date)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onDate(day.date)}}}/>
    {day.points.map(point=>{
     const outside=day.changed.some(p=>p.id===point.id),chosen=selected.includes(point.id)
     return <circle key={point.id} className={`bov-population-point ${outside?'bov-tail-point':''}`} data-student={point.id} cx={x(i)+jitter(point.id)} cy={y(point.value)} r={outside||chosen?4.5:2} style={chosen||outside?{fill:color(point.id),opacity:1}:undefined} role="button" tabIndex={outside||chosen?0:-1} aria-label={`${point.name} ${dateText(day.date)} ${delta(point.value,unit)}`} aria-describedby={p?.id===point.id?id:undefined} onMouseEnter={()=>setHover({index:i,point})} onFocus={()=>setHover({index:i,point})} onBlur={()=>setHover(null)} onClick={()=>onStudent(point.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onStudent(point.id)}}}/>
    })}
    {day.mean!==null&&<><line className="bov-distribution-mean" x1={i>0&&days[i-1].mean!==null?x(i-1):x(i)} x2={x(i)} y1={i>0&&days[i-1].mean!==null?y(days[i-1].mean!):y(day.mean)} y2={y(day.mean)}/><circle className="bov-distribution-mean-dot" cx={x(i)} cy={y(day.mean)} r="3.5"/></>}
    <g className="bov-date"><text x={x(i)} y="204" textAnchor="middle">{dateText(day.date)}</text><text className="bov-weekday" x={x(i)} y="220" textAnchor="middle">{weekdayText(day.date)}</text></g>
   </g>)}
   {lineIds.map(id=><g key={id} className={selected.includes(id)?'bov-selected-line':'bov-change-line'} style={{color:color(id)}}>{days.map((d,i)=>{const point=d.points.find(p=>p.id===id),prev=days[i-1]?.points.find(p=>p.id===id);return point&&prev?<line key={d.date} x1={x(i-1)+jitter(id)} x2={x(i)+jitter(id)} y1={y(prev.value)} y2={y(point.value)} pointerEvents="none"/>:null})}</g>)}
   {flagged.length>6&&<g className="bov-tail-name" role="button" tabIndex={0} aria-label={`변화 학생 ${flagged.length}명 전체 기록`} onClick={onAll} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onAll()}}}><text x={width-right+10} y="184">+{flagged.length-6}명</text></g>}
   {positions.map(({point,index,labelY})=><g className="bov-tail-name" role="button" tabIndex={0} key={point.id} aria-label={`${point.name} 변화 기록`} onMouseEnter={()=>setHover({index,point})} onFocus={()=>setHover({index,point})} onBlur={()=>setHover(null)} onClick={()=>onStudent(point.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onStudent(point.id)}}}><line x1={width-right+5} y1={labelY-4} x2={width-right+12} y2={labelY-4} style={{stroke:color(point.id),strokeWidth:3,opacity:1}}/><text x={width-right+17} y={labelY} style={{fill:color(point.id)}}>{point.name}</text></g>)}
  </svg>
  {d&&hover&&<div ref={tipRef} id={id} role="tooltip" className="bov-tooltip" style={{width:tipWidth,...tooltipPlacement({width:width-right,boxWidth:tipWidth,boxHeight:tipHeight,left,bottom,anchor:{x:x(hover.index),y:y(p?.value??d.mean??0)},series:[anchors]})}}><b>{dateText(d.date)} ({weekdayText(d.date)}){p?` · ${p.name}`:''}</b>
   {p?<><div><span>{kind==='study'?'학습 시간':'입실 시각'}</span><strong>{kind==='study'?compactMinutes(p.actual):displayClock(p.actual)}</strong></div><div><span>평소</span><strong>{kind==='study'?compactMinutes(p.usual):displayClock(p.usual)}</strong></div><div><span>변화</span><strong>{delta(p.value,unit)}</strong></div></>:<><div><span>평균 변화</span><strong>{d.mean===null?'—':delta(d.mean,unit)}</strong></div><div><span>학생 분포 · 중간 50%</span><strong>{d.q25===null?'—':`${delta(d.q25,unit)} ~ ${delta(d.q75!,unit)}`}</strong></div><div><span>확인된 학생</span><strong>{d.points.length}명</strong></div></>}
  </div>}
  </div>
  {selected.length>0&&<div className="bov-key">{rows.filter(r=>selected.includes(r.student.studentId)&&!excluded.includes(r.student.studentId)).map(r=><button type="button" key={r.student.studentId} onClick={()=>onDeselect(r.student.studentId)} aria-label={`${r.student.studentName} 그래프 비교 해제`}><i style={{background:color(r.student.studentId)}}/>{r.student.studentName} ×</button>)}</div>}
 </figure>
}
