// 시안 X′ 공용 계산(학생 겹창·학습관별이 함께 쓴다). 그림 모양은 두지 않는다.
import { useState } from 'react'
import type { CareRow } from '../shared/useCareData.ts'
import { md } from '../shared/useCareData.ts'
import { eventDate, type SupEvent } from '../supervisor/supervisorClient.ts'
import { sameWeekdayMean, weeksOf } from '../notation/kit.tsx'

export type Day = CareRow['days'][number]
export type Period = 'd' | 'w'

/** 칸 하나(일간 = 하루, 주간 = 7일). 35일 번호(idx)를 함께 둬서 같은 요일 평소를 다시 셀 수 있게 한다 */
export interface Slot { key: string; line1: string; line2?: string; days: { d: Day; idx: number }[]; last: boolean }

export function slotsOf(s: CareRow, period: Period): Slot[] {
  if (period === 'd') return s.days.map((d, i) => ({ key: d.date, line1: md(d.date), line2: d.dow, days: [{ d, idx: 28 + i }], last: i === s.days.length - 1 }))
  return weeksOf(s).map((wk, g) => ({ key: wk[0].date, line1: g === 4 ? '최근 7일' : `${md(wk[0].date)}–${md(wk[6].date)}`, days: wk.map((d, k) => ({ d, idx: g * 7 + k })), last: g === 4 }))
}

/** 같은 요일 평소 입실 시각: 서버 값이 있으면 그것, 없으면 앞 주들의 같은 요일 평균(첫 주는 없음) */
export const usualStartAt = (s: CareRow, d: Day, idx: number) => d.usualStart ?? sameWeekdayMean(s, idx, 'start')

/** 비몰입 표시 기준(공부 1시간당 건수). 서버 판정이 아니라 화면 표시 기준이라 이 브라우저에만 저장한다 */
const KEY = 'studentCare.x2.visionPerHour'
export const VISION_DEFAULT = 3
export function readVisionPerHour() {
  try { const v = Number(localStorage.getItem(KEY)); return Number.isFinite(v) && v > 0 ? v : VISION_DEFAULT } catch { return VISION_DEFAULT }
}
export function useVisionPerHour() {
  const [v, setV] = useState(readVisionPerHour)
  const set = (n: number) => { setV(n); try { localStorage.setItem(KEY, String(n)) } catch { /* 저장소를 못 쓰면 이번 화면에서만 */ } }
  return [v, set] as const
}

/** 칸 안 비몰입 건수와 공부 시간. 짧게 공부한 날의 비율이 튀지 않게 공부 시간은 30분 아래로 내리지 않는다 */
export function visionIn(ev: SupEvent[], days: Day[]) {
  const set = new Set(days.map((d) => d.date))
  const n = ev.filter((e) => set.has(eventDate(e))).length
  const minutes = days.reduce((a, d) => a + (d.attendance === 'present' && d.minutes ? d.minutes : 0), 0)
  const perHour = minutes > 0 ? n / Math.max(0.5, minutes / 60) : null
  return { n, minutes, perHour }
}

export const rateText = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))


/** 새 학생: 최근 35일 창 안에서 첫 기록(입실·결석·예정 없음)이 둘째 날 이후에 처음 나온 학생.
 *  첫 기록 앞 날은 '기록 없음'(연동 누락)이 아니라 '첫 기록 전'이다. 창 첫날부터 기록이 있으면 새 학생이 아니다.
 *  서버 판정이 기록 길이에 따라 열리는 때(CareSignalCalculator): 결석·계획 미제출·계획 미달성은 첫 주부터,
 *  입실 지연은 같은 요일 평소와 비교할 수 있는 날이 3일 이상일 때, 공부 시간 감소·과목 비율은 35일(평소 4주 + 최근 7일)이 다 찰 때. */
export interface Newbie { firstIdx: number; first: string | null; days: number; usualWeeks: number }
export function newbieOf(s: CareRow): Newbie | null {
  const h = s.history35
  const firstIdx = h.findIndex((d) => d.attendance !== 'unknown')
  if (firstIdx === 0) return null
  if (firstIdx < 0) return { firstIdx: h.length, first: null, days: 0, usualWeeks: 0 }
  return { firstIdx, first: h[firstIdx].date, days: h.length - firstIdx, usualWeeks: Math.max(0, Math.floor((28 - firstIdx) / 7)) }
}

