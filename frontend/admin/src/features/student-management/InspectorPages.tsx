import { useEffect, useRef } from 'react'
import { ActivityInspector } from '../../components/ActivityInspector.tsx'
import { Badge } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import { TaskInspector } from '../../components/TaskInspector.tsx'
import { activityTypeLabel } from '../../fixtures/adminActivities.fixture.ts'
import type { AdminActivity, AdminStudent, ParentShareStatus } from '../../fixtures/types.ts'
import type { AdminState } from '../../store/adminStore.ts'
import { activityFeedbackId, deriveFeedbackQueue, queueKindLabel, queueStatusLabel } from '../../read-model/feedbackQueue.ts'
import type { TaskDetail } from '../../read-model/taskDetail.ts'
import { daysUntil, formatDday, formatMonthDay, formatWaiting } from '../../read-model/time.ts'
import styles from './StudentManagement.module.css'

/*
 * Admin Task Inspector (/tasks/:taskId) · Activity Inspector (/activities/:activityId) — 읽기 전용.
 * Queue에 없는 Task / Activity도 Student 360 · Connection · Interview · Today Board에서 열어 확인한다.
 * 검토 대기 중이면 Feedback Review로 이어 갈 수 있지만, 여기서는 Feedback을 쓰지 않는다. (Queue 밖 Task에 검토 동작을 강제하지 않는다)
 */

const shareLabel: Record<ParentShareStatus, string> = { not_shared: '공유 안 함', consented: '학생 동의 (Report 첨부 후보)', attached: 'Report 첨부됨', shared: '학부모에게 공유됨' }
const topicLabel = { 'not-submitted': '제출 전', 'in-review': '검토 대기', 'direction-requested': '방향 요청됨', confirmed: '승인됨' } as const

function useHeadingFocus(key: string) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [key])
  return ref
}

interface InspectorPageProps {
  state: AdminState
  student: AdminStudent
  onBack: () => void
  backLabel: string
  onOpenStudent: (studentId: string) => void
  onOpenReview: (feedbackId: string) => void
}

export function TaskInspectorPage({ state, detail, student, onBack, backLabel, onOpenStudent, onOpenReview }: InspectorPageProps & { detail: TaskDetail }) {
  const { task } = detail
  const headingRef = useHeadingFocus(task.taskId)
  const days = daysUntil(task.deadlineDate)
  const queue = deriveFeedbackQueue(state).filter((item) => item.sourceId === task.taskId)
  return (
    <div className={ui.page}>
      <button type="button" className={ui.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> {backLabel}
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>
      <header className={ui.headerText}>
        <p className={ui.muted}>
          <button type="button" className={ui.linkButton} onClick={() => onOpenStudent(student.studentId)}>
            {student.displayName}
            <span className="lh-visually-hidden"> Student 360 보기</span>
          </button>{' '}
          · {student.grade} · {task.subject} · Task 상세 (읽기 전용)
        </p>
        <h1 ref={headingRef} tabIndex={-1} className={ui.title}>
          {task.title}
        </h1>
      </header>
      <div className={styles.inspectorLayout}>
        <aside className={ui.panel} data-tone="surface" aria-label="Task 개요">
          <dl className={ui.facts}>
            <dt>현재 단계</dt>
            <dd>
              {task.currentStage}/8 · {task.onHold ? '보류' : task.stageStatus}
            </dd>
            <dt>Deadline</dt>
            <dd>
              {formatMonthDay(task.deadlineDate)} · {task.currentStage === 8 ? '완료' : formatDday(days)}
            </dd>
            <dt>학생 차례</dt>
            <dd>{task.turn === 'student' ? '학생 차례' : task.turn === 'done' ? '완료' : '기다리는 중'}</dd>
            <dt>다음 할 일</dt>
            <dd>{task.nextAction}</dd>
            <dt>주제</dt>
            <dd>{task.topic ? `${task.topic.text || '미작성'} · ${topicLabel[task.topic.state]}` : '주제 정보 없음'}</dd>
            {task.topic?.guidance && (
              <>
                <dt>남긴 방향</dt>
                <dd>{task.topic.guidance}</dd>
              </>
            )}
            <dt>최종 결과</dt>
            <dd>
              {task.currentStage !== 8
                ? '진행 중'
                : task.finalArtifact
                  ? `${task.finalArtifact.fileName} · ${shareLabel[task.finalArtifact.parentShareStatus]}`
                  : '최종 제출 완료 · 결과물 없음'}
            </dd>
          </dl>
          {queue.length > 0 ? (
            <div className={ui.list}>
              {queue.map((item) => (
                <div key={item.feedbackId} className={ui.listItem}>
                  <span className={ui.cellMain}>
                    {queueKindLabel[item.kind]} 대기 · {item.target} · {formatWaiting(item.waitingHours)}
                  </span>
                  <span className={ui.cellSub}>{queueStatusLabel[item.status]}</span>
                  <button type="button" className={`${ui.ghostButton} ${ui.smallButton}`} onClick={() => onOpenReview(item.feedbackId)}>
                    검토 열기
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className={ui.cellSub}>공용 Queue에서 기다리는 검토가 없어요. (이 화면은 확인만 해요)</p>
          )}
        </aside>
        <section aria-label="Task 자료">
          <TaskInspector detail={detail} focusVersionId={detail.waitingVersionId ?? detail.versions.at(-1)?.version.versionId ?? null} />
        </section>
      </div>
    </div>
  )
}

export function ActivityInspectorPage({ state, activity, student, onBack, backLabel, onOpenStudent, onOpenReview }: InspectorPageProps & { activity: AdminActivity }) {
  const headingRef = useHeadingFocus(activity.activityId)
  const waiting = deriveFeedbackQueue(state).find((item) => item.feedbackId === activityFeedbackId(activity.activityId))
  const connections = state.connections.filter((item) => item.sourceRefs.some((ref) => ref.source === 'growth' && ref.sourceId === activity.activityId))
  const questions = state.interview.filter((item) => item.relatedActivityIds.includes(activity.activityId))
  return (
    <div className={ui.page}>
      <button type="button" className={ui.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> {backLabel}
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>
      <header className={ui.headerText}>
        <p className={ui.muted}>
          <button type="button" className={ui.linkButton} onClick={() => onOpenStudent(student.studentId)}>
            {student.displayName}
            <span className="lh-visually-hidden"> Student 360 보기</span>
          </button>{' '}
          · {student.grade} · {activityTypeLabel[activity.type]} · 성장활동 상세 (읽기 전용)
        </p>
        <h1 ref={headingRef} tabIndex={-1} className={ui.title}>
          {activity.title}
        </h1>
      </header>
      <div className={styles.inspectorLayout}>
        <aside className={ui.panel} data-tone="surface" aria-label="활동 연결">
          {waiting ? (
            <div className={ui.listItem}>
              <span className={ui.cellMain}>활동 피드백 대기 · {formatWaiting(waiting.waitingHours)}</span>
              <button type="button" className={`${ui.ghostButton} ${ui.smallButton}`} onClick={() => onOpenReview(waiting.feedbackId)}>
                피드백 쓰기
              </button>
            </div>
          ) : (
            <p className={ui.cellSub}>기다리는 피드백 요청이 없어요.</p>
          )}
          <h2 className={ui.subTitle}>Connection {connections.length}</h2>
          {connections.length === 0 ? (
            <p className={ui.cellSub}>이 활동이 들어간 Connection이 없어요.</p>
          ) : (
            <ul className={ui.list}>
              {connections.map((item) => (
                <li key={item.connectionId} className={ui.listItem}>
                  <Badge tone={item.reviewState === 'confirmed' ? 'accent' : item.reviewState === 'candidate' ? 'warning' : undefined}>{{ candidate: 'AI 후보', confirmed: '확정', rejected: '거절' }[item.reviewState]}</Badge>
                  <span className={ui.cellSub}>{item.reason}</span>
                </li>
              ))}
            </ul>
          )}
          <h2 className={ui.subTitle}>Interview 질문 {questions.length}</h2>
          {questions.length === 0 ? (
            <p className={ui.cellSub}>이 활동을 근거로 한 질문이 없어요.</p>
          ) : (
            <ul className={ui.list}>
              {questions.map((item) => (
                <li key={item.questionId} className={ui.listItem}>
                  <Badge tone={item.published ? 'accent' : undefined}>{item.published ? '공개' : '초안'}</Badge>
                  <span className={ui.cellSub}>{item.question}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section aria-label="활동 기록">
          <ActivityInspector activity={activity} />
        </section>
      </div>
    </div>
  )
}
