import type { ReactNode } from 'react'
import styles from './AdminShell.module.css'

/** 기존 LearnersHigh Admin Sidebar의 상위 메뉴 (references/existing-runners-high/screens/admin, FeedbackDashboard-00). 기존 기능이라 여기서 이동하지 않는다. */
const existingMenus = ['학원관리', '문자관리', '학생관리', '학습관리', '학습조정', '학원비결제', '리워드', '솔루션결제'] as const

export type AdminExtensionEntryId = 'today-board' | 'student-care' | 'feedback-dashboard' | 'mentor-cases' | 'connections' | 'interview' | 'operations'

interface AdminExtensionEntry {
  id: AdminExtensionEntryId
  label: string
}

// 기존 "학습관리" 아래에 붙는 Extension Entry (Integration Boundary §22: 기존 Sidebar Context 안에 연결)
// 상담 관련 Entry는 Wangyu 담당 영역이라 두지 않는다. Student 360은 Today Board · Queue에서 학생을 골라 들어간다. (별도 학생 목록 Mockup 없음)
// 학생 케어(Wangyu, docs/specs/wangyu/features/student-care.md "학습관리 › [지점]학생 케어")는 Today Board 다음에 둔다.
// (둘 다 관리가 필요한 학생을 찾는 화면. 메뉴 이름은 지점 선택이 화면 안에 있으므로 "학생 케어")
const extensionEntries: AdminExtensionEntry[] = [
  { id: 'today-board', label: 'Today Board' },
  { id: 'student-care', label: '학생 케어' },
  { id: 'feedback-dashboard', label: 'Feedback Dashboard' },
  { id: 'mentor-cases', label: 'Mentor 추천' },
  { id: 'connections', label: 'Connection 검토' },
  { id: 'interview', label: 'Interview 관리' },
  { id: 'operations', label: 'Operations' },
]

interface AdminShellProps {
  /** 지금 화면이 속한 Extension Entry */
  current: AdminExtensionEntryId
  /** Header Breadcrumb 마지막 항목 */
  pageLabel: string
  onEntrySelect: (id: AdminExtensionEntryId) => void
  children: ReactNode
}

// Admin Extension 공통 Shell: 기존 Admin Sidebar Context + Header(위치) + 본문.
// 기존 Admin 메뉴 · 계정 · Theme · 문자잔고는 기존 LearnersHigh 소관이라 다시 만들지 않는다.
export function AdminShell({ current, pageLabel, onEntrySelect, children }: AdminShellProps) {
  return (
    <div className={styles.shell} data-care-theme={current.startsWith('student-care') ? true : undefined}>
      <a className={styles.skip} href="#admin-main">
        본문으로 건너뛰기
      </a>
      <header className={styles.header}>
        <p className={styles.brand}>
          LEARNERS HIGH <span>ADMIN</span>
        </p>
        <div className={styles.location}>
          <p className={styles.section}>학습관리</p>
          <p className={styles.breadcrumb}>
            학습관리 <span aria-hidden="true">›</span>
            <span className="lh-visually-hidden">, </span> {pageLabel}
          </p>
        </div>
      </header>

      <nav className={styles.sidebar} aria-label="Admin 메뉴">
        <ul className={styles.menu}>
          {existingMenus.map((menu) => (
            <li key={menu}>
              <span className={styles.existing}>{menu}</span>
              {menu === '학습관리' && (
                <ul className={styles.submenu} aria-label="학습관리 확장 기능">
                  {extensionEntries.map((entry) => (
                    <li key={entry.id}>
                      <button type="button" className={styles.entry} aria-current={entry.id === current ? 'page' : undefined} onClick={() => onEntrySelect(entry.id)}>
                        {entry.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <main id="admin-main" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
