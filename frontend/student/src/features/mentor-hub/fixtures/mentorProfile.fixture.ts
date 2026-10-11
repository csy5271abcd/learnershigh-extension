// UI 검증용 Mentor Profile Fixture다. 실제 Mentor의 성적 / 경험 / 개인정보가 아니다. (모든 인물 가상)
// 이름 · 사진 · 대학 · 학과 · 전형 · 고교 Context · 대표 경험 · Tag는 Home Fixture의 같은 객체를 쓴다.
// 이 파일은 Profile에서만 필요한 Detail(인증 여부, 성적 Summary, 대표 경험 상세, Content 요약)만 더한다.

import type {
  MentorContentSummary,
  MentorExperience,
  MentorProfile,
  MentorProfileContent,
  MentorScoreSummary,
  MentorSummary,
} from '../model/types.ts'
import { mentorHubHomeFixture } from './mentorHubHome.fixture.ts'
import {
  fixtureMentorContent as content,
  fixtureMentors as mentors,
  fixturePlanSummaries,
  fixtureRecordSummaries,
  fixtureRoutineSummaries,
  fixtureStorySummaries,
} from './mentors.fixture.ts'
import { fixtureCaseSummaries } from './activityCases.fixture.ts'

const adminRecommendedCaseIds = new Set(mentorHubHomeFixture.adminRecommendedCases.map((item) => item.caseId))

function profileContent(item: MentorContentSummary, summary: string): MentorProfileContent {
  if (item.kind === 'qna') throw new Error('Q&A는 Profile Content Tab 유형이 아니다.')
  return { ...item, kind: item.kind, summary, adminRecommended: adminRecommendedCaseIds.has(item.contentId) }
}

/** Plan은 Canonical 한 줄 요약을 그대로 쓴다. */
function planContent(item: MentorContentSummary): MentorProfileContent {
  return profileContent(item, fixturePlanSummaries[item.contentId])
}

/** Routine도 Canonical 한 줄 요약을 그대로 쓴다. */
function routineContent(item: MentorContentSummary): MentorProfileContent {
  return profileContent(item, fixtureRoutineSummaries[item.contentId])
}

/** Story도 Canonical 한 줄 요약을 그대로 쓴다. */
function storyContent(item: MentorContentSummary): MentorProfileContent {
  return profileContent(item, fixtureStorySummaries[item.contentId])
}

/** Record도 Canonical 한 줄 요약을 그대로 쓴다. */
function recordContent(item: MentorContentSummary): MentorProfileContent {
  return profileContent(item, fixtureRecordSummaries[item.contentId])
}

/** Case도 Canonical 한 줄 요약을 그대로 쓴다. */
function caseContent(item: MentorContentSummary): MentorProfileContent {
  return profileContent(item, fixtureCaseSummaries[item.contentId])
}

interface ProfileDetail {
  verified: boolean
  scoreSummary?: MentorScoreSummary
  experiences: MentorExperience[]
  contents: MentorProfileContent[]
}

const details: Record<string, ProfileDetail> = {
  [mentors.hanJisu.mentorId]: {
    verified: true,
    scoreSummary: {
      note: '학생부 교과 성적이 합격에 가장 크게 반영됐어요.',
      schoolGrades: {
        scaleLabel: '전 과목 · 9등급제',
        terms: [
          { term: '1-1학기', averageGrade: 1.8 },
          { term: '1-2학기', averageGrade: 1.6 },
          { term: '2-1학기', averageGrade: 1.4 },
          { term: '2-2학기', averageGrade: 1.3 },
          { term: '3-1학기', averageGrade: 1.1 },
        ],
      },
      csat: {
        basisLabel: '성적통지표 기준',
        subjects: [
          { area: '국어', subject: '언어와 매체', grade: 2, percentile: 93 },
          { area: '수학', subject: '확률과 통계', grade: 2, percentile: 90 },
          { area: '영어', subject: '절대평가', grade: 1, percentile: null },
          { area: '탐구', subject: '생명과학I', grade: 1, percentile: 97 },
          { area: '탐구', subject: '화학I', grade: 2, percentile: 91 },
        ],
        minimumRequirement: '수능 최저 3개 합 6 충족',
      },
    },
    experiences: [
      { title: '내신 1.3 유지', description: '고1 1.8 → 고3 1.3, 과목별 오답노트로 관리했어요.' },
      { title: '교내 생명과학 탐구대회 금상', description: '항생제 내성 시뮬레이션 실험' },
      { title: '교외 · 대학 연계 실험캠프', description: '생명과학 여름캠프 3일 수료' },
    ],
    contents: [
      planContent(content.literaturePlan),
      storyContent(content.biologyGradeStory),
      storyContent(content.mockExamStory),
      storyContent(content.careerRecordStory),
      storyContent(content.wrongNoteStory),
      recordContent(content.antibioticRecord),
      caseContent(content.antibioticCase),
    ],
  },
  [mentors.hanYerin.mentorId]: {
    verified: true,
    scoreSummary: {
      note: '교과 성적과 환경 탐구 활동을 함께 준비했어요.',
      schoolGrades: {
        scaleLabel: '전 과목 · 9등급제',
        terms: [
          { term: '1-1학기', averageGrade: 2.1 },
          { term: '1-2학기', averageGrade: 1.8 },
          { term: '2-1학기', averageGrade: 1.6 },
          { term: '2-2학기', averageGrade: 1.5 },
          { term: '3-1학기', averageGrade: 1.4 },
        ],
      },
    },
    experiences: [
      { title: '교내 환경 탐구대회 은상', description: '학교 주변 하천 수질과 생물 다양성 비교' },
      { title: '환경 동아리 부장', description: '1년 동안 월 1회 하천 관찰 기록을 운영했어요.' },
      { title: '통합과학 · 화학 우수', description: '실험 보고서 중심으로 개념을 정리했어요.' },
    ],
    contents: [
      recordContent(content.environmentRecord),
      caseContent(content.riverCase),
    ],
  },
  [mentors.parkNayun.mentorId]: {
    verified: true,
    scoreSummary: {
      note: '논술 실력과 수능 최저를 함께 맞춘 경우예요.',
      csat: {
        basisLabel: '성적통지표 기준',
        subjects: [
          { area: '국어', subject: '화법과 작문', grade: 2, percentile: 92 },
          { area: '수학', subject: '미적분', grade: 2, percentile: 91 },
          { area: '영어', subject: '절대평가', grade: 2, percentile: null },
          { area: '탐구', subject: '생명과학I', grade: 2, percentile: 89 },
          { area: '탐구', subject: '화학I', grade: 3, percentile: 80 },
        ],
        minimumRequirement: '수능 최저 2개 합 5 충족',
      },
    },
    experiences: [
      { title: '경희대 자연계 논술 합격', description: '수리논술 기출을 주 2회 시간 재고 풀었어요.' },
      { title: '수능 최저 충족', description: '국어 · 수학 중심으로 최저 등급을 관리했어요.' },
      { title: '기술 · 가정 수행평가', description: '가공음료 당류 함량 비교 실험' },
    ],
    contents: [
      routineContent(content.scienceRoutine),
      caseContent(content.beverageCase),
    ],
  },
  [mentors.jeongSejin.mentorId]: {
    verified: true,
    scoreSummary: {
      note: '수능 성적 중심으로 정시에 합격했어요.',
      csat: {
        basisLabel: '성적통지표 기준',
        subjects: [
          { area: '국어', subject: '언어와 매체', grade: 2, percentile: 94 },
          { area: '수학', subject: '확률과 통계', grade: 1, percentile: 97 },
          { area: '영어', subject: '절대평가', grade: 1, percentile: null },
          { area: '탐구', subject: '사회 · 문화', grade: 2, percentile: 92 },
        ],
      },
    },
    experiences: [
      { title: '수능 수학 백분위 97', description: '9월 모의고사 이후 실전 시간 배분을 다시 짰어요.' },
      { title: '정시 집중 준비', description: '고3 2학기부터 주간 모의고사 루틴으로 전환했어요.' },
    ],
    contents: [planContent(content.mathPlan), caseContent(content.sleepCase)],
  },
  [mentors.choiAreum.mentorId]: {
    verified: true,
    experiences: [
      { title: '교내 사회탐구 보고서 대회 수상', description: '지역 상권 변화 설문 연구' },
      { title: '경제 동아리 활동', description: '경제 기사 요약과 토론을 2년 동안 운영했어요.' },
    ],
    contents: [storyContent(content.broadTopicStory), caseContent(content.snsSurveyCase)],
  },
  [mentors.kangMinho.mentorId]: {
    verified: true,
    scoreSummary: {
      schoolGrades: {
        scaleLabel: '전 과목 · 9등급제',
        terms: [
          { term: '1-1학기', averageGrade: 3.0 },
          { term: '1-2학기', averageGrade: 2.4 },
          { term: '2-1학기', averageGrade: 1.9 },
          { term: '2-2학기', averageGrade: 1.6 },
          { term: '3-1학기', averageGrade: 1.5 },
        ],
      },
    },
    experiences: [
      { title: '수학 3등급 → 내신 1등급', description: '풀이 과정을 말로 설명하는 방식으로 공부법을 바꿨어요.' },
      { title: '교내 과학탐구대회 참가', description: '마찰력과 경사면 실험' },
    ],
    contents: [storyContent(content.mathStory), caseContent(content.brakingCase)],
  },
  [mentors.jeongMinhyuk.mentorId]: {
    verified: true,
    experiences: [
      { title: '교내 SW 경진대회 수상', description: '급식 잔반 기록 앱 프로토타입' },
      { title: '프로그래밍 동아리 운영', description: '후배 대상 파이썬 스터디를 1년 운영했어요.' },
    ],
    contents: [routineContent(content.codingRoutine), recordContent(content.lunchDataRecord), caseContent(content.lunchDataCase)],
  },
  [mentors.kimHaram.mentorId]: {
    verified: false,
    experiences: [
      { title: '교외 공공디자인 공모전 참여', description: '버스 정류장 안내 디자인 제안' },
      { title: '실기 포트폴리오 준비', description: '주 3회 발상 스케치를 기록했어요.' },
    ],
    contents: [caseContent(content.pictogramCase)],
  },
  [mentors.leeChaerin.mentorId]: {
    verified: true,
    experiences: [
      { title: '독서토론부 부장 2년', description: '월 2회 토론 주제를 선정하고 진행했어요.' },
      { title: '교내 독서 토론대회 참여', description: '고전 작품을 현대 쟁점과 연결해 발표했어요.' },
    ],
    contents: [planContent(content.performancePlan), recordContent(content.readingClubRecord), caseContent(content.deliveryAdCase)],
  },
  [mentors.goMinjeong.mentorId]: {
    verified: true,
    experiences: [{ title: '중간고사 4주 계획 운영', description: '요일별 과목 배치로 시험 범위를 관리했어요.' }],
    contents: [planContent(content.midtermPlan), recordContent(content.psychologyClubRecord), caseContent(content.aiInterviewCase)],
  },
  [mentors.choiEunchae.mentorId]: {
    verified: true,
    experiences: [{ title: '영어 단어 · 구문 루틴', description: '아침 · 저녁 30분씩 3년 동안 유지했어요.' }],
    contents: [routineContent(content.englishRoutine), recordContent(content.tradeCareerRecord), caseContent(content.tourGuideCase)],
  },
  // ---- Mentor List 추가 Mentor ----
  [mentors.yoonHaram.mentorId]: {
    verified: true,
    experiences: [
      { title: '논술 6회 응시 후 합격', description: '응시 후마다 답안을 다시 써보며 구조를 고쳤어요.' },
      { title: '교외 영상 제작 활동', description: '지역 청소년 미디어 캠프에서 단편 제작' },
    ],
    contents: [planContent(content.nonliteraturePlan), caseContent(content.thumbnailCase)],
  },
  [mentors.ohJunseok.mentorId]: {
    verified: true,
    experiences: [
      { title: '영어 내신 3년 1등급', description: '본문 변형 문제를 직접 만들어 복습했어요.' },
      { title: '교내 영어 말하기 대회 수상', description: '교육 격차를 주제로 발표' },
    ],
    contents: [planContent(content.englishPlan), caseContent(content.speechCase)],
  },
  [mentors.parkSeohyun.mentorId]: {
    verified: true,
    scoreSummary: {
      note: '수능 국어 · 수학 · 탐구를 고르게 끌어올렸어요.',
      csat: {
        basisLabel: '성적통지표 기준',
        subjects: [
          { area: '국어', subject: '화법과 작문', grade: 1, percentile: 97 },
          { area: '수학', subject: '확률과 통계', grade: 1, percentile: 96 },
          { area: '영어', subject: '절대평가', grade: 2, percentile: null },
          { area: '탐구', subject: '한국지리', grade: 1, percentile: 98 },
        ],
      },
    },
    experiences: [
      { title: '국어 비문학 시간 관리', description: '고3 여름부터 지문 구조를 먼저 잡는 연습을 했어요.' },
      { title: '한국사 1등급', description: '시대별 흐름표를 주 1회 다시 그렸어요.' },
    ],
    contents: [storyContent(content.summerStory), caseContent(content.independenceCase)],
  },
  [mentors.leeHyunseo.mentorId]: {
    verified: true,
    experiences: [
      { title: '재수 · 표준점수 +34', description: '주간 모의고사 회고로 취약 영역을 관리했어요.' },
      { title: '역사 탐구 독서', description: '한 달에 한 권 시대사 책을 정리했어요.' },
    ],
    contents: [storyContent(content.admissionSwitchStory), caseContent(content.industrialCase)],
  },
  [mentors.jeongDain.mentorId]: {
    verified: true,
    experiences: [
      { title: '교내 토론대회 준우승', description: '기후 정책을 주제로 찬반 토론' },
      { title: '시사 논술 첨삭', description: '주 1회 시사 주제로 답안을 쓰고 고쳤어요.' },
    ],
    contents: [caseContent(content.climateRefugeeCase)],
  },
  [mentors.kimDoyeon.mentorId]: {
    verified: true,
    experiences: [
      { title: '도시 열섬 지역 조사', description: '학교 주변 온도를 4주 동안 측정했어요.' },
      { title: '지리 탐구 동아리 운영', description: '지역 답사 계획과 보고서 작성을 맡았어요.' },
    ],
    contents: [planContent(content.wrongAnswerPlan), caseContent(content.transitCase)],
  },
  [mentors.joMinjae.mentorId]: {
    verified: true,
    experiences: [{ title: '수학 실전 모의고사 오답 정리', description: '회차별로 틀린 유형을 표로 관리했어요.' }],
    contents: [routineContent(content.csatRoutine), caseContent(content.convenienceCase)],
  },
  [mentors.seoJiho.mentorId]: {
    verified: true,
    experiences: [
      { title: '내신 1.2 유지', description: '시험 3주 전부터 과목별 범위표를 운영했어요.' },
      { title: '교내 창업 아이디어 대회 수상', description: '학교 매점 재고 관리 아이디어' },
    ],
    contents: [routineContent(content.examPeriodRoutine), caseContent(content.storeDataCase)],
  },
  [mentors.kimTaehyun.mentorId]: {
    verified: false,
    experiences: [{ title: '수리논술 주 2회 실전', description: '시간을 재고 풀고 풀이를 다시 써봤어요.' }],
    contents: [storyContent(content.undecidedCareerStory), caseContent(content.algorithmCase)],
  },
  [mentors.songJihoo.mentorId]: {
    verified: true,
    experiences: [{ title: '물리학Ⅰ 선택 유지', description: '역학 단원 오답을 유형별로 다시 풀었어요.' }],
    contents: [storyContent(content.physicsStory), caseContent(content.libraryDataCase)],
  },
  [mentors.joAra.mentorId]: {
    verified: true,
    experiences: [{ title: '교내 축제 안내 디자인', description: '학생 의견 조사로 안내판 순서를 다시 정했어요.' }],
    contents: [recordContent(content.eventDesignRecord), caseContent(content.festivalMapCase)],
  },
  [mentors.leeSubin.mentorId]: {
    verified: true,
    experiences: [
      { title: '수학 실전 모의 주 3회', description: '평일 저녁 같은 시간에 시간을 재고 풀었어요.' },
      { title: '교내 도시 탐구 동아리', description: '학교 주변 보행로 조사' },
    ],
    contents: [routineContent(content.mathMockRoutine), caseContent(content.safetyMapCase)],
  },
  [mentors.seoYewon.mentorId]: {
    verified: true,
    experiences: [
      { title: '영화 음악 분석 발표', description: '영화 장면 3개의 음악 요소를 비교해 발표했어요.' },
      { title: '교내외 공연 · 음악 교육 봉사', description: '공연과 음악 교육 봉사를 꾸준히 이어갔어요.' },
    ],
    contents: [caseContent(content.filmMusicCase)],
  },
}

const mentorById = new Map<string, MentorSummary>(Object.values(mentors).map((mentor) => [mentor.mentorId, mentor]))

/** mentorId에 해당하는 Profile. 없으면 null (Not Found) */
export function findMentorProfileFixture(mentorId: string): MentorProfile | null {
  const mentor = mentorById.get(mentorId)
  const detail = details[mentorId]
  if (!mentor || !detail) return null
  return { mentor, ...detail }
}

export type MentorProfileFixtureScenario = 'success' | 'loading' | 'error' | 'not-found'

const scenarios: MentorProfileFixtureScenario[] = ['success', 'loading', 'error', 'not-found']

/** 개발 중 `?fixture=loading|error|not-found`로 화면 상태를 확인한다. */
export function readProfileFixtureScenario(search: string): MentorProfileFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorProfileLoader = (mentorId: string) => Promise<MentorProfile | null>

function buildLoader(scenario: MentorProfileFixtureScenario): MentorProfileLoader {
  switch (scenario) {
    case 'loading':
      return () => new Promise<MentorProfile | null>(() => {})
    case 'error':
      return () => Promise.reject(new Error('Mentor Profile fixture error'))
    case 'not-found':
      return () => Promise.resolve(null)
    case 'success':
      return (mentorId) => Promise.resolve(findMentorProfileFixture(mentorId))
  }
}

const loaders = new Map<MentorProfileFixtureScenario, MentorProfileLoader>()

/** 실제 API(GET /api/student/mentors/{mentorId}) 대신 Fixture를 돌려주는 Data Source. */
export function createMentorProfileFixtureLoader(scenario: MentorProfileFixtureScenario): MentorProfileLoader {
  let loader = loaders.get(scenario)
  if (!loader) {
    loader = buildLoader(scenario)
    loaders.set(scenario, loader)
  }
  return loader
}
