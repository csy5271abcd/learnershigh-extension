import { useEffect, useRef, useState } from 'react'
import { applyDaysLabel, conflictText, initialResolutions } from '../model/routineApply.ts'
import { slotText } from '../model/timeSlot.ts'
import type {
  MentorRoutineDetail,
  RoutineApplyMode,
  RoutineApplyPreviewRequest,
  RoutineApplyPreviewResult,
  RoutineApplyRequest,
  RoutineApplyResult,
  RoutineConflictResolution,
} from '../model/types.ts'
import { ApplyDialog } from './ApplyDialog.tsx'
import shared from './ApplyDialog.module.css'
import styles from './MentorRoutineApplyDialog.module.css'

interface MentorRoutineApplyDialogProps {
  routine: MentorRoutineDetail
  /** 전체 적용 = Timeline 전체, 습관만 적용 = selectedHabitIds */
  mode: RoutineApplyMode
  selectedHabitIds: string[]
  onClose: () => void
  /** Data Source Boundary. 현재는 Fixture Service, API 연결 시 routine-apply-preview / apply-routine Client. */
  preview: (contentId: string, request: RoutineApplyPreviewRequest) => Promise<RoutineApplyPreviewResult>
  apply: (contentId: string, request: RoutineApplyRequest) => Promise<RoutineApplyResult>
}

type PreviewState = { status: 'loading' } | { status: 'success'; data: RoutineApplyPreviewResult } | { status: 'error' }

type SubmitState = { status: 'idle' | 'submitting' | 'error' } | { status: 'success'; result: RoutineApplyResult }

const resolutionOptions: [RoutineConflictResolution, string][] = [
  ['skip-conflict-days', '겹치는 요일만 빼기'],
  ['keep', '그래도 추가'],
]

// Routine 적용 Modal (Routine-02 Mockup): 추가될 항목 · 겹치는 기존 일정 · 해결 방법을 한 화면에서 확인하고 적용한다.
// 입력은 이 화면 안에서만 유지하고 실제 Student Plan / Schedule에 쓰지 않는다.
export function MentorRoutineApplyDialog({
  routine,
  mode,
  selectedHabitIds,
  onClose,
  preview: loadPreview,
  apply,
}: MentorRoutineApplyDialogProps) {
  const request: RoutineApplyPreviewRequest = {
    selectedHabitIds: mode === 'habits' ? selectedHabitIds : [],
    applyAll: mode === 'all',
  }
  const requestKey = JSON.stringify(request)
  const nothingSelected = mode === 'habits' && selectedHabitIds.length === 0

  const [previewState, setPreviewState] = useState<PreviewState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [resolutions, setResolutions] = useState<Record<string, RoutineConflictResolution> | null>(null)
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' })
  const submittingRef = useRef(false)
  const successHeadingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (nothingSelected) return
    let active = true
    loadPreview(routine.contentId, JSON.parse(requestKey) as RoutineApplyPreviewRequest).then(
      (data) => {
        if (!active) return
        setPreviewState({ status: 'success', data })
        // 처음 열 때만 Mockup 기본값(겹치는 요일만 빼기)으로 채우고, 다시 불러와도 고른 값은 유지한다.
        setResolutions((current) => current ?? initialResolutions(data))
      },
      () => active && setPreviewState({ status: 'error' }),
    )
    return () => {
      active = false
    }
  }, [loadPreview, routine.contentId, requestKey, nothingSelected, attempt])

  const isSuccess = submit.status === 'success'
  useEffect(() => {
    if (isSuccess) successHeadingRef.current?.focus({ preventScroll: true })
  }, [isSuccess])

  const ready = previewState.status === 'success' && resolutions ? previewState.data : null
  const daysLabel = applyDaysLabel(routine.applyDays)
  const sourceLabel = `${routine.mentor.name} · ${routine.title}`
  const title = mode === 'all' ? '전체 적용' : `습관만 적용 (${selectedHabitIds.length})`

  const submitApply = () => {
    if (!ready || !resolutions || submittingRef.current) return
    submittingRef.current = true
    setSubmit({ status: 'submitting' })
    apply(routine.contentId, {
      ...request,
      conflictResolutions: ready.conflicts.map((conflict) => ({
        targetId: conflict.targetId,
        resolution: resolutions[conflict.targetId],
      })),
    })
      .then(
        (result) => setSubmit({ status: 'success', result }),
        () => setSubmit({ status: 'error' }),
      )
      .finally(() => {
        submittingRef.current = false
      })
  }

  const footer = isSuccess ? (
    <div className={shared.actions}>
      <button type="button" className={shared.primaryButton} onClick={onClose}>
        확인
      </button>
    </div>
  ) : (
    <>
      {submit.status === 'error' && (
        <p className={shared.submitError} role="alert">
          적용하지 못했어요. 고른 내용은 그대로 있어요. 다시 시도해 주세요.
        </p>
      )}
      <div className={shared.actions}>
        <button
          type="button"
          className={shared.secondaryButton}
          disabled={submit.status === 'submitting'}
          onClick={onClose}
        >
          취소
        </button>
        <button
          type="button"
          className={shared.primaryButton}
          disabled={!ready || submit.status === 'submitting'}
          onClick={submitApply}
        >
          {submit.status === 'submitting' ? '적용하는 중…' : submit.status === 'error' ? '다시 시도' : '적용하기'}
        </button>
      </div>
    </>
  )

  let body
  if (isSuccess) {
    body = (
      <section className={styles.success} aria-labelledby="routine-apply-success">
        <h3 id="routine-apply-success" ref={successHeadingRef} tabIndex={-1} className={styles.successTitle}>
          {daysLabel} 계획에 추가했어요
        </h3>
        <p className={styles.lead}>
          {mode === 'all' ? '전체 Timeline' : `고른 습관 ${selectedHabitIds.length}개`}에서{' '}
          {submit.result.createdScheduleItemIds.length}개 항목을 추가했어요.
        </p>
        <p className={shared.sourceNotice}>
          출처({sourceLabel})가 함께 저장됐어요. Mentor가 나중에 Routine을 고쳐도 지금 추가한 계획은 바뀌지 않아요.
        </p>
      </section>
    )
  } else if (nothingSelected) {
    body = <p className={styles.notice}>고른 습관이 없어요. Routine 화면에서 적용할 습관을 골라주세요.</p>
  } else if (previewState.status === 'error') {
    body = (
      <div className={styles.notice} role="alert">
        <p>내 기존 일정과 비교하지 못했어요.</p>
        <button
          type="button"
          className={shared.secondaryButton}
          onClick={() => {
            setPreviewState({ status: 'loading' })
            setAttempt((value) => value + 1)
          }}
        >
          다시 시도
        </button>
      </div>
    )
  } else if (!ready || !resolutions) {
    body = (
      <p className={styles.notice} role="status">
        내 기존 일정과 비교하는 중이에요.
      </p>
    )
  } else {
    body = (
      <>
        <p className={styles.lead}>{daysLabel} 계획에 아래 항목을 추가해요.</p>
        <ul className={styles.rows}>
          {ready.items.map((item) => {
            const conflict = ready.conflicts.find((candidate) => candidate.targetId === item.targetId)
            return (
              <li key={item.targetId} className={styles.row}>
                <div className={styles.rowHead}>
                  <span className={styles.time}>{slotText(item.slot)}</span>
                  <span className={styles.rowTitle}>{item.title}</span>
                  <span className={shared.status} data-tone={conflict ? 'negative' : 'positive'}>
                    {conflict ? 'Conflict' : '가능'}
                  </span>
                </div>
                {conflict && (
                  <div className={styles.rowBody}>
                    <p className={styles.conflict}>{conflictText(conflict)}</p>
                    <fieldset className={shared.segmented}>
                      <legend className="lh-visually-hidden">{item.title} 해결 방법</legend>
                      {resolutionOptions.map(([value, label]) => (
                        <label key={value} className={shared.segment}>
                          <input
                            type="radio"
                            name={`routine-apply-resolution-${item.targetId}`}
                            value={value}
                            checked={resolutions[item.targetId] === value}
                            onChange={() => setResolutions({ ...resolutions, [item.targetId]: value })}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </fieldset>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <p className={shared.sourceNotice}>
          출처({sourceLabel})가 계획 항목에 함께 저장돼요. Mentor가 나중에 Routine을 고쳐도 지금 추가한 계획은 바뀌지 않아요.
        </p>
      </>
    )
  }

  return (
    <ApplyDialog idPrefix="routine-apply" title={title} subtitle={sourceLabel} onClose={onClose} footer={footer}>
      {body}
    </ApplyDialog>
  )
}
