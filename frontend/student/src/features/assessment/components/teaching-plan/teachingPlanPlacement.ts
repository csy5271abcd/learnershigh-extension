// 월별 교수·학습 운영 계획 배치 규칙 (순수 함수, Student 조회·Admin 검토 공용).
// 데이터: analysis-import-0.3 DRAFT 운영계획 행(api-contract.md §39-3)과 학생 확정 행(§10-1-2). 시간 정밀도 8종을 그대로 쓴다.
// - 원문에 없는 날짜를 만들지 않는다: 주차는 주차 줄, 월은 월 줄, 학기 누적 주차(TERM_WEEK)는 학사력(개학일)이 없으므로 날짜로 바꾸지 않는다.
// - "n주"는 학교가 정한 주차다. ISO 주·일요일/월요일 시작 주로 날짜를 환산하지 않는다.
// - 연도: 원문에 명시된 연도(calendarYear)가 있으면 그 연도. 없으면 학년도 Y의 3~12월은 Y년(학년도 정의), 1~2월은 날짜 칸을 그리지 않는다.
// - 달을 정할 수 없는 행(TERM_WEEK·WEEK_UNRESOLVED·UNKNOWN에 월 없음)도 버리지 않고 따로 모은다. 앞뒤 행의 월로 채우지 않는다.

export type DatePrecision = 'EXACT_DATE' | 'DATE_RANGE' | 'WEEK_IN_MONTH' | 'TERM_WEEK' | 'MONTH' | 'MONTH_RANGE' | 'WEEK_UNRESOLVED' | 'UNKNOWN'
export type WeekScope = 'IN_MONTH' | 'TERM_SEQUENCE' | 'UNKNOWN'

export interface TeachingPlanEntry {
  /** Planner 안에서 유일한 키 (rowKey는 과목 안에서만 유일하다) */
  id: string
  rowKey: string
  subjectName: string
  precision: DatePrecision
  /** 시작 월(원문 월 또는 원문 날짜의 월). 원문에 없으면 null — 추정하지 않는다 */
  month: number | null
  monthTo: number | null
  weekFrom: number | null
  weekTo: number | null
  weekScope: WeekScope | null
  /** YYYY-MM-DD — 원문 날짜이고 연도를 정할 수 있을 때만 */
  dateFrom: string | null
  dateTo: string | null
  /** 원문 표기 그대로 (예: "9.8.~9.12.", "10월 2주"). 없으면 null */
  asWritten: string | null
  unit: string | null
  content: string | null
  note: string | null
  achievementStandards: string[]
  teachingMethods: string[]
  assessmentMethods: string[]
  /** 원문에서 연결이 명시된 수행평가 이름 (0.3에서는 보내지 않는다 — 공식 수행평가 항목을 새로 만들지 않는다) */
  linkedAssessments: string[]
  specialSchedule: string | null
  sourcePdfPageNumber: number | null
  /** 관리자 검토: CANDIDATE(분석 후보) / CONFIRMED(확정). 학생에게는 CONFIRMED만 전달된다 */
  status: 'CANDIDATE' | 'CONFIRMED'
  /** 분석기가 읽지 못했거나 확인이 필요한 칸 이름 (관리자 검토용) */
  missingFields: string[]
}

export const precisionLabel: Record<DatePrecision, string> = {
  EXACT_DATE: '날짜',
  DATE_RANGE: '기간',
  WEEK_IN_MONTH: '월 안의 주차',
  TERM_WEEK: '학기 주차',
  MONTH: '월',
  MONTH_RANGE: '여러 달',
  WEEK_UNRESOLVED: '주차(기준 미확인)',
  UNKNOWN: '시기 미정',
}

/** 학년도 순서의 달 (3월 → 다음 해 2월) */
export const academicMonths = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2]

export const semesterMonths = (semester: number) => (semester === 1 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 12, 1, 2])

/** 그 달의 실제 연도 (학년도 정의). 1~2월은 확인 전이라 null */
export function calendarYear(academicYear: number, month: number): number | null {
  return month >= 3 ? academicYear : null
}

const pad = (value: number) => String(value).padStart(2, '0')

// ---- 0.3 행 → Entry ----

export interface PlanPartialDate {
  year: number | null
  month: number
  day: number
}

export interface PlanSchedule {
  precision: DatePrecision
  monthFrom?: number | null
  monthTo?: number | null
  weekLabel?: string | null
  weekFrom?: number | null
  weekTo?: number | null
  weekScope?: WeekScope | null
  dateFrom?: PlanPartialDate | null
  dateTo?: PlanPartialDate | null
  dateAsWritten?: string | null
  calendarYear?: number | null
}

/** §39-3 행 / §10-1-2 학생 행의 공통 부분 */
export interface PlanRowLike {
  rowKey: string
  month?: number | null
  monthTo?: number | null
  weekLabel?: string | null
  weekFrom?: number | null
  weekTo?: number | null
  unit?: string | null
  content?: string | null
  note?: string | null
  achievementStandards?: { code?: string | null; text?: string | null }[] | null
  teachingMethods?: string[] | null
  assessmentMethods?: string[] | null
  specialSchedule?: string | null
  schedule?: PlanSchedule | null
  pdfPageNumber?: number | null
  sources?: { pdfPageNumber?: number | null }[] | null
}

function isoOf(date: PlanPartialDate | null | undefined, explicitYear: number | null | undefined, academicYear: number): string | null {
  if (!date) return null
  const year = explicitYear ?? date.year ?? calendarYear(academicYear, date.month)
  return year === null ? null : `${year}-${pad(date.month)}-${pad(date.day)}`
}

/**
 * schedule이 없으면 월·주 정보로 보수적으로 정한다: 주 범위의 기준(월 안/학기 누적)을 모르므로 WEEK_UNRESOLVED,
 * 월만 있으면 MONTH(·MONTH_RANGE), 아무것도 없으면 UNKNOWN. 날짜·연도는 만들지 않는다.
 */
export function entryFromRow(
  row: PlanRowLike,
  options: { id: string; subjectName: string; status: 'CANDIDATE' | 'CONFIRMED'; academicYear: number; missingFields?: string[] },
): TeachingPlanEntry {
  const schedule = row.schedule ?? null
  const monthFrom = schedule ? (schedule.monthFrom ?? schedule.dateFrom?.month ?? null) : (row.month ?? null)
  const monthTo = schedule ? (schedule.monthTo ?? null) : (row.monthTo ?? null)
  let precision: DatePrecision
  if (schedule) precision = schedule.precision
  else if (row.weekFrom != null) precision = 'WEEK_UNRESOLVED'
  else if (monthFrom != null) precision = monthTo != null && monthTo !== monthFrom ? 'MONTH_RANGE' : 'MONTH'
  else precision = 'UNKNOWN'
  const dated = precision === 'EXACT_DATE' || precision === 'DATE_RANGE'
  const pages = (row.sources ?? []).map((source) => source.pdfPageNumber).filter((page): page is number => typeof page === 'number')
  return {
    id: options.id,
    rowKey: row.rowKey,
    subjectName: options.subjectName,
    precision,
    month: monthFrom,
    monthTo,
    weekFrom: schedule ? (schedule.weekFrom ?? null) : (row.weekFrom ?? null),
    weekTo: schedule ? (schedule.weekTo ?? null) : (row.weekTo ?? null),
    weekScope: schedule?.weekScope ?? null,
    dateFrom: dated ? isoOf(schedule?.dateFrom, schedule?.calendarYear, options.academicYear) : null,
    dateTo: dated ? isoOf(schedule?.dateTo, schedule?.calendarYear, options.academicYear) : null,
    asWritten: schedule?.dateAsWritten ?? schedule?.weekLabel ?? row.weekLabel ?? null,
    unit: row.unit ?? null,
    content: row.content ?? null,
    note: row.note ?? null,
    achievementStandards: (row.achievementStandards ?? []).map((standard) => [standard.code, standard.text].filter(Boolean).join(' ')).filter(Boolean),
    teachingMethods: row.teachingMethods ?? [],
    assessmentMethods: row.assessmentMethods ?? [],
    linkedAssessments: [],
    specialSchedule: row.specialSchedule ?? null,
    sourcePdfPageNumber: row.pdfPageNumber ?? (pages.length ? Math.min(...pages) : null),
    status: options.status,
    missingFields: options.missingFields ?? [],
  }
}

/** 화면 표시용 시기 문구 (정밀도에 맞게, 없는 정보는 말하지 않는다) */
export function whenLabel(entry: TeachingPlanEntry): string {
  const weeks = entry.weekFrom == null ? '' : entry.weekTo != null && entry.weekTo !== entry.weekFrom ? `${entry.weekFrom}~${entry.weekTo}주` : `${entry.weekFrom}주`
  const day = (iso: string | null) => (iso ? `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일` : null)
  switch (entry.precision) {
    case 'EXACT_DATE':
      return day(entry.dateFrom) ?? entry.asWritten ?? (entry.month ? `${entry.month}월 (날짜 연도 미확인)` : '날짜 미확인')
    case 'DATE_RANGE':
      return entry.dateFrom ? `${day(entry.dateFrom)} ~ ${day(entry.dateTo) ?? ''}`.trim() : (entry.asWritten ?? '기간 미확인')
    case 'WEEK_IN_MONTH':
      return `${entry.month ?? '?'}월 ${weeks}`
    case 'TERM_WEEK':
      return `학기 ${weeks.replace('주', '주차')}${entry.month ? ` (${entry.month}월)` : ''}`
    case 'MONTH':
      return `${entry.month}월`
    case 'MONTH_RANGE':
      return `${entry.month}~${entry.monthTo}월`
    case 'WEEK_UNRESOLVED':
      return `${entry.month ? `${entry.month}월 · ` : ''}${weeks || '주차'} (기준 미확인)`
    default:
      return entry.month ? `${entry.month}월 중 (시기 미정)` : '시기 미정'
  }
}

// ---- 배치 ----

export interface DayCell {
  day: number
  iso: string
  entries: TeachingPlanEntry[]
}

export interface MonthPlacement {
  year: number | null
  month: number
  /** 날짜 칸 (year가 있을 때만). null = 앞뒤 빈 칸 (일요일 시작 표시는 화면 배치일 뿐 주차 계산에 쓰지 않는다) */
  cells: (DayCell | null)[]
  /** 그 달의 N주 (WEEK_IN_MONTH) */
  weekBands: { week: number; entries: TeachingPlanEntry[] }[]
  /** 학기 N주차인데 원문에 월이 있는 행 (TERM_WEEK + month) — 날짜로 바꾸지 않는다 */
  termWeekBands: { week: number; entries: TeachingPlanEntry[] }[]
  /** 월 전체 (MONTH, 이 달을 포함하는 MONTH_RANGE) */
  monthSummary: TeachingPlanEntry[]
  /** 이 달이지만 날짜를 칸에 둘 수 없는 행 (연도 미확인 날짜, 주차 기준 미확인, 시기 미정) */
  undated: TeachingPlanEntry[]
  /** 이 달에 보이는 계획 수 */
  total: number
}

const order = (month: number) => academicMonths.indexOf(month)

/** 이 행이 보이는 달들 (달을 정할 수 없으면 빈 배열) */
export function monthsOf(entry: TeachingPlanEntry): number[] {
  if (entry.month == null) return []
  if (entry.precision === 'MONTH_RANGE' && entry.monthTo != null) {
    const from = order(entry.month)
    const to = order(entry.monthTo)
    if (from >= 0 && to >= from) return academicMonths.slice(from, to + 1)
  }
  return [entry.month]
}

/** 달을 정할 수 없는 행: 달력 밖 목록 */
export function unplacedEntries(entries: TeachingPlanEntry[]): TeachingPlanEntry[] {
  return entries.filter((entry) => monthsOf(entry).length === 0)
}

function inRange(entry: TeachingPlanEntry, iso: string): boolean {
  if (!entry.dateFrom) return false
  return entry.dateFrom <= iso && iso <= (entry.dateTo ?? entry.dateFrom)
}

function bands(list: TeachingPlanEntry[]): { week: number; entries: TeachingPlanEntry[] }[] {
  const weeks = new Map<number, TeachingPlanEntry[]>()
  for (const entry of list) {
    // "3~4주"는 시작 주차 줄에 한 번만 두고 범위는 시기 문구로 보여 준다
    const week = entry.weekFrom as number
    weeks.set(week, [...(weeks.get(week) ?? []), entry])
  }
  return [...weeks].sort(([a], [b]) => a - b).map(([week, entries]) => ({ week, entries }))
}

export function placeEntries(entries: TeachingPlanEntry[], academicYear: number, month: number): MonthPlacement {
  const here = entries.filter((entry) => monthsOf(entry).includes(month))
  const isDated = (entry: TeachingPlanEntry) => entry.precision === 'EXACT_DATE' || entry.precision === 'DATE_RANGE'
  // 1~2월처럼 학년도로 연도를 정할 수 없는 달은, 원문에 연도가 명시된 날짜(calendarYear)가 있을 때만 그 연도로 달력을 그린다
  const explicitYear = here.find((entry) => isDated(entry) && entry.dateFrom)?.dateFrom?.slice(0, 4)
  const year = calendarYear(academicYear, month) ?? (explicitYear ? Number(explicitYear) : null)
  // 원문 연도가 명시된 날짜는 그 연도의 달력 칸에만 둔다
  const dated = here.filter((entry) => isDated(entry) && entry.dateFrom && (year === null || entry.dateFrom.startsWith(`${year}-`)))
  const cells: MonthPlacement['cells'] = []
  if (year !== null) {
    const firstWeekday = new Date(year, month - 1, 1).getDay()
    const days = new Date(year, month, 0).getDate()
    for (let blank = 0; blank < firstWeekday; blank++) cells.push(null)
    for (let day = 1; day <= days; day++) {
      const iso = `${year}-${pad(month)}-${pad(day)}`
      cells.push({ day, iso, entries: dated.filter((entry) => inRange(entry, iso)) })
    }
    while (cells.length % 7 !== 0) cells.push(null)
  }
  const placedDated = year === null ? [] : dated.filter((entry) => cells.some((cell) => cell && cell.entries.includes(entry)))
  const weekBands = bands(here.filter((entry) => entry.precision === 'WEEK_IN_MONTH' && entry.weekFrom != null))
  const termWeekBands = bands(here.filter((entry) => entry.precision === 'TERM_WEEK' && entry.weekFrom != null))
  const monthSummary = here.filter((entry) => entry.precision === 'MONTH' || entry.precision === 'MONTH_RANGE')
  const placed = new Set([...placedDated, ...weekBands.flatMap((band) => band.entries), ...termWeekBands.flatMap((band) => band.entries), ...monthSummary])
  const undated = here.filter((entry) => !placed.has(entry))
  return { year, month, cells, weekBands, termWeekBands, monthSummary, undated, total: here.length }
}

/** 과목마다 고정 색 번호 (0~5). 상태 색이 아니라 과목 구분용 점에만 쓴다 */
export function subjectColorIndex(subjects: string[], subject: string): number {
  const index = subjects.indexOf(subject)
  return index < 0 ? 5 : index % 6
}
