import { useEffect, useRef } from 'react'
import { attendanceLabel, submissionLabel, type CareSnapshot, type CareSnapshotMetric, type DailyCareRecord } from '../../model/careSnapshot.ts'
import { formatMetricValue } from '../../model/metricComparison.ts'
import { shortDate } from '../../model/format.ts'
import { DailyMetricChart } from '../designs/DailyMetricChart.tsx'
import type { WeeklyReview, WeekDay } from '../../model/weeklyReviewTypes.ts'

export function RecordDialog({name,item,snapshot,onClose}:{name:string;item:CareSnapshotMetric|DailyCareRecord;snapshot:CareSnapshot&Partial<Pick<WeeklyReview,'baselineFrom'|'baselineTo'>>;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{dialog.current?.showModal()},[])
  const daily='date' in item, metric=daily?null:item
  const days=daily?[item]:snapshot.days
  const chart=metric && ['STUDY_DROP','START_TIME_SHIFT','EXECUTION_GAP'].includes(metric.type)
  const values=snapshot.days.flatMap(day=>metric?.type==='START_TIME_SHIFT'?(day.start===null?[]:[day.start]):[day.minutes??0,day.planned??0])
  const clock=metric?.type==='START_TIME_SHIFT'
  const low=clock?Math.max(0,Math.floor(Math.min(...values,metric?.before??1440)/60)*60-30):0
  const high=clock?Math.min(1440,Math.ceil(Math.max(...values,metric?.before??0)/60)*60+30):Math.max(60,Math.ceil(Math.max(...values)/60)*60)
  return <dialog ref={dialog} className="bl-dialog" aria-labelledby="bl-dialog-title" onClose={onClose}>
    <header><h2 id="bl-dialog-title">{name} · {daily?shortDate(item.date):item.label}</h2><button type="button" className="sc-button" autoFocus onClick={()=>dialog.current?.close()}>닫기</button></header>
    {snapshot.baselineFrom&&snapshot.baselineTo&&<p>비교 기준 {snapshot.baselineFrom}–{snapshot.baselineTo} · 표시 기간 이전 28일</p>}
    {metric?.view.kind==='share'?<><p>최근 7일 · 일별 과목 기록 없음</p><table><thead><tr><th>과목</th><th>계획 비율</th><th>실제 비율</th><th>차이</th></tr></thead><tbody>{metric.view.subjects.map(s=><tr key={s.name}><th>{s.name}</th><td>{s.plan}%</td><td>{s.actual}%</td><td>{s.actual-s.plan>0?'+':''}{s.actual-s.plan}%p</td></tr>)}</tbody></table></>:<>
      <p>{shortDate(days[0].date)}–{shortDate(days.at(-1)!.date)} · {days.length}일</p>
      {chart&&metric&&Array.from({length:Math.ceil(days.length/7)},(_,i)=><DailyMetricChart key={i} metric={metric} days={days.slice(i*7,i*7+7)} readable bounds={{min:low,max:high}}/>)}
      <div className="bl-record-scroll"><table><thead><tr><th>날짜</th><th>입실</th><th>계획 제출</th><th>입실 시각</th><th>학습 시간</th><th>계획 시간</th></tr></thead><tbody>{days.map(day=><tr key={day.date}><th>{shortDate(day.date)}</th><td>{day.attendance==='present'?'입실':(day as Partial<WeekDay>).scheduled===false?'입실 기록 없음':attendanceLabel(day.attendance)}</td><td>{submissionLabel(day.submission)}</td><td>{formatMetricValue(day.start,'clock')}</td><td>{formatMetricValue(day.minutes,'minutes')}</td><td>{formatMetricValue(day.planned,'minutes')}</td></tr>)}</tbody></table></div>
    </>}
  </dialog>
}
