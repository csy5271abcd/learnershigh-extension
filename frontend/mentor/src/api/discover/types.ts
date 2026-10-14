// Mentor Discover 공개 Projection Type. (Frontend-only Prototype, api-contract에 Endpoint 없음 → Open Decision)
//
// 다른 Mentor에게는 공개 Profile과 Published Content만 보인다. (mentor-hub.md §5 Mentor Discover)
// 내 Content Model(MentorContentDetail)을 그대로 넘기지 않는다: status / metrics / review / 수정 권한 같은
// 비공개 Field가 우연히 화면에 나가지 않도록 아래 Type에는 그 Field 자체가 없다.

import type { MentorContentBodyByType, MentorContentType } from '../types.ts'

/** 다른 Mentor에게 보이는 Mentor 공개 정보 */
export interface PublicMentorView {
  mentorId: string
  name: string
  university: string
  major: string
  admissionType: string
  highSchoolContext: string
  representativeExperience: string
  verified: boolean
  tags: string[]
  profileImageUrl: string | null
  publishedContentCount: number
}

/** Content 작성자 표시용 (목록 / Detail) */
export type PublicMentorAuthor = Pick<PublicMentorView, 'mentorId' | 'name' | 'university' | 'major' | 'profileImageUrl'>

/** Published Content 목록 항목. 조회 / 저장 / Apply 수, 상태, 검수 정보는 없다. */
export interface PublishedMentorContentView {
  contentId: string
  type: MentorContentType
  title: string
  tags: string[]
  /** 목록 한 줄 요약 */
  summary: string
  /** ISO 8601 */
  publishedAt: string
  mentor: PublicMentorAuthor
}

/** Published Content Detail (읽기 전용 본문 포함) */
export type PublishedMentorContentDetail = PublishedMentorContentView &
  { [T in MentorContentType]: { type: T; body: MentorContentBodyByType[T] } }[MentorContentType]

export interface DiscoverContentQuery {
  type?: MentorContentType
  query?: string
  tag?: string
}

export interface PublicMentorDetail {
  mentor: PublicMentorView
  contents: PublishedMentorContentView[]
}
