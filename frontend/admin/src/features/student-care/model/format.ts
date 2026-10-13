import type { CareReason, EventType, MetricUnit, NoteChannel } from './types.ts'

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

/** 날짜 문자열에 일수를 더한다 (Timezone 영향 없이 날짜만 계산). */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days))
  return next.toISOString().slice(0, 10)
}

/** 두 날짜 사이 일수 (to − from). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/**
 * 재점검일 선택지 (기준일 asOf로부터 N일 뒤). 서버 허용 범위는 asOf+1 ~ asOf+28 (65-4, 65-6).
 * 날짜는 항상 가장 최근에 불러온 asOf로 계산한다.
 */
export const RECHECK_DAY_CHOICES: readonly number[] = [3, 7, 14]
export const DEFAULT_RECHECK_DAYS = 7

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

export const REASON_LABEL: Record<CareReason, string> = {
  EXPECTED_CHANGE: '예상된 변화',
  RECORD_ISSUE: '기록 문제',
  ADJUSTMENT_NEEDED: '조정 필요',
}

export const EVENT_LABEL: Record<EventType, string> = {
  REASON_CONFIRMED: '사유 확인',
  ADJUSTMENT_STARTED: '조정',
  RECHECKED: '재점검',
  CONTINUED: '계속',
  REVISED: '약속 수정',
  CLOSED: '결과·종결',
  NOTE: '메모',
}

export const CHANNEL_LABEL: Record<NoteChannel, string> = {
  MEETING: '면담',
  CALL: '통화',
  MESSAGE: '메시지',
  OTHER: '기타',
}

/** 목적격 조사: 받침이 있으면 "을", 없으면 "를" ("학생 기록을", "케어 보드를"). */
export function withObjectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return `${word}을(를)`
  return `${word}${code % 28 === 0 ? '를' : '을'}`
}
