// 학습관 지표마다 학생을 단계로 나눈다(best-practice-v5.md: 결석 미리 알림의 단계별 인원 방식).
// 기준은 관리 기준 설정 값을 그대로 쓰고, 주의 단계는 기준의 절반이다. 판정(상담 필요)은 서버 신호 그대로이며 여기서 바꾸지 않는다.
import type { CareSettingsValues } from '../../model/types.ts'
import type { MetricKey } from './branch.ts'
import type { CareRow } from './useCareData.ts'
import { sumVision } from './visionExample.ts'

export type Band = 'ok' | 'watch' | 'over' | 'none'
export const BAND_LABEL: Record<Band, string> = { ok: '정상', watch: '주의', over: '기준 넘음', none: '기록 부족' }

export type Thresholds = Pick<CareSettingsValues, 'absenceDays' | 'planMissingDays' | 'studyDropPercent' | 'startShiftMinutes'> & { minValidDays?: number }

/** 학생의 최근 7일 값(지표마다 한 수). 없으면 null */
/** 최근 7일 중 그 지표의 값이 있는 날 수 */
export function validDays(metric: MetricKey, r: CareRow): number {
  if (metric === 'absence') return r.days.filter((d) => d.attendance === 'absent' || d.attendance === 'present').length
  if (metric === 'plan') return r.days.filter((d) => d.submission === 'missing' || d.submission === 'submitted').length
  if (metric === 'study') return r.days.filter((d) => d.minutes !== null && d.usualMinutes).length
  if (metric === 'start') return r.days.filter((d) => d.start !== null && d.usualStart !== null).length
  return r.vision.filter((v) => v.analyzedPhotos > 0).length
}

export function weekValue(metric: MetricKey, r: CareRow): number | null {
  if (metric === 'absence') return r.days.some((d) => d.attendance === 'absent' || d.attendance === 'present') ? r.days.filter((d) => d.attendance === 'absent').length : null
  if (metric === 'plan') return r.days.some((d) => d.submission === 'missing' || d.submission === 'submitted') ? r.days.filter((d) => d.submission === 'missing').length : null
  if (metric === 'study') return r.week.minutes !== null && r.week.usualWeek ? ((r.week.minutes - r.week.usualWeek) / r.week.usualWeek) * 100 : null
  if (metric === 'start') { const x = r.days.flatMap((d) => d.start !== null && d.usualStart !== null ? [d.start - d.usualStart] : []); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null }
  const a = sumVision(r.vision).axes.phone_interaction
  return a.analyzed ? (a.yes / a.analyzed) * 100 : null
}

export function bandOf(metric: MetricKey, v: number | null, t: Thresholds, valid = 7): Band {
  if (v === null || valid < (t.minValidDays ?? 1)) return 'none'
  if (metric === 'absence') return v >= t.absenceDays ? 'over' : v >= 1 ? 'watch' : 'ok'
  if (metric === 'plan') return v >= t.planMissingDays ? 'over' : v >= 1 ? 'watch' : 'ok'
  if (metric === 'study') return v <= -t.studyDropPercent ? 'over' : v <= -t.studyDropPercent / 2 ? 'watch' : 'ok'
  if (metric === 'start') return v >= t.startShiftMinutes ? 'over' : v >= t.startShiftMinutes / 2 ? 'watch' : 'ok'
  return 'ok'
}

export interface BandGroups { ok: CareRow[]; watch: CareRow[]; over: CareRow[]; none: CareRow[] }
export function bandGroups(metric: MetricKey, rows: CareRow[], t: Thresholds): BandGroups {
  const g: BandGroups = { ok: [], watch: [], over: [], none: [] }
  for (const r of rows) g[bandOf(metric, weekValue(metric, r), t, validDays(metric, r))].push(r)
  // 기준에서 먼 학생부터
  const key = (r: CareRow) => { const v = weekValue(metric, r) ?? 0; return metric === 'study' ? v : -v }
  for (const k of ['watch', 'over'] as const) g[k].sort((a, b) => key(a) - key(b))
  return g
}

/** 날짜별로 그날 기준을 넘은 학생 수(그날 값이 있는 학생이 없으면 null). 비전은 그날 사진 합산 휴대폰 사용 비율(%) */
export function dailyOver(metric: MetricKey, rows: CareRow[], t: Thresholds): { v: number | null; base: number }[] {
  const days = rows[0]?.days ?? []
  return days.map((_, i) => {
    if (metric === 'vision') { let y = 0, n = 0, k = 0; for (const r of rows) { const v = r.vision[i]; if (v.analyzedPhotos && !v.unsupportedAxes.includes('phone_interaction')) { y += v.axes.phone_interaction.yes; n += v.analyzedPhotos; k++ } } return { v: n ? (y / n) * 100 : null, base: k } }
    const has = (r: CareRow) => { const d = r.days[i]
      if (metric === 'absence') return d.attendance === 'absent' || d.attendance === 'present'
      if (metric === 'plan') return d.submission === 'missing' || d.submission === 'submitted'
      if (metric === 'study') return d.minutes !== null && !!d.usualMinutes
      return d.start !== null && d.usualStart !== null }
    const over = (r: CareRow) => { const d = r.days[i]
      if (metric === 'absence') return d.attendance === 'absent'
      if (metric === 'plan') return d.submission === 'missing'
      if (metric === 'study') return ((d.minutes! - d.usualMinutes!) / d.usualMinutes!) * 100 <= -t.studyDropPercent
      return d.start! - d.usualStart! >= t.startShiftMinutes }
    const valid = rows.filter(has)
    return { v: valid.length ? valid.filter(over).length : null, base: valid.length }
  })
}

export const weekText = (metric: MetricKey, v: number | null) => {
  if (v === null) return '기록 없음'
  if (metric === 'absence') return `결석 ${v}일`
  if (metric === 'plan') return `계획 미제출 ${v}일`
  if (metric === 'study') return `평소 대비 ${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}%`
  if (metric === 'start') return v >= 0 ? `평소보다 ${Math.round(v)}분 늦게` : `평소보다 ${Math.abs(Math.round(v))}분 일찍`
  return `휴대폰 사용 ${Math.round(v)}%`
}
