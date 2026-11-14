// 월별 교수·학습 운영 계획 달력 배치 (순수 함수, Student/Admin 공용 후보).
// 설계: docs/specs/suyeon/ACCOUNT-A-A35-A4-PARTIAL-REVIEW-20261114.md §7~§9. 계약(0.3 teachingPlan)이 합의되기 전이라 서버 데이터는 아직 없다.
// 원칙
// - 원문에 없는 날짜를 만들지 않는다: WEEK_ONLY는 주차 띠, MONTH_ONLY는 월 요약 띠, UNKNOWN은 "날짜 미확인" 목록.
// - "n주"는 학교가 정한 주차다. ISO 주·월요일 시작 주로 날짜를 환산하지 않는다.
// - 학년도 Y의 3~12월은 Y년이다. 1~2월은 원문·학사일정으로 확인되기 전까지 연도를 붙이지 않는다(달력 칸을 그리지 않음).

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
  linkedAssessments: string[]
  sourcePdfPageNumber: number | null
  status: 'CANDIDATE' | 'CONFIRMED'
}

/** 학년도 순서의 달 (3월 → 다음 해 2월) */
export const academicMonths = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2]

/** 그 달의 실제 연도. 1~2월은 확인 전이라 null */
export function calendarYear(academicYear: number, month: number): number | null {
  return month >= 3 ? academicYear : null
}

export interface MonthPlacement {
  year: number | null
  month: number
  /** 날짜 칸 (year가 있을 때만). null = 앞뒤 빈 칸 */
  cells: ({ day: number; iso: string; entries: TeachingPlanEntry[] } | null)[]
  ranges: TeachingPlanEntry[]
  weekBands: { week: number; entries: TeachingPlanEntry[] }[]
  monthSummary: TeachingPlanEntry[]
  undated: TeachingPlanEntry[]
}

const pad = (value: number) => String(value).padStart(2, '0')

function overlapsMonth(entry: TeachingPlanEntry, year: number, month: number): boolean {
  if (!entry.dateFrom) return false
  const start = `${year}-${pad(month)}-01`
  const end = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`
  const to = entry.dateTo ?? entry.dateFrom
  return entry.dateFrom <= end && to >= start
}

export function placeEntries(entries: TeachingPlanEntry[], academicYear: number, month: number): MonthPlacement {
  const year = calendarYear(academicYear, month)
  const exact = entries.filter((entry) => entry.precision === 'EXACT_DATE' && entry.dateFrom)
  const cells: MonthPlacement['cells'] = []
  if (year !== null) {
    const firstWeekday = new Date(year, month - 1, 1).getDay() // 일요일 시작 표시 (날짜 칸 배치용일 뿐 주차 계산에 쓰지 않는다)
    const days = new Date(year, month, 0).getDate()
    for (let blank = 0; blank < firstWeekday; blank++) cells.push(null)
    for (let day = 1; day <= days; day++) {
      const iso = `${year}-${pad(month)}-${pad(day)}`
      cells.push({ day, iso, entries: exact.filter((entry) => entry.dateFrom === iso) })
    }
    while (cells.length % 7 !== 0) cells.push(null)
  }
  const inMonth = (entry: TeachingPlanEntry) => entry.month === month
  const weeks = new Map<number, TeachingPlanEntry[]>()
  for (const entry of entries.filter((item) => item.precision === 'WEEK_ONLY' && inMonth(item) && item.weekFrom !== null)) {
    const week = entry.weekFrom as number
    weeks.set(week, [...(weeks.get(week) ?? []), entry])
  }
  return {
    year,
    month,
    cells,
    ranges: year === null ? [] : entries.filter((entry) => entry.precision === 'DATE_RANGE' && overlapsMonth(entry, year, month)),
    weekBands: [...weeks].sort(([a], [b]) => a - b).map(([week, list]) => ({ week, entries: list })),
    monthSummary: entries.filter((entry) => entry.precision === 'MONTH_ONLY' && inMonth(entry)),
    // 날짜를 확인할 수 없는 행과, 연도를 모르는 달(1~2월)의 날짜 행은 날짜 칸에 넣지 않고 목록으로 둔다
    undated: entries.filter((entry) => entry.precision === 'UNKNOWN' || (year === null && inMonth(entry) && (entry.precision === 'EXACT_DATE' || entry.precision === 'DATE_RANGE'))),
  }
}
