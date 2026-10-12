import { useEffect, useRef } from 'react'
import styles from './TaskLeaveDialog.module.css'

interface TaskLeaveDialogProps {
  onStay: () => void
  onLeave: () => void
}

// 작성 중인 내용이 있을 때 나가기 확인 (Native <dialog> showModal: 배경 조작 차단 / ESC / Focus 가두기).
// ESC는 "계속 작성"과 같다. 닫히면 열기 전 Focus로 돌려준다.
export function TaskLeaveDialog({ onStay, onLeave }: TaskLeaveDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const stayRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog?.showModal()
    stayRef.current?.focus()
    return () => {
      if (dialog?.open) dialog.close()
      previousFocus?.focus({ preventScroll: true })
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="task-leave-title"
      aria-describedby="task-leave-description"
      onCancel={(event) => {
        event.preventDefault()
        onStay()
      }}
    >
      <h2 id="task-leave-title" className={styles.title}>
        작성 중인 내용이 있어요.
      </h2>
      <p id="task-leave-description" className={styles.description}>
        지금 나가면 입력한 내용이 사라집니다.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={onLeave}>
          나가기
        </button>
        <button ref={stayRef} type="button" className={styles.primary} onClick={onStay}>
          계속 작성
        </button>
      </div>
    </dialog>
  )
}
