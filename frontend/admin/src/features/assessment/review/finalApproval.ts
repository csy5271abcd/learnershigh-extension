// A28-05 원클릭 최종 승인 계획(순수 함수 · 서버 상태를 바꾸지 않는다). PDF·HWP·HWPX 공통.
// - AI 추출값은 기본 승인으로 넣는다. 관리자 결정(수정·원문에 없음·직접 확인)이 있으면 그것이 우선이다.
// - 원문에 없는 값을 만들지 않는다: 값이 없거나 원문 근거(PDF 쪽 · HWP·HWPX 위치)가 없는 AI 항목은 확정에서 빼고 경고로 알린다.
//   (개별 검토 버튼을 누르지 않았다는 이유로는 막지 않는다)
// - 과목 연결: 관리자가 고른 연결이 우선, 없으면 '분석 과목명 = 이 문서 슬롯 학업 과목명'이 정확히 하나일 때만 기본 연결한다.
//   연결할 수 없는 과목·원문상 다른 학년 과목·제외한 과목은 확정에서 빠진다(경고). 서버가 같은 검사를 다시 한다.
// - 무결성 오류(분석 결과 없음·확정 불가 상태·재검토 미시작·승인할 값 0)는 막는다(blockers).
// A28-08 통합 최종 승인: 같은 분석 결과의 월별 운영계획도 한 요청(teachingPlan)으로 함께 확정한다(서버 한 Transaction —
//   하나라도 거절되면 모두 0건). 운영계획은 확정할 수 있는 과목(위 과목 연결 규칙)의 원문 근거가 있는 행만 기본 승인하고,
//   운영계획 초안의 관리자 결정(수정·제외)이 우선이다. 평가 정보가 이미 확정됐고 운영계획만 남았으면 운영계획만 승인한다.
import type { EvaluationPlanAnalysisView, PlanReviewConfirmRequest, ReviewFieldCandidate, TeachingPlanEdits, TeachingPlanReviewRequest } from '../api/types.ts'
import { fieldKey, gradeConflict, type Decision } from './reviewModel.ts'

type ConfirmedField = PlanReviewConfirmRequest['reviewedSubjects'][number]['confirmedFields'][number]

export interface SlotSubject {
  subjectId: string
  name: string
}

export interface FinalApprovalPlan {
  request: PlanReviewConfirmRequest | null
  /** 실제로 보낼 과목 연결(관리자 연결 + 기본 연결) */
  links: Record<number, string>
  autoLinked: number[]
  counts: {
    /** 제외 과목 뺀 AI 추출 항목 */
    total: number
    /** 최종 승인에 들어가는 항목 */
    approved: number
    defaulted: number
    edited: number
    confirmed: number
    absent: number
    /** 값·근거 없어 확정에서 빠진 AI 항목 */
    skippedNoEvidence: number
    /** 과목 연결 실패·다른 학년 과목으로 빠진 항목 */
    skippedSubject: number
    /** 관리자가 제외한 과목의 항목 */
    excludedFields: number
  }
  unlinkedSubjects: string[]
  gradeConflictSubjects: string[]
  warnings: string[]
  blockers: string[]
  /** A28-08 유형별 집계(승인 예정·확정에서 빠짐). 지필 = writtenEvaluation.*, 수행 = 그 밖 평가 항목 */
  byType: {
    performance: { approved: number; skipped: number }
    written: { approved: number; skipped: number }
    teaching: { approved: number; excluded: number; skipped: number; state: TeachingState }
  }
  /** 평가 정보는 이미 확정됐고 운영계획만 남았을 때 보낼 운영계획 확정 요청(PUT teaching-plan-review) */
  teachingOnlyRequest: TeachingPlanReviewRequest | null
}

/** 운영계획 확정 상태: 불러오는 중 · 확정 전 · 이미 확정(재검토 안 열림) · 재검토 중 · 조회 실패 · 운영계획 후보 없음 */
export type TeachingState = 'loading' | 'open' | 'confirmed' | 'reopened' | 'error' | 'none'

export interface TeachingInput {
  /** 운영계획 확정 기록 조회 결과: null = 불러오는 중, 'error' = 실패 */
  status: { confirmed: boolean; reopened: boolean } | null | 'error'
  /** 운영계획 공유 초안의 관리자 결정 (키 `${subjectIndex}|teachingPlan[${rowIndex}]`) */
  decisions: Record<string, Decision>
}

const norm = (value: string) => value.replace(/\s+/g, '').replace(/[ⅠⅡ]/g, (c) => (c === 'Ⅰ' ? 'I' : 'II')).toLowerCase()

function evidenceOf(field: ReviewFieldCandidate, structured: boolean): boolean {
  return structured ? field.documentLocators.length > 0 : field.sourcePages.length > 0
}

export function finalApprovalPlan(input: {
  view: EvaluationPlanAnalysisView
  decisions: Record<string, Decision>
  adminLinks: Record<number, string>
  excluded: ReadonlySet<number>
  slotSubjects: readonly SlotSubject[] | null
  reReview: boolean
  /** 학교알리미 공식 수집 원본이면 서버 원본 검증으로 보낸다(관리자 파일 재선택 없음) */
  serverOriginal: boolean
  expectedDraftVersion: number | null
  /** A28-08: 없으면 운영계획은 다루지 않는다(이전 동작) */
  teaching?: TeachingInput
}): FinalApprovalPlan {
  const { view, decisions, adminLinks, excluded, slotSubjects, reReview, serverOriginal, expectedDraftVersion, teaching } = input
  const structured = (view.revisionFile?.documentFormat ?? 'PDF') !== 'PDF'
  const fields = view.reviewFields ?? []
  const blockers: string[] = []
  const warnings: string[] = []
  if (!view.analysisId) blockers.push('저장된 분석 결과가 없어요.')
  if (view.analysisStatus !== 'REVIEW_REQUIRED' && view.analysisStatus !== 'PARTIAL') blockers.push('이 분석 상태에서는 승인할 수 없어요.')
  const evaluationLocked = view.reviewStatus === 'CONFIRMED' && !reReview
  if (!serverOriginal) blockers.push('학교알리미에서 자동 수집한 원본이 아니라 서버 원본 검증을 할 수 없어요. 단계별 확정을 사용해 주세요.')

  // 과목 연결: 관리자 연결 → 이름이 정확히 하나 같은 학업 과목
  const links: Record<number, string> = {}
  const autoLinked: number[] = []
  const unlinkedSubjects: string[] = []
  const gradeConflictSubjects: string[] = []
  const usable = new Set<number>()
  view.subjects.forEach((subject, index) => {
    if (excluded.has(index)) return
    if (gradeConflict(view.subjectGrades?.[index], view.slot?.grade)) {
      gradeConflictSubjects.push(subject.subjectName)
      return
    }
    const chosen = (adminLinks[index] ?? '').trim()
    if (chosen) {
      links[index] = chosen
      usable.add(index)
      return
    }
    const same = (slotSubjects ?? []).filter((item) => norm(item.name) === norm(subject.subjectName))
    if (same.length === 1) {
      links[index] = same[0].subjectId
      autoLinked.push(index)
      usable.add(index)
    } else {
      unlinkedSubjects.push(subject.subjectName)
    }
  })

  const typeOf = (fieldPath: string): 'written' | 'performance' => (fieldPath.startsWith('writtenEvaluation') ? 'written' : 'performance')
  const byType: FinalApprovalPlan['byType'] = {
    performance: { approved: 0, skipped: 0 },
    written: { approved: 0, skipped: 0 },
    teaching: { approved: 0, excluded: 0, skipped: 0, state: 'none' },
  }
  const counts = { total: 0, approved: 0, defaulted: 0, edited: 0, confirmed: 0, absent: 0, skippedNoEvidence: 0, skippedSubject: 0, excludedFields: 0 }
  const bySubject = new Map<number, ConfirmedField[]>()
  for (const field of fields) {
    if (excluded.has(field.subjectIndex)) {
      counts.excludedFields += 1
      continue
    }
    counts.total += 1
    if (!usable.has(field.subjectIndex)) {
      counts.skippedSubject += 1
      byType[typeOf(field.fieldPath)].skipped += 1
      continue
    }
    const decision = decisions[fieldKey(field)]
    let out: ConfirmedField | null = null
    if (decision) {
      if (decision.kind === 'absent') {
        out = structured
          ? { fieldPath: field.fieldPath, value: null, pdfPageNumber: null, documentLocator: field.documentLocators[0], absence: 'NOT_IN_SOURCE' }
          : { fieldPath: field.fieldPath, value: null, pdfPageNumber: decision.page ? Number(decision.page) : null }
        if (structured && !field.documentLocators[0]) out = null
        if (out) counts.absent += 1
      } else {
        const raw = decision.value.trim()
        const value = raw === '' ? null : field.kind === 'number' ? Number(raw) : raw
        out = structured
          ? field.documentLocators[0]
            ? { fieldPath: field.fieldPath, value, pdfPageNumber: null, documentLocator: field.documentLocators[0], ...(value === null ? { absence: 'NOT_IN_SOURCE' as const } : {}) }
            : null
          : { fieldPath: field.fieldPath, value, pdfPageNumber: decision.page ? Number(decision.page) : field.sourcePages[0] ?? null }
        if (out && value !== null && !structured && out.pdfPageNumber === null) out = null
        if (out) counts[decision.kind === 'edited' ? 'edited' : 'confirmed'] += 1
      }
      if (!out) {
        counts.skippedNoEvidence += 1
        byType[typeOf(field.fieldPath)].skipped += 1
      }
    } else {
      const candidate = field.candidate === null || field.candidate === undefined ? '' : String(field.candidate).trim()
      if (candidate === '' || !evidenceOf(field, structured)) {
        counts.skippedNoEvidence += 1
        byType[typeOf(field.fieldPath)].skipped += 1
        continue
      }
      const value = field.kind === 'number' ? Number(candidate) : candidate
      if (field.kind === 'number' && !Number.isFinite(value as number)) {
        counts.skippedNoEvidence += 1
        byType[typeOf(field.fieldPath)].skipped += 1
        continue
      }
      out = structured
        ? { fieldPath: field.fieldPath, value, pdfPageNumber: null, documentLocator: field.documentLocators[0] }
        : { fieldPath: field.fieldPath, value, pdfPageNumber: field.sourcePages[0] }
      counts.defaulted += 1
    }
    if (out) {
      counts.approved += 1
      byType[typeOf(field.fieldPath)].approved += 1
      bySubject.set(field.subjectIndex, [...(bySubject.get(field.subjectIndex) ?? []), out])
    }
  }

  if (counts.skippedNoEvidence > 0) warnings.push(`값이나 원문 근거가 없는 항목 ${counts.skippedNoEvidence}개는 만들어 넣지 않고 확정에서 빼요(학생 비공개).`)
  if (unlinkedSubjects.length > 0) warnings.push(`학업 과목과 이름이 맞지 않는 과목 ${unlinkedSubjects.length}개(${unlinkedSubjects.slice(0, 4).join(', ')}${unlinkedSubjects.length > 4 ? ' 외' : ''})는 확정에서 빼요. 함께 확정하려면 '과목 확인'에서 연결해 주세요.`)
  if (gradeConflictSubjects.length > 0) warnings.push(`원문상 이 문서 학년이 아닌 과목 ${gradeConflictSubjects.length}개는 확정하지 않아요.`)
  if (view.analysisStatus === 'PARTIAL') warnings.push('일부만 분석된 결과예요. 분석된 과목·항목만 확정돼요.')

  // A28-08 월별 운영계획: 확정할 수 있는 과목의 행만. 관리자 결정 우선, 없으면 원문 근거가 있는 행을 기본 승인
  const teachingRows: TeachingPlanReviewRequest['rows'] = []
  const teachingCandidates = (view.teachingPlanCandidates ?? []).filter((subject) => !excluded.has(subject.subjectIndex))
  const candidateRows = teachingCandidates.reduce((sum, subject) => sum + (subject.rows?.length ?? 0), 0)
  let teachingState: TeachingState = 'none'
  if (teaching && candidateRows > 0) {
    const status = teaching.status
    teachingState = status === null ? 'loading' : status === 'error' ? 'error' : status.reopened ? 'reopened' : status.confirmed ? 'confirmed' : 'open'
    for (const subject of teachingCandidates) {
      ;(subject.rows ?? []).forEach((row, rowIndex) => {
        if (!usable.has(subject.subjectIndex)) {
          byType.teaching.skipped += 1
          return
        }
        const decision = teaching.decisions[`${subject.subjectIndex}|teachingPlan[${rowIndex}]`]
        const base = { subjectIndex: subject.subjectIndex, rowKey: row.rowKey, subjectId: links[subject.subjectIndex] }
        if (decision?.kind === 'absent') {
          teachingRows.push({ ...base, decision: 'EXCLUDED' })
          byType.teaching.excluded += 1
        } else if (decision?.kind === 'edited') {
          let edits: TeachingPlanEdits | null = null
          try {
            edits = JSON.parse(decision.value) as TeachingPlanEdits
          } catch {
            edits = null
          }
          if (edits) {
            teachingRows.push({ ...base, decision: 'EDITED', edits })
            byType.teaching.approved += 1
          } else {
            byType.teaching.skipped += 1
          }
        } else if (decision?.kind === 'confirmed' || (row.sources ?? []).some((source) => Boolean(source.pdfPageNumber) || Boolean(source.documentLocator))) {
          teachingRows.push({ ...base, decision: 'CONFIRMED' })
          byType.teaching.approved += 1
        } else {
          // 원문 근거가 없는 행은 만들어 넣지 않는다(학생 비공개)
          byType.teaching.skipped += 1
        }
      })
    }
  }
  byType.teaching.state = teachingState
  // A28-22: 분석 결과에 운영계획 행이 없으면 이번 승인으로 운영계획은 확정되지 않는다 — 다 확정된 것처럼 보이지 않게 알린다
  if (candidateRows === 0) warnings.push('이 분석 결과에는 월별 운영계획 행이 없어요. 이번 승인으로 운영계획은 확정되지 않아요(원문 운영계획 표를 읽지 못한 경우일 수 있어요).')
  const sendTeaching = (teachingState === 'open' || teachingState === 'reopened') && teachingRows.length > 0
  if (teachingState === 'loading') blockers.push('월별 운영계획 확정 상태를 불러오는 중이에요.')
  if (teachingState === 'error') blockers.push("월별 운영계획 확정 상태를 불러오지 못했어요. 새로고침하거나 '운영계획' 단계에서 따로 확정해 주세요.")
  if (teachingState === 'confirmed' && !evaluationLocked) warnings.push('월별 운영계획은 이미 확정돼 있어 이번 승인에 넣지 않아요(바꾸려면 운영계획 재검토).')
  if (byType.teaching.skipped > 0) warnings.push(`원문 근거가 없거나 과목 연결이 안 된 운영계획 행 ${byType.teaching.skipped}개는 확정에서 빼요(학생 비공개).`)

  // 평가 정보가 이미 확정(재검토 아님)이면: 운영계획만 남았을 때 운영계획만 승인, 아니면 막는다
  const teachingOnly = evaluationLocked && sendTeaching
  if (evaluationLocked && !teachingOnly) blockers.push('이미 확정된 문서예요. 고치려면 결과 화면의 ‘확정 내용 수정’을 눌러 주세요.')
  if (!teachingOnly && counts.approved === 0) blockers.push('승인할 수 있는 값이 없어요. 과목 연결 또는 원문 근거를 확인해 주세요.')

  const reviewedSubjects = [...bySubject.entries()]
    .filter(([, list]) => list.length > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([index, confirmedFields]) => ({ subjectId: links[index], analysisSubjectIndex: index, confirmedFields }))
  const request: PlanReviewConfirmRequest | null =
    blockers.length === 0 && view.analysisId
      ? {
          analysisId: view.analysisId,
          decision: 'CONFIRM',
          reviewedSubjects,
          bulk: true,
          ...(expectedDraftVersion !== null ? { expectedDraftVersion } : {}),
          sourceCheck: { method: 'SERVER_STORED_ORIGINAL' },
          ...(sendTeaching ? { teachingPlan: { analysisId: view.analysisId, rows: teachingRows } } : {}),
        }
      : null
  const teachingOnlyRequest: TeachingPlanReviewRequest | null =
    blockers.length === 0 && teachingOnly && view.analysisId ? { analysisId: view.analysisId, rows: teachingRows } : null
  return {
    request: teachingOnly ? null : request,
    links,
    autoLinked,
    counts,
    unlinkedSubjects,
    gradeConflictSubjects,
    warnings,
    blockers,
    byType,
    teachingOnlyRequest,
  }
}
