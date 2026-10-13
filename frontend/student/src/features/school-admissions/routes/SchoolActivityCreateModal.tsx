import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import { ActivityCreateDialog } from '../components/ActivityForm.tsx'
import { TaskLeaveDialog } from '../components/TaskLeaveDialog.tsx'
import type { SchoolActivityService } from '../fixtures/schoolActivity.fixture.ts'
import type { ActivityFieldErrors } from '../model/activity.ts'
import { emptyActivityDraft, focusFirstActivityError, readActivityDraft, type ActivityDraftValues } from '../model/activityForm.ts'
import { createModalParam } from './paths.ts'

interface SchoolActivityCreateModalProps {
  service: SchoolActivityService
  /** 만들었으면 activityId, 그냥 닫으면 undefined */
  onClose: (activityId?: string) => void
}

// 활동 기록 추가 Modal의 상태 (Activities 위, ?create=1). Browser Back으로 닫힌다.
// - 입력 중(dirty)에 취소 / 닫기 / ESC / Browser Back → 나가기 확인 (Task Create와 같은 확인 Dialog)
// - 만들기 중 중복 요청 방지, 실패하면 입력 유지 + 다시 시도. 만들면 작성 중(Draft) 기록이 된다.
export function SchoolActivityCreateModal({ service, onClose }: SchoolActivityCreateModalProps) {
  const [values, setValues] = useState<ActivityDraftValues>(emptyActivityDraft)
  const [errors, setErrors] = useState<ActivityFieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitFailed, setSubmitFailed] = useState(false)
  const [confirmingLeave, setConfirmingLeave] = useState(false)

  const dirty = (Object.keys(values) as (keyof ActivityDraftValues)[]).some((key) => values[key] !== emptyActivityDraft[key])
  const dirtyRef = useRef(dirty)
  const allowLeaveRef = useRef(false)
  const submittingRef = useRef(false)
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyRef.current &&
      !allowLeaveRef.current &&
      new URLSearchParams(currentLocation.search).has(createModalParam) &&
      !new URLSearchParams(nextLocation.search).has(createModalParam),
  )

  useEffect(() => {
    if (!dirty) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!allowLeaveRef.current) event.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  const close = (activityId?: string) => {
    allowLeaveRef.current = true
    onClose(activityId)
  }

  const requestClose = () => {
    if (submittingRef.current) return
    if (dirtyRef.current) setConfirmingLeave(true)
    else close()
  }

  const submit = () => {
    if (submittingRef.current) return
    const { errors: nextErrors, fields } = readActivityDraft(values)
    setErrors(nextErrors)
    if (!fields) {
      focusFirstActivityError('activity-create', nextErrors)
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setSubmitFailed(false)
    service.create(fields).then(
      (activity) => close(activity.activityId),
      () => {
        submittingRef.current = false
        setSubmitting(false)
        setSubmitFailed(true)
      },
    )
  }

  return (
    <>
      <ActivityCreateDialog
        values={values}
        errors={errors}
        onChange={(next) => {
          setValues(next)
          if (Object.keys(errors).length > 0) setErrors({})
        }}
        submitting={submitting}
        submitFailed={submitFailed}
        onSubmit={submit}
        onRequestClose={requestClose}
      />
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
              close()
            }
          }}
        />
      )}
    </>
  )
}
