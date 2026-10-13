// UI 검증용 Activity Case Data Source. 실제 GET /api/student/mentor-content?type=case 검색 규칙이 아니다.
// - Case 자체 값은 activityCases.fixture.ts, Admin 추천 여부는 Home의 Admin 추천 기록(adminRecommendedCases)에서 가져와 합친다.
//   (Admin 추천과 Student의 Task 참고 연결을 한 값으로 합치지 않는다)
// - Task 후보는 Home Student Context의 진행 중 Task를 그대로 쓴다. 화면 전용 Task를 만들지 않는다.

import type {
  CaseAdminRecommendation,
  LinkedTask,
  MentorActivityCase,
  MentorCaseListQuery,
  MentorCaseListResult,
  MentorCaseView,
} from '../model/types.ts'
import { findActivityCaseFixture, fixtureActivityCases } from './activityCases.fixture.ts'
import { mentorHubHomeFixture } from './mentorHubHome.fixture.ts'

const recommendationByCaseId = new Map<string, CaseAdminRecommendation>(
  mentorHubHomeFixture.adminRecommendedCases.map((item) => [
    item.caseId,
    { recommendedDate: item.recommendedDate, relationReason: item.relationReason, linkedTask: item.linkedTask },
  ]),
)

function caseView(activityCase: MentorActivityCase): MentorCaseView {
  const adminRecommendation = recommendationByCaseId.get(activityCase.contentId)
  return adminRecommendation ? { activityCase, adminRecommendation } : { activityCase }
}

/** 내 Task에 참고 연결 후보: 현재 Student의 진행 중 Task (Home Student Context와 같은 Identity) */
export function fixtureCaseTaskCandidates(): LinkedTask[] {
  const { currentTask } = mentorHubHomeFixture.studentContext
  return currentTask ? [currentTask] : []
}

// Fixture 검색 대상: 활동명, 과목 / 영역, 활동 유형, 주요 활동, Mentor 이름 · 대학 · 학과 (Backend 검색 Field는 미확정)
function matches(item: MentorActivityCase, query: string): boolean {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return true
  const { mentor } = item
  return [item.title, item.subject, item.activityType, ...item.activities, mentor.name, mentor.university, mentor.major].some(
    (field) => field.toLowerCase().includes(keyword),
  )
}

function listResult(source: MentorActivityCase[], query: MentorCaseListQuery): MentorCaseListResult {
  const filtered = source.filter((item) => matches(item, query.query))
  const start = query.page * query.size
  return {
    items: filtered.slice(start, start + query.size).map(caseView),
    page: { number: query.page, size: query.size, totalElements: filtered.length, totalPages: Math.ceil(filtered.length / query.size) },
  }
}

// ---------- Fixture Scenario (개발 중 ?fixture= 로 확인. ?query=와 함께 써도 된다) ----------

export type CaseListFixtureScenario = 'success' | 'empty' | 'loading' | 'error'
const listScenarios: CaseListFixtureScenario[] = ['success', 'empty', 'loading', 'error']

export function readCaseListFixtureScenario(search: string): CaseListFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return listScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorCaseListLoader = (page: number, size: number) => Promise<MentorCaseListResult>

const listLoaders = new Map<string, MentorCaseListLoader>()

/**
 * 실제 GET /api/student/mentor-content?type=case&query= 대신 Fixture를 돌려준다.
 * 같은 scenario / 검색어에는 같은 함수를 돌려준다. (목록 Hook의 Cache Key)
 */
export function createMentorCaseListFixtureLoader(scenario: CaseListFixtureScenario, query: string): MentorCaseListLoader {
  const key = [scenario, query.trim()].join('|')
  let loader = listLoaders.get(key)
  if (!loader) {
    loader = (page, size) => {
      const listQuery: MentorCaseListQuery = { query, page, size }
      switch (scenario) {
        case 'loading':
          return new Promise<MentorCaseListResult>(() => {})
        case 'error':
          return Promise.reject(new Error('Mentor case list fixture error'))
        case 'empty':
          return Promise.resolve(listResult([], listQuery))
        case 'success':
          return Promise.resolve(listResult(fixtureActivityCases, listQuery))
      }
    }
    listLoaders.set(key, loader)
  }
  return loader
}

export type CaseDetailFixtureScenario = 'success' | 'loading' | 'error' | 'not-found'
const detailScenarios: CaseDetailFixtureScenario[] = ['success', 'loading', 'error', 'not-found']

export function readCaseDetailFixtureScenario(search: string): CaseDetailFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return detailScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorCaseLoader = (contentId: string) => Promise<MentorCaseView | null>

const detailLoaders = new Map<CaseDetailFixtureScenario, MentorCaseLoader>()

/** 실제 GET /api/student/mentor-content/{contentId} 대신 Fixture를 돌려준다. */
export function createMentorCaseFixtureLoader(scenario: CaseDetailFixtureScenario): MentorCaseLoader {
  let loader = detailLoaders.get(scenario)
  if (!loader) {
    loader = (contentId) => {
      switch (scenario) {
        case 'loading':
          return new Promise<MentorCaseView | null>(() => {})
        case 'error':
          return Promise.reject(new Error('Mentor case fixture error'))
        case 'not-found':
          return Promise.resolve(null)
        case 'success': {
          const activityCase = findActivityCaseFixture(contentId)
          return Promise.resolve(activityCase ? caseView(activityCase) : null)
        }
      }
    }
    detailLoaders.set(scenario, loader)
  }
  return loader
}
