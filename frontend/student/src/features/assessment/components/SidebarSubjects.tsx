import { useId, useState, type ReactNode } from 'react'
import type { SubjectRef } from '../api/types.ts'
import { ChevronDownIcon, CloseIcon, PlusIcon, SearchIcon } from './AssessmentIcons.tsx'
import styles from '../routes/AssessmentLayout.module.css'

/** 과목이 이 수 이상이면 검색·접기를 보여준다. 그보다 적으면 기존 Sidebar 그대로 (2026-10-28 사용자 요청) */
const subjectToolsThreshold = 10

/** 기존 Sidebar의 과목 제목 id (목록의 aria-labelledby). Sidebar는 화면에 하나만 있다. */
const subjectGroupLabelId = 'assessment-subject-group'

interface SidebarSubjectsProps {
  subjects: SubjectRef[]
  /** 과목 행 하나 그리기 (기존 MenuLink 그대로) */
  renderSubject: (subject: SubjectRef) => ReactNode
  /** 과목 추가 Modal 열기 (2026-10-28). 없으면 "+" 버튼을 그리지 않는다 */
  onAddSubject?: () => void
}

const normalize = (value: string) => value.trim().toLocaleLowerCase('ko')

// Sidebar 과목 목록. 9개 이하는 기존 디자인 그대로, 10개 이상은 과목 검색·접기·펼치기를 더한다.
// 검색어·접힘은 화면 상태일 뿐 저장하지 않고, 수행평가 목록 검색·필터와 별개다.
// 과목 목록에 따로 스크롤을 만들지 않는다 (Sidebar 가운데 메뉴 영역 하나만 스크롤).
export function SidebarSubjects({ subjects, renderSubject, onAddSubject }: SidebarSubjectsProps) {
  const ids = { label: subjectGroupLabelId, region: useId(), search: useId() }
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(true)

  const addButton = onAddSubject && (
    <button type="button" className={styles.groupAdd} aria-label="과목 추가" title="과목 추가" onClick={onAddSubject}>
      <PlusIcon size={15} />
    </button>
  )

  if (subjects.length < subjectToolsThreshold) {
    return (
      <>
        {/* 기존 제목 위치(여백 21px)는 그대로 두고, "+"만 오른쪽에 겹쳐 놓는다 */}
        <div className={styles.groupLabelRow}>
          <p className={styles.groupLabel} id={ids.label}>
            과목
          </p>
          {addButton}
        </div>
        {subjects.length > 0 ? (
          <ul className={styles.menu} aria-labelledby={ids.label}>
            {subjects.map(renderSubject)}
          </ul>
        ) : (
          <p className={styles.groupEmpty}>등록된 과목이 없습니다.</p>
        )}
      </>
    )
  }

  const needle = normalize(query)
  const visible = needle ? subjects.filter((subject) => normalize(subject.name).includes(needle)) : subjects

  return (
    <>
      <div className={styles.groupHeader}>
        <p className={styles.groupHeaderLabel} id={ids.label}>
          과목
        </p>
        <span className={styles.groupTotal}>{subjects.length}개</span>
        {addButton}
        <button
          type="button"
          className={styles.groupToggle}
          aria-expanded={expanded}
          aria-controls={ids.region}
          aria-label={expanded ? '과목 목록 접기' : '과목 목록 펼치기'}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDownIcon size={16} className={styles.groupChevron} />
        </button>
      </div>
      {/* 접힌 동안에는 검색창과 과목 행을 그리지 않는다 (Tab 이동 대상에서 빠짐). 검색어는 그대로 둔다. */}
      <div id={ids.region} hidden={!expanded}>
        {expanded && (
          <>
            <label className={styles.subjectSearch} htmlFor={ids.search}>
              <SearchIcon size={15} className={styles.subjectSearchIcon} />
              <span className="lh-visually-hidden">과목 검색</span>
              <input
                id={ids.search}
                type="text"
                value={query}
                placeholder="과목 검색"
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && query && !event.nativeEvent.isComposing) {
                    event.stopPropagation()
                    setQuery('')
                  }
                }}
              />
              {query && (
                <button type="button" className={styles.subjectSearchClear} aria-label="과목 검색어 지우기" onClick={() => setQuery('')}>
                  <CloseIcon size={13} />
                </button>
              )}
            </label>
            {visible.length > 0 ? (
              <ul className={styles.menu} aria-labelledby={ids.label}>
                {visible.map(renderSubject)}
              </ul>
            ) : (
              <p className={styles.groupEmpty} role="status">
                일치하는 과목이 없습니다.
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}
