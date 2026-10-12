import { SchoolLayout, type SchoolSectionId } from './components/SchoolLayout.tsx'
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
  onTabChange: (tab: TaskDetailTabId) => void
  onCompareVersions: (fromVersionId: string, toVersionId: string) => void
  onBackToTasks: () => void
  onMentorCaseOpen: (contentId: string) => void
  studentGrade: string
  onSectionSelect: (id: SchoolSectionId) => void
}

// Student Task Detail (TasksDetail-01 ~ 07 Mockup)
// 순서: School 내부 Navigation(Tasks) → 돌아가기 → 상태 Badge · 제목 · 제출물 / 마감 → 8단계 → 지금 할 일(Overview) 또는 한 줄 상태 → 7 Tab
export function SchoolTaskDetailPage({
  taskId,
  loadDetail,
  tab,
  fromVersionParam,
  toVersionParam,
  onTabChange,
  onCompareVersions,
  onBackToTasks,
  onMentorCaseOpen,
  studentGrade,
  onSectionSelect,
}: SchoolTaskDetailPageProps) {
  const { state, reload } = useSchoolTaskDetail(taskId, loadDetail)

  return (
    <SchoolLayout
      current="tasks"
      studentGrade={studentGrade}
      onSectionSelect={onSectionSelect}
      busy={state.status === 'loading'}
      showPageHeader={false}
    >
      <button type="button" className={styles.back} onClick={onBackToTasks}>
        <span aria-hidden="true">‹</span> School
        <span className="lh-visually-hidden"> Tasks 목록으로 돌아가기</span>
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
        <TaskDetail
          data={state.data}
          tab={tab}
          fromVersionParam={fromVersionParam}
          toVersionParam={toVersionParam}
          onTabChange={onTabChange}
          onCompareVersions={onCompareVersions}
          onMentorCaseOpen={onMentorCaseOpen}
        />
      )}
    </SchoolLayout>
  )
}

interface TaskDetailProps {
  data: StudentTaskDetail
  tab: TaskDetailTabId
  fromVersionParam: string | null
  toVersionParam: string | null
  onTabChange: (tab: TaskDetailTabId) => void
  onCompareVersions: (fromVersionId: string, toVersionId: string) => void
  onMentorCaseOpen: (contentId: string) => void
}

function TaskDetail({ data, tab, fromVersionParam, toVersionParam, onTabChange, onCompareVersions, onMentorCaseOpen }: TaskDetailProps) {
  const { task, detail, snapshotDate } = data
  const nowCard = detail?.nowCard ?? fallbackNowCard(data)
  const tabs = taskDetailTabs.map((item) => ({ ...item, count: taskDetailTabCount(data, item.id) }))
  // 선생님 검토 / AI 분석을 기다리는 상태와 Review 지연은 Badge 없이 Text로만 보여준다.
  // (Deadline Passed / Hold 등 다른 주의 표시와 학생 차례의 단계 상태는 기존 Badge 유지)
  const awaiting = isAwaitingOthers(task)
  const badgeFlags = task.attentionFlags.filter((flag) => flag !== 'reviewDelayed')
  const delayed = task.attentionFlags.includes('reviewDelayed')

  const handleAction = (action: TaskDetailAction) => {
    if (action.kind === 'compareVersions') onCompareVersions(action.fromVersionId, action.toVersionId)
    else if (action.kind === 'openTab') onTabChange(action.tab)
  }

  return (
    <article className={styles.detail} aria-labelledby="task-detail-title">
      <header className={styles.header}>
        {awaiting ? (
          <p className={styles.statusText}>
            <span className={styles.statusCurrent}>{task.stageStatus}</span>
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
        <TaskNowCard task={task} card={nowCard} onAction={handleAction} />
      ) : (
        <TaskCompactStatus task={task} />
      )}

      {!detail && (
        <p className={styles.detailNotice}>이 수행평가는 목록 정보만 있어요. 자세한 자료는 준비되는 대로 보여드릴게요.</p>
      )}

      <div className={styles.tabsArea}>
        <TaskDetailTabs items={tabs} selected={tab} onSelect={onTabChange} panelId={panelId} />
        <div role="tabpanel" id={panelId} aria-labelledby={taskDetailTabElementId(tab)} className={styles.panel}>
          {tab === 'overview' && <TaskOverviewPanel detail={detail} />}
          {tab === 'evaluation' && <TaskEvaluationPanel data={data} />}
          {tab === 'references' && <TaskReferencesPanel detail={detail} />}
          {tab === 'process' && <TaskProcessPanel detail={detail} />}
          {tab === 'feedback' && <TaskFeedbackPanel data={data} />}
          {tab === 'mentor-case' && <TaskMentorCasePanel detail={detail} onCaseOpen={onMentorCaseOpen} />}
          {tab === 'revision' && (
            <TaskRevisionPanel
              data={data}
              fromParam={fromVersionParam}
              toParam={toVersionParam}
              onVersionPairChange={onCompareVersions}
              onFeedbackOpen={() => onTabChange('feedback')}
            />
          )}
        </div>
      </div>
    </article>
  )
}
