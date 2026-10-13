import { hoursMinutes, shortDate } from '../model/format.ts'

interface Props {
  days: { date: string; minutes: number }[]
  usualDailyMinutes: number
}

const WIDTH = 420
const HEIGHT = 120
const PADDING_TOP = 10
const PADDING_BOTTOM = 22

/** 최근 14일 하루 학습량. 빨간 점선은 평소 하루 평균, 최근 7일은 진한 색으로 구분한다. */
export function StudyChart({ days, usualDailyMinutes }: Props) {
  const max = Math.max(usualDailyMinutes, ...days.map((day) => day.minutes), 60) * 1.15
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM
  const slot = WIDTH / Math.max(days.length, 1)
  const barWidth = slot * 0.62
  const y = (minutes: number) => PADDING_TOP + plotHeight - (minutes / max) * plotHeight
  const recentFrom = days.length - 7
  const recentTotal = days.slice(recentFrom).reduce((sum, day) => sum + day.minutes, 0)

  return (
    <figure className="sc-chart">
      <figcaption className="sc-chart__caption">
        최근 14일 학습량(분) · <span className="sc-chart__usual-legend">점선</span>은 평소 하루 평균 {usualDailyMinutes}분
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`최근 7일 학습 ${hoursMinutes(recentTotal)}, 평소 하루 평균 ${usualDailyMinutes}분`}
      >
        {days.map((day, index) => (
          <rect
            key={day.date}
            className={index >= recentFrom ? 'sc-chart__bar sc-chart__bar--recent' : 'sc-chart__bar'}
            x={index * slot + (slot - barWidth) / 2}
            y={y(day.minutes)}
            width={barWidth}
            height={Math.max(PADDING_TOP + plotHeight - y(day.minutes), day.minutes > 0 ? 1 : 0)}
          >
            <title>{`${shortDate(day.date)} ${day.minutes}분`}</title>
          </rect>
        ))}
        <line
          className="sc-chart__usual"
          x1={0}
          x2={WIDTH}
          y1={y(usualDailyMinutes)}
          y2={y(usualDailyMinutes)}
        />
        <line className="sc-chart__axis" x1={0} x2={WIDTH} y1={PADDING_TOP + plotHeight} y2={PADDING_TOP + plotHeight} />
        <text className="sc-chart__label" x={2} y={HEIGHT - 6}>
          2주 전
        </text>
        <text className="sc-chart__label sc-chart__label--recent" x={recentFrom * slot + 2} y={HEIGHT - 6}>
          최근 7일
        </text>
      </svg>
    </figure>
  )
}
