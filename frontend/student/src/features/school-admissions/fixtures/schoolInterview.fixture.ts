// Interview Bridge Fixture (Canonical). 실제 GET /api/student/interview/questions · PUT answer · PUT practice-status 대신 메모리 저장소를 쓴다.
// - 질문은 Admin이 이미 공개(또는 아직 비공개)한 결과다. AI Draft 생성 / 질문 편집 / Publish는 여기서 하지 않는다. (Admin Surface)
// - published는 Fixture 의미 값이다. (공개 상태 Enum 미확정 → Backend 값으로 쓰지 않는다)
// - 관련 활동은 Activity 저장소의 Archive 저장한 Canonical Activity id만 가리킨다. (제목 · 유형 · 기간을 복사하지 않는다)
// - connectionId가 있는 질문은 그 Connection이 확정(confirmed)일 때만 Student에게 보인다. 후보 / 거절은 근거로 쓰지 않는다.
// - Student 읽기 모델은 "고3 + 공개" 질문만 돌려준다. (화면에서 숨기는 것이 아니라 여기서 뺀다)
// - 상담 기록은 질문 근거로 쓰지 않는다. (School Archive / Activity만)
// - 실제 Backend가 아니다. 새로고침하면 Seed로 돌아간다.

import { isInterviewEligible, type InterviewPracticeStatus, type InterviewQuestion, type InterviewQuestionDetail } from '../model/interview.ts'
import { findGrowthActivity } from './schoolActivity.fixture.ts'
import { confirmedConnection } from './schoolConnection.fixture.ts'

interface InterviewQuestionRecord extends InterviewQuestion {
  /** Admin 공개 여부 (Fixture 의미 값) */
  published: boolean
  /** 확정 Connection에서 나온 질문이면 그 id */
  connectionId?: string
}

const A11 = 'fixture-activity-a11-bioinformatics'
const A12 = 'fixture-activity-a12-broadcast'

const records: InterviewQuestionRecord[] = [
  {
    questionId: 'fixture-interview-question-001',
    question: '염기서열 비교 실습에서 가장 어려웠던 점은 무엇이었고, 그 문제를 이해하기 위해 어떤 방식으로 접근했나요?',
    relatedActivityIds: [A11],
    practiceStatus: 'NOT_STARTED',
    answer: '',
    published: true,
  },
  {
    questionId: 'fixture-interview-question-002',
    question: '생명과학 지식과 소프트웨어 기술이 함께 필요하다고 느낀 순간을 활동 경험을 바탕으로 설명해보세요.',
    relatedActivityIds: [A11],
    practiceStatus: 'PRACTICING',
    answer: '',
    published: true,
  },
  {
    questionId: 'fixture-interview-question-003',
    question: '행사 순서가 갑자기 변경됐을 때 어떤 방식으로 정보를 정리하고 전달했으며, 그 경험에서 무엇을 배웠나요?',
    relatedActivityIds: [A12],
    practiceStatus: 'NOT_STARTED',
    answer: '',
    published: true,
  },
  {
    questionId: 'fixture-interview-question-004',
    question: '팀원들과 같은 변경사항을 정확하게 공유하기 위해 다음 활동에서는 어떤 방식을 사용하고 싶나요?',
    relatedActivityIds: [A12],
    practiceStatus: 'NOT_STARTED',
    answer: '',
    published: true,
  },
  {
    // 확정 Connection(fixture-connection-001: A11 ↔ A12)에서 나온 질문
    questionId: 'fixture-interview-question-005',
    question: '두 활동에서 공통적으로 "정보를 정확하게 기록하고 전달하는 방법"이 중요했던 이유를 각 경험을 비교해 설명해보세요.',
    relatedActivityIds: [A11, A12],
    practiceStatus: 'NOT_STARTED',
    answer: '',
    published: true,
    connectionId: 'fixture-connection-001',
  },
  {
    // 비공개: Admin 검토 전 초안 (Student에게 보이지 않는다)
    questionId: 'fixture-interview-question-006',
    question: '전공 체험에서 데이터를 해석한 방식과 독서 에세이에서 근거를 찾은 방식을 비교해보세요.',
    relatedActivityIds: [A11],
    practiceStatus: 'NOT_STARTED',
    answer: '',
    published: false,
  },
  {
    questionId: 'fixture-interview-question-007',
    question: '방송 장비 점검표를 만들 때 가장 먼저 확인한 항목은 무엇이었나요?',
    relatedActivityIds: [A12],
    practiceStatus: 'NOT_STARTED',
    answer: '',
    published: false,
  },
]

let revision = 0

/** 저장소가 바뀔 때마다 증가한다. 목록 / Detail Loader가 이 값으로 다시 읽는다. */
export const interviewStoreRevision = () => revision

const toStudentQuestion = ({ questionId, question, relatedActivityIds, practiceStatus, answer }: InterviewQuestionRecord): InterviewQuestion => ({
  questionId,
  question,
  relatedActivityIds: [...relatedActivityIds],
  practiceStatus,
  answer,
})

/** Student에게 보이는 질문인가: 공개 + (Connection 질문이면 확정 Connection) */
const isStudentVisible = (record: InterviewQuestionRecord) =>
  record.published && (!record.connectionId || confirmedConnection(record.connectionId) !== null)

/** Student 읽기 모델 (GET /api/student/interview/questions): 고3이 아니면 비어 있고, 공개 질문만 등록 순서대로 */
export function studentInterviewQuestions(grade: string): InterviewQuestion[] {
  if (!isInterviewEligible(grade)) return []
  return records.filter(isStudentVisible).map(toStudentQuestion)
}

// ---------- 목록 / Detail Loader ----------

export type SchoolInterviewLoadScenario = 'success' | 'loading' | 'error' | 'empty' | 'related-missing'
const loadScenarios: SchoolInterviewLoadScenario[] = ['success', 'loading', 'error', 'empty', 'related-missing']

export function readSchoolInterviewLoadScenario(search: string): SchoolInterviewLoadScenario {
  const value = new URLSearchParams(search).get('fixture')
  return loadScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type SchoolInterviewListLoader = () => Promise<InterviewQuestionDetail[]>
export type SchoolInterviewDetailLoader = (questionId: string) => Promise<InterviewQuestionDetail | null>

/** 질문 + 관련 활동 (Canonical Activity 참조). 관련 활동은 Archive 저장한 활동만, 아니면 찾지 못한 것으로 둔다. */
const withRelated = (question: InterviewQuestion): InterviewQuestionDetail => ({
  question,
  related: question.relatedActivityIds.map((activityId) => {
    const activity = findGrowthActivity(activityId)
    return { activityId, activity: activity?.status === 'archived' ? activity : null }
  }),
})

const listLoaders = new Map<string, SchoolInterviewListLoader>()
const detailLoaders = new Map<string, SchoolInterviewDetailLoader>()

/** 개발용 related-missing: 첫 질문의 관련 활동 id를 없는 값으로 바꿔 화면 일부 안내를 확인한다. */
const scenarioQuestions = (scenario: SchoolInterviewLoadScenario, grade: string) => {
  if (scenario === 'empty') return []
  const items = studentInterviewQuestions(grade)
  if (scenario === 'related-missing' && items[0]) items[0] = { ...items[0], relatedActivityIds: ['fixture-activity-missing'] }
  return items
}

export function createSchoolInterviewListLoader(scenario: SchoolInterviewLoadScenario, grade: string): SchoolInterviewListLoader {
  const key = `${scenario}|${grade}|${revision}`
  let loader = listLoaders.get(key)
  if (!loader) {
    loader = () => {
      if (scenario === 'loading') return new Promise<InterviewQuestionDetail[]>(() => {})
      if (scenario === 'error') return Promise.reject(new Error('School interview list fixture error'))
      return Promise.resolve(scenarioQuestions(scenario, grade).map(withRelated))
    }
    listLoaders.set(key, loader)
  }
  return loader
}

/** 질문 하나 + 관련 활동. 보이지 않는 질문(비공개 / 비대상 / 없음)은 null = Not Found */
export function createSchoolInterviewDetailLoader(scenario: SchoolInterviewLoadScenario, grade: string): SchoolInterviewDetailLoader {
  const key = `${scenario}|${grade}|${revision}`
  let loader = detailLoaders.get(key)
  if (!loader) {
    loader = (questionId) => {
      if (scenario === 'loading') return new Promise<InterviewQuestionDetail | null>(() => {})
      if (scenario === 'error') return Promise.reject(new Error('School interview detail fixture error'))
      const question = scenarioQuestions(scenario, grade).find((item) => item.questionId === questionId)
      return Promise.resolve(question ? withRelated(question) : null)
    }
    detailLoaders.set(key, loader)
  }
  return loader
}

// ---------- 답변 / 연습 상태 Service ----------

const actionScenarios = ['success', 'interview-answer-fail-once', 'interview-practice-fail-once'] as const
export type SchoolInterviewActionScenario = (typeof actionScenarios)[number]

export function readSchoolInterviewActionScenario(search: string): SchoolInterviewActionScenario {
  const value = new URLSearchParams(search).get('fixture')
  return actionScenarios.find((scenario) => scenario === value) ?? 'success'
}

export interface SchoolInterviewService {
  /** PUT .../answer { answer }: 학생이 쓴 원문 그대로 저장. 연습 상태는 바꾸지 않는다. */
  saveAnswer: (questionId: string, answer: string) => Promise<void>
  /** PUT .../practice-status { status }: 답변은 바꾸지 않는다. */
  setPracticeStatus: (questionId: string, status: InterviewPracticeStatus) => Promise<void>
}

const services = new Map<SchoolInterviewActionScenario, SchoolInterviewService>()

function respond(fail: boolean, run: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) {
        reject(new Error('School interview fixture error'))
        return
      }
      try {
        run()
        revision += 1
        resolve()
      } catch (error) {
        reject(error)
      }
    }, 250)
  })
}

const requireVisible = (questionId: string) => {
  const record = records.find((item) => item.questionId === questionId)
  if (!record || !isStudentVisible(record)) throw new Error('INTERVIEW_QUESTION_NOT_FOUND')
  return record
}

export function createSchoolInterviewService(scenario: SchoolInterviewActionScenario): SchoolInterviewService {
  let service = services.get(scenario)
  if (!service) {
    const attempts: Record<string, number> = {}
    const firstFails = (name: SchoolInterviewActionScenario) => {
      attempts[name] = (attempts[name] ?? 0) + 1
      return scenario === name && attempts[name] === 1
    }
    service = {
      saveAnswer: (questionId, answer) =>
        respond(firstFails('interview-answer-fail-once'), () => {
          requireVisible(questionId).answer = answer
        }),
      setPracticeStatus: (questionId, status) =>
        respond(firstFails('interview-practice-fail-once'), () => {
          requireVisible(questionId).practiceStatus = status
        }),
    }
    services.set(scenario, service)
  }
  return service
}

/** Fixture 확인용 (개발 / 검증): 전체 질문 수와 공개 여부, Connection 근거 */
export function interviewFixtureSnapshot() {
  return records.map(({ questionId, published, connectionId, relatedActivityIds }) => ({ questionId, published, connectionId: connectionId ?? null, relatedActivityIds: [...relatedActivityIds] }))
}
