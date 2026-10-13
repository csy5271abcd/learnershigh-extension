import {
  LONG_WAIT_HOURS,
  queueStageLabel,
  queueStatusLabel,
  type FeedbackQueueItem,
  type QueueSourceType,
  type QueueStage,
  type QueueStatus,
} from '../../../read-model/feedbackQueue.ts'
import { daysUntil } from '../../../read-model/time.ts'
import type { StudentGrade } from '../../../fixtures/types.ts'

/*
 * Feedback Dashboard 보기 조건 (주소 Query). Queue 자체는 read-model/feedbackQueue.ts가 Canonical Entity에서 계산한다.
 * Filter는 보기 조건일 뿐 Routing 규칙이 아니다. Contract §28-2 Query(type · grade · stage · deadlineFrom/To · waitingHoursMin · status · page · size) 의미를 따른다.
 */

export type DeadlineFilter = 'all' | 'passed' | 'd3' | 'd7'
export type WaitingFilter = 'all' | 'over24' | 'over48'

export interface FeedbackQueueFilter {
  type: QueueSourceType | 'all'
  grade: StudentGrade | 'all'
  stage: QueueStage | 'all'
  deadline: DeadlineFilter
  waiting: WaitingFilter
  status: QueueStatus | 'all'
  query: string
  /** 0부터 */
  page: number
}

export const emptyFilter: FeedbackQueueFilter = { type: 'all', grade: 'all', stage: 'all', deadline: 'all', waiting: 'all', status: 'all', query: '', page: 0 }

export const QUEUE_PAGE_SIZE = 10

export const sourceTypeLabel: Record<QueueSourceType, string> = { task: '수행평가', activity: '성장활동' }

export type QueueWorkflow = 'topic' | 'feedback' | 'revision' | 'activity'

/** 업무 종류 (화면 표시용 구분. Queue 순서 · Routing을 바꾸지 않는다) */
export function queueWorkflow(item: FeedbackQueueItem): QueueWorkflow {
  if (item.kind === 'topic-review') return 'topic'
  if (item.kind === 'activity-feedback') return 'activity'
  return item.target !== 'V1' ? 'revision' : 'feedback'
}

export const queueWorkflowLabel: Record<QueueWorkflow, string> = {
  topic: '주제 검토',
  feedback: '선생님 피드백',
  revision: '수정본 재검토',
  activity: '활동 피드백',
}

/** 마감이 지났거나 D-3 이내인 수행평가 검토 (우선 검토 대상) */
export const isDeadlineCritical = (item: FeedbackQueueItem) => item.status === 'deadline-risk' || item.status === 'deadline-passed'

/** 행의 주 Action 문구 */
export function primaryActionLabel(item: FeedbackQueueItem): string {
  const workflow = queueWorkflow(item)
  if (workflow === 'topic') return '주제 검토'
  if (workflow === 'activity') return '피드백 작성'
  if (isDeadlineCritical(item)) return '우선 검토'
  return workflow === 'revision' ? '수정본 확인' : '검토하기'
}

const pick = <T extends string>(value: string | null, allowed: readonly T[]): T | 'all' =>
  value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : 'all'

const gradeParam: Record<string, StudentGrade> = { '1': '고1', '2': '고2', '3': '고3' }

export function parseFeedbackFilter(search: string): FeedbackQueueFilter {
  const params = new URLSearchParams(search)
  const page = Number(params.get('page'))
  return {
    type: pick(params.get('type'), ['task', 'activity'] as const),
    grade: gradeParam[params.get('grade') ?? ''] ?? 'all',
    stage: pick(params.get('stage'), Object.keys(queueStageLabel) as QueueStage[]),
    deadline: pick(params.get('deadline'), ['passed', 'd3', 'd7'] as const),
    waiting: pick(params.get('waiting'), ['over24', 'over48'] as const),
    status: pick(params.get('status'), Object.keys(queueStatusLabel) as QueueStatus[]),
    query: params.get('q') ?? '',
    // 주소의 page는 1부터 (사람이 읽는 값)
    page: Number.isInteger(page) && page > 1 ? page - 1 : 0,
  }
}

/** Filter를 주소 Query로. 개발용 Query(fixture 등)는 그대로 둔다. */
export function writeFeedbackFilter(search: string, filter: FeedbackQueueFilter): string {
  const params = new URLSearchParams(search)
  const set = (key: string, value: string) => (value === 'all' || value === '' ? params.delete(key) : params.set(key, value))
  set('type', filter.type)
  set('grade', filter.grade === 'all' ? 'all' : filter.grade.slice(1))
  set('stage', filter.stage)
  set('deadline', filter.deadline)
  set('waiting', filter.waiting)
  set('status', filter.status)
  set('q', filter.query.trim())
  set('page', filter.page > 0 ? String(filter.page + 1) : '')
  return params.toString()
}

export const isFilterActive = (filter: FeedbackQueueFilter) =>
  filter.type !== 'all' ||
  filter.grade !== 'all' ||
  filter.stage !== 'all' ||
  filter.deadline !== 'all' ||
  filter.waiting !== 'all' ||
  filter.status !== 'all' ||
  filter.query.trim() !== ''

/** 순서는 Queue 순서(오래 기다린 순) 그대로 둔다. */
export function applyFeedbackFilter(items: readonly FeedbackQueueItem[], filter: FeedbackQueueFilter): FeedbackQueueItem[] {
  const query = filter.query.trim().toLowerCase()
  return items.filter((item) => {
    if (filter.type !== 'all' && item.type !== filter.type) return false
    if (filter.grade !== 'all' && item.grade !== filter.grade) return false
    if (filter.stage !== 'all' && item.stage !== filter.stage) return false
    if (filter.status !== 'all' && item.status !== filter.status) return false
    if (filter.waiting === 'over24' && item.waitingHours <= 24) return false
    if (filter.waiting === 'over48' && item.waitingHours <= LONG_WAIT_HOURS) return false
    if (filter.deadline !== 'all') {
      if (!item.deadlineDate) return false
      const days = daysUntil(item.deadlineDate)
      if (filter.deadline === 'passed' ? days >= 0 : days < 0 || days > (filter.deadline === 'd3' ? 3 : 7)) return false
    }
    if (query && !`${item.student.displayName} ${item.subject} ${item.title}`.toLowerCase().includes(query)) return false
    return true
  })
}

export interface QueuePage {
  rows: FeedbackQueueItem[]
  page: number
  totalPages: number
  totalElements: number
}

/** Contract §48 Pagination 의미 (number · size · totalElements · totalPages). 범위를 넘는 page는 마지막 page로 */
export function paginate(items: FeedbackQueueItem[], page: number, size = QUEUE_PAGE_SIZE): QueuePage {
  const totalPages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(page, totalPages - 1)
  return { rows: items.slice(current * size, current * size + size), page: current, totalPages, totalElements: items.length }
}

/** 지금 Queue에 실제로 있는 값만 Filter 선택지로 쓴다. (없는 단계 / 상태를 만들지 않는다) */
export function presentValues<T extends string>(items: readonly FeedbackQueueItem[], read: (item: FeedbackQueueItem) => T, order: readonly T[]): T[] {
  const present = new Set(items.map(read))
  return order.filter((value) => present.has(value))
}
