// Assessment Data Source 스위치 (docs/specs/suyeon/assessment-frontend-mock.md §3).
// VITE_ASSESSMENT_DATA_SOURCE = 'mock' | 'http'. 부록 N2 (2026-11-21): 지정이 없으면 개발 서버·Production Build 모두 http.
// Mock 은 'mock'을 명시했을 때만 쓴다(개발 전용, Production Build 에서는 'mock'을 지정해도 http).
// Stage 2 http Adapter가 아직 없으므로 http에서는 "연결 전" 오류를 돌려준다 (Mock이 배포물에서 조용히 실행되지 않게 한다).
export type AssessmentDataSource = 'mock' | 'http'

// 부록 O: 빌드 시점에 정해지는 상수식으로 둔다 — Production Build 에서는 import.meta.env.DEV=false 라 false 로 접혀
// Mock 분기·Mock Adapter 가 운영 번들에서 빠진다(함수 호출 결과로 두면 접히지 않아 Mock 코드가 남았다).
export const isMockDataSource: boolean = import.meta.env.DEV && import.meta.env.VITE_ASSESSMENT_DATA_SOURCE === 'mock'

export const assessmentDataSource: AssessmentDataSource = isMockDataSource ? 'mock' : 'http'
