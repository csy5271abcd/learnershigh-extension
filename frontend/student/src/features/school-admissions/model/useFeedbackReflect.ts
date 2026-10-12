import { useRef, useState } from 'react'
import type { SchoolFeedbackService } from '../fixtures/schoolFeedback.fixture.ts'
import { reflectTargetKey, type FeedbackReflectTarget } from './feedback.ts'

/**
 * 피드백 "반영함" 표시를 저장한다. 저장이 끝난 뒤에 화면 값을 바꾼다. (Contract가 없어 Optimistic Update를 하지 않는다)
 * 저장 중에는 같은 요청을 다시 보내지 않고, 실패하면 표시를 그대로 두고 그 항목에 이유를 보여준다.
 */
export function useFeedbackReflect({ service, onChanged }: { service: SchoolFeedbackService; onChanged: () => void }) {
  const [pendingKey, setPendingKey] = useState<string>()
  const [errorKey, setErrorKey] = useState<string>()
  const busyRef = useRef(false)

  const toggle = (target: FeedbackReflectTarget, reflected: boolean) => {
    if (busyRef.current) return
    busyRef.current = true
    const key = reflectTargetKey(target)
    setPendingKey(key)
    setErrorKey(undefined)
    service.setReflected(target, reflected).then(
      () => {
        busyRef.current = false
        setPendingKey(undefined)
        onChanged()
      },
      () => {
        busyRef.current = false
        setPendingKey(undefined)
        setErrorKey(key)
      },
    )
  }

  return { toggle, pendingKey, errorKey }
}
