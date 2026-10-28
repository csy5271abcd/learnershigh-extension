import { addDays, hoursMinutes, shortDate } from '../../model/format.ts'
import { attendanceLabel, submissionLabel, type CareSnapshot } from '../../model/careSnapshot.ts'
import { weekdayOf } from '../../model/mockMetrics.ts'
import { formatMetricDelta, formatMetricValue } from '../../model/metricComparison.ts'
import './CalendarDesign.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 날짜의 출결·제출·학습량을 함께 읽는 시안. 관리 기준이나 원본 기록은 변경하지 않는다. */
export function CalendarDesign({ snapshot }: { snapshot: CareSnapshot }) {
  const first = snapshot.days[0]?.date
  const last = snapshot.days.at(-1)?.date
  const byDate = new Map(snapshot.days.map(day => [day.date, day]))
  const recentDays = snapshot.days.filter(day => day.date >= addDays(snapshot.asOf, -6) && day.date <= snapshot.asOf)
  const attendanceKnown = recentDays.some(day => day.attendance === 'present' || day.attendance === 'absent')
  const submissionKnown = recentDays.some(day => day.submission === 'submitted' || day.submission === 'missing')
  const weeks: string[][] = []
  if (first && last) {
    const start = addDays(first, -weekdayOf(first))
    for (let sunday = start; sunday <= last; sunday = addDays(sunday, 7)) {
      weeks.push(Array.from({ length: 7 }, (_, index) => addDays(sunday, index)))
    }
  }

  return <section className="sc-design-calendar" aria-label="날짜별 학습 달력">
    <header className="sc-calendar-heading">
      <div><p className="sc-calendar-kicker">날짜별 살펴보기</p><h3>날짜별 입실·계획 기록</h3></div>
      {first && last && <p>{shortDate(first)} — {shortDate(last)}</p>}
    </header>
    <dl className="sc-calendar-summary" aria-label="최근 7일 요약">
      <div><dt>최근 7일 입실</dt><dd>{attendanceKnown ? snapshot.recent.attended : '기록 없음'}{attendanceKnown && <span>일</span>}</dd></div>
      <div><dt>최근 7일 계획 미제출</dt><dd>{submissionKnown ? snapshot.recent.missingPlans : '기록 없음'}{submissionKnown && <span>일</span>}</dd></div>
      <div><dt>입실일 평균 공부</dt><dd>{snapshot.recent.minutesPerVisit === null ? '기록 없음' : hoursMinutes(Math.round(snapshot.recent.minutesPerVisit))}</dd></div>
    </dl>
    <div className="sc-calendar-legend">
      <span>출입 기록과 계획 제출은 별도로 표시합니다.</span>
      <span><i aria-hidden="true" />미입실 · 미제출</span>
      <span>기록 없음 ≠ 0분</span>
    </div>
    {snapshot.deferred && <p className="sc-calendar-notice">학습 기록 부족</p>}
    {weeks.length === 0 ? <p className="sc-calendar-notice">날짜별 기록이 없습니다.</p> : <div className="sc-calendar-scroll" tabIndex={0} role="region" aria-label="월요일부터 일요일까지 날짜별 기록 달력">
      <div className="sc-calendar-grid">
        {WEEKDAYS.map(day => <div className="sc-calendar-weekday" key={day}>{day}</div>)}
        {weeks.flat().map(date => {
          const day = byDate.get(date)
          if (!day) return <div key={date} className="sc-calendar-outside" aria-label={`${shortDate(date)} 조회 기간 밖`} />
          return <article key={date} className={`sc-calendar-day${date === snapshot.asOf ? ' is-today' : ''}`} aria-label={`${shortDate(date)} 기록`}>
            <time dateTime={date}>{shortDate(date)}{date === snapshot.asOf && <span>기준일</span>}</time>
            <div className={`sc-calendar-status is-${day.attendance}`}><span>입실</span><strong>{attendanceLabel(day.attendance)}</strong></div>
            <div className={`sc-calendar-status is-${day.submission}`}><span>계획</span><strong>{submissionLabel(day.submission)}</strong></div>
            <div className="sc-calendar-study"><span>공부</span><strong>{day.minutes === null ? day.attendance === 'excluded' ? '제외' : '기록 없음' : hoursMinutes(day.minutes)}</strong></div>
          </article>
        })}
      </div>
    </div>}
    <section className="sc-calendar-comparison" aria-label="여섯 학습 학생별 비교">
      <h3>학습 현황 비교</h3>
      <div className="sc-calendar-scroll" tabIndex={0} role="region" aria-label="학습 학생별 비교표">
        <table><caption className="sc-calendar-sr">학습 항목별 기준과 최근 수치</caption>
          <thead><tr><th scope="col">학습 항목</th><th scope="col">비교 기준</th><th scope="col">최근</th><th scope="col">변화</th></tr></thead>
          <tbody>{snapshot.metrics.map(metric => {
            const held = snapshot.deferred && !['CONSECUTIVE_ABSENCE', 'PLAN_MISSING'].includes(metric.type)
            return <tr key={metric.type}>
              <th scope="row">{metric.label}<span className={metric.attention && !held ? 'sc-calendar-attention' : ''}>{held ? '학습 기록 부족' : metric.attention ? '확인 필요' : ''}</span></th>
              <td><strong>{held ? '학습 기록 부족' : formatMetricValue(metric.before, metric.unit)}</strong><small>{metric.beforeLabel}</small></td>
              <td><strong>{held ? '학습 기록 부족' : formatMetricValue(metric.current, metric.unit)}</strong><small>{metric.currentLabel}</small></td>
              <td>{held ? '비교 보류' : formatMetricDelta(metric)}</td>
            </tr>
          })}</tbody>
        </table>
      </div>
    </section>
  </section>
}
