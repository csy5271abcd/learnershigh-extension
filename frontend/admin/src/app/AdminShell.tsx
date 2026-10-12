import type { ReactNode } from 'react'
import styles from './AdminShell.module.css'

/** 기존 LearnersHigh Admin Sidebar의 상위 메뉴 (references/existing-runners-high/screens/admin, FeedbackDashboard-00). 기존 기능이라 여기서 이동하지 않는다. */
const existingMenus = ['학원관리', '문자관리', '학생관리', '학습관리', '학습조정', '학원비결제', '리워드', '솔루션결제'] as const

export type AdminExtensionEntryId = 'feedback-dashboard'

interface AdminExtensionEntry {
  id: AdminExtensionEntryId | 'today-board'
  label: string
  /** 이 Branch에서 화면이 있는 Entry만 이동한다. */
  available: boolean
}

// 기존 "학습관리" 아래에 붙는 Extension Entry (Integration Boundary §22: 기존 Sidebar Context 안에 연결)
const extensionEntries: AdminExtensionEntry[] = [
  { id: 'today-board', label: 'Today Board', available: false },
  { id: 'feedback-dashboard', label: 'Feedback Dashboard', available: true },
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
    <div className={styles.shell}>
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
                      {entry.available ? (
                        <button
                          type="button"
                          className={styles.entry}
                          aria-current={entry.id === current ? 'page' : undefined}
                          onClick={() => onEntrySelect(entry.id as AdminExtensionEntryId)}
                        >
                          {entry.label}
                        </button>
                      ) : (
                        <button type="button" className={styles.entry} disabled title={`${entry.label} 화면은 준비 중이에요`}>
                          {entry.label}
                          <span className="lh-visually-hidden"> (준비 중)</span>
                        </button>
                      )}
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
