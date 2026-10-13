import { studentCareApi } from '../api/studentCareApi.ts'
import { useRemote } from '../model/useRemote.ts'
import { Empty, ErrorState, Loading } from './StateMessage.tsx'
import { Timeline } from './Timeline.tsx'

/** 학생 기록: 고른 학생의 모든 케어 건 이벤트를 최신순으로 보여준다. 담당이 바뀌어도 이 기록으로 이어받는다. */
export function HistoryTab({ branchId, studentId }: { branchId: string; studentId: string | null }) {
  const history = useRemote(studentId ? `${branchId}/${studentId}` : null, () =>
    studentCareApi.history(branchId, studentId ?? ''),
  )

  if (!studentId) {
    return <Empty title="학생을 고르지 않았습니다" description="케어 보드에서 카드를 고르면 그 학생의 기록이 보입니다." />
  }
  if (history.status === 'error' && !history.data) {
    return <ErrorState error={history.error} onRetry={history.reload} />
  }
  if (!history.data) {
    return <Loading />
  }
  return (
    <section className="sc-history" aria-labelledby="sc-history-title">
      <h2 id="sc-history-title" className="sc-history__title">
        {history.data.student.studentName} <span className="sc-hint">학생정보 › 케어 기록</span>
      </h2>
      {history.data.items.length === 0 ? (
        <Empty title="아직 케어 기록이 없습니다" description="사유를 확인하면 이곳에 날짜별로 남습니다." />
      ) : (
        <Timeline events={history.data.items} label="케어 기록" />
      )}
      <p className="sc-hint">담당이 바뀌어도 이 기록으로 이어받습니다.</p>
    </section>
  )
}
