// 학생 명단(글자만) 공통 조각과 근거 문장. 명단 행에는 날짜별 그림을 넣지 않는다(P1).
import { md, REASONS, type CareRow } from './useCareData.ts'

export function ReasonChips({ r }: { r: CareRow }) {
  return <>{r.chips.map((c) => <span key={c.text} className={`v5-chip${c.derived ? ' v5-chip-ref' : ''}`}>{c.text}{c.derived ? ' (참고)' : ''}</span>)}</>
}

export function StatusText({ r }: { r: CareRow }) {
  return r.statusLabel ? <span className={`v5-status v5-status-${r.status}`}>{r.statusLabel}{r.recheckDate ? ` · 다음 확인 ${md(r.recheckDate)}` : ''}</span> : <span className="v5-muted">—</span>
}

/** 학생 고르기 명단: 이름·반·상태·대표 사유 1개(+n). 7일 값·그림은 넣지 않는다(representation-v5 4장) */
export function RosterText({ rows, onOpen, selectedId, label }: { rows: CareRow[]; onOpen: (r: CareRow) => void; selectedId?: string | null; label: string }) {
  if (!rows.length) return <p className="sc-state">조건에 맞는 학생이 없습니다.</p>
  return (
    <ul className="v5-picker" aria-label={label}>
      {rows.map((r) => (
        <li key={r.student.studentId} data-care-roster-row={r.student.studentId} className={`v5-row-${r.status}`} aria-current={selectedId === r.student.studentId ? 'true' : undefined}>
          <button type="button" id={`v5-open-${r.student.studentId}`} className="v5-picker-btn" onClick={() => onOpen(r)}>
            <b>{r.student.studentName}</b> <span className="v5-muted">{r.student.className}</span>
            <StatusText r={r} />
            {r.chips[0] && <span className={`v5-chip${r.chips[0].derived ? ' v5-chip-ref' : ''}`}>{r.chips[0].text}</span>}
            {r.chips.length > 1 && <span className="v5-muted">+{r.chips.length - 1}</span>}
          </button>
        </li>))}
    </ul>
  )
}

export function ReasonFilter({ rows, value, onChange, id }: { rows: CareRow[]; value: string; onChange: (v: string) => void; id: string }) {
  return (
    <label className="v5-filter">사유 <select id={id} className="sc-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {REASONS.map((x) => <option key={x.key} value={x.key}>{x.label} {rows.filter(x.match).length}명</option>)}
    </select></label>
  )
}

