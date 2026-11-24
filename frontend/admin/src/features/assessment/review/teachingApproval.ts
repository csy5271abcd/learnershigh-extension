import type { TeachingPlanEdits, TeachingPlanRowCandidate } from '../api/types.ts'
import { gradeConflict, type Decision } from './reviewModel.ts'

// A28-31 월별 운영계획 '최종 승인' 한 번: 관리자가 따로 정하지 않은 분석 후보 행도 기본 포함(AI 기본값 채택)한다.
// 관리자가 수정·제외한 행은 그 결정대로. 다음은 자동 포함하지 않고 '확인 필요'로 센다(서버가 거절하거나 학생에게 근거 없이 보이게 될 행):
//  - 원문 근거(쪽·위치)가 없는 행
//  - 원문상 이 문서 학년이 아닌 과목의 행(서버 grade_conflict)
// 과목 연결이 없는 포함 행이 있으면 승인할 수 없다(서버 subjectId 검사) — 이유를 보여 준다.
// 어떤 행이 '관리자 결정'이고 어떤 행이 '기본값 채택'인지는 서버가 확정 시점의 초안과 대조해 기록한다(decisionBasis).

export interface TeachingRowRef {
  subjectIndex: number
  rowIndex: number
  subjectName: string
  row: TeachingPlanRowCandidate
}

export interface TeachingApprovalRow {
  subjectIndex: number
  rowKey: string
  subjectId: string
  decision: 'CONFIRMED' | 'EDITED' | 'EXCLUDED'
  edits?: TeachingPlanEdits
}

export interface TeachingApproval {
  rows: TeachingApprovalRow[]
  counts: { auto: number; confirmed: number; edited: number; excluded: number; noEvidence: number; otherGrade: number }
  /** 학생에게 공개될 분석 행 수(자동 포함 + 확인 + 수정) */
  published: number
  /** 포함 대상인데 과목 연결이 없는 과목 이름 */
  missingSubjects: string[]
}

export const teachingRowKey = (ref: { subjectIndex: number; rowIndex: number }) => `${ref.subjectIndex}|teachingPlan[${ref.rowIndex}]`

export function hasEvidence(row: TeachingPlanRowCandidate): boolean {
  return (row.sources ?? []).some((source) => typeof source.pdfPageNumber === 'number' || Boolean(source.documentLocator))
}

function editsOf(decision: Extract<Decision, { kind: 'edited' }>): TeachingPlanEdits | null {
  try {
    return JSON.parse(decision.value) as TeachingPlanEdits
  } catch {
    return null
  }
}

export function teachingApproval(input: {
  refs: readonly TeachingRowRef[]
  decisions: Record<string, Decision | undefined>
  subjectIds: Record<number, string>
  subjectGrades?: (number[] | null)[] | null
  documentGrade?: number
}): TeachingApproval {
  const { refs, decisions, subjectIds, subjectGrades, documentGrade } = input
  const counts = { auto: 0, confirmed: 0, edited: 0, excluded: 0, noEvidence: 0, otherGrade: 0 }
  const rows: TeachingApprovalRow[] = []
  const missing = new Set<string>()
  for (const ref of refs) {
    const decision = decisions[teachingRowKey(ref)]
    const link = (subjectIds[ref.subjectIndex] ?? '').trim()
    const base = { subjectIndex: ref.subjectIndex, rowKey: ref.row.rowKey, subjectId: link }
    if (decision?.kind === 'absent') {
      counts.excluded += 1
      if (!link) missing.add(ref.subjectName)
      rows.push({ ...base, decision: 'EXCLUDED' })
      continue
    }
    if (gradeConflict(subjectGrades?.[ref.subjectIndex], documentGrade)) {
      counts.otherGrade += 1
      continue
    }
    if (decision?.kind === 'edited') {
      const edits = editsOf(decision)
      if (!edits) continue
      counts.edited += 1
      if (!link) missing.add(ref.subjectName)
      rows.push({ ...base, decision: 'EDITED', edits })
      continue
    }
    if (decision?.kind === 'confirmed') {
      counts.confirmed += 1
      if (!link) missing.add(ref.subjectName)
      rows.push({ ...base, decision: 'CONFIRMED' })
      continue
    }
    if (!hasEvidence(ref.row)) {
      counts.noEvidence += 1
      continue
    }
    counts.auto += 1
    if (!link) missing.add(ref.subjectName)
    rows.push({ ...base, decision: 'CONFIRMED' })
  }
  return { rows, counts, published: counts.auto + counts.confirmed + counts.edited, missingSubjects: [...missing] }
}
