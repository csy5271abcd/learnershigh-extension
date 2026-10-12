import type { ReactNode } from 'react'
import styles from './SchoolLayout.module.css'

export type SchoolSectionId = 'tasks' | 'activities' | 'evidence' | 'archive'

interface SchoolSection {
  id: SchoolSectionId
  label: string
  /** 이 Branch에서 화면이 있는 Section만 이동한다. */
  available: boolean
}

// School 1차 Navigation (School-admissions Spec / Tasks-00 Mockup): 학년과 관계없이 Tasks / Activities / Evidence / Archive 4개.
// Interview(고3)는 1차 Navigation이 아니라 Archive의 "면접 준비" 진입점으로 들어간다.
const sections: SchoolSection[] = [
  { id: 'tasks', label: 'Tasks', available: true },
  { id: 'activities', label: 'Activities', available: true },
  { id: 'evidence', label: 'Evidence', available: true },
  { id: 'archive', label: 'Archive', available: true },
]

/**
 * level
 * - hub(기본): 목록 / 허브 화면. School 제목 · 설명 + School 1차 Navigation을 그린다.
 * - detail: Task / Activity / 면접 질문 상세. 제목 · 1차 Navigation을 그리지 않는다. (상세는 돌아가기 + 자기 제목 + 자기 Navigation만)
 */
type SchoolLayoutProps =
  | {
      level?: 'hub'
      current: SchoolSectionId
      onSectionSelect: (id: SchoolSectionId) => void
      busy?: boolean
      children: ReactNode
    }
  | {
      level: 'detail'
      busy?: boolean
      children: ReactNode
    }

// School 화면 공통 Container. 목록 / 허브 화면만 Page 제목 + School 1차 Navigation을 가진다.
// 아직 화면이 없는 Section은 비활성으로 두고 이유를 함께 알린다. (가짜 Page를 만들지 않는다)
export function SchoolLayout(props: SchoolLayoutProps) {
  const { busy = false, children } = props
  if (props.level === 'detail') {
    return (
      <main className={styles.page} data-level="detail" aria-busy={busy}>
        {children}
      </main>
    )
  }

  const { current, onSectionSelect } = props

  return (
    <main className={styles.page} data-level="hub" aria-busy={busy}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>School</h1>
        <p className={styles.lead}>수행평가를 단계별로 관리받고, 대회·동아리·프로젝트·자율 탐구 등의 학교 활동을 기록해요.</p>
      </header>

      <nav className={styles.bar} aria-label="School">
        <ul className={styles.list}>
          {sections.map((section) => (
            <li key={section.id}>
              {section.available ? (
                <button
                  type="button"
                  className={styles.item}
                  aria-current={section.id === current ? 'page' : undefined}
                  onClick={() => onSectionSelect(section.id)}
                >
                  {section.label}
                </button>
              ) : (
                <button type="button" className={styles.item} disabled title={`${section.label} 화면은 준비 중이에요`}>
                  {section.label}
                  <span className="lh-visually-hidden"> (준비 중)</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.content}>{children}</div>
    </main>
  )
}
