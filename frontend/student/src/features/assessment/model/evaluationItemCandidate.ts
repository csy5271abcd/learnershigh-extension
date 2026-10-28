import { getEvaluationPlanAnalysis, requestEvaluationPlanAnalysis } from '../api/evaluationPlansApi.ts'
import type {
  AnalysisSource,
  AnalysisSubject,
  EvaluationAnalysisStatus,
  EvaluationItemRef,
  PerformanceEvaluationItem,
} from '../api/types.ts'
import { mockPdfPolicy } from './pdfImportPolicy.ts'
import { matchSubject } from './pdfImportView.ts'

// 학교 수행평가의 평가계획서 항목 후보 (AUD-015, 2026-10-27 승인).
// §12 상세에는 평가 기준·반영비율·시기가 없어(MM-03·MM-20) evaluationItemRef가 가리키는 §11 분석 결과에서 찾는다.
// 분석 값은 "후보"다. 학교 공식 기준으로 확정하지 않고, AI가 기준을 새로 만들지 않는다 (CLAUDE.md §14).

export type EvaluationItemLookup =
  /** 직접 등록한 과제 (평가계획서 연결 없음) */
  | { kind: 'unlinked' }
  /** 분석이 실패했거나 결과가 없음 (빈 결과와 구분한다) */
  | { kind: 'analysisUnavailable'; status: EvaluationAnalysisStatus }
  /** 분석 결과에 이 과목이 없거나 이 과목만 추출에 실패 */
  | { kind: 'subjectMissing'; extractionFailed: boolean }
  /** 과목은 있으나 항목 키가 없음 */
  | { kind: 'itemMissing' }
  | {
      kind: 'found'
      analysisStatus: EvaluationAnalysisStatus
      subject: AnalysisSubject
      item: PerformanceEvaluationItem
      /** 항목 근거 페이지. 없으면 근거 미확인 */
      source: AnalysisSource | undefined
    }

const maxPolls = 12
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

/**
 * 연결된 평가계획서 분석을 읽는다. 아직 분석하지 않은 공통 문서면 §11 POST로 요청한다
 * (같은 문서의 진행 중·완료 분석이 있으면 서버가 그것을 돌려준다). 진행 중이면 정해진 횟수만 다시 확인한다.
 */
export async function loadEvaluationItemCandidate(
  ref: EvaluationItemRef | null,
  subjectName: string | null,
): Promise<EvaluationItemLookup> {
  if (!ref) return { kind: 'unlinked' }
  let analysis = await getEvaluationPlanAnalysis(ref.documentRevisionId)
  if (analysis.status === 'NOT_REQUESTED') analysis = await requestEvaluationPlanAnalysis(ref.documentRevisionId)
  for (let poll = 0; analysis.status === 'PROCESSING' && poll < maxPolls; poll += 1) {
    await wait(mockPdfPolicy.pollIntervalMs)
    analysis = await getEvaluationPlanAnalysis(ref.documentRevisionId)
  }
  if (analysis.status === 'PROCESSING' || analysis.status === 'FAILED' || analysis.status === 'NOT_REQUESTED' || !analysis.subjects) {
    return { kind: 'analysisUnavailable', status: analysis.status }
  }
  const subject = subjectName
    ? analysis.subjects.find((entry) => matchSubject(entry.subjectName, [{ subjectId: ref.subjectId, name: subjectName }]))
    : undefined
  if (!subject || subject.extractionFailed) return { kind: 'subjectMissing', extractionFailed: Boolean(subject?.extractionFailed) }
  const item = subject.performanceEvaluation?.items.find((entry) => entry.itemKey === ref.itemKey)
  if (!item) return { kind: 'itemMissing' }
  const source =
    item.sourcePdfPageNumber === null ? undefined : subject.sources.find((entry) => entry.pdfPageNumber === item.sourcePdfPageNumber)
  return { kind: 'found', analysisStatus: analysis.status, subject, item, source }
}

/** 분석 상태 문구. REVIEW_REQUIRED는 "확인 필요", COMPLETED도 학교 안내가 우선이라는 점을 함께 쓴다. */
export function candidateStatusLabel(status: EvaluationAnalysisStatus): string {
  return status === 'COMPLETED' ? '평가계획서 분석 결과' : '평가계획서 분석 후보 · 확인 필요'
}

/** 근거 페이지 표시: "PDF 18쪽 (문서 16쪽)" */
export function sourcePageLabel(source: AnalysisSource): string {
  return source.printedPageLabel ? `PDF ${source.pdfPageNumber}쪽 (문서 ${source.printedPageLabel}쪽)` : `PDF ${source.pdfPageNumber}쪽`
}
