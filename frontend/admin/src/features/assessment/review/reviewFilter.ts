// A27-UX 부록 N5-3 (2026-11-21): 검토 항목이 많을 때 '이상 항목부터' 보기 위한 화면 필터 (순수 함수, 서버 상태·결정 변경 없음).
// - AI 후보는 처음부터 '검토 후보'로 화면에 보인다. 그러나 화면에 보인다고 관리자 확인·확정·학생 공개가 되지 않는다.
//   관리자가 값마다 '확인'(confirmed)·'수정'(edited)·'원문에 없음'(absent)을 고른 것만 §39 확정 요청에 들어간다(기존 계약 그대로).
// - '후보 그대로 일괄 확인'은 A27 미채택 정책이라 만들지 않는다(서버 확정 조건 완화 = CONTRACT CHANGE REQUIRED).
// - A28-03 (2026-11-22): 화면 개념을 '하나씩 확인' → '기본 승인 + 최종 승인'으로 바꾼다. 값·근거가 있는 AI 후보는 결정 없이도
//   '기본 승인 대상'으로 세고(초안에 결정을 쓰지 않는다 = 관리자가 확인했다고 기록하지 않음), 관리자는 확인 필요·잘못된 값만 고친다.
//   최종 승인은 부록 O §39-13 한 번에 확정 요청 그대로다(서버 검증·계약 불변).
import type { ReviewFieldCandidate } from '../api/types.ts'
import { fieldKey, type Decision } from './reviewModel.ts'

export type ReviewFilter = 'all' | 'attention' | 'edited' | 'absent' | 'default' | 'confirmed'

/** 먼저 볼 이유: 값 없음(분석기가 읽지 못함) · 근거 없음(원문 위치 없음). 분석 결과에 있는 정보만 쓴다(추정 없음). */
export function attentionReasons(field: Pick<ReviewFieldCandidate, 'candidate' | 'sourcePages' | 'sourceLocators'>): string[] {
  const reasons: string[] = []
  if (field.candidate === null || field.candidate === undefined || String(field.candidate).trim() === '') reasons.push('값 없음')
  if ((field.sourcePages ?? []).length === 0 && (field.sourceLocators ?? []).length === 0) reasons.push('근거 없음')
  return reasons
}

export function matchesFilter(field: ReviewFieldCandidate, decision: Decision | undefined, filter: ReviewFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'attention':
      return !decision && attentionReasons(field).length > 0
    case 'default':
      // 관리자 결정 없이 AI 값 그대로 최종 승인에 들어가는 항목(값·근거 있음)
      return !decision && attentionReasons(field).length === 0
    case 'edited':
      return decision?.kind === 'edited'
    case 'confirmed':
      return decision?.kind === 'confirmed'
    case 'absent':
      return decision?.kind === 'absent'
  }
}

export function filterCounts(fields: readonly ReviewFieldCandidate[], decisions: Record<string, Decision>): Record<ReviewFilter, number> {
  const counts: Record<ReviewFilter, number> = { all: 0, attention: 0, edited: 0, absent: 0, default: 0, confirmed: 0 }
  for (const field of fields) {
    const decision = decisions[fieldKey(field)]
    for (const filter of Object.keys(counts) as ReviewFilter[]) if (matchesFilter(field, decision, filter)) counts[filter] += 1
  }
  return counts
}

export const filterLabels: Record<ReviewFilter, string> = {
  all: '전체',
  attention: '확인 필요',
  edited: '관리자 수정',
  absent: '제외(원문에 없음)',
  default: '기본 승인',
  confirmed: '직접 확인',
}

/** 필드가 속한 수행평가 칸: 공통(평가 비율) 또는 performanceEvaluation.items[N] */
export function itemOf(fieldPath: string): 'common' | number {
  const match = /^performanceEvaluation\.items\[(\d+)]\./.exec(fieldPath)
  return match ? Number(match[1]) : 'common'
}

/**
 * 지금 필터에 맞는 항목이 있는 다음 칸(과목·수행평가). 과목 번호 → 공통 → 수행평가 번호 순서로 돌고, 끝이면 처음으로 돈다.
 * 지금 칸은 건너뛴다. 맞는 칸이 없으면 null.
 */
export function nextMatchingCell(
  fields: readonly ReviewFieldCandidate[],
  decisions: Record<string, Decision>,
  filter: ReviewFilter,
  current: { subjectIndex: number; item: 'common' | number },
): { subjectIndex: number; item: 'common' | number } | null {
  const order = (cell: { subjectIndex: number; item: 'common' | number }) => cell.subjectIndex * 100000 + (cell.item === 'common' ? -1 : cell.item)
  const cells = new Map<number, { subjectIndex: number; item: 'common' | number }>()
  for (const field of fields) {
    if (!matchesFilter(field, decisions[fieldKey(field)], filter)) continue
    const cell = { subjectIndex: field.subjectIndex, item: itemOf(field.fieldPath) }
    cells.set(order(cell), cell)
  }
  const sorted = [...cells.entries()].sort((a, b) => a[0] - b[0]).map(([, cell]) => cell)
  const here = order(current)
  const others = sorted.filter((cell) => order(cell) !== here)
  return others.find((cell) => order(cell) > here) ?? others[0] ?? null
}

/**
 * 부록 O §39-13 '검증 가능한 후보 한 번에 확정'의 결정 합치기 (순수 함수 · 서버 상태를 바꾸지 않는다).
 * - 관리자가 이미 고른 결정(수정·원문에 없음·확인)은 그대로 둔다 — AI 값으로 덮어쓰지 않는다.
 * - 아직 고르지 않은 후보 중 값과 원문 쪽(근거)이 모두 있는 것만 '후보 그대로'로 넣는다(기본 포함).
 * - 값이나 근거 쪽이 없는 후보는 넣지 않고 pending 으로 돌려준다 → 화면은 그 항목만 먼저 해결하게 한다(확정 0건).
 * - 제외한 과목의 후보는 보지 않는다. 서버는 개별 확정과 같은 검사(근거 쪽·과목 연결·학년·원본 SHA·초안 version)를 다시 한다.
 */
export function defaultIncluded(
  fields: readonly ReviewFieldCandidate[],
  decisions: Record<string, Decision>,
  excluded: ReadonlySet<number>,
): { merged: Record<string, Decision>; defaulted: number; edited: number; absent: number; confirmed: number; pending: ReviewFieldCandidate[] } {
  const merged: Record<string, Decision> = { ...decisions }
  const pending: ReviewFieldCandidate[] = []
  let defaulted = 0
  for (const field of fields) {
    if (excluded.has(field.subjectIndex)) continue
    const key = fieldKey(field)
    if (decisions[key]) continue
    const page = field.sourcePages[0]
    // A28-05: HWP·HWPX 는 쪽 대신 원문 위치(locator)가 근거다 — 위치가 있으면 기본 승인 대상
    if (attentionReasons(field).length > 0 || (page === undefined && (field.sourceLocators ?? []).length === 0)) {
      pending.push(field)
      continue
    }
    merged[key] = { kind: 'confirmed', value: String(field.candidate).trim(), page: page === undefined ? '' : String(page) }
    defaulted += 1
  }
  const own = Object.entries(decisions).filter(([key]) => !excluded.has(Number(key.split('|')[0])))
  return {
    merged,
    defaulted,
    edited: own.filter(([, decision]) => decision.kind === 'edited').length,
    absent: own.filter(([, decision]) => decision.kind === 'absent').length,
    confirmed: own.filter(([, decision]) => decision.kind === 'confirmed').length,
    pending,
  }
}

/**
 * A28-03 검토 요약(화면 표시 전용 · 서버 상태를 바꾸지 않는다). 수치는 실제 분석 후보·공유 초안 결정·과목 제외에서만 센다.
 * - total: 검토 대상(제외 과목 뺀 후보) · approvalTarget: 최종 승인에 들어갈 항목(= total - needsReview)
 * - defaulted: 결정 없이 AI 값 그대로(기본 승인) · edited/confirmed/absent: 관리자 결정 · needsReview: 값·근거 없어 먼저 해결할 항목
 * - excludedFields: 제외한 과목의 후보 수(검토 대상에서 빠짐, 삭제 아님)
 */
export function approvalSummary(
  fields: readonly ReviewFieldCandidate[],
  decisions: Record<string, Decision>,
  excluded: ReadonlySet<number>,
): { total: number; approvalTarget: number; defaulted: number; edited: number; confirmed: number; absent: number; needsReview: number; excludedFields: number } {
  const bulk = defaultIncluded(fields, decisions, excluded)
  const active = fields.filter((field) => !excluded.has(field.subjectIndex))
  const total = active.length
  return {
    total,
    approvalTarget: total - bulk.pending.length,
    defaulted: bulk.defaulted,
    edited: bulk.edited,
    confirmed: bulk.confirmed,
    absent: bulk.absent,
    needsReview: bulk.pending.length,
    excludedFields: fields.length - total,
  }
}
