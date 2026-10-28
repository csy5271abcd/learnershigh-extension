
export type StudentCareVersion = 1 | 2 | 3 | 5
export const studentCarePath = '/student-care'
export const studentCareOnePath = '/student-care/1'
export const studentCareTwoPath = '/student-care/2'
export function matchStudentCareVersion(path: string): StudentCareVersion | null {
  if (path === studentCarePath) return 2
  // 이전 시안 주소도 현재 네 화면 안에서 연결한다.
  const match = /^\/student-care\/([1235])$/.exec(path)
  return match ? Number(match[1]) as StudentCareVersion : null
}
