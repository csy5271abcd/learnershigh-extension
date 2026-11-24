import { useEffect, useRef, useState } from 'react'
import styles from './Toast.module.css'

export interface ToastMessage {
  id: number
  tone: 'success' | 'error' | 'info'
  text: string
}

interface ToastProps {
  message: ToastMessage | null
  onDismiss: () => void
}

/** A27-UX 부록 N5-1: 성공·안내 5초, 오류 6초 뒤 자동으로 닫는다. */
const TOAST_DURATION_MS = { success: 5000, info: 5000, error: 6000 } as const

// 화면 하단 알림. 항상 Live Region을 렌더링해 Screen Reader가 바뀐 문구를 읽게 한다.
// 2026-11-21 (부록 N5-1): 타이머는 메시지(id)가 바뀔 때만 다시 건다. 예전에는 부모가 매 렌더 새 onDismiss 함수를 넘기면
// (예: 학교알리미 '확인 중' 상태 조회로 화면이 계속 다시 그려질 때) 타이머가 계속 처음부터 시작돼 알림이 사라지지 않았다.
// 마우스를 올리거나 키보드 Focus 가 있으면 잠시 멈추고, 닫기(X) 버튼으로 바로 닫을 수 있다.
export function Toast({ message, onDismiss }: ToastProps) {
  const dismissRef = useRef(onDismiss)
  useEffect(() => {
    dismissRef.current = onDismiss
  }, [onDismiss])
  // 멈춤은 그 메시지에만 적용한다(새 메시지가 오면 자동으로 풀림)
  const [pausedId, setPausedId] = useState<number | null>(null)
  const messageId = message?.id
  const tone = message?.tone
  const paused = messageId !== undefined && pausedId === messageId

  useEffect(() => {
    if (messageId === undefined || !tone || paused) return
    const timer = window.setTimeout(() => dismissRef.current(), TOAST_DURATION_MS[tone])
    return () => window.clearTimeout(timer)
  }, [messageId, tone, paused])

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {message && (
        <div
          key={message.id}
          className={styles.toast}
          data-tone={message.tone}
          data-testid="toast"
          onMouseEnter={() => setPausedId(message.id)}
          onMouseLeave={() => setPausedId(null)}
          onFocus={() => setPausedId(message.id)}
          onBlur={() => setPausedId(null)}
        >
          <span className={styles.text}>{message.text}</span>
          <button type="button" className={styles.close} aria-label="알림 닫기" onClick={() => dismissRef.current()} data-testid="toast-close">
            ×
          </button>
        </div>
      )}
    </div>
  )
}
