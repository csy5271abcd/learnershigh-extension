// UI / Interaction 검증용 Mentor Plan Fixture다. 실제 학습 계획 추천 결과가 아니다. (모든 인물 가상)
// 작성 Mentor는 mentors.fixture.ts의 Canonical 객체를 그대로 참조한다. (이름 / 사진 / 대학을 복사하지 않는다)
// 대표 Plan: 고민정 · 고2 중간고사 4주 Plan (4주차는 Feature 요청 / Plan-01 Mockup 데이터 그대로)

import type {
  MentorContentSummary,
  MentorPlanDay,
  MentorPlanDetail,
  MentorContentListResult,
  MentorPlanWeek,
  MentorSummary,
  MixedContentItem,
} from '../model/types.ts'
import { fixtureMentorContent as content, fixtureMentors as mentors, fixturePlanSummaries } from './mentors.fixture.ts'

type Row = [day: MentorPlanDay, task: string, subject: string, memo?: string]

/** 주차별 Row → Week. Item id는 `${contentId}-w{주차}-{순번}`으로 고정한다. (Apply의 selectedItemIds 기준) */
function weeks(contentId: string, rowsByWeek: Row[][]): MentorPlanWeek[] {
  return rowsByWeek.map((rows, weekIndex) => ({
    week: weekIndex + 1,
    items: rows.map(([day, task, subject, memo], index) => ({
      itemId: `${contentId}-w${weekIndex + 1}-${index + 1}`,
      day,
      task,
      subject,
      memo,
    })),
  }))
}

interface PlanSource {
  content: MentorContentSummary
  mentor: MentorSummary
  description: string
  daysPerWeek: number
  rows: Row[][]
}

function plan({ content: item, mentor, description, daysPerWeek, rows }: PlanSource): MentorPlanDetail {
  return {
    contentId: item.contentId,
    kind: 'plan',
    title: item.title,
    mentor,
    description,
    durationWeeks: rows.length,
    daysPerWeek,
    weeks: weeks(item.contentId, rows),
  }
}

// 목록 순서: Plan-00 Mockup
const plans: MentorPlanDetail[] = [
  plan({
    content: content.nonliteraturePlan,
    mentor: mentors.yoonHaram,
    description: '지문 구조 분석과 풀이 시간 단축을 8주로 나눴어요. 앞 4주는 구조, 뒤 4주는 시간을 줄이는 데 써요.',
    daysPerWeek: 3,
    rows: [
      [['월', '인문 지문 문단 요약', '국어', '문단마다 한 줄'], ['목', '과학 지문 문단 요약', '국어']],
      [['월', '사회 지문 구조도 그리기', '국어'], ['목', '기술 지문 구조도 그리기', '국어']],
      [['월', '복합 지문 구조 분석', '국어', '연결어에 표시'], ['목', '주간 지문 다시 읽기', '국어']],
      [['월', '구조 분석 점검 세트', '국어'], ['목', '틀린 지문 구조 다시 그리기', '국어']],
      [['월', '지문 1개 8분 안에 풀기', '국어', '시간 기록하기'], ['목', '지문 1개 8분 안에 풀기', '국어']],
      [['월', '지문 2개 15분 세트', '국어'], ['목', '오래 걸린 지문 원인 적기', '국어']],
      [['월', '비문학 실전 세트 1회', '국어', '시험 시간대에 풀기'], ['목', '실전 세트 오답 정리', '국어']],
      [['월', '비문학 실전 세트 2회', '국어'], ['목', '8주 오답 다시 보기', '국어', '별표 친 지문만']],
    ],
  }),
  plan({
    content: content.midtermPlan,
    mentor: mentors.goMinjeong,
    description:
      '시험 4주 전부터 과목별 분량을 주차로 나눴어요. 2주차는 화학 수행평가가 있어서 학원 없는 날 다음에 배치했어요.',
    daysPerWeek: 5,
    rows: [
      [
        ['월', '수학Ⅱ 미분 개념 정리', '수학Ⅱ', '교과서 예제부터'],
        ['화', '화학Ⅰ 1단원 개념 정리', '화학Ⅰ', '수업 필기와 함께 보기'],
        ['수', '영어 본문 1~2과 읽기', '영어', '모르는 단어 표시'],
        ['목', '수학Ⅱ 유형 문제 풀이', '수학Ⅱ', '틀린 문제에 별표'],
        ['금', '1주차 범위 점검', '전 과목', '밀린 분량만 보충'],
      ],
      [
        ['월', '화학Ⅰ 수행평가 자료 정리', '화학Ⅰ', '학원 없는 날이라 길게 잡기'],
        ['화', '화학Ⅰ 수행평가 보고서 마무리', '화학Ⅰ', '제출 전 채점 기준 확인'],
        ['수', '영어 본문 3~4과 읽기', '영어'],
        ['목', '수학Ⅱ 적분 개념 정리', '수학Ⅱ'],
        ['금', '2주차 범위 점검', '전 과목', '밀린 분량만 보충'],
      ],
      [
        ['월', '수학Ⅱ 기출 1회', '수학Ⅱ', '시간 재고 풀기'],
        ['화', '화학Ⅰ 2단원 문제 풀이', '화학Ⅰ'],
        ['수', '영어 본문 문법 포인트 정리', '영어'],
        ['목', '화학Ⅰ 서술형 기출 모으기', '화학Ⅰ'],
        ['금', '오답 노트 정리', '전 과목', '별표 표시까지만'],
      ],
      [
        ['월', '수학Ⅱ 실전 모의 1회', '수학Ⅱ', '시험과 같은 시간대에 풀기'],
        ['화', '화학Ⅰ 서술형 대비', '화학Ⅰ', '답안을 직접 써보기'],
        ['수', '영어 본문 암기 점검', '영어', '빈칸으로 만들어 확인하기'],
        ['목', '전 과목 오답 다시 보기', '수학Ⅱ 중심', '별표 친 문제만'],
        ['금', '시험 전날 개념 요약 1장', '화학Ⅰ', 'A4 한 장을 넘기지 않기'],
      ],
    ],
  }),
  plan({
    content: content.literaturePlan,
    mentor: mentors.hanJisu,
    description: '작품을 갈래별로 묶어 주차마다 표현법과 주제를 정리해요.',
    daysPerWeek: 2,
    rows: [
      [['화', '현대시 작품 표현법 정리', '국어', '시어마다 표시'], ['금', '현대시 주제 한 줄 정리', '국어']],
      [['화', '고전시가 작품 표현법 정리', '국어'], ['금', '고전시가 주제 한 줄 정리', '국어']],
      [['화', '현대소설 인물 관계 정리', '국어'], ['금', '고전소설 인물 관계 정리', '국어']],
      [['화', '갈래별 작품 비교표 만들기', '국어', '표 한 장으로'], ['금', '문학 기출 서술형 쓰기', '국어']],
    ],
  }),
  plan({
    content: content.performancePlan,
    mentor: mentors.leeChaerin,
    description: '수행평가 제출 3주 전부터 주제 선정, 자료 조사, 초안을 한 주씩 나눴어요.',
    daysPerWeek: 2,
    rows: [
      [['월', '주제 후보 3개 적기', '국어', '수업 내용과 연결'], ['목', '주제 1개 고르기', '국어']],
      [['월', '자료 3개 찾기', '국어', '출처 함께 적기'], ['목', '자료 요약하기', '국어']],
      [['월', '초안 쓰기', '국어'], ['목', '평가 기준으로 초안 점검', '국어', '제출 이틀 전까지']],
    ],
  }),
  plan({
    content: content.englishPlan,
    mentor: mentors.ohJunseok,
    description: '모의고사에서 자주 틀리는 빈칸과 순서 유형만 4주 동안 집중해요.',
    daysPerWeek: 2,
    rows: [
      [['화', '빈칸 유형 10문항', '영어', '근거 문장에 밑줄'], ['금', '빈칸 오답 다시 풀기', '영어']],
      [['화', '순서 유형 10문항', '영어', '연결어 표시'], ['금', '순서 오답 다시 풀기', '영어']],
      [['화', '빈칸·순서 섞어 15문항', '영어'], ['금', '시간 재고 다시 풀기', '영어']],
      [['화', '모의고사 빈칸·순서만 풀기', '영어', '시험 시간대에'], ['금', '4주 오답 다시 보기', '영어']],
    ],
  }),
  plan({
    content: content.mathPlan,
    mentor: mentors.jeongSejin,
    description: '시험일에서 거꾸로 계산해 단원별 문제 풀이 분량을 정했어요.',
    daysPerWeek: 2,
    rows: [
      [['월', '함수의 극한 개념 정리', '수학Ⅱ'], ['목', '함수의 극한 문제 풀이', '수학Ⅱ']],
      [['월', '미분 개념 정리', '수학Ⅱ'], ['목', '미분 문제 풀이', '수학Ⅱ', '틀린 문제에 별표']],
      [['월', '적분 개념 정리', '수학Ⅱ'], ['목', '적분 문제 풀이', '수학Ⅱ']],
      [['월', '기출 1회', '수학Ⅱ', '시간 재고 풀기'], ['목', '기출 오답 정리', '수학Ⅱ']],
      [['월', '실전 모의 1회', '수학Ⅱ', '시험과 같은 시간대에'], ['목', '별표 문제만 다시 풀기', '수학Ⅱ']],
    ],
  }),
  plan({
    content: content.wrongAnswerPlan,
    mentor: mentors.kimDoyeon,
    description: '모의고사 다음 날부터 7일 동안 과목별로 오답을 정리해요.',
    daysPerWeek: 7,
    rows: [
      [
        ['월', '국어 오답 원인 적기', '국어', '틀린 이유 한 줄'],
        ['화', '수학 오답 다시 풀기', '수학'],
        ['수', '영어 오답 근거 찾기', '영어'],
        ['목', '탐구 오답 개념 확인', '탐구'],
        ['금', '국어·수학 재풀이', '국어 · 수학'],
        ['토', '영어·탐구 재풀이', '영어 · 탐구'],
        ['일', '다시 틀린 문제만 모으기', '전 과목', '다음 모의고사 전에 보기'],
      ],
    ],
  }),
]

const planById = new Map(plans.map((item) => [item.contentId, item]))

export function findMentorPlanFixture(contentId: string): MentorPlanDetail | null {
  return planById.get(contentId) ?? null
}

/** Plan 목록 Card = Content Summary + 한 줄 요약 + 작성 Mentor */
function toListItem(item: MentorPlanDetail): MixedContentItem {
  return {
    contentId: item.contentId,
    kind: 'plan',
    title: item.title,
    summary: fixturePlanSummaries[item.contentId],
    mentor: item.mentor,
  }
}

function listResult(source: MentorPlanDetail[], page: number, size: number): MentorContentListResult {
  const start = page * size
  return {
    items: source.slice(start, start + size).map(toListItem),
    page: { number: page, size, totalElements: source.length, totalPages: Math.ceil(source.length / size) },
  }
}

// ---------- Fixture Scenario (개발 중 ?fixture= 로 화면 상태 확인) ----------

export type MentorPlanFixtureScenario = 'success' | 'loading' | 'error' | 'not-found' | 'empty'

const planScenarios: MentorPlanFixtureScenario[] = ['success', 'loading', 'error', 'not-found', 'empty']

/** Detail: `?fixture=loading|error|not-found|empty` (empty = Plan은 있지만 주차 Item이 없음) */
export function readPlanFixtureScenario(search: string): MentorPlanFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return planScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorPlanLoader = (contentId: string) => Promise<MentorPlanDetail | null>

function buildPlanLoader(scenario: MentorPlanFixtureScenario): MentorPlanLoader {
  switch (scenario) {
    case 'loading':
      return () => new Promise<MentorPlanDetail | null>(() => {})
    case 'error':
      return () => Promise.reject(new Error('Mentor Plan fixture error'))
    case 'not-found':
      return () => Promise.resolve(null)
    case 'empty':
      return (contentId) => {
        const found = findMentorPlanFixture(contentId)
        return Promise.resolve(found && { ...found, weeks: found.weeks.map((week) => ({ ...week, items: [] })) })
      }
    case 'success':
      return (contentId) => Promise.resolve(findMentorPlanFixture(contentId))
  }
}

const planLoaders = new Map<MentorPlanFixtureScenario, MentorPlanLoader>()

/** 실제 API(GET /api/student/mentor-content/{contentId}) 대신 Fixture를 돌려준다. 같은 scenario에는 같은 함수. */
export function createMentorPlanFixtureLoader(scenario: MentorPlanFixtureScenario): MentorPlanLoader {
  let loader = planLoaders.get(scenario)
  if (!loader) {
    loader = buildPlanLoader(scenario)
    planLoaders.set(scenario, loader)
  }
  return loader
}

export type MentorPlanListFixtureScenario = 'success' | 'empty' | 'loading' | 'error'

const listScenarios: MentorPlanListFixtureScenario[] = ['success', 'empty', 'loading', 'error']

/** Plan 목록: `?fixture=empty|loading|error` */
export function readPlanListFixtureScenario(search: string): MentorPlanListFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return listScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorPlanListLoader = (page: number, size: number) => Promise<MentorContentListResult>

function buildPlanListLoader(scenario: MentorPlanListFixtureScenario): MentorPlanListLoader {
  switch (scenario) {
    case 'loading':
      return () => new Promise<MentorContentListResult>(() => {})
    case 'error':
      return () => Promise.reject(new Error('Mentor Plan list fixture error'))
    case 'empty':
      return (page, size) => Promise.resolve(listResult([], page, size))
    case 'success':
      return (page, size) => Promise.resolve(listResult(plans, page, size))
  }
}

const planListLoaders = new Map<MentorPlanListFixtureScenario, MentorPlanListLoader>()

/** 실제 API(GET /api/student/mentor-content?type=plan) 대신 Fixture를 돌려준다. 같은 scenario에는 같은 함수. */
export function createMentorPlanListFixtureLoader(scenario: MentorPlanListFixtureScenario): MentorPlanListLoader {
  let loader = planListLoaders.get(scenario)
  if (!loader) {
    loader = buildPlanListLoader(scenario)
    planListLoaders.set(scenario, loader)
  }
  return loader
}
