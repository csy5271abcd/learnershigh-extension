import { useMemo, useState, type ReactNode } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '../AssessmentIcons.tsx'
import { Modal } from '../Modal.tsx'
import { monthsOf, placeEntries, precisionLabel, semesterMonths, subjectColorIndex, unplacedEntries, whenLabel, type TeachingPlanEntry } from './teachingPlanPlacement.ts'
import styles from './monthlyPlanner.module.css'

// 월별 교수·학습 운영 계획 Monthly Planner (Student 조회 · Admin 검토 공용 렌더러).
// - mode='student': 확정(CONFIRMED) 계획만 받는다는 전제의 읽기 전용 화면. 후보·누락 정보는 보이지 않는다.
// - mode='admin'  : 분석 후보(점선)·확정 표시, 읽지 못한 칸 표시. 편집·확정은 관리자 검토 단계(TeachingPlanStep)가 한다.
// 날짜 규칙은 teachingPlanPlacement.ts (원문에 없는 날짜를 만들지 않음).

const weekdays = ['일', '월', '화', '수', '목', '금', '토']
/** 오늘(브라우저 날짜) — 표시용 강조·'이번 달' 이동에만 쓴다. 일정 배치에는 쓰지 않는다 */
const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
/** A26: 날짜 칸에 보이는 일정 수 — 넓은 화면 4개, 좁은 화면 3개. 나머지는 '+N개' */
const maxPerDay = () => (typeof window !== 'undefined' && window.matchMedia('(max-width: 1280px)').matches ? 3 : 4)
const dateLabel = (iso: string) => `${Number(iso.slice(0, 4))}년 ${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`

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
  const firstWithData = months.find((month) => entries.some((entry) => monthsOf(entry).includes(month))) ?? months[0]
  const [month, setMonth] = useState(firstWithData)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  // 좁은 화면은 주차 목록을 기본으로 (7열 Grid가 너무 좁다)
  const [view, setView] = useState<'calendar' | 'list'>(() => (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? 'list' : 'calendar'))
  const [selected, setSelected] = useState<TeachingPlanEntry | null>(null)
  const [dayList, setDayList] = useState<string | null>(null)
  const [perDay] = useState(maxPerDay)
  const visible = entries.filter((entry) => !hidden.has(entry.subjectName))
  const placement = placeEntries(visible, academicYear, month)
  const unplaced = unplacedEntries(visible)
  // 이 학기 달(1학기 3~8월, 2학기 9~2월) 밖 시기의 행도 버리지 않고 따로 보여 준다 (예: 원문에 다른 달·연도가 적힌 행)
  const outsideTerm = visible.filter((entry) => monthsOf(entry).length > 0 && !monthsOf(entry).some((value) => months.includes(value)))
  const position = months.indexOf(month)

  const countIn = (value: number) => visible.filter((entry) => monthsOf(entry).includes(value)).length
  const toggleSubject = (subject: string) =>
    setHidden((previous) => {
      const next = new Set(previous)
      if (next.has(subject)) next.delete(subject)
      else next.add(subject)
      return next
    })
  const color = (entry: TeachingPlanEntry) => String(subjectColorIndex(subjects, entry.subjectName))
  const short = (entry: TeachingPlanEntry) => entry.unit ?? entry.content ?? entry.specialSchedule ?? whenLabel(entry)
  const chip = (entry: TeachingPlanEntry) => (
    <button
      key={entry.id}
      type="button"
      className={styles.chip}
      aria-pressed={selected?.id === entry.id}
      data-candidate={mode === 'admin' && entry.status === 'CANDIDATE' ? 'true' : undefined}
      onClick={() => setSelected(entry)}
      title={`${entry.subjectName} · ${short(entry)} (${whenLabel(entry)})`}
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
    ...placement.termWeekBands.flatMap((band) => band.entries.map((entry) => ({ group: `학기 ${band.week}주차`, entry }))),
    ...(placement.year === null ? [] : placement.cells.flatMap((cell) => (cell ? cell.entries.filter((entry) => entry.dateFrom === cell.iso).map((entry) => ({ group: `${month}월 ${cell.day}일`, entry })) : []))),
    ...placement.undated.map((entry) => ({ group: `${month}월 · 날짜·주차 미확인`, entry })),
  ]

  return (
    <div className={styles.planner} data-testid="monthly-planner">
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
          <li>&lsquo;n월 n주&rsquo; → 그 달의 주차 줄 (학교 주차 그대로)</li>
          <li>&lsquo;학기 n주차&rsquo; → 날짜로 바꾸지 않고 주차 줄</li>
          <li>월만 적힌 계획 → 월 전체 줄 (여러 달이면 각 달)</li>
          <li>달을 알 수 없음 → 아래 따로 모음</li>
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
          <button
            type="button"
            className={styles.todayButton}
            onClick={() => setMonth(Number(todayIso().slice(5, 7)))}
            disabled={!months.includes(Number(todayIso().slice(5, 7))) || month === Number(todayIso().slice(5, 7))}
            title={months.includes(Number(todayIso().slice(5, 7))) ? '이번 달로 이동' : '이번 달은 이 학기 밖이에요'}
            data-testid="planner-today"
          >
            이번 달
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
            {(placement.monthSummary.length > 0 || placement.weekBands.length > 0 || placement.termWeekBands.length > 0 || placement.undated.length > 0) && (
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
                {placement.termWeekBands.map((band) => (
                  <div key={`term-${band.week}`} className={styles.band} data-testid="planner-term-week-band">
                    <span className={styles.bandLabel}>학기 {band.week}주차</span>
                    <div className={styles.bandItems}>{band.entries.map(chip)}</div>
                  </div>
                ))}
                {placement.undated.length > 0 && (
                  <div className={styles.band} data-testid="planner-undated-band">
                    <span className={styles.bandLabel}>날짜·주차 미확인</span>
                    <div className={styles.bandItems}>{placement.undated.map(chip)}</div>
                  </div>
                )}
              </div>
            )}
            {placement.year === null ? (
              <p className={styles.yearUnknown}>
                {academicYear}학년도 {month}월은 학사일정으로 실제 연도를 확인하기 전이라 날짜 칸을 그리지 않아요. 원문의 주차·월 정보만 위에 보여 줘요.
              </p>
            ) : (
              <>
              {Object.keys(placement.tentativeDates).length > 0 && (
                <p className={styles.gridNote} data-testid="planner-grid-note">
                  &lsquo;n월 m주&rsquo; 계획은 이 달력의 m번째 줄(일요일 시작) 날짜에 <strong>임시로</strong> 나눠 보여 줘요. 학교 학사력의 주차·실제 수업일과 다를 수 있고, 날짜를 저장하지 않아요.
                </p>
              )}
              <div className={styles.grid} role="grid" aria-label={`${placement.year}년 ${month}월 달력`}>
                {weekdays.map((day) => (
                  <div key={day} className={styles.weekday} role="columnheader">
                    {day}
                  </div>
                ))}
                {placement.cells.map((cell, index) =>
                  cell ? (
                    <div key={cell.iso} className={styles.day} role="gridcell" data-weekday={index % 7} data-today={cell.iso === todayIso() || undefined}>
                      <span className={styles.dayNo}>{cell.day}</span>
                      {cell.entries.slice(0, perDay).map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          className={styles.event}
                          aria-pressed={selected?.id === entry.id}
                          data-candidate={mode === 'admin' && entry.status === 'CANDIDATE' ? 'true' : undefined}
                          data-tentative={cell.tentativeIds.includes(entry.id) || undefined}
                          onClick={() => setSelected(entry)}
                          title={`${entry.subjectName} · ${short(entry)}${cell.tentativeIds.includes(entry.id) ? ` (${whenLabel(entry)} · 임시 배치)` : ''}`}
                          data-testid="planner-event"
                          data-date={cell.iso}
                        >
                          <span className={styles.dot} data-c={color(entry)} />
                          <span>
                            {entry.subjectName} · {short(entry)}
                          </span>
                        </button>
                      ))}
                      {cell.entries.length > perDay && (
                        <button type="button" className={styles.more} onClick={() => setDayList(cell.iso)} data-testid="planner-more">
                          +{cell.entries.length - perDay}개
                        </button>
                      )}
                    </div>
                  ) : (
                    <div key={`blank-${index}`} className={styles.day} data-blank="true" role="gridcell" />
                  ),
                )}
              </div>
              </>
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
              <li key={`${group}-${entry.id}`}>
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
        {outsideTerm.length > 0 && (
          <div className={styles.band} data-testid="planner-outside-term">
            <span className={styles.bandLabel}>이 학기 달 밖의 계획 {outsideTerm.length}개</span>
            <div className={styles.bandItems}>{outsideTerm.map(chip)}</div>
          </div>
        )}
        {unplaced.length > 0 && (
          <div className={styles.band} data-testid="planner-unplaced">
            <span className={styles.bandLabel}>달을 정할 수 없는 계획 {unplaced.length}개</span>
            <div className={styles.bandItems}>{unplaced.map(chip)}</div>
          </div>
        )}
      </section>

      {dayList && !selected && (
        <Modal compact title={`${dateLabel(dayList)} 계획`} onRequestClose={() => setDayList(null)} footer={<button type="button" className={styles.sourceButton} onClick={() => setDayList(null)}>닫기</button>}>
          <ul className={styles.dayList} data-testid="planner-day-list">
            {(placement.cells.find((cell) => cell?.iso === dayList)?.entries ?? []).map((entry) => (
              <li key={entry.id}>
                <button type="button" className={styles.listItem} onClick={() => setSelected(entry)} data-testid="planner-day-list-item">
                  <span className={styles.dot} data-c={color(entry)} />
                  <span style={{ minWidth: 0 }}>
                    <strong>
                      {entry.subjectName} · {short(entry)}
                    </strong>
                    <span className={styles.sub}>{whenLabel(entry)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
      {selected && (
        <EntryDetail
          entry={selected}
          mode={mode}
          colorIndex={color(selected)}
          shownDates={placement.tentativeDates[selected.id] ?? null}
          onClose={() => setSelected(null)}
          onOpenSource={onOpenSource}
        />
      )}
    </div>
  )
}

function EntryDetail({
  entry,
  mode,
  colorIndex,
  shownDates,
  onClose,
  onOpenSource,
}: {
  entry: TeachingPlanEntry
  mode: 'student' | 'admin'
  colorIndex: string
  /** A26: 주차 기준 임시 배치로 이 달 달력에 표시한 날짜(원문 날짜 아님). 원문 날짜·월 단위면 null */
  shownDates: string[] | null
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
    <Modal
      title={`${entry.subjectName} · 교수·학습 운영계획`}
      onRequestClose={onClose}
      footer={
        <>
          <button type="button" className={styles.closeButton} onClick={onClose} data-testid="planner-detail-close">
            닫기
          </button>
          <button
            type="button"
            className={styles.sourceButton}
            disabled={!entry.sourcePdfPageNumber || !onOpenSource}
            onClick={() => entry.sourcePdfPageNumber && onOpenSource?.(entry.sourcePdfPageNumber)}
            data-testid="planner-open-source"
          >
            {entry.sourcePdfPageNumber ? `원문 근거 보기 (${entry.sourcePdfPageNumber}쪽)` : '원문 쪽 정보 없음'}
          </button>
        </>
      }
    >
    <div className={styles.detail} data-testid="planner-detail">
      <span className={styles.detailSubject}>
        <span className={styles.dot} data-c={colorIndex} />
        {entry.subjectName}
      </span>
      <h5>{entry.unit ?? '단원 미확인'}</h5>
      <dl className={styles.whenTable}>
        <div className={styles.field}>
          <dt>운영 시기(원문)</dt>
          <dd data-testid="planner-detail-when">
            {whenLabel(entry)} · {precisionLabel[entry.precision]} 단위{entry.asWritten ? ` · 원문 “${entry.asWritten}”` : ''}
          </dd>
        </div>
        {shownDates && shownDates.length > 0 && (
          <div className={styles.field} data-testid="planner-detail-tentative">
            <dt>달력 표시 날짜</dt>
            <dd>
              {shownDates.map(dateLabel).join(', ')}
              <span className={styles.tentativeNote}>주차 기준 임시 배치 · 실제 수업일 미확정 · 저장되지 않는 표시용 날짜</span>
            </dd>
          </div>
        )}
      </dl>
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
        {field('비고', entry.note, 'note')}
      </dl>
    </div>
    </Modal>
  )
}
