import { ADMIN_SNAPSHOT_AT, ADMIN_SNAPSHOT_DATE } from '../fixtures/snapshot.ts'

/* Snapshot 기준 시간 계산 · 표시 (실시간 시계를 쓰지 않는다) */

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

/** 마감까지 남은 날 (같은 날 = 0, 지남 = 음수) */
export function daysUntil(dateOnly: string, snapshotDate = ADMIN_SNAPSHOT_DATE): number {
  return Math.round((Date.parse(`${dateOnly}T00:00:00Z`) - Date.parse(`${snapshotDate}T00:00:00Z`)) / DAY_MS)
}

/** Snapshot 시각까지 지난 시간 (시간 단위, 버림) */
export function hoursSince(iso: string, snapshotAt = ADMIN_SNAPSHOT_AT): number {
  return Math.max(0, Math.floor((Date.parse(snapshotAt) - Date.parse(iso)) / HOUR_MS))
}

export function hoursBetween(fromIso: string, toIso: string): number {
  return (Date.parse(toIso) - Date.parse(fromIso)) / HOUR_MS
}

export function formatDday(days: number): string {
  if (days === 0) return 'D-Day'
  return days > 0 ? `D-${days}` : `D+${-days}`
}

export function formatMonthDay(dateOnly: string): string {
  const [, month, day] = dateOnly.slice(0, 10).split('-').map(Number)
  return `${month}월 ${day}일`
}

/** '10월 3일 20:45' (KST ISO 문자열 그대로 읽는다) */
export function formatDateTime(iso: string): string {
  return `${formatMonthDay(iso)} ${iso.slice(11, 16)}`
}

/** 2일 14시간 / 20시간 */
export function formatWaiting(hours: number): string {
  const day = Math.floor(hours / 24)
  const hour = hours % 24
  if (day === 0) return `${hour}시간`
  return hour === 0 ? `${day}일` : `${day}일 ${hour}시간`
}

/** 185 → '3:05' (Mockup 순공 표기) */
export function formatStudyTime(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
}

/** 185 → '3시간 5분' (읽기용) */
export function formatStudyTimeLong(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

export const formatPercent = (rate: number) => `${Math.round(rate * 100)}%`

/** 2026-10-06 → '10월 6일 (화)' */
export function formatSnapshotLabel(dateOnly = ADMIN_SNAPSHOT_DATE): string {
  const day = ['일', '월', '화', '수', '목', '금', '토'][new Date(`${dateOnly}T00:00:00Z`).getUTCDay()]
  return `${formatMonthDay(dateOnly)} (${day})`
}
