import { PARENT_REPORT_PERIOD } from '../fixtures/adminRecords.fixture.ts'
import type { StudentGrade } from '../fixtures/types.ts'
import type { AdminState } from '../store/adminStore.ts'
import { computeFeedbackKpi } from './feedbackQueue.ts'
import { studentInsights, type StudentInsight } from './studentInsights.ts'

/*
 * Today Board Read Model (api-contract §33 의미). 별도 Student Source가 아니라 Student + 기존 Study/Plan + Task + TestResult 조합이다.
 * KPI: 오늘 등원 · 관리 필요 · Feedback Pending · Parent Report 미발송. (상담 KPI는 Wangyu 영역이라 두지 않는다)
 * Feedback Pending은 Feedback Dashboard와 같은 함수로 계산한다. (같은 KPI를 다른 공식으로 계산하지 않는다)
 */

export interface TodayBoardKpi {
  attendedToday: number
  registered: number
  needsAttention: number
  feedbackPending: number
  parentReportUnsent: number
}

/** Parent Report 미발송: 해당 기간 Report 중 Sent가 아닌 것 (domain.md §52 예시 계산식) */
export function parentReportUnsent(state: AdminState): number {
  return state.parentReports.filter((item) => item.period === PARENT_REPORT_PERIOD && item.status !== 'Sent').length
}

export function computeTodayBoardKpi(state: AdminState): TodayBoardKpi {
  const insights = [...studentInsights(state).values()]
  return {
    attendedToday: state.study.filter((item) => item.attendance === 'attended').length,
    registered: state.students.length,
    needsAttention: insights.filter((item) => item.needsAttention).length,
    feedbackPending: computeFeedbackKpi(state).feedbackPending,
    parentReportUnsent: parentReportUnsent(state),
  }
}

// ---------- 목록 조건 (주소 Query) ----------

export type TodayBoardSort = 'plan' | 'study' | 'attention'
export type TodayBoardScope = 'all' | 'attention' | 'stable'

export interface TodayBoardFilter {
  grade: StudentGrade | 'all'
  scope: TodayBoardScope
  sort: TodayBoardSort
  query: string
}

export const emptyTodayBoardFilter: TodayBoardFilter = { grade: 'all', scope: 'all', sort: 'plan', query: '' }

export const todayBoardSortLabel: Record<TodayBoardSort, string> = {
  plan: 'Plan 실행률 낮은 순',
  study: '오늘 순공 적은 순',
  attention: '관리 포인트 많은 순',
}

const gradeParam: Record<string, StudentGrade> = { '1': '고1', '2': '고2', '3': '고3' }

export function parseTodayBoardFilter(search: string): TodayBoardFilter {
  const params = new URLSearchParams(search)
  const scope = params.get('scope')
  const sort = params.get('sort')
  return {
    grade: gradeParam[params.get('grade') ?? ''] ?? 'all',
    scope: scope === 'attention' || scope === 'stable' ? scope : 'all',
    sort: sort === 'study' || sort === 'attention' ? sort : 'plan',
    query: params.get('q') ?? '',
  }
}

export function writeTodayBoardFilter(search: string, filter: TodayBoardFilter): string {
  const params = new URLSearchParams(search)
  const set = (key: string, value: string, empty: string) => (value === empty || value === '' ? params.delete(key) : params.set(key, value))
  set('grade', filter.grade === 'all' ? 'all' : filter.grade.slice(1), 'all')
  set('scope', filter.scope, 'all')
  set('sort', filter.sort, 'plan')
  set('q', filter.query.trim(), '')
  return params.toString()
}

const studyMinutes = (item: StudentInsight) => item.study?.todayStudyMinutes ?? 0
const planRate = (item: StudentInsight) => item.study?.recent7DayPlanRate ?? 0

export function todayBoardRows(state: AdminState, filter: TodayBoardFilter): StudentInsight[] {
  const query = filter.query.trim().toLowerCase()
  const rows = [...studentInsights(state).values()].filter((item) => {
    if (filter.grade !== 'all' && item.student.grade !== filter.grade) return false
    if (filter.scope === 'attention' && !item.needsAttention) return false
    if (filter.scope === 'stable' && item.needsAttention) return false
    if (query && !`${item.student.displayName} ${item.tasks.map((task) => `${task.title} ${task.subject}`).join(' ')}`.toLowerCase().includes(query)) return false
    return true
  })
  const order = (a: StudentInsight, b: StudentInsight) => {
    if (filter.sort === 'study') return studyMinutes(a) - studyMinutes(b)
    if (filter.sort === 'attention') return b.points.length - a.points.length
    return planRate(a) - planRate(b)
  }
  return rows.sort((a, b) => order(a, b) || a.student.studentId.localeCompare(b.student.studentId))
}
