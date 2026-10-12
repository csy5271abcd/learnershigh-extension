import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import { ActivityFormFields } from './components/ActivityForm.tsx'
import { DialogShell } from './components/EvidenceDialogs.tsx'
import dialogStyles from './components/EvidenceParts.module.css'
import { SchoolLayout } from './components/SchoolLayout.tsx'
import { TaskLeaveDialog } from './components/TaskLeaveDialog.tsx'
import { useActivityEvidence } from './components/useActivityEvidence.tsx'
import type { SchoolActivityDetailLoader, SchoolActivityService } from './fixtures/schoolActivity.fixture.ts'
import {
  activityFeedbackFields,
  activityPeriodText,
  activityReflectionFields,
  activityStatusLabel,
  activityTypeLabel,
  emptyActivityReflection,
  isActivityEditable,
  isReflectionEditable,
  reflectionAnsweredCount,
  type ActivityReflection,
  type ActivityFieldErrors,
  type ActivityStatus,
  type GrowthActivity,
  type GrowthActivityDetail,
} from './model/activity.ts'
import { draftFromActivity, focusFirstActivityError, readActivityDraft, type ActivityDraftValues } from './model/activityForm.ts'
import { restoreFocus } from './model/focus.ts'
import { fileExtensionLabel } from './model/taskCreate.ts'
import { formatDateTime } from './model/taskDetail.ts'
import { useSchoolActivityDetail } from './model/useSchoolActivities.ts'
import styles from './SchoolActivityDetailPage.module.css'

/** 지금 상태 안내 (ActivitiesDetail-01 제목 아래 한 줄) */
const statusMessage: Record<ActivityStatus, string> = {
  draft: '작성 중인 기록이에요. 과정과 자료를 채운 뒤 제출하면 Reflection으로 활동을 돌아볼 수 있어요.',
  submitted: '제출한 기록이에요. Reflection을 작성하면 활동을 돌아보고 Archive에 보관할 수 있어요. 선생님 피드백은 필요할 때만 요청해요.',
  'feedback-waiting': '선생님 피드백을 기다리고 있어요. 그동안 Reflection을 써둘 수 있어요.',
  'feedback-delivered': '선생님 피드백이 도착했어요. 확인하고 필요하면 Reflection을 직접 보완해주세요.',
  reflected: 'Reflection을 마쳤어요. Archive에 저장할 수 있어요.',
  archived: 'Archive에 보관한 기록이에요.',
}

/** 돌아가기 버튼: [보이는 이름, 읽기 문구 나머지] */
const backLabels = {
  activities: ['나의 활동 기록', '으로 돌아가기'],
  archive: ['Archive', '로 돌아가기'],
  interview: ['면접 질문', '으로 돌아가기'],
} as const

interface SchoolActivityDetailPageProps {
  activityId: string
  loadDetail: SchoolActivityDetailLoader
  service: SchoolActivityService
  onChanged: () => void
  onBack: () => void
  /** 들어온 곳 (돌아가기 버튼 문구 = 실제 목적지) */
  backTo: 'activities' | 'archive' | 'interview'
}

// Growth Activity Detail (ActivitiesDetail-01 / 02): 기본 정보 · 활동 과정 · 학생이 쓴 서술 · 과정 자료 · Reflection · 선생님 피드백.
// 작성 중(Draft)일 때만 고치고 자료를 바꿀 수 있다. Reflection 작성 / 피드백 요청 / Archive 저장은 다음 Branch.
export function SchoolActivityDetailPage({
  activityId,
  loadDetail,
  service,
  onChanged,
  onBack,
  backTo,
}: SchoolActivityDetailPageProps) {
  const { state, reload } = useSchoolActivityDetail(activityId, loadDetail)
  return (
    <SchoolLayout level="detail" busy={state.status === 'loading'}>
      <button type="button" className={styles.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> {backLabels[backTo][0]}
        <span className="lh-visually-hidden">{backLabels[backTo][1]}</span>
      </button>

      {state.status === 'loading' && (
        <>
          <p className="lh-visually-hidden" role="status">
            활동 기록을 불러오는 중이에요.
          </p>
          <div className={styles.skeleton} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </>
      )}
      {state.status === 'error' && (
        <div className={styles.notice} role="alert">
          <h1 className={styles.noticeTitle}>활동 기록을 불러오지 못했어요.</h1>
          <p>잠시 후 다시 시도해 주세요.</p>
          <button type="button" className={styles.noticeButton} onClick={reload}>
            다시 시도
          </button>
        </div>
      )}
      {state.status === 'notFound' && (
        <div className={styles.notice}>
          <h1 className={styles.noticeTitle}>활동 기록을 찾을 수 없어요.</h1>
          <p>주소가 잘못되었거나 내 활동 기록에 없는 활동이에요.</p>
          <button type="button" className={styles.noticeButton} onClick={onBack}>
            나의 활동 기록으로 이동
          </button>
        </div>
      )}
      {state.status === 'success' && <ActivityDetail key={state.data.activity.activityId} data={state.data} service={service} onChanged={onChanged} />}
    </SchoolLayout>
  )
}

function ActivityDetail({ data, service, onChanged }: { data: GrowthActivityDetail; service: SchoolActivityService; onChanged: () => void }) {
  const { activity, evidence } = data
  const editable = isActivityEditable(activity)
  const evidenceFlow = useActivityEvidence({ service, onChanged })
  const [editing, setEditing] = useState<{ values: ActivityDraftValues; errors: ActivityFieldErrors; saving: boolean; failed: boolean } | null>(null)
  const [submit, setSubmit] = useState<{ pending: boolean; failed: boolean } | null>(null)
  const [reflection, setReflection] = useState<{ values: ActivityReflection; error?: string; saving: boolean; failed: boolean } | null>(null)
  const [feedbackRequest, setFeedbackRequest] = useState<{ pending: boolean; failed: boolean }>({ pending: false, failed: false })
  const [archive, setArchive] = useState<{ pending: boolean; failed: boolean } | null>(null)
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const busyRef = useRef(false)
  const actionTriggerRef = useRef<HTMLElement | null>(null)

  // Reflection 작성 중 다른 화면으로 가면 나가기 확인 (Task Create와 같은 확인 Dialog)
  const original = activity.reflection ?? emptyActivityReflection
  const reflectionDirty = Boolean(reflection && activityReflectionFields.some(({ key }) => reflection.values[key] !== original[key]))
  const dirtyRef = useRef(reflectionDirty)
  const allowLeaveRef = useRef(false)
  useEffect(() => {
    dirtyRef.current = reflectionDirty
  }, [reflectionDirty])
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirtyRef.current && !allowLeaveRef.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (!reflectionDirty) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [reflectionDirty])

  const openReflection = (trigger: HTMLElement | null) => {
    actionTriggerRef.current = trigger
    setAnnouncement('')
    setReflection({ values: { ...original }, saving: false, failed: false })
    requestAnimationFrame(() => {
      const target = document.getElementById(`activity-reflection-${activityReflectionFields[0].key}`)
      target?.scrollIntoView({ block: 'center' })
      target?.focus({ preventScroll: true })
    })
  }

  const closeReflection = () => {
    setReflection(null)
    restoreFocus(actionTriggerRef.current, 'activity-reflection-heading')
  }

  const saveReflection = () => {
    if (!reflection || busyRef.current) return
    // 최소 한 항목은 학생이 직접 써야 한다. (7문항 모두를 필수로 강제하지 않는다)
    if (reflectionAnsweredCount({ reflection: reflection.values }) === 0) {
      setReflection({ ...reflection, error: '최소 한 항목은 직접 적어주세요.' })
      document.getElementById(`activity-reflection-${activityReflectionFields[0].key}`)?.focus()
      return
    }
    busyRef.current = true
    setReflection({ ...reflection, error: undefined, saving: true, failed: false })
    service.saveReflection(activity.activityId, reflection.values).then(
      () => {
        busyRef.current = false
        setReflection(null)
        setAnnouncement('Reflection을 저장했어요.')
        onChanged()
        restoreFocus(null, 'activity-reflection-heading')
      },
      () => {
        // 실패: 입력 그대로, 다시 저장할 수 있다.
        busyRef.current = false
        setReflection((current) => (current ? { ...current, saving: false, failed: true } : current))
      },
    )
  }

  const requestFeedback = () => {
    if (busyRef.current) return
    busyRef.current = true
    setFeedbackRequest({ pending: true, failed: false })
    service.requestFeedback(activity.activityId).then(
      () => {
        busyRef.current = false
        setFeedbackRequest({ pending: false, failed: false })
        setAnnouncement('선생님 피드백을 요청했어요.')
        onChanged()
        restoreFocus(null, 'activity-feedback-heading')
      },
      () => {
        busyRef.current = false
        setFeedbackRequest({ pending: false, failed: true })
      },
    )
  }

  const confirmArchive = () => {
    if (!archive || busyRef.current) return
    busyRef.current = true
    setArchive({ pending: true, failed: false })
    service.archive(activity.activityId).then(
      () => {
        busyRef.current = false
        setArchive(null)
        setAnnouncement('Archive에 저장했어요.')
        onChanged()
        restoreFocus(null, 'activity-title')
      },
      () => {
        busyRef.current = false
        setArchive({ pending: false, failed: true })
      },
    )
  }
  const editTriggerRef = useRef<HTMLButtonElement>(null)
  const submitTriggerRef = useRef<HTMLButtonElement>(null)

  const save = () => {
    if (!editing || busyRef.current) return
    const { errors, fields } = readActivityDraft(editing.values)
    if (!fields) {
      setEditing({ ...editing, errors })
      focusFirstActivityError('activity-edit', errors)
      return
    }
    busyRef.current = true
    setEditing({ ...editing, errors: {}, saving: true, failed: false })
    service.update(activity.activityId, fields).then(
      () => {
        busyRef.current = false
        setEditing(null)
        onChanged()
        restoreFocus(editTriggerRef.current, 'activity-title')
      },
      () => {
        // 실패: 입력은 그대로, 다시 저장할 수 있다.
        busyRef.current = false
        setEditing((current) => (current ? { ...current, saving: false, failed: true } : current))
      },
    )
  }

  const confirmSubmit = () => {
    if (!submit || busyRef.current) return
    busyRef.current = true
    setSubmit({ pending: true, failed: false })
    service.submit(activity.activityId).then(
      () => {
        busyRef.current = false
        setSubmit(null)
        onChanged()
        restoreFocus(null, 'activity-title')
      },
      () => {
        busyRef.current = false
        setSubmit({ pending: false, failed: true })
      },
    )
  }

  // 활동 과정 단계 (ActivitiesDetail-01): 채운 단계를 표시한다.
  const steps = [
    { label: '계획', done: Boolean(activity.title && activity.startDate && activity.role) },
    { label: '활동', done: Boolean(activity.process || activity.contribution) },
    { label: '결과물', done: Boolean(activity.result) },
    { label: 'Reflection', done: reflectionAnsweredCount(activity) > 0 },
    { label: '후속 활동', done: Boolean(activity.followUp) },
  ]

  return (
    <div className={styles.layout}>
      <article className={styles.main} aria-labelledby="activity-title">
        <header className={styles.header}>
          <p className={styles.badges}>
            <span className={styles.typeTag}>{activityTypeLabel(activity.type)}</span>
            <span className={styles.status} data-status={activity.status}>
              {activityStatusLabel[activity.status]}
            </span>
          </p>
          <h1 id="activity-title" className={styles.title} tabIndex={-1}>
            {activity.title}
          </h1>
          <p className={styles.meta}>{activityPeriodText(activity)}</p>
          <p className={styles.message}>{statusMessage[activity.status]}</p>
        </header>

        {editing ? (
          <section className={styles.editSection} aria-labelledby="activity-edit-heading">
            <h2 id="activity-edit-heading" className={styles.sectionTitle}>
              기록 수정
            </h2>
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                save()
              }}
            >
              <ActivityFormFields
                idPrefix="activity-edit"
                values={editing.values}
                errors={editing.errors}
                onChange={(values) => setEditing({ ...editing, values })}
                mode="full"
              />
              {editing.failed && (
                <p className={styles.error} role="alert">
                  저장하지 못했어요. 입력한 내용은 그대로 있어요. 다시 저장해주세요.
                </p>
              )}
              <div className={styles.editActions}>
                <button
                  type="button"
                  className={dialogStyles.secondaryButton}
                  disabled={editing.saving}
                  onClick={() => {
                    setEditing(null)
                    restoreFocus(editTriggerRef.current, 'activity-title')
                  }}
                >
                  취소
                </button>
                <button type="submit" className={dialogStyles.primaryButton} disabled={editing.saving}>
                  {editing.saving ? '저장 중…' : '저장'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <>
            <dl className={styles.info}>
              <div className={styles.infoItem}>
                <dt>주최 / 기관</dt>
                <dd>{activity.organizer || '아직 쓰지 않았어요'}</dd>
              </div>
              <div className={styles.infoItem}>
                <dt>내 역할</dt>
                <dd>{activity.role || '아직 쓰지 않았어요'}</dd>
              </div>
            </dl>

            <section aria-labelledby="activity-steps-heading">
              <h2 id="activity-steps-heading" className={styles.sectionTitle}>
                활동 과정
              </h2>
              <ol className={styles.steps}>
                {steps.map((step) => (
                  <li key={step.label} className={styles.step} data-done={step.done || undefined}>
                    {step.label}
                    <span className="lh-visually-hidden">{step.done ? ' (작성함)' : ' (아직)'}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className={styles.record} aria-label="활동 서술">
              {(
                [
                  ['참여 이유', activity.participationReason],
                  ['주요 과정', activity.process],
                  ['내가 실제로 한 일', activity.contribution],
                  ['결과', activity.result],
                  ['후속 활동', activity.followUp],
                ] as const
              ).map(([label, text]) => (
                <div key={label} className={styles.recordItem}>
                  <h2 className={styles.sectionTitle}>{label}</h2>
                  <p className={text ? styles.recordText : styles.recordEmpty}>{text || '아직 쓰지 않았어요.'}</p>
                </div>
              ))}
              {activity.tags.length > 0 && (
                <p className={styles.tags} aria-label="태그">
                  {activity.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      #{tag}
                    </span>
                  ))}
                </p>
              )}
              {editable && (
                <button
                  ref={editTriggerRef}
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => setEditing({ values: draftFromActivity(activity), errors: {}, saving: false, failed: false })}
                >
                  기록 수정
                </button>
              )}
            </section>
          </>
        )}

        <ReflectionSection
          activity={activity}
          editing={reflection}
          onOpen={openReflection}
          onChange={(values) => reflection && setReflection({ ...reflection, values, error: undefined })}
          onSave={saveReflection}
          onCancel={() => {
            if (reflectionDirty) setConfirmingLeave(true)
            else closeReflection()
          }}
        />
        <FeedbackSection activity={activity} />
      </article>

      <aside className={styles.aside} aria-labelledby="activity-evidence-heading">
        <h2 id="activity-evidence-heading" className={styles.sectionTitle}>
          Evidence {evidence.length}
        </h2>
        {evidence.length === 0 ? (
          <p className={styles.recordEmpty}>{editable ? '활동 사진 · 기록지 같은 자료를 추가해보세요.' : '올린 자료가 없어요.'}</p>
        ) : (
          <ul className={styles.evidenceList}>
            {evidence.map((item) => (
              <li key={item.evidenceId} className={styles.evidenceItem}>
                <span className={styles.fileType} aria-hidden="true">
                  {fileExtensionLabel(item.fileName)}
                </span>
                <span className={styles.fileName}>
                  {item.fileName}
                  {evidenceFlow.deleteErrorId === item.evidenceId && (
                    <span className={styles.rowError} role="alert">
                      삭제하지 못했어요. 파일은 그대로 있어요.
                    </span>
                  )}
                </span>
                <span className={styles.fileActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={`${item.fileName} 미리보기`}
                    aria-haspopup="dialog"
                    onClick={(event) => evidenceFlow.openPreview(item, event.currentTarget)}
                  >
                    보기
                  </button>
                  {editable && (
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`${item.fileName} 삭제`}
                      aria-haspopup="dialog"
                      onClick={(event) => evidenceFlow.openDelete(item, event.currentTarget)}
                    >
                      삭제
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {editable && (
          <button
            type="button"
            id={evidenceFlow.addButtonId}
            className={styles.secondaryAction}
            aria-haspopup="dialog"
            onClick={(event) => evidenceFlow.openAdd(activity, event.currentTarget)}
          >
            자료 추가
          </button>
        )}
        <NextAction
          activity={activity}
          submitTriggerRef={submitTriggerRef}
          onSubmit={() => setSubmit({ pending: false, failed: false })}
          onWriteReflection={(trigger) => openReflection(trigger)}
          reflectionOpen={Boolean(reflection)}
          feedbackRequest={feedbackRequest}
          onRequestFeedback={requestFeedback}
          onArchive={(trigger) => {
            actionTriggerRef.current = trigger
            setArchive({ pending: false, failed: false })
          }}
        />
      </aside>

      {evidenceFlow.dialogs}
      {announcement && (
        <p className="lh-visually-hidden" role="status">
          {announcement}
        </p>
      )}
      {(confirmingLeave || blocker.state === 'blocked') && (
        <TaskLeaveDialog
          onStay={() => {
            setConfirmingLeave(false)
            if (blocker.state === 'blocked') blocker.reset()
          }}
          onLeave={() => {
            setConfirmingLeave(false)
            if (blocker.state === 'blocked') {
              allowLeaveRef.current = true
              blocker.proceed()
            } else {
              closeReflection()
            }
          }}
        />
      )}
      {archive && (
        <DialogShell
          labelledBy="activity-archive-heading"
          onCancel={() => {
            if (archive.pending) return
            setArchive(null)
            restoreFocus(actionTriggerRef.current, 'activity-title')
          }}
          className={dialogStyles.confirmDialog}
        >
          <div className={dialogStyles.confirmSurface}>
            <h2 id="activity-archive-heading" className={dialogStyles.confirmTitle}>
              Archive에 저장할까요?
            </h2>
            <p className={dialogStyles.confirmText}>
              보관하면 School Archive에서 다시 볼 수 있어요. 기록 · 자료 · Reflection · 피드백은 그대로 남고, 저장한 뒤에는 Reflection을 고칠 수 없어요.
            </p>
            {archive.failed && (
              <p className={styles.error} role="alert">
                Archive에 저장하지 못했어요. 기록은 그대로예요. 다시 시도해주세요.
              </p>
            )}
            <div className={dialogStyles.confirmActions}>
              <button
                type="button"
                className={dialogStyles.secondaryButton}
                disabled={archive.pending}
                data-autofocus
                onClick={() => {
                  setArchive(null)
                  restoreFocus(actionTriggerRef.current, 'activity-title')
                }}
              >
                취소
              </button>
              <button type="button" className={dialogStyles.primaryButton} disabled={archive.pending} onClick={confirmArchive}>
                {archive.pending ? '저장 중…' : 'Archive에 저장'}
              </button>
            </div>
          </div>
        </DialogShell>
      )}
      {submit && (
        <DialogShell
          labelledBy="activity-submit-heading"
          onCancel={() => {
            if (submit.pending) return
            setSubmit(null)
            restoreFocus(submitTriggerRef.current, 'activity-title')
          }}
          className={dialogStyles.confirmDialog}
        >
          <div className={dialogStyles.confirmSurface}>
            <h2 id="activity-submit-heading" className={dialogStyles.confirmTitle}>
              활동 기록을 제출할까요?
            </h2>
            <p className={dialogStyles.confirmText}>
              제출하면 Reflection으로 이 활동을 돌아볼 수 있어요. 제출한 뒤에는 기록과 자료를 지금은 고칠 수 없어요.
            </p>
            {submit.failed && (
              <p className={styles.error} role="alert">
                제출하지 못했어요. 기록은 그대로예요. 다시 시도해주세요.
              </p>
            )}
            <div className={dialogStyles.confirmActions}>
              <button
                type="button"
                className={dialogStyles.secondaryButton}
                disabled={submit.pending}
                data-autofocus
                onClick={() => {
                  setSubmit(null)
                  restoreFocus(submitTriggerRef.current, 'activity-title')
                }}
              >
                취소
              </button>
              <button type="button" className={dialogStyles.primaryButton} disabled={submit.pending} onClick={confirmSubmit}>
                {submit.pending ? '제출 중…' : '제출'}
              </button>
            </div>
          </div>
        </DialogShell>
      )}
    </div>
  )
}

/** 다음 할 일 (오른쪽 열). 피드백 요청은 선택이라 보조 버튼으로 둔다. */
function NextAction({
  activity,
  submitTriggerRef,
  onSubmit,
  onWriteReflection,
  reflectionOpen,
  feedbackRequest,
  onRequestFeedback,
  onArchive,
}: {
  activity: GrowthActivity
  submitTriggerRef: React.RefObject<HTMLButtonElement | null>
  onSubmit: () => void
  onWriteReflection: (trigger: HTMLElement) => void
  reflectionOpen: boolean
  feedbackRequest: { pending: boolean; failed: boolean }
  onRequestFeedback: () => void
  onArchive: (trigger: HTMLElement) => void
}) {
  switch (activity.status) {
    case 'draft':
      return (
        <button ref={submitTriggerRef} type="button" className={styles.primaryAction} aria-haspopup="dialog" onClick={onSubmit}>
          기록 제출
        </button>
      )
    case 'submitted':
      return (
        <div className={styles.nextAction}>
          <button
            type="button"
            className={styles.primaryAction}
            disabled={reflectionOpen}
            onClick={(event) => onWriteReflection(event.currentTarget)}
          >
            {activity.reflection ? 'Reflection 이어 쓰기' : 'Reflection 작성'}
          </button>
          <button type="button" className={styles.secondaryAction} disabled={feedbackRequest.pending} onClick={onRequestFeedback}>
            {feedbackRequest.pending ? '요청 중…' : '선생님 피드백 요청'}
          </button>
          <p className={styles.hint}>피드백은 선택이에요. 요청하면 학원 선생님이 공용 검토 목록에서 확인해요.</p>
          {feedbackRequest.failed && (
            <p className={styles.error} role="alert">
              피드백을 요청하지 못했어요. 기록은 그대로예요. 다시 시도해주세요.
            </p>
          )}
        </div>
      )
    case 'feedback-waiting':
      return <p className={styles.waiting}>선생님 피드백을 기다리고 있어요. 그동안 Reflection을 써둘 수 있어요.</p>
    case 'feedback-delivered':
      return (
        <div className={styles.nextAction}>
          <button
            type="button"
            className={styles.primaryAction}
            disabled={reflectionOpen}
            onClick={(event) => onWriteReflection(event.currentTarget)}
          >
            Reflection 보완하기
          </button>
          <p className={styles.hint}>피드백을 확인하고 Reflection을 직접 보완해 저장하면 Archive에 저장할 수 있어요.</p>
        </div>
      )
    case 'reflected':
      return (
        <div className={styles.nextAction}>
          <button type="button" className={styles.primaryAction} aria-haspopup="dialog" onClick={(event) => onArchive(event.currentTarget)}>
            Archive에 저장
          </button>
          <p className={styles.hint}>저장하면 School Archive에 수행평가 기록과 함께 쌓여요.</p>
        </div>
      )
    case 'archived':
      return <p className={styles.waiting}>Archive에 보관한 기록이에요.</p>
  }
}

/** 돌아보기 (ActivitiesDetail-02): 학생이 직접 쓰는 7문항. 저장한 원문을 그대로 보여준다. (AI 작성 / 교정 없음) */
function ReflectionSection({
  activity,
  editing,
  onOpen,
  onChange,
  onSave,
  onCancel,
}: {
  activity: GrowthActivity
  editing: { values: ActivityReflection; error?: string; saving: boolean; failed: boolean } | null
  onOpen: (trigger: HTMLElement) => void
  onChange: (values: ActivityReflection) => void
  onSave: () => void
  onCancel: () => void
}) {
  const editable = isReflectionEditable(activity)
  const answered = reflectionAnsweredCount(activity)
  return (
    <section className={styles.block} aria-labelledby="activity-reflection-heading">
      <div className={styles.blockHeader}>
        <h2 id="activity-reflection-heading" className={styles.blockTitle} tabIndex={-1}>
          돌아보기 (Reflection)
        </h2>
        {editable && !editing && (
          <button type="button" className={styles.smallAction} onClick={(event) => onOpen(event.currentTarget)}>
            {answered > 0 ? '직접 보완하기' : 'Reflection 작성'}
          </button>
        )}
      </div>
      {activity.status === 'draft' ? (
        <p className={styles.recordEmpty}>먼저 활동 기록을 제출해주세요. 제출하면 Reflection으로 활동을 돌아볼 수 있어요.</p>
      ) : editing ? (
        <form
          className={styles.reflectionForm}
          noValidate
          aria-describedby={editing.error ? 'activity-reflection-error' : undefined}
          onSubmit={(event) => {
            event.preventDefault()
            onSave()
          }}
        >
          <p className={styles.hint}>쓴 내용은 고치지 않고 그대로 저장돼요. 빈 항목은 나중에 이어서 쓸 수 있어요.</p>
          {editing.error && (
            <p id="activity-reflection-error" className={styles.error} role="alert">
              {editing.error}
            </p>
          )}
          {activityReflectionFields.map(({ key, question }) => (
            <div key={key} className={styles.reflectionField}>
              <label htmlFor={`activity-reflection-${key}`} className={styles.reflectionLabel}>
                {question}
              </label>
              <textarea
                id={`activity-reflection-${key}`}
                className={styles.textarea}
                rows={3}
                value={editing.values[key]}
                onChange={(event) => onChange({ ...editing.values, [key]: event.target.value })}
              />
            </div>
          ))}
          {editing.failed && (
            <p className={styles.error} role="alert">
              Reflection을 저장하지 못했어요. 입력한 내용은 그대로 있어요. 다시 저장해주세요.
            </p>
          )}
          <div className={styles.editActions}>
            <button type="button" className={dialogStyles.secondaryButton} disabled={editing.saving} onClick={onCancel}>
              취소
            </button>
            <button type="submit" className={dialogStyles.primaryButton} disabled={editing.saving}>
              {editing.saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      ) : answered === 0 ? (
        <p className={styles.recordEmpty}>아직 작성한 Reflection이 없어요.</p>
      ) : (
        <dl className={styles.reflection}>
          {activityReflectionFields.map(({ key, question }) => {
            const answer = activity.reflection?.[key].trim()
            return (
              <div key={key} className={styles.reflectionItem}>
                <dt>{question}</dt>
                <dd className={answer ? styles.recordText : styles.recordEmpty}>{answer || '아직 쓰지 않았어요'}</dd>
              </div>
            )
          })}
        </dl>
      )}
    </section>
  )
}

/** 선생님 피드백 (ActivitiesDetail-02). 학생이 요청했을 때만 생긴다. (피드백은 선택, 작성자는 표시 정보일 뿐 담당 배정이 아니다) */
function FeedbackSection({ activity }: { activity: GrowthActivity }) {
  return (
    <section className={styles.block} aria-labelledby="activity-feedback-heading">
      <h2 id="activity-feedback-heading" className={styles.blockTitle} tabIndex={-1}>
        선생님 피드백
      </h2>
      {activity.feedback ? (
        <div className={styles.feedback}>
          <p className={styles.hint}>
            선생님 피드백 · {activity.feedback.author} · {formatDateTime(activity.feedback.deliveredAt)}
          </p>
          {activityFeedbackFields.map(({ key, label }) => (
            <div key={key}>
              <h3 className={styles.feedbackLabel}>{label}</h3>
              <p>{activity.feedback?.[key]}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.recordEmpty}>
          {activity.status === 'feedback-waiting' ? '선생님 검토를 기다리고 있어요.' : '아직 요청한 피드백이 없어요.'}
        </p>
      )}
    </section>
  )
}
