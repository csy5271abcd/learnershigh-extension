// 시안 A: 기존 학생 케어 화면 개선. 구조 유지(학생 표 → 행 아래 펼침, 학습관별 지표 카드).
// 고친 점: 상태 칸에 사유, 사유 필터, 펼친 상세는 본문 전체 폭, 카드 안 결과(그 카드 행 바로 아래), 지표별 표현(representation-v5).
import { Fragment, useMemo, useState } from 'react'
import { AllHistory } from '../../components/AllHistory.tsx'
import { careApi, md, useCareData, type CareRow } from '../shared/useCareData.ts'
import { AxisPick, CareHeader, LoadState, Compare, Exclude, StudentValues } from '../shared/parts.tsx'
import { ReasonFilter, StatusText } from '../shared/roster.tsx'
import { matchQuery, matchReason } from '../shared/useCareData.ts'
import { StudentFull } from '../shared/StudentFull.tsx'
import { useLeaveGuard } from '../shared/useLeaveGuard.tsx'
import { branchModel, studentsOn, METRIC_LABEL, type MetricKey } from '../shared/branch.ts'
import { MetricPanel } from '../shared/MetricPanel.tsx'
import { RESULT_HEAD, RESULT_AXIS, compareValue, outFilter, dirLabel } from '../shared/results.ts'
import { BranchRows, BandList } from '../shared/BranchRows.tsx'
import type { Band } from '../shared/bands.ts'
import { BAND_LABEL } from '../shared/bands.ts'
import type { VisionAxis } from '../shared/visionExample.ts'

const EMPTY: ReadonlySet<string> = new Set()

type Tab = 'students' | 'branch' | 'history'

export function VariantA() {
  const data = useCareData('a')
  const guard = useLeaveGuard()
  const [tab, setTab] = useState<Tab>('students')
  const [query, setQuery] = useState('')
  const [reason, setReason] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [pick, setPick] = useState<{ metric: MetricKey; i: number; dir?: 'above' | 'below' } | null>(null)
  const [axis, setAxis] = useState<VisionAxis>('phone_interaction')
  const [pinned, setPinned] = useState<string[]>([])
  const [band, setBand] = useState<{ metric: MetricKey; band: Band | null } | null>(null)
  const [excluded, setExcluded] = useState<Record<string, Set<string>>>({})
  const ex = excluded[data.branchId ?? ''] ?? EMPTY
  const rows = data.rows
  const shown = useMemo(() => rows?.filter((r) => matchReason(reason)(r) && matchQuery(query)(r)) ?? [], [rows, reason, query])
  const m = useMemo(() => rows ? branchModel(rows, ex) : null, [rows, ex])
  const go = (fn: () => void) => guard.guard(fn)
  const toggle = (id: string) => go(() => { setOpenId(openId === id ? null : id); if (openId === id) requestAnimationFrame(() => document.getElementById(`v5-open-${id}`)?.focus()) })
  const openFromBranch = (r: CareRow) => go(() => { setTab('students'); setReason(''); setQuery(''); setOpenId(r.student.studentId); requestAnimationFrame(() => document.getElementById(`v5-open-${r.student.studentId}`)?.scrollIntoView({ block: 'start' })) })

  if (!rows || !data.branchId || !m) return <div className="sc-page v5-page"><CareHeader data={data} title="학생 케어 A" /><LoadState data={data} /></div>
  return (
    <div className="sc-page v5-page">
      <CareHeader data={data} title="학생 케어 A" onBranchChange={() => { setOpenId(null); setPick(null); setPinned([]) }} />
      <div className="sc-tabs v5-tabs" role="tablist" aria-label="보기">
        {([['students', '학생별'], ['branch', '학습관별'], ['history', '관리 이력']] as const).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className="sc-tab" onClick={() => go(() => setTab(k))}>{l}</button>)}
      </div>
      {tab === 'students' && (<>
        <div className="v5-toolbar">
          <p><b>{rows.length}명</b> 중 상담 필요 <b className="v5-late">{rows.filter((r) => r.status === 'check').length}명</b> · 관리 중 {rows.filter((r) => r.status === 'managed' || r.status === 'recheck').length}명 · 최근 7일 {md(rows[0].days[0].date)}–{md(rows[0].days[6].date)}</p>
          <ReasonFilter id="a-reason" rows={rows} value={reason} onChange={setReason} />
          <input className="sc-input" aria-label="학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {shown.length ? (
          <table className="v5-plain v5-table-a" aria-label="전체 학생">
            <thead><tr><th scope="col">학생</th><th scope="col">상태</th><th scope="col">사유</th></tr></thead>
            <tbody>{shown.map((r) => { const id = r.student.studentId, open = openId === id
              return <Fragment key={id}>
                <tr className={`v5-row-${r.status}`} data-care-roster-row={id} aria-current={open ? 'true' : undefined}>
                  <th scope="row"><button type="button" id={`v5-open-${id}`} className="v5-link" aria-expanded={open} onClick={() => toggle(id)}>{r.student.studentName} <span aria-hidden="true">{open ? '⌄' : '›'}</span></button> <span className="v5-muted">{r.student.className}</span></th>
                  <td><StatusText r={r} /></td>
                  <td>{r.chips[0] && <span className={`v5-chip${r.chips[0].derived ? ' v5-chip-ref' : ''}`}>{r.chips[0].text}</span>}{r.chips.length > 1 && <span className="v5-muted">+{r.chips.length - 1}</span>}</td>
                </tr>
                {open && <tr className="v5-expanded"><td colSpan={3}><StudentFull s={r} version={data.version} startShiftMinutes={data.startShiftMinutes} studyDropPercent={data.studyDropPercent} thresholds={data.thresholds} executionRate={data.executionRate} onSaved={data.saved} guard={guard} actions={<button type="button" className="sc-button" onClick={() => toggle(id)}>접기</button>} /></td></tr>}
              </Fragment> })}</tbody>
          </table>) : <p className="sc-state">조건에 맞는 학생이 없습니다.</p>}
      </>)}
      {tab === 'branch' && (<>
        <div className="v5-wrap"><Exclude rows={rows} excluded={ex as Set<string>} onChange={(n) => setExcluded({ ...excluded, [data.branchId!]: n })} />{ex.size > 0 && <span className="v5-muted">집계 {m.included.length}명</span>}</div>
        <section className="v5-card"><BranchRows rows={m.included} t={data.thresholds} selected={band} onBand={(k, b) => setBand(band?.metric === k && band.band === b ? null : { metric: k, band: b })} onMetric={(k, i) => { if (i !== undefined) { setBand({ metric: k, band: null }); setPick({ metric: k, i }); return } setPick(null); setBand(band?.metric === k && band.band === null ? null : { metric: k, band: null }) }} detail={(k) => <div className="v5-inline-detail"><MetricPanel metric={k} m={m} studyDropPercent={data.studyDropPercent} startShiftMinutes={data.startShiftMinutes} height={260} lines={(k === 'study' || k === 'start') ? pinned.flatMap((id, n) => { const r = rows.find((x) => x.student.studentId === id); return r ? [{ row: r, label: r.student.studentName, tone: (n + 1) as 1 | 2 | 3 }] : [] }) : undefined} onStudent={openFromBranch} onDay={(i, dir) => setPick(pick?.metric === k && pick.i === i && pick.dir === dir ? null : { metric: k, i, dir })} selectedDay={pick?.metric === k ? pick.i : null} />{pick?.metric === k && <section className="v5-result" aria-label={`${METRIC_LABEL[k]} ${md(m.days[pick.i].date)} 학생`}><div className="v5-result-head"><b>{md(m.days[pick.i].date)} {m.days[pick.i].dow}{dirLabel(pick.dir)} · 학생 {outFilter(studentsOn(m, k, pick.i, axis), k, pick.dir).length}명</b>{k === 'vision' && <AxisPick axis={axis} onAxis={setAxis} />}<button type="button" className="sc-button" onClick={() => setPick(null)}>접기</button></div><div className="v5-result-body"><Compare rows={rows} ids={pinned} onRemove={(id) => setPinned(pinned.filter((x) => x !== id))} value={compareValue(k, axis)} /><StudentValues list={outFilter(studentsOn(m, k, pick.i, axis), k, pick.dir)} head={RESULT_HEAD[k]} axis={RESULT_AXIS[k]} onOpen={openFromBranch} pinned={pinned} onPin={(id) => setPinned([...pinned, id])} /></div></section>}</div>} /></section>
        {band?.band && <section className="v5-result" aria-label="단계별 학생">
          <div className="v5-result-head"><b>{METRIC_LABEL[band.metric]} · {BAND_LABEL[band.band]}</b><button type="button" className="sc-button" onClick={() => setBand(null)}>접기</button></div>
          <div className="v5-result-body"><BandList metric={band.metric} band={band.band} rows={m.included} t={data.thresholds} onOpen={openFromBranch} /></div>
        </section>}
      </>)}
      {tab === 'history' && <AllHistory api={careApi} branchId={data.branchId} version={data.version} onOpenStudent={(id) => { setTab('students'); setOpenId(id) }} />}
      {guard.prompt}
    </div>
  )
}
