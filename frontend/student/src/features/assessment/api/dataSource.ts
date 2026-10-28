// Assessment Data Source 스위치 (docs/specs/suyeon/assessment-frontend-mock.md §3).
// VITE_ASSESSMENT_DATA_SOURCE = 'mock' | 'http'. 지정이 없으면 개발 서버는 mock, Production Build는 http.
// Stage 2 http Adapter가 아직 없으므로 http에서는 "연결 전" 오류를 돌려준다 (Mock이 배포물에서 조용히 실행되지 않게 한다).
export type AssessmentDataSource = 'mock' | 'http'

function resolveDataSource(): AssessmentDataSource {
  const configured = import.meta.env.VITE_ASSESSMENT_DATA_SOURCE
  if (configured === 'mock' || configured === 'http') return configured
  return import.meta.env.DEV ? 'mock' : 'http'
}

export const assessmentDataSource: AssessmentDataSource = resolveDataSource()

export const isMockDataSource = assessmentDataSource === 'mock'
