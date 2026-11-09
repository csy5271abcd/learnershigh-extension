// 입실 시각 표시법 5종. 각 그림은 서로 다른 패턴이고 코드도 따로다(notation-gate.md 2-2).
import { useWidth } from '../z/useWidth.ts'
import { md } from '../shared/useCareData.ts'
import { eventDate, eventSeconds, eventStartMinute, SUP_LABEL } from '../supervisor/supervisorClient.ts'
import { absentRuns, clock, clockDomain, clockTick, day, hm, lateDay, sameWeekdayMean, STATE, type NotationProps } from './kit.tsx'

const hourMarks = ([lo, hi]: [number, number], every = 60) => Array.from({ length: Math.floor((hi - lo) / every) + 1 }, (_, i) => lo + i * every)

/** T1 하루 시간표: 날짜마다 한 줄, 가로는 하루 시각. 막대는 입실 시각에서 시작해 그날 공부한 길이만큼, 막대 안의 빈 틈은 사진 인식이 비몰입으로 본 구간. 세로 홈은 같은 요일 평소 입실 */
export function StartTimetable({ s, ev, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const days = s.days
  const vals = days.flatMap((d) => d.start === null ? (d.usualStart === null ? [] : [d.usualStart]) : [d.start, d.start + (d.minutes ?? 0), ...(d.usualStart === null ? [] : [d.usualStart])])
  const dom = clockDomain(vals, 20)
  const left = 92, rowH = 30, H = days.length * rowH + 34
  const X = (m: number) => left + ((m - dom[0]) / (dom[1] - dom[0])) * (w - left - 12)
  const step = dom[1] - dom[0] > 12 * 60 ? 180 : dom[1] - dom[0] > 7 * 60 ? 120 : 60
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="최근 7일 입실 시각과 공부 길이">
        {hourMarks(dom, step).map((m) => <g key={m}><line x1={X(m)} x2={X(m)} y1={4} y2={H - 26} className="nt-grid" /><text x={X(m)} y={H - 8} textAnchor="middle" className="nt-axis">{clockTick(m)}</text></g>)}
        {days.map((d, i) => {
          const y0 = 6 + i * rowH, late = lateDay(d, th.shift)
          const gaps = ev.filter((e) => eventDate(e) === d.date)
          const tip = `${day(d)} · ${d.start === null ? STATE[d.attendance] : `입실 ${clock(d.start)} · 공부 ${hm(d.minutes ?? 0)}`}${d.usualStart !== null ? ` · 같은 요일 평소 입실 ${clock(d.usualStart)}` : ''}${gaps.length ? ` · 비몰입 ${gaps.length}번` : ''}`
          return (
            <g key={d.date} tabIndex={0} data-tip={tip} aria-label={tip}>
              <text x={0} y={y0 + 18} className={`nt-axis${d.attendance === 'absent' ? ' nt-axis-flag' : ''}`}>{md(d.date)} {d.dow}{d.attendance === 'absent' ? ' 결석' : ''}</text>
              <line x1={left} x2={w - 12} y1={y0 + rowH - 4} y2={y0 + rowH - 4} className="t1-row" />
              {d.start !== null && <rect x={X(d.start)} y={y0 + 6} width={Math.max(2, X(d.start + (d.minutes ?? 0)) - X(d.start))} height={rowH - 14} className={late ? 't1-bar-flag' : 't1-bar'} />}
              {d.start !== null && gaps.map((e) => { const a = eventStartMinute(e); return <rect key={e.eventId} x={X(a)} y={y0 + 6} width={Math.max(2, X(a + eventSeconds(e) / 60) - X(a))} height={rowH - 14} className="t1-gap" data-tip={`${day(d)} ${clock(a)} ${SUP_LABEL[e.reason]} ${hm(eventSeconds(e) / 60)}`} /> })}
              {d.usualStart !== null && <path d={`M${X(d.usualStart)},${y0 + 2} v${rowH - 6}`} className="t1-usual" />}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** T2 요일 줄 눈금: 요일마다 한 줄, 같은 요일 5주 입실을 시각 축에 세로 눈금으로. 회색 넷 = 그 전 4주, 굵은 하나 = 최근 7일. 요일별 습관과 이번 주의 어긋남이 한 줄 안에 보인다 */
export function StartWeekdayLanes({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const recent = s.history35.slice(28)
  const lanes = recent.map((r, k) => ({ r, past: [0, 1, 2, 3].map((wk) => s.history35[wk * 7 + k]) }))
  const dom = clockDomain(s.history35.flatMap((d) => d.start === null ? [] : [d.start]), 20)
  const left = 92, laneH = 30, H = lanes.length * laneH + 30
  const X = (m: number) => left + ((m - dom[0]) / (dom[1] - dom[0])) * (w - left - 12)
  const step = dom[1] - dom[0] > 9 * 60 ? 120 : 60
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="요일별 최근 5주 입실 시각">
        {hourMarks(dom, step).map((m) => <g key={m}><line x1={X(m)} x2={X(m)} y1={2} y2={H - 24} className="nt-grid" /><text x={X(m)} y={H - 6} textAnchor="middle" className="nt-axis">{clockTick(m)}</text></g>)}
        {lanes.map(({ r, past }, i) => {
          const y0 = 4 + i * laneH, late = lateDay(r, th.shift)
          return (
            <g key={r.date}>
              <text x={0} y={y0 + 18} className={`nt-axis${r.attendance === 'absent' ? ' nt-axis-flag' : ''}`}>{r.dow} {md(r.date)}{r.attendance === 'absent' ? ' 결석' : ''}</text>
              <line x1={left} x2={w - 12} y1={y0 + laneH / 2} y2={y0 + laneH / 2} className="t2-lane" />
              {past.map((d) => d.start !== null && <line key={d.date} x1={X(d.start)} x2={X(d.start)} y1={y0 + 7} y2={y0 + laneH - 7} className="t2-old" tabIndex={-1} data-tip={`${day(d)} 입실 ${clock(d.start)}`} />)}
              {r.start !== null && <rect x={X(r.start) - 2.5} y={y0 + 3} width={5} height={laneH - 6} rx={1.5} className={late ? 't2-now-flag' : 't2-now'} tabIndex={0} data-tip={`${day(r)} 입실 ${clock(r.start)}${r.usualStart !== null ? ` · 같은 요일 평소 ${clock(r.usualStart)}` : ''}`} aria-label={`${day(r)} 입실 ${clock(r.start)}`} />}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** T3 평행 축: 입실 시각 → 공부 시간 → 비몰입 시간 세 축을 날마다 한 줄로 잇는다. 회색 = 이전 28일, 색 = 최근 7일. 늦게 온 날이 공부도 짧고 비몰입도 길었는지 줄의 기울기로 보인다 */
export function StartParallel({ s, ev, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const nf = new Map<string, number>()
  for (const e of ev) nf.set(eventDate(e), (nf.get(eventDate(e)) ?? 0) + eventSeconds(e) / 60)
  const pts = s.history35.map((d, i) => ({ d, recent: i >= 28 })).filter((x) => x.d.start !== null && x.d.minutes !== null)
  const dom = clockDomain(pts.map((x) => x.d.start!), 15)
  const maxStudy = Math.max(60, ...pts.map((x) => x.d.minutes!)), maxNf = Math.max(30, ...pts.map((x) => nf.get(x.d.date) ?? 0))
  const H = 270, top = 40, bot = H - 20, ax = [110, w / 2 + 20, w - 90]
  const Y = [(v: number) => top + ((v - dom[0]) / (dom[1] - dom[0])) * (bot - top), (v: number) => bot - (v / maxStudy) * (bot - top), (v: number) => top + (v / maxNf) * (bot - top)]
  const line = (x: (typeof pts)[number]) => `M${ax[0]},${Y[0](x.d.start!)} L${ax[1]},${Y[1](x.d.minutes!)} L${ax[2]},${Y[2](nf.get(x.d.date) ?? 0)}`
  const ticks = [[dom[0], (dom[0] + dom[1]) / 2, dom[1]].map((v) => ({ v: Y[0](v), t: clock(v) })), [0, maxStudy / 2, maxStudy].map((v) => ({ v: Y[1](v), t: hm(v) })), [0, maxNf / 2, maxNf].map((v) => ({ v: Y[2](v), t: hm(v) }))]
  const names = ['입실 시각', '공부 시간', '비몰입 시간']
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="입실 시각, 공부 시간, 비몰입 시간의 날별 연결">
        {ax.map((x, i) => <g key={i}><line x1={x} x2={x} y1={top} y2={bot} className="t3-axis" /><text x={x} y={14} textAnchor="middle" className="nt-axis nt-axis-strong">{names[i]}</text>{ticks[i].map((t) => <text key={t.t} x={i === 2 ? x + 8 : x - 8} y={t.v + 4} textAnchor={i === 2 ? 'start' : 'end'} className="nt-axis">{t.t}</text>)}</g>)}
        {pts.filter((x) => !x.recent).map((x) => <path key={x.d.date} d={line(x)} className="t3-old" />)}
        {pts.filter((x) => x.recent).map((x) => { const tip = `${day(x.d)} · 입실 ${clock(x.d.start!)} · 공부 ${hm(x.d.minutes!)} · 비몰입 ${hm(nf.get(x.d.date) ?? 0)}`; return <path key={x.d.date} d={line(x)} className={lateDay(x.d, th.shift) ? 't3-now-flag' : 't3-now'} tabIndex={0} data-tip={tip} aria-label={tip} /> })}
      </svg>
    </div>
  )
}

/** T4 연속 표시 시각 열: 35일 입실 시각을 날짜 순서로 찍고(위가 이른 시각), 같은 요일 평소보다 기준만큼 늦은 날이 이어지면 아래에 그 길이만큼 굵은 받침을 깐다. 늦음이 하루인지 이어지는지가 받침 길이로 보인다 */
export function StartRunChart({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const days = s.history35
  const usual = days.map((d, i) => d.usualStart ?? sameWeekdayMean(s, i, 'start'))
  const lateAt = days.map((d, i) => d.start !== null && usual[i] !== null && d.start - usual[i]! >= th.shift)
  const dom = clockDomain(days.flatMap((d) => d.start === null ? [] : [d.start]), 20)
  const left = 56, H = 240, top = 10, bot = H - 64
  const cw = (w - left - 8) / days.length
  const narrow = cw < 22
  const X = (i: number) => left + cw * (i + 0.5), Y = (m: number) => top + ((m - dom[0]) / (dom[1] - dom[0])) * (bot - top)
  const runs: [number, number][] = []
  lateAt.forEach((l, i) => { if (!l) return; const last = runs[runs.length - 1]; if (last && last[1] === i - 1) last[1] = i; else runs.push([i, i]) })
  const step = dom[1] - dom[0] > 9 * 60 ? 120 : 60
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 입실 시각과 늦은 날의 이어짐">
        {hourMarks(dom, step).map((m) => <g key={m}><line x1={left} x2={w - 8} y1={Y(m)} y2={Y(m)} className="nt-grid" /><text x={left - 8} y={Y(m) + 4} textAnchor="end" className="nt-axis">{clockTick(m)}</text></g>)}
        <rect x={left + cw * 28} y={top - 6} width={cw * 7} height={bot - top + 12} className="t4-recent" />
        {days.map((d, i) => {
          const tip = `${day(d)} · ${d.start === null ? STATE[d.attendance] : `입실 ${clock(d.start)}`}${usual[i] !== null ? ` · 같은 요일 평소 ${clock(usual[i]!)}` : ''}`
          return <g key={d.date}>
            {d.start !== null ? <circle cx={X(i)} cy={Y(d.start)} r={i >= 28 ? 5.5 : 4} className={lateAt[i] ? 't4-flag' : i >= 28 ? 't4-now' : 't4-old'} tabIndex={i >= 28 ? 0 : -1} data-tip={tip} aria-label={i >= 28 ? tip : undefined} />
              : null}
            {((d.dow === '월' && (!narrow || i < 26)) || (i >= 28 && !narrow)) && <text x={X(i)} y={H - 26} textAnchor="middle" className={`nt-axis${i >= 28 && d.attendance === 'absent' ? ' nt-axis-flag' : ''}`} tabIndex={i >= 28 && d.start === null ? 0 : -1} data-tip={d.start === null ? tip : undefined}>{i >= 28 ? d.dow : md(d.date)}</text>}
            {i >= 28 && !narrow && <text x={X(i)} y={H - 10} textAnchor="middle" className={`nt-axis${d.attendance === 'absent' ? ' nt-axis-flag' : ''}`}>{d.attendance === 'absent' ? '' : Number(d.date.slice(8))}</text>}
          </g>
        })}
        {narrow && <text x={(X(28) + X(34)) / 2} y={H - 26} textAnchor="middle" className="nt-axis nt-axis-strong">최근 7일</text>}
        {absentRuns(days).map(([a, b]) => <text key={`a${a}`} x={(X(a) + X(b)) / 2} y={H - 10} textAnchor="middle" className="nt-axis nt-axis-flag">결석</text>)}
        {runs.map(([a, b]) => <rect key={a} x={X(a) - cw * 0.4} y={bot + 14} width={cw * (b - a + 0.8)} height={6} rx={3} className="t4-run" tabIndex={0} data-tip={`${md(days[a].date)}~${md(days[b].date)} ${b - a + 1}일 이어서 늦음`} />)}
      </svg>
    </div>
  )
}

/** T5 늦은 순 사다리: 35일 입실을 이른 날부터 늦은 날까지 줄 세운 계단(세로 = 시각). 최근 7일 칸만 색이라 이번 주가 계단 끝(가장 늦은 쪽)에 몰렸는지 바로 보인다 */
export function StartQuantileLadder({ s, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const items = s.history35.map((d, i) => ({ d, recent: i >= 28 })).filter((x) => x.d.start !== null).sort((a, b) => a.d.start! - b.d.start!)
  const dom = clockDomain(items.map((x) => x.d.start!), 15)
  const left = 56, H = 230, top = 10, bot = H - 34
  const cw = (w - left - 8) / Math.max(1, items.length)
  const Y = (m: number) => top + ((m - dom[0]) / (dom[1] - dom[0])) * (bot - top)
  const step = dom[1] - dom[0] > 9 * 60 ? 120 : 60
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 입실 시각을 이른 순으로">
        {hourMarks(dom, step).map((m) => <g key={m}><line x1={left} x2={w - 8} y1={Y(m)} y2={Y(m)} className="nt-grid" /><text x={left - 8} y={Y(m) + 4} textAnchor="end" className="nt-axis">{clockTick(m)}</text></g>)}
        {items.map((x, k) => {
          const tip = `${day(x.d)} 입실 ${clock(x.d.start!)} · 35일 중 ${k + 1}번째로 이름`
          return <rect key={x.d.date} x={left + cw * k + 1} y={top} width={Math.max(1, cw - 2)} height={Y(x.d.start!) - top} className={!x.recent ? 't5-old' : lateDay(x.d, th.shift) ? 't5-flag' : 't5-now'} tabIndex={x.recent ? 0 : -1} data-tip={tip} aria-label={x.recent ? tip : undefined} />
        })}
        <text x={left} y={H - 10} className="nt-axis">이른 날</text>
        <text x={w - 8} y={H - 10} textAnchor="end" className="nt-axis">늦은 날</text>
      </svg>
    </div>
  )
}
