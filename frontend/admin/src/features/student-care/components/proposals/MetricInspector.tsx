import { useEffect, useRef, useState } from 'react'
import { attendanceLabel, submissionLabel, type CareSnapshot, type CareSnapshotMetric, type DailyCareRecord } from '../../model/careSnapshot.ts'
import { formatMetricDelta, formatMetricValue } from '../../model/metricComparison.ts'
import { shortDate } from '../../model/format.ts'
import { DailyMetricChart } from '../designs/DailyMetricChart.tsx'
import { DateMatrix } from '../designs/RecordDesigns.tsx'
import { MetricVisual } from './MetricVisual.tsx'

interface Props {snapshot:CareSnapshot;onMetric:(metric:CareSnapshotMetric)=>void;onDay:(day:DailyCareRecord)=>void}
export function MetricInspector({snapshot,onMetric,onDay}:Props) {
 const [type,setType]=useState(snapshot.metrics.find(metric=>metric.attention)?.type??'STUDY_DROP')
 const chartRef=useRef<HTMLElement>(null)
 const [perChart,setPerChart]=useState(7)
 useEffect(()=>{const node=chartRef.current;if(!node)return;const observer=new ResizeObserver(entries=>setPerChart(entries[0].contentRect.width>=900?14:7));observer.observe(node);return()=>observer.disconnect()},[])
 const metric=snapshot.metrics.find(item=>item.type===type)!
 const period=snapshot.days.length,state=type==='CONSECUTIVE_ABSENCE'||type==='PLAN_MISSING'
 const clock=type==='START_TIME_SHIFT',paired=type==='EXECUTION_GAP'
 const values=snapshot.days.flatMap(day=>clock?(day.attendance==='present'&&day.start!==null?[day.start]:[]):[day.minutes??0,paired?day.planned??0:0])
 const reference=clock?metric.before??values[0]??0:0
 const bounds={min:clock?Math.max(0,Math.floor(Math.min(reference,...values)/60)*60-30):0,max:clock?Math.min(1440,Math.ceil(Math.max(reference,...values)/60)*60+30):Math.max(60,Math.ceil(Math.max(0,...values)/60)*60)}
 const chunks=Array.from({length:Math.ceil(period/perChart)},(_,index)=>snapshot.days.slice(index*perChart,index*perChart+perChart))
 return <div className="cp-inspector">
  <div className="cp-inspector-metrics" role="group" aria-label="학습 지표 선택">{snapshot.metrics.map(item=>{
   const held=snapshot.deferred&&!['CONSECUTIVE_ABSENCE','PLAN_MISSING'].includes(item.type)
   const missing=item.type==='PLAN_MISSING'
   return <button key={item.type} aria-pressed={type===item.type} onClick={()=>setType(item.type)} className={item.attention&&!held?'is-attention':''}><span>{missing?'계획 미제출':item.label}</span><strong>{held?'기록 부족':missing?`${snapshot.recent.missingPlans}일`:formatMetricValue(item.current,item.unit)}</strong><small>{item.type==='SUBJECT_SHARE'?'최근 7일 자료':`최근 ${period}일`}</small></button>
  })}</div>
  <section ref={chartRef} className="cp-inspector-detail" aria-label={`${metric.label} 기간 상세`}>
   <header><div><h3>{metric.label}</h3><p>{shortDate(snapshot.days[0].date)}–{shortDate(snapshot.asOf)} · {period}일{type==='STUDY_DROP'&&` · 입실 ${snapshot.recent.attended}일, 입실일 평균 ${formatMetricValue(snapshot.recent.minutesPerVisit,'minutes')}`}</p></div><button className="sc-button" onClick={()=>onMetric(metric)}>확대 ↗</button></header>
   <div className="cp-inspector-comparison"><strong>{formatMetricValue(metric.current,metric.unit)}</strong><span>{metric.beforeLabel} {metric.before===null?'':formatMetricValue(metric.before,metric.unit)}</span><b>{formatMetricDelta(metric)}</b></div>
   {state?<><div className="cp-inspector-days">{snapshot.days.map(day=>{const status=type==='PLAN_MISSING'?day.submission:day.attendance;const text=type==='PLAN_MISSING'?submissionLabel(day.submission):attendanceLabel(day.attendance);return <button key={day.date} className={`is-${status}`} onClick={()=>onDay(day)} aria-label={`${shortDate(day.date)} ${text} 기록 보기`}><time dateTime={day.date}>{shortDate(day.date)}</time><strong>{text}</strong>{type==='CONSECUTIVE_ABSENCE'&&day.attendance==='present'&&<small>{formatMetricValue(day.start,'clock')}</small>}</button>})}</div></>:metric.view.kind==='share'?<><p className="cp-inspector-source">과목별 원본은 최근 7일 자료만 있습니다.</p><MetricVisual metric={metric} snapshot={snapshot}/></>:<div className="cp-inspector-weeks">{chunks.map(days=><section className="cp-inspector-week" key={days[0].date}><h4>{shortDate(days[0].date)}–{shortDate(days.at(-1)!.date)}</h4><DailyMetricChart metric={metric} days={days} readable bounds={bounds} onDay={onDay}/></section>)}</div>}
   <details className="sc-daily-related"><summary>날짜별 기록표</summary><DateMatrix snapshot={snapshot} showPlan={paired}/></details>
  </section>
 </div>
}
