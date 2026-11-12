// 일간(최근 7일, 날짜 7칸)·주간(최근 5주, 주 5칸)이 같은 꼴인 그림. 칸마다 '기준(회색) + 실제' 짝을 그린다.
// - 막대: 공부 시간(같은 요일 평소 ↔ 공부), 계획(계획 ↔ 실제). 선: 입실 시각(평소 ↔ 입실).
// - 빨강은 학생 케어 서버 사유(signals)가 있고 그 칸의 값이 같은 기준을 넘을 때만. 서버 사유가 없으면 칠하지 않는다.
// - 이름(평소·실제 등)은 오른쪽 여백에 마지막 값 높이로, 값은 실제 막대 위에(칸이 좁으면 생략, 마우스 올림에 정확값).
// - 결석·예정 없음은 날짜 밑에, 주간은 그 주 결석 일수.
import type { ReactNode } from 'react'
import type { CareRow } from '../shared/useCareData.ts'
import { md } from '../shared/useCareData.ts'
import { useWidth } from '../z/useWidth.ts'
import { clock, clockDomain, clockTick, dropDay, hm, hourTicks, lateDay, sameWeekdayMean, STATE, weeksOf, type NotationProps } from '../notation/kit.tsx'

type Day = CareRow['days'][number]
interface Bucket { key: string; line1: string; line2?: string; sub?: { text: string; flag: boolean }; a: number | null; b: number | null; flag: boolean; tip: string; strong: boolean }

const hasSig = (s: CareRow, t: string) => s.signals.some((x) => x.type === t)
const dayBucket = (d: Day, narrow: boolean): Pick<Bucket, 'line1' | 'line2' | 'sub'> => ({
  line1: narrow ? String(Number(d.date.slice(8))) : md(d.date),
  line2: d.dow,
  sub: d.attendance === 'present' ? undefined : { text: d.attendance === 'off' ? '예정 없음' : STATE[d.attendance], flag: d.attendance === 'absent' },
})
const weekBucket = (wk: Day[], g: number): Pick<Bucket, 'line1' | 'line2' | 'sub'> => {
  const off = wk.filter((d) => d.attendance === 'absent').length
  return { line1: g === 4 ? '최근 7일' : `${md(wk[0].date)}~`, sub: off ? { text: `결석 ${off}일`, flag: true } : undefined }
}
const twoLine = (v: number, wide: boolean) => { const h = Math.floor(v / 60), m = Math.round(v % 60); return h && m && !wide ? [`${h}시간`, `${m}분`] : [hm(v)] }

/** 짝 막대 */
function PairBars({ buckets, top, ticks, unit, names, label }: { buckets: Bucket[]; top: number; ticks: number[]; unit: (v: number) => string; names: [string, string]; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const n = buckets.length, L = 60, RG = 70, cw = (w - L - RG) / n, bw = Math.min(28, cw * 0.3)
  const showVal = cw >= 64
  const T = 34, B = 58, H = 290, y = (v: number) => T + (1 - Math.min(v, top) / top) * (H - T - B)
  const last = [...buckets].reverse().find((k) => k.a !== null && k.b !== null)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label={label}>
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - RG} y1={y(t)} y2={y(t)} className="n2-grid" /><text x={L - 10} y={y(t) + 4} textAnchor="end" className="n2-tick">{unit(t)}</text></g>)}
        {buckets.map((k, i) => {
          const cx = L + cw * (i + 0.5)
          return <g key={k.key} tabIndex={0} data-tip={k.tip} aria-label={k.tip}>
            <rect x={L + cw * i} y={T} width={cw} height={H - T - B} className="n2-hit" />
            {k.a !== null && <rect x={cx - bw - 2} y={y(k.a)} width={bw} height={Math.max(k.a ? 2 : 0, y(0) - y(k.a))} rx={3} className="pc-base" />}
            {k.b !== null && <rect x={cx + 2} y={y(k.b)} width={bw} height={Math.max(k.b ? 2 : 0, y(0) - y(k.b))} rx={3} className={k.flag ? 'pc-flag' : k.strong ? 'pc-now' : 'pc-old'} />}
            {k.b !== null && showVal && (() => { const lines = twoLine(k.b, cw >= 96); const top0 = Math.min(y(k.b), k.a !== null ? y(k.a) : y(k.b)) - 8 - (lines.length - 1) * 17
              return <text x={cx + 2 + bw / 2} y={top0} textAnchor="middle" className={`n2-tick n2-small n2-halo${k.flag ? ' n2-flag' : k.strong ? ' n2-strong' : ''}`}>{lines.map((t, j) => <tspan key={j} x={cx + 2 + bw / 2} dy={j ? 17 : 0}>{t}</tspan>)}</text> })()}
            <text x={cx} y={H - B + 18} textAnchor="middle" className={`n2-tick${k.strong ? ' n2-strong' : ''}${k.sub?.flag && k.line2 ? ' n2-flag' : ''}`}>{k.line1}</text>
            {k.line2 && <text x={cx} y={H - B + 35} textAnchor="middle" className={`n2-tick${k.sub?.flag ? ' n2-flag' : ''}`}>{k.line2}</text>}
            {k.sub && <text x={cx} y={H - B + (k.line2 ? 52 : 34)} textAnchor="middle" className={`n2-tick n2-small${k.sub.flag ? ' n2-flag' : ''}`}>{k.sub.text}</text>}
          </g>
        })}
        <line x1={L} x2={w - RG} y1={y(0)} y2={y(0)} className="n2-axis" />
        {last && <Names x={w - RG + 10} ya={y(last.a!)} yb={y(last.b!)} names={names} />}
      </svg>
    </div>
  )
}

/** 짝 선(시각): 위로 갈수록 늦은 시각. 평소 = 칸마다 회색 가로 막대, 입실 = 파란 점과 선 */
function PairLines({ buckets, names, label }: { buckets: Bucket[]; names: [string, string]; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const n = buckets.length, L = 60, RG = 70, cw = (w - L - RG) / n
  const vals = buckets.flatMap((k) => [k.a, k.b].filter((v): v is number => v !== null))
  const [lo, hi] = clockDomain(vals, 20)
  const T = 30, B = 58, H = 270, X = (i: number) => L + cw * (i + 0.5), Y = (m: number) => T + (1 - (m - lo) / (hi - lo)) * (H - T - B)
  const step = hi - lo > 300 ? 120 : 60
  const ticks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, k) => lo + k * step)
  const seg = (key: 'a' | 'b', cls: string) => buckets.map((k, i) => i > 0 && k[key] !== null && buckets[i - 1][key] !== null && <line key={`${key}${i}`} x1={X(i - 1)} x2={X(i)} y1={Y(buckets[i - 1][key]!)} y2={Y(k[key]!)} className={cls} />)
  const lastA = [...buckets].reverse().find((k) => k.a !== null), lastB = [...buckets].reverse().find((k) => k.b !== null)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label={label}>
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - RG} y1={Y(t)} y2={Y(t)} className="n2-grid" /><text x={L - 10} y={Y(t) + 4} textAnchor="end" className="n2-tick">{clockTick(t)}</text></g>)}
        {seg('b', 'pc-line')}
        {buckets.map((k, i) => <g key={k.key} tabIndex={0} data-tip={k.tip} aria-label={k.tip}>
          <rect x={L + cw * i} y={T} width={cw} height={H - T - B} className="n2-hit" />
          {/* 평소는 칸마다 짧은 가로 막대(선으로 잇지 않는다: 입실 선과 겹쳐 안 보이지 않게) */}
          {k.a !== null && <rect x={X(i) - Math.min(22, cw * 0.32)} y={Y(k.a) - 2.5} width={Math.min(44, cw * 0.64)} height={5} rx={2.5} className="pc-tick-base" />}
          {k.b !== null && <circle cx={X(i)} cy={Y(k.b)} r={k.strong ? 6 : 5} className={k.flag ? 'pc-dot-flag' : 'pc-dot'} />}
          <text x={X(i)} y={H - B + 18} textAnchor="middle" className={`n2-tick${k.strong ? ' n2-strong' : ''}${k.sub?.flag && k.line2 ? ' n2-flag' : ''}`}>{k.line1}</text>
          {k.line2 && <text x={X(i)} y={H - B + 35} textAnchor="middle" className={`n2-tick${k.sub?.flag ? ' n2-flag' : ''}`}>{k.line2}</text>}
          {k.sub && <text x={X(i)} y={H - B + (k.line2 ? 52 : 34)} textAnchor="middle" className={`n2-tick n2-small${k.sub.flag ? ' n2-flag' : ''}`}>{k.sub.text}</text>}
        </g>)}
        {lastA && lastB && <Names x={w - RG + 10} ya={Y(lastA.a!)} yb={Y(lastB.b!)} names={names} />}
      </svg>
    </div>
  )
}

/** 오른쪽 여백의 두 이름(가까우면 벌린다) */
function Names({ x, ya, yb, names }: { x: number; ya: number; yb: number; names: [string, string] }): ReactNode {
  let a = ya + 4, b = yb + 4
  if (Math.abs(a - b) < 16) { const m = (a + b) / 2, up = b <= a; b = m + (up ? -8 : 8); a = m + (up ? 8 : -8) }
  return <><text x={x} y={a} className="n2-tick">{names[0]}</text><text x={x} y={b} className="n2-tick n2-strong">{names[1]}</text></>
}

const hours = (v: number) => `${Math.round(v / 60)}시간`

/** 공부 시간: 일간 = 같은 요일 평소 ↔ 공부, 주간 = 지난 4주 한 주 평균 ↔ 그 주 공부 */
export function StudyPair({ s, th, period }: NotationProps & { period: 'd' | 'w' }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const sig = hasSig(s, 'STUDY_DROP')
  let buckets: Bucket[]
  if (period === 'd') {
    const narrow = (w - 130) / 7 < 46
    buckets = s.days.map((d) => {
      const b = d.attendance === 'present' ? d.minutes : null
      return { key: d.date, ...dayBucket(d, narrow), a: d.usualMinutes, b, flag: sig && dropDay(d, th.drop), strong: true, tip: `${md(d.date)} ${d.dow} · ${b !== null ? `공부 ${hm(b)}` : STATE[d.attendance]}${d.usualMinutes ? ` · 같은 요일 평소 ${hm(d.usualMinutes)}` : ''}` }
    })
  } else {
    const weeks = weeksOf(s), sum = weeks.map((wk) => wk.reduce((a, d) => a + (d.attendance === 'present' && d.minutes ? d.minutes : 0), 0))
    const avg = sum.slice(0, 4).reduce((a, b) => a + b, 0) / 4
    buckets = weeks.map((wk, g) => ({ key: wk[0].date, ...weekBucket(wk, g), a: avg, b: sum[g], strong: g === 4, flag: g === 4 && sig && avg > 0 && 100 - (sum[g] / avg) * 100 >= th.drop, tip: `${g === 4 ? '최근 7일' : `${md(wk[0].date)}–${md(wk[6].date)}`} · 공부 ${hm(sum[g])} · 지난 4주 한 주 평균 ${hm(avg)}` }))
  }
  const { top, ticks } = hourTicks(Math.max(60, ...buckets.flatMap((k) => [k.a ?? 0, k.b ?? 0])), 4)
  return <div ref={ref} className="pc-wrap"><PairBars buckets={buckets} top={top} ticks={ticks} unit={hours} names={period === 'd' ? ['평소', '공부'] : ['4주 평균', '공부']} label={period === 'd' ? '최근 7일 공부 시간과 같은 요일 평소' : '최근 5주 주별 공부 시간과 지난 4주 한 주 평균'} /></div>
}

/** 계획: 계획 ↔ 실제(시간). 일간 = 날짜별, 주간 = 주별 합 */
export function PlanPair({ s, th, period }: NotationProps & { period: 'd' | 'w' }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const sig = hasSig(s, 'EXECUTION_GAP')
  const under = (p: number, a: number) => p > 0 && (a / p) * 100 < th.rate
  let buckets: Bucket[]
  if (period === 'd') {
    const narrow = (w - 130) / 7 < 46
    buckets = s.days.map((d) => {
      const p = d.planned ?? 0, has = p > 0
      return { key: d.date, ...dayBucket(d, narrow), sub: d.attendance === 'present' && !has ? { text: '계획 없음', flag: false } : dayBucket(d, narrow).sub, a: has ? p : null, b: has ? d.actual ?? 0 : null, strong: true, flag: sig && has && under(p, d.actual ?? 0), tip: `${md(d.date)} ${d.dow} · ${has ? `계획 ${hm(p)} · 실제 ${hm(d.actual ?? 0)} (${Math.floor(((d.actual ?? 0) / p) * 100)}%)` : d.attendance === 'present' ? '계획 없음' : STATE[d.attendance]}` }
    })
  } else {
    buckets = weeksOf(s).map((wk, g) => {
      const p = wk.reduce((a, d) => a + (d.planned ?? 0), 0), a = wk.reduce((x, d) => x + (d.planned ? d.actual ?? 0 : 0), 0)
      return { key: wk[0].date, ...weekBucket(wk, g), a: p || null, b: p ? a : null, strong: g === 4, flag: g === 4 && sig && under(p, a), tip: `${g === 4 ? '최근 7일' : `${md(wk[0].date)}–${md(wk[6].date)}`} · ${p ? `계획 ${hm(p)} · 실제 ${hm(a)} (${Math.floor((a / p) * 100)}%)` : '계획 없음'}` }
    })
  }
  const { top, ticks } = hourTicks(Math.max(60, ...buckets.flatMap((k) => [k.a ?? 0, k.b ?? 0])), 4)
  return <div ref={ref} className="pc-wrap"><PairBars buckets={buckets} top={top} ticks={ticks} unit={hours} names={['계획', '실제']} label={period === 'd' ? '최근 7일 날짜별 계획 시간과 실제 시간' : '최근 5주 주별 계획 시간과 실제 시간'} /></div>
}

/** 입실 시각: 평소 ↔ 입실. 일간 = 같은 요일 평소와 그날, 주간 = 그 주 평소 평균과 입실 평균(입실한 날만) */
export function StartPair({ s, th, period }: NotationProps & { period: 'd' | 'w' }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const sig = hasSig(s, 'START_TIME_SHIFT')
  let buckets: Bucket[]
  if (period === 'd') {
    const narrow = (w - 130) / 7 < 46
    buckets = s.days.map((d) => {
      const b = d.attendance === 'present' ? d.start : null
      return { key: d.date, ...dayBucket(d, narrow), a: d.usualStart, b, strong: true, flag: sig && lateDay(d, th.shift), tip: `${md(d.date)} ${d.dow} · ${b !== null ? `입실 ${clock(b)}` : STATE[d.attendance]}${d.usualStart !== null ? ` · 같은 요일 평소 ${clock(d.usualStart)}` : ''}` }
    })
  } else {
    const days = s.history35
    const usual = days.map((d, i) => d.usualStart ?? sameWeekdayMean(s, i, 'start'))
    buckets = weeksOf(s).map((wk, g) => {
      const came = wk.map((d, k) => ({ d, u: usual[g * 7 + k] })).filter(({ d }) => d.attendance === 'present' && d.start !== null)
      const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
      const b = mean(came.map(({ d }) => d.start!)), a = mean(came.flatMap(({ u }) => (u === null ? [] : [u])))
      return { key: wk[0].date, ...weekBucket(wk, g), a, b, strong: g === 4, flag: g === 4 && sig && a !== null && b !== null && b - a >= th.shift, tip: `${g === 4 ? '최근 7일' : `${md(wk[0].date)}–${md(wk[6].date)}`} · ${b !== null ? `입실 평균 ${clock(b)}` : '입실한 날 없음'}${a !== null ? ` · 같은 날들의 평소 평균 ${clock(a)}` : ''}` }
    })
  }
  return <div ref={ref} className="pc-wrap"><PairLines buckets={buckets} names={period === 'd' ? ['평소', '입실'] : ['평소', '입실']} label={period === 'd' ? '최근 7일 입실 시각과 같은 요일 평소' : '최근 5주 주별 평균 입실 시각과 평소'} /></div>
}

/** 과목별 계획 ↔ 실제(최근 7일, 세로 짝 막대: 날짜별 그림과 같은 꼴) */
export function SubjectPair({ s, th }: NotationProps) {
  const sig = s.signals.some((x) => x.type === 'EXECUTION_GAP' || x.type === 'SUBJECT_SHARE')
  const subs = s.subjects.filter((x) => x.plannedMinutes > 0 || x.actualMinutes > 0).sort((a, b) => b.plannedMinutes - a.plannedMinutes)
  if (!subs.length) return <p className="n2-empty">최근 7일 과목 계획 없음</p>
  const buckets: Bucket[] = subs.map((x) => ({ key: x.name, line1: x.name, a: x.plannedMinutes, b: x.actualMinutes, strong: true, flag: sig && x.plannedMinutes > 0 && (x.actualMinutes / x.plannedMinutes) * 100 < th.rate, tip: `${x.name} · 계획 ${hm(x.plannedMinutes)} · 실제 ${hm(x.actualMinutes)}${x.plannedMinutes ? ` (${Math.floor((x.actualMinutes / x.plannedMinutes) * 100)}%)` : ''}` }))
  const { top, ticks } = hourTicks(Math.max(60, ...buckets.flatMap((k) => [k.a ?? 0, k.b ?? 0])), 4)
  return <div className="pc-wrap"><PairBars buckets={buckets} top={top} ticks={ticks} unit={hours} names={['계획', '실제']} label="최근 7일 과목별 계획 시간과 실제 시간" /></div>
}
