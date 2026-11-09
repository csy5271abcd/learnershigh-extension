// 공부 시간 표시법 5종. 각 그림은 서로 다른 패턴이고 코드도 따로다(notation-gate.md 2-2).
import { useWidth } from '../z/useWidth.ts'
import { md } from '../shared/useCareData.ts'
import { day, dropDay, hm, hourTicks, STATE, weeksOf, type NotationProps } from './kit.tsx'

/** S1 폭포: 평소 한 주(같은 요일 평소의 합)에서 날짜마다 늘고 준 만큼을 계단으로 쌓아 이번 주에 닿는다. 어느 날이 얼마를 깎았는지가 계단 높이다 */
export function StudyWaterfall({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const days = s.days
  const usualWeek = days.reduce((a, d) => a + (d.usualMinutes ?? 0), 0)
  const steps = days.map((d) => ({ d, delta: (d.attendance === 'present' ? d.minutes ?? 0 : 0) - (d.usualMinutes ?? 0) }))
  const thisWeek = usualWeek + steps.reduce((a, x) => a + x.delta, 0)
  const levels = steps.map((x, i) => { const from = usualWeek + steps.slice(0, i).reduce((a, y) => a + y.delta, 0); return { ...x, from, to: from + x.delta } })
  const peak = Math.max(usualWeek, thisWeek, ...levels.map((l) => Math.max(l.from, l.to)))
  const { top, ticks } = hourTicks(peak, 4)
  const H = 230, padL = 52, padB = 46, padT = 10, cols = 9, cw = (w - padL - 8) / cols, bw = Math.min(56, cw * 0.62)
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB)
  const x = (i: number) => padL + cw * i + (cw - bw) / 2
  const dropWeek = usualWeek > 0 && 100 - (thisWeek / usualWeek) * 100 >= th.drop
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label={`평소 한 주 ${hm(usualWeek)}에서 이번 주 ${hm(thisWeek)}`}>
        {ticks.map((t) => <g key={t}><line x1={padL} x2={w - 8} y1={y(t)} y2={y(t)} className="nt-grid" /><text x={padL - 8} y={y(t) + 4} textAnchor="end" className="nt-axis">{t / 60}시간</text></g>)}
        <rect x={x(0)} y={y(usualWeek)} width={bw} height={y(0) - y(usualWeek)} className="s1-total" tabIndex={0} data-tip={`같은 요일 평소의 합 ${hm(usualWeek)}`} />
        <text x={x(0) + bw / 2} y={H - padB + 18} textAnchor="middle" className="nt-axis">평소 한 주</text>
        {levels.map((l, i) => {
          const hi = Math.max(l.from, l.to), lo = Math.min(l.from, l.to), absent = l.d.attendance !== 'present'
          const tip = `${day(l.d)} · ${absent ? STATE[l.d.attendance] : `공부 ${hm(l.d.minutes ?? 0)}`}${l.d.usualMinutes ? ` · 같은 요일 평소 ${hm(l.d.usualMinutes)}` : ''} · ${l.delta >= 0 ? '+' : '−'}${hm(l.delta)}`
          return (
            <g key={l.d.date}>
              <line x1={x(i) + bw} x2={x(i + 1)} y1={y(l.from)} y2={y(l.from)} className="s1-link" />
              <rect x={x(i + 1)} y={y(hi)} width={bw} height={Math.max(1.5, y(lo) - y(hi))} className={l.delta < 0 ? 's1-down' : 's1-up'} tabIndex={0} data-tip={tip} aria-label={tip} />
              <text x={x(i + 1) + bw / 2} y={H - padB + 18} textAnchor="middle" className={`nt-axis${l.d.attendance === 'absent' ? ' nt-axis-flag' : ''}`}>{md(l.d.date)}</text>
              <text x={x(i + 1) + bw / 2} y={H - padB + 34} textAnchor="middle" className={`nt-axis${l.d.attendance === 'absent' ? ' nt-axis-flag' : ''}`}>{l.d.attendance === 'absent' ? '결석' : l.d.dow}</text>
            </g>
          )
        })}
        <line x1={x(7) + bw} x2={x(8)} y1={y(thisWeek)} y2={y(thisWeek)} className="s1-link" />
        <rect x={x(8)} y={y(thisWeek)} width={bw} height={y(0) - y(thisWeek)} className={dropWeek ? 's1-week-flag' : 's1-week'} tabIndex={0} data-tip={`이번 주 ${hm(thisWeek)} · 평소의 ${usualWeek ? Math.round((thisWeek / usualWeek) * 100) : 0}%`} />
        <text x={x(8) + bw / 2} y={H - padB + 18} textAnchor="middle" className="nt-axis nt-axis-strong">이번 주</text>
      </svg>
    </div>
  )
}

/** S2 학습관 산점도: 가로 = 그 학생의 평소 하루, 세로 = 이번 주 하루. 대각선 위는 평소만큼, 그 아래 띠는 감소 기준을 넘은 영역. 150명 회색 점 위에 이 학생 */
export function StudyPeerScatter({ s, rows, th, onStudent }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const point = (r: typeof s) => {
    const pres = r.days.filter((d) => d.attendance === 'present' && d.minutes !== null)
    const usual = r.days.filter((d) => d.usualMinutes !== null).map((d) => d.usualMinutes!)
    if (!usual.length) return null
    const u = usual.reduce((a, b) => a + b, 0) / usual.length
    const c = r.days.filter((d) => d.usualMinutes !== null).reduce((a, d) => a + (d.attendance === 'present' ? d.minutes ?? 0 : 0), 0) / usual.length
    return { r, u, c, n: pres.length }
  }
  const pts = rows.map(point).filter((p): p is NonNullable<typeof p> => p !== null)
  const me = point(s)
  const { top, ticks } = hourTicks(Math.max(...pts.map((p) => Math.max(p.u, p.c)), 60), 4)
  const H = 330, pad = { l: 64, r: 24, t: 28, b: 46 }
  const side = H - pad.t - pad.b, wide = w - pad.l - pad.r
  const X = (v: number) => pad.l + (v / top) * wide, Y = (v: number) => pad.t + (1 - v / top) * side
  const k = 1 - th.drop / 100
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="학습관 학생의 평소 하루와 이번 주 하루">
        <polygon points={`${X(0)},${Y(0)} ${X(top)},${Y(0)} ${X(top)},${Y(top * k)}`} className="s2-zone" />
        {ticks.map((t) => <g key={t}>
          <line x1={X(0)} x2={X(top)} y1={Y(t)} y2={Y(t)} className="nt-grid" /><text x={X(0) - 8} y={Y(t) + 4} textAnchor="end" className="nt-axis">{t / 60}시간</text>
          <line x1={X(t)} x2={X(t)} y1={Y(0)} y2={Y(top)} className="nt-grid" />{t > 0 && <text x={X(t)} y={Y(0) + 18} textAnchor="middle" className="nt-axis">{t / 60}시간</text>}
        </g>)}
        <line x1={X(0)} y1={Y(0)} x2={X(top)} y2={Y(top)} className="s2-diag" />
        <text x={X(top)} y={Y(0) + 38} textAnchor="end" className="nt-axis nt-axis-strong">평소 하루 →</text>
        <text x={pad.l - 8} y={pad.t - 12} textAnchor="start" className="nt-axis nt-axis-strong">↑ 이번 주 하루</text>
        {pts.filter((p) => p.r !== s).map((p) => <circle key={p.r.student.studentId} cx={X(p.u)} cy={Y(p.c)} r={onStudent ? 4 : 3.2} className={`s2-peer${onStudent ? ' s2-peer-click' : ''}`} tabIndex={-1} data-tip={`${p.r.student.studentName} · 평소 ${hm(p.u)} · 이번 주 ${hm(p.c)}`} onClick={onStudent ? () => onStudent(p.r) : undefined} />)}
        {me && <g tabIndex={0} data-tip={`${s.student.studentName} · 평소 하루 ${hm(me.u)} · 이번 주 하루 ${hm(me.c)} (${Math.round((me.c / me.u) * 100)}%)`}>
          <circle cx={X(me.u)} cy={Y(me.c)} r={8} className={me.c <= me.u * k ? 's2-me-flag' : 's2-me'} />
        </g>}
        <text x={X(top * 0.92) - 8} y={Y(top * 0.92)} textAnchor="end" className="nt-axis">평소만큼</text>
      </svg>
    </div>
  )
}

/** S3 개인 분포: 35일 하루 공부 시간을 1시간 칸에 하루 한 개씩 쌓는다. 회색 = 이전 28일, 색 = 최근 7일(기준 넘게 준 날은 빨강). 결석은 왼쪽 따로 */
export function StudyUnitHistogram({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const all = s.history35.map((d, i) => ({ d, recent: i >= 28 }))
  const present = all.filter((x) => x.d.attendance === 'present' && x.d.minutes !== null)
  const absent = all.filter((x) => x.d.attendance === 'absent')
  const hours = Math.max(4, Math.ceil(Math.max(...present.map((x) => x.d.minutes!), 60) / 60))
  const binMin = hours <= 6 ? 30 : 60, nb = (hours * 60) / binMin
  const bins = Array.from({ length: nb }, (_, h) => present.filter((x) => Math.min(nb - 1, Math.floor(x.d.minutes! / binMin)) === h).sort((a, b) => Number(a.recent) - Number(b.recent)))
  const unit = 8, gap = 2, H = 44 + Math.max(absent.length, ...bins.map((b) => b.length), 6) * (unit + gap)
  const left = 64, cw = (w - left - 12) / nb, bw = Math.min(40, cw - 6)
  const cell = (x: (typeof all)[number], cx: number, k: number, key: string) => {
    const flag = x.recent && (x.d.attendance === 'absent' || dropDay(x.d, th.drop))
    const tip = `${day(x.d)} · ${x.d.attendance === 'present' ? `공부 ${hm(x.d.minutes ?? 0)}` : STATE[x.d.attendance]}${x.d.usualMinutes ? ` · 평소 ${hm(x.d.usualMinutes)}` : ''}`
    return <rect key={key} x={cx - bw / 2} y={H - 32 - (k + 1) * (unit + gap)} width={bw} height={unit} rx={2} className={!x.recent ? 's3-old' : flag ? 's3-flag' : 's3-new'} tabIndex={x.recent ? 0 : -1} data-tip={tip} aria-label={x.recent ? tip : undefined} />
  }
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 하루 공부 시간 분포">
        <line x1={left - 8} x2={w - 8} y1={H - 30} y2={H - 30} className="nt-base" />
        {absent.map((x, k) => cell(x, 24, k, x.d.date))}
        {absent.length > 0 && <text x={24} y={H - 12} textAnchor="middle" className="nt-axis nt-axis-flag">결석</text>}
        {bins.map((b, h) => b.map((x, k) => cell(x, left + cw * h + cw / 2, k, x.d.date)))}
        {Array.from({ length: nb + 1 }, (_, h) => (h * binMin) % (hours > 8 ? 120 : 60) === 0 && <text key={h} x={left + cw * h} y={H - 12} textAnchor="middle" className="nt-axis">{(h * binMin) / 60}시간</text>)}
      </svg>
    </div>
  )
}

/** S4 주별 쌓기: 5주를 기둥 다섯으로, 기둥 안을 날짜 조각으로 쌓는다(조각 높이 = 그날 공부 시간, 같은 요일은 같은 순서). 결석한 날은 조각이 없어 기둥이 낮아진다 */
export function StudyWeekStacks({ s }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const weeks = weeksOf(s)
  const totals = weeks.map((wk) => wk.reduce((a, d) => a + (d.attendance === 'present' ? d.minutes ?? 0 : 0), 0))
  const { top, ticks } = hourTicks(Math.max(...totals, 60), 4)
  const H = 260, padL = 56, padB = 40, padT = 10, cw = (w - padL - 8) / 5, bw = Math.min(96, cw * 0.56)
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB)
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="최근 5주 주별 공부 시간">
        {ticks.map((t) => <g key={t}><line x1={padL} x2={w - 8} y1={y(t)} y2={y(t)} className="nt-grid" /><text x={padL - 8} y={y(t) + 4} textAnchor="end" className="nt-axis">{t / 60}시간</text></g>)}
        {weeks.map((wk, i) => {
          const cx = padL + cw * i + (cw - bw) / 2
          let acc = 0
          return (
            <g key={i}>
              {wk.map((d) => {
                const m = d.attendance === 'present' ? d.minutes ?? 0 : 0
                const y0 = y(acc), y1 = y(acc + m)
                acc += m
                const tip = `${day(d)} · ${d.attendance === 'present' ? `공부 ${hm(m)}` : STATE[d.attendance]}`
                return m > 0 ? <rect key={d.date} x={cx} y={y1} width={bw} height={Math.max(0, y0 - y1 - 1)} className={i === 4 ? 's4-now' : 's4-past'} tabIndex={i === 4 ? 0 : -1} data-tip={tip} aria-label={i === 4 ? tip : undefined} /> : null
              })}
              <text x={cx + bw / 2} y={H - padB + 18} textAnchor="middle" className={`nt-axis${i === 4 ? ' nt-axis-strong' : ''}`}>{i === 4 ? '최근 7일' : `${md(wk[0].date)}~`}</text>
              <rect x={cx - 2} y={y(totals[i]) - 2} width={bw + 4} height={2} className="s4-cap" tabIndex={0} data-tip={`${md(wk[0].date)}~${md(wk[6].date)} 합계 ${hm(totals[i])}`} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** S5 누적 계단: 월~일 누적 공부 시간. 굵은 계단 = 최근 7일, 가는 회색 계단 넷 = 그 전 4주 같은 요일 순서의 누적. 이번 주가 회색 다발 아래로 벗어난 날이 밀리기 시작한 날이다 */
export function StudyCumulative({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const weeks = weeksOf(s)
  const cum = weeks.map((wk) => { let a = 0; return wk.map((d) => (a += d.attendance === 'present' ? d.minutes ?? 0 : 0)) })
  const { top, ticks } = hourTicks(Math.max(...cum.map((c) => c[6]), 60), 4)
  const H = 250, padL = 56, padB = 40, padT = 12, cw = (w - padL - 16) / 7
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB)
  const path = (c: number[]) => `M${padL},${y(0)} ` + c.map((v, i) => `V${y(v)} H${padL + cw * (i + 1)}`).join(' ')
  const usualEnd = cum.slice(0, 4).reduce((a, c) => a + c[6], 0) / 4
  const flag = usualEnd > 0 && 100 - (cum[4][6] / usualEnd) * 100 >= th.drop
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="최근 7일 누적 공부 시간과 그 전 4주">
        {ticks.map((t) => <g key={t}><line x1={padL} x2={w - 16} y1={y(t)} y2={y(t)} className="nt-grid" /><text x={padL - 8} y={y(t) + 4} textAnchor="end" className="nt-axis">{t / 60}시간</text></g>)}
        {cum.slice(0, 4).map((c, i) => <path key={i} d={path(c)} className="s5-past" />)}
        <path d={path(cum[4])} className={flag ? 's5-now-flag' : 's5-now'} />
        {s.days.map((d, i) => {
          const tip = `${day(d)}까지 ${hm(cum[4][i])} · 그 전 4주 같은 순서 ${cum.slice(0, 4).map((c) => hm(c[i])).join(' / ')}`
          return <g key={d.date}>
            <rect x={padL + cw * i} y={padT} width={cw} height={H - padT - padB} className="nt-hit" tabIndex={0} data-tip={tip} aria-label={tip} />
            <text x={padL + cw * (i + 0.5)} y={H - padB + 18} textAnchor="middle" className={`nt-axis${d.attendance === 'absent' ? ' nt-axis-flag' : ''}`}>{md(d.date)} {d.dow}</text>
          </g>
        })}
      </svg>
    </div>
  )
}
