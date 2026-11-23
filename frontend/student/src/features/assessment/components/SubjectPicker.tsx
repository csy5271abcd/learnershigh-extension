import { useId, useMemo, useRef, useState } from 'react'
import type { AcademicContext } from '../api/types.ts'
import { courseCandidatesFor, matchesQuery, searchKey } from '../model/courseCatalog.ts'
import { ChevronDownIcon } from './AssessmentIcons.tsx'
import styles from './subjectPicker.module.css'

// A27-UX 학생 수행평가 추가 — 검색형 과목 선택 (2026-11-19, api-contract §12-a DRAFT).
// - 위: 내 수강 과목(사이드바 과목). 아래: 현재 학년에 맞는 고등학교 과목 후보(범용 카탈로그 + 이 학기 공통 과목). 후보에는 과목명만 보인다(학교명·출처 없음).
// - 후보를 고르면 저장할 때 서버가 같은 트랜잭션에서 내 과목 목록에 더한다(학교 공식 목록은 바꾸지 않는다). 같은 이름은 서버가 기존 과목을 다시 쓴다.
// - 목록에 없는 과목은 입력한 이름 그대로 '직접 추가'할 수 있다(선택 과목 범위를 닫힌 목록으로 보지 않는다).
// - 키보드: ↑/↓ 이동, Enter 선택, Esc 닫기.

export type SubjectChoice = { kind: 'enrolled'; subjectId: string; name: string } | { kind: 'new'; name: string }

interface Option {
  key: string
  name: string
  group: 'enrolled' | 'candidate' | 'typed'
  choice: SubjectChoice
}

export function SubjectPicker({
  context,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
}: {
  context: AcademicContext
  value: SubjectChoice | null
  onChange: (choice: SubjectChoice | null) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const options = useMemo<Option[]>(() => {
    const enrolledKeys = new Set(context.subjects.map((subject) => searchKey(subject.name)))
    const enrolled: Option[] = context.subjects.map((subject) => ({
      key: `e:${subject.subjectId}`,
      name: subject.name,
      group: 'enrolled',
      choice: { kind: 'enrolled', subjectId: subject.subjectId, name: subject.name },
    }))
    const seen = new Set(enrolledKeys)
    const candidates: Option[] = []
    const addCandidate = (name: string) => {
      const key = searchKey(name)
      if (!key || seen.has(key)) return
      seen.add(key)
      candidates.push({ key: `c:${key}`, name, group: 'candidate', choice: { kind: 'new', name } })
    }
    for (const subject of context.catalogSubjects ?? []) if (!subject.enrolled) addCandidate(subject.name)
    for (const candidate of courseCandidatesFor(context.grade)) addCandidate(candidate.name)
    return [...enrolled, ...candidates]
  }, [context])

  const trimmed = query.trim()
  const filtered = options.filter((option) => matchesQuery(trimmed, [option.name]))
  const exact = trimmed !== '' && options.some((option) => searchKey(option.name) === searchKey(trimmed))
  const typed: Option[] =
    trimmed !== '' && !exact && trimmed.length <= 50 ? [{ key: 'typed', name: trimmed, group: 'typed', choice: { kind: 'new', name: trimmed } }] : []
  const visible = [...filtered, ...typed]

  const close = () => {
    setOpen(false)
    setQuery('')
  }
  const choose = (option: Option) => {
    onChange(option.choice)
    close()
  }
  const openList = () => {
    if (disabled) return
    setOpen(true)
    setActive(0)
  }

  const display = value ? value.name : ''
  const groupLabel = (group: Option['group']) =>
    group === 'enrolled' ? '내 수강 과목' : group === 'candidate' ? `${context.grade}학년 과목 · 고르면 내 과목에 추가돼요` : '직접 입력'

  return (
    <div className={styles.root} data-testid="subject-picker">
      <div className={styles.field} data-invalid={invalid || undefined} data-open={open || undefined}>
        <input
          ref={inputRef}
          className={styles.input}
          role="combobox"
          aria-label="과목"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-activedescendant={open && visible[active] ? `${listId}-${active}` : undefined}
          placeholder={value ? value.name : '과목명으로 찾기'}
          value={open ? query : display}
          disabled={disabled}
          onFocus={openList}
          onClick={openList}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActive(0)
          }}
          onBlur={() => window.setTimeout(close, 120)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              if (!open) openList()
              setActive((index) => Math.min(index + 1, Math.max(visible.length - 1, 0)))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((index) => Math.max(index - 1, 0))
            } else if (event.key === 'Enter') {
              if (!open) return
              event.preventDefault()
              if (visible[active]) choose(visible[active])
            } else if (event.key === 'Escape' && open) {
              event.preventDefault()
              event.stopPropagation()
              close()
            }
          }}
          data-testid="subject-picker-input"
        />
        <ChevronDownIcon size={16} className={styles.chevron} />
      </div>
      {value?.kind === 'new' && !open && (
        <p className={styles.note} data-testid="subject-picker-new-note">
          &lsquo;{value.name}&rsquo;은(는) 저장할 때 내 과목 목록에도 추가돼요.
        </p>
      )}
      {open && (
        <ul id={listId} role="listbox" aria-label="과목 후보" className={styles.list}>
          {visible.length === 0 ? (
            <li className={styles.empty}>맞는 과목이 없어요</li>
          ) : (
            visible.map((option, index) => (
              <li key={option.key} role="presentation">
                {(index === 0 || visible[index - 1].group !== option.group) && <p className={styles.groupLabel}>{groupLabel(option.group)}</p>}
                <div
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={value?.name === option.name}
                  data-active={index === active || undefined}
                  className={styles.option}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    choose(option)
                  }}
                  onMouseEnter={() => setActive(index)}
                  data-testid={option.group === 'enrolled' ? 'subject-option-enrolled' : option.group === 'candidate' ? 'subject-option-candidate' : 'subject-option-typed'}
                >
                  {option.group === 'typed' ? <>&lsquo;{option.name}&rsquo; 과목으로 추가</> : option.name}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
