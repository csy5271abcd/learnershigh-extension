// 학생 케어 X′(docs/design/ops-redesign/x-handoff.md). X를 바탕으로 새로 짠 시안이다. X·Y·Z′ 코드는 건드리지 않는다.
// - 원래 러너스하이 관리 화면 모양: 회색 바탕 위 흰 카드, 밑줄 탭, 줄 사이 선만 있는 표, 파란 주 버튼, 어두운 머리 띠의 겹창.
// - 학생별: 한 줄에 한 명(상태 · 이름 · 반 · 서버 관리 사유와 그 값). 줄을 누르면 학생 겹창.
// - 학습관별: 한 행에 지표 하나. 학생을 누르면 같은 겹창.
// - 상담 기록: 학습관 전체 상담 기록(기존 AllHistory). 학생 이름으로 걸러 볼 수 있고, '현재 학생 지표'는 같은 겹창을 연다.
import { useMemo, useState } from 'react'
import { SettingsDialog } from '../../components/SettingsDialog.tsx'
import { AllHistory } from '../../components/AllHistory.tsx'
import { monthDay } from '../../model/format.ts'
import { careApi, useCareData, type CareRow } from '../shared/useCareData.ts'
import { useSupervisorEvents } from '../supervisor/supervisorClient.ts'
import { reasons } from '../z2/reasons.ts'
import { StudentDialog } from './x2Detail.tsx'
import { BranchX2 } from './x2Branch.tsx'
import { newbieOf, rateText, useVisionPerHour, VISION_DEFAULT, type Period } from './x2Model.ts'
import '../../student-care.css'
import './x2.css'

type View = 'student' | 'branch' | 'history'
const ORDER = { recheck: 0, check: 0, managed: 2, normal: 3, deferred: 4 } as const
// 확인 필요 안에서는 지금 기준을 넘은 사유 수 → 결석 일수 → 확인 날짜가 된 학생 순(1회차 검토: 순서 근거가 안 보였다)
const BELOW = '지금은 기준 아래'
const absentOf = (r: CareRow) => r.days.filter((d) => d.attendance === 'absent').length
// 구분은 '확인 필요' 하나로 묶는다(사용자 2026-11-12). 점검일이 된 학생도 확인 필요이고, 왜 걸렸는지는 겹창 안내 띠에서 본다
const CHIP = { recheck: 'x2-chip-danger', check: 'x2-chip-danger', managed: 'x2-chip-info', normal: 'x2-chip-muted', deferred: 'x2-chip-muted' } as const
const CHIP_TEXT = { recheck: '확인 필요', check: '확인 필요', managed: '관리 중', normal: '특이 없음', deferred: '기록 부족' } as const

export function VariantX2() {
  const data = useCareData('x2')
  const rows = useMemo(() => {
    const th0 = { shift: data.startShiftMinutes, rate: data.executionRate }
    const live = (r: CareRow) => reasons(r, th0).filter((x) => x.value !== BELOW).length
    return [...(data.rows ?? [])].sort((a, b) => ORDER[a.status] - ORDER[b.status] || live(b) - live(a) || absentOf(b) - absentOf(a) || Number(b.status === 'recheck') - Number(a.status === 'recheck') || a.student.studentName.localeCompare(b.student.studentName, 'ko'))
  }, [data.rows, data.startShiftMinutes, data.executionRate])
  const ids = useMemo(() => rows.map((r) => r.student.studentId), [rows])
  const sup = useSupervisorEvents(ids)
  const th = { drop: data.studyDropPercent, shift: data.startShiftMinutes, rate: data.executionRate }
  const [view, setView] = useState<View>('student')
  const [query, setQuery] = useState('')
  const [reason, setReason] = useState('')
  const [page, setPage] = useState(0)
  const [period, setPeriod] = useState<Period>('d')
  const [open, setOpen] = useState<{ id: string; list: CareRow[] } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [perHour, setPerHour] = useVisionPerHour()
  const [perDraft, setPerDraft] = useState('')

  const shown = rows.filter((r) => `${r.student.studentName} ${r.student.className ?? ''}`.includes(query.trim()) && (!reason || r.signals.some((x) => x.label === reason)))
  const reasonCount = useMemo(() => { const m = new Map<string, number>(); for (const r of rows) for (const x of r.signals) m.set(x.label, (m.get(x.label) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]) }, [rows])
  const PAGE = 20, pages = Math.ceil(shown.length / PAGE), at = Math.min(page, Math.max(0, pages - 1))
  const openRow = (r: CareRow, list: CareRow[]) => setOpen({ id: r.student.studentId, list })
  const cur = open ? rows.find((r) => r.student.studentId === open.id) ?? null : null
  const list = open ? open.list.map((x) => rows.find((r) => r.student.studentId === x.student.studentId) ?? x) : []

  return (
    <div className="x2">
      <header className="x2-top">
        <div><h1>학생 케어 X′</h1><p>학습관리 - 학생 케어</p></div>
        <div className="x2-top-tools">
          <select aria-label="학습관" value={data.branchId ?? ''} disabled={!data.branches.data?.length} onChange={(e) => { data.selectBranch(e.target.value); setOpen(null) }}>
            {data.branches.data?.map((b) => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
          </select>
          {data.asOf && <span>최근 7일 {monthDay(rows[0]?.days[0]?.date ?? data.asOf)}–{monthDay(data.asOf)}</span>}
          <button type="button" className="x2-btn" disabled={!data.branchId} onClick={() => { setPerDraft(String(perHour)); setSettingsOpen(true) }}>관리 기준</button>
        </div>
        <p className="sc-visually-hidden" role="status" aria-live="polite">{data.status}</p>
      </header>

      <div className="x2-card x2-main">
        <nav className="x2-views" role="tablist" aria-label="보기">
          {([['student', '학생별'], ['branch', '학습관별'], ['history', '상담 기록']] as [View, string][]).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}>{l}</button>)}
        </nav>
        {data.failed ? <div className="x2-state" role="alert"><p>학생 기록을 불러오지 못했습니다.</p><button type="button" className="x2-btn" onClick={data.failed.reload}>다시 시도</button></div>
          : !data.rows ? <p className="x2-state" role="status">불러오는 중</p>
          : view === 'branch' ? <BranchX2 rows={rows} sup={sup} th={th} perHour={perHour} period={period} onPeriod={setPeriod} onStudent={openRow} onReason={(l) => { setReason(l); setQuery(''); setPage(0); setView('student') }} />
          : view === 'history' ? (data.branchId ? <AllHistory api={careApi} branchId={data.branchId} version={data.version} onOpenStudent={(id) => { const r = rows.find((x) => x.student.studentId === id); if (r) openRow(r, [r]) }} /> : null)
          : <section className="x2-roster" aria-label="학생 목록">
            <div className="x2-tools">
              <input type="search" placeholder="이름 또는 반 검색" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0) }} aria-label="학생 검색" />
              <select aria-label="관리 사유로 거르기" value={reason} onChange={(e) => { setReason(e.target.value); setPage(0) }}>
                <option value="">관리 사유 전체</option>
                {reasonCount.map(([l, n]) => <option key={l} value={l}>{l} ({n}명)</option>)}
              </select>
              <span className="x2-count">{shown.length}명{(query || reason) && ` / 전체 ${rows.length}명`}</span>
              {(query || reason) && <button type="button" className="x2-link" onClick={() => { setQuery(''); setReason(''); setPage(0) }}>조건 지우기</button>}
            </div>
            <table className="x2-table">
              <thead><tr><th scope="col">구분</th><th scope="col">이름</th><th scope="col">반</th><th scope="col">관리 사유</th><th scope="col"><span className="sc-visually-hidden">열기</span></th></tr></thead>
              <tbody>
                {shown.slice(at * PAGE, at * PAGE + PAGE).map((r) => {
                  const rs = reasons(r, th)
                  return <tr key={r.student.studentId} tabIndex={0} aria-label={`${r.student.studentName} 상세 열기`} onClick={() => openRow(r, shown)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRow(r, shown) } }}>
                    <td>{(() => { const nb = newbieOf(r); return nb && r.status !== 'recheck' && r.status !== 'check' ? <span className="x2-chip x2-chip-info">새 학생</span> : <span className={`x2-chip ${CHIP[r.status]}`}>{CHIP_TEXT[r.status]}</span> })()}</td>
                    <td className="x2-name">{r.student.studentName}</td>
                    <td className="x2-cls">{r.student.className}</td>
                    <td><div className="x2-rs">
                      {r.status === 'recheck' && <span><b>확인 날짜</b><em>{r.recheckDate ? `${Number(r.recheckDate.slice(5, 7))}/${Number(r.recheckDate.slice(8, 10))} 상담에서 정함` : '상담에서 정함'}</em></span>}
                      {rs.map((x) => <span key={x.label} className={x.value === BELOW ? 'x2-rs-below' : undefined}><b>{x.label}</b>{x.value && <em>{x.value === BELOW ? '지금은 기준 아래로 내려옴' : x.value}</em>}</span>)}
                      {!rs.length && r.status !== 'recheck' && (() => { const nb = newbieOf(r); return nb ? <span><b>{nb.first ? `${Number(nb.first.slice(5, 7))}/${Number(nb.first.slice(8, 10))} 첫 기록` : '아직 기록 없음'}</b>{nb.first && <em>{nb.days}일째</em>}</span> : <span className="x2-none">관리 사유 없음</span> })()}
                    </div></td>
                    <td className="x2-go" aria-hidden="true">상세 ›</td>
                  </tr>
                })}
              </tbody>
            </table>
            {!shown.length && <p className="x2-state">{reason ? '이 사유의 학생이 없습니다' : '검색 결과가 없습니다'}</p>}
            {pages > 1 && <nav className="x2-pager" aria-label="목록 쪽">{Array.from({ length: pages }, (_, k) => <button key={k} type="button" aria-current={k === at ? 'page' : undefined} onClick={() => setPage(k)}>{k + 1}</button>)}</nav>}
          </section>}
      </div>

      <StudentDialog s={cur} list={list} sup={sup} th={th} perHour={perHour} version={data.version} onSaved={data.saved} onMove={(r) => setOpen(open && { ...open, id: r.student.studentId })} onClose={() => setOpen(null)} />
      {data.branchId && <SettingsDialog api={careApi} branchId={data.branchId} open={settingsOpen} onClose={() => setSettingsOpen(false)}
        onSaved={() => { const v = Number(perDraft); if (Number.isFinite(v) && v > 0) setPerHour(v); setSettingsOpen(false); data.saved('관리 기준 저장') }}
        extra={<div className="sc-setting x2-extra">
          <label className="sc-setting__label" htmlFor="x2-per-hour">비몰입 표시(공부 1시간당)</label>
          <div className="sc-setting__control"><input id="x2-per-hour" className="sc-input" type="number" inputMode="decimal" min={0.5} max={20} step={0.5} value={perDraft} onChange={(e) => setPerDraft(e.target.value)} /><span className="sc-setting__unit">건 이상</span></div>
          <span className="sc-setting__hint">서버 판정이 아닌 화면 표시 기준 · 이 브라우저에만 저장 · 기본 {rateText(VISION_DEFAULT)}건</span>
        </div>} />}
    </div>
  )
}



