import type { EvaluationPlan } from '../types.ts'
import { assessmentHttp } from './assessmentHttpClient.ts'

// §10-1 학교 공통 평가계획서 HTTP Adapter. 응답은 문서 메타데이터와 reviewStatus뿐이다(분석 후보는 Student 응답에 없다).
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
