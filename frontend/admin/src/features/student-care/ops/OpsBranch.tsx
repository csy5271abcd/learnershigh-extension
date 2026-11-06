import { useMemo, useState } from 'react'
import { branchDays, branchStudyChange, clock, hours, type OpsStudent } from './opsModel.ts'

const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
const pct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}%`
const min = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}분`

type Metric = 'absence' | 'study' | 'start' | 'plan'
interface Pick { metric: Metric; date: string | null }
interface Props {
  rows: OpsStudent[]; branchName: string; studyDropPercent: number; startShiftMinutes: number
  excluded: ReadonlySet<string>; onExcludedChange: (next: Set<string>) => void; onOpenStudent: (id: string) => void
}

const studyChange = (d: OpsStudent['days'][number]) => d.minutes !== null && d.usualMinutes ? ((d.minutes - d.usualMinutes) / d.usualMinutes) * 100 : null
const startShift = (d: OpsStudent['days'][number]) => d.start !== null && d.usualStart !== null ? d.start - d.usualStart : null

/**
 * 학습관별: 지표 4개가 날짜 열 7개를 공유하는 표. 칸(날짜·지표)이나 지표 이름(7일 전체)을 누르면 표 바로 아래
 * 같은 영역에 그 칸을 이루는 학생 전원의 값(실제·평소·차이)이 나온다. 변화 학생은 서버 신호가 아니라
 * 날짜별 실제 값에서 운영 기준(설정)으로 고른다. 집계 제외는 페이지 상태로 두어 탭을 오가도 유지된다.
 */
export function OpsBranch({ rows, branchName, studyDropPercent, startShiftMinutes, excluded, onExcludedChange, onOpenStudent }: Props) {
  const [pick, setPick] = useState<Pick>({ metric: 'study', date: null })
  const [query, setQuery] = useState('')
  const included = useMemo(() => rows.filter((r) => !excluded.has(r.student.studentId)), [rows, excluded])
  const days = useMemo(() => branchDays(rows, excluded), [rows, excluded])
  const change = useMemo(() => branchStudyChange(rows, excluded), [rows, excluded])
  const candidates = query ? rows.filter((r) => !excluded.has(r.student.studentId) && r.student.studentName.includes(query)).slice(0, 6) : []
  const idx = pick.date ? days.findIndex((d) => d.date === pick.date) : -1
  const dayIdx = (r: OpsStudent) => idx >= 0 ? [r.days[idx]] : r.days
  const cellBtn = (metric: Metric, date: string | null, body: React.ReactNode, label: string) => (
    <button type="button" className="ops-bt-btn" aria-pressed={pick.metric === metric && pick.date === date} aria-label={label} onClick={() => setPick({ metric, date })}>{body}</button>
  )
  const name = (s: OpsStudent) => <button type="button" className="ops-link" onClick={() => onOpenStudent(s.student.studentId)}>{s.student.studentName}</button>

  // 선택한 칸의 학생 값. 7일 전체를 고르면 학생별로 기준을 넘은 날 수를 센다
  const detail = (() => {
    if (pick.metric === 'absence') {
      const list = included.map((r) => ({ r, n: dayIdx(r).filter((d) => d.attendance === 'absent').length, unknown: dayIdx(r).filter((d) => d.attendance === 'unknown').length })).filter((x) => x.n > 0 || x.unknown > 0).sort((a, b) => b.n - a.n)
      return { title: `결석 ${pick.date ? md(pick.date) : '최근 7일'}`, head: ['학생', pick.date ? '출결' : '결석 일수'], rows: list.map(({ r, n, unknown }) => [name(r), n ? (pick.date ? '결석' : `${n}일`) : '기록 없음', unknown && n ? ` · 기록 없음 ${unknown}일` : '']) }
    }
    if (pick.metric === 'plan') {
      const list = included.map((r) => ({ r, n: dayIdx(r).filter((d) => d.submission === 'missing').length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)
      return { title: `계획 미제출 ${pick.date ? md(pick.date) : '최근 7일'}`, head: ['학생', pick.date ? '제출' : '미제출 일수'], rows: list.map(({ r, n }) => [name(r), pick.date ? '미제출' : `${n}일`, '']) }
    }
    if (pick.metric === 'study') {
      if (idx >= 0) {
        const list = included.flatMap((r) => { const d = r.days[idx], c = studyChange(d); return c === null ? [] : [{ r, d, c }] }).sort((a, b) => a.c - b.c)
        return { title: `학습 시간 ${md(pick.date!)} · 평소 대비 낮은 순`, head: ['학생', '실제 / 평소', '변화'], rows: list.map(({ r, d, c }) => [name(r), `${hours(d.minutes)} / ${hours(d.usualMinutes)}`, <b key="v" className={c <= -studyDropPercent ? 'ops-down' : ''}>{pct(c)}</b>]) }
      }
      const list = included.map((r) => ({ r, n: r.days.filter((d) => { const c = studyChange(d); return c !== null && c <= -studyDropPercent }).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)
      return { title: `학습 시간이 평소보다 ${studyDropPercent}% 이상 적은 날이 있는 학생`, head: ['학생', '해당 일수', '7일 / 평소 주'], rows: list.map(({ r, n }) => [name(r), `${n}일`, `${hours(r.week.minutes)} / ${hours(r.week.usualWeek)}`]) }
    }
    if (idx >= 0) {
      const list = included.flatMap((r) => { const d = r.days[idx], s = startShift(d); return s === null ? [] : [{ r, d, s }] }).sort((a, b) => b.s - a.s)
      return { title: `입실 시각 ${md(pick.date!)} · 평소보다 늦은 순`, head: ['학생', '실제 / 평소', '차이'], rows: list.map(({ r, d, s }) => [name(r), `${clock(d.start)} / ${clock(d.usualStart)}`, <b key="v" className={s >= startShiftMinutes ? 'ops-down' : ''}>{min(s)}</b>]) }
    }
    const list = included.map((r) => ({ r, n: r.days.filter((d) => { const s = startShift(d); return s !== null && s >= startShiftMinutes }).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)
    return { title: `입실이 평소보다 ${startShiftMinutes}분 이상 늦은 날이 있는 학생`, head: ['학생', '해당 일수'], rows: list.map(({ r, n }) => [name(r), `${n}일`, '']) }
  })()

  return (
    <section className="ops-branch" aria-label={`${branchName} 학습관 전체`}>
      <p className="ops-branch-summary">
        <b>{branchName} {rows.length}명</b>{excluded.size > 0 && <span> · 집계 {included.length}명</span>}
        <span> · 상담 필요 {rows.filter((r) => r.status === 'check').length}명 · 관리 중 {rows.filter((r) => r.status === 'managed' || r.status === 'recheck').length}명</span>
        {change && <span> · 학습 시간 평소 대비 <b className={change.percent < 0 ? 'ops-down' : ''}>{pct(change.percent)}</b></span>}
      </p>
      <div className="ops-bt" role="table" aria-label="날짜별 학습관 지표. 칸을 누르면 아래에 학생별 값이 나옵니다">
        <div className="ops-bt-row ops-bt-head" role="row"><span role="columnheader" />{days.map((d) => <span key={d.date} role="columnheader"><b>{md(d.date)}</b>{d.dow}</span>)}</div>
        <div className="ops-bt-row" role="row">
          <span role="rowheader">{cellBtn('absence', null, <>결석<small>결석 / 등원 예정</small></>, '결석 7일 전체 학생 보기')}</span>
          {days.map((d) => <span key={d.date} role="cell">{cellBtn('absence', d.date, <><b className={d.absent.length ? 'ops-down' : ''}>{d.scheduled ? `${d.absent.length} / ${d.scheduled}` : '예정 없음'}</b>{d.unknown > 0 && <small>기록 없음 {d.unknown}</small>}</>, `${md(d.date)} 결석 학생 보기`)}</span>)}
        </div>
        <div className="ops-bt-row" role="row">
          <span role="rowheader">{cellBtn('study', null, <>학습 시간<small>평균 · 평소 대비 중앙값</small></>, '학습 시간 7일 변화 학생 보기')}</span>
          {days.map((d) => { const present = included.flatMap((r) => r.days[days.indexOf(d)].minutes ?? []); const avg = present.length ? present.reduce((a, b) => a + b, 0) / present.length : null
            return <span key={d.date} role="cell">{cellBtn('study', d.date, <><b>{avg === null ? '—' : hours(avg)}</b>{d.studyChange && <small className={d.studyChange.median <= -studyDropPercent ? 'ops-down' : ''}>{pct(d.studyChange.median)} ({pct(d.studyChange.q1)}~{pct(d.studyChange.q3)})</small>}</>, `${md(d.date)} 학습 시간 학생별 보기`)}</span> })}
        </div>
        <div className="ops-bt-row" role="row">
          <span role="rowheader">{cellBtn('start', null, <>입실 시각<small>평소 대비 중앙값 (중간 50%)</small></>, '입실 시각 7일 변화 학생 보기')}</span>
          {days.map((d) => <span key={d.date} role="cell">{cellBtn('start', d.date, d.startShift ? <><b className={d.startShift.median >= startShiftMinutes ? 'ops-down' : ''}>{min(d.startShift.median)}</b><small>{min(d.startShift.q1)} ~ {min(d.startShift.q3)}</small></> : '—', `${md(d.date)} 입실 시각 학생별 보기`)}</span>)}
        </div>
        <div className="ops-bt-row" role="row">
          <span role="rowheader">{cellBtn('plan', null, <>계획 제출<small>제출 / 기록 확인</small></>, '계획 미제출 7일 학생 보기')}</span>
          {days.map((d) => <span key={d.date} role="cell">{cellBtn('plan', d.date, d.submitKnown ? <><b>{Math.round((d.submitted / d.submitKnown) * 100)}%</b><small>{d.submitted} / {d.submitKnown}</small></> : '—', `${md(d.date)} 계획 미제출 학생 보기`)}</span>)}
        </div>
      </div>
      <section className="ops-bt-detail" aria-live="polite" aria-label={detail.title}>
        <h3>{detail.title} <small>{detail.rows.length}명</small></h3>
        {detail.rows.length ? (
          <div className="ops-bt-list" role="table">
            <div className="ops-bt-list-row ops-bt-list-head" role="row">{detail.head.map((h) => <span key={h} role="columnheader">{h}</span>)}</div>
            {detail.rows.map((cells, i) => <div key={i} className="ops-bt-list-row" role="row">{cells.slice(0, detail.head.length).map((c, j) => <span key={j} role="cell">{c}</span>)}</div>)}
          </div>) : <p className="ops-muted">해당 학생 없음</p>}
      </section>
      <section className="ops-exclude" aria-label="집계 제외">
        <h3>집계에서 제외 <small>학습관 대표값 계산에서만 빠지고 학생 기록·상담 상태는 바뀌지 않음</small></h3>
        <input className="sc-input" aria-label="제외할 학생 이름" placeholder="학생 이름" value={query} onChange={(e) => setQuery(e.target.value)} />
        {candidates.map((s) => <button key={s.student.studentId} type="button" className="ops-link" onClick={() => { onExcludedChange(new Set([...excluded, s.student.studentId])); setQuery('') }}>{s.student.studentName} 제외</button>)}
        {excluded.size > 0 && <p>{[...excluded].map((id) => { const s = rows.find((r) => r.student.studentId === id); return s ? <button key={id} type="button" className="ops-chip-btn" onClick={() => { const next = new Set(excluded); next.delete(id); onExcludedChange(next) }}>{s.student.studentName} 복원</button> : null })}</p>}
      </section>
    </section>
  )
}
