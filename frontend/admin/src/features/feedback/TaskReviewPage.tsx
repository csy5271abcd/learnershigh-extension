import { useEffect, useRef, useState } from 'react'
import { Badge } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import { nextActionOptions, type NextActionOption } from '../../fixtures/adminFeedback.fixture.ts'
import type { AdminStudent, AdminTask, AiItemDecision, TaskReview } from '../../fixtures/types.ts'
import { deliverTaskReview, errorMessageOf, type AiItemReviewInput } from '../../store/adminCommands.ts'
import type { AdminState } from '../../store/adminStore.ts'
import { hoursBetween, daysUntil, formatDateTime, formatDday, formatMonthDay, formatWaiting, hoursSince } from '../../read-model/time.ts'
import { studentTaskSummary } from '../../read-model/studentProjection.ts'
import { deriveFeedbackQueue, queueStatusLabel } from '../../read-model/feedbackQueue.ts'
import { buildTaskDetail } from '../../read-model/taskDetail.ts'
import { TaskInspector } from '../../components/TaskInspector.tsx'
import { ToneTag, type VisualTone } from '../../components/AdminVisual.tsx'
import { ReviewTopBar, type ReviewNavigation } from './ReviewTopBar.tsx'
import styles from './ReviewPage.module.css'

/*
 * Feedback Review — 수행평가 Version 검토 (FeedbackDetail-01 / 02, Feature Spec Desktop 3-column)
 *   LEFT 제출물 · Version · 평가 기준 · 과정 자료 / CENTER AI 사전 점검 / RIGHT Staff Review
 * - AI 항목은 Admin이 하나씩 동의 / 제외 / 수정 후 전달을 고른다. AI 결과를 자동 승인하지 않는다.
 * - 전달(POST …/review action DELIVER)만 실제 동작이다. 임시 저장 · 최종 승인은 Contract의 action 값이 정해지지 않아 이유와 함께 막아 둔다.
 * - 학생 제출 원문은 수정하지 않는다. 원본 파일 미리보기는 File Storage 연결 전이라 파일 이름만 보여준다.
 */

interface DecisionState {
  decision: AiItemDecision
  editedText: string
}

interface TaskReviewPageProps {
  state: AdminState
  review: TaskReview
  task: AdminTask
  student: AdminStudent
  navigation: ReviewNavigation
  onBack: () => void
  onGo: (feedbackId: string) => void
  onOpenStudent: (studentId: string) => void
  onRecommendCase: (studentId: string, taskId: string) => void
}

const decisionLabel: Record<AiItemDecision, string> = { ACCEPT: '동의', EXCLUDE: '제외', EDIT_AND_DELIVER: '수정' }
type DecisionKey = AiItemDecision | 'pending'
/** 판단 표시: 글자 + 옅은 Tone (가운데 AI 항목 표시와 오른쪽 검토 진행 요약이 같은 글자를 쓴다) */
const decisionVisual: Record<DecisionKey, { label: string; tone: VisualTone }> = {
  ACCEPT: { label: '동의', tone: 'neutral' },
  EDIT_AND_DELIVER: { label: '수정', tone: 'feedback' },
  EXCLUDE: { label: '제외', tone: 'neutral' },
  pending: { label: '미확인', tone: 'revision' },
}
const aiItemDomId = (itemId: string) => `ai-item-${itemId}`
const COMMENT_MAX = 500

export function TaskReviewPage({ state, review, task, student, navigation, onBack, onGo, onOpenStudent, onRecommendCase }: TaskReviewPageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [decisions, setDecisions] = useState<Record<string, DecisionState>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [nextAction, setNextAction] = useState<NextActionOption | null>(null)
  const [parentCandidate, setParentCandidate] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justDelivered, setJustDelivered] = useState(false)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const version = task.versions?.find((item) => item.versionId === review.versionId) ?? null
  const versionLabel = `V${version?.number ?? 1}`
  const days = daysUntil(task.deadlineDate)
  const delivery = review.delivery
  const detail = buildTaskDetail(state, task.taskId)
  const queueItem = deriveFeedbackQueue(state).find((item) => item.feedbackId === review.feedbackId) ?? null
  const caseRefs = task.relatedMentorCaseIds.map((id) => state.mentorCases.find((item) => item.contentId === id)).filter((item) => item !== undefined)
  const recommended = new Set(state.recommendations.filter((item) => item.taskId === task.taskId).map((item) => item.caseId))

  const counts = { ACCEPT: 0, EDIT_AND_DELIVER: 0, EXCLUDE: 0, pending: 0 }
  for (const item of review.aiItems) {
    const decision = decisions[item.itemId]
    if (!decision) counts.pending += 1
    else counts[decision.decision] += 1
  }
  const deliveredPreview = review.aiItems.flatMap((item) => {
    const decision = decisions[item.itemId]
    if (!decision || decision.decision === 'EXCLUDE') return []
    return [{ itemId: item.itemId, label: item.criterionName, text: decision.decision === 'EDIT_AND_DELIVER' ? decision.editedText : item.summary }]
  })

  const problems: string[] = []
  if (counts.pending > 0) problems.push(`AI 분석 ${counts.pending}개를 먼저 확인해주세요.`)
  if (review.aiItems.some((item) => decisions[item.itemId]?.decision === 'EDIT_AND_DELIVER' && !decisions[item.itemId].editedText.trim())) problems.push('수정 후 전달할 문장을 입력해주세요.')
  if (!comment.trim() && deliveredPreview.length === 0) problems.push('학생에게 전달할 Comment 또는 AI 항목이 필요해요.')
  if (!nextAction) problems.push('Next Action을 골라주세요.')

  const decide = (itemId: string, decision: AiItemDecision, original: string) => {
    setDecisions((current) => ({ ...current, [itemId]: { decision, editedText: current[itemId]?.editedText || original } }))
    setEditing(decision === 'EDIT_AND_DELIVER' ? itemId : null)
    setError(null)
  }
  const undo = (itemId: string) => {
    setDecisions((current) => {
      const next = { ...current }
      delete next[itemId]
      return next
    })
    setEditing(null)
  }

  const submit = async () => {
    if (pending || problems.length > 0 || !nextAction) return
    setPending(true)
    setError(null)
    const aiItems: AiItemReviewInput[] = review.aiItems.map((item) => ({
      itemId: item.itemId,
      decision: decisions[item.itemId].decision,
      editedText: decisions[item.itemId].decision === 'EDIT_AND_DELIVER' ? decisions[item.itemId].editedText : null,
    }))
    try {
      await deliverTaskReview(review.feedbackId, { aiItems, studentComment: comment, nextAction, parentReportCandidate: parentCandidate })
      setJustDelivered(true)
    } catch (caught) {
      setError(errorMessageOf(caught))
    } finally {
      setPending(false)
    }
  }

  const projection = studentTaskSummary(state, task.taskId)

  return (
    <div className={styles.page}>
      <ReviewTopBar navigation={navigation} status={delivery ? '전달 완료' : '검토 대기'} onBack={onBack} onGo={onGo} />

      <header className={styles.reviewHeader}>
        <p className={styles.eyebrow}>
          <button type="button" className={ui.linkButton} onClick={() => onOpenStudent(student.studentId)}>
            {student.displayName}
            <span className="lh-visually-hidden"> Student 360 보기</span>
          </button>{' '}
          · {student.grade} · {task.subject}
        </p>
        <h1 id="review-title" ref={headingRef} tabIndex={-1} className={styles.title}>
          {task.title}
        </h1>
        <dl className={styles.headerFacts}>
          <div>
            <dt>Deadline</dt>
            <dd data-tone={days <= 3 ? 'negative' : undefined}>
              {formatMonthDay(task.deadlineDate)} · {formatDday(days)}
            </dd>
          </div>
          <div>
            <dt>현재 단계</dt>
            <dd>
              {task.currentStage}/8 · {task.stageStatus}
            </dd>
          </div>
          <div>
            <dt>검토 유형</dt>
            <dd>{version && version.number > 1 ? `수정본 재검토 (${versionLabel})` : '초안 V1 첫 검토'}</dd>
          </div>
          <div>
            <dt>현재 검토 Version</dt>
            <dd>
              {versionLabel} · {version ? formatDateTime(version.submittedAt) : '기록 없음'}
            </dd>
          </div>
          <div>
            <dt>대기 시간</dt>
            <dd data-tone={!delivery && hoursSince(review.queuedAt) > 48 ? 'negative' : undefined}>
              {delivery ? `${formatWaiting(Math.floor(hoursBetween(review.queuedAt, delivery.deliveredAt)))} 후 전달` : formatWaiting(hoursSince(review.queuedAt))}
            </dd>
          </div>
          <div>
            <dt>운영 상태</dt>
            <dd>{queueItem ? queueStatusLabel[queueItem.status] : '전달 완료 · Queue 밖'}</dd>
          </div>
        </dl>
      </header>

      <div className={styles.columns}>
        {/* LEFT: 제출물 · 과정 자료 · 수정 기록 · 피드백 이력 · 평가 기준 (읽기 전용) */}
        <section className={styles.viewer} aria-label="학생 제출 자료">
          {detail && <TaskInspector detail={detail} focusVersionId={review.versionId} reviewMode />}
        </section>

        {/* CENTER: AI Analysis */}
        <section className={styles.ai} aria-labelledby="ai-title" data-surface="ai">
          <div className={styles.aiHead}>
            <h2 id="ai-title" className={ui.sectionTitle}>
              AI 사전 점검
            </h2>
            <Badge tone={delivery ? undefined : 'warning'}>{delivery ? '관리자 확인 완료' : '관리자 확인 전'}</Badge>
            {!delivery && review.aiItems.length > 0 && (
              <button
                type="button"
                className={`${ui.ghostButton} ${ui.smallButton} ${styles.pushRight}`}
                onClick={() => {
                  setDecisions(Object.fromEntries(review.aiItems.map((item) => [item.itemId, { decision: 'ACCEPT' as const, editedText: '' }])))
                  setEditing(null)
                }}
              >
                AI 전체 동의
              </button>
            )}
          </div>
          <p className={ui.muted}>AI 결과는 확인할 곳을 짚는 참고용이에요. 점수 · 등급을 매기지 않고, 학생에게는 Staff가 고른 항목만 선생님 피드백으로 전달돼요.</p>

          {delivery ? (
            <ul className={ui.list}>
              {review.aiItems.map((item) => {
                const sent = delivery.deliveredAiItems.find((entry) => entry.itemId === item.itemId)
                return (
                  <li key={item.itemId} className={styles.aiItem} data-decision={sent ? sent.decision : 'EXCLUDE'}>
                    <div className={styles.aiItemHead}>
                      {item.criterionName && <span className={ui.cellMain}>{item.criterionName}</span>}
                      <Badge tone={sent ? 'accent' : undefined}>{sent ? decisionLabel[sent.decision] : '제외'}</Badge>
                    </div>
                    <p className={sent ? undefined : styles.struck}>{sent?.text ?? item.summary}</p>
                  </li>
                )
              })}
              {review.aiItems.length === 0 && <li className={ui.muted}>이 Version의 AI 점검 기록이 없어요.</li>}
            </ul>
          ) : review.aiItems.length === 0 ? (
            <p className={ui.note}>이 Version에는 AI 점검 항목이 없어요. Staff Comment로 전달해주세요.</p>
          ) : (
            <ul className={ui.list}>
              {review.aiItems.map((item) => {
                const decision = decisions[item.itemId]
                return (
                  <li key={item.itemId} id={aiItemDomId(item.itemId)} tabIndex={-1} className={styles.aiItem} data-decision={decision?.decision ?? 'pending'}>
                    <div className={styles.aiItemHead}>
                      <span className={styles.aiCriterion}>{item.criterionName ?? 'AI 점검 항목'}</span>
                      <ToneTag tone={decisionVisual[decision?.decision ?? 'pending'].tone}>
                        {decisionVisual[decision?.decision ?? 'pending'].label}
                      </ToneTag>
                    </div>
                    <p className={decision?.decision === 'EXCLUDE' ? styles.struck : undefined}>{item.summary}</p>
                    {decision?.decision === 'EDIT_AND_DELIVER' && (
                      <label className={ui.field}>
                        <span className={ui.fieldLabel}>학생에게 전달할 문장</span>
                        <textarea
                          className={ui.textarea}
                          rows={2}
                          value={decision.editedText}
                          autoFocus={editing === item.itemId}
                          aria-invalid={!decision.editedText.trim()}
                          onChange={(event) => setDecisions((current) => ({ ...current, [item.itemId]: { decision: 'EDIT_AND_DELIVER', editedText: event.target.value } }))}
                        />
                      </label>
                    )}
                    <div className={styles.decisionRow} role="group" aria-label={`${item.criterionName ?? 'AI 항목'} 판단`}>
                      {decision ? (
                        <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => undo(item.itemId)}>
                          되돌리기
                        </button>
                      ) : (
                        <>
                          <button type="button" className={`${ui.ghostButton} ${ui.smallButton}`} onClick={() => decide(item.itemId, 'ACCEPT', item.summary)}>
                            동의
                          </button>
                          <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => decide(item.itemId, 'EXCLUDE', item.summary)}>
                            제외
                          </button>
                          <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => decide(item.itemId, 'EDIT_AND_DELIVER', item.summary)}>
                            수정 후 전달
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* RIGHT: Staff Review — 넓은 화면에서는 따로 Scroll된다 (학생 자료 · AI 분석과 나란히 비교) */}
        <section className={styles.staff} aria-labelledby="staff-title" tabIndex={0}>
          <h2 id="staff-title" className={styles.staffTitle}>
            Staff Review<span className="lh-visually-hidden"> (따로 스크롤되는 영역)</span>
          </h2>
          {delivery ? (
            <div className={ui.list}>
              {justDelivered && (
                <p className={ui.success} role="status">
                  학생에게 전달했어요. Queue에서 빠지고 KPI가 다시 계산됐어요.
                </p>
              )}
              <h3 className={ui.subTitle}>전달한 Feedback</h3>
              <dl className={ui.facts}>
                <dt>전달 시각</dt>
                <dd>{formatDateTime(delivery.deliveredAt)}</dd>
                <dt>작성</dt>
                <dd>{delivery.reviewedBy}</dd>
                <dt>Next Action</dt>
                <dd>{delivery.nextAction}</dd>
                <dt>Parent 후보</dt>
                <dd>{delivery.parentReportCandidate ? '공개 후보로 표시' : '후보 아님'}</dd>
              </dl>
              {delivery.studentComment && <p className={ui.note}>{delivery.studentComment}</p>}
              {projection && (
                <div className={ui.note}>
                  <p className={ui.fieldLabel}>학생 화면 반영</p>
                  <p>
                    {projection.currentStage}단계 · {projection.stageStatus} · 다음 할 일 "{projection.nextAction}"
                  </p>
                </div>
              )}
              {navigation.nextId && (
                <button type="button" className={ui.primaryButton} onClick={() => onGo(navigation.nextId!)}>
                  다음 검토로
                </button>
              )}
            </div>
          ) : (
            <form
              className={styles.staffForm}
              onSubmit={(event) => {
                event.preventDefault()
                void submit()
              }}
              aria-describedby="review-problems"
            >
              {/* 1. 검토 진행 상태: AI 항목 판단 요약 (누르면 가운데 해당 항목으로 이동) */}
              <div className={styles.staffBlock}>
                <div className={styles.progressHead}>
                  <h3 className={ui.subTitle}>검토 진행</h3>
                  <span className={ui.muted}>
                    AI 항목 {review.aiItems.length - counts.pending}/{review.aiItems.length} 확인
                  </span>
                </div>
                <span className={styles.reviewProgress} aria-hidden="true">
                  <span style={{ width: `${review.aiItems.length ? ((review.aiItems.length - counts.pending) / review.aiItems.length) * 100 : 100}%` }} />
                </span>
                <ul className={styles.criteriaSummary} aria-label="Criteria status: AI 항목 판단 요약">
                  {(['ACCEPT', 'EDIT_AND_DELIVER', 'EXCLUDE', 'pending'] as const).map((key) => {
                    const first = review.aiItems.find((item) => (decisions[item.itemId]?.decision ?? 'pending') === key)
                    const visual = decisionVisual[key]
                    return (
                      <li key={key} data-tone={visual.tone} data-empty={counts[key] === 0 || undefined}>
                        <button
                          type="button"
                          disabled={!first}
                          onClick={() => {
                            const target = first && document.getElementById(aiItemDomId(first.itemId))
                            target?.scrollIntoView({ block: 'center' })
                            target?.focus({ preventScroll: true })
                          }}
                        >
                          <span>{visual.label}</span>
                          <strong>{counts[key]}</strong>
                          {first && <span className="lh-visually-hidden"> — 첫 항목으로 이동</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* 2. 학생에게 전달할 Comment + 전달될 내용 */}
              <div className={styles.staffBlock}>
              <label className={ui.field}>
                <span className={ui.subTitle}>학생에게 전달할 Comment</span>
                <textarea className={ui.textarea} rows={4} maxLength={COMMENT_MAX} value={comment} placeholder="학생에게 남길 코멘트" onChange={(event) => setComment(event.target.value)} />
                <span className={ui.counter}>
                  {comment.length}/{COMMENT_MAX}
                </span>
              </label>

                <div className={styles.deliverPreview}>
                  <p className={ui.fieldLabel}>학생에게 전달될 Feedback</p>
                  {deliveredPreview.length === 0 && !comment.trim() ? (
                    <p className={ui.muted}>아직 전달할 내용이 없어요.</p>
                  ) : (
                    <ul className={styles.previewList}>
                      {deliveredPreview.map((item) => (
                        <li key={item.itemId}>
                          <span className={styles.previewSource} data-source="ai">
                            AI 항목
                          </span>{' '}
                          {item.label ? `${item.label} · ` : ''}
                          {item.text}
                        </li>
                      ))}
                      {comment.trim() && (
                        <li>
                          <span className={styles.previewSource} data-source="staff">
                            Comment
                          </span>{' '}
                          {comment.trim()}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              {/* 3. Next Action */}
              <div className={styles.staffBlock}>
                <fieldset className={styles.fieldset}>
                  <legend className={ui.subTitle}>Next Action</legend>
                  {nextActionOptions.map((option) => (
                    <label key={option} className={`${styles.option} ${styles.optionOnWhite}`} data-checked={nextAction === option || undefined}>
                      <input type="radio" name="next-action" value={option} checked={nextAction === option} onChange={() => setNextAction(option)} />
                      {option}
                    </label>
                  ))}
                  <span className={ui.cellSub}>"다음 단계 진행"은 추가 수정 없이 최종 제출 준비로, 나머지는 수정본이 필요한 것으로 전달돼요.</span>
                </fieldset>
              </div>

              {/* 4. Parent Report 후보 */}
              <div className={styles.staffBlock}>
                <label className={ui.check}>
                  <input type="checkbox" checked={parentCandidate} onChange={(event) => setParentCandidate(event.target.checked)} />
                  <span>
                    Parent Report 공개 후보로 표시
                    <span className={ui.cellSub}>후보 표시만 해요. 학부모에게 보일 문장은 Parent Progress에서 따로 작성하고, AI 분석 · 내부 Comment 원문은 학부모에게 보이지 않아요.</span>
                  </span>
                </label>
              </div>

              {/* 5. 전달 (패널 아래쪽에 붙어 있다) */}
              <div className={styles.deliverBar}>
                <div id="review-problems" aria-live="polite">
                  {problems.map((problem) => (
                    <p key={problem} className={ui.errorText}>
                      {problem}
                    </p>
                  ))}
                </div>
                {error && (
                  <p className={ui.errorText} role="alert">
                    {error}
                  </p>
                )}
                <button type="submit" className={ui.primaryButton} disabled={pending || problems.length > 0} aria-busy={pending}>
                  {pending ? '전달하는 중…' : '학생에게 전달'}
                </button>
              </div>

              <div className={`${ui.list} ${styles.staffSecondary}`}>
                <h3 className={ui.subTitle}>Mentor Case</h3>
                {caseRefs.length === 0 ? (
                  <p className={ui.muted}>이 Task에 연결된 Mentor Case가 없어요.</p>
                ) : (
                  <ul className={ui.list}>
                    {caseRefs.map((item) => (
                      <li key={item.contentId} className={ui.listItem}>
                        <span className={ui.cellMain}>{item.title}</span>
                        <span className={ui.cellSub}>
                          {item.mentorName} · {item.mentorAffiliation} · {recommended.has(item.contentId) ? '선생님 추천' : '학생 참고 Case'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={() => onRecommendCase(student.studentId, task.taskId)}>
                  Mentor Case 추천하기
                </button>
                <div className={styles.secondaryActions}>
                  <button type="button" className={ui.secondaryButton} disabled aria-describedby="draft-reason">
                    임시 저장
                  </button>
                  <button type="button" className={ui.secondaryButton} disabled aria-describedby="draft-reason">
                    최종 승인
                  </button>
                </div>
                <p id="draft-reason" className={ui.cellSub}>
                  임시 저장 · 최종 승인은 검토 Action 값(Contract §29-2)이 아직 정해지지 않아 사용할 수 없어요. 지금은 "학생에게 전달"만 할 수 있어요.
                </p>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
