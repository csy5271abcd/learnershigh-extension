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
export function studentCareVariantOf(path: string): StudentCareVariant | null {
  const m = path.match(/^\/student-care\/([abcd])$/)
  return m ? (m[1] as StudentCareVariant) : null
}
