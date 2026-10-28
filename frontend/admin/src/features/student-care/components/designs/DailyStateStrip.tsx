import { shortDate } from '../../model/format.ts'

export interface DailyStateCell {
  date: string
  state: 'present' | 'absent' | 'submitted' | 'missing' | 'unknown' | 'excluded'
  label: string
  detail?: string
}

/** 일별 입실·제출은 크기가 아닌 상태이므로 동일한 크기의 날짜 칸으로 표시한다. */
export function DailyStateStrip({ days, label }: { days: DailyStateCell[]; label: string }) {
  return <div className="sc-daily-states" aria-label={label}>
    <ol className="sc-daily-state-grid">{days.map(day => <li className={`sc-daily-state is-${day.state}`} key={day.date}>
      <time dateTime={day.date}>{shortDate(day.date)}<small>{['일','월','화','수','목','금','토'][new Date(`${day.date}T00:00:00Z`).getUTCDay()]}</small></time>
      <strong>{day.label}</strong>
      {day.detail && <span>{day.detail}</span>}
    </li>)}</ol>
  </div>
}
