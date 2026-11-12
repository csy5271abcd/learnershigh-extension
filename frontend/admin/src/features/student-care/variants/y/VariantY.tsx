// 학생 케어 Y(최종 시안): 데이터 분석 화면. 학습관 전체 흐름(맨 위) → 학생 전원 표 → 줄을 펼치면 그 학생의 최근 5주.
// - 학습관 흐름: 지표마다 한 줄, 날짜(최근 7일)·주(최근 5주) 칸마다 해당 학생 수(비몰입은 건수). 칸을 누르면 아래 표가 그 학생들로 좁혀진다.
// - 학생 표: 기준은 학습관 평균이 아니라 그 학생의 평소(G48·G49). 칸 = 평소 대비 막대(가운데 = 평소) + 이번 값. 결석·미제출은 날짜별 점 + 일수.
// - 빨강·거르기 건수는 학생 케어 서버 사유 그대로(S09). 용어는 서버 사유 이름(S08). 그림 코드는 Y 전용(yCharts·yMetrics).
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { SettingsDialog } from '../../components/SettingsDialog.tsx'
import { monthDay } from '../../model/format.ts'
import { careApi, matchQuery, md, useCareData, type CareRow } from '../shared/useCareData.ts'
import { TipHost } from '../z/Tip.tsx'
import { GROUP_LABEL } from '../z/zModel.ts'
import { eventDate, supLoadingText, useSupervisorEvents, type SupEvent } from '../supervisor/supervisorClient.ts'
import { CareCounsel } from '../notation/CareCounsel.tsx'
import { DAY_METRICS, METRICS, weekLabel, weeksOf, type Day, type Key, type Th } from './yMetrics.ts'
import { DayDots, Diverge, Trend5, YPhotos } from './yCharts.tsx'
import '../../student-care.css'
import './y.css'

const ORDER = { recheck: 0, check: 1, managed: 2, normal: 3, deferred: 4 } as const
type Col = 'status' | Key
// 거르기 = 서버 사유(type)별. 이름은 서버 사유 이름 그대로
const SIG_TYPES: Record<string, string[]> = { absent: ['CONSECUTIVE_ABSENCE', 'WEEKDAY_ABSENCE'], missing: ['PLAN_MISSING'], study: ['STUDY_DROP'], late: ['START_TIME_SHIFT'], plan: ['EXECUTION_GAP'], subject: ['SUBJECT_SHARE'] }

interface TrendRow { key: string; name: string; unit: string; test: (r: CareRow, ds: Day[], ev: SupEvent[] | null) => number }

/** 학습관 흐름 표: 지표 × 날짜(주). 칸 = 작은 막대 + 수. 누르면 그 칸의 학생으로 표를 좁힌다 */
function BranchTrend({ rows, evOf, th, period, setPeriod, picked, onPick }: { rows: CareRow[]; evOf: (r: CareRow) => SupEvent[] | null; th: Th; period: 'd' | 'w'; setPeriod: (p: 'd' | 'w') => void; picked: string | null; onPick: (key: string | null, label: string, ids: Set<string>) => void }) {
  const ready = rows.length > 0 && evOf(rows[0]) !== null
  const TR: TrendRow[] = [
    { key: 'absent', name: '미입실', unit: '명', test: (_r, ds) => ds.some((d) => d.attendance === 'absent') ? 1 : 0 },
    { key: 'missing', name: '계획 미제출', unit: '명', test: (_r, ds) => ds.some((d) => d.submission === 'missing') ? 1 : 0 },
    { key: 'study', name: '공부 시간 감소', unit: '명', test: (_r, ds) => ds.some((d) => d.attendance === 'present' && d.minutes !== null && d.usualMinutes && 100 - (d.minutes / d.usualMinutes) * 100 >= th.drop) ? 1 : 0 },
    { key: 'late', name: '등원 시간 늦어짐', unit: '명', test: (_r, ds) => ds.some((d) => d.attendance === 'present' && d.start !== null && d.usualStart !== null && d.start - d.usualStart >= th.shift) ? 1 : 0 },
    { key: 'plan', name: '계획 미달성', unit: '명', test: (_r, ds) => ds.some((d) => (d.planned ?? 0) > 0 && ((d.actual ?? 0) / d.planned!) * 100 < th.rate) ? 1 : 0 },
    ...(ready ? [{ key: 'vision', name: '비몰입', unit: '건', test: (_r: CareRow, ds: Day[], ev: SupEvent[] | null) => { const set = new Set(ds.map((d) => d.date)); return (ev ?? []).filter((e) => set.has(eventDate(e))).length } }] : []),
  ]
  const first = rows[0]
  const buckets = !first ? [] : period === 'd' ? first.days.map((d, i) => ({ key: d.date, label: md(d.date), sub: d.dow, pick: (r: CareRow) => [r.days[i]].filter(Boolean) as Day[] }))
    : weeksOf(first).map((wk, g) => ({ key: wk[0].date, label: weekLabel(first, g), sub: '', pick: (r: CareRow) => weeksOf(r)[g] ?? [] }))
  const table = TR.map((t) => ({ t, cells: buckets.map((b) => { const per = rows.map((r) => ({ r, v: t.test(r, b.pick(r), evOf(r)) })).filter((x) => x.v > 0); return { b, total: per.reduce((a, x) => a + x.v, 0), ids: new Set(per.map((x) => x.r.student.studentId)) } }) }))
  return (
    <section className="yb" aria-label="학습관 흐름">
      <header className="yb-head"><h2>학습관 흐름</h2><span className="y-muted">{period === 'd' ? '날짜별 해당 학생 수 · 최근 7일' : '주별 한 번 이상 해당한 학생 수 · 최근 5주'} · 칸을 누르면 아래 표가 그 학생들로 좁혀집니다</span>
        <div className="y-seg" role="group" aria-label="기간"><button type="button" aria-pressed={period === 'd'} onClick={() => setPeriod('d')}>일간</button><button type="button" aria-pressed={period === 'w'} onClick={() => setPeriod('w')}>주간</button></div></header>
      <table className="yb-table">
        <thead><tr><th scope="col" /><>{buckets.map((b) => <th key={b.key} scope="col"><b>{b.label}</b>{b.sub && <span>{b.sub}</span>}</th>)}</></tr></thead>
        <tbody>{table.map(({ t, cells }) => { const top = Math.max(1, ...cells.map((c) => c.total))
          return <tr key={t.key}><th scope="row">{t.name}<small>({t.unit})</small></th>{cells.map((c) => { const k = `${t.key}:${c.b.key}`, on = picked === k, label = `${c.b.label}${c.b.sub ? ` ${c.b.sub}` : ''} ${t.name}`
            return <td key={c.b.key}><button type="button" disabled={!c.total} aria-pressed={on} onClick={() => onPick(on ? null : k, label, c.ids)} data-tip={`${label} · ${c.total}${t.unit}${t.key === 'vision' ? ` · ${c.ids.size}명` : ''}`}>
              <span className="yb-n">{c.total}</span><span className="yb-bar"><i style={{ width: `${(c.total / top) * 100}%` }} /></span></button></td> })}</tr> })}</tbody>
      </table>
    </section>
  )
}

export function VariantY() {
  const data = useCareData('y')
  const rows = useMemo(() => [...(data.rows ?? [])], [data.rows])
  const ids = useMemo(() => rows.map((r) => r.student.studentId), [rows])
  const sup = useSupervisorEvents(ids)
  const [openId, setOpenId] = useState<string | null>(new URLSearchParams(window.location.search).get('student'))
  const [sort, setSort] = useState<Col>('status')
  const [flag, setFlag] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState<'d' | 'w'>('d')
  const [cellPick, setCellPick] = useState<{ key: string; label: string; ids: Set<string> } | null>(null)
  const [visionWeek, setVisionWeek] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [, setDirty] = useState(false)
  const th: Th = { drop: data.studyDropPercent, shift: data.startShiftMinutes, rate: data.executionRate }
  const ready = sup.status === 'ready'
  const evOf = (r: CareRow) => sup.status === 'ready' ? sup.byStudent.get(r.student.studentId) ?? [] : null
  const sigLabel = (k: string) => rows.flatMap((r) => r.signals).find((x) => SIG_TYPES[k].includes(x.type))?.label
  const sigCount = (k: string) => rows.filter((r) => r.signals.some((x) => SIG_TYPES[k].includes(x.type))).length
  const lines = useMemo(() => rows.map((r) => ({ r, cells: Object.fromEntries(METRICS.map((m) => [m.key, m.cell(r, evOf(r), th)])) as Record<string, ReturnType<typeof METRICS[number]['cell']>>, counts: Object.fromEntries(DAY_METRICS.map((m) => [m.key, m.count(r)])) as Record<string, number | null> })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, sup, th.drop, th.shift, th.rate])
  // 정렬: 관리 사유 순, 또는 그 지표의 나쁜 쪽부터(값 없음은 맨 뒤)
  const score = (l: (typeof lines)[number], c: Col) => {
    if (c === 'status') return -ORDER[l.r.status] * 100 + l.r.signals.length
    if (c === 'absent' || c === 'missing') return l.counts[c] ?? -Infinity
    const m = METRICS.find((x) => x.key === c)!, d = l.cells[c].dev
    return d === null ? -Infinity : m.rightIsBad ? d : -d
  }
  const shown = lines.filter((l) => matchQuery(query)(l.r) && (flag === 'all' || l.r.signals.some((x) => SIG_TYPES[flag].includes(x.type))) && (!cellPick || cellPick.ids.has(l.r.student.studentId)))
    .sort((a, b) => score(b, sort) - score(a, sort) || a.r.student.studentName.localeCompare(b.r.student.studentName, 'ko'))
  const head = (k: Col, label: ReactNode, name: string, extra?: ReactNode) => (
    <th scope="col" aria-sort={sort === k ? 'descending' : 'none'}>
      <button type="button" onClick={() => setSort(k)} className={sort === k ? 'y-on' : undefined} aria-label={`${name} 순으로 정렬`}>{label}</button>{extra}
    </th>
  )
  const center = <span className="y-center" aria-hidden="true">평소</span>

  let body: ReactNode
  if (data.failed) body = <div className="sc-state" role="alert"><p>학생 기록을 불러오지 못했습니다.</p><button type="button" className="sc-button" onClick={data.failed.reload}>다시 시도</button></div>
  else if (!data.rows) body = <p className="sc-state" role="status">불러오는 중</p>
  else body = <>
    <BranchTrend rows={rows} evOf={evOf} th={th} period={period} setPeriod={(p) => { setPeriod(p); setCellPick(null) }} picked={cellPick?.key ?? null} onPick={(key, label, set) => setCellPick(key ? { key, label, ids: set } : null)} />
    <section className="y-card" aria-label="학생 표">
      <div className="y-toolbar">
        <span className="y-period">최근 7일 {monthDay(rows[0].days[0].date)}–{monthDay(rows[0].days[6].date)}</span>
        <div className="y-flags" role="group" aria-label="관리 사유로 거르기">
          <button type="button" aria-pressed={flag === 'all'} onClick={() => setFlag('all')}>전체 <b>{rows.length}</b></button>
          {Object.keys(SIG_TYPES).filter((k) => sigLabel(k)).map((k) => <button key={k} type="button" aria-pressed={flag === k} onClick={() => setFlag(k)}>{sigLabel(k)} <b>{sigCount(k)}</b></button>)}
        </div>
        {!ready && <span className={sup.status === 'error' ? 'y-error' : 'y-muted'} role={sup.status === 'error' ? 'alert' : 'status'}>{sup.status === 'error' ? '사진 관찰 서버에 연결하지 못했습니다' : supLoadingText(sup)}</span>}
        <input className="y-search" type="search" aria-label="학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {cellPick && <p className="y-picked"><b>{cellPick.label}</b> {cellPick.ids.size}명만 보는 중 <button type="button" onClick={() => setCellPick(null)}>전체 보기</button></p>}
      <table className={`y-table${openId ? ' y-has-open' : ''}`}>
        <colgroup><col className="y-c-who" /><col className="y-c-d" /><col className="y-c-d" />{METRICS.map((m) => <col key={m.key} className="y-c-m" />)}</colgroup>
        <thead>
          <tr>
            {head('status', <>학생<small>관리 사유</small></>, '관리 사유')}
            {DAY_METRICS.map((m) => <Fragment key={m.key}>{head(m.key, <>{m.name}<small>날짜별 · 일</small></>, m.name)}</Fragment>)}
            {METRICS.map((m) => <Fragment key={m.key}>{head(m.key, <>{m.name}<small>{m.unit}</small></>, m.name, center)}</Fragment>)}
          </tr>
        </thead>
        <tbody>
          {shown.map((l) => {
            const { r } = l, s = r.student, open = s.studentId === openId
            const reasons = r.signals.map((x) => x.label)
            const toggle = () => { setOpenId(open ? null : s.studentId); setVisionWeek(null) }
            return (
              <Fragment key={s.studentId}>
                <tr className={open ? 'y-open' : undefined} tabIndex={0} aria-expanded={open} onClick={toggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}>
                  <th scope="row"><span className="y-who"><b>{s.studentName}</b><span>{s.className}</span></span>
                    {reasons.length ? <span className="y-why">{reasons.map((x) => <span key={x}>{x}</span>)}</span> : <span className="y-why y-why-none">{GROUP_LABEL[r.status]}</span>}</th>
                  {DAY_METRICS.map((m) => { const n = l.counts[m.key], f = m.flag(r) && !!n
                    return <td key={m.key} className="y-d" data-tip={`${m.name} · 최근 7일 ${n === null ? '기록 없음' : `${n}일`}`}><span className="yc"><DayDots days={r.days} bad={m.bad} flag={m.flag(r)} /><b className={f ? 'y-flag' : n === null ? 'yc-none' : undefined}>{n === null ? '–' : n}</b></span></td> })}
                  {METRICS.map((m) => { const c = l.cells[m.key]
                    return <td key={m.key} className="y-m" data-tip={c.tip} aria-label={c.tip}><span className="yc"><Diverge cell={c} span={m.span} rightIsBad={m.rightIsBad} /><b className={c.flag ? 'y-flag' : c.now === null ? 'yc-none' : undefined}>{c.text}</b></span></td> })}
                </tr>
                {open && <tr className="y-detail"><td colSpan={2 + DAY_METRICS.length + METRICS.length}>
                  <div className="y-detail-in">
                    <section className="y-panel" aria-label="최근 5주">
                      <h3>최근 5주 · {s.studentName}</h3>
                      <div className="y-weeks">
                        {DAY_METRICS.map((m) => <div key={m.key} className="y-week"><h4 className={m.flag(r) ? 'y-flag' : undefined}>{m.name}<small>일</small></h4><Trend5 r={r} vals={m.weeks(r)} text={(v) => `${v}`} flag={m.flag(r)} unit="일" /></div>)}
                        {METRICS.map((m) => { const f = l.cells[m.key].flag, isV = m.key === 'vision'
                          return <div key={m.key} className="y-week"><h4 className={f ? 'y-flag' : undefined}>{m.name}<small>{m.key === 'study' ? '시간' : m.key === 'plan' ? '%' : m.key === 'late' ? '분' : '건'}</small></h4>
                            <Trend5 r={r} vals={m.weeks(r, evOf(r))} text={m.weekText} flag={f} unit={m.unit} picked={isV ? visionWeek : undefined} onPick={isV && ready ? (w) => setVisionWeek(visionWeek === w ? null : w) : undefined} /></div> })}
                      </div>
                    </section>
                    <section className="y-panel" aria-label="비몰입 사진">
                      <h3>비몰입 사진 {visionWeek !== null ? <span className="y-muted">· {weekLabel(r, visionWeek)} <button type="button" className="y-link" onClick={() => setVisionWeek(null)}>전체</button></span> : <span className="y-muted">· 최근 35일 중 최근 6건 · 위 비몰입 주를 누르면 그 주의 사진</span>}</h3>
                      {ready ? <YPhotos r={r} ev={evOf(r) ?? []} dates={visionWeek !== null ? weeksOf(r)[visionWeek].map((d) => d.date) : null} label={visionWeek !== null ? weekLabel(r, visionWeek) : undefined} /> : <p className="y-muted">{supLoadingText(sup)}</p>}
                    </section>
                    <section className="y-panel"><CareCounsel s={r} version={data.version} prefix="y" onSaved={data.saved} onDirty={setDirty} className="y-counsel" /></section>
                  </div>
                </td></tr>}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      {!shown.length && <p className="y-muted">{query ? '검색 결과가 없습니다.' : '이 조건에 맞는 학생이 없습니다.'}</p>}
    </section>
  </>

  return (
    <TipHost>
      <div className="sc-page y-page">
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
