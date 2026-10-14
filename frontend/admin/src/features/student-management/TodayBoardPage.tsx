import { useState, type ReactNode } from 'react'
import type { ScreenLoadState } from '../../app/useScreenLoad.ts'
import { AdminIcon } from '../../components/AdminIcons.tsx'
import { ChipGroup, ErrorState, LoadingState, NoticeState, SearchBox } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import { CompactMetric, Delta, DisclosureButton, MiniProgress, SummaryHero, ToneButton } from '../../components/AdminVisual.tsx'
import type { AdminState } from '../../store/adminStore.ts'
import { managementPointKindLabel, PLAN_DROP_POINTS, testTypeLabel, type ManagementPoint, type ManagementPointKind, type PointTarget, type StudentInsight } from '../../read-model/studentInsights.ts'
import { daysUntil, formatDday, formatPercent, formatSnapshotLabel, formatStudyTime } from '../../read-model/time.ts'
import { computeTodayBoardKpi, emptyTodayBoardFilter, todayBoardRows, todayBoardSortLabel, type TodayBoardFilter } from '../../read-model/todayBoard.ts'
import { MessageDialog, ReminderDialog } from './OutreachDialogs.tsx'
import styles from './StudentManagement.module.css'

/*
 * Today Board (TodayBoard-00 ~ 04, api-contract §33): 오늘 관리가 필요한 학생을 함께 찾는다.
 * - Mockup의 "오늘 상담" KPI · 상담 버튼 · Counseling Tab은 Wangyu 담당 영역이라 두지 않는다.
 * - 기관(branchId) Filter는 Organization Fixture가 없어 두지 않는다. (Gap)
 * - 관리 포인트는 서비스 사용 횟수가 아니라 학습 변화 · 과제 상태에서 계산한다. (read-model/studentInsights.ts)
 * - 표현: 학습 · Plan · Task · 변화 · 관리 포인트가 서로 다른 방식으로 읽히게 한다. (빨간 Badge 나열 대신)
 *   가장 중요한 관리 포인트 1개를 문장으로, 다음 1개를 한 줄로, 나머지는 "+N개 더 보기"로 접는다.
 * - 메시지 · 리마인더: 발송 요청만 준비한다. Delivery Provider 미연결이라 실제 전송 · 전송 완료 상태가 없다. (Gap: MESSAGE-REMINDER-DELIVERY)
 */

interface TodayBoardPageProps {
  state: AdminState
  load: ScreenLoadState
  onRetry: () => void
  filter: TodayBoardFilter
  onFilterChange: (filter: TodayBoardFilter) => void
  onOpenStudent: (studentId: string) => void
  onOpenTarget: (target: PointTarget) => void
}

/** 관리 포인트 표시 순서 (화면 표시 우선순위일 뿐 Business 상태가 아니다) */
const pointPriority: ManagementPointKind[] = ['deadline-passed', 'absence', 'deadline-risk', 'test-decline', 'plan-drop', 'feedback-delay', 'ai-failed', 'revision-not-applied', 'plan-low']
const sortPoints = (points: ManagementPoint[]) => [...points].sort((a, b) => pointPriority.indexOf(a.kind) - pointPriority.indexOf(b.kind))

/** 관리 포인트 출처 묶음 (상단 요약용) */
const pointSource: Record<ManagementPointKind, 'task' | 'study' | 'attendance' | 'feedback'> = {
  'deadline-passed': 'task',
  'deadline-risk': 'task',
  'ai-failed': 'task',
  'revision-not-applied': 'task',
  'plan-drop': 'study',
  'plan-low': 'study',
  'test-decline': 'study',
  absence: 'attendance',
  'feedback-delay': 'feedback',
}

/** 정말 먼저 볼 학생만 "우선 확인": 마감 지남 · 연속 미등원 · 마감이 오늘/내일 (표시 기준 · Spec 수치 없음 Gap) */
function isCritical(row: StudentInsight): boolean {
  return row.points.some((point) => {
    if (point.kind === 'deadline-passed' || point.kind === 'absence') return true
    if (point.kind === 'deadline-risk' && point.target.kind === 'task') {
      const taskId = point.target.taskId
      const task = row.activeTasks.find((item) => item.taskId === taskId)
      return task ? daysUntil(task.deadlineDate) <= 1 : false
    }
    return false
  })
}

const targetHint = (target: PointTarget) => (target.kind === 'review' ? '검토 열기' : target.kind === 'task' ? 'Task 상세 보기' : 'Student 360 보기')

export function TodayBoardPage({ state, load, onRetry, filter, onFilterChange, onOpenStudent, onOpenTarget }: TodayBoardPageProps) {
  const [draft, setDraft] = useState(filter.query)
  const [synced, setSynced] = useState(filter.query)
  if (synced !== filter.query) {
    setSynced(filter.query)
    setDraft(filter.query)
  }
  const [messageFor, setMessageFor] = useState<StudentInsight | null>(null)
  const [reminderFor, setReminderFor] = useState<StudentInsight | null>(null)
  const update = (patch: Partial<TodayBoardFilter>) => onFilterChange({ ...filter, ...patch })

  return (
    <div className={ui.page} aria-busy={load.status === 'loading'}>
      <header className={ui.headerText}>
        <h1 className={ui.title}>Today Board</h1>
        <p className={ui.lead}>{formatSnapshotLabel()} · 오늘 관리가 필요한 학생을 함께 찾아요.</p>
      </header>
      {load.status === 'loading' && <LoadingState label="Today Board를 불러오는 중이에요." />}
      {load.status === 'error' && <ErrorState title="Today Board를 불러오지 못했어요." onRetry={onRetry} />}
      {load.status === 'ready' && render(load.empty)}
      <MessageDialog state={state} row={messageFor} onClose={() => setMessageFor(null)} />
      <ReminderDialog state={state} row={reminderFor} onClose={() => setReminderFor(null)} />
    </div>
  )

  function render(empty: boolean) {
    const kpi = empty ? { attendedToday: 0, registered: 0, needsAttention: 0, feedbackPending: 0, parentReportUnsent: 0 } : computeTodayBoardKpi(state)
    const all = empty ? [] : todayBoardRows(state, emptyTodayBoardFilter)
    const rows = empty ? [] : todayBoardRows(state, filter)
    const active = filter.grade !== 'all' || filter.scope !== 'all' || filter.query.trim() !== ''
    const studentsWith = (source: (typeof pointSource)[ManagementPointKind]) => all.filter((row) => row.points.some((point) => pointSource[point.kind] === source)).length
    const reset = () => {
      setDraft('')
      onFilterChange({ ...emptyTodayBoardFilter, sort: filter.sort })
    }
    return (
      <>
        <section aria-labelledby="today-kpi">
          <h2 id="today-kpi" className="lh-visually-hidden">
            오늘 현황
          </h2>
          {/* 위계: 오늘 확인할 학생(가장 중요) → 등원 · Feedback Pending · Report 미발송 */}
          <dl className={styles.todayKpis}>
            <SummaryHero
              label="관리 필요"
              value={kpi.needsAttention}
              unit="명"
              note={`오늘 확인할 학생 · 등록 ${kpi.registered}명 중 관리 포인트가 있는 학생`}
              breakdown={[
                { label: '수행평가', value: studentsWith('task') },
                { label: '학습 변화', value: studentsWith('study') },
                { label: '출결', value: studentsWith('attendance') },
                { label: 'Feedback 대기', value: studentsWith('feedback') },
              ]}
            />
            <CompactMetric
              label="오늘 등원"
              value={`${kpi.attendedToday}/${kpi.registered}`}
              note={
                <span className={styles.metricProgress}>
                  <MiniProgress rate={kpi.registered ? kpi.attendedToday / kpi.registered : 0} label="오늘 등원 비율" />
                  기존 출결 기록 기준
                </span>
              }
            />
            <CompactMetric label="Feedback Pending" value={kpi.feedbackPending} note="Feedback Dashboard와 같은 공용 Queue" />
            <CompactMetric label="Parent Report 미발송" value={kpi.parentReportUnsent} note="9월 Report 중 발송 전" />
          </dl>
        </section>

        <section className={ui.section} aria-labelledby="today-list">
          <div className={ui.sectionHead}>
            <h2 id="today-list" className={ui.sectionTitle}>
              학생
            </h2>
            <p className={ui.muted} role="status">
              {active ? `${rows.length}명 표시 · 전체 ${all.length}명` : `${all.length}명`} · {todayBoardSortLabel[filter.sort]}
            </p>
          </div>
          {all.length > 0 && (
            <div className={ui.toolbar}>
              <SearchBox
                label="학생, Task 검색"
                value={draft}
                onChange={(value) => {
                  setDraft(value)
                  update({ query: value })
                }}
              />
              <ChipGroup
                label="학년"
                value={filter.grade}
                options={[{ value: 'all', label: '전체' }, ...(['고1', '고2', '고3'] as const).map((grade) => ({ value: grade, label: grade }))]}
                onChange={(value) => update({ grade: value as TodayBoardFilter['grade'] })}
              />
              <ChipGroup
                label="상태"
                value={filter.scope}
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'attention', label: '관리 필요' },
                  { value: 'stable', label: '특이사항 없음' },
                ]}
                onChange={(value) => update({ scope: value as TodayBoardFilter['scope'] })}
              />
              <ChipGroup
                label="정렬"
                value={filter.sort}
                options={[
                  { value: 'plan', label: 'Plan 실행률' },
                  { value: 'study', label: '오늘 순공' },
                  { value: 'attention', label: '관리 포인트' },
                ]}
                onChange={(value) => update({ sort: value as TodayBoardFilter['sort'] })}
              />
              {active && (
                <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={reset}>
                  조건 초기화
                </button>
              )}
            </div>
          )}
          <p className={styles.providerNote} id="quick-action-reason">
            메시지 · 리마인더는 발송 요청까지만 준비돼요. 실제 학생 알림 전송은 Delivery Provider 연결 후 사용할 수 있어요.
          </p>
          {all.length === 0 ? (
            <NoticeState title="등록된 학생이 없어요." />
          ) : rows.length === 0 ? (
            <NoticeState title={filter.query.trim() ? '검색 결과가 없어요.' : '조건에 맞는 학생이 없어요.'}>
              <button type="button" className={ui.secondaryButton} onClick={reset}>
                전체 보기
              </button>
            </NoticeState>
          ) : (
            <div className={ui.tableScroll}>
              <table className={`${ui.table} ${styles.todayTable}`}>
                <caption className="lh-visually-hidden">
                  학생 {rows.length}명 ({todayBoardSortLabel[filter.sort]})
                </caption>
                <thead>
                  <tr>
                    <th scope="col">학생</th>
                    <th scope="col">오늘 순공</th>
                    <th scope="col">최근 7일 Plan</th>
                    <th scope="col">Task 상태</th>
                    <th scope="col">최근 시험 변화</th>
                    <th scope="col">관리 포인트</th>
                    <th scope="col">Quick Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <Row
                      key={row.student.studentId}
                      state={state}
                      row={row}
                      onOpenStudent={onOpenStudent}
                      onOpenTarget={onOpenTarget}
                      onMessage={() => setMessageFor(row)}
                      onReminder={() => setReminderFor(row)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    )
  }
}

function attendanceLine(row: StudentInsight): { text: string; tone?: 'risk' } {
  const study = row.study
  if (!study) return { text: '출결 기록 없음' }
  if (study.attendance === 'attended') return { text: `${study.checkInTime} 등원` }
  if (study.attendance === 'absent') return { text: study.consecutiveAbsentDays >= 2 ? `미등원 · ${study.consecutiveAbsentDays}일 연속` : '미등원', tone: 'risk' }
  return { text: '등원 전' }
}

/** 가장 중요한 관리 포인트: 종류마다 다른 표현 (마감 = countdown · Plan = 추이 · 점수 = 변화 · 출결 = 상태 줄 · Feedback = 대기 시간) */
function PrimaryInsight({ row, point }: { row: StudentInsight; point: ManagementPoint }) {
  let headline: ReactNode = point.label
  let meta: ReactNode = null
  if ((point.kind === 'deadline-passed' || point.kind === 'deadline-risk') && point.target.kind === 'task') {
    const taskId = point.target.taskId
    const task = row.activeTasks.find((item) => item.taskId === taskId)
    const days = task ? daysUntil(task.deadlineDate) : null
    headline = days === null ? point.label : days < 0 ? '수행평가 마감이 지났어요' : days === 0 ? '수행평가 마감이 오늘이에요' : days === 1 ? '수행평가 마감이 내일이에요' : `수행평가 마감까지 ${days}일`
    meta = task && days !== null && `${task.subject} · ${formatDday(days)} · ${task.stageStatus}`
  } else if ((point.kind === 'plan-drop' || point.kind === 'plan-low') && row.study) {
    const diff = Math.round((row.study.recent7DayPlanRate - row.study.previous7DayPlanRate) * 100)
    headline = point.kind === 'plan-drop' ? 'Plan 실행률이 떨어졌어요' : 'Plan 실행률이 50% 미만이에요'
    meta = (
      <>
        {formatPercent(row.study.previous7DayPlanRate)} → {formatPercent(row.study.recent7DayPlanRate)} <Delta direction={diff < 0 ? 'down' : diff > 0 ? 'up' : 'same'}>{Math.abs(diff)}%p</Delta>
      </>
    )
  } else if (point.kind === 'test-decline' && row.latestChange) {
    headline = `${row.latestChange.test.subject} 점수가 떨어졌어요`
    meta = <ScoreDelta row={row} />
  } else if (point.kind === 'absence' && row.study) {
    headline = `${row.study.consecutiveAbsentDays}일 연속 미등원이에요`
    meta = '기존 출결 기록 · 오늘 등원 전 확인'
  } else if (point.kind === 'feedback-delay') {
    headline = 'Feedback이 오래 기다리고 있어요'
    meta = <strong>{point.label.replace('Feedback ', '')}</strong>
  } else if (point.kind === 'ai-failed') {
    headline = 'AI 사전 점검이 실패했어요'
  } else if (point.kind === 'revision-not-applied') {
    headline = '피드백 후 수정본이 아직 없어요'
  }
  return (
    <span className={styles.primaryInsight} data-kind={point.kind}>
      <span className={styles.insightEyebrow}>{managementPointKindLabel[point.kind]}</span>
      <span className={styles.insightHeadline}>{headline}</span>
      {meta && <span className={styles.insightMeta}>{meta}</span>}
      <span className="lh-visually-hidden"> ({point.label})</span>
    </span>
  )
}

function ScoreDelta({ row }: { row: StudentInsight }) {
  const change = row.latestChange
  if (!change) return null
  const test = change.test
  if (change.direction === 'first') return <>{change.label}</>
  if (test.type === 'mock_exam' && test.grade !== undefined && test.previousResult !== undefined) {
    const diff = test.previousResult - test.grade
    return (
      <>
        {test.previousResult} → {test.grade}등급{' '}
        <Delta direction={change.direction}>{change.direction === 'same' ? '유지' : `${Math.abs(diff)}등급`}</Delta>
      </>
    )
  }
  const diff = (test.score ?? 0) - (test.previousResult ?? 0)
  return (
    <>
      {test.previousResult} → {test.score}{' '}
      <Delta direction={change.direction}>{change.direction === 'same' ? '유지' : `${Math.abs(diff)}점`}</Delta>
    </>
  )
}

function Row({
  state,
  row,
  onOpenStudent,
  onOpenTarget,
  onMessage,
  onReminder,
}: {
  state: AdminState
  row: StudentInsight
  onOpenStudent: (studentId: string) => void
  onOpenTarget: (target: PointTarget) => void
  onMessage: () => void
  onReminder: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const attendance = attendanceLine(row)
  const task = row.primaryTask
  const days = task ? daysUntil(task.deadlineDate) : null
  const change = row.latestChange
  const points = sortPoints(row.points)
  const [primary, secondary, ...rest] = points
  const critical = isCritical(row)
  const prepared = state.outreachDrafts.filter((item) => item.studentId === row.student.studentId)
  const planDiff = row.study ? Math.round((row.study.recent7DayPlanRate - row.study.previous7DayPlanRate) * 100) : 0
  const moreId = `points-more-${row.student.studentId}`
  return (
    <tr data-critical={critical || undefined}>
      <th scope="row" className={styles.todayStudent}>
        <span className={styles.studentLine}>
          <button type="button" className={ui.linkButton} onClick={() => onOpenStudent(row.student.studentId)}>
            {row.student.displayName}
            <span className="lh-visually-hidden"> Student 360 보기</span>
          </button>
          <span className={styles.gradeText}>{row.student.grade}</span>
          {critical && <span className={styles.criticalLabel}>우선 확인</span>}
        </span>
        <span className={styles.attendanceText} data-absent={attendance.tone ? 'true' : undefined}>
          {attendance.text}
        </span>
      </th>
      <td className={ui.nowrap}>
        {row.study ? (
          row.study.todayStudyMinutes > 0 ? (
            <span className={styles.studyTime}>{formatStudyTime(row.study.todayStudyMinutes)}</span>
          ) : (
            <span className={styles.studyTime} data-empty="true">
              {formatStudyTime(0)}
              <span className={ui.cellSub}>{row.study.attendance === 'absent' ? '미등원' : '오늘 기록 없음'}</span>
            </span>
          )
        ) : (
          <span className={ui.cellSub}>기록 없음</span>
        )}
      </td>
      <td>
        {row.study ? (
          <span className={styles.planCell}>
            <span className={styles.planRate}>
              {formatPercent(row.study.recent7DayPlanRate)}
              <MiniProgress rate={row.study.recent7DayPlanRate} label="최근 7일 Plan 실행률" />
            </span>
            <span className={ui.cellSub}>
              직전 7일 대비{' '}
              {planDiff === 0 ? (
                '변화 없음'
              ) : (
                // 하락 기준(PLAN_DROP_POINTS) 미만의 작은 변화는 중립색 (빨간색은 실제 관리 포인트일 때만)
                <Delta direction={planDiff < 0 ? 'down' : 'up'} quiet={Math.abs(planDiff) < PLAN_DROP_POINTS}>
                  {Math.abs(planDiff)}%p
                </Delta>
              )}
            </span>
          </span>
        ) : (
          <span className={ui.cellSub}>기록 없음</span>
        )}
      </td>
      <td className={styles.taskCell}>
        {task && days !== null ? (
          <span className={styles.taskLine}>
            <span className={styles.countdown} data-tone={days < 0 ? 'risk-strong' : days <= 1 ? 'risk' : undefined}>
              {formatDday(days)}
            </span>
            <span className={styles.taskText}>
              <button type="button" className={ui.linkButton} onClick={() => onOpenTarget({ kind: 'task', taskId: task.taskId })}>
                {task.title}
                <span className="lh-visually-hidden"> Task 상세 보기</span>
              </button>
              <span className={ui.cellSub}>
                {task.subject} · {task.stageStatus}
                {row.activeTasks.length > 1 && ` · 외 ${row.activeTasks.length - 1}개`}
              </span>
            </span>
          </span>
        ) : (
          <span className={ui.cellSub}>진행 중 수행평가 없음</span>
        )}
      </td>
      <td>
        {change ? (
          <span className={styles.changeInsight} data-direction={change.direction}>
            <span className={ui.cellSub}>
              {testTypeLabel[change.test.type]} · {change.test.subject}
            </span>
            <span className={styles.changeValue}>
              <ScoreDelta row={row} />
            </span>
          </span>
        ) : (
          <span className={ui.cellSub}>시험 기록 없음</span>
        )}
      </td>
      <td className={styles.pointCell}>
        {!primary ? (
          <span className={styles.stableText}>현재 특이사항 없음</span>
        ) : (
          <div className={styles.pointStack}>
            <button type="button" className={styles.primaryInsightButton} onClick={() => onOpenTarget(primary.target)}>
              <PrimaryInsight row={row} point={primary} />
              <span className="lh-visually-hidden"> {targetHint(primary.target)}</span>
            </button>
            <div className={styles.pointFollow}>
              {secondary && <SecondaryPoint point={secondary} onOpen={onOpenTarget} />}
              {rest.length > 0 && (
                <>
                  <ul id={moreId} className={styles.morePoints} hidden={!expanded}>
                    {rest.map((point) => (
                      <li key={`${point.kind}-${point.label}`}>
                        <SecondaryPoint point={point} onOpen={onOpenTarget} />
                      </li>
                    ))}
                  </ul>
                  <DisclosureButton expanded={expanded} controls={moreId} onToggle={() => setExpanded(!expanded)}>
                    {expanded ? '접기' : `+${rest.length}개 더 보기`}
                  </DisclosureButton>
                </>
              )}
            </div>
          </div>
        )}
      </td>
      <td>
        {/* Compact Action: 메시지 · 리마인더는 작은 Icon + 짧은 글자(Action affordance), Student 360은 글자 Link */}
        <div className={styles.quickActions}>
          <button type="button" className={styles.iconAction} onClick={onMessage} aria-describedby="quick-action-reason" title="메시지 (발송 요청 준비)">
            <AdminIcon name="message" size={15} />
            <span>메시지</span>
            <span className="lh-visually-hidden">: {row.student.displayName}</span>
          </button>
          <button type="button" className={styles.iconAction} onClick={onReminder} aria-describedby="quick-action-reason" title="리마인더 (발송 요청 준비)">
            <AdminIcon name="bell" size={15} />
            <span>리마인더</span>
            <span className="lh-visually-hidden">: {row.student.displayName}</span>
          </button>
          <ToneButton variant="text" tone="feedback" className={styles.compactLink} onClick={() => onOpenStudent(row.student.studentId)}>
            Student 360<span className="lh-visually-hidden">: {row.student.displayName}</span>
          </ToneButton>
        </div>
        {prepared.length > 0 && (
          <span className={styles.preparedText}>
            요청 준비 {prepared.length}건 · 미전송
          </span>
        )}
      </td>
    </tr>
  )
}

function SecondaryPoint({ point, onOpen }: { point: ManagementPoint; onOpen: (target: PointTarget) => void }) {
  return (
    <button type="button" className={styles.secondaryPoint} onClick={() => onOpen(point.target)}>
      <span>{point.label}</span>
      <span className="lh-visually-hidden">
        {' '}
        ({managementPointKindLabel[point.kind]}) {targetHint(point.target)}
      </span>
    </button>
  )
}
