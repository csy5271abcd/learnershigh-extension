import type { EvaluationPlanAnalysisView, PlanAnalysisStatus, PlanReviewConfirmRequest, ReviewFieldCandidate } from '../api/types.ts'

// 평가계획서 검토 Workspace의 순수 로직 (화면 없음).
// - 관리자에게 보이는 말: 내부 상태 코드·JSON 경로·분석기 오류 코드를 쉬운 문장으로 바꾼다. 원래 값은 '상세 진단'에서만 보여 주고 서버 데이터는 그대로 둔다.
// - 요약 숫자는 서버가 준 분석 결과에서만 센다(만든 숫자 없음).
// - 확정 요청은 기존 §39 PUT review 계약 그대로 조립한다(검토 조건을 줄이지 않는다).

export type StepId = 'overview' | 'subjects' | 'performance' | 'teaching' | 'confirm'

export const steps: { id: StepId; label: string }[] = [
  { id: 'overview', label: '분석 요약' },
  { id: 'subjects', label: '과목 확인' },
  { id: 'performance', label: '수행평가 검토' },
  { id: 'teaching', label: '월별 운영 계획' },
  { id: 'confirm', label: '최종 확정' },
]

export const analysisStatusText: Record<PlanAnalysisStatus, { label: string; tone?: 'warning' | 'danger' | 'success' | 'primary'; description: string }> = {
  NOT_REQUESTED: { label: '분석 전', description: '아직 분석하지 않은 문서예요.' },
  PROCESSING: { label: '분석 중', tone: 'primary', description: '분석기가 문서를 읽고 있어요.' },
  REVIEW_REQUIRED: { label: '검토 필요', tone: 'warning', description: '분석이 끝났어요. 원문과 대조해 확인해 주세요.' },
  PARTIAL: { label: '일부 항목 확인 필요', tone: 'warning', description: '분석기가 문서의 일부만 읽었어요. 빠진 과목·항목은 원문에서 직접 확인해 주세요.' },
  COMPLETED: { label: '분석 완료', tone: 'success', description: '분석이 끝났어요.' },
  FAILED: { label: '분석 실패', tone: 'danger', description: '분석기가 이 문서에서 평가 정보를 찾지 못했어요. 원문을 직접 확인해 주세요.' },
}

/** 분석기 오류 코드 → 관리자용 문장. 모르는 코드는 일반 문장 + 상세 진단에 원래 코드 */
const analyzerErrorText: Record<string, string> = {
  SUBJECT_SECTION_NOT_FOUND: '일부 과목의 평가정보를 찾지 못했어요.',
  RUBRIC_NOT_LINKED: '채점기준표를 수행평가 항목과 연결하지 못했어요.',
  TABLE_COLUMN_MERGED: '병합된 표 칸을 정확히 읽지 못했어요.',
  NAME_UNREADABLE: '일부 과목·항목 이름을 읽지 못했어요.',
  WEIGHT_SUM_MISMATCH: '반영비율 합계가 100%와 맞지 않아요.',
}

export interface ReviewIssue {
  tone: 'warning' | 'danger'
  title: string
  /** 상세 진단용 원래 값 (분석기 코드·경고 원문) */
  diagnostic: string
  source: '분석기' | '서버 검사'
}

export function issuesOf(warnings: { source: string; message: string }[]): ReviewIssue[] {
  return warnings.map((warning) => {
    if (warning.source === 'ANALYZER_ERROR') {
      return { tone: 'danger', title: analyzerErrorText[warning.message] ?? '분석기가 확인이 필요한 문제를 알렸어요.', diagnostic: warning.message, source: '분석기' }
    }
    return { tone: 'warning', title: warning.message, diagnostic: `${warning.source}: ${warning.message}`, source: warning.source === 'SERVER' ? '서버 검사' : '분석기' }
  })
}

const leafText: Record<string, string> = { weightPercent: '반영비율', maxScore: '만점', timing: '평가 시기', label: '수행평가명' }

/** 확정 fieldPath → 관리자용 이름 (JSON 경로를 그대로 보여 주지 않는다) */
export function fieldName(field: ReviewFieldCandidate, view: EvaluationPlanAnalysisView): string {
  const leaf = field.fieldPath.split('.').pop() ?? ''
  if (field.fieldPath === 'writtenEvaluation.weightPercent') return '지필평가 반영비율'
  if (field.fieldPath === 'performanceEvaluation.weightPercent') return '수행평가 반영비율'
  const exam = /^writtenEvaluation\.exams\[(\d+)]\./.exec(field.fieldPath)
  if (exam) {
    const round = view.subjects[field.subjectIndex]?.writtenEvaluation?.exams[Number(exam[1])]?.round
    return `지필 ${round ?? Number(exam[1]) + 1}차 ${leafText[leaf] ?? leaf}`
  }
  return leafText[leaf] ?? leaf
}

export const fieldUnit = (fieldPath: string) => (fieldPath.endsWith('weightPercent') ? '%' : fieldPath.endsWith('maxScore') ? '점' : '')

export const fieldKey = (field: Pick<ReviewFieldCandidate, 'subjectIndex' | 'fieldPath'>) => `${field.subjectIndex}|${field.fieldPath}`

/** 관리자 검토 결정 (화면 안 상태 — 서버 임시 저장은 없다. 최종 확정 때 PUT review로 저장된다) */
export type Decision = { kind: 'confirmed'; value: string; page: string } | { kind: 'edited'; value: string; page: string } | { kind: 'absent'; page: string }

export function candidateText(value: string | number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

export function displayValue(value: string | number | null | undefined, fieldPath: string): string {
  if (value === null || value === undefined || value === '') return '확인 필요'
  return `${value}${fieldUnit(fieldPath)}`
}

/** 요약 숫자: 서버 분석 결과에서만 센다 */
export function summaryOf(view: EvaluationPlanAnalysisView) {
  const fields = view.reviewFields ?? []
  const items = view.subjects.reduce((sum, subject) => sum + (subject.performanceEvaluation?.items.length ?? 0), 0)
  return {
    subjects: view.subjects.length,
    performanceItems: items,
    reviewFields: fields.length,
    missingCandidates: fields.filter((field) => field.candidate === null).length,
    issues: (view.warnings ?? []).length,
    analyzerErrors: (view.warnings ?? []).filter((warning) => warning.source === 'ANALYZER_ERROR').length,
    // 0.2 계약에는 월별 운영 계획이 없다 → "분석 결과에 없음(계약 대기)". 0으로 세지 않는다
    teachingPlan: 'CONTRACT_PENDING' as const,
  }
}

export interface ConfirmInput {
  view: EvaluationPlanAnalysisView
  decisions: Record<string, Decision>
  subjectIds: Record<number, string>
  hashMatches: boolean
  attested: boolean
  partialAcknowledged: boolean
}

/** 확정할 수 없는 이유 (기존 검토 확정 조건과 같다: 원문 대조·과목 ID·근거 쪽·대조 확인·PARTIAL 확인) */
export function blockersOf({ view, decisions, subjectIds, hashMatches, attested, partialAcknowledged }: ConfirmInput): string[] {
  const blockers: string[] = []
  const fields = (view.reviewFields ?? []).filter((field) => decisions[fieldKey(field)])
  const pageCount = view.revisionFile?.pageCount ?? null
  if (!view.analysisId) blockers.push('저장된 분석 결과가 없어요.')
  if (view.analysisStatus !== 'REVIEW_REQUIRED' && view.analysisStatus !== 'PARTIAL') blockers.push('이 분석 상태에서는 확정할 수 없어요.')
  if (view.reviewStatus === 'CONFIRMED') blockers.push('이미 확정된 문서예요. 다시 확정하는 정책은 아직 정해지지 않았어요.')
  if (!view.revisionFile?.checksum) blockers.push('서버에 원문 지문 정보가 없어 원문 대조를 할 수 없어요.')
  else if (!hashMatches) blockers.push('갖고 있는 학교 원본 파일로 원문이 같은지 확인해 주세요.')
  if (fields.length === 0) blockers.push('확인하거나 수정한 항목이 아직 없어요.')
  for (const index of new Set(fields.map((field) => field.subjectIndex))) {
    if (!(subjectIds[index] ?? '').trim()) blockers.push(`'${view.subjects[index]?.subjectName ?? '과목'}'의 학업 과목을 연결해 주세요.`)
  }
  for (const field of fields) {
    const decision = decisions[fieldKey(field)]
    if (decision.kind === 'absent') continue
    if (field.kind === 'number' && !Number.isFinite(Number(decision.value))) blockers.push(`${field.subjectName} · ${fieldName(field, view)}: 숫자를 입력해 주세요.`)
    const page = Number(decision.page)
    if (!decision.page || !Number.isInteger(page) || page < 1 || (pageCount !== null && page > pageCount)) {
      blockers.push(`${field.subjectName} · ${fieldName(field, view)}: 근거 쪽(1~${pageCount ?? '?'})을 정해 주세요.`)
    }
  }
  if (view.analysisStatus === 'PARTIAL' && !partialAcknowledged) blockers.push('일부만 분석된 결과라는 점을 확인해 주세요.')
  if (!attested) blockers.push('원문과 직접 대조했다는 확인이 필요해요.')
  return blockers
}

/** §39 PUT review 요청 (PDF). 빈 값/원문에 없음 = null (0으로 바꾸지 않는다) */
export function confirmRequestOf(view: EvaluationPlanAnalysisView, decisions: Record<string, Decision>, subjectIds: Record<number, string>): PlanReviewConfirmRequest {
  const fields = (view.reviewFields ?? []).filter((field) => decisions[fieldKey(field)])
  const subjects = [...new Set(fields.map((field) => field.subjectIndex))]
  return {
    analysisId: view.analysisId ?? '',
    decision: 'CONFIRM',
    reviewedSubjects: subjects.map((index) => ({
      subjectId: subjectIds[index].trim(),
      confirmedFields: fields
        .filter((field) => field.subjectIndex === index)
        .map((field) => {
          const decision = decisions[fieldKey(field)]
          if (decision.kind === 'absent') return { fieldPath: field.fieldPath, value: null, pdfPageNumber: decision.page ? Number(decision.page) : null }
          const raw = decision.value.trim()
          const value = raw === '' ? null : field.kind === 'number' ? Number(raw) : raw
          return { fieldPath: field.fieldPath, value, pdfPageNumber: value === null ? (decision.page ? Number(decision.page) : null) : Number(decision.page) }
        }),
    })),
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
