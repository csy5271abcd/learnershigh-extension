import type { CareReason, MetricUnit, NoteChannel, Trend } from './types.ts'

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

/** 다음 점검일 선택지. 서버 허용 범위는 기준일+1 ~ +28 (65-4, 65-6). */
// '선택 없음'은 서버가 계속 관리에 점검일을 요구하므로 허용 최대(28일 뒤)로 보낸다.
export const RECHECK_CHOICES: readonly { days: number; label: string }[] = [
  { days: 3, label: '3일 뒤' },
  { days: 7, label: '7일 뒤' },
  { days: 14, label: '14일 뒤' },
  { days: 28, label: '선택 없음' },
]

export function hoursMinutes(minutes: number): string {
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

export const CHANNELS: readonly { value: NoteChannel; label: string }[] = [
  { value: 'MEETING', label: '면담' },
  { value: 'CALL', label: '통화' },
  { value: 'MESSAGE', label: '문자' },
]

export const REASONS: readonly { value: CareReason; label: string }[] = [
  { value: 'EXPECTED_CHANGE', label: '문제없음' },
  { value: 'RECORD_ISSUE', label: '기록 오류' },
  { value: 'ADJUSTMENT_NEEDED', label: '계속 관리' },
]

export const TREND_LABEL: Record<Trend, string> = {
  IMPROVED: '좋아짐',
  SAME: '그대로',
  WORSENED: '나빠짐',
}
