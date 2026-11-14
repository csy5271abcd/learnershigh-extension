// 월별 교수·학습 운영 계획 배치 규칙 (순수 함수, Student 조회·Admin 검토 공용).
// 설계: docs/specs/suyeon/ACCOUNT-A-A35-A4-PARTIAL-REVIEW-20261114.md §7~§9.
// - 원문에 없는 날짜를 만들지 않는다: WEEK_ONLY는 주차 영역, MONTH_ONLY는 월 요약, UNKNOWN은 '날짜 미확인' 목록.
// - "n주"는 학교가 정한 주차다. ISO 주·일요일/월요일 시작 주로 날짜를 환산하지 않는다.
// - 학년도 Y의 3~12월은 Y년이다. 1~2월은 원문·학사일정으로 확인되기 전까지 연도를 붙이지 않는다(날짜 칸을 그리지 않음).

export type DatePrecision = 'EXACT_DATE' | 'DATE_RANGE' | 'WEEK_ONLY' | 'MONTH_ONLY' | 'UNKNOWN'

export interface TeachingPlanEntry {
  rowKey: string
  subjectName: string
  precision: DatePrecision
  month: number | null
  weekFrom: number | null
  weekTo: number | null
  /** YYYY-MM-DD (원문에 날짜가 적힌 경우만) */
  dateFrom: string | null
  dateTo: string | null
  /** 원문 표기 그대로 (예: "9월 2주") */
  asWritten: string
  unit: string | null
  content: string | null
  achievementStandards: string[]
  teachingMethods: string[]
  assessmentMethods: string[]
  /** 원문에서 연결이 명시된 수행평가 이름 (공식 수행평가 항목을 새로 만들지 않는다) */
  linkedAssessments: string[]
  specialSchedule: string | null
  sourcePdfPageNumber: number | null
  /** 관리자 검토: CANDIDATE(분석 후보) / CONFIRMED(확정). 학생에게는 CONFIRMED만 전달된다 */
  status: 'CANDIDATE' | 'CONFIRMED'
  /** 분석기가 읽지 못한 칸 이름 (관리자 검토용) */
  missingFields: string[]
}

export const precisionLabel: Record<DatePrecision, string> = {
  EXACT_DATE: '날짜',
  DATE_RANGE: '기간',
  WEEK_ONLY: '주차',
  MONTH_ONLY: '월',
  UNKNOWN: '날짜 미확인',
}

/** 학년도 순서의 달 (3월 → 다음 해 2월) */
export const academicMonths = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2]

export const semesterMonths = (semester: number) => (semester === 1 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 12, 1, 2])

/** 그 달의 실제 연도. 1~2월은 확인 전이라 null */
export function calendarYear(academicYear: number, month: number): number | null {
  return month >= 3 ? academicYear : null
}

const pad = (value: number) => String(value).padStart(2, '0')

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
  weekBands: { week: number; entries: TeachingPlanEntry[] }[]
  monthSummary: TeachingPlanEntry[]
  undated: TeachingPlanEntry[]
  /** 이 달에 보이는 계획 수 */
  total: number
}

function inRange(entry: TeachingPlanEntry, iso: string): boolean {
  if (!entry.dateFrom) return false
  return entry.dateFrom <= iso && iso <= (entry.dateTo ?? entry.dateFrom)
}

export function placeEntries(entries: TeachingPlanEntry[], academicYear: number, month: number): MonthPlacement {
  const year = calendarYear(academicYear, month)
  const dated = entries.filter((entry) => (entry.precision === 'EXACT_DATE' || entry.precision === 'DATE_RANGE') && entry.dateFrom)
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
  const inMonth = (entry: TeachingPlanEntry) => entry.month === month
  const weeks = new Map<number, TeachingPlanEntry[]>()
  for (const entry of entries.filter((item) => item.precision === 'WEEK_ONLY' && inMonth(item) && item.weekFrom !== null)) {
    // "3~4주"는 시작 주차 영역에 한 번만 두고, 범위는 원문 표기(asWritten)로 보여 준다
    const week = entry.weekFrom as number
    weeks.set(week, [...(weeks.get(week) ?? []), entry])
  }
  const weekBands = [...weeks].sort(([a], [b]) => a - b).map(([week, list]) => ({ week, entries: list }))
  const monthSummary = entries.filter((entry) => entry.precision === 'MONTH_ONLY' && inMonth(entry))
  // 날짜를 확인할 수 없는 행 + 연도를 모르는 달(1~2월)의 날짜 행은 날짜 칸에 넣지 않고 목록으로 둔다
  const undated = entries.filter((entry) => (entry.precision === 'UNKNOWN' && (entry.month === null || inMonth(entry))) || (year === null && inMonth(entry) && (entry.precision === 'EXACT_DATE' || entry.precision === 'DATE_RANGE')))
  const datedInMonth = year === null ? [] : dated.filter((entry) => cells.some((cell) => cell && cell.entries.includes(entry)))
  return {
    year,
    month,
    cells,
    weekBands,
    monthSummary,
    undated,
    total: new Set([...datedInMonth, ...weekBands.flatMap((band) => band.entries), ...monthSummary, ...undated]).size,
  }
}

/** 과목마다 고정 색 번호 (0~5). 상태 색이 아니라 과목 구분용 점에만 쓴다 */
export function subjectColorIndex(subjects: string[], subject: string): number {
  const index = subjects.indexOf(subject)
  return index < 0 ? 5 : index % 6
}
