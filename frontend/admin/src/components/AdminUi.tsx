import { useEffect, useRef, type ReactNode } from 'react'
import styles from './AdminUi.module.css'

/* Admin Surface 공통 화면 조각 (Admin-local). Style은 AdminUi.module.css를 각 화면이 직접 import한다. */

export function LoadingState({ label }: { label: string }) {
  return (
    <>
      <p className="lh-visually-hidden" role="status">
        {label}
      </p>
      <div className={styles.skeleton} aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </>
  )
}

/** 연동 실패. 빈 데이터 문구와 다르다. 화면 영역만 덮고 Admin Shell은 그대로 둔다. */
export function ErrorState({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <section className={styles.notice} role="alert">
      <h2 className={styles.noticeTitle}>{title}</h2>
      <p>잠시 후 다시 시도해 주세요.</p>
      <button type="button" className={styles.secondaryButton} onClick={onRetry}>
        다시 시도
      </button>
    </section>
  )
}

export function NoticeState({ title, children, focus = false }: { title: string; children?: ReactNode; focus?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focus) ref.current?.focus({ preventScroll: true })
  }, [focus])
  return (
    <section className={styles.notice}>
      <h2 ref={ref} className={styles.noticeTitle} tabIndex={focus ? -1 : undefined}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export interface ChipOption {
  value: string
  label: string
}

/** Filter 선택 Group (role=group + 이름, 선택은 aria-pressed) */
export function ChipGroup({ label, value, options, onChange }: { label: string; value: string; options: ChipOption[]; onChange: (value: string) => void }) {
  return (
    <div className={styles.filterGroup} role="group" aria-label={label}>
      <span className={styles.filterLabel} aria-hidden="true">
        {label}
      </span>
      <div className={styles.segment}>
        {options.map((option) => (
          <button key={option.value} type="button" className={styles.segmentItem} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SearchBox({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className={styles.search}>
      <span className="lh-visually-hidden">{label}</span>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input type="search" value={value} placeholder={label} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function Kpi({ label, value, note, tone }: { label: string; value: ReactNode; note?: string; tone?: 'negative' | 'warning' }) {
  return (
    <div className={styles.kpi}>
      <dt className={styles.kpiLabel}>{label}</dt>
      <dd className={styles.kpiValue} data-tone={tone}>
        {value}
      </dd>
      {note && <dd className={styles.kpiNote}>{note}</dd>}
    </div>
  )
}

export type BadgeTone = 'negative' | 'warning' | 'accent' | 'solid' | undefined

export function Badge({ tone, children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={styles.badge} data-tone={tone}>
      {children}
    </span>
  )
}

/** 학교 기록 / 연결 상태처럼 화면마다 같은 의미로 보여야 하는 확인 Dialog (native dialog: Focus 가두기 · ESC 닫기) */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  pending = false,
  disabled = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  danger?: boolean
  pending?: boolean
  /** 확인 버튼을 막는다 (이유는 children 안에 보여준다) */
  disabled?: boolean
  error?: string | null
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <ModalDialog open={open} title={title} onClose={onClose} pending={pending}>
      {children}
      {error && (
        <p className={styles.errorText} role="alert">
          {error}
        </p>
      )}
      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={pending}>
          취소
        </button>
        <button type="button" className={danger ? styles.dangerButton : styles.primaryButton} onClick={onConfirm} disabled={pending || disabled} aria-busy={pending}>
          {pending ? '처리 중…' : confirmLabel}
        </button>
      </div>
    </ModalDialog>
  )
}

export function ModalDialog({ open, title, children, onClose, pending = false, wide = false }: { open: boolean; title: string; children: ReactNode; onClose: () => void; pending?: boolean; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-wide={wide || undefined}
      aria-labelledby="admin-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onClose()
      }}
    >
      {open && (
        <div className={styles.dialogBody}>
          <h2 id="admin-dialog-title" className={styles.subTitle}>
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  )
}

/** Plan 실행률 막대 + 숫자 (색 + 숫자 함께) */
export function Meter({ rate, low }: { rate: number; low: boolean }) {
  const percent = Math.round(rate * 100)
  return (
    <span className={styles.meter}>
      <span className={styles.text} data-tone={low ? 'negative' : undefined}>
        {percent}%
      </span>
      <span className={styles.meterBar} aria-hidden="true">
        <span className={styles.meterFill} data-tone={low ? 'negative' : undefined} style={{ width: `${percent}%` }} />
      </span>
    </span>
  )
}
