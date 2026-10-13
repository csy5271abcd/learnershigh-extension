// UI / Interaction 검증용 Mentor Routine Fixture다. 실제 Mentor의 루틴이 아니다. (모든 인물 가상)
// 작성 Mentor는 mentors.fixture.ts의 Canonical 객체를 그대로 참조한다.
// "수능 D-100 하루 공부 루틴"은 Routine-01 / 02 Mockup 값을 그대로 쓰고, 나머지는 최소 구성이다.

import type {
  MentorContentListResult,
  MentorContentSummary,
  MentorPlanDay,
  MentorRoutineDetail,
  MentorSummary,
  MixedContentItem,
} from '../model/types.ts'
import { fixtureMentorContent as content, fixtureMentors as mentors, fixtureRoutineSummaries } from './mentors.fixture.ts'

const weekdays: MentorPlanDay[] = ['월', '화', '수', '목', '금']
const everyday: MentorPlanDay[] = ['월', '화', '수', '목', '금', '토', '일']

type BlockRow = [start: string, end: string, title: string, description: string]
type HabitRow = [title: string, frequency: string, start: string, end: string, description: string]

interface RoutineSource {
  content: MentorContentSummary
  mentor: MentorSummary
  description: string
  timelineTitle: string
  applyDays: MentorPlanDay[]
  blocks: BlockRow[]
  habits: HabitRow[]
}

/** Block / Habit id는 `${contentId}-block-{순번}` / `${contentId}-habit-{순번}`으로 고정한다. (selectedHabitIds 기준) */
function routine({ content: item, mentor, description, timelineTitle, applyDays, blocks, habits }: RoutineSource): MentorRoutineDetail {
  return {
    contentId: item.contentId,
    kind: 'routine',
    title: item.title,
    mentor,
    description,
    timelineTitle,
    applyDays,
    timeline: blocks.map(([start, end, title, blockDescription], index) => ({
      blockId: `${item.contentId}-block-${index + 1}`,
      slot: { start, end },
      title,
      description: blockDescription,
    })),
    habits: habits.map(([title, frequency, start, end, habitDescription], index) => ({
      habitId: `${item.contentId}-habit-${index + 1}`,
      title,
      frequency,
      slot: { start, end },
      description: habitDescription,
    })),
  }
}

// 목록 순서: Routine-00 Mockup
const routines: MentorRoutineDetail[] = [
  routine({
    content: content.csatRoutine,
    mentor: mentors.joMinjae,
    description: fixtureRoutineSummaries[content.csatRoutine.contentId],
    timelineTitle: '하루 Timeline',
    applyDays: weekdays,
    blocks: [
      ['06:30', '07:00', '기상 · 영어 단어', '단어 30개를 소리 내서 외워요.'],
      ['13:00', '15:00', '생명과학Ⅰ 개념 · 기출', '고난도 3문항을 먼저 풀어요.'],
      ['15:30', '18:00', '화학Ⅰ 문제 풀이', '실전처럼 시간을 재요.'],
      ['19:00', '21:30', '수학 오답 · 실전 연습', '오답은 같은 날 다시 풀어요.'],
      ['22:00', '23:00', '하루 오답 정리', '내일 볼 문제를 표시해요.'],
    ],
    habits: [
      ['아침 단어 30개', '매일', '06:30', '07:00', '하루 시작을 짧은 암기로 열어요.'],
      ['생명과학 고난도 3문항', '매일', '13:00', '13:40', '점심 직후 집중력이 좋을 때 풀어요.'],
      ['자기 전 오답 정리', '매일', '22:00', '23:00', '내일 볼 문제를 표시해요.'],
    ],
  }),
  routine({
    content: content.mathMockRoutine,
    mentor: mentors.leeSubin,
    description: fixtureRoutineSummaries[content.mathMockRoutine.contentId],
    timelineTitle: '평일 저녁 Timeline',
    applyDays: weekdays,
    blocks: [
      ['19:30', '21:10', '수학 실전 모의 1회', '시험과 같은 시간으로 재고 풀어요.'],
      ['21:20', '22:00', '오답 정리', '틀린 이유를 한 줄로 적어요.'],
    ],
    habits: [
      ['실전 모의 시간 재기', '평일', '19:30', '21:10', '문항별로 걸린 시간을 적어요.'],
      ['오답 이유 한 줄', '평일', '21:20', '21:40', '같은 실수를 줄이는 데 써요.'],
    ],
  }),
  routine({
    content: content.englishRoutine,
    mentor: mentors.choiEunchae,
    description: fixtureRoutineSummaries[content.englishRoutine.contentId],
    timelineTitle: '하루 Timeline',
    applyDays: everyday,
    blocks: [
      ['07:00', '07:30', '아침 단어', '등교 전에 단어 30개를 소리 내서 외워요.'],
      ['22:30', '23:00', '저녁 구문 복습', '아침 단어로 문장을 만들어 봐요.'],
    ],
    habits: [
      ['아침 단어 30개', '매일', '07:00', '07:30', '하루 시작을 짧은 암기로 열어요.'],
      ['저녁 구문 5개', '매일', '22:30', '23:00', '아침에 본 단어를 문장으로 다시 써요.'],
    ],
  }),
  routine({
    content: content.examPeriodRoutine,
    mentor: mentors.seoJiho,
    description: fixtureRoutineSummaries[content.examPeriodRoutine.contentId],
    timelineTitle: '하루 Timeline',
    applyDays: weekdays,
    blocks: [
      ['16:30', '18:00', '시험 과목 개념 정리', '그날 배운 범위를 먼저 정리해요.'],
      ['18:30', '20:00', '기출 풀이', '학교 기출을 시간 재고 풀어요.'],
      ['20:30', '21:30', '오답 · 암기 점검', '틀린 문제와 암기 과목을 다시 봐요.'],
    ],
    habits: [
      ['하교 후 개념 정리', '평일', '16:30', '18:00', '수업 내용이 기억날 때 정리해요.'],
      ['자기 전 암기 점검', '평일', '21:00', '21:30', '빈칸으로 만들어 확인해요.'],
    ],
  }),
  routine({
    content: content.codingRoutine,
    mentor: mentors.jeongMinhyuk,
    description: fixtureRoutineSummaries[content.codingRoutine.contentId],
    timelineTitle: '평일 저녁 Timeline',
    applyDays: weekdays,
    blocks: [
      ['19:00', '20:00', '수행평가 자료 정리', '마감이 가까운 과목부터 해요.'],
      ['20:30', '22:00', '코딩 프로젝트', '기능 하나씩 끝내요.'],
    ],
    habits: [['작업 메모 남기기', '평일', '21:50', '22:00', '다음 날 이어서 할 일을 적어요.']],
  }),
  routine({
    content: content.scienceRoutine,
    mentor: mentors.parkNayun,
    description: fixtureRoutineSummaries[content.scienceRoutine.contentId],
    timelineTitle: '하루 Timeline',
    applyDays: everyday,
    blocks: [
      ['21:00', '21:30', '물리 공식 유도', '공식을 외우지 않고 직접 유도해요.'],
      ['21:30', '22:00', '화학 계산 문제', '단위를 끝까지 써요.'],
    ],
    habits: [['공식 한 줄 유도', '매일', '21:00', '21:30', '하루 한 공식만 처음부터 유도해요.']],
  }),
]

const routineById = new Map(routines.map((item) => [item.contentId, item]))

export function findMentorRoutineFixture(contentId: string): MentorRoutineDetail | null {
  return routineById.get(contentId) ?? null
}

function toListItem(item: MentorRoutineDetail): MixedContentItem {
  return { contentId: item.contentId, kind: 'routine', title: item.title, summary: item.description, mentor: item.mentor }
}

function listResult(source: MentorRoutineDetail[], page: number, size: number): MentorContentListResult {
  const start = page * size
  return {
    items: source.slice(start, start + size).map(toListItem),
    page: { number: page, size, totalElements: source.length, totalPages: Math.ceil(source.length / size) },
  }
}

// ---------- Fixture Scenario (개발 중 ?fixture= 로 화면 상태 확인) ----------

export type MentorRoutineFixtureScenario = 'success' | 'loading' | 'error' | 'not-found' | 'empty'

const routineScenarios: MentorRoutineFixtureScenario[] = ['success', 'loading', 'error', 'not-found', 'empty']

/** Detail: `?fixture=loading|error|not-found|empty` (empty = Routine은 있지만 Habit이 없음) */
export function readRoutineFixtureScenario(search: string): MentorRoutineFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return routineScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorRoutineLoader = (contentId: string) => Promise<MentorRoutineDetail | null>

function buildRoutineLoader(scenario: MentorRoutineFixtureScenario): MentorRoutineLoader {
  switch (scenario) {
    case 'loading':
      return () => new Promise<MentorRoutineDetail | null>(() => {})
    case 'error':
      return () => Promise.reject(new Error('Mentor Routine fixture error'))
    case 'not-found':
      return () => Promise.resolve(null)
    case 'empty':
      return (contentId) => {
        const found = findMentorRoutineFixture(contentId)
        return Promise.resolve(found && { ...found, habits: [] })
      }
    case 'success':
      return (contentId) => Promise.resolve(findMentorRoutineFixture(contentId))
  }
}

const routineLoaders = new Map<MentorRoutineFixtureScenario, MentorRoutineLoader>()

/** 실제 API(GET /api/student/mentor-content/{contentId}) 대신 Fixture를 돌려준다. 같은 scenario에는 같은 함수. */
export function createMentorRoutineFixtureLoader(scenario: MentorRoutineFixtureScenario): MentorRoutineLoader {
  let loader = routineLoaders.get(scenario)
  if (!loader) {
    loader = buildRoutineLoader(scenario)
    routineLoaders.set(scenario, loader)
  }
  return loader
}

export type MentorRoutineListFixtureScenario = 'success' | 'empty' | 'loading' | 'error'

const listScenarios: MentorRoutineListFixtureScenario[] = ['success', 'empty', 'loading', 'error']

/** Routine 목록: `?fixture=empty|loading|error` */
export function readRoutineListFixtureScenario(search: string): MentorRoutineListFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return listScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorRoutineListLoader = (page: number, size: number) => Promise<MentorContentListResult>

function buildRoutineListLoader(scenario: MentorRoutineListFixtureScenario): MentorRoutineListLoader {
  switch (scenario) {
    case 'loading':
      return () => new Promise<MentorContentListResult>(() => {})
    case 'error':
      return () => Promise.reject(new Error('Mentor Routine list fixture error'))
    case 'empty':
      return (page, size) => Promise.resolve(listResult([], page, size))
    case 'success':
      return (page, size) => Promise.resolve(listResult(routines, page, size))
  }
}

const routineListLoaders = new Map<MentorRoutineListFixtureScenario, MentorRoutineListLoader>()

/** 실제 API(GET /api/student/mentor-content?type=routine) 대신 Fixture를 돌려준다. 같은 scenario에는 같은 함수. */
export function createMentorRoutineListFixtureLoader(scenario: MentorRoutineListFixtureScenario): MentorRoutineListLoader {
  let loader = routineListLoaders.get(scenario)
  if (!loader) {
    loader = buildRoutineListLoader(scenario)
    routineListLoaders.set(scenario, loader)
  }
  return loader
}
