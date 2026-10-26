import { createContext, useContext } from 'react'
import type { AcademicContext, AcademicTermQuery, SchoolAssessment } from '../api/types.ts'
import type { QueryResult } from './useApiQuery.ts'

export interface AcademicTerms {
  /** §9-1 Query 생략 시 돌려받은 현재 학기 */
  currentTerm: AcademicTermQuery
  /** 선택 후보 학기의 §9-1 응답 (조회에 실패한 다른 학기는 제외하고 failedTerms에 남긴다) */
  contexts: AcademicContext[]
  failedTerms: AcademicTermQuery[]
}

export interface TermAssessments {
  items: SchoolAssessment[]
  totalElements: number
}

// Assessment 화면 공통 맥락: 선택 학기, 해당 학기 학업 정보, 데이터 변경 알림.
// Provider는 AssessmentLayout이다. Domain 데이터는 API 결과만 담고 화면에서 따로 복제하지 않는다.
export interface AssessmentWorkspace {
  terms: QueryResult<AcademicTerms>
  selectedTerm: AcademicTermQuery | undefined
  selectTerm: (term: AcademicTermQuery) => void
  /** 선택 학기의 §9-1 응답 */
  selectedContext: AcademicContext | undefined
  /** 선택 학기 전체 수행평가 (메뉴 건수 계산용, §12 목록 응답) */
  termAssessments: QueryResult<TermAssessments>
  /** 생성·상태 변경 등 Mutation 뒤 관련 조회를 다시 하도록 올리는 값 */
  dataVersion: number
  notifyDataChanged: () => void
}

export const AssessmentWorkspaceContext = createContext<AssessmentWorkspace | null>(null)

export function useAssessmentWorkspace(): AssessmentWorkspace {
  const workspace = useContext(AssessmentWorkspaceContext)
  if (!workspace) throw new Error('useAssessmentWorkspace는 AssessmentLayout 안에서만 사용한다.')
  return workspace
}
