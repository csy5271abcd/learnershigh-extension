import { ApiError } from './apiError.ts'

// Assessment 화면 열람 모드 (2026-10-29, P-28 PROPOSED).
// - 'student': 학생 본인 앱. 기본값이며 기존 동작과 같다.
// - 'admin-readonly': Admin "학생 화면 보기"가 같은 Student 화면을 관리자 권한으로 읽기 전용 렌더링할 때만 켠다.
//   학생 Session을 만들거나 흉내 내지 않는다. 데이터는 Admin Read-only Adapter가 담당 범위 검사 뒤 넣는다.
// 화면에서 버튼을 숨기는 것과 별개로, 모든 쓰기 API 함수가 이 Guard를 먼저 지나 Mock Store·서버 호출 자체가 일어나지 않게 한다.
export type AssessmentViewMode = 'student' | 'admin-readonly'

let mode: AssessmentViewMode = 'student'
const blockedWrites: string[] = []

export function currentAssessmentViewMode(): AssessmentViewMode {
  return mode
}

export function isAssessmentReadOnlyView(): boolean {
  return mode === 'admin-readonly'
}

/** Admin Read-only Viewer만 호출한다. Student 앱에서는 호출하지 않는다. */
export function setAssessmentViewMode(next: AssessmentViewMode) {
  mode = next
  if (next === 'student') blockedWrites.length = 0
}

/** 읽기 전용 모드에서 차단한 쓰기 시도 (검증용 기록. 실제로 실행된 쓰기는 0건이어야 한다) */
export function blockedWriteAttempts(): readonly string[] {
  return blockedWrites
}

/** 쓰기 API 입구. 읽기 전용 모드면 실행하지 않고 403 READ_ONLY_VIEW로 거절한다. */
export function guardWrite<T>(action: string, run: () => Promise<T>): Promise<T> {
  if (mode === 'admin-readonly') {
    blockedWrites.push(action)
    return Promise.reject(new ApiError(403, { code: 'READ_ONLY_VIEW', message: '관리자 읽기 전용 화면에서는 학생 기록을 바꿀 수 없어요.', details: {} }))
  }
  return run()
}
