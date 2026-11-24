// A28 §5-4 확정 이력 변경 비교 (순수 함수 · 서버 확정 기록을 바꾸지 않는다).
// 확정 기록은 불변이고 재확정하면 새 기록이 쌓인다(§39-8). 두 기록의 확정값을 (과목 · 항목 경로)로 맞춰 바뀐 것만 돌려준다.
// 과목 키: 분석 과목 번호가 있으면 그것, 없으면 학업 과목 ID(예전 API 확정분).

export interface ConfirmedValue {
  subjectId: string
  fieldPath: string
  value: unknown
  pdfPageNumber: number | null
  analysisSubjectIndex?: number
}

export interface ConfirmedChange {
  key: string
  subjectId: string
  analysisSubjectIndex: number | null
  fieldPath: string
  kind: 'changed' | 'added' | 'removed'
  before: unknown
  after: unknown
  beforePage: number | null
  afterPage: number | null
}

const keyOf = (field: ConfirmedValue) => `${typeof field.analysisSubjectIndex === 'number' ? `#${field.analysisSubjectIndex}` : field.subjectId}|${field.fieldPath}`
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** newer(이번 확정) 대비 older(직전 확정)에서 바뀐 값. 값 또는 근거 쪽이 바뀌면 changed. 순서: 이번 확정 순서 → 빠진 값 */
export function confirmedChanges(newer: readonly ConfirmedValue[], older: readonly ConfirmedValue[]): ConfirmedChange[] {
  const before = new Map(older.map((field) => [keyOf(field), field]))
  const changes: ConfirmedChange[] = []
  const seen = new Set<string>()
  for (const field of newer) {
    const key = keyOf(field)
    seen.add(key)
    const prev = before.get(key)
    const base = { key, subjectId: field.subjectId, analysisSubjectIndex: field.analysisSubjectIndex ?? null, fieldPath: field.fieldPath, after: field.value, afterPage: field.pdfPageNumber }
    if (!prev) changes.push({ ...base, kind: 'added', before: null, beforePage: null })
    else if (!same(prev.value, field.value) || prev.pdfPageNumber !== field.pdfPageNumber) changes.push({ ...base, kind: 'changed', before: prev.value, beforePage: prev.pdfPageNumber })
  }
  for (const field of older) {
    const key = keyOf(field)
    if (seen.has(key)) continue
    changes.push({ key, subjectId: field.subjectId, analysisSubjectIndex: field.analysisSubjectIndex ?? null, fieldPath: field.fieldPath, kind: 'removed', before: field.value, after: null, beforePage: field.pdfPageNumber, afterPage: null })
  }
  return changes
}

/**
 * 확정값이 AI 후보 그대로인지(기본 승인·직접 확인) 관리자가 바꾼 값인지 센다. 같은 분석 결과의 후보와 비교할 때만 의미가 있다.
 * candidateOf 가 undefined 를 주면(후보 없음·다른 분석 결과) 'unknown'으로 센다 — 추측하지 않는다.
 */
export function originCounts(fields: readonly ConfirmedValue[], candidateOf: (field: ConfirmedValue) => unknown): { asCandidate: number; edited: number; unknown: number } {
  let asCandidate = 0
  let edited = 0
  let unknown = 0
  for (const field of fields) {
    const candidate = candidateOf(field)
    if (candidate === undefined) unknown += 1
    else if (same(String(candidate ?? '').trim(), String(field.value ?? '').trim())) asCandidate += 1
    else edited += 1
  }
  return { asCandidate, edited, unknown }
}
