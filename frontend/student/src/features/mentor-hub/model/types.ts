// Student Mentor Hub Home 화면 전용 View Model이다.
// Backend Entity를 복제한 것이 아니며, Field 이름은 docs/api/api-contract.md §20을 따른다.
// API에 연결될 때 Response → View Model 변환은 이 Feature 안에서 처리한다.

export type MentorContentKind = 'plan' | 'routine' | 'story' | 'qna' | 'record' | 'case'

export interface MentorSummary {
  mentorId: string
  name: string
  university: string
  major: string
  admissionType: string
  highSchoolContext: string
  representativeExperience: string
  tags: string[]
  /** Frontend View Model 전용 (API Contract Field 아님). 없거나 Load 실패 시 이름 첫 글자로 대체한다. */
  profileImageUrl?: string
}

export interface MentorContentSummary {
  contentId: string
  kind: MentorContentKind
  title: string
}

export interface RecommendedMentor {
  mentor: MentorSummary
  /** Student Context와 Mentor 경험의 적합성 설명 (대학 순위 기준이 아니다) */
  recommendationReason: string
  relatedContent: MentorContentSummary[]
}

export interface MixedContentItem extends MentorContentSummary {
  summary: string
  mentor: MentorSummary
}

export interface LinkedTask {
  taskId: string
  title: string
}

export interface AdminRecommendedCase {
  caseId: string
  title: string
  mentor: MentorSummary
  relationReason: string
  /** YYYY-MM-DD */
  recommendedDate: string
  linkedTask: LinkedTask
  /** Case에서 볼 수 있는 과정. Case마다 다를 수 있다. */
  processSteps: string[]
}

export interface StudentRecommendationContext {
  displayName: string
  grade: string
  interestField: string
  currentTask?: LinkedTask
  savedContentTags: string[]
}

export interface MentorHubHome {
  studentContext: StudentRecommendationContext
  recommendedMentors: RecommendedMentor[]
  otherMentors: MentorSummary[]
  adminRecommendedCases: AdminRecommendedCase[]
  mixedContent: MixedContentItem[]
}

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error' }
