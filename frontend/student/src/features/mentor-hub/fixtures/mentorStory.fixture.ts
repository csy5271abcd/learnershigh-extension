// UI / Interaction 검증용 Mentor Story Fixture다. 실제 Mentor의 경험이 아니다. (모든 인물 / 내용 가상)
// 작성 Mentor는 mentors.fixture.ts의 Canonical 객체를 그대로 참조하고, 제목 / 요약도 Canonical 값을 쓴다.
// "모의고사 성적이 흔들렸을 때 관리 방법"은 Story-01 / 02 Mockup 본문을 그대로 쓰고, 나머지는 짧은 가상 Story다.
// 저장 수(saveCount)는 Mockup 표시용 Fixture 값이다. (Contract Gap)

import type {
  MentorContentSummary,
  MentorStory,
  MentorStoryListItem,
  MentorStoryListResult,
  MentorSummary,
  StoryBlock,
  StoryTopic,
} from '../model/types.ts'
import { fixtureMentorContent as content, fixtureMentors as mentors, fixtureStorySummaries } from './mentors.fixture.ts'

interface StorySource {
  content: MentorContentSummary
  mentor: MentorSummary
  topics: StoryTopic[]
  readMinutes: number
  publishedDate: string
  saveCount: number
  body: StoryBlock[]
}

const p = (text: string): StoryBlock => ({ type: 'paragraph', text })
const h = (text: string): StoryBlock => ({ type: 'heading', text })
const memo = (caption: string): StoryBlock => ({ type: 'photoMemo', caption })
const quote = (text: string): StoryBlock => ({ type: 'quote', text })

function story({ content: item, mentor, ...rest }: StorySource): MentorStory {
  return {
    contentId: item.contentId,
    kind: 'story',
    title: item.title,
    summary: fixtureStorySummaries[item.contentId],
    mentor,
    saved: false,
    ...rest,
  }
}

// Feed 순서: Story-00 Mockup 8개 + 기존 Mentor Profile Story 2개
const stories: MentorStory[] = [
  story({
    content: content.biologyGradeStory,
    mentor: mentors.hanJisu,
    topics: ['grade-change', 'study-method'],
    readMinutes: 4,
    publishedDate: '2026-09-21',
    saveCount: 2400,
    body: [
      p('고1 1학기 생명과학 내신이 4등급이었어요. 개념은 안다고 생각했는데 시험에서는 시간이 늘 모자랐어요.'),
      h('오답을 날짜가 아니라 이유로 모았어요'),
      p('틀린 문제를 "개념", "자료 해석", "시간" 세 칸으로 나눠 적었더니 대부분이 자료 해석에서 나온다는 걸 알게 됐어요.'),
      p('그 뒤로는 시험 2주 전부터 자료 해석 문항만 하루 5개씩 시간을 재고 풀었고, 고2 2학기에 1등급이 나왔어요.'),
    ],
  }),
  story({
    content: content.mockExamStory,
    mentor: mentors.hanJisu,
    topics: ['recovery', 'mental'],
    readMinutes: 5,
    publishedDate: '2026-09-28',
    saveCount: 1400,
    body: [
      p(
        '고2 6월 모의고사 성적표를 받은 날, 생명과학이 두 등급이나 떨어져 있었어요. 내신 준비에만 집중하느라 모의고사 유형을 거의 안 풀었던 게 그대로 드러났어요.',
      ),
      memo('성적표 받은 날 책상 앞에 붙여둔 메모'),
      p(
        '솔직히 그날은 아무것도 안 했어요. 다음 날 아침에 일어나서 제일 먼저 한 건 틀린 문제를 다시 펴보는 것도 아니고, 그냥 무엇 때문에 시간이 모자랐는지 적어보는 거였어요.',
      ),
      h('시험 다음 날엔 새 공부를 안 했어요'),
      p(
        '그 뒤로 모의고사 다음 날은 무조건 틀린 문항만 봤어요. 단원별이 아니라 "자료를 잘못 읽음", "시간 부족", "개념 헷갈림" 이렇게 이유별로 나눴더니 제가 약한 게 개념이 아니라 자료 해석이라는 걸 알게 됐어요.',
      ),
      memo('석 달 동안 쓴 오답 노트 일부'),
      quote('점수가 흔들린 날보다 그다음 날 무엇을 하는지가 더 중요했어요.'),
      p(
        '평일에는 자료 해석 3문항만 고정으로 풀었고, 9월 모의고사에서 원래 등급으로 돌아왔어요. 그래서 교과 전형을 바꾸지 않고 끝까지 갈 수 있었어요.',
      ),
    ],
  }),
  story({
    content: content.admissionSwitchStory,
    mentor: mentors.leeHyunseo,
    topics: ['admission-switch', 'career'],
    readMinutes: 4,
    publishedDate: '2026-09-14',
    saveCount: 1100,
    body: [
      p('고2 겨울방학에 내신과 모의고사 성적을 나란히 놓고 보니, 모의고사 쪽이 꾸준히 더 좋았어요.'),
      h('바꾸기 전에 기준을 먼저 정했어요'),
      p('"3월 모의고사에서 국어·탐구가 2등급 안에 들면 정시로 간다"는 기준을 정하고, 그 전까지는 내신도 놓지 않았어요.'),
      quote('전형을 바꾼 게 아니라, 제 성적이 더 잘 나오는 쪽을 고른 거였어요.'),
    ],
  }),
  story({
    content: content.broadTopicStory,
    mentor: mentors.choiAreum,
    topics: ['failure', 'recovery'],
    readMinutes: 3,
    publishedDate: '2026-09-07',
    saveCount: 860,
    body: [
      p('첫 탐구 주제는 "한국 경제의 불평등"이었어요. 자료를 모을수록 무엇을 확인해야 하는지 더 흐려졌어요.'),
      h('질문 하나로 줄였어요'),
      p('선생님 피드백을 받고 "우리 동네 편의점 가격이 대형마트와 얼마나 다른가"로 다시 시작했고, 직접 조사한 자료로 마무리할 수 있었어요.'),
    ],
  }),
  story({
    content: content.summerStory,
    mentor: mentors.parkSeohyun,
    topics: ['study-method', 'recovery'],
    readMinutes: 4,
    publishedDate: '2026-08-31',
    saveCount: 820,
    body: [
      p('고3 여름, 국어 비문학 지문 하나에 12분씩 걸렸어요. 끝까지 읽고 나서야 문제를 풀기 시작했기 때문이에요.'),
      h('문단마다 한 줄씩 적었어요'),
      p('지문을 읽으면서 문단마다 한 줄 요약을 적고, 그 구조를 보고 문제로 넘어갔어요. 한 달 뒤에는 지문 하나에 8분 안쪽으로 줄었어요.'),
    ],
  }),
  story({
    content: content.mathStory,
    mentor: mentors.kangMinho,
    topics: ['success', 'grade-change', 'study-method'],
    readMinutes: 4,
    publishedDate: '2026-08-24',
    saveCount: 720,
    body: [
      p('수학 개념 노트를 예쁘게 정리하는 데만 시간을 쓰고, 정작 시험에서는 3등급이었어요.'),
      h('풀이를 말로 설명해 봤어요'),
      p('문제를 풀고 나서 친구에게 설명하듯 풀이 과정을 소리 내어 말했어요. 막히는 지점이 곧 제가 모르는 부분이었어요.'),
      quote('노트를 쓰는 시간보다 설명하다 막히는 순간이 더 많이 가르쳐 줬어요.'),
    ],
  }),
  story({
    content: content.undecidedCareerStory,
    mentor: mentors.kimTaehyun,
    topics: ['career'],
    readMinutes: 3,
    publishedDate: '2026-08-17',
    saveCount: 690,
    body: [
      p('고2가 끝날 때까지 하고 싶은 전공이 정해지지 않았어요. 생기부 활동을 고를 때마다 불안했어요.'),
      h('관심이 이어지는 활동만 골랐어요'),
      p('전공 이름 대신 "사람이 왜 그렇게 행동하는지"라는 질문이 이어지는 활동을 골랐고, 그 흐름이 나중에 심리학과 지원 이유가 됐어요.'),
    ],
  }),
  story({
    content: content.physicsStory,
    mentor: mentors.songJihoo,
    topics: ['mental', 'success'],
    readMinutes: 3,
    publishedDate: '2026-08-10',
    saveCount: 640,
    body: [
      p('역학 단원에서 계속 막히자 물리학Ⅰ을 다른 과목으로 바꿀지 고민했어요.'),
      h('바꾸기 전에 4주만 더 해 보기로 했어요'),
      p('틀린 역학 문제를 유형별로 다시 풀면서, 4주 뒤 모의고사 결과를 보고 결정하기로 했어요. 그 사이 점수가 오르면서 끝까지 가져갔어요.'),
    ],
  }),
  story({
    content: content.careerRecordStory,
    mentor: mentors.hanJisu,
    topics: ['career', 'success'],
    readMinutes: 3,
    publishedDate: '2026-07-27',
    saveCount: 410,
    body: [
      p('교내 탐구대회 주제였던 항생제 내성을 대회가 끝난 뒤에도 이어서 봤어요.'),
      p('수업 시간 질문, 독서, 진로 활동을 같은 주제로 묶었더니 세특과 진로 기록이 한 흐름으로 남았어요.'),
    ],
  }),
  story({
    content: content.wrongNoteStory,
    mentor: mentors.hanJisu,
    topics: ['grade-change', 'study-method'],
    readMinutes: 3,
    publishedDate: '2026-07-20',
    saveCount: 380,
    body: [
      p('1학년 내신 평균이 1.8이었어요. 오답노트는 있었지만 다시 보지 않았어요.'),
      h('주말마다 한 주 오답만 다시 봤어요'),
      p('토요일 오전에 그 주 오답만 다시 풀고, 두 번 틀린 문제에만 표시했어요. 3학년 1학기에 1.3이 됐어요.'),
    ],
  }),
]

const storyById = new Map(stories.map((item) => [item.contentId, item]))

export function findMentorStoryFixture(contentId: string): MentorStory | null {
  return storyById.get(contentId) ?? null
}

function toListItem(item: MentorStory): MentorStoryListItem {
  return {
    contentId: item.contentId,
    kind: 'story',
    title: item.title,
    summary: item.summary,
    mentor: item.mentor,
    topics: item.topics,
    saved: item.saved,
    saveCount: item.saveCount,
  }
}

function listResult(source: MentorStory[], topic: StoryTopic | undefined, page: number, size: number): MentorStoryListResult {
  const filtered = topic ? source.filter((item) => item.topics.includes(topic)) : source
  const start = page * size
  return {
    items: filtered.slice(start, start + size).map(toListItem),
    page: { number: page, size, totalElements: filtered.length, totalPages: Math.ceil(filtered.length / size) },
  }
}

// ---------- Fixture Scenario (개발 중 ?fixture= 로 화면 상태 확인. ?topic=과 함께 써도 된다) ----------

export type MentorStoryFixtureScenario = 'success' | 'loading' | 'error' | 'not-found'

const storyScenarios: MentorStoryFixtureScenario[] = ['success', 'loading', 'error', 'not-found']

export function readStoryFixtureScenario(search: string): MentorStoryFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return storyScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorStoryLoader = (contentId: string) => Promise<MentorStory | null>

function buildStoryLoader(scenario: MentorStoryFixtureScenario): MentorStoryLoader {
  switch (scenario) {
    case 'loading':
      return () => new Promise<MentorStory | null>(() => {})
    case 'error':
      return () => Promise.reject(new Error('Mentor Story fixture error'))
    case 'not-found':
      return () => Promise.resolve(null)
    case 'success':
      return (contentId) => Promise.resolve(findMentorStoryFixture(contentId))
  }
}

const storyLoaders = new Map<MentorStoryFixtureScenario, MentorStoryLoader>()

/** 실제 API(GET /api/student/mentor-content/{contentId}) 대신 Fixture를 돌려준다. 같은 scenario에는 같은 함수. */
export function createMentorStoryFixtureLoader(scenario: MentorStoryFixtureScenario): MentorStoryLoader {
  let loader = storyLoaders.get(scenario)
  if (!loader) {
    loader = buildStoryLoader(scenario)
    storyLoaders.set(scenario, loader)
  }
  return loader
}

export type MentorStoryFeedFixtureScenario = 'success' | 'empty' | 'loading' | 'error'

const feedScenarios: MentorStoryFeedFixtureScenario[] = ['success', 'empty', 'loading', 'error']

/** Story Feed: `?fixture=empty|loading|error` */
export function readStoryFeedFixtureScenario(search: string): MentorStoryFeedFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return feedScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorStoryFeedLoader = (page: number, size: number) => Promise<MentorStoryListResult>

function buildFeedLoader(scenario: MentorStoryFeedFixtureScenario, topic: StoryTopic | undefined): MentorStoryFeedLoader {
  switch (scenario) {
    case 'loading':
      return () => new Promise<MentorStoryListResult>(() => {})
    case 'error':
      return () => Promise.reject(new Error('Mentor Story feed fixture error'))
    case 'empty':
      return (page, size) => Promise.resolve(listResult([], topic, page, size))
    case 'success':
      return (page, size) => Promise.resolve(listResult(stories, topic, page, size))
  }
}

const feedLoaders = new Map<string, MentorStoryFeedLoader>()

/** 실제 API(GET /api/student/mentor-content?type=story) 대신 Fixture를 돌려준다. 같은 scenario / topic에는 같은 함수. */
export function createMentorStoryFeedFixtureLoader(
  scenario: MentorStoryFeedFixtureScenario,
  topic: StoryTopic | undefined,
): MentorStoryFeedLoader {
  const key = `${scenario}:${topic ?? 'all'}`
  let loader = feedLoaders.get(key)
  if (!loader) {
    loader = buildFeedLoader(scenario, topic)
    feedLoaders.set(key, loader)
  }
  return loader
}

/** 실제 PUT /api/student/mentor-content/{contentId}/saved 대신 성공만 돌려준다. (저장하지 않음) */
export function saveMentorContentFixture(_contentId: string, saved: boolean): Promise<{ saved: boolean }> {
  return Promise.resolve({ saved })
}
