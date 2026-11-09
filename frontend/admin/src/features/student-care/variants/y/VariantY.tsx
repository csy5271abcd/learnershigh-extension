// 학생 케어 Y(최종 시안): 데이터 중심형. 학습관 학생 전원을 한 표에 두고, 지표마다 열 하나·단위가 붙은 값·같은 눈금 막대로 비교한다.
// 열 제목을 누르면 그 지표로 정렬하고, 줄을 누르면 그 아래에 그 학생의 35일 그림(2차 표시법)과 비몰입 기록이 펼쳐진다.
// 지표: 결석(최근 7일 일수) · 공부 시간(평소 한 주와 최근 7일) · 입실(평소보다 늦은 평균) · 계획 대비 실제(%) · 비몰입(최근 7일 건수와 평소 한 주 평균).
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { SettingsDialog } from '../../components/SettingsDialog.tsx'
import { monthDay } from '../../model/format.ts'
import { careApi, matchQuery, useCareData, type CareRow } from '../shared/useCareData.ts'
import { TipHost } from '../z/Tip.tsx'
import { absentDays, GROUP_LABEL, missingDays, startLate } from '../z/zModel.ts'
import { eventDate, supLoadingText, useSupervisorEvents, type SupEvent } from '../supervisor/supervisorClient.ts'
import { hm, hourTicks, type NotationProps } from '../notation/kit.tsx'
import { AttendanceChips } from '../notation/AttendanceChips.tsx'
import { CareCounsel } from '../notation/CareCounsel.tsx'
import { PlanSubjectPairs } from '../notation2/Plan.tsx'
import { VisionDayBars, VisionWeekBars } from '../notation2/Vision.tsx'
import { ViewSwitch, type Period } from '../final/ViewSwitch.tsx'
import { PlanPair, StartPair, StudyPair } from '../final/PairCharts.tsx'
import { EvidenceLog } from '../final/EvidenceLog.tsx'
import '../../student-care.css'
import '../notation/notation.css'
import '../notation2/notation2.css'
import '../final/final.css'
import './y.css'

const ORDER = { recheck: 0, check: 1, managed: 2, normal: 3, deferred: 4 } as const
type Col = 'status' | 'absent' | 'missing' | 'study' | 'late' | 'plan' | 'vision'
type Flag = 'all' | 'absent' | 'missing' | 'study' | 'late' | 'plan' | 'vision'
const BAR = 132

interface Metrics { absent: number; missing: number; now: number | null; usual: number | null; late: number | null; plan: number | null; evNow: number; evUsual: number }
function metricsOf(r: CareRow, ev: SupEvent[]): Metrics {
  const recent = new Set(r.days.map((d) => d.date)), past = new Set(r.history35.slice(0, 28).map((d) => d.date))
  return {
    absent: absentDays(r), missing: missingDays(r), now: r.week.minutes, usual: r.week.usualWeek, late: startLate(r), plan: r.week.executionRate,
    evNow: ev.filter((e) => recent.has(eventDate(e))).length, evUsual: ev.filter((e) => past.has(eventDate(e))).length / 4,
  }
}
const SORT: Record<Col, (m: Metrics, r: CareRow) => number> = {
  status: (_m, r) => -ORDER[r.status],
  absent: (m) => m.absent,
  missing: (m) => m.missing,
  study: (m) => (m.usual ? 1 - (m.now ?? 0) / m.usual : -1),
  late: (m) => m.late ?? -999,
  plan: (m) => (m.plan === null ? -1 : 100 - m.plan),
  vision: (m) => m.evNow - m.evUsual,
}
const count = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}건`

function Pair({ a, b, top, flag }: { a: number | null; b: number | null; top: number; flag: boolean }) {
  const x = (v: number) => Math.max(v ? 3 : 0, (Math.min(v, top) / top) * BAR)
  return (
    <svg width={BAR} height={14} viewBox={`0 0 ${BAR} 14`} preserveAspectRatio="none" className="y-pair" aria-hidden="true">
      {a !== null && <rect x={0} y={0} width={x(a)} height={6} rx={3} className="y-bar-usual" />}
      {b !== null && <rect x={0} y={8} width={x(b)} height={6} rx={3} className={flag ? 'y-bar-flag' : 'y-bar-now'} />}
      {[a, b].map((v, k) => v !== null && v > top ? <path key={k} d={`M${BAR - 6} ${k ? 8 : 0} l3 3 l-3 3`} className="y-clip" /> : null)}
    </svg>
  )
}

export function VariantY() {
  const data = useCareData('y')
  const rows = useMemo(() => [...(data.rows ?? [])], [data.rows])
  const ids = useMemo(() => rows.map((r) => r.student.studentId), [rows])
  const sup = useSupervisorEvents(ids)
  const [openId, setOpenId] = useState<string | null>(new URLSearchParams(window.location.search).get('student'))
  const [sort, setSort] = useState<Col>('status')
  const [flag, setFlag] = useState<Flag>('all')
  // 펼친 상세의 일간·주간은 그림끼리 같이 바뀐다
  const [period, setPeriod] = useState<Period>('d')
  const [query, setQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [, setDirty] = useState(false)
  const evAll = useMemo(() => sup.status === 'ready' ? sup.byStudent : new Map<string, SupEvent[]>(), [sup])
  const table = useMemo(() => rows.map((r) => ({ r, m: metricsOf(r, evAll.get(r.student.studentId) ?? []) })), [rows, evAll])
  const th0 = { drop: data.studyDropPercent, shift: data.startShiftMinutes, rate: data.executionRate }
  // 기준을 넘었는지는 학생 케어 서버 사유(signals)를 그대로 쓴다(표의 빨강·거르기 건수·관리 사유가 같은 판정). 비몰입만 이미지 인식 기록에서 센다
  const flagsOf = (m: Metrics, r: CareRow): Record<Exclude<Flag, 'all'>, boolean> => {
    const has = (t: string) => r.signals.some((x) => x.type === t)
    // 서버 사유가 있고, 지금 값도 같은 기준을 넘을 때만(관리 중 학생의 지난 사유로 기준 아래 값이 빨강이 되지 않게). 비몰입은 서버 판정이 없어 칠하지 않는다
    return { absent: has('CONSECUTIVE_ABSENCE') && m.absent > 0, missing: has('PLAN_MISSING') && m.missing > 0, study: has('STUDY_DROP') && m.now !== null && !!m.usual && 100 - (m.now / m.usual) * 100 >= th0.drop, late: has('START_TIME_SHIFT') && m.late !== null && m.late >= th0.shift, plan: has('EXECUTION_GAP') && m.plan !== null && m.plan < th0.rate, vision: false }
  }
  // 거르기 이름은 서버 사유 이름을 그대로 쓴다(관리 사유 칸·Z′ 명부와 같은 말)
  const SIG: Record<Exclude<Flag, 'all' | 'vision'>, string> = { absent: 'CONSECUTIVE_ABSENCE', missing: 'PLAN_MISSING', study: 'STUDY_DROP', late: 'START_TIME_SHIFT', plan: 'EXECUTION_GAP' }
  const sigLabel = (f: Exclude<Flag, 'all' | 'vision'>, fallback: string) => rows.flatMap((r) => r.signals).find((x) => x.type === SIG[f])?.label ?? fallback
  const flagCount = (f: Exclude<Flag, 'all'>) => table.filter(({ m, r }) => flagsOf(m, r)[f]).length
  const shown = table.filter(({ r, m }) => matchQuery(query)(r) && (flag === 'all' || flagsOf(m, r)[flag])).sort((a, b) => SORT[sort](b.m, b.r) - SORT[sort](a.m, a.r) || a.r.student.studentName.localeCompare(b.r.student.studentName, 'ko'))
  const weekVals = table.flatMap(({ m }) => [m.now ?? 0, m.usual ?? 0]).sort((a, b) => a - b)
  // 눈금 끝 = 학습관 한 주 공부 시간 상위 25% 지점의 1.5배(대부분이 막대 길이로 읽히게). 그보다 긴 소수는 막대 끝을 잘라 표시한다
  const study = hourTicks(Math.max(600, (weekVals[Math.floor(weekVals.length * 0.75)] ?? 0) * 1.5), 3)
  const evTop = Math.max(4, ...table.flatMap(({ m }) => [m.evNow, m.evUsual]))
  const th = th0

  const head = (k: Col, label: ReactNode, name: string, cls = '') => (
    <th scope="col" className={cls} aria-sort={sort === k ? 'descending' : 'none'}>
      <button type="button" onClick={() => setSort(k)} className={sort === k ? 'y-on' : undefined} aria-label={`${name} 순으로 정렬`}>{label}{sort === k && <span className="y-sortdir" aria-hidden="true"> ↓</span>}</button>
    </th>
  )

  let body: ReactNode
  if (data.failed) body = <div className="sc-state" role="alert"><p>학생 기록을 불러오지 못했습니다.</p><button type="button" className="sc-button" onClick={data.failed.reload}>다시 시도</button></div>
  else if (!data.rows) body = <p className="sc-state" role="status">불러오는 중</p>
  else body = (
    <section className="y-card" aria-label="학생 표">
      <div className="y-toolbar">
        <span className="y-period">최근 7일 {monthDay(rows[0].days[0].date)}–{monthDay(rows[0].days[6].date)}</span>
        <div className="y-flags" role="group" aria-label="기준을 넘은 학생만 보기">
          {([['all', '전체', table.length], ['absent', sigLabel('absent', '미입실'), flagCount('absent')], ['missing', sigLabel('missing', '계획 미제출'), flagCount('missing')], ['study', sigLabel('study', '공부 시간 감소'), flagCount('study')], ['late', sigLabel('late', '등원 시간 늦어짐'), flagCount('late')], ['plan', sigLabel('plan', '계획 미달성'), flagCount('plan')]] as [Flag, string, number][]).map(([k, l, n]) => <button key={k} type="button" aria-pressed={flag === k} onClick={() => setFlag(k)}>{l} <b>{n}</b></button>)}
        </div>
        {sup.status !== 'ready' && <span className={sup.status === 'error' ? 'y-error' : 'y-muted'} role={sup.status === 'error' ? 'alert' : 'status'}>{sup.status === 'error' ? '사진 관찰 서버에 연결하지 못했습니다' : supLoadingText(sup)}</span>}
        <input className="y-search" type="search" aria-label="학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {/* 학생 상세를 펼친 동안은 머리줄을 고정하지 않는다(상세 그림 위에 표 눈금이 떠 있지 않게) */}
      <table className={`y-table${openId ? ' y-has-open' : ''}`}>
        <colgroup><col className="y-c-who" /><col /><col className="y-c-num" /><col className="y-c-num" /><col className="y-c-bar" /><col className="y-c-late" /><col className="y-c-num" /><col className="y-c-bar" /></colgroup>
        <thead>
          <tr>
            <th scope="col">학생</th>
            {head('status', '관리 사유', '관리 사유')}
            {head('absent', '결석', '결석 일수', 'y-num')}
            {head('missing', <>계획<small>미제출</small></>, '계획 미제출 일수', 'y-num')}
            {head('study', <>공부 시간<small>위 평소 한 주 · 아래 최근 7일</small><span className="y-pairrow y-scale" aria-hidden="true"><svg height={14} className="y-scale-svg">{[0, study.top].map((t) => <text key={t} x={`${(t / study.top) * 100}%`} y={11} textAnchor={t ? 'end' : 'start'}>{t ? `${Math.round(t / 60)}시간` : '0'}</text>)}</svg><span className="y-vals" /></span></>, '공부 시간 감소', 'y-barcol')}
            {head('late', <>입실<small>평소보다</small></>, '입실 늦음', 'y-num')}
            {head('plan', <>계획 대비<small>실제</small></>, '계획 대비 실제', 'y-num')}
            {head('vision', <>비몰입<small>위 지난 4주 한 주 평균 · 아래 최근 7일</small><span className="y-pairrow y-scale" aria-hidden="true"><svg height={14} className="y-scale-svg">{[0, evTop].map((t) => <text key={t} x={`${(t / evTop) * 100}%`} y={11} textAnchor={t ? 'end' : 'start'}>{t ? count(t) : '0'}</text>)}</svg><span className="y-vals" /></span></>, '비몰입 건수', 'y-barcol')}
          </tr>
        </thead>
        <tbody>
          {shown.map(({ r, m }) => {
            const s = r.student, open = s.studentId === openId
            const f = flagsOf(m, r), fell = f.study, late = f.late, under = f.plan, evMore = f.vision
            const reasons = r.signals.map((x) => x.label).join(' · ')
            const p: NotationProps = { s: r, rows, ev: evAll.get(s.studentId) ?? [], evAll, th }
            return (
              <Fragment key={s.studentId}>
                <tr className={open ? 'y-open' : undefined} tabIndex={0} aria-expanded={open} onClick={() => setOpenId(open ? null : s.studentId)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(open ? null : s.studentId) } }}>
                  <th scope="row"><b>{s.studentName}</b><span>{s.className}</span></th>
                  <td className="y-status" data-tip={reasons || undefined}>{reasons ? <b>{reasons}</b> : <span className={`y-st-${r.status}`}>{GROUP_LABEL[r.status]}</span>}{(r.status === 'managed' || r.status === 'recheck') && <span className="y-st-managed">{GROUP_LABEL[r.status]}</span>}</td>
                  <td className={`y-num${f.absent ? ' y-flag' : ''}`}>{m.absent ? `${m.absent}일` : '–'}</td>
                  <td className={`y-num${f.missing ? ' y-flag' : ''}`}>{m.missing ? `${m.missing}일` : '–'}</td>
                  <td className="y-barcol" data-tip={`공부 시간 · 평소 한 주 ${m.usual ? hm(m.usual) : '없음'} · 최근 7일 ${m.now !== null ? hm(m.now) : '기록 없음'}`}><div className="y-pairrow"><Pair a={m.usual} b={m.now} top={study.top} flag={fell} /><span className="y-vals"><small>{m.usual ? `평소 ${hm(m.usual)}` : '평소 없음'}</small><b className={fell ? 'y-flag' : undefined}>{m.now !== null ? hm(m.now) : '기록 없음'}</b></span></div></td>
                  <td className={`y-num${late ? ' y-flag' : ''}`}>{m.late === null ? '–' : Math.round(m.late) <= 0 ? '늦지 않음' : `${hm(m.late)} 늦음`}</td>
                  <td className={`y-num${under ? ' y-flag' : ''}`}>{m.plan === null ? '–' : `${Math.round(m.plan)}%`}</td>
                  <td className="y-barcol" data-tip={sup.status === 'ready' ? `비몰입 · 지난 4주 한 주 평균 ${count(m.evUsual)} · 최근 7일 ${count(m.evNow)}` : undefined}>{sup.status === 'ready' ? <div className="y-pairrow"><Pair a={m.evUsual} b={m.evNow} top={evTop} flag={evMore} /><span className="y-vals"><small>평소 {count(m.evUsual)}</small><b className={evMore ? 'y-flag' : undefined}>{count(m.evNow)}</b></span></div> : <span className="y-muted">–</span>}</td>
                </tr>
                {open && <tr className="y-detail"><td colSpan={8}>
                  <div className="y-detail-grid">
                    <section className="y-panel y-wide"><h3>출결 · 계획 제출</h3><AttendanceChips s={r} /></section>
                    <section className="y-panel"><ViewSwitch value={period} onChange={setPeriod} title="날짜별 공부 시간 · 같은 요일 평소와" titleW="주별 공부 시간 · 지난 4주 평균과" daily={<StudyPair {...p} period="d" />} weekly={<StudyPair {...p} period="w" />} /></section>
                    <section className="y-panel"><ViewSwitch value={period} onChange={setPeriod} title="날짜별 입실 시각 · 같은 요일 평소와" titleW="주별 평균 입실 시각 · 평소와" daily={<StartPair {...p} period="d" />} weekly={<StartPair {...p} period="w" />} /></section>
                    <section className="y-panel"><ViewSwitch value={period} onChange={setPeriod} title="날짜별 계획과 실제" titleW="주별 계획과 실제" daily={<PlanPair {...p} period="d" />} weekly={<PlanPair {...p} period="w" />} /></section>
                    <section className="y-panel"><h3>과목별 계획과 실제 · 최근 7일</h3><PlanSubjectPairs {...p} /></section>
                    <section className="y-panel y-wide">{sup.status === 'ready' ? <ViewSwitch value={period} onChange={setPeriod} title="날짜별 비몰입 건수" titleW="주별 비몰입 건수" daily={<VisionDayBars {...p} />} weekly={<VisionWeekBars {...p} />} /> : <p className="y-muted">{supLoadingText(sup)}</p>}</section>
                    <section className="y-panel y-wide"><h3>비몰입 기록</h3>{sup.status === 'ready' ? <EvidenceLog s={r} ev={p.ev} period={period} /> : <p className="y-muted">{supLoadingText(sup)}</p>}</section>
                    <section className="y-panel y-wide"><CareCounsel s={r} version={data.version} prefix="y" onSaved={data.saved} onDirty={setDirty} className="y-counsel" /></section>
                  </div>
                </td></tr>}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      {!shown.length && <p className="y-muted">검색 결과가 없습니다.</p>}
    </section>
  )

  return (
    <TipHost>
      <div className="sc-page y-page nt-scope n2-scope">
        <header className="sc-top">
          <h1 className="sc-top__title">학생 케어 Y</h1>
          <div className="sc-top__controls">
            <label className="sc-visually-hidden" htmlFor="y-branch">학습관</label>
            <select id="y-branch" className="sc-select" value={data.branchId ?? ''} disabled={!data.branches.data?.length} onChange={(e) => data.selectBranch(e.target.value)}>
              {data.branches.data?.map((b) => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
            </select>
            {data.asOf && <span className="sc-top__date">기준일 {monthDay(data.asOf)}</span>}
            <button type="button" className="sc-button" disabled={!data.branchId} onClick={() => setSettingsOpen(true)}>관리 기준</button>
          </div>
          <p className="sc-top__status" role="status" aria-live="polite">{data.status}</p>
        </header>
        {body}
        {data.branchId && <SettingsDialog api={careApi} branchId={data.branchId} open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={() => data.saved('관리 기준 저장')} />}
      </div>
    </TipHost>
  )
}
