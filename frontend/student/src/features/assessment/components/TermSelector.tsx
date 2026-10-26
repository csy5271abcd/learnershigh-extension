import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import type { AcademicTermQuery } from '../api/types.ts'
import { isSameTerm, termKey, termLabel } from '../model/academicTerm.ts'
import type { AcademicTerms } from '../model/assessmentWorkspace.ts'
import type { QueryResult } from '../model/useApiQuery.ts'
import { academicInfoPath } from '../routes/paths.ts'
import { CapIcon, CheckIcon, ChevronUpDownIcon, SettingsIcon } from './AssessmentIcons.tsx'
import styles from './TermSelector.module.css'

interface TermSelectorProps {
  terms: QueryResult<AcademicTerms>
  selectedTerm: AcademicTermQuery | undefined
  onSelect: (term: AcademicTermQuery) => void
  onNavigate?: () => void
}

// Sidebar 상단 학교·학기 선택 (Mockup SAI-02 학기 선택 Dropdown). 학기 선택은 조회 필터다.
export function TermSelector({ terms, selectedTerm, onSelect, onNavigate }: TermSelectorProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"], [role="menuitemradio"]')?.focus()
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])
    const index = items.indexOf(document.activeElement as HTMLElement)
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1
    items[(next + items.length) % items.length]?.focus()
  }

  const selected = terms.data?.contexts.find((context) => selectedTerm && isSameTerm(context, selectedTerm))

  if (terms.status === 'error') {
    return (
      <div className={styles.trigger} data-state="error">
        <CapIcon className={styles.icon} />
        <span className={styles.text}>
          <span className={styles.school}>학업 정보 없음</span>
          <span className={styles.term}>불러오지 못했어요</span>
        </span>
      </div>
    )
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={!selected}
        onClick={() => setOpen((value) => !value)}
      >
        <CapIcon className={styles.icon} />
        <span className={styles.text}>
          <span className={styles.school}>{selected?.school.name ?? '학업 정보 확인 중'}</span>
          <span className={styles.term}>{selected ? termLabel(selected) : ' '}</span>
        </span>
        <ChevronUpDownIcon className={styles.chevron} size={16} />
        <span className="lh-visually-hidden">학기 선택 열기</span>
      </button>

      {open && terms.data && (
        <div ref={menuRef} id={menuId} className={styles.menu} role="menu" aria-label="학기 선택" onKeyDown={onMenuKeyDown}>
          <p className={styles.menuLabel} aria-hidden="true">
            학기 선택
          </p>
          {terms.data.contexts.map((context) => {
            const checked = selectedTerm !== undefined && isSameTerm(context, selectedTerm)
            return (
              <button
                key={termKey(context)}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                className={styles.option}
                onClick={() => {
                  onSelect({ academicYear: context.academicYear, semester: context.semester })
                  close(true)
                }}
              >
                <span>{termLabel(context)}</span>
                {checked && <CheckIcon className={styles.check} size={16} />}
              </button>
            )
          })}
          {terms.data.failedTerms.map((term) => (
            <p key={termKey(term)} className={styles.optionUnavailable}>
              {term.academicYear}학년도 {term.semester}학기 · 불러오지 못함
            </p>
          ))}
          <hr className={styles.divider} />
          <Link
            to={academicInfoPath}
            role="menuitem"
            className={styles.option}
            onClick={() => {
              setOpen(false)
              onNavigate?.()
            }}
          >
            <span className={styles.manage}>
              <SettingsIcon size={16} />
              학교·학업 정보 관리
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}
