// UI 검증용 Mentor Record Fixture다. 실제 학교생활기록부 문장이 아니다. (모든 인물 / 내용 가상)
// - 생기부 문체와 정보 구조만 참고한 비식별 Mock Data다. 실존 학생의 기록을 가져오지 않는다.
// - 학교명 / 담당 교사 / 학번 / 반 · 번호 / 주민번호 / 수험번호 / 제3자 실명을 넣지 않는다. (Feature Spec Record 제거 대상)
// - Published + 검수 완료된 Record만 있다고 가정한다. 검수 상태 값은 두지 않는다. (OD-05)
// - Record A~F 문장은 기준 Source(UI Renewal / Expansion 통합본 6-4 Mentor Record Mock Data)를 그대로 쓴다.
//   기존 Home Record(환경 탐구)만 Source 6-4에 없어 문장이 가상이다.

import type { MentorRecord, MentorRecordListQuery, MentorRecordListResult } from '../model/types.ts'
import { recordAreaLabel } from '../model/records.ts'
import { fixtureMentorContent as content, fixtureMentors as mentors } from './mentors.fixture.ts'

type RecordSource = Omit<MentorRecord, 'contentId' | 'kind' | 'title'> & { content: { contentId: string; title: string } }

const record = ({ content: item, ...rest }: RecordSource): MentorRecord => ({
  contentId: item.contentId,
  kind: 'record',
  title: item.title,
  ...rest,
})

// 목록 순서: Source 6-4 Record A~F, 기존 Home Record
// 연결 활동 설명은 Source 5-6 Activity Case Pool의 "주요 활동 / 결과물"을 쓴다.
const records: MentorRecord[] = [
  record({
    content: content.antibioticRecord,
    mentor: mentors.hanJisu,
    grade: 2,
    area: 'subject-detail',
    subjectOrActivity: '생명과학Ⅰ',
    recordText:
      '항생제 내성균 증가 현상을 자연선택의 원리와 연결하여 탐구함. 국내 항생제 내성 관련 통계 자료를 찾아 자료의 변화 양상을 정리하고, 내성 변이를 가진 개체의 생존과 번식이 집단 내 형질 빈도 변화로 이어지는 과정을 도식화하여 발표함. 자료의 수치를 단순 제시하기보다 조사 범위와 해석의 한계를 함께 설명하려는 태도가 돋보임.',
    linkedActivity: {
      title: '항생제 내성과 자연선택 탐구 포스터',
      description: '내성균 자료 조사, 자연선택 과정 정리, A3 포스터, 3분 발표, 후속 미생물 실험',
      caseId: content.antibioticCase.contentId,
    },
    relatedContent: [content.antibioticCase, content.mockExamStory],
    mentorNote: '포스터를 만들 때보다 자료의 한계를 설명하려고 다시 조사한 과정이 기록에 남았어요.',
  }),
  record({
    content: content.lunchDataRecord,
    mentor: mentors.jeongMinhyuk,
    grade: 1,
    area: 'subject-detail',
    subjectOrActivity: '정보',
    recordText:
      '학교생활에서 발견한 급식 잔반 문제를 데이터 분석 주제로 설정하고, 4주간의 메뉴별 잔반 데이터를 CSV 형태로 정리하여 Python으로 평균과 항목별 차이를 분석함. 분석 결과와 원인에 대한 추측을 구분하여 서술하고 추가 설문의 필요성을 제안하는 등 데이터 해석의 한계를 인식함.',
    linkedActivity: {
      title: '학교 급식 잔반 데이터 분석 프로젝트',
      description: '4주 급식 데이터, CSV, Python 분석, Matplotlib, 보고서, 3분 시연',
      caseId: content.lunchDataCase.contentId,
    },
    relatedContent: [content.lunchDataCase],
    mentorNote: '분석 결과와 제 추측을 나눠 쓰려고 했던 부분이 기록에 그대로 남았어요.',
  }),
  record({
    content: content.psychologyClubRecord,
    mentor: mentors.goMinjeong,
    grade: 2,
    area: 'club',
    subjectOrActivity: '심리탐구 동아리',
    recordText:
      '인간의 판단과 의사결정에 관심을 가지고 모둠 토론과 간단한 행동 관찰 활동에 지속적으로 참여함. AI 면접의 공정성을 주제로 알고리즘 편향과 인간 평가자의 편향을 비교하여 자료를 정리하고, 찬반 의견을 검토한 뒤 조건부 활용 방안을 제안함.',
    linkedActivity: {
      title: 'AI 면접의 공정성에 관한 윤리 논증문',
      description: '알고리즘 편향 조사, 찬반 논거 비교, 1,700자 논증문',
      caseId: content.aiInterviewCase.contentId,
    },
    relatedContent: [content.aiInterviewCase, content.undecidedCareerStory],
    mentorNote: '찬성과 반대를 모두 정리한 뒤 조건을 붙여 결론을 낸 과정이 기록됐어요.',
  }),
  record({
    content: content.readingClubRecord,
    mentor: mentors.leeChaerin,
    grade: 2,
    area: 'club',
    subjectOrActivity: '독서토론 동아리',
    recordText:
      '다양한 매체의 설득 방식을 주제로 광고와 뉴스 자료를 비교하며 언어 표현이 독자의 판단에 미치는 영향을 분석함. 토론 과정에서 다른 의견의 근거를 정리해 재질문하고 자신의 주장과 구분하여 기록하는 등 비판적 읽기 태도를 보임.',
    linkedActivity: {
      title: '배달앱 광고의 언어적 설득 전략 분석',
      description: '광고 영상 분석, 과장·반복·감정 호소 표현 분류, A4 분석지 2쪽, 4분 발표',
      caseId: content.deliveryAdCase.contentId,
    },
    relatedContent: [content.deliveryAdCase],
    mentorNote: '다른 의견의 근거를 다시 물어본 습관이 동아리 기록의 중심이 됐어요.',
  }),
  record({
    content: content.tradeCareerRecord,
    mentor: mentors.choiEunchae,
    grade: 2,
    area: 'career',
    subjectOrActivity: '국제통상',
    recordText:
      '지역 관광지의 영어 안내문을 조사하면서 직역된 표현과 실제 방문자에게 필요한 정보의 차이를 분석함. 안내 문구를 목적과 독자에 맞게 수정하고, 이후 학교 행사 영어 안내자료 제작으로 활동을 확장하여 언어 사용과 국제적 의사소통에 대한 관심을 구체화함.',
    linkedActivity: {
      title: '우리 지역 관광지 영어 안내문 개선',
      description: '실제 안내판 조사, 한·영 문구 비교, 표현 수정, Before/After, 영어 발표',
      caseId: content.tourGuideCase.contentId,
    },
    relatedContent: [content.tourGuideCase],
    mentorNote: '안내문을 고친 뒤 학교 행사 자료로 이어간 흐름이 진로활동에 남았어요.',
  }),
  record({
    content: content.eventDesignRecord,
    mentor: mentors.joAra,
    grade: 2,
    area: 'autonomous',
    subjectOrActivity: '교내 행사 디자인',
    recordText:
      '학교 축제 안내지도 제작 과정에서 행사 위치와 이동 동선을 조사하고 정보 우선순위를 정하여 시각화함. 친구들을 대상으로 길 찾기 테스트를 진행한 뒤 아이콘과 안내 순서를 수정하는 등 사용자 관점에서 디자인을 개선함.',
    linkedActivity: {
      title: '학교 축제 안내지도 디자인',
      description: '학교 지도 단순화, 행사 아이콘, 관람 동선, 사용자 테스트, A3 안내지도',
      caseId: content.festivalMapCase.contentId,
    },
    relatedContent: [content.festivalMapCase],
    mentorNote: '길 찾기 테스트로 아이콘과 순서를 다시 고친 과정이 기록됐어요.',
  }),
  // 기존 Home Mixed Content Record (StudentMentorHubHome Mockup 제목). Source 6-4에는 없어 문장은 가상이다.
  record({
    content: content.environmentRecord,
    mentor: mentors.hanYerin,
    grade: 3,
    area: 'project',
    subjectOrActivity: '환경 탐구 · 생명과학 연계',
    recordText:
      '학교 주변 하천의 수질을 계절별로 측정하는 탐구를 이어가며, 수질 지표와 서식 생물의 변화를 함께 기록함. 측정 결과를 생명과학 수업에서 배운 생태계 개념과 연결해 해석하고, 측정 횟수가 적어 계절 차이를 단정하기 어렵다는 한계를 밝힘. 탐구를 바탕으로 환경 보건 분야 진로에 대한 관심을 구체화함.',
    linkedActivity: {
      title: '학교 주변 하천의 수질과 생물 관찰',
      description: '두 지점 현장조사, pH·수온·식생·생물 관찰, 지도, 탐구보고서',
      caseId: content.riverCase.contentId,
    },
    relatedContent: [content.riverCase],
    mentorNote: '한 번의 측정이 아니라 계절별로 이어간 탐구가 진로 기록과 연결됐어요.',
  }),
]

const recordById = new Map(records.map((item) => [item.contentId, item]))

export function findMentorRecordFixture(contentId: string): MentorRecord | null {
  return recordById.get(contentId) ?? null
}

// Fixture 검색 대상: 과목 / 활동, 기록 문장, Mentor 이름, 영역, 연결 활동 (Backend 검색 Field는 미확정)
function matches(item: MentorRecord, query: string): boolean {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return true
  return [item.subjectOrActivity, item.recordText, item.mentor.name, recordAreaLabel(item.area), item.linkedActivity.title, item.title].some(
    (field) => field.toLowerCase().includes(keyword),
  )
}

function listResult(source: MentorRecord[], query: MentorRecordListQuery): MentorRecordListResult {
  const filtered = source.filter(
    (item) =>
      matches(item, query.query) && (!query.grade || item.grade === query.grade) && (!query.area || item.area === query.area),
  )
  const start = query.page * query.size
  return {
    items: filtered.slice(start, start + query.size),
    page: { number: query.page, size: query.size, totalElements: filtered.length, totalPages: Math.ceil(filtered.length / query.size) },
  }
}

// ---------- Fixture Scenario (개발 중 ?fixture= 로 확인. ?query= / ?grade= / ?area=와 함께 써도 된다) ----------

export type RecordListFixtureScenario = 'success' | 'empty' | 'loading' | 'error'
const listScenarios: RecordListFixtureScenario[] = ['success', 'empty', 'loading', 'error']

export function readRecordListFixtureScenario(search: string): RecordListFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return listScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorRecordListLoader = (page: number, size: number) => Promise<MentorRecordListResult>

const listLoaders = new Map<string, MentorRecordListLoader>()

/**
 * 실제 GET /api/student/mentor-content?type=record&query= 대신 Fixture를 돌려준다.
 * 같은 scenario / 검색어 / 학년 / 영역에는 같은 함수를 돌려준다. (목록 Hook의 Cache Key)
 */
export function createMentorRecordListFixtureLoader(
  scenario: RecordListFixtureScenario,
  filters: Omit<MentorRecordListQuery, 'page' | 'size'>,
): MentorRecordListLoader {
  const key = [scenario, filters.query.trim(), filters.grade ?? '', filters.area ?? ''].join('|')
  let loader = listLoaders.get(key)
  if (!loader) {
    loader = (page, size) => {
      const query: MentorRecordListQuery = { ...filters, page, size }
      switch (scenario) {
        case 'loading':
          return new Promise<MentorRecordListResult>(() => {})
        case 'error':
          return Promise.reject(new Error('Mentor record list fixture error'))
        case 'empty':
          return Promise.resolve(listResult([], query))
        case 'success':
          return Promise.resolve(listResult(records, query))
      }
    }
    listLoaders.set(key, loader)
  }
  return loader
}

export type RecordDetailFixtureScenario = 'success' | 'loading' | 'error' | 'not-found'
const detailScenarios: RecordDetailFixtureScenario[] = ['success', 'loading', 'error', 'not-found']

export function readRecordDetailFixtureScenario(search: string): RecordDetailFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return detailScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorRecordLoader = (contentId: string) => Promise<MentorRecord | null>

const detailLoaders = new Map<RecordDetailFixtureScenario, MentorRecordLoader>()

/** 실제 GET /api/student/mentor-content/{contentId} 대신 Fixture를 돌려준다. */
export function createMentorRecordFixtureLoader(scenario: RecordDetailFixtureScenario): MentorRecordLoader {
  let loader = detailLoaders.get(scenario)
  if (!loader) {
    loader = (contentId) => {
      switch (scenario) {
        case 'loading':
          return new Promise<MentorRecord | null>(() => {})
        case 'error':
          return Promise.reject(new Error('Mentor record fixture error'))
        case 'not-found':
          return Promise.resolve(null)
        case 'success':
          return Promise.resolve(findMentorRecordFixture(contentId))
      }
    }
    detailLoaders.set(scenario, loader)
  }
  return loader
}
