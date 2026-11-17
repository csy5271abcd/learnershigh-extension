import { useCallback, useState } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import type { ApiError } from '../api/canonicalSource.ts'
import { DetailHead, ReadOnlyMark } from '../components/AdminParts.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/canonicalUi.ts'
import { StudentDesktopPreview } from '../preview/StudentDesktopPreview.tsx'
import { useStudentViewSnapshot } from '../preview/useStudentViewSnapshot.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { paths } from './paths.ts'

/** 권한 없음·없는 학생·불러오기 실패 화면 (학생 화면 보기·수행평가 상세 공통) */
export function StudentViewError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const denied = error.code === 'FORBIDDEN' || error.code === 'STUDENT_NOT_FOUND'
  return (
    <div className={styles.body}>
      {denied ? (
        <EmptyState
          title={error.code === 'FORBIDDEN' ? '이 학생의 화면은 볼 수 없어요' : '학생을 찾을 수 없어요'}
          description={error.message}
          action={
            <button type="button" className={styles.secondaryButton} onClick={() => navigate(paths.students)}>
              학생 목록으로
            </button>
          }
        />
      ) : (
        <ErrorState title="학생 화면을 불러오지 못했어요" error={error} onRetry={onRetry} />
      )}
    </div>
  )
}

// 경로 A: 학생 화면 그대로 보기 (요청 ⑦·⑧, P-28). Student 앱 Desktop 화면 전체를 읽기 전용으로 축소해 보여준다 (StudentDesktopPreview).
// 학생 Session을 만들지 않고, Admin 담당 범위 검사를 통과한 기록만 넘긴다. 실제 서버 인가는 Stage 2 Backend에서 다시 검사해야 한다.
export function StudentViewRoute({ studentId, search }: { studentId: string; search: URLSearchParams }) {
  const { state, retry } = useStudentViewSnapshot(studentId)
  const [initialPath] = useState(() => search.get('path') ?? '/assessment')
  const [blocked, setBlocked] = useState(0)

  const onPathChange = useCallback((path: string) => {
    const next = new URLSearchParams(window.location.search)
    next.set('path', path)
    replaceSearch(next.toString())
  }, [])

  if (state.kind === 'loading') {
    return (
      <div className={styles.body}>
        <LoadingRows rows={4} label="학생 화면을 불러오는 중" />
      </div>
    )
  }
  if (state.kind === 'error') return <StudentViewError error={state.error} onRetry={retry} />

  const { student } = state
  return (
    <div className={styles.studentViewRoot} data-testid="student-readonly-view">
      <DetailHead trail={`Assessment 관리 / 학생 Assessment / ${student.displayName} / 학생 화면 보기`} title={`${student.displayName}의 Assessment 화면`} backTo={paths.student(student.studentId)}>
        <span className={styles.muted}>
          {student.school.name} · {student.grade}학년
        </span>
        <span className={styles.readOnly} data-testid="readonly-banner">
          <ReadOnlyMark /> · 관리자 읽기 전용 보기 · 차단한 쓰기 시도 {blocked}건
        </span>
        <button type="button" className={styles.secondaryButton} onClick={() => navigate(paths.student(student.studentId))}>
          관리자 요약으로
        </button>
      </DetailHead>
      <StudentDesktopPreview
        key={student.studentId}
        snapshot={state.snapshot}
        httpStudentId={state.httpStudentId}
        initialPath={initialPath}
        onPathChange={onPathChange}
        onBlockedCount={setBlocked}
        title={`${student.displayName} 학생 Assessment 화면 (읽기 전용)`}
      />
    </div>
  )
}
