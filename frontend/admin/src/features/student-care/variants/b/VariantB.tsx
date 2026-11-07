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
import { branchModel, studentsOn, METRIC_KEYS, METRIC_LABEL, type MetricKey } from '../shared/branch.ts'
import { MetricPanel } from '../shared/MetricPanel.tsx'
import { RESULT_HEAD, RESULT_AXIS, compareValue, outFilter, dirLabel } from '../shared/results.ts'
import type { VisionAxis } from '../shared/visionExample.ts'
import { BranchRows, BandList } from '../shared/BranchRows.tsx'
import type { Band } from '../shared/bands.ts'
import { BAND_LABEL } from '../shared/bands.ts'

const EMPTY: ReadonlySet<string> = new Set()

type Tab = 'students' | 'branch' | 'history'

export function VariantB() {
  const data = useCareData('b')
  const guard = useLeaveGuard()
  const [tab, setTab] = useState<Tab>('students')
  const [query, setQuery] = useState('')
  const [reason, setReason] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [dateView, setDateView] = useState<{ metric: MetricKey; i: number; dir?: 'above' | 'below' } | null>(null)
  const [axis, setAxis] = useState<VisionAxis>('phone_interaction')
  const [pinned, setPinned] = useState<string[]>([])
  const [metricView, setMetricView] = useState<MetricKey | null>(null)
  const [band, setBand] = useState<{ metric: MetricKey; band: Band | null } | null>(null)
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
        <button type="button" className="sc-button" onClick={() => { go(() => { setOpenId(null); setDateView(null); setBand(null) }) }}>닫기</button>
      </div>}>
      <StudentFull key={openRow.student.studentId} s={openRow} version={data.version} startShiftMinutes={data.startShiftMinutes} studyDropPercent={data.studyDropPercent} thresholds={data.thresholds} executionRate={data.executionRate} onSaved={data.saved} guard={guard} />
    </Overlay>)
  const dateOverlay = dateView && !openRow && (() => {
    const list = outFilter(studentsOn(m, dateView.metric, dateView.i, axis), dateView.metric, dateView.dir)
    const d = m.days[dateView.i]
    return (
      <Overlay kind="modal" label={`${md(d.date)} ${METRIC_LABEL[dateView.metric]} 학생`} onClose={() => setDateView(null)} header={<>
        <div className="v5-overlay-bar"><h2>{md(d.date)} {d.dow} · {METRIC_LABEL[dateView.metric]}{dirLabel(dateView.dir)}</h2><button type="button" className="sc-button" onClick={() => setDateView(null)}>닫기</button></div>
        <div className="v5-overlay-bar v5-wrap">
          <span className="v5-muted">다른 지표</span>{METRIC_KEYS.map((k) => <button key={k} type="button" className="v5-mini" aria-pressed={k === dateView.metric} onClick={() => setDateView({ metric: k, i: dateView.i })}>{METRIC_LABEL[k]}</button>)}
          <button type="button" className="v5-mini" disabled={dateView.i === 0} onClick={() => setDateView({ ...dateView, i: dateView.i - 1 })}>← {dateView.i > 0 ? md(m.days[dateView.i - 1].date) : ''}</button>
          <button type="button" className="v5-mini" disabled={dateView.i === 6} onClick={() => setDateView({ ...dateView, i: dateView.i + 1 })}>{dateView.i < 6 ? md(m.days[dateView.i + 1].date) : ''} →</button>
          {dateView.metric === 'vision' && <AxisPick axis={axis} onAxis={setAxis} />}<span>학생 {list.length}명{dateView.metric === 'study' && d.studyChange ? ` · 평소 대비 가운데 값 ${Math.round(d.studyChange.median)}%` : ''}</span>
        </div></>}>
        <Compare rows={rows} ids={pinned} onRemove={(id) => setPinned(pinned.filter((x) => x !== id))} value={compareValue(dateView.metric, axis)} />
        <StudentValues list={list} head={RESULT_HEAD[dateView.metric]} axis={RESULT_AXIS[dateView.metric]} onOpen={(r) => setOpenId(r.student.studentId)} pinned={pinned} onPin={(id) => setPinned([...pinned, id])} />
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
        <section className="v5-card"><BranchRows rows={m.included} t={data.thresholds} onBand={(k, b) => setBand({ metric: k, band: b })} selected={band ?? (metricView ? { metric: metricView, band: null } : null)} onMetric={(k, i) => { setMetricView(k); if (i !== undefined) setDateView({ metric: k, i }) }} /></section>
        <Section title="사유별 학생" actions={<Exclude rows={rows} excluded={ex as Set<string>} onChange={(n) => setExcluded({ ...excluded, [data.branchId!]: n })} />}>
          <div className="v5-wrap">{reasonCounts.map((x) => <button key={x.key} type="button" className="v5-mini" onClick={() => { setReason(x.key); setQuery(''); setTab('students') }}>{x.label} {rows.filter(x.match).length}명 →</button>)}</div>
          {ex.size > 0 && <p className="v5-muted">집계 {m.included.length}명 (제외 {ex.size}명)</p>}
        </Section>
      </>)}
      {tab === 'history' && <AllHistory api={careApi} branchId={data.branchId} version={data.version} onOpenStudent={(id) => { setTab('students'); setOpenId(id) }} />}
      {band && !openRow && <Overlay kind="modal" label="단계별 학생" onClose={() => setBand(null)} header={<div className="v5-overlay-bar"><h2>{METRIC_LABEL[band.metric]} · {BAND_LABEL[band.band!]}</h2><button type="button" className="sc-button" onClick={() => setBand(null)}>닫기</button></div>}><BandList metric={band.metric} band={band.band!} rows={m.included} t={data.thresholds} onOpen={(r) => setOpenId(r.student.studentId)} /></Overlay>}
      {metricView && !dateView && !openRow && !band && <Overlay kind="modal" label={`${METRIC_LABEL[metricView]} 날짜별`} onClose={() => setMetricView(null)} header={<div className="v5-overlay-bar"><h2>{METRIC_LABEL[metricView]} · 날짜별</h2><button type="button" className="sc-button" onClick={() => setMetricView(null)}>닫기</button></div>}>
        <MetricPanel metric={metricView} m={m} studyDropPercent={data.studyDropPercent} startShiftMinutes={data.startShiftMinutes} height={300} onStudent={(r) => setOpenId(r.student.studentId)} onDay={(i, dir) => setDateView({ metric: metricView, i, dir })} />
      </Overlay>}
      {studentOverlay}
      {dateOverlay}
      {guard.prompt}
    </div>
  )
}
