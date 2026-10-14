import { createFixtureMentorApi } from './fixture/fixtureMentorApi.ts'
import type {
  MentorAnswerRequest,
  MentorContentCreateRequest,
  MentorContentDetail,
  MentorContentListItem,
  MentorContentListQuery,
  MentorContentUpdateRequest,
  MentorProfile,
  MentorProfileUpdateRequest,
  MentorQuestion,
  MentorQuestionListQuery,
  PageResult,
} from './types.ts'

export { isNotFoundError, MentorApiError } from './errors.ts'

/**
 * Mentor Surface Data Boundary. 메서드 하나가 /api/mentor/** Endpoint 하나에 대응한다. (api-contract §62 Mentor)
 * 화면은 fetch를 직접 쓰지 않고 이 Interface만 쓴다. Backend가 생기면 HTTP 구현으로 바꾼다.
 */
export interface MentorApi {
  /** GET /api/mentor/content */
  listContent(query?: MentorContentListQuery): Promise<PageResult<MentorContentListItem>>
  /** GET /api/mentor/content/{contentId} */
  getContent(contentId: string): Promise<MentorContentDetail>
  /** POST /api/mentor/content (항상 Draft로 만든다) */
  createContent(request: MentorContentCreateRequest): Promise<MentorContentDetail>
  /** PATCH /api/mentor/content/{contentId} */
  updateContent(contentId: string, request: MentorContentUpdateRequest): Promise<MentorContentDetail>
  /** POST /api/mentor/content/{contentId}/publish */
  publishContent(contentId: string): Promise<MentorContentDetail>

  /** GET /api/mentor/questions */
  listQuestions(query?: MentorQuestionListQuery): Promise<PageResult<MentorQuestion>>
  /** GET /api/mentor/questions/{questionId} */
  getQuestion(questionId: string): Promise<MentorQuestion>
  /** POST /api/mentor/questions/{questionId}/answer */
  answerQuestion(questionId: string, request: MentorAnswerRequest): Promise<MentorQuestion>

  /** GET /api/mentor/profile */
  getProfile(): Promise<MentorProfile>
  /** PATCH /api/mentor/profile */
  updateProfile(request: MentorProfileUpdateRequest): Promise<MentorProfile>
}

// Backend / 인증(OD-10)이 없어 Fixture Adapter를 Data Source로 쓴다.
export const mentorApi: MentorApi = createFixtureMentorApi()
