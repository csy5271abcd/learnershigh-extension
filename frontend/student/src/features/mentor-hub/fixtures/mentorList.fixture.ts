// UI 검증용 Mentor List Fixture Data Source. 실제 GET /api/student/mentors 검색 규칙이 아니다.
// Mentor Identity는 mentors.fixture.ts의 Canonical 값을 쓴다.

import type { MentorListQuery, MentorListResult, MentorSummary } from '../model/types.ts'
import { findMentorProfileFixture } from './mentorProfile.fixture.ts'
import { fixtureMentors as mentors } from './mentors.fixture.ts'

// 목록 순서: MentorProfile-00 Mockup의 멘토 목록 순서
const listOrder: MentorSummary[] = [
  mentors.hanJisu,
  mentors.hanYerin,
  mentors.parkNayun,
  mentors.jeongSejin,
  mentors.choiAreum,
  mentors.kangMinho,
  mentors.jeongMinhyuk,
  mentors.kimHaram,
  mentors.leeChaerin,
  mentors.yoonHaram,
  mentors.ohJunseok,
  mentors.choiEunchae,
  mentors.parkSeohyun,
  mentors.leeHyunseo,
  mentors.jeongDain,
  mentors.kimDoyeon,
  mentors.joMinjae,
  mentors.seoJiho,
  mentors.goMinjeong,
  mentors.kimTaehyun,
  mentors.leeSubin,
]

const uniqueSorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'ko'))

// Fixture 검색 대상: 이름 / 대학 / 학과 / Tag / 대표 경험 (Backend 검색 Field는 미확정)
function matchesQuery(mentor: MentorSummary, query: string): boolean {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return true
  return [mentor.name, mentor.university, mentor.major, mentor.representativeExperience, ...mentor.tags].some((field) =>
    field.toLowerCase().includes(keyword),
  )
}

function queryMentors(source: MentorSummary[], query: MentorListQuery): MentorListResult {
  const filtered = source.filter(
    (mentor) =>
      matchesQuery(mentor, query.query) &&
      (!query.admissionType || mentor.admissionType === query.admissionType) &&
      (!query.major || mentor.major === query.major),
  )
  const start = query.page * query.size

  return {
    items: filtered.slice(start, start + query.size).map((mentor) => ({
      mentor,
      contentCount: findMentorProfileFixture(mentor.mentorId)?.contents.length ?? 0,
    })),
    page: {
      number: query.page,
      size: query.size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / query.size),
    },
    filterOptions: {
      admissionTypes: uniqueSorted(source.map((mentor) => mentor.admissionType)),
      majors: uniqueSorted(source.map((mentor) => mentor.major)),
    },
  }
}

export type MentorListFixtureScenario = 'success' | 'empty' | 'loading' | 'error'

const scenarios: MentorListFixtureScenario[] = ['success', 'empty', 'loading', 'error']

/** 개발 중 `?fixture=empty|loading|error`로 화면 상태를 확인한다. (List Filter Param과 별개) */
export function readListFixtureScenario(search: string): MentorListFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorListLoader = (query: MentorListQuery) => Promise<MentorListResult>

function buildLoader(scenario: MentorListFixtureScenario): MentorListLoader {
  switch (scenario) {
    case 'loading':
      return () => new Promise<MentorListResult>(() => {})
    case 'error':
      return () => Promise.reject(new Error('Mentor List fixture error'))
    case 'empty':
      return (query) => Promise.resolve(queryMentors([], query))
    case 'success':
      return (query) => Promise.resolve(queryMentors(listOrder, query))
  }
}

const loaders = new Map<MentorListFixtureScenario, MentorListLoader>()

/** 실제 API(GET /api/student/mentors) 대신 Fixture를 돌려주는 Data Source. 같은 scenario에는 같은 함수를 돌려준다. */
export function createMentorListFixtureLoader(scenario: MentorListFixtureScenario): MentorListLoader {
  let loader = loaders.get(scenario)
  if (!loader) {
    loader = buildLoader(scenario)
    loaders.set(scenario, loader)
  }
  return loader
}
