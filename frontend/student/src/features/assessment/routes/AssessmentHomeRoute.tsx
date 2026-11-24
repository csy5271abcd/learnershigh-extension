import { useCallback, useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router'
import { listFeedbackRequests } from '../api/assessmentDetailApi.ts'
import { getEvaluationPlan, getEvaluationPlanTeachingPlan, listEvaluationPlans } from '../api/evaluationPlansApi.ts'
import { listArchive } from '../api/growthArchiveApi.ts'
import { assessmentToday, mockRuntimeInfo } from '../api/runtimeInfo.ts'
import { AddSchoolAssessmentModal } from '../components/AddSchoolAssessmentModal.tsx'
import { AlertIcon, BellIcon, BulbIcon, ChatIcon, CheckIcon, ClipboardIcon, ClockIcon, HelpIcon } from '../components/AssessmentIcons.tsx'
import { HomeMemoCard } from '../components/home/HomeMemoCard.tsx'
import { HomeMonthCalendar } from '../components/home/HomeMonthCalendar.tsx'
import { OfficialPlansCard } from '../components/home/OfficialPlansCard.tsx'
import { usePopover } from '../components/detail/usePopover.ts'
import styles from '../components/home/home.module.css'
import dash from '../components/home/homeDashboard.module.css'
import { AddAssessmentArt, CriteriaArt, EnrichmentArt, FeedbackArt, GrowthArt } from '../components/home/QuickActionIcons.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { entryFromRow, type TeachingPlanEntry } from '../components/teaching-plan/teachingPlanPlacement.ts'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { termLabel } from '../model/academicTerm.ts'
import { deadlineAlerts, defaultTargetAssessment, homeTitle } from '../model/assessmentHomeView.ts'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { relatedSourceLabels, subjectNameIn } from '../model/growthArchiveView.ts'
import { countByStatus, formatDateWithWeekday, formatDday, formatShortDate, statusLabels, urgentDays } from '../model/schoolAssessmentView.ts'
import { upcomingAssessments } from '../model/upcomingAssessments.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import {
  academicInfoPath,
  archiveSourcePath,
  enrichmentPath,
  evaluationPlansPath,
  feedbackPath,
  growthPath,
  schoolAssessmentDetailPath,
  schoolAssessmentsPath,
} from './paths.ts'

type QuickAction = {
  label: string
  icon: ComponentType<{ size?: number }>
} & ({ to: string } | { onClick: () => void } | { reason: string })

// A27-UX 학생 홈 Dashboard (2026-11-19, 이미지 01~04). Toss Payments 정산 달력의 정보 위계·리듬만 참고했다(로고·결제 데이터·문구 복제 없음).
// 위계: 헤더(학업 Context·제목) → 요약 KPI → 빠른 실행·공식 원본 3개년 → 넓은 월간 달력 + 보조 카드(다가오는 수행평가·피드백 요청) → 최근 기록·메모.
// 숫자는 모두 서버 데이터에서 그때그때 계산한다(저장 Counter 없음). 학생 평가계획서 PDF 가져오기·AI 분석 진입점은 없앴다.
/** A28-13: 최근 업데이트 기록은 최신 2개만 받아 보인다(데이터 단계에서 제한 — 바로가기 카드와 높이를 맞춘다) */
const RECENT_LIMIT = 2

export function AssessmentHomeRoute() {
  const { terms, selectedTerm, selectedContext, termAssessments, dataVersion, notifyDataChanged } = useAssessmentWorkspace()
  const today = assessmentToday()
  const items = termAssessments.data?.items ?? []
  const target = defaultTargetAssessment(items, today)
  const [addOpen, setAddOpen] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const notify = (tone: ToastMessage['tone'], text: string) => setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone, text }))

  const feedbackCounts = useApiQuery(`home-feedback|${dataVersion}`, () =>
    Promise.all([
      listFeedbackRequests({ status: 'PENDING', page: 0, size: 1 }),
      listFeedbackRequests({ status: 'DELIVERED', page: 0, size: 1 }),
    ]).then(([pending, delivered]) => ({
      pending: pending.page.totalElements,
      delivered: delivered.page.totalElements,
      latestPending: pending.items[0] ?? null,
      latestDelivered: delivered.items[0] ?? null,
    })),
  )
  const recent = useApiQuery(`home-recent|${dataVersion}`, () => listArchive({ tab: 'recent', page: 0, size: RECENT_LIMIT }))

  const counts = countByStatus(items)
  const slot = selectedContext
    ? { schoolId: selectedContext.school.schoolId, academicYear: selectedContext.academicYear, grade: selectedContext.grade, semester: selectedContext.semester }
    : null
  const slotKey = slot ? `${slot.schoolId}|${slot.academicYear}|${slot.grade}|${slot.semester}` : 'none'
  const confirmedPlans = useApiQuery(`confirmed-evaluation-plans:${slotKey}`, () =>
    slot ? listEvaluationPlans(slot).then((list) => Promise.all(list.items.map((plan) => getEvaluationPlan(plan.planId)))) : Promise.resolve([]),
  )
  const teaching = useApiQuery(`home-calendar|${slotKey}`, () =>
    slot ? listEvaluationPlans(slot).then((list) => Promise.all(list.items.map((plan) => getEvaluationPlanTeachingPlan(plan.planId)))) : Promise.resolve([]),
  )
  const contexts = terms.data?.contexts ?? []
  const nameOf = (subjectId: string) => subjectNameIn(contexts, subjectId) ?? '과목'
  const planEntries: TeachingPlanEntry[] = (teaching.data ?? [])
    .filter((plan) => plan.status === 'CONFIRMED')
    // A28-33: id = 개인 임시 배치 저장 키(§30-b sourceKey) — 목록 순서가 아니라 문서 ID로 고정
    .flatMap((plan) =>
      plan.rows.map((row) => entryFromRow(row, { id: `${plan.planId}|${row.subjectId}|${row.rowKey}`, subjectName: nameOf(row.subjectId), status: 'CONFIRMED', academicYear: plan.academicYear })),
    )
  const upcoming = upcomingAssessments(items, confirmedPlans.data ?? [], selectedContext, today)
  // 날짜 미정 학교 공개 수행평가는 3개까지만 보인다 — 최근 등록된 평가계획서의 항목부터(같은 문서 안 순서는 원문 그대로)
  const planUploaded = new Map((confirmedPlans.data ?? []).map((plan) => [plan.planId, plan.uploadedAt]))
  // A28-20: 지난 시기는 뒤로, 같은 묶음 안에서는 최근 문서 먼저
  const officialRecentFirst = [...upcoming.officialUndated].sort(
    (a, b) => Number(Boolean(a.past)) - Number(Boolean(b.past)) || (planUploaded.get(b.planId) ?? '').localeCompare(planUploaded.get(a.planId) ?? ''),
  )
  const urgent = upcoming.dated.filter((entry) => entry.days <= urgentDays)
  const alerts = deadlineAlerts(items, today)
  const noAcademicInfo = terms.status !== 'loading' && !selectedContext && !(terms.status === 'error')
  const loadingItems = !termAssessments.data && termAssessments.status === 'loading'

  const quickActions: QuickAction[] = [
    selectedContext
      ? { label: '수행평가 추가', icon: AddAssessmentArt, onClick: () => setAddOpen(true) }
      : { label: '수행평가 추가', icon: AddAssessmentArt, reason: '학교·학업 정보를 먼저 확인해 주세요.' },
    target
      ? { label: '평가 기준 보기', icon: CriteriaArt, to: schoolAssessmentDetailPath(target.assessmentId) }
      : { label: '평가 기준 보기', icon: CriteriaArt, reason: '평가 기준을 볼 수행평가가 아직 없어요.' },
    { label: '심화 탐구', icon: EnrichmentArt, to: enrichmentPath },
    { label: '선생님 피드백', icon: FeedbackArt, to: feedbackPath },
    { label: '성장 기록', icon: GrowthArt, to: growthPath },
  ]

  const kpi = (value: number | undefined) => (termAssessments.status === 'error' ? '–' : value === undefined ? '…' : `${value}개`)

  return (
    <main className={dash.page}>
      <header className={dash.header}>
        <div className={dash.headerText}>
          {selectedContext && (
            <p className={dash.context} data-testid="home-context">
              {selectedContext.school.name} · {termLabel(selectedContext)}
            </p>
          )}
          <h1 className={dash.title}>{homeTitle(selectedTerm, terms.data?.currentTerm)}</h1>
        </div>
        <div className={styles.topActions} style={{ position: 'static' }}>
          <NotificationButton alerts={alerts} today={today} loading={loadingItems} />
          <button
            type="button"
            className={styles.iconButton}
            aria-label="도움말"
            aria-disabled="true"
            onClick={() => notify('info', '도움말은 아직 준비 중이에요.')}
          >
            <HelpIcon size={20} />
          </button>
        </div>
      </header>

      {terms.status === 'error' && terms.error && <ErrorState title="학업 정보를 불러오지 못했어요" error={terms.error} onRetry={terms.retry} />}
      {noAcademicInfo && (
        <EmptyState
          title="학교·학업 정보가 없어요"
          description="학교·학기 확인 후 수행평가 정리"
          action={<Link to={academicInfoPath}>학교·학업 정보로 가기</Link>}
        />
      )}

      {/* 요약 KPI: 한 카드 안 4칸 (Toss 정산 요약처럼) — 실제 서버 데이터로 계산 */}
      <dl className={dash.kpis} aria-label="이번 학기 수행평가 요약" data-testid="home-kpis">
        <Kpi tone="blue" icon={<ClockIcon size={16} />} label="진행 중" value={kpi(termAssessments.data ? counts.IN_PROGRESS : undefined)} testId="kpi-in-progress" />
        <Kpi tone="orange" icon={<AlertIcon size={16} />} label={`임박 (${urgentDays}일 이내)`} value={kpi(termAssessments.data ? urgent.length : undefined)} testId="kpi-urgent" />
        <Kpi
          tone="purple"
          icon={<ChatIcon size={16} />}
          label="피드백 답변 대기"
          value={feedbackCounts.status === 'error' ? '미확인' : feedbackCounts.data ? `${feedbackCounts.data.pending}건` : '…'}
          testId="kpi-feedback"
        />
        <Kpi tone="green" icon={<CheckIcon size={16} />} label="완료" value={kpi(termAssessments.data ? counts.COMPLETED : undefined)} testId="kpi-completed" />
      </dl>

      {/* A28-14/15 (2026-11-22 사용자 지정 순서): KPI → [바로가기 | 최근 업데이트(최신 2개, 같은 높이)] → 평가계획서 원본 3개년(전체 폭)
          → [Calendar(약 7) | 다가오는 수행평가(위) · 수행평가 메모(아래)(약 3)]. 피드백 요청 현황 카드는 홈에서 뺐다(선생님 피드백 메뉴·KPI 는 그대로). 좁으면 세로로 쌓는다 */}
      <div className={dash.rowQuickRecent} data-testid="home-row-quick-recent">
        <section className={dash.card} aria-labelledby="home-quick">
          <h2 id="home-quick" className={dash.cardTitle}>
            바로가기
          </h2>
          {/* 기존 아이콘 그림·모양은 그대로 두고 배치만 바꿨다. 학생 PDF 가져오기는 없앴다 */}
          <ul className={dash.quickGrid} aria-label="바로가기">
            {quickActions.map((action) => (
              <li key={action.label}>
                <QuickActionButton action={action} onUnavailable={(reason) => notify('info', reason)} />
              </li>
            ))}
          </ul>
        </section>
        <section className={dash.card} aria-labelledby="home-recent" aria-busy={recent.isRefreshing} data-testid="home-recent">
          <h2 id="home-recent" className={dash.cardTitle}>
            최근 업데이트 기록
          </h2>
          {recent.status === 'error' && recent.error ? (
            <ErrorState title="최근 기록을 불러오지 못했어요" error={recent.error} onRetry={recent.retry} />
          ) : !recent.data ? (
            <LoadingRows rows={2} label="최근 기록을 불러오는 중" />
          ) : recent.data.items.length === 0 ? (
            <p className={dash.muted}>아직 기록 없음 · 수행평가·심화 탐구를 시작하면 표시</p>
          ) : (
            <ul className={dash.recentList}>
              {recent.data.items.slice(0, RECENT_LIMIT).map((item) => {
                const Icon = item.sourceType === 'SCHOOL_ASSESSMENT' ? ClipboardIcon : BulbIcon
                const status = item.status && item.status in statusLabels ? statusLabels[item.status as keyof typeof statusLabels] : null
                return (
                  <li key={`${item.sourceType}:${item.sourceId}`}>
                    <Link to={archiveSourcePath(item.sourceType, item.sourceId)} className={dash.recentRow} data-testid="home-recent-row">
                      <span className={dash.recentIcon}>
                        <Icon size={14} />
                      </span>
                      <span className={dash.upcomingText}>
                        <span className={dash.upcomingTitle} title={item.title}>
                          {item.title}
                        </span>
                        <span className={dash.upcomingMeta}>
                          {[relatedSourceLabels[item.sourceType], subjectNameIn(contexts, item.subjectId), status].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <time className={dash.recentTime} dateTime={item.lastActivityAt}>
                        {formatActivity(item.lastActivityAt)}
                      </time>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {selectedContext && <OfficialPlansCard academicYear={selectedContext.academicYear} semester={selectedContext.semester} />}

      <div className={dash.rowCalendarSide} data-testid="home-row-calendar">
        {selectedContext && (
          <div className={dash.calendarMain} data-testid="home-calendar-main">
            {/* A28-23: 월간 달력(일~토 날짜 칸) 복원 — 과목별 운영계획·수행·마감·지필을 날짜 칸에 배지로, 날짜 미정은 달력 아래 */}
            <HomeMonthCalendar
              key={`${selectedContext.academicYear}-${selectedContext.semester}`}
              academicYear={selectedContext.academicYear}
              semester={selectedContext.semester}
              today={today}
              assessments={items}
              confirmedPlans={confirmedPlans.data ?? []}
              context={selectedContext}
              subjectName={nameOf}
              planEntries={planEntries}
              planStatus={teaching.status === 'error' ? 'error' : teaching.data ? 'success' : 'loading'}
            />
          </div>
        )}
        <div className={dash.calendarSide} data-testid="home-calendar-side">
          <section className={dash.card} aria-labelledby="home-upcoming" data-testid="home-upcoming">
            <div className={dash.cardHead}>
              <h2 id="home-upcoming" className={dash.cardTitle}>
                다가오는 수행평가
              </h2>
              <Link to={schoolAssessmentsPath} className={dash.textLink}>
                전체 보기
              </Link>
            </div>
            {termAssessments.status === 'error' && termAssessments.error ? (
              <ErrorState title="수행평가를 불러오지 못했어요" error={termAssessments.error} onRetry={termAssessments.retry} />
            ) : !termAssessments.data ? (
              <LoadingRows rows={3} label="다가오는 일정을 불러오는 중" />
            ) : upcoming.dated.length === 0 ? (
              <p className={dash.muted}>{items.length === 0 ? '이 학기에 등록한 수행평가가 없어요.' : '날짜가 정해진 다가오는 수행평가 없음'}</p>
            ) : (
              <ul className={dash.upcomingList} data-testid="home-upcoming-dated">
                {upcoming.dated.slice(0, 5).map(({ assessment, days, dateKind }) => (
                  <li key={assessment.assessmentId}>
                    <Link to={schoolAssessmentDetailPath(assessment.assessmentId)} className={dash.upcomingRow} data-testid="home-upcoming-row">
                      <span className={dash.dday} data-urgent={days <= urgentDays || undefined}>
                        {formatDday(days)}
                      </span>
                      <span className={dash.upcomingText}>
                        <span className={dash.upcomingTitle}>{assessment.title}</span>
                        <span className={dash.upcomingMeta}>
                          {[
                            nameOf(assessment.subjectId),
                            assessment.evaluationDate ? `평가 ${formatShortDate(assessment.evaluationDate)}` : null,
                            assessment.deadlineDate ? `마감 ${formatShortDate(assessment.deadlineDate)}` : null,
                            dateKind === 'evaluation' ? '평가일 기준' : null,
                            statusLabels[assessment.status],
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {confirmedPlans.status === 'error' ? (
              <p className={dash.muted} role="alert" data-testid="home-upcoming-official-error">
                학교 공개 수행평가를 불러오지 못했어요.{' '}
                <button type="button" className={dash.inlineButton} onClick={confirmedPlans.retry}>
                  다시 시도
                </button>
              </p>
            ) : upcoming.officialUndated.length > 0 ? (
              <div data-testid="home-upcoming-official">
                <p className={dash.muted}>학교 공개 수행평가 · 날짜 미정 (D-day 없음)</p>
                <ul className={dash.upcomingList}>
                  {officialRecentFirst.slice(0, 3).map((entry) => (
                    <li key={entry.key}>
                      <Link
                        to={entry.assessmentId ? schoolAssessmentDetailPath(entry.assessmentId) : evaluationPlansPath}
                        className={dash.upcomingRow}
                        data-testid="home-upcoming-official-row"
                        data-registered={entry.assessmentId ? 'true' : undefined}
                        data-past={entry.past ? 'true' : undefined}
                      >
                        <span className={dash.dday}>{entry.past ? '지남' : '미정'}</span>
                        <span className={dash.upcomingText}>
                          <span className={dash.upcomingTitle}>{entry.label}</span>
                          <span className={dash.upcomingMeta}>
                            {[entry.subjectName ?? subjectNameIn(contexts, entry.subjectId), entry.timing ? `학교 안내 시기 ${entry.timing}` : '시기 미확정', entry.past ? '지난 시기' : null, entry.assessmentId ? '내 수행평가에 등록됨' : '선생님 확정'].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {upcoming.officialUndated.length > 3 && (
                  <Link to={evaluationPlansPath} className={dash.textLink}>
                    학교 공개 수행평가 {upcoming.officialUndated.length}개 모두 보기
                  </Link>
                )}
              </div>
            ) : null}
          </section>
          <HomeMemoCard />
        </div>
      </div>

      {addOpen && selectedContext && (
        <AddSchoolAssessmentModal
          context={selectedContext}
          existingTitles={items.map((item) => item.title)}
          onClose={() => setAddOpen(false)}
          onCreated={(created) => {
            setAddOpen(false)
            notifyDataChanged()
            notify('success', `'${created.title}'을(를) 추가했어요.`)
          }}
        />
      )}
      <Toast message={toast} onDismiss={dismissToast} />
    </main>
  )
}

/** 실제 변경 시각 (한국 시간 기준 'M월 D일 HH:mm') */
function formatActivity(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date)
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? ''
  return `${part('month')}월 ${part('day')}일 ${part('hour')}:${part('minute')}`
}

function Kpi({ tone, icon, label, value, testId }: { tone: 'blue' | 'orange' | 'purple' | 'green'; icon: ReactNode; label: string; value: string; testId: string }) {
  return (
    <div className={dash.kpi} data-testid={testId}>
      <dt className={dash.kpiLabel}>
        <span className={dash.kpiIcon} data-tone={tone} aria-hidden="true">
          {icon}
        </span>
        {label}
      </dt>
      <dd className={dash.kpiValue}>{value}</dd>
    </div>
  )
}

function QuickActionButton({ action, onUnavailable }: { action: QuickAction; onUnavailable: (reason: string) => void }) {
  const content: ReactNode = (
    <>
      <span className={styles.quickIcon} aria-hidden="true">
        <action.icon size={27} />
      </span>
      {action.label}
    </>
  )
  if ('to' in action) {
    return (
      <Link to={action.to} className={styles.quickAction}>
        {content}
      </Link>
    )
  }
  if ('onClick' in action) {
    return (
      <button type="button" className={styles.quickAction} onClick={action.onClick}>
        {content}
      </button>
    )
  }
  return (
    <button type="button" className={styles.quickAction} aria-disabled="true" onClick={() => onUnavailable(action.reason)}>
      {content}
    </button>
  )
}

function NotificationButton({ alerts, today, loading }: { alerts: ReturnType<typeof deadlineAlerts>; today: string; loading: boolean }) {
  const { open, setOpen, rootRef, triggerRef } = usePopover()
  return (
    <div ref={rootRef} className={styles.popoverRoot}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.iconButton}
        aria-label={alerts.length > 0 ? `알림, 마감 임박 ${alerts.length}건` : '알림'}
        aria-expanded={open}
        aria-controls={open ? 'home-alerts' : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <BellIcon size={20} />
        {alerts.length > 0 && <span className={styles.dot} aria-hidden="true" />}
      </button>
      {open && (
        <div id="home-alerts" className={styles.popover} role="dialog" aria-label="알림">
          <p className={styles.popoverTitle}>알림</p>
          {loading ? (
            <p className={styles.popoverHint}>불러오는 중…</p>
          ) : alerts.length === 0 ? (
            <p className={styles.popoverHint}>{urgentDays}일 안에 마감인 수행평가가 없어요.</p>
          ) : (
            <ul className={styles.popoverList}>
              {alerts.map(({ assessment, days }) => (
                <li key={assessment.assessmentId}>
                  <Link to={schoolAssessmentDetailPath(assessment.assessmentId)} className={styles.popoverItem} onClick={() => setOpen(false)}>
                    <AlertIcon size={15} />
                    <span>
                      {assessment.title} 마감 {formatDday(days)}
                      <span className={styles.popoverDate}>{formatDateWithWeekday(assessment.deadlineDate as string)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.popoverHint}>
            {mockRuntimeInfo() ? '시연 기준일' : '오늘'} {today}부터 {urgentDays}일 안에 마감인 과제예요.
          </p>
        </div>
      )}
    </div>
  )
}
