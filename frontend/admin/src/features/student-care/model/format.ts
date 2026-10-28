import type { CareReason, MetricUnit, NoteChannel, SignalType, Trend } from './types.ts'

/** 2026-10-07 → "10월 7일" */
export function monthDay(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  return `${month}월 ${day}일`
}

/** 2026-10-07 → "10/7" */
export function shortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  return `${month}/${day}`
}

/** 날짜에 일수를 더한다 (Timezone 영향 없이 날짜만). */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** 다음 확인일 선택지. 서버 허용 범위는 기준일+1 ~ +28 (65-4, 65-6). */
// 관리 유지 시 허용되는 확인일 간격을 표시한다.
export const RECHECK_CHOICES: readonly { days: number; label: string }[] = [
  { days: 3, label: '3일 후' },
  { days: 7, label: '1주 후' },
  { days: 14, label: '2주 후' },
  { days: 28, label: '4주 후' },
]

export function hoursMinutes(minutes: number): string {
  if (minutes < 0) return `−${hoursMinutes(-minutes)}`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}분`
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`
}

export function metric(value: number, unit: MetricUnit): string {
  switch (unit) {
    case 'DAYS':
      return `${value}일`
    case 'MINUTES':
      return hoursMinutes(value)
    case 'PERCENT':
      return `${value}%`
    case 'CLOCK_MINUTES':
      return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
  }
}

/** New arrival snapshots are personal deviations; legacy snapshots keep their clock unit. */
export function comparisonMetric(value:number,unit:MetricUnit,type:SignalType):string {
  if(type==='START_TIME_SHIFT'&&unit==='MINUTES')return value===0?'평소와 같음':`${Math.abs(value)}분 ${value>0?'늦음':'빠름'}`
  return metric(value,unit)
}

export const CHANNELS: readonly { value: NoteChannel; label: string }[] = [
  { value: 'MEETING', label: '면담' },
  { value: 'CALL', label: '통화' },
  { value: 'MESSAGE', label: '문자' },
]

export const REASONS: readonly { value: CareReason; label: string }[] = [
  { value: 'EXPECTED_CHANGE', label: '이상 없음' },
  { value: 'RECORD_ISSUE', label: '기록 오류' },
  { value: 'ADJUSTMENT_NEEDED', label: '계속 관리' },
]

export const TREND_LABEL: Record<Trend, string> = {
  IMPROVED: '개선',
  SAME: '변화 없음',
  WORSENED: '악화',
}

/** 재확인 기한과 현재 기준일의 관계만 표시한다. */
export function followUpLabel(date: string, asOf: string): string {
  return date <= asOf ? '확인 필요' : '확인 예정'
}
