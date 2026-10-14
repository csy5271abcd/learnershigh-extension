/*
 * Admin Fixture 기준 시점. Date.now()를 쓰지 않는다. (Fixture 상태가 날마다 바뀌지 않게)
 * - 날짜는 Student School Fixture(SCHOOL_SNAPSHOT_DATE = 2026-10-06)와 같다. D-day · Deadline Risk · Today Board · Operations가 모두 이 값을 쓴다.
 * - 시각 11:00 KST: Student Fixture 최하은 영어 Speech V2(AI 분석 10월 3일 20:47)가 "62시간" 대기인 시점 (TasksDetail Mockup 62시간)
 * - 이번 주 = 월요일 2026-10-05 00:00부터 Snapshot 시각까지 (이번 주 완료 KPI)
 */

export const ADMIN_SNAPSHOT_DATE = '2026-10-06'
export const ADMIN_SNAPSHOT_AT = '2026-10-06T11:00:00+09:00'
export const ADMIN_WEEK_START_AT = '2026-10-05T00:00:00+09:00'

/** 이번 Session에 Admin이 한 동작의 시각. Snapshot 시각부터 1분씩 늘린다. (실시간 시계 아님) */
let tick = 0
export function nextActionTime(): string {
  tick += 1
  const base = Date.parse(ADMIN_SNAPSHOT_AT) + tick * 60_000
  return toKstIso(base)
}

/** epoch ms → 'YYYY-MM-DDTHH:MM:00+09:00' */
export function toKstIso(ms: number): string {
  const d = new Date(ms + 9 * 3600_000)
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00+09:00`
}
