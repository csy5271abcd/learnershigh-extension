import type { CareApi } from '../api/httpStudentCareApi.ts'
import { CounselForm } from '../components/CounselForm.tsx'
import { RecheckPanel } from '../components/RecheckPanel.tsx'
import { useRemote, loadFailure } from '../model/useRemote.ts'
import { attendanceLabel, clock, hours, type OpsDay, type OpsStudent } from './opsModel.ts'

const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
const shortH = (m: number | null) => m === null ? '' : `${Math.floor(m / 60)}:${String(Math.round(m) % 60).padStart(2, '0')}`

function WeekColumns({ s, startShiftMinutes }: { s: OpsStudent; startShiftMinutes: number }) {
  const max = Math.max(60, ...s.days.map((d) => Math.max(d.minutes ?? 0, d.usualMinutes ?? 0)))
  const cell = (d: OpsDay, body: React.ReactNode, cls = '') => <div key={d.date} className={`ops-wk-cell ${cls}`}>{body}</div>
  return (
    <div className="ops-wk" role="table" aria-label={`${s.student.studentName} 최근 7일`}>
      <div className="ops-wk-row" role="row"><div className="ops-wk-h" role="rowheader" />{s.days.map((d) => cell(d, <><b>{md(d.date)}</b><span>{d.dow}</span></>, 'ops-wk-date'))}</div>
      <div className="ops-wk-row" role="row"><div className="ops-wk-h" role="rowheader">출결</div>{s.days.map((d) => cell(d, attendanceLabel[d.attendance], `ops-wk-att-${d.attendance}`))}</div>
      <div className="ops-wk-row" role="row"><div className="ops-wk-h" role="rowheader">계획</div>{s.days.map((d) => cell(d, d.submission === 'submitted' ? '제출' : d.submission === 'missing' ? '미제출' : '—', `ops-wk-sub-${d.submission}`))}</div>
      <div className="ops-wk-row ops-wk-bars" role="row"><div className="ops-wk-h" role="rowheader">학습<small>막대 실제 · 선 평소</small></div>{s.days.map((d) => cell(d, (
        <span className="ops-bar-box" aria-label={d.minutes === null ? attendanceLabel[d.attendance] : `${hours(d.minutes)}, 평소 ${hours(d.usualMinutes)}`}>
          {d.minutes !== null && <span className="ops-bar" style={{ height: `${(d.minutes / max) * 100}%` }} />}
          {d.usualMinutes !== null && <span className="ops-usual" style={{ bottom: `${(d.usualMinutes / max) * 100}%` }} />}
          <span className="ops-bar-val">{d.minutes === null ? '' : shortH(d.minutes)}</span>
        </span>)))}</div>
      <div className="ops-wk-row" role="row"><div className="ops-wk-h" role="rowheader">입실<small>평소 대비</small></div>{s.days.map((d) => {
        const diff = d.start !== null && d.usualStart !== null ? Math.round(d.start - d.usualStart) : null
        return cell(d, d.start === null ? '' : <><b>{clock(d.start)}</b>{diff !== null && <span className={Math.abs(diff) >= startShiftMinutes ? 'ops-late' : ''}>{diff > 0 ? '+' : ''}{diff}분</span>}</>)
      })}</div>
      <div className="ops-wk-row" role="row"><div className="ops-wk-h" role="rowheader">진행률<small>실제 ÷ 계획</small></div>{s.days.map((d) => {
        const rate = d.planned && d.actual !== null ? Math.round((d.actual / d.planned) * 100) : null
        return cell(d, rate === null ? (d.planned === 0 || d.planned === null) && d.attendance === 'present' ? '계획 없음' : '' : `${rate}%`)
      })}</div>
    </div>
  )
}

function Calendar35({ days }: { days: OpsDay[] }) {
  // 월요일 시작 주 단위로 배열. 같은 요일 반복 결석이 세로로, 연속 결석이 가로로 보인다
  const order = ['월', '화', '수', '목', '금', '토', '일']
  const firstIndex = order.indexOf(days[0].dow)
  const cells: (OpsDay | null)[] = [...Array(firstIndex).fill(null), ...days]
  while (cells.length % 7) cells.push(null)
  return (
    <div className="ops-cal" role="table" aria-label="35일 출결 달력">
      <div className="ops-cal-row" role="row">{order.map((d) => <span key={d} role="columnheader">{d}</span>)}</div>
      {Array.from({ length: cells.length / 7 }, (_, w) => (
        <div className="ops-cal-row" role="row" key={w}>{cells.slice(w * 7, w * 7 + 7).map((d, i) => d
          ? <span key={i} role="cell" className={`ops-cal-cell ops-att-${d.attendance}${d.submission === 'missing' ? ' ops-cal-missing' : ''}`} title={undefined} aria-label={`${md(d.date)} ${attendanceLabel[d.attendance]}${d.submission === 'missing' ? ', 계획 미제출' : ''}`}>{Number(d.date.slice(8, 10))}</span>
          : <span key={i} role="cell" className="ops-cal-cell ops-cal-empty" />)}</div>
      ))}
    </div>
  )
}

function Subjects({ s }: { s: OpsStudent }) {
  const flagged = s.signals.find((x) => x.type === 'SUBJECT_SHARE')?.summary.split(' ')[0]
  return (
    <div className="ops-subj" role="table" aria-label="과목별 계획·실제 비중">
      {s.subjects.map((x) => (
        <div className={`ops-subj-row${x.name === flagged ? ' ops-subj-flag' : ''}`} role="row" key={x.name}>
          <span role="rowheader">{x.name}</span>
          <span className="ops-subj-bars" role="cell">
            <span className="ops-subj-plan" style={{ width: `${x.plannedShare ?? 0}%` }} />
            <span className="ops-subj-actual" style={{ width: `${x.actualShare ?? 0}%` }} />
          </span>
          <span role="cell">{x.plannedShare === null ? '—' : Math.round(x.plannedShare)}% → {x.actualShare === null ? '—' : Math.round(x.actualShare)}%{x.name === flagged ? ` (${hours(x.plannedMinutes)} → ${hours(x.actualMinutes)})` : ''}</span>
        </div>
      ))}
    </div>
  )
}

export function OpsDetail({ api, s, version, startShiftMinutes, onSaved }: { api: CareApi; s: OpsStudent; version: number; startShiftMinutes: number; onSaved: (m: string) => void }) {
  const detail = useRemote(s.student.studentId, () => api.detail(s.student.branchId, s.student.studentId), version)
  const history = useRemote(`${s.student.studentId}/history`, () => api.history(s.student.branchId, s.student.studentId), version)
  const w = s.week
  const active = detail.data?.activeCase
  return (
    <section className="ops-detail" aria-label={`${s.student.studentName} 상세`} data-care-detail-student={s.student.studentName}>
      <header className="ops-detail-head">
        <h2>{s.student.studentName}</h2>
        <span className="ops-muted">{s.student.className}</span>
        {s.statusLabel && <span className={`ops-status ops-status-${s.status}`}>{s.statusLabel}{s.recheckDate ? ` · ${md(s.recheckDate)}` : ''}</span>}
      </header>
      {s.chips.length > 0 && <p className="ops-chips">{s.chips.map((c) => <span key={c.text} className={`ops-chip${c.derived ? ' ops-chip-derived' : ''}`}>{c.text}</span>)}</p>}
      <p className="ops-numbers">7일 {hours(w.minutes)} · 평소 주 {hours(w.usualWeek)} · 입실 {w.attended}/{w.scheduled}일 · 제출 {w.submitted}/{w.submitKnown}일 · 진행률 {w.executionRate === null ? '—' : `${Math.round(w.executionRate)}%`}</p>
      <WeekColumns s={s} startShiftMinutes={startShiftMinutes} />
      <div className="ops-detail-two">
        <section><h3>35일 출결</h3><Calendar35 days={s.history35} /></section>
        <section><h3>과목 비중 <small>계획 → 실제, 최근 7일</small></h3><Subjects s={s} /></section>
      </div>
      <section className="ops-counsel">
        {loadFailure(detail) ? <p role="alert">학생 상세를 불러오지 못했습니다. <button type="button" onClick={detail.reload}>다시 시도</button></p>
          : !detail.data ? <p role="status">불러오는 중</p>
          : active?.recheckDue ? <RecheckPanel api={api} branchId={s.student.branchId} asOf={detail.data.today ?? detail.data.asOf} careCase={active} onSaved={onSaved} onStale={() => detail.reload()} />
          : active || detail.data.signals.length ? <CounselForm api={api} branchId={s.student.branchId} studentId={s.student.studentId} caseId={active?.caseId ?? null} asOf={detail.data.today ?? detail.data.asOf} onSaved={onSaved} onStale={() => detail.reload()} />
          : <p className="ops-muted">표시된 사유가 없어 상담 기록 대상이 아닙니다.</p>}
        <h3>지난 관리</h3>
        {loadFailure(history) ? <p role="alert">이력을 불러오지 못했습니다. <button type="button" onClick={history.reload}>다시 시도</button></p>
          : !history.data ? <p role="status">불러오는 중</p>
          : history.data.items.length ? <ul className="ops-history">{history.data.items.slice(0, 5).map((item) => <li key={item.eventId}><b>{md(item.occurredOn)}</b> {item.content}</li>)}</ul>
          : <p className="ops-muted">관리 이력 없음</p>}
      </section>
    </section>
  )
}
