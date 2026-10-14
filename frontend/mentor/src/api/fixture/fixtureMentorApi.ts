// /api/mentor/** Contract를 흉내 내는 Fixture Adapter. Backend가 생기면 같은 MentorApi Interface의 HTTP 구현으로 바꾼다.
//
// - 상태는 이 Browser Tab의 Memory에만 있다. 새로고침하면 처음 Fixture로 돌아간다.
// - Server가 해야 할 검증(내 Content인지, 상태 전이, 필수값)을 여기서도 똑같이 막아 화면이 UI 숨김에만 기대지 않게 한다.
// - Mentor 전용 Error Code는 Contract에 없어 공통 Code(VALIDATION_ERROR / NOT_FOUND)와
//   다른 Endpoint에서 쓰는 INVALID_STATE_TRANSITION만 쓴다. (Contract Gap)

import { MentorApiError } from '../errors.ts'
import type { MentorApi } from '../mentorApi.ts'
import type {
  MentorContentDetail,
  MentorContentListItem,
  MentorContentRef,
  MentorContentType,
  MentorQuestion,
  MentorQuestionStatus,
  PageResult,
} from '../types.ts'
import { contentFixtures } from './content.fixture.ts'
import { readFixtureScenario } from './fixtureScenario.ts'
import { currentMentorFixture } from './mentor.fixture.ts'
import { createQuestionFixtures } from './questions.fixture.ts'

const LATENCY_MS = 300
const DEFAULT_PAGE_SIZE = 20

/** Review / 공개가 Admin 검수를 거치는 유형 (domain.md §29-1) */
const reviewRequiredTypes: MentorContentType[] = ['RECORD', 'CASE']

const delay = () => new Promise<void>((resolve) => setTimeout(resolve, LATENCY_MS))
const never = () => new Promise<never>(() => {})
const clone = <T>(value: T): T => structuredClone(value)

function paginate<T>(items: T[], page = 0, size = DEFAULT_PAGE_SIZE): PageResult<T> {
  const start = page * size
  return {
    items: items.slice(start, start + size),
    page: { number: page, size, totalElements: items.length, totalPages: Math.ceil(items.length / size) },
  }
}

function toListItem(detail: MentorContentDetail): MentorContentListItem {
  const { body: _body, ...item } = detail
  return item
}

const questionOrder: Record<MentorQuestionStatus, number> = { overdue: 0, pending: 1, answered: 2 }

/** Inbox 정렬: 기한 초과 → 답변 대기(오래된 질문 먼저) → 답변 완료(최근 답변 먼저). Contract에 정렬 규칙이 없어 Fixture에서 정한다. */
function compareQuestions(a: MentorQuestion, b: MentorQuestion) {
  if (a.status !== b.status) return questionOrder[a.status] - questionOrder[b.status]
  if (a.status === 'answered') return (b.answer?.answeredAt ?? '').localeCompare(a.answer?.answeredAt ?? '')
  return a.submittedAt.localeCompare(b.submittedAt)
}

export function createFixtureMentorApi(): MentorApi {
  let contents = clone(contentFixtures)
  let questions = createQuestionFixtures()
  let profile = clone(currentMentorFixture)
  let createdCount = 0
  const failedOnce = new Set<string>()
  // 읽기 실패 구간. React StrictMode(개발)는 Effect를 두 번 실행하므로 첫 실패 직후의 같은 요청도 실패시킨다.
  const readFailingUntil = new Map<string, number>()
  const READ_FAILURE_WINDOW_MS = 1500

  /** Scenario에 맞춰 읽기 요청을 지연 / 실패시킨다. */
  async function read(key: string) {
    const scenario = readFixtureScenario()
    if (scenario === 'loading') return never()
    const calledAt = Date.now()
    await delay()
    if (scenario !== 'error') return
    const failingUntil = readFailingUntil.get(key) ?? calledAt + READ_FAILURE_WINDOW_MS
    readFailingUntil.set(key, failingUntil)
    if (calledAt < failingUntil) {
      throw new MentorApiError(503, 'SERVICE_UNAVAILABLE', '일시적으로 불러오지 못했어요.')
    }
  }

  async function write(key: string) {
    await delay()
    if (readFixtureScenario() === 'submit-error' && !failedOnce.has(`write:${key}`)) {
      failedOnce.add(`write:${key}`)
      throw new MentorApiError(503, 'SERVICE_UNAVAILABLE', '일시적으로 저장하지 못했어요.')
    }
  }

  const isEmpty = () => readFixtureScenario() === 'empty'

  function findContent(contentId: string) {
    // 현재 Mentor의 Content만 있다. 다른 Mentor의 Content는 없는 것으로 본다(404). (frontend-mentor.md §4)
    const found = contents.find((item) => item.contentId === contentId)
    if (!found || isEmpty()) throw new MentorApiError(404, 'NOT_FOUND', 'Content를 찾을 수 없어요.')
    return found
  }

  function findQuestion(questionId: string) {
    const found = questions.find((item) => item.questionId === questionId)
    if (!found || isEmpty()) throw new MentorApiError(404, 'NOT_FOUND', '질문을 찾을 수 없어요.')
    return found
  }

  function assertEditable(content: MentorContentDetail) {
    if (!reviewRequiredTypes.includes(content.type)) return
    // 공개 후 수정 / 검수 중 수정 정책은 OD-05 미확정이라 막아 둔다. (검수 없이 공개 내용이 바뀌지 않게)
    if (content.status === 'PUBLISHED' || content.review.publishRequestSubmitted) {
      throw new MentorApiError(409, 'INVALID_STATE_TRANSITION', '검수 중이거나 공개된 Record / Case는 아직 수정할 수 없어요.')
    }
  }

  function replaceContent(next: MentorContentDetail) {
    contents = contents.map((item) => (item.contentId === next.contentId ? next : item))
  }

  return {
    async listContent(query = {}) {
      await read('listContent')
      if (isEmpty()) return paginate([], query.page, query.size)
      const items = contents
        .filter((item) => (!query.type || item.type === query.type) && (!query.status || item.status === query.status))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(toListItem)
      return clone(paginate(items, query.page, query.size))
    },

    async getContent(contentId) {
      await read(`getContent:${contentId}`)
      return clone(findContent(contentId))
    },

    async createContent(request) {
      await write('createContent')
      if (!request.title.trim()) {
        throw new MentorApiError(400, 'VALIDATION_ERROR', '제목을 입력해 주세요.')
      }
      createdCount += 1
      const now = new Date().toISOString()
      const created = {
        ...clone(request),
        title: request.title.trim(),
        contentId: `fixture-content-${request.type.toLowerCase()}-local-${createdCount}`,
        status: 'DRAFT',
        metrics: { viewCount: 0, saveCount: 0, applyCount: request.type === 'PLAN' || request.type === 'ROUTINE' ? 0 : null },
        review: { publishRequestSubmitted: false, publishRequestedAt: null },
        updatedAt: now,
        publishedAt: null,
      } as MentorContentDetail
      contents = [created, ...contents]
      return clone(created)
    },

    async updateContent(contentId, request) {
      await write(`updateContent:${contentId}`)
      const current = findContent(contentId)
      assertEditable(current)
      if (request.title !== undefined && !request.title.trim()) {
        throw new MentorApiError(400, 'VALIDATION_ERROR', '제목을 입력해 주세요.')
      }
      const next = {
        ...current,
        ...clone(request),
        title: request.title?.trim() ?? current.title,
        updatedAt: new Date().toISOString(),
      } as MentorContentDetail
      replaceContent(next)
      return clone(next)
    },

    async publishContent(contentId) {
      await write(`publishContent:${contentId}`)
      const current = findContent(contentId)
      if (current.status === 'PUBLISHED' || current.review.publishRequestSubmitted) {
        throw new MentorApiError(409, 'INVALID_STATE_TRANSITION', '이미 공개했거나 검수를 요청한 Content예요.')
      }
      const now = new Date().toISOString()
      // Record / Case: PII Detection → Admin Review → Published. 여기서는 검수 요청까지만 하고 Draft로 둔다.
      // 일반 Content: mentor-hub.md §5 Create Post는 Record / Case만 검수 후 공개라고 정하므로 바로 공개한다.
      const next: MentorContentDetail = reviewRequiredTypes.includes(current.type)
        ? { ...current, review: { publishRequestSubmitted: true, publishRequestedAt: now }, updatedAt: now }
        : { ...current, status: 'PUBLISHED', publishedAt: now, updatedAt: now }
      replaceContent(next)
      return clone(next)
    },

    async listQuestions(query = {}) {
      await read('listQuestions')
      if (isEmpty()) return paginate([], query.page, query.size)
      const items = questions.filter((item) => !query.status || item.status === query.status).sort(compareQuestions)
      return clone(paginate(items, query.page, query.size))
    },

    async getQuestion(questionId) {
      await read(`getQuestion:${questionId}`)
      return clone(findQuestion(questionId))
    },

    async answerQuestion(questionId, request) {
      await write(`answerQuestion:${questionId}`)
      const current = findQuestion(questionId)
      if (current.status === 'answered') {
        throw new MentorApiError(409, 'INVALID_STATE_TRANSITION', '이미 답변한 질문이에요.')
      }
      if (!request.answer.trim()) {
        throw new MentorApiError(400, 'VALIDATION_ERROR', '답변을 입력해 주세요.')
      }
      // 연결은 참조만 저장한다. Student에게 보이는 내 Published Content만 연결할 수 있다.
      const relatedContent: MentorContentRef[] = []
      for (const contentId of new Set(request.relatedContentIds)) {
        const content = contents.find((item) => item.contentId === contentId)
        if (!content || content.status !== 'PUBLISHED') {
          throw new MentorApiError(400, 'VALIDATION_ERROR', '공개된 내 Content만 연결할 수 있어요.')
        }
        relatedContent.push({ contentId: content.contentId, type: content.type, title: content.title })
      }
      const next: MentorQuestion = {
        ...current,
        status: 'answered',
        answer: { text: request.answer.trim(), answeredAt: new Date().toISOString() },
        relatedContent,
      }
      questions = questions.map((item) => (item.questionId === questionId ? next : item))
      return clone(next)
    },

    async getProfile() {
      await read('getProfile')
      return clone(profile)
    },

    async updateProfile(request) {
      await write('updateProfile')
      if (request.representativeExperience !== undefined && !request.representativeExperience.trim()) {
        throw new MentorApiError(400, 'VALIDATION_ERROR', '대표 경험을 입력해 주세요.')
      }
      if (request.highSchoolContext !== undefined && !request.highSchoolContext.trim()) {
        throw new MentorApiError(400, 'VALIDATION_ERROR', '고교 Context를 입력해 주세요.')
      }
      // 공개 Profile 수정 Field만 반영한다. 인증 대상 Field는 Request에 있어도 무시한다.
      profile = {
        ...profile,
        highSchoolContext: request.highSchoolContext?.trim() ?? profile.highSchoolContext,
        representativeExperience: request.representativeExperience?.trim() ?? profile.representativeExperience,
        tags: request.tags ?? profile.tags,
        profileImageUrl: request.profileImageUrl === undefined ? profile.profileImageUrl : request.profileImageUrl,
      }
      return clone(profile)
    },
  }
}
