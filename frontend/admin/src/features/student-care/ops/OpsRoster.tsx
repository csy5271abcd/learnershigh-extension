import { useMemo } from 'react'
import { hours, type OpsStudent } from './opsModel.ts'
import { OpsStrip, OpsStripLegend } from './OpsStrip.tsx'

export type RosterVariant = 'table' | 'minimal' | 'groups'

const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`

/** 상담 필요는 행 왼쪽 선과 사유 칩으로 이미 보이므로 배지를 반복하지 않는다. 관리 중·확인일·기록 부족만 배지로 쓴다 */
function Chips({ s }: { s: OpsStudent }) {
  const badge = s.status !== 'check' && s.statusLabel ? <span className={`ops-status ops-status-${s.status}`}>{s.statusLabel}</span> : null
  return <>{badge}{s.chips.map((c) => <span key={c.text} className={`ops-chip${c.derived ? ' ops-chip-derived' : ''}`}>{c.text}</span>)}</>
}

function Bullet({ s, max }: { s: OpsStudent; max: number }) {
  const w = s.week
  return (
    <span className="ops-bullet" role="img" aria-label={`7일 ${hours(w.minutes)}, 평소 주 ${hours(w.usualWeek)}`}>
      <span className="ops-bullet-track">
        {w.minutes !== null && <span className="ops-bullet-bar" style={{ width: `${Math.min(100, (w.minutes / max) * 100)}%` }} />}
        {w.usualWeek !== null && <span className="ops-bullet-usual" style={{ left: `${Math.min(100, (w.usualWeek / max) * 100)}%` }} />}
      </span>
      <span className="ops-bullet-val">{w.minutes === null ? '—' : `${Math.round(w.minutes / 60)}시간`}</span>
    </span>
  )
}

interface Props { rows: OpsStudent[]; selectedId: string | null; onSelect: (id: string) => void; variant: RosterVariant }

/** 학생 행. 행 전체가 선택 버튼이다(펼침·접기 없이 오른쪽 상세가 바뀐다) */
function rowProps(s: OpsStudent, selectedId: string | null, onSelect: (id: string) => void, first: boolean) {
  return {
    'data-care-roster-row': s.student.studentId,
    'data-care-open-student': first ? s.student.studentName : undefined,
    'aria-current': s.student.studentId === selectedId ? ('true' as const) : undefined,
    className: `ops-row ops-row-${s.status}`,
    onClick: () => onSelect(s.student.studentId),
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.student.studentId) } },
    tabIndex: 0,
    role: 'row',
  }
}

export function OpsRoster({ rows, selectedId, onSelect, variant }: Props) {
  // 모든 행이 같은 축을 쓴다. 축 끝은 이 지점에서 가장 긴 주(최근 또는 평소)
  const max = useMemo(() => Math.max(60, ...rows.map((r) => Math.max(r.week.minutes ?? 0, r.week.usualWeek ?? 0))), [rows])
  const firstFlagged = rows.find((r) => r.status !== 'normal' && r.status !== 'deferred')?.student.studentId
  const days = rows[0]?.days ?? []
  if (variant === 'groups') return <GroupBoard rows={rows} selectedId={selectedId} onSelect={onSelect} />
  if (variant === 'minimal') return (
    <div className="ops-table ops-table-min" role="table" aria-label="전체 학생">
      <div className="ops-row ops-head" role="row"><span>학생</span><span>상태 · 사유</span><span>학습 시간<small>7일 / 평소 주</small></span><span>입실</span><span>계획 제출</span><span>진행률</span></div>
      {rows.map((s) => (
        <div key={s.student.studentId} {...rowProps(s, selectedId, onSelect, s.student.studentId === firstFlagged)}>
          <span className="ops-name"><b>{s.student.studentName}</b><small>{s.student.className}</small></span>
          <span className="ops-chips"><Chips s={s} /></span>
          <span>{hours(s.week.minutes)}<small>{hours(s.week.usualWeek)}</small></span>
          <span>{s.week.attended}일</span>
          <span>{s.week.submitted} / {s.week.submitKnown}일</span>
          <span>{s.week.executionRate === null ? '—' : `${Math.round(s.week.executionRate)}%`}</span>
        </div>
      ))}
    </div>
  )
  return (
    <div className="ops-table" role="table" aria-label="전체 학생">
      <div className="ops-row ops-head" role="row">
        <span>학생</span><span>상태 · 사유</span>
        <span className="ops-head-days">{days.map((d) => <span key={d.date}><b>{md(d.date)}</b>{d.dow}</span>)}</span>
        <span>학습 시간<small>막대 7일 · 선 평소 주</small></span><span>진행률</span>
      </div>
      {rows.map((s) => (
        <div key={s.student.studentId} {...rowProps(s, selectedId, onSelect, s.student.studentId === firstFlagged)}>
          <span className="ops-name"><b>{s.student.studentName}</b><small>{s.student.className}</small></span>
          <span className="ops-chips"><Chips s={s} /></span>
          <OpsStrip days={s.days} />
          <Bullet s={s} max={max} />
          <span className="ops-num">{s.week.executionRate === null ? '—' : `${Math.round(s.week.executionRate)}%`}</span>
        </div>
      ))}
      <div className="ops-table-foot"><OpsStripLegend /></div>
    </div>
  )
}

/** 사유별 묶음 안. 같은 학생이 여러 묶음에 나올 수 있다. 아래에 전원 명부(정상 포함)를 이름으로 둔다 */
function GroupBoard({ rows, selectedId, onSelect }: { rows: OpsStudent[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const groups: { key: string; title: string; match: (s: OpsStudent) => boolean }[] = [
    { key: 'recheck', title: '확인일이 된 관리 학생', match: (s) => s.status === 'recheck' },
    { key: 'absence', title: '결석', match: (s) => s.chips.some((c) => c.type === 'CONSECUTIVE_ABSENCE' || c.type === 'WEEKDAY_ABSENCE') },
    { key: 'study', title: '학습 감소', match: (s) => s.chips.some((c) => c.type === 'STUDY_DROP') },
    { key: 'exec', title: '계획 진행률', match: (s) => s.chips.some((c) => c.type === 'EXECUTION_GAP') },
    { key: 'start', title: '입실 늦어짐', match: (s) => s.chips.some((c) => c.type === 'START_TIME_SHIFT') },
    { key: 'subject', title: '과목 비중', match: (s) => s.chips.some((c) => c.type === 'SUBJECT_SHARE') },
    { key: 'plan', title: '계획 미제출', match: (s) => s.chips.some((c) => c.type === 'PLAN_MISSING') },
  ]
  let first = true
  return (
    <div className="ops-groups">
      {groups.map((g) => { const list = rows.filter(g.match); return list.length ? (
        <section key={g.key} className="ops-group"><h3>{g.title} <small>{list.length}명</small></h3>
          <div role="table" aria-label={g.title}>{list.map((s) => {
            const p = rowProps(s, selectedId, onSelect, first); first = false
            return <div key={s.student.studentId} {...p} data-care-roster-row={undefined} className={`${p.className} ops-group-row`}><span className="ops-name"><b>{s.student.studentName}</b></span><span className="ops-chips">{s.chips.filter((c) => g.match({ ...s, chips: [c] })).map((c) => <span key={c.text} className="ops-chip">{c.text}</span>)}</span><OpsStrip days={s.days} /></div>
          })}</div>
        </section>) : null })}
      <section className="ops-group ops-group-all"><h3>전체 명부 <small>{rows.length}명</small></h3>
        <div className="ops-name-grid" role="table" aria-label="전체 학생">{rows.map((s) => (
          <div key={s.student.studentId} {...rowProps(s, selectedId, onSelect, false)} className={`ops-name-cell ops-row-${s.status}`}><b>{s.student.studentName}</b>{s.statusLabel && <small>{s.statusLabel}</small>}</div>
        ))}</div>
      </section>
    </div>
  )
}
