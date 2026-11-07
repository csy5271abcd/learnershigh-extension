// 시안 A–D 공통 그래프(representation-v5.md). 모양이 먼저, 숫자는 머리 숫자·극단값·선택 대상에만.
// 정확한 값은 점·칸의 안내(title)와 학생 상세에서 본다. SVG 좌표는 실제 픽셀이라 글자가 줄어들지 않는다.
import { usePlotWidth } from '../../components/weekly/usePlotWidth.ts'
import { hours, clock, type OpsDay } from './model.ts'
import { md, type CareRow } from './useCareData.ts'
import { VISION_AXES, visionAxisLabel, axisOfDay, type VisionAxis } from './visionExample.ts'

const quant = (s: number[], q: number) => { const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo) }
const isHotRow = (r: CareRow) => r.status === 'check' || r.status === 'recheck' || r.status === 'managed'
const key = (e: React.KeyboardEvent, f: () => void) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f() } }

interface SwarmProps {
  rows: CareRow[]
  value: (r: CareRow, i: number) => number | null
  /** 값 축 범위. 넘는 값은 끝에 세모로 모은다 */
  domain: [number, number]
  /** 기준선(평소). 없으면 그리지 않음 */
  baseline?: number
  format: (v: number) => string
  /** 이 값이면 강조(관리 대상일 때만) */
  warn: (v: number) => boolean
  height?: number
  /** 점 크기(예: 사진 장수). 없으면 고정 */
  size?: (r: CareRow, i: number) => number
  selectedDay?: number | null
  onDay?: (i: number) => void
  onStudent?: (r: CareRow) => void
  label: string
  ticks?: number[]
}

/** 날짜별 분포 점 그림: 점 하나 = 학생 한 명. 열마다 가운데 절반 띠와 가운데 값 */
export function DaySwarm({ rows, value, domain, baseline, format, warn, height = 220, size, selectedDay, onDay, onStudent, label, ticks }: SwarmProps) {
  const [ref, width] = usePlotWidth()
  const days = rows[0]?.days ?? []
  const left = 54, right = 8, top = 26, bottom = 26, H = height - top - bottom, colW = (width - left - right) / 7
  const [lo, hi] = domain
  const y = (v: number) => top + H - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * H
  const tickVals = ticks ?? [lo, baseline ?? (lo + hi) / 2, hi]
  return (
    <div ref={ref} className="v5-plot">
      <svg width={width} height={height} role="img" aria-label={label}>
        {tickVals.map((t) => <g key={t}><line x1={left} x2={width - right} y1={y(t)} y2={y(t)} className={t === baseline ? 'v5-axis-base' : 'v5-grid'} /><text x={left - 6} y={y(t) + 4} textAnchor="end" className="v5-tick">{t === baseline ? '평소' : format(t)}</text></g>)}
        {days.map((d, i) => {
          const cx = left + colW * i + colW / 2
          const pts = rows.flatMap((r) => { const v = value(r, i); return v === null ? [] : [{ r, v }] })
          const vals = pts.map((p) => p.v).sort((a, b) => a - b)
          const bins = new Map<number, number>()
          const placed = pts.sort((a, b) => Number(isHotRow(a.r)) - Number(isHotRow(b.r))).map((p) => {
            const yy = y(p.v), k = Math.round(yy / 5), n = bins.get(k) ?? 0; bins.set(k, n + 1)
            const hotP = isHotRow(p.r) && warn(p.v)
            const off = hotP ? -colW * 0.12 - n * 5 : (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 5
            return { ...p, x: cx + Math.max(-colW * 0.44, Math.min(colW * 0.44, off)), y: yy, hot: hotP, over: p.v < lo || p.v > hi }
          })
          const hot = placed.filter((p) => p.hot).sort((a, b) => Math.abs(b.v - (baseline ?? 0)) - Math.abs(a.v - (baseline ?? 0)))
          return (
            <g key={d.date}>
              {selectedDay === i && <rect x={cx - colW / 2 + 2} y={top - 22} width={colW - 4} height={H + 44} className="v5-col-sel" rx={6} />}
              {vals.length > 0 && <rect x={cx - colW * 0.42} y={y(quant(vals, 0.75))} width={colW * 0.84} height={Math.max(1, y(quant(vals, 0.25)) - y(quant(vals, 0.75)))} rx={3} className="v5-iqr"><title>{`${md(d.date)} 학생 가운데 절반 ${format(quant(vals, 0.25))}~${format(quant(vals, 0.75))}`}</title></rect>}
              {placed.map((p) => p.over
                ? <path key={p.r.student.studentId} d={`M${p.x - 4},${p.y + (p.v > hi ? 4 : -4)} L${p.x + 4},${p.y + (p.v > hi ? 4 : -4)} L${p.x},${p.y + (p.v > hi ? -4 : 4)} Z`} className={p.hot ? 'v5-dot-hot' : 'v5-dot-over'} onClick={() => onStudent?.(p.r)}><title>{`${p.r.student.studentName} ${format(p.v)}`}</title></path>
                : <circle key={p.r.student.studentId} cx={p.x} cy={p.y} r={size ? Math.max(1.8, Math.min(4.5, size(p.r, i))) : p.hot ? 3.4 : 2.6} className={p.hot ? 'v5-dot-hot' : 'v5-dot'} onClick={() => onStudent?.(p.r)}><title>{`${p.r.student.studentName} ${format(p.v)}`}</title></circle>)}
              {vals.length > 0 && <><line x1={cx - colW * 0.3} x2={cx + colW * 0.3} y1={y(quant(vals, 0.5))} y2={y(quant(vals, 0.5))} className="v5-median" /><text x={cx} y={top - 8} textAnchor="middle" className="v5-head-num">{format(quant(vals, 0.5))}</text></>}
              {(() => {
                // 강조 학생 이름: 열 오른쪽 절반에 위에서 아래로 겹치지 않게(최대 2명, 나머지는 개수)
                let last = -Infinity
                if (colW < 130) return hot.length ? <text x={cx + colW * 0.47} y={Math.min(top + H - 2, hot[0].y + 4)} textAnchor="end" className="v5-hot-more">{hot.length}명</text> : null
                return hot.slice(0, 2).map((p) => { const yy = Math.min(top + H - 2, Math.max(p.y + 4, last + 14)); last = yy
                  return <text key={p.r.student.studentId} x={cx + colW * 0.47} y={yy} textAnchor="end" className="v5-hot-name" onClick={() => onStudent?.(p.r)}>{p.r.student.studentName}</text> })
              })()}
              {colW >= 130 && hot.length > 2 && <text x={cx + colW * 0.47} y={Math.min(top + H + 12, Math.max(hot[0].y + 4, (hot[1]?.y ?? 0) + 4) + 28)} textAnchor="end" className="v5-hot-more">외 {hot.length - 2}명</text>}
              <g role={onDay ? 'button' : undefined} tabIndex={onDay ? 0 : undefined} aria-pressed={onDay ? selectedDay === i : undefined} aria-label={onDay ? `${md(d.date)} ${label} 학생 보기` : undefined} onClick={() => onDay?.(i)} onKeyDown={(e) => onDay && key(e, () => onDay(i))} className={onDay ? 'v5-day-hit' : ''}>
                <text x={cx} y={height - 6} textAnchor="middle" className="v5-tick">{md(d.date)} {d.dow}</text>
                {onDay && <rect x={cx - colW / 2 + 2} y={height - 22} width={colW - 4} height={20} fill="transparent" />}
              </g>
            </g>)
        })}
      </svg>
    </div>
  )
}

/** 출결 행렬: 결석이 1일 이상인 학생만 행. 결석 = 채운 칸, 기록 없음 = 점선, 계획 미제출 = 칸 아래 선 */
export function AttendanceMatrix({ rows, onStudent, onDay, selectedDay, compact }: { rows: CareRow[]; onStudent?: (r: CareRow) => void; onDay?: (i: number) => void; selectedDay?: number | null; compact?: boolean }) {
  const [ref, width] = usePlotWidth()
  const days = rows[0]?.days ?? []
  const run = (r: CareRow) => { let b = 0, c = 0; for (const d of r.days) { if (d.attendance === 'absent') { c++; b = Math.max(b, c) } else if (d.attendance !== 'off') c = 0 } return b }
  const absent = rows.filter((r) => r.days.some((d) => d.attendance === 'absent'))
    .sort((a, b) => run(b) - run(a) || b.days.filter((d) => d.attendance === 'absent').length - a.days.filter((d) => d.attendance === 'absent').length || a.student.studentName.localeCompare(b.student.studentName, 'ko'))
  const shownRows = compact ? absent.slice(0, 8) : absent
  const left = 92, top = 40, ch = 16, gap = 4, cw = Math.min(64, (width - left - 8) / 7)
  const height = top + shownRows.length * (ch + gap) + 24
  return (
    <div ref={ref} className="v5-plot">
      <p className="v5-key"><span className="v5-key-absent" />결석 <span className="v5-key-unknown" />기록 없음 <span className="v5-key-missing" />계획 미제출</p>
      <svg width={width} height={height} role="img" aria-label={`결석이 있는 학생 ${absent.length}명의 7일 출결`}>
        {days.map((d, i) => { const n = rows.filter((r) => r.days[i].attendance === 'absent').length, sch = rows.filter((r) => r.days[i].attendance === 'absent' || r.days[i].attendance === 'present').length
          return <g key={d.date} role={onDay ? 'button' : undefined} tabIndex={onDay ? 0 : undefined} aria-pressed={onDay ? selectedDay === i : undefined} aria-label={onDay ? `${md(d.date)} 결석 ${n}명 보기` : undefined} onClick={() => onDay?.(i)} onKeyDown={(e) => onDay && key(e, () => onDay(i))} className={onDay ? 'v5-day-hit' : ''}>
            {selectedDay === i && <rect x={left + cw * i + 1} y={0} width={cw - 2} height={height - 20} rx={6} className="v5-col-sel" />}
            <text x={left + cw * i + cw / 2} y={14} textAnchor="middle" className="v5-tick">{md(d.date)} {d.dow}</text>
            <text x={left + cw * i + cw / 2} y={31} textAnchor="middle" className="v5-head-num">{n}명<title>{`${md(d.date)} 결석 ${n}명 / 등원 예정 ${sch}명`}</title></text>
          </g> })}
        {shownRows.map((r, k) => { const yy = top + k * (ch + gap), long = run(r) >= 4
          return <g key={r.student.studentId}>
            <text x={left - 8} y={yy + 12} textAnchor="end" className={long ? 'v5-row-name v5-hot-name' : 'v5-row-name'} onClick={() => onStudent?.(r)} role={onStudent ? 'button' : undefined} tabIndex={onStudent ? 0 : undefined} onKeyDown={(e) => onStudent && key(e, () => onStudent(r))}>{r.student.studentName}</text>
            {r.days.map((d, i) => { const x = left + cw * i + 3, w = cw - 6
              return <g key={d.date}><rect x={x} y={yy} width={w} height={ch} rx={3} className={`v5-cell v5-cell-${d.attendance}`}><title>{`${r.student.studentName} ${md(d.date)} ${d.attendance === 'absent' ? '결석' : d.attendance === 'present' ? '입실' : d.attendance === 'off' ? '예정 없음' : '기록 없음'}${d.submission === 'missing' ? ', 계획 미제출' : ''}`}</title></rect>
                {d.submission === 'missing' && <line x1={x} x2={x + w} y1={yy + ch + 1.5} y2={yy + ch + 1.5} className="v5-missing-line" />}</g> })}
          </g> })}
        <text x={0} y={height - 6} className="v5-tick">{compact && absent.length > shownRows.length ? `외 ${absent.length - shownRows.length}명 · ` : ''}결석 없음 {rows.length - absent.length}명</text>
      </svg>
    </div>
  )
}

/** 학생 7일 아령: 평소 ○ – 실제 ●. 크게 줄어든(늘어난) 날만 강조 */
export function Dumbbell7({ days, usual, actual, format, domain, warn, label, ticks }: { days: OpsDay[]; usual: (d: OpsDay) => number | null; actual: (d: OpsDay) => number | null; format: (v: number) => string; domain: [number, number]; warn: (u: number, a: number) => boolean; label: string; ticks: number[] }) {
  const [ref, width] = usePlotWidth()
  const height = 168, left = 54, top = 12, bottom = 26, H = height - top - bottom, colW = (width - left - 8) / 7
  const y = (v: number) => top + H - ((Math.max(domain[0], Math.min(domain[1], v)) - domain[0]) / (domain[1] - domain[0])) * H
  return (
    <div ref={ref} className="v5-plot">
      <p className="v5-key"><span className="v5-key-usual" />평소 <span className="v5-key-actual" />실제</p>
      <svg width={width} height={height} role="img" aria-label={label}>
        {ticks.map((t) => <g key={t}><line x1={left} x2={width - 8} y1={y(t)} y2={y(t)} className="v5-grid" /><text x={left - 6} y={y(t) + 4} textAnchor="end" className="v5-tick">{format(t)}</text></g>)}
        {days.map((d, i) => { const cx = left + colW * i + colW / 2, u = usual(d), a = actual(d), hot = u !== null && a !== null && warn(u, a)
          return <g key={d.date}>
            {u !== null && a !== null && <line x1={cx} x2={cx} y1={y(u)} y2={y(a)} className={hot ? 'v5-db-hot' : 'v5-db'} />}
            {u !== null && <circle cx={cx} cy={y(u)} r={5} className="v5-db-usual"><title>{`${md(d.date)} 평소 ${format(u)}`}</title></circle>}
            {a !== null && <circle cx={cx} cy={y(a)} r={5} className="v5-db-actual"><title>{`${md(d.date)} 실제 ${format(a)}`}</title></circle>}
            {d.attendance === 'absent' && <text x={cx} y={top + H - 4} textAnchor="middle" className="v5-hot-name">결석</text>}
            <text x={cx} y={height - 6} textAnchor="middle" className="v5-tick">{md(d.date)} {d.dow}</text>
          </g> })}
      </svg>
    </div>
  )
}

export function StudyDumbbell({ s, dropPercent }: { s: CareRow; dropPercent: number }) {
  const max = Math.max(120, ...s.days.map((d) => Math.max(d.minutes ?? 0, d.usualMinutes ?? 0)))
  const top = Math.ceil(max / 60) * 60
  return <Dumbbell7 days={s.days} usual={(d) => d.usualMinutes} actual={(d) => d.minutes} format={(v) => `${Math.round(v / 60 * 10) / 10}시간`} domain={[0, top]} ticks={[0, top / 2, top]} warn={(u, a) => u > 0 && (a - u) / u * 100 <= -dropPercent} label={`${s.student.studentName} 7일 학습 시간, 평소와 실제`} />
}
export function StartDumbbell({ s, shift }: { s: CareRow; shift: number }) {
  const v = s.days.flatMap((d) => [d.start, d.usualStart].filter((x): x is number => x !== null))
  if (!v.length) return <p className="v5-muted">입실 기록 없음</p>
  const lo = Math.floor((Math.min(...v) - 30) / 60) * 60, hi = Math.ceil((Math.max(...v) + 30) / 60) * 60
  // 시각 축은 아래가 이른 시각이 되도록 그대로 둔다(늦을수록 위)
  return <Dumbbell7 days={s.days} usual={(d) => d.usualStart} actual={(d) => d.start} format={(m) => clock(m)} domain={[lo, hi]} ticks={[lo, (lo + hi) / 2, hi]} warn={(u, a) => a - u >= shift} label={`${s.student.studentName} 7일 입실 시각, 평소와 실제`} />
}

/** 진행률: 날짜마다 계획 길이의 칸 안에 실제를 채운다 */
export function Progress7({ days }: { days: OpsDay[] }) {
  return (
    <div className="v5-progress">
      {days.map((d) => { const rate = d.planned && d.actual !== null ? d.actual / d.planned : null
        return <div key={d.date} className="v5-progress-col" title={rate === null ? `${md(d.date)} 계획 없음` : `${md(d.date)} ${Math.round(rate * 100)}% (실제 ${hours(d.actual)} / 계획 ${hours(d.planned)})`}>
          <span className="v5-progress-track">{rate !== null && <span className={`v5-progress-fill${rate < 0.7 ? ' v5-progress-low' : ''}`} style={{ height: `${Math.min(100, rate * 100)}%` }} />}</span>
          <span className="v5-tick">{rate !== null && rate < 0.7 ? `${Math.round(rate * 100)}%` : ''}</span>
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
      {s.subjects.map((x) => { const p = x.plannedShare ?? 0, a = x.actualShare ?? 0, gap = a - p, big = Math.abs(gap) >= 10
        return <div role="listitem" key={x.name} className="v5-subject" title={`${x.name} 계획 ${p.toFixed(1)}% → 실제 ${a.toFixed(1)}% (${hours(x.plannedMinutes)} → ${hours(x.actualMinutes)})`}>
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

/** 35일 달력: 결석 = 채움. 같은 요일 반복이면 그 요일 머리 강조 */
export function Month35({ s }: { s: CareRow }) {
  const order = ['월', '화', '수', '목', '금', '토', '일']
  const cells: (OpsDay | null)[] = [...Array(order.indexOf(s.history35[0].dow)).fill(null), ...s.history35]
  while (cells.length % 7) cells.push(null)
  const rep = s.weekdayAbsence?.dow
  return (
    <table className="v5-month" aria-label="35일 출결">
      <thead><tr>{order.map((d) => <th key={d} scope="col" className={d === rep ? 'v5-hot-name' : ''}>{d}{d === rep ? ` ${s.weekdayAbsence!.absent}/${s.weekdayAbsence!.weeks}` : ''}</th>)}</tr></thead>
      <tbody>{Array.from({ length: cells.length / 7 }, (_, w) => <tr key={w}>{cells.slice(w * 7, w * 7 + 7).map((d, i) => d
        ? <td key={i} className={`v5-cell-${d.attendance}`} title={`${md(d.date)} ${d.attendance === 'absent' ? '결석' : d.attendance === 'present' ? '입실' : d.attendance === 'off' ? '예정 없음' : '기록 없음'}${d.submission === 'missing' ? ', 계획 미제출' : ''}`}><span className="lh-visually-hidden">{md(d.date)} {d.attendance === 'absent' ? '결석' : ''}</span></td>
        : <td key={i} className="v5-month-empty" />)}</tr>)}</tbody>
    </table>
  )
}

/** 학생 비전(예시): 관찰 4개 × 7일 작은 막대(사진 비율). 사진 없음·분석 실패·지원 안 함은 빈 칸 */
export function VisionMini({ s }: { s: CareRow }) {
  return (
    <table className="v5-vision" aria-label="비전 관찰 7일(예시)">
      <thead><tr><th scope="col"><span className="lh-visually-hidden">관찰</span></th>{s.days.map((d) => <th key={d.date} scope="col">{md(d.date)}</th>)}</tr></thead>
      <tbody>{VISION_AXES.map((a) => <tr key={a}><th scope="row">{visionAxisLabel[a]}</th>{s.vision.map((v, i) => {
        const x = axisOfDay(v, a), share = x.analyzed ? x.yes / x.analyzed : null
        const why = v.photosReceived === 0 ? '사진 없음' : v.analyzedPhotos === 0 ? `분석 실패 ${v.failedPhotos}장` : v.unsupportedAxes.includes(a) ? '지원 안 함' : `분석 ${x.analyzed}장 중 ${x.yes}장, 판단 불가 ${x.unknown}장`
        return <td key={i} title={`${md(s.days[i].date)} ${visionAxisLabel[a]}: ${why}`}>{share === null ? <span className="v5-vision-none" /> : <span className="v5-vision-bar"><span style={{ height: `${Math.max(4, share * 100)}%` }} /></span>}</td>
      })}</tr>)}</tbody>
    </table>
  )
}

/** 학습관 비전: 관찰 4개 작은 분포 점 그림(점 크기 = 분석 장수) */
export function VisionSwarms({ rows, axis, onAxis, onStudent, onDay, selectedDay }: { rows: CareRow[]; axis: VisionAxis; onAxis: (a: VisionAxis) => void; onStudent?: (r: CareRow) => void; onDay?: (i: number) => void; selectedDay?: number | null }) {
  return (
    <div>
      <div className="v5-seg" role="group" aria-label="비전 관찰 항목">{VISION_AXES.map((a) => <button key={a} type="button" aria-pressed={axis === a} onClick={() => onAxis(a)}>{visionAxisLabel[a]}</button>)}</div>
      <DaySwarm rows={rows} label={`${visionAxisLabel[axis]} 사진 비율(예시)`} domain={[0, 100]} ticks={[0, 50, 100]} format={(v) => `${Math.round(v)}%`} warn={(v) => v >= 30} height={190}
        value={(r, i) => { const x = axisOfDay(r.vision[i], axis); return x.analyzed ? (x.yes / x.analyzed) * 100 : null }}
        size={(r, i) => Math.sqrt(axisOfDay(r.vision[i], axis).analyzed) * 0.8} onStudent={onStudent} onDay={onDay} selectedDay={selectedDay} />
    </div>
  )
}

/** 학생별 7일 값 한 줄 분포(가로 점 그림). C의 분포 우선 화면 */
export function WeekStrip({ rows, value, domain, format, warn, label, onStudent, baseline }: { rows: CareRow[]; value: (r: CareRow) => number | null; domain: [number, number]; format: (v: number) => string; warn: (v: number) => boolean; label: string; onStudent?: (r: CareRow) => void; baseline?: number }) {
  const [ref, width] = usePlotWidth()
  const height = 96, left = 8, right = 8, mid = 46
  const x = (v: number) => left + ((Math.max(domain[0], Math.min(domain[1], v)) - domain[0]) / (domain[1] - domain[0])) * (width - left - right)
  const pts = rows.flatMap((r) => { const v = value(r); return v === null ? [] : [{ r, v }] })
  const vals = pts.map((p) => p.v).sort((a, b) => a - b)
  const bins = new Map<number, number>()
  const placed = pts.sort((a, b) => Number(isHotRow(a.r)) - Number(isHotRow(b.r))).map((p) => { const xx = x(p.v), k = Math.round(xx / 5), n = bins.get(k) ?? 0; bins.set(k, n + 1); return { ...p, xx, yy: mid + Math.max(-30, Math.min(30, (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 5)), hot: isHotRow(p.r) && warn(p.v) } })
  const hot = placed.filter((p) => p.hot).sort((a, b) => Math.abs(b.v - (baseline ?? 0)) - Math.abs(a.v - (baseline ?? 0))).slice(0, 4)
  return (
    <div ref={ref} className="v5-plot">
      <svg width={width} height={height} role="img" aria-label={label}>
        {baseline !== undefined && <><line x1={x(baseline)} x2={x(baseline)} y1={10} y2={height - 18} className="v5-axis-base" /><text x={x(baseline)} y={height - 4} textAnchor="middle" className="v5-tick">평소</text></>}
        <text x={left} y={height - 4} className="v5-tick">{format(domain[0])}</text><text x={width - right} y={height - 4} textAnchor="end" className="v5-tick">{format(domain[1])}</text>
        {vals.length > 0 && <rect x={x(quant(vals, 0.25))} y={14} width={Math.max(1, x(quant(vals, 0.75)) - x(quant(vals, 0.25)))} height={64} rx={3} className="v5-iqr" />}
        {placed.map((p) => <circle key={p.r.student.studentId} cx={p.xx} cy={p.yy} r={p.hot ? 3.4 : 2.6} className={p.hot ? 'v5-dot-hot' : 'v5-dot'} onClick={() => onStudent?.(p.r)}><title>{`${p.r.student.studentName} ${format(p.v)}`}</title></circle>)}
        {hot.map((p) => <text key={p.r.student.studentId} x={p.xx} y={10} textAnchor="middle" className="v5-hot-name" onClick={() => onStudent?.(p.r)}>{p.r.student.studentName}</text>)}
      </svg>
    </div>
  )
}

/** 한눈에 보기: 지표 5개 × 7일 칸. 칸 진하기 = 그날 값의 크기(관리 쪽으로 갈수록 진함), 칸 안내에 정확값.
    머리 숫자는 지표마다 1개. 누르면 그 지표로 이동 */
export interface StripRow { key: string; label: string; head: string; cells: { v: number | null; text: string }[]; onPick?: () => void; selected?: boolean }
export function OverviewStrip({ rows, dates }: { rows: StripRow[]; dates: { date: string; dow: string }[] }) {
  return (
    <table className="v5-strip" aria-label="학습관 지표 한눈에 보기">
      <thead><tr><th scope="col"><span className="lh-visually-hidden">지표</span></th>{dates.map((d) => <th key={d.date} scope="col">{md(d.date)} {d.dow}</th>)}<th scope="col">최근 7일</th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.key} className={r.selected ? 'v5-strip-sel' : ''}>
          <th scope="row">{r.onPick ? <button type="button" className="v5-link" onClick={r.onPick}>{r.label}</button> : r.label}</th>
          {r.cells.map((c, i) => <td key={i} title={`${md(dates[i].date)} ${r.label} ${c.text}`}><span className="v5-strip-cell" style={{ opacity: c.v === null ? 0.08 : 0.12 + Math.min(1, c.v) * 0.88 }} /><span className="lh-visually-hidden">{c.text}</span></td>)}
          <td className="v5-strip-head">{r.head}</td>
        </tr>))}</tbody>
    </table>
  )
}
