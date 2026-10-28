import { useState } from 'react'
import { hoursMinutes, shortDate } from '../model/format.ts'
import { AttendanceChart } from './AttendanceChart.tsx'
import { clock, weekdayOf, type DayState, type MetricView } from '../model/mockMetrics.ts'

const WIDTH = 560
const HEIGHT = 120
const PAD = 10

/** 지표 성격에 맞는 그래프. 안 온 날은 회색, 평소와 다른 날은 주황으로 구분한다. */
export function MetricChart({ view, flag }: { view: MetricView; flag: boolean }) {
  switch (view.kind) {
    case 'weekly':
      return view.calendar ? (
        <AttendanceChart view={{ ...view, calendar: view.calendar }} flag={flag} />
      ) : (
        <WeeklyChart view={view} flag={flag} />
      )
    case 'line':
      return <LineChart view={view} />
    case 'planActual':
      return <PlanActualChart view={view} />
    case 'share':
      return <ShareChart view={view} flag={flag} />
    case 'strip':
      return <DayStrip view={view} />
    case 'dateList':
      return <DateList view={view} />
  }
}

function WeeklyChart({ view, flag }: { view: Extract<MetricView, { kind: 'weekly' }>; flag: boolean }) {
  const max = Math.max(view.usual, ...view.weeks.map((week) => week.value), 1) * 1.3
  const format = (value: number) => (view.unit === 'minutes' ? hoursMinutes(value) : `${value}회`)
  const last = view.weeks.length - 1
  return (
    <figure className="sc-weekly" aria-label={`주별 합계, 평소 ${format(view.usual)}`}>
      <div className="sc-chart__legend" aria-hidden="true">
        <span className="sc-chart__dash" /> 평균
      </div>
      <div className="sc-weekly__plot">
        <span className="sc-weekly__usual" style={{ bottom: `${(view.usual / max) * 100}%` }} />
        {view.weeks.map((week, index) => (
          <div key={week.label} className="sc-weekly__col">
            <span className={index === last ? 'sc-weekly__value sc-weekly__value--recent' : 'sc-weekly__value'}>
              {format(week.value)}
            </span>
            <span
              className={index === last ? (flag ? 'sc-weekly__bar sc-weekly__bar--flag' : 'sc-weekly__bar sc-weekly__bar--recent') : 'sc-weekly__bar'}
              style={{ height: `${(week.value / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="sc-weekly__labels">
        {view.weeks.map((week) => (
          <span key={week.label}>{week.label}</span>
        ))}
      </div>
      {view.daily && <DailyFold days={view.daily} />}
    </figure>
  )
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

/** 학습 시간: 접어 둔 일별 (화면 기간 전체, 최근부터) */
function DailyFold({ days }: { days: { date: string; minutes: number; came: boolean }[] }) {
  const [open, setOpen] = useState(false)
  const max = Math.max(...days.map((day) => day.minutes), 60)
  return (
    <>
      <button type="button" className="sc-fold" aria-expanded={open} onClick={() => setOpen(!open)}>
        일별 보기 <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <ul className="sc-daily">
          {days.map((day) => (
            <li key={day.date} className="sc-daily__row">
              <span className="sc-daily__date">
                {shortDate(day.date)} ({WEEKDAY[weekdayOf(day.date)]})
              </span>
              {day.came ? (
                <>
                  <span className="sc-daily__track">
                    <span className="sc-daily__bar" style={{ width: `${(day.minutes / max) * 100}%` }} />
                  </span>
                  <span className="sc-daily__value">{hoursMinutes(day.minutes)}</span>
                </>
              ) : (
                <span className="sc-daily__absent">결석</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/** 계획 제출: 온 날짜만 나열하고 제출 / 미제출만 */
function DateList({ view }: { view: Extract<MetricView, { kind: 'dateList' }> }) {
  return (
    <ul className="sc-datelist">
      {view.days.map((day) => (
        <li key={day.date} className={`sc-datelist__item sc-datelist__item--${day.state}`}>
          <span className="sc-datelist__date">{shortDate(day.date)}</span>
          <span>{day.state === 'skip' ? '제외' : day.state === 'ok' ? '제출' : '미제출'}</span>
        </li>
      ))}
    </ul>
  )
}

/** 입실 시각: 온 날마다 막대. 늦게 올수록 길고, 평소보다 많이 늦은 날은 주황. 막대마다 날짜 · 시각. */
function LineChart({ view }: { view: Extract<MetricView, { kind: 'line' }> }) {
  const days = view.days.flatMap((day) => (day.value === null ? [] : [{ ...day, value: day.value }]))
  const floor = Math.min(view.usual, ...days.map((day) => day.value)) - 30
  const max = Math.max(view.usual, ...days.map((day) => day.value)) - floor + 10
  const pct = (minutes: number) => ((minutes - floor) / max) * 100
  const dense = days.length > 14

  return (
    <figure className={dense ? 'sc-start sc-start--dense' : 'sc-start'} aria-label={`온 날 입실 시각, 평소 ${clock(view.usual)}`}>
      <div className="sc-chart__legend" aria-hidden="true">
        <span className="sc-chart__dash" /> 평균
      </div>
      <div className="sc-start__plot">
        <span className="sc-weekly__usual" style={{ bottom: `${pct(view.usual)}%` }} />
        {days.map((day) => (
          <div key={day.date} className="sc-start__col" title={`${shortDate(day.date)} ${clock(day.value)}`}>
            <span className="sc-start__value">{clock(day.value)}</span>
            <span className={day.late ? 'sc-start__bar sc-start__bar--late' : 'sc-start__bar'} style={{ height: `${pct(day.value)}%` }} />
          </div>
        ))}
      </div>
      <div className="sc-start__dates" aria-hidden="true">
        {days.map((day) => (
          <span key={day.date}>{shortDate(day.date)}</span>
        ))}
      </div>
    </figure>
  )
}

function PlanActualChart({ view }: { view: Extract<MetricView, { kind: 'planActual' }> }) {
  const max = Math.max(...view.days.map((day) => Math.max(day.planned, day.actual)), 60) * 1.08
  const slot = WIDTH / view.days.length
  const bar = slot * 0.62
  const height = (minutes: number) => (minutes / max) * (HEIGHT - PAD)

  return (
    <figure className="sc-chart">
      <div className="sc-chart__legend" aria-hidden="true">
        <span className="sc-legend sc-legend--plan" /> 계획
        <span className="sc-legend sc-legend--actual" /> 실제
        <span className="sc-legend sc-legend--low" /> 절반 이하
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="계획 대비 실제 학습 시간">
        {view.days.map((day, index) => {
          const x = index * slot + (slot - bar) / 2
          if (day.off) return null
          const done = Math.min(day.actual, day.planned)
          return (
            <g key={day.date}>
              <rect className="sc-plan" x={x} y={HEIGHT - height(day.planned)} width={bar} height={height(day.planned)} rx={2} />
              <rect
                className={day.planned && done / day.planned <= 0.5 ? 'sc-actual sc-actual--low' : 'sc-actual'}
                x={x}
                y={HEIGHT - height(done)}
                width={bar}
                height={height(done)}
                rx={2}
              >
                <title>{`${shortDate(day.date)} 계획 ${hoursMinutes(Math.round(day.planned))} · 실제 ${hoursMinutes(Math.round(day.actual))}`}</title>
              </rect>
            </g>
          )
        })}
        <line className="sc-chart__axis" x1={0} x2={WIDTH} y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} />
      </svg>
      <div className={view.days.length > 14 ? 'sc-start__dates sc-start__dates--dense' : 'sc-start__dates'} aria-hidden="true">
        {view.days.map((day) => (
          <span key={day.date}>{shortDate(day.date)}</span>
        ))}
      </div>
    </figure>
  )
}

/** 과목별 학습 비율: 최근 7일 과목별 계획 비중(회색) vs 실제 비중. 차이가 가장 큰 과목 강조. */
function ShareChart({ view, flag }: { view: Extract<MetricView, { kind: 'share' }>; flag: boolean }) {
  const max = Math.max(...view.subjects.flatMap((subject) => [subject.plan, subject.actual]), 10)
  return (
    <figure className="sc-chart sc-share">
      <div className="sc-chart__legend" aria-hidden="true">
        <span className="sc-legend sc-share__key--plan" /> 계획 비중
        <span className="sc-legend sc-share__key--actual" /> 실제 비중
      </div>
      {view.subjects.map((subject) => {
        const gap = subject.actual - subject.plan
        const worst = flag && subject.name === view.worst && Math.abs(gap) >= 0.1
        return (
          <div key={subject.name} className={worst ? 'sc-share__row sc-share__row--worst' : 'sc-share__row'}>
            <span className="sc-share__label">{subject.name}</span>
            <span className="sc-share__bars">
              <span className="sc-share__bar sc-share__bar--plan" style={{ width: `${(subject.plan / max) * 100}%` }} />
              <span
                className={worst ? 'sc-share__bar sc-share__bar--flag' : 'sc-share__bar'}
                style={{ width: `${(subject.actual / max) * 100}%` }}
              />
            </span>
            <span className="sc-share__value">
              {subject.plan}% → {subject.actual}%
            </span>
          </div>
        )
      })}
    </figure>
  )
}

function DayStrip({ view }: { view: Extract<MetricView, { kind: 'strip' }> }) {
  const last = view.days.length - 1
  const order: DayState[] = ['ok', 'off', 'missOld', 'miss']
  return (
    <figure className="sc-chart">
      <ol className="sc-strip">
        {view.days.map((day, index) => (
          <li key={day.date} className={`sc-strip__day sc-strip__day--${day.state}`}>
            <span className="sc-strip__mark" title={`${shortDate(day.date)} ${view.labels[day.state] ?? ''}`} aria-label={`${shortDate(day.date)} ${view.labels[day.state] ?? ''}`}>
              {day.state === 'miss' ? '✕' : ''}
            </span>
            <span className="sc-strip__date">{weekdayOf(day.date) === 1 || index === last ? shortDate(day.date) : ''}</span>
          </li>
        ))}
      </ol>
      <div className="sc-strip__legend" aria-hidden="true">
        {order
          .filter((state) => view.labels[state])
          .map((state) => (
            <span key={state} className="sc-strip__legend-item">
              <span className={`sc-strip__key sc-strip__key--${state}`} /> {view.labels[state]}
            </span>
          ))}
      </div>
    </figure>
  )
}
