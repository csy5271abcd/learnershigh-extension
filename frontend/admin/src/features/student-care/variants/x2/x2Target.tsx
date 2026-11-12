// 시안 X′ 공부 시간·계획과 실제 그림. 2026-11-12 사용자가 보여 준 참고 그림('주간 학습 현황') 꼴을 따른다:
// - 위: 큰 숫자(최근 7일 합계 / 기준) · 오른쪽에 비율과 짧은 표지 · 아래 진행 막대
// - 가운데: 실제 = 둥근 막대, 기준(계획·평소) = 앞에 그린 점선과 점. 격자는 옅은 점선
// - 아래: 범례(그림 밑 가운데) · 요약 줄 넷
// 막대 위 값 글자는 늘 두지 않는다. 마우스를 올리거나 칸에 들어가면 그 막대 바로 위에 '실제 n · 계획 m'이 보인다.
import { useState } from 'react'
import type { CareRow } from '../shared/useCareData.ts'
import { useWidth } from '../z/useWidth.ts'
import { clock, clockDomain, hm, hourTicks, STATE } from '../notation/kit.tsx'
import { LATE_BANDS, lateBand, newbieOf, rateText, slotsOf, usualStartAt, visionIn, type Period, type Slot } from './x2Model.ts'
import type { SupEvent } from '../supervisor/supervisorClient.ts'
import './x2Target.css'

interface TCol { key: string; title: string; head: string; foot: string; bad: boolean; value: number | null; ref: number | null; aria: string }
interface P { s: CareRow; period: Period; th: { drop: number; shift: number; rate: number } }

/** 칸 밑 두 줄: 일간 = 요일 / 날짜(결석·예정 없음이면 그 말), 주간 = 기간 / 결석 일수 */
function foot(x: Slot, period: Period, none?: string, firstIdx = 0): Pick<TCol, 'title' | 'head' | 'foot' | 'bad'> {
  const before = x.days.every(({ idx }) => idx < firstIdx)
  if (period === 'd') { const d = x.days[0].d; return { title: `${x.line2}요일 · ${x.line1}`, head: x.line2 ?? '', foot: before ? '첫 기록 전' : d.attendance !== 'present' ? STATE[d.attendance] : none ?? x.line1, bad: d.attendance === 'absent' } }
  const off = x.days.filter(({ d }) => d.attendance === 'absent').length
  return { title: x.last ? `최근 7일 · ${x.line1}` : x.line1, head: x.line1, foot: before ? '첫 기록 전' : x.days.every(({ d }) => d.attendance === 'unknown') ? '기록 없음' : off ? `결석 ${off}일` : none ?? '', bad: off > 0 }
}

/** 값 상자(2026-11-12 참고 그림 꼴): 마우스를 올린 막대(점) 바로 위에 뜨고, 아래 꼬리가 그 막대를 가리킨다.
 *  머리 = 날짜 + 짧은 표지, 몸 = 실제 · 기준 · 비율. 칸 바탕은 칠하지 않고 올린 막대만 테두리로 밝힌다 */
function useTip() {
  const [tip, setTip] = useState<number | null>(null)
  const on = (i: number) => ({ onMouseEnter: () => setTip(i), onMouseLeave: () => setTip(null), onFocus: () => setTip(i), onBlur: () => setTip(null) })
  return [tip, on] as const
}
interface TipRow { mark: 'bar' | 'line' | 'vline' | 'rate'; label: string; value: string; bad?: boolean }
type Badge = { text: string; bad: boolean } | undefined
function TipBox({ x, y, w, title, badge, rows }: { x: number; y: number; w: number; title: string; badge: Badge; rows: TipRow[] }) {
  const W = 260, left = Math.min(Math.max(x - W / 2, 0), Math.max(0, w - W))
  return <div className="x2tip" style={{ left, top: y - 14, width: W, ['--tail' as string]: `${x - left}px` }} role="tooltip">
    <header><b>{title}</b>{badge && <em className={badge.bad ? 'x2tip-badge x2tip-bad' : 'x2tip-badge'}>{badge.text}</em>}</header>
    {rows.map((r) => <p key={r.label}><i className={r.mark === 'rate' ? 'x2tip-k-rate' : `x2t-k-${r.mark}`} aria-hidden="true" /><span>{r.label}</span><strong className={r.bad ? 'x2tip-bad-text' : r.mark === 'rate' ? 'x2tip-rate' : undefined}>{r.value}</strong></p>)}
  </div>
}

/** 건수 눈금: 1·2·5 배수 간격 */
function countTicks(max: number) {
  const m = Math.max(4, max), step = [1, 2, 5, 10, 20, 50].find((x) => m / x <= 5) ?? 100
  const top = Math.ceil(m / step) * step
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, k) => k * step) }
}
const countText = (v: number) => `${Math.round(v * 10) / 10}건`

/** 모든 지표 그림이 같이 쓰는 막대 + 기준 점선 그림. unit='time'은 분 값(눈금 n시간), 'count'는 건수.
 *  name은 그대로 범례·값 상자에 쓰는 이름('공부 시간', '계획 시간', '비몰입', '기준'). onPick이 있으면 칸을 누를 수 있다 */
function TargetBars({ cols, label, refName, valName, rateName, badge, unit = 'time', extra, onPick, picked, connect = true }: { cols: TCol[]; label: string; refName: string; valName: string; rateName?: string; badge: (rate: number | null, i: number) => Badge; unit?: 'time' | 'count'; extra?: (i: number) => TipRow[]; onPick?: (i: number) => void; picked?: number | null; connect?: boolean }) {
  const [box, w] = useWidth<HTMLDivElement>()
  const [tip, on] = useTip()
  const fmt = unit === 'time' ? hm : countText
  const n = cols.length, L = 56, R = 12, cw = (w - L - R) / Math.max(1, n), bw = Math.min(88, cw * 0.56), rr = Math.min(10, bw / 4)
  const mx = Math.max(...cols.flatMap((c) => [c.value ?? 0, c.ref ?? 0]))
  const { top, ticks } = unit === 'time' ? hourTicks(Math.max(60, mx) * 1.1, 6) : countTicks(mx * 1.1)
  const tickText = (t: number) => (unit === 'time' ? `${Math.round(t / 60)}시간` : `${t}건`)
  const T = 20, B = 52, H = 300, y = (v: number) => T + (1 - Math.min(v, top) / top) * (H - T - B), X = (i: number) => L + cw * (i + 0.5)
  const pts = cols.map((c, i) => (c.ref !== null ? { x: X(i), y: y(c.ref) } : null))
  // 날짜처럼 이어지는 칸만 점을 선으로 잇는다(과목처럼 서로 다른 칸은 점만)
  const path = connect ? pts.map((p, i) => (p ? `${i > 0 && pts[i - 1] ? 'L' : 'M'}${p.x},${p.y}` : '')).join('') : ''
  return (
    <div className="x2t">
      <div ref={box} className="x2c-plot">
        <svg width={w} height={H} role="img" aria-label={label}>
          {ticks.map((t) => <g key={t}><line x1={L} x2={w - R} y1={y(t)} y2={y(t)} className={t ? 'x2t-grid' : 'x2t-base'} /><text x={L - 10} y={y(t) + 4} textAnchor="end" className="x2t-axis">{tickText(t)}</text></g>)}
          {cols.map((c, i) => <g key={c.key} className={onPick ? 'x2t-col x2t-can' : 'x2t-col'} tabIndex={0} aria-label={c.aria} aria-pressed={onPick ? picked === i : undefined} {...on(i)}
            onClick={onPick ? () => onPick(i) : undefined} onKeyDown={onPick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(i) } } : undefined}>
            <rect x={L + cw * i + 2} y={4} width={cw - 4} height={H - 4 - 6} rx={8} className="x2-hit" />
            {c.value !== null && c.value > 0 && <path d={`M${X(i) - bw / 2},${y(0)}V${y(c.value) + rr}Q${X(i) - bw / 2},${y(c.value)} ${X(i) - bw / 2 + rr},${y(c.value)}H${X(i) + bw / 2 - rr}Q${X(i) + bw / 2},${y(c.value)} ${X(i) + bw / 2},${y(c.value) + rr}V${y(0)}Z`} className={tip === i || picked === i ? 'x2t-bar x2t-bar-on' : 'x2t-bar'} />}
            <text x={X(i)} y={H - B + 22} textAnchor="middle" className="x2t-x">{c.head}</text>
            <text x={X(i)} y={H - B + 40} textAnchor="middle" className={c.bad ? 'x2t-x2 x2t-bad' : 'x2t-x2'}>{c.foot}</text>
          </g>)}
          {path && <path d={path} className="x2t-casing" />}
          {path && <path d={path} className="x2t-line" />}
          {pts.map((p, i) => p && <circle key={i} cx={p.x} cy={p.y} r={6} className="x2t-dot" />)}
        </svg>
        {tip !== null && (() => { const c = cols[tip], rate = c.value !== null && c.ref ? Math.round((c.value / c.ref) * 100) : null, b = badge(rate, tip)
          return <TipBox x={X(tip)} y={Math.min(c.value !== null ? y(c.value) : y(0), c.ref !== null ? y(c.ref) - 6 : Infinity)} w={w} title={c.title} badge={b}
            rows={[{ mark: 'bar', label: valName, value: c.value !== null ? fmt(c.value) : '없음' }, { mark: 'line', label: refName, value: c.ref !== null ? fmt(c.ref) : '없음' }, ...(rate !== null && rateName ? [{ mark: 'rate' as const, label: rateName, value: `${rate}%`, bad: b?.bad }] : []), ...(extra?.(tip) ?? [])]} /> })()}
      </div>
      <p className="x2t-legend"><span><i className="x2t-k-bar" aria-hidden="true" />{valName}</span><span><i className="x2t-k-line" aria-hidden="true" />{refName}</span></p>
    </div>
  )
}

function Headline({ lLabel, lBig, lSub, rLabel, rate, bad, badge }: { lLabel: string; lBig: string; lSub?: string; rLabel: string; rate: number | null; bad?: boolean; badge?: string }) {
  return (
    <div className="x2h">
      <div className="x2h-row">
        <div><p className="x2h-label">{lLabel}</p><p className="x2h-big">{lBig}{lSub && <span>/ {lSub}</span>}</p></div>
        <div className="x2h-right"><p className="x2h-label">{rLabel}</p><p className={`x2h-big x2h-rate${bad ? ' x2h-bad' : ''}`}>{rate === null ? '–' : `${rate}%`}{badge && <em className={bad ? 'x2h-badge x2h-badge-bad' : 'x2h-badge'}>{badge}</em>}</p></div>
      </div>
      {rate !== null && <div className="x2h-track" aria-hidden="true"><i className={bad ? 'x2h-fill x2h-bad-fill' : 'x2h-fill'} style={{ width: `${Math.min(100, rate)}%` }} /></div>}
    </div>
  )
}
const Stats = ({ items }: { items: [string, string, string?][] }) => <dl className="x2st">{items.map(([k, v, u]) => <div key={k}><dt>{k}</dt><dd>{v}{u && <span> {u}</span>}</dd></div>)}</dl>
const flagOf = (s: CareRow, ...t: string[]) => s.signals.some((x) => t.includes(x.type))

/** 공부 시간: 막대 = 공부, 점선 = 평소(일간: 같은 요일 평소, 주간: 그 앞 주들 평균) */
export function StudyFig({ s, period, th }: P) {
  const fi = newbieOf(s)?.firstIdx ?? 0
  const flagged = flagOf(s, 'STUDY_DROP')
  const sl = slotsOf(s, period)
  const sums = sl.map((x) => x.days.some(({ d }) => d.attendance !== 'unknown') ? x.days.reduce((a, { d }) => a + (d.attendance === 'present' && d.minutes ? d.minutes : 0), 0) : null)
  const cols: TCol[] = sl.map((x, g) => {
    const v = period === 'd' ? (x.days[0].d.attendance === 'present' ? x.days[0].d.minutes : null) : sums[g]
    const prev = sums.slice(0, g).filter((u): u is number => u !== null)
    const usual = period === 'd' ? x.days[0].d.usualMinutes : prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : null
    return { key: x.key, ...foot(x, period, undefined, fi), value: v, ref: usual || null, aria: `${x.line1} ${x.line2 ?? ''} 공부 ${v !== null ? hm(v) : '없음'}${usual ? `, 평소 ${hm(usual)}` : ''}` }
  })
  const wk = s.week, rate = wk.minutes !== null && wk.usualWeek ? Math.round((wk.minutes / wk.usualWeek) * 100) : null
  const came = s.days.filter((d) => d.attendance === 'present' && d.minutes !== null)
  const avg = came.length ? came.reduce((a, d) => a + d.minutes!, 0) / came.length : null
  const us = came.filter((d) => d.usualMinutes), uavg = us.length ? us.reduce((a, d) => a + d.usualMinutes!, 0) / us.length : null
  const max = came.length ? Math.max(...came.map((d) => d.minutes!)) : null
  const ok = us.filter((d) => d.minutes! >= d.usualMinutes! * (1 - th.drop / 100)).length
  return <section id="x2-fig-study" tabIndex={-1} className="x2f x2f-wide" aria-label="공부 시간">
    <header className="x2f-head"><h3 className={flagged ? 'x2f-flag' : undefined}>공부 시간</h3><p className="x2f-note">최근 7일 · 평소는 지난 4주</p></header>
    <Headline lLabel="최근 7일 공부 시간" lBig={wk.minutes !== null ? hm(wk.minutes) : '기록 없음'} lSub={wk.usualWeek ? `평소 한 주 ${hm(wk.usualWeek)}` : undefined} rLabel="평소 대비" rate={rate} bad={flagged} badge={rate === null ? undefined : rate >= 100 ? '평소 이상' : `평소보다 ${100 - rate}% 적음`} />
    <TargetBars cols={cols} rateName="평소 대비" badge={(r) => r === null ? undefined : r >= 100 ? { text: '↑ 평소 이상', bad: false } : { text: `↓ 평소보다 ${100 - r}% 적음`, bad: 100 - r >= th.drop }} refName={period === 'd' ? '같은 요일 평소 시간' : '그 앞 주들 평균 시간'} valName="공부 시간" label={period === 'd' ? '최근 7일 날짜별 공부 시간과 평소' : '최근 5주 주별 공부 시간'} />
    <Stats items={[['하루 평균', avg === null ? '–' : hm(avg), '입실한 날'], ['같은 요일 평소 평균', uavg === null ? '–' : hm(uavg)], ['가장 많이 한 날', max === null ? '–' : hm(max)], ['평소만큼 공부한 날', `${ok}일`, `/ 입실 ${came.length}일`]]} />
  </section>
}

/** 계획과 실제: 막대 = 실제, 점선 = 계획 */
export function PlanFig({ s, period, th }: P) {
  const fi = newbieOf(s)?.firstIdx ?? 0
  const flagged = flagOf(s, 'EXECUTION_GAP')
  const cols: TCol[] = slotsOf(s, period).map((x) => {
    const p = x.days.reduce((a, { d }) => a + (d.planned ?? 0), 0), a = x.days.reduce((t, { d }) => t + (d.planned ? d.actual ?? 0 : 0), 0), has = p > 0
    return { key: x.key, ...foot(x, period, has ? undefined : '계획 없음', fi), value: has ? a : null, ref: has ? p : null, aria: `${x.line1} ${x.line2 ?? ''} ${has ? `계획 ${hm(p)}, 실제 ${hm(a)}` : '계획 없음'}` }
  })
  const ds = s.days.filter((d) => (d.planned ?? 0) > 0), P7 = ds.reduce((t, d) => t + d.planned!, 0), A7 = ds.reduce((t, d) => t + (d.actual ?? 0), 0)
  const rate = P7 ? Math.floor((A7 / P7) * 100) : null, bad = flagged && rate !== null && rate < th.rate
  const max = ds.length ? Math.max(...ds.map((d) => d.actual ?? 0)) : null
  const done = ds.filter((d) => (d.actual ?? 0) >= d.planned!).length
  return <section id="x2-fig-plan" tabIndex={-1} className="x2f x2f-wide" aria-label="계획과 실제">
    <header className="x2f-head"><h3 className={flagged ? 'x2f-flag' : undefined}>계획과 실제</h3><p className="x2f-note">최근 7일 · 계획을 낸 날</p></header>
    <Headline lLabel="최근 7일 실제 공부" lBig={P7 ? hm(A7) : '계획 없음'} lSub={P7 ? `계획 ${hm(P7)}` : undefined} rLabel="계획 달성률" rate={rate} bad={bad} badge={rate === null ? undefined : rate >= 100 ? '계획 초과 달성' : bad ? `기준 ${th.rate}% 미만` : undefined} />
    <TargetBars cols={cols} rateName="달성률" badge={(r) => r === null ? undefined : r >= 100 ? { text: '↑ 계획 초과', bad: false } : { text: `↓ 계획의 ${r}%`, bad: r < th.rate }} refName="계획 시간" valName="실제 시간" label={period === 'd' ? '최근 7일 날짜별 계획과 실제' : '최근 5주 주별 계획과 실제'} />
    <Stats items={[['하루 평균 실제', ds.length ? hm(A7 / ds.length) : '–', '계획 낸 날'], ['하루 평균 계획', ds.length ? hm(P7 / ds.length) : '–'], ['가장 많이 한 날', max === null ? '–' : hm(max)], ['계획을 채운 날', `${done}일`, `/ 계획 낸 ${ds.length}일`]]} />
  </section>
}

/** 입실 시각: 꺾은선 둘. 입실 = 파란 실선과 점, 평소(같은 요일) = 점선과 흰 점. 위로 갈수록 늦은 시각.
 *  칸 바탕(마우스 올림)은 선보다 먼저 그려 선을 가리지 않는다. 값은 마우스를 올리거나 칸에 들어가면 그 칸 위에 */
export function StartFig({ s, period, th }: P) {
  const fi = newbieOf(s)?.firstIdx ?? 0
  const flagged = flagOf(s, 'START_TIME_SHIFT')
  const [box, w] = useWidth<HTMLDivElement>()
  const [tip, on] = useTip()
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const pts = slotsOf(s, period).map((x) => {
    const came = x.days.filter(({ d }) => d.attendance === 'present' && d.start !== null)
    const v = mean(came.map(({ d }) => d.start!)), u = mean(x.days.filter(({ d }) => d.attendance !== 'off').flatMap(({ d, idx }) => { const k = usualStartAt(s, d, idx); return k === null ? [] : [k] }))
    // 평소 선은 결석한 날에도 이어 그린다(그날 왔어야 할 시각)
    return { x, v, u, ...foot(x, period, undefined, fi) }
  })
  const [lo, hi] = clockDomain(pts.flatMap((p) => [p.v, p.u].filter((k): k is number => k !== null)), 30)
  const n = pts.length, L = 72, R = 12, cw = (w - L - R) / n, T = 20, B = 52, H = 280
  const X = (i: number) => L + cw * (i + 0.5), Y = (m: number) => T + (1 - (m - lo) / (hi - lo)) * (H - T - B)
  const step = hi - lo > 300 ? 120 : 60
  const ticks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, k) => lo + k * step)
  const line = (key: 'v' | 'u') => pts.map((p, i) => (p[key] === null ? '' : `${i > 0 && pts[i - 1][key] !== null ? 'L' : 'M'}${X(i)},${Y(p[key]!)}`)).join('')
  const late = mean(s.days.flatMap((d, i) => { const u = usualStartAt(s, d, 28 + i); return d.attendance === 'present' && d.start !== null && u !== null ? [d.start - u] : [] }))
  const lateDays = s.days.filter((d, i) => { const u = usualStartAt(s, d, 28 + i); return d.attendance === 'present' && d.start !== null && u !== null && d.start - u >= th.shift }).length
  const came = s.days.filter((d) => d.attendance === 'present').length
  const bad = flagged && late !== null && late >= th.shift
  const tick = (t: number) => (t % 1440 === 0 ? '자정' : clock(t).replace(':00', '시'))
  return <section id="x2-fig-start" tabIndex={-1} className="x2f x2f-wide" aria-label="입실 시각">
    <header className="x2f-head"><h3 className={flagged ? 'x2f-flag' : undefined}>입실 시각</h3><p className="x2f-note">최근 7일 · 평소는 같은 요일 지난 4주</p></header>
    <div className="x2h"><div className="x2h-row">
      <div><p className="x2h-label">평소와 비교한 입실</p><p className={`x2h-big${bad ? ' x2h-bad' : ''}`}>{late === null ? '비교할 입실 없음' : late < 10 ? '평소대로' : `평균 ${hm(late)} 늦게`}</p></div>
      <div className="x2h-right"><p className="x2h-label">{th.shift}분 이상 늦은 날</p><p className={`x2h-big${lateDays ? ' x2h-bad' : ''}`}>{lateDays}일<span>/ 입실 {came}일</span></p></div>
    </div></div>
    <div className="x2t">
      <div ref={box} className="x2c-plot">
        <svg width={w} height={H} role="img" aria-label={period === 'd' ? '최근 7일 입실 시각과 같은 요일 평소' : '최근 5주 평균 입실 시각과 평소'}>
          {ticks.map((t, k) => <g key={t}><line x1={L} x2={w - R} y1={Y(t)} y2={Y(t)} className={k ? 'x2t-grid' : 'x2t-base'} /><text x={L - 10} y={Y(t) + 4} textAnchor="end" className="x2t-axis">{tick(t)}</text></g>)}
          {pts.map((p, i) => <g key={p.x.key} className="x2t-col" tabIndex={0} {...on(i)} aria-label={`${p.x.line1} ${p.x.line2 ?? ''} ${p.v !== null ? `입실 ${clock(p.v)}` : '입실 없음'}${p.u !== null ? `, 평소 ${clock(p.u)}` : ''}`}>
            <rect x={L + cw * i + 2} y={4} width={cw - 4} height={H - 10} rx={8} className="x2-hit" />
            <text x={X(i)} y={H - B + 22} textAnchor="middle" className="x2t-x">{p.head}</text>
            <text x={X(i)} y={H - B + 40} textAnchor="middle" className={p.bad ? 'x2t-x2 x2t-bad' : 'x2t-x2'}>{p.foot}</text>
          </g>)}
          <path d={line('u')} className="x2t-casing" /><path d={line('u')} className="x2t-line" />
          <path d={line('v')} className="x2t-casing" /><path d={line('v')} className="x2t-vline" />
          {pts.map((p, i) => p.u !== null && <circle key={`u${i}`} cx={X(i)} cy={Y(p.u)} r={6} className="x2t-dot" />)}
          {pts.map((p, i) => { const b = p.v !== null && p.u !== null ? lateBand(p.v - p.u) : null; return p.v !== null && <circle key={`v${i}`} cx={X(i)} cy={Y(p.v)} r={tip === i ? 8 : b ? 7 : 6} className={b ? `x2t-vdot x2t-late${b}` : 'x2t-vdot'} /> })}
        </svg>
        {tip !== null && (() => { const p = pts[tip], d = p.v !== null && p.u !== null ? Math.round(p.v - p.u) : null
          const b: Badge = d === null ? undefined : d < 10 ? { text: '평소대로', bad: false } : { text: `${hm(d)} 늦게`, bad: d >= th.shift }
          return <TipBox x={X(tip)} y={Math.min(p.v !== null ? Y(p.v) : H - B, p.u !== null ? Y(p.u) : H - B) - 8} w={w} title={p.title} badge={b}
            rows={[{ mark: 'vline', label: '입실 시각', value: p.v !== null ? clock(p.v) : '없음' }, { mark: 'line', label: '평소 입실 시각', value: p.u !== null ? clock(p.u) : '없음' }]} /> })()}
      </div>
      <p className="x2t-legend"><span><i className="x2t-k-vline" aria-hidden="true" />입실 시각</span><span><i className="x2t-k-line" aria-hidden="true" />평소 입실 시각</span>{LATE_BANDS.map((x) => <span key={x.band}><i className={`x2t-k-late x2t-late${x.band}`} aria-hidden="true" />{x.label}</span>)}</p>
    </div>
    {(() => { const ds = s.days.filter((d) => d.attendance === 'present' && d.start !== null), us = s.days.flatMap((d, i) => { const u = usualStartAt(s, d, 28 + i); return d.attendance === 'present' && u !== null ? [u] : [] })
      const avg = mean(ds.map((d) => d.start!)), uavg = mean(us), last = ds.length ? Math.max(...ds.map((d) => d.start!)) : null
      return <Stats items={[['평균 입실', avg === null ? '–' : clock(avg), '입실한 날'], ['평소 평균 입실', uavg === null ? '–' : clock(uavg)], ['가장 늦은 입실', last === null ? '–' : clock(last)], [`${th.shift}분 이상 늦은 날`, `${lateDays}일`, `/ 입실 ${came}일`]]} /> })()}
  </section>
}

/** 과목별 계획과 실제(최근 7일): 같은 꼴. 칸 = 과목, 막대 = 실제, 점선 = 계획 */
export function SubjectFig({ s, th }: Omit<P, 'period'>) {
  const flagged = flagOf(s, 'EXECUTION_GAP', 'SUBJECT_SHARE')
  const subs = s.subjects.filter((x) => x.plannedMinutes > 0 || x.actualMinutes > 0).sort((a, b) => b.plannedMinutes - a.plannedMinutes)
  const P7 = subs.reduce((t, x) => t + x.plannedMinutes, 0), A7 = subs.reduce((t, x) => t + x.actualMinutes, 0), rate = P7 ? Math.floor((A7 / P7) * 100) : null
  const rated = subs.filter((x) => x.plannedMinutes > 0).map((x) => ({ x, r: x.actualMinutes / x.plannedMinutes }))
  const low = rated.length ? rated.reduce((a, b) => (b.r < a.r ? b : a)) : null, most = subs.length ? subs.reduce((a, b) => (b.actualMinutes > a.actualMinutes ? b : a)) : null
  return <section id="x2-fig-subject" tabIndex={-1} className="x2f x2f-wide" aria-label="과목별 계획과 실제">
    <header className="x2f-head"><h3 className={flagged ? 'x2f-flag' : undefined}>과목별 계획과 실제</h3><p className="x2f-note">최근 7일 · 계획을 낸 날</p></header>
    {!subs.length ? <p className="x2-empty">최근 7일 과목 계획 없음</p> : <>
      <Headline lLabel="과목 합계 실제" lBig={hm(A7)} lSub={P7 ? `계획 ${hm(P7)}` : undefined} rLabel="과목 합계 달성률" rate={rate} bad={flagged && rate !== null && rate < th.rate} />
      {/* 과목별: 불릿 그래프(Stephen Few). 줄마다 실제 = 가로 막대(기준 미만이면 빨강), 계획 = 막대를 가로지르는 짧은 세로선.
          모든 줄이 같은 눈금을 쓰고 밑에 눈금 하나. 배경 띠·점·점선은 두지 않는다 */}
      <div className="x2hb" role="img" aria-label="최근 7일 과목별 계획과 실제">
        {(() => { const raw = Math.max(60, ...subs.flatMap((x) => [x.plannedMinutes, x.actualMinutes])), { top, ticks } = hourTicks(raw, 5)
          return <>{subs.map((x) => { const r = x.plannedMinutes ? Math.floor((x.actualMinutes / x.plannedMinutes) * 100) : null, bad = r !== null && r < th.rate
            return <div key={x.name} className="x2hb-row">
              <b className="x2hb-name">{x.name}</b>
              <span className="x2hb-track">
                <i className={bad ? 'x2hb-bar x2hb-bar-bad' : 'x2hb-bar'} style={{ width: `${(x.actualMinutes / top) * 100}%` }} />
                {x.plannedMinutes > 0 && <i className="x2hb-target" style={{ left: `${(x.plannedMinutes / top) * 100}%` }} />}
              </span>
              <span className="x2hb-val"><strong>{hm(x.actualMinutes)}</strong><span>/ {x.plannedMinutes ? hm(x.plannedMinutes) : '계획 없음'}</span>{r !== null && <em className={bad ? 'x2hb-bad' : undefined}>{r}%</em>}</span>
            </div> })}
            <div className="x2hb-row x2hb-axis" aria-hidden="true"><span /><span className="x2hb-ticks">{ticks.map((t) => <i key={t} style={{ left: `${(t / top) * 100}%` }}>{Math.round(t / 60)}시간</i>)}</span><span /></div></> })()}
        <p className="x2t-legend"><span><i className="x2t-k-bar" aria-hidden="true" />실제 시간</span><span><i className="x2hb-k-target" aria-hidden="true" />계획 시간</span><span><i className="x2hb-k-bad" aria-hidden="true" />달성률 {th.rate}% 미만</span></p>
      </div>
      <Stats items={[['과목 수', `${subs.length}과목`], ['가장 많이 한 과목', most ? `${most.name} ${hm(most.actualMinutes)}` : '–'], ['가장 모자란 과목', low ? `${low.x.name} ${Math.floor(low.r * 100)}%` : '–'], ['계획을 채운 과목', `${rated.filter((o) => o.r >= 1).length}과목`, `/ ${rated.length}과목`]]} />
    </>}
  </section>
}

/** 비몰입(사진 관찰): 같은 꼴. 막대 = 비몰입 건수, 점선 = 표시 기준(그 칸 공부 시간 × 1시간당 기준 건수). 막대를 누르면 아래 기록이 그 칸으로 좁혀진다 */
export function VisionFig({ s, ev, period, perHour, picked, onPick }: { s: CareRow; ev: SupEvent[]; period: Period; perHour: number; picked: string | null; onPick: (dates: string[], label: string, key: string) => void }) {
  const fi = newbieOf(s)?.firstIdx ?? 0
  const sl = slotsOf(s, period)
  const rs = sl.map((x) => visionIn(ev, x.days.map(({ d }) => d)))
  const cols: TCol[] = sl.map((x, i) => ({ key: x.key, ...foot(x, period, undefined, fi), value: rs[i].minutes || rs[i].n ? rs[i].n : null, ref: rs[i].minutes ? (rs[i].minutes / 60) * perHour : null, aria: `${x.line1} ${x.line2 ?? ''} 비몰입 ${rs[i].n}건${rs[i].minutes ? `, 공부 ${hm(rs[i].minutes)}` : ''}` }))
  if (!ev.length) return <section className="x2f x2f-wide" aria-label="비몰입 건수"><header className="x2f-head"><h3>비몰입 건수</h3></header><p className="x2-empty">최근 35일 사진 관찰 기록이 없습니다(비몰입 0건과 다릅니다)</p></section>
  const all = visionIn(ev, s.days), hit = rs.filter((r) => r.perHour !== null && r.n > 0 && r.perHour >= perHour).length
  const per = all.perHour === null ? null : Math.round(all.perHour * 10) / 10
  const ph = (r: (typeof rs)[number]) => (r.perHour === null ? '–' : `${rateText(Math.round(r.perHour * 10) / 10)}건`)
  const pickedIdx = sl.findIndex((x) => x.key === picked)
  const maxDay = rs.reduce((a, r, i) => (r.n > (rs[a]?.n ?? -1) ? i : a), 0)
  return <section className="x2f x2f-wide" aria-label="비몰입 건수">
    <header className="x2f-head"><h3 className={hit > 0 ? 'x2f-flag' : undefined}>비몰입 건수</h3><p className="x2f-note">최근 7일 · 막대를 누르면 아래 기록이 그 {period === 'd' ? '날' : '주'}로 좁혀집니다</p></header>
    <div className="x2h"><div className="x2h-row">
      <div><p className="x2h-label">최근 7일 비몰입</p><p className="x2h-big">{all.n}건<span>/ 공부 {hm(all.minutes)}</span></p></div>
      <div className="x2h-right"><p className="x2h-label">공부 1시간당</p><p className={`x2h-big${per !== null && per >= perHour ? ' x2h-bad' : ''}`}>{per === null ? '–' : `${rateText(per)}건`}<em className={hit ? 'x2h-badge x2h-badge-bad' : 'x2h-badge'}>기준 {rateText(perHour)}건</em></p></div>
    </div></div>
    <TargetBars cols={cols} unit="count" valName="비몰입" refName={`기준(공부 1시간당 ${rateText(perHour)}건)`} badge={(_, i) => rs[i].perHour === null || !rs[i].n ? undefined : rs[i].perHour! >= perHour ? { text: '↑ 기준 초과', bad: true } : { text: '기준 안', bad: false }}
      extra={(i) => [{ mark: 'rate', label: '공부 1시간당', value: ph(rs[i]), bad: rs[i].perHour !== null && rs[i].perHour! >= perHour }]} label={period === 'd' ? '최근 7일 날짜별 비몰입 건수' : '최근 5주 주별 비몰입 건수'}
      picked={pickedIdx >= 0 ? pickedIdx : null} onPick={(i) => { const x = sl[i]; onPick(x.days.map(({ d }) => d.date), x.line2 ? `${x.line2}요일 ${x.line1}` : x.line1, x.key) }} />
    <Stats items={[['하루 평균', `${rateText(Math.round((all.n / Math.max(1, s.days.filter((d) => d.attendance === 'present').length)) * 10) / 10)}건`, '입실한 날'], ['가장 많은 날', rs[maxDay]?.n ? `${sl[maxDay].line2 ?? sl[maxDay].line1} ${rs[maxDay].n}건` : '–'], ['공부 1시간당', per === null ? '–' : `${rateText(per)}건`], ['기준 초과한 ' + (period === 'd' ? '날' : '주'), `${hit}${period === 'd' ? '일' : '주'}`, `/ ${sl.length}${period === 'd' ? '일' : '주'}`]]} />
  </section>
}




