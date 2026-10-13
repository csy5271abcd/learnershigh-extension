import type { ApiError } from '../api/apiClient.ts'
import { monthDay } from '../model/format.ts'
import type { Outcome } from '../model/outcome.ts'
import type { CareBoard } from '../model/types.ts'
import { useRetryFocus } from '../model/useFocus.ts'
import { loadFailure, type Remote } from '../model/useRemote.ts'
import { SignalBadges } from './SignalBadges.tsx'
import { Empty, ErrorState, Loading, StaleError } from './StateMessage.tsx'
import { StudentDetailPanel } from './StudentDetailPanel.tsx'

interface Props {
  branchId: string
  board: Remote<CareBoard>
  selectedStudentId: string | null
  onSelectStudent: (studentId: string) => void
  version: number
  onChanged: (outcome: Outcome | null) => void
  onStale: (error: ApiError) => void
  onRefresh: () => void
  onShowHistory: () => void
}

/** 화면에는 보이지 않고 읽을 때만 쓰는 구분 기호. 카드 버튼 이름을 "이름 반, 신호: …, 요약"처럼 나눠 읽게 한다. */
function Separator() {
  return <span className="sc-visually-hidden">, </span>
}

/** 케어 보드: 확인할 변화 / 조정 진행 중 목록과 학생 상세 (Master-Detail). */
export function CareBoardTab({
  branchId,
  board,
  selectedStudentId,
  onSelectStudent,
  version,
  onChanged,
  onStale,
  onRefresh,
  onShowHistory,
}: Props) {
  const { anchorRef, retry } = useRetryFocus<HTMLHeadingElement>(board)
  const failure = loadFailure(board)
  const retrying = board.status === 'loading'

  if (failure && !board.data) {
    return <ErrorState error={failure} onRetry={retry} retrying={retrying} />
  }
  if (!board.data) {
    return <Loading label="케어 보드를 불러오는 중…" />
  }
  const data = board.data
  const stale = failure !== null

  return (
    <div className={stale ? 'sc-board sc-board--stale' : 'sc-board'} aria-busy={board.status === 'loading'}>
      <div className="sc-board__head">
        <h2 ref={anchorRef} tabIndex={-1} className="sc-board__title">
          {monthDay(data.asOf)} 기준 · {data.branch.name}
        </h2>
        {stale && <span className="sc-tag sc-tag--stale">이전에 불러온 내용</span>}
      </div>
      {failure && <StaleError what="케어 보드" error={failure} onRetry={retry} retrying={retrying} />}
      {data.deferred.length > 0 && (
        <ul className="sc-deferred" aria-label="판단 보류">
          {data.deferred.map((student) => (
            <li key={student.studentId}>
              <span className="sc-tag">판단 보류</span> <strong>{student.studentName}</strong> 최근 7일 유효 학습일{' '}
              {student.validDays}일 · 기록이 적어 학습량을 비교하지 않습니다
            </li>
          ))}
        </ul>
      )}

      <div className="sc-board__body">
        <div className="sc-lists">
          <section className="sc-list" aria-labelledby="sc-needs-check">
            <h3 id="sc-needs-check" className="sc-list__title">
              확인할 변화 <span className="sc-count">{data.needsCheck.length}</span>
            </h3>
            {data.needsCheck.length === 0 ? (
              <Empty title="평소와 달라진 학생이 없습니다" />
            ) : (
              <ul className="sc-cards">
                {data.needsCheck.map((card) => (
                  <li key={card.studentId}>
                    <button
                      type="button"
                      className="sc-card"
                      aria-current={card.studentId === selectedStudentId ? 'true' : undefined}
                      onClick={() => onSelectStudent(card.studentId)}
                    >
                      <span className="sc-card__name">
                        {card.studentName} <span className="sc-card__class">{card.className}</span>
                      </span>
                      <Separator />
                      <SignalBadges signals={card.signals} inline />
                      <Separator />
                      <span className="sc-card__summary">{card.signals[0]?.summary}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="sc-list" aria-labelledby="sc-in-adjustment">
            <h3 id="sc-in-adjustment" className="sc-list__title">
              조정 진행 중 <span className="sc-count">{data.inAdjustment.length}</span>
            </h3>
            {data.inAdjustment.length === 0 ? (
              <Empty title="진행 중인 조정이 없습니다" />
            ) : (
              <ul className="sc-cards">
                {data.inAdjustment.map((card) => (
                  <li key={card.caseId}>
                    <button
                      type="button"
                      className="sc-card"
                      aria-current={card.studentId === selectedStudentId ? 'true' : undefined}
                      onClick={() => onSelectStudent(card.studentId)}
                    >
                      <span className="sc-card__name">
                        {card.studentName} <span className="sc-card__class">{card.className}</span>
                        {card.recheckDue && (
                          <>
                            <Separator />
                            <span className="sc-tag sc-tag--due">재점검</span>
                          </>
                        )}
                      </span>
                      <Separator />
                      <SignalBadges signals={card.signals} inline />
                      <Separator />
                      <span className="sc-card__summary">
                        {card.goal} · 재점검 {monthDay(card.recheckDate)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <StudentDetailPanel
          branchId={branchId}
          studentId={selectedStudentId}
          version={version}
          onChanged={onChanged}
          onStale={onStale}
          onRefresh={onRefresh}
          onShowHistory={onShowHistory}
        />
      </div>
    </div>
  )
}
