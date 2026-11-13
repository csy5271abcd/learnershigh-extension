import type { EvaluationPlan } from '../types.ts'
import { assessmentHttp, downloadFile } from './assessmentHttpClient.ts'

// §10-1 학교 공통 평가계획서 HTTP Adapter. 응답은 관리자가 확정한 문서의 메타데이터·reviewStatus·원문 정보뿐이다
// (분석 후보는 Student 응답에 없다. 업로드·분석만 된 미확정 문서는 서버가 보내지 않는다).
const base = '/api/student/assessment/evaluation-plans'

export function listEvaluationPlansHttp(query: {
  schoolId: string
  academicYear: number
  grade: number
  semester: number
}): Promise<{ items: EvaluationPlan[] }> {
  return assessmentHttp(base, { query })
}

export function getEvaluationPlanHttp(planId: string): Promise<EvaluationPlan> {
  return assessmentHttp(`${base}/${encodeURIComponent(planId)}`)
}

/** S-4: 공개(확정)된 문서 원문 미리보기(PDF만) · 내려받기(형식 그대로). 서버가 크기·SHA-256을 다시 확인한다. */
export const previewEvaluationPlanFileHttp = (planId: string) => downloadFile(`${base}/${encodeURIComponent(planId)}/preview`)
export const downloadEvaluationPlanFileHttp = (planId: string) => downloadFile(`${base}/${encodeURIComponent(planId)}/file`)
