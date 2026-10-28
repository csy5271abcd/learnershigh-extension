import { useState } from 'react'
import { addDays, hoursMinutes, shortDate } from '../model/format.ts'
import { clock, weekdayOf, type DayDetail, type MetricView } from '../model/mockMetrics.ts'

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

type View = Extract<MetricView, { kind: 'weekly' }> & { calendar: DayDetail[] }

/** 출결: 주별 합계 + 접어 둔 일별 보기(월~일 달력, 클릭한 날 상세). 주 막대를 누르면 그 주로 펼친다. */
export function AttendanceChart({ view, flag }: { view: View; flag: boolean }) {
  const days = view.calendar
  const [selected, setSelected] = useState(days[days.length - 1].date)
  const [open, setOpen] = useState(false)
  const selectedWeek = view.weeks.findIndex((week) => week.from <= selected && selected <= week.to)
  const byDate = new Map(days.map((day) => [day.date, day]))

  // 달력은 월요일 시작 주로 묶는다
  const first = days[0].date
  const start = addDays(first, -((weekdayOf(first) + 6) % 7))
  const last = days[days.length - 1].date
  const rows: string[][] = []
  for (let monday = start; monday <= last; monday = addDays(monday, 7)) {
    rows.push(Array.from({ length: 7 }, (_, i) => addDays(monday, i)))
  }

  const max = Math.max(view.usual, ...view.weeks.map((week) => week.value), 1) * 1.3
  const lastWeek = view.weeks.length - 1
  const detail = byDate.get(selected)

  return (
    <div className="sc-attend">
      <figure className="sc-weekly" aria-label={`주별 등원 횟수, 평소 ${view.usual}회`}>
        <div className="sc-chart__legend" aria-hidden="true">
          <span className="sc-chart__dash" /> 평균
        </div>
        <div className="sc-weekly__plot">
          <span className="sc-weekly__usual" style={{ bottom: `${(view.usual / max) * 100}%` }} />
          {view.weeks.map((week, index) => (
            <button
              key={week.label}
              type="button"
              className={index === selectedWeek ? 'sc-weekly__col sc-weekly__col--on' : 'sc-weekly__col'}
              aria-pressed={index === selectedWeek}
              aria-label={`${week.label} ${week.value}회`}
              onClick={() => {
                setSelected(week.to)
                setOpen(true)
              }}
            >
              <span className={index === lastWeek ? 'sc-weekly__value sc-weekly__value--recent' : 'sc-weekly__value'}>
                {week.value}회
              </span>
              <span
                className={
                  index === lastWeek
                    ? flag
                      ? 'sc-weekly__bar sc-weekly__bar--flag'
                      : 'sc-weekly__bar sc-weekly__bar--recent'
                    : 'sc-weekly__bar'
                }
                style={{ height: `${(week.value / max) * 100}%` }}
              />
            </button>
          ))}
        </div>
        <div className="sc-weekly__labels">
          {view.weeks.map((week) => (
            <span key={week.label}>{week.label}</span>
          ))}
        </div>
      </figure>

      <button type="button" className="sc-fold" aria-expanded={open} onClick={() => setOpen(!open)}>
        일별 보기 <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
      <>
      <table className="sc-cal">
        <thead>
          <tr>
            <th scope="col" aria-label="주" />
            {WEEKDAYS.map((day) => (
              <th key={day} scope="col">
                {day}
              </th>
            ))}
            <th scope="col">횟수</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const inWeek = selectedWeek >= 0 && row.some((date) => view.weeks[selectedWeek].from <= date && date <= view.weeks[selectedWeek].to)
            return (
              <tr key={row[0]} className={inWeek ? 'sc-cal__row sc-cal__row--on' : 'sc-cal__row'}>
                <th scope="row">{shortDate(row[0])}</th>
                {row.map((date) => {
                  const day = byDate.get(date)
                  if (!day) return <td key={date} className="sc-cal__cell sc-cal__cell--none" />
                  const state = day.skip ? 'skip' : day.came ? 'came' : day.longGap ? 'gap' : 'off'
                  return (
                    <td key={date} className="sc-cal__cell">
                      <button
                        type="button"
                        className={`sc-cal__day sc-cal__day--${state}${date === selected ? ' sc-cal__day--on' : ''}`}
                        aria-pressed={date === selected}
                        aria-label={`${shortDate(date)} ${day.skip ? '주말 제외' : day.came ? '등원' : '미입실'}`}
                        onClick={() => setSelected(date)}
                      >
                        {Number(date.slice(8))}
                      </button>
                    </td>
                  )
                })}
                <td className="sc-cal__count">{row.filter((date) => byDate.get(date)?.came).length}회</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="sc-cal__legend" aria-hidden="true">
        <span className="sc-cal__key sc-cal__key--came" /> 등원
        <span className="sc-cal__key sc-cal__key--off" /> 결석
        <span className="sc-cal__key sc-cal__key--gap" /> 연속 미입실
        {days.some((day) => day.skip) && (
          <>
            <span className="sc-cal__key sc-cal__key--skip" /> 주말 제외
          </>
        )}
      </div>

      {detail && (
        <div className="sc-dayinfo" aria-live="polite">
          <strong>
            {shortDate(detail.date)} ({WEEKDAYS[(weekdayOf(detail.date) + 6) % 7]})
          </strong>
          {detail.skip ? (
            <span className="sc-dayinfo__absent">주말 제외</span>
          ) : detail.came ? (
            <dl className="sc-dayinfo__list">
              <div>
                <dt>입실</dt>
                <dd>{detail.start === null ? '-' : clock(detail.start)}</dd>
              </div>
              <div>
                <dt>공부</dt>
                <dd>{hoursMinutes(detail.minutes)}</dd>
              </div>
              <div>
                <dt>계획 대비</dt>
                <dd>
                  {detail.planned ? `${Math.min(100, Math.round((detail.minutes / detail.planned) * 100))}%` : '-'}{' '}
                  <span className="sc-dayinfo__sub">계획 {hoursMinutes(detail.planned)}</span>
                </dd>
              </div>
              <div>
                <dt>계획 제출</dt>
                <dd>{detail.submitted ? '제출' : '미제출'}</dd>
              </div>
            </dl>
          ) : (
            <span className={detail.longGap ? 'sc-dayinfo__absent sc-dayinfo__absent--gap' : 'sc-dayinfo__absent'}>
              {detail.longGap ? '연속 미입실' : '미입실'}
            </span>
          )}
        </div>
      )}
      </>
      )}
    </div>
  )
}
