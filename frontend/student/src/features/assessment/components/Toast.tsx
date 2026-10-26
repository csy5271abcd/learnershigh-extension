import { useEffect } from 'react'
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

// 화면 하단 알림. 항상 Live Region을 렌더링해 Screen Reader가 바뀐 문구를 읽게 한다.
export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDismiss, message.tone === 'error' ? 6000 : 3500)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {message && (
        <div key={message.id} className={styles.toast} data-tone={message.tone}>
          {message.text}
        </div>
      )}
    </div>
  )
}
