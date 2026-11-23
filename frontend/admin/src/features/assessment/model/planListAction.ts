import type { PlanStage } from './planStatus.ts'

// A28-39·40 (2026-11-23 사용자 결정): 분석 목록의 문서당 주 CTA는 하나.
// - 분석 전 → '검토 시작'(실제 분석 요청 → 성공하면 검토 화면). 자동 분석 ≠ 자동 승인: 학생 공개는 여전히 관리자의 '최종 승인' 한 번.
// - 분석 실패 → '다시 분석'(원인은 상태 칸·알림). 성공해야만 검토 화면으로 간다.
// - 분석 중(서버 처리 중 · 이 화면에서 요청 중) → 누를 수 없는 '분석 중…'.
// - 분석 결과 있음 · 미확정 → '검토 시작'/'검토 이어하기'(다시 분석하지 않고 최신 분석 결과로 검토 화면).
// - 확정 완료 → '확정 결과'(확정값·이력 화면. 새 분석·수정은 그 화면 머리의 '다시 분석'·'확정 내용 수정'에서만).
// 미확정 AI 결과를 '확정 결과'라고 부르지 않는다.
export type PlanListAction =
  | { kind: 'analyze-then-review'; label: '검토 시작' }
  | { kind: 'retry-analysis'; label: '다시 분석' }
  | { kind: 'analyzing'; label: '분석 중…' }
  | { kind: 'review'; label: '검토 시작' | '검토 이어하기' }
  | { kind: 'result'; label: '확정 결과' }

export function planListAction(stage: PlanStage, requesting: boolean): PlanListAction {
  if (requesting || stage === 'ANALYZING') return { kind: 'analyzing', label: '분석 중…' }
  switch (stage) {
    case 'NOT_ANALYZED':
      return { kind: 'analyze-then-review', label: '검토 시작' }
    case 'ANALYSIS_FAILED':
      return { kind: 'retry-analysis', label: '다시 분석' }
    case 'CONFIRMED':
      return { kind: 'result', label: '확정 결과' }
    case 'REVIEWING':
    case 'REVIEW_DONE':
      return { kind: 'review', label: '검토 이어하기' }
    default:
      return { kind: 'review', label: '검토 시작' }
  }
}

/** 분석 요청 뒤 검토 화면으로 갈지: 분석이 저장됐고 실패가 아닐 때만(실패한 문서를 검토 가능한 척하지 않는다) */
export const reviewAfterAnalysis = (status: string | null | undefined) => status === 'REVIEW_REQUIRED' || status === 'PARTIAL' || status === 'COMPLETED'
