// 시안 B: 4판 개선. 학생별 = 글자 명단 → 학생 팝업(이전·다음). 학습관별 = 사유별 인원 + 지표별 날짜 그래프 → 날짜 팝업(학생 전원·비교).
import { useMemo, useState } from 'react'
import { AllHistory } from '../../components/AllHistory.tsx'
import { careApi, md, useCareData, REASONS, type CareRow } from '../shared/useCareData.ts'
import { AxisPick, CareHeader, LoadState, Compare, Exclude, Section, StudentValues } from '../shared/parts.tsx'
import { RosterText, ReasonFilter } from '../shared/roster.tsx'
import { matchQuery, matchReason } from '../shared/useCareData.ts'
import { StudentFull } from '../shared/StudentFull.tsx'
import { Overlay } from '../shared/Overlay.tsx'
import { useLeaveGuard } from '../shared/useLeaveGuard.tsx'
import { branchModel, studentsOn, METRIC_KEYS, METRIC_LABEL, METRIC_SUB, type MetricKey } from '../shared/branch.ts'
import { MetricPanel } from '../shared/MetricPanel.tsx'
import { RESULT_HEAD, compareValue } from '../shared/results.ts'
import type { VisionAxis } from '../shared/visionExample.ts'
import { OverviewStrip } from '../shared/charts.tsx'
import { overviewRows } from '../shared/overview.ts'

const EMPTY: ReadonlySet<string> = new Set()

type Tab = 'students' | 'branch' | 'history'

export function VariantB() {
  const data = useCareData('b')
  const guard = useLeaveGuard()
  const [tab, setTab] = useState<Tab>('students')
  const [query, setQuery] = useState('')
  const [reason, setReason] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [dateView, setDateView] = useState<{ metric: MetricKey; i: number } | null>(null)
  const [axis, setAxis] = useState<VisionAxis>('phone_interaction')
  const [pinned, setPinned] = useState<string[]>([])
  const [excluded, setExcluded] = useState<Record<string, Set<string>>>({})
  const ex = excluded[data.branchId ?? ''] ?? EMPTY
  const rows = data.rows
  const shown = useMemo(() => rows?.filter((r) => matchReason(reason)(r) && matchQuery(query)(r)) ?? [], [rows, reason, query])
  const m = useMemo(() => rows ? branchModel(rows, ex) : null, [rows, ex])
  const go = (fn: () => void) => guard.guard(fn)
  // 팝업 안 이전·다음: 학생별 탭은 지금 걸린 명단 순서, 날짜 팝업에서 연 학생은 그 날짜 목록 순서
  const order = dateView && m ? studentsOn(m, dateView.metric, dateView.i, axis).map((v) => v.row) : shown
  const openRow = rows?.find((r) => r.student.studentId === openId) ?? null
  const pos = openRow ? order.findIndex((r) => r.student.studentId === openRow.student.studentId) : -1
  const close = () => go(() => { setOpenId(null) })

  if (!rows || !data.branchId || !m) return <div className="sc-page v5-page"><CareHeader data={data} title="학생 케어 B" /><LoadState data={data} /></div>
  const reasonCounts = REASONS.filter((x) => !['', 'flagged', 'managed', 'WEEKDAY_ABSENCE'].includes(x.key))
  const studentOverlay = openRow && (
    <Overlay kind="modal" label={`${openRow.student.studentName} 상세`} onClose={close} header={
      <div className="v5-overlay-bar">
        {dateView && <button type="button" className="sc-button" onClick={() => go(() => setOpenId(null))}>← {METRIC_LABEL[dateView.metric]} {md(m.days[dateView.i].date)} 목록으로</button>}
        <span className="v5-muted">{pos >= 0 ? `${pos + 1} / ${order.length}명` : ''}</span>
        <button type="button" className="sc-button" disabled={pos <= 0} onClick={() => go(() => setOpenId(order[pos - 1].student.studentId))}>← 이전 학생</button>
        <button type="button" className="sc-button" disabled={pos < 0 || pos >= order.length - 1} onClick={() => go(() => setOpenId(order[pos + 1].student.studentId))}>다음 학생 →</button>
        <button type="button" className="sc-button" onClick={() => { go(() => { setOpenId(null); setDateView(null) }) }}>닫기</button>
      </div>}>
      <StudentFull key={openRow.student.studentId} s={openRow} version={data.version} startShiftMinutes={data.startShiftMinutes} studyDropPercent={data.studyDropPercent} onSaved={data.saved} guard={guard} />
    </Overlay>)
  const dateOverlay = dateView && !openRow && (() => {
    const list = studentsOn(m, dateView.metric, dateView.i, axis)
    const d = m.days[dateView.i]
    return (
      <Overlay kind="modal" label={`${md(d.date)} ${METRIC_LABEL[dateView.metric]} 학생`} onClose={() => setDateView(null)} header={<>
        <div className="v5-overlay-bar"><h2>{md(d.date)} {d.dow} · {METRIC_LABEL[dateView.metric]}</h2><button type="button" className="sc-button" onClick={() => setDateView(null)}>닫기</button></div>
        <div className="v5-overlay-bar v5-wrap">
          <span className="v5-muted">다른 지표</span>{METRIC_KEYS.map((k) => <button key={k} type="button" className="v5-mini" aria-pressed={k === dateView.metric} onClick={() => setDateView({ metric: k, i: dateView.i })}>{METRIC_LABEL[k]}</button>)}
          <button type="button" className="v5-mini" disabled={dateView.i === 0} onClick={() => setDateView({ ...dateView, i: dateView.i - 1 })}>← {dateView.i > 0 ? md(m.days[dateView.i - 1].date) : ''}</button>
          <button type="button" className="v5-mini" disabled={dateView.i === 6} onClick={() => setDateView({ ...dateView, i: dateView.i + 1 })}>{dateView.i < 6 ? md(m.days[dateView.i + 1].date) : ''} →</button>
          {dateView.metric === 'vision' && <AxisPick axis={axis} onAxis={setAxis} />}<span>학생 {list.length}명{dateView.metric === 'study' && d.studyChange ? ` · 평소 대비 가운데 값 ${Math.round(d.studyChange.median)}%` : ''}</span>
        </div></>}>
        <Compare rows={rows} ids={pinned} onRemove={(id) => setPinned(pinned.filter((x) => x !== id))} value={compareValue(dateView.metric, axis)} />
        <StudentValues list={list} head={RESULT_HEAD[dateView.metric]} onOpen={(r) => setOpenId(r.student.studentId)} pinned={pinned} onPin={(id) => setPinned([...pinned, id])} />
      </Overlay>)
  })()

  return (
    <div className="sc-page v5-page">
      <CareHeader data={data} title="학생 케어 B" onBranchChange={() => { setOpenId(null); setDateView(null); setPinned([]) }} />
      <div className="sc-tabs v5-tabs" role="tablist" aria-label="보기">
        {([['students', '학생별'], ['branch', '학습관별'], ['history', '관리 이력']] as const).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className="sc-tab" onClick={() => go(() => setTab(k))}>{l}</button>)}
      </div>
      {tab === 'students' && (<>
        <div className="v5-toolbar">
          <p><b>{rows.length}명</b> 중 상담 필요 <b className="v5-late">{rows.filter((r) => r.status === 'check').length}명</b> · 관리 중 {rows.filter((r) => r.status === 'managed' || r.status === 'recheck').length}명 · 최근 7일 {md(rows[0].days[0].date)}–{md(rows[0].days[6].date)}</p>
          <ReasonFilter id="b-reason" rows={rows} value={reason} onChange={setReason} />
          <input className="sc-input" aria-label="학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <RosterText label="전체 학생" rows={shown} selectedId={openId} onOpen={(r: CareRow) => { setDateView(null); setOpenId(r.student.studentId) }} />
      </>)}
      {tab === 'branch' && (<>
        <Section title="한눈에 보기" sub="칸이 진할수록 그날 관리 쪽 학생이 많음">
          <OverviewStrip dates={m.days} rows={overviewRows(m, data.studyDropPercent, data.startShiftMinutes, (k) => document.getElementById(`b-metric-${k}`)?.scrollIntoView({ block: 'start' }))} />
        </Section>
        <Section title="사유별 학생" actions={<Exclude rows={rows} excluded={ex as Set<string>} onChange={(n) => setExcluded({ ...excluded, [data.branchId!]: n })} />}>
          <div className="v5-wrap">{reasonCounts.map((x) => <button key={x.key} type="button" className="v5-mini" onClick={() => { setReason(x.key); setQuery(''); setTab('students') }}>{x.label} {rows.filter(x.match).length}명 →</button>)}</div>
          {ex.size > 0 && <p className="v5-muted">집계 {m.included.length}명 (제외 {ex.size}명)</p>}
        </Section>
        {METRIC_KEYS.map((k) => (
          <Section key={k} id={`b-metric-${k}`} title={METRIC_LABEL[k]} sub={METRIC_SUB[k]}>
            <MetricPanel metric={k} m={m} studyDropPercent={data.studyDropPercent} startShiftMinutes={data.startShiftMinutes} height={k === 'study' || k === 'start' ? 200 : undefined} limit={8} onStudent={(r) => setOpenId(r.student.studentId)} onDay={(i) => setDateView({ metric: k, i })} selectedDay={dateView?.metric === k ? dateView.i : null} />
          </Section>))}
      </>)}
      {tab === 'history' && <AllHistory api={careApi} branchId={data.branchId} version={data.version} onOpenStudent={(id) => { setTab('students'); setOpenId(id) }} />}
      {studentOverlay}
      {dateOverlay}
      {guard.prompt}
    </div>
  )
}
