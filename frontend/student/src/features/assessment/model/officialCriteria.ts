import { getEvaluationPlan, listEvaluationPlans } from '../api/evaluationPlansApi.ts'
import type { AcademicContext, EvaluationPlan, SchoolAssessment } from '../api/types.ts'
import { groupConfirmedFields, type ConfirmedItem, type ConfirmedSubject } from './confirmedPlanView.ts'

// A27-UX 학생(2026-11-19): 수행평가 상세 '평가 기준'은 관리자가 확정해 학생에게 공개한 값(§10-1 confirmedFields)만 쓴다.
// AI 분석 후보·검토 초안(§11·§39)은 읽지도 요청하지도 않는다. 학교·학년도·학년·학기는 학생 학업 Context로 서버가 정한 슬롯이다.
// 맞추기(보수적 규칙, 2026-11-19 사용자 결정 유지):
//  - 같은 과목(subjectId)의 확정 수행평가 항목 중 이름이 수행평가 이름과 **정확히 같고 그런 항목이 하나뿐**일 때만 '이 수행평가'로 본다.
//  - 같은 이름이 여러 개(같은 문서 1차·2차, 또는 여러 확정 문서)면 임의로 고르지 않고 목록 + '확인 필요'(ambiguous).
//  - 다르면 과목의 공개 항목 전체를 참고로 보여 준다. 유사도·부분 일치로 넓히지 않는다. 같은 학기 확정 문서가 여럿이면 모두 찾는다.

export type OfficialCriteria =
  /** 이 수행평가의 학기 학업 정보를 찾지 못했다 */
  | { kind: 'noContext' }
  /** 이 과목에 공개된 평가 기준이 없다 (확정 문서가 없거나 이 과목 값이 없음) */
  | { kind: 'none'; planCount: number }
  | { kind: 'found'; plan: EvaluationPlan; subject: ConfirmedSubject; matched: ConfirmedItem | null; ambiguous: number }

export const normalizeName = (text: string) => text.replace(/\s+/g, '').toLowerCase()

/** 수행평가가 속한 학기 Context (상세 응답에 학기가 없어 과목 ID로 찾는다) */
export function contextOf(contexts: AcademicContext[], subjectId: string): AcademicContext | undefined {
  return contexts.find((context) => context.subjects.some((subject) => subject.subjectId === subjectId))
}

const sameName = (entry: ConfirmedItem, title: string) => entry.label.state === 'value' && normalizeName(String(entry.label.value)) === title

export async function loadOfficialCriteria(item: SchoolAssessment, context: AcademicContext | undefined): Promise<OfficialCriteria> {
  if (!context) return { kind: 'noContext' }
  const slot = { schoolId: context.school.schoolId, academicYear: context.academicYear, grade: context.grade, semester: context.semester }
  const list = await listEvaluationPlans(slot)
  const plans = await Promise.all(list.items.map((plan) => getEvaluationPlan(plan.planId)))
  // 연결된 평가계획서 Revision이 있으면 그 문서를 먼저 본다
  const ordered = item.evaluationItemRef
    ? [...plans].sort((a, b) => Number(b.documentRevisionId === item.evaluationItemRef?.documentRevisionId) - Number(a.documentRevisionId === item.evaluationItemRef?.documentRevisionId))
    : plans
  const title = normalizeName(item.title)
  const candidates = ordered.flatMap((plan) => {
    const subject = groupConfirmedFields(plan.confirmedFields ?? [], context).find((entry) => entry.subjectId === item.subjectId)
    if (!subject || (subject.items.length === 0 && subject.performanceWeight.state === 'missing')) return []
    return [{ plan, subject, same: subject.items.filter((entry) => sameName(entry, title)) }]
  })
  const totalSame = candidates.reduce((sum, candidate) => sum + candidate.same.length, 0)
  if (totalSame === 1) {
    const hit = candidates.find((candidate) => candidate.same.length === 1)!
    return { kind: 'found', plan: hit.plan, subject: hit.subject, matched: hit.same[0], ambiguous: 0 }
  }
  // 같은 이름이 여러 개면 자동 연결하지 않는다 — 같은 이름이 있는 문서(없으면 첫 문서)의 목록을 보이고 확인 필요로 둔다
  const shown = candidates.find((candidate) => candidate.same.length > 0) ?? candidates[0]
  return shown ? { kind: 'found', plan: shown.plan, subject: shown.subject, matched: null, ambiguous: totalSame } : { kind: 'none', planCount: plans.length }
}
