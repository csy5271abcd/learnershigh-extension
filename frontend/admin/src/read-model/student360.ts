import { mentorHubRecommendedMentorsFixture, mentorSavedContentTagsFixture } from '../fixtures/adminMentor.fixture.ts'
import { PARENT_REPORT_PERIOD } from '../fixtures/adminRecords.fixture.ts'
import type { AdminActivity, AdminTask } from '../fixtures/types.ts'
import type { AdminState } from '../store/adminStore.ts'
import { deliveredFeedback } from './feedbackQueue.ts'
import { studentInsights, type StudentInsight } from './studentInsights.ts'
import { studentMentorHubRecommendations } from './studentProjection.ts'

/*
 * Student 360 Read Model (api-contract §34). 별도 Student Aggregate가 아니라 같은 Admin State를 학생 하나로 모은 것이다.
 * Today Board · Feedback Queue · Operations와 같은 Entity / 같은 파생 함수를 쓴다. (같은 Task는 모든 화면에서 같은 단계)
 * 상담 데이터는 넣지 않는다. (Wangyu 영역)
 */

export interface Student360 {
  insight: StudentInsight
  tasks: AdminTask[]
  activities: AdminActivity[]
  schoolRecords: AdminState['schoolRecords'][number][]
  connections: AdminState['connections'][number][]
  recommendations: ReturnType<typeof studentMentorHubRecommendations>
  hubMentors: (typeof mentorHubRecommendedMentorsFixture)[number][]
  savedTags: readonly string[]
  applications: AdminState['applications'][number][]
  taskCases: { task: AdminTask; cases: AdminState['mentorCases'][number][] }[]
  parentReport: AdminState['parentReports'][number] | null
  /** Parent 공유 동의한 최종 결과물 (Student가 동의한 것만. 동의 없는 결과물은 Report 첨부 후보가 아니다) */
  consentedArtifacts: { task: AdminTask; status: string }[]
  lastDelivered: ReturnType<typeof deliveredFeedback>[number] | null
}

export function buildStudent360(state: AdminState, studentId: string): Student360 | null {
  const insight = studentInsights(state).get(studentId)
  if (!insight) return null
  const tasks = [...insight.tasks].sort((a, b) => a.currentStage - b.currentStage || a.deadlineDate.localeCompare(b.deadlineDate))
  const activities = state.activities.filter((item) => item.studentId === studentId).sort((a, b) => b.startDate.localeCompare(a.startDate))
  const lastDelivered =
    deliveredFeedback(state)
      .filter((item) => item.studentId === studentId)
      .sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt))[0] ?? null
  return {
    insight,
    tasks,
    activities,
    schoolRecords: state.schoolRecords.filter((item) => item.studentId === studentId),
    connections: state.connections.filter((item) => item.studentId === studentId),
    recommendations: studentMentorHubRecommendations(state, studentId),
    hubMentors: mentorHubRecommendedMentorsFixture.filter((item) => item.studentId === studentId),
    savedTags: mentorSavedContentTagsFixture[studentId] ?? [],
    applications: state.applications.filter((item) => item.studentId === studentId),
    taskCases: tasks
      .filter((task) => task.relatedMentorCaseIds.length > 0)
      .map((task) => ({ task, cases: task.relatedMentorCaseIds.map((id) => state.mentorCases.find((item) => item.contentId === id)).filter((item) => item !== undefined) })),
    parentReport: state.parentReports.find((item) => item.studentId === studentId && item.period === PARENT_REPORT_PERIOD) ?? null,
    consentedArtifacts: tasks.flatMap((task) => (task.finalArtifact && task.finalArtifact.parentShareStatus !== 'not_shared' ? [{ task, status: task.finalArtifact.parentShareStatus }] : [])),
    lastDelivered,
  }
}
