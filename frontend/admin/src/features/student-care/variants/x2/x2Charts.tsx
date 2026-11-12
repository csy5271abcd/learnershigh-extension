// 시안 X′ 학생 겹창 그림. X 코드는 건드리지 않고 새로 그린다.
// 원칙(x-handoff.md 3장, 2026-11-12 사용자 답):
// - 목표 대비 실제 막대(흔한 꼴): 기준(계획·평소)은 넓고 옅은 회색 막대를 뒤에, 실제는 좁고 진한 막대를 앞에.
//   계획보다 더 공부하면 진한 막대가 회색 위로 솟는다. 막대 색은 하나(파랑), 기준에 걸린 칸은 값 글자만 빨강.
// - 그림 오른쪽에 뜬 이름 글자 대신 제목 줄 옆 범례.
// - 값 글자는 언제나 단위를 붙인다('2시간 10분', '4건'). 마우스를 올리면 칸 바탕만 바뀌고 떠다니는 말풍선은 없다.
// - 과목별은 가로 진행 막대(축·격자 없음).
import { useState, type ReactNode } from 'react'
import type { CareRow } from '../shared/useCareData.ts'
import { useWidth } from '../z/useWidth.ts'
import { clock, clockDomain, hm, hourTicks, STATE } from '../notation/kit.tsx'
import type { SupEvent } from '../supervisor/supervisorClient.ts'
import { rateText, slotsOf, usualStartAt, visionIn, type Period, type Slot } from './x2Model.ts'

interface Col { key: string; line1: string; line2?: string; sub?: { text: string; bad: boolean }; value: number | null; plan?: number | null; usual?: number | null; flag?: boolean; label?: string; label2?: string; aria: string }

const subOf = (sl: Slot, period: Period): Col['sub'] => {
  if (period === 'd') { const d = sl.days[0].d; return d.attendance === 'present' ? undefined : { text: STATE[d.attendance], bad: d.attendance === 'absent' } }
  if (sl.days.every(({ d }) => d.attendance === 'unknown')) return { text: '기록 없음', bad: false }
  const off = sl.days.filter(({ d }) => d.attendance === 'absent').length
  return off ? { text: `결석 ${off}일`, bad: true } : undefined
}

/** 세로 막대 그림. 막대 = value, 점선 상자 = plan, 회색 눈금 = usual. onPick이 있으면 칸을 누를 수 있다 */
export function Columns({ cols, top, ticks, unit, label, onPick, picked, height = 260 }: { cols: Col[]; top: number; ticks: number[]; unit: (v: number) => string; label: string; onPick?: (c: Col) => void; picked?: string | null; height?: number }) {
  const [hov, setHov] = useState<number | null>(null)
  const [ref, w] = useWidth<HTMLDivElement>()
  const n = cols.length, L = 52, R = 8, cw = (w - L - R) / Math.max(1, n), rw = Math.min(72, cw * 0.62), bw = rw * 0.55
  const T = 40, B = 56, H = height, y = (v: number) => T + (1 - Math.min(v, top) / top) * (H - T - B)
  return (
    <div ref={ref} className="x2c-plot">
      <svg width={w} height={H} role="img" aria-label={label}>
        {[hov, cols.findIndex((c) => c.key === picked)].map((h, z) => h !== null && h >= 0 && <rect key={z} x={L + cw * h + 2} y={6} width={cw - 4} height={H - 6 - B + 46} rx={6} className={z ? 'x2-bg x2-bg-on' : 'x2-bg'} />)}
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - R} y1={y(t)} y2={y(t)} className="x2c-grid" /><text x={L - 8} y={y(t) + 4} textAnchor="end" className="x2c-axis-text">{unit(t)}</text></g>)}
        {cols.map((c, i) => {
          const cx = L + cw * (i + 0.5), can = !!onPick && c.value !== null && c.value > 0
          // 값 글자는 대상 바로 위: 실제 값은 막대 위, 기준 값(계획·평소)은 점선 상자·눈금 위. 둘이 가까우면 위아래로 쌓는다
          const ref = c.plan || c.usual || null
          const vy = c.value !== null ? y(c.value) : y(0), ry = ref ? y(ref) : null
          const show2 = !!c.label2 && cw >= 92
          // 실제 값은 진한 막대 바로 위, 기준 값은 회색 막대 바로 위. 둘이 가까우면(실제가 기준을 넘거나 22px 안) 위아래로 묶는다
          // 두 값 글자는 높은 쪽 막대 위에 위아래로 묶는다(회색 막대 안에 글자를 얹지 않는다). 위 = 실제(굵게), 아래 = 기준 이름과 값
          const v1 = Math.min(vy, ry ?? vy) - 8 - (show2 ? 17 : 0), v2 = Math.min(vy, ry ?? vy) - 8
          return <g key={c.key} className={can ? 'x2c-col x2c-can' : 'x2c-col'} tabIndex={can ? 0 : -1} role={can ? 'button' : undefined} aria-label={c.aria} aria-pressed={can ? picked === c.key : undefined} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} onFocus={() => setHov(i)} onBlur={() => setHov(null)}
            onClick={can ? () => onPick!(c) : undefined} onKeyDown={can ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick!(c) } } : undefined}>
            <rect x={L + cw * i + 2} y={6} width={cw - 4} height={H - 6 - B + 46} rx={6} className="x2-hit" />
            {ref ? <rect x={cx - rw / 2} y={y(ref)} width={rw} height={y(0) - y(ref)} rx={4} className="x2c-ref" /> : null}
            {c.value !== null && <rect x={cx - bw / 2} y={y(c.value)} width={bw} height={Math.max(c.value ? 2 : 0, y(0) - y(c.value))} rx={3} className="x2c-bar" />}
            {c.label && <text x={cx} y={v1} textAnchor="middle" className={`x2c-val${c.flag ? ' x2c-val-flag' : ''}`}>{c.label}</text>}
            {show2 && <text x={cx} y={v2} textAnchor="middle" className="x2c-val2">{c.label2}</text>}
            <text x={cx} y={H - B + 20} textAnchor="middle" className="x2c-x">{c.line1}</text>
            {c.line2 && <text x={cx} y={H - B + 37} textAnchor="middle" className="x2c-x2">{c.line2}</text>}
            {c.sub && <text x={cx} y={H - B + (c.line2 ? 53 : 37)} textAnchor="middle" className={c.sub.bad ? 'x2c-x2 x2c-bad' : 'x2c-x2'}>{c.sub.text}</text>}
          </g>
        })}
        <line x1={L} x2={w - R} y1={y(0)} y2={y(0)} className="x2c-base" />
      </svg>
    </div>
  )
}

/** 그림 칸: 제목(서버 사유가 걸리면 빨강) · 핵심 숫자(크게) · 범례 · 그림 */
export function Figure({ title, flag, big, note, legend, children, wide, id }: { title: string; flag?: boolean; big?: ReactNode; note?: ReactNode; legend?: ReactNode; children: ReactNode; wide?: boolean; id?: string }) {
  return (
    <section id={id} tabIndex={-1} className={`x2f${wide ? ' x2f-wide' : ''}`} aria-label={title}>
      <header className="x2f-head">
        <h3 className={flag ? 'x2f-flag' : undefined}>{title}</h3>
        {big && <p className="x2f-big">{big}</p>}
        {note && <p className="x2f-note">{note}</p>}
        {legend && <p className="x2f-legend">{legend}</p>}
      </header>
      {children}
    </section>
  )
}
export const Key = ({ kind, children }: { kind: 'bar' | 'flag' | 'ref' | 'usual' | 'dot' | 'down'; children: ReactNode }) => <span className="x2k"><i className={`x2k-${kind}`} aria-hidden="true" />{children}</span>

const hours = (v: number) => `${Math.round(v / 60)}시간`
const sig = (s: CareRow, ...t: string[]) => s.signals.some((x) => t.includes(x.type))
interface P { s: CareRow; period: Period; th: { drop: number; shift: number; rate: number } }

/** 공부 시간: 막대 = 공부, 회색 눈금 = 평소(일간: 같은 요일 평소, 주간: 그 앞 주들 평균) */
export function StudyFig({ s, period, th }: P) {
  const flagged = sig(s, 'STUDY_DROP')
  const sl = slotsOf(s, period)
  const sums = sl.map((x) => x.days.some(({ d }) => d.attendance !== 'unknown') ? x.days.reduce((a, { d }) => a + (d.attendance === 'present' && d.minutes ? d.minutes : 0), 0) : null)
  const cols: Col[] = sl.map((x, g) => {
    const v = period === 'd' ? (x.days[0].d.attendance === 'present' ? x.days[0].d.minutes : null) : sums[g]
    const prev = sums.slice(0, g).filter((u): u is number => u !== null)
    const usual = period === 'd' ? x.days[0].d.usualMinutes : prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : null
    const drop = v !== null && usual ? 100 - (v / usual) * 100 : null
    return { key: x.key, line1: x.line1, line2: x.line2, sub: subOf(x, period), value: v, usual, flag: flagged && drop !== null && drop >= th.drop && (period === 'd' || x.last),
      label: v !== null ? hm(v) : undefined, label2: usual ? `평소 ${hm(usual)}` : undefined,
      aria: `${x.line1} ${x.line2 ?? ''} 공부 ${v !== null ? hm(v) : '없음'}${usual ? `, 평소 ${hm(usual)}` : ''}` }
  })
  const { top, ticks } = hourTicks(Math.max(60, ...cols.flatMap((c) => [c.value ?? 0, c.usual ?? 0])) * 1.12, 3)
  const wk = s.week
  const big = wk.minutes !== null ? <><b>{hm(wk.minutes)}</b>{wk.usualWeek ? <span> / 평소 한 주 {hm(wk.usualWeek)} · {wk.minutes >= wk.usualWeek ? '+' : '−'}{Math.round(Math.abs(100 - (wk.minutes / wk.usualWeek) * 100))}%</span> : null}</> : <span>최근 7일 기록 없음</span>
  return <Figure id="x2-fig-study" wide title="공부 시간" flag={flagged} big={big} note="최근 7일 합계">
    <Columns cols={cols} top={top} ticks={ticks} unit={hours} label={period === 'd' ? '최근 7일 날짜별 공부 시간과 평소' : '최근 5주 주별 공부 시간'} />
  </Figure>
}

/** 계획과 실제: 막대 = 실제, 점선 상자 = 계획 */
export function PlanFig({ s, period, th }: P) {
  const flagged = sig(s, 'EXECUTION_GAP')
  const cols: Col[] = slotsOf(s, period).map((x) => {
    const p = x.days.reduce((a, { d }) => a + (d.planned ?? 0), 0), a = x.days.reduce((t, { d }) => t + (d.planned ? d.actual ?? 0 : 0), 0)
    const has = p > 0, rate = has ? Math.floor((a / p) * 100) : null
    const sub = subOf(x, period) ?? (has ? undefined : { text: '계획 없음', bad: false })
    return { key: x.key, line1: x.line1, line2: x.line2, sub, value: has ? a : null, plan: has ? p : null, flag: flagged && rate !== null && rate < th.rate && (period === 'd' || x.last),
      label: has ? hm(a) : undefined, label2: has ? `계획 ${hm(p)}` : undefined, aria: `${x.line1} ${x.line2 ?? ''} ${has ? `계획 ${hm(p)}, 실제 ${hm(a)}, ${rate}%` : '계획 없음'}` }
  })
  const { top, ticks } = hourTicks(Math.max(60, ...cols.flatMap((c) => [c.value ?? 0, c.plan ?? 0])) * 1.12, 3)
  const ds = s.days.filter((d) => (d.planned ?? 0) > 0), P7 = ds.reduce((t, d) => t + d.planned!, 0), A7 = ds.reduce((t, d) => t + (d.actual ?? 0), 0)
  const big = P7 ? <><b>{hm(A7)}</b><span> / 계획 {hm(P7)} · 달성률 </span><b className={flagged && (A7 / P7) * 100 < th.rate ? 'x2f-bad' : undefined}>{Math.floor((A7 / P7) * 100)}%</b></> : <span>최근 7일 계획 없음</span>
  return <Figure id="x2-fig-plan" wide title="계획과 실제" flag={flagged} big={big} note="최근 7일, 계획을 낸 날">
    <Columns cols={cols} top={top} ticks={ticks} unit={hours} label={period === 'd' ? '최근 7일 날짜별 계획과 실제' : '최근 5주 주별 계획과 실제'} />
  </Figure>
}

/** 과목별 계획과 실제(최근 7일): 가로 진행 막대. 점선 상자 = 계획 길이, 채운 막대 = 실제 */
export function SubjectFig({ s, th }: Omit<P, 'period'>) {
  const flagged = sig(s, 'EXECUTION_GAP', 'SUBJECT_SHARE')
  const subs = s.subjects.filter((x) => x.plannedMinutes > 0 || x.actualMinutes > 0).sort((a, b) => b.plannedMinutes - a.plannedMinutes)
  const max = Math.max(1, ...subs.flatMap((x) => [x.plannedMinutes, x.actualMinutes]))
  return <Figure id="x2-fig-subject" title="과목별 계획과 실제" flag={flagged} note="최근 7일">
    {!subs.length ? <p className="x2-empty">최근 7일 과목 계획 없음</p> : <ul className="x2s">
      {subs.map((x) => {
        const rate = x.plannedMinutes ? Math.floor((x.actualMinutes / x.plannedMinutes) * 100) : null, bad = flagged && rate !== null && rate < th.rate
        return <li key={x.name}>
          <span className="x2s-name">{x.name}</span>
          <span className="x2s-track" aria-hidden="true">
            {x.plannedMinutes > 0 && <i className="x2s-plan" style={{ width: `${(x.plannedMinutes / max) * 100}%` }} />}
            <i className="x2s-bar" style={{ width: `${(x.actualMinutes / max) * 100}%` }} />
          </span>
          <span className="x2s-val"><b>{hm(x.actualMinutes)}</b> / 계획 {x.plannedMinutes ? hm(x.plannedMinutes) : '없음'}{rate !== null && <b className={bad ? 'x2f-bad' : undefined}> {rate}%</b>}</span>
        </li>
      })}
    </ul>}
  </Figure>
}

/** 입실 시각: 점 = 입실(선으로 잇는다), 회색 눈금 = 같은 요일 평소. 위로 갈수록 늦은 시각 */
export function StartFig({ s, period, th }: P) {
  const flagged = sig(s, 'START_TIME_SHIFT')
  const [ref, w] = useWidth<HTMLDivElement>()
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const pts = slotsOf(s, period).map((x) => {
    const came = x.days.filter(({ d }) => d.attendance === 'present' && d.start !== null)
    const v = mean(came.map(({ d }) => d.start!)), u = mean(came.flatMap(({ d, idx }) => { const k = usualStartAt(s, d, idx); return k === null ? [] : [k] }))
    return { x, v, u, sub: subOf(x, period), flag: flagged && v !== null && u !== null && v - u >= th.shift && (period === 'd' || x.last) }
  })
  const [lo, hi] = clockDomain(pts.flatMap((p) => [p.v, p.u].filter((k): k is number => k !== null)), 30)
  const n = pts.length, L = 64, R = 12, cw = (w - L - R) / n, T = 30, B = 56, H = 250, X = (i: number) => L + cw * (i + 0.5), Y = (m: number) => T + (1 - (m - lo) / (hi - lo)) * (H - T - B)
  const step = hi - lo > 300 ? 120 : 60
  const ticks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, k) => lo + k * step)
  const late = mean(s.days.flatMap((d, i) => { const u = usualStartAt(s, d, 28 + i); return d.attendance === 'present' && d.start !== null && u !== null ? [d.start - u] : [] }))
  const big = late === null ? <span>비교할 입실 없음</span> : <><span>평소보다 평균 </span><b className={flagged && late >= th.shift ? 'x2f-bad' : undefined}>{hm(late)} {late >= 0 ? '늦게' : '일찍'}</b></>
  return <Figure id="x2-fig-start" title="입실 시각" flag={flagged} big={big} note="최근 7일">
    <div ref={ref} className="x2c-plot">
      <svg width={w} height={H} role="img" aria-label={period === 'd' ? '최근 7일 입실 시각과 평소' : '최근 5주 평균 입실 시각과 평소'}>
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - R} y1={Y(t)} y2={Y(t)} className="x2c-grid" /><text x={L - 8} y={Y(t) + 4} textAnchor="end" className="x2c-axis-text">{t % 1440 === 0 ? '자정' : clock(t).replace(':00', '시')}</text></g>)}
        {pts.map((p, i) => i > 0 && p.v !== null && pts[i - 1].v !== null && <line key={`l${i}`} x1={X(i - 1)} x2={X(i)} y1={Y(pts[i - 1].v!)} y2={Y(p.v)} className="x2c-line" />)}
        {pts.map((p, i) => {
          // 시각 글자는 점에서 평소 눈금의 반대쪽에 둔다(눈금·선과 겹치지 않게)
          const below = p.u !== null && p.v !== null && p.u > p.v
          return <g key={p.x.key} className="x2c-col" aria-label={`${p.x.line1} ${p.x.line2 ?? ''} ${p.v !== null ? `입실 ${clock(p.v)}` : '입실 없음'}${p.u !== null ? `, 평소 ${clock(p.u)}` : ''}`}>
            <rect x={L + cw * i + 2} y={6} width={cw - 4} height={H - 6 - B + 46} rx={6} className="x2c-band" />
            {p.u !== null && <rect x={X(i) - 16} y={Y(p.u) - 1.5} width={32} height={3} rx={1.5} className="x2c-usual" />}
            {p.u !== null && cw >= 92 && <text x={X(i)} y={Y(p.u) + (below ? -9 : 17)} textAnchor="middle" className="x2c-val2">평소 {clock(p.u)}</text>}
            {p.v !== null && <circle cx={X(i)} cy={Y(p.v)} r={5.5} className={p.flag ? 'x2c-dot x2c-flag' : 'x2c-dot'} />}
            {p.v !== null && <text x={X(i)} y={Y(p.v) + (below ? 22 : -12)} textAnchor="middle" className={`x2c-val${p.flag ? ' x2c-val-flag' : ''}`}>{clock(p.v)}</text>}
            <text x={X(i)} y={H - B + 20} textAnchor="middle" className="x2c-x">{p.x.line1}</text>
            {p.x.line2 && <text x={X(i)} y={H - B + 37} textAnchor="middle" className="x2c-x2">{p.x.line2}</text>}
            {p.sub && <text x={X(i)} y={H - B + (p.x.line2 ? 53 : 37)} textAnchor="middle" className={p.sub.bad ? 'x2c-x2 x2c-bad' : 'x2c-x2'}>{p.sub.text}</text>}
          </g>
        })}
      </svg>
    </div>
  </Figure>
}

/** 비몰입: 막대 = 건수, 공부 1시간당 표시 기준 이상이면 빨강. 막대를 누르면 아래 기록이 그 날로 좁혀진다 */
export function VisionFig({ s, ev, period, perHour, picked, onPick }: { s: CareRow; ev: SupEvent[]; period: Period; perHour: number; picked: string | null; onPick: (dates: string[], label: string, key: string) => void }) {
  const sl = slotsOf(s, period)
  const cols: Col[] = sl.map((x) => {
    const r = visionIn(ev, x.days.map(({ d }) => d)), flag = r.perHour !== null && r.perHour >= perHour
    return { key: x.key, line1: x.line1, line2: x.line2, sub: subOf(x, period), value: r.n || (r.minutes ? 0 : null), flag, label: r.minutes || r.n ? `${r.n}건` : undefined, label2: r.perHour !== null && r.n ? `시간당 ${rateText(Math.round(r.perHour * 10) / 10)}건` : undefined,
      aria: `${x.line1} ${x.line2 ?? ''} 비몰입 ${r.n}건${r.minutes ? `, 공부 ${hm(r.minutes)}` : ''}` }
  })
  const top = Math.max(4, ...cols.map((c) => c.value ?? 0)) * 1.15
  const step = top > 20 ? 10 : top > 8 ? 4 : 2
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, k) => k * step)
  const all = visionIn(ev, s.days), hit = cols.filter((c) => c.flag).length
  if (!ev.length) return <Figure title="비몰입 건수"><p className="x2-empty">최근 35일 사진 관찰 기록이 없습니다(비몰입 0건과 다릅니다)</p></Figure>
  const big = <><b>{all.n}건</b><span> · 공부 1시간당 {all.perHour === null ? '–' : rateText(Math.round(all.perHour * 10) / 10)}건</span>{hit > 0 && <b className="x2f-bad"> · 기준 넘은 {period === 'd' ? '날' : '주'} {hit}</b>}</>
  return <Figure title="비몰입 건수" flag={hit > 0} big={big} note="최근 7일">
    <Columns cols={cols} top={top} ticks={ticks} unit={(v) => `${v}건`} label={period === 'd' ? '최근 7일 날짜별 비몰입 건수' : '최근 5주 주별 비몰입 건수'} picked={picked}
      onPick={(c) => { const x = sl.find((k) => k.key === c.key)!; onPick(x.days.map(({ d }) => d.date), `${x.line1}${x.line2 ? ` ${x.line2}` : ''}`, x.key) }} />
  </Figure>
}





