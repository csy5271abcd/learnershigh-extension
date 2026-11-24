import type { EvaluationPlan, StudentOfficialEnsure, StudentOfficialPlan, StudentTeachingPlan } from '../types.ts'
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

/** A6 §10-1-2: 공개(확정) Revision의 확정 운영계획 행만. 확정 전이면 status NOT_CONFIRMED + 빈 목록 */
/** §10-1-3 DRAFT 공식 공개 원본 (A27-UX) */
// A28-01: grade(선택) = 같은 학교의 다른 학년 공개 원본. 없으면 서버가 학적(없으면 현재 학교·학년)으로 칸을 정한다
const gradeQuery = (grade?: number | null) => (grade ? `&grade=${grade}` : '')
export const getOfficialPlanHttp = (academicYear: number, semester: number, grade?: number | null) =>
  assessmentHttp<StudentOfficialPlan>(`${base}/official?academicYear=${academicYear}&semester=${semester}${gradeQuery(grade)}`)
/** §10-1-3 부록 K: 학생 진입 자동 확보(본문 없음, 진행 중이면 202) */
export const ensureOfficialPlansHttp = () => assessmentHttp<StudentOfficialEnsure>(`${base}/official/ensure`, { method: 'POST' })
/** §10-1-3 부록 K: 본인 학적 슬롯 원본 내려받기·PDF 미리보기(서버가 그 칸 원본인지 다시 확인) */
export const downloadOfficialFileHttp = (academicYear: number, semester: number, sourceDocumentId: string, grade?: number | null) =>
  downloadFile(`${base}/official/files/${encodeURIComponent(sourceDocumentId)}?academicYear=${academicYear}&semester=${semester}${gradeQuery(grade)}`)
export const previewOfficialFileHttp = (academicYear: number, semester: number, sourceDocumentId: string, grade?: number | null) =>
  downloadFile(`${base}/official/files/${encodeURIComponent(sourceDocumentId)}/preview?academicYear=${academicYear}&semester=${semester}${gradeQuery(grade)}`)
export const getEvaluationPlanTeachingPlanHttp = (planId: string) => assessmentHttp<StudentTeachingPlan>(`${base}/${encodeURIComponent(planId)}/teaching-plan`)

// 부록 O §38-16 학생 동명 학교 열람 선택(본인만, 학적·선생님 매핑 불변)
export const getOfficialViewHttp = () => assessmentHttp<import('../types.ts').StudentOfficialView>(`${base}/official/school-candidates`)
export const selectOfficialViewHttp = (candidateId: string, expectedVersion: number) =>
  assessmentHttp<import('../types.ts').StudentOfficialView>(`${base}/official/view-selection`, { method: 'PUT', json: { candidateId, expectedVersion } })
export const clearOfficialViewHttp = (expectedVersion: number) =>
  assessmentHttp<import('../types.ts').StudentOfficialView>(`${base}/official/view-selection`, { method: 'DELETE', query: { expectedVersion } })
