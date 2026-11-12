// Y 전용 지표 정의(데이터 분석 화면). 학생끼리 비교하되 기준은 학습관 평균이 아니라 '그 학생의 평소'다(G48·G49: 정상 개인차는 문제가 아니고,
// 개인 기준의 변화가 문제다). 그래서 칸마다 '평소 대비 얼마나 벗어났나'를 같은 꼴(가운데 = 평소)로 그린다.
// 빨강(flag)은 학생 케어 서버 사유가 있고 지금 값도 같은 기준을 넘을 때만. 비몰입은 서버 판정이 없어 칠하지 않는다.
// 기록이 없는 기간(연동 누락·등록 전)은 0이 아니라 값 없음(null).
import type { CareRow } from '../shared/useCareData.ts'
import { md } from '../shared/useCareData.ts'
import { eventDate, type SupEvent } from '../supervisor/supervisorClient.ts'

export type Day = CareRow['days'][number]
export type Key = 'absent' | 'missing' | 'study' | 'late' | 'plan' | 'vision'
export interface Th { drop: number; shift: number; rate: number }

const known = (ds: Day[]) => ds.some((d) => d.attendance !== 'unknown')
const has = (r: CareRow, ...t: string[]) => r.signals.some((x) => t.includes(x.type))
export const hm = (m: number) => { const h = Math.floor(Math.abs(m) / 60), n = Math.round(Math.abs(m) % 60); return h ? `${h}시간${n ? ` ${n}분` : ''}` : `${n}분` }
export const weeksOf = (r: CareRow) => Array.from({ length: 5 }, (_, w) => r.history35.slice(w * 7, w * 7 + 7))
export const weekLabel = (r: CareRow, w: number) => w === 4 ? '최근 7일' : `${md(r.history35[w * 7].date)}~`
const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null

/** 칸 하나의 값: now = 이번 값, usual = 그 학생의 평소, dev = 평소에서 벗어난 정도(그림 눈금 단위), text = 칸에 적는 짧은 수 */
export interface Cell { now: number | null; usual: number | null; dev: number | null; text: string; tip: string; flag: boolean }

export interface Metric {
  key: Exclude<Key, 'absent' | 'missing'>
  name: string
  unit: string
  /** 가운데(평소)에서 양쪽 끝까지의 눈금 */
  span: number
  /** 오른쪽(+)이 나쁜 쪽이면 true(늦음·비몰입 늘어남), 왼쪽(−)이 나쁜 쪽이면 false(공부·계획 줄어듦) */
  rightIsBad: boolean
  cell: (r: CareRow, ev: SupEvent[] | null, th: Th) => Cell
  /** 최근 5주 주별 값(펼친 줄) */
  weeks: (r: CareRow, ev: SupEvent[] | null) => (number | null)[]
  weekText: (v: number) => string
}

/** 결석·계획 미제출: 칸 = 최근 7일 날짜별 상태 점 + 일수 */
export interface DayMetric { key: 'absent' | 'missing'; name: string; bad: (d: Day) => boolean; count: (r: CareRow) => number | null; flag: (r: CareRow) => boolean; weeks: (r: CareRow) => (number | null)[] }
export const DAY_METRICS: DayMetric[] = [
  { key: 'absent', name: '미입실', bad: (d) => d.attendance === 'absent', count: (r) => known(r.days) ? r.days.filter((d) => d.attendance === 'absent').length : null, flag: (r) => has(r, 'CONSECUTIVE_ABSENCE', 'WEEKDAY_ABSENCE'), weeks: (r) => weeksOf(r).map((wk) => known(wk) ? wk.filter((d) => d.attendance === 'absent').length : null) },
  { key: 'missing', name: '계획 미제출', bad: (d) => d.submission === 'missing', count: (r) => known(r.days) ? r.days.filter((d) => d.submission === 'missing').length : null, flag: (r) => has(r, 'PLAN_MISSING'), weeks: (r) => weeksOf(r).map((wk) => known(wk) ? wk.filter((d) => d.submission === 'missing').length : null) },
]

const lateOf = (ds: Day[], all: Day[]) => {
  const med = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
  const base = (d: Day) => d.usualStart ?? med(all.filter((x) => x.dow === d.dow && x.start !== null).map((x) => x.start!))
  return mean(ds.filter((d) => d.attendance === 'present' && d.start !== null && base(d) !== null).map((d) => d.start! - base(d)!))
}
const seen = (ev: SupEvent[], ds: Day[]) => { if (!ds.some((d) => d.attendance === 'present')) return known(ds) ? 0 : null; const set = new Set(ds.map((d) => d.date)); return ev.filter((e) => set.has(eventDate(e))).length }

export const METRICS: Metric[] = [
  { key: 'study', name: '공부 시간', unit: '시간', span: 100, rightIsBad: false,
    cell: (r, _ev, th) => { const now = r.week.minutes, usual = r.week.usualWeek
      const dev = now !== null && usual ? (now / usual - 1) * 100 : null
      return { now, usual, dev, text: now === null ? '–' : (now / 60).toFixed(1), flag: has(r, 'STUDY_DROP') && dev !== null && -dev >= th.drop,
        tip: `공부 시간 · 최근 7일 ${now === null ? '기록 없음' : hm(now)}${usual ? ` · 평소 한 주 ${hm(usual)}` : ' · 평소 없음'}${dev !== null ? ` · 평소의 ${Math.round(100 + dev)}%` : ''}` } },
    weeks: (r) => weeksOf(r).map((wk) => known(wk) ? wk.reduce((a, d) => a + (d.attendance === 'present' && d.minutes ? d.minutes : 0), 0) : null), weekText: (v) => (v / 60).toFixed(1) },
  { key: 'late', name: '등원 시간 늦어짐', unit: '분', span: 120, rightIsBad: true,
    cell: (r, _ev, th) => { const dev = lateOf(r.days, r.history35)
      return { now: dev, usual: 0, dev, text: dev === null ? '–' : `${Math.round(dev)}`, flag: has(r, 'START_TIME_SHIFT') && dev !== null && dev >= th.shift,
        tip: `등원 시각 · ${dev === null ? '평소와 비교할 입실 없음' : Math.round(dev) > 0 ? `평소보다 평균 ${hm(dev)} 늦게` : Math.round(dev) < 0 ? `평소보다 평균 ${hm(-dev)} 일찍` : '평소와 같음'}` } },
    weeks: (r) => weeksOf(r).map((wk) => lateOf(wk, r.history35)), weekText: (v) => `${Math.round(v)}` },
  { key: 'plan', name: '계획 미달성', unit: '계획 대비 %', span: 100, rightIsBad: false,
    cell: (r, _ev, th) => { const now = r.week.executionRate
      return { now, usual: 100, dev: now === null ? null : Math.max(-100, now - 100), text: now === null ? '–' : `${Math.floor(now)}`, flag: has(r, 'EXECUTION_GAP') && now !== null && now < th.rate,
        tip: `계획 대비 실제 · ${now === null ? '최근 7일 계획 없음' : `${Math.floor(now)}%`}` } },
    // 주별도 서버와 같은 식: 계획을 낸 날의 실제 ÷ 계획
    weeks: (r) => weeksOf(r).map((wk) => { const ds = wk.filter((d) => (d.planned ?? 0) > 0); const p = ds.reduce((a, d) => a + d.planned!, 0); return p ? (ds.reduce((a, d) => a + (d.actual ?? 0), 0) / p) * 100 : null }), weekText: (v) => `${Math.floor(v)}` },
  { key: 'vision', name: '비몰입', unit: '건', span: 10, rightIsBad: true,
    cell: (r, ev) => { if (!ev) return { now: null, usual: null, dev: null, text: '…', tip: '사진 관찰 불러오는 중', flag: false }
      const now = seen(ev, r.days), past = weeksOf(r).slice(0, 4).map((wk) => seen(ev, wk)).filter((v): v is number => v !== null), usual = mean(past)
      return { now, usual, dev: now !== null && usual !== null ? now - usual : null, text: now === null ? '–' : `${now}`, flag: false,
        tip: `비몰입 · 최근 7일 ${now === null ? '기록 없음' : `${now}건`}${usual !== null ? ` · 지난 4주 한 주 평균 ${usual.toFixed(1)}건` : ''}` } },
    weeks: (r, ev) => ev ? weeksOf(r).map((wk) => seen(ev, wk)) : [null, null, null, null, null], weekText: (v) => `${v}` },
]
