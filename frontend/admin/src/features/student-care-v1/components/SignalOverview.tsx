import { useState } from 'react'
import { buildMockMetrics, type ChangeLevel, type MetricSeries } from '../model/mockMetrics.ts'
import type { SignalSummary } from '../model/types.ts'
import { MetricChart } from './MetricChart.tsx'

type Signal = SignalSummary & { evidence?: string[] }

interface Props {
  studentId: string
  asOf: string
  signals: Signal[]
  /** 기록 부족으로 판단을 보류한 학생 */
  deferred: boolean
  dailyStudy: { date: string; minutes: number }[]
  usualDailyMinutes: number
  excludeWeekend: boolean
  onExcludeWeekendChange: (value: boolean) => void
}

const PERIODS = [14, 28] as const
const LEVEL_ORDER: Record<ChangeLevel, number> = { big: 0, some: 1, none: 2 }

/**
 * 지표마다 "이 학생의 과거 대비 얼마나 달라졌나"를 보여 준다.
 * 평소와 다른 지표는 그래프까지 크게, 평소 수준인 지표는 접어서 2열로 작게 둔다.
 */
export function SignalOverview(props: Props) {
  const { studentId, asOf, signals, deferred, dailyStudy, usualDailyMinutes, excludeWeekend, onExcludeWeekendChange } = props
  const [period, setPeriod] = useState<number>(28)
  const { pattern, metrics } = buildMockMetrics(studentId, asOf, signals, dailyStudy, usualDailyMinutes, period, excludeWeekend)
  const sorted = [...metrics].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
  const changed = sorted.filter((series) => series.level !== 'none')
  const usual = sorted.filter((series) => series.level === 'none')
  const bigCount = metrics.filter((series) => series.level === 'big').length

  return (
    <section className="sc-overview" aria-label="과거 대비 변화">
      <div className="sc-overview__bar">
        <div>
          <span className="sc-overview__title">과거 대비 변화</span>
          <span className="sc-overview__pattern">
            {pattern.attendLabel}
            {deferred && ' · 기록 부족으로 판단 보류'}
          </span>
        </div>
        <div className="sc-overview__controls">
          <label className="sc-switch">
            <input type="checkbox" checked={excludeWeekend} onChange={(event) => onExcludeWeekendChange(event.target.checked)} />
            주말 제외
          </label>
          <div className="sc-period" role="group" aria-label="기간">
            {PERIODS.map((days) => (
              <button
                key={days}
                type="button"
                className={days === period ? 'sc-period__button sc-period__button--on' : 'sc-period__button'}
                aria-pressed={days === period}
                onClick={() => setPeriod(days)}
              >
                {days}일
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className={bigCount ? 'sc-overview__verdict sc-overview__verdict--big' : 'sc-overview__verdict'}>
        {bigCount ? `평소와 크게 다른 지표 ${bigCount}개` : '크게 다른 지표 없음 · 별일 아닐 수 있음'}
      </p>

      {changed.length > 0 && (
        <ul className="sc-metrics">
          {changed.map((series) => (
            <MetricCard key={series.type} series={series} />
          ))}
        </ul>
      )}

      {usual.length > 0 && (
        <>
          <h4 className="sc-overview__group">평소 수준 {usual.length}개</h4>
          <ul className="sc-metrics sc-metrics--compact">
            {usual.map((series) => (
              <MetricCard key={series.type} series={series} compact />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function MetricCard({ series, compact = false }: { series: MetricSeries; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <li
      className={`sc-metric sc-metric--${series.level}${compact ? ' sc-metric--compact' : ''}${compact && open ? ' sc-metric--open' : ''}`}
      aria-label={series.level === 'big' ? `${series.label}, 평소와 크게 다름` : series.label}
    >
      <div className="sc-metric__head">
        <span className="sc-metric__label">{series.label}</span>
        {compact && (
          <button type="button" className="sc-fold" aria-expanded={open} onClick={() => setOpen(!open)}>
            그래프 <span aria-hidden="true">{open ? '▴' : '▾'}</span>
          </button>
        )}
      </div>
      <p className="sc-metric__change">{series.change}</p>
      <p className="sc-metric__usual">{series.detail}</p>
      {(!compact || open) && <MetricChart view={series.view} flag={series.level !== 'none'} />}
    </li>
  )
}
