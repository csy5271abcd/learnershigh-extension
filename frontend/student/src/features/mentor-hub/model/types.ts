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

// ---------- Mentor Profile (GET /api/student/mentors/{mentorId} 기준 View Model) ----------

/** Profile Content Tab 유형. Q&A는 MentorContent 유형이 아니므로 제외한다. (domain.md §29) */
export type MentorProfileContentKind = Exclude<MentorContentKind, 'qna'>

export interface MentorProfileContent extends MentorContentSummary {
  kind: MentorProfileContentKind
  summary: string
  /** 현재 Student에게 Admin이 추천한 Case인지 (Home의 Admin 추천 Case와 같은 근거) */
  adminRecommended: boolean
}

export interface SchoolGradeTerm {
  term: string
  averageGrade: number
}

export interface CsatSubjectScore {
  area: string
  subject: string
  grade: number
  /** 절대평가 과목은 백분위가 없다. */
  percentile: number | null
}

/** UI 전용 View Model (API Contract에 아직 정의되지 않음) */
export interface MentorScoreSummary {
  note?: string
  schoolGrades?: {
    scaleLabel: string
    terms: SchoolGradeTerm[]
  }
  csat?: {
    basisLabel: string
    subjects: CsatSubjectScore[]
    minimumRequirement?: string
  }
}

export interface MentorExperience {
  title: string
  description: string
}

export interface MentorProfile {
  mentor: MentorSummary
  verified: boolean
  scoreSummary?: MentorScoreSummary
  experiences: MentorExperience[]
  contents: MentorProfileContent[]
}

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error' }
