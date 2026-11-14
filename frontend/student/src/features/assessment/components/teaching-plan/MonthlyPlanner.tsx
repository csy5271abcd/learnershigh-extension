import { useMemo, useState, type ReactNode } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '../AssessmentIcons.tsx'
import { calendarYear, placeEntries, precisionLabel, semesterMonths, subjectColorIndex, type TeachingPlanEntry } from './teachingPlanPlacement.ts'
import styles from './monthlyPlanner.module.css'

// 월별 교수·학습 운영 계획 Monthly Planner (Student 조회 · Admin 검토 공용 렌더러).
// - mode='student': 확정(CONFIRMED) 계획만 받는다는 전제의 읽기 전용 화면. 후보·누락 정보는 보이지 않는다.
// - mode='admin'  : 분석 후보(점선)·확정 표시, 읽지 못한 칸 표시. 편집·확정은 계약(0.3 teachingPlan) 이후 연결한다.
// 날짜 규칙은 teachingPlanPlacement.ts (원문에 없는 날짜를 만들지 않음).

const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const MAX_PER_DAY = 2

export interface MonthlyPlannerProps {
  academicYear: number
  semester: number
  entries: TeachingPlanEntry[]
  mode: 'student' | 'admin'
  /** entries가 비었을 때 보여 줄 안내 (데이터 없음 · 계약 대기 등 상황별 문구는 호출 측이 정한다) */
  emptyState: ReactNode
  /** 원문 쪽 보기 (PDF 쪽 근거가 있을 때) */
  onOpenSource?: (page: number) => void
}

export function MonthlyPlanner({ academicYear, semester, entries, mode, emptyState, onOpenSource }: MonthlyPlannerProps) {
  const months = semesterMonths(semester)
  const subjects = useMemo(() => [...new Set(entries.map((entry) => entry.subjectName))], [entries])
  const firstWithData = months.find((month) => entries.some((entry) => entry.month === month)) ?? months[0]
  const [month, setMonth] = useState(firstWithData)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  // 좁은 화면은 주차 목록을 기본으로 (7열 Grid가 너무 좁다)
  const [view, setView] = useState<'calendar' | 'list'>(() => (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? 'list' : 'calendar'))
  const [selected, setSelected] = useState<TeachingPlanEntry | null>(null)
  const visible = entries.filter((entry) => !hidden.has(entry.subjectName))
  const placement = placeEntries(visible, academicYear, month)
  const position = months.indexOf(month)

  const countIn = (value: number) => visible.filter((entry) => entry.month === value).length
  const toggleSubject = (subject: string) =>
    setHidden((previous) => {
      const next = new Set(previous)
      if (next.has(subject)) next.delete(subject)
      else next.add(subject)
      return next
    })
  const color = (entry: TeachingPlanEntry) => String(subjectColorIndex(subjects, entry.subjectName))
  const short = (entry: TeachingPlanEntry) => entry.unit ?? entry.content ?? entry.asWritten
  const chip = (entry: TeachingPlanEntry) => (
    <button
      key={entry.rowKey}
      type="button"
      className={styles.chip}
      aria-pressed={selected?.rowKey === entry.rowKey}
      data-candidate={mode === 'admin' && entry.status === 'CANDIDATE' ? 'true' : undefined}
      onClick={() => setSelected(entry)}
      title={`${entry.subjectName} · ${short(entry)} (${entry.asWritten})`}
      data-testid="planner-chip"
    >
      <span className={styles.dot} data-c={color(entry)} />
      <span>
        {entry.subjectName} · {short(entry)}
      </span>
    </button>
  )

  if (entries.length === 0) {
    return (
      <div className={styles.planner} style={{ gridTemplateColumns: 'minmax(0, 1fr)' }} data-testid="monthly-planner">
        <div className={styles.empty} data-testid="planner-empty">
          {emptyState}
        </div>
      </div>
    )
  }

  const byWeekList = [
    ...placement.monthSummary.map((entry) => ({ group: `${month}월 전체`, entry })),
    ...placement.weekBands.flatMap((band) => band.entries.map((entry) => ({ group: `${month}월 ${band.week}주`, entry }))),
    ...(placement.year === null ? [] : placement.cells.flatMap((cell) => (cell ? cell.entries.filter((entry) => entry.dateFrom === cell.iso).map((entry) => ({ group: `${month}월 ${cell.day}일`, entry })) : []))),
    ...placement.undated.map((entry) => ({ group: '날짜 미확인', entry })),
  ]

  return (
    <div className={styles.planner} data-detail={selected ? 'true' : undefined} data-testid="monthly-planner">
      <aside className={styles.side} aria-label="월·과목 선택">
        <div>
          <p className={styles.sideLabel}>
            {academicYear}학년도 {semester}학기
          </p>
          <div className={styles.months} role="group" aria-label="월 선택">
            {months.map((value) => (
              <button key={value} type="button" className={styles.month} aria-pressed={value === month} onClick={() => setMonth(value)} data-testid={`planner-month-${value}`}>
                {value}월<small>{countIn(value) > 0 ? `${countIn(value)}개` : '–'}</small>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className={styles.sideLabel}>과목</p>
          <div className={styles.subjects} role="group" aria-label="과목 필터">
            {subjects.map((subject, index) => (
              <button key={subject} type="button" className={styles.subject} aria-pressed={!hidden.has(subject)} onClick={() => toggleSubject(subject)} data-testid="planner-subject">
                <span className={styles.dot} data-c={String(index % 6)} />
                <span>{subject}</span>
                <span className={styles.count}>{entries.filter((entry) => entry.subjectName === subject).length}</span>
              </button>
            ))}
          </div>
        </div>
        <ul className={styles.legend} aria-label="표시 기준">
          <li>날짜가 적힌 계획 → 날짜 칸</li>
          <li>&lsquo;n주&rsquo; 계획 → 주차 줄 (학교 주차 그대로)</li>
          <li>월만 적힌 계획 → 월 전체 줄</li>
          <li>날짜를 알 수 없음 → 따로 모음</li>
          {mode === 'admin' && <li>점선 = 분석 후보(미확정)</li>}
        </ul>
      </aside>

      <section className={styles.main} aria-label={`${month}월 운영 계획`}>
        <div className={styles.bar}>
          <button type="button" className={styles.navButton} onClick={() => setMonth(months[position - 1])} disabled={position <= 0} aria-label="이전 달">
            <ChevronLeftIcon size={16} />
          </button>
          <button type="button" className={styles.navButton} onClick={() => setMonth(months[position + 1])} disabled={position >= months.length - 1} aria-label="다음 달">
            <ChevronRightIcon size={16} />
          </button>
          <h4 data-testid="planner-title">{placement.year === null ? `${academicYear}학년도 ${month}월` : `${placement.year}년 ${month}월`}</h4>
          <span className={styles.count}>{placement.total}개</span>
          <div className={styles.views} role="group" aria-label="보기 방식">
            <button type="button" aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>
              달력
            </button>
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} data-testid="planner-view-list">
              주차 목록
            </button>
          </div>
        </div>

        {view === 'calendar' ? (
          <>
            {(placement.monthSummary.length > 0 || placement.weekBands.length > 0 || placement.undated.length > 0) && (
              <div className={styles.bands}>
                {placement.monthSummary.length > 0 && (
                  <div className={styles.band} data-testid="planner-month-band">
                    <span className={styles.bandLabel}>{month}월 전체</span>
                    <div className={styles.bandItems}>{placement.monthSummary.map(chip)}</div>
                  </div>
                )}
                {placement.weekBands.map((band) => (
                  <div key={band.week} className={styles.band} data-testid="planner-week-band">
                    <span className={styles.bandLabel}>{band.week}주</span>
                    <div className={styles.bandItems}>{band.entries.map(chip)}</div>
                  </div>
                ))}
                {placement.undated.length > 0 && (
                  <div className={styles.band}>
                    <span className={styles.bandLabel}>날짜 미확인</span>
                    <div className={styles.bandItems}>{placement.undated.map(chip)}</div>
                  </div>
                )}
              </div>
            )}
            {calendarYear(academicYear, month) === null ? (
              <p className={styles.yearUnknown}>
                {academicYear}학년도 {month}월은 학사일정으로 실제 연도를 확인하기 전이라 날짜 칸을 그리지 않아요. 원문의 주차·월 정보만 위에 보여 줘요.
              </p>
            ) : (
              <div className={styles.grid} role="grid" aria-label={`${placement.year}년 ${month}월 달력`}>
                {weekdays.map((day) => (
                  <div key={day} className={styles.weekday} role="columnheader">
                    {day}
                  </div>
                ))}
                {placement.cells.map((cell, index) =>
                  cell ? (
                    <div key={cell.iso} className={styles.day} role="gridcell">
                      <span className={styles.dayNo}>{cell.day}</span>
                      {cell.entries.slice(0, MAX_PER_DAY).map((entry) => (
                        <button
                          key={entry.rowKey}
                          type="button"
                          className={styles.event}
                          aria-pressed={selected?.rowKey === entry.rowKey}
                          data-candidate={mode === 'admin' && entry.status === 'CANDIDATE' ? 'true' : undefined}
                          onClick={() => setSelected(entry)}
                          title={`${entry.subjectName} · ${short(entry)}`}
                          data-testid="planner-event"
                        >
                          <span className={styles.dot} data-c={color(entry)} />
                          <span>{short(entry)}</span>
                        </button>
                      ))}
                      {cell.entries.length > MAX_PER_DAY && (
                        <button type="button" className={styles.more} onClick={() => setSelected(cell.entries[MAX_PER_DAY])}>
                          +{cell.entries.length - MAX_PER_DAY}개 더
                        </button>
                      )}
                    </div>
                  ) : (
                    <div key={`blank-${index}`} className={styles.day} data-blank="true" role="gridcell" />
                  ),
                )}
              </div>
            )}
          </>
        ) : byWeekList.length === 0 ? (
          <div className={styles.empty}>
            <strong>{month}월 계획이 없어요</strong>
            <span className={styles.count}>다른 달을 고르거나 과목 필터를 확인해 주세요.</span>
          </div>
        ) : (
          <ul className={styles.list} data-testid="planner-list">
            {byWeekList.map(({ group, entry }, index) => (
              <li key={`${group}-${entry.rowKey}`}>
                {(index === 0 || byWeekList[index - 1].group !== group) && <p className={styles.listGroup}>{group}</p>}
                <button type="button" className={styles.listItem} onClick={() => setSelected(entry)}>
                  <span className={styles.dot} data-c={color(entry)} />
                  <span style={{ minWidth: 0 }}>
                    <strong>
                      {entry.subjectName} · {entry.unit ?? '단원 미확인'}
                    </strong>
                    <span className={styles.sub}>{entry.content ?? entry.asWritten}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && <EntryDetail entry={selected} mode={mode} colorIndex={color(selected)} onClose={() => setSelected(null)} onOpenSource={onOpenSource} />}
    </div>
  )
}

function EntryDetail({
  entry,
  mode,
  colorIndex,
  onClose,
  onOpenSource,
}: {
  entry: TeachingPlanEntry
  mode: 'student' | 'admin'
  colorIndex: string
  onClose: () => void
  onOpenSource?: (page: number) => void
}) {
  const field = (label: string, value: string | string[] | null, key: string) => {
    const text = Array.isArray(value) ? value.join('\n') : value
    const missing = !text
    if (missing && mode === 'student') return null
    return (
      <div className={styles.field} key={key}>
        <dt>{label}</dt>
        <dd className={missing ? styles.missing : undefined}>{missing ? (entry.missingFields.includes(key) ? '분석기가 읽지 못했어요 · 원문 확인 필요' : '원문에 적혀 있지 않아요') : text}</dd>
      </div>
    )
  }
  return (
    <aside className={styles.detail} aria-label="계획 상세" data-testid="planner-detail">
      <button type="button" className={styles.close} onClick={onClose} aria-label="상세 닫기">
        <CloseIcon size={16} />
      </button>
      <span className={styles.detailSubject}>
        <span className={styles.dot} data-c={colorIndex} />
        {entry.subjectName}
      </span>
      <h5>{entry.unit ?? '단원 미확인'}</h5>
      <span className={styles.when}>
        {entry.asWritten} · {precisionLabel[entry.precision]} 단위
      </span>
      {mode === 'admin' && (
        <p className={styles.statusLine} data-tone={entry.status === 'CONFIRMED' ? 'neutral' : undefined}>
          {entry.status === 'CONFIRMED' ? '확정됨 · 학생에게 공개' : `분석 후보 · 검토 필요${entry.missingFields.length ? ` (읽지 못한 칸 ${entry.missingFields.length}개)` : ''}`}
        </p>
      )}
      <dl style={{ margin: 0 }}>
        {field('학습 내용', entry.content, 'content')}
        {field('성취기준', entry.achievementStandards.length ? entry.achievementStandards : null, 'achievementStandards')}
        {field('수업 방법', entry.teachingMethods.length ? entry.teachingMethods : null, 'teachingMethods')}
        {field('평가 방법', entry.assessmentMethods.length ? entry.assessmentMethods : null, 'assessmentMethods')}
        {field('연계 수행평가', entry.linkedAssessments.length ? entry.linkedAssessments : null, 'linkedAssessments')}
        {field('특별 일정', entry.specialSchedule, 'specialSchedule')}
      </dl>
      <button
        type="button"
        className={styles.sourceButton}
        disabled={!entry.sourcePdfPageNumber || !onOpenSource}
        onClick={() => entry.sourcePdfPageNumber && onOpenSource?.(entry.sourcePdfPageNumber)}
        data-testid="planner-open-source"
      >
        {entry.sourcePdfPageNumber ? `원문 ${entry.sourcePdfPageNumber}쪽 보기` : '원문 쪽 정보 없음'}
      </button>
    </aside>
  )
}
