import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import { TaskLeaveDialog } from '../components/TaskLeaveDialog.tsx'
import { TaskTopicDialog } from '../components/TaskTopicDialog.tsx'
import type { SchoolTopicSubmit } from '../fixtures/schoolTopic.fixture.ts'
import { taskTopicFieldId, validateTopic } from '../model/topic.ts'
import type { StudentTaskDetail } from '../model/types.ts'
import { topicModalParam } from './paths.ts'

interface SchoolTopicModalProps {
  data: StudentTaskDetail
  submitTopic: SchoolTopicSubmit
  /** Modal을 닫는다. 제출했다면 submitted = true */
  onClose: (submitted: boolean) => void
}

// 주제 제출 Modal의 상태 (Task Detail 위, ?topic=1).
// - 방향 요청을 받은 경우: 처음 제출한 주제를 채워 두고 학생이 고쳐서 다시 제출한다.
// - 수정 중(dirty)에 취소 / 닫기 / ESC / Browser Back → 나가기 확인 (Task Create와 같은 확인 Dialog)
// - 제출 중 중복 요청 방지, 실패하면 입력 유지 + 다시 제출
export function SchoolTopicModal({ data, submitTopic, onClose }: SchoolTopicModalProps) {
  const current = data.detail?.topic
  const revision =
    current?.state === 'direction-requested' ? { previousTopic: current.topic, guidance: current.guidance } : undefined
  const initialTopic = revision?.previousTopic ?? ''

  const [topic, setTopic] = useState(initialTopic)
  const [error, setError] = useState<string>()
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitFailed, setSubmitFailed] = useState(false)

  const dirty = topic !== initialTopic
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
      new URLSearchParams(currentLocation.search).has(topicModalParam) &&
      !new URLSearchParams(nextLocation.search).has(topicModalParam),
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
    const validation = validateTopic(topic)
    setError(validation)
    if (validation) {
      document.getElementById(taskTopicFieldId)?.focus()
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setSubmitFailed(false)
    submitTopic(data.task.taskId, topic).then(
      () => close(true),
      () => {
        submittingRef.current = false
        setSubmitting(false)
        setSubmitFailed(true)
      },
    )
  }

  return (
    <>
      <TaskTopicDialog
        task={data.task}
        snapshotDate={data.snapshotDate}
        revision={revision}
        topic={topic}
        onTopicChange={(next) => {
          setTopic(next)
          if (error) setError(undefined)
        }}
        error={error}
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
              close(false)
            }
          }}
        />
      )}
    </>
  )
}
