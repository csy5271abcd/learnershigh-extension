import { useState } from 'react'
import { academicMonths, placeEntries, type TeachingPlanEntry } from './teachingPlanCalendar.ts'
import styles from './review.module.css'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

// 월별 교수·학습 운영 계획 달력 (Admin 검토·Student 조회 공용 설계, mode로 구분).
// 정확한 날짜는 날짜 칸, 주차는 주차 띠, 월만 있으면 월 요약 띠, 날짜를 모르면 별도 목록 — 원문에 없는 날짜를 만들지 않는다.
// entries가 비어 있으면(계약 대기) 빈 달력 위에 emptyMessage를 보여 준다.
export function TeachingPlanCalendar({
  academicYear,
  semester,
  entries,
  subjects,
  emptyMessage,
  onSelect,
}: {
  academicYear: number
  semester: number
  entries: TeachingPlanEntry[]
  subjects: string[]
  emptyMessage: string | null
  onSelect?: (entry: TeachingPlanEntry) => void
}) {
  const semesterMonths = semester === 1 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 12, 1, 2]
  const [month, setMonth] = useState(semesterMonths[0])
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const visible = entries.filter((entry) => !hidden.has(entry.subjectName))
  const placement = placeEntries(visible, academicYear, month)
  const position = academicMonths.indexOf(month)
  const move = (delta: number) => {
    const next = academicMonths[position + delta]
    if (next !== undefined) setMonth(next)
  }
  const label = (entry: TeachingPlanEntry) => `${entry.subjectName} · ${entry.unit ?? entry.asWritten}`

  return (
    <div className={styles.planner} data-testid="teaching-plan-calendar">
      <aside className={styles.plannerSide} aria-label="달력 보조 탐색">
        <div className={styles.softCard} style={{ padding: 12 }}>
          <span className={styles.detailLabel}>{academicYear}학년도 {semester}학기</span>
          <div className={styles.monthList} role="group" aria-label="월 선택">
            {academicMonths.map((value) => (
              <button key={value} type="button" className={styles.monthButton} aria-pressed={value === month} onClick={() => setMonth(value)}>
                {value}월
              </button>
            ))}
          </div>
        </div>
        <div className={styles.softCard} style={{ padding: 12 }}>
          <span className={styles.detailLabel}>과목</span>
          {subjects.length === 0 ? (
            <p className={styles.tiny}>과목 정보 없음</p>
          ) : (
            subjects.map((subject) => (
              <label key={subject} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, padding: '3px 0' }}>
                <input
                  type="checkbox"
                  checked={!hidden.has(subject)}
                  onChange={() =>
                    setHidden((previous) => {
                      const next = new Set(previous)
                      if (next.has(subject)) next.delete(subject)
                      else next.add(subject)
                      return next
                    })
                  }
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject}</span>
              </label>
            ))
          )}
        </div>
        <ul className={styles.legend} aria-label="표시 기준">
          <li>
            <span className={styles.legendSwatch} />날짜가 적힌 계획 → 날짜 칸
          </li>
          <li>
            <span className={styles.legendSwatch} style={{ opacity: 0.55 }} />&lsquo;n주&rsquo; 계획 → 주차 띠 (학교 주차 그대로)
          </li>
          <li>
            <span className={styles.legendSwatch} style={{ opacity: 0.3 }} />월만 적힌 계획 → 월 요약
          </li>
          <li>
            <span className={styles.legendSwatch} style={{ background: 'var(--as-color-idle)' }} />날짜 미확인 → 아래 목록
          </li>
        </ul>
      </aside>

      <div>
        <div className={styles.calendarHead}>
          <button type="button" className={styles.iconButton} onClick={() => move(-1)} disabled={position <= 0} aria-label="이전 달">
            ‹
          </button>
          <h4>
            {placement.year === null ? `${academicYear}학년도` : `${placement.year}년`} {month}월
          </h4>
          <button type="button" className={styles.iconButton} onClick={() => move(1)} disabled={position >= academicMonths.length - 1} aria-label="다음 달">
            ›
          </button>
        </div>

        <div className={styles.band} aria-label="월 요약">
          <strong style={{ color: 'var(--as-color-text)' }}>{month}월 전체</strong>
          {placement.monthSummary.length === 0 ? <span>—</span> : placement.monthSummary.map((entry) => <EntryChip key={entry.rowKey} entry={entry} label={label(entry)} onSelect={onSelect} />)}
        </div>
        {placement.weekBands.map((band) => (
          <div key={band.week} className={styles.band} aria-label={`${band.week}주`}>
            <strong style={{ color: 'var(--as-color-text)' }}>{band.week}주</strong>
            {band.entries.map((entry) => (
              <EntryChip key={entry.rowKey} entry={entry} label={label(entry)} onSelect={onSelect} />
            ))}
          </div>
        ))}

        <div className={emptyMessage ? styles.plannerEmpty : undefined}>
          {placement.year === null ? (
            <div className={styles.softCard}>
              <p className={styles.muted}>학년도 {month}월은 실제 연도를 학사일정으로 확인하기 전이라 날짜 칸을 그리지 않아요. 주차·월 정보만 보여 줘요.</p>
            </div>
          ) : (
            <div className={styles.calendarGrid} role="grid" aria-label={`${placement.year}년 ${month}월`}>
              {weekdays.map((day) => (
                <div key={day} className={styles.weekday} role="columnheader">
                  {day}
                </div>
              ))}
              {placement.cells.map((cell, index) =>
                cell ? (
                  <div key={cell.iso} className={styles.day} role="gridcell">
                    {cell.day}
                    {cell.entries.map((entry) => (
                      <button key={entry.rowKey} type="button" className={styles.entryBlock} onClick={() => onSelect?.(entry)}>
                        {label(entry)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div key={`blank-${index}`} className={styles.day} data-blank="true" role="gridcell" />
                ),
              )}
            </div>
          )}
          {emptyMessage && (
            <div className={styles.plannerOverlay} data-testid="teaching-plan-empty">
              <div style={{ maxWidth: 420 }}>
                <strong style={{ display: 'block', fontSize: 16, marginBottom: 6 }}>운영 계획을 기다리고 있어요</strong>
                <p className={styles.muted}>{emptyMessage}</p>
              </div>
            </div>
          )}
        </div>

        {placement.ranges.length > 0 && (
          <div className={styles.band} aria-label="기간 계획">
            <strong style={{ color: 'var(--as-color-text)' }}>기간</strong>
            {placement.ranges.map((entry) => (
              <EntryChip key={entry.rowKey} entry={entry} label={`${label(entry)} (${entry.dateFrom}~${entry.dateTo ?? ''})`} onSelect={onSelect} />
            ))}
          </div>
        )}
        {placement.undated.length > 0 && (
          <div className={styles.band} aria-label="날짜 미확인">
            <strong style={{ color: 'var(--as-color-text)' }}>날짜 미확인</strong>
            {placement.undated.map((entry) => (
              <EntryChip key={entry.rowKey} entry={entry} label={`${label(entry)} · ${entry.asWritten}`} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EntryChip({ entry, label, onSelect }: { entry: TeachingPlanEntry; label: string; onSelect?: (entry: TeachingPlanEntry) => void }) {
  return (
    <button type="button" className={styles.entryBlock} style={{ marginTop: 0 }} onClick={() => onSelect?.(entry)} title={entry.asWritten}>
      {label}
    </button>
  )
}
