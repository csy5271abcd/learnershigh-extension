import { useState } from 'react'
import { Link } from 'react-router'
import type { AcademicContext, EvaluationPlan, SchoolAssessment } from '../../api/types.ts'
import { kindText, monthCalendar, type CalendarEvent } from '../../model/homeCalendar.ts'
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
  const calendar = monthCalendar({ academicYear, month, planEntries, assessments, confirmedPlans, context, subjectName, subject: subject || null })
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
        <Link to={monthlyPlanPath} className={styles.textLink}>
          운영계획 크게 보기
        </Link>
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
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              className={styles.day}
              data-today={iso === today || undefined}
              data-has={events.length > 0 || undefined}
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
                <span key={event.key} className={styles.event} data-kind={event.kind} title={`${event.subject} · ${kindText[event.kind]} · ${event.title}`}>
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
          <DayDetail events={openDay ? (byDate[openDay] ?? []) : openEvent ? [openEvent] : []} />
        </Modal>
      )}
    </section>
  )
}

function DayDetail({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) return <p className={styles.muted}>이 날짜에 등록된 일정이 없어요.</p>
  return (
    <ul className={styles.dayList} data-testid="home-calendar-day-detail">
      {events.map((event) => (
        <li key={event.key} className={styles.dayItem}>
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
        </li>
      ))}
      {events.some((event) => event.meta.includes('날짜 미정')) && (
        <li className={styles.muted}>날짜 미정 일정은 원문 시기를 그대로 보여 준 것이에요. 실제 날짜가 정해지지 않았어요(D-day 없음).</li>
      )}
    </ul>
  )
}
