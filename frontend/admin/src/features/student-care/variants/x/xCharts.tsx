// X 전용 그림(일간·주간 짝 그림). 다른 시안과 코드를 나누지 않는다.
// 일간(최근 7일, 날짜 7칸)·주간(최근 5주, 주 5칸)이 같은 꼴인 그림. 칸마다 '기준(회색) + 실제' 짝을 그린다.
// - 막대: 공부 시간(같은 요일 평소 ↔ 공부), 계획(계획 ↔ 실제). 선: 입실 시각(평소 ↔ 입실).
// - 빨강은 학생 케어 서버 사유(signals)가 있고 그 칸의 값이 같은 기준을 넘을 때만. 서버 사유가 없으면 칠하지 않는다.
// - 막대 그림은 막대 = 실제, 가로 눈금 = 기준. 기준 이름은 첫 눈금 옆에 한 번. 선 그림은 이름을 각 선의 마지막 점 옆에(오른쪽 여백 범례 금지).
// - 결석·예정 없음은 날짜 밑에, 주간은 그 주 결석 일수.
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
  if (wk.every((d) => d.attendance === 'unknown')) return { line1: g === 4 ? '최근 7일' : `${md(wk[0].date)}~`, sub: { text: '기록 없음', flag: false } }
  const off = wk.filter((d) => d.attendance === 'absent').length
  return { line1: g === 4 ? '최근 7일' : `${md(wk[0].date)}~`, sub: off ? { text: `결석 ${off}일`, flag: true } : undefined }
}
// 값 글자: 칸이 넓으면 'n시간 m분', 좁으면 소수 시간 한 줄(단위는 왼쪽 축 'n시간'). 두 줄로 쪼개지 않는다
const twoLine = (v: number, wide: boolean) => wide ? [hm(v)] : [(v / 60).toFixed(1)]

/** 날짜 밑 상태 글자: 칸이 좁으면 두 줄('계획'/'없음')로 나눠 옆 칸과 붙지 않게 */
function SubText({ x, y, sub, narrow }: { x: number; y: number; sub: NonNullable<Bucket['sub']>; narrow: boolean }) {
  const parts = narrow && sub.text.includes(' ') ? sub.text.split(' ') : [sub.text]
  return <text x={x} y={y} textAnchor="middle" className={`xn-tick xn-small${sub.flag ? ' xn-flag' : ''}`}>{parts.map((t, j) => <tspan key={j} x={x} dy={j ? 13 : 0}>{t}</tspan>)}</text>
}

/** 막대 + 기준 눈금: 막대 = 실제, 막대를 가로지르는 짙은 회색 눈금 = 기준(같은 요일 평소·계획).
 * 기준이 모든 칸에서 같으면(주간의 4주 평균) 그림 전체를 가로지르는 선 하나. 기준 이름은 첫 눈금 왼쪽에 한 번만(범례 없이).
 * 값은 막대·눈금 중 높은 쪽 위. onPick이 있으면 칸을 눌러 고른다 */
function PairBars({ buckets, top, ticks, unit, names, label, onPick, picked, refLine }: { buckets: Bucket[]; top: number; ticks: number[]; unit: (v: number) => string; names: [string, string]; label: string; onPick?: (k: Bucket) => void; picked?: string | null; refLine?: boolean }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const n = buckets.length, L = 60, RG = 44, cw = (w - L - RG) / n, bw = Math.min(30, cw * 0.4), narrow = cw < 64
  const showVal = cw >= 30
  const T = 34, B = 64, H = 296, y = (v: number) => T + (1 - Math.min(v, top) / top) * (H - T - B)
  const as = buckets.map((k) => k.a).filter((v): v is number => v !== null)
  // 기준이 칸마다 같은 '평균'일 때만(주간 4주 평균) 한 줄로 긋는다. 날짜별 계획처럼 값이 우연히 같아도 칸마다 눈금
  const flat = !!refLine && as.length > 0
  const lastA = buckets.map((k) => k.a !== null).lastIndexOf(true)
  return (
    <div ref={ref} className="xn-plot">
      <svg width={w} height={H} role="img" aria-label={label}>
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - RG} y1={y(t)} y2={y(t)} className="xn-grid" /><text x={L - 10} y={y(t) + 4} textAnchor="end" className="xn-tick">{unit(t)}</text></g>)}
        {flat && <><line x1={L} x2={w - RG} y1={y(as[0])} y2={y(as[0])} className="xp-ref" /><text x={w - RG + 4} y={y(as[0]) + 4} className="xn-tick xn-small">{names[0]}</text></>}
        {buckets.map((k, i) => {
          const cx = L + cw * (i + 0.5), on = picked === k.key
          return <g key={k.key} tabIndex={0} data-tip={k.tip} aria-label={k.tip} className={onPick ? 'xp-pick' : undefined} onClick={onPick ? () => onPick(k) : undefined} onKeyDown={onPick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(k) } } : undefined}>
            <rect x={L + cw * i} y={T} width={cw} height={H - T - B} className={on ? 'xn-hit xp-on' : 'xn-hit'} />
            {k.b !== null && <rect x={cx - bw / 2} y={y(k.b)} width={bw} height={Math.max(k.b ? 2 : 0, y(0) - y(k.b))} rx={3} className={k.flag ? 'xp-flag' : 'xp-now'} />}
            {!flat && k.a !== null && <rect x={cx - bw / 2 - 6} y={y(k.a) - 1.5} width={bw + 12} height={3} rx={1.5} className="xp-tick-base" />}
            {!flat && i === lastA && <text x={cx + bw / 2 + 10} y={y(k.a!) + 4} className="xn-tick xn-small xn-halo">{names[0]}</text>}
            {k.b !== null && showVal && <text x={cx} y={Math.min(y(k.b), k.a !== null && !flat ? y(k.a) - 2 : y(k.b)) - 8} textAnchor="middle" className={`xn-tick xn-small xn-halo${k.flag ? ' xn-flag' : k.strong ? ' xn-strong' : ''}`}>{twoLine(k.b, cw >= 96)[0]}</text>}
            <text x={cx} y={H - B + 18} textAnchor="middle" className={`xn-tick${k.strong ? ' xn-strong' : ''}${k.sub?.flag && k.line2 ? ' xn-flag' : ''}`}>{k.line1}</text>
            {k.line2 && <text x={cx} y={H - B + 35} textAnchor="middle" className={`xn-tick${k.sub?.flag ? ' xn-flag' : ''}`}>{k.line2}</text>}
            {k.sub && <SubText x={cx} y={H - B + (k.line2 ? 51 : 34)} sub={k.sub} narrow={narrow} />}
          </g>
        })}
        <line x1={L} x2={w - RG} y1={y(0)} y2={y(0)} className="xn-axis" />
      </svg>
    </div>
  )
}

/** 짝 선(시각): 위로 갈수록 늦은 시각. 평소 = 회색 점선 꺾은선, 입실 = 파란 실선과 점(점 위에 시각) */
function PairLines({ buckets, names, label }: { buckets: Bucket[]; names: [string, string]; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const n = buckets.length, L = 60, RG = 46, cw = (w - L - RG) / n
  const vals = buckets.flatMap((k) => [k.a, k.b].filter((v): v is number => v !== null))
  const [lo, hi] = clockDomain(vals, 20)
  const T = 30, B = 58, H = 270, X = (i: number) => L + cw * (i + 0.5), Y = (m: number) => T + (1 - (m - lo) / (hi - lo)) * (H - T - B)
  const step = hi - lo > 300 ? 120 : 60
  const ticks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, k) => lo + k * step)
  const seg = (key: 'a' | 'b', cls: string) => buckets.map((k, i) => i > 0 && k[key] !== null && buckets[i - 1][key] !== null && <line key={`${key}${i}`} x1={X(i - 1)} x2={X(i)} y1={Y(buckets[i - 1][key]!)} y2={Y(k[key]!)} className={cls} />)
  const lastA = [...buckets].reverse().find((k) => k.a !== null), lastB = [...buckets].reverse().find((k) => k.b !== null)
  return (
    <div ref={ref} className="xn-plot">
      <svg width={w} height={H} role="img" aria-label={label}>
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - RG} y1={Y(t)} y2={Y(t)} className="xn-grid" /><text x={L - 10} y={Y(t) + 4} textAnchor="end" className="xn-tick">{clockTick(t)}</text></g>)}
        {seg('a', 'xp-line-base')}
        {seg('b', 'xp-line')}
        {buckets.map((k, i) => <g key={k.key} tabIndex={0} data-tip={k.tip} aria-label={k.tip}>
          <rect x={L + cw * i} y={T} width={cw} height={H - T - B} className="xn-hit" />
          {/* 평소는 칸마다 짧은 가로 막대(선으로 잇지 않는다: 입실 선과 겹쳐 안 보이지 않게) */}
          {k.a !== null && <circle cx={X(i)} cy={Y(k.a)} r={3.5} className="xp-dot-base" />}
          {k.b !== null && <circle cx={X(i)} cy={Y(k.b)} r={k.strong ? 6 : 5} className={k.flag ? 'xp-dot-flag' : 'xp-dot'} />}
          {k.b !== null && cw >= 40 && <text x={X(i)} y={Y(k.b) + (k.a !== null && k.a > k.b ? 20 : -11)} textAnchor="middle" className={`xn-tick xn-small xn-halo${k.flag ? ' xn-flag' : ' xn-strong'}`}>{clock(k.b)}</text>}
          <text x={X(i)} y={H - B + 18} textAnchor="middle" className={`xn-tick${k.strong ? ' xn-strong' : ''}${k.sub?.flag && k.line2 ? ' xn-flag' : ''}`}>{k.line1}</text>
          {k.line2 && <text x={X(i)} y={H - B + 35} textAnchor="middle" className={`xn-tick${k.sub?.flag ? ' xn-flag' : ''}`}>{k.line2}</text>}
          {k.sub && <SubText x={X(i)} y={H - B + (k.line2 ? 51 : 34)} sub={k.sub} narrow={cw < 64} />}
        </g>)}
        {/* 이름은 각 표시의 마지막 점 바로 옆에(오른쪽 여백에 모으면 결석으로 선이 일찍 끝날 때 어느 이름이 어느 표시인지 안 읽힘).
            입실은 마지막 점 오른쪽, 평소는 마지막 평소 막대 위·아래 중 입실 점에서 먼 쪽 */}
        {lastB && (() => { const i = buckets.indexOf(lastB); return <text x={X(i) + (lastB.a !== null ? Math.min(22, cw * 0.32) + 6 : 10)} y={Y(lastB.b!) + 4} className="xn-tick xn-strong xn-halo">{names[1]}</text> })()}
        {lastA && (() => { const i = buckets.indexOf(lastA), ya = Y(lastA.a!), yb = lastA.b !== null ? Y(lastA.b) : null
          const above = yb === null ? true : ya <= yb, sameCol = lastA === lastB
          return <text x={sameCol ? X(i) - 8 : X(i)} y={above ? ya - 9 : ya + 17} textAnchor={sameCol ? 'end' : 'middle'} className="xn-tick xn-halo">{names[0]}</text> })()}
      </svg>
    </div>
  )
}

const hours = (v: number) => `${Math.round(v / 60)}시간`

/** 공부 시간: 일간 = 같은 요일 평소 ↔ 공부, 주간 = 지난 4주 한 주 평균 ↔ 그 주 공부 */
export function StudyPair(props: NotationProps & { period: 'd' | 'w' }) {
  const { s, period } = props
  // 최근 7일 입실한 날이 없으면 빈 판 대신 한 줄 + 최근 5주 그림(그 앞에 어땠는지)
  if (period === 'd' && !s.days.some((d) => d.attendance === 'present')) {
    const off = s.days.filter((d) => d.attendance === 'absent').length, none = s.days.every((d) => d.attendance === 'unknown')
    return <div className="xp-wrap"><p className="xn-empty">{none ? '최근 7일 기록 없음' : `최근 7일 입실한 날 없음${off ? ` · 결석 ${off}일` : ''}`} · 아래는 최근 5주</p><StudyBars {...props} period="w" /></div>
  }
  return <StudyBars {...props} />
}

function StudyBars({ s, th, period }: NotationProps & { period: 'd' | 'w' }) {
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
    // 기록이 하나도 없는 주(연동 누락·등록 전)는 0분이 아니라 값 없음
    const weeks = weeksOf(s), known = weeks.map((wk) => wk.some((d) => d.attendance !== 'unknown'))
    const sum = weeks.map((wk, g) => known[g] ? wk.reduce((a, d) => a + (d.attendance === 'present' && d.minutes ? d.minutes : 0), 0) : null)
    const past = sum.slice(0, 4).filter((v): v is number => v !== null), avg = past.length ? past.reduce((a, b) => a + b, 0) / past.length : null
    buckets = weeks.map((wk, g) => ({ key: wk[0].date, ...weekBucket(wk, g), a: avg, b: sum[g], strong: g === 4, flag: g === 4 && sig && avg !== null && avg > 0 && sum[g] !== null && 100 - (sum[g]! / avg) * 100 >= th.drop, tip: `${g === 4 ? '최근 7일' : `${md(wk[0].date)}–${md(wk[6].date)}`} · ${sum[g] === null ? '기록 없음' : `공부 ${hm(sum[g]!)}`}${avg !== null ? ` · 지난 4주 한 주 평균 ${hm(avg)}` : ''}` }))
  }
  const { top, ticks } = hourTicks(Math.max(60, ...buckets.flatMap((k) => [k.a ?? 0, k.b ?? 0])), 4)
  return <div ref={ref} className="xp-wrap"><PairBars buckets={buckets} top={top} ticks={ticks} unit={hours} refLine={period === 'w'} names={period === 'd' ? ['평소', '공부'] : ['4주 평균', '공부']} label={period === 'd' ? '최근 7일 공부 시간과 같은 요일 평소' : '최근 5주 주별 공부 시간과 지난 4주 한 주 평균'} /></div>
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
  return <div ref={ref} className="xp-wrap"><PairBars buckets={buckets} top={top} ticks={ticks} unit={hours} names={['계획', '실제']} label={period === 'd' ? '최근 7일 날짜별 계획 시간과 실제 시간' : '최근 5주 주별 계획 시간과 실제 시간'} /></div>
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
  return <div ref={ref} className="xp-wrap"><PairLines buckets={buckets} names={period === 'd' ? ['평소', '입실'] : ['평소', '입실']} label={period === 'd' ? '최근 7일 입실 시각과 같은 요일 평소' : '최근 5주 주별 평균 입실 시각과 평소'} /></div>
}

/** 과목별 계획 ↔ 실제(최근 7일, 세로 짝 막대: 날짜별 그림과 같은 꼴) */
export function SubjectPair({ s, th }: NotationProps) {
  const sig = s.signals.some((x) => x.type === 'EXECUTION_GAP' || x.type === 'SUBJECT_SHARE')
  const subs = s.subjects.filter((x) => x.plannedMinutes > 0 || x.actualMinutes > 0).sort((a, b) => b.plannedMinutes - a.plannedMinutes)
  if (!subs.length) return <p className="xn-empty">최근 7일 과목 계획 없음</p>
  const buckets: Bucket[] = subs.map((x) => ({ key: x.name, line1: x.name, a: x.plannedMinutes, b: x.actualMinutes, strong: true, flag: sig && x.plannedMinutes > 0 && (x.actualMinutes / x.plannedMinutes) * 100 < th.rate, tip: `${x.name} · 계획 ${hm(x.plannedMinutes)} · 실제 ${hm(x.actualMinutes)}${x.plannedMinutes ? ` (${Math.floor((x.actualMinutes / x.plannedMinutes) * 100)}%)` : ''}` }))
  const { top, ticks } = hourTicks(Math.max(60, ...buckets.flatMap((k) => [k.a ?? 0, k.b ?? 0])), 4)
  return <div className="xp-wrap"><PairBars buckets={buckets} top={top} ticks={ticks} unit={hours} names={['계획', '실제']} label="최근 7일 과목별 계획 시간과 실제 시간" /></div>
}
