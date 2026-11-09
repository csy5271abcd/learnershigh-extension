// Z안 학습관 탭(plan-z.md 3·4장 "학습관" 열). 지표마다 "평소와 달라진 학생이 몇 명인가"(구간별 인원)와 날짜별 변화.
// 구간이나 날짜를 누르면 그 줄 바로 아래에 학생 목록이 펼쳐지고, 학생을 누르면 학생 상세로 간다.
import { useMemo, type ReactNode } from 'react'
import type { CareRow } from '../shared/useCareData.ts'
import { md } from '../shared/useCareData.ts'
import { branchDays, branchStudyChange, type OpsBranchDay } from '../../ops/opsModel.ts'
import { useWidth } from './useWidth.ts'
import { branchMetrics, type Bucket, type BucketMetric } from './zModel.ts'
import type { VisionWeek } from './vision/useVisionWeek.ts'
import { MANAGEMENT_REASONS, managementReasons } from './vision/visionContract.ts'
import { latestFacility, REASON_LABEL } from './vision/visionModel.ts'
import { visionStudentIdOf } from './vision/visionClient.ts'
import { VisionGate } from './vision/VisionGate.tsx'

export type BranchPick = { metric: BucketMetric['key']; bucket?: string; date?: string } | null

interface Props {
  rows: CareRow[]
  week: VisionWeek
  thresholds: { absenceDays: number; planMissingDays: number; studyDropPercent: number }
  pick: BranchPick
  onPick: (p: BranchPick) => void
  onOpen: (r: CareRow, list: CareRow[]) => void
  /** 사진 관찰 카드를 바꿔 넣는다(Z′: 이미지 인식 감독관 API) */
  visionSlot?: ReactNode
}

function BucketBars({ m, total, pick, onPick }: { m: BucketMetric; total: number; pick: BranchPick; onPick: Props['onPick'] }) {
  return (
    <ul className="z-buckets" aria-label={`${m.title} 구간별 인원`}>
      {m.buckets.map((b) => {
        const on = pick?.metric === m.key && pick.bucket === b.key
        return (
          <li key={b.key}>
            <button type="button" className={`z-bucket${b.flag ? ' z-bucket-flag' : ''}${b.none ? ' z-bucket-none' : ''}`} aria-pressed={on} disabled={!b.rows.length} onClick={() => onPick(on ? null : { metric: m.key, bucket: b.key })} data-tip={`${m.title} ${b.label} · ${b.rows.length}명 / 전체 ${total}명`}>
              <span className="z-bucket-label">{b.label}</span>
              <span className="z-bucket-track"><span className="z-bucket-fill" style={{ width: `${(b.rows.length / total) * 100}%` }} /></span>
              <span className="z-bucket-n">{b.rows.length}명</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

const PAD = { l: 52, r: 16, t: 22, b: 40 }
/** 날짜 7개 막대(인원 또는 비율). 막대 위에 값을 직접 쓴다 */
function DayBars({ days, value, label, max, unit, tip, flag, onDay, picked, ariaLabel }: { days: OpsBranchDay[]; value: (d: OpsBranchDay) => number | null; label: (v: number) => string; max: number; unit: (v: number) => string; tip: (d: OpsBranchDay) => string; flag?: (d: OpsBranchDay) => boolean; onDay?: (d: OpsBranchDay) => void; picked?: string; ariaLabel: string }) {
  const [ref, width] = useWidth<HTMLDivElement>(420)
  const h = 180, band = (width - PAD.l - PAD.r) / 7, x = (i: number) => PAD.l + i * band
  const y = (v: number) => h - PAD.b - (v / max) * (h - PAD.t - PAD.b)
  return (
    <div ref={ref} className="z-plot">
      <svg width={width} height={h} role="img" aria-label={ariaLabel}>
        {[0, max / 2, max].map((v) => <g key={v}><line x1={PAD.l} x2={width - PAD.r} y1={y(v)} y2={y(v)} className={v ? 'z-grid' : 'z-base'} /><text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="z-tick">{unit(v)}</text></g>)}
        {days.map((d, i) => {
          const v = value(d), cx = x(i) + band / 2, bw = Math.min(36, band * 0.5)
          const click = onDay && v ? () => onDay(d) : undefined
          return (
            <g key={d.date} className={`z-hit${click ? ' z-click' : ''}${picked === d.date ? ' z-picked' : ''}`} tabIndex={0} data-tip={tip(d)} aria-label={tip(d)} role={click ? 'button' : undefined} aria-pressed={click ? picked === d.date : undefined} onClick={click} onKeyDown={(e) => { if (click && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); click() } }}>
              <rect x={x(i)} y={PAD.t - 18} width={band} height={h - PAD.t - PAD.b + 18} className="z-hit-area" />
              {v === null ? <text x={cx} y={y(0) - 6} textAnchor="middle" className="z-none">—</text> : <>
                <rect x={cx - bw / 2} y={y(v)} width={bw} height={Math.max(v ? 1.5 : 0, y(0) - y(v))} rx={2} className={flag?.(d) ? 'z-bar-flag' : 'z-bar'} />
                <text x={cx} y={y(v) - 6} textAnchor="middle" className="z-value">{label(v)}</text>
              </>}
            </g>
          )
        })}
        <g>{days.map((d, i) => <text key={d.date} x={x(i) + band / 2} y={h - PAD.b + 18} textAnchor="middle" className="z-tick">{md(d.date)}<tspan x={x(i) + band / 2} dy="15">{d.dow}</tspan></text>)}</g>
      </svg>
    </div>
  )
}

/** 날짜별 학생 가운데 값(평소 대비 %)과 가운데 50% 띠. 0선에 '평소'를 직접 쓴다 */
function DayMedian({ days, onDay, picked }: { days: OpsBranchDay[]; onDay: (d: OpsBranchDay) => void; picked?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>(420)
  const h = 180, band = (width - PAD.l - PAD.r) / 7, x = (i: number) => PAD.l + i * band + band / 2
  const lim = Math.max(40, Math.ceil(Math.max(...days.flatMap((d) => d.studyChange ? [Math.abs(d.studyChange.q1), Math.abs(d.studyChange.q3)] : [0])) / 20) * 20)
  const y = (v: number) => PAD.t + ((lim - Math.max(-lim, Math.min(lim, v))) / (2 * lim)) * (h - PAD.t - PAD.b)
  const pts = days.map((d, i) => d.studyChange ? { i, d, s: d.studyChange } : null).filter((p) => p !== null)
  const fmt = (v: number) => { const r = Math.round(v); return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)}%` }
  return (
    <div ref={ref} className="z-plot">
      <svg width={width} height={h} role="img" aria-label="날짜별 학생 공부 시간의 평소 대비 변화, 가운데 값과 가운데 50%">
        {[-lim, 0, lim].map((v) => <g key={v}><line x1={PAD.l} x2={width - PAD.r} y1={y(v)} y2={y(v)} className={v ? 'z-grid' : 'z-base'} /><text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="z-tick">{v ? fmt(v) : '평소'}</text></g>)}
        {pts.length > 1 && <path d={`${pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i)},${y(p.s.q3)}`).join('')}${[...pts].reverse().map((p) => `L${x(p.i)},${y(p.s.q1)}`).join('')}Z`} className="z-band" />}
        {pts.length > 1 && <path d={pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i)},${y(p.s.median)}`).join('')} className="z-line" />}
        {days.map((d, i) => {
          const s = d.studyChange
          const tip = `${md(d.date)} ${d.dow} · ${s ? `학생 ${s.n}명 가운데 값 ${fmt(s.median)}, 가운데 50% ${fmt(s.q1)} ~ ${fmt(s.q3)}` : '비교할 기록 없음'}`
          return (
            <g key={d.date} className={`z-hit${s ? ' z-click' : ''}${picked === d.date ? ' z-picked' : ''}`} tabIndex={0} data-tip={tip} aria-label={tip} role={s ? 'button' : undefined} aria-pressed={s ? picked === d.date : undefined} onClick={s ? () => onDay(d) : undefined} onKeyDown={(e) => { if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onDay(d) } }}>
              <rect x={x(i) - band / 2} y={PAD.t} width={band} height={h - PAD.t - PAD.b} className="z-hit-area" />
              {s && <circle cx={x(i)} cy={y(s.median)} r={4.5} className="z-dot-strong" />}
              <text x={x(i)} y={h - PAD.b + 18} textAnchor="middle" className="z-tick">{md(d.date)}<tspan x={x(i)} dy="15">{d.dow}</tspan></text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

interface ListSpec { title: string; rows: CareRow[]; value?: (r: CareRow) => string; rank?: (r: CareRow) => number; flag?: (r: CareRow) => boolean }
function StudentList({ list, m, onOpen, onClose, title, value = m.value, rank = m.rank, flag }: { list: CareRow[]; m: BucketMetric; onOpen: Props['onOpen']; onClose: () => void; title: string; value?: (r: CareRow) => string; rank?: (r: CareRow) => number; flag?: (r: CareRow) => boolean }) {
  const sorted = [...list].sort((a, b) => rank(b) - rank(a) || a.student.studentName.localeCompare(b.student.studentName, 'ko'))
  return (
    <section className="z-picklist" aria-label={title}>
      <header><b>{title} · {sorted.length}명</b><button type="button" className="sc-button" onClick={onClose}>닫기</button></header>
      <ul>{sorted.map((r) => <li key={r.student.studentId}><button type="button" className="z-pick-student" onClick={() => onOpen(r, sorted)}><b>{r.student.studentName}</b><span className="z-class">{r.student.className}</span><span className={`z-pick-value${flag?.(r) ? ' z-pick-flag' : ''}`}>{value(r)}</span></button></li>)}</ul>
    </section>
  )
}

/** 사진 관찰: 가장 최근 보고일에 사진 관찰 서버가 관리 사유를 붙인 학생(서버 counts.byReason과 같은 규칙)과 자료가 부족한 학생 */
function visionMetric(rows: CareRow[], week: VisionWeek): { metric: BucketMetric; date: string } | null {
  const facility = week.status === 'ready' ? latestFacility(week.reports, week.dates) : null
  if (!facility) return null
  const docOf = (r: CareRow) => facility.reports.find((d) => d.facts.studentId === visionStudentIdOf(r.student.studentId)) ?? null
  const reasonsOf = (r: CareRow) => { const d = docOf(r); return d ? managementReasons(d) : [] }
  const buckets: Bucket[] = MANAGEMENT_REASONS.map((reason) => ({ key: reason, label: REASON_LABEL[reason], rows: rows.filter((r) => reasonsOf(r).includes(reason)), flag: true }))
  buckets.push({ key: 'limited', label: '판단 보류', rows: rows.filter((r) => { const d = docOf(r); return !!d && d.facts.quality !== 'sufficient' }), flag: false, none: true })
  return { date: facility.serviceDate, metric: { key: 'vision', title: '사진 관찰', buckets, value: (r) => reasonsOf(r).map((x) => REASON_LABEL[x]).join(', ') || '—', rank: (r) => reasonsOf(r).length } }
}

export function Branch({ rows, week, thresholds, pick, onPick, onOpen, visionSlot }: Props) {
  const vm = useMemo(() => visionMetric(rows, week), [rows, week])
  const metrics = useMemo(() => [...branchMetrics(rows, thresholds), ...(vm ? [vm.metric] : [])], [rows, thresholds, vm])
  const days = useMemo(() => branchDays(rows), [rows])
  const total = rows.length
  const dayChart = (m: BucketMetric) => {
    if (m.key === 'absence') return <DayBars ariaLabel="날짜별 결석 인원" days={days} max={Math.max(4, Math.ceil(Math.max(...days.map((d) => d.absent.length)) / 4) * 4)} value={(d) => d.scheduled ? d.absent.length : null} label={(v) => `${v}명`} unit={(v) => `${v}명`}
      tip={(d) => `${md(d.date)} ${d.dow} · 결석 ${d.absent.length}명 / 등원 예정 ${d.scheduled}명${d.unknown ? ` · 기록 없음 ${d.unknown}명` : ''}`} onDay={(d) => onPick(pick?.metric === 'absence' && pick.date === d.date ? null : { metric: 'absence', date: d.date })} picked={pick?.metric === 'absence' ? pick.date : undefined} />
    if (m.key === 'plan') return <DayBars ariaLabel="날짜별 계획 제출률" days={days} max={100} value={(d) => d.submitKnown ? (d.submitted / d.submitKnown) * 100 : null} label={(v) => `${Math.round(v)}%`} unit={(v) => `${v}%`}
      tip={(d) => `${md(d.date)} ${d.dow} · ${d.submitKnown ? `미제출 ${d.submitKnown - d.submitted}명 · 제출 ${d.submitted}명 / 제출 대상 ${d.submitKnown}명` : '등원 예정 학생 없음'}`} onDay={(d) => onPick(pick?.metric === 'plan' && pick.date === d.date ? null : { metric: 'plan', date: d.date })} picked={pick?.metric === 'plan' ? pick.date : undefined} />
    if (m.key === 'study') return <DayMedian days={days} onDay={(d) => onPick(pick?.metric === 'study' && pick.date === d.date ? null : { metric: 'study', date: d.date })} picked={pick?.metric === 'study' ? pick.date : undefined} />
    return null
  }
  const listFor = (m: BucketMetric): ListSpec | null => {
    if (pick?.metric !== m.key) return null
    const bucket = pick.bucket ? m.buckets.find((b) => b.key === pick.bucket) : undefined
    if (bucket) return { title: `${m.title} ${bucket.label}`, rows: bucket.rows }
    const i = pick.date ? days.findIndex((d) => d.date === pick.date) : -1
    if (i < 0) return null
    const date = days[i]
    if (m.key === 'plan') {
      // 그날 계획을 내지 않은 학생. 그날 출결(결석·입실·기록 없음)을 함께 보여 사유를 짐작할 수 있게 한다
      const ATT = { present: '입실', absent: '결석', off: '예정 없음', unknown: '기록 없음' } as const
      const order = { absent: 0, unknown: 1, present: 2, off: 3 } as const
      return { title: `${md(date.date)} ${date.dow} 계획 미제출`, rows: rows.filter((r) => r.days[i].submission === 'missing'), value: (r) => ATT[r.days[i].attendance], rank: (r) => -order[r.days[i].attendance], flag: (r) => r.days[i].attendance === 'absent' }
    }
    if (m.key !== 'study') return { title: `${md(date.date)} ${date.dow} 결석`, rows: date.absent as CareRow[] }
    // 그날 공부 기록과 같은 요일 평소가 모두 있는 학생의 평소 대비 변화
    const change = (r: CareRow) => { const d = r.days[i]; return d.minutes !== null && d.usualMinutes ? ((d.minutes - d.usualMinutes) / d.usualMinutes) * 100 : null }
    const drop = thresholds.studyDropPercent
    return { title: `${md(date.date)} ${date.dow} 평소보다 ${drop}% 이상 줄어든 학생`, rows: rows.filter((r) => (change(r) ?? 0) <= -drop), value: (r) => `−${Math.abs(Math.round(change(r)!))}%`, rank: (r) => -change(r)! }
  }
  const whole = branchStudyChange(rows)
  const card = (m: BucketMetric, chart: ReactNode, list: boolean) => {
    const l = list ? listFor(m) : null
    return (
      <section key={m.key} className="z-metric" aria-labelledby={`z-m-${m.key}`}>
        <header><h3 id={`z-m-${m.key}`}>{m.title}</h3>{m.key === 'vision' && vm && <span className="z-aside">{md(vm.date)} 보고</span>}{m.key === 'study' && whole && <span className="z-aside">학습관 전체 평소 대비 <b>{whole.percent > 0 ? '+' : whole.percent < 0 ? '−' : ''}{Math.abs(Math.round(whole.percent))}%</b></span>}</header>
        <div className={chart ? 'z-metric-body' : undefined}>
          <BucketBars m={m} total={total} pick={pick} onPick={onPick} />
          {chart}
        </div>
        {l && <StudentList list={l.rows} m={m} onOpen={onOpen} onClose={() => onPick(null)} title={l.title} value={l.value} rank={l.rank} flag={l.flag} />}
      </section>
    )
  }
  // 날짜 그림이 있는 지표는 한 줄씩, 구간 인원만 있는 지표는 한 줄에 셋을 나란히 두고 그 아래에 학생 목록을 편다
  const wide = metrics.filter((m) => dayChart(m)), narrow = metrics.filter((m) => !dayChart(m))
  const narrowPick = narrow.find((m) => listFor(m))
  const narrowList = narrowPick && listFor(narrowPick)
  return (
    <div className="z-branch">
      {wide.map((m) => card(m, dayChart(m), true))}
      <div className="z-metric-row">{narrow.map((m) => card(m, null, false))}{!vm && (visionSlot ?? <section className="z-metric" aria-label="사진 관찰"><header><h3>사진 관찰</h3></header>{week.status === 'ready' ? <p className="z-empty">최근 7일 사진 관찰 보고 없음</p> : <VisionGate week={week} />}</section>)}</div>
      {narrowPick && narrowList && <section className="z-metric" aria-label={narrowList.title}><StudentList list={narrowList.rows} m={narrowPick} onOpen={onOpen} onClose={() => onPick(null)} title={narrowList.title} /></section>}
    </div>
  )
}
