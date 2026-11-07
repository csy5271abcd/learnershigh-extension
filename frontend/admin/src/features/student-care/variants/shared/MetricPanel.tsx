// 학습관 지표 하나의 그림(시안 A–D 공통, representation-v5.md 2장).
import { usePlotWidth } from '../../components/weekly/usePlotWidth.ts'
import { DayRange, AttendanceMatrix, VisionSwarms, type SwarmLine } from './charts.tsx'
import { hours } from './model.ts'
import { md, type CareRow } from './useCareData.ts'
import type { BranchModel, MetricKey } from './branch.ts'

const pct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}%`
const min = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}분`

/** 계획 제출: 날짜마다 미제출 인원 막대(높이 = 인원). 막대 위 머리 숫자 = 미제출 인원, 안내에 제출·대상 */
function PlanBars({ m, onDay, selectedDay }: { m: BranchModel; onDay?: (i: number, dir?: 'above' | 'below') => void; selectedDay?: number | null }) {
  const [ref, width] = usePlotWidth()
  const left = 8, colW = (width - left * 2) / 7, H = 90, top = 24
  const miss = m.days.map((d) => d.submitKnown - d.submitted), max = Math.max(1, ...miss)
  const offN = m.days.map((_, i) => m.included.filter((r) => r.days[i].submission === 'off').length), unkN = m.days.map((_, i) => m.included.filter((r) => r.days[i].submission === 'unknown').length)
  const empty = (i: number) => unkN[i] > 0 ? '제출 기록 없음' : '제출 대상 없음'
  return (
    <div ref={ref} className="v5-plot">
      <svg width={width} height={H + top + 26} role="group" aria-label="날짜별 계획 미제출 인원">
        <line x1={left} x2={width - left} y1={top + H} y2={top + H} className="v5-grid" />
        {m.days.map((d, i) => { const cx = left + colW * i + colW / 2, bw = Math.min(36, colW * 0.5), h = (miss[i] / max) * H
          return <g key={d.date} role="button" tabIndex={0} aria-pressed={onDay ? selectedDay === i : undefined} data-tip={d.submitKnown ? `${md(d.date)} 미제출 ${miss[i]}명 · 제출 ${d.submitted}명 · 대상 ${d.submitKnown}명 · 대상 아님 ${offN[i]}명 · 기록 없음 ${unkN[i]}명` : `${md(d.date)} ${empty(i)} (대상 아님 ${offN[i]}명 · 기록 없음 ${unkN[i]}명)`} aria-label={d.submitKnown ? `${md(d.date)} 계획 미제출 ${miss[i]}명, 제출 ${d.submitted}명, 대상 ${d.submitKnown}명` : `${md(d.date)} ${empty(i)}`} onClick={() => onDay?.(i)} onKeyDown={(e) => { if (onDay && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onDay(i) } }} className="v5-day-hit">
            {selectedDay === i && <rect x={cx - colW / 2 + 2} y={0} width={colW - 4} height={H + top + 26} rx={6} className="v5-col-sel" />}
            {d.submitKnown > 0 && <text x={cx} y={top + H - h - 6} textAnchor="middle" className="v5-head-num">{miss[i]}명</text>}
            {d.submitKnown === 0 && <text x={cx} y={top + H - 6} textAnchor="middle" className="v5-muted-svg">{empty(i) === '제출 대상 없음' ? '대상 없음' : '기록 없음'}</text>}
            {miss[i] > 0 && <rect x={cx - bw / 2} y={top + H - h} width={bw} height={h} rx={3} className="v5-bar-missing" />}
            <text x={cx} y={H + top + 18} textAnchor="middle" className="v5-tick">{md(d.date)} {d.dow}</text>
          </g> })}
      </svg>
    </div>
  )
}

interface Props { metric: MetricKey; m: BranchModel; studyDropPercent: number; startShiftMinutes: number; onStudent?: (r: CareRow) => void; onDay?: (i: number, dir?: 'above' | 'below') => void; selectedDay?: number | null; height?: number; limit?: number; lines?: SwarmLine[] }

export function MetricPanel({ metric, m, studyDropPercent, startShiftMinutes, onStudent, onDay, selectedDay, height, limit, lines }: Props) {
  const rows = m.included
  if (metric === 'absence') return <AttendanceMatrix rows={rows} onStudent={onStudent} onDay={onDay} selectedDay={selectedDay} limit={limit} />
  if (metric === 'plan') return <PlanBars m={m} onDay={onDay} selectedDay={selectedDay} />
  if (metric === 'vision') return <VisionSwarms rows={rows} pools={m.vision} onStudent={onStudent} onDay={onDay} selectedDay={selectedDay} />
  if (metric === 'study') return (<>
    <DayRange rows={rows} label="학습 시간 학생별 평소 대비" height={height} domain={[-100, 100]} baseline={0} ticks={[-100, -50, 0, 50, 100]} format={pct} warn={(v) => v <= -studyDropPercent} lines={lines}
      value={(r, i) => { const d = r.days[i]; return d.minutes !== null && d.usualMinutes ? ((d.minutes - d.usualMinutes) / d.usualMinutes) * 100 : null }}
      onDay={onDay} selectedDay={selectedDay} />
    <div className="v5-avg-row" aria-label="입실 학생 평균 학습 시간"><span className="v5-muted" data-tip="입실 학생 평균 학습 시간">평균</span>{m.studyAvg.map((v, i) => <span key={i}>{v === null ? '—' : hours(v)}</span>)}</div>
  </>)
  return <DayRange rows={rows} label="입실 시각 학생별 평소 대비" height={height} domain={[-120, 120]} baseline={0} ticks={[-120, -60, 0, 60, 120]} format={min} warn={(v) => v >= startShiftMinutes} lines={lines}
    value={(r, i) => { const d = r.days[i]; return d.start !== null && d.usualStart !== null ? d.start - d.usualStart : null }}
    onDay={onDay} selectedDay={selectedDay} />
}
