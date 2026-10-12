import { useEffect, type ReactNode } from 'react'
import { SchoolLayout } from './components/SchoolLayout.tsx'
import {
  TaskEvaluationPanel,
  TaskFeedbackPanel,
  TaskMentorCasePanel,
  TaskOverviewPanel,
  TaskProcessPanel,
  TaskReferencesPanel,
  TaskRevisionPanel,
} from './components/TaskDetailPanels.tsx'
import { TaskDetailTabs } from './components/TaskDetailTabs.tsx'
import { TaskCompactStatus, TaskNowCard } from './components/TaskNowCard.tsx'
import { TaskStageStepper } from './components/TaskStageStepper.tsx'
import { useEvidenceManager } from './components/useEvidenceManager.tsx'
import { useVersionManager } from './components/useVersionManager.tsx'
import { FinalArtifactSection } from './components/FinalArtifactParts.tsx'
import { useFinalManager } from './components/useFinalManager.tsx'
import type { SchoolFinalService } from './fixtures/schoolFinalArtifact.fixture.ts'
import { isTaskCompleted, withFinalNowCard } from './model/finalArtifact.ts'
import type { SchoolEvidenceService } from './fixtures/schoolEvidence.fixture.ts'
import type { SchoolFeedbackService } from './fixtures/schoolFeedback.fixture.ts'
import type { SchoolVersionService } from './fixtures/schoolVersion.fixture.ts'
import { withEvidenceNowCard } from './model/evidence.ts'
import { withFeedbackNowCard } from './model/feedback.ts'
import { useFeedbackReflect } from './model/useFeedbackReflect.ts'
import { aiStatusHeadingId, latestVersion, withVersionNowCard } from './model/version.ts'
import styles from './SchoolTaskDetailPage.module.css'
import {
  fallbackNowCard,
  taskDetailTabCount,
  taskDetailTabElementId,
  taskDetailTabs,
  type TaskDetailTabId,
} from './model/taskDetail.ts'
import { studentAttentionMessage } from './model/taskDetail.ts'
import { deadlineCountdown, formatDeadline, isAwaitingOthers, taskAttentionLabel } from './model/tasks.ts'
import type { StudentTaskDetail, TaskDetailAction } from './model/types.ts'
import { useSchoolTaskDetail } from './model/useSchoolTaskDetail.ts'

const panelId = 'task-detail-tabpanel'

interface SchoolTaskDetailPageProps {
  taskId: string
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/tasks/{taskId}. */
  loadDetail: (taskId: string) => Promise<StudentTaskDetail | null>
  /** 선택 Tab / Version Pair는 호출 측(Route, URL)이 소유해 다른 화면 왕복 / 새로고침 후에도 유지한다. */
  tab: TaskDetailTabId
  fromVersionParam: string | null
  toVersionParam: string | null
  /** versionId: 피드백 Tab에서 특정 Version 피드백으로 바로 이동 */
  onTabChange: (tab: TaskDetailTabId, versionId?: string) => void
  onCompareVersions: (fromVersionId: string, toVersionId: string) => void
  /** 수정 기록의 "피드백 보기": History에 남겨 Back으로 같은 비교(Pair) / Scroll로 돌아온다. */
  onRevisionFeedbackOpen: (versionId: string) => void
  onBackToTasks: () => void
  /** 돌아가기 버튼의 읽기 문구 (실제 돌아갈 곳) */
  backLabel: string
  onMentorCaseOpen: (contentId: string) => void
  /** 지금 할 일의 "주제 선정하기 / 주제 수정하기" */
  onOpenTopic: () => void
  /** 주제 제출 Modal (Task 값을 불러온 뒤 호출 측이 그린다) */
  renderTopicDialog?: (data: StudentTaskDetail) => ReactNode
  /** 주제를 제출한 직후: 바뀐 지금 할 일로 Focus / Scroll */
  focusNowCard?: boolean
  /** 자료(Evidence) 추가 / 삭제 Boundary. 현재는 Fixture, API 연결 시 POST / DELETE /api/student/tasks/{taskId}/evidence */
  evidenceService: SchoolEvidenceService
  /** 자료가 바뀌면 호출 측이 Task를 다시 불러온다. */
  onEvidenceChanged: () => void
  /** Version 제출 / AI 사전 점검 다시 시도 Boundary. 현재는 Fixture, API 연결 시 POST …/versions, …/ai-analysis/retry */
  versionService: SchoolVersionService
  /** Version이 바뀌면 호출 측이 Task를 다시 불러온다. */
  onVersionChanged: () => void
  /** 지금 할 일의 "초안 V1 제출 / 수정본 Vn 제출" */
  onOpenVersionSubmit: () => void
  /** 피드백 "반영함" Boundary. 현재는 Fixture (Contract에 갱신 Endpoint 없음) */
  feedbackService: SchoolFeedbackService
  /** 피드백이 바뀌거나 다시 불러올 때 호출 측이 Task를 다시 불러온다. */
  onFeedbackChanged: () => void
  /** 피드백 Tab에서 이동할 Version (?versionId=) */
  feedbackVersionParam: string | null
  /** 최종 제출 / 학부모 공유 Boundary. 현재는 Fixture (최종 제출 Endpoint는 Contract에 없음) */
  finalService: SchoolFinalService
  /** 최종 제출 / 공유 설정이 바뀌거나 다시 불러올 때 호출 측이 Task를 다시 불러온다. */
  onFinalChanged: () => void
  /** Version 제출 Modal (Task 값을 불러온 뒤 호출 측이 그린다) */
  renderVersionDialog?: (data: StudentTaskDetail) => ReactNode
}

// Student Task Detail (TasksDetail-01 ~ 07 Mockup)
// 순서: 돌아가기 (School 1차 Navigation 없음) → 상태 Badge · 제목 · 제출물 / 마감 → 8단계 → 지금 할 일(Overview) 또는 한 줄 상태 → 7 Tab
export function SchoolTaskDetailPage({
  taskId,
  loadDetail,
  tab,
  fromVersionParam,
  toVersionParam,
  onTabChange,
  onCompareVersions,
  onRevisionFeedbackOpen,
  onBackToTasks,
  backLabel,
  onMentorCaseOpen,
  onOpenTopic,
  renderTopicDialog,
  focusNowCard = false,
  evidenceService,
  onEvidenceChanged,
  versionService,
  onVersionChanged,
  onOpenVersionSubmit,
  renderVersionDialog,
  feedbackService,
  onFeedbackChanged,
  feedbackVersionParam,
  finalService,
  onFinalChanged,
}: SchoolTaskDetailPageProps) {
  const { state, reload } = useSchoolTaskDetail(taskId, loadDetail)

  return (
    <SchoolLayout level="detail" busy={state.status === 'loading'}>
      <button type="button" className={styles.back} onClick={onBackToTasks}>
        <span aria-hidden="true">‹</span> {backLabel}
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>

      {state.status === 'loading' && (
        <>
          <p className="lh-visually-hidden" role="status">
            수행평가를 불러오는 중이에요.
          </p>
          <div className={styles.skeleton} aria-hidden="true">
            <span className={styles.skeletonBadge} />
            <span className={styles.skeletonTitle} />
            <span className={styles.skeletonLine} />
            <span className={styles.skeletonStepper} />
            <span className={styles.skeletonCard} />
            <span className={styles.skeletonTabs} />
            <span className={styles.skeletonContent} />
          </div>
        </>
      )}

      {state.status === 'error' && (
        <div className={styles.notice} role="alert">
          <h1 className={styles.noticeTitle}>수행평가를 불러오지 못했어요.</h1>
          <p className={styles.noticeDescription}>잠시 후 다시 시도해 주세요.</p>
          <button type="button" className={styles.noticeButton} onClick={reload}>
            다시 시도
          </button>
        </div>
      )}

      {state.status === 'notFound' && (
        <div className={styles.notice}>
          <h1 className={styles.noticeTitle}>수행평가를 찾을 수 없어요.</h1>
          <p className={styles.noticeDescription}>주소가 잘못되었거나 내 수행평가 목록에 없는 Task예요.</p>
          <button type="button" className={styles.noticeButton} onClick={onBackToTasks}>
            Tasks 목록으로 이동
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <>
          <TaskDetail
            data={state.data}
            tab={tab}
            fromVersionParam={fromVersionParam}
            toVersionParam={toVersionParam}
            onTabChange={onTabChange}
            onCompareVersions={onCompareVersions}
            onRevisionFeedbackOpen={onRevisionFeedbackOpen}
            onMentorCaseOpen={onMentorCaseOpen}
            onOpenTopic={onOpenTopic}
            focusNowCard={focusNowCard}
            evidenceService={evidenceService}
            onEvidenceChanged={onEvidenceChanged}
            versionService={versionService}
            onVersionChanged={onVersionChanged}
            onOpenVersionSubmit={onOpenVersionSubmit}
            feedbackService={feedbackService}
            onFeedbackChanged={onFeedbackChanged}
            feedbackVersionParam={feedbackVersionParam}
            finalService={finalService}
            onFinalChanged={onFinalChanged}
          />
          {renderTopicDialog?.(state.data)}
          {renderVersionDialog?.(state.data)}
        </>
      )}
    </SchoolLayout>
  )
}

interface TaskDetailProps {
  data: StudentTaskDetail
  tab: TaskDetailTabId
  fromVersionParam: string | null
  toVersionParam: string | null
  onTabChange: (tab: TaskDetailTabId, versionId?: string) => void
  onCompareVersions: (fromVersionId: string, toVersionId: string) => void
  onRevisionFeedbackOpen: (versionId: string) => void
  onMentorCaseOpen: (contentId: string) => void
  onOpenTopic: () => void
  focusNowCard: boolean
  evidenceService: SchoolEvidenceService
  onEvidenceChanged: () => void
  versionService: SchoolVersionService
  onVersionChanged: () => void
  onOpenVersionSubmit: () => void
  feedbackService: SchoolFeedbackService
  onFeedbackChanged: () => void
  feedbackVersionParam: string | null
  finalService: SchoolFinalService
  onFinalChanged: () => void
}

function TaskDetail({
  data,
  tab,
  fromVersionParam,
  toVersionParam,
  onTabChange,
  onCompareVersions,
  onRevisionFeedbackOpen,
  onMentorCaseOpen,
  onOpenTopic,
  focusNowCard,
  evidenceService,
  onEvidenceChanged,
  versionService,
  onVersionChanged,
  onOpenVersionSubmit,
  feedbackService,
  onFeedbackChanged,
  feedbackVersionParam,
  finalService,
  onFinalChanged,
}: TaskDetailProps) {
  const { task, detail, snapshotDate } = data
  const evidence = useEvidenceManager({ service: evidenceService, onChanged: onEvidenceChanged, focusFallbackId: 'task-evidence-add' })
  const version = useVersionManager({ service: versionService, onChanged: onVersionChanged })
  const latest = latestVersion(data)
  const latestNotice = latest && version.retryNotice?.versionId === latest.versionId ? version.retryNotice : undefined
  const reflect = useFeedbackReflect({ service: feedbackService, onChanged: onFeedbackChanged })
  const final = useFinalManager({ service: finalService, onChanged: onFinalChanged })
  const versionCard = withFinalNowCard(
    data,
    withFeedbackNowCard(data, withVersionNowCard(data, withEvidenceNowCard(data, detail?.nowCard ?? fallbackNowCard(data)))),
  )
  // 다시 시도가 막힌 Version(다시 시도 불가 / 찾을 수 없음 / 이미 분석 중)은 다시 시도 버튼을 두지 않는다.
  const nowCard =
    latestNotice?.blocked && versionCard.primaryAction?.kind === 'retryAiAnalysis' ? { ...versionCard, primaryAction: undefined } : versionCard
  const nowNotice = latestNotice?.message
  const tabs = taskDetailTabs.map((item) => ({ ...item, count: taskDetailTabCount(data, item.id) }))
  // 선생님 검토 / AI 분석을 기다리는 상태와 Review 지연은 Badge 없이 Text로만 보여준다.
  // (Deadline Passed / Hold 등 다른 주의 표시와 학생 차례의 단계 상태는 기존 Badge 유지)
  // AI 사전 점검 실패도 Error Text로만 보여준다. (상태 Badge 없음)
  const awaiting = isAwaitingOthers(task) || latest?.aiAnalysisStatus === 'failed'
  const badgeFlags = task.attentionFlags.filter((flag) => flag !== 'reviewDelayed')
  const delayed = task.attentionFlags.includes('reviewDelayed')

  const handleAction = (action: TaskDetailAction) => {
    if (action.kind === 'compareVersions') onCompareVersions(action.fromVersionId, action.toVersionId)
    else if (action.kind === 'openTab') onTabChange(action.tab, action.versionId)
    else if (action.kind === 'submitTopic') onOpenTopic()
    else if (action.kind === 'addEvidence') evidence.openAdd(task, document.activeElement as HTMLElement | null)
    else if (action.kind === 'submitVersion') onOpenVersionSubmit()
    else if (action.kind === 'submitFinal') {
      if (latest) final.openConfirm(task.taskId, latest, document.activeElement as HTMLElement | null)
    } else if (action.kind === 'previewFinal') {
      if (data.finalArtifact.status === 'ready') final.openPreview(data.finalArtifact.data, document.activeElement as HTMLElement | null)
    } else if (action.kind === 'retryAiAnalysis') {
      const target = data.versions.items.find((item) => item.versionId === action.versionId)
      if (target) version.retry(target, 'task-now-heading')
    }
  }

  // 주제를 제출한 직후: 예전 Scroll 위치 대신 바뀐 지금 할 일이 보이도록 옮긴다.
  useEffect(() => {
    if (!focusNowCard) return
    const heading = document.getElementById('task-now-heading')
    heading?.scrollIntoView({ block: 'center' })
    heading?.focus({ preventScroll: true })
  }, [focusNowCard, data])

  return (
    <article className={styles.detail} aria-labelledby="task-detail-title">
      <header className={styles.header}>
        {awaiting ? (
          <p className={styles.statusText}>
            <span className={styles.statusCurrent}>{task.stageStatus}</span>
            {/* 기다림 / AI 실패 상태 자체는 Text로만. 마감 지남 · 보류 같은 주의 표시는 기존 Badge 유지 */}
            {badgeFlags.map((flag) => (
              <span key={flag} className={styles.attentionBadge} data-flag={flag}>
                {taskAttentionLabel[flag]}
              </span>
            ))}
            {delayed && <span className={styles.statusNote}>{studentAttentionMessage.reviewDelayed}</span>}
          </p>
        ) : (
          <p className={styles.badges}>
            <span className={styles.stageBadge}>{task.stageStatus}</span>
            {badgeFlags.map((flag) => (
              <span key={flag} className={styles.attentionBadge} data-flag={flag}>
                {taskAttentionLabel[flag]}
              </span>
            ))}
            {delayed && <span className={styles.statusNote}>{studentAttentionMessage.reviewDelayed}</span>}
          </p>
        )}
        <h1 id="task-detail-title" className={styles.title}>
          {task.title}
        </h1>
        <p className={styles.meta}>
          {[task.deliverableSummary, task.subject, `${formatDeadline(task.deadlineDate)} 마감 (${deadlineCountdown(task.deadlineDate, snapshotDate)})`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </header>

      <TaskStageStepper currentStage={task.currentStage} />

      {tab === 'overview' ? (
        <TaskNowCard
          task={task}
          card={nowCard}
          onAction={handleAction}
          notice={nowNotice}
          busyLabel={version.retryingId && version.retryingId === latest?.versionId ? '다시 시도하는 중…' : undefined}
        />
      ) : (
        <TaskCompactStatus task={task} />
      )}

      {!detail && (
        <p className={styles.detailNotice}>이 수행평가는 목록 정보만 있어요. 자세한 자료는 준비되는 대로 보여드릴게요.</p>
      )}

      <div className={styles.tabsArea}>
        <TaskDetailTabs items={tabs} selected={tab} onSelect={onTabChange} panelId={panelId} />
        <div role="tabpanel" id={panelId} aria-labelledby={taskDetailTabElementId(tab)} className={styles.panel}>
          {tab === 'overview' && (
            <>
              <FinalArtifactSection
                state={data.finalArtifact}
                completed={isTaskCompleted(task)}
                onPreview={final.openPreview}
                onShareChange={(consented) => final.changeShare(task.taskId, consented)}
                sharePending={final.sharePending}
                shareFailed={final.shareFailed}
                onReload={onFinalChanged}
              />
              <TaskOverviewPanel detail={detail} />
            </>
          )}
          {tab === 'evaluation' && <TaskEvaluationPanel data={data} />}
          {tab === 'references' && <TaskReferencesPanel detail={detail} />}
          {tab === 'process' && (
            <TaskProcessPanel
              data={data}
              // 최종 제출을 마친 수행평가는 과정 자료를 읽기만 한다.
              readOnly={isTaskCompleted(task)}
              onAdd={(trigger) => evidence.openAdd(task, trigger)}
              onPreview={evidence.openPreview}
              onDelete={evidence.openDelete}
              deleteErrorId={evidence.deleteErrorId}
            />
          )}
          {tab === 'feedback' && (
            <TaskFeedbackPanel
              data={data}
              onRetry={(target) => version.retry(target, aiStatusHeadingId(target.versionId))}
              retryingId={version.retryingId}
              retryNotice={version.retryNotice}
              versionParam={feedbackVersionParam}
              reflect={reflect}
              onReload={onFeedbackChanged}
            />
          )}
          {tab === 'mentor-case' && <TaskMentorCasePanel detail={detail} onCaseOpen={onMentorCaseOpen} />}
          {tab === 'revision' && (
            <TaskRevisionPanel
              data={data}
              fromParam={fromVersionParam}
              toParam={toVersionParam}
              onVersionPairChange={onCompareVersions}
              onFeedbackOpen={onRevisionFeedbackOpen}
              onVersionPreview={version.openPreview}
            />
          )}
        </div>
      </div>
      {evidence.dialogs}
      {version.dialogs}
      {final.dialogs}
    </article>
  )
}
