// 학습관 지표 하나의 그림(시안 A–D 공통, representation-v5.md 2장).
import { usePlotWidth } from '../../components/weekly/usePlotWidth.ts'
import { DaySwarm, AttendanceMatrix, VisionSwarms } from './charts.tsx'
import { md, type CareRow } from './useCareData.ts'
import type { MetricKey } from './branch.ts'
import type { VisionAxis } from './visionExample.ts'

const pct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}%`
const min = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}분`

/** 계획 제출: 날짜마다 제출(진하게)·미제출(주황) 한 막대. 머리 숫자는 미제출 인원 */
function PlanBars({ rows, onDay, selectedDay }: { rows: CareRow[]; onDay?: (i: number) => void; selectedDay?: number | null }) {
  const [ref, width] = usePlotWidth()
  const days = rows[0]?.days ?? []
  const left = 8, colW = (width - left * 2) / 7, H = 110, top = 24
  return (
    <div ref={ref} className="v5-plot">
      <p className="v5-key"><span className="v5-key-submitted" />제출 <span className="v5-key-missing-bar" />미제출</p>
      <svg width={width} height={H + top + 26} role="img" aria-label="날짜별 계획 제출">
        {days.map((d, i) => {
          const sub = rows.filter((r) => r.days[i].submission === 'submitted').length, miss = rows.filter((r) => r.days[i].submission === 'missing').length, all = sub + miss
          const cx = left + colW * i + colW / 2, bw = Math.min(40, colW * 0.5)
          const hs = all ? (sub / all) * H : 0, hm = all ? (miss / all) * H : 0
          return <g key={d.date} role={onDay ? 'button' : undefined} tabIndex={onDay ? 0 : undefined} aria-pressed={onDay ? selectedDay === i : undefined} aria-label={`${md(d.date)} 계획 미제출 ${miss}명 보기`} onClick={() => onDay?.(i)} onKeyDown={(e) => { if (onDay && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onDay(i) } }} className={onDay ? 'v5-day-hit' : ''}>
            {selectedDay === i && <rect x={cx - colW / 2 + 2} y={0} width={colW - 4} height={H + top + 26} rx={6} className="v5-col-sel" />}
            <text x={cx} y={16} textAnchor="middle" className="v5-head-num">{miss}명</text>
            <rect x={cx - bw / 2} y={top + H - hs} width={bw} height={Math.max(0, hs - 1)} rx={3} className="v5-bar-submitted"><title>{`${md(d.date)} 제출 ${sub}명 / ${all}명`}</title></rect>
            <rect x={cx - bw / 2} y={top} width={bw} height={Math.max(0, hm - 1)} rx={3} className="v5-bar-missing"><title>{`${md(d.date)} 미제출 ${miss}명`}</title></rect>
            <text x={cx} y={H + top + 18} textAnchor="middle" className="v5-tick">{md(d.date)} {d.dow}</text>
          </g>
        })}
      </svg>
    </div>
  )
}

interface Props { metric: MetricKey; rows: CareRow[]; axis: VisionAxis; onAxis: (a: VisionAxis) => void; studyDropPercent: number; startShiftMinutes: number; onStudent?: (r: CareRow) => void; onDay?: (i: number) => void; selectedDay?: number | null; height?: number; compact?: boolean }

export function MetricPanel({ metric, rows, axis, onAxis, studyDropPercent, startShiftMinutes, onStudent, onDay, selectedDay, height, compact }: Props) {
  if (metric === 'absence') return <AttendanceMatrix rows={rows} onStudent={onStudent} onDay={onDay} selectedDay={selectedDay} compact={compact} />
  if (metric === 'plan') return <PlanBars rows={rows} onDay={onDay} selectedDay={selectedDay} />
  if (metric === 'vision') return <VisionSwarms rows={rows} axis={axis} onAxis={onAxis} onStudent={onStudent} onDay={onDay} selectedDay={selectedDay} />
  if (metric === 'study') return <DaySwarm rows={rows} label="학습 시간 학생별 평소 대비" height={height} domain={[-100, 100]} baseline={0} ticks={[-100, -50, 0, 50, 100]} format={pct} warn={(v) => v <= -studyDropPercent}
    value={(r, i) => { const d = r.days[i]; return d.minutes !== null && d.usualMinutes ? ((d.minutes - d.usualMinutes) / d.usualMinutes) * 100 : null }} onStudent={onStudent} onDay={onDay} selectedDay={selectedDay} />
  return <DaySwarm rows={rows} label="입실 시각 학생별 평소 대비" height={height} domain={[-120, 120]} baseline={0} ticks={[-120, -60, 0, 60, 120]} format={min} warn={(v) => v >= startShiftMinutes}
    value={(r, i) => { const d = r.days[i]; return d.start !== null && d.usualStart !== null ? d.start - d.usualStart : null }} onStudent={onStudent} onDay={onDay} selectedDay={selectedDay} />
}
