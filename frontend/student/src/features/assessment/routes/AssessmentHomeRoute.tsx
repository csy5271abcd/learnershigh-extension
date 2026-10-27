import { useCallback, useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router'
import { listFeedbackRequests } from '../api/assessmentDetailApi.ts'
import { listArchive } from '../api/growthArchiveApi.ts'
import { assessmentToday, mockRuntimeInfo } from '../api/runtimeInfo.ts'
import { AddSchoolAssessmentModal } from '../components/AddSchoolAssessmentModal.tsx'
import { PdfImportModal } from '../components/pdf-import/PdfImportModal.tsx'
import {
  AlertIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BellIcon,
  BulbIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClipboardIcon,
  ClockIcon,
  HelpIcon,
  SparkleIcon,
} from '../components/AssessmentIcons.tsx'
import { usePopover } from '../components/detail/usePopover.ts'
import styles from '../components/home/home.module.css'
import {
  AddAssessmentArt,
  AiHelperArt,
  CriteriaArt,
  EnrichmentArt,
  FeedbackArt,
  GrowthArt,
  PdfImportArt,
} from '../components/home/QuickActionIcons.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { deadlineAlerts, defaultTargetAssessment, homeTitle } from '../model/assessmentHomeView.ts'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { relatedSourceLabels, subjectNameIn } from '../model/growthArchiveView.ts'
import {
  countByStatus,
  formatDateWithWeekday,
  formatDday,
  formatShortDate,
  statusLabels,
  upcomingDeadlines,
  urgentDays,
} from '../model/schoolAssessmentView.ts'
import { useApiQuery, type QueryResult } from '../model/useApiQuery.ts'
import {
  academicInfoPath,
  enrichmentPath,
  enrichmentTaskDetailPath,
  feedbackPath,
  growthPath,
  schoolAssessmentDetailPath,
} from './paths.ts'

type QuickAction = {
  label: string
  icon: ComponentType<{ size?: number }>
} & ({ to: string } | { onClick: () => void } | { reason: string })

// Assessment 홈 (screen-map S24, student §3, Mockup ST_Assessment-Home_01~03: 기본·스크롤·알림 Popover 상태).
// 홈 전용 요약 API가 없어 기존 계약만 다시 조회한다: 선택 학기 수행평가(§12, Layout 공용 조회),
// 피드백 대기(§31 status=PENDING totalElements), 최근 업데이트한 기록(§30 tab=recent). 숫자를 따로 저장하지 않는다 (MM-42).
// AI 입력창은 AI 연결 전(Stage 3)이라 입력·전송을 막고 사유를 보여준다. 알림은 마감 임박 과제를 계산해 보여줄 뿐 발송·읽음 처리 없음 (MM-43).
export function AssessmentHomeRoute() {
  const { terms, selectedTerm, selectedContext, termAssessments, dataVersion, notifyDataChanged } = useAssessmentWorkspace()
  const today = assessmentToday()
  const items = termAssessments.data?.items ?? []
  const [targetId, setTargetId] = useState<string>()
  const target = items.find((item) => item.assessmentId === targetId) ?? defaultTargetAssessment(items, today)
  const [addOpen, setAddOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const notify = (tone: ToastMessage['tone'], text: string) => setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone, text }))

  const pendingFeedback = useApiQuery(`home-feedback-pending|${dataVersion}`, () =>
    listFeedbackRequests({ status: 'PENDING', page: 0, size: 1 }).then((response) => response.page.totalElements),
  )
  const recent = useApiQuery(`home-recent|${dataVersion}`, () => listArchive({ tab: 'recent', page: 0, size: 3 }))

  const counts = countByStatus(items)
  const upcoming = upcomingDeadlines(items, today)
  const alerts = deadlineAlerts(items, today)
  const contexts = terms.data?.contexts ?? []
  const noAcademicInfo = terms.status !== 'loading' && !selectedContext && !(terms.status === 'error')

  const quickActions: QuickAction[] = [
    selectedContext
      ? { label: 'PDF 가져오기', icon: PdfImportArt, onClick: () => setPdfOpen(true) }
      : { label: 'PDF 가져오기', icon: PdfImportArt, reason: '학교·학업 정보를 먼저 확인해 주세요.' },
    selectedContext
      ? { label: '수행평가 추가', icon: AddAssessmentArt, onClick: () => setAddOpen(true) }
      : { label: '수행평가 추가', icon: AddAssessmentArt, reason: '학교·학업 정보를 먼저 확인해 주세요.' },
    target
      ? { label: '평가 기준 보기', icon: CriteriaArt, to: schoolAssessmentDetailPath(target.assessmentId) }
      : { label: '평가 기준 보기', icon: CriteriaArt, reason: '평가 기준을 볼 수행평가가 아직 없어요.' },
    target
      ? { label: 'AI 도우미', icon: AiHelperArt, to: `${schoolAssessmentDetailPath(target.assessmentId)}?panel=ai` }
      : { label: 'AI 도우미', icon: AiHelperArt, reason: 'AI 도우미를 열 수행평가가 아직 없어요.' },
    { label: '심화 탐구', icon: EnrichmentArt, to: enrichmentPath },
    { label: '선생님 피드백', icon: FeedbackArt, to: feedbackPath },
    { label: '성장 기록', icon: GrowthArt, to: growthPath },
  ]

  return (
    <main className={styles.page}>
      <div className={styles.topActions}>
        <NotificationButton alerts={alerts} today={today} loading={!termAssessments.data && termAssessments.status === 'loading'} />
        <button
          type="button"
          className={styles.iconButton}
          aria-label="도움말"
          aria-disabled="true"
          onClick={() => notify('info', '도움말은 아직 준비 중이에요. 왼쪽 메뉴의 수행평가 꿀팁을 참고해 주세요.')}
        >
          <HelpIcon size={20} />
        </button>
      </div>

      <div className={styles.column}>
        <header className={styles.hero}>
          <h1 className={styles.title}>{homeTitle(selectedTerm, terms.data?.currentTerm)}</h1>
          <p className={styles.summary} aria-live="polite">
            {termAssessments.status === 'error'
              ? '수행평가 현황을 불러오지 못했어요.'
              : termAssessments.data
                ? `진행 중 ${counts.IN_PROGRESS}개 · 시작 전 ${counts.BEFORE_START}개`
                : noAcademicInfo
                  ? '학교·학업 정보를 먼저 확인해 주세요.'
                  : '불러오는 중…'}
          </p>
        </header>

        {terms.status === 'error' && terms.error && (
          <div className={styles.section}>
            <ErrorState title="학업 정보를 불러오지 못했어요" error={terms.error} onRetry={terms.retry} />
          </div>
        )}
        {noAcademicInfo && (
          <div className={styles.section}>
            <EmptyState
              title="학교·학업 정보가 없어요"
              description="학교와 학기를 확인하면 수행평가를 정리할 수 있어요."
              action={<Link to={academicInfoPath}>학교·학업 정보로 가기</Link>}
            />
          </div>
        )}

        <section className={styles.aiBox} aria-label="AI 도우미 (준비 중)">
          <label className="lh-visually-hidden" htmlFor="home-ai-input">
            AI 도우미에게 질문 (준비 중)
          </label>
          <textarea id="home-ai-input" className={styles.aiInput} rows={1} placeholder="어떤 수행평가를 도와드릴까요?" disabled />
          <div className={styles.aiRow}>
            {items.length > 0 && target && (
              <span className={styles.targetSelect}>
                <ClipboardIcon size={15} className={styles.targetIcon} />
                <label className="lh-visually-hidden" htmlFor="home-ai-target">
                  대상 수행평가
                </label>
                <select id="home-ai-target" value={target.assessmentId} onChange={(event) => setTargetId(event.target.value)}>
                  {items.map((item) => (
                    <option key={item.assessmentId} value={item.assessmentId}>
                      {item.title}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon size={14} className={styles.targetChevron} />
              </span>
            )}
            <button
              type="button"
              className={styles.sendButton}
              aria-label="보내기 (준비 중)"
              aria-disabled="true"
              onClick={() => notify('info', 'AI 도우미 대화는 AI 기능이 연결되는 단계(Stage 3)에서 제공돼요. 아래 "AI 도우미"로 과제의 AI 탭을 열 수 있어요.')}
            >
              <ArrowUpIcon size={16} />
            </button>
          </div>
        </section>
        <p className={styles.aiHint}>
          <SparkleIcon size={14} />
          선택한 수행평가의 평가 기준과 내 노트를 바탕으로 답할 예정이에요. 과제를 대신 써 주지는 않아요. (준비 중)
        </p>
      </div>

      {/* 빠른 실행만 본문 열(640px)보다 넓게 두어 데스크톱에서 7개를 한 줄로 놓는다 (Daglo 홈 배치) */}
      <ul className={styles.quickGrid} aria-label="바로가기">
        {quickActions.map((action) => (
          <li key={action.label}>
            <QuickActionButton action={action} onUnavailable={(reason) => notify('info', reason)} />
          </li>
        ))}
      </ul>

      <div className={styles.column}>
        <WaitingFeedback query={pendingFeedback} />

        <section className={styles.section} aria-labelledby="home-upcoming">
          <h2 id="home-upcoming" className={styles.sectionLabel}>
            <CalendarIcon size={15} />
            다가오는 일정
          </h2>
          {termAssessments.status === 'error' && termAssessments.error ? (
            <ErrorState title="수행평가를 불러오지 못했어요" error={termAssessments.error} onRetry={termAssessments.retry} />
          ) : !termAssessments.data ? (
            noAcademicInfo ? null : <LoadingRows rows={3} label="다가오는 일정을 불러오는 중" />
          ) : upcoming.length === 0 ? (
            <p className={styles.muted}>
              {items.length === 0 ? '이 학기에 등록한 수행평가가 없어요.' : '마감일이 정해진, 아직 끝나지 않은 수행평가가 없어요.'}
            </p>
          ) : (
            <ul className={styles.deadlineList}>
              {upcoming.map(({ assessment, days }) => (
                <li key={assessment.assessmentId}>
                  <Link to={schoolAssessmentDetailPath(assessment.assessmentId)} className={styles.deadlineRow}>
                    <span className={styles.dday} data-urgent={days <= urgentDays}>
                      {formatDday(days)}
                    </span>
                    <span className={styles.deadlineTitle}>{assessment.title}</span>
                    <span className={styles.deadlineMeta}>
                      {[subjectNameIn(contexts, assessment.subjectId), '마감', formatShortDate(assessment.deadlineDate as string)].filter(Boolean).join(' · ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section} aria-labelledby="home-recent" aria-busy={recent.isRefreshing}>
          <h2 id="home-recent" className={styles.sectionLabel}>
            <ClockIcon size={15} />
            최근 업데이트한 기록
          </h2>
          {recent.status === 'error' && recent.error ? (
            <ErrorState title="최근 기록을 불러오지 못했어요" error={recent.error} onRetry={recent.retry} />
          ) : !recent.data ? (
            <LoadingRows rows={1} label="최근 기록을 불러오는 중" />
          ) : recent.data.items.length === 0 ? (
            <p className={styles.muted}>아직 기록이 없어요. 수행평가나 심화 탐구를 시작하면 여기에 보여요.</p>
          ) : (
            <ul className={styles.recentGrid}>
              {recent.data.items.map((item) => {
                const Icon = item.sourceType === 'SCHOOL_ASSESSMENT' ? ClipboardIcon : BulbIcon
                const path =
                  item.sourceType === 'SCHOOL_ASSESSMENT' ? schoolAssessmentDetailPath(item.sourceId) : enrichmentTaskDetailPath(item.sourceId)
                const status = item.status && item.status in statusLabels ? statusLabels[item.status as keyof typeof statusLabels] : null
                return (
                  <li key={`${item.sourceType}:${item.sourceId}`}>
                    <Link to={path} className={styles.recentCard}>
                      <span className={styles.recentType}>
                        <Icon size={14} />
                        {relatedSourceLabels[item.sourceType]}
                      </span>
                      <span className={styles.recentTitle} title={item.title}>
                        {item.title}
                      </span>
                      <span className={styles.recentMeta}>{[subjectNameIn(contexts, item.subjectId), status].filter(Boolean).join(' · ')}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className={styles.notices}>
          <MockDataNotice />
        </div>
      </div>

      {pdfOpen && <PdfImportModal onClose={() => setPdfOpen(false)} onManualAdd={() => setAddOpen(true)} />}
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

function WaitingFeedback({ query }: { query: QueryResult<number> }) {
  if (query.status === 'error' && query.error) {
    return (
      <div className={styles.section}>
        <ErrorState title="피드백 요청 상태를 불러오지 못했어요" error={query.error} onRetry={query.retry} />
      </div>
    )
  }
  if (!query.data) return null
  return (
    <section className={styles.waitingCard} aria-labelledby="home-waiting">
      <span className={styles.waitingIcon} aria-hidden="true">
        <ClockIcon size={22} />
      </span>
      <span className={styles.waitingText}>
        <span id="home-waiting" className={styles.waitingTitle}>
          선생님 답변을 기다리고 있어요
        </span>
        <span className={styles.waitingDescription}>
          대기 중인 요청 {query.data}건. 답변이 오면 선생님 피드백에서 확인할 수 있어요. 그동안 노트를 자유롭게 이어서 써도 돼요.
        </span>
      </span>
      <Link to={`${feedbackPath}?status=PENDING`} className={styles.inkButton}>
        요청 보기
        <ArrowRightIcon size={15} />
      </Link>
    </section>
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
            {mockRuntimeInfo() ? '시연 기준일' : '오늘'} {today}부터 {urgentDays}일 안에 마감인 과제예요. 푸시 알림·읽음 표시는 아직 없어요.
          </p>
        </div>
      )}
    </div>
  )
}
