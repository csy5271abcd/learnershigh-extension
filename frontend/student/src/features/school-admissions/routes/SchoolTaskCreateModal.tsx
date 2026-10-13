import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import { TaskCreateWizard } from '../components/TaskCreateWizard.tsx'
import { TaskLeaveDialog } from '../components/TaskLeaveDialog.tsx'
import { schoolTaskSubjectOptions, type SchoolTaskCreate } from '../fixtures/schoolTaskCreate.fixture.ts'
import {
  firstErrorField,
  guideFileTypeError,
  initialTaskCreateDraft,
  isTaskCreateDraftDirty,
  taskCreateFieldId,
  taskCreateSteps,
  validateTaskCreateStep,
  type TaskCreateDraft,
  type TaskCreateErrors,
  type TaskCreateField,
  type TaskCreateStep,
} from '../model/taskCreate.ts'
import { useGuideFileReader } from '../model/useGuideFileReader.ts'
import { createModalParam } from './paths.ts'

interface SchoolTaskCreateModalProps {
  createTask: SchoolTaskCreate
  snapshotDate: string
  /** Modal을 닫는다. 등록했다면 새 taskId를 넘긴다. */
  onClose: (createdTaskId?: string) => void
}

// 수행평가 등록 Modal의 상태 (Tasks 화면 위, ?create=1).
// - 단계별 검사 → 다음 단계 / 이전은 입력 유지
// - 작성 중(dirty)에 취소 / 닫기 / ESC / Browser Back → 나가기 확인 (Back은 Router useBlocker)
// - 등록 중 중복 요청 방지, 실패하면 확인 단계 · 입력 유지
export function SchoolTaskCreateModal({ createTask, snapshotDate, onClose }: SchoolTaskCreateModalProps) {
  const [step, setStep] = useState<TaskCreateStep>('guide')
  const [draft, setDraft] = useState<TaskCreateDraft>(initialTaskCreateDraft)
  const [errors, setErrors] = useState<TaskCreateErrors>({})
  const [fileTypeError, setFileTypeError] = useState<string>()
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitFailed, setSubmitFailed] = useState(false)
  const [focusField, setFocusField] = useState<{ field: TaskCreateField }>()

  const dirty = isTaskCreateDraftDirty(draft)
  // Router의 이동 차단 판단은 이동하는 순간의 값을 읽어야 한다.
  const dirtyRef = useRef(dirty)
  const allowLeaveRef = useRef(false)
  const submittingRef = useRef(false)
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  const fileReader = useGuideFileReader(
    useCallback((file: File) => {
      setDraft((current) => ({
        ...current,
        guideFile: { file, fileName: file.name, mimeType: file.type, sizeBytes: file.size },
      }))
    }, []),
  )

  // Browser Back으로 Modal 주소(?create=1)를 벗어나려 할 때
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

  useEffect(() => {
    if (focusField) document.getElementById(taskCreateFieldId(focusField.field))?.focus()
  }, [focusField])

  const close = (createdTaskId?: string) => {
    allowLeaveRef.current = true
    onClose(createdTaskId)
  }

  const requestClose = () => {
    if (submittingRef.current) return
    if (dirtyRef.current) setConfirmingLeave(true)
    else close()
  }

  const clearError = (field: TaskCreateField) =>
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })

  const selectGuideFile = (file: File) => {
    const typeError = guideFileTypeError(file.name)
    if (typeError) {
      setFileTypeError(typeError)
      return
    }
    setFileTypeError(undefined)
    // 새 파일을 읽는 동안 이전 파일은 쓰지 않는다. (0%부터 다시)
    setDraft((current) => ({ ...current, guideFile: null }))
    fileReader.read(file)
  }

  const removeGuideFile = () => {
    fileReader.reset()
    setFileTypeError(undefined)
    setDraft((current) => ({ ...current, guideFile: null }))
  }

  const stepIndex = taskCreateSteps.findIndex((item) => item.id === step)

  const next = () => {
    const stepErrors = validateTaskCreateStep(step, draft, fileReader.state)
    setErrors(stepErrors)
    const field = firstErrorField(draft, stepErrors)
    if (field) {
      setFocusField({ field })
      return
    }
    setStep(taskCreateSteps[stepIndex + 1].id)
  }

  const previous = () => {
    setErrors({})
    setStep(taskCreateSteps[stepIndex - 1].id)
  }

  const submit = () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setSubmitFailed(false)
    createTask(draft).then(
      (result) => close(result.taskId),
      () => {
        submittingRef.current = false
        setSubmitting(false)
        setSubmitFailed(true)
      },
    )
  }

  return (
    <>
      <TaskCreateWizard
        step={step}
        draft={draft}
        onDraftChange={setDraft}
        errors={errors}
        onFieldEdit={clearError}
        fileState={fileReader.state}
        fileTypeError={fileTypeError}
        onGuideFileSelect={selectGuideFile}
        onGuideFileRemove={removeGuideFile}
        subjectOptions={schoolTaskSubjectOptions}
        snapshotDate={snapshotDate}
        submitting={submitting}
        submitFailed={submitFailed}
        onNext={next}
        onPrevious={previous}
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
