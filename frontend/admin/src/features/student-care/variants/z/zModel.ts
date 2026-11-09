// 학생 케어 Z안 화면 계산(docs/design/ops-redesign/plan-z.md 3·4장).
// 판정은 학생 케어 서버 신호(useCareData → buildOpsRoster)와 사진 관찰 서버의 관리 사유를 그대로 쓰고, 여기서는 문장·구간 인원·보는 순서만 만든다.
import type { CareRow } from '../shared/useCareData.ts'
import { md } from '../shared/useCareData.ts'
import type { OpsDay, OpsStudent } from '../../ops/opsModel.ts'
import { REASON_LABEL, type VisionStudent } from './vision/visionModel.ts'

export type Group = 'recheck' | 'check' | 'managed' | 'normal' | 'deferred'
export const GROUPS: Group[] = ['recheck', 'check', 'managed', 'normal', 'deferred']
export const GROUP_LABEL: Record<Group, string> = { recheck: '점검일이 된 학생', check: '확인할 학생', managed: '관리 중', normal: '특이 없음', deferred: '기록 부족' }
export const groupOf = (r: OpsStudent): Group => r.status

/** 시간 길이. 1시간 미만은 분만 쓴다 */
export const dur = (minutes: number | null) => {
  if (minutes === null) return '—'
  const m = Math.round(Math.abs(minutes)), h = Math.floor(m / 60), r = m % 60
  return h ? (r ? `${h}시간 ${r}분` : `${h}시간`) : `${r}분`
}
/** 시각(분 → 오전/오후 h:mm) */
export const timeOfDay = (minutes: number) => {
  const m = Math.round(minutes), h = Math.floor(m / 60) % 24, r = m % 60
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${String(r).padStart(2, '0')}`
}
export const dayLabel = (d: { date: string; dow: string }) => `${md(d.date)} ${d.dow}`
const num = (text: string) => Number(text.match(/-?\d+(\.\d+)?/)?.[0] ?? NaN)

/** 학생 한 명의 사진 관찰 7일. 연결 전·로그인 전·보고 없음이면 null */
export type VisionSummary = VisionStudent | null

// ── 달라진 점 문장 ──────────────────────────────────────────────
export interface Note { key: string; text: string; tone: 'flag' | 'plain' | 'example' }

/** 마지막 날부터 거꾸로 이어진 결석 일수(예정 없는 날은 건너뜀) */
const trailingAbsence = (days: OpsDay[]) => { let n = 0; for (let i = days.length - 1; i >= 0; i--) { const a = days[i].attendance; if (a === 'off') continue; if (a === 'absent') n++; else break } return n }

export function notesFor(r: CareRow, vision: VisionSummary): Note[] {
  const notes: Note[] = []
  const days = r.days, w = r.week
  if (r.status === 'managed' || r.status === 'recheck') {
    notes.push({ key: 'managed', text: `관리 사유 ${r.signals.map((s) => s.label).join(', ') || '—'}`, tone: 'plain' })
  } else {
    const absent = days.filter((d) => d.attendance === 'absent')
    const missing = days.filter((d) => d.submission === 'missing')
    const has = (t: string) => r.signals.some((s) => s.type === t)
    const missingOnAbsent = has('CONSECUTIVE_ABSENCE') && has('PLAN_MISSING') && missing.every((m) => absent.some((a) => a.date === m.date))
    for (const s of r.signals) {
      let text = s.label
      if (s.type === 'CONSECUTIVE_ABSENCE') {
        const trail = trailingAbsence(days)
        text = (trail >= 2 && trail === absent.length ? `${trail}일째 결석` : r.absencePattern === '연속' ? `${absent.length}일 연속 결석` : `7일 중 ${absent.length}일 결석`) + (missingOnAbsent ? ' · 계획 미제출' : '')
      } else if (s.type === 'PLAN_MISSING') {
        if (missingOnAbsent) continue
        text = `계획 ${missing.length}일 미제출`
      } else if (s.type === 'STUDY_DROP') {
        if (w.minutes !== null && w.usualWeek) text = `공부 시간 평소의 ${Math.round((w.minutes / w.usualWeek) * 100)}%`
      } else if (s.type === 'EXECUTION_GAP') {
        const rate = w.executionRate ?? num(s.summary)
        if (Number.isFinite(rate)) text = `계획 대비 ${Math.round(rate)}%만 공부`
      } else if (s.type === 'START_TIME_SHIFT') {
        const late = num(s.summary)
        if (Number.isFinite(late)) text = `입실이 평소보다 ${dur(late)} 늦음`
      } else if (s.type === 'SUBJECT_SHARE') {
        const m = s.summary.match(/^(\S+) 계획 (\d+)% → 실제 (\d+)%/)
        if (m) text = `${m[1]} 계획 ${m[2]}% → 실제 ${m[3]}%`
      }
      notes.push({ key: s.type, text, tone: 'flag' })
    }
  }
  if (r.status === 'deferred') notes.push({ key: 'deferred', text: `최근 7일 30분 이상 공부한 날 ${days.filter((d) => (d.minutes ?? 0) >= 30).length}일`, tone: 'plain' })
  if (r.weekdayAbsence) notes.push({ key: 'weekday', text: `최근 5주 ${r.weekdayAbsence.dow}요일 결석 ${r.weekdayAbsence.absent}/${r.weekdayAbsence.weeks}번`, tone: 'plain' })
  // 사진 관찰은 7일 중 2일 이상 반복된 사유만 명부·문장에 올린다(하루짜리는 학생 상세의 날짜 칸에서 본다)
  for (const a of (vision?.reasonDays ?? []).filter((x) => x.days >= 2)) notes.push({ key: `vision-${a.reason}`, text: `${REASON_LABEL[a.reason]} · 7일 중 ${a.days}일`, tone: 'plain' })
  return notes
}

/** 관리 중 학생의 점검일 문구 */
export const recheckText = (r: OpsStudent) => r.recheckDate ? `${r.status === 'recheck' ? '점검일' : '다음 점검'} ${md(r.recheckDate)}` : ''

// ── 학습관: 지표별 구간 인원 ──────────────────────────────────────
export interface Bucket { key: string; label: string; rows: CareRow[]; flag: boolean; none?: boolean }
export interface BucketMetric {
  key: 'absence' | 'plan' | 'study' | 'start' | 'execution' | 'vision'
  title: string
  buckets: Bucket[]
  /** 학생 목록에서 그 학생의 값 */
  value: (r: CareRow) => string
  /** 학생 목록 정렬(큰 값이 위) */
  rank: (r: CareRow) => number
}

const bucketize = (rows: CareRow[], of: (r: CareRow) => number | null, defs: { key: string; label: string; test: (v: number) => boolean; flag?: boolean }[], noneLabel?: string): Bucket[] => {
  const out: Bucket[] = defs.map((d) => ({ key: d.key, label: d.label, rows: [], flag: !!d.flag }))
  const none: Bucket = { key: 'none', label: noneLabel ?? '', rows: [], flag: false, none: true }
  for (const r of rows) { const v = of(r); if (v === null) { none.rows.push(r); continue } const i = defs.findIndex((d) => d.test(v)); if (i >= 0) out[i].rows.push(r) }
  return noneLabel && none.rows.length ? [...out, none] : out
}

export const absentDays = (r: CareRow) => r.days.filter((d) => d.attendance === 'absent').length
export const missingDays = (r: CareRow) => r.days.filter((d) => d.submission === 'missing').length
export const studyChange = (r: CareRow) => r.week.minutes !== null && r.week.usualWeek ? ((r.week.minutes - r.week.usualWeek) / r.week.usualWeek) * 100 : null
/** 평소(같은 요일) 대비 입실이 늦어진 분, 비교 가능한 날의 평균 */
export const startLate = (r: CareRow) => { const v = r.days.flatMap((d) => d.start !== null && d.usualStart !== null ? [d.start - d.usualStart] : []); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }

export function branchMetrics(rows: CareRow[], t: { absenceDays: number; planMissingDays: number }): BucketMetric[] {
  const counts = (n: number, flagFrom: number) => [0, 1, 2].map((k) => ({ key: String(k), label: `${k}일`, test: (v: number) => v === k, flag: k >= flagFrom })).concat([{ key: '3', label: '3일 이상', test: (v: number) => v >= 3, flag: 3 >= flagFrom }]).slice(0, n)
  return [
    { key: 'absence', title: '결석', buckets: bucketize(rows, absentDays, counts(4, t.absenceDays)), value: (r) => `${absentDays(r)}일`, rank: absentDays },
    { key: 'plan', title: '계획 미제출', buckets: bucketize(rows, missingDays, counts(4, t.planMissingDays)), value: (r) => `${missingDays(r)}일`, rank: missingDays },
    {
      key: 'study', title: '공부 시간 변화', value: (r) => { const v = studyChange(r); return v === null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}%` }, rank: (r) => -(studyChange(r) ?? 0),
      buckets: bucketize(rows, studyChange, [
        { key: 'down50', label: '−50% 이하', test: (v) => v <= -50, flag: true },
        { key: 'down20', label: '−50 ~ −20%', test: (v) => v <= -20 },
        { key: 'same', label: '−20 ~ +20%', test: (v) => v < 20 },
        { key: 'up', label: '+20% 이상', test: () => true },
      ], '평소 기록 없음'),
    },
    {
      key: 'start', title: '입실 늦어짐', value: (r) => { const v = startLate(r); return v === null ? '—' : v <= 0 ? '늦지 않음' : dur(v) }, rank: (r) => startLate(r) ?? -999,
      buckets: bucketize(rows, startLate, [
        { key: 'lt30', label: '30분 미만', test: (v) => v < 30 },
        { key: '30to90', label: '30 ~ 90분', test: (v) => v < 90 },
        { key: 'gt90', label: '90분 이상', test: () => true, flag: true },
      ], '입실 기록 없음'),
    },
    {
      key: 'execution', title: '계획 대비 달성', value: (r) => r.week.executionRate === null ? '—' : `${Math.round(r.week.executionRate)}%`, rank: (r) => -(r.week.executionRate ?? 999),
      buckets: bucketize(rows, (r) => r.week.executionRate, [
        { key: 'lt60', label: '60% 미만', test: (v) => v < 60, flag: true },
        { key: '60to80', label: '60 ~ 80%', test: (v) => v < 80 },
        { key: '80to90', label: '80 ~ 90%', test: (v) => v < 90 },
        { key: 'ge90', label: '90% 이상', test: () => true },
      ], '계획 기록 없음'),
    },
  ]
}

// ── 오늘 명부: 우선순위 3단계와 학생 타일 ─────────────────────────────
// 누구를 고를지는 서버 신호 그대로이고, 여기서는 관리자가 볼 순서만 나눈다.
// 먼저 확인: 3일 이상 미입실, 공부 시간이 평소의 절반 이하, 계획의 60% 미만 / 이번 주 확인: 그 밖의 서버 신호
// 참고: 과목 계획 미달성만 있는 학생, 요일마다 반복되는 결석, 사진 관찰(예시)
export type Tier = 'recheck' | 'first' | 'week' | 'note' | 'managed' | 'normal' | 'deferred'
export const TIER_TITLE: Record<Tier, string> = { recheck: '오늘 점검', first: '먼저 확인', week: '이번 주 확인', note: '참고', managed: '관리 중', normal: '특이 없음', deferred: '기록 부족' }
const REASON_ORDER = ['CONSECUTIVE_ABSENCE', 'STUDY_DROP', 'EXECUTION_GAP', 'START_TIME_SHIFT', 'PLAN_MISSING', 'SUBJECT_SHARE'] as const
/** 사유 이름: 서버 신호 이름(기존 서비스 문구)을 그대로 쓴다 */
const LABEL: Record<string, string> = { CONSECUTIVE_ABSENCE: '미입실', PLAN_MISSING: '계획 미제출', STUDY_DROP: '공부 시간 감소', EXECUTION_GAP: '계획 미달성', START_TIME_SHIFT: '등원 시간 늦어짐', SUBJECT_SHARE: '과목 계획 미달성' }

export interface Tile { row: CareRow; tier: Tier; why: string; value: string; unit: string; strong: boolean; order: number; rank: number; more: string[]; tip: string }

export function tileFor(r: CareRow, v: VisionSummary): Tile {
  const notes = notesFor(r, v)
  const tip = notes.map((n) => n.text + (n.tone === 'example' ? ' (예시)' : '')).join(' · ')
  const weekday = r.weekdayAbsence ? `${r.weekdayAbsence.dow}요일마다 결석` : ''
  const short = (k: string) => k.startsWith('vision-') ? '사진 관찰' : k === 'weekday' ? weekday : LABEL[k]
  const others = (primary: string | null) => [...new Set(notes.filter((n) => n.key !== primary).map((n) => short(n.key)).filter(Boolean))]
  const base = { row: r, tip, more: others(null), strong: false, order: 9 }
  if (r.status === 'recheck' || r.status === 'managed') {
    return { ...base, tier: r.status, why: r.signals.map((s) => s.label).join(', '), value: r.recheckDate ? md(r.recheckDate) : '—', unit: '', rank: r.recheckDate ? -Number(r.recheckDate.replaceAll('-', '')) : 0 }
  }
  if (r.status === 'check') {
    const type = REASON_ORDER.find((t) => r.signals.some((s) => s.type === t)) ?? 'PLAN_MISSING'
    const w = r.week, order = REASON_ORDER.indexOf(type)
    const t = { ...base, more: others(type), order, why: LABEL[type] }
    if (type === 'CONSECUTIVE_ABSENCE') { const n = absentDays(r); return { ...t, tier: n >= 3 ? 'first' : 'week', why: `미입실${r.absencePattern === '연속' ? ' · 연속' : ''}`, value: String(n), unit: '일', strong: n >= 3, rank: n * 10 + (r.absencePattern === '연속' ? 1 : 0) } }
    if (type === 'STUDY_DROP') { const c = studyChange(r); const half = c !== null && c <= -50; return { ...t, tier: half ? 'first' : 'week', value: c === null ? '—' : `−${Math.abs(Math.round(c))}`, unit: c === null ? '' : '%', strong: half, rank: -(c ?? 0) } }
    if (type === 'EXECUTION_GAP') { const x = w.executionRate; const low = x !== null && x < 60; return { ...t, tier: low ? 'first' : 'week', value: x === null ? '—' : String(Math.round(x)), unit: x === null ? '' : '%', strong: low, rank: -(x ?? 100) } }
    if (type === 'START_TIME_SHIFT') { const late = num(r.signals.find((x) => x.type === type)!.summary); return { ...t, tier: 'week', value: Number.isFinite(late) ? `+${Math.round(late)}` : '—', unit: Number.isFinite(late) ? '분' : '', rank: late } }
    if (type === 'PLAN_MISSING') { const n = missingDays(r); return { ...t, tier: 'week', value: String(n), unit: '일', rank: n } }
    const m = r.signals.find((x) => x.type === 'SUBJECT_SHARE')!.summary.match(/^(\S+) 계획 (\d+)% → 실제 (\d+)%/)
    const gap = m ? Number(m[3]) - Number(m[2]) : NaN
    return { ...t, tier: 'note', why: m ? `${m[1]} 계획 미달성` : LABEL.SUBJECT_SHARE, value: Number.isFinite(gap) ? `${gap > 0 ? '+' : '−'}${Math.abs(gap)}` : '—', unit: Number.isFinite(gap) ? '%p' : '', rank: Math.abs(gap) }
  }
  if (r.status === 'normal' && r.weekdayAbsence) {
    const w = r.weekdayAbsence
    return { ...base, more: others('weekday'), tier: 'note', order: 7, why: weekday, value: `${w.absent}/${w.weeks}`, unit: '번', rank: w.absent }
  }
  if (r.status === 'normal' && v?.reasonDays.some((x) => x.days >= 2)) {
    const a = v.reasonDays[0]
    return { ...base, more: others(`vision-${a.reason}`), tier: 'note', order: 8, why: REASON_LABEL[a.reason], value: String(a.days), unit: '일', rank: a.days }
  }
  return { ...base, tier: r.status === 'deferred' ? 'deferred' : 'normal', why: '', value: '', unit: '', rank: 0 }
}
