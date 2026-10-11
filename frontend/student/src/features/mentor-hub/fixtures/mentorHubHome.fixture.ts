// UI 검증용 Fixture다. 실제 Backend / LearnersHigh / Student / Mentor 데이터가 아니다.
// 모든 인물은 가상이며, 추천 이유는 추천 Algorithm 결과가 아니라 미리 작성한 표시용 문장이다.
// Mentor / Content Identity는 mentors.fixture.ts의 Canonical 값을 쓴다. (domain.md §57)

import type { LinkedTask, MentorHubHome } from '../model/types.ts'
import {
  fixtureMentorContent as content,
  fixtureMentors as mentors,
  fixturePlanSummaries,
  fixtureRoutineSummaries,
  fixtureRecordSummaries,
  fixtureStorySummaries,
} from './mentors.fixture.ts'

const currentTask: LinkedTask = {
  taskId: 'fixture-task-01',
  title: '항생제 내성과 자연선택 탐구 포스터',
}

export const mentorHubHomeFixture: MentorHubHome = {
  studentContext: {
    displayName: '최하은',
    grade: '고2',
    interestField: '생명과학 · 생명공학',
    currentTask,
    savedContentTags: ['미생물', '유전', '생명공학', '의생명', '환경생물'],
  },
  recommendedMentors: [
    {
      mentor: mentors.hanJisu,
      recommendationReason: "지금 진행 중인 '항생제 내성과 자연선택' 탐구 포스터와 같은 주제로 활동한 경험이 있어요.",
      relatedContent: [content.antibioticCase, content.literaturePlan],
    },
    {
      mentor: mentors.hanYerin,
      recommendationReason: '저장한 #환경생물 관심사처럼, 환경 탐구를 생명과학 진로로 이어간 경험이 있어요.',
      relatedContent: [content.environmentRecord, content.riverCase],
    },
    {
      mentor: mentors.parkNayun,
      recommendationReason: '생명 계열과 가까운 식품영양학과에 진학했고, 탐구 활동과 수능 최저 준비를 함께 한 경험이 있어요.',
      relatedContent: [content.scienceRoutine, content.beverageCase],
    },
  ],
  otherMentors: [
    mentors.jeongSejin,
    mentors.choiAreum,
    mentors.kangMinho,
    mentors.jeongMinhyuk,
    mentors.kimHaram,
    mentors.leeChaerin,
  ],
  adminRecommendedCases: [
    {
      caseId: content.antibioticCase.contentId,
      title: content.antibioticCase.title,
      mentor: mentors.hanJisu,
      relationReason: '진행 중인 탐구 포스터와 주제가 같고, 자료 조사부터 발표까지의 과정을 참고할 수 있어요.',
      recommendedDate: '2026-10-04',
      linkedTask: currentTask,
      processSteps: [
        '안내문 등록',
        '주제 선정',
        '자료 조사',
        '초안 V1 제출',
        'AI 사전 점검',
        '선생님 피드백',
        'Revision',
        '최종 제출 / 발표',
      ],
    },
  ],
  mixedContent: [
    {
      ...content.midtermPlan,
      summary: fixturePlanSummaries[content.midtermPlan.contentId],
      mentor: mentors.goMinjeong,
    },
    {
      ...content.englishRoutine,
      summary: fixtureRoutineSummaries[content.englishRoutine.contentId],
      mentor: mentors.choiEunchae,
    },
    {
      ...content.mathStory,
      summary: fixtureStorySummaries[content.mathStory.contentId],
      mentor: mentors.kangMinho,
    },
    {
      ...content.posterQna,
      summary: '교과 개념에서 출발해 직접 확인할 수 있는 범위로 주제를 줄인 과정을 답했어요.',
      mentor: mentors.hanJisu,
    },
    {
      ...content.environmentRecord,
      summary: fixtureRecordSummaries[content.environmentRecord.contentId],
      mentor: mentors.hanYerin,
    },
    {
      ...content.beverageCase,
      summary: '실험 설계부터 결과 발표까지의 과정이 정리된 Activity Case예요.',
      mentor: mentors.parkNayun,
    },
  ],
}

/** Empty State 확인용: Student Context는 있고 추천 결과가 모두 비어 있는 경우 */
export const emptyMentorHubHomeFixture: MentorHubHome = {
  studentContext: mentorHubHomeFixture.studentContext,
  recommendedMentors: [],
  otherMentors: [],
  adminRecommendedCases: [],
  mixedContent: [],
}

export type MentorHubHomeFixtureScenario = 'success' | 'empty' | 'loading' | 'error'

const scenarios: MentorHubHomeFixtureScenario[] = ['success', 'empty', 'loading', 'error']

/** 개발 중 `?fixture=empty|loading|error`로 화면 상태를 확인한다. */
export function readFixtureScenario(search: string): MentorHubHomeFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

function buildLoader(scenario: MentorHubHomeFixtureScenario): () => Promise<MentorHubHome> {
  switch (scenario) {
    case 'loading':
      return () => new Promise<MentorHubHome>(() => {})
    case 'error':
      return () => Promise.reject(new Error('Mentor Hub Home fixture error'))
    case 'empty':
      return () => Promise.resolve(emptyMentorHubHomeFixture)
    case 'success':
      return () => Promise.resolve(mentorHubHomeFixture)
  }
}

const loaders = new Map<MentorHubHomeFixtureScenario, () => Promise<MentorHubHome>>()

/**
 * 실제 API 대신 Fixture를 돌려주는 Data Source. API 연결 시 같은 시그니처의 함수로 교체한다.
 * 같은 scenario에는 같은 함수를 돌려준다. (화면 왕복 시 이미 받은 데이터를 재사용하기 위함)
 */
export function createMentorHubHomeFixtureLoader(
  scenario: MentorHubHomeFixtureScenario,
): () => Promise<MentorHubHome> {
  let loader = loaders.get(scenario)
  if (!loader) {
    loader = buildLoader(scenario)
    loaders.set(scenario, loader)
  }
  return loader
}
