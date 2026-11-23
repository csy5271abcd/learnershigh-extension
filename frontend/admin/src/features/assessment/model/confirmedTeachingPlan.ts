import { getPlanSubjects, getTeachingPlanReview, isAdminMockDataSource, listEvaluationPlans } from '../api/assessmentAdminApi.ts'
import type { AdminEvaluationPlan } from '../api/types.ts'
import { entryFromRow, type TeachingPlanEntry } from '../components/canonicalUi.ts'
import { useRemote } from './useRemote.ts'

// A27-UX 확정된 월별 운영계획 (전체 현황 Calendar · 월별 운영계획 탭 공용).
// 원천: §38 목록(학교·학년도) → 해당 학년·학기 문서의 개정본 §39-6 teaching-plan-review(확정 버전, 제외 행 빼기) + §39 subjects(과목 이름).
// 다른 학교·학년·학기 문서는 목록 단계에서 걸러져 섞이지 않는다. 새 API·화면용 Counter 없음.
// A28-22: 최신 개정본에 운영계획 확정이 없으면 이전 개정본의 확정본을 쓴다(학생 공개 '최신 확정 개정본' 규칙과 같게 — 새 원본이
//   올라와도 이전 확정본이 사라지지 않음). 확정이 없는 문서는 '운영계획 후보 있음(미확정)'과 '운영계획 분석 결과 없음'으로 나눠 센다.
export interface ConfirmedTeachingPlan {
  entries: TeachingPlanEntry[]
  /** 이 학년·학기 평가계획서 문서 수 */
  documents: number
  /** 운영계획을 확정한 문서 수 */
  confirmed: number
  /** 운영계획 후보가 있지만 아직 확정하지 않은 문서(최신 분석 결과 기준) */
  pending: { planId: string; revisionId: string; fileName: string; candidateRows: number }[]
  /** 최신 분석 결과에 운영계획 행이 하나도 없는 문서(분석 전 포함) */
  noCandidates: { planId: string; revisionId: string; fileName: string; analyzed: boolean }[]
}

async function confirmedOf(plan: AdminEvaluationPlan) {
  const ordered = [...plan.revisions].sort((a, b) => b.revisionNumber - a.revisionNumber)
  const latest = ordered[0]
  const latestView = await getTeachingPlanReview(plan.planId, latest.documentRevisionId)
  if (latestView.review) return { view: latestView, latest, latestView }
  for (const revision of ordered.slice(1)) {
    const view = await getTeachingPlanReview(plan.planId, revision.documentRevisionId)
    if (view.review) return { view, latest, latestView }
  }
  return { view: null, latest, latestView }
}

export function useConfirmedTeachingPlan(schoolId: string, year: number | null, grade: number, semester: number) {
  return useRemote(async (): Promise<ConfirmedTeachingPlan> => {
    if (!schoolId || !year || isAdminMockDataSource) return { entries: [], documents: 0, confirmed: 0, pending: [], noCandidates: [] }
    const { items } = await listEvaluationPlans({ schoolId, academicYear: year })
    const slotPlans = items.filter((plan) => plan.schoolId === schoolId && plan.academicYear === year && plan.grade === grade && plan.semester === semester && plan.revisions.length > 0)
    const loaded = await Promise.all(
      slotPlans.map(async (plan) => {
        const [found, subjects] = await Promise.all([confirmedOf(plan), getPlanSubjects(plan.planId).catch(() => null)])
        return { plan, ...found, subjects }
      }),
    )
    const entries: TeachingPlanEntry[] = []
    const pending: ConfirmedTeachingPlan['pending'] = []
    const noCandidates: ConfirmedTeachingPlan['noCandidates'] = []
    let confirmed = 0
    for (const { plan, view, latest, latestView, subjects } of loaded) {
      if (!view?.review) {
        if (latestView.candidateRowCount > 0) pending.push({ planId: plan.planId, revisionId: latest.documentRevisionId, fileName: latest.fileName, candidateRows: latestView.candidateRowCount })
        else noCandidates.push({ planId: plan.planId, revisionId: latest.documentRevisionId, fileName: latest.fileName, analyzed: Boolean(latestView.latestAnalysisId) })
        continue
      }
      confirmed += 1
      const nameOf = (subjectId: string) => subjects?.items.find((item) => item.subjectId === subjectId)?.name ?? '과목 이름 확인 필요'
      for (const row of view.review.rows) {
        if (row.decision === 'EXCLUDED') continue
        entries.push(entryFromRow(row.row, { id: `${plan.planId}|${row.subjectIndex}|${row.rowKey}`, subjectName: nameOf(row.subjectId), status: 'CONFIRMED', academicYear: year }))
      }
    }
    return { entries, documents: slotPlans.length, confirmed, pending, noCandidates }
  }, [schoolId, year, grade, semester])
}
