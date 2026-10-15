import type { NextActionOption } from '../fixtures/adminFeedback.fixture.ts'
import { ADMIN_SNAPSHOT_AT, ADMIN_SNAPSHOT_DATE, nextActionTime } from '../fixtures/snapshot.ts'
import { mentorPlansFixture, mentorRecordsFixture, mentorRoutinesFixture, mentorStoriesFixture } from '../fixtures/adminMentorContent.fixture.ts'
import type { AdminInterviewQuestion, AiItemDecision, MentorCaseRecommendation, MentorContentRecommendationDraft, StudentOutreachDraft, TaskReviewDelivery } from '../fixtures/types.ts'
import { commitAdminState, getAdminState, type AdminState } from './adminStore.ts'

/*
 * Admin Command (실제 API 대신 같은 의미의 메모리 변경). 각 Command는 api-contract의 Endpoint 하나에 대응한다.
 *   deliverTaskReview        POST /api/admin/feedback/{feedbackId}/review (action DELIVER)
 *   reviewTopic              POST /api/admin/tasks/{taskId}/topic-review
 *   deliverActivityFeedback  POST /api/admin/activities/{activityId}/feedback
 *   recommendMentorCase      POST /api/admin/students/{studentId}/mentor-case-recommendations
 *   confirm / rejectConnection  POST /api/admin/connections/{connectionId}/confirm | reject
 *   create / update / delete / publishInterviewQuestion  §38-2 ~ 38-5
 *   updateSchoolRecordStatus PUT /api/admin/students/{studentId}/school-records/{snapshotId}/status
 * - Contract에 Endpoint가 없는 Admin 화면 임시 기록 (Gap · 학생 화면 / 외부 발송에 반영하지 않는다)
 *   draftMentorContentRecommendation  Plan · Routine · Story · Record 추천 (MENTOR-CONTENT-RECOMMENDATION-API)
 *   prepareStudentOutreach            Today Board 메시지 · 리마인더 발송 요청 준비 (MESSAGE-REMINDER-DELIVERY)
 * - 잘못된 상태 전이는 오류 Code로 거절한다. (같은 요청을 두 번 보내도 두 번 반영되지 않는다)
 * - Admin 이름 / 계정은 Authentication 미확정(OD-10)이라 작성자 Audit 값을 "Admin"으로 둔다.
 * - Student 원문(Task 제출물 · Reflection · Interview 답변)은 어떤 Command도 바꾸지 않는다.
 */

export type AdminCommandErrorCode =
  | 'NOT_FOUND'
  | 'REVIEW_ALREADY_DELIVERED'
  | 'AI_ITEMS_NOT_REVIEWED'
  | 'EDITED_TEXT_REQUIRED'
  | 'REVIEW_CONTENT_REQUIRED'
  | 'TOPIC_NOT_IN_REVIEW'
  | 'ACTIVITY_FEEDBACK_NOT_REQUESTED'
  | 'ACTIVITY_FEEDBACK_CONTENT_REQUIRED'
  | 'CASE_ALREADY_RECOMMENDED'
  | 'RECOMMEND_TARGET_INVALID'
  | 'CONNECTION_STATE_NOT_ALLOWED'
  | 'INTERVIEW_NOT_ELIGIBLE'
  | 'INTERVIEW_QUESTION_REQUIRED'
  | 'INTERVIEW_ACTIVITY_INVALID'
  | 'INTERVIEW_ALREADY_PUBLISHED'
  | 'SCHOOL_RECORD_STATE_NOT_ALLOWED'
  | 'CONTENT_ALREADY_DRAFTED'
  | 'OUTREACH_CONTENT_REQUIRED'
  | 'OUTREACH_SCHEDULE_INVALID'
  | 'COMMAND_FAILED'

export class AdminCommandError extends Error {
  code: AdminCommandErrorCode
  constructor(code: AdminCommandErrorCode) {
    super(code)
    this.code = code
  }
}

export const ADMIN_ACTOR = 'Admin'

// ---- 개발용 실패 재현: ?fixture=command-fail-once → 이번 화면의 첫 Command만 실패 (다시 시도하면 성공) ----

let failOnce = false
let armed = false
export function configureCommandScenario(search: string) {
  if (!import.meta.env.DEV) return
  const wanted = new URLSearchParams(search).get('fixture') === 'command-fail-once'
  // 주소에 처음 나타날 때 한 번만 건다. (다시 그려도 다시 걸지 않는다)
  if (wanted && !armed) failOnce = true
  armed = wanted
}

const COMMAND_DELAY_MS = 300

function run<T>(apply: (current: AdminState) => { next: AdminState; result: T }): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (failOnce) {
        failOnce = false
        reject(new AdminCommandError('COMMAND_FAILED'))
        return
      }
      try {
        const { next, result } = apply(getAdminState())
        commitAdminState(next)
        resolve(result)
      } catch (error) {
        reject(error instanceof AdminCommandError ? error : new AdminCommandError('COMMAND_FAILED'))
      }
    }, COMMAND_DELAY_MS)
  })
}

const fail = (code: AdminCommandErrorCode): never => {
  throw new AdminCommandError(code)
}

const replace = <T>(items: readonly T[], match: (item: T) => boolean, update: (item: T) => T): T[] =>
  items.map((item) => (match(item) ? update(item) : item))

// ---------- Task Feedback Review ----------

export interface AiItemReviewInput {
  itemId: string
  decision: AiItemDecision
  editedText: string | null
}

export interface TaskReviewInput {
  aiItems: AiItemReviewInput[]
  studentComment: string
  nextAction: NextActionOption
  parentReportCandidate: boolean
}

export function deliverTaskReview(feedbackId: string, input: TaskReviewInput): Promise<TaskReviewDelivery> {
  return run((current) => {
    const review = current.reviews.find((item) => item.feedbackId === feedbackId) ?? fail('NOT_FOUND')
    if (review.delivery) fail('REVIEW_ALREADY_DELIVERED')
    const decisions = new Map(input.aiItems.map((item) => [item.itemId, item]))
    if (review.aiItems.some((item) => !decisions.has(item.itemId))) fail('AI_ITEMS_NOT_REVIEWED')
    if (input.aiItems.some((item) => item.decision === 'EDIT_AND_DELIVER' && !item.editedText?.trim())) fail('EDITED_TEXT_REQUIRED')
    const deliveredAiItems = review.aiItems.flatMap((item) => {
      const decision = decisions.get(item.itemId)
      if (!decision || decision.decision === 'EXCLUDE') return []
      return [{ itemId: item.itemId, decision: decision.decision, text: decision.decision === 'EDIT_AND_DELIVER' ? (decision.editedText ?? '').trim() : item.summary }]
    })
    if (!input.studentComment.trim() && deliveredAiItems.length === 0) fail('REVIEW_CONTENT_REQUIRED')

    const task = current.tasks.find((item) => item.taskId === review.taskId) ?? fail('NOT_FOUND')
    const version = task.versions?.find((item) => item.versionId === review.versionId)
    const label = `V${version?.number ?? 1}`
    const needsAnotherRevision = input.nextAction !== '다음 단계 진행'
    const delivery: TaskReviewDelivery = {
      deliveredAt: nextActionTime(),
      reviewedBy: ADMIN_ACTOR,
      studentComment: input.studentComment.trim(),
      nextAction: input.nextAction,
      needsAnotherRevision,
      parentReportCandidate: input.parentReportCandidate,
      deliveredAiItems,
    }
    // Student Fixture 규칙: 피드백이 전달돼도 단계는 그대로(V1 = 6단계, 수정본 = 7단계), 학생 차례 + 다음 할 일만 바뀐다.
    const nextTask = needsAnotherRevision
      ? { stageStatus: `${label} 피드백 확인`, turn: 'student' as const, nextAction: '선생님 피드백을 확인하고 수정할 내용을 반영해주세요.' }
      : { stageStatus: '최종 제출 준비', turn: 'student' as const, nextAction: '최종 제출을 준비해주세요.' }
    return {
      next: {
        ...current,
        reviews: replace(current.reviews, (item) => item.feedbackId === feedbackId, (item) => ({ ...item, delivery })),
        tasks: replace(current.tasks, (item) => item.taskId === task.taskId, (item) => ({ ...item, ...nextTask })),
      },
      result: delivery,
    }
  })
}

// ---------- Topic Review ----------

export type TopicReviewDecision = 'APPROVE' | 'REQUEST_DIRECTION'

export function reviewTopic(taskId: string, decision: TopicReviewDecision, comment: string | null): Promise<void> {
  return run((current) => {
    const task = current.tasks.find((item) => item.taskId === taskId) ?? fail('NOT_FOUND')
    if (task.topic?.state !== 'in-review') fail('TOPIC_NOT_IN_REVIEW')
    const topic = task.topic!
    const nextTask =
      decision === 'APPROVE'
        ? { ...task, currentStage: 3 as const, stageStatus: '자료 조사', turn: 'student' as const, nextAction: '자료를 추가하세요.', topic: { state: 'confirmed' as const, text: topic.text } }
        : {
            ...task,
            currentStage: 2 as const,
            stageStatus: '주제 수정 필요',
            turn: 'student' as const,
            nextAction: '방향을 확인하고 주제를 다시 제출하세요.',
            topic: { state: 'direction-requested' as const, text: topic.text, ...(comment?.trim() ? { guidance: comment.trim() } : {}) },
          }
    return { next: { ...current, tasks: replace(current.tasks, (item) => item.taskId === taskId, () => nextTask) }, result: undefined }
  })
}

// ---------- Activity Feedback ----------

export interface ActivityFeedbackInput {
  strength: string
  needsDetail: string
  question: string
  nextSuggestion: string
  parentReportCandidate: boolean
}

export function deliverActivityFeedback(activityId: string, input: ActivityFeedbackInput): Promise<void> {
  return run((current) => {
    const activity = current.activities.find((item) => item.activityId === activityId) ?? fail('NOT_FOUND')
    if (activity.status !== 'feedback-waiting') fail('ACTIVITY_FEEDBACK_NOT_REQUESTED')
    const fields = { strength: input.strength.trim(), needsDetail: input.needsDetail.trim(), question: input.question.trim(), nextSuggestion: input.nextSuggestion.trim() }
    if (!Object.values(fields).some(Boolean)) fail('ACTIVITY_FEEDBACK_CONTENT_REQUIRED')
    return {
      next: {
        ...current,
        activities: replace(current.activities, (item) => item.activityId === activityId, (item) => ({
          ...item,
          status: 'feedback-delivered' as const,
          feedback: { author: ADMIN_ACTOR, deliveredAt: nextActionTime(), ...fields, parentReportCandidate: input.parentReportCandidate },
        })),
      },
      result: undefined,
    }
  })
}

// ---------- Mentor Case Recommendation ----------

export interface RecommendCaseInput {
  caseId: string
  taskId: string | null
  activityId: string | null
  reason: string
}

export function recommendMentorCase(studentId: string, input: RecommendCaseInput): Promise<MentorCaseRecommendation> {
  return run((current) => {
    if (!current.mentorCases.some((item) => item.contentId === input.caseId)) fail('NOT_FOUND')
    const task = input.taskId ? current.tasks.find((item) => item.taskId === input.taskId && item.studentId === studentId) : null
    const activity = input.activityId ? current.activities.find((item) => item.activityId === input.activityId && item.studentId === studentId) : null
    if ((input.taskId && !task) || (input.activityId && !activity) || (!task && !activity)) fail('RECOMMEND_TARGET_INVALID')
    if (current.recommendations.some((item) => item.studentId === studentId && item.caseId === input.caseId && item.taskId === input.taskId && item.activityId === input.activityId)) {
      fail('CASE_ALREADY_RECOMMENDED')
    }
    const recommendation: MentorCaseRecommendation = {
      recommendationId: `fixture-recommendation-session-${current.recommendations.length + 1}`,
      studentId,
      caseId: input.caseId,
      taskId: input.taskId,
      activityId: input.activityId,
      reason: input.reason.trim(),
      recommendedDate: ADMIN_SNAPSHOT_DATE,
    }
    return {
      next: {
        ...current,
        recommendations: [...current.recommendations, recommendation],
        // Task.relatedMentorCaseIds 갱신 (같은 Case를 두 번 넣지 않는다)
        tasks: task
          ? replace(current.tasks, (item) => item.taskId === task.taskId, (item) => ({
              ...item,
              relatedMentorCaseIds: item.relatedMentorCaseIds.includes(input.caseId) ? item.relatedMentorCaseIds : [...item.relatedMentorCaseIds, input.caseId],
            }))
          : current.tasks,
      },
      result: recommendation,
    }
  })
}

// ---------- Connection ----------

function decideConnection(connectionId: string, reviewState: 'confirmed' | 'rejected') {
  return run((current) => {
    const connection = current.connections.find((item) => item.connectionId === connectionId) ?? fail('NOT_FOUND')
    if (connection.reviewState !== 'candidate') fail('CONNECTION_STATE_NOT_ALLOWED')
    return {
      next: { ...current, connections: replace(current.connections, (item) => item.connectionId === connectionId, (item) => ({ ...item, reviewState, reviewedAt: nextActionTime() })) },
      result: undefined,
    }
  })
}

export const confirmConnection = (connectionId: string) => decideConnection(connectionId, 'confirmed')
export const rejectConnection = (connectionId: string) => decideConnection(connectionId, 'rejected')

// ---------- Interview Question ----------

export interface InterviewQuestionInput {
  studentId: string
  question: string
  relatedActivityIds: string[]
  connectionId?: string
}

function validateQuestion(current: AdminState, input: Pick<InterviewQuestionInput, 'studentId' | 'question' | 'relatedActivityIds'>) {
  const student = current.students.find((item) => item.studentId === input.studentId) ?? fail('NOT_FOUND')
  if (student.grade !== '고3') fail('INTERVIEW_NOT_ELIGIBLE')
  if (!input.question.trim()) fail('INTERVIEW_QUESTION_REQUIRED')
  const archived = new Set(current.activities.filter((item) => item.studentId === input.studentId && item.status === 'archived').map((item) => item.activityId))
  if (input.relatedActivityIds.length === 0 || input.relatedActivityIds.some((id) => !archived.has(id))) fail('INTERVIEW_ACTIVITY_INVALID')
}

let createdQuestions = 0

export function createInterviewQuestion(input: InterviewQuestionInput): Promise<AdminInterviewQuestion> {
  return run((current) => {
    validateQuestion(current, input)
    if (input.connectionId) {
      const connection = current.connections.find((item) => item.connectionId === input.connectionId)
      if (!connection || connection.reviewState !== 'confirmed' || connection.studentId !== input.studentId) fail('CONNECTION_STATE_NOT_ALLOWED')
    }
    createdQuestions += 1
    const question: AdminInterviewQuestion = {
      questionId: `fixture-admin-interview-question-session-${String(createdQuestions).padStart(3, '0')}`,
      studentId: input.studentId,
      question: input.question.trim(),
      relatedActivityIds: [...input.relatedActivityIds],
      // 새 질문은 항상 비공개 초안으로 시작한다. (자동 공개 없음)
      published: false,
      ...(input.connectionId ? { connectionId: input.connectionId } : {}),
      practiceStatus: 'NOT_STARTED',
      answer: '',
      source: 'admin',
    }
    return { next: { ...current, interview: [...current.interview, question] }, result: question }
  })
}

const requireDraft = (current: AdminState, questionId: string) => {
  const question = current.interview.find((item) => item.questionId === questionId) ?? fail('NOT_FOUND')
  if (question.published) fail('INTERVIEW_ALREADY_PUBLISHED')
  return question
}

export function updateInterviewQuestion(questionId: string, input: Pick<InterviewQuestionInput, 'question' | 'relatedActivityIds'>): Promise<void> {
  return run((current) => {
    const question = requireDraft(current, questionId)
    validateQuestion(current, { studentId: question.studentId, ...input })
    return {
      next: { ...current, interview: replace(current.interview, (item) => item.questionId === questionId, (item) => ({ ...item, question: input.question.trim(), relatedActivityIds: [...input.relatedActivityIds] })) },
      result: undefined,
    }
  })
}

export function deleteInterviewQuestion(questionId: string): Promise<void> {
  return run((current) => {
    requireDraft(current, questionId)
    return { next: { ...current, interview: current.interview.filter((item) => item.questionId !== questionId) }, result: undefined }
  })
}

export function publishInterviewQuestion(questionId: string): Promise<void> {
  return run((current) => {
    const question = requireDraft(current, questionId)
    validateQuestion(current, question)
    return { next: { ...current, interview: replace(current.interview, (item) => item.questionId === questionId, (item) => ({ ...item, published: true })) }, result: undefined }
  })
}

// ---------- SchoolRecordSnapshot ----------

/** candidate → confirmed 표시만 바꾼다. 학교생활기록부 시스템에 반영하는 동작이 아니다. (전환 기준 미확정 §36-2) */
export function updateSchoolRecordStatus(snapshotId: string, status: 'confirmed'): Promise<void> {
  return run((current) => {
    const record = current.schoolRecords.find((item) => item.schoolRecordSnapshotId === snapshotId) ?? fail('NOT_FOUND')
    if (record.status !== 'candidate') fail('SCHOOL_RECORD_STATE_NOT_ALLOWED')
    return {
      next: { ...current, schoolRecords: replace(current.schoolRecords, (item) => item.schoolRecordSnapshotId === snapshotId, (item) => ({ ...item, status, snapshotDate: ADMIN_SNAPSHOT_DATE })) },
      result: undefined,
    }
  })
}

// ---------- Mentor Content 추천 기록 (Case 외 · API 없음) ----------

const nonCaseContent = [...mentorPlansFixture, ...mentorRoutinesFixture, ...mentorStoriesFixture, ...mentorRecordsFixture]

export interface ContentRecommendationInput {
  contentId: string
  taskId: string | null
  activityId: string | null
  reason: string
}

/** Plan · Routine · Story · Record 추천을 Admin 화면 안에 임시로 남긴다. 학생 Mentor Hub에는 반영하지 않는다. (추천 API 확정 전) */
export function draftMentorContentRecommendation(studentId: string, input: ContentRecommendationInput): Promise<MentorContentRecommendationDraft> {
  return run((current) => {
    const content = nonCaseContent.find((item) => item.contentId === input.contentId) ?? fail('NOT_FOUND')
    if (!current.students.some((item) => item.studentId === studentId)) fail('NOT_FOUND')
    const task = input.taskId ? current.tasks.find((item) => item.taskId === input.taskId && item.studentId === studentId) : null
    const activity = input.activityId ? current.activities.find((item) => item.activityId === input.activityId && item.studentId === studentId) : null
    if ((input.taskId && !task) || (input.activityId && !activity)) fail('RECOMMEND_TARGET_INVALID')
    if (!input.reason.trim()) fail('RECOMMEND_TARGET_INVALID')
    if (current.contentRecommendationDrafts.some((item) => item.studentId === studentId && item.contentId === input.contentId && item.taskId === input.taskId && item.activityId === input.activityId)) {
      fail('CONTENT_ALREADY_DRAFTED')
    }
    const draft: MentorContentRecommendationDraft = {
      draftId: `fixture-content-recommendation-draft-${current.contentRecommendationDrafts.length + 1}`,
      studentId,
      contentId: content.contentId,
      kind: content.kind,
      taskId: input.taskId,
      activityId: input.activityId,
      reason: input.reason.trim(),
      createdAt: nextActionTime(),
    }
    return { next: { ...current, contentRecommendationDrafts: [...current.contentRecommendationDrafts, draft] }, result: draft }
  })
}

// ---------- Today Board 메시지 · 리마인더 (Delivery Provider 미연결) ----------

export const OUTREACH_MESSAGE_MAX = 300

export interface OutreachInput {
  kind: 'message' | 'reminder'
  taskId: string | null
  activityId: string | null
  title: string | null
  body: string
  scheduledAt: string | null
  template: string | null
}

/** 발송 요청만 준비한다. 실제 학생 알림 전송 · 전송 완료 상태는 만들지 않는다. (MESSAGE-REMINDER-DELIVERY) */
export function prepareStudentOutreach(studentId: string, input: OutreachInput): Promise<StudentOutreachDraft> {
  return run((current) => {
    if (!current.students.some((item) => item.studentId === studentId)) fail('NOT_FOUND')
    const task = input.taskId ? current.tasks.find((item) => item.taskId === input.taskId && item.studentId === studentId) : null
    const activity = input.activityId ? current.activities.find((item) => item.activityId === input.activityId && item.studentId === studentId) : null
    if ((input.taskId && !task) || (input.activityId && !activity)) fail('RECOMMEND_TARGET_INVALID')
    if (!input.body.trim() || input.body.length > OUTREACH_MESSAGE_MAX || (input.kind === 'reminder' && !input.title?.trim())) fail('OUTREACH_CONTENT_REQUIRED')
    if (input.kind === 'reminder' && (!input.scheduledAt || Date.parse(`${input.scheduledAt}:00+09:00`) <= Date.parse(ADMIN_SNAPSHOT_AT))) fail('OUTREACH_SCHEDULE_INVALID')
    const draft: StudentOutreachDraft = {
      outreachId: `fixture-outreach-draft-${current.outreachDrafts.length + 1}`,
      kind: input.kind,
      studentId,
      taskId: input.taskId,
      activityId: input.activityId,
      title: input.kind === 'reminder' ? (input.title ?? '').trim() : null,
      body: input.body.trim(),
      scheduledAt: input.kind === 'reminder' ? input.scheduledAt : null,
      template: input.template,
      preparedAt: nextActionTime(),
    }
    return { next: { ...current, outreachDrafts: [...current.outreachDrafts, draft] }, result: draft }
  })
}

export const commandErrorMessage: Record<AdminCommandErrorCode, string> = {
  NOT_FOUND: '대상을 찾을 수 없어요. 목록에서 다시 확인해주세요.',
  REVIEW_ALREADY_DELIVERED: '이미 학생에게 전달된 검토예요.',
  AI_ITEMS_NOT_REVIEWED: 'AI 분석 항목을 모두 확인해주세요.',
  EDITED_TEXT_REQUIRED: '수정 후 전달할 문장을 입력해주세요.',
  REVIEW_CONTENT_REQUIRED: '학생에게 전달할 Comment 또는 AI 항목이 필요해요.',
  TOPIC_NOT_IN_REVIEW: '이미 검토가 끝난 주제예요.',
  ACTIVITY_FEEDBACK_NOT_REQUESTED: '피드백을 기다리는 활동이 아니에요.',
  ACTIVITY_FEEDBACK_CONTENT_REQUIRED: '피드백 항목을 하나 이상 입력해주세요.',
  CASE_ALREADY_RECOMMENDED: '이미 이 대상에 추천한 Case예요.',
  RECOMMEND_TARGET_INVALID: '추천할 Task 또는 활동을 선택해주세요.',
  CONNECTION_STATE_NOT_ALLOWED: '이미 검토가 끝난 연결이에요.',
  INTERVIEW_NOT_ELIGIBLE: 'Interview 질문은 고3 학생에게만 만들 수 있어요.',
  INTERVIEW_QUESTION_REQUIRED: '질문을 입력해주세요.',
  INTERVIEW_ACTIVITY_INVALID: 'Archive에 저장된 활동을 하나 이상 연결해주세요.',
  INTERVIEW_ALREADY_PUBLISHED: '이미 공개된 질문은 이 화면에서 바꿀 수 없어요.',
  SCHOOL_RECORD_STATE_NOT_ALLOWED: '이미 confirmed인 기록이에요.',
  CONTENT_ALREADY_DRAFTED: '이미 이 대상에 추천 기록을 남긴 콘텐츠예요.',
  OUTREACH_CONTENT_REQUIRED: '보낼 내용을 입력해주세요.',
  OUTREACH_SCHEDULE_INVALID: '전달 예정 시각은 지금 이후로 골라주세요.',
  COMMAND_FAILED: '처리하지 못했어요. 잠시 후 다시 시도해주세요.',
}

export const errorMessageOf = (error: unknown) => commandErrorMessage[error instanceof AdminCommandError ? error.code : 'COMMAND_FAILED']
