import { useMemo, useState } from 'react'
import { branchDays, branchStudyChange, type OpsStudent } from './opsModel.ts'

const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
const pct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}%`
const min = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}분`

/**
 * 학습관별: 지표 4개가 날짜 열 7개를 공유하는 한 표. 학생 선은 그리지 않고, 날짜마다 대표값(중앙값)과
 * 중간 50% 범위를 쓴다. 변화가 큰 학생은 아래 사유 묶음에서 이름으로 고른다(학생별 탭으로 이동).
 * 집계 제외는 이름 검색으로 추가하고 목록에서 복원한다(학생 150명분의 체크박스를 늘어놓지 않는다).
 */
export function OpsBranch({ rows, branchName, onOpenStudent }: { rows: OpsStudent[]; branchName: string; onOpenStudent: (id: string) => void }) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const days = useMemo(() => branchDays(rows, excluded), [rows, excluded])
  const change = useMemo(() => branchStudyChange(rows, excluded), [rows, excluded])
  const included = rows.length - excluded.size
  const candidates = query ? rows.filter((r) => !excluded.has(r.student.studentId) && r.student.studentName.includes(query)).slice(0, 6) : []
  const top = (type: string) => rows.filter((r) => r.chips.some((c) => c.type === type))
  const groups = [
    ['결석', [...new Set([...top('CONSECUTIVE_ABSENCE'), ...top('WEEKDAY_ABSENCE')])]],
    ['학습 감소', top('STUDY_DROP')], ['입실 늦어짐', top('START_TIME_SHIFT')], ['계획 미제출', top('PLAN_MISSING')],
  ] as const
  return (
    <section className="ops-branch" aria-label={`${branchName} 학습관 전체`}>
      <p className="ops-branch-summary">
        <b>{branchName} {rows.length}명</b>
        {excluded.size > 0 && <span> · 집계 {included}명</span>}
        <span> · 상담 필요 {rows.filter((r) => r.status === 'check').length}명 · 관리 중 {rows.filter((r) => r.status === 'managed' || r.status === 'recheck').length}명</span>
        {change && <span> · 학습 시간 평소 대비 <b className={change.percent < 0 ? 'ops-down' : ''}>{pct(change.percent)}</b></span>}
      </p>
      <div className="ops-bt" role="table" aria-label="날짜별 학습관 지표">
        <div className="ops-bt-row ops-bt-head" role="row"><span role="columnheader" />{days.map((d) => <span key={d.date} role="columnheader"><b>{md(d.date)}</b>{d.dow}</span>)}</div>
        <div className="ops-bt-row" role="row"><span role="rowheader">결석<small>결석 / 등원 예정</small></span>{days.map((d) => (
          <span key={d.date} role="cell" className="ops-bt-abs">
            <b className={d.absent.length ? 'ops-down' : ''}>{d.scheduled ? `${d.absent.length} / ${d.scheduled}` : '예정 없음'}</b>
            {d.absent.slice(0, 4).map((s) => <button key={s.student.studentId} type="button" className="ops-link" onClick={() => onOpenStudent(s.student.studentId)}>{s.student.studentName}</button>)}
            {d.absent.length > 4 && <small>외 {d.absent.length - 4}명</small>}
            {d.unknown > 0 && <small>기록 없음 {d.unknown}</small>}
          </span>))}</div>
        <div className="ops-bt-row" role="row"><span role="rowheader">학습 시간<small>개인 평소 대비, 중앙값 (중간 50%)</small></span>{days.map((d) => (
          <span key={d.date} role="cell">{d.studyChange ? <><b className={d.studyChange.median < -20 ? 'ops-down' : ''}>{pct(d.studyChange.median)}</b><small>{pct(d.studyChange.q1)} ~ {pct(d.studyChange.q3)}</small></> : '—'}</span>))}</div>
        <div className="ops-bt-row" role="row"><span role="rowheader">입실 시각<small>개인 평소 대비, 중앙값 (중간 50%)</small></span>{days.map((d) => (
          <span key={d.date} role="cell">{d.startShift ? <><b className={d.startShift.median > 30 ? 'ops-down' : ''}>{min(d.startShift.median)}</b><small>{min(d.startShift.q1)} ~ {min(d.startShift.q3)}</small></> : '—'}</span>))}</div>
        <div className="ops-bt-row" role="row"><span role="rowheader">계획 제출<small>제출 / 기록 확인</small></span>{days.map((d) => (
          <span key={d.date} role="cell">{d.submitKnown ? <><b>{Math.round((d.submitted / d.submitKnown) * 100)}%</b><small>{d.submitted} / {d.submitKnown}</small></> : '—'}</span>))}</div>
      </div>
      <div className="ops-branch-groups">
        {groups.map(([title, list]) => (
          <section key={title}><h3>{title} <small>{list.length}명</small></h3>
            <p>{list.length ? list.map((s) => <button key={s.student.studentId} type="button" className="ops-link" onClick={() => onOpenStudent(s.student.studentId)}>{s.student.studentName}</button>) : <span className="ops-muted">없음</span>}</p>
          </section>))}
      </div>
      <section className="ops-exclude" aria-label="집계 제외">
        <h3>집계에서 제외 <small>학습관 대표값 계산에서만 빠지고 학생 기록·상담 상태는 바뀌지 않음</small></h3>
        <input className="sc-input" aria-label="제외할 학생 이름" placeholder="학생 이름" value={query} onChange={(e) => setQuery(e.target.value)} />
        {candidates.map((s) => <button key={s.student.studentId} type="button" className="ops-link" onClick={() => { setExcluded(new Set([...excluded, s.student.studentId])); setQuery('') }}>{s.student.studentName} 제외</button>)}
        {excluded.size > 0 && <p>{[...excluded].map((id) => { const s = rows.find((r) => r.student.studentId === id)!; return <button key={id} type="button" className="ops-chip-btn" onClick={() => { const next = new Set(excluded); next.delete(id); setExcluded(next) }}>{s.student.studentName} 복원</button> })}</p>}
      </section>
    </section>
  )
}
