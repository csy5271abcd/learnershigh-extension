// 시안 C: 사유별 검토 + 학생 서랍. 첫 탭은 확인할 학생(한 학생 한 줄, 사유 전부), 줄을 누르면 오른쪽 넓은 서랍에서 지표와 상담 기록.
// 학습관 현황은 분포 우선: 지표마다 학생별 7일 값 분포(가로 점) + 날짜별 분포(점). 결과는 그 지표 줄 바로 아래.
import { useMemo, useState } from 'react'
import { AllHistory } from '../../components/AllHistory.tsx'
import { careApi, md, useCareData, REASONS, type CareRow } from '../shared/useCareData.ts'
import { AxisPick, CareHeader, LoadState, Compare, Exclude, StudentValues } from '../shared/parts.tsx'
import { RosterText, ReasonChips, StatusText } from '../shared/roster.tsx'
import { matchQuery, matchReason } from '../shared/useCareData.ts'
import { StudentFull } from '../shared/StudentFull.tsx'
import { Overlay } from '../shared/Overlay.tsx'
import { useLeaveGuard } from '../shared/useLeaveGuard.tsx'
import { branchModel, studentsOn, METRIC_KEYS, METRIC_LABEL, type MetricKey } from '../shared/branch.ts'
import { MetricPanel } from '../shared/MetricPanel.tsx'
import { WeekStrip, OverviewStrip } from '../shared/charts.tsx'
import { overviewRows } from '../shared/overview.ts'
import { RESULT_HEAD, compareValue } from '../shared/results.ts'
import { sumVision, type VisionAxis } from '../shared/visionExample.ts'

const EMPTY: ReadonlySet<string> = new Set()

type Tab = 'queue' | 'branch' | 'all' | 'history'
const sg = (v: number, u: string) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}${u}`

export function VariantC() {
  const data = useCareData('c')
  const guard = useLeaveGuard()
  const [tab, setTab] = useState<Tab>('queue')
  const [reason, setReason] = useState('flagged')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [res, setRes] = useState<{ metric: MetricKey; i: number } | null>(null)
  const [axis, setAxis] = useState<VisionAxis>('phone_interaction')
  const [pinned, setPinned] = useState<string[]>([])
  const [excluded, setExcluded] = useState<Record<string, Set<string>>>({})
  const ex = excluded[data.branchId ?? ''] ?? EMPTY
  const rows = data.rows
  const m = useMemo(() => rows ? branchModel(rows, ex) : null, [rows, ex])
  const queue = useMemo(() => rows?.filter((r) => r.status === 'check' || r.status === 'recheck') ?? [], [rows])
  const shownQueue = queue.filter((r) => matchReason(reason)(r))
  const allShown = rows?.filter(matchQuery(query)) ?? []
  const go = (fn: () => void) => guard.guard(fn)
  const openRow = rows?.find((r) => r.student.studentId === openId) ?? null
  const close = () => go(() => { const id = openId; setOpenId(null); requestAnimationFrame(() => document.querySelector(`[data-care-roster-row="${id}"]`)?.scrollIntoView({ block: 'center' })) })

  if (!rows || !data.branchId || !m) return <div className="sc-page v5-page"><CareHeader data={data} title="학생 케어 C" /><LoadState data={data} /></div>
  const reasonKeys = REASONS.filter((x) => !['', 'managed', 'WEEKDAY_ABSENCE'].includes(x.key))
  const week: Record<MetricKey, { value: (r: CareRow) => number | null; domain: [number, number]; format: (v: number) => string; warn?: (v: number) => boolean; baseline?: number }> = {
    absence: { value: (r) => r.days.filter((d) => d.attendance === 'absent').length, domain: [0, 7], format: (v) => `${Math.round(v)}일`, warn: (v) => v >= 2 },
    study: { value: (r) => r.week.minutes !== null && r.week.usualWeek ? (r.week.minutes - r.week.usualWeek) / r.week.usualWeek * 100 : null, domain: [-100, 100], format: (v) => sg(v, '%'), warn: (v) => v <= -data.studyDropPercent, baseline: 0 },
    start: { value: (r) => { const x = r.days.flatMap((d) => d.start !== null && d.usualStart !== null ? [d.start - d.usualStart] : []); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null }, domain: [-120, 120], format: (v) => sg(v, '분'), warn: (v) => v >= data.startShiftMinutes / 2, baseline: 0 },
    plan: { value: (r) => r.days.filter((d) => d.submission === 'missing').length, domain: [0, 7], format: (v) => `${Math.round(v)}일`, warn: (v) => v >= 3 },
    vision: { value: (r) => { const a = sumVision(r.vision).axes[axis]; return a.analyzed ? a.yes / a.analyzed * 100 : null }, domain: [0, 100], format: (v) => `${Math.round(v)}%` },
  }
  const tabs: [Tab, string][] = [['queue', `확인할 학생 ${queue.length}`], ['branch', '학습관 현황'], ['all', `전체 학생 ${rows.length}`], ['history', '관리 이력']]
  return (
    <div className="sc-page v5-page">
      <CareHeader data={data} title="학생 케어 C" onBranchChange={() => { setOpenId(null); setRes(null); setPinned([]) }} />
      <div className="sc-tabs v5-tabs" role="tablist" aria-label="보기">
        {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className="sc-tab" onClick={() => go(() => setTab(k))}>{l}</button>)}
      </div>
      {tab === 'queue' && (<>
        <div className="v5-wrap" role="group" aria-label="사유로 좁히기">
          {reasonKeys.map((x) => <button key={x.key} type="button" className="v5-mini" aria-pressed={reason === x.key} onClick={() => setReason(x.key)}>{x.key === 'flagged' ? '전체' : x.label} {queue.filter(x.match).length}</button>)}
        </div>
        {shownQueue.length ? <ul className="v5-queue" aria-label="확인할 학생">
          {shownQueue.map((r) => <li key={r.student.studentId} data-care-roster-row={r.student.studentId} aria-current={openId === r.student.studentId ? 'true' : undefined}>
            <button type="button" className="v5-queue-btn" onClick={() => go(() => setOpenId(r.student.studentId))}>
              <span className="v5-queue-name"><b>{r.student.studentName}</b> <span className="v5-muted">{r.student.className}</span></span>
              <span className="v5-queue-reasons"><ReasonChips r={r} /></span>
              <StatusText r={r} />
            </button>
          </li>)}
        </ul> : <p className="sc-state">이 사유의 확인할 학생이 없습니다.</p>}
      </>)}
      {tab === 'branch' && (<>
        <div className="v5-sticky v5-wrap">
          <span className="v5-muted">지표로 가기</span>
          {METRIC_KEYS.map((k) => <button key={k} type="button" className="v5-mini" onClick={() => document.getElementById(`c-metric-${k}`)?.scrollIntoView({ block: 'start' })}>{METRIC_LABEL[k]}</button>)}
          <Exclude rows={rows} excluded={ex as Set<string>} onChange={(n) => setExcluded({ ...excluded, [data.branchId!]: n })} />
        </div>
        <section className="v5-card"><OverviewStrip dates={m.days} rows={overviewRows(m, data.studyDropPercent, data.startShiftMinutes, (k) => document.getElementById(`c-metric-${k}`)?.scrollIntoView({ block: 'start' }))} /></section>
        {METRIC_KEYS.map((k) => { const w = week[k]
          return <section key={k} id={`c-metric-${k}`} className="v5-card v5-anchor">
            <div className="v5-card-head"><h3>{METRIC_LABEL[k]}</h3></div>
            <div className="v5-c-row">
              <div><p className="v5-axis-name">학생별 최근 7일 {k === 'absence' ? '결석 일수' : k === 'plan' ? '미제출 일수' : k === 'vision' ? '관찰 비율' : '평소 대비'}</p>
                <WeekStrip rows={m.included} value={w.value} detail={(r) => { const v = w.value(r); return v === null ? '기록 없음' : w.format(v) }} domain={w.domain} format={w.format} warn={w.warn} baseline={w.baseline} label={`${METRIC_LABEL[k]} 학생별 7일 분포`} onStudent={(r) => go(() => setOpenId(r.student.studentId))} /></div>
              <div><p className="v5-axis-name">날짜별</p>
                <MetricPanel metric={k} m={m} studyDropPercent={data.studyDropPercent} startShiftMinutes={data.startShiftMinutes} height={190} limit={8} onStudent={(r) => go(() => setOpenId(r.student.studentId))} onDay={(i) => setRes(res?.metric === k && res.i === i ? null : { metric: k, i })} selectedDay={res?.metric === k ? res.i : null} /></div>
            </div>
            {res?.metric === k && <section className="v5-result" aria-label={`${METRIC_LABEL[k]} ${md(m.days[res.i].date)} 학생`}>
              <div className="v5-result-head"><b>{METRIC_LABEL[k]} · {md(m.days[res.i].date)} {m.days[res.i].dow} · 학생 {studentsOn(m, k, res.i, axis).length}명</b>{k === 'vision' && <AxisPick axis={axis} onAxis={setAxis} />}<button type="button" className="sc-button" onClick={() => setRes(null)}>접기</button></div>
              <div className="v5-result-body">
                <Compare rows={rows} ids={pinned} onRemove={(id) => setPinned(pinned.filter((x) => x !== id))} value={compareValue(k, axis)} />
                <StudentValues list={studentsOn(m, k, res.i, axis)} head={RESULT_HEAD[k]} onOpen={(r) => go(() => setOpenId(r.student.studentId))} pinned={pinned} onPin={(id) => setPinned([...pinned, id])} />
              </div>
            </section>}
          </section> })}
      </>)}
      {tab === 'all' && (<>
        <div className="v5-toolbar"><p><b>{rows.length}명</b></p><input className="sc-input" aria-label="학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <RosterText label="전체 학생" rows={allShown} selectedId={openId} onOpen={(r) => go(() => setOpenId(r.student.studentId))} />
      </>)}
      {tab === 'history' && <AllHistory api={careApi} branchId={data.branchId} version={data.version} onOpenStudent={(id) => setOpenId(id)} />}
      {openRow && <Overlay kind="drawer" label={`${openRow.student.studentName} 상세`} onClose={close} header={<div className="v5-overlay-bar"><h2>{openRow.student.studentName}</h2><button type="button" className="sc-button" onClick={close}>닫기</button></div>}>
        <StudentFull key={openRow.student.studentId} s={openRow} version={data.version} startShiftMinutes={data.startShiftMinutes} studyDropPercent={data.studyDropPercent} onSaved={data.saved} guard={guard} />
      </Overlay>}
      {guard.prompt}
    </div>
  )
}
