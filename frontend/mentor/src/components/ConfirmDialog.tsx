import { useEffect, useRef, type ReactNode } from 'react'
import styles from './ConfirmDialog.module.css'
import ui from './ui.module.css'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 확인 Dialog. Native <dialog>의 showModal()로 Focus 가두기 / Esc 닫기 / 배경 비활성을 브라우저에 맡긴다.
 * 닫히면 열기 전 Focus 위치로 돌아간다.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = '취소',
  tone = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      const previous = document.activeElement as HTMLElement | null
      dialog.showModal()
      return () => previous?.focus({ preventScroll: true })
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      {open && (
        <div className={styles.body}>
          <h2 id="confirm-dialog-title" className={styles.title}>
            {title}
          </h2>
          <div className={styles.content}>{children}</div>
          <div className={styles.actions}>
            <button type="button" className={`${ui.button} ${ui.neutral}`} onClick={onCancel}>
              {cancelLabel}
            </button>
            <button type="button" className={`${ui.button} ${tone === 'danger' ? ui.danger : ui.primary}`} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
