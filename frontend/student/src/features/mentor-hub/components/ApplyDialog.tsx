import { useEffect, useRef, type ReactNode } from 'react'
import styles from './ApplyDialog.module.css'

interface ApplyDialogProps {
  /** `${idPrefix}-title` / `${idPrefix}-subtitle` */
  idPrefix: string
  title: string
  subtitle: string
  onClose: () => void
  footer: ReactNode
  children: ReactNode
}

// Mentor Content 적용 Modal 공통 Shell (Plan Apply / Routine Apply).
// Native <dialog>의 showModal()로 배경 조작 차단 / ESC / 스크롤 잠금을 처리하고,
// 닫히면 열기 전 Focus(적용 버튼)로 돌려준다. 단계 / 선택 같은 Business State는 갖지 않는다.
export function ApplyDialog({ idPrefix, title, subtitle, onClose, footer, children }: ApplyDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    dialog?.showModal()
    root.style.overflow = 'hidden'
    return () => {
      if (dialog?.open) dialog.close()
      root.style.overflow = previousOverflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={`${idPrefix}-title`}
      aria-describedby={`${idPrefix}-subtitle`}
      onCancel={(event) => {
        // ESC: 아직 저장된 것이 없으므로 확인 없이 닫는다.
        event.preventDefault()
        onClose()
      }}
    >
      <div className={styles.surface}>
        <header className={styles.header}>
          <div>
            <h2 id={`${idPrefix}-title`} className={styles.title}>
              {title}
            </h2>
            <p id={`${idPrefix}-subtitle`} className={styles.subtitle}>
              {subtitle}
            </p>
          </div>
          <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        <footer className={styles.footer}>{footer}</footer>
      </div>
    </dialog>
  )
}
