// 학생 케어 Z안(docs/design/ops-redesign/plan-z.md). 콘셉트 "사용자 친화적": 오늘 볼 학생 → 한 명씩 상세·상담 → 학습관 전체 변화.
// 데이터는 useCareData(학생 케어 board·metrics·settings API)와 사진 관찰 서비스의 일일 보고(vision/)를 쓴다. 판정은 두 서버 그대로.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AllHistory } from '../../components/AllHistory.tsx'
import { SettingsDialog } from '../../components/SettingsDialog.tsx'
import { monthDay } from '../../model/format.ts'
import { careApi, useCareData, type CareRow } from '../shared/useCareData.ts'
import { Roster } from './Roster.tsx'
import { Branch, type BranchPick } from './Branch.tsx'
import { StudentDetail } from './StudentDetail.tsx'
import { TipHost } from './Tip.tsx'
import { useVisionWeek } from './vision/useVisionWeek.ts'
import { studentVision } from './vision/visionModel.ts'
import { visionStudentIdOf } from './vision/visionClient.ts'
import { VisionGate } from './vision/VisionGate.tsx'
import '../../student-care.css'
import './z.css'

type Tab = 'today' | 'branch' | 'history'
interface Open { id: string; list: string[]; from: Tab }

const GEAR = 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z'

export function VariantZ() {
  const data = useCareData('z')
  const [tab, setTab] = useState<Tab>('today')
  const [open, setOpen] = useState<Open | null>(null)
  const [pick, setPick] = useState<BranchPick>(null)
  const [query, setQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState<(() => void) | null>(null)
  const rows = data.rows
  const dates = useMemo(() => rows?.[0]?.days.map((d) => d.date) ?? [], [rows])
  const week = useVisionWeek(data.branchId, dates)
  const vision = useMemo(() => new Map(week.status === 'ready' ? (rows ?? []).map((r) => [r.student.studentId, studentVision(week.reports, dates, visionStudentIdOf(r.student.studentId))]) : []), [rows, week.status, week.reports, dates])
  const guard = (action: () => void) => { if (dirty) setPending(() => action); else action() }

  const dialog = useRef<HTMLDivElement>(null)
  const toTop = () => requestAnimationFrame(() => dialog.current?.scrollTo({ top: 0 }))
  const openStudent = (r: CareRow, list: CareRow[], from: Tab) => guard(() => { setDirty(false); setOpen({ id: r.student.studentId, list: list.map((x) => x.student.studentId), from }); setTab(from); toTop() })
  const back = () => guard(() => {
    const o = open!
    setDirty(false); setOpen(null)
    setTimeout(() => { const el = document.getElementById(`z-row-${o.id}`); el?.scrollIntoView({ block: 'nearest' }); el?.focus({ preventScroll: true }) }, 0)
  })
  const step = (d: -1 | 1) => guard(() => { const i = open!.list.indexOf(open!.id); const id = open!.list[i + d]; if (id) { setDirty(false); setOpen({ ...open!, id }); toTop() } })

  const current = open && rows?.find((r) => r.student.studentId === open.id)
  const index = open ? open.list.indexOf(open.id) : -1
  const name = (id: string | undefined) => rows?.find((r) => r.student.studentId === id)?.student.studentName

  // 학생 상세는 명부 위의 큰 겹창이다(사용자 결정 2026-11-08, F04 예외). 열린 동안 뒤 문서는 스크롤·초점을 막아 스크롤 영역을 하나로 둔다
  const isOpen = !!current
  useEffect(() => {
    if (!isOpen) return
    const html = document.documentElement, prev = html.style.overflow
    html.style.overflow = 'hidden'
    dialog.current?.focus({ preventScroll: true })
    return () => { html.style.overflow = prev }
  }, [isOpen])

  let body: ReactNode
  if (data.branches.status === 'error') body = <div className="sc-state" role="alert"><p>학습관을 불러오지 못했습니다.</p><button type="button" className="sc-button" onClick={data.branches.reload}>다시 시도</button></div>
  else if (data.branches.data && !data.branches.data.length) body = <p className="sc-state">등록된 학습관이 없습니다.</p>
  else if (data.failed) body = <div className="sc-state" role="alert"><p>학생 기록을 불러오지 못했습니다.</p><button type="button" className="sc-button" onClick={data.failed.reload}>다시 시도</button></div>
  else if (!rows || !data.branchId) body = <p className="sc-state" role="status">불러오는 중</p>
  else if (!rows.length) body = <p className="sc-state">이 학습관에 학생이 없습니다.</p>
  let detail: ReactNode = null
  if (current) detail = (
    <StudentDetail key={current.student.studentId} s={current} vision={vision.get(current.student.studentId) ?? null} week={week} data={data} onSaved={data.saved} onDirty={setDirty}
      nav={<nav className="z-detail-nav" aria-label="학생 이동">
        {open!.list.length > 1 ? <span className="z-step">
          <button type="button" className="sc-button" disabled={index <= 0} onClick={() => step(-1)}>‹ {name(open!.list[index - 1]) ?? '이전'}</button>
          <span className="z-muted">{index + 1} / {open!.list.length}</span>
          <button type="button" className="sc-button" disabled={index >= open!.list.length - 1} onClick={() => step(1)}>{name(open!.list[index + 1]) ?? '다음'} ›</button>
        </span> : <span />}
        <button type="button" className="sc-button z-close" onClick={back} aria-label="닫기">닫기 <kbd>Esc</kbd></button>
      </nav>} />
  )
  if (body) { /* 상태 메시지 */ } else if (tab === 'history' && rows && data.branchId) body = <AllHistory api={careApi} branchId={data.branchId} version={data.version} onOpenStudent={(id) => { const r = rows.find((x) => x.student.studentId === id); if (r) openStudent(r, [r], 'history') }} />
  else if (tab === 'branch' && rows && data.branchId) body = <Branch rows={rows} week={week} thresholds={data.thresholds} pick={pick} onPick={setPick} onOpen={(r, list) => openStudent(r, list, 'branch')} />
  else if (rows) body = <Roster rows={rows} vision={vision} query={query} onQuery={setQuery} onOpen={(r, list) => openStudent(r, list, 'today')} />

  const leave = pending && <div className="z-leave" role="alert">
    <b>저장하지 않은 상담 기록이 있습니다</b>
    <button type="button" className="sc-button" onClick={() => setPending(null)}>계속 작성</button>
    <button type="button" className="sc-button" onClick={() => { const go = pending; setPending(null); setDirty(false); go() }}>버리고 이동</button>
  </div>

  return (
    <TipHost>
      <div className="sc-page z-page">
        <header className="sc-top">
          <h1 className="sc-top__title">학생 케어 Z</h1>
          <div className="sc-top__controls">
            <label className="sc-visually-hidden" htmlFor="z-branch">학습관</label>
            <select id="z-branch" className="sc-select" value={data.branchId ?? ''} disabled={!data.branches.data?.length} onChange={(e) => { const v = e.target.value; guard(() => { setDirty(false); data.selectBranch(v); setOpen(null); setPick(null) }) }}>
              {data.branches.data?.map((b) => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
            </select>
            {data.asOf && <span className="sc-top__date">기준일 {monthDay(data.asOf)}</span>}
            <button type="button" className="sc-icon-button" aria-label="관리 기준 설정" title="관리 기준 설정" disabled={!data.branchId} onClick={() => setSettingsOpen(true)}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d={GEAR} /></svg>
            </button>
          </div>
          <p className="sc-top__status" role="status" aria-live="polite">{data.status}</p>
        </header>
        <div className="sc-tabs z-tabs" role="tablist" aria-label="보기">
          {([['today', '오늘'], ['branch', '학습관'], ['history', '관리 이력']] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className="sc-tab" onClick={() => guard(() => { setDirty(false); setOpen(null); setTab(k) })}>{l}</button>
          ))}
        </div>
        {pending && !detail && leave}
        <div className="z-body" inert={isOpen}>{tab === 'today' && week.status !== 'ready' && <VisionGate week={week} />}{body}</div>
        {data.branchId && <SettingsDialog api={careApi} branchId={data.branchId} open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={() => data.saved('관리 기준 저장')} />}
        {detail && <div className="z-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) back() }}>
          <div ref={dialog} className="z-dialog" role="dialog" aria-modal="true" aria-labelledby="z-detail-name" tabIndex={-1} onKeyDown={(e) => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); back() } }}>
            {pending && leave}
            {detail}
          </div>
        </div>}
      </div>
    </TipHost>
  )
}
