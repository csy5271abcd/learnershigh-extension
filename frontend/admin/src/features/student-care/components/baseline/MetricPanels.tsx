import { attendanceLabel, submissionLabel, type CareSnapshotMetric, type DailyCareRecord } from '../../model/careSnapshot.ts'
import { addDays, shortDate } from '../../model/format.ts'
import { formatMetricDelta, formatMetricValue } from '../../model/metricComparison.ts'
import type { CareVisualProps } from './types.ts'
import './MetricPanels.css'

const f = formatMetricValue
const chunks = (days: DailyCareRecord[]) => Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => days.slice(i * 7, i * 7 + 7))
const stateSymbol = { present: '●', absent: '○', submitted: '✓', missing: '×', unknown: '?', excluded: '／' }
const missingLabel = (day: DailyCareRecord) => day.attendance === 'excluded' ? '제외' : '기록 없음'
const percent = (value: number, max: number) => `${value / max * 100}%`

function StateCalendar({ days, submission, onDay }: { days: DailyCareRecord[]; submission: boolean; onDay: CareVisualProps['onDay'] }) {
  return <div className="bp-weeks">{chunks(days).map(week => <div className="bp-week" key={week[0].date}>
    <div className="bp-date-grid">{week.map(day => {
      const state = submission ? day.submission : day.attendance
      const label = submission ? submissionLabel(day.submission) : attendanceLabel(day.attendance)
      return <button type="button" className={`bp-state bp-state--${state}`} key={day.date} onClick={() => onDay(day)} aria-label={`${day.date} ${label} · 날짜 상세`}>
        <time dateTime={day.date}>{shortDate(day.date)}</time><b aria-hidden="true">{stateSymbol[state]}</b><span>{label}</span>
      </button>
    })}</div>
  </div>)}</div>
}

function DayColumns({ days, plan, onDay }: { days: DailyCareRecord[]; plan: boolean; onDay: CareVisualProps['onDay'] }) {
  const max = Math.max(60, ...days.flatMap(day => plan ? [day.planned ?? 0, day.actual ?? 0] : [day.minutes ?? 0]))
  const ceiling = Math.ceil(max / 60) * 60
  return <div className="bp-weeks"><p className="bp-key">0–{f(ceiling, 'minutes')} · 주별 공통 눈금</p>{chunks(days).map(week => <div className="bp-week" key={week[0].date}>
    <div className="bp-date-grid">{week.map(day => {
      const value = plan ? day.actual : day.minutes
      const label = value === null ? missingLabel(day) : f(value, 'minutes')
      return <button type="button" className="bp-column" key={day.date} onClick={() => onDay(day)} aria-label={`${day.date} ${plan ? `계획 ${f(day.planned, 'minutes')} · 실제 ` : '학습 '}${label} · 날짜 상세`}>
        <span className="bp-daily-value">{value === null ? label : `${Math.round(value)}분`}</span>
        <span className={`bp-column-track${value === null ? ' bp-no-value' : ''}`}>
          {plan && day.planned !== null && <i className="bp-plan-column" style={{ height: percent(day.planned, ceiling) }} />}
          {value !== null && <i className="bp-actual-column" style={{ height: value === 0 ? 2 : percent(value, ceiling) }} />}
          {value === null && <span>{day.attendance === 'excluded' ? '／' : '?'}</span>}
        </span>
        {plan && <span className="bp-planned-value">계획 {day.planned === null ? day.attendance === 'excluded' ? '제외' : '미기록' : `${Math.round(day.planned)}분`}</span>}
        <time dateTime={day.date}>{shortDate(day.date)}</time>
      </button>
    })}</div>
  </div>)}</div>
}

function ClockDots({ days, metric, onDay }: { days: DailyCareRecord[]; metric: CareSnapshotMetric; onDay: CareVisualProps['onDay'] }) {
  const values = days.flatMap(day => day.start === null || day.attendance !== 'present' ? [] : [day.start])
  if (metric.before !== null) values.push(metric.before)
  const min = Math.max(0, Math.floor((Math.min(...values, 18 * 60) - 30) / 60) * 60)
  const max = Math.min(24 * 60, Math.ceil((Math.max(...values, 20 * 60) + 30) / 60) * 60)
  const position = (value: number) => percent(value - min, Math.max(60, max - min))
  return <div className="bp-weeks">
    <p className="bp-key">● 입실　┄ 이전 평균 · 위 {f(min, 'clock')} → 아래 {f(max, 'clock')}</p>
    {chunks(days).map(week => <div className="bp-week" key={week[0].date}>
      <div className="bp-date-grid">{week.map(day => {
        const start = day.attendance === 'present' ? day.start : null
        return <button type="button" className="bp-clock-day" key={day.date} onClick={() => onDay(day)} aria-label={`${day.date} 입실 ${start === null ? missingLabel(day) : f(start, 'clock')} · 날짜 상세`}>
          <span className="bp-daily-value">{start === null ? day.attendance === 'absent' ? '미입실' : missingLabel(day) : f(start, 'clock')}</span>
          <span className="bp-clock-track">
            {metric.before !== null && <i className="bp-clock-baseline" style={{ top: position(metric.before) }} />}
            {start !== null ? <i className="bp-clock-dot" style={{ top: position(start) }} /> : <span className="bp-clock-empty">{day.attendance === 'excluded' ? '／' : '—'}</span>}
          </span>
          <time dateTime={day.date}>{shortDate(day.date)}</time>
        </button>
      })}</div>
    </div>)}
  </div>
}

function SubjectPoints({ metric, asOf }: { metric: CareSnapshotMetric; asOf: string }) {
  if (metric.view.kind !== 'share') return <p>과목별 기록 없음</p>
  return <div className="bp-subjects">
    <p className="bp-key">{shortDate(addDays(asOf, -6))}–{shortDate(asOf)} · 최근 7일 자료만 제공</p>
    <p className="bp-key">◇ 계획　● 실제 · 구성비(%)</p>
    <div className="bp-share-axis"><span>0%</span><span>50%</span><span>100%</span></div>
    {metric.view.subjects.map(subject => <div className="bp-subject" key={subject.name}>
      <div className="bp-subject-heading"><strong>{subject.name}</strong><span>계획 {f(subject.plan, 'percent')} · 실제 {f(subject.actual, 'percent')}</span></div>
      <div className="bp-dumbbell" role="img" aria-label={`${subject.name} 계획 ${subject.plan}%, 실제 ${subject.actual}%`}>
        <i className="bp-subject-link" style={{ left: `${Math.min(subject.plan, subject.actual)}%`, width: `${Math.abs(subject.actual - subject.plan)}%` }} />
        <i className="bp-subject-plan" style={{ left: `${subject.plan}%` }} /><i className="bp-subject-actual" style={{ left: `${subject.actual}%` }} />
      </div>
    </div>)}
  </div>
}

export function MetricPanels({ snapshot, onMetric, onDay }: CareVisualProps) {
  const metrics = [...snapshot.metrics].sort((a, b) => Number(b.attention) - Number(a.attention))
  return <div className="bp-container"><div className="bp-panels">{metrics.map(metric => <section className={`bp-panel${metric.attention ? ' bp-panel--attention' : ''}`} key={metric.type}>
    <header className="bp-panel-header"><div><h3>{metric.label}</h3>{metric.attention && <span className="bp-attention">확인 필요</span>}</div><button type="button" className="bp-detail" onClick={() => onMetric(metric)} aria-label={`${metric.label} 상세`}>상세 ↗</button></header>
    <div className="bp-summary"><strong>{f(metric.current, metric.unit)}</strong><span>{metric.currentLabel}</span></div>
    <p className="bp-comparison"><span>{metric.beforeLabel} {f(metric.before, metric.unit)}</span><strong>{formatMetricDelta(metric)}</strong></p>
    <div className="bp-chart-scroll">
      {metric.type === 'CONSECUTIVE_ABSENCE' && <StateCalendar days={snapshot.days} submission={false} onDay={onDay} />}
      {metric.type === 'PLAN_MISSING' && <StateCalendar days={snapshot.days} submission onDay={onDay} />}
      {metric.type === 'STUDY_DROP' && <DayColumns days={snapshot.days} plan={false} onDay={onDay} />}
      {metric.type === 'START_TIME_SHIFT' && <ClockDots days={snapshot.days} metric={metric} onDay={onDay} />}
      {metric.type === 'EXECUTION_GAP' && <><p className="bp-key">▯ 외곽: 계획　▮ 채움: 실제 · 분</p><DayColumns days={snapshot.days} plan onDay={onDay} /></>}
      {metric.type === 'SUBJECT_SHARE' && <SubjectPoints metric={metric} asOf={snapshot.asOf} />}
    </div>
    {metric.type === 'STUDY_DROP' && <p className="bp-support">최근 {snapshot.days.length}일 입실일 평균 {f(snapshot.recent.minutesPerVisit, 'minutes')}</p>}
    {metric.type === 'EXECUTION_GAP' && <p className="bp-support">계획·실제 비교 {snapshot.recent.comparablePlanDays}일 · 계획 미기록일 제외</p>}
  </section>)}</div></div>
}
