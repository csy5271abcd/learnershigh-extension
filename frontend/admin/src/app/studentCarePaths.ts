export const studentCarePath = '/student-care'
/** 시안 번호 주소 중 최종안(/student-care/5)은 같은 화면으로 연결한다. 이전 시안 1~3은 제거했다. */
export function isStudentCarePath(path: string): boolean {
  return path === studentCarePath || path === '/student-care/5'
}
