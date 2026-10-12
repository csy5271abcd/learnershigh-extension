import { useRef, useState } from 'react'
import { ActivityFormFields } from './components/ActivityForm.tsx'
import { DialogShell } from './components/EvidenceDialogs.tsx'
import dialogStyles from './components/EvidenceParts.module.css'
import { SchoolLayout, type SchoolSectionId } from './components/SchoolLayout.tsx'
import { useActivityEvidence } from './components/useActivityEvidence.tsx'
import type { SchoolActivityDetailLoader, SchoolActivityService } from './fixtures/schoolActivity.fixture.ts'
import {
  activityPeriodText,
  activityStatusLabel,
  activityTypeLabel,
  isActivityEditable,
  reflectionAnsweredCount,
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
  submitted: '제출한 기록이에요. Reflection을 작성하면 활동을 돌아보고 Archive에 보관할 수 있어요.',
  'feedback-waiting': '선생님 피드백을 기다리고 있어요.',
  'feedback-delivered': '선생님 피드백이 도착했어요. 확인하고 필요하면 Reflection을 직접 보완해주세요.',
  reflected: 'Reflection을 마쳤어요. Archive에 저장할 수 있어요.',
  archived: 'Archive에 보관한 기록이에요.',
}

interface SchoolActivityDetailPageProps {
  activityId: string
  loadDetail: SchoolActivityDetailLoader
  service: SchoolActivityService
  onChanged: () => void
  onBack: () => void
  backLabel: string
  studentGrade: string
  onSectionSelect: (id: SchoolSectionId) => void
}

// Growth Activity Detail (ActivitiesDetail-01 / 02): 기본 정보 · 활동 과정 · 학생이 쓴 서술 · 과정 자료 · Reflection · 선생님 피드백.
// 작성 중(Draft)일 때만 고치고 자료를 바꿀 수 있다. Reflection 작성 / 피드백 요청 / Archive 저장은 다음 Branch.
export function SchoolActivityDetailPage({
  activityId,
  loadDetail,
  service,
  onChanged,
  onBack,
  backLabel,
  studentGrade,
  onSectionSelect,
}: SchoolActivityDetailPageProps) {
  const { state, reload } = useSchoolActivityDetail(activityId, loadDetail)
  return (
    <SchoolLayout current="activities" studentGrade={studentGrade} onSectionSelect={onSectionSelect} busy={state.status === 'loading'} showPageHeader={false}>
      <button type="button" className={styles.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> 나의 활동 기록
        <span className="lh-visually-hidden"> {backLabel}</span>
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
  const busyRef = useRef(false)
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

        <ReflectionSection activity={activity} />
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
        <NextAction activity={activity} submitTriggerRef={submitTriggerRef} onSubmit={() => setSubmit({ pending: false, failed: false })} />
      </aside>

      {evidenceFlow.dialogs}
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

/** 다음 할 일 (오른쪽 열). 화면이 아직 없는 단계는 비활성 + 이유. */
function NextAction({
  activity,
  submitTriggerRef,
  onSubmit,
}: {
  activity: GrowthActivity
  submitTriggerRef: React.RefObject<HTMLButtonElement | null>
  onSubmit: () => void
}) {
  if (activity.status === 'draft') {
    return (
      <button ref={submitTriggerRef} type="button" className={styles.primaryAction} aria-haspopup="dialog" onClick={onSubmit}>
        기록 제출
      </button>
    )
  }
  const pending: Partial<Record<ActivityStatus, { label: string; reason: string }>> = {
    submitted: { label: 'Reflection 작성', reason: 'Reflection 작성 화면은 준비 중이에요.' },
    'feedback-delivered': { label: 'Archive에 저장', reason: 'Reflection 보완과 Archive 저장은 준비 중이에요.' },
    reflected: { label: 'Archive에 저장', reason: 'Archive 저장은 준비 중이에요.' },
  }
  const action = pending[activity.status]
  if (!action) return null
  return (
    <div className={styles.nextAction}>
      <button type="button" className={styles.primaryAction} disabled aria-describedby="activity-next-reason">
        {action.label}
      </button>
      <p id="activity-next-reason" className={styles.hint}>
        {action.reason}
      </p>
    </div>
  )
}

/** 돌아보기 (ActivitiesDetail-02). 학생이 쓴 답만 보여준다. 이번 Branch에서는 작성하지 않는다. */
function ReflectionSection({ activity }: { activity: GrowthActivity }) {
  const answered = reflectionAnsweredCount(activity)
  return (
    <section className={styles.block} aria-labelledby="activity-reflection-heading">
      <h2 id="activity-reflection-heading" className={styles.blockTitle}>
        돌아보기 (Reflection)
      </h2>
      {answered === 0 ? (
        <p className={styles.recordEmpty}>
          {activity.status === 'draft'
            ? '기록을 제출하면 Reflection으로 활동을 돌아볼 수 있어요.'
            : 'Reflection을 작성하면 활동을 돌아보고 Archive에 보관할 수 있어요. 작성 화면은 준비 중이에요.'}
        </p>
      ) : (
        <dl className={styles.reflection}>
          {activity.reflection.map((item) => (
            <div key={item.question} className={styles.reflectionItem}>
              <dt>{item.question}</dt>
              <dd className={item.answer ? undefined : styles.recordEmpty}>{item.answer ?? '아직 쓰지 않았어요'}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

/** 선생님 피드백 (ActivitiesDetail-02). 학생이 요청했을 때만 생긴다. (피드백은 선택) */
function FeedbackSection({ activity }: { activity: GrowthActivity }) {
  return (
    <section className={styles.block} aria-labelledby="activity-feedback-heading">
      <h2 id="activity-feedback-heading" className={styles.blockTitle}>
        선생님 피드백
      </h2>
      {activity.feedback ? (
        <div className={styles.feedback}>
          <p className={styles.hint}>
            선생님 피드백 · {activity.feedback.author} · {formatDateTime(activity.feedback.deliveredAt)}
          </p>
          {activity.feedback.sections.map((section) => (
            <div key={section.label}>
              <h3 className={styles.feedbackLabel}>{section.label}</h3>
              <p>{section.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.recordEmpty}>
          {activity.status === 'feedback-waiting' ? '선생님 피드백을 기다리고 있어요.' : '아직 요청한 피드백이 없어요.'}
        </p>
      )}
    </section>
  )
}
