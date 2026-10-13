// 로그인 학생(최하은)의 학년 Context. Canonical 값은 schoolStudentContext.grade(고2) 그대로다.
// 개발 / 검증 전용 ?fixtureStudentGrade=3 은 Interview 대상 여부(Eligibility)만 고3으로 재현한다.
// - DEV에서만 읽는다. Production 화면에는 조작 버튼이 없다.
// - 학생 Identity / 저장된 학년은 바꾸지 않는다. 메모리에만 두고 새로고침하면 사라진다. (?fixtureStudentGrade=2 로 되돌림)
// - Interview 대상 학년 판단이 실제로 어느 API 필드에서 오는지는 Contract Gap이다.

import { schoolStudentContext } from './schoolTasks.fixture.ts'

let eligibilityGradeOverride: string | null = null

/** 지금 화면이 쓸 학년. DEV에서 ?fixtureStudentGrade=3 | 2 를 만나면 그 뒤 School 화면에서도 유지한다. */
export function schoolStudentGrade(search: string): string {
  if (import.meta.env.DEV) {
    const value = new URLSearchParams(search).get('fixtureStudentGrade')
    if (value === '3') eligibilityGradeOverride = '고3'
    else if (value === '2') eligibilityGradeOverride = null
  }
  return eligibilityGradeOverride ?? schoolStudentContext.grade
}
