import { groupChartDays, planRate, type ChartPeriod } from '../../model/chartPeriods.ts'
import type { CareSnapshotMetric } from '../../model/careSnapshot.ts'
import { formatMetricValue } from '../../model/metricComparison.ts'
import { addDays } from '../../model/format.ts'
import { DailyStateStrip, type DailyStateCell } from './DailyStateStrip.tsx'

interface Props {metric:CareSnapshotMetric;asOf:string;period:ChartPeriod;from:string;to:string}
export function PeriodMetricPlot({metric,asOf,period,from,to}:Props) {
 const {view}=metric
 const visible=<T extends {date:string},>(days:T[])=>days.filter(day=>day.date>=from && day.date<=to)
 const dates=Array.from({length:Math.round((Date.parse(to)-Date.parse(from))/86400000)+1},(_,index)=>addDays(from,index))
 if(view.kind==='weekly' && view.unit==='count') {
  const days:DailyStateCell[]=dates.map(date=>{
   const day=view.calendar?.find(item=>item.date===date)
   const state=!day?'unknown':day.skip?'excluded':day.came?'present':'absent'
   return {date,state,label:state==='unknown'?'기록 없음':state==='excluded'?'제외':state==='present'?'입실':'미입실',detail:state==='present'&&day?.start!==null&&day?.start!==undefined?formatMetricValue(day.start,'clock'):undefined}
  })
  return <DailyStateStrip days={days} label="날짜별 입실 상태"/>
 }
 if(view.kind==='dateList'||view.kind==='strip') {
  const days:DailyStateCell[]=dates.map(date=>{
   const day=view.days.find(item=>item.date===date)
   const state=!day||day.state==='off'?'unknown':day.state==='skip'?'excluded':day.state==='ok'?'submitted':'missing'
   return {date,state,label:state==='unknown'?'기록 없음':state==='excluded'?'제외':state==='submitted'?'제출':'미제출'}
  })
  return <DailyStateStrip days={days} label="날짜별 계획 제출 상태"/>
 }
 if(view.kind==='share') return <figure className="sc-trends-share"><figcaption>계획 → 실제 · 최근 7일</figcaption>{view.subjects.map(subject=><div className="sc-trends-subject" key={subject.name}><span>{subject.name}</span><div className="sc-trends-share-bars" aria-hidden="true"><i style={{width:`${subject.plan}%`}}/><i style={{width:`${subject.actual}%`}}/></div><strong>{subject.plan}% → {subject.actual}%</strong></div>)}</figure>
 if(view.kind==='line') {
  const groups=groupChartDays(dates.map(date=>({date,value:view.days.find(day=>day.date===date)?.value??null})),asOf,period).map(group=>{
   const values=group.days.flatMap(day=>day.value===null?[]:[day.value])
   return {...group,value:values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
  })
  const known=groups.flatMap(group=>group.value===null?[]:[group.value])
  const minimum=Math.max(0,Math.floor(Math.min(view.usual,...known)/60)*60-30)
  const maximum=Math.min(1440,Math.ceil(Math.max(view.usual,...known)/60)*60+30)
  const position=(value:number)=>(value-minimum)/(maximum-minimum)*100
  return <div className="sc-clock-chart" aria-label="입실 시각 점 비교">
   <div className="sc-clock-axis"><span>{formatMetricValue(minimum,'clock')}</span><span>{formatMetricValue(maximum,'clock')}</span></div>
   {groups.map(group=><div className="sc-period-row" key={group.key}><span>{group.label}{period==='month'&&<small>{group.range}</small>}</span><div className="sc-clock-track" aria-hidden="true"><i className="sc-clock-reference" style={{left:`${position(view.usual)}%`}}/>{group.value!==null&&<><i className="sc-clock-gap" style={{left:`${Math.min(position(view.usual),position(group.value))}%`,width:`${Math.abs(position(group.value)-position(view.usual))}%`}}/><i className="sc-clock-dot" style={{left:`${position(group.value)}%`}}/></>}</div><strong>{formatMetricValue(group.value,'clock')}</strong></div>)}
   <p className="sc-period-key">┊ 이전 3주 평균 {formatMetricValue(view.usual,'clock')}</p>
  </div>
 }
 if(view.kind==='planActual') {
  const groups=groupChartDays(visible(view.days),asOf,period).map(group=>({...group,value:planRate(group.days),coverage:group.days.filter(day=>!day.off&&day.planned>0).length}))
  return <div className="sc-execution-chart" aria-label="계획 대비 학습 시간 비율"><div className="sc-rate-axis"><span>0%</span><span>계획 100%</span></div>
   {groups.map(group=><div className="sc-period-row" key={group.key}><span>{group.label}{period==='month'&&<small>{group.range}</small>}</span><div className="sc-rate-track" aria-hidden="true">{group.value!==null&&<i style={{width:`${group.value}%`}}/>}</div><strong>{formatMetricValue(group.value,'percent')}</strong></div>)}
   <p className="sc-period-key"><i/>달성 <i className="is-gap"/>미달 <span>계획 기록 {groups.reduce((sum,g)=>sum+g.coverage,0)}일</span></p>
  </div>
 }
 if(view.kind==='weekly') {
  const raw=view.unit==='minutes'?view.daily:view.calendar
  const groups=groupChartDays(visible(raw??[]),asOf,period).map(group=>({...group,value:group.days.some(day=>!day.skip)?group.days.reduce((sum,day)=>sum+(day.skip?0:view.unit==='minutes'?day.minutes:day.came?1:0),0):null}))
  const maximum=Math.max(...groups.flatMap(group=>group.value===null?[]:[group.value]),1)
  return <div className="sc-period-bars" aria-label={`${metric.label} 기간별 비교`}>
   <div className="sc-time-columns">{groups.map(group=><div className="sc-time-column" key={group.key}><strong>{formatMetricValue(group.value,'minutes')}</strong><div className="sc-time-column-track" aria-hidden="true">{group.value!==null&&<i style={{height:`${group.value/maximum*100}%`}}/>}</div><span>{group.label}{period==='month'&&<small>{group.range}</small>}</span></div>)}</div>
   <p className="sc-period-key">{period==='day'?'일간 합계':period==='week'?'주간 합계':'선택 기간 합계'}</p>
  </div>
 }
 return null
}
