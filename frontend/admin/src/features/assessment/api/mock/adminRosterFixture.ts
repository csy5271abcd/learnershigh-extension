import type { AdminStudentRef } from '../types.ts'

// Admin 담당 학생 명단 (Stage 1 시연). 실제 원천은 기존 LearnersHigh 학생·지점 데이터다 (ExistingStudentClient, API-OD-A01).
//
// - student_001은 Student 앱의 로그인 학생(개발용 표시명 '최하은', StudentAppShell)이다.
//   이 학생의 수행평가·노트·결과물·피드백·심화 탐구·성장 기록은 모두 Student Canonical Fixture를 그대로 쓴다.
//   (Student Fixture는 로그인 학생 1명 기준이라 studentId가 없어, Admin Mock이 이 ID로 연결한다.)
// - student_002는 같은 학교·학년의 다른 학생이며 Assessment 기록이 아직 없다 (Empty 확인용). Student 기록을 복제하지 않는다.
// - student_003은 담당 범위 밖(다른 지점) 학생이다. 목록에 나오지 않고, ID를 직접 넣어도 403으로 막는다 (§34 IDOR 확인용).
// 이름은 시연용 가상 이름이다.

export const canonicalStudentId = 'student_001'

/** 이 관리자의 Mock 담당 범위 (서버 인가를 흉내만 낸다. 실제 인가는 Stage 2 Backend) */
export const adminScopeBranchId = 'branch_001'

export const fixtureRoster: (AdminStudentRef & { branchId: string })[] = [
  { studentId: 'student_001', displayName: '최하은', school: { schoolId: 'school_001', name: '예시고등학교' }, grade: 1, branchId: 'branch_001' },
  { studentId: 'student_002', displayName: '정서윤', school: { schoolId: 'school_001', name: '예시고등학교' }, grade: 1, branchId: 'branch_001' },
  { studentId: 'student_003', displayName: '한도윤', school: { schoolId: 'school_002', name: '다른고등학교' }, grade: 2, branchId: 'branch_002' },
]
