import type { CSSProperties } from 'react'
import { attendanceLabel, submissionLabel } from '../../model/careSnapshot.ts'
import { hoursMinutes, shortDate } from '../../model/format.ts'
import { formatMetricDelta, formatMetricValue } from '../../model/metricComparison.ts'
import type { CareVisualProps } from './types.ts'
import './WeeklyBoard.css'

const clock = (value: number | null) => {
  if (value === null) return '기록 없음'
  const minutes = Math.round(value)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
const percent = (value: number, max: number) => `${max > 0 ? value / max * 100 : 0}%`
const duration = (value: number) => hoursMinutes(Math.round(value))
const minutesLabel = (value: number | null) => value === null ? '미기록' : `${Math.round(value)}분`
const subjectColors = ['--color-accent', '--color-positive', '--color-flag', '--color-text-secondary', '--color-chart-bar']

/** Dates coordinate every daily measure; subject composition stays a separate 7-day aggregate. */
export function WeeklyBoard({ snapshot, onMetric, onDay }: CareVisualProps) {
  const { days } = snapshot
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => days.slice(index * 7, index * 7 + 7))
  const attendance = days.filter(day => day.attendance === 'present' || day.attendance === 'absent')
  const submissions = days.filter(day => day.submission === 'submitted' || day.submission === 'missing')
  const study = days.filter(day => day.attendance === 'present' && day.minutes !== null)
  const arrivals = days.filter(day => day.start !== null && day.attendance === 'present')
  const pairs = days.filter(day => day.attendance === 'present' && day.planned !== null && day.actual !== null)
  const studyMinutes = study.reduce((sum, day) => sum + day.minutes!, 0)
  const planned = pairs.reduce((sum, day) => sum + day.planned!, 0)
  const actual = pairs.reduce((sum, day) => sum + day.actual!, 0)
  const maxMinutes = Math.ceil(Math.max(1, ...days.flatMap(day => [day.actual ?? 0, day.planned ?? 0])))
  const heatMax = Math.max(1, ...study.map(day => day.minutes!))
  const startValues = arrivals.map(day => day.start!)
  const clockMin = startValues.length ? Math.max(0, Math.floor(Math.min(...startValues) / 60) * 60 - 60) : 0
  const clockMax = startValues.length ? Math.min(1440, Math.ceil(Math.max(...startValues) / 60) * 60 + 60) : 1440
  const subjectMetric = snapshot.metrics.find(metric => metric.view.kind === 'share')
  const subjectView = subjectMetric?.view.kind === 'share' ? subjectMetric.view : null
  const summaries: Record<string, string> = {
    CONSECUTIVE_ABSENCE: attendance.length ? `${attendance.filter(day => day.attendance === 'present').length}/${attendance.length}일 입실` : '기록 없음',
    PLAN_MISSING: submissions.length ? `${submissions.filter(day => day.submission === 'submitted').length}/${submissions.length}일 제출` : '기록 없음',
    STUDY_DROP: study.length ? `${duration(studyMinutes)} · ${study.length}일 기록` : '기록 없음',
    START_TIME_SHIFT: arrivals.length ? `${clock(arrivals.reduce((sum, day) => sum + day.start!, 0) / arrivals.length)} · ${arrivals.length}일 평균` : '시각 기록 없음',
    EXECUTION_GAP: pairs.length ? `계획 ${duration(planned)} / 실제 ${duration(actual)} · ${pairs.length}일` : '비교할 기록 없음',
    SUBJECT_SHARE: '최근 7일 계획 / 실제',
  }

  return <section className="bw-board" aria-label="주간 학습 보드">
    {weeks.map((week, index) => <section className="bw-week" key={week[0].date} aria-label={`${index + 1}주 ${week[0].date}부터`}>
      <h4>{index + 1}주 <span>{shortDate(week[0].date)} — {shortDate(week.at(-1)!.date)}</span></h4>
      <div className="bw-days">
        <div className="bw-row-labels">
          <span>날짜 / 지표</span>
          {['CONSECUTIVE_ABSENCE', 'PLAN_MISSING', 'STUDY_DROP', 'START_TIME_SHIFT', 'EXECUTION_GAP'].map((type, row) => {
            const metric = snapshot.metrics.find(item => item.type === type)
            return <button type="button" key={type} aria-label={`${metric?.label ?? ['입실', '계획 제출', '학습 시간', '입실 시각', '계획 / 실제'][row]} 상세`} style={{ gridRow: row + 2 }} onClick={() => metric && onMetric(metric)}>
              <strong>{['입실', '계획 제출', '학습 시간', '입실 시각', '계획 / 실제'][row]} ↗</strong>
              {index === 0 && <small>{summaries[type]}<br />선택 {days.length}일{metric && <><br />{metric.before === null ? '비교할 이전 기록 없음' : <>{metric.beforeLabel} {formatMetricValue(metric.before, metric.unit)}<br />{formatMetricDelta(metric)}</>}</>}</small>}
            </button>
          })}
        </div>
        {week.map((day, dayIndex) => {
          const heat = day.minutes === null ? 'unknown' : day.minutes === 0 ? 'zero' : String(Math.min(4, Math.ceil(day.minutes / heatMax * 4)))
          const knownStart = day.start !== null && day.attendance === 'present'
          return <article className="bw-day" key={day.date} style={{ '--bw-column': dayIndex + 2 } as CSSProperties}>
            <button className="bw-date" type="button" onClick={() => onDay(day)} aria-label={`${day.date} 날짜 상세`}>
              <strong>{shortDate(day.date)}</strong><span>{new Date(`${day.date}T00:00:00Z`).toLocaleDateString('ko-KR', { weekday: 'short', timeZone: 'UTC' })} ↗</span>
            </button>
            <div className="bw-cell bw-status"><span className="bw-cell-label">입실</span><span className={`bw-stamp bw-${day.attendance}`}><b aria-hidden="true">{({ present: '●', absent: '×', unknown: '?', excluded: '—' })[day.attendance]}</b>{attendanceLabel(day.attendance)}</span></div>
            <div className="bw-cell bw-status"><span className="bw-cell-label">계획 제출</span><span className={`bw-stamp bw-${day.submission}`}><b aria-hidden="true">{({ submitted: '✓', missing: '×', unknown: '?', excluded: '—' })[day.submission]}</b>{submissionLabel(day.submission)}</span></div>
            <div className="bw-cell"><span className="bw-cell-label">학습 시간</span><div className={`bw-heat bw-heat-${heat}`}>{day.minutes === null ? '기록 없음' : minutesLabel(day.minutes)}</div></div>
            <div className="bw-cell bw-arrival"><span className="bw-cell-label">입실 시각</span><strong>{knownStart ? clock(day.start) : day.attendance === 'excluded' ? '제외' : '기록 없음'}</strong><div className={`bw-ruler${knownStart ? '' : ' bw-ruler-unknown'}`} aria-hidden="true">{knownStart && <i style={{ left: percent(day.start! - clockMin, clockMax - clockMin) }} />}</div><div className="bw-axis"><span>{clock(clockMin)}</span><span>{clock(clockMax)}</span></div></div>
            <div className="bw-cell bw-execution"><span className="bw-cell-label">계획 / 실제</span><div className="bw-bullet" role="img" aria-label={`계획 ${minutesLabel(day.planned)}, 실제 ${minutesLabel(day.actual)}`}>
              {day.actual !== null && <span className="bw-bullet-fill" style={{ width: percent(day.actual, maxMinutes) }} />}
              {day.planned !== null && <i className="bw-bullet-reference" style={{ left: percent(day.planned, maxMinutes) }} />}
            </div><span className="bw-exact">{minutesLabel(day.planned)} / {minutesLabel(day.actual)}</span></div>
          </article>
        })}
      </div>
    </section>)}
    <div className="bw-mobile-metrics">{snapshot.metrics.filter(metric => metric.type !== 'SUBJECT_SHARE').map(metric => <button type="button" key={metric.type} aria-label={`${metric.label} 상세`} onClick={() => onMetric(metric)}>{metric.label} 상세 ↗ <small>{summaries[metric.type]} · 선택 {days.length}일<br />{metric.before === null ? '비교할 이전 기록 없음' : `${metric.beforeLabel} ${formatMetricValue(metric.before, metric.unit)} · ${formatMetricDelta(metric)}`}</small></button>)}</div>
    <div className="bw-legend" aria-label="보드 범례">
      <span>● 입실 · ✓ 제출</span><span>× 미입실 / 미제출</span><span>? 기록 없음 · — 제외</span>
      <span className="bw-heat-legend">학습 시간 <i /> 적음 → 많음 · 0분 ≠ 기록 없음</span>
    </div>
    <div className="bw-scale">입실 시각: 공통 {clock(clockMin)}—{clock(clockMax)} · 계획 / 실제: 선 = 계획, 채움 = 실제 · 공통 0—{maxMinutes}분 · 분 단위 반올림</div>
    <section className="bw-subjects" aria-label="최근 7일 과목 구성비">
      <header><h4>과목별 학습 비율 <span>최근 7일 · 조회 기간과 별도</span></h4>{subjectMetric && <button type="button" onClick={() => onMetric(subjectMetric)}>과목 상세 ↗</button>}</header>
      {subjectView ? <>
        {(['plan', 'actual'] as const).map(key => <div className="bw-share-row" key={key}><strong>{key === 'plan' ? '계획' : '실제'}</strong><div className="bw-share-strip" role="img" aria-label={`${key === 'plan' ? '계획' : '실제'}: ${subjectView.subjects.map(subject => `${subject.name} ${subject[key]}%`).join(', ')}`}>
          {subjectView.subjects.map((subject, index) => <span key={subject.name} style={{ flexGrow: subject[key], '--bw-subject-color': `var(${subjectColors[index % subjectColors.length]})` } as CSSProperties} title={`${subject.name} ${subject[key]}%`}><span>{subject[key] >= 12 ? `${subject.name} ${subject[key]}%` : ''}</span></span>)}
        </div></div>)}
        <div className="bw-subject-legend">{subjectView.subjects.map((subject, index) => <span key={subject.name}><i style={{ background: `var(${subjectColors[index % subjectColors.length]})` }} />{subject.name} <b>계획 {subject.plan}% · 실제 {subject.actual}%</b></span>)}</div>
      </> : <p>과목 구성 기록 없음</p>}
    </section>
  </section>
}
