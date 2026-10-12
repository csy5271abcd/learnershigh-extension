import { useEffect, type ReactNode } from 'react'
import { evidenceConditionText } from '../model/evidence.ts'
import {
  feedbackAiAnchorId,
  feedbackVersionAnchorId,
  groupTeacherFeedback,
  isReflectEditable,
  reflectTargetKey,
  type FeedbackReflectTarget,
} from '../model/feedback.ts'
import { aiStatusHeadingId, versionAiStatusText } from '../model/version.ts'
import type { AiRetryNotice } from './useVersionManager.tsx'
import {
  findRevisionDiff,
  formatDateTime,
  processCategories,
  referenceKindLabel,
  resolveVersionPair,
  revisionDiffCounts,
} from '../model/taskDetail.ts'
import { deadlineCountdown, formatDeadline } from '../model/tasks.ts'
import type {
  StudentTaskDetail,
  StudentTaskDetailExtra,
  TaskAiFeedback,
  TaskEvidence,
  TaskEvaluationCriterion,
  TaskRevisionBlock,
  TaskTeacherFeedback,
  TaskTopicState,
  TaskVersion,
} from '../model/types.ts'
import { EvidenceTable } from './EvidenceTable.tsx'
import styles from './TaskDetailPanels.module.css'

// ---------- 공통 ----------

/** 이 Task의 상세 자료가 Fixture / API에 아직 없음. (실제로 "없음"인 Empty와 구분한다) */
function NotPrepared({ what }: { what: string }) {
  return (
    <p className={styles.notPrepared} role="status">
      이 수행평가의 {what} 정보가 아직 준비되지 않았어요.
    </p>
  )
}

function EmptyNotice({ children }: { children: ReactNode }) {
  return (
    <p className={styles.empty} role="status">
      {children}
    </p>
  )
}

/** Evidence / 참고 자료 추가는 다음 작업(Evidence Vault)이다. 이유와 함께 비활성으로 둔다. */
function UnavailableAddButton({ id, label }: { id: string; label: string }) {
  return (
    <span className={styles.addAction}>
      <button type="button" className={styles.addButton} disabled aria-describedby={id}>
        {label}
      </button>
      <span id={id} className={styles.addReason}>
        추가 화면 준비 중
      </span>
    </span>
  )
}

function CriteriaTable({ criteria, withAi }: { criteria: TaskEvaluationCriterion[]; withAi: boolean }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">기준</th>
          <th scope="col" className={styles.pointsColumn}>
            배점
          </th>
          {withAi && <th scope="col">AI 점검</th>}
        </tr>
      </thead>
      <tbody>
        {criteria.map((criterion) => (
          <tr key={criterion.criterionId}>
            <th scope="row" className={styles.criterionName}>
              {criterion.name}
            </th>
            <td className={styles.pointsColumn}>{criterion.points === null ? '—' : `${criterion.points}점`}</td>
            {withAi && <td className={styles.aiCheck}>{criterion.aiCheck ?? '—'}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------- 1. Overview (TasksDetail-01) ----------

/** 주제: 상태를 Badge 없이 Text로 보여준다. (검토 기다림도 Text만) */
function TopicSection({ topic }: { topic: TaskTopicState }) {
  return (
    <section className={styles.section} aria-labelledby="task-overview-topic-heading">
      <h3 id="task-overview-topic-heading" className={styles.sectionTitle}>
        주제
      </h3>
      {topic.state === 'not-submitted' ? (
        <p className={styles.topicNote}>아직 주제를 정하지 않았어요.</p>
      ) : (
        <>
          <p className={styles.topic}>{topic.topic}</p>
          {topic.state === 'in-review' && <p className={styles.topicNote}>선생님 검토를 기다리고 있어요.</p>}
          {topic.state === 'confirmed' && <p className={styles.topicNote}>확인된 주제예요.</p>}
          {topic.state === 'direction-requested' && (
            <div className={styles.topicGuidance}>
              <p className={styles.topicGuidanceLabel}>선생님이 남긴 방향</p>
              <p>{topic.guidance}</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export function TaskOverviewPanel({ detail }: { detail: StudentTaskDetailExtra | null }) {
  return (
    <div className={styles.panel}>
      {detail?.topic && <TopicSection topic={detail.topic} />}

      <section className={styles.section} aria-labelledby="task-overview-criteria-heading">
        <div className={styles.sectionHeader}>
          <h3 id="task-overview-criteria-heading" className={styles.sectionTitle}>
            평가 기준
          </h3>
          {detail?.criteria && <span className={styles.aiBadge}>AI 점검 · 참고용 보조 점검</span>}
        </div>
        {detail?.criteria ? (
          <>
            <CriteriaTable criteria={detail.criteria} withAi />
            <p className={styles.note}>AI 점검은 참고용이에요. 최종 판단은 학원에서 확인한 뒤 알려드려요.</p>
          </>
        ) : (
          <NotPrepared what="평가 기준" />
        )}
      </section>
    </div>
  )
}

// ---------- 2. 평가 기준·제출물 (TasksDetail-02) ----------

export function TaskEvaluationPanel({ data }: { data: StudentTaskDetail }) {
  const { task, detail, snapshotDate } = data
  return (
    <div className={styles.panel}>
      <section className={styles.section} aria-labelledby="task-guide-heading">
        <h3 id="task-guide-heading" className={styles.sectionTitle}>
          수행평가 정보
        </h3>
        {detail?.guideFile ? (
          <div className={styles.fileCard}>
            <span className={styles.fileType} aria-hidden="true">
              {detail.guideFile.format}
            </span>
            <span className={styles.fileText}>
              <span className={styles.fileName}>{detail.guideFile.fileName}</span>
              <span className={styles.fileMeta}>
                {task.subject} · {formatDeadline(detail.guideFile.registeredDate)} 등록
              </span>
            </span>
            {/* 문서 Viewer / File API가 없어 열지 않는다. (File Storage OD-09) */}
            <span className={styles.fileAction}>
              <button type="button" className={styles.linkButton} disabled aria-describedby="task-guide-preview-reason">
                보기
              </button>
              <span id="task-guide-preview-reason" className={styles.addReason}>
                미리보기 준비 중
              </span>
            </span>
          </div>
        ) : (
          !detail?.guideText && <NotPrepared what="안내문" />
        )}
        {detail?.guideText && (
          <div className={styles.guideText}>
            <p className={styles.subTitle}>안내문 내용</p>
            <p className={styles.guideTextBody}>{detail.guideText}</p>
          </div>
        )}
      </section>

      <div className={styles.twoColumns}>
        <section className={styles.section} aria-labelledby="task-criteria-heading">
          <h3 id="task-criteria-heading" className={styles.subTitle}>
            평가 기준
          </h3>
          {detail?.criteria ? <CriteriaTable criteria={detail.criteria} withAi={false} /> : <NotPrepared what="평가 기준" />}
        </section>
        <section className={styles.section} aria-labelledby="task-deliverable-heading">
          <h3 id="task-deliverable-heading" className={styles.subTitle}>
            제출물 · 마감
          </h3>
          <p className={styles.deliverable}>{task.deliverableSummary || '수행형태를 아직 정하지 않았어요.'}</p>
          <p className={styles.deadline}>
            마감 {formatDeadline(task.deadlineDate)} · {deadlineCountdown(task.deadlineDate, snapshotDate)}
          </p>
        </section>
      </div>
    </div>
  )
}

// ---------- 3. 참고 자료 (TasksDetail-03) ----------

export function TaskReferencesPanel({ detail }: { detail: StudentTaskDetailExtra | null }) {
  const references = detail?.references
  return (
    <div className={styles.panel}>
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.sectionTitle}>참고 자료{references ? ` ${references.length}` : ''}</h3>
          <p className={styles.sectionDescription}>
            기사, 교과서, 링크처럼 과제에 참고하는 자료를 모아두세요. 제출 문서는 과정 자료에 올려요.
          </p>
        </div>
        <UnavailableAddButton id="task-reference-add-reason" label="참고 자료 추가" />
      </div>
      {!references ? (
        <NotPrepared what="참고 자료" />
      ) : references.length === 0 ? (
        <EmptyNotice>아직 모아둔 참고 자료가 없어요.</EmptyNotice>
      ) : (
        <ul className={styles.rows}>
          {references.map((reference) => (
            <li key={reference.referenceId} className={styles.referenceRow}>
              <span className={styles.kindBadge} data-kind={reference.kind}>
                {referenceKindLabel[reference.kind]}
              </span>
              <span className={styles.fileText}>
                <span className={styles.rowTitle}>{reference.title}</span>
                <span className={styles.fileMeta}>
                  {reference.source} · {reference.usage}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------- 4. 과정 자료 (TasksDetail-04) ----------

interface TaskProcessPanelProps {
  data: StudentTaskDetail
  onAdd: (trigger: HTMLElement) => void
  onPreview: (evidence: TaskEvidence, trigger: HTMLElement) => void
  onDelete: (evidence: TaskEvidence, trigger: HTMLElement) => void
  deleteErrorId?: string
}

// 과정 자료 = 이 Task의 Evidence Vault. School Evidence와 같은 Canonical Evidence를 읽는다.
export function TaskProcessPanel({ data, onAdd, onPreview, onDelete, deleteErrorId }: TaskProcessPanelProps) {
  const { task, evidence } = data
  if (!evidence.complete) {
    return (
      <div className={styles.panel}>
        <NotPrepared what="과정 자료" />
      </div>
    )
  }
  const materials = evidence.items
  const condition = evidenceConditionText(task, materials.length)
  return (
    <div className={styles.panel}>
      <ul className={styles.categoryGrid} aria-label="단계별 과정 자료">
        {processCategories.map((category) => {
          const items = materials.filter((item) => item.stageTag === category.id)
          const latest = items.at(-1)
          return (
            <li key={category.id} className={styles.categoryCard} data-empty={items.length === 0 || undefined}>
              <span className={styles.categoryHeader}>
                <span className={styles.categoryTitle}>{category.label}</span>
                <span className={styles.categoryCount}>{items.length > 0 ? `${items.length}개` : '없음'}</span>
              </span>
              <span className={styles.categoryDescription}>{category.description}</span>
              <span className={styles.categoryLatest}>{latest ? latest.fileName : '아직 올린 자료가 없어요'}</span>
            </li>
          )
        })}
      </ul>

      <div className={styles.sectionHeader}>
        <p className={styles.sectionDescription}>계획 · 조사 · 초안 · 최종 · 발표 단계별로 자료를 모아요.</p>
        <button
          type="button"
          id="task-evidence-add"
          className={styles.addButton}
          aria-haspopup="dialog"
          onClick={(event) => onAdd(event.currentTarget)}
        >
          자료 추가
        </button>
      </div>
      {condition && (
        <p className={styles.evidenceCondition} data-met={materials.length > 0 || undefined}>
          {condition}
        </p>
      )}

      {materials.length === 0 ? (
        <EmptyNotice>자료 조사에 참고한 파일을 추가해보세요.</EmptyNotice>
      ) : (
        <EvidenceTable items={materials} onPreview={onPreview} onDelete={onDelete} deleteErrorId={deleteErrorId} />
      )}
    </div>
  )
}

// ---------- 5. 피드백 (TasksDetail-05): 선생님 피드백 Primary / AI 사전 점검 Secondary ----------

/** "반영함" 표시를 바꾸는 흐름 (Route / Page가 저장을 맡는다) */
export interface FeedbackReflectControl {
  toggle: (target: FeedbackReflectTarget, reflected: boolean) => void
  /** 저장 중인 항목 (중복 요청 방지) */
  pendingKey?: string
  /** 저장하지 못한 항목 */
  errorKey?: string
}

/**
 * "반영함": 학생이 실제 제출물을 고쳤다고 본인이 표시하는 Checkbox. (켜고 끌 수 있다, 시스템 검증이 아니다)
 * 지난 Version 피드백은 읽기 전용 Text로 보여준다.
 */
function ReflectToggle({
  context,
  reflected,
  target,
  editable,
  control,
}: {
  context: string
  reflected: boolean
  target: FeedbackReflectTarget
  editable: boolean
  control: FeedbackReflectControl
}) {
  if (!editable) {
    return (
      <span className={styles.reflectState} data-reflected={reflected || undefined}>
        {reflected ? '반영함' : '아직 반영 전'}
      </span>
    )
  }
  const key = reflectTargetKey(target)
  const pending = control.pendingKey === key
  return (
    <label className={styles.reflectToggle} data-pending={pending || undefined}>
      <input
        type="checkbox"
        checked={reflected}
        disabled={pending}
        aria-label={`${context} — 반영함`}
        aria-describedby={control.errorKey === key ? `${key}-error` : undefined}
        onChange={(event) => control.toggle(target, event.target.checked)}
      />
      <span aria-hidden="true">{pending ? '저장 중…' : '반영함'}</span>
    </label>
  )
}

function ReflectError({ target, control }: { target: FeedbackReflectTarget; control: FeedbackReflectControl }) {
  const key = reflectTargetKey(target)
  if (control.errorKey !== key) return null
  return (
    <p id={`${key}-error`} className={styles.reflectError} role="alert">
      반영 표시를 저장하지 못했어요. 표시는 그대로예요. 다시 시도해주세요.
    </p>
  )
}

/** Version 하나의 선생님 피드백 (검토 중 / 전달됨) */
function TeacherFeedbackGroup({
  data,
  versionId,
  versionLabel,
  items,
  delayed,
  control,
}: {
  data: StudentTaskDetail
  versionId: string
  versionLabel: string
  items: TaskTeacherFeedback[]
  delayed: boolean
  control: FeedbackReflectControl
}) {
  const headingId = `${feedbackVersionAnchorId(versionId)}-title`
  const delivered = items.filter((item) => item.status === 'delivered')
  const required = delivered.filter((item) => item.required)
  const editable = isReflectEditable(data, versionId)
  return (
    <article id={feedbackVersionAnchorId(versionId)} className={styles.teacherFeedback} aria-labelledby={headingId}>
      <h4 id={headingId} className={styles.feedbackTitle} tabIndex={-1}>
        선생님 피드백 · {versionLabel}
      </h4>
      {delivered.length === 0 ? (
        <>
          <p className={styles.feedbackMeta}>공용 검토 대기열에서 확인하고 있어요.</p>
          <div className={styles.pendingBox}>
            <p>{versionLabel} 검토가 진행 중이에요.</p>
            <p className={styles.pendingNote}>
              {delayed ? '검토가 조금 지연되고 있어요.' : '선생님 검토를 기다리고 있어요. 검토가 끝나면 피드백을 확인할 수 있어요.'}
            </p>
          </div>
        </>
      ) : (
        <>
          <p className={styles.feedbackMeta}>
            {delivered[0].deliveredAt && `${formatDateTime(delivered[0].deliveredAt)} 전달`}
            {required.length > 0 && (
              <span className={styles.requiredCount}>
                {' '}
                · 필수 {required.filter((item) => item.reflected).length}/{required.length} 반영
              </span>
            )}
          </p>
          <ul className={styles.teacherItems}>
            {delivered.map((item) => {
              const target: FeedbackReflectTarget = { kind: 'teacher', taskId: data.task.taskId, feedbackId: item.feedbackId }
              return (
                <li key={item.feedbackId} className={styles.teacherItem}>
                  <div className={styles.feedbackBody}>
                    <p>
                      {item.required && <span className="lh-visually-hidden">필수 피드백: </span>}
                      {item.comment}
                    </p>
                    {item.nextAction && (
                      <p className={styles.feedbackNext}>
                        <span className={styles.feedbackNextLabel}>다음 할 일</span>
                        {item.nextAction}
                      </p>
                    )}
                    <ReflectError target={target} control={control} />
                  </div>
                  <ReflectToggle
                    context={item.comment ?? ''}
                    reflected={Boolean(item.reflected)}
                    target={target}
                    editable={editable}
                    control={control}
                  />
                </li>
              )
            })}
          </ul>
        </>
      )}
    </article>
  )
}

function AiFeedbackCard({
  data,
  feedback,
  teacherReviewed,
  control,
}: {
  data: StudentTaskDetail
  feedback: TaskAiFeedback
  teacherReviewed: boolean
  control: FeedbackReflectControl
}) {
  const reflected = feedback.items.filter((item) => item.reflected).length
  const editable = isReflectEditable(data, feedback.versionId)
  return (
    <article id={feedbackAiAnchorId(feedback.versionId)} className={styles.aiFeedback} aria-labelledby={`${feedback.feedbackId}-title`}>
      <div className={styles.sectionHeader}>
        <div>
          <h4 id={`${feedback.feedbackId}-title`} className={styles.aiTitle} tabIndex={-1}>
            AI 사전 점검 · {feedback.versionLabel}
            <span className={styles.aiBadge}>{teacherReviewed ? 'AI 1차 분석' : 'AI 1차 분석 · 선생님 확인 전'}</span>
          </h4>
          <p className={styles.feedbackMeta}>{formatDateTime(feedback.analyzedAt)} 자동 분석</p>
        </div>
        <span className={styles.reflectCount}>
          {reflected}/{feedback.items.length} 반영
        </span>
      </div>
      <ul className={styles.aiItems}>
        {feedback.items.map((item) => {
          const target: FeedbackReflectTarget = { kind: 'ai', taskId: data.task.taskId, feedbackId: feedback.feedbackId, itemId: item.itemId }
          return (
            <li key={item.itemId} className={styles.aiItem}>
              <div className={styles.aiItemText}>
                <span>{item.summary}</span>
                <ReflectError target={target} control={control} />
              </div>
              <ReflectToggle context={item.summary} reflected={item.reflected} target={target} editable={editable} control={control} />
            </li>
          )
        })}
      </ul>
    </article>
  )
}

/**
 * 결과가 아직 없는 AI 사전 점검 (분석 중 / 실패). Text로만 알리고, 분석 중에는 결과 자리에 정적인 Skeleton을 둔다.
 * 회전 표시 · 진행률 · Badge 없음. 실패는 이유와 다시 시도(가능할 때만)를 보여준다.
 */
function AiAnalysisStatusCard({
  version,
  retrying,
  notice,
  onRetry,
}: {
  version: TaskVersion
  retrying: boolean
  notice?: AiRetryNotice
  onRetry: (version: TaskVersion) => void
}) {
  const headingId = aiStatusHeadingId(version.versionId)
  const blocked = notice?.blocked ?? false
  return (
    <article className={styles.aiFeedback} aria-labelledby={headingId}>
      <h4 id={headingId} className={styles.aiTitle} tabIndex={-1}>
        AI 사전 점검 · {version.label}
      </h4>
      <p className={styles.feedbackMeta}>
        {formatDateTime(version.submittedAt)} 제출 · {version.fileName}
      </p>
      {version.aiAnalysisStatus === 'processing' ? (
        <>
          <p className={styles.aiStatusText}>AI 사전 점검을 진행하고 있어요. 분석이 끝나면 확인할 내용을 여기에서 보여드릴게요.</p>
          <div className={styles.aiSkeleton} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </>
      ) : (
        <>
          <p className={styles.aiStatusText}>
            AI 사전 점검을 완료하지 못했어요. 제출한 {version.label} 파일은 그대로 있어요.
            {!version.retryAllowed && ' 지금은 다시 시도할 수 없어서 학원에서 확인한 뒤 알려드릴게요.'}
          </p>
          {version.retryAllowed && !blocked && (
            <button
              type="button"
              className={styles.retryButton}
              onClick={() => onRetry(version)}
              disabled={retrying}
              aria-describedby={notice ? `${headingId}-notice` : undefined}
            >
              {retrying ? '다시 시도하는 중…' : '다시 시도'}
            </button>
          )}
        </>
      )}
      {notice && (
        <p id={`${headingId}-notice`} className={styles.aiStatusNotice} role="alert">
          {notice.message}
        </p>
      )}
    </article>
  )
}

interface TaskFeedbackPanelProps {
  data: StudentTaskDetail
  onRetry: (version: TaskVersion) => void
  retryingId?: string
  retryNotice?: AiRetryNotice
  /** 특정 Version 피드백으로 바로 이동 (?version=) */
  versionParam: string | null
  reflect: FeedbackReflectControl
  /** 피드백만 다시 불러오기 */
  onReload: () => void
}

export function TaskFeedbackPanel({ data, onRetry, retryingId, retryNotice, versionParam, reflect, onReload }: TaskFeedbackPanelProps) {
  // 특정 Version 피드백으로 들어오면 그 묶음을 보여주고 제목으로 Focus (선생님 피드백이 없으면 AI 사전 점검)
  useEffect(() => {
    if (!versionParam) return
    const target = document.getElementById(feedbackVersionAnchorId(versionParam)) ?? document.getElementById(feedbackAiAnchorId(versionParam))
    if (!target) return
    target.scrollIntoView({ block: 'start' })
    target.querySelector<HTMLElement>('h4')?.focus({ preventScroll: true })
  }, [versionParam])

  if (data.feedback.status === 'error') {
    return (
      <div className={styles.panel}>
        <div className={styles.sectionError} role="alert">
          <p className={styles.sectionErrorTitle}>피드백을 불러오지 못했어요.</p>
          <p className={styles.sectionDescription}>수행평가의 다른 내용은 그대로 볼 수 있어요.</p>
          <button type="button" className={styles.retryButton} onClick={onReload}>
            다시 시도
          </button>
        </div>
      </div>
    )
  }
  if (data.feedback.status === 'not-prepared') {
    return (
      <div className={styles.panel}>
        <NotPrepared what="피드백" />
      </div>
    )
  }
  const feedback = data.feedback.data
  // 결과가 아직 없는 AI 사전 점검 (최근 Version이 먼저)
  const pendingAi = data.versions.items.filter((version) => version.aiAnalysisStatus !== 'success').reverse()
  const missingVersion = versionParam && !data.versions.items.some((version) => version.versionId === versionParam)
  if (feedback.teacher.length === 0 && feedback.ai.length === 0 && pendingAi.length === 0) {
    return (
      <div className={styles.panel}>
        <EmptyNotice>
          아직 받은 피드백이 없어요. 초안을 제출하면 AI 사전 점검과 선생님 피드백이 여기에 보여요.
        </EmptyNotice>
      </div>
    )
  }
  const delayed = data.task.attentionFlags.includes('reviewDelayed')
  return (
    <div className={styles.panel}>
      {missingVersion && (
        <p className={styles.sectionError} role="alert">
          선택한 버전의 피드백을 찾을 수 없어요. 아래에서 받은 피드백을 확인해주세요.
        </p>
      )}
      <p className={styles.infoBar}>선생님 피드백을 먼저 확인하세요. 반영한 항목을 체크하면 다음 할 일이 함께 바뀌어요.</p>

      <section className={styles.section} aria-labelledby="task-teacher-feedback-heading">
        <h3 id="task-teacher-feedback-heading" className={styles.sectionTitle}>
          선생님 피드백
        </h3>
        {feedback.teacher.length === 0 ? (
          <EmptyNotice>
            {data.versions.items.length > 0 ? '선생님 피드백을 기다리고 있어요.' : '아직 받은 선생님 피드백이 없어요.'}
          </EmptyNotice>
        ) : (
          groupTeacherFeedback(feedback.teacher).map((group) => (
            <TeacherFeedbackGroup
              key={group.versionId}
              data={data}
              versionId={group.versionId}
              versionLabel={group.versionLabel}
              items={group.items}
              delayed={delayed}
              control={reflect}
            />
          ))
        )}
      </section>

      <section className={`${styles.section} ${styles.secondarySection}`} aria-labelledby="task-ai-feedback-heading">
        <h3 id="task-ai-feedback-heading" className={styles.secondaryTitle}>
          AI 사전 점검
        </h3>
        <p className={styles.infoBar}>AI 사전 점검은 참고용이에요. 최종 수정 방향은 선생님 피드백을 확인해주세요.</p>
        {pendingAi.map((version) => (
          <AiAnalysisStatusCard
            key={version.versionId}
            version={version}
            retrying={retryingId === version.versionId}
            notice={retryNotice?.versionId === version.versionId ? retryNotice : undefined}
            onRetry={onRetry}
          />
        ))}
        {feedback.ai.length === 0 && pendingAi.length === 0 ? (
          <EmptyNotice>AI 사전 점검 결과가 아직 없어요.</EmptyNotice>
        ) : (
          feedback.ai.map((item) => (
            <AiFeedbackCard
              key={item.feedbackId}
              data={data}
              feedback={item}
              // 같은 Version의 선생님 피드백이 전달됐으면 선생님 확인 전 표시를 떼어낸다.
              teacherReviewed={feedback.teacher.some((teacher) => teacher.versionId === item.versionId && teacher.status === 'delivered')}
              control={reflect}
            />
          ))
        )}
      </section>
    </div>
  )
}

// ---------- 6. Mentor Case (TasksDetail-06) ----------

const MAX_TASK_MENTOR_CASES = 3

export function TaskMentorCasePanel({
  detail,
  onCaseOpen,
}: {
  detail: StudentTaskDetailExtra | null
  onCaseOpen: (contentId: string) => void
}) {
  const cases = detail?.mentorCases
  if (!cases) {
    return (
      <div className={styles.panel}>
        <NotPrepared what="Mentor Case" />
      </div>
    )
  }
  // 선생님 추천 Case가 먼저, 최대 3개
  const visible = [...cases].sort((a, b) => Number(b.teacherRecommended) - Number(a.teacherRecommended)).slice(0, MAX_TASK_MENTOR_CASES)
  return (
    <div className={styles.panel}>
      <p className={styles.sectionDescription}>비슷한 수행평가를 먼저 해본 선배들의 과정이에요. 선생님 추천 Case가 먼저 보여요.</p>
      {visible.length === 0 ? (
        <EmptyNotice>아직 이 수행평가와 연결된 Mentor Case가 없어요.</EmptyNotice>
      ) : (
        <ul className={styles.caseList}>
          {visible.map((item) => {
            const titleId = `task-case-${item.contentId}-title`
            return (
              <li key={item.contentId}>
                <article className={styles.caseCard} aria-labelledby={titleId}>
                  <div className={styles.caseHeader}>
                    <div className={styles.caseText}>
                      <p className={styles.caseBadges}>
                        <span className={styles.caseType}>{item.activityType}</span>
                        {item.teacherRecommended && <span className={styles.teacherBadge}>선생님 추천</span>}
                      </p>
                      <h3 id={titleId} className={styles.caseTitle}>
                        {item.title}
                      </h3>
                      <p className={styles.caseMeta}>
                        {item.mentorName} · {item.mentorAffiliation} · {item.gradeLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.caseOpen}
                      aria-label={`${item.title} 과정 자세히 보기`}
                      onClick={() => onCaseOpen(item.contentId)}
                    >
                      과정 자세히 보기
                    </button>
                  </div>
                  <p className={styles.caseRelation}>{item.relationNote}</p>
                  <ol className={styles.caseStages} aria-label="Case 단계">
                    {item.stageTitles.map((title, index) => (
                      <li key={title} className={styles.caseStage}>
                        {index + 1}. {title}
                      </li>
                    ))}
                  </ol>
                  {item.materials.length > 0 && (
                    <ul className={styles.caseMaterials} aria-label="Case 과정 자료">
                      {item.materials.map((material) => (
                        <li key={material.materialId} className={styles.caseMaterial}>
                          <span className={styles.caseMaterialRole}>{material.roleLabel}</span>
                          <span className={styles.caseMaterialName}>{material.name}</span>
                          <span className={styles.caseMaterialDescription}>{material.description}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---------- 7. 수정 기록 (TasksDetail-07) ----------

const blockLabel = { changed: '수정', removed: '삭제', added: '추가' } as const

function RevisionBlockRow({ block, index }: { block: TaskRevisionBlock; index: number }) {
  if (block.kind === 'same') {
    return (
      <div className={styles.diffRow} data-kind="same">
        <p className={styles.diffCell} data-side="before">
          {block.text}
        </p>
        {/* 바뀌지 않은 문장은 오른쪽에 같은 내용을 보여주되 Screen Reader에서는 한 번만 읽는다. */}
        <p className={styles.diffCell} data-side="after" aria-hidden="true">
          {block.text}
        </p>
      </div>
    )
  }
  const label = `${blockLabel[block.kind]} ${index}`
  return (
    <div className={styles.diffRow} data-kind={block.kind}>
      <div className={styles.diffCell} data-side="before">
        <span className={styles.diffLabel}>{label}</span>
        {block.kind === 'added' ? (
          <p className={styles.diffPlaceholder}>이전 버전에는 없던 문장이에요.</p>
        ) : (
          <del className={styles.diffText}>
            <span className="lh-visually-hidden">삭제 또는 바뀌기 전 문장: </span>
            {block.before}
          </del>
        )}
      </div>
      <div className={styles.diffCell} data-side="after">
        <span className={styles.diffLabel}>{label}</span>
        {block.kind === 'removed' ? (
          <p className={styles.diffPlaceholder}>이 버전에서 뺐어요.</p>
        ) : (
          <ins className={styles.diffText}>
            <span className="lh-visually-hidden">추가 또는 바뀐 뒤 문장: </span>
            {block.after}
          </ins>
        )}
      </div>
    </div>
  )
}

export function TaskRevisionPanel({
  data,
  fromParam,
  toParam,
  onVersionPairChange,
  onFeedbackOpen,
  onVersionPreview,
}: {
  data: StudentTaskDetail
  fromParam: string | null
  toParam: string | null
  onVersionPairChange: (fromVersionId: string, toVersionId: string) => void
  /** 반영한 피드백으로 이동 (그 피드백의 Version) */
  onFeedbackOpen: (versionId: string) => void
  onVersionPreview: (version: TaskVersion, trigger: HTMLElement) => void
}) {
  const versions = data.versions.complete ? data.versions.items : null
  if (!versions) {
    return (
      <div className={styles.panel}>
        <NotPrepared what="수정 기록" />
      </div>
    )
  }
  if (versions.length === 0) {
    return (
      <div className={styles.panel}>
        <EmptyNotice>아직 제출한 버전이 없어요. 초안 V1을 제출하면 수정 기록이 여기에 쌓여요.</EmptyNotice>
      </div>
    )
  }

  const pair = resolveVersionPair(versions, fromParam, toParam)
  const from = versions.find((version) => version.versionId === pair?.fromVersionId)
  const to = versions.find((version) => version.versionId === pair?.toVersionId)
  const diff = pair ? findRevisionDiff(data.detail?.revisionDiffs ?? [], pair.fromVersionId, pair.toVersionId) : undefined
  const counts = diff ? revisionDiffCounts(diff.blocks) : undefined
  // 이 수정이 반영한 선생님 피드백: Diff Fixture에 적힌 관계, 없으면 바로 앞 Version 피드백 중 학생이 "반영함"으로 표시한 것
  const appliedFeedback = (() => {
    if (data.feedback.status !== 'ready') return undefined
    const teacher = data.feedback.data.teacher
    if (diff?.appliedFeedbackId) return teacher.find((item) => item.feedbackId === diff.appliedFeedbackId)
    if (!from || !to || to.versionNumber !== from.versionNumber + 1) return undefined
    return teacher.find((item) => item.versionId === from.versionId && item.status === 'delivered' && item.required && item.reflected)
  })()
  const fromIndex = versions.findIndex((version) => version.versionId === pair?.fromVersionId)

  // 블록 번호는 종류별로 센다. (수정 1, 수정 2 …)
  const numbered: { block: TaskRevisionBlock; index: number }[] = []
  const seen = { same: 0, changed: 0, removed: 0, added: 0 }
  for (const block of diff?.blocks ?? []) {
    seen[block.kind] += 1
    numbered.push({ block, index: seen[block.kind] })
  }

  return (
    <div className={styles.panel}>
      <ol className={styles.versionList} aria-label="제출 버전">
        {versions.map((version) => {
          const inPair = version.versionId === pair?.fromVersionId || version.versionId === pair?.toVersionId
          return (
            <li key={version.versionId} className={styles.versionRow} data-selected={inPair || undefined}>
              <span className={styles.versionLabel}>{version.label}</span>
              <span className={styles.versionDate}>{formatDateTime(version.submittedAt)}</span>
              <span className={styles.versionNote}>{version.note ?? version.fileName}</span>
              <span className={styles.versionSize}>{version.sizeSummary ?? versionAiStatusText[version.aiAnalysisStatus]}</span>
              <button
                type="button"
                className={styles.versionPreview}
                aria-label={`${version.label} ${version.fileName} 미리보기`}
                aria-haspopup="dialog"
                onClick={(event) => onVersionPreview(version, event.currentTarget)}
              >
                미리보기
              </button>
              {inPair && <span className="lh-visually-hidden"> (비교 중)</span>}
            </li>
          )
        })}
      </ol>

      {versions.length < 2 || !pair || !from || !to ? (
        <EmptyNotice>비교할 수정본이 아직 없어요. 다음 버전을 제출하면 바뀐 점을 볼 수 있어요.</EmptyNotice>
      ) : (
        <section className={styles.section} aria-labelledby="task-diff-heading">
          <div className={styles.pairControls}>
            <label className={styles.pairLabel}>
              이전 버전
              <select
                className={styles.pairSelect}
                value={pair.fromVersionId}
                onChange={(event) => {
                  const nextFrom = event.target.value
                  const nextFromIndex = versions.findIndex((version) => version.versionId === nextFrom)
                  const toIndex = versions.findIndex((version) => version.versionId === pair.toVersionId)
                  onVersionPairChange(nextFrom, toIndex > nextFromIndex ? pair.toVersionId : versions[nextFromIndex + 1].versionId)
                }}
              >
                {versions.slice(0, -1).map((version) => (
                  <option key={version.versionId} value={version.versionId}>
                    {version.label}
                  </option>
                ))}
              </select>
            </label>
            <span aria-hidden="true">→</span>
            <label className={styles.pairLabel}>
              비교할 버전
              <select
                className={styles.pairSelect}
                value={pair.toVersionId}
                onChange={(event) => onVersionPairChange(pair.fromVersionId, event.target.value)}
              >
                {versions.slice(fromIndex + 1).map((version) => (
                  <option key={version.versionId} value={version.versionId}>
                    {version.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.sectionHeader}>
            <div>
              <h3 id="task-diff-heading" className={styles.sectionTitle}>
                {from.label} → {to.label}에서 바뀐 점
              </h3>
              {from.sizeSummary && to.sizeSummary && (
                <p className={styles.sectionDescription}>
                  {from.sizeSummary} → {to.sizeSummary}
                </p>
              )}
            </div>
            {counts && (
              <p className={styles.diffCounts}>
                <span data-kind="removed">삭제 {counts.removed}</span>
                <span data-kind="changed">수정 {counts.changed}</span>
                <span data-kind="added">추가 {counts.added}</span>
              </p>
            )}
          </div>

          {appliedFeedback && (
            <p className={styles.appliedFeedback}>
              반영한 피드백: 선생님 피드백 · {appliedFeedback.versionLabel}
              <button type="button" className={styles.linkButton} onClick={() => onFeedbackOpen(appliedFeedback.versionId)}>
                피드백 보기
              </button>
            </p>
          )}

          {diff ? (
            <div className={styles.diff}>
              <div className={`${styles.diffRow} ${styles.diffHeadingRow}`} aria-hidden="true">
                <p className={styles.diffHeading}>Before · {from.label}</p>
                <p className={styles.diffHeading}>After · {to.label}</p>
              </div>
              {numbered.map(({ block, index }, position) => (
                <RevisionBlockRow key={position} block={block} index={index} />
              ))}
            </div>
          ) : (
            <NotPrepared what={`${from.label} → ${to.label} 비교`} />
          )}
        </section>
      )}
    </div>
  )
}
