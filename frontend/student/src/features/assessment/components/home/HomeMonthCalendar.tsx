import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { listCalendarPlacements, resetCalendarPlacements, saveCalendarPlacement } from '../../api/calendarPlacementApi.ts'
import type { AcademicContext, EvaluationPlan, SchoolAssessment } from '../../api/types.ts'
import { isAssessmentReadOnlyView } from '../../api/viewMode.ts'
import { kindText, monthCalendar, type CalendarEvent, type TentativePlacement } from '../../model/homeCalendar.ts'
import { monthlyPlanPath } from '../../routes/paths.ts'
import { Modal } from '../Modal.tsx'
import { semesterMonths, type TeachingPlanEntry } from '../teaching-plan/teachingPlanPlacement.ts'
import styles from './homeDashboard.module.css'

// A27-UX 학생 홈 월간 달력(일~토 날짜 칸) — A28-23(2026-11-22 사용자 지시)으로 복원하고 과목별 일정을 날짜 칸에 함께 보인다.
// - 날짜 칸: 원문 날짜가 있는 학교 운영계획(수업) · 내 평가일(수행) · 제출 마감(마감). 각 일정에 과목 이름을 붙인다.
// - A28-26: '잠정'(주차 임시 배치)은 홈에서 없앴다. 색은 4종 — 수행·수업 무채색, 마감 빨강, 지필 파랑(글자 배지 함께).
// - 이달 일정 · 날짜 미정: 월만 적힌 운영계획 · 학교 확정 수행평가(공식 시기) · 확정 지필평가(시기). 날짜·D-day 를 만들지 않는다.
// - 중요 일정(마감·수행·지필)을 먼저, 배지 글자 + 색으로 구분(색만으로 구분하지 않음). 칸마다 3개 + '+N개 더 보기'(그날 상세).
// 데이터 규칙은 model/homeCalendar.ts (월별 운영계획 탭과 같은 배치 규칙 placeEntries).
// - A28-33: 'n월 m주'·'n월' 운영계획은 개인 임시 배치(점선 테두리). 원문 범위 안에서만 끌어 옮기고(키보드·터치는 상세 창의 날짜 선택),
//   화면을 먼저 바꾼 뒤 서버(§30-b)에 저장하고 실패하면 되돌린다. '배치 초기화'는 이 학기 저장값을 지운다. 공식 날짜·D-day 와 무관.

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

export function HomeMonthCalendar({
  academicYear,
  semester,
  today,
  assessments,
  confirmedPlans,
  context,
  subjectName,
  planEntries,
  planStatus,
}: {
  academicYear: number
  semester: number
  today: string
  assessments: SchoolAssessment[]
  confirmedPlans: EvaluationPlan[]
  context: AcademicContext | undefined
  subjectName: (subjectId: string) => string
  planEntries: TeachingPlanEntry[]
  /** 운영계획 조회 상태 — 실패를 '계획 없음'으로 보이지 않게 한다 */
  planStatus: 'loading' | 'error' | 'success'
}) {
  const months = semesterMonths(semester)
  const todayMonth = Number(today.slice(5, 7))
  const [month, setMonth] = useState(months.includes(todayMonth) ? todayMonth : months[0])
  const [subject, setSubject] = useState<string>('')
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [openEvent, setOpenEvent] = useState<CalendarEvent | null>(null)
  const position = months.indexOf(month)
  const readOnly = isAssessmentReadOnlyView()
  const [placements, setPlacements] = useState<Record<string, string>>({})
  const [placementState, setPlacementState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [placementError, setPlacementError] = useState<string | null>(null)
  const [dragging, setDragging] = useState<TentativePlacement | null>(null)
  const saveSeq = useRef<Record<string, number>>({})
  // A28-36: 관리자 읽기 전용 보기도 학생과 같은 날짜로 보이게 조회한다(옮기기·초기화는 학생 본인만)
  useEffect(() => {
    let cancelled = false
    listCalendarPlacements(academicYear, semester).then(
      (result) => {
        if (cancelled) return
        setPlacements(Object.fromEntries(result.items.map((item) => [item.sourceKey, item.displayDate])))
        setPlacementState('ready')
      },
      () => !cancelled && setPlacementState('error'),
    )
    return () => {
      cancelled = true
    }
  }, [academicYear, semester])
  const canMove = placementState === 'ready' && !readOnly
  /** 낙관적 이동 → 저장 → 실패하면 되돌림(그 사이 다시 옮겼으면 최신 것을 남긴다) */
  const move = (target: TentativePlacement, iso: string) => {
    if (!canMove || iso < target.rangeFrom || iso > target.rangeTo || iso === target.date) return
    const key = target.sourceKey
    const previous = placements[key]
    const seq = (saveSeq.current[key] ?? 0) + 1
    saveSeq.current[key] = seq
    setPlacementError(null)
    setPlacements((current) => ({ ...current, [key]: iso }))
    saveCalendarPlacement({ academicYear, semester, sourceKey: key, displayDate: iso, rangeFrom: target.rangeFrom, rangeTo: target.rangeTo }).catch(() => {
      if (saveSeq.current[key] !== seq) return
      setPlacements((current) => {
        const next = { ...current }
        if (previous === undefined) delete next[key]
        else next[key] = previous
        return next
      })
      setPlacementError('옮긴 위치를 저장하지 못해 되돌렸어요.')
    })
  }
  const resetAll = () => {
    if (!canMove) return
    const previous = placements
    saveSeq.current = {}
    setPlacementError(null)
    setPlacements({})
    resetCalendarPlacements(academicYear, semester).catch(() => {
      setPlacements(previous)
      setPlacementError('배치를 초기화하지 못했어요.')
    })
  }
  const calendar = monthCalendar({ academicYear, month, planEntries, assessments, confirmedPlans, context, subjectName, subject: subject || null, placements })
  const anyMoved = Object.keys(placements).length > 0
  const { year, cells, byDate } = calendar
  // 과목 필터: 등록된 실제 수강 과목(학적) 기준
  const subjects = [...new Set((context?.subjects ?? []).map((item) => item.name))]

  return (
    <section className={styles.calendarCard} aria-labelledby="home-calendar-title" data-testid="home-calendar">
      <div className={styles.calendarHead}>
        <div className={styles.calendarTitleRow}>
          <h2 id="home-calendar-title" className={styles.calendarTitle}>
            {year}년 {month}월
          </h2>
          <div className={styles.monthNav} role="group" aria-label="월 이동">
            <button type="button" className={styles.navButton} onClick={() => setMonth(months[position - 1])} disabled={position <= 0} aria-label="이전 달">
              ‹
            </button>
            <button type="button" className={styles.navButton} onClick={() => setMonth(months[position + 1])} disabled={position >= months.length - 1} aria-label="다음 달">
              ›
            </button>
            {months.includes(todayMonth) && month !== todayMonth && (
              <button type="button" className={styles.todayButton} onClick={() => setMonth(todayMonth)}>
                이번 달
              </button>
            )}
          </div>
          {subjects.length > 1 && (
            <select className={styles.subjectSelect} aria-label="과목 필터" value={subject} onChange={(event) => setSubject(event.target.value)} data-testid="home-calendar-subject">
              <option value="">전체 과목</option>
              {subjects.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className={styles.calendarHeadActions}>
          {anyMoved && canMove && (
            <button type="button" className={styles.todayButton} onClick={resetAll} data-testid="home-calendar-placement-reset">
              배치 초기화
            </button>
          )}
          <Link to={monthlyPlanPath} className={styles.textLink}>
            운영계획 크게 보기
          </Link>
        </div>
      </div>
      <dl className={styles.monthSummary} data-testid="home-calendar-summary">
        <div>
          <dt>내 수행평가 일정</dt>
          <dd>{calendar.counts.mine}건</dd>
        </div>
        <div>
          <dt>학교 운영계획</dt>
          <dd>{planStatus === 'error' ? '불러오지 못함' : planStatus === 'loading' ? '…' : `${calendar.counts.plans}건`}</dd>
        </div>
        <div>
          <dt>날짜 없이 정해진 일정</dt>
          <dd>{planStatus === 'success' ? `${calendar.counts.undated}건` : '–'}</dd>
        </div>
      </dl>
      <ul className={styles.legend} aria-label="표시 기준">
        <li>
          <span className={styles.kindBadge} data-tone="evaluation">수행</span>
          평가일
        </li>
        <li>
          <span className={styles.kindBadge} data-tone="deadline">마감</span>
          제출 마감
        </li>
        <li>
          <span className={styles.kindBadge} data-tone="written">지필</span>
          지필평가
        </li>
        <li>
          <span className={styles.kindBadge} data-tone="plan">수업</span>
          학교 운영계획
        </li>
      </ul>
      {placementState === 'error' && <p className={styles.inlineError}>내 배치를 불러오지 못해 기본 배치로 보여요.</p>}
      {placementError && (
        <p className={styles.inlineError} role="alert" data-testid="home-calendar-placement-error">
          {placementError}
        </p>
      )}
      <div className={styles.grid} role="grid" aria-label={`${year}년 ${month}월 달력`}>
        {weekdays.map((weekday, index) => (
          <div key={weekday} className={styles.weekday} role="columnheader" data-weekend={index === 0 || index === 6 || undefined}>
            {weekday}
          </div>
        ))}
        {cells.map((iso, index) => {
          if (!iso) return <div key={`blank-${index}`} className={styles.dayBlank} role="gridcell" />
          const events = byDate[iso] ?? []
          const day = Number(iso.slice(8, 10))
          const weekday = index % 7
          const droppable = Boolean(dragging && iso >= dragging.rangeFrom && iso <= dragging.rangeTo)
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              className={styles.day}
              data-today={iso === today || undefined}
              data-has={events.length > 0 || undefined}
              data-drop={droppable || undefined}
              data-tentative-keys={events.filter((event) => event.tentative).map((event) => event.tentative?.sourceKey).join(' ') || undefined}
              onDragOver={(dragEvent) => {
                if (droppable) dragEvent.preventDefault()
              }}
              onDrop={(dragEvent) => {
                dragEvent.preventDefault()
                if (dragging && droppable) move(dragging, iso)
                setDragging(null)
              }}
              aria-label={`${month}월 ${day}일${events.length ? `, 일정 ${events.length}개` : ''}`}
              onClick={() => setOpenDay(iso)}
              data-testid="home-calendar-day"
              data-date={iso}
            >
              <span className={styles.dayNumber} data-weekend={weekday === 0 || weekday === 6 || undefined}>
                {day}
                {iso === today && <span className={styles.todayBadge}>오늘</span>}
              </span>
              {events.slice(0, 3).map((event) => (
                <span
                  key={event.key}
                  className={styles.event}
                  data-kind={event.kind}
                  data-tentative={event.tentative ? 'true' : undefined}
                  title={`${event.subject} · ${kindText[event.kind]} · ${event.title}${event.tentative ? ' · 날짜 미정' : ''}`}
                  draggable={Boolean(event.tentative && canMove)}
                  onDragStart={(dragEvent) => {
                    if (!event.tentative) return
                    dragEvent.dataTransfer.effectAllowed = 'move'
                    dragEvent.dataTransfer.setData('text/plain', event.tentative.sourceKey)
                    setDragging(event.tentative)
                  }}
                  onDragEnd={() => setDragging(null)}
                  data-testid={event.tentative ? 'home-calendar-tentative' : undefined}
                  data-source-key={event.tentative?.sourceKey}
                >
                  <span className={styles.kindBadge} data-tone={event.kind}>
                    {kindText[event.kind]}
                  </span>
                  <span className={styles.eventText}>
                    {event.subject} · {event.title}
                  </span>
                </span>
              ))}
              {events.length > 3 && <span className={styles.more}>+{events.length - 3}개 더 보기</span>}
            </button>
          )
        })}
      </div>
      {calendar.monthUndated.length > 0 && (
        <div className={styles.undatedStrip} data-testid="home-calendar-undated">
          <p className={styles.undatedTitle}>이달 일정 · 날짜 미정 {calendar.monthUndated.length}건</p>
          <ul className={styles.undatedList}>
            {calendar.monthUndated.map((event) => (
              <li key={event.key}>
                <button type="button" className={styles.undatedItem} data-kind={event.kind} onClick={() => setOpenEvent(event)}>
                  <span className={styles.kindBadge} data-tone={event.kind}>
                    {kindText[event.kind]}
                  </span>
                  <span className={styles.eventText}>
                    {event.subject} · {event.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {calendar.noTiming.length > 0 && (
        <details className={styles.undatedStrip} data-testid="home-calendar-no-timing">
          <summary className={styles.undatedTitle}>시기 미정 {calendar.noTiming.length}건</summary>
          <ul className={styles.undatedList}>
            {calendar.noTiming.map((event) => (
              <li key={event.key}>
                <button type="button" className={styles.undatedItem} data-kind={event.kind} onClick={() => setOpenEvent(event)}>
                  <span className={styles.kindBadge} data-tone={event.kind}>
                    {kindText[event.kind]}
                  </span>
                  <span className={styles.eventText}>
                    {event.subject} · {event.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {planStatus === 'error' && <p className={styles.inlineError}>학교 운영계획을 불러오지 못했어요. 내 수행평가 일정만 보이고 있어요.</p>}
      {(openDay || openEvent) && (
        <Modal
          title={openDay ? `${Number(openDay.slice(5, 7))}월 ${Number(openDay.slice(8, 10))}일 일정` : '일정'}
          compact
          onRequestClose={() => {
            setOpenDay(null)
            setOpenEvent(null)
          }}
          footer={
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => {
                setOpenDay(null)
                setOpenEvent(null)
              }}
            >
              닫기
            </button>
          }
        >
          <DayDetail
            events={openDay ? (byDate[openDay] ?? []) : openEvent ? [openEvent] : []}
            canMove={canMove}
            onMove={(target, iso) => {
              move(target, iso)
              if (openDay) setOpenDay(iso)
            }}
          />
        </Modal>
      )}
    </section>
  )
}

/** 범위(같은 달)의 날짜 목록 */
function datesIn(from: string, to: string): string[] {
  const out: string[] = []
  for (let day = Number(from.slice(8, 10)); day <= Number(to.slice(8, 10)); day++) out.push(`${from.slice(0, 8)}${String(day).padStart(2, '0')}`)
  return out
}
const dateText = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일 (${weekdays[new Date(`${iso}T00:00:00`).getDay()]})`

function DayDetail({ events, canMove, onMove }: { events: CalendarEvent[]; canMove: boolean; onMove: (target: TentativePlacement, iso: string) => void }) {
  if (events.length === 0) return <p className={styles.muted}>이 날짜에 등록된 일정이 없어요.</p>
  return (
    <ul className={styles.dayList} data-testid="home-calendar-day-detail">
      {events.map((event) => (
        <li key={event.key} className={styles.dayItem} data-source-key={event.tentative?.sourceKey}>
          <span className={styles.kindBadge} data-tone={event.kind}>
            {kindText[event.kind]}
          </span>
          {event.to ? (
            <Link to={event.to} className={styles.dayTitle}>
              {event.subject} · {event.title}
            </Link>
          ) : (
            <span className={styles.dayTitle}>
              {event.subject} · {event.title}
            </span>
          )}
          <span className={styles.muted}>{event.meta}</span>
          {/* A28-33: 끌어 옮기기의 키보드·터치 대안 — 원문 범위 안 날짜만 고를 수 있다 */}
          {event.tentative && canMove && (
            <PlacementControls placement={event.tentative} onMove={onMove} />
          )}
        </li>
      ))}
      {events.some((event) => event.meta.includes('날짜 미정')) && (
        <li className={styles.muted}>날짜 미정 = 원문 시기 그대로 · 실제 날짜 미정(D-day 없음)</li>
      )}
    </ul>
  )
}

function PlacementControls({ placement, onMove }: { placement: TentativePlacement; onMove: (target: TentativePlacement, iso: string) => void }) {
  return (
    <span className={styles.placementControls}>
      <label>
        표시 날짜{' '}
        <select value={placement.date} onChange={(change) => onMove(placement, change.target.value)} data-testid="home-calendar-placement-select">
          {datesIn(placement.rangeFrom, placement.rangeTo).map((iso) => (
            <option key={iso} value={iso}>
              {dateText(iso)}
            </option>
          ))}
        </select>
      </label>
      {placement.moved && (
        <button type="button" className={styles.modalClose} onClick={() => onMove(placement, placement.defaultDate)}>
          기본 위치로
        </button>
      )}
    </span>
  )
}
