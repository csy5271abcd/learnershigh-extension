import type { AdminState } from '../store/adminStore.ts'

/*
 * Student Surface Projection — Admin 변경이 Student 화면에 어떻게 보일지를 같은 Admin State에서 계산한다.
 * frontend/student 코드를 import하거나 바꾸지 않는다. Student Fixture가 쓰는 의미(값 이름 · 표시 규칙)를 따른다:
 *   - Task 요약: currentStage · stageStatus · turn · nextAction (schoolTasks.fixture.ts StudentTaskSummary)
 *   - 선생님 피드백: 전달됨(delivered) / 검토 중(reviewing) (schoolFeedback.fixture.ts TaskTeacherFeedback)
 *   - 활동: status · 선생님 피드백 4항목 (schoolActivity.fixture.ts)
 *   - Interview: 고3 + 공개 + (Connection 질문이면 확정 Connection) (schoolInterview.fixture.ts isStudentVisible)
 *   - Mentor Hub: Admin 추천 Case (mentorHubHome.fixture.ts adminRecommendedCases)
 * 실제 API 연결 후에는 Student API Response가 이 의미를 대신한다.
 */

export function studentTaskSummary(state: AdminState, taskId: string) {
  const task = state.tasks.find((item) => item.taskId === taskId)
  if (!task) return null
  const { title, subject, deadlineDate, currentStage, stageStatus, turn, nextAction, deliverableSummary } = task
  return { taskId, title, subject, deadlineDate, currentStage, stageStatus, turn, nextAction, deliverableSummary }
}

/** Student 피드백 Tab의 선생님 피드백 (최근 Version 먼저). AI 원문 · 내부 메모는 넣지 않는다. 전달된 AI 항목은 선생님이 고른 문장만. */
export function studentTeacherFeedback(state: AdminState, taskId: string) {
  const task = state.tasks.find((item) => item.taskId === taskId)
  if (!task) return []
  return state.reviews
    .filter((review) => review.taskId === taskId)
    .map((review) => {
      const version = task.versions?.find((item) => item.versionId === review.versionId)
      const versionLabel = `V${version?.number ?? 1}`
      return review.delivery
        ? {
            feedbackId: review.feedbackId,
            versionId: review.versionId,
            versionLabel,
            status: 'delivered' as const,
            comment: review.delivery.studentComment,
            nextAction: review.delivery.nextAction,
            deliveredAt: review.delivery.deliveredAt,
            checkPoints: review.delivery.deliveredAiItems.map((item) => item.text),
            needsAnotherRevision: review.delivery.needsAnotherRevision,
          }
        : { feedbackId: review.feedbackId, versionId: review.versionId, versionLabel, status: 'reviewing' as const }
    })
    .reverse()
}

export function studentActivityView(state: AdminState, activityId: string) {
  const activity = state.activities.find((item) => item.activityId === activityId)
  if (!activity) return null
  const feedback = activity.feedback && {
    author: activity.feedback.author,
    deliveredAt: activity.feedback.deliveredAt,
    strength: activity.feedback.strength,
    needsDetail: activity.feedback.needsDetail,
    question: activity.feedback.question,
    nextSuggestion: activity.feedback.nextSuggestion,
  }
  return { activityId, title: activity.title, status: activity.status, feedback }
}

/** Student Interview Bridge에 보이는 질문 (고3이 아니면 비어 있다) */
export function studentVisibleInterviewQuestions(state: AdminState, studentId: string) {
  const student = state.students.find((item) => item.studentId === studentId)
  if (student?.grade !== '고3') return []
  return state.interview
    .filter((question) => question.studentId === studentId && question.published)
    .filter((question) => !question.connectionId || state.connections.some((item) => item.connectionId === question.connectionId && item.reviewState === 'confirmed'))
    .map(({ questionId, question, relatedActivityIds, practiceStatus, answer }) => ({ questionId, question, relatedActivityIds: [...relatedActivityIds], practiceStatus, answer }))
}

/** 이 질문이 지금 Student 화면에 보이는지 (보이지 않으면 이유) */
export function interviewVisibility(state: AdminState, questionId: string): { visible: boolean; reason: string } {
  const question = state.interview.find((item) => item.questionId === questionId)
  if (!question) return { visible: false, reason: '질문 없음' }
  const student = state.students.find((item) => item.studentId === question.studentId)
  if (student?.grade !== '고3') return { visible: false, reason: `${student?.grade ?? ''} · Interview 대상 학년 아님` }
  if (!question.published) return { visible: false, reason: '비공개 초안' }
  if (question.connectionId && !state.connections.some((item) => item.connectionId === question.connectionId && item.reviewState === 'confirmed')) {
    return { visible: false, reason: '근거 Connection 미확정' }
  }
  return { visible: true, reason: '학생 화면에 보임' }
}

/** Student Mentor Hub "선생님 추천 Case" + Task Detail Case 연결 */
export function studentMentorHubRecommendations(state: AdminState, studentId: string) {
  return state.recommendations
    .filter((item) => item.studentId === studentId)
    .map((item) => {
      const caseRef = state.mentorCases.find((entry) => entry.contentId === item.caseId)
      const task = item.taskId ? state.tasks.find((entry) => entry.taskId === item.taskId) : null
      return {
        caseId: item.caseId,
        title: caseRef?.title ?? '',
        mentorName: caseRef?.mentorName ?? '',
        relationReason: item.reason,
        recommendedDate: item.recommendedDate,
        linkedTask: task ? { taskId: task.taskId, title: task.title } : null,
        taskRelatedCaseIds: task ? [...task.relatedMentorCaseIds] : [],
      }
    })
}
