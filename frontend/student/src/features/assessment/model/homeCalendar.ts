import type { AcademicContext, EvaluationPlan, SchoolAssessment } from '../api/types.ts'
import { calendarWeekRows, isMonthWeek, placeEntries, whenLabel, type TeachingPlanEntry } from '../components/teaching-plan/teachingPlanPlacement.ts'
import { schoolAssessmentDetailPath } from '../routes/paths.ts'
import { groupConfirmedFields } from './confirmedPlanView.ts'

// A28-23 학생 홈 월간 달력(일~토 날짜 칸)의 일정 모델 — 순수 함수. 월별 운영계획 탭의 배치 규칙(placeEntries)을 그대로 쓴다.
// 날짜 칸: 운영계획 원문 날짜(수업) · 학생 수행평가의 평가일(수행)·제출 마감(마감, 학생이 넣은 날짜).
// A28-26(2026-11-22 사용자 지시): 홈에서는 'n월 m주'·학기 주차처럼 날짜가 없는 운영계획을 날짜 칸(임시 배치)에도, 날짜 미정 목록에도 두지 않는다
//   (원본·관리자/학생 월별 운영계획 화면의 주차 정보는 그대로 — '운영계획 크게 보기'). '잠정' 유형은 없앴다.
// '이달 일정 · 날짜 미정': 월만 적힌 운영계획·학기 주차 계획 · 공식 시기만 있는 학교 확정 수행평가 · 확정 지필평가(시기 문장의 달).
// '시기 미정': 달을 정할 수 없는 계획·평가. 날짜·D-day 를 만들지 않는다. 유형은 데이터 종류로만 정한다(제목 키워드 추정 없음).
// A28-33(2026-11-23 사용자 지시, A28-26 홈 규칙을 바꿈): 'n월 m주' 운영계획은 그 달 달력 m번째 줄 안, 한 달만 적힌 'n월' 운영계획은
//   그 달 안 평일에 고르게 '개인 임시 배치'한다(난수 없음 — 다시 계산해도 같은 날짜). 학생이 범위 안에서 옮긴 날짜(§30-b)가 있으면 그 날짜.
//   여러 달(MONTH_RANGE)·주차 줄이 없는 달·시기 불명 행은 배치하지 않는다. 공식 날짜가 아니다: D-day·다가오는 일정·관리자 화면에 쓰지 않는다.

export type CalendarKind = 'deadline' | 'evaluation' | 'written' | 'plan'

/** A28-33 개인 임시 배치 정보(운영계획 날짜 없는 행만). 범위 밖으로는 옮길 수 없다 */
export interface TentativePlacement {
  sourceKey: string
  rangeFrom: string
  rangeTo: string
  /** 지금 표시 날짜 */
  date: string
  /** 계산한 기본 날짜(초기화하면 돌아갈 날짜) */
  defaultDate: string
  /** 학생이 옮겨 저장한 날짜인가 */
  moved: boolean
}

export interface CalendarEvent {
  key: string
  kind: CalendarKind
  subject: string
  title: string
  /** 시기·출처 설명 */
  meta: string
  to?: string
  tentative?: TentativePlacement
}

export interface MonthCalendar {
  year: number
  month: number
  /** 일요일 시작 7칸 줄. null = 앞뒤 빈 칸 */
  cells: (string | null)[]
  byDate: Record<string, CalendarEvent[]>
  /** 이 달 일정이지만 날짜가 정해지지 않은 것 */
  monthUndated: CalendarEvent[]
  /** 달도 정할 수 없는 것 */
  noTiming: CalendarEvent[]
  /** 집계 단위: mine = 날짜 칸의 내 평가일·마감(이벤트), plans = 이 달 운영계획 행, written = 이 달 지필(건), undated = 이 달 날짜 미정(건) */
  counts: { mine: number; plans: number; written: number; undated: number }
}

export const kindText: Record<CalendarKind, string> = { deadline: '마감', evaluation: '수행', written: '지필', plan: '수업' }
const order: CalendarKind[] = ['deadline', 'written', 'evaluation', 'plan']
const pad = (value: number) => String(value).padStart(2, '0')

/** 시기 문장의 달(예: '9월', '9-10월', '3월~6월', '12~2월'). '5월 3-4주'의 '3-4'는 주라서 달 범위가 아니다. 못 읽으면 빈 배열 */
export function monthsInTiming(timing: string | null | undefined): number[] {
  if (!timing) return []
  const range = timing.match(/(\d{1,2})\s*월?\s*[-~]\s*(\d{1,2})\s*월/)
  if (range) {
    const from = Number(range[1])
    const to = Number(range[2])
    const out: number[] = []
    for (let m = from, guard = 0; guard < 12; guard++) {
      if (m >= 1 && m <= 12) out.push(m)
      if (m === to) break
      m = m === 12 ? 1 : m + 1
    }
    return out
  }
  return [...timing.matchAll(/(\d{1,2})\s*월/g)].map((m) => Number(m[1])).filter((m) => m >= 1 && m <= 12)
}

/** 중요 일정 먼저(마감 → 지필 → 수행 → 수업) */
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
}

export function monthCalendar(input: {
  academicYear: number
  month: number
  planEntries: TeachingPlanEntry[]
  assessments: SchoolAssessment[]
  confirmedPlans: EvaluationPlan[]
  context: AcademicContext | undefined
  subjectName: (subjectId: string) => string
  /** 과목 이름(없으면 전체) */
  subject?: string | null
  /** A28-33 학생이 옮겨 둔 날짜(§30-b): sourceKey(= 운영계획 entry.id) → YYYY-MM-DD. 범위 밖 값은 쓰지 않는다 */
  placements?: Record<string, string>
}): MonthCalendar {
  const { academicYear, month, assessments, confirmedPlans, context, subjectName, subject } = input
  const wanted = (name: string) => !subject || name === subject
  const planEntries = input.planEntries.filter((entry) => wanted(entry.subjectName))
  const placement = placeEntries(planEntries, academicYear, month)
  const year = placement.year ?? (month >= 3 ? academicYear : academicYear + 1)
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const days = new Date(year, month, 0).getDate()
  const cells: (string | null)[] = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: days }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`)]
  while (cells.length % 7 !== 0) cells.push(null)
  const byDate: Record<string, CalendarEvent[]> = {}
  const add = (iso: string, event: CalendarEvent) => (byDate[iso] ??= []).push(event)
  const monthUndated: CalendarEvent[] = []
  const noTiming: CalendarEvent[] = []
  const counts = { mine: 0, plans: 0, written: 0, undated: 0 }

  // 1) 운영계획 — 원문 날짜 행은 그 날짜 칸(수업, 공식). A28-33: 'n월 m주'·'n월' 행은 개인 임시 배치(아래). 여러 달 행은 이달 날짜 미정.
  //    학기 주차·연도 미정·시기 미정 행은 홈에서 보이지 않는다(월별 운영계획 화면에 그대로)
  const datedPlans = new Set<string>()
  for (const cell of placement.cells) {
    if (!cell) continue
    for (const entry of cell.entries) {
      if (cell.tentativeIds.includes(entry.id)) continue
      datedPlans.add(entry.id)
      add(cell.iso, { key: `p-${entry.id}-${cell.iso}`, kind: 'plan', subject: entry.subjectName, title: planTitle(entry), meta: `학교 운영계획 · 원문 날짜 ${whenLabel(entry)}` })
    }
  }
  const tentative = tentativePlacements(planEntries, placement.cells, month, input.placements ?? {})
  for (const item of tentative) {
    add(item.placement.date, {
      key: `pt-${item.entry.id}`,
      kind: 'plan',
      subject: item.entry.subjectName,
      title: planTitle(item.entry),
      meta: `원문: ${whenLabel(item.entry)} · 날짜 미정`,
      tentative: item.placement,
    })
  }
  const placedIds = new Set(tentative.map((item) => item.entry.id))
  const monthPlans = placement.monthSummary.filter((entry) => !placedIds.has(entry.id))
  for (const entry of monthPlans) {
    monthUndated.push({ key: `pm-${entry.id}`, kind: 'plan', subject: entry.subjectName, title: planTitle(entry), meta: `학교 운영계획 · 원문 시기 ${whenLabel(entry)} · 날짜 미정` })
  }
  counts.plans = datedPlans.size + tentative.length + monthPlans.length

  // 2) 수행평가(학생 학교 수행평가 — A28-20 학교 확정 자동 등록 포함). 날짜는 학생이 넣은 값만. 학교 확정에서 빠진 항목은 제외
  const prefix = `${year}-${pad(month)}-`
  for (const item of assessments) {
    if (item.official?.status === 'WITHDRAWN') continue
    const name = subjectName(item.subjectId)
    if (!wanted(name)) continue
    const source = item.official ? '학교 확정 수행평가' : '내가 등록한 수행평가'
    const to = schoolAssessmentDetailPath(item.assessmentId)
    if (item.evaluationDate) {
      if (item.evaluationDate.startsWith(prefix)) {
        add(item.evaluationDate, { key: `e-${item.assessmentId}`, kind: 'evaluation', subject: name, title: item.title, meta: `${source} · 평가일(내 일정)`, to })
        counts.mine += 1
      }
    }
    if (item.deadlineDate) {
      if (item.deadlineDate.startsWith(prefix)) {
        add(item.deadlineDate, { key: `d-${item.assessmentId}`, kind: 'deadline', subject: name, title: item.title, meta: `${source} · 제출 마감(내 일정)`, to })
        counts.mine += 1
      }
    }
    if (!item.evaluationDate && !item.deadlineDate && item.official) {
      const months = monthsInTiming(item.official.timing)
      const event = { key: `o-${item.assessmentId}`, kind: 'evaluation' as const, subject: name, title: item.title, meta: `학교 확정 수행평가 · 학교 안내 시기 ${item.official.timing ?? '미정'} · 날짜 미정`, to }
      if (months.includes(month)) monthUndated.push(event)
      else if (months.length === 0) noTiming.push(event)
    }
  }

  // 3) 확정 지필평가 — 시기 문장의 달이면 이달 날짜 미정(시험일을 만들지 않는다)
  for (const plan of confirmedPlans) {
    for (const group of groupConfirmedFields(plan.confirmedFields ?? [], context)) {
      if (!group.enrolled) continue
      const name = group.subjectName ?? subjectName(group.subjectId)
      if (!wanted(name)) continue
      for (const exam of group.exams) {
        const timing = exam.timing.state === 'value' ? String(exam.timing.value) : null
        const months = monthsInTiming(timing)
        const label = exam.label.state === 'value' ? String(exam.label.value) : `지필평가 ${exam.index + 1}`
        const event = { key: `w-${plan.planId}-${group.subjectId}-${exam.index}`, kind: 'written' as const, subject: name, title: label, meta: `학교 확정 지필평가 · 학교 안내 시기 ${timing ?? '미정'} · 날짜 미정` }
        if (months.includes(month)) {
          monthUndated.push(event)
          counts.written += 1
        } else if (months.length === 0) noTiming.push(event)
      }
    }
  }

  for (const iso of Object.keys(byDate)) byDate[iso] = sortEvents(byDate[iso])
  const sortedUndated = sortEvents(monthUndated)
  counts.undated = sortedUndated.length
  return { year, month, cells, byDate, monthUndated: sortedUndated, noTiming: sortEvents(noTiming), counts }
}

type Cells = ReturnType<typeof placeEntries>['cells']

const weekdayOf = (iso: string) => new Date(`${iso}T00:00:00`).getDay()
const byName = (a: TeachingPlanEntry, b: TeachingPlanEntry) => a.subjectName.localeCompare(b.subjectName, 'ko') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * A28-33 개인 임시 배치(순수 함수, 결정적).
 * - 'n월 m주'(isMonthWeek, 'm~k주' 포함): 범위 = 달력 m~k번째 줄의 이 달 날짜. 기본 날짜 = 줄 안 평일을 (과목명, id) 순으로 차례대로(A26 규칙과 같음).
 * - 한 달만 적힌 'n월'(MONTH): 범위 = 그 달 전체. 기본 날짜 = 그 달 평일에 (과목명, id) 순으로 고르게 펼친다.
 * - 학생이 옮긴 날짜는 범위 안일 때만 쓴다. 달력 칸이 없는 달(연도 미정)·줄이 없는 주는 배치하지 않는다.
 */
export function tentativePlacements(entries: TeachingPlanEntry[], cells: Cells, month: number, saved: Record<string, string>): { entry: TeachingPlanEntry; placement: TentativePlacement }[] {
  const days = cells.filter((cell): cell is NonNullable<Cells[number]> => cell !== null)
  if (days.length === 0) return []
  const rows = calendarWeekRows(cells)
  const result: { entry: TeachingPlanEntry; placement: TentativePlacement }[] = []
  const make = (entry: TeachingPlanEntry, range: string[], defaultDate: string) => {
    const wanted = saved[entry.id]
    const moved = Boolean(wanted && range.includes(wanted) && wanted !== defaultDate)
    result.push({ entry, placement: { sourceKey: entry.id, rangeFrom: range[0], rangeTo: range[range.length - 1], date: moved ? wanted : defaultDate, defaultDate, moved } })
  }
  const weekdaysIn = (list: { iso: string }[]) => {
    const weekdays = list.filter((cell) => weekdayOf(cell.iso) >= 1 && weekdayOf(cell.iso) <= 5).map((cell) => cell.iso)
    return weekdays.length ? weekdays : list.map((cell) => cell.iso)
  }
  // 'n월 m주'
  const weekEntries = entries.filter((entry) => entry.month === month && isMonthWeek(entry)).sort(byName)
  const perRow = new Map<number, number>()
  for (const entry of weekEntries) {
    const from = entry.weekFrom as number
    const to = entry.weekTo != null && entry.weekTo >= from ? entry.weekTo : from
    if (from < 1 || from > rows.length) continue
    const range = rows.slice(from - 1, Math.min(to, rows.length)).flat().map((cell) => cell.iso)
    const slots = weekdaysIn(rows[from - 1])
    const index = perRow.get(from) ?? 0
    perRow.set(from, index + 1)
    make(entry, range, slots[index % slots.length])
  }
  // 한 달만 적힌 'n월'
  const monthEntries = entries.filter((entry) => entry.precision === 'MONTH' && entry.month === month).sort(byName)
  const slots = weekdaysIn(days)
  monthEntries.forEach((entry, index) => {
    const slot = slots[Math.min(slots.length - 1, Math.floor(((index + 0.5) * slots.length) / monthEntries.length))]
    make(entry, days.map((cell) => cell.iso), slot)
  })
  return result
}

function planTitle(entry: TeachingPlanEntry): string {
  return entry.unit ?? entry.content ?? entry.specialSchedule ?? entry.asWritten ?? '운영계획'
}
