export const studentCarePath = '/student-care'
/** 시안 번호 주소 중 최종안(/student-care/5)은 같은 화면으로 연결한다. 이전 시안 1~3은 제거했다. */
export function isStudentCarePath(path: string): boolean {
  return path === studentCarePath || path === '/student-care/5'
}

/** 학생 케어 개선안. 기존 /student-care는 그대로 두고 같은 API로 보여주는 방식만 바꾼 화면 (docs/design/ops-redesign/plan.md) */
export const studentCareOpsPath = '/student-care/ops'

/** 학생 케어 시안 A–D(docs/design/ops-redesign/plan-v5.md). 기존 /student-care와 /student-care/ops는 그대로 둔다 */
export type StudentCareVariant = 'a' | 'b' | 'c' | 'd'
export const studentCareVariantPath = (v: StudentCareVariant) => `/student-care/${v}`
/** 학생 케어 Z안(docs/design/ops-redesign/plan-z.md). A–D와 별도 화면 */
export const studentCareZPath = '/student-care/z'
/** 표시법 20종 비교(docs/design/ops-redesign/plan-yxz.md). 메뉴에 두지 않는다 */
export const studentCareNotationPath = '/student-care/notation'
/** 시안 Y(데이터 중심)·X(원본 스타일)·Z′(Z 개선, 사용자 경험 우선) */
export const studentCareYPath = '/student-care/y'
export const studentCareXPath = '/student-care/x'
export const studentCareZ2Path = '/student-care/z2'
/** 시안 X′(X를 겹창·한 줄 명단으로 다시 짠 것, docs/design/ops-redesign/x-handoff.md). X는 그대로 둔다 */
export const studentCareX2Path = '/student-care/x2'
/** 학부모 리포트 생활 탭(시안 B, 원본 리포트에 붙일 화면). 정적 화면 public/parent-report-mock/b.html을 관리 화면 안에 띄운다 */
export const parentReportPath = '/parent-report'

export function studentCareVariantOf(path: string): StudentCareVariant | null {
  const m = path.match(/^\/student-care\/([abcd])$/)
  return m ? (m[1] as StudentCareVariant) : null
}
