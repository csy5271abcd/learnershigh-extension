import { useEffect, useState } from 'react'
import { getStudentViewSnapshot } from '../api/assessmentAdminApi.ts'
import { toApiError, type ApiError, type ReadOnlyStudentSnapshot } from '../api/canonicalSource.ts'
import type { AdminStudentRef } from '../api/types.ts'

export type StudentViewSnapshotState =
  | { kind: 'loading' }
  | { kind: 'ready'; student: AdminStudentRef; snapshot: ReadOnlyStudentSnapshot; httpStudentId?: string }
  | { kind: 'error'; error: ApiError }

/** 담당 범위 검사(403/404) 뒤 한 학생의 기록을 읽는다. 학생 화면 보기·수행평가 상세(관리자 진입) 두 경로가 같이 쓴다 */
export function useStudentViewSnapshot(studentId: string) {
  const [state, setState] = useState<StudentViewSnapshotState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    getStudentViewSnapshot(studentId).then(
      ({ student, snapshot, httpStudentId }) => active && setState({ kind: 'ready', student, snapshot, httpStudentId }),
      (error: unknown) => active && setState({ kind: 'error', error: toApiError(error) }),
    )
    return () => {
      active = false
    }
  }, [studentId, attempt])
  return { state, retry: () => setAttempt((value) => value + 1) }
}
