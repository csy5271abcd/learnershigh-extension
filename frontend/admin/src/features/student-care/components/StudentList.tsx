import { monthDay } from '../model/format.ts'
import type { CareBoard, SignalSummary } from '../model/types.ts'
import { loadFailure, type Remote } from '../model/useRemote.ts'

interface Row {
  studentId: string
  studentName: string
  signals: SignalSummary[]
  recheckDate: string | null
  recheckDue: boolean
}

interface Props {
  board: Remote<CareBoard>
  selectedId: string | null
  onSelect: (studentId: string) => void
}

/** 점검일이 된 관리 학생 → 특이사항 학생 → 점검일 전 관리 학생 (student-care.md §3). */
function rowsOf(board: CareBoard): Row[] {
  const managed = board.inAdjustment.map((card) => ({
    studentId: card.studentId,
    studentName: card.studentName,
    signals: card.signals,
    recheckDate: card.recheckDate,
    recheckDue: card.recheckDue,
  }))
  const flagged = board.needsCheck.map((card) => ({
    studentId: card.studentId,
    studentName: card.studentName,
    signals: card.signals,
    recheckDate: null,
    recheckDue: false,
  }))
  return [...managed.filter((row) => row.recheckDue), ...flagged, ...managed.filter((row) => !row.recheckDue)]
}

export function StudentList({ board, selectedId, onSelect }: Props) {
  const failure = loadFailure(board)
  const data = board.data

  return (
    <section className="sc-list" aria-labelledby="sc-list-title" aria-busy={board.status === 'loading'}>
      <h2 id="sc-list-title" className="sc-list__title">
        특이사항 학생
        {data && !failure && <span className="sc-count">{data.needsCheck.length + data.inAdjustment.length}</span>}
      </h2>

      {failure ? (
        <div className="sc-state" role="alert">
          <p>불러오지 못했습니다</p>
          <button type="button" className="sc-button" onClick={board.reload}>
            다시 시도
          </button>
        </div>
      ) : !data ? (
        <p className="sc-state">불러오는 중</p>
      ) : (
        <>
          {rowsOf(data).length === 0 ? (
            <p className="sc-state">특이사항 없음</p>
          ) : (
            <ul className="sc-list__items">
              {rowsOf(data).map((row) => (
                <li key={row.studentId}>
                  <button
                    type="button"
                    className={row.recheckDue ? 'sc-row sc-row--due' : 'sc-row'}
                    aria-current={row.studentId === selectedId ? 'true' : undefined}
                    onClick={() => onSelect(row.studentId)}
                  >
                    <span className="sc-row__head">
                      <span className="sc-row__name">{row.studentName}</span>
                      {row.recheckDue ? (
                        <span className="sc-badge sc-badge--due">점검일</span>
                      ) : row.recheckDate ? (
                        <span className="sc-row__date">다음 점검 {monthDay(row.recheckDate)}</span>
                      ) : null}
                    </span>
                    <span className="sc-row__signals">
                      {row.signals.map((signal) => (
                        <span key={signal.type} className="sc-tag">
                          {signal.label}
                        </span>
                      ))}
                    </span>
                    {row.signals[0] && <span className="sc-row__summary">{row.signals[0].summary}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {data.deferred.length > 0 && (
            <p className="sc-list__deferred">
              기록 부족 · {data.deferred.map((student) => student.studentName).join(', ')}
            </p>
          )}
        </>
      )}
    </section>
  )
}
