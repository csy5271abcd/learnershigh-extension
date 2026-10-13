import { useEffect, useRef } from 'react'
import { studentCareApi } from '../api/studentCareApi.ts'
import { useRetryFocus } from '../model/useFocus.ts'
import { loadFailure, useRemote } from '../model/useRemote.ts'
import { Empty, ErrorState, Loading, StaleError } from './StateMessage.tsx'
import { Timeline } from './Timeline.tsx'

interface Props {
  branchId: string
  studentId: string | null
  /** 페이지에서 무언가 바뀌면 올라가는 값. 바뀌면 기록을 다시 불러온다. */
  version: number
  /** "학생 기록 보기"로 왔을 때 올라가는 값. 기록 제목으로 Focus를 옮긴다. */
  focusRequest: number
}

/** 학생 기록: 고른 학생의 모든 케어 건 이벤트를 최신순으로 보여준다. 담당이 바뀌어도 이 기록으로 이어받는다. */
export function HistoryTab({ branchId, studentId, version, focusRequest }: Props) {
  const history = useRemote(
    studentId ? `${branchId}/${studentId}` : null,
    () => studentCareApi.history(branchId, studentId ?? ''),
    version,
  )
  const { anchorRef: headingRef, retry } = useRetryFocus<HTMLHeadingElement>(history)
  const failure = loadFailure(history)
  const retrying = history.status === 'loading'
  const handledFocus = useRef(0)
  const hasData = history.data !== null

  useEffect(() => {
    if (focusRequest !== handledFocus.current && hasData && headingRef.current) {
      handledFocus.current = focusRequest
      headingRef.current.focus()
    }
  }, [focusRequest, hasData, headingRef])

  if (!studentId) {
    return <Empty title="학생을 고르지 않았습니다" description="케어 보드에서 카드를 고르면 그 학생의 기록이 보입니다." />
  }
  if (failure && !history.data) {
    return <ErrorState error={failure} onRetry={retry} retrying={retrying} />
  }
  if (!history.data) {
    return <Loading />
  }
  return (
    <section className="sc-history" aria-labelledby="sc-history-title">
      <h2 id="sc-history-title" ref={headingRef} tabIndex={-1} className="sc-history__title">
        {history.data.student.studentName} <span className="sc-hint">학생정보 › 케어 기록</span>
      </h2>
      {failure && <StaleError what="학생 기록" error={failure} onRetry={retry} retrying={retrying} />}
      {history.data.items.length === 0 ? (
        <Empty title="아직 케어 기록이 없습니다" description="사유를 확인하면 이곳에 날짜별로 남습니다." />
      ) : (
        <Timeline events={history.data.items} label="케어 기록" />
      )}
      <p className="sc-hint">담당이 바뀌어도 이 기록으로 이어받습니다.</p>
    </section>
  )
}
