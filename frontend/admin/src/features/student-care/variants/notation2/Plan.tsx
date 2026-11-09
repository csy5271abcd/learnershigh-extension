// 전체 계획 대비 표시법 2차 5종. 계획보다 많이 한 날(100% 초과)이 잘리지 않고, 계획 양 자체가 줄었는지도 보이게 한다. 코드는 그림마다 따로다.
import { useWidth } from '../z/useWidth.ts'
import { md } from '../shared/useCareData.ts'
import { absentRuns, day, hm, hourTicks, STATE, type NotationProps } from '../notation/kit.tsx'

const under = (planned: number, actual: number, rate: number) => planned > 0 && (actual / planned) * 100 < rate

/** C1 묶은 막대(최근 7일): 날짜마다 계획(회색)과 실제(파랑) 두 막대를 나란히. 계획보다 더 한 날은 파랑이 더 높고, 기준만큼 못 한 날은 빨강이다 */
export function PlanPairBars({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const days = s.days
  const { top, ticks } = hourTicks(Math.max(60, ...days.flatMap((d) => [d.planned ?? 0, d.actual ?? 0])), 4)
  // 칸이 좁으면 날짜와 요일을 두 줄로 쓴다
  // 오른쪽 여백(48px)에 '계획'·'실제' 이름을 마지막 묶음의 두 막대 높이에 맞춰 적는다(막대 위 글자가 서로·막대와 겹치지 않게)
  const L = 60, T = 34, RG = 52, cw = (w - L - RG) / 7, bw = Math.min(26, cw * 0.3), two = cw < 70, B = two ? 68 : 52, H = 270 + (two ? 16 : 0)
  const y = (v: number) => T + (1 - v / top) * (H - T - B)
  const last = days.map((d, i) => ((d.planned ?? 0) > 0 && d.actual !== null ? i : -1)).filter((i) => i >= 0).pop() ?? -1
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 7일 계획 시간과 실제 시간">
        {ticks.map((t) => <g key={t}><line x1={L} x2={w - RG} y1={y(t)} y2={y(t)} className="n2-grid" /><text x={L - 10} y={y(t) + 4} textAnchor="end" className="n2-tick">{t / 60}시간</text></g>)}
        {days.map((d, i) => {
          const cx = L + cw * (i + 0.5), plan = d.planned ?? 0, act = d.actual ?? 0, has = plan > 0
          const tip = `${day(d)} · ${has ? `계획 ${hm(plan)} · 실제 ${hm(act)} (${Math.round((act / plan) * 100)}%)` : d.attendance === 'present' ? '계획 없음' : STATE[d.attendance]}`
          return <g key={d.date} tabIndex={0} data-tip={tip} aria-label={tip}>
            {has && <rect x={cx - bw - 2} y={y(plan)} width={bw} height={y(0) - y(plan)} rx={3} className="c1-plan" />}
            {has && d.actual !== null && <rect x={cx + 2} y={y(act)} width={bw} height={Math.max(2, y(0) - y(act))} rx={3} className={under(plan, act, th.rate) ? 'c1-flag' : 'c1-act'} />}
            <text x={cx} y={H - B + 20} textAnchor="middle" className={`n2-tick n2-strong${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{two ? md(d.date) : `${md(d.date)} ${d.dow}`}</text>
            {two && <text x={cx} y={H - B + 36} textAnchor="middle" className={`n2-tick n2-strong${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{d.dow}</text>}
            {!has && <text x={cx} y={H - B + (two ? 54 : 38)} textAnchor="middle" className={`n2-tick${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{d.attendance === 'present' ? '계획 없음' : STATE[d.attendance]}</text>}
          </g>
        })}
        <line x1={L} x2={w - RG} y1={y(0)} y2={y(0)} className="n2-axis" />
        {last >= 0 && (() => {
          let yp = y(days[last].planned!) + 4, ya = y(days[last].actual!) + 4
          if (Math.abs(yp - ya) < 16) { const m = (yp + ya) / 2; yp = m - 8; ya = m + 8 }
          const nx = last === days.length - 1 ? w - RG + 10 : L + cw * (last + 0.5) + bw + 10
          return <><text x={nx} y={yp} className="n2-tick">계획</text><text x={nx} y={ya} className="n2-tick n2-strong c1-name">실제</text></>
        })()}
      </svg>
    </div>
  )
}

/** C2 35일 계획 대비 꺾은선(세로 = %): 굵은 가로선 = 계획만큼(100%), 옅은 빨간 선 = 관리 기준. 100%를 넘은 날도 그대로 위로 올라간다 */
export function PlanRateLine({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const days = s.history35
  const rate = days.map((d) => (d.planned ?? 0) > 0 && d.actual !== null ? (d.actual / d.planned!) * 100 : null)
  const top = Math.max(120, Math.ceil(Math.max(0, ...rate.map((r) => r ?? 0)) / 20) * 20)
  const H = 258, L = 52, R = 76, B = 48, T = 30, cw = (w - L - R) / 35
  const X = (i: number) => L + cw * (i + 0.5), Y = (v: number) => T + (1 - v / top) * (H - T - B)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 계획 대비 실제 비율">
        <text x={L + cw * 31.5} y={18} textAnchor="middle" className="n2-tick n2-strong">{cw >= 20 ? `최근 7일 · ${md(days[28].date)}–${md(days[34].date)}` : `${md(days[28].date)}–${md(days[34].date)}`}</text>
        {Array.from({ length: top / 20 + 1 }, (_, k) => k * 20).filter((v) => v % 40 === 0 || top <= 120).map((v) => <g key={v}><line x1={L} x2={w - R} y1={Y(v)} y2={Y(v)} className="n2-grid" /><text x={L - 10} y={Y(v) + 4} textAnchor="end" className="n2-tick">{v}%</text></g>)}
        <rect x={L + cw * 28} y={T - 4} width={cw * 7} height={H - T - B + 4} className="c2-recent" />
        <line x1={L} x2={w - R} y1={Y(100)} y2={Y(100)} className="c2-full" /><text x={w - R + 6} y={Y(100) + 4} className="n2-tick n2-strong">계획만큼</text>
        <line x1={L} x2={w - R} y1={Y(th.rate)} y2={Y(th.rate)} className="c2-th" /><text x={w - R + 6} y={Y(th.rate) + 4} className="n2-tick n2-flag">관리 기준</text>
        {rate.map((r, i) => i > 0 && r !== null && rate[i - 1] !== null && <line key={`l${i}`} x1={X(i - 1)} x2={X(i)} y1={Y(rate[i - 1]!)} y2={Y(r)} className={i >= 28 ? 'c2-seg-now' : 'c2-seg-old'} />)}
        {days.map((d, i) => {
          const r = rate[i], tip = `${day(d)} · ${r !== null ? `계획 ${hm(d.planned!)} · 실제 ${hm(d.actual!)} (${Math.round(r)}%)` : d.attendance === 'present' ? '계획 없음' : STATE[d.attendance]}`
          return <g key={d.date}>
            {r !== null && <circle cx={X(i)} cy={Y(r)} r={i >= 28 ? 5 : 3} className={r < th.rate ? (i >= 28 ? 'c2-pt-flag' : 'c2-pt-oldflag') : i >= 28 ? 'c2-pt-now' : 'c2-pt-old'} tabIndex={i >= 28 ? 0 : -1} data-tip={tip} aria-label={i >= 28 ? tip : undefined} />}
            {(i >= 28 ? cw >= 20 : d.dow === '월' && (i < 26 || cw >= 20)) && <text x={X(i)} y={H - B + 18} textAnchor="middle" className={`n2-tick${i >= 28 ? ' n2-strong' : ''}${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{i >= 28 ? d.dow : md(d.date)}</text>}
            {d.attendance === 'absent' && <rect x={L + cw * i + cw * 0.15} y={Y(0) - 4} width={cw * 0.7} height={4} rx={2} className="n2-absent" />}
          </g>
        })}
        {/* 날짜 눈금: 날마다 짧은 눈금, 월요일은 긴 눈금. 최근 7일은 날짜(일)를 작게 적는다 */}
        {days.map((d, i) => <line key={`tk${i}`} x1={X(i)} x2={X(i)} y1={Y(0)} y2={Y(0) + (d.dow === '월' ? 7 : 4)} className="n2-daytick" />)}
        {cw >= 14 && cw < 20 && days.slice(28).map((d, k) => <text key={`dn${k}`} x={X((28 + k))} y={Y(0) + 18} textAnchor="middle" className={`n2-tick n2-small${d.attendance === 'absent' ? ' n2-flag' : ''}`}>{Number(d.date.slice(8))}</text>)}
        {cw < 14 && <text x={L + cw * 31.5} y={H - B + 18} textAnchor="middle" className="n2-tick n2-strong">최근 7일</text>}
        {absentRuns(days, 0).map(([a, b]) => <text key={a} x={(X(a) + X(b)) / 2} y={H - B + 36} textAnchor="middle" className="n2-tick n2-flag">결석</text>)}
      </svg>
    </div>
  )
}

/** C3 과목별 가로 막대(최근 7일): 막대 길이 = 그 과목 실제/계획 %, 굵은 세로선 = 100%. 넘으면 선 오른쪽으로 나가고, 기준만큼 못 한 과목은 빨강 */
export function PlanSubjectRate({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const subs = s.subjects.filter((x) => x.plannedMinutes > 0).map((x) => ({ x, r: (x.actualMinutes / x.plannedMinutes) * 100 })).sort((a, b) => a.r - b.r)
  const top = Math.max(120, Math.ceil(Math.max(0, ...subs.map((x) => x.r)) / 20) * 20)
  const L = 72, R = 20, rowH = 34, T = 22, H = T + rowH * Math.max(1, subs.length) + 28
  const X = (v: number) => L + (v / top) * (w - L - R)
  if (!subs.length) return <div ref={ref} className="n2-plot"><p className="n2-empty">최근 7일 과목 계획 없음</p></div>
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="과목별 계획 대비 실제">
        {Array.from({ length: top / 20 + 1 }, (_, k) => k * 20).filter((v) => v % 40 === 0).map((v) => <g key={v}><line x1={X(v)} x2={X(v)} y1={T - 4} y2={H - 24} className="n2-grid" /><text x={X(v)} y={H - 8} textAnchor="middle" className="n2-tick">{v}%</text></g>)}
        {subs.map(({ x, r }, i) => {
          const y0 = T + rowH * i, tip = `${x.name} · 계획 ${hm(x.plannedMinutes)} · 실제 ${hm(x.actualMinutes)} (${Math.round(r)}%)`
          return <g key={x.name} tabIndex={0} data-tip={tip} aria-label={tip}>
            <text x={L - 12} y={y0 + rowH / 2 + 4} textAnchor="end" className="n2-tick n2-strong">{x.name}</text>
            <rect x={L} y={y0 + 7} width={Math.max(2, X(r) - L)} height={rowH - 14} rx={4} className={r < th.rate ? 'c3-flag' : 'c3-bar'} />
          </g>
        })}
        <line x1={X(100)} x2={X(100)} y1={T - 8} y2={H - 24} className="c3-full" />
        <text x={X(100)} y={T - 10} textAnchor="middle" className="n2-tick n2-strong">계획만큼</text>
      </svg>
    </div>
  )
}

/** C4 계획·실제 산점도(35일): 가로 = 그날 계획 시간, 세로 = 실제 시간, 대각선 = 계획만큼. 최근 7일 점이 왼쪽으로 몰리면 계획을 줄인 것, 대각선 아래면 계획보다 덜 한 것이다 */
export function PlanScatter({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const pts = s.history35.map((d, i) => ({ d, i })).filter(({ d }) => (d.planned ?? 0) > 0 && d.actual !== null)
  const { top, ticks } = hourTicks(Math.max(60, ...pts.flatMap(({ d }) => [d.planned!, d.actual!])), 4)
  const H = 300, L = 64, R = 24, T = 28, B = 46
  const side = H - T - B, wide = w - L - R
  const X = (v: number) => L + (v / top) * wide, Y = (v: number) => T + (1 - v / top) * side
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 계획 시간과 실제 시간">
        {ticks.map((t) => <g key={t}>
          <line x1={L} x2={w - R} y1={Y(t)} y2={Y(t)} className="n2-grid" /><text x={L - 10} y={Y(t) + 4} textAnchor="end" className="n2-tick">{t / 60}시간</text>
          <line x1={X(t)} x2={X(t)} y1={T} y2={Y(0)} className="n2-grid" />{t > 0 && <text x={X(t)} y={Y(0) + 18} textAnchor="middle" className="n2-tick">{t / 60}시간</text>}
        </g>)}
        <line x1={X(0)} y1={Y(0)} x2={X(top)} y2={Y(top)} className="c4-diag" />
        <text x={X(top)} y={Y(top) - 8} textAnchor="end" className="n2-tick">계획만큼</text>
        <text x={L - 8} y={T - 12} className="n2-tick n2-strong">↑ 실제</text>
        <text x={w - R} y={Y(0) + 36} textAnchor="end" className="n2-tick n2-strong">계획 →</text>
        {pts.filter(({ i }) => i < 28).map(({ d }) => <circle key={d.date} cx={X(d.planned!)} cy={Y(d.actual!)} r={4} className="c4-old" tabIndex={-1} data-tip={`${day(d)} · 계획 ${hm(d.planned!)} · 실제 ${hm(d.actual!)}`} />)}
        {pts.filter(({ i }) => i >= 28).map(({ d }) => { const tip = `${day(d)} · 계획 ${hm(d.planned!)} · 실제 ${hm(d.actual!)} (${Math.round((d.actual! / d.planned!) * 100)}%)`; return <circle key={d.date} cx={X(d.planned!)} cy={Y(d.actual!)} r={7} className={under(d.planned!, d.actual!, th.rate) ? 'c4-flag' : 'c4-now'} tabIndex={0} data-tip={tip} aria-label={tip} /> })}
      </svg>
    </div>
  )
}

/** C5 과목 구성 두 줄(최근 7일): 위 줄 = 계획의 과목별 몫, 아래 줄 = 실제의 과목별 몫(각각 100%). 줄 길이는 시간에 비례해 아래 줄이 짧으면 전체를 덜 한 것이고, 같은 과목 칸 폭이 위아래로 달라지면 과목 쏠림이다 */
export function PlanComposition({ s }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const subs = s.subjects.filter((x) => x.plannedMinutes > 0 || x.actualMinutes > 0).sort((a, b) => b.plannedMinutes - a.plannedMinutes)
  const plan = subs.reduce((a, x) => a + x.plannedMinutes, 0), act = subs.reduce((a, x) => a + x.actualMinutes, 0)
  const L = 60, R = 16, max = Math.max(plan, act, 1), full = w - L - R
  const H = 150, rowY = [30, 92], rowH = 28
  const row = (key: 'plannedMinutes' | 'actualMinutes', total: number, k: number) => {
    const len = (total / max) * full
    return subs.map((x, i) => {
      const before = subs.slice(0, i).reduce((a, y) => a + y[key], 0)
      const x0 = L + (total ? (before / total) * len : 0), wd = total ? (x[key] / total) * len : 0
      const tip = `${x.name} · ${k === 0 ? '계획' : '실제'} ${hm(x[key])} (${total ? Math.round((x[key] / total) * 100) : 0}%)`
      return wd > 0 && <g key={x.name} tabIndex={0} data-tip={tip} aria-label={tip}>
        <rect x={x0 + 1} y={rowY[k]} width={Math.max(1, wd - 2)} height={rowH} rx={3} className={`c5-${k === 0 ? 'p' : 'a'}${i % 2}`} />
        {wd > 40 && <text x={x0 + wd / 2} y={k === 0 ? rowY[k] - 8 : rowY[k] + rowH + 18} textAnchor="middle" className="n2-tick">{x.name}</text>}
      </g>
    })
  }
  if (!subs.length) return <div ref={ref} className="n2-plot"><p className="n2-empty">최근 7일 과목 계획 없음</p></div>
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label={`과목 구성, 계획 ${hm(plan)} 실제 ${hm(act)}`}>
        <text x={L - 10} y={rowY[0] + rowH / 2 + 4} textAnchor="end" className="n2-tick n2-strong">계획</text>
        <text x={L - 10} y={rowY[1] + rowH / 2 + 4} textAnchor="end" className="n2-tick n2-strong">실제</text>
        {row('plannedMinutes', plan, 0)}
        {row('actualMinutes', act, 1)}
      </svg>
    </div>
  )
}

/** C6 과목별 계획·실제 시간(최근 7일, 나란히 가로 막대): 과목마다 위 회색 = 계획 시간, 아래 = 실제 시간. 모든 과목이 같은 시간 눈금이고
 * 막대 끝에 값을 바로 적는다. 실제가 계획의 관리 기준(%)에 못 미치면 실제 막대를 빨강으로 */
export function PlanSubjectPairs({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const subs = s.subjects.filter((x) => x.plannedMinutes > 0 || x.actualMinutes > 0).sort((a, b) => b.plannedMinutes - a.plannedMinutes)
  if (!subs.length) return <div ref={ref} className="n2-plot"><p className="n2-empty">최근 7일 과목 계획 없음</p></div>
  const { top, ticks } = hourTicks(Math.max(60, ...subs.flatMap((x) => [x.plannedMinutes, x.actualMinutes])), 4)
  const L = 64, R = 132, rowH = 50, T = 6, H = T + rowH * subs.length + 26
  const X = (v: number) => L + (v / top) * (w - L - R)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 7일 과목별 계획 시간과 실제 시간">
        {ticks.map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1={T} y2={H - 22} className="n2-grid" /><text x={X(t)} y={H - 6} textAnchor="middle" className="n2-tick">{t / 60}시간</text></g>)}
        {subs.map((x, i) => {
          const y0 = T + rowH * i, short = x.plannedMinutes > 0 && (x.actualMinutes / x.plannedMinutes) * 100 < th.rate
          const tip = `${x.name} · 계획 ${hm(x.plannedMinutes)} · 실제 ${hm(x.actualMinutes)}`
          return <g key={x.name} tabIndex={0} data-tip={tip} aria-label={tip}>
            <text x={L - 12} y={y0 + rowH / 2 + 2} textAnchor="end" className="n2-tick n2-strong">{x.name}</text>
            <rect x={L} y={y0 + 6} width={Math.max(x.plannedMinutes ? 2 : 0, X(x.plannedMinutes) - L)} height={15} rx={3} className="c1-plan" />
            <text x={X(x.plannedMinutes) + 8} y={y0 + 18} className="n2-tick">계획 {hm(x.plannedMinutes)}</text>
            <rect x={L} y={y0 + 25} width={Math.max(x.actualMinutes ? 2 : 0, X(x.actualMinutes) - L)} height={15} rx={3} className={short ? 'c1-flag' : 'c1-act'} />
            <text x={X(x.actualMinutes) + 8} y={y0 + 37} className={`n2-tick n2-strong${short ? ' n2-flag' : ''}`}>실제 {hm(x.actualMinutes)}</text>
          </g>
        })}
        <line x1={L} x2={L} y1={T} y2={H - 22} className="n2-axis" />
      </svg>
    </div>
  )
}

/** C7 주별 계획 대비 실제(5주 세로 막대, %): 주마다 그 주 실제 합 ÷ 계획 합. 막대 위에 %, 굵은 가로선 = 계획만큼(100%).
 * 관리 기준보다 낮은 주는 빨강, 마지막(최근 7일)만 진하게. 35일 점보다 칸이 좁은 자리에서 흐름을 읽게 한다 */
export function PlanWeekCols({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const weeks = Array.from({ length: 5 }, (_, g) => s.history35.slice(g * 7, g * 7 + 7))
  const rate = weeks.map((wk) => { const p = wk.reduce((a, d) => a + (d.planned ?? 0), 0), a = wk.reduce((x, d) => x + (d.planned ? d.actual ?? 0 : 0), 0); return p > 0 ? { r: (a / p) * 100, p, a } : null })
  const top = Math.max(120, Math.ceil(Math.max(0, ...rate.map((x) => x?.r ?? 0)) / 20) * 20)
  const H = 250, L = 48, R = 70, T = 26, B = 32, cw = (w - L - R) / 5, bw = Math.min(46, cw * 0.5)
  const Y = (v: number) => T + (1 - v / top) * (H - T - B)
  return (
    <div ref={ref} className="n2-plot">
      <svg width={w} height={H} role="img" aria-label="최근 5주 주별 계획 대비 실제">
        {[0, 50, 100].map((v) => <g key={v}><line x1={L} x2={w - R} y1={Y(v)} y2={Y(v)} className="n2-grid" /><text x={L - 8} y={Y(v) + 4} textAnchor="end" className="n2-tick">{v}%</text></g>)}
        <line x1={L} x2={w - R} y1={Y(100)} y2={Y(100)} className="c2-full" /><text x={w - R + 6} y={Y(100) + 4} className="n2-tick n2-strong">계획만큼</text>
        {weeks.map((wk, g) => {
          const x = rate[g], cx = L + cw * (g + 0.5), recent = g === 4, under = x !== null && x.r < th.rate
          const tip = `${recent ? '최근 7일' : `${md(wk[0].date)}–${md(wk[6].date)}`} · ${x ? `계획 ${hm(x.p)} · 실제 ${hm(x.a)} (${Math.round(x.r)}%)` : '계획 없음'}`
          return <g key={g} tabIndex={0} data-tip={tip} aria-label={tip}>
            {x && <rect x={cx - bw / 2} y={Y(Math.min(x.r, top))} width={bw} height={Math.max(2, Y(0) - Y(Math.min(x.r, top)))} rx={4} className={under ? 'a7-flag' : recent ? 'a7-now' : 'a7-old'} />}
            {/* 값은 막대 안 위쪽에 흰 글자로(기준선과 겹치지 않게). 막대가 낮아 글자가 안 들어가면 막대 위에 */}
            {(() => { const yt = x ? Y(Math.min(x.r, top)) : Y(0), inside = x !== null && Y(0) - yt >= 30
              return <text x={cx} y={inside ? yt + 18 : yt - 7} textAnchor="middle" className={inside ? (recent || under ? 'n2-tick n2-inbar' : 'n2-tick n2-inbar n2-inbar-old') : `n2-tick${recent ? ' n2-strong' : ''}${under ? ' n2-flag' : ''}`}>{x ? `${Math.round(x.r)}%` : '계획 없음'}</text> })()}
            <text x={cx} y={H - B + 18} textAnchor="middle" className={`n2-tick${recent ? ' n2-strong' : ''}`}>{recent ? '최근 7일' : `${md(wk[0].date)}~`}</text>
          </g>
        })}
        <line x1={L} x2={w - R} y1={Y(0)} y2={Y(0)} className="n2-axis" />
      </svg>
    </div>
  )
}
