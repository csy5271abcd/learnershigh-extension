// Mentor Discover Data Boundary (Frontend-only Prototype).
// api-contract.md에 Mentor Discover Endpoint가 없어 MentorApi(/api/mentor/** Contract)에 넣지 않고 따로 둔다.
// Backend API / Public Projection Contract가 정해지면 이 Interface의 HTTP 구현으로 바꾼다. (Open Decision)
//
// - 다른 Mentor의 공개 Profile과 Published Content만 돌려준다. Q&A / Draft / 검수 대기 / Metrics는 없다.
// - 현재 Mentor 자신은 둘러보기 대상에서 뺀다. (내 공개 Content는 My Content / Profile에서 본다)

import { MentorApiError } from '../errors.ts'
import { readFixtureScenario } from '../fixture/fixtureScenario.ts'
import { currentMentorFixture } from '../fixture/mentor.fixture.ts'
import { discoverContentFixtures, discoverMentorFixtures } from './discover.fixture.ts'
import { isPubliclyVisible, toPublicMentorView, toPublishedDetail, toPublishedView } from './projection.ts'
import type {
  DiscoverContentQuery,
  PublicMentorDetail,
  PublicMentorView,
  PublishedMentorContentDetail,
  PublishedMentorContentView,
} from './types.ts'

export interface MentorDiscoverApi {
  listPublishedContent(query?: DiscoverContentQuery): Promise<PublishedMentorContentView[]>
  getPublishedContent(contentId: string): Promise<PublishedMentorContentDetail>
  listMentors(query?: { query?: string }): Promise<PublicMentorView[]>
  getMentor(mentorId: string): Promise<PublicMentorDetail>
}

const LATENCY_MS = 250
const READ_FAILURE_WINDOW_MS = 1500

function createFixtureDiscoverApi(): MentorDiscoverApi {
  const viewerId = currentMentorFixture.mentorId
  const mentors = discoverMentorFixtures.filter((mentor) => mentor.mentorId !== viewerId)
  const mentorById = new Map(mentors.map((mentor) => [mentor.mentorId, mentor]))
  const visible = () =>
    discoverContentFixtures
      .filter((content) => isPubliclyVisible(content) && mentorById.has(content.mentorId))
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  const failingUntil = new Map<string, number>()

  async function read(key: string) {
    const scenario = readFixtureScenario()
    if (scenario === 'loading') return new Promise<never>(() => {})
    const calledAt = Date.now()
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))
    if (scenario !== 'error') return
    const until = failingUntil.get(key) ?? calledAt + READ_FAILURE_WINDOW_MS
    failingUntil.set(key, until)
    if (calledAt < until) throw new MentorApiError(503, 'SERVICE_UNAVAILABLE', '일시적으로 불러오지 못했어요.')
  }

  const isEmpty = () => readFixtureScenario() === 'empty'
  const notFound = (what: string) => new MentorApiError(404, 'NOT_FOUND', `${what}을(를) 찾을 수 없어요.`)
  const matches = (needle: string, ...values: string[]) => values.some((value) => value.toLowerCase().includes(needle))

  return {
    async listPublishedContent(query = {}) {
      await read('discover:content')
      if (isEmpty()) return []
      const needle = query.query?.trim().toLowerCase() ?? ''
      return visible()
        .filter((content) => !query.type || content.type === query.type)
        .filter((content) => !query.tag || content.tags.includes(query.tag))
        .map((content) => toPublishedView(content, mentorById.get(content.mentorId)!))
        .filter((view) => !needle || matches(needle, view.title, view.summary, view.mentor.name, view.mentor.major, ...view.tags))
    },

    async getPublishedContent(contentId) {
      await read(`discover:content:${contentId}`)
      const content = visible().find((item) => item.contentId === contentId)
      if (!content || isEmpty()) throw notFound('콘텐츠')
      return toPublishedDetail(content, mentorById.get(content.mentorId)!)
    },

    async listMentors(query = {}) {
      await read('discover:mentors')
      if (isEmpty()) return []
      const needle = query.query?.trim().toLowerCase() ?? ''
      const published = visible()
      return mentors
        .map((mentor) => toPublicMentorView(mentor, published.filter((content) => content.mentorId === mentor.mentorId).length))
        .filter((mentor) =>
          !needle ||
          matches(needle, mentor.name, mentor.university, mentor.major, mentor.admissionType, mentor.representativeExperience, ...mentor.tags),
        )
    },

    async getMentor(mentorId) {
      await read(`discover:mentor:${mentorId}`)
      const mentor = mentorById.get(mentorId)
      if (!mentor || isEmpty()) throw notFound('멘토')
      const contents = visible().filter((content) => content.mentorId === mentorId)
      return {
        mentor: toPublicMentorView(mentor, contents.length),
        contents: contents.map((content) => toPublishedView(content, mentor)),
      }
    },
  }
}

export const discoverApi: MentorDiscoverApi = createFixtureDiscoverApi()
