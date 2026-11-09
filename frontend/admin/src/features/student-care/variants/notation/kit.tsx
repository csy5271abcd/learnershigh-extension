// 표시법 20종이 함께 쓰는 입력·눈금 도구. 그림 모양은 여기 두지 않는다(후보마다 따로 쓴다).
import type { CareRow } from '../shared/useCareData.ts'
import type { OpsDay } from '../../ops/opsModel.ts'
import type { SupEvent } from '../supervisor/supervisorClient.ts'
import { md } from '../shared/useCareData.ts'

export interface NotationProps {
  s: CareRow
  rows: CareRow[]
  ev: SupEvent[]
  evAll: Map<string, SupEvent[]>
  th: { drop: number; shift: number; rate: number }
  /** 다른 학생 표시를 누르면 그 학생으로 옮긴다(학습관 그림) */
  onStudent?: (r: CareRow) => void
}

export const hm = (minutes: number) => {
  const m = Math.round(Math.abs(minutes)), h = Math.floor(m / 60), r = m % 60
  return h ? (r ? `${h}시간 ${r}분` : `${h}시간`) : `${r}분`
}
export const clock = (minutes: number) => {
  const m = Math.round(minutes), h = Math.floor(m / 60) % 24, r = m % 60
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${String(r).padStart(2, '0')}`
}
export const clockTick = (minutes: number) => `${Math.floor(minutes / 60) % 24}시`
export const day = (d: { date: string; dow: string }) => `${md(d.date)} ${d.dow}`
export const STATE = { present: '입실', absent: '결석', off: '예정 없음', unknown: '기록 없음' } as const

/** 0부터 max까지 보기 좋은 시간 눈금(분 단위 값, 시간 단위 눈금) */
export function hourTicks(maxMinutes: number, count = 4) {
  const hours = Math.max(1, Math.ceil(maxMinutes / 60))
  const step = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30].find((x) => hours / x <= count) ?? 40
  const top = Math.ceil(hours / step) * step
  return { top: top * 60, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step * 60) }
}

/** 시각 축 범위(분). 값들을 30분 단위로 감싼다 */
export function clockDomain(values: number[], pad = 30): [number, number] {
  if (!values.length) return [9 * 60, 22 * 60]
  const lo = Math.floor((Math.min(...values) - pad) / 60) * 60
  const hi = Math.ceil((Math.max(...values) + pad) / 60) * 60
  return [Math.max(0, lo), Math.min(26 * 60, Math.max(hi, lo + 120))]
}

export const studied = (d: OpsDay) => d.minutes !== null && d.attendance === 'present'
export const dropDay = (d: OpsDay, drop: number) => d.minutes !== null && d.usualMinutes ? 100 - (d.minutes / d.usualMinutes) * 100 >= drop : false
export const lateDay = (d: OpsDay, shift: number) => d.start !== null && d.usualStart !== null && d.start - d.usualStart >= shift

/** 최근 35일을 7일씩 다섯 묶음으로(마지막 묶음이 최근 7일) */
export const weeksOf = (s: CareRow) => Array.from({ length: 5 }, (_, w) => s.history35.slice(w * 7, w * 7 + 7))

/** 같은 요일 최근 4주(최근 7일 이전) 공부 분 평균. 서버의 같은 요일 평소가 없을 때만 쓴다 */
export function sameWeekdayMean(s: CareRow, index35: number, key: 'minutes' | 'start'): number | null {
  const vals: number[] = []
  for (let k = index35 - 7; k >= 0; k -= 7) { const v = s.history35[k][key]; if (v !== null && s.history35[k].attendance === 'present') vals.push(v) }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

/** 최근 7일 안에서 결석이 이어진 구간 [시작, 끝] (35일 기준 번호) */
export function absentRuns(days: { attendance: string }[], from = 28): [number, number][] {
  const runs: [number, number][] = []
  days.forEach((d, i) => { if (i < from || d.attendance !== 'absent') return; const last = runs[runs.length - 1]; if (last && last[1] === i - 1) last[1] = i; else runs.push([i, i]) })
  return runs
}
