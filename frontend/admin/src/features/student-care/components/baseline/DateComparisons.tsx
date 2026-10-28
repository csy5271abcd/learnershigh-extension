import type { ReactNode } from 'react'
import { attendanceLabel, submissionLabel, type CareSnapshotMetric, type DailyCareRecord } from '../../model/careSnapshot.ts'
import { formatMetricDelta, formatMetricValue } from '../../model/metricComparison.ts'
import { addDays, shortDate } from '../../model/format.ts'
import type { CareVisualProps } from './types.ts'
import './DateComparisons.css'

const number = (value: number) => Number(value.toFixed(1)).toString()
const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${number(Math.abs(value))}`
const signedMinutes = (value: number) => signed(Math.round(value))
const clock = (value: number) => formatMetricValue(value, 'clock')
const time = (value: number | null) => formatMetricValue(value, 'minutes')
const weekday = (date: string) => ['일', '월', '화', '수', '목', '금', '토'][new Date(`${date}T00:00:00Z`).getUTCDay()]

function DayRows({ days, onDay, children }: { days: DailyCareRecord[]; onDay: CareVisualProps['onDay']; children: (day: DailyCareRecord) => ReactNode }) {
  return <div className="bc-days">{days.map(day => <button key={day.date} type="button" className={`bc-day${day.attendance === 'excluded' ? ' bc-day-excluded' : ''}`} onClick={() => onDay(day)} aria-label={`${day.date} 날짜 상세 보기`}>
    <span className="bc-date"><time dateTime={day.date}>{shortDate(day.date)}</time><small>{weekday(day.date)}</small></span>
    <span className="bc-day-visual">{children(day)}</span>
  </button>)}</div>
}

function MetricHeading({ metric, title, summary, onMetric }: { metric: CareSnapshotMetric | undefined; title: string; summary: string; onMetric: CareVisualProps['onMetric'] }) {
  return <div className="bc-metric-heading"><button type="button" disabled={!metric} onClick={() => metric && onMetric(metric)} aria-label={`${title} 지표 상세 보기`}><span>{title}</span><span aria-hidden="true">상세 ↗</span></button><strong>{summary}</strong>{metric && metric.type !== 'SUBJECT_SHARE' && <small className="bc-comparison-summary">
    <span>{metric.before === null ? '이전 기간 기록 없음' : `${metric.beforeLabel} ${formatMetricValue(metric.before, metric.unit)}`}</span>
    <span>{metric.currentLabel} {formatMetricValue(metric.current, metric.unit)}{metric.before !== null && metric.current !== null && <> · {formatMetricDelta(metric)}</>}</span>
  </small>}</div>
}

function Axis({ left, middle, right }: { left: string; middle?: string; right: string }) {
  return <div className="bc-axis" aria-hidden="true"><span>{left}</span>{middle && <span>{middle}</span>}<span>{right}</span></div>
}

function EventMark({ state, label }: { state: DailyCareRecord['attendance'] | DailyCareRecord['submission']; label: string }) {
  const symbol = state === 'present' ? '●' : state === 'submitted' ? '◆' : state === 'absent' || state === 'missing' ? '×' : state === 'excluded' ? '／' : '?'
  return <span className={`bc-event bc-event-${state}`} title={label}><i aria-hidden="true">{symbol}</i><small>{label}</small></span>
}

/** C: dates run down aligned graphical rows; quantities keep their own honest axes. */
export function DateComparisons({ snapshot, onMetric, onDay }: CareVisualProps) {
  const { days, metrics } = snapshot
  const find = (type: CareSnapshotMetric['type']) => metrics.find(metric => metric.type === type)
  const study = find('STUDY_DROP'), start = find('START_TIME_SHIFT'), execution = find('EXECUTION_GAP'), subject = find('SUBJECT_SHARE')
  const attended = days.filter(day => day.attendance === 'present').length
  const missing = days.filter(day => day.submission === 'missing').length
  const studyRecords = days.filter(day => day.minutes !== null)
  const studyTotal = studyRecords.reduce((sum, day) => sum + day.minutes!, 0)
  const studyMax = Math.max(60, Math.ceil(Math.max(0, ...days.map(day => day.minutes ?? 0)) / 60) * 60)
  const planMax = Math.max(60, Math.ceil(Math.max(0, ...days.flatMap(day => [day.planned ?? 0, day.actual ?? 0])) / 60) * 60)
  const baseline = start?.before ?? null
  const deviationMax = Math.max(30, Math.ceil(Math.max(0, ...days.map(day => day.start === null || baseline === null ? 0 : Math.abs(day.start - baseline))) / 30) * 30)
  const startRecords = days.filter(day => day.start !== null)
  const observedStartMin = startRecords.length ? Math.floor(Math.min(...startRecords.map(day => day.start!)) / 30) * 30 : 0
  const observedStartMax = startRecords.length ? Math.max(observedStartMin + 30, Math.ceil(Math.max(...startRecords.map(day => day.start!)) / 30) * 30) : 1440
  const startMean = startRecords.length ? startRecords.reduce((sum, day) => sum + day.start!, 0) / startRecords.length : null
  const paired = days.filter(day => day.planned !== null && day.actual !== null)
  const totalPlanned = paired.reduce((sum, day) => sum + day.planned!, 0)
  const totalActual = paired.reduce((sum, day) => sum + day.actual!, 0)
  const subjects = subject?.view.kind === 'share' ? subject.view.subjects : []
  const shareMax = Math.max(10, Math.ceil(Math.max(0, ...subjects.map(item => Math.abs(item.actual - item.plan))) / 10) * 10)
  const recentStart = addDays(snapshot.asOf, -6)

  return <div className="bc-comparisons">
    <div className="bc-chart-grid">
      <section className="bc-chart bc-events-chart" aria-label="날짜별 입실 및 계획 제출">
        <header className="bc-events-heading">
          <MetricHeading metric={find('CONSECUTIVE_ABSENCE')} title="입실 기록" summary={`${attended}일 입실`} onMetric={onMetric} />
          <MetricHeading metric={find('PLAN_MISSING')} title="계획 제출" summary={`${missing}일 미제출`} onMetric={onMetric} />
        </header>
        <div className="bc-chart-key bc-event-key"><span>날짜</span><span>입실</span><span>제출</span></div>
        <DayRows days={days} onDay={onDay}>{day => <span className="bc-event-pair"><EventMark state={day.attendance} label={attendanceLabel(day.attendance)} /><EventMark state={day.submission} label={submissionLabel(day.submission)} /></span>}</DayRows>
        <footer className="bc-legend">● 입실 · ◆ 제출 · × 없음 · ? 미기록 · ／ 제외</footer>
      </section>

      <section className="bc-chart" aria-label="날짜별 학습 시간">
        <header><MetricHeading metric={study} title="학습 시간" summary={studyRecords.length ? time(studyTotal) : '기록 없음'} onMetric={onMetric} /></header>
        <div className="bc-chart-key"><span>날짜</span><Axis left="0" middle={`${number(studyMax / 120)}시간`} right={`${number(studyMax / 60)}시간`} /></div>
        <DayRows days={days} onDay={onDay}>{day => <>
          <span className="bc-plot bc-study-plot" aria-hidden="true">{day.minutes !== null && <i className="bc-study-dot" style={{ left: `${day.minutes / studyMax * 100}%` }} />}</span>
          <span className="bc-value">{day.attendance === 'excluded' ? '제외' : time(day.minutes)}</span>
        </>}</DayRows>
        <footer className="bc-legend">● 일별 학습 시간 · 0부터 같은 척도</footer>
      </section>

      <section className="bc-chart" aria-label="날짜별 입실 시각과 이전 기준 편차">
        <header><MetricHeading metric={start} title="입실 시각" summary={startMean === null ? '기록 없음' : `평균 ${clock(startMean)}`} onMetric={onMetric} /></header>
        <div className="bc-chart-key"><span>날짜</span>{baseline === null ? <Axis left={clock(observedStartMin)} middle={clock((observedStartMin + observedStartMax) / 2)} right={clock(observedStartMax)} /> : <Axis left={`−${deviationMax}분`} middle="0" right={`+${deviationMax}분`} />}</div>
        <DayRows days={days} onDay={onDay}>{day => {
          const offset = day.start === null ? null : baseline === null ? (day.start - observedStartMin) / (observedStartMax - observedStartMin) * 100 : 50 + (day.start - baseline) / deviationMax * 50
          return <>
            <span className={`bc-plot bc-clock-plot${baseline === null ? ' bc-no-baseline' : ''}`} aria-hidden="true">{offset !== null && <i className="bc-clock-dot" style={{ left: `${offset}%` }} />}</span>
            <span className="bc-value">{day.start === null ? day.attendance === 'excluded' ? '제외' : '기록 없음' : <>{clock(day.start)}{baseline !== null && <small> ({signedMinutes(day.start - baseline)}분)</small>}</>}</span>
          </>
        }}</DayRows>
        <footer className="bc-legend">{baseline === null ? '이전 기록 없음 · 실제 시각 축' : <>{start?.beforeLabel} {clock(baseline)} 기준<br />− 더 이른 입실 · + 더 늦은 입실</>}</footer>
      </section>

      <section className="bc-chart" aria-label="날짜별 계획 및 실제 학습 시간">
        <header><MetricHeading metric={execution} title="계획과 실제" summary={paired.length ? `${signedMinutes(totalActual - totalPlanned)}분 · 비교 ${paired.length}일` : '비교 기록 없음'} onMetric={onMetric} /></header>
        <div className="bc-chart-key"><span>날짜</span><Axis left="0" middle={`${number(planMax / 120)}시간`} right={`${number(planMax / 60)}시간`} /></div>
        <DayRows days={days} onDay={onDay}>{day => {
          const planned = day.planned === null ? null : day.planned / planMax * 100
          const actual = day.actual === null ? null : day.actual / planMax * 100
          return <>
            <span className="bc-plot bc-plan-plot" aria-hidden="true">
              {planned !== null && actual !== null && <i className="bc-connector" style={{ left: `${Math.min(planned, actual)}%`, width: `${Math.abs(planned - actual)}%` }} />}
              {planned !== null && <i className="bc-plan-dot" style={{ left: `${planned}%` }} />}
              {actual !== null && <i className="bc-actual-dot" style={{ left: `${actual}%` }} />}
            </span>
            <span className="bc-value bc-paired-values">{day.attendance === 'excluded' ? '제외' : <><span>계획 {day.planned === null ? '미기록' : `${Math.round(day.planned)}분`}</span><span>실제 {day.actual === null ? '미기록' : `${Math.round(day.actual)}분`}</span></>}</span>
          </>
        }}</DayRows>
        <footer className="bc-legend"><i className="bc-legend-plan" /> 계획 <i className="bc-legend-actual" /> 실제 · 비교 {paired.length}일</footer>
      </section>
    </div>

    <section className="bc-chart bc-subject-chart" aria-label="최근 7일 과목별 계획 대비 실제 비중 차이">
      <header><MetricHeading metric={subject} title="과목별 비중 차이" summary={`${shortDate(recentStart)}–${shortDate(snapshot.asOf)} · 최근 7일`} onMetric={onMetric} /></header>
      <div className="bc-subject-key"><span>과목 · 계획 / 실제</span><Axis left={`−${shareMax}%p`} middle="차이 0" right={`+${shareMax}%p`} /><span>실제 − 계획</span></div>
      <div className="bc-subject-rows">{subjects.map(item => {
        const gap = item.actual - item.plan
        return <button key={item.name} type="button" className="bc-subject-row" onClick={() => subject && onMetric(subject)} aria-label={`${item.name}, 계획 ${item.plan}%, 실제 ${item.actual}%, 차이 ${signed(gap)}%p. 지표 상세 보기`}>
          <span className="bc-subject-name"><strong>{item.name}</strong><small>계획 {item.plan}% / 실제 {item.actual}%</small></span>
          <span className="bc-plot bc-diverging" aria-hidden="true"><i className={`bc-gap-bar${gap < 0 ? ' bc-gap-negative' : ''}`} style={{ left: `${gap < 0 ? 50 + gap / shareMax * 50 : 50}%`, width: `${Math.abs(gap) / shareMax * 50}%` }} />{gap === 0 && <i className="bc-clock-dot" style={{ left: '50%' }} />}</span>
          <strong className="bc-gap-value">{signed(gap)}%p</strong>
        </button>
      })}</div>
      {!subjects.length && <div className="bc-no-data"><span aria-hidden="true">◇</span>과목 비율 기록 없음</div>}
      <footer className="bc-legend">과목 비율은 최근 7일 자료 · − 계획보다 낮음 · + 계획보다 높음</footer>
    </section>
  </div>
}
