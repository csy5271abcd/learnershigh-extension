// 시안 D: 학습관 우선. 첫 화면은 지표 한눈에 보기 + 선택한 지표 하나의 자세히(날짜별 분포 + 결과 학생).
// 학생을 누르면 학생 화면으로 바뀌고(주소 ?student=), "학습관으로"·뒤로 가기는 지표·날짜·검색·제외·비교·스크롤을 그대로 돌려준다.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AllHistory } from '../../components/AllHistory.tsx'
import { careApi, md, useCareData, type CareRow } from '../shared/useCareData.ts'
import { AxisPick, CareHeader, LoadState, Compare, Exclude, StudentValues } from '../shared/parts.tsx'
import { RosterText } from '../shared/roster.tsx'
import { matchQuery } from '../shared/useCareData.ts'
import { StudentFull } from '../shared/StudentFull.tsx'
import { useLeaveGuard } from '../shared/useLeaveGuard.tsx'
import { branchModel, studentsOn, METRIC_KEYS, METRIC_LABEL, METRIC_SUB, type MetricKey } from '../shared/branch.ts'
import { MetricPanel } from '../shared/MetricPanel.tsx'
import { OverviewStrip } from '../shared/charts.tsx'
import { overviewRows } from '../shared/overview.ts'
import { RESULT_HEAD, compareValue } from '../shared/results.ts'
import type { VisionAxis } from '../shared/visionExample.ts'

const EMPTY: ReadonlySet<string> = new Set()

type Tab = 'branch' | 'history'
const studentInUrl = () => new URLSearchParams(window.location.search).get('student')

export function VariantD() {
  const data = useCareData('d')
  const guard = useLeaveGuard()
  const [tab, setTab] = useState<Tab>('branch')
  const [metric, setMetric] = useState<MetricKey>('study')
  const [day, setDay] = useState<number | null>(null)
  const [allOpen, setAllOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [axis, setAxis] = useState<VisionAxis>('phone_interaction')
  const [pinned, setPinned] = useState<string[]>([])
  const [excluded, setExcluded] = useState<Record<string, Set<string>>>({})
  const [studentId, setStudentId] = useState<string | null>(studentInUrl)
  const scrollY = useRef(0)
  useEffect(() => { const on = () => guard.guard(() => setStudentId(studentInUrl())); window.addEventListener('popstate', on); return () => window.removeEventListener('popstate', on) }, [guard])
  useEffect(() => { if (!studentId) requestAnimationFrame(() => window.scrollTo(0, scrollY.current)) }, [studentId])
  const ex = excluded[data.branchId ?? ''] ?? EMPTY
  const rows = data.rows
  const m = useMemo(() => rows ? branchModel(rows, ex) : null, [rows, ex])
  const open = (r: CareRow) => guard.guard(() => { scrollY.current = window.scrollY; const u = new URL(window.location.href); u.searchParams.set('student', r.student.studentId); history.pushState(null, '', u); setStudentId(r.student.studentId); window.scrollTo(0, 0) })
  const back = () => guard.guard(() => { const u = new URL(window.location.href); u.searchParams.delete('student'); history.pushState(null, '', u); setStudentId(null) })

  if (!rows || !data.branchId || !m) return <div className="sc-page v5-page"><CareHeader data={data} title="학생 케어 D" /><LoadState data={data} /></div>
  const current = studentId ? rows.find((r) => r.student.studentId === studentId) ?? null : null
  if (current) return (
    <div className="sc-page v5-page">
      <div className="v5-wrap"><button type="button" className="sc-button" onClick={back}>← 학습관으로 ({METRIC_LABEL[metric]}{day !== null ? ` · ${md(m.days[day].date)}` : ''})</button></div>
      <StudentFull key={current.student.studentId} s={current} version={data.version} startShiftMinutes={data.startShiftMinutes} studyDropPercent={data.studyDropPercent} onSaved={data.saved} guard={guard} />
      {guard.prompt}
    </div>)
  const found = query.trim() ? rows.filter(matchQuery(query)).slice(0, 6) : []
  const list = day !== null ? studentsOn(m, metric, day, axis) : []
  return (
    <div className="sc-page v5-page">
      <CareHeader data={data} title="학생 케어 D" onBranchChange={() => { setDay(null); setPinned([]); setAllOpen(false) }} />
      <div className="sc-tabs v5-tabs" role="tablist" aria-label="보기">
        {([['branch', '학습관'], ['history', '관리 이력']] as const).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className="sc-tab" onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'history' ? <AllHistory api={careApi} branchId={data.branchId} version={data.version} onOpenStudent={(id) => { const r = rows.find((x) => x.student.studentId === id); if (r) open(r) }} /> : (<>
        <div className="v5-toolbar">
          <div className="v5-search">
            <input className="sc-input" aria-label="이름으로 학생 찾기" placeholder="이름으로 학생 찾기" value={query} onChange={(e) => setQuery(e.target.value)} />
            {found.length > 0 && <div className="v5-wrap">{found.map((r) => <button key={r.student.studentId} type="button" className="v5-mini" onClick={() => open(r)}>{r.student.studentName} {r.student.className}</button>)}</div>}
          </div>
          <Exclude rows={rows} excluded={ex as Set<string>} onChange={(n) => setExcluded({ ...excluded, [data.branchId!]: n })} />
          <button type="button" className="v5-mini" aria-pressed={allOpen} onClick={() => setAllOpen(!allOpen)}>전체 학생 {rows.length}명</button>
        </div>
        <section className="v5-card"><OverviewStrip dates={m.days} rows={overviewRows(m, data.studyDropPercent, data.startShiftMinutes, (k) => { setMetric(k); setDay(null); setAllOpen(false) }, allOpen ? null : metric)} /></section>
        <div className="v5-sticky v5-wrap" role="group" aria-label="지표 고르기">
          {METRIC_KEYS.map((k) => <button key={k} type="button" className="v5-mini" aria-pressed={!allOpen && metric === k} onClick={() => { setMetric(k); setDay(null); setAllOpen(false) }}>{METRIC_LABEL[k]}</button>)}
          {(day !== null || allOpen) && <button type="button" className="v5-mini" onClick={() => { setDay(null); setAllOpen(false) }}>결과 접기</button>}
        </div>
        {allOpen ? <section className="v5-card"><div className="v5-card-head"><h3>전체 학생 {rows.length}명</h3></div><RosterText label="전체 학생" rows={rows} onOpen={open} /></section> : (
          <section className="v5-card">
            <div className="v5-card-head"><h3>{METRIC_LABEL[metric]}<span className="v5-muted"> {METRIC_SUB[metric]}</span></h3></div>
            <MetricPanel metric={metric} m={m} studyDropPercent={data.studyDropPercent} startShiftMinutes={data.startShiftMinutes} height={300} onStudent={open} onDay={(i) => setDay(day === i ? null : i)} selectedDay={day} />
            {day !== null && <section className="v5-result" aria-label={`${METRIC_LABEL[metric]} ${md(m.days[day].date)} 학생`}>
              <div className="v5-result-head"><b>{md(m.days[day].date)} {m.days[day].dow} · 학생 {list.length}명</b>{metric === 'vision' && <AxisPick axis={axis} onAxis={setAxis} />}<button type="button" className="sc-button" onClick={() => setDay(null)}>접기</button></div>
              <div className="v5-result-body">
                <Compare rows={rows} ids={pinned} onRemove={(id) => setPinned(pinned.filter((x) => x !== id))} value={compareValue(metric, axis)} />
                <StudentValues list={list} head={RESULT_HEAD[metric]} onOpen={open} pinned={pinned} onPin={(id) => setPinned([...pinned, id])} />
              </div>
            </section>}
          </section>)}
      </>)}
      {guard.prompt}
    </div>
  )
}
