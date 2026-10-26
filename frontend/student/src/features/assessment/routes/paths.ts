// Assessment Route (Extension Student App 내부 경로. 기존 LearnersHigh URL이 아니다).
// assessment-screen-map.md의 Route 제안을 따른다.

export const assessmentPath = '/assessment'
export const assessmentRoutePattern = 'assessment'

export const schoolAssessmentsPath = '/assessment/school-assessments'
export const schoolAssessmentDetailPath = (assessmentId: string) =>
  `${schoolAssessmentsPath}/${encodeURIComponent(assessmentId)}`
export const academicInfoPath = '/assessment/academic-info'

/** 과목별 목록은 같은 목록에 과목 필터를 적용한 것이다 (assessment-student.md §6). */
export const subjectAssessmentsPath = (subjectId: string) =>
  `${schoolAssessmentsPath}?subject=${encodeURIComponent(subjectId)}`

/** 상세를 피드백 탭이 열린 상태로 연다 (선생님 피드백 목록 → 과제 복귀) */
export const schoolAssessmentFeedbackPath = (assessmentId: string) =>
  `${schoolAssessmentDetailPath(assessmentId)}?panel=feedback`

/** 선생님 피드백 목록 (screen-map S15). 필터는 `?status=PENDING|DELIVERED` */
export const feedbackPath = '/assessment/feedback'
export const feedbackSection = { path: feedbackPath, label: '선생님 피드백' } as const

/** 이번 범위에서 아직 구현하지 않은 Assessment 메뉴 */
export const pendingAssessmentSections = {
  enrichment: { path: '/assessment/enrichment', label: '심화 탐구' },
  resources: { path: '/assessment/resources', label: '자료함' },
  growth: { path: '/assessment/growth', label: '성장 기록' },
  archive: { path: '/assessment/archive', label: '보관함' },
  tips: { path: '/assessment/tips', label: '수행평가 꿀팁' },
} as const
