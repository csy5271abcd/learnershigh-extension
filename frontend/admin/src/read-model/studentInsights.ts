import type { AdminStudent, AdminTask, AdminTestResult, ExistingStudySnapshot } from '../fixtures/types.ts'
import type { AdminState } from '../store/adminStore.ts'
import { deriveFeedbackQueue, LONG_WAIT_HOURS, revisionNotAppliedTasks, type FeedbackQueueItem } from './feedbackQueue.ts'
import { daysUntil, formatDday, formatPercent } from './time.ts'

/*
 * 학생 단위 파생 값 (Today Board · Student 360 · Operations가 같은 함수를 쓴다. 화면마다 다른 공식을 두지 않는다)
 * 관리 포인트는 서비스 사용 횟수가 아니라 실제 학습 변화로 만든다. (student-management.md Today Board)
 * 기준값(아래 상수)은 Feature Spec에 수치가 없어 Fixture Read Model 기준으로 둔다. (Gap 보고)
 */

/** Plan 실행률 하락으로 볼 차이 (직전 7일 대비 최근 7일, %p) */
export const PLAN_DROP_POINTS = 15
/** Operations Alert "Plan 50% 미만" */
export const PLAN_LOW_RATE = 0.5
/** 연속 미등원으로 볼 일수 (Operations Alert "연속 미등원") */
export const CONSECUTIVE_ABSENT_DAYS = 2
/** 점수 시험(학교 · 학원)에서 하락으로 볼 점수 차이 */
export const SCORE_DROP = 5

export type ManagementPointKind = 'absence' | 'plan-drop' | 'plan-low' | 'test-decline' | 'deadline-passed' | 'deadline-risk' | 'ai-failed' | 'revision-not-applied' | 'feedback-delay'

export interface ManagementPoint {
  kind: ManagementPointKind
  label: string
}

export const managementPointKindLabel: Record<ManagementPointKind, string> = {
  absence: '연속 미등원',
  'plan-drop': 'Plan 하락',
  'plan-low': 'Plan 50% 미만',
  'test-decline': '시험 하락',
  'deadline-passed': '마감 지남',
  'deadline-risk': 'Deadline Risk',
  'ai-failed': 'AI 점검 실패',
  'revision-not-applied': '수정 미반영',
  'feedback-delay': 'Feedback 지연',
}

export type ChangeDirection = 'up' | 'down' | 'same' | 'first'

export interface TestChange {
  test: AdminTestResult
  /** '영어 87 → 81' / '모의 수학 3 → 2등급' / '모의 국어 3등급 (첫 기록)' */
  label: string
  direction: ChangeDirection
}

export const testTypeLabel: Record<AdminTestResult['type'], string> = {
  school_exam: '학교 시험',
  mock_exam: '모의고사',
  academy_test: '학원 Test',
}

/** 실제로 있는 값으로만 변화 문장을 만든다. (없는 직전 결과를 만들지 않는다) */
export function testChange(test: AdminTestResult): TestChange {
  if (test.type === 'mock_exam') {
    if (test.grade === undefined) return { test, label: `모의 ${test.subject} 기록`, direction: 'first' }
    if (test.previousResult === undefined) return { test, label: `모의 ${test.subject} ${test.grade}등급 (첫 기록)`, direction: 'first' }
    const direction: ChangeDirection = test.grade < test.previousResult ? 'up' : test.grade > test.previousResult ? 'down' : 'same'
    return { test, label: `모의 ${test.subject} ${test.previousResult} → ${test.grade}등급`, direction }
  }
  if (test.score === undefined) return { test, label: `${test.subject} 기록`, direction: 'first' }
  if (test.previousResult === undefined) return { test, label: `${test.subject} ${test.score}점 (첫 기록)`, direction: 'first' }
  const diff = test.score - test.previousResult
  return { test, label: `${test.subject} ${test.previousResult} → ${test.score}`, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same' }
}

const isDecline = (change: TestChange) =>
  change.direction === 'down' && (change.test.type === 'mock_exam' || (change.test.score ?? 0) - (change.test.previousResult ?? 0) <= -SCORE_DROP)

export const isActiveTask = (task: AdminTask) => task.currentStage !== 8 && !task.onHold

export interface StudentInsight {
  student: AdminStudent
  study: ExistingStudySnapshot | null
  tasks: AdminTask[]
  activeTasks: AdminTask[]
  /** 가장 급한 진행 중 Task (마감 가까운 순, 지난 마감 먼저) */
  primaryTask: AdminTask | null
  queueItems: FeedbackQueueItem[]
  tests: AdminTestResult[]
  latestChange: TestChange | null
  points: ManagementPoint[]
  needsAttention: boolean
}

const cache = new WeakMap<AdminState, Map<string, StudentInsight>>()

export function studentInsights(state: AdminState): Map<string, StudentInsight> {
  const cached = cache.get(state)
  if (cached) return cached
  const queue = deriveFeedbackQueue(state)
  const notApplied = new Set(revisionNotAppliedTasks(state).map((item) => item.taskId))
  const result = new Map<string, StudentInsight>()
  for (const student of state.students) {
    const study = state.study.find((item) => item.studentId === student.studentId) ?? null
    const tasks = state.tasks.filter((item) => item.studentId === student.studentId)
    const activeTasks = tasks.filter(isActiveTask).sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate) || a.taskId.localeCompare(b.taskId))
    const tests = state.testResults
      .filter((item) => item.studentId === student.studentId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.testResultId.localeCompare(a.testResultId))
    const latestChange = tests[0] ? testChange(tests[0]) : null
    const queueItems = queue.filter((item) => item.student.studentId === student.studentId)

    const points: ManagementPoint[] = []
    if (study && study.consecutiveAbsentDays >= CONSECUTIVE_ABSENT_DAYS) points.push({ kind: 'absence', label: `연속 미등원 ${study.consecutiveAbsentDays}일` })
    if (study) {
      const drop = Math.round((study.previous7DayPlanRate - study.recent7DayPlanRate) * 100)
      if (drop >= PLAN_DROP_POINTS) points.push({ kind: 'plan-drop', label: `Plan ${formatPercent(study.previous7DayPlanRate)} → ${formatPercent(study.recent7DayPlanRate)}` })
      else if (study.recent7DayPlanRate < PLAN_LOW_RATE) points.push({ kind: 'plan-low', label: `최근 7일 Plan ${formatPercent(study.recent7DayPlanRate)}` })
    }
    // 가장 최근 시험이 하락했을 때만 (지난 시험의 하락을 계속 끌고 오지 않는다)
    if (latestChange && isDecline(latestChange)) points.push({ kind: 'test-decline', label: latestChange.label })
    for (const task of activeTasks) {
      const days = daysUntil(task.deadlineDate)
      if (days < 0) points.push({ kind: 'deadline-passed', label: `수행평가 마감 지남 ${formatDday(days)} · ${task.subject}` })
      else if (days <= 3) points.push({ kind: 'deadline-risk', label: `수행평가 ${formatDday(days)} · ${task.subject}` })
    }
    for (const task of activeTasks) {
      const latest = task.versions?.at(-1)
      if (latest?.aiStatus === 'failed') points.push({ kind: 'ai-failed', label: `AI 사전 점검 실패 · ${task.subject} V${latest.number}` })
      if (notApplied.has(task.taskId)) points.push({ kind: 'revision-not-applied', label: `피드백 후 수정 미반영 · ${task.subject}` })
    }
    const longest = queueItems.filter((item) => item.waitingHours > LONG_WAIT_HOURS).sort((a, b) => b.waitingHours - a.waitingHours)[0]
    if (longest) points.push({ kind: 'feedback-delay', label: `Feedback ${longest.waitingHours}시간 대기` })

    result.set(student.studentId, {
      student,
      study,
      tasks,
      activeTasks,
      primaryTask: activeTasks[0] ?? null,
      queueItems,
      tests,
      latestChange,
      points,
      needsAttention: points.length > 0,
    })
  }
  cache.set(state, result)
  return result
}
