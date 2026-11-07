// 시안 C: 사유별 검토 + 학생 서랍. 첫 탭은 확인할 학생(한 학생 한 줄, 사유 전부), 줄을 누르면 오른쪽 넓은 서랍에서 지표와 상담 기록.
// 학습관 현황은 분포 우선: 지표마다 학생별 7일 값 분포(가로 점) + 날짜별 분포(점). 결과는 그 지표 줄 바로 아래.
import { useMemo, useState } from 'react'
import { AllHistory } from '../../components/AllHistory.tsx'
import { careApi, md, useCareData, REASONS, type CareRow } from '../shared/useCareData.ts'
import { AxisPick, Bins, CareHeader, LoadState, Compare, Exclude, StudentValues } from '../shared/parts.tsx'
import { RosterText, ReasonChips, StatusText } from '../shared/roster.tsx'
import { matchQuery, matchReason } from '../shared/useCareData.ts'
import { StudentFull } from '../shared/StudentFull.tsx'
import { Overlay } from '../shared/Overlay.tsx'
import { useLeaveGuard } from '../shared/useLeaveGuard.tsx'
import { branchModel, studentsOn, METRIC_LABEL, type MetricKey } from '../shared/branch.ts'
import { MetricPanel } from '../shared/MetricPanel.tsx'
import { BranchRows, BandList } from '../shared/BranchRows.tsx'
import type { Band } from '../shared/bands.ts'
import { BAND_LABEL } from '../shared/bands.ts'
import { RESULT_HEAD, RESULT_AXIS, compareValue, outFilter, dirLabel } from '../shared/results.ts'
import { sumVision, visionAxisLabel, type VisionAxis } from '../shared/visionExample.ts'
import { hours } from '../shared/model.ts'

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
  const [pick, setPick] = useState<{ metric: MetricKey; i: number; dir?: 'above' | 'below' } | null>(null)
  const [axis, setAxis] = useState<VisionAxis>('phone_interaction')
  const [pinned, setPinned] = useState<string[]>([])
  const [weekPick, setWeekPick] = useState<{ metric: MetricKey; i: number; dir?: 'above' | 'below' } | null>(null)
  const [band, setBand] = useState<{ metric: MetricKey; band: Band | null } | null>(null)
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
  // 학생별 최근 7일 값. 강조는 관리 기준 설정 값을 그대로 쓴다(서버의 상담 필요 판정과는 별개)
  const th = data.thresholds
  const startAvg = (r: CareRow) => { const x = r.days.flatMap((d) => d.start !== null && d.usualStart !== null ? [d.start - d.usualStart] : []); return x.length ? { v: x.reduce((a, b) => a + b, 0) / x.length, n: x.length } : null }
  const week: Record<MetricKey, { value: (r: CareRow) => number | null; detail: (r: CareRow) => string; domain: [number, number]; format: (v: number) => string; warn?: (v: number) => boolean; baseline?: number }> = {
    absence: { value: (r) => r.days.some((d) => d.attendance === 'absent' || d.attendance === 'present') ? r.days.filter((d) => d.attendance === 'absent').length : null, detail: (r) => `결석 ${r.days.filter((d) => d.attendance === 'absent').length}일 / 등원 예정 ${r.week.scheduled}일`, domain: [0, 7], format: (v) => `${Math.round(v)}일`, warn: (v) => v >= th.absenceDays },
    study: { value: (r) => r.week.minutes !== null && r.week.usualWeek ? (r.week.minutes - r.week.usualWeek) / r.week.usualWeek * 100 : null, detail: (r) => `7일 ${hours(r.week.minutes)} · 평소 주 ${hours(r.week.usualWeek)}${r.week.minutes !== null && r.week.usualWeek ? ` · ${sg((r.week.minutes - r.week.usualWeek) / r.week.usualWeek * 100, '%')}` : ''}`, domain: [-100, 100], format: (v) => sg(v, '%'), warn: (v) => v <= -th.studyDropPercent, baseline: 0 },
    start: { value: (r) => startAvg(r)?.v ?? null, detail: (r) => { const a = startAvg(r); return a ? `입실 ${a.n}일 평균 평소보다 ${Math.abs(Math.round(a.v))}분 ${a.v >= 0 ? '늦게' : '일찍'}` : '입실 기록 없음' }, domain: [-120, 120], format: (v) => sg(v, '분'), warn: (v) => v >= th.startShiftMinutes, baseline: 0 },
    plan: { value: (r) => r.days.some((d) => d.submission === 'missing' || d.submission === 'submitted') ? r.days.filter((d) => d.submission === 'missing').length : null, detail: (r) => `계획 미제출 ${r.days.filter((d) => d.submission === 'missing').length}일 / 대상 ${r.week.submitKnown}일`, domain: [0, 7], format: (v) => `${Math.round(v)}일`, warn: (v) => v >= th.planMissingDays },
    vision: { value: (r) => { const a = sumVision(r.vision).axes[axis]; return a.analyzed ? a.yes / a.analyzed * 100 : null }, detail: (r) => { const a = sumVision(r.vision).axes[axis]; return a.analyzed ? `관찰 ${a.yes}장 / 분석 ${a.analyzed}장 · 판단 불가 ${a.unknown}장` : '분석 사진 없음' }, domain: [0, 100], format: (v) => `${Math.round(v)}%` },
  }
  // 학생별 7일 값을 구간으로 나눠 구간마다 학생 수(구간을 누르면 그 학생 전원과 정확값)
  const weekBinsOf = (k: MetricKey, w: (typeof week)[MetricKey]) => {
    const vals = (m?.included ?? []).map((r) => ({ r, v: w.value(r) })).filter((x): x is { r: CareRow; v: number } => x.v !== null)
    const edges: [string, (v: number) => boolean][] = k === 'absence' || k === 'plan'
      ? [['0일', (v) => v === 0], ['1일', (v) => v === 1], ['2일', (v) => v === 2], ['3일', (v) => v === 3], ['4일 이상', (v) => v >= 4]]
      : k === 'study' ? [['−50% 이하', (v) => v <= -50], ['−50~−30%', (v) => v <= -30], ['−30~−10%', (v) => v < -10], ['±10%', (v) => v <= 10], ['+10~+30%', (v) => v <= 30], ['+30% 넘음', () => true]]
      : k === 'start' ? [['−30분 이하', (v) => Math.round(v) <= -30], ['−29~−10분', (v) => Math.round(v) <= -10], ['−9~+9분', (v) => Math.round(v) <= 9], ['+10~+29분', (v) => Math.round(v) <= 29], ['+30~+59분', (v) => Math.round(v) <= 59], ['+60분 이상', () => true]]
      : [['5% 미만', (v) => v < 5], ['5~10%', (v) => v < 10], ['10~20%', (v) => v < 20], ['20~30%', (v) => v < 30], ['30% 이상', () => true]]
    const bins = edges.map(([label]) => ({ label, rows: [] as CareRow[] }))
    for (const x of vals) bins[edges.findIndex(([, f]) => f(x.v))].rows.push(x.r)
    const title = k === 'absence' ? '결석 일수' : k === 'plan' ? '계획 미제출 일수' : k === 'vision' ? `${visionAxisLabel[axis]} 관찰 비율` : k === 'start' ? '평균 입실 평소 대비' : '평소 대비'
    return { bins, counted: vals.length, title }
  }
  const tabs: [Tab, string][] = [['queue', `확인할 학생 ${queue.length}`], ['branch', '학습관 현황'], ['all', `전체 학생 ${rows.length}`], ['history', '관리 이력']]
  return (
    <div className="sc-page v5-page">
      <CareHeader data={data} title="학생 케어 C" onBranchChange={() => { setOpenId(null); setPick(null); setPinned([]) }} />
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
        <div className="v5-wrap"><Exclude rows={rows} excluded={ex as Set<string>} onChange={(n) => setExcluded({ ...excluded, [data.branchId!]: n })} /></div>
        <section className="v5-card"><BranchRows rows={m.included} t={data.thresholds} selected={band} onBand={(k, b) => setBand(band?.metric === k && band.band === b ? null : { metric: k, band: b })} onMetric={(k, i) => { if (i !== undefined) { setBand({ metric: k, band: null }); setPick({ metric: k, i }); return } setPick(null); setBand(band?.metric === k && band.band === null ? null : { metric: k, band: null }) }} detail={(k) => <div className="v5-inline-detail">{(() => { const w = week[k]; const b = weekBinsOf(k, w); return <div className="v5-c-week"><p className="v5-axis-name">학생별 최근 7일 {b.title}{k === 'vision' && <> <AxisPick axis={axis} onAxis={(a) => { setAxis(a); setWeekPick(null) }} /></>}</p>
          <Bins bins={b.bins} total={b.counted} selected={weekPick?.metric === k ? weekPick.i : null} onPick={(i) => setWeekPick(weekPick?.metric === k && weekPick.i === i ? null : { metric: k, i })} />
          {weekPick?.metric === k && <section className="v5-result"><div className="v5-result-head"><b>{b.bins[weekPick.i].label} · {b.bins[weekPick.i].rows.length}명</b><button type="button" className="sc-button" onClick={() => setWeekPick(null)}>접기</button></div>
            <div className="v5-result-body"><ul className="v5-bandlist">{b.bins[weekPick.i].rows.map((r) => <li key={r.student.studentId}><button type="button" className="v5-link" onClick={() => go(() => setOpenId(r.student.studentId))}>{r.student.studentName}</button> <span className="v5-muted">{r.student.className}</span> <span>{w.detail(r)}</span></li>)}</ul></div></section>}
        </div> })()}<MetricPanel metric={k} m={m} studyDropPercent={data.studyDropPercent} startShiftMinutes={data.startShiftMinutes} height={260} lines={(k === 'study' || k === 'start') ? pinned.flatMap((id, n) => { const r = rows.find((x) => x.student.studentId === id); return r ? [{ row: r, label: r.student.studentName, tone: (n + 1) as 1 | 2 | 3 }] : [] }) : undefined} onStudent={(r) => go(() => setOpenId(r.student.studentId))} onDay={(i, dir) => setPick(pick?.metric === k && pick.i === i && pick.dir === dir ? null : { metric: k, i, dir })} selectedDay={pick?.metric === k ? pick.i : null} />{pick?.metric === k && <section className="v5-result" aria-label={`${METRIC_LABEL[k]} ${md(m.days[pick.i].date)} 학생`}><div className="v5-result-head"><b>{md(m.days[pick.i].date)} {m.days[pick.i].dow}{dirLabel(pick.dir)} · 학생 {outFilter(studentsOn(m, k, pick.i, axis), k, pick.dir).length}명</b>{k === 'vision' && <AxisPick axis={axis} onAxis={setAxis} />}<button type="button" className="sc-button" onClick={() => setPick(null)}>접기</button></div><div className="v5-result-body"><Compare rows={rows} ids={pinned} onRemove={(id) => setPinned(pinned.filter((x) => x !== id))} value={compareValue(k, axis)} /><StudentValues list={outFilter(studentsOn(m, k, pick.i, axis), k, pick.dir)} head={RESULT_HEAD[k]} axis={RESULT_AXIS[k]} onOpen={(r) => go(() => setOpenId(r.student.studentId))} pinned={pinned} onPin={(id) => setPinned([...pinned, id])} /></div></section>}</div>} /></section>
        {band?.band && <section className="v5-result" aria-label="단계별 학생">
          <div className="v5-result-head"><b>{METRIC_LABEL[band.metric]} · {BAND_LABEL[band.band]}</b><button type="button" className="sc-button" onClick={() => setBand(null)}>접기</button></div>
          <div className="v5-result-body"><BandList metric={band.metric} band={band.band} rows={m.included} t={data.thresholds} onOpen={(r) => go(() => setOpenId(r.student.studentId))} /></div>
        </section>}
      </>)}
      {tab === 'all' && (<>
        <div className="v5-toolbar"><p><b>{rows.length}명</b></p><input className="sc-input" aria-label="학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <RosterText label="전체 학생" rows={allShown} selectedId={openId} onOpen={(r) => go(() => setOpenId(r.student.studentId))} />
      </>)}
      {tab === 'history' && <AllHistory api={careApi} branchId={data.branchId} version={data.version} onOpenStudent={(id) => setOpenId(id)} />}
      {openRow && <Overlay kind="drawer" label={`${openRow.student.studentName} 상세`} onClose={close} header={<div className="v5-overlay-bar"><h2>{openRow.student.studentName}</h2><button type="button" className="sc-button" onClick={close}>닫기</button></div>}>
        <StudentFull key={openRow.student.studentId} s={openRow} version={data.version} startShiftMinutes={data.startShiftMinutes} studyDropPercent={data.studyDropPercent} thresholds={data.thresholds} executionRate={data.executionRate} onSaved={data.saved} guard={guard} />
      </Overlay>}
      {guard.prompt}
    </div>
  )
}
