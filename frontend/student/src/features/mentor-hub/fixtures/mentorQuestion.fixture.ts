// UI / Interaction 검증용 Student Mentor Q&A Fixture다. 실제 질문 / 답변이 아니다. (모든 인물 / 내용 가상)
// - 질문자는 익명 Context(학년 · 관심 분야)만 둔다. 실명 / 학교 / 기관을 만들지 않는다.
// - Mentor는 Canonical 객체를 참조하고, 관련 콘텐츠는 기존 Plan / Routine / Story contentId를 쓴다.
// - 시간은 화면 표시용으로 화면을 연 시점 기준 "N시간 전"이 되게 만든다. 상태(pending / answered / overdue)는 값으로 명시한다.
//   (실제 72시간 판정 / Scheduler를 흉내 내지 않는다)
// - 제출 / 재배정 결과는 이 화면 Session 동안만 유지한다. (새로고침하면 초기 Fixture로 돌아간다)

import type {
  MentorContentSummary,
  MentorQuestion,
  MentorQuestionListResult,
  MentorQuestionSubmitRequest,
  MentorQuestionSubmitResult,
  MentorSummary,
  QuestionCategory,
  QuestionComposerContext,
  QuestionReassignResult,
  QuestionView,
} from '../model/types.ts'
import { findMentorStoryFixture } from './mentorStory.fixture.ts'
import { fixtureMentorContent as content, fixtureMentors as mentors } from './mentors.fixture.ts'

const loadedAt = Date.now()
const hoursAgo = (hours: number) => new Date(loadedAt - hours * 3_600_000).toISOString()

/** 이번 Student의 익명 Context (Home Student Context: 고2 · 생명과학 관심) */
const myContext = { grade: '고2', interest: '생명과학 관심' }

interface QuestionSource {
  questionId: string
  status: MentorQuestion['status']
  category: QuestionCategory
  question: string
  detail?: string
  mentor: MentorSummary
  student?: MentorQuestion['student']
  submittedHoursAgo: number
  answer?: { text: string; hoursAgo: number }
  relatedContent?: MentorContentSummary[]
  mine?: boolean
  helpfulCount?: number
}

function q(source: QuestionSource): MentorQuestion {
  return {
    questionId: source.questionId,
    status: source.status,
    category: source.category,
    question: source.question,
    detail: source.detail,
    mentor: source.mentor,
    student: source.student ?? myContext,
    submittedAt: hoursAgo(source.submittedHoursAgo),
    answer: source.answer && { text: source.answer.text, answeredAt: hoursAgo(source.answer.hoursAgo) },
    relatedContent: source.relatedContent ?? [],
    mine: source.mine ?? false,
    helpful: false,
    helpfulCount: source.helpfulCount ?? 0,
  }
}

const initialQuestions: MentorQuestion[] = [
  // ---- 모든 질문: 공개된 답변 (StudentQ&A-00 / 01 Mockup 3개 + 최소 추가) ----
  q({
    questionId: 'fixture-mq-01',
    status: 'answered',
    category: 'MENTAL',
    question: '모의고사를 망치고 나서 공부가 손에 안 잡혀요',
    detail: '6월 모의고사 성적이 두 등급 떨어졌어요. 그 뒤로 일주일째 집중이 안 돼요.',
    mentor: mentors.hanJisu,
    student: { grade: '고2', interest: '화학공학 관심' },
    submittedHoursAgo: 30,
    answer: {
      text: '저도 생명과학이 두 등급 떨어졌던 적이 있어요. 성적표를 받은 날은 틀린 문제를 유형별로만 나눠두고 쉬었어요. 다음 날부터 가장 많이 틀린 유형 하나만 일주일 동안 잡았더니, 할 일이 작아지면서 다시 공부가 시작됐어요.',
      hoursAgo: 8,
    },
    relatedContent: [content.mockExamStory],
    helpfulCount: 365,
  }),
  q({
    questionId: 'fixture-mq-02',
    status: 'answered',
    category: 'STUDY_METHOD',
    question: '수학 문제집을 3권 풀었는데 성적이 그대로예요',
    mentor: mentors.kangMinho,
    student: { grade: '고2', interest: '공학 관심' },
    submittedHoursAgo: 28,
    answer: {
      text: '권수를 늘리기보다 틀린 문제를 다시 푸는 횟수를 늘려보세요. 저는 한 권을 정해 틀린 문제에 표시하고, 3일 뒤와 1주 뒤에 다시 풀었어요. 풀이를 말로 설명할 수 있을 때까지 반복하니 3등급에서 1등급까지 올랐어요.',
      hoursAgo: 10,
    },
    relatedContent: [content.mathStory],
    helpfulCount: 342,
  }),
  q({
    questionId: 'fixture-mq-03',
    status: 'answered',
    category: 'CSAT',
    question: '비문학은 아무리 풀어도 점수가 안 올라요',
    mentor: mentors.parkSeohyun,
    student: { grade: '고2', interest: '경제학 관심' },
    submittedHoursAgo: 40,
    answer: {
      text: '저도 고3 여름까지 같은 고민을 했어요. 문제를 많이 푸는 대신 하루 2지문만 정해서, 읽고 난 뒤 문단마다 핵심을 한 줄로 적었어요. 2주쯤 지나니 구조가 먼저 보이기 시작했고 시간도 줄었어요.',
      hoursAgo: 16,
    },
    relatedContent: [content.summerStory, content.nonliteraturePlan],
    helpfulCount: 298,
  }),
  q({
    questionId: 'fixture-mq-04',
    status: 'answered',
    category: 'SCHOOL_GRADE',
    question: '내신 시험 4주 전에는 무엇부터 해야 하나요?',
    mentor: mentors.goMinjeong,
    student: { grade: '고1', interest: '심리학 관심' },
    submittedHoursAgo: 52,
    answer: {
      text: '시험 범위를 과목별로 적고, 주차마다 어느 단원까지 끝낼지 먼저 나눴어요. 수행평가 날짜도 같이 적어 두면 한 주에 몰리지 않게 조정할 수 있어요.',
      hoursAgo: 26,
    },
    relatedContent: [content.midtermPlan],
    helpfulCount: 210,
  }),
  q({
    questionId: 'fixture-mq-05',
    status: 'answered',
    category: 'ADMISSION_STRATEGY',
    question: '수시와 정시 중 언제쯤 정해야 하나요?',
    mentor: mentors.leeHyunseo,
    student: { grade: '고2', interest: '역사 관심' },
    submittedHoursAgo: 70,
    answer: {
      text: '저는 고2 겨울에 내신과 모의고사 성적을 나란히 놓고 봤어요. 정하기 전에 "3월 모의고사 결과가 이 정도면 정시"처럼 기준을 먼저 적어 두면 흔들리지 않아요.',
      hoursAgo: 40,
    },
    relatedContent: [content.admissionSwitchStory],
    helpfulCount: 187,
  }),
  q({
    questionId: 'fixture-mq-06',
    status: 'answered',
    category: 'STUDY_METHOD',
    question: '아침에 공부 루틴을 만들고 싶은데 오래 못 가요',
    mentor: mentors.joMinjae,
    student: { grade: '고2', interest: '경제학 관심' },
    submittedHoursAgo: 90,
    answer: {
      text: '처음부터 길게 잡지 말고 30분짜리 하나만 고정해 보세요. 저는 기상 직후 영어 단어 30개로 시작했고, 그게 익숙해진 뒤에 다른 블록을 붙였어요.',
      hoursAgo: 60,
    },
    relatedContent: [content.csatRoutine],
    helpfulCount: 154,
  }),
  // Home 함께 보면 좋은 콘텐츠의 Q&A 항목과 같은 질문 (posterQna)
  q({
    questionId: 'fixture-mq-07',
    status: 'answered',
    category: 'ADMISSION_STRATEGY',
    question: content.posterQna.title,
    mentor: mentors.hanJisu,
    student: { grade: '고2', interest: '생명공학 관심' },
    submittedHoursAgo: 120,
    answer: {
      text: '교과서에서 배운 개념 하나로 시작해서, 학교 실험실에서 직접 확인할 수 있는 범위까지만 줄였어요. 주제가 작아질수록 결과를 설명하기 쉬웠어요.',
      hoursAgo: 96,
    },
    relatedContent: [content.careerRecordStory, content.antibioticRecord, content.antibioticCase],
    helpfulCount: 132,
  }),
  // ---- 내 질문 (pending / answered / overdue) ----
  q({
    questionId: 'fixture-mq-08',
    status: 'pending',
    category: 'STUDY_METHOD',
    question: '생명과학 자료 해석 문항은 하루에 몇 개씩 풀었나요?',
    mentor: mentors.hanJisu,
    submittedHoursAgo: 5,
    mine: true,
  }),
  q({
    questionId: 'fixture-mq-09',
    status: 'answered',
    category: 'SCHOOL_GRADE',
    question: '화학Ⅰ 계산 문제에서 실수를 줄이는 방법이 있을까요?',
    mentor: mentors.parkNayun,
    submittedHoursAgo: 48,
    answer: {
      text: '계산할 때 단위를 끝까지 써 보세요. 저는 매일 밤 계산 문제 3개만 단위를 적어 가며 풀었더니 실수가 많이 줄었어요.',
      hoursAgo: 20,
    },
    relatedContent: [content.scienceRoutine],
    mine: true,
  }),
  q({
    questionId: 'fixture-mq-10',
    status: 'overdue',
    category: 'SCHOOL_GRADE',
    question: '수학Ⅱ 내신 서술형은 어떻게 준비했나요?',
    mentor: mentors.jeongSejin,
    submittedHoursAgo: 80,
    mine: true,
  }),
]

// 이번 Session의 질문 (제출 / 재배정 결과 반영)
let questions = [...initialQuestions]
let submitSeq = 0

export function findMentorQuestionFixture(questionId: string): MentorQuestion | null {
  return questions.find((item) => item.questionId === questionId) ?? null
}

function listResult(
  view: QuestionView,
  category: QuestionCategory | undefined,
  page: number,
  size: number,
  source: MentorQuestion[],
): MentorQuestionListResult {
  const filtered = source
    .filter((item) => (view === 'mine' ? item.mine : item.status === 'answered' && !item.mine))
    .filter((item) => !category || item.category === category)
    // 모든 질문: 최근 답변 순 / 내 질문: 최근 질문 순
    .sort((a, b) =>
      view === 'mine'
        ? b.submittedAt.localeCompare(a.submittedAt)
        : (b.answer?.answeredAt ?? '').localeCompare(a.answer?.answeredAt ?? ''),
    )
  const start = page * size
  return {
    items: filtered.slice(start, start + size),
    page: { number: page, size, totalElements: filtered.length, totalPages: Math.ceil(filtered.length / size) },
  }
}

// ---------- Fixture Scenario (개발 중 ?fixture= 로 확인. ?view= / ?category=와 함께 써도 된다) ----------

export type QuestionListFixtureScenario = 'success' | 'empty' | 'loading' | 'error'
const listScenarios: QuestionListFixtureScenario[] = ['success', 'empty', 'loading', 'error']

export function readQuestionListFixtureScenario(search: string): QuestionListFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return listScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorQuestionListLoader = (page: number, size: number) => Promise<MentorQuestionListResult>

const listLoaders = new Map<string, MentorQuestionListLoader>()

/** 실제 GET /api/student/mentor-questions 대신 Fixture를 돌려준다. 같은 scenario / view / category에는 같은 함수. */
export function createMentorQuestionListFixtureLoader(
  scenario: QuestionListFixtureScenario,
  view: QuestionView,
  category: QuestionCategory | undefined,
): MentorQuestionListLoader {
  const key = `${scenario}:${view}:${category ?? 'all'}`
  let loader = listLoaders.get(key)
  if (!loader) {
    loader = (page, size) => {
      switch (scenario) {
        case 'loading':
          return new Promise<MentorQuestionListResult>(() => {})
        case 'error':
          return Promise.reject(new Error('Mentor question list fixture error'))
        case 'empty':
          return Promise.resolve(listResult(view, category, page, size, []))
        case 'success':
          return Promise.resolve(listResult(view, category, page, size, questions))
      }
    }
    listLoaders.set(key, loader)
  }
  return loader
}

export type QuestionDetailFixtureScenario = 'success' | 'loading' | 'error' | 'not-found'
const detailScenarios: QuestionDetailFixtureScenario[] = ['success', 'loading', 'error', 'not-found']

export function readQuestionDetailFixtureScenario(search: string): QuestionDetailFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return detailScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type MentorQuestionLoader = (questionId: string) => Promise<MentorQuestion | null>

const detailLoaders = new Map<QuestionDetailFixtureScenario, MentorQuestionLoader>()

/** 실제 GET /api/student/mentor-questions/{questionId} 대신 Fixture를 돌려준다. */
export function createMentorQuestionFixtureLoader(scenario: QuestionDetailFixtureScenario): MentorQuestionLoader {
  let loader = detailLoaders.get(scenario)
  if (!loader) {
    loader = (questionId) => {
      switch (scenario) {
        case 'loading':
          return new Promise<MentorQuestion | null>(() => {})
        case 'error':
          return Promise.reject(new Error('Mentor question fixture error'))
        case 'not-found':
          return Promise.resolve(null)
        case 'success':
          return Promise.resolve(findMentorQuestionFixture(questionId))
      }
    }
    detailLoaders.set(scenario, loader)
  }
  return loader
}

// ---------- 질문 작성 ----------

const mentorById = new Map(Object.values(mentors).map((mentor) => [mentor.mentorId, mentor]))

/** 질문 작성 화면 Context: 받는 Mentor + (Story에서 왔다면) 관련 Story. 없는 Mentor면 null */
export function loadQuestionComposerContextFixture(
  mentorId: string,
  sourceContentId: string | undefined,
): Promise<QuestionComposerContext | null> {
  const mentor = mentorById.get(mentorId)
  if (!mentor) return Promise.resolve(null)
  const story = sourceContentId ? findMentorStoryFixture(sourceContentId) : null
  // 다른 Mentor의 Story가 넘어오면 Context로 쓰지 않는다.
  const relatedStory =
    story && story.mentor.mentorId === mentorId ? { contentId: story.contentId, kind: story.kind, title: story.title } : undefined
  return Promise.resolve({ mentor, relatedStory })
}

export type SubmitFixtureScenario = 'success' | 'submit-fail-once'

export function readSubmitFixtureScenario(search: string): SubmitFixtureScenario {
  return new URLSearchParams(search).get('fixture') === 'submit-fail-once' ? 'submit-fail-once' : 'success'
}

export interface MentorQuestionService {
  submit: (request: MentorQuestionSubmitRequest) => Promise<MentorQuestionSubmitResult>
}

function buildSubmitService(scenario: SubmitFixtureScenario): MentorQuestionService {
  let attempts = 0
  return {
    submit: (request) => {
      attempts += 1
      if (scenario === 'submit-fail-once' && attempts === 1) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error('Question submit fixture error')), 400))
      }
      const mentor = mentorById.get(request.mentorId)
      if (!mentor) return Promise.reject(new Error('Mentor not found'))
      submitSeq += 1
      const submittedAt = new Date().toISOString()
      // 실제 DB ID가 아니다.
      const questionId = `fixture-mq-new-${submitSeq}`
      questions = [
        {
          questionId,
          status: 'pending',
          category: request.category,
          question: request.question,
          mentor,
          student: myContext,
          submittedAt,
          relatedContent: [],
          mine: true,
          helpful: false,
          helpfulCount: 0,
        },
        ...questions,
      ]
      const result: MentorQuestionSubmitResult = { questionId, status: 'pending', mentorId: mentor.mentorId, submittedAt }
      return new Promise((resolve) => setTimeout(() => resolve(result), 400))
    },
  }
}

const submitServices = new Map<SubmitFixtureScenario, MentorQuestionService>()

/** 실제 POST /api/student/mentor-questions 대신 쓰는 Service. 같은 scenario에는 같은 객체. */
export function createMentorQuestionFixtureService(scenario: SubmitFixtureScenario): MentorQuestionService {
  let service = submitServices.get(scenario)
  if (!service) {
    service = buildSubmitService(scenario)
    submitServices.set(scenario, service)
  }
  return service
}

// ---------- 재배정 (Contract에 Endpoint 없음: Frontend Fixture Action) ----------

const mentorOrder = Object.values(mentors)

/**
 * 재배정 요청. Student는 다음 Mentor를 고르지 않는다. (누가 / 어떻게 고르는지는 문서에 없다: domain.md OD-02)
 * 이 Fixture는 "재배정 후 받는 Mentor가 바뀔 수 있다"는 화면 확인용으로 Canonical 순서의 다음 Mentor를 돌려줄 뿐이며,
 * 자동 배정 / Admin 배정 / System 추천 중 어떤 정책도 뜻하지 않는다.
 * 재배정 후 상태(overdue 등)는 정해지지 않아 바꾸지 않는다.
 */
export function requestQuestionReassignFixture(questionId: string): Promise<QuestionReassignResult> {
  const target = findMentorQuestionFixture(questionId)
  if (!target) return Promise.reject(new Error('Reassign fixture error'))
  const index = mentorOrder.findIndex((mentor) => mentor.mentorId === target.mentor.mentorId)
  const next = mentorOrder[(index + 1) % mentorOrder.length]
  questions = questions.map((item) =>
    item.questionId === questionId ? { ...item, mentor: next, reassignedFrom: item.reassignedFrom ?? item.mentor } : item,
  )
  const result: QuestionReassignResult = { previousMentorId: target.mentor.mentorId, newMentorId: next.mentorId }
  return new Promise((resolve) => setTimeout(() => resolve(result), 300))
}

/** 도움돼요 (Contract에 Reaction API 없음). 성공만 돌려준다. */
export function markQuestionHelpfulFixture(_questionId: string, helpful: boolean): Promise<{ helpful: boolean }> {
  return Promise.resolve({ helpful })
}
