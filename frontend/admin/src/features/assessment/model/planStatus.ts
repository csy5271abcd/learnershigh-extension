import type { AdminEvaluationPlan, AdminEvaluationPlanRevision } from '../api/types.ts'

// A27-UX 평가계획서 업무 상태 (화면 표시용 View Model). 서버 값만으로 정한다:
// analysisStatus(NOT_REQUESTED·PROCESSING·REVIEW_REQUIRED·PARTIAL·COMPLETED·FAILED) + reviewStatus(UNREVIEWED·CONFIRMED)
// + 공유 검토 초안의 결정 수(있을 때만 '검토 중'으로 구분).
// 현재 도메인에서 '확정' = 확정값이 학생에게 공개됨(§10-1, OD-A08). '확정했지만 비공개' 상태는 서버에 없어 만들지 않는다.
export type PlanStage = 'NOT_ANALYZED' | 'ANALYZING' | 'ANALYSIS_FAILED' | 'ANALYZED' | 'REVIEWING' | 'REVIEW_DONE' | 'CONFIRMED'

export const stageLabel: Record<PlanStage, string> = {
  NOT_ANALYZED: '분석 전',
  ANALYZING: '분석 중',
  ANALYSIS_FAILED: '분석 실패',
  ANALYZED: 'AI 결과 · 검토 전',
  REVIEWING: '검토 중',
  REVIEW_DONE: '검토 완료 · 미확정',
  CONFIRMED: '확정 완료 · 학생 공개',
}

export const stageFilterOrder: PlanStage[] = ['NOT_ANALYZED', 'ANALYZED', 'REVIEWING', 'REVIEW_DONE', 'CONFIRMED', 'ANALYSIS_FAILED']

/** draft: 공유 검토 초안의 결정 수·검토 대상 수 (모르면 undefined → '검토 중'을 구분하지 않는다) */
export function planStage(revision: AdminEvaluationPlanRevision, draft?: { decided: number; total: number } | null): PlanStage {
  if (revision.reviewStatus === 'CONFIRMED') return 'CONFIRMED'
  switch (revision.analysisStatus) {
    case 'NOT_REQUESTED':
      return 'NOT_ANALYZED'
    case 'PROCESSING':
      return 'ANALYZING'
    case 'FAILED':
      return 'ANALYSIS_FAILED'
    default:
      if (draft && draft.total > 0 && draft.decided >= draft.total) return 'REVIEW_DONE'
      if (draft && draft.decided > 0) return 'REVIEWING'
      return 'ANALYZED'
  }
}

export const latestRevision = (plan: AdminEvaluationPlan) => plan.revisions[plan.revisions.length - 1]

/** 결과 조회 화면이 열 수 있는 상태(분석 결과가 저장된 뒤) */
export const hasAnalysisResult = (revision: AdminEvaluationPlanRevision) =>
  revision.analysisStatus === 'REVIEW_REQUIRED' || revision.analysisStatus === 'PARTIAL' || revision.analysisStatus === 'COMPLETED' || revision.reviewStatus === 'CONFIRMED'
