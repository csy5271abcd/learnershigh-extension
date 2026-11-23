import type { EvaluationPlanAnalysisView, PlanAnalysisStatus, PlanReviewConfirmRequest, ReviewFieldCandidate, SubjectExclusionReason } from '../api/types.ts'

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
  /** A12 재검토 중(확정된 문서의 초안이 다시 열림) */
  reReview?: boolean
}

// ---- A12 채점기준 수동 보완: 항목 하나의 채점표 전체를 관리자 값으로 확정한다(분석 후보는 그대로) ----
export const RUBRIC_PATH = /^performanceEvaluation\.items\[(0|[1-9]\d{0,2})]\.rubric$/
export const rubricFieldPath = (itemIndex: number) => `performanceEvaluation.items[${itemIndex}].rubric`
/** A15: maxScore = 요소 배점(선택). 수준 점수(levels[].score)와 다르다 */
export type RubricCriterion = { element: string; levels: { description: string; score: number | null }[]; maxScore?: number | null }

/** A15 §39-12 과목 학년 문맥: 원문 근거 학년이 있는데 문서 학년이 없으면 확정할 수 없다(서버 grade_conflict) */
export const gradeText = (grades: number[] | null | undefined) => (grades && grades.length ? `${grades.join('·')}학년` : null)
export const gradeConflict = (grades: number[] | null | undefined, documentGrade: number | undefined) =>
  Boolean(grades && grades.length && documentGrade !== undefined && !grades.includes(documentGrade))

/** 저장된 결정 값(JSON 글자) → 채점표. 모양이 맞지 않으면 null */
export function parseRubric(value: string | undefined | null): RubricCriterion[] | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return null
    return parsed.map((item) => ({
      element: String((item as RubricCriterion).element ?? ''),
      levels: ((item as RubricCriterion).levels ?? []).map((level) => ({ description: String(level.description ?? ''), score: typeof level.score === 'number' ? level.score : null })),
      ...(typeof (item as RubricCriterion).maxScore === 'number' ? { maxScore: (item as RubricCriterion).maxScore } : {}),
    }))
  } catch {
    return null
  }
}

/** 화면에서 쓰는 채점표 검사(서버 rubric_shape 규칙과 같다) */
export function rubricProblem(rubric: RubricCriterion[] | null): string | null {
  if (!rubric || rubric.length === 0) return '채점 요소를 하나 이상 입력해 주세요.'
  if (rubric.length > 30) return '채점 요소는 30개까지예요.'
  for (const criterion of rubric) {
    if (!criterion.element.trim()) return '채점 요소 이름을 입력해 주세요.'
    if (criterion.levels.length > 10) return '수준은 요소마다 10개까지예요.'
    if (typeof criterion.maxScore === 'number' && (!Number.isFinite(criterion.maxScore) || criterion.maxScore < 0 || criterion.maxScore > 1000)) return `'${criterion.element}'의 요소 배점은 0~1000 사이여야 해요.`
    for (const level of criterion.levels) {
      if (!level.description.trim()) return `'${criterion.element}'의 수준 기준을 입력해 주세요.`
      if (level.score !== null && (level.score < 0 || level.score > 1000)) return `'${criterion.element}'의 점수는 0~1000 사이여야 해요.`
    }
  }
  return null
}

/** 결정 중 채점표 보완만 (subjectIndex, fieldPath, decision) */
export function rubricDecisions(decisions: Record<string, Decision>): { subjectIndex: number; fieldPath: string; decision: Decision }[] {
  return Object.entries(decisions)
    .map(([key, decision]) => ({ subjectIndex: Number(key.slice(0, key.indexOf('|'))), fieldPath: key.slice(key.indexOf('|') + 1), decision }))
    .filter((entry) => RUBRIC_PATH.test(entry.fieldPath))
}

/** 확정할 수 없는 이유 (기존 검토 확정 조건과 같다: 원문 대조·과목 ID·근거 쪽·대조 확인·PARTIAL 확인) */
export function blockersOf({ view, decisions, subjectIds, hashMatches, attested, partialAcknowledged, reReview = false }: ConfirmInput): string[] {
  const blockers: string[] = []
  const fields = (view.reviewFields ?? []).filter((field) => decisions[fieldKey(field)])
  const rubrics = rubricDecisions(decisions)
  const pageCount = view.revisionFile?.pageCount ?? null
  if (!view.analysisId) blockers.push('저장된 분석 결과가 없어요.')
  if (view.analysisStatus !== 'REVIEW_REQUIRED' && view.analysisStatus !== 'PARTIAL') blockers.push('이 분석 상태에서는 확정할 수 없어요.')
  if (view.reviewStatus === 'CONFIRMED' && !reReview) blockers.push('이미 확정된 문서예요. 고치려면 먼저 재검토를 시작해 주세요.')
  if (!view.revisionFile?.checksum) blockers.push('서버에 원문 지문 정보가 없어 원문 대조를 할 수 없어요.')
  else if (!hashMatches) blockers.push('갖고 있는 학교 원본 파일로 원문이 같은지 확인해 주세요.')
  if (fields.length === 0 && rubrics.length === 0) blockers.push('확인하거나 수정한 항목이 아직 없어요.')
  for (const rubric of rubrics) {
    const subjectName = view.subjects[rubric.subjectIndex]?.subjectName ?? '과목'
    if (rubric.decision.kind !== 'edited') continue
    const problem = rubricProblem(parseRubric(rubric.decision.value))
    if (problem) blockers.push(`${subjectName} · 채점기준: ${problem}`)
    const page = Number(rubric.decision.page)
    if (!rubric.decision.page || !Number.isInteger(page) || page < 1 || (pageCount !== null && page > pageCount)) blockers.push(`${subjectName} · 채점기준: 근거 쪽(1~${pageCount ?? '?'})을 정해 주세요.`)
  }
  for (const index of new Set([...fields.map((field) => field.subjectIndex), ...rubrics.map((rubric) => rubric.subjectIndex)])) {
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

type ConfirmedFieldRequest = PlanReviewConfirmRequest['reviewedSubjects'][number]['confirmedFields'][number]

/** §39 PUT review 요청 (PDF). 빈 값/원문에 없음 = null (0으로 바꾸지 않는다). 분석 과목 번호 포함(A11) */
export function confirmRequestOf(view: EvaluationPlanAnalysisView, decisions: Record<string, Decision>, subjectIds: Record<number, string>): PlanReviewConfirmRequest {
  const fields = (view.reviewFields ?? []).filter((field) => decisions[fieldKey(field)])
  const rubrics = rubricDecisions(decisions).filter((rubric) => rubric.decision.kind === 'edited')
  const subjects = [...new Set([...fields.map((field) => field.subjectIndex), ...rubrics.map((rubric) => rubric.subjectIndex)])]
  return {
    analysisId: view.analysisId ?? '',
    decision: 'CONFIRM',
    reviewedSubjects: subjects.map((index) => ({
      subjectId: subjectIds[index].trim(),
      // A11: 관리자가 연결한 분석 과목 번호를 함께 확정한다(§39-7). 다과목 문서에서 초안이 닫혀도 과목 연결이 확정값에 남는다
      analysisSubjectIndex: index,
      confirmedFields: [
        ...fields
          .filter((field) => field.subjectIndex === index)
          .map((field): ConfirmedFieldRequest => {
            const decision = decisions[fieldKey(field)]
            if (decision.kind === 'absent') return { fieldPath: field.fieldPath, value: null, pdfPageNumber: decision.page ? Number(decision.page) : null }
            const raw = decision.value.trim()
            const value = raw === '' ? null : field.kind === 'number' ? Number(raw) : raw
            return { fieldPath: field.fieldPath, value, pdfPageNumber: value === null ? (decision.page ? Number(decision.page) : null) : Number(decision.page) }
          }),
        // A12 채점기준 수동 보완: 채점표 전체(JSON 배열)를 값으로 확정
        ...rubrics
          .filter((rubric) => rubric.subjectIndex === index)
          .map((rubric): ConfirmedFieldRequest => ({
            fieldPath: rubric.fieldPath,
            value: rubric.decision.kind === 'edited' ? parseRubric(rubric.decision.value) : null,
            pdfPageNumber: Number(rubric.decision.page),
          })),
      ],
    })),
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

/**
 * A27-UX: 확정된 평가 정보에서 분석 과목 → 학업 과목 연결 (api-contract A10 규칙과 같다).
 * ① 확정값의 analysisSubjectIndex ② (번호 없는 기록) 분석 과목 1개 + 확정 과목 1개일 때만 그 둘. 그 밖에는 추정하지 않는다.
 */
export function confirmedSubjectLinks(view: EvaluationPlanAnalysisView): Record<number, string> {
  const links: Record<number, string> = {}
  for (const field of view.confirmedFields) {
    if (typeof field.analysisSubjectIndex === 'number' && field.subjectId && !links[field.analysisSubjectIndex]) links[field.analysisSubjectIndex] = field.subjectId
  }
  const unindexed = [...new Set(view.confirmedFields.filter((field) => typeof field.analysisSubjectIndex !== 'number').flatMap((field) => (field.subjectId ? [field.subjectId] : [])))]
  if (Object.keys(links).length === 0 && view.subjects.length === 1 && unindexed.length === 1) links[0] = unindexed[0]
  return links
}

/** A27-UX 과목 제외: 제외한 분석 과목 번호 집합 */
export function excludedSet(exclusions: Record<number, unknown>): Set<number> {
  return new Set(Object.keys(exclusions).map(Number))
}

/** 제외한 과목의 결정을 뺀 '유효 결정'. 초안에는 결정이 그대로 남는다(복원하면 돌아온다) */
export function withoutExcluded(decisions: Record<string, Decision>, excluded: ReadonlySet<number>): Record<string, Decision> {
  if (excluded.size === 0) return decisions
  return Object.fromEntries(Object.entries(decisions).filter(([key]) => !excluded.has(Number(key.slice(0, key.indexOf('|'))))))
}

export const exclusionReasonLabel: Record<SubjectExclusionReason, string> = {
  OTHER_GRADE: '다른 학년 과목',
  DUPLICATE: '중복 추출',
  NOT_THIS_TERM: '현재 학기와 무관',
  OTHER: '기타',
}
