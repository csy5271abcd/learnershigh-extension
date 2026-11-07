// 시안 A–D 공통 그래프(representation-v5.md). 모양이 먼저, 숫자는 머리 숫자·극단·선택 대상에만.
// 정확한 값은 안내 상자에서 본다: 마우스를 올리거나, 날짜(열)에 키보드 초점을 두고 ↑↓로 학생을 옮기면 같은 안내가 뜬다.
// SVG 좌표는 실제 픽셀이라 글자가 줄어들지 않는다. 점은 겹치지 않게 배치한다(pack.ts).
import { useState, type ReactNode } from 'react'
import { usePlotWidth } from '../../components/weekly/usePlotWidth.ts'
import { hours, clock, type OpsDay } from './model.ts'
import { md, type CareRow } from './useCareData.ts'
import { VISION_AXES, visionAxisLabel, axisOfDay, sumVision, type VisionAxis } from './visionExample.ts'
import { packFit } from './pack.ts'

const quant = (s: number[], q: number) => { const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo) }
const isHotRow = (r: CareRow) => r.status === 'check' || r.status === 'recheck' || r.status === 'managed'
const act = (e: React.KeyboardEvent, f: () => void) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f() } }

interface Tip { x: number; y: number; text: string }
function TipBox({ tip, width }: { tip: Tip | null; width: number }) {
  if (!tip) return null
  const left = Math.min(Math.max(0, tip.x + 12), width - 260)
  return <div className="v5-tip" role="status" style={{ left, top: Math.max(0, tip.y - 44) }}>{tip.text}</div>
}

export interface SwarmLine { row: CareRow; label: string; tone: 1 | 2 | 3 }
interface SwarmProps {
  rows: CareRow[]
  value: (r: CareRow, i: number) => number | null
  /** 안내 상자 문구(원래 단위의 실제·평소·차이) */
  detail: (r: CareRow, i: number) => string
  domain: [number, number]
  baseline?: number
  format: (v: number) => string
  /** 관리 대상 강조 기준. 없으면 강조하지 않음(비전 등) */
  warn?: (v: number) => boolean
  height?: number
  /** 표본 크기(예: 분석 사진 장수). 10 미만은 빈 원 */
  sample?: (r: CareRow, i: number) => number
  /** 열 머리 숫자. 없으면 학생 가운데 값 */
  head?: (i: number, vals: number[]) => string
  selectedDay?: number | null
  onDay?: (i: number) => void
  onStudent?: (r: CareRow) => void
  label: string
  ticks?: number[]
  /** 고른 학생의 7일 선(A의 학생 선 비교) */
  lines?: SwarmLine[]
}

/** 날짜별 분포 점 그림: 점 하나 = 학생 한 명. 열마다 가운데 절반 띠와 가운데 값. 축 밖 값은 위·아래 띠에 모은다 */
export function DaySwarm({ rows, value, detail, domain, baseline, format, warn, height = 220, sample, head, selectedDay, onDay, onStudent, label, ticks, lines }: SwarmProps) {
  const [ref, width] = usePlotWidth()
  const [tip, setTip] = useState<Tip | null>(null)
  const [cursor, setCursor] = useState<{ day: number; idx: number } | null>(null)
  const days = rows[0]?.days ?? []
  const left = 54, right = 8, rail = 16, top = 26 + rail, bottom = 46 + rail, H = height - top - bottom, colW = (width - left - right) / 7
  const [lo, hi] = domain
  const y = (v: number) => top + H - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * H
  const tickVals = ticks ?? [lo, baseline ?? (lo + hi) / 2, hi]
  const cols = days.map((d, i) => {
    const cx = left + colW * i + colW / 2
    const pts = rows.flatMap((r) => { const v = value(r, i); return v === null ? [] : [{ r, v }] })
    const inside = pts.filter((p) => p.v >= lo && p.v <= hi), above = pts.filter((p) => p.v > hi), below = pts.filter((p) => p.v < lo)
    // 값 좌표(y)는 그대로 두고 옆으로만 비킨다. 자리가 모자란 점은 그 높이에 '+n'으로 묶는다(값을 옮기지 않음)
    const { points: packedAll, r } = packFit(inside.map((p) => ({ item: p, y: y(p.v) })), cx, colW * 0.42, 2.6, 1.8, 0)
    const points = packedAll.filter((p) => p.packed)
    const extra = new Map<number, { y: number; n: number }>()
    for (const p of packedAll) if (!p.packed) { const k = Math.round(p.y / 8); const e = extra.get(k) ?? { y: p.y, n: 0 }; e.n++; extra.set(k, e) }
    const railPts = (list: typeof pts, yy: number) => packFit(list.map((p) => ({ item: p, y: yy })), cx, colW * 0.42, 2.6, 1.8, 0).points.filter((p) => p.packed)
    const all = [...points, ...railPts(above, top - rail / 2 - 2), ...railPts(below, top + H + rail / 2 + 2)]
    const vals = pts.map((p) => p.v).sort((a, b) => a - b)
    const order = [...all].sort((a, b) => Math.abs(b.item.v - (baseline ?? 0)) - Math.abs(a.item.v - (baseline ?? 0)))
    return { d, i, cx, all, r, vals, extra: [...extra.values()], above: above.length, below: below.length, order, hot: pts.filter((p) => warn && isHotRow(p.r) && warn(p.v)).length }
  })
  const daySummary = (c: { d: { date: string; dow: string }; vals: number[]; hot: number }) => c.vals.length ? `${md(c.d.date)} ${c.d.dow} · 학생 ${c.vals.length}명 · 가운데 값 ${format(quant(c.vals, 0.5))} · 가운데 절반 ${format(quant(c.vals, 0.25))}~${format(quant(c.vals, 0.75))}${c.hot ? ` · 기준 넘음 ${c.hot}명` : ''}` : `${md(c.d.date)} 기록 없음`
  const show = (p: { item: { r: CareRow }; x: number; y: number }, i: number) => setTip({ x: p.x, y: p.y, text: `${p.item.r.student.studentName} · ${md(days[i].date)} · ${detail(p.item.r, i)}` })
  const onKey = (e: React.KeyboardEvent, c: (typeof cols)[number]) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const cur = cursor?.day === c.i ? cursor.idx : -1
      const idx = Math.max(0, Math.min(c.order.length - 1, cur + (e.key === 'ArrowDown' ? 1 : -1)))
      setCursor({ day: c.i, idx }); if (c.order[idx]) show(c.order[idx], c.i)
    } else if (e.key === 'Enter' && cursor?.day === c.i && c.order[cursor.idx]) { e.preventDefault(); onStudent?.(c.order[cursor.idx].item.r) }
    else act(e, () => onDay?.(c.i))
  }
  const cur = cursor ? cols[cursor.day]?.order[cursor.idx] : null
  return (
    <div ref={ref} className="v5-plot v5-rel" onMouseLeave={() => setTip(null)}>
      <svg width={width} height={height} role="group" aria-label={label}>
        {tickVals.map((t) => <g key={t} aria-hidden="true"><line x1={left} x2={width - right} y1={y(t)} y2={y(t)} className={t === baseline ? 'v5-axis-base' : 'v5-grid'} /><text x={left - 6} y={y(t) + 4} textAnchor="end" className="v5-tick">{t === baseline ? '평소' : format(t)}</text></g>)}
        {cols.map((c) => (
          <g key={c.d.date}>
            {selectedDay === c.i && <rect x={c.cx - colW / 2 + 2} y={4} width={colW - 4} height={height - 8} className="v5-col-sel" rx={6} />}
            {c.vals.length > 0 && <rect x={c.cx - colW * 0.47} y={y(quant(c.vals, 0.75))} width={colW * 0.94} height={Math.max(1, y(quant(c.vals, 0.25)) - y(quant(c.vals, 0.75)))} rx={3} className="v5-iqr" aria-hidden="true" />}
            {c.all.map((p) => { const v = p.item.v, over = v > hi || v < lo, hot = !!warn && isHotRow(p.item.r) && warn(v), small = sample ? sample(p.item.r, c.i) < 10 : false
              return over
                ? <path key={p.item.r.student.studentId} d={`M${p.x - 3.5},${p.y + (v > hi ? 3 : -3)} L${p.x + 3.5},${p.y + (v > hi ? 3 : -3)} L${p.x},${p.y + (v > hi ? -3 : 3)} Z`} className={hot ? 'v5-dot-hot' : 'v5-dot-over'} onMouseEnter={() => show(p, c.i)} onClick={() => onStudent?.(p.item.r)} />
                : <circle key={p.item.r.student.studentId} cx={p.x} cy={p.y} r={sample ? Math.max(1.6, Math.min(c.r, 1.2 + Math.sqrt(sample(p.item.r, c.i)) * 0.35)) : c.r} className={small ? 'v5-dot-small' : hot ? 'v5-dot-hot' : 'v5-dot'} onMouseEnter={() => show(p, c.i)} onClick={() => onStudent?.(p.item.r)} /> })}
            {c.extra.map((e, k) => <text key={k} x={c.cx + colW * 0.47} y={e.y + 4} textAnchor="end" className="v5-rail-num">+{e.n}</text>)}
            {c.above > 0 && <text x={c.cx + colW * 0.47} y={top - rail - 4} textAnchor="end" className="v5-rail-num">▲ {c.above}명</text>}
            {c.below > 0 && <text x={c.cx + colW * 0.47} y={top + H + rail + 4} textAnchor="end" className="v5-rail-num">▼ {c.below}명</text>}
            {c.vals.length > 0 && <><line x1={c.cx - colW * 0.32} x2={c.cx + colW * 0.32} y1={y(quant(c.vals, 0.5))} y2={y(quant(c.vals, 0.5))} className="v5-median" aria-hidden="true" />
              <text x={c.cx} y={14} textAnchor="middle" className="v5-head-num">{head ? head(c.i, c.vals) : format(quant(c.vals, 0.5))}</text></>}
            <g role="button" tabIndex={0} aria-pressed={onDay ? selectedDay === c.i : undefined}
              aria-label={`${md(c.d.date)} ${label}: 학생 ${c.vals.length}명${c.vals.length ? `, 가운데 값 ${format(quant(c.vals, 0.5))}, 가운데 절반 ${format(quant(c.vals, 0.25))}~${format(quant(c.vals, 0.75))}` : ''}${c.hot ? `, 기준을 넘은 관리 대상 ${c.hot}명` : ''}. 위아래 화살표로 학생, Enter로 열기`}
              onClick={() => onDay?.(c.i)} onKeyDown={(e) => onKey(e, c)} onBlur={() => { setCursor(null); setTip(null) }} className="v5-day-hit"
              onFocus={() => setTip({ x: c.cx, y: height - 40, text: daySummary(c) })} onMouseEnter={() => setTip({ x: c.cx, y: height - 40, text: daySummary(c) })}>
              <rect x={c.cx - colW / 2 + 2} y={height - 40} width={colW - 4} height={38} fill="transparent" />
              <text x={c.cx} y={height - 24} textAnchor="middle" className="v5-tick">{md(c.d.date)} {c.d.dow}</text>
            </g>
            {c.hot > 0 && <text x={c.cx} y={height - 6} textAnchor="middle" className="v5-hot-more">{colW >= 120 ? `기준 넘음 ${c.hot}명` : `${c.hot}명`}</text>}
          </g>))}
        {lines?.map((l) => { const pts = cols.flatMap((c) => { const v = value(l.row, c.i); return v === null ? [] : [[c.cx, y(v)] as const] })
          return <g key={l.row.student.studentId} className={`v5-line v5-line-${l.tone}`}><polyline points={pts.map((p) => p.join(',')).join(' ')} />{pts.map((p, k) => <circle key={k} cx={p[0]} cy={p[1]} r={3.5} />)}{pts.length > 0 && <text x={Math.min(width - right - 4, pts[pts.length - 1][0] + 6)} y={pts[pts.length - 1][1] - 6} textAnchor="end">{l.label}</text>}</g> })}
        {cur && <circle cx={cur.x} cy={cur.y} r={6} className="v5-dot-focus" />}
      </svg>
      <TipBox tip={tip} width={width} />
    </div>
  )
}

/** 출결 행렬: 결석이 1일 이상인 학생만 행. 결석 = 채운 칸, 기록 없음 = 점선, 계획 미제출 = 칸 아래 선 */
export function AttendanceMatrix({ rows, onStudent, onDay, selectedDay, limit }: { rows: CareRow[]; onStudent?: (r: CareRow) => void; onDay?: (i: number) => void; selectedDay?: number | null; limit?: number }) {
  const [ref, width] = usePlotWidth()
  const [all, setAll] = useState(false)
  const days = rows[0]?.days ?? []
  const run = (r: CareRow) => { let b = 0, c = 0; for (const d of r.days) { if (d.attendance === 'absent') { c++; b = Math.max(b, c) } else if (d.attendance !== 'off') c = 0 } return b }
  const absent = rows.filter((r) => r.days.some((d) => d.attendance === 'absent'))
    .sort((a, b) => run(b) - run(a) || b.days.filter((d) => d.attendance === 'absent').length - a.days.filter((d) => d.attendance === 'absent').length || a.student.studentName.localeCompare(b.student.studentName, 'ko'))
  const missOnly = rows.filter((r) => !r.days.some((d) => d.attendance === 'absent') && r.days.filter((d) => d.submission === 'missing').length >= 2)
  const list = all || !limit ? absent : absent.slice(0, limit)
  const left = 92, top = 54, ch = 16, gap = 4, cw = Math.min(64, (width - left - 8) / 7)
  const height = top + list.length * (ch + gap) + 6
  const state = (d: OpsDay) => d.attendance === 'absent' ? '결석' : d.attendance === 'present' ? '입실' : d.attendance === 'off' ? '예정 없음' : '기록 없음'
  return (
    <div ref={ref} className="v5-plot">
      <p className="v5-key"><span className="v5-key-absent" />결석 <span className="v5-key-unknown" />기록 없음 <span className="v5-key-missing" />계획 미제출</p>
      <svg width={width} height={height} role="group" aria-label={`결석이 있는 학생 ${absent.length}명의 7일 출결`}>
        {days.map((d, i) => { const n = rows.filter((r) => r.days[i].attendance === 'absent').length, sch = rows.filter((r) => r.days[i].attendance === 'absent' || r.days[i].attendance === 'present').length
          return <g key={d.date} role="button" tabIndex={0} aria-pressed={onDay ? selectedDay === i : undefined} aria-label={`${md(d.date)} 결석 ${n}명, 등원 예정 ${sch}명`} onClick={() => onDay?.(i)} onKeyDown={(e) => act(e, () => onDay?.(i))} className="v5-day-hit">
            {selectedDay === i && <rect x={left + cw * i + 1} y={0} width={cw - 2} height={height} rx={6} className="v5-col-sel" />}
            <text x={left + cw * i + cw / 2} y={12} textAnchor="middle" className="v5-tick">{md(d.date)}</text><text x={left + cw * i + cw / 2} y={27} textAnchor="middle" className="v5-tick">{d.dow}</text>
            <text x={left + cw * i + cw / 2} y={44} textAnchor="middle" className="v5-head-num">{n}명</text>
          </g> })}
        {list.map((r, k) => { const yy = top + k * (ch + gap), long = run(r) >= 4
          return <g key={r.student.studentId}>
            <text x={left - 8} y={yy + 12} textAnchor="end" className={long ? 'v5-row-name v5-hot-name' : 'v5-row-name'} onClick={() => onStudent?.(r)} role="button" tabIndex={0} aria-label={`${r.student.studentName}: ${r.days.map((d) => `${md(d.date)} ${state(d)}${d.submission === 'missing' ? ' 미제출' : ''}`).join(', ')}`} onKeyDown={(e) => act(e, () => onStudent?.(r))}>{r.student.studentName}</text>
            {r.days.map((d, i) => { const x = left + cw * i + 3, w = cw - 6
              return <g key={d.date} aria-hidden="true"><rect x={x} y={yy} width={w} height={ch} rx={3} className={`v5-cell v5-cell-${d.attendance}`} />
                {d.submission === 'missing' && <line x1={x} x2={x + w} y1={yy + ch + 1.5} y2={yy + ch + 1.5} className="v5-missing-line" />}</g> })}
          </g> })}
      </svg>
      <p className="v5-matrix-foot">
        {limit && absent.length > limit && <button type="button" className="v5-mini" aria-expanded={all} onClick={() => setAll(!all)}>{all ? '줄이기' : `나머지 ${absent.length - limit}명 보기`}</button>}
        <span className="v5-muted">결석 없음 {rows.length - absent.length}명{missOnly.length ? ` · 결석 없이 미제출 2일 이상 ${missOnly.length}명` : ''}</span>
        {missOnly.length > 0 && onStudent && <span className="v5-wrap">{missOnly.slice(0, 8).map((r) => <button key={r.student.studentId} type="button" className="v5-mini" onClick={() => onStudent(r)}>{r.student.studentName}</button>)}</span>}
      </p>
    </div>
  )
}

/** 학생 7일 아령: 평소 ○ – 실제 ●. 기준을 넘은 날만 선을 강조. 날짜에 초점·마우스를 두면 원래 단위 값 */
export function Dumbbell7({ days, usual, actual, format, exact, domain, warn, label, ticks, mark }: { days: OpsDay[]; usual: (d: OpsDay) => number | null; actual: (d: OpsDay) => number | null; format: (v: number) => string; exact: (d: OpsDay) => string; domain: [number, number]; warn: (u: number, a: number) => boolean; label: string; ticks: number[]; mark?: (d: OpsDay) => string }) {
  const [ref, width] = usePlotWidth()
  const [tip, setTip] = useState<Tip | null>(null)
  const height = 176, left = 54, top = 14, bottom = 28, H = height - top - bottom, colW = (width - left - 8) / 7
  const y = (v: number) => top + H - ((Math.max(domain[0], Math.min(domain[1], v)) - domain[0]) / (domain[1] - domain[0])) * H
  return (
    <div ref={ref} className="v5-plot v5-rel" onMouseLeave={() => setTip(null)}>
      <p className="v5-key"><span className="v5-key-usual" />평소 <span className="v5-key-actual" />실제</p>
      <svg width={width} height={height} role="group" aria-label={label}>
        {ticks.map((t) => <g key={t} aria-hidden="true"><line x1={left} x2={width - 8} y1={y(t)} y2={y(t)} className="v5-grid" /><text x={left - 6} y={y(t) + 4} textAnchor="end" className="v5-tick">{format(t)}</text></g>)}
        {days.map((d, i) => { const cx = left + colW * i + colW / 2, u = usual(d), a = actual(d), hot = u !== null && a !== null && warn(u, a), m = mark?.(d)
          const text = `${md(d.date)} ${d.dow} · ${exact(d)}`
          return <g key={d.date} role="img" tabIndex={0} aria-label={text} onFocus={() => setTip({ x: cx, y: y(a ?? u ?? domain[0]), text })} onBlur={() => setTip(null)} onMouseEnter={() => setTip({ x: cx, y: y(a ?? u ?? domain[0]), text })} className="v5-day-hit">
            <rect x={cx - colW / 2} y={top} width={colW} height={H} fill="transparent" />
            {u !== null && a !== null && <line x1={cx} x2={cx} y1={y(u)} y2={y(a)} className={hot ? 'v5-db-hot' : 'v5-db'} />}
            {u !== null && <circle cx={cx} cy={y(u)} r={5} className="v5-db-usual" />}
            {a !== null && <circle cx={cx} cy={y(a)} r={a === u ? 3 : 5} className="v5-db-actual" />}
            {m && <text x={cx} y={top + 12} textAnchor="middle" className="v5-hot-name">{m}</text>}
            {d.attendance === 'absent' && <text x={cx} y={top + H - 4} textAnchor="middle" className="v5-muted-svg">결석</text>}
            <text x={cx} y={height - 8} textAnchor="middle" className="v5-tick">{md(d.date)} {d.dow}</text>
          </g> })}
      </svg>
      <TipBox tip={tip} width={width} />
    </div>
  )
}

export function StudyDumbbell({ s, dropPercent }: { s: CareRow; dropPercent: number }) {
  const max = Math.max(120, ...s.days.map((d) => Math.max(d.minutes ?? 0, d.usualMinutes ?? 0)))
  const top = Math.ceil(max / 60) * 60
  return <Dumbbell7 days={s.days} usual={(d) => d.usualMinutes} actual={(d) => d.minutes} format={(v) => `${Math.round(v / 60)}시간`} domain={[0, top]} ticks={[0, top / 2, top]}
    exact={(d) => `실제 ${d.minutes === null ? '기록 없음' : hours(d.minutes)}, 평소 ${d.usualMinutes === null ? '없음' : hours(d.usualMinutes)}${d.minutes !== null && d.usualMinutes ? `, 평소 대비 ${Math.round((d.minutes - d.usualMinutes) / d.usualMinutes * 100)}%` : ''}`}
    warn={(u, a) => u > 0 && (a - u) / u * 100 <= -dropPercent} label={`${s.student.studentName} 7일 학습 시간, 평소와 실제`} />
}
export function StartDumbbell({ s, shift }: { s: CareRow; shift: number }) {
  const v = s.days.flatMap((d) => [d.start, d.usualStart].filter((x): x is number => x !== null))
  if (!v.length) return <p className="v5-muted">입실 기록 없음</p>
  const lo = Math.floor((Math.min(...v) - 30) / 60) * 60, hi = Math.ceil((Math.max(...v) + 30) / 60) * 60
  const diff = (d: OpsDay) => d.start !== null && d.usualStart !== null ? d.start - d.usualStart : null
  return <Dumbbell7 days={s.days} usual={(d) => d.usualStart} actual={(d) => d.start} format={(m) => clock(m)} domain={[lo, hi]} ticks={[lo, (lo + hi) / 2, hi]}
    exact={(d) => `입실 ${d.start === null ? '없음' : clock(d.start)}, 평소 ${d.usualStart === null ? '없음' : clock(d.usualStart)}${diff(d) !== null ? `, ${diff(d)! > 0 ? '+' : ''}${Math.round(diff(d)!)}분` : ''}`}
    mark={(d) => { const x = diff(d); return x !== null && x >= shift ? `+${Math.round(x)}분` : '' }}
    warn={(u, a) => a - u >= shift} label={`${s.student.studentName} 7일 입실 시각, 평소와 실제`} />
}

/** 진행률: 계획 칸 안에 실제를 채운다. 계획 없음 = 빈 점선 칸, 기록 없음 = 칸 없음, 100% 넘음 = 위에 ▲ */
export function Progress7({ days }: { days: OpsDay[] }) {
  return (
    <div className="v5-progress" role="list" aria-label="날짜별 진행률">
      {days.map((d) => { const rate = d.planned && d.actual !== null ? d.actual / d.planned : null, noPlan = (d.planned === 0 || d.planned === null) && d.attendance === 'present'
        const text = rate !== null ? `${Math.round(rate * 100)}% (실제 ${hours(d.actual)} / 계획 ${hours(d.planned)})` : noPlan ? '계획 없음' : '기록 없음'
        return <div role="listitem" key={d.date} tabIndex={0} className="v5-progress-col" aria-label={`${md(d.date)} ${text}`} data-tip={`${md(d.date)} ${text}`}>
          <span className="v5-progress-over">{rate !== null && rate > 1 ? '▲' : ''}</span>
          {rate !== null ? <span className="v5-progress-track"><span className={`v5-progress-fill${rate < 0.7 ? ' v5-progress-low' : ''}`} style={{ height: `${Math.min(100, rate * 100)}%` }} /></span>
            : noPlan ? <span className="v5-progress-track v5-progress-noplan" /> : <span className="v5-progress-none" />}
          <span className="v5-tick">{md(d.date)}</span>
        </div> })}
    </div>
  )
}

/** 과목 비중: 계획 % ○ → 실제 % ●, 차이 10%p 이상만 숫자 */
export function SubjectDumbbell({ s }: { s: CareRow }) {
  if (!s.subjects.length) return <p className="v5-muted">과목 기록 없음</p>
  const max = Math.max(50, ...s.subjects.flatMap((x) => [x.plannedShare ?? 0, x.actualShare ?? 0]))
  return (
    <div className="v5-subjects" role="list">
      <p className="v5-key"><span className="v5-key-usual" />계획 <span className="v5-key-actual" />실제</p>
      {s.subjects.map((x) => { const p = x.plannedShare ?? 0, a = x.actualShare ?? 0, gap = a - p, big = Math.abs(gap) >= 10
        const text = `${x.name} 계획 ${p.toFixed(1)}% → 실제 ${a.toFixed(1)}% (${hours(x.plannedMinutes)} → ${hours(x.actualMinutes)})`
        return <div role="listitem" tabIndex={0} key={x.name} className="v5-subject" aria-label={text} data-tip={text}>
          <span className="v5-subject-name">{x.name}</span>
          <span className="v5-subject-track">
            <span className={big ? 'v5-subject-line v5-db-hot' : 'v5-subject-line'} style={{ left: `${Math.min(p, a) / max * 100}%`, width: `${Math.abs(gap) / max * 100}%` }} />
            <span className="v5-subject-plan" style={{ left: `${p / max * 100}%` }} />
            <span className="v5-subject-actual" style={{ left: `${a / max * 100}%` }} />
          </span>
          <span className="v5-subject-gap">{big ? `${gap > 0 ? '+' : '−'}${Math.abs(gap).toFixed(1)}%p` : ''}</span>
        </div> })}
    </div>
  )
}

/** 표 칸 사이를 화살표로 옮기는 초점(표 하나 = Tab 한 번) */
function useGridNav() {
  return (e: React.KeyboardEvent<HTMLElement>) => {
    const cell = (e.target as HTMLElement).closest('[data-cell]') as HTMLElement | null
    if (!cell) return
    const [r, c] = cell.dataset.cell!.split(',').map(Number)
    const d = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[e.key]
    if (!d) return
    e.preventDefault()
    const next = e.currentTarget.querySelector<HTMLElement>(`[data-cell="${r + d[0]},${c + d[1]}"]`)
    if (next) { cell.tabIndex = -1; next.tabIndex = 0; next.focus() }
  }
}

/** 35일 달력: 결석 = 채움. 같은 요일 반복이면 그 요일 머리 강조. 칸마다 화살표로 날짜·상태 확인 */
export function Month35({ s }: { s: CareRow }) {
  const nav = useGridNav()
  const order = ['월', '화', '수', '목', '금', '토', '일']
  const cells: (OpsDay | null)[] = [...Array(order.indexOf(s.history35[0].dow)).fill(null), ...s.history35]
  while (cells.length % 7) cells.push(null)
  const rep = s.weekdayAbsence?.dow
  const state = (d: OpsDay) => d.attendance === 'absent' ? '결석' : d.attendance === 'present' ? '입실' : d.attendance === 'off' ? '예정 없음' : '기록 없음'
  let first = true
  return (
    <table className="v5-month" aria-label="35일 출결" onKeyDown={nav}>
      <thead><tr>{order.map((d) => <th key={d} scope="col" className={d === rep ? 'v5-rep' : ''}>{d}{d === rep ? ` ${s.weekdayAbsence!.absent}/${s.weekdayAbsence!.weeks}` : ''}</th>)}</tr></thead>
      <tbody>{Array.from({ length: cells.length / 7 }, (_, w) => <tr key={w}>{cells.slice(w * 7, w * 7 + 7).map((d, i) => { if (!d) return <td key={i} className="v5-month-empty" />
        const t = first ? 0 : -1; first = false
        return <td key={i} data-cell={`${w},${i}`} tabIndex={t} className={`v5-cell-${d.attendance}`} data-tip={`${md(d.date)} ${state(d)}${d.submission === 'missing' ? ', 계획 미제출' : ''}`} aria-label={`${md(d.date)} ${state(d)}${d.submission === 'missing' ? ', 계획 미제출' : ''}`} /> })}</tr>)}</tbody>
    </table>
  )
}

/** 학생 비전(예시): 관찰 4개 × 7일. 칸 = 관찰 비율 막대(판단 불가는 빗금), 사진 없음 = 빈 칸, 분석 실패 = ×, 지원 안 함 = 사선.
    줄 끝에 7일 합(관찰/분석). 칸마다 화살표로 정확한 장수 */
export function VisionMini({ s }: { s: CareRow }) {
  const nav = useGridNav()
  const sum = sumVision(s.vision)
  return (
    <div>
      <p className="v5-key"><span className="v5-key-actual-bar" />관찰 <span className="v5-key-unknown-bar" />판단 불가</p>
      <table className="v5-vision" aria-label="비전 관찰 7일(예시)" onKeyDown={nav}>
        <thead><tr><th scope="col"><span className="lh-visually-hidden">관찰</span></th>{s.days.map((d) => <th key={d.date} scope="col">{md(d.date)}</th>)}<th scope="col">7일</th></tr></thead>
        <tbody>{VISION_AXES.map((a, ri) => { const t = sum.axes[a]
          return <tr key={a}><th scope="row">{visionAxisLabel[a]}</th>{s.vision.map((v, i) => {
            const x = axisOfDay(v, a)
            const kind = v.photosReceived === 0 ? 'none' : v.analyzedPhotos === 0 ? 'fail' : v.unsupportedAxes.includes(a) ? 'unsup' : 'ok'
            const text = `${md(s.days[i].date)} ${visionAxisLabel[a]}: ${kind === 'none' ? '사진 없음' : kind === 'fail' ? `분석 실패 ${v.failedPhotos}장` : kind === 'unsup' ? `지원 안 함 (${v.analyzedPhotos}장)` : `분석 ${x.analyzed}장 중 관찰 ${x.yes}장, 판단 불가 ${x.unknown}장${v.failedPhotos ? `, 분석 실패 ${v.failedPhotos}장` : ''}`}`
            return <td key={i} data-cell={`${ri},${i}`} tabIndex={ri === 0 && i === 0 ? 0 : -1} aria-label={text} data-tip={text}>
              {kind === 'ok' ? <span className="v5-vision-bar"><span className="v5-vision-unk" style={{ height: `${(x.unknown / x.analyzed) * 100}%` }} /><span className="v5-vision-yes" style={{ height: `${(x.yes / x.analyzed) * 100}%` }} /></span>
                : kind === 'none' ? <span className="v5-vision-none" /> : kind === 'fail' ? <span className="v5-vision-fail">×</span> : <span className="v5-vision-unsup" />}
            </td> })}
            <td className="v5-vision-sum" data-cell={`${ri},7`} tabIndex={-1} aria-label={`${visionAxisLabel[a]} 7일: 분석 ${t.analyzed}장 중 관찰 ${t.yes}장, 판단 불가 ${t.unknown}장, 지원 안 함 ${t.unsupportedPhotos}장, 분석 실패 ${sum.failed}장`} data-tip={`7일: 분석 ${t.analyzed}장 중 관찰 ${t.yes}장 · 판단 불가 ${t.unknown}장 · 지원 안 함 ${t.unsupportedPhotos}장 · 분석 실패 ${sum.failed}장`}>{t.analyzed ? `${Math.round((t.yes / t.analyzed) * 100)}%` : '—'}</td>
          </tr> })}</tbody>
      </table>
    </div>
  )
}

/** 학습관 비전: 관찰 4개를 같은 날짜 열의 작은 분포 점 그림 4줄로. 머리 숫자 = 사진 합산 비율, 점 = 학생별 비율, 분석 10장 미만은 빈 원. 강조 없음 */
export function VisionSwarms({ rows, pools, onStudent, onDay, selectedDay }: { rows: CareRow[]; pools: { [A in VisionAxis]: { photoShare: number | null; yes: number; analyzed: number; unsupportedPhotos: number; unsupportedStudents: number } }[]; onStudent?: (r: CareRow) => void; onDay?: (i: number) => void; selectedDay?: number | null }) {
  return (
    <div className="v5-vision-rows">
      {VISION_AXES.map((axis) => (
        <div key={axis} className="v5-vision-row">
          <p className="v5-axis-name">{visionAxisLabel[axis]}</p>
          <DaySwarm rows={rows} label={`${visionAxisLabel[axis]} 학생별 사진 비율(예시)`} domain={[0, 100]} ticks={[0, 50, 100]} format={(v) => `${Math.round(v)}%`} height={190}
            value={(r, i) => { const x = axisOfDay(r.vision[i], axis); return x.analyzed ? (x.yes / x.analyzed) * 100 : null }}
            detail={(r, i) => { const v = r.vision[i], x = axisOfDay(v, axis); return v.photosReceived === 0 ? '사진 없음' : v.analyzedPhotos === 0 ? `분석 실패 ${v.failedPhotos}장` : v.unsupportedAxes.includes(axis) ? '지원 안 함' : `분석 ${x.analyzed}장 중 관찰 ${x.yes}장, 판단 불가 ${x.unknown}장` }}
            head={(i) => { const p = pools[i][axis]; return p.photoShare === null ? '—' : `${Math.round(p.photoShare * 100)}%` }}
            sample={(r, i) => axisOfDay(r.vision[i], axis).analyzed} onStudent={onStudent} onDay={onDay} selectedDay={selectedDay} />
          {pools.some((p) => p[axis].unsupportedPhotos) && <p className="v5-muted">지원 안 함: {pools.map((p, i) => p[axis].unsupportedPhotos ? `${md(rows[0].days[i].date)} ${p[axis].unsupportedStudents}명 ${p[axis].unsupportedPhotos}장` : '').filter(Boolean).join(' · ')}</p>}
        </div>))}
    </div>
  )
}

/** 학생별 7일 값 한 줄 분포(가로 점 그림). 축 밖 값은 양 끝 띠에 모은다. 점 마우스·초점 시 정확값 */
export function WeekStrip({ rows, value, detail, domain, format, warn, label, onStudent, baseline }: { rows: CareRow[]; value: (r: CareRow) => number | null; detail: (r: CareRow) => string; domain: [number, number]; format: (v: number) => string; warn?: (v: number) => boolean; label: string; onStudent?: (r: CareRow) => void; baseline?: number }) {
  const [ref, width] = usePlotWidth()
  const [tip, setTip] = useState<Tip | null>(null)
  const [idx, setIdx] = useState(-1)
  const rail = 22, height = 130, left = 8 + rail, right = 8 + rail, mid = 58
  const x = (v: number) => left + ((Math.max(domain[0], Math.min(domain[1], v)) - domain[0]) / (domain[1] - domain[0])) * (width - left - right)
  const pts = rows.flatMap((r) => { const v = value(r); return v === null ? [] : [{ r, v }] })
  const vals = pts.map((p) => p.v).sort((a, b) => a - b)
  // 가로 분포는 x가 값 위치이므로 pack을 축을 바꿔 쓴다(값 → 세로 좌표로 넣고 결과를 뒤집음)
  const inside = pts.filter((p) => p.v >= domain[0] && p.v <= domain[1]), lowOut = pts.filter((p) => p.v < domain[0]), highOut = pts.filter((p) => p.v > domain[1])
  const fit = packFit(inside.map((p) => ({ item: p, y: x(p.v) })), mid, 44, 2.6, 1.8, 0)
  const packed = fit.points.filter((p) => p.packed).map((p) => ({ ...p, px: p.y, py: p.x }))
  const wextra = new Map<number, { x: number; n: number }>()
  for (const p of fit.points) if (!p.packed) { const k = Math.round(p.y / 8); const e = wextra.get(k) ?? { x: p.y, n: 0 }; e.n++; wextra.set(k, e) }
  const railed = (list: typeof pts, px: number) => packFit(list.map((p) => ({ item: p, y: mid })), px, rail / 2 - 2, 2.6, 1.8, 0).points.filter((p) => p.packed).map((p) => ({ ...p, px: p.x, py: p.y }))
  const all = [...packed, ...railed(lowOut, left - rail / 2), ...railed(highOut, width - right + rail / 2)]
  const order = [...all].sort((a, b) => Math.abs(b.item.v - (baseline ?? 0)) - Math.abs(a.item.v - (baseline ?? 0)))
  const show = (p: (typeof all)[number]) => setTip({ x: p.px, y: p.py, text: `${p.item.r.student.studentName} · ${detail(p.item.r)}` })
  const hot = pts.filter((p) => warn && isHotRow(p.r) && warn(p.v)).length
  return (
    <div ref={ref} className="v5-plot v5-rel" onMouseLeave={() => setTip(null)}>
      <svg width={width} height={height} role="group" tabIndex={0} aria-label={`${label}: 학생 ${vals.length}명${vals.length ? `, 가운데 값 ${format(quant(vals, 0.5))}, 가운데 절반 ${format(quant(vals, 0.25))}~${format(quant(vals, 0.75))}` : ''}. 위아래 화살표로 학생`}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const k = Math.max(0, Math.min(order.length - 1, idx + (e.key === 'ArrowDown' ? 1 : -1))); setIdx(k); if (order[k]) show(order[k]) } else if (e.key === 'Enter' && order[idx]) onStudent?.(order[idx].item.r) }}
        onBlur={() => { setIdx(-1); setTip(null) }} className="v5-day-hit">
        {baseline !== undefined && <><line x1={x(baseline)} x2={x(baseline)} y1={8} y2={height - 20} className="v5-axis-base" /><text x={x(baseline)} y={height - 6} textAnchor="middle" className="v5-tick">평소</text></>}
        <text x={left} y={height - 6} className="v5-tick">{format(domain[0])}</text><text x={width - right} y={height - 6} textAnchor="end" className="v5-tick">{format(domain[1])}</text>
        {lowOut.length > 0 && <text x={left - rail / 2} y={12} textAnchor="middle" className="v5-rail-num">◀{lowOut.length}</text>}
        {highOut.length > 0 && <text x={width - right + rail / 2} y={12} textAnchor="middle" className="v5-rail-num">{highOut.length}▶</text>}
        {vals.length > 0 && <rect x={x(quant(vals, 0.25))} y={14} width={Math.max(1, x(quant(vals, 0.75)) - x(quant(vals, 0.25)))} height={88} rx={3} className="v5-iqr" />}
        {[...wextra.values()].map((e, k) => <text key={k} x={e.x} y={height - 22} textAnchor="middle" className="v5-rail-num">+{e.n}</text>)}
        {all.map((p) => { const out = p.item.v < domain[0] || p.item.v > domain[1]; return out ? <path key={p.item.r.student.studentId} d={`M${p.px - 3.5},${p.py - 3} L${p.px + 3.5},${p.py - 3} L${p.px},${p.py + 3} Z`} className="v5-dot-over" onMouseEnter={() => show(p)} onClick={() => onStudent?.(p.item.r)} /> : <circle key={p.item.r.student.studentId} cx={p.px} cy={p.py} r={fit.r} className={warn && isHotRow(p.item.r) && warn(p.item.v) ? 'v5-dot-hot' : 'v5-dot'} onMouseEnter={() => show(p)} onClick={() => onStudent?.(p.item.r)} /> })}
        {vals.length > 0 && <line x1={x(quant(vals, 0.5))} x2={x(quant(vals, 0.5))} y1={18} y2={98} className="v5-median" />}
        {order[idx] && <circle cx={order[idx].px} cy={order[idx].py} r={6} className="v5-dot-focus" />}
      </svg>
      {hot > 0 && <p className="v5-hot-more-p">기준 넘음 {hot}명</p>}
      <TipBox tip={tip} width={width} />
    </div>
  )
}

/** 한눈에 보기: 지표 5개 × 7일. 칸 진하기 = 지표 안에서 그날 값의 상대 크기(행마다 따로), 칸 안내에 정확값 */
export interface StripRow { key: string; label: string; head: string; cells: { v: number | null; text: string }[]; onPick?: () => void; selected?: boolean }
export function OverviewStrip({ rows, dates }: { rows: StripRow[]; dates: { date: string; dow: string }[] }) {
  const nav = useGridNav()
  return (
    <table className="v5-strip" aria-label="학습관 지표 한눈에 보기" onKeyDown={nav}>
      <thead><tr><th scope="col"><span className="lh-visually-hidden">지표</span></th>{dates.map((d) => <th key={d.date} scope="col">{md(d.date)} {d.dow}</th>)}<th scope="col">최근 7일</th></tr></thead>
      <tbody>{rows.map((r, ri) => { const max = Math.max(...r.cells.map((c) => c.v ?? 0)) || 1
        return <tr key={r.key} className={r.selected ? 'v5-strip-sel' : ''}>
          <th scope="row">{r.onPick ? <button type="button" className="v5-link" aria-pressed={r.selected} onClick={r.onPick}>{r.label}</button> : r.label}</th>
          {r.cells.map((c, i) => <td key={i} data-cell={`${ri},${i}`} tabIndex={ri === 0 && i === 0 ? 0 : -1} aria-label={`${md(dates[i].date)} ${r.label}: ${c.text}`} data-tip={`${md(dates[i].date)} ${c.text}`}><span className="v5-strip-cell" style={{ opacity: c.v === null ? 0.06 : 0.12 + (c.v / max) * 0.88 }} /></td>)}
          <td className="v5-strip-head">{r.head}</td>
        </tr> })}</tbody>
    </table>
  )
}

/** data-tip 속성이 있는 요소에 마우스·초점이 가면 안내 상자를 보인다(페이지에 하나) */
export function TipLayer({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)
  const pick = (e: React.SyntheticEvent) => {
    const el = (e.target as HTMLElement).closest('[data-tip]') as HTMLElement | null
    if (!el) return setTip(null)
    const r = el.getBoundingClientRect()
    setTip({ x: r.left + r.width / 2, y: r.top, text: el.dataset.tip! })
  }
  return (
    <div onMouseOver={pick} onFocus={pick} onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}>
      {children}
      {tip && <div className="v5-tip v5-tip-fixed" role="status" style={{ left: Math.min(tip.x, window.innerWidth - 280), top: Math.max(8, tip.y - 40) }}>{tip.text}</div>}
    </div>
  )
}
