import { useId, useState } from 'react'
import { followUpLabel, monthDay } from '../model/format.ts'
import type { CareBoard, SignalSummary } from '../model/types.ts'
import { loadFailure, type Remote } from '../model/useRemote.ts'

interface Row {
  studentId: string
  studentName: string
  className: string
  signals: SignalSummary[]
  recheckDate: string | null
  recheckDue: boolean
  validDays: number | null
  priority: number
}
interface Props {
  board: Remote<CareBoard>
  selectedId: string | null
  onSelect: (studentId: string) => void
}
/** 점검일 → 확인 필요 → 점검일 전 관리 → 기록 부족 → 기준 내. 전체 명부를 한 번씩 표시한다. */
function rowsOf(board: CareBoard): Row[] {
  return board.students.map(student => {
    const managed = board.inAdjustment.find(card => card.studentId === student.studentId)
    const flagged = board.needsCheck.find(card => card.studentId === student.studentId)
    const deferred = board.deferred.find(card => card.studentId === student.studentId)
    return {
      ...student, signals: managed?.signals ?? flagged?.signals ?? [],
      recheckDate: managed?.recheckDate ?? null, recheckDue: managed?.recheckDue ?? false,
      validDays: deferred?.validDays ?? null,
      priority: managed?.recheckDue ? 0 : flagged ? 1 : managed ? 2 : deferred ? 3 : 4,
    }
  }).sort((a, b) => a.priority - b.priority ||
    (a.recheckDate && b.recheckDate ? a.recheckDate.localeCompare(b.recheckDate) : b.signals.length - a.signals.length) ||
    a.studentName.localeCompare(b.studentName, 'ko'))
}

export function StudentList({ board, selectedId, onSelect }: Props) {
  const id = useId()
  const [search, setSearch] = useState('')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const failure = loadFailure(board)
  const data = board.data
  const rows = data && !failure ? rowsOf(data) : []
  const query = search.trim().toLocaleLowerCase('ko')
  const shown = rows.filter(row => (!attentionOnly || row.priority <= 1) &&
    (!query || `${row.studentName} ${row.className}`.toLocaleLowerCase('ko').includes(query)))
  const needsAttention = rows.filter(row => row.priority <= 1).length

  return (
    <section className={`sc-list${expanded ? ' is-expanded' : ''}`} aria-labelledby={`${id}-title`} aria-busy={board.status === 'loading'}>
      <h2 id={`${id}-title`} className="sc-list__title">
        전체 학생
        {data && !failure && <span className="sc-count">{data.students.length}</span>}
      </h2>
      {failure ? (
        <div className="sc-state" role="alert"><p>불러오지 못했습니다</p><button type="button" className="sc-button" onClick={board.reload}>다시 시도</button></div>
      ) : !data ? (
        <p className="sc-state">불러오는 중</p>
      ) : (
        <>
          <div className="sc-roster-picker"><select className="sc-select" aria-label="학생 선택" value={selectedId ?? ''} onChange={event => onSelect(event.target.value)}>
            {rows.map(row => <option key={row.studentId} value={row.studentId}>{row.studentName} · {row.className}{row.recheckDue ? ` · ${followUpLabel(row.recheckDate!,data.asOf)}` : row.priority === 1 ? ' · 확인 필요' : ''}</option>)}
          </select><button type="button" className="sc-button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '닫기' : '검색'}</button></div>
          <div className="sc-roster-tools">
            <label className="sc-visually-hidden" htmlFor={`${id}-search`}>이름 또는 반 검색</label>
            <input id={`${id}-search`} className="sc-input sc-roster-search" type="search" placeholder="이름 또는 반 검색" value={search} onChange={event => setSearch(event.target.value)} />
            <label className="sc-roster-filter"><input type="checkbox" checked={attentionOnly} onChange={event => setAttentionOnly(event.target.checked)} />확인할 학생만</label>
            <p className="sc-roster-summary" role="status">{shown.length}명 · 확인 필요 {needsAttention}명</p>
          </div>
          {shown.length === 0 ? (
            <div className="sc-state sc-roster-empty">
              <p>{rows.length === 0 ? '등록된 학생이 없습니다' : '조건에 맞는 학생이 없습니다'}</p>
              {(query || attentionOnly) && <button type="button" className="sc-button" onClick={() => { setSearch(''); setAttentionOnly(false) }}>검색·필터 초기화</button>}
            </div>
          ) : (
            <ul className="sc-list__items">
              {shown.map(row => (
                <li key={row.studentId}>
                  <button type="button" className={`sc-row${row.signals.length||row.recheckDue?' sc-row--attention':''}`} aria-current={row.studentId === selectedId ? 'true' : undefined} onClick={() => onSelect(row.studentId)}>
                    <span className="sc-row__head">
                      <span className="sc-row__name">{row.studentName}</span>
                      {row.recheckDue ? <><span className="sc-badge sc-badge--due">경과 확인</span></> : row.recheckDate ? <span className="sc-row__date">다음 확인 {monthDay(row.recheckDate)}</span> : row.priority === 1 ? <><span className="sc-badge">상담 필요</span></> : null}
                    </span>
                    <span className="sc-roster-meta">{row.className}</span>
                    <span className="sc-row__signals">
                      {row.signals.map(signal => <span key={signal.type} className="sc-tag">{signal.label}</span>)}
                      {row.validDays !== null && <span className="sc-tag sc-tag--neutral">학습 기록 부족</span>}
                    </span>
                    {row.validDays !== null && <span className="sc-row__summary">학습 기록 {row.validDays}일 / 7일</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
