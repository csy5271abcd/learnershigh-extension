import type { ReactNode } from 'react'
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
  TaskEvaluationCriterion,
  TaskRevisionBlock,
  TaskTeacherFeedback,
} from '../model/types.ts'
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

export function TaskOverviewPanel({ detail }: { detail: StudentTaskDetailExtra | null }) {
  return (
    <div className={styles.panel}>
      {detail?.topic && (
        <section className={styles.section} aria-labelledby="task-topic-heading">
          <h3 id="task-topic-heading" className={styles.sectionTitle}>
            주제
          </h3>
          <p className={styles.topic}>
            {detail.topic.text}
            <span className={styles.topicState}>{detail.topic.approved ? '주제 확정' : '주제 검토 중'}</span>
          </p>
        </section>
      )}

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

export function TaskProcessPanel({ detail }: { detail: StudentTaskDetailExtra | null }) {
  const materials = detail?.processMaterials
  if (!materials) {
    return (
      <div className={styles.panel}>
        <NotPrepared what="과정 자료" />
      </div>
    )
  }
  return (
    <div className={styles.panel}>
      <ul className={styles.categoryGrid} aria-label="단계별 과정 자료">
        {processCategories.map((category) => {
          const items = materials.filter((item) => item.category === category.id)
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
        <UnavailableAddButton id="task-process-add-reason" label="자료 추가" />
      </div>

      {materials.length === 0 ? (
        <EmptyNotice>아직 올린 과정 자료가 없어요.</EmptyNotice>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">파일</th>
                <th scope="col">형식</th>
                <th scope="col">단계</th>
                <th scope="col">날짜</th>
                <th scope="col">상태</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((item) => (
                <tr key={item.evidenceId}>
                  <th scope="row" className={styles.fileCell}>
                    {item.fileName}
                  </th>
                  <td>{item.format}</td>
                  <td>
                    <span className={styles.stageTag}>{processCategories.find((category) => category.id === item.category)?.tag}</span>
                  </td>
                  <td>{formatDeadline(item.createdDate)}</td>
                  <td>
                    <span className={styles.doneTag}>완료</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------- 5. 피드백 (TasksDetail-05): 선생님 피드백 Primary / AI 사전 점검 Secondary ----------

function TeacherFeedbackCard({ feedback, delayed }: { feedback: TaskTeacherFeedback; delayed: boolean }) {
  return (
    <article className={styles.teacherFeedback} aria-labelledby={`${feedback.feedbackId}-title`}>
      <h4 id={`${feedback.feedbackId}-title`} className={styles.feedbackTitle}>
        선생님 피드백 · {feedback.versionLabel}
      </h4>
      {feedback.status === 'reviewing' ? (
        <>
          <p className={styles.feedbackMeta}>공용 검토 대기열에서 확인하고 있어요.</p>
          <div className={styles.pendingBox}>
            <p>{feedback.versionLabel} 검토가 진행 중이에요.</p>
            <p className={styles.pendingNote}>
              {delayed ? '검토가 조금 지연되고 있어요.' : '선생님 검토가 끝나면 피드백을 확인할 수 있어요.'}
            </p>
          </div>
        </>
      ) : (
        <>
          {feedback.deliveredAt && <p className={styles.feedbackMeta}>{formatDateTime(feedback.deliveredAt)} 전달</p>}
          <div className={styles.feedbackBody}>
            <p>{feedback.comment}</p>
            {feedback.nextAction && (
              <p className={styles.feedbackNext}>
                <span className={styles.feedbackNextLabel}>다음 할 일</span>
                {feedback.nextAction}
              </p>
            )}
          </div>
        </>
      )}
    </article>
  )
}

function AiFeedbackCard({ feedback, teacherReviewed }: { feedback: TaskAiFeedback; teacherReviewed: boolean }) {
  const reflected = feedback.items.filter((item) => item.reflected).length
  return (
    <article className={styles.aiFeedback} aria-labelledby={`${feedback.feedbackId}-title`}>
      <div className={styles.sectionHeader}>
        <div>
          <h4 id={`${feedback.feedbackId}-title`} className={styles.aiTitle}>
            AI 사전 점검 · {feedback.versionLabel}
            <span className={styles.aiBadge}>{teacherReviewed ? 'AI 1차 분석' : 'AI 1차 분석 · 선생님 확인 전'}</span>
          </h4>
          <p className={styles.feedbackMeta}>{formatDateTime(feedback.analyzedAt)} 자동 분석</p>
        </div>
        <span className={styles.reflectCount}>
          {reflected}/{feedback.items.length} 반영
        </span>
      </div>
      {/* 반영 여부 저장은 Contract에 없어 읽기 전용으로 보여준다. */}
      <ul className={styles.aiItems}>
        {feedback.items.map((item) => (
          <li key={item.itemId} className={styles.aiItem}>
            <span>{item.summary}</span>
            <span className={styles.reflectState} data-reflected={item.reflected || undefined}>
              {item.reflected ? '✓ 반영함' : '아직 반영 전'}
            </span>
          </li>
        ))}
      </ul>
    </article>
  )
}

export function TaskFeedbackPanel({ data }: { data: StudentTaskDetail }) {
  const feedback = data.detail?.feedback
  if (!feedback) {
    return (
      <div className={styles.panel}>
        <NotPrepared what="피드백" />
      </div>
    )
  }
  if (feedback.teacher.length === 0 && feedback.ai.length === 0) {
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
      <p className={styles.infoBar}>선생님 피드백을 먼저 확인하세요. AI 사전 점검은 참고용이에요.</p>

      <section className={styles.section} aria-labelledby="task-teacher-feedback-heading">
        <h3 id="task-teacher-feedback-heading" className={styles.sectionTitle}>
          선생님 피드백
        </h3>
        {feedback.teacher.length === 0 ? (
          <EmptyNotice>아직 받은 선생님 피드백이 없어요.</EmptyNotice>
        ) : (
          feedback.teacher.map((item) => <TeacherFeedbackCard key={item.feedbackId} feedback={item} delayed={delayed} />)
        )}
      </section>

      <section className={`${styles.section} ${styles.secondarySection}`} aria-labelledby="task-ai-feedback-heading">
        <h3 id="task-ai-feedback-heading" className={styles.secondaryTitle}>
          AI 사전 점검
        </h3>
        <p className={styles.infoBar}>AI 사전 점검은 참고용이에요. 최종 수정 방향은 선생님 피드백을 확인해주세요.</p>
        {feedback.ai.length === 0 ? (
          <EmptyNotice>아직 AI 사전 점검 결과가 없어요.</EmptyNotice>
        ) : (
          feedback.ai.map((item) => (
            <AiFeedbackCard
              key={item.feedbackId}
              feedback={item}
              // 같은 Version의 선생님 피드백이 전달됐으면 선생님 확인 전 표시를 떼어낸다.
              teacherReviewed={feedback.teacher.some(
                (teacher) => teacher.versionLabel === item.versionLabel && teacher.status === 'delivered',
              )}
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
}: {
  data: StudentTaskDetail
  fromParam: string | null
  toParam: string | null
  onVersionPairChange: (fromVersionId: string, toVersionId: string) => void
  onFeedbackOpen: () => void
}) {
  const versions = data.detail?.versions
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
  const appliedFeedback = diff?.appliedFeedbackId
    ? data.detail?.feedback?.teacher.find((item) => item.feedbackId === diff.appliedFeedbackId)
    : undefined
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
              <span className={styles.versionNote}>{version.note}</span>
              <span className={styles.versionSize}>{version.sizeSummary}</span>
              {inPair && <span className="lh-visually-hidden"> (비교 중)</span>}
            </li>
          )
        })}
      </ol>

      {versions.length < 2 || !pair || !from || !to ? (
        <EmptyNotice>비교하려면 버전이 두 개 이상 필요해요. 다음 버전을 제출하면 바뀐 점을 볼 수 있어요.</EmptyNotice>
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
              <p className={styles.sectionDescription}>
                {from.sizeSummary} → {to.sizeSummary}
              </p>
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
              <button type="button" className={styles.linkButton} onClick={onFeedbackOpen}>
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
