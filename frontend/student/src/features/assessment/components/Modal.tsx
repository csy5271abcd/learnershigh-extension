import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { CloseIcon } from './AssessmentIcons.tsx'
import styles from './Modal.module.css'

interface ModalProps {
  title: string
  /** 화면에는 보이지 않는 Dialog 설명 (Screen Reader용) */
  description?: string
  /** 템플릿 선택처럼 두 영역을 나란히 보여주는 넓은 Modal (Mockup SN-TEMPLATE-01: 약 870px) */
  wide?: boolean
  /** 닫기 요청 (Esc, 닫기 버튼, 배경 클릭). 미저장 확인은 호출 측이 결정한다. */
  onRequestClose: () => void
  children: ReactNode
  footer: ReactNode
  initialFocusRef?: RefObject<HTMLElement | null>
}

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Assessment Feature 전용 Modal. Focus를 Modal 안에 가두고, 닫히면 열기 전 위치로 돌려준다.
export function Modal({ title, description, wide = false, onRequestClose, children, footer, initialFocusRef }: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onRequestClose)
  useEffect(() => {
    closeRef.current = onRequestClose
  })

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ;(initialFocusRef?.current ?? dialogRef.current)?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [initialFocusRef])

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current()
      }}
    >
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${wide ? styles.dialogWide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} aria-label="닫기" onClick={() => closeRef.current()}>
            <CloseIcon size={22} />
          </button>
        </header>
        {description && (
          <p id={descriptionId} className="lh-visually-hidden">
            {description}
          </p>
        )}
        <div className={styles.body}>{children}</div>
        <footer className={styles.footer}>{footer}</footer>
      </div>
    </div>
  )
}
