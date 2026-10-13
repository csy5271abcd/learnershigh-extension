import { useSyncExternalStore } from 'react'
import { adminActivitiesFixture } from '../fixtures/adminActivities.fixture.ts'
import { adminConnectionsFixture, adminInterviewFixture } from '../fixtures/adminConnections.fixture.ts'
import { taskReviewsFixture } from '../fixtures/adminFeedback.fixture.ts'
import { mentorApplicationsFixture, mentorCaseCatalogFixture, mentorCaseRecommendationsFixture } from '../fixtures/adminMentor.fixture.ts'
import { adminParentReportsFixture, adminSchoolRecordsFixture, adminTestResultsFixture } from '../fixtures/adminRecords.fixture.ts'
import { adminStudentsFixture, existingStudyFixture } from '../fixtures/adminStudents.fixture.ts'
import { adminTasksFixture } from '../fixtures/adminTasks.fixture.ts'
import type {
  AdminActivity,
  AdminConnection,
  AdminInterviewQuestion,
  AdminParentReport,
  AdminSchoolRecord,
  AdminStudent,
  AdminTask,
  AdminTestResult,
  ExistingStudySnapshot,
  MentorApplication,
  MentorCaseRecommendation,
  MentorCaseRef,
  MentorContentRecommendationDraft,
  StudentOutreachDraft,
  TaskReview,
} from '../fixtures/types.ts'

/*
 * Admin Canonical Store (이번 화면 Session 동안의 메모리 저장소. 실제 Backend Persistence가 아니다)
 * - 모든 Admin 화면이 이 State 하나를 읽는다. 화면별 Fixture 복사본을 만들지 않는다.
 * - 변경은 adminCommands.ts의 Command로만 한다. 변경할 때마다 새 State 객체가 되어 화면 · 읽기 모델이 다시 계산된다.
 * - 새로고침하면 Seed(fixtures/)로 돌아간다. (localStorage / sessionStorage 미사용)
 */

export interface AdminState {
  students: readonly AdminStudent[]
  study: readonly ExistingStudySnapshot[]
  tasks: readonly AdminTask[]
  reviews: readonly TaskReview[]
  activities: readonly AdminActivity[]
  testResults: readonly AdminTestResult[]
  schoolRecords: readonly AdminSchoolRecord[]
  connections: readonly AdminConnection[]
  interview: readonly AdminInterviewQuestion[]
  mentorCases: readonly MentorCaseRef[]
  recommendations: readonly MentorCaseRecommendation[]
  applications: readonly MentorApplication[]
  parentReports: readonly AdminParentReport[]
  /** Case 외 Mentor Content 추천 임시 기록 (Admin 추천 API 미정 · 학생 Mentor Hub 미반영). Seed 없음 */
  contentRecommendationDrafts: readonly MentorContentRecommendationDraft[]
  /** Today Board 메시지 · 리마인더 발송 요청 준비 기록 (Delivery Provider 미연결 · 실제 전송 아님). Seed 없음 */
  outreachDrafts: readonly StudentOutreachDraft[]
}

const seed = (): AdminState =>
  structuredClone({
    students: adminStudentsFixture,
    study: existingStudyFixture,
    tasks: adminTasksFixture,
    reviews: taskReviewsFixture,
    activities: adminActivitiesFixture,
    testResults: adminTestResultsFixture,
    schoolRecords: adminSchoolRecordsFixture,
    connections: adminConnectionsFixture,
    interview: adminInterviewFixture,
    mentorCases: mentorCaseCatalogFixture,
    recommendations: mentorCaseRecommendationsFixture,
    applications: mentorApplicationsFixture,
    parentReports: adminParentReportsFixture,
    contentRecommendationDrafts: [],
    outreachDrafts: [],
  }) as AdminState

let state: AdminState = seed()
const listeners = new Set<() => void>()

export function getAdminState(): AdminState {
  return state
}

/** Command 전용: 새 State를 만든다. (기존 State 객체는 바꾸지 않는다) */
export function commitAdminState(next: AdminState) {
  state = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAdminState(): AdminState {
  return useSyncExternalStore(subscribe, getAdminState)
}

/** 개발 / 검증용: Seed로 되돌린다. (화면에는 버튼 없음) */
export function resetAdminState() {
  commitAdminState(seed())
}
