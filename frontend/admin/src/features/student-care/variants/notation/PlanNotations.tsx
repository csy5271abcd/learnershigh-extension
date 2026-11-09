// 전체 계획 대비 표시법 5종. 과목별 주간 계획·실제(review.subjects)와 날짜별 계획·실제(35일)를 쓴다. 각 그림은 서로 다른 패턴이다.
import { useWidth } from '../z/useWidth.ts'
import { md } from '../shared/useCareData.ts'
import { absentRuns, day, hm, hourTicks, STATE, type NotationProps } from './kit.tsx'

const subjectsOf = (p: NotationProps) => p.s.subjects.filter((x) => x.plannedMinutes > 0 || x.actualMinutes > 0).sort((a, b) => b.plannedMinutes - a.plannedMinutes)
const short = (r: number, rate: number) => r * 100 < rate

/** P1 과목 흐름: 왼쪽 기둥 = 과목별 계획 시간, 오른쪽 기둥 = 과목별 실제 시간, 같은 과목을 띠로 잇는다. 띠가 가늘어지면 계획보다 덜 한 과목, 굵어지면 더 한 과목. 두 기둥 높이 차이가 전체 계획 대비다 */
export function PlanFlow(p: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const subs = subjectsOf(p)
  const plan = subs.reduce((a, x) => a + x.plannedMinutes, 0), act = subs.reduce((a, x) => a + x.actualMinutes, 0)
  const H = 280, top = 26, gap = 6, usable = H - top - 12 - gap * Math.max(0, subs.length - 1)
  const scale = usable / Math.max(plan, act, 1)
  const xl = 150, xr = w - 150, bw = 18
  const before = (i: number, key: 'plannedMinutes' | 'actualMinutes') => top + subs.slice(0, i).reduce((a, x) => a + x[key] * scale + gap, 0)
  const bands = subs.map((x, i) => ({ x, l0: before(i, 'plannedMinutes'), l1: before(i, 'plannedMinutes') + x.plannedMinutes * scale, r0: before(i, 'actualMinutes'), r1: before(i, 'actualMinutes') + x.actualMinutes * scale }))
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label={`최근 7일 계획 ${hm(plan)}, 실제 ${hm(act)}`}>
        <text x={xl + bw / 2} y={14} textAnchor="middle" className="nt-axis nt-axis-strong">계획</text>
        <text x={xr + bw / 2} y={14} textAnchor="middle" className="nt-axis nt-axis-strong">실제</text>
        {bands.map((b) => {
          const r = b.x.plannedMinutes ? b.x.actualMinutes / b.x.plannedMinutes : 1
          const tip = `${b.x.name} · 계획 ${hm(b.x.plannedMinutes)} · 실제 ${hm(b.x.actualMinutes)}${b.x.plannedMinutes ? ` (${Math.round(r * 100)}%)` : ''}`
          const c = (xl + bw + xr) / 2
          return (
            <g key={b.x.name} tabIndex={0} data-tip={tip} aria-label={tip}>
              <path d={`M${xl + bw},${b.l0} C${c},${b.l0} ${c},${b.r0} ${xr},${b.r0} L${xr},${b.r1} C${c},${b.r1} ${c},${b.l1} ${xl + bw},${b.l1} Z`} className={short(r, p.th.rate) ? 'p1-band-flag' : 'p1-band'} />
              <rect x={xl} y={b.l0} width={bw} height={Math.max(1, b.l1 - b.l0)} className="p1-node" />
              <rect x={xr} y={b.r0} width={bw} height={Math.max(1, b.r1 - b.r0)} className="p1-node" />
              <text x={xl - 8} y={(b.l0 + b.l1) / 2 + 4} textAnchor="end" className="nt-axis">{b.x.name}</text>
              <text x={xr + bw + 8} y={(b.r0 + b.r1) / 2 + 4} className="nt-axis">{b.x.name}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** P2 계획 면적 안의 실제 면적: 과목마다 사각형 하나(넓이 = 계획 시간), 그 안에 같은 비율로 줄인 사각형(넓이 = 실제 시간). 실제가 계획보다 크면 안쪽 사각형이 바깥을 뚫고 나온다 */
export function PlanAreaTiles(p: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const subs = subjectsOf(p)
  const H = 240, total = subs.reduce((a, x) => a + Math.max(x.plannedMinutes, x.actualMinutes), 0) || 1
  // 한 줄 띠 배치(넓이 순). 사각형 높이는 같고 폭이 계획 시간에 비례한다
  const widthOf = (x: (typeof subs)[number]) => (Math.max(x.plannedMinutes, x.actualMinutes) / total) * (w - subs.length * 8)
  const tiles = subs.map((x, i) => ({ x, x0: subs.slice(0, i).reduce((a, y) => a + widthOf(y) + 8, 0), width: widthOf(x) }))
  const side = H - 40
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="과목별 계획 넓이 안의 실제 넓이">
        {tiles.map((t) => {
          const outerW = (t.x.plannedMinutes / Math.max(t.x.plannedMinutes, t.x.actualMinutes, 1)) * t.width
          const k = t.x.plannedMinutes ? Math.sqrt(t.x.actualMinutes / t.x.plannedMinutes) : 1
          const innerW = outerW * k, innerH = side * k
          const r = t.x.plannedMinutes ? t.x.actualMinutes / t.x.plannedMinutes : 1
          const tip = `${t.x.name} · 계획 ${hm(t.x.plannedMinutes)} · 실제 ${hm(t.x.actualMinutes)}${t.x.plannedMinutes ? ` (${Math.round(r * 100)}%)` : ''}`
          return (
            <g key={t.x.name} tabIndex={0} data-tip={tip} aria-label={tip}>
              <rect x={t.x0} y={H - 24 - side} width={Math.max(1, outerW)} height={side} className="p2-plan" />
              <rect x={t.x0} y={H - 24 - innerH} width={Math.max(1, innerW)} height={innerH} className={short(r, p.th.rate) ? 'p2-act-flag' : 'p2-act'} />
              <text x={t.x0} y={H - 6} className="nt-axis">{t.x.name}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** P3 과목 방사형: 과목마다 축 하나, 바깥 고리 = 계획의 100%, 진한 면 = 실제/계획. 100%를 넘으면 고리 밖으로, 덜 했으면 안으로 들어간 꼭짓점이 과목을 가리킨다 */
export function PlanRadar(p: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const subs = subjectsOf(p).filter((x) => x.plannedMinutes > 0)
  const H = 340, cx = w / 2, cy = H / 2 + 4, R = Math.min(w / 2 - 90, H / 2 - 36)
  const maxR = Math.max(1.25, ...subs.map((x) => x.actualMinutes / x.plannedMinutes))
  const n = Math.max(3, subs.length)
  const at = (i: number, v: number) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; const r = (v / maxR) * R; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] }
  const ring = (v: number) => Array.from({ length: n }, (_, i) => at(i, v).join(',')).join(' ')
  const poly = subs.map((x, i) => at(i, x.actualMinutes / x.plannedMinutes).join(',')).join(' ')
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="과목별 계획 대비 실제 방사형">
        <polygon points={ring(0.5)} className="p3-ring-soft" />
        <polygon points={ring(1)} className="p3-ring" />
        {subs.map((x, i) => { const [ex, ey] = at(i, maxR); const [lx, ly] = at(i, maxR * 1.12); return <g key={x.name}><line x1={cx} y1={cy} x2={ex} y2={ey} className="nt-grid" /><text x={lx} y={ly + 4} textAnchor={Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end'} className="nt-axis">{x.name}</text></g> })}
        {subs.length >= 3 && <polygon points={poly} className="p3-area" />}
        {subs.map((x, i) => { const r = x.actualMinutes / x.plannedMinutes; const [px, py] = at(i, r); const tip = `${x.name} · 계획 ${hm(x.plannedMinutes)} · 실제 ${hm(x.actualMinutes)} (${Math.round(r * 100)}%)`; return <circle key={x.name} cx={px} cy={py} r={5} className={short(r, p.th.rate) ? 'p3-pt-flag' : 'p3-pt'} tabIndex={0} data-tip={tip} aria-label={tip} /> })}
        <text x={at(0, 1)[0] + 14} y={at(0, 1)[1] + 14} className="nt-axis">계획만큼</text>
      </svg>
    </div>
  )
}

/** P4 계획 그림자 위 실제: 35일 날짜 순서. 연한 면 = 그날 계획 시간, 진한 면 = 실제 공부 시간. 그림자가 낮아지면 계획을 줄인 것, 진한 면이 그림자를 넘으면 계획보다 더 한 날 */
export function PlanShadow(p: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const days = p.s.history35
  const { top, ticks } = hourTicks(Math.max(60, ...days.map((d) => Math.max(d.planned ?? 0, d.actual ?? 0))), 3)
  const H = 220, left = 56, padT = 10, bot = H - 50
  const cw = (w - left - 8) / days.length
  const narrow = cw < 22
  const X = (i: number) => left + cw * i, Y = (v: number) => padT + (1 - v / top) * (bot - padT)
  const step = (key: 'planned' | 'actual') => days.map((d, i) => `${i ? 'L' : 'M'}${X(i)},${Y(d[key] ?? 0)} L${X(i + 1)},${Y(d[key] ?? 0)}`).join(' ') + ` L${X(days.length)},${Y(0)} L${X(0)},${Y(0)} Z`
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 계획 시간과 실제 시간">
        {ticks.map((t) => <g key={t}><line x1={left} x2={w - 8} y1={Y(t)} y2={Y(t)} className="nt-grid" /><text x={left - 8} y={Y(t) + 4} textAnchor="end" className="nt-axis">{t / 60}시간</text></g>)}
        <path d={step('planned')} className="p4-plan" />
        <path d={step('actual')} className="p4-act" />
        {days.map((d, i) => {
          const r = d.planned ? (d.actual ?? 0) / d.planned : null
          const tip = `${day(d)} · ${d.planned ? `계획 ${hm(d.planned)} · 실제 ${hm(d.actual ?? 0)} (${Math.round(r! * 100)}%)` : d.attendance === 'present' ? '계획 없음' : STATE[d.attendance]}`
          return <g key={d.date}>
            <rect x={X(i)} y={padT} width={cw} height={bot - padT} className="nt-hit" tabIndex={i >= 28 ? 0 : -1} data-tip={tip} aria-label={i >= 28 ? tip : undefined} />
            {r !== null && short(r, p.th.rate) && <rect x={X(i) + 1} y={bot + 4} width={cw - 2} height={5} rx={2} className="p4-short" />}
            {((d.dow === '월' && (!narrow || i < 26)) || (i >= 28 && !narrow)) && <text x={X(i) + cw / 2} y={H - 22} textAnchor="middle" className={`nt-axis${i >= 28 && d.attendance === 'absent' ? ' nt-axis-flag' : ''}`}>{i >= 28 ? d.dow : md(d.date)}</text>}
            {i >= 28 && !narrow && <text x={X(i) + cw / 2} y={H - 6} textAnchor="middle" className={`nt-axis${d.attendance === 'absent' ? ' nt-axis-flag' : ''}`}>{d.attendance === 'absent' ? '' : Number(d.date.slice(8))}</text>}
          </g>
        })}
        {absentRuns(days).map(([a, b]) => <text key={a} x={(X(a) + X(b + 1)) / 2} y={H - 6} textAnchor="middle" className="nt-axis nt-axis-flag">결석</text>)}
        {narrow && <text x={(X(28) + X(35)) / 2} y={H - 22} textAnchor="middle" className="nt-axis nt-axis-strong">최근 7일</text>}
        <line x1={X(28)} x2={X(28)} y1={padT} y2={bot} className="p4-split" />
      </svg>
    </div>
  )
}

/** P5 계획·실제 마주 보기: 가운데 과목 이름, 왼쪽으로 계획 시간, 오른쪽으로 실제 시간을 같은 눈금으로 뻗는다. 양쪽 길이가 다르면 그 과목에서 어긋났고, 오른쪽이 길면 계획보다 더 했다 */
export function PlanMirror(p: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const subs = subjectsOf(p)
  const { top, ticks } = hourTicks(Math.max(60, ...subs.map((x) => Math.max(x.plannedMinutes, x.actualMinutes))), 3)
  const mid = w / 2, label = 44, half = mid - label - 12, rowH = 30, H = subs.length * rowH + 40
  const L = (v: number) => mid - label - (v / top) * half, R = (v: number) => mid + label + (v / top) * half
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="과목별 계획 시간과 실제 시간 마주 보기">
        <text x={mid - label - 4} y={14} textAnchor="end" className="nt-axis nt-axis-strong">계획</text>
        <text x={mid + label + 4} y={14} className="nt-axis nt-axis-strong">실제</text>
        {ticks.map((t) => <g key={t}><line x1={L(t)} x2={L(t)} y1={22} y2={H - 18} className="nt-grid" /><line x1={R(t)} x2={R(t)} y1={22} y2={H - 18} className="nt-grid" /><text x={L(t)} y={H - 4} textAnchor="middle" className="nt-axis">{t / 60}시간</text><text x={R(t)} y={H - 4} textAnchor="middle" className="nt-axis">{t / 60}시간</text></g>)}
        {subs.map((x, i) => {
          const y0 = 26 + i * rowH, r = x.plannedMinutes ? x.actualMinutes / x.plannedMinutes : 1
          const tip = `${x.name} · 계획 ${hm(x.plannedMinutes)} · 실제 ${hm(x.actualMinutes)}${x.plannedMinutes ? ` (${Math.round(r * 100)}%)` : ''}`
          return <g key={x.name} tabIndex={0} data-tip={tip} aria-label={tip}>
            <rect x={L(x.plannedMinutes)} y={y0} width={mid - label - L(x.plannedMinutes)} height={rowH - 10} className="p5-plan" />
            <rect x={mid + label} y={y0} width={R(x.actualMinutes) - mid - label} height={rowH - 10} className={short(r, p.th.rate) ? 'p5-act-flag' : 'p5-act'} />
            <text x={mid} y={y0 + rowH / 2} textAnchor="middle" className="nt-axis nt-axis-strong">{x.name}</text>
          </g>
        })}
      </svg>
    </div>
  )
}
