import type { ReactNode } from 'react'
import styles from './SchoolLayout.module.css'

export type SchoolSectionId = 'tasks' | 'activities' | 'evidence' | 'archive' | 'interview'

interface SchoolSection {
  id: SchoolSectionId
  label: string
  /** 이 Branch에서 화면이 있는 Section만 이동한다. */
  available: boolean
  /** 고3 Student에게만 보인다. */
  senior?: boolean
}

// School 내부 구조 (School-admissions Spec / Tasks-00 Mockup): Tasks / Activities / Evidence / Archive (+ 고3 Interview)
const sections: SchoolSection[] = [
  { id: 'tasks', label: 'Tasks', available: true },
  { id: 'activities', label: 'Activities', available: false },
  { id: 'evidence', label: 'Evidence', available: true },
  { id: 'archive', label: 'Archive', available: false },
  { id: 'interview', label: 'Interview', available: false, senior: true },
]

interface SchoolLayoutProps {
  current: SchoolSectionId
  /** Student 학년 (예: 고2). Interview는 고3에게만 보인다. */
  studentGrade: string
  onSectionSelect: (id: SchoolSectionId) => void
  busy?: boolean
  /** School 제목 / 설명. Task Detail처럼 h1이 따로 있는 화면은 false (내부 Navigation Context만 유지) */
  showPageHeader?: boolean
  children: ReactNode
}

// School 화면 공통: Page 제목 + School 내부 Navigation.
// 아직 화면이 없는 Section은 비활성으로 두고 이유를 함께 알린다. (가짜 Page를 만들지 않는다)
export function SchoolLayout({
  current,
  studentGrade,
  onSectionSelect,
  busy = false,
  showPageHeader = true,
  children,
}: SchoolLayoutProps) {
  const visibleSections = sections.filter((section) => !section.senior || studentGrade === '고3')

  return (
    <main className={styles.page} aria-busy={busy}>
      {showPageHeader && (
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>School</h1>
          <p className={styles.lead}>수행평가를 단계별로 관리하고, 끝난 활동은 기록으로 모아요.</p>
        </header>
      )}

      <nav className={styles.bar} aria-label="School">
        <ul className={styles.list}>
          {visibleSections.map((section) => (
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
