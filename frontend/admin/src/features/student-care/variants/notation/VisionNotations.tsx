// 사진 관찰 표시법 5종. 이미지 인식 감독관 API의 비몰입 이벤트(유형·시각·지속·근거 사진 3장)를 쓴다. 각 그림은 서로 다른 패턴이다.
import type React from 'react'
import { useWidth } from '../z/useWidth.ts'
import { md } from '../shared/useCareData.ts'
import { EVIDENCE_LABEL, eventDate, eventSeconds, eventStartMinute, evidenceSrc, SUP_BEHAVIORS, SUP_LABEL, type SupBehavior, type SupEvent } from '../supervisor/supervisorClient.ts'
import { absentRuns, clock, clockTick, day, dropDay, hm, STATE, type NotationProps } from './kit.tsx'

const byDate = (ev: SupEvent[]) => { const m = new Map<string, SupEvent[]>(); for (const e of ev) { const k = eventDate(e); m.set(k, [...(m.get(k) ?? []), e]) } return m }
const minutesOf = (list: SupEvent[] = [], b?: SupBehavior) => list.filter((e) => !b || e.reason === b).reduce((a, e) => a + eventSeconds(e) / 60, 0)

/** V1 사건 필름: 최근 7일 비몰입 중 긴 것부터 4건. 줄마다 근거 사진 3장(처음 보임·중간·확정)을 나란히, 오른쪽 막대는 사건 길이(모든 줄이 같은 분 눈금)이고 막대 위 눈금 셋이 사진을 찍은 때다 */
export function VisionFilm({ s, ev }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const recent = new Set(s.days.map((d) => d.date))
  const list = ev.filter((e) => recent.has(eventDate(e))).sort((a, b) => eventSeconds(b) - eventSeconds(a)).slice(0, 4)
  if (!list.length) return <div ref={ref} className="nt-plot"><p className="nt-empty">최근 7일 비몰입 없음</p></div>
  const thumb = Math.max(64, Math.min(128, Math.floor((w - 120 - 32 - 140 - 16) / 3)))
  const thumbs = 3 * thumb + 2 * 8, barW = Math.max(120, w - 120 - thumbs - 32)
  const spanMin = Math.ceil(Math.max(...list.map(eventSeconds)) / 60 / 5) * 5
  const X = (sec: number) => (sec / 60 / spanMin) * barW
  const ticks = Array.from({ length: spanMin / 5 + 1 }, (_, i) => i * 5)
  return (
    <div ref={ref} className="nt-plot"><div className="v1-film" style={{ gridTemplateColumns: `120px ${thumbs}px ${barW}px` }}>
      {list.map((e) => {
        const t0 = new Date(e.startedAt).getTime()
        const d = s.days.find((x) => x.date === eventDate(e))!
        const tip = `${day(d)} ${clock(eventStartMinute(e))}부터 ${SUP_LABEL[e.reason]} ${hm(eventSeconds(e) / 60)}`
        return (
          <div key={e.eventId} className="v1-row" tabIndex={0} data-tip={tip} aria-label={tip}>
            <div className="v1-head"><b>{SUP_LABEL[e.reason]}</b><span>{md(eventDate(e))} {d.dow} {clock(eventStartMinute(e))}</span></div>
            <div className="v1-thumbs" style={{ ['--v1-thumb' as string]: `${thumb}px` }}>{e.images.map((im) => <img key={im.selectionType} src={evidenceSrc(im.url)} alt={`${SUP_LABEL[e.reason]} ${EVIDENCE_LABEL[im.selectionType]}`} loading="lazy" data-tip={EVIDENCE_LABEL[im.selectionType]} />)}</div>
            <svg width={barW} height={40} className="v1-bar" aria-hidden>
              <rect x={0} y={16} width={Math.max(2, X(eventSeconds(e)))} height={10} rx={3} className="v1-span" />
              {e.images.map((im) => im.capturedAt && <line key={im.selectionType} x1={X((new Date(im.capturedAt).getTime() - t0) / 1000)} x2={X((new Date(im.capturedAt).getTime() - t0) / 1000)} y1={10} y2={32} className="v1-shot" />)}
            </svg>
          </div>
        )
      })}
      <svg width={barW} height={20} className="v1-axis" aria-hidden>{ticks.map((t) => <text key={t} x={Math.min(barW - 14, X(t * 60))} y={14} textAnchor={t === 0 ? 'start' : 'middle'} className="nt-axis">{t}분</text>)}</svg>
    </div></div>
  )
}

/** 유형 그림(휴대폰·엎드린 사람·빈 의자). 색이 아니라 모양 자체가 무엇인지 말한다 */
function Glyph({ b, x, y, size, className }: { b: SupBehavior; x: number; y: number; size: number; className: string }) {
  const k = size / 20
  const g = (children: React.ReactNode) => <g transform={`translate(${x} ${y}) scale(${k})`} className={className}>{children}</g>
  if (b === 'PHONE_USAGE') return g(<><rect x={5} y={1} width={10} height={18} rx={2.2} /><rect x={6.8} y={3.5} width={6.4} height={11.5} rx={0.8} className="v2-screen" /></>)
  if (b === 'LYING_DOWN') return g(<><rect x={0} y={15} width={20} height={2.4} rx={1} /><circle cx={5} cy={11} r={3.4} /><path d="M8 10.5 Q13 6.5 19 10 L19 14.5 L8 14.5 Z" /></>)
  return g(<><rect x={4} y={2} width={3} height={16} rx={1} /><rect x={4} y={9.5} width={12} height={3} rx={1} /><rect x={13} y={9.5} width={3} height={8.5} rx={1} /></>)
}

/** V2 그림 쌓기: 35일 날짜마다 비몰입 한 건 = 그림 하나(휴대폰·엎드린 사람·빈 의자)를 쌓는다. 몇 번·무엇이 한눈에, 최근 7일은 진하게 */
export function VisionPictograms({ s, ev, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const m = byDate(ev)
  const days = s.history35
  const maxN = Math.max(3, ...days.map((d) => m.get(d.date)?.length ?? 0))
  const cw = (w - 8) / days.length, size = Math.min(20, cw - 4), H = maxN * (size + 3) + 50, narrow = cw < 22
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 날짜별 비몰입 건수와 종류">
        <rect x={4 + cw * 28} y={0} width={cw * 7} height={H - 40} className="v2-recent" />
        <line x1={4} x2={w - 4} y1={H - 40} y2={H - 40} className="nt-base" />
        {days.map((d, i) => {
          const list = (m.get(d.date) ?? []).sort((a, b) => SUP_BEHAVIORS.indexOf(a.reason) - SUP_BEHAVIORS.indexOf(b.reason))
          const flag = i >= 28 && dropDay(d, th.drop)
          const tip = `${day(d)} · ${d.attendance !== 'present' ? STATE[d.attendance] : list.length ? SUP_BEHAVIORS.map((b) => { const n = list.filter((e) => e.reason === b).length; return n ? `${SUP_LABEL[b]} ${n}번` : '' }).filter(Boolean).join(', ') : '비몰입 없음'}`
          return <g key={d.date} tabIndex={i >= 28 ? 0 : -1} data-tip={tip} aria-label={i >= 28 ? tip : undefined}>
            <rect x={4 + cw * i} y={0} width={cw} height={H - 40} className="nt-hit" />
            {list.map((e, k) => <Glyph key={e.eventId} b={e.reason} x={4 + cw * i + (cw - size) / 2} y={H - 42 - (k + 1) * (size + 3)} size={size} className={i >= 28 ? 'v2-g-now' : 'v2-g-old'} />)}
            {((d.dow === '월' && (!narrow || i < 26)) || (i >= 28 && !narrow)) && <text x={4 + cw * (i + 0.5)} y={H - 24} textAnchor="middle" className={`nt-axis${flag ? ' nt-axis-flag' : ''}`}>{i >= 28 ? d.dow : md(d.date)}</text>}
            {i >= 28 && !narrow && <text x={4 + cw * (i + 0.5)} y={H - 8} textAnchor="middle" className={`nt-axis${flag || d.attendance === 'absent' ? ' nt-axis-flag' : ''}`}>{d.attendance === 'absent' ? '' : Number(d.date.slice(8))}</text>}
          </g>
        })}
        {narrow && <text x={4 + cw * 31.5} y={H - 24} textAnchor="middle" className="nt-axis nt-axis-strong">최근 7일</text>}
        {absentRuns(days).map(([a, b]) => <text key={`a${a}`} x={4 + cw * ((a + b + 1) / 2)} y={H - 8} textAnchor="middle" className="nt-axis nt-axis-flag">결석</text>)}
      </svg>
    </div>
  )
}

/** V3 크기 원 격자: 줄 = 종류 셋, 열 = 35일. 원의 넓이 = 그날 그 종류의 비몰입 시간. 공부 시간이 기준만큼 준 날은 그 열 원이 빨강이라 원인과 결과가 같은 열에서 만난다 */
export function VisionBubbles({ s, ev, th }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const m = byDate(ev)
  const days = s.history35
  const left = 76, rowH = 40, H = 3 * rowH + 44, cw = (w - left - 8) / days.length, narrow = cw < 22
  const maxMin = Math.max(10, ...days.flatMap((d) => SUP_BEHAVIORS.map((b) => minutesOf(m.get(d.date), b))))
  const rMax = Math.min(rowH / 2 - 2, cw * 0.9)
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 종류별 비몰입 시간">
        <rect x={left + cw * 28} y={0} width={cw * 7} height={3 * rowH} className="v3-recent" />
        {SUP_BEHAVIORS.map((b, r) => <g key={b}>
          <text x={0} y={r * rowH + rowH / 2 + 4} className="nt-axis nt-axis-strong">{SUP_LABEL[b]}</text>
          <line x1={left} x2={w - 8} y1={r * rowH + rowH / 2} y2={r * rowH + rowH / 2} className="v3-lane" />
          {days.map((d, i) => { const v = minutesOf(m.get(d.date), b); if (!v) return null; const flag = i >= 28 && dropDay(d, th.drop); const tip = `${day(d)} · ${SUP_LABEL[b]} ${hm(v)} (${(m.get(d.date) ?? []).filter((e) => e.reason === b).length}번)${flag ? ' · 이날 공부 시간 감소' : ''}`; return <circle key={d.date} cx={left + cw * (i + 0.5)} cy={r * rowH + rowH / 2} r={Math.max(2.5, Math.sqrt(v / maxMin) * rMax)} className={flag ? 'v3-flag' : i >= 28 ? 'v3-now' : 'v3-old'} tabIndex={i >= 28 ? 0 : -1} data-tip={tip} aria-label={i >= 28 ? tip : undefined} /> })}
        </g>)}
        {days.map((d, i) => ((d.dow === '월' && (!narrow || i < 26)) || (i >= 28 && !narrow)) && <text key={d.date} x={left + cw * (i + 0.5)} y={3 * rowH + 20} textAnchor="middle" className={`nt-axis${d.attendance === 'absent' ? ' nt-axis-flag' : ''}`}>{i >= 28 ? d.dow : md(d.date)}</text>)}
        {narrow && <text x={left + cw * 31.5} y={3 * rowH + 20} textAnchor="middle" className="nt-axis nt-axis-strong">최근 7일</text>}
        {!narrow && days.map((d, i) => i >= 28 && <text key={d.date} x={left + cw * (i + 0.5)} y={3 * rowH + 36} textAnchor="middle" className="nt-axis">{Number(d.date.slice(8))}</text>)}
      </svg>
    </div>
  )
}

/** V4 시간대 겹침: 종류마다 한 줄, 가로는 하루 시각. 35일의 비몰입 구간을 같은 줄에 반투명으로 겹쳐 그려, 진하게 겹친 시각이 그 학생이 자주 휴대폰을 보거나 엎드리는 때다. 최근 7일 구간은 진한 테두리 */
export function VisionHours({ s, ev }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const recent = new Set(s.days.map((d) => d.date))
  const starts = s.history35.flatMap((d) => d.start === null ? [] : [d.start, d.start + (d.minutes ?? 0)])
  const lo = Math.floor((Math.min(...starts, ...ev.map(eventStartMinute)) - 30) / 60) * 60
  const hi = Math.ceil((Math.max(...starts, ...ev.map((e) => eventStartMinute(e) + eventSeconds(e) / 60)) + 30) / 60) * 60
  const left = 76, rowH = 34, H = 3 * rowH + 30
  const X = (m: number) => left + ((m - lo) / Math.max(60, hi - lo)) * (w - left - 12)
  const step = hi - lo > 12 * 60 ? 180 : 120
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="종류별 비몰입이 생긴 시각, 최근 35일 겹침">
        {Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step).map((m) => <g key={m}><line x1={X(m)} x2={X(m)} y1={0} y2={3 * rowH} className="nt-grid" /><text x={X(m)} y={H - 8} textAnchor="middle" className="nt-axis">{clockTick(m)}</text></g>)}
        {SUP_BEHAVIORS.map((b, r) => <g key={b}>
          <text x={0} y={r * rowH + rowH / 2 + 4} className="nt-axis nt-axis-strong">{SUP_LABEL[b]}</text>
          {ev.filter((e) => e.reason === b).map((e) => { const a = eventStartMinute(e), now = recent.has(eventDate(e)); return <rect key={e.eventId} x={X(a)} y={r * rowH + 6} width={Math.max(2, X(a + eventSeconds(e) / 60) - X(a))} height={rowH - 12} className={now ? 'v4-now' : 'v4-old'} tabIndex={now ? 0 : -1} data-tip={`${md(eventDate(e))} ${clock(a)} ${SUP_LABEL[b]} ${hm(eventSeconds(e) / 60)}`} /> })}
        </g>)}
      </svg>
    </div>
  )
}

/** V5 종류별 쌓인 면: 35일 날짜 순서로 그날 비몰입 시간을 종류별로 쌓은 면(세로 = 분). 이름은 각 면 오른쪽 끝에 바로 붙인다 */
export function VisionStackedArea({ s, ev }: NotationProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const m = byDate(ev)
  const days = s.history35
  const vals = days.map((d) => SUP_BEHAVIORS.map((b) => minutesOf(m.get(d.date), b)))
  const totals = vals.map((v) => v.reduce((a, b) => a + b, 0))
  const maxV = Math.max(20, ...totals), stepM = maxV > 90 ? 30 : maxV > 45 ? 15 : 10, top = Math.ceil(maxV / stepM) * stepM
  const left = 52, right = 16, H = 240, padT = 30, bot = H - 50
  const cw = (w - left - right) / (days.length - 1)
  const narrow = cw < 22
  const X = (i: number) => left + cw * i, Y = (v: number) => padT + (1 - v / top) * (bot - padT)
  const layer = (k: number) => {
    const lower = vals.map((v) => v.slice(0, k).reduce((a, b) => a + b, 0)), upper = vals.map((v, i) => lower[i] + v[k])
    const peak = vals.reduce((best, v, i) => (v[k] > vals[best][k] ? i : best), 0)
    return { d: upper.map((u, i) => `${i ? 'L' : 'M'}${X(i)},${Y(u)}`).join(' ') + ' ' + lower.map((_, i) => `L${X(days.length - 1 - i)},${Y(lower[days.length - 1 - i])}`).join(' ') + ' Z', peak, at: (lower[peak] + upper[peak]) / 2, has: vals[peak][k] > 0 }
  }
  return (
    <div ref={ref} className="nt-plot">
      <svg width={w} height={H} role="img" aria-label="최근 35일 종류별 비몰입 시간 쌓기">
        {Array.from({ length: top / stepM + 1 }, (_, i) => i * stepM).map((t) => <g key={t}><line x1={left} x2={w - right} y1={Y(t)} y2={Y(t)} className="nt-grid" /><text x={left - 8} y={Y(t) + 4} textAnchor="end" className="nt-axis">{t}분</text></g>)}
        {SUP_BEHAVIORS.map((b, k) => <path key={b} d={layer(k).d} className={`v5-l${k}`} />)}
        {SUP_BEHAVIORS.map((b, k) => { const L = layer(k); return L.has && <g key={b}><line x1={X(L.peak)} x2={X(L.peak) + 18} y1={Y(L.at)} y2={Y(L.at) - 14 - k * 4} className="v5-tick" /><text x={X(L.peak) + 20} y={Y(L.at) - 16 - k * 4} className="nt-axis nt-axis-strong">{SUP_LABEL[b]}</text></g> })}
        {narrow && <text x={(X(28) + X(34)) / 2} y={H - 22} textAnchor="middle" className="nt-axis nt-axis-strong">최근 7일</text>}
        {absentRuns(days).map(([a, b]) => <text key={`a${a}`} x={(X(a) + X(b)) / 2} y={H - 6} textAnchor="middle" className="nt-axis nt-axis-flag">결석</text>)}
        <line x1={X(28)} x2={X(28)} y1={padT} y2={bot} className="p4-split" />
        {days.map((d, i) => { const tip = `${day(d)} · ${SUP_BEHAVIORS.map((b, k) => `${SUP_LABEL[b]} ${hm(vals[i][k])}`).join(' · ')}`; return <g key={d.date}>
          <rect x={X(i) - cw / 2} y={padT} width={cw} height={bot - padT} className="nt-hit" tabIndex={i >= 28 ? 0 : -1} data-tip={tip} aria-label={i >= 28 ? tip : undefined} />
          {((d.dow === '월' && (!narrow || i < 26)) || (i >= 28 && !narrow)) && <text x={X(i)} y={H - 22} textAnchor="middle" className="nt-axis">{i >= 28 ? d.dow : md(d.date)}</text>}
          {i >= 28 && !narrow && <text x={X(i)} y={H - 6} textAnchor="middle" className="nt-axis">{d.attendance === 'absent' ? '' : Number(d.date.slice(8))}</text>}
        </g> })}
      </svg>
    </div>
  )
}
