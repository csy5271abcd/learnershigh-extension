import { hoursMinutes, monthDay, shortDate } from '../model/format.ts'

interface Props {
  days: { date: string; minutes: number }[]
  usualDailyMinutes: number
}

const WIDTH = 560
const HEIGHT = 110
const TOP = 8
const BOTTOM = 2

/** 최근 14일 하루 공부 시간. 점선은 평소 하루 평균, 최근 7일은 진한 막대. 화면 읽기용 표를 함께 둔다. */
export function StudyChart({ days, usualDailyMinutes }: Props) {
  const max = Math.max(usualDailyMinutes, ...days.map((day) => day.minutes), 60) * 1.15
  const plot = HEIGHT - TOP - BOTTOM
  const slot = WIDTH / Math.max(days.length, 1)
  const bar = slot * 0.6
  const y = (minutes: number) => TOP + plot - (minutes / max) * plot
  const recentFrom = days.length - 7
  const recentTotal = days.slice(recentFrom).reduce((sum, day) => sum + day.minutes, 0)

  return (
    <figure className="sc-chart">
      <figcaption className="sc-chart__caption">
        <span>14일 공부 시간</span>
        <span className="sc-chart__legend">
          <span className="sc-chart__swatch" aria-hidden="true" /> 최근 7일
          <span className="sc-chart__dash" aria-hidden="true" /> 평소 {usualDailyMinutes}분
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`최근 7일 ${hoursMinutes(recentTotal)}, 평소 하루 ${usualDailyMinutes}분`}
      >
        {days.map((day, index) => (
          <rect
            key={day.date}
            className={index >= recentFrom ? 'sc-chart__bar sc-chart__bar--recent' : 'sc-chart__bar'}
            x={index * slot + (slot - bar) / 2}
            y={y(day.minutes)}
            width={bar}
            rx={2}
            height={Math.max(TOP + plot - y(day.minutes), day.minutes > 0 ? 1 : 0)}
          >
            <title>{`${shortDate(day.date)} ${day.minutes}분`}</title>
          </rect>
        ))}
        <line className="sc-chart__usual" x1={0} x2={WIDTH} y1={y(usualDailyMinutes)} y2={y(usualDailyMinutes)} />
        <line className="sc-chart__axis" x1={0} x2={WIDTH} y1={TOP + plot} y2={TOP + plot} />
      </svg>
      {days.length > 0 && (
        <div className="sc-chart__axis-labels" aria-hidden="true">
          <span>{shortDate(days[0].date)}</span>
          <span>{shortDate(days[days.length - 1].date)}</span>
        </div>
      )}
      <table className="sc-visually-hidden">
        <caption>14일 공부 시간</caption>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{monthDay(day.date)}</th>
              <td>{hoursMinutes(day.minutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
