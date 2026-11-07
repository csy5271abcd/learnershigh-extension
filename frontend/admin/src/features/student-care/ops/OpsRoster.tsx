import { hours, type OpsStudent } from './opsModel.ts'
import { OpsStrip, OpsStripLegend } from './OpsStrip.tsx'

// 명부 표현은 Codex 기능 심사(reviews/10-function-result.md 4장)에서 비교한 3안 가운데 행 + 7일 띠 + 같은 축 막대(table) 안을 기본안으로 남겼다.
// 최소 변경안(숫자 열만)과 사유 묶음안은 같은 과업에서 이점이 없어 정리했다(docs/design/ops-redesign/contract-changes.md).

const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
/** "고3 A반" → "3A". 150행에 반복되는 글자를 줄인다(전체 반 이름은 상세 머리에 그대로) */
const shortClass = (name: string | null | undefined) => name?.match(/(\d)\D*([A-Z가-힣])반/)?.slice(1).join('') ?? name ?? ''
const h = (m: number | null) => m === null ? '—' : `${Math.floor(Math.round(m) / 60)}:${String(Math.round(m) % 60).padStart(2, '0')}`

/** 상담 필요는 행 왼쪽 선과 사유 칩으로 이미 보이므로 배지를 반복하지 않는다. 관리 중·확인일·기록 부족만 배지로 쓴다 */
function Chips({ s }: { s: OpsStudent }) {
  const badge = s.status !== 'check' && s.statusLabel ? <span className={`ops-status ops-status-${s.status}`}>{s.statusLabel}</span> : null
  return <>{badge}{s.chips.map((c) => <span key={c.text} className={`ops-chip${c.derived ? ' ops-chip-derived' : ''}`}>{c.text}</span>)}</>
}

/** 학습 시간 불릿: 모든 행이 같은 축(지점 전체에서 가장 긴 주). 막대 = 최근 7일, 세로선 = 평소 주. 두 값을 숫자로도 쓴다 */
function Bullet({ s, max }: { s: OpsStudent; max: number }) {
  const w = s.week
  return (
    <span className="ops-bullet" role="img" aria-label={`7일 ${hours(w.minutes)}${w.recorded < 7 ? ` (기록 ${w.recorded}/7일)` : ''}, 평소 주 ${hours(w.usualWeek)}`}>
      <span className="ops-bullet-track">
        {w.minutes !== null && <span className="ops-bullet-bar" style={{ width: `${Math.min(100, (w.minutes / max) * 100)}%` }} />}
        {w.usualWeek !== null && <span className="ops-bullet-usual" style={{ left: `${Math.min(100, (w.usualWeek / max) * 100)}%` }} />}
      </span>
      <span className="ops-bullet-val"><b>{h(w.minutes)}</b> / {h(w.usualWeek)}</span>
    </span>
  )
}

interface Props { rows: OpsStudent[]; axisMax: number; selectedId: string | null; onSelect: (id: string) => void }

export function OpsRoster({ rows, axisMax, selectedId, onSelect }: Props) {
  const firstFlagged = rows.find((r) => r.status !== 'normal' && r.status !== 'deferred')?.student.studentId
  const days = rows[0]?.days ?? []
  return (
    <>
    <div className="ops-table-legend"><OpsStripLegend /><span className="ops-muted">위 줄 출결 · 아래 줄 계획 제출</span></div>
    <div className="ops-table" role="table" aria-label="전체 학생">
      <div className="ops-row ops-head" role="row">
        <span>학생</span><span>사유</span>
        <span className="ops-head-days" aria-label={`최근 7일 ${md(days[0]?.date ?? '')}–${md(days[6]?.date ?? '')}`}>{days.map((d) => <span key={d.date}>{d.dow}</span>)}</span>
        <span>학습 시간<small>7일 / 평소 주 (시간:분)</small></span><span className="ops-num">진행률</span>
      </div>
      {rows.map((s) => (
        <div key={s.student.studentId} data-care-roster-row={s.student.studentId} data-care-open-student={s.student.studentId === firstFlagged ? s.student.studentName : undefined}
          aria-current={s.student.studentId === selectedId ? 'true' : undefined} className={`ops-row ops-row-${s.status}`} role="row" tabIndex={0}
          onClick={() => onSelect(s.student.studentId)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.student.studentId) } }}>
          <span className="ops-name"><b>{s.student.studentName}</b><small>{shortClass(s.student.className)}</small></span>
          <span className="ops-chips"><Chips s={s} /></span>
          <OpsStrip days={s.days} />
          <Bullet s={s} max={axisMax} />
          <span className="ops-num">{s.week.executionRate === null ? '—' : `${Math.round(s.week.executionRate)}%`}</span>
        </div>
      ))}
    </div>
    </>
  )
}
