import { useState } from 'react'
import { hoursMinutes, shortDate } from '../../model/format.ts'
import { attendanceLabel, submissionLabel, recentRecordAvailability, type CareSnapshot } from '../../model/careSnapshot.ts'
import { formatMetricDelta, formatMetricValue } from '../../model/metricComparison.ts'
import './RecordDesigns.css'

export function RecordStats({ snapshot }: { snapshot: CareSnapshot }) {
  const recent = snapshot.recent
  const known = recentRecordAvailability(snapshot)
  return <dl className="sc-record-stats" aria-label="최근 7일 기록 요약">
    <div><dt>입실 <small>최근 7일</small></dt><dd>{known.attendanceDays ? <>{recent.attended}<span>/ {known.attendanceDays}일</span></> : '기록 없음'}</dd></div>
    <div><dt>계획 미제출 <small>최근 7일</small></dt><dd className={recent.missingPlans ? 'sc-record-alert' : ''}>{known.submissionDays ? <>{recent.missingPlans}<span>/ {known.submissionDays}일</span></> : '기록 없음'}</dd></div>
    <div><dt>입실일 평균 <small>최근 7일</small></dt><dd>{!known.studyDays || recent.minutesPerVisit === null ? '기록 없음' : hoursMinutes(Math.round(recent.minutesPerVisit))}</dd></div>
  </dl>
}

/** 일별 입실과 제출을 같은 날짜축에 놓는다. 미입실을 결석 판정으로 단정하지 않는다. */
export function DateMatrix({ snapshot, showPlan = false }: { snapshot: CareSnapshot; showPlan?: boolean }) {
  const weeks = Array.from({ length: Math.ceil(snapshot.days.length / 7) }, (_, index) => snapshot.days.slice(index * 7, index * 7 + 7)).reverse()
  return <div className="sc-date-matrix" aria-label="날짜별 입실 및 계획 기록">
    {weeks.map(week => <div className="sc-date-matrix__week" key={week[0].date}>
      <table><caption>{shortDate(week[0].date)}–{shortDate(week.at(-1)!.date)}</caption>
        <thead><tr><th scope="col">날짜</th>{week.map(day => <th scope="col" key={day.date}><time dateTime={day.date}>{shortDate(day.date)}</time><small>{['일','월','화','수','목','금','토'][new Date(`${day.date}T00:00:00Z`).getUTCDay()]}</small></th>)}</tr></thead>
        <tbody>
          <tr><th scope="row" title="입실 기록 기준입니다. 예정 등원일에 따른 결석 판정은 아닙니다.">입실</th>{week.map(day => <td key={day.date} className={`sc-record-state sc-record-state--${day.attendance}`}><span>{attendanceLabel(day.attendance)}</span>{day.attendance === 'present' && <small>{day.start === null ? '시각 없음' : formatMetricValue(day.start, 'clock')}</small>}</td>)}</tr>
          <tr><th scope="row">계획</th>{week.map(day => <td key={day.date} className={`sc-record-state sc-record-state--${day.submission}`}>{submissionLabel(day.submission)}</td>)}</tr>
          <tr><th scope="row">학습</th>{week.map(day => <td key={day.date} className="sc-date-matrix__minutes">{day.minutes === null ? '—' : day.minutes === 0 ? '학습 없음' : hoursMinutes(Math.round(day.minutes))}</td>)}</tr>
          {showPlan && <tr><th scope="row">계획 시간</th>{week.map(day => <td key={day.date}>{day.planned === null ? '—' : hoursMinutes(Math.round(day.planned))}</td>)}</tr>}
        </tbody>
      </table>
    </div>)}
  </div>
}

export function MetricSummary({ snapshot }: { snapshot: CareSnapshot }) {
  return <div className="sc-record-metrics"><h4>학습 현황 비교</h4><div className="sc-record-scroll"><table>
    <caption className="sc-visually-hidden">같은 기간·단위의 개인별 학습 학생별 비교</caption>
    <thead><tr><th scope="col">학습 항목</th><th scope="col">비교 기준</th><th scope="col">최근</th><th scope="col">변화</th></tr></thead>
    <tbody>{snapshot.metrics.map(metric => <tr key={metric.type}><th scope="row">{metric.label}{metric.attention && <small className="sc-record-attention">확인 필요</small>}</th><td>{formatMetricValue(metric.before,metric.unit)}<small>{metric.beforeLabel}</small></td><td>{formatMetricValue(metric.current,metric.unit)}<small>{metric.currentLabel}</small></td><td>{snapshot.deferred ? '학습 기록 부족' : formatMetricDelta(metric)}</td></tr>)}</tbody>
  </table></div></div>
}

export function MatrixDesign({ snapshot }: { snapshot: CareSnapshot }) {
  return <div className="sc-design-records" data-design-layout="matrix">
    <RecordStats snapshot={snapshot}/>
    <DateMatrix snapshot={snapshot}/><MetricSummary snapshot={snapshot}/>
  </div>
}

/** 2번: 기본 화면은 여섯 지표와 한 주, 세부 비교는 요청할 때 연다. */
export function CompactDesign({ snapshot }: { snapshot: CareSnapshot }) {
  const [weekIndex, setWeekIndex] = useState(0)
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const weeks = Math.ceil(snapshot.days.length / 7)
  const page = Math.min(weekIndex, weeks - 1)
  const end = snapshot.days.length - page * 7
  const days = snapshot.days.slice(Math.max(0, end - 7), end)
  const chosen = snapshot.metrics.find(metric => metric.type === selectedMetric)
  return <div className="sc-compact-design">
    <div className="sc-compact-metrics" aria-label="학습 현황">{snapshot.metrics.map(metric => {
      const held = snapshot.deferred && !['CONSECUTIVE_ABSENCE','PLAN_MISSING'].includes(metric.type)
      return <button type="button" className={`sc-compact-metric${metric.attention && !held ? ' is-attention' : ''}`} aria-expanded={selectedMetric === metric.type} key={metric.type} onClick={() => setSelectedMetric(selectedMetric === metric.type ? null : metric.type)}>
        <span>{metric.label}<small>{metric.currentLabel}</small></span>
        <strong>{held ? '—' : formatMetricValue(metric.current,metric.unit)}</strong>
        <small>{held ? '학습 기록 부족' : `${formatMetricDelta(metric)}${metric.attention ? ' · 확인 필요' : ''}`}</small>
      </button>
    })}</div>
    {chosen && <div className="sc-compact-comparison" role="region" aria-label={`${chosen.label} 상세 비교`}>
      <span>{chosen.beforeLabel} <strong>{formatMetricValue(chosen.before, chosen.unit)}</strong></span><span aria-hidden="true">→</span><span>{chosen.currentLabel} <strong>{formatMetricValue(chosen.current, chosen.unit)}</strong></span>
    </div>}
    <div className="sc-week-pager"><strong>{shortDate(days[0].date)}–{shortDate(days.at(-1)!.date)}</strong>
      <span>{page + 1} / {weeks}주</span>
      <button type="button" className="sc-button" aria-label="이전 주" disabled={page >= weeks - 1} onClick={() => setWeekIndex(page + 1)}>‹ 이전</button>
      <button type="button" className="sc-button" aria-label="다음 주" disabled={page === 0} onClick={() => setWeekIndex(page - 1)}>다음 ›</button>
    </div>
    <DateMatrix snapshot={{...snapshot,days}}/>
  </div>
}
