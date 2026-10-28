import { attendanceLabel, recentRecordAvailability, submissionLabel, type CareSnapshot, type CareSnapshotMetric, type DailyCareRecord } from '../../model/careSnapshot.ts'
import { formatMetricDelta, formatMetricValue } from '../../model/metricComparison.ts'
import { shortDate } from '../../model/format.ts'
import { MetricVisual } from './MetricVisual.tsx'
import { mark } from './stateMark.ts'

interface Props {
 snapshot:CareSnapshot
 onMetric:(metric:CareSnapshotMetric)=>void
 onDay:(day:DailyCareRecord)=>void
}

/** 입실·제출은 상태, 시간량은 날짜별 양, 시각은 점, 계획은 실제와의 비교다. */
export function MetricBoard({snapshot,onMetric,onDay}:Props) {
 const known=recentRecordAvailability(snapshot)
 const order=['CONSECUTIVE_ABSENCE','PLAN_MISSING','STUDY_DROP','START_TIME_SHIFT','EXECUTION_GAP','SUBJECT_SHARE']
 return <section className="cp-metric-board" aria-label="학생별 주요 지표">{order.map(type=>{
  const metric=snapshot.metrics.find(item=>item.type===type)!
  const attendance=type==='CONSECUTIVE_ABSENCE',submission=type==='PLAN_MISSING',state=attendance||submission
  const held=snapshot.deferred&&!state
  const available=attendance?known.attendanceDays:known.submissionDays
  const label=attendance?'입실':submission?'계획 제출':metric.label
  const view=metric.view
  const focused=view.kind==='share'?{...metric,view:{...view,subjects:view.subjects.filter(subject=>subject.name===view.worst)}}:metric
  return <article className={`cp-board-card${metric.attention&&!held?' is-attention':''}`} key={type} data-metric={type}>
   <header><h3>{label}</h3><button onClick={()=>onMetric(metric)} aria-label={`${metric.label} 상세 보기`}>{metric.view.kind==='share'?'전체 과목':'상세'} ↗</button></header>
   {state?<>
    <div className="cp-board-value"><strong>{!available?'기록 없음':attendance?`${snapshot.recent.attended}일 입실`:`${snapshot.recent.missingPlans}일 미제출`}</strong><span>최근 7일</span></div>
    <p className="cp-board-context">{!available?'집계할 기록 없음':attendance?`미입실 ${snapshot.recent.notEntered}일`:`제출 ${available-snapshot.recent.missingPlans}일`}</p>
    <div className="cp-board-days" aria-label={attendance?'입실 날짜별 상태':'계획 제출 날짜별 상태'}>{snapshot.days.slice(-7).map(day=>{
     const value=attendance?day.attendance:day.submission
     const text=attendance?attendanceLabel(day.attendance):submissionLabel(day.submission)
     return <button key={day.date} className={`cp-board-day is-${value}`} onClick={()=>onDay(day)} aria-label={`${shortDate(day.date)} ${text} 기록 보기`}><time dateTime={day.date}>{shortDate(day.date)}</time><b>{mark(value)}</b></button>
    })}</div>
    <p className="cp-board-key">✓ {attendance?'입실':'제출'}　× {attendance?'미입실':'미제출'}　· 제외　? 미기록</p>
   </>:<>
    <div className="cp-board-value"><strong>{held?'—':<>{metric.view.kind==='share'&&`${metric.view.worst} `}{formatMetricValue(metric.current,metric.unit)}</>}</strong><span className={metric.attention?'cp-alert':''}>{held?'학습 기록 부족':formatMetricDelta(metric)}</span></div>
    <p className="cp-board-context">{metric.currentLabel} · {metric.beforeLabel} {held?'—':formatMetricValue(metric.before,metric.unit)}</p>
    <MetricVisual metric={focused} snapshot={snapshot}/>
    {type!=='SUBJECT_SHARE'&&<p className="cp-board-key">{type==='START_TIME_SHIFT'?'┄ 이전 3주 평균 · 미입실일은 점 없음':type==='EXECUTION_GAP'?'□ 계획 시간　■ 실제 시간 · 계획 작성일 집계':`일별 · ${shortDate(snapshot.days[0].date)}–${shortDate(snapshot.asOf)}`}</p>}
   </>}
  </article>
 })}</section>
}
