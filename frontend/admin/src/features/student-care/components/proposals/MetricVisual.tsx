import { attendanceLabel, submissionLabel, type CareSnapshot, type CareSnapshotMetric } from '../../model/careSnapshot.ts'
import { formatMetricValue } from '../../model/metricComparison.ts'
import { shortDate } from '../../model/format.ts'
import { mark } from './stateMark.ts'

export function StateTimeline({snapshot,submission=false,mini=false}:{snapshot:CareSnapshot;submission?:boolean;mini?:boolean}) {
 return <div className={`cp-states${mini?' cp-mini-states':''}`} aria-label={submission?'날짜별 계획 제출':'날짜별 입실'}>
  {(mini?snapshot.days.slice(-7):snapshot.days).map(day=>{const state=submission?day.submission:day.attendance;return <span key={day.date} className={`cp-state is-${state}`} title={`${shortDate(day.date)} ${submission?submissionLabel(day.submission):attendanceLabel(day.attendance)}`}><small>{shortDate(day.date)}</small><b>{mark(state)}</b></span>})}
 </div>
}

/** 공통 날짜축. 시간량은 0 기준, 시각은 HH:mm 축, 계획은 실제와 같은 시간 눈금이다. */
export function MetricVisual({metric,snapshot,mini=false,scale}:{metric:CareSnapshotMetric;snapshot:CareSnapshot;mini?:boolean;scale?:{min:number;max:number}}) {
 const {view}=metric
 if(metric.type==='CONSECUTIVE_ABSENCE'||metric.type==='PLAN_MISSING') return <StateTimeline snapshot={snapshot} submission={metric.type==='PLAN_MISSING'} mini={mini}/>
 if(view.kind==='share') return <div className={`cp-subjects${mini?' cp-mini-subjects':''}`} aria-label="과목별 계획과 실제 비율">
  {!mini&&<div className="cp-subject-axis"><span>계획 ○</span><span>실제 ●</span><span>0–100%</span></div>}
  {view.subjects.filter(subject=>!mini||subject.name===view.worst).map(subject=><div className="cp-subject" key={subject.name}><span>{subject.name}</span><div className="cp-subject-track" aria-hidden="true"><i style={{left:`${Math.min(subject.plan,subject.actual)}%`,width:`${Math.abs(subject.plan-subject.actual)}%`}}/><b style={{left:`${subject.plan}%`}}/><em style={{left:`${subject.actual}%`}}/></div><strong>{subject.plan}% / {subject.actual}%</strong></div>)}
 </div>
 const clock=view.kind==='line', paired=view.kind==='planActual'
 const days=snapshot.days
 const values=days.flatMap(day=>clock?(day.attendance==='present'&&day.start!==null?[day.start]:[]):[day.minutes??0,paired?day.planned??0:0])
 const usual=clock?view.usual:0
 const low=scale?.min??(clock?Math.max(0,Math.floor(Math.min(usual,...values)/60)*60-30):0)
 const high=scale?.max??(clock?Math.min(1440,Math.ceil(Math.max(usual,...values)/60)*60+30):Math.max(60,Math.ceil(Math.max(0,...values)/60)*60))
 const width=600,height=mini?65:120,left=mini?4:49,right=mini?596:590,top=mini?5:12,bottom=mini?56:88
 const x=(i:number)=>left+(right-left)/days.length*(i+.5)
 const y=(value:number)=>bottom-(value-low)/(high-low)*(bottom-top)
 const bw=(right-left)/days.length*.58
 return <svg className={`cp-timechart${mini?' is-mini':''}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${metric.label} · ${shortDate(days[0].date)}–${shortDate(days.at(-1)!.date)}`}>
  {!mini&&[low,high].map(value=><g key={value}><line className="cp-gridline" x1={left} x2={right} y1={y(value)} y2={y(value)}/><text x={left-8} y={y(value)+4} textAnchor="end">{clock?formatMetricValue(value,'clock'):`${Math.round(value/60*10)/10}h`}</text></g>)}
  {clock&&<line className="cp-reference" x1={left} x2={right} y1={y(usual)} y2={y(usual)}/>}
  {days.map((day,i)=>{
   const value=clock?(day.attendance==='present'?day.start:null):day.minutes
   return <g key={day.date} className="cp-observation"><title>{shortDate(day.date)} · {formatMetricValue(value,clock?'clock':'minutes')}{paired?` · 계획 ${formatMetricValue(day.planned,'minutes')}`:''}</title>
    {paired&&day.planned!==null&&<rect className="cp-plan" x={x(i)-bw*.7} y={y(day.planned)} width={bw*1.4} height={bottom-y(day.planned)}/>}
    {value===null?<text className="cp-no-record" x={x(i)} y={bottom-3} textAnchor="middle">·</text>:clock?<circle className="cp-actual" cx={x(i)} cy={y(value)} r={mini?3:3.5}/>:<rect className="cp-actual" x={x(i)-bw/2} y={y(value)} width={bw} height={Math.max(0,bottom-y(value))} rx="1"/>}
    {!mini&&(i===0||i===days.length-1||i===Math.floor(days.length/2))&&<text x={x(i)} y="110" textAnchor="middle">{shortDate(day.date)}</text>}
   </g>
  })}
 </svg>
}
