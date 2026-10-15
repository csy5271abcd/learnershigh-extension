import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ToastContext } from './toastContext.ts'
import styles from './Toast.module.css'

interface ToastMessage {
  id: number
  text: string
}

/** 저장 / 공개 / 답변 성공 알림. aria-live로 읽어 준다. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null)

  const show = useCallback((text: string) => setMessage({ id: Date.now(), text }), [])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 4000)
    return () => window.clearTimeout(timer)
  }, [message])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {message && (
          <p key={message.id} className={styles.toast}>
            {message.text}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  )
}
