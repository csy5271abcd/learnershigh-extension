import { useLocation } from 'react-router'
import { schoolStudentGrade } from '../fixtures/schoolStudentGrade.fixture.ts'

/** School 화면이 쓸 로그인 학생 학년. Canonical 값(고2)에 개발용 Eligibility 재현(?fixtureStudentGrade=3)만 얹는다. */
export function useSchoolStudentGrade(): string {
  return schoolStudentGrade(useLocation().search)
}
