// 학생 케어 개선안(/student-care/ops)의 화면 모델. 서버 응답(api-contract.md §65 board·metrics)만 읽어 만든다.
// 판정은 백엔드 신호(board.needsCheck 등)를 그대로 쓴다. 이 파일은 신호를 짧은 사유 문구로 바꾸고,
// 연속·흩어짐·같은 요일 반복처럼 날짜에서 바로 보이는 패턴만 계산한다(판정 공식을 새로 만들지 않는다).
import type { CareBoard, SignalSummary, SignalType, StudentRef } from '../model/types.ts'
import type { CareBranchMetricsResponse, ServerWeeklyReview } from '../model/serverWeeklyReview.ts'

export type OpsAttendance = 'present' | 'absent' | 'off' | 'unknown'
export type OpsSubmission = 'submitted' | 'missing' | 'off' | 'unknown'
export type OpsStatus = 'recheck' | 'check' | 'managed' | 'deferred' | 'normal'

export interface OpsDay {
  date: string
  dow: string
  attendance: OpsAttendance
  submission: OpsSubmission
  /** 결석·기록 없음·예정 없음인 날은 null. 실제 0분 입실과 구별한다 */
  minutes: number | null
  start: number | null
  planned: number | null
  actual: number | null
  usualMinutes: number | null
  usualStart: number | null
}

export interface OpsChip { type: SignalType | 'WEEKDAY_ABSENCE'; text: string; derived?: boolean }

export interface OpsStudent {
  student: StudentRef
  status: OpsStatus
  statusLabel: string
  signals: SignalSummary[]
  chips: OpsChip[]
  caseId: string | null
  recheckDate: string | null
  days: OpsDay[]
  history35: OpsDay[]
  week: { minutes: number | null; usualWeek: number | null; recorded: number; attended: number; scheduled: number; submitted: number; submitKnown: number; executionRate: number | null; comparablePlanDays: number }
  subjects: ServerWeeklyReview['subjects']
  absencePattern: '연속' | '흩어짐' | null
  weekdayAbsence: WeekdayAbsence | null
  order: number
}

export const attendanceLabel: Record<OpsAttendance, string> = { present: '입실', absent: '결석', off: '예정 없음', unknown: '기록 없음' }

const DOW = ['일', '월', '화', '수', '목', '금', '토']
const dowOf = (date: string) => DOW[new Date(`${date}T00:00:00Z`).getUTCDay()]
const SEVERITY: (SignalType | 'WEEKDAY_ABSENCE')[] = ['CONSECUTIVE_ABSENCE', 'WEEKDAY_ABSENCE', 'STUDY_DROP', 'EXECUTION_GAP', 'START_TIME_SHIFT', 'SUBJECT_SHARE', 'PLAN_MISSING']

/** 부호 있는 수. 음수는 화면 전체에서 같은 빼기 기호(−)를 쓴다 */
export const signed = (v: number, digits = 0) => { const r = Number(v.toFixed(digits)); return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toFixed(digits)}` }

export const hours = (minutes: number | null) => {
  if (minutes === null) return '—'
  const m = Math.round(minutes), h = Math.floor(m / 60), r = m % 60
  return r ? `${h}시간 ${r}분` : `${h}시간`
}
export const clock = (minutes: number | null) => minutes === null ? '—' : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(Math.round(minutes) % 60).padStart(2, '0')}`

function toDays(review: ServerWeeklyReview, records: ServerWeeklyReview['days'], withUsual: boolean): OpsDay[] {
  return records.map((d, i) => {
    const attendance: OpsAttendance = d.attendance === 'PRESENT' ? 'present' : d.attendance === 'ABSENT' ? 'absent' : d.attendance === 'UNSCHEDULED' ? 'off' : 'unknown'
    // 서버는 예정 없는 날의 미제출도 MISSING으로 보낸다. 예정 없는 날의 MISSING만 'off'(제출 의무 없음)로 두고,
    // 실제로 제출한 기록(SUBMITTED)은 예정 여부와 관계없이 보존한다(api-contract: 일정·입실과 제출·학습은 독립)
    const submission: OpsSubmission = d.submission === 'SUBMITTED' ? 'submitted' : d.scheduled === false && d.submission === 'MISSING' ? 'off' : d.submission === 'MISSING' ? 'missing' : 'unknown'
    const base = withUsual ? review.weekdayBaseline[i] : undefined
    return {
      date: d.date, dow: dowOf(d.date), attendance, submission,
      // 학습 기록은 입실 여부와 독립이다. 입실이 없어도 0보다 큰 학습 기록은 그대로 둔다.
      // 결석·예정 없음인데 0분인 날만 막대를 그리지 않도록 null로 둔다(실제 0분 입실과 구별)
      minutes: d.minutes === null ? null : attendance !== 'present' && d.minutes === 0 ? null : d.minutes,
      start: d.startMinutes,
      planned: d.plannedMinutes, actual: d.actualMinutes === null ? null : attendance !== 'present' && d.actualMinutes === 0 ? null : d.actualMinutes,
      usualMinutes: base && base.samples > 0 ? base.minutes : null,
      usualStart: base && base.startSamples > 0 ? base.startMinutes : null,
    }
  })
}

/** 결석 2일 이상일 때 연속인지 흩어졌는지. 예정 없는 날은 연속을 끊지 않고, 기록 없음은 끊는다 */
export function absencePattern(days: OpsDay[]): '연속' | '흩어짐' | null {
  const total = days.filter((d) => d.attendance === 'absent').length
  if (total < 2) return null
  let run = 0, best = 0
  for (const d of days) { if (d.attendance === 'absent') { run++; best = Math.max(best, run) } else if (d.attendance !== 'off') run = 0 }
  return best === total ? '연속' : '흩어짐'
}

export interface WeekdayAbsence { dow: string; absent: number; weeks: number }
/**
 * 35일 동안 같은 요일에 4번 이상 결석한 요일. 서버 판정이 아니라 날짜에서 계산한 참고 표시이므로
 * 확정 표현("매주") 대신 관측 횟수(결석 n번 / 그 요일 등원 예정 m번)를 함께 돌려준다. 없으면 null
 */
export function weekdayAbsence(days: OpsDay[]): WeekdayAbsence | null {
  const absent = new Map<string, number>(), weeks = new Map<string, number>()
  for (const d of days) {
    if (d.attendance === 'absent' || d.attendance === 'present') weeks.set(d.dow, (weeks.get(d.dow) ?? 0) + 1)
    if (d.attendance === 'absent') absent.set(d.dow, (absent.get(d.dow) ?? 0) + 1)
  }
  const top = [...absent.entries()].sort((a, b) => b[1] - a[1])[0]
  return top && top[1] >= 4 ? { dow: top[0], absent: top[1], weeks: weeks.get(top[0]) ?? top[1] } : null
}
const weekdayText = (w: WeekdayAbsence) => `${w.dow}요일 결석 ${w.absent}/${w.weeks}번`

const num = (text: string) => Number(text.match(/-?\d+(\.\d+)?/)?.[0] ?? NaN)

export function chipsFor(signals: SignalSummary[], days: OpsDay[], week: OpsStudent['week'], weekday: WeekdayAbsence | null, managed = false): OpsChip[] {
  const chips: OpsChip[] = []
  // 관리 중 학생의 신호는 관리를 시작할 때의 사유다. 지금 7일 값으로 다시 세면 "결석 0일"처럼 틀린 문구가 되므로 사유 이름만 쓴다
  if (managed) {
    for (const s of signals) chips.push({ type: s.type, text: `관리 사유 ${s.label}` })
    if (weekday) chips.push({ type: 'WEEKDAY_ABSENCE', text: weekdayText(weekday), derived: true })
    return chips.sort((a, b) => SEVERITY.indexOf(a.type) - SEVERITY.indexOf(b.type))
  }
  const absent = days.filter((d) => d.attendance === 'absent')
  const missing = days.filter((d) => d.submission === 'missing')
  const sameDays = absent.length > 0 && missing.length > 0 && missing.every((m) => absent.some((a) => a.date === m.date))
  for (const s of signals) {
    if (s.type === 'CONSECUTIVE_ABSENCE') {
      const pattern = absencePattern(days)
      chips.push({ type: s.type, text: `결석 ${absent.length}일${pattern === '연속' ? ' 연속' : ''}${sameDays && signals.some((x) => x.type === 'PLAN_MISSING') ? '·미제출' : ''}` })
    } else if (s.type === 'PLAN_MISSING') {
      if (sameDays && signals.some((x) => x.type === 'CONSECUTIVE_ABSENCE')) continue
      chips.push({ type: s.type, text: `계획 미제출 ${missing.length}일` })
    } else if (s.type === 'STUDY_DROP') {
      const diff = week.minutes !== null && week.usualWeek ? week.minutes - week.usualWeek : null
      chips.push({ type: s.type, text: diff === null ? '학습 감소' : `학습 ${diff < 0 ? '−' : '+'}${hours(Math.abs(diff))} (${Math.round((diff / week.usualWeek!) * 100)}%)` })
    } else if (s.type === 'EXECUTION_GAP') {
      chips.push({ type: s.type, text: `진행률 ${week.executionRate === null ? num(s.summary) : Math.round(week.executionRate)}%` })
    } else if (s.type === 'START_TIME_SHIFT') {
      chips.push({ type: s.type, text: `입실 +${num(s.summary)}분` })
    } else if (s.type === 'SUBJECT_SHARE') {
      const m = s.summary.match(/^(\S+) 계획 (\d+)% → 실제 (\d+)%/)
      chips.push({ type: s.type, text: m ? `${m[1]} 비중 ${m[2]}→${m[3]}%` : s.label })
    }
  }
  if (weekday) chips.push({ type: 'WEEKDAY_ABSENCE', text: weekdayText(weekday), derived: true })
  return chips.sort((a, b) => SEVERITY.indexOf(a.type) - SEVERITY.indexOf(b.type))
}

export function buildOpsRoster(board: CareBoard, metrics: CareBranchMetricsResponse): OpsStudent[] {
  const needs = new Map(board.needsCheck.map((c) => [c.studentId, c]))
  const adj = new Map(board.inAdjustment.map((c) => [c.studentId, c]))
  const deferred = new Set(board.deferred.map((d) => d.studentId))
  const rows = metrics.students.map(({ student, review }) => {
    const days = toDays(review, review.days, true)
    const history35 = [...toDays(review, review.baselineDays ?? [], false), ...days]
    const n = needs.get(student.studentId), a = adj.get(student.studentId)
    const status: OpsStatus = a?.recheckDue ? 'recheck' : n ? 'check' : a ? 'managed' : deferred.has(student.studentId) ? 'deferred' : 'normal'
    const signals = n?.signals ?? a?.signals ?? []
    const c = review.current, b = review.baseline
    const week = {
      minutes: c.studyMinutes, usualWeek: b.recordedDays === 28 && b.studyMinutes !== null ? b.studyMinutes / 4 : null, recorded: c.recordedDays,
      attended: days.filter((d) => d.attendance === 'present').length,
      scheduled: days.filter((d) => d.attendance === 'present' || d.attendance === 'absent').length,
      submitted: days.filter((d) => d.submission === 'submitted').length,
      submitKnown: days.filter((d) => d.submission === 'submitted' || d.submission === 'missing').length,
      executionRate: c.executionRate, comparablePlanDays: c.comparablePlanDays,
    }
    const weekday = weekdayAbsence(history35)
    const chips = status === 'normal' || status === 'deferred' ? (weekday ? chipsFor([], days, week, weekday) : []) : chipsFor(signals, days, week, weekday, status === 'managed' || status === 'recheck')
    const statusLabel = { recheck: '확인일', check: '상담 필요', managed: '관리 중', deferred: '기록 부족', normal: '' }[status]
    const firstSeverity = chips.length ? SEVERITY.indexOf(chips[0].type) : 99
    // 상태 → 가장 무거운 사유 종류 → 결석 일수(많을수록 위) → 사유 수 순으로 정렬한다
    const absentDays = days.filter((d) => d.attendance === 'absent').length
    const order = ({ recheck: 0, check: 1, managed: 2, deferred: 3, normal: 4 }[status]) * 10000 + firstSeverity * 100 + (9 - absentDays) * 10 + (9 - Math.min(chips.length, 9))
    return { student, status, statusLabel, signals, chips, caseId: a?.caseId ?? null, recheckDate: a?.recheckDate ?? null, days, history35, week, subjects: review.subjects, absencePattern: absencePattern(days), weekdayAbsence: weekday, order }
  })
  return rows.sort((x, y) => x.order - y.order || x.student.studentName.localeCompare(y.student.studentName, 'ko'))
}

/** 학습관 날짜별 요약: 등원 예정·결석 인원과 결석자, 개인 평소 대비 학습 % 변화와 입실 분 차이의 중앙값·중간 50% */
export interface OpsBranchDay {
  date: string; dow: string
  scheduled: number; absent: OpsStudent[]; unknown: number
  studyChange: { median: number; q1: number; q3: number; n: number } | null
  startShift: { median: number; q1: number; q3: number; n: number } | null
  submitted: number; submitKnown: number
}
const quantile = (sorted: number[], q: number) => { const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo) }
const summary = (values: number[]) => { if (!values.length) return null; const s = [...values].sort((a, b) => a - b); return { median: quantile(s, 0.5), q1: quantile(s, 0.25), q3: quantile(s, 0.75), n: s.length } }

export function branchDays(rows: OpsStudent[], excluded: ReadonlySet<string> = new Set()): OpsBranchDay[] {
  const included = rows.filter((r) => !excluded.has(r.student.studentId))
  if (!included.length) return []
  return included[0].days.map((d0, i) => {
    const day = included.map((r) => ({ r, d: r.days[i] }))
    return {
      date: d0.date, dow: d0.dow,
      scheduled: day.filter(({ d }) => d.attendance === 'present' || d.attendance === 'absent').length,
      absent: day.filter(({ d }) => d.attendance === 'absent').map(({ r }) => r),
      unknown: day.filter(({ d }) => d.attendance === 'unknown').length,
      studyChange: summary(day.flatMap(({ d }) => d.minutes !== null && d.usualMinutes ? [((d.minutes - d.usualMinutes) / d.usualMinutes) * 100] : [])),
      startShift: summary(day.flatMap(({ d }) => d.start !== null && d.usualStart !== null ? [d.start - d.usualStart] : [])),
      submitted: day.filter(({ d }) => d.submission === 'submitted').length,
      submitKnown: day.filter(({ d }) => d.submission === 'submitted' || d.submission === 'missing').length,
    }
  })
}

/** 학습관 전체 학습 시간 변화(같은 학생·같은 요일 평소와 짝지은 관측만). 과업 시험 Q13과 같은 정의 */
export function branchStudyChange(rows: OpsStudent[], excluded: ReadonlySet<string> = new Set()) {
  let recent = 0, usual = 0
  for (const r of rows) if (!excluded.has(r.student.studentId)) for (const d of r.days) {
    // 결석일은 실제 0분으로 포함하고, 기록 없음·예정 없음은 비교에서 뺀다(기존 학습관 지표 정의와 같음)
    const actual = d.attendance === 'absent' ? 0 : d.minutes
    if (actual !== null && d.usualMinutes !== null) { recent += actual; usual += d.usualMinutes }
  }
  return usual ? { recent, usual, percent: ((recent - usual) / usual) * 100 } : null
}
