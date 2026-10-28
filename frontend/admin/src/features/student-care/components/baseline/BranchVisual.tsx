import type { CareSnapshot, CareSnapshotMetric } from '../../model/careSnapshot.ts'
import { attendanceLabel, submissionLabel } from '../../model/careSnapshot.ts'
import { shortDate } from '../../model/format.ts'

export function BranchVisual({metric,snapshot,maxMinutes,clockBounds}:{metric:CareSnapshotMetric;snapshot:CareSnapshot;maxMinutes:number;clockBounds:{min:number;max:number}}){
 if(metric.type==='CONSECUTIVE_ABSENCE'||metric.type==='PLAN_MISSING') return <span className="bl-status-dots" aria-label="날짜별 상태">{snapshot.days.map(d=>{
  const state=metric.type==='CONSECUTIVE_ABSENCE'?d.attendance:d.submission
  const on=state==='present'||state==='submitted'
  const text=metric.type==='CONSECUTIVE_ABSENCE'?attendanceLabel(d.attendance):submissionLabel(d.submission)
  return <i key={d.date} data-on={on} data-state={state} title={`${shortDate(d.date)} ${text}`}>{state==='unknown'?'?':state==='excluded'?'–':on?'':'×'}</i>
 })}</span>
 const clock=metric.type==='START_TIME_SHIFT'
 return <svg viewBox="0 0 110 28" aria-hidden="true"><line x1="1" x2="109" y1="26" y2="26"/>{metric.type==='STUDY_DROP'?snapshot.days.map((d,i)=>d.minutes===null?null:<rect key={d.date} x={i*108/snapshot.days.length+1} y={26-d.minutes/maxMinutes*24} width={Math.max(1,108/snapshot.days.length-2)} height={Math.max(1,d.minutes/maxMinutes*24)}/>):clock?snapshot.days.map((d,i)=>d.start===null?null:<circle key={d.date} cx={i*108/snapshot.days.length+3} cy={25-(d.start-clockBounds.min)/(clockBounds.max-clockBounds.min)*22} r="2.5"/>):<>{metric.before!==null&&metric.current!==null&&<line x1={metric.before*1.05+2} x2={metric.current*1.05+2} y1="14" y2="14" style={{stroke:'var(--color-text-secondary)',strokeWidth:2}}/>}{metric.before!==null&&<circle cx={metric.before*1.05+2} cy="14" r="4" style={{fill:'var(--color-surface)',stroke:'var(--color-text-secondary)',strokeWidth:2}}/>}{metric.current!==null&&<circle cx={metric.current*1.05+2} cy="14" r="4"/>}</>}</svg>
}
