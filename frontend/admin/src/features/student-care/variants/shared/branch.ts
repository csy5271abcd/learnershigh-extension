// 학습관 전체 지표 계산(시안 A–D 공통). 날짜별 값은 4판 branchDays를 그대로 쓰고,
// 학생별 값 목록·주간 분포 구간·비전 집계를 더한다. 판정은 바꾸지 않는다.
import { branchDays, type OpsBranchDay } from './model.ts'
import type { CareRow } from './useCareData.ts'
import { branchVisionDay, sumVision, VISION_AXES, type VisionAxis } from './visionExample.ts'

export type MetricKey = 'absence' | 'study' | 'start' | 'plan' | 'vision'
export const METRIC_LABEL: Record<MetricKey, string> = { absence: '결석', study: '학습 시간', start: '입실 시각', plan: '계획 제출', vision: '비전 관찰' }
export const METRIC_KEYS: MetricKey[] = ['absence', 'study', 'start', 'plan', 'vision']

export interface StudentValue { row: CareRow; actual: string; usual: string; diff: string; sort: number; num?: number }

const quantile = (s: number[], q: number) => { const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo) }
const hm = (m: number | null) => m === null ? '—' : `${Math.floor(Math.round(m) / 60)}시간 ${Math.round(m) % 60}분`
const clockOf = (m: number | null) => { if (m === null) return '—'; const r = Math.round(m); return `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}` }
const sgn = (v: number, unit: string) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}${unit}`

export interface BranchModel {
  days: OpsBranchDay[]
  included: CareRow[]
  studyAvg: (number | null)[]
  vision: ReturnType<typeof branchVisionDay>[]
}

export function branchModel(rows: CareRow[], excluded: ReadonlySet<string>): BranchModel {
  const included = rows.filter((r) => !excluded.has(r.student.studentId))
  const days = branchDays(rows, excluded)
  const studyAvg = days.map((_, i) => { const v = included.flatMap((r) => r.days[i].minutes ?? []); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null })
  const vision = days.map((_, i) => branchVisionDay(included.map((r) => ({ studentId: r.student.studentId, day: r.vision[i] }))))
  return { days, included, studyAvg, vision }
}

/** 한 날짜·지표의 학생 전원 값(그날 값이 있는 학생). 변화가 큰 순서 */
export function studentsOn(m: BranchModel, metric: MetricKey, i: number, axis: VisionAxis = 'phone_interaction'): StudentValue[] {
  const out: StudentValue[] = []
  for (const row of m.included) {
    const d = row.days[i]
    if (metric === 'absence') { if (d.attendance === 'absent' || d.attendance === 'unknown') out.push({ row, actual: d.attendance === 'absent' ? '결석' : '기록 없음', usual: `7일 결석 ${row.days.filter((x) => x.attendance === 'absent').length}일`, diff: d.submission === 'missing' ? '계획 미제출' : '', sort: d.attendance === 'absent' ? 0 : 1 }) }
    else if (metric === 'study') { if (d.minutes !== null && d.usualMinutes) { const p = ((d.minutes - d.usualMinutes) / d.usualMinutes) * 100; out.push({ row, actual: hm(d.minutes), usual: hm(d.usualMinutes), diff: sgn(p, '%'), sort: p, num: p }) } }
    else if (metric === 'start') { if (d.start !== null && d.usualStart !== null) { const x = d.start - d.usualStart; out.push({ row, actual: clockOf(d.start), usual: clockOf(d.usualStart), diff: sgn(x, '분'), sort: -x, num: x }) } }
    else if (metric === 'plan') { if (d.submission === 'missing' || d.submission === 'submitted') out.push({ row, actual: d.submission === 'missing' ? '미제출' : '제출', usual: `7일 미제출 ${row.days.filter((x) => x.submission === 'missing').length}일`, diff: '', sort: d.submission === 'missing' ? 0 : 1 }) }
    else {
      const v = row.vision[i]
      if (v.analyzedPhotos > 0 && !v.unsupportedAxes.includes(axis)) { const share = v.axes[axis].yes / v.analyzedPhotos; out.push({ row, actual: `분석 ${v.analyzedPhotos}장 중 ${v.axes[axis].yes}장${v.analyzedPhotos < 10 ? ' (작은 표본)' : ''}`, usual: `판단 불가 ${v.axes[axis].unknown}장${v.failedPhotos ? ` · 실패 ${v.failedPhotos}장` : ''}`, diff: `${Math.round(share * 1000) / 10}%`, sort: -share, num: share * 100 }) }
      else out.push({ row, actual: v.photosReceived === 0 ? '사진 없음' : v.analyzedPhotos === 0 ? `분석 실패 ${v.failedPhotos}장` : `지원 안 함 ${v.analyzedPhotos}장`, usual: '', diff: '비율 없음', sort: 2 })
    }
  }
  return out.sort((a, b) => a.sort - b.sort || a.row.student.studentName.localeCompare(b.row.student.studentName, 'ko'))
}

/** 학생별 7일 값의 분포 구간(구간마다 학생). 분포 우선 화면(C)과 D 상세가 쓴다 */
export interface Bin { label: string; rows: CareRow[] }
export function weekBins(m: BranchModel, metric: MetricKey, axis: VisionAxis = 'phone_interaction'): { bins: Bin[]; counted: number; title: string } {
  const put = (edges: [string, (v: number) => boolean][], value: (r: CareRow) => number | null, title: string) => {
    const bins: Bin[] = edges.map(([label]) => ({ label, rows: [] }))
    let counted = 0
    for (const r of m.included) { const v = value(r); if (v === null) continue; counted++; const k = edges.findIndex(([, f]) => f(v)); bins[k].rows.push(r) }
    return { bins, counted, title }
  }
  if (metric === 'absence') return put([['0일', (v) => v === 0], ['1일', (v) => v === 1], ['2일', (v) => v === 2], ['3일', (v) => v === 3], ['4일 이상', (v) => v >= 4]], (r) => r.days.filter((d) => d.attendance === 'absent').length, '학생별 7일 결석 일수')
  if (metric === 'plan') return put([['0일', (v) => v === 0], ['1일', (v) => v === 1], ['2일', (v) => v === 2], ['3일', (v) => v === 3], ['4일 이상', (v) => v >= 4]], (r) => r.days.filter((d) => d.submission === 'missing').length, '학생별 7일 계획 미제출 일수')
  if (metric === 'study') return put([['−50% 이하', (v) => v <= -50], ['−50~−30%', (v) => v <= -30], ['−30~−10%', (v) => v < -10], ['−10~+10%', (v) => v <= 10], ['+10~+30%', (v) => v <= 30], ['+30% 초과', () => true]],
    (r) => r.week.minutes !== null && r.week.usualWeek ? ((r.week.minutes - r.week.usualWeek) / r.week.usualWeek) * 100 : null, '학생별 7일 학습 시간 평소 대비')
  if (metric === 'start') return put([['30분 이상 이름', (v) => v <= -30], ['10~30분 이름', (v) => v <= -10], ['±10분', (v) => v < 10], ['10~30분 늦음', (v) => v < 30], ['30~60분 늦음', (v) => v < 60], ['60분 이상 늦음', () => true]],
    (r) => { const x = r.days.flatMap((d) => d.start !== null && d.usualStart !== null ? [d.start - d.usualStart] : []); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null }, '학생별 7일 평균 입실 시각 평소 대비')
  return put([['5% 미만', (v) => v < 5], ['5~10%', (v) => v < 10], ['10~20%', (v) => v < 20], ['20~30%', (v) => v < 30], ['30% 이상', () => true]],
    (r) => { const a = sumVision(r.vision).axes[axis]; return a.analyzed ? (a.yes / a.analyzed) * 100 : null }, `학생별 7일 ${'관찰'} 비율(사진 기준)`)
}

export const visionAxes = VISION_AXES
export const quantileOf = quantile

export const METRIC_SUB: Record<MetricKey, string> = { absence: '결석이 있는 학생의 7일', study: '학생별 평소 대비, 날마다 가운데 값과 가운데 절반', start: '학생별 평소 대비, 날마다 가운데 값과 가운데 절반', plan: '날짜별 계획 미제출 인원', vision: '사진 기준 비율, 예시' }
