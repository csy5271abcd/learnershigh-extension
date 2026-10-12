import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import { TaskLeaveDialog } from '../components/TaskLeaveDialog.tsx'
import { VersionSubmitDialog } from '../components/VersionSubmitDialog.tsx'
import type { SchoolVersionService } from '../fixtures/schoolVersion.fixture.ts'
import type { StudentTaskDetail } from '../model/types.ts'
import { useGuideFileReader } from '../model/useGuideFileReader.ts'
import { nextVersionNumber } from '../model/version.ts'
import { versionModalParam } from './paths.ts'

interface SchoolVersionSubmitModalProps {
  data: StudentTaskDetail
  service: SchoolVersionService
  /** 제출에 성공하면 Task를 다시 읽게 한다. */
  onSubmitted: () => void
  /** Modal을 닫는다. 제출했다면 submitted = true */
  onClose: (submitted: boolean) => void
}

// Version 제출 Modal의 상태 (Task Detail 위, ?version=submit). Browser Back으로 닫힌다.
// - Version 번호는 지금 Version 목록의 latest + 1 (V1 / V2 / V3 같은 흐름)
// - 파일을 고른 뒤 취소 / 닫기 / ESC / Browser Back → 나가기 확인 (Task Create / 주제 제출과 같은 확인 Dialog)
// - 제출 중 중복 요청 방지(Version 하나만), 실패하면 파일 유지 + 다시 제출
export function SchoolVersionSubmitModal({ data, service, onSubmitted, onClose }: SchoolVersionSubmitModalProps) {
  const [versionNumber] = useState(() => nextVersionNumber(data))
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [submitFailed, setSubmitFailed] = useState(false)
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const fileReader = useGuideFileReader(
    useCallback((ready: File) => {
      setFile(ready)
      setError(undefined)
    }, []),
  )

  const dirty = Boolean(file) || fileReader.state.status === 'reading'
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
      new URLSearchParams(currentLocation.search).has(versionModalParam) &&
      !new URLSearchParams(nextLocation.search).has(versionModalParam),
  )

  useEffect(() => {
    if (!dirty) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!allowLeaveRef.current) event.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  const close = (submitted: boolean) => {
    allowLeaveRef.current = true
    onClose(submitted)
  }

  const requestClose = () => {
    if (submittingRef.current) return
    if (dirtyRef.current) setConfirmingLeave(true)
    else close(false)
  }

  const submit = () => {
    if (submittingRef.current) return
    let validation: string | undefined
    if (fileReader.state.status === 'reading') validation = '파일을 준비하고 있어요. 준비가 끝나면 제출할 수 있어요.'
    else if (!file) validation = '제출할 파일을 선택해주세요.'
    setError(validation)
    if (validation || !file) {
      document.getElementById('version-file-box')?.focus()
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setSubmitFailed(false)
    service.submit(data.task.taskId, file).then(
      () => {
        onSubmitted()
        close(true)
      },
      () => {
        submittingRef.current = false
        setSubmitting(false)
        setSubmitFailed(true)
      },
    )
  }

  return (
    <>
      <VersionSubmitDialog
        task={data.task}
        versionNumber={versionNumber}
        file={file}
        fileState={fileReader.state}
        onFileSelect={(picked) => {
          setFile(null)
          setError(undefined)
          setSubmitFailed(false)
          fileReader.read(picked)
        }}
        onFileRemove={() => {
          fileReader.reset()
          setFile(null)
        }}
        error={error}
        submitting={submitting}
        submitFailed={submitFailed}
        onSubmit={submit}
        onClose={requestClose}
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
              close(false)
            }
          }}
        />
      )}
    </>
  )
}
