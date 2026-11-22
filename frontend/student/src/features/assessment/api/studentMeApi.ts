import { isMockDataSource } from './dataSource.ts'
import { assessmentHttp } from './http/assessmentHttpClient.ts'

// A28-12 학생 머리글 이름 (api-contract.md §9-0 GET /api/student/assessment/me).
// 인증된 학생 본인의 학생 정보에서만 읽는다. 찾지 못하면 null — 화면은 '학생'으로 보인다(고정 이름 금지).

export interface StudentMe {
  studentId: string
  displayName: string | null
}

export function getStudentMe(): Promise<StudentMe> {
  if (isMockDataSource) return Promise.resolve({ studentId: 'mock', displayName: null })
  return assessmentHttp<StudentMe>('/api/student/assessment/me')
}

/** 머리글에 보일 이름: 이름이 없거나 조회 전·실패면 '학생' */
export function headerName(me: StudentMe | null): string {
  const name = me?.displayName?.trim()
  return name ? name : '학생'
}
