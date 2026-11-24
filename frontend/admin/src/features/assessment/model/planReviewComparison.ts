import type { PlanReviewDraftView, PlanReviewHistory, ReviewDocumentLocator, ReviewFieldCandidate } from '../api/types.ts'

// A27-UX(계정 B) 분석 결과 조회: 검토 진행률과 'AI 후보 ↔ 관리자 검토값 ↔ 최종 확정값' 비교 View Model.
// 새 Endpoint·새 저장값 없이 기존 서버 값만 조합한다.
//   - AI 후보: §39 GET analysis → reviewFields[].candidate (분석 Run 결과, 바뀌지 않음)
//   - 관리자 검토값: §39-4 GET review-draft → draft.decisions (ACTIVE = 검토 중 임시 저장, CLOSED = 확정 때 쓴 결정)
//   - 최종 확정값: §39-8 GET reviews → current 기록의 confirmedFields (기록은 불변, 재확정해도 이전 기록이 남는다)
// 세 값은 서로 다른 원천이라 서로 덮어쓰지 않는다. 값이 없으면 만들지 않고 '없음'으로 둔다.
// 검토 대상 총수 = 확정 화면과 같은 규칙으로 분석 결과에서 만든 reviewFields 수(서버 분석 값에서 결정적으로 계산).

export type DraftDecision = NonNullable<PlanReviewDraftView['draft']>['decisions'][number]
type HistoryItem = PlanReviewHistory['items'][number]

export const reviewKey = (subjectIndex: number, fieldPath: string) => `${subjectIndex}|${fieldPath}`

export interface ReviewProgress {
  /** 검토 대상 필드 수 */
  total: number
  /** 서버 초안에 결정이 저장된 검토 대상 수 */
  decided: number
  /** 초안 상태: ACTIVE = 검토 중(임시 저장), CLOSED = 확정 때 닫힘, NONE = 초안 없음 */
  draftStatus: 'ACTIVE' | 'CLOSED' | 'NONE'
  /** 모든 검토 대상에 결정이 저장됨(ACTIVE 초안 기준). 확정 여부와는 별개 */
  allDecided: boolean
}

export function reviewProgressOf(fields: ReviewFieldCandidate[], draft: PlanReviewDraftView['draft'] | null | undefined): ReviewProgress {
  const keys = new Set(fields.map((field) => reviewKey(field.subjectIndex, field.fieldPath)))
  const decidedKeys = new Set((draft?.decisions ?? []).map((item) => reviewKey(item.subjectIndex, item.fieldPath)).filter((key) => keys.has(key)))
  const draftStatus = draft ? draft.status : 'NONE'
  return {
    total: fields.length,
    decided: decidedKeys.size,
    draftStatus,
    allDecided: draftStatus === 'ACTIVE' && fields.length > 0 && decidedKeys.size === fields.length,
  }
}

export type ConfirmedValue = { value: unknown; absent: boolean; page: number | null }

export interface ComparisonRow {
  key: string
  subjectIndex: number
  subjectName: string
  fieldPath: string
  label: string
  /** AI 최초 분석 후보 (없으면 null) */
  ai: number | string | null
  /** 관리자 검토 결정 (없으면 null = 미검토) */
  review: DraftDecision | null
  /** 현재 학생 공개 중인 확정값 (확정 기록에 없으면 null = 확정하지 않음) */
  confirmed: ConfirmedValue | null
  /** 직전 확정 기록의 값 (재확정으로 바뀐 경우만 의미가 있다) */
  previous: ConfirmedValue | null
  /** 관리자가 AI 후보와 다른 값으로 결정했거나 확정값이 후보와 다름 */
  adminChanged: boolean
  sourcePages: number[]
  documentLocators: ReviewDocumentLocator[]
}

const text = (value: unknown) => (value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value).trim())

/**
 * 확정 기록의 필드를 분석 과목과 맞춘다 (api-contract A10 우선순위 그대로):
 * ① 확정값의 analysisSubjectIndex ② 초안 subjectLinks ③ 분석 과목 1개 + 번호 없는 확정 과목 1개. 그 밖에는 추정하지 않는다.
 */
function confirmedOf(item: HistoryItem | undefined, subjectIndex: number, fieldPath: string, links: Map<number, string>, singleSubject: boolean): ConfirmedValue | null {
  if (!item) return null
  const byIndex = item.confirmedFields.find((field) => field.analysisSubjectIndex === subjectIndex && field.fieldPath === fieldPath)
  const unindexed = [...new Set(item.confirmedFields.filter((field) => field.analysisSubjectIndex == null).map((field) => field.subjectId))]
  const linked = links.get(subjectIndex) ?? (singleSubject && unindexed.length === 1 ? unindexed[0] : undefined)
  const found =
    byIndex ?? (linked ? item.confirmedFields.find((field) => field.analysisSubjectIndex == null && field.subjectId === linked && field.fieldPath === fieldPath) : undefined)
  if (!found) return null
  return { value: found.value, absent: found.value === null, page: found.pdfPageNumber }
}

export function comparisonRowsOf(
  fields: ReviewFieldCandidate[],
  draft: PlanReviewDraftView['draft'] | null | undefined,
  history: PlanReviewHistory | null | undefined,
): ComparisonRow[] {
  const decisions = new Map((draft?.decisions ?? []).map((item) => [reviewKey(item.subjectIndex, item.fieldPath), item]))
  const links = new Map((draft?.subjectLinks ?? []).map((link) => [link.subjectIndex, link.subjectId]))
  const items = history?.items ?? []
  const currentIndex = items.findIndex((item) => item.current)
  const current = currentIndex >= 0 ? items[currentIndex] : undefined
  const previous = currentIndex >= 0 ? items[currentIndex + 1] : undefined
  const singleSubject = new Set(fields.map((field) => field.subjectIndex)).size === 1
  return fields.map((field) => {
    const key = reviewKey(field.subjectIndex, field.fieldPath)
    const review = decisions.get(key) ?? null
    const confirmed = confirmedOf(current, field.subjectIndex, field.fieldPath, links, singleSubject)
    const ai = field.candidate
    const reviewChanged = review !== null && (review.decision === 'EDITED' || review.decision === 'ABSENT') && text(review.value) !== text(ai)
    const confirmedChanged = confirmed !== null && text(confirmed.value) !== text(ai)
    return {
      key,
      subjectIndex: field.subjectIndex,
      subjectName: field.subjectName,
      fieldPath: field.fieldPath,
      label: field.label,
      ai,
      review,
      confirmed,
      previous: confirmedOf(previous, field.subjectIndex, field.fieldPath, links, singleSubject),
      adminChanged: reviewChanged || confirmedChanged,
      sourcePages: field.sourcePages,
      documentLocators: field.documentLocators,
    }
  })
}

export type ComparisonFilter = 'all' | 'changed' | 'unreviewed' | 'absent'

export function filterRows(rows: ComparisonRow[], filter: ComparisonFilter, draftActive: boolean): ComparisonRow[] {
  switch (filter) {
    case 'changed':
      return rows.filter((row) => row.adminChanged)
    case 'unreviewed':
      // 검토 중이면 초안 결정이 없는 것, 확정 뒤면 확정 기록에 없는 것(학생 비공개)
      return rows.filter((row) => (draftActive ? row.review === null : row.confirmed === null))
    case 'absent':
      return rows.filter((row) => row.review?.decision === 'ABSENT' || row.confirmed?.absent)
    default:
      return rows
  }
}

export const displayValue = (value: unknown) => {
  const shown = text(value)
  return shown === '' ? '—' : shown
}
