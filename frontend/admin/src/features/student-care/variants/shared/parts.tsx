// 시안 A–D 공통 화면 조각: 머리(지점·기준일·설정), 날짜 값 그래프, 날짜 범위 그래프, 분포 구간, 집계 제외, 학생 값 표.
// 그래프는 모든 값을 그 자리에 글자로 쓴다(범례를 두지 않음).
import { useEffect, useState, type ReactNode } from 'react'
import { SettingsDialog } from '../../components/SettingsDialog.tsx'
import { monthDay } from '../../model/format.ts'
import { careApi, md, type CareData, type CareRow } from './useCareData.ts'
import type { Bin, StudentValue } from './branch.ts'

export function CareHeader({ data, title, onBranchChange }: { data: CareData; title: string; onBranchChange?: () => void }) {
  const [open, setOpen] = useState(false)
  // 설정 창이 열려 있는 동안 뒤 문서 스크롤을 잠근다
  useEffect(() => { if (!open) return; const html = document.documentElement, prev = html.style.overflow; html.style.overflow = 'hidden'; return () => { html.style.overflow = prev } }, [open])
  return (
    <header className="sc-top">
      <h1 className="sc-top__title">{title}</h1>
      <div className="sc-top__controls">
        <label className="sc-visually-hidden" htmlFor="v5-branch">학습관</label>
        <select id="v5-branch" className="sc-select" value={data.branchId ?? ''} disabled={!data.branches.data?.length} onChange={(e) => { data.selectBranch(e.target.value); onBranchChange?.() }}>
          {data.branches.data?.map((b) => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
        </select>
        {data.asOf && <span className="sc-top__date">기준일 {monthDay(data.asOf)}</span>}
        <button type="button" className="sc-icon-button" aria-label="관리 기준 설정" title="관리 기준 설정" disabled={!data.branchId} onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" /></svg>
        </button>
      </div>
      <p className="sc-top__status" role="status" aria-live="polite">{data.status}</p>
      {data.branchId && <SettingsDialog api={careApi} branchId={data.branchId} open={open} onClose={() => setOpen(false)} onSaved={() => data.saved('관리 기준 저장')} />}
    </header>
  )
}

/** 상태 메시지: 불러오기 실패·빈 지점·로딩 */
export function LoadState({ data }: { data: CareData }) {
  if (data.branches.status === 'error') return <div className="sc-state" role="alert"><p>학습관을 불러오지 못했습니다.</p><button type="button" className="sc-button" onClick={data.branches.reload}>다시 시도</button></div>
  if (data.branches.data && data.branches.data.length === 0) return <p className="sc-state">등록된 학습관이 없습니다.</p>
  if (data.failed) return <div className="sc-state" role="alert"><p>학생 기록을 불러오지 못했습니다.</p><button type="button" className="sc-button" onClick={data.failed.reload}>다시 시도</button></div>
  return <p className="sc-state" role="status">불러오는 중</p>
}

interface DayCol { date: string; dow: string }

/** 날짜별 값 막대: 막대 위에 값, 아래에 날짜. 누르면 그 날짜 결과 */
export function DayBars({ days, values, label, max, selected, onPick, emphasis }: { days: DayCol[]; values: (number | null)[]; label: (v: number, i: number) => string; max?: number; selected?: number | null; onPick?: (i: number) => void; emphasis?: (v: number) => boolean }) {
  const top = max ?? Math.max(1, ...values.map((v) => v ?? 0))
  return (
    <div className="v5-daybars">
      {days.map((d, i) => { const v = values[i]; const body = <>
        <span className="v5-daybar-val">{v === null ? '—' : <b className={emphasis?.(v) ? 'v5-late' : ''}>{label(v, i)}</b>}</span>
        <span className="v5-daybar-track"><span className="v5-daybar-fill" style={{ height: `${v === null ? 0 : Math.max(2, (v / top) * 100)}%` }} /></span>
        <span className="v5-daybar-date">{md(d.date)} {d.dow}</span></>
      return onPick
        ? <button key={d.date} type="button" className="v5-daybar" aria-pressed={selected === i} aria-label={`${md(d.date)} ${v === null ? '값 없음' : label(v, i)} 학생 보기`} onClick={() => onPick(i)}>{body}</button>
        : <div key={d.date} className="v5-daybar">{body}</div> })}
    </div>
  )
}

/** 날짜별 학생 변화: 가운데 값(점)과 학생 가운데 절반 범위(세로 띠)를 0(평소) 선 위에 그리고 숫자를 함께 쓴다 */
export function DayRange({ days, stats, unit, selected, onPick, warn }: { days: DayCol[]; stats: ({ median: number; q1: number; q3: number; n: number } | null)[]; unit: '%' | '분'; selected?: number | null; onPick?: (i: number) => void; warn?: (median: number) => boolean }) {
  const lim = Math.max(10, ...stats.flatMap((s) => s ? [Math.abs(s.q1), Math.abs(s.q3), Math.abs(s.median)] : []))
  const y = (v: number) => 50 - (v / lim) * 46
  const f = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}${unit}`
  return (
    <div className="v5-dayrange">
      {days.map((d, i) => { const s = stats[i]; const body = <>
        <span className="v5-range-plot" aria-hidden="true">
          <span className="v5-range-zero" />
          {s && <span className="v5-range-band" style={{ top: `${y(s.q3)}%`, bottom: `${100 - y(s.q1)}%` }} />}
          {s && <span className={`v5-range-dot${warn?.(s.median) ? ' v5-range-warn' : ''}`} style={{ top: `${y(s.median)}%` }} />}
        </span>
        <span className="v5-range-text">{s ? <><b className={warn?.(s.median) ? 'v5-late' : ''}>{f(s.median)}</b><span>가운데 절반 {f(s.q1)}~{f(s.q3)}</span><span>학생 {s.n}명</span></> : '—'}</span>
        <span className="v5-daybar-date">{md(d.date)} {d.dow}</span></>
      return onPick
        ? <button key={d.date} type="button" className="v5-rangecol" aria-pressed={selected === i} aria-label={`${md(d.date)} ${s ? `평소 대비 ${f(s.median)}, 가운데 절반 ${f(s.q1)}~${f(s.q3)}` : '값 없음'} 학생 보기`} onClick={() => onPick(i)}>{body}</button>
        : <div key={d.date} className="v5-rangecol">{body}</div> })}
      <span className="v5-range-axis" aria-hidden="true">평소 (0)</span>
    </div>
  )
}

/** 분포 구간: 구간마다 학생 수 막대와 숫자. 누르면 그 구간 학생 */
export function Bins({ bins, selected, onPick, total }: { bins: Bin[]; selected?: number | null; onPick?: (i: number) => void; total: number }) {
  const max = Math.max(1, ...bins.map((b) => b.rows.length))
  return (
    <div className="v5-bins">
      {bins.map((b, i) => (
        <button key={b.label} type="button" className="v5-bin" aria-pressed={selected === i} disabled={!onPick || !b.rows.length} aria-label={`${b.label} ${b.rows.length}명 보기`} onClick={() => onPick?.(i)}>
          <b>{b.rows.length}명</b>
          <span className="v5-bin-track"><span className="v5-bin-fill" style={{ height: `${(b.rows.length / max) * 100}%` }} /></span>
          <span className="v5-bin-label">{b.label}</span>
        </button>
      ))}
      <span className="v5-muted v5-bins-total">학생 {total}명</span>
    </div>
  )
}

/** 학생 값 표(학습관 결과·명단). 학생 이름을 누르면 학생 상세, "비교"로 최대 3명 */
export function StudentValues({ list, head, onOpen, pinned, onPin }: { list: StudentValue[]; head: [string, string, string]; onOpen: (r: CareRow) => void; pinned: string[]; onPin: (id: string) => void }) {
  if (!list.length) return <p className="v5-muted">해당 학생 없음</p>
  return (
    <table className="v5-plain v5-values">
      <thead><tr><th scope="col">학생</th><th scope="col">{head[0]}</th><th scope="col">{head[1]}</th><th scope="col">{head[2]}</th><th scope="col"><span className="lh-visually-hidden">비교</span></th></tr></thead>
      <tbody>{list.map((v) => (
        <tr key={v.row.student.studentId}>
          <th scope="row"><button type="button" className="v5-link" onClick={() => onOpen(v.row)}>{v.row.student.studentName}</button> <span className="v5-muted">{v.row.student.className}</span></th>
          <td>{v.actual}</td><td>{v.usual}</td><td>{v.diff}</td>
          <td>{!pinned.includes(v.row.student.studentId) && pinned.length < 3 && <button type="button" className="v5-mini" onClick={() => onPin(v.row.student.studentId)}>비교</button>}</td>
        </tr>))}</tbody>
    </table>
  )
}

/** 고른 학생(최대 3명)의 7일 값을 같은 날짜 열로 비교 */
export function Compare({ rows, ids, onRemove, value }: { rows: CareRow[]; ids: string[]; onRemove: (id: string) => void; value: (r: CareRow, i: number) => string }) {
  if (!ids.length) return null
  const days = rows[0]?.days ?? []
  return (
    <section className="v5-compare" aria-label="학생 날짜 비교">
      <table className="v5-plain">
        <thead><tr><th scope="col">비교</th>{days.map((d) => <th key={d.date} scope="col">{md(d.date)} {d.dow}</th>)}<th scope="col"><span className="lh-visually-hidden">빼기</span></th></tr></thead>
        <tbody>{ids.map((id) => { const r = rows.find((x) => x.student.studentId === id); if (!r) return null
          return <tr key={id}><th scope="row">{r.student.studentName}</th>{r.days.map((d, i) => <td key={d.date}>{value(r, i)}</td>)}<td><button type="button" className="v5-mini" onClick={() => onRemove(id)}>빼기</button></td></tr> })}</tbody>
      </table>
    </section>
  )
}

/** 집계 제외·복원(학습관 대표값에서만 뺀다) */
export function Exclude({ rows, excluded, onChange }: { rows: CareRow[]; excluded: Set<string>; onChange: (next: Set<string>) => void }) {
  const [q, setQ] = useState('')
  const cand = q.trim() ? rows.filter((r) => r.student.studentName.includes(q.trim()) && !excluded.has(r.student.studentId)).slice(0, 5) : []
  return (
    <div className="v5-exclude">
      <label>집계에서 제외 <input className="sc-input" placeholder="학생 이름" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      {cand.map((r) => <button key={r.student.studentId} type="button" className="v5-mini" onClick={() => { onChange(new Set([...excluded, r.student.studentId])); setQ('') }}>{r.student.studentName} 제외</button>)}
      {[...excluded].map((id) => { const r = rows.find((x) => x.student.studentId === id); return r ? <button key={id} type="button" className="v5-mini" onClick={() => { const n = new Set(excluded); n.delete(id); onChange(n) }}>{r.student.studentName} 복원</button> : null })}
    </div>
  )
}

export function Section({ title, sub, children, actions, id }: { title: ReactNode; sub?: ReactNode; children: ReactNode; actions?: ReactNode; id?: string }) {
  return <section className="v5-card" id={id}><div className="v5-card-head"><h3>{title}{sub && <span className="v5-muted"> {sub}</span>}</h3>{actions}</div>{children}</section>
}

/** 비전 결과 표에서 볼 관찰 항목 고르기 */
export function AxisPick({ axis, onAxis }: { axis: import('./visionExample.ts').VisionAxis; onAxis: (a: import('./visionExample.ts').VisionAxis) => void }) {
  const axes = ['person_visible', 'head_down', 'phone_interaction', 'reading_or_writing'] as const
  const label = { person_visible: '자리에 있음', head_down: '고개 숙임', phone_interaction: '휴대폰 사용', reading_or_writing: '읽기·쓰기' }
  return <span className="v5-seg" role="group" aria-label="관찰 항목">{axes.map((a) => <button key={a} type="button" aria-pressed={axis === a} onClick={() => onAxis(a)}>{label[a]}</button>)}</span>
}
