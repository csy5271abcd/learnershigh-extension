import { activityTypeLabel } from '../fixtures/adminActivities.fixture.ts'
import { ADMIN_SNAPSHOT_AT, ADMIN_WEEK_START_AT } from '../fixtures/snapshot.ts'
import type { AdminActivity, AdminStudent, AdminTask, StudentGrade, TaskReview } from '../fixtures/types.ts'
import type { AdminState } from '../store/adminStore.ts'
import { daysUntil, hoursBetween, hoursSince } from './time.ts'

/*
 * Shared Feedback Queue Read Model. Task / Activity Entity에서 계산한다. (Queue 전용 저장소 · 수동 Counter 없음)
 * Queue에 들어가는 것 (실제로 Admin 검토가 필요한 것만):
 *   - Task 검토: AI 사전 점검을 마친 Version의 선생님 검토가 아직 전달되지 않음 (TaskReview.delivery === null)
 *   - 주제 검토: Task.topic.state === 'in-review' (Stage 2 "제출 후 공용 검토")
 *   - 활동 피드백: Activity.status === 'feedback-waiting' (학생이 요청한 활동만)
 * Task 단계 전체를 Queue로 복사하지 않는다. 특정 Staff / 과목으로 나누지 않는다. (Filter는 보기 조건일 뿐)
 * 순서: 대기열에 들어온 순서 (오래 기다린 항목이 먼저). 우선순위 정렬 규칙은 Source에 없어 만들지 않는다.
 */

export type QueueKind = 'task-review' | 'topic-review' | 'activity-feedback'
export type QueueSourceType = 'task' | 'activity'

/** 검토 단계 (Queue View 값. Task Stage Enum을 확정하지 않는다) */
export type QueueStage = 'topic' | 'staff-feedback' | 'revision' | 'activity-feedback'

/** 운영 상태 (Task Stage와 분리된 파생 값, domain.md §12-3) */
export type QueueStatus = 'topic-review' | 'feedback-requested' | 'deadline-passed' | 'deadline-risk' | 'revision-review' | 'review-waiting'

export interface FeedbackQueueItem {
  feedbackId: string
  kind: QueueKind
  type: QueueSourceType
  /** 원본 Task / Activity id */
  sourceId: string
  student: { studentId: string; displayName: string }
  grade: StudentGrade
  /** 수행평가 = 과목, 성장활동 = 활동 유형 */
  subject: string
  title: string
  /** 검토 대상 표시 (V2 / 주제 / 활동 기록) */
  target: string
  stage: QueueStage
  deadlineDate: string | null
  queuedAt: string
  waitingHours: number
  status: QueueStatus
}

export const LONG_WAIT_HOURS = 48
export const DEADLINE_SOON_DAYS = 3
/** 수정 미반영 기준 (FeedbackDashboard-00 KPI 설명 "Staff Feedback 후 72시간 경과") */
export const REVISION_NOT_APPLIED_HOURS = 72

export const topicFeedbackId = (taskId: string) => `topic-review-${taskId}`
export const activityFeedbackId = (activityId: string) => `activity-feedback-${activityId}`

export const queueStageLabel: Record<QueueStage, string> = {
  topic: '주제 선정',
  'staff-feedback': '선생님 피드백',
  revision: 'Revision',
  'activity-feedback': 'Activity Feedback',
}

export const queueStatusLabel: Record<QueueStatus, string> = {
  'topic-review': '주제 검토',
  'feedback-requested': '피드백 요청',
  'deadline-passed': '마감 지남',
  'deadline-risk': 'Deadline Risk',
  'revision-review': '수정본 확인',
  'review-waiting': '검토 대기',
}

export const queueKindLabel: Record<QueueKind, string> = {
  'task-review': '수행평가 검토',
  'topic-review': '주제 검토',
  'activity-feedback': '활동 피드백',
}

const studentMap = (state: AdminState) => new Map(state.students.map((item) => [item.studentId, item]))

function taskStatus(task: AdminTask, versionNumber: number): QueueStatus {
  const days = daysUntil(task.deadlineDate)
  if (days < 0) return 'deadline-passed'
  if (days <= DEADLINE_SOON_DAYS) return 'deadline-risk'
  return versionNumber > 1 ? 'revision-review' : 'review-waiting'
}

function reviewItem(review: TaskReview, task: AdminTask, student: AdminStudent): FeedbackQueueItem {
  const version = task.versions?.find((item) => item.versionId === review.versionId)
  const number = version?.number ?? 1
  return {
    feedbackId: review.feedbackId,
    kind: 'task-review',
    type: 'task',
    sourceId: task.taskId,
    student: { studentId: student.studentId, displayName: student.displayName },
    grade: student.grade,
    subject: task.subject,
    title: task.title,
    target: `V${number}`,
    stage: task.currentStage === 7 ? 'revision' : 'staff-feedback',
    deadlineDate: task.deadlineDate,
    queuedAt: review.queuedAt,
    waitingHours: hoursSince(review.queuedAt),
    status: taskStatus(task, number),
  }
}

function topicItem(task: AdminTask, student: AdminStudent): FeedbackQueueItem {
  const queuedAt = task.topic?.submittedAt ?? ADMIN_SNAPSHOT_AT
  return {
    feedbackId: topicFeedbackId(task.taskId),
    kind: 'topic-review',
    type: 'task',
    sourceId: task.taskId,
    student: { studentId: student.studentId, displayName: student.displayName },
    grade: student.grade,
    subject: task.subject,
    title: task.title,
    target: '주제',
    stage: 'topic',
    deadlineDate: task.deadlineDate,
    queuedAt,
    waitingHours: hoursSince(queuedAt),
    status: 'topic-review',
  }
}

function activityItem(activity: AdminActivity, student: AdminStudent): FeedbackQueueItem {
  const queuedAt = activity.feedbackRequestedAt ?? ADMIN_SNAPSHOT_AT
  return {
    feedbackId: activityFeedbackId(activity.activityId),
    kind: 'activity-feedback',
    type: 'activity',
    sourceId: activity.activityId,
    student: { studentId: student.studentId, displayName: student.displayName },
    grade: student.grade,
    subject: activityTypeLabel[activity.type],
    title: activity.title,
    target: '활동 기록',
    stage: 'activity-feedback',
    deadlineDate: null,
    queuedAt,
    waitingHours: hoursSince(queuedAt),
    status: 'feedback-requested',
  }
}

const queueCache = new WeakMap<AdminState, FeedbackQueueItem[]>()

/** 지금 공용 Queue (오래 기다린 순) */
export function deriveFeedbackQueue(state: AdminState): FeedbackQueueItem[] {
  const cached = queueCache.get(state)
  if (cached) return cached
  const students = studentMap(state)
  const tasks = new Map(state.tasks.map((item) => [item.taskId, item]))
  const items: FeedbackQueueItem[] = []
  for (const review of state.reviews) {
    if (review.delivery) continue
    const task = tasks.get(review.taskId)
    const student = task && students.get(task.studentId)
    if (task && student) items.push(reviewItem(review, task, student))
  }
  for (const task of state.tasks) {
    const student = students.get(task.studentId)
    if (task.topic?.state === 'in-review' && student) items.push(topicItem(task, student))
  }
  for (const activity of state.activities) {
    const student = students.get(activity.studentId)
    if (activity.status === 'feedback-waiting' && student) items.push(activityItem(activity, student))
  }
  items.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt) || a.feedbackId.localeCompare(b.feedbackId))
  queueCache.set(state, items)
  return items
}

// ---------- 검토 대상 찾기 (Queue에 없어도: 이미 전달한 항목도 상세를 연다) ----------

export type ReviewTarget =
  | { kind: 'task-review'; review: TaskReview; task: AdminTask; student: AdminStudent }
  | { kind: 'topic-review'; task: AdminTask; student: AdminStudent }
  | { kind: 'activity-feedback'; activity: AdminActivity; student: AdminStudent }

export function findReviewTarget(state: AdminState, feedbackId: string): ReviewTarget | null {
  const students = studentMap(state)
  if (feedbackId.startsWith('topic-review-')) {
    const task = state.tasks.find((item) => topicFeedbackId(item.taskId) === feedbackId)
    const student = task && students.get(task.studentId)
    return task && student && task.topic && task.topic.state !== 'not-submitted' ? { kind: 'topic-review', task, student } : null
  }
  if (feedbackId.startsWith('activity-feedback-')) {
    const activity = state.activities.find((item) => activityFeedbackId(item.activityId) === feedbackId)
    const student = activity && students.get(activity.studentId)
    return activity && student && (activity.status === 'feedback-waiting' || activity.feedback) ? { kind: 'activity-feedback', activity, student } : null
  }
  const review = state.reviews.find((item) => item.feedbackId === feedbackId)
  const task = review && state.tasks.find((item) => item.taskId === review.taskId)
  const student = task && students.get(task.studentId)
  return review && task && student ? { kind: 'task-review', review, task, student } : null
}

// ---------- Dashboard KPI (같은 Collection에서 계산) ----------

export interface FeedbackDashboardKpi {
  feedbackPending: number
  /** Queue에 있는 수행평가 중 마감 D-3 이내 (지나지 않은 것) */
  deadlineSoon: number
  /** 수정본이 필요하다고 전달한 지 72시간이 지났는데 다음 Version이 없는 Task */
  revisionNotApplied: number
  /** 이번 주(월요일부터) 학생에게 전달한 검토 (수행평가 + 활동) */
  completedThisWeek: number
}

/** 수정 미반영 Task: 가장 최근 전달 검토가 수정본 요청인데 72시간 동안 다음 Version이 없다. */
export function revisionNotAppliedTasks(state: AdminState): AdminTask[] {
  return state.tasks.filter((task) => {
    if (!task.versions || task.currentStage === 8) return false
    const latestVersion = task.versions.at(-1)
    const review = latestVersion && state.reviews.find((item) => item.versionId === latestVersion.versionId)
    const delivery = review?.delivery
    return Boolean(delivery?.needsAnotherRevision && hoursBetween(delivery.deliveredAt, ADMIN_SNAPSHOT_AT) >= REVISION_NOT_APPLIED_HOURS)
  })
}

export interface DeliveredFeedback {
  type: QueueSourceType
  sourceId: string
  studentId: string
  queuedAt: string | null
  deliveredAt: string
}

/** 전달된 검토 이력 (수행평가 검토 + 활동 피드백). 주제 검토는 피드백 전달이 아니라 제외한다. */
export function deliveredFeedback(state: AdminState): DeliveredFeedback[] {
  const tasks = new Map(state.tasks.map((item) => [item.taskId, item]))
  const fromReviews = state.reviews.flatMap((review) =>
    review.delivery ? [{ type: 'task' as const, sourceId: review.taskId, studentId: tasks.get(review.taskId)?.studentId ?? '', queuedAt: review.queuedAt, deliveredAt: review.delivery.deliveredAt }] : [],
  )
  const fromActivities = state.activities.flatMap((activity) =>
    activity.feedback ? [{ type: 'activity' as const, sourceId: activity.activityId, studentId: activity.studentId, queuedAt: activity.feedbackRequestedAt ?? null, deliveredAt: activity.feedback.deliveredAt }] : [],
  )
  return [...fromReviews, ...fromActivities]
}

export function computeFeedbackKpi(state: AdminState): FeedbackDashboardKpi {
  const queue = deriveFeedbackQueue(state)
  return {
    feedbackPending: queue.length,
    deadlineSoon: queue.filter((item) => {
      if (item.type !== 'task' || !item.deadlineDate) return false
      const days = daysUntil(item.deadlineDate)
      return days >= 0 && days <= DEADLINE_SOON_DAYS
    }).length,
    revisionNotApplied: revisionNotAppliedTasks(state).length,
    completedThisWeek: deliveredFeedback(state).filter((item) => item.deliveredAt >= ADMIN_WEEK_START_AT).length,
  }
}
