import type { ReactNode } from 'react'
import styles from './AdminShell.module.css'

export type AdminExtensionEntryId = 'student-care' | 'parent-report' | 'assessment'

interface AdminExtensionEntry {
  id: AdminExtensionEntryId
  label: string
  /** 같은 Feature 안의 하위 화면이면 그 Feature 이름 (학부모 리포트 → 학생 케어) */
  partOf?: string
  isNew?: boolean
}

// Extension이 실제로 제공하는 관리 화면만 둔다(2026-11-16, A22).
// 예전에는 기존 LearnersHigh Sidebar(학원관리·문자관리 … 솔루션결제, 학습관리 하위 7개)·문자잔고·알림·설정·콘솔 매뉴얼을 클릭되지 않는 표시로 흉내 냈지만,
// 실제로 동작하는 기능처럼 보여 제거했다. 기존 PHP 서비스의 실제 메뉴는 이 앱이 바꾸지 않는다(Integration Boundary §22: 기존 '학습관리' 아래에 연결).
// 학생 케어(Wangyu, docs/specs/wangyu/features/student-care.md) · 학부모 리포트(학생 케어 소속) · Assessment 관리(Suyeon, ADR-0008).
const extensionEntries: AdminExtensionEntry[] = [
  { id: 'student-care', label: '학생 케어' },
  { id: 'parent-report', label: '학부모 리포트', partOf: '학생 케어' },
  { id: 'assessment', label: 'Assessment 관리', isNew: true },
]

interface AdminShellProps {
  /** 지금 화면이 속한 Extension Entry (페이지 없음 = null) */
  current: AdminExtensionEntryId | null
  /** Header 제목·Breadcrumb 마지막 항목 */
  pageLabel: string
  onEntrySelect: (id: AdminExtensionEntryId) => void
  /**
   * 본문 바탕. 'canvas'는 Claude Design AM 목업처럼 연한 회색 바탕 위에 흰 작업 영역을 올린다 (Assessment 관리).
   * 기본값은 기존 흰 바탕 그대로 — 학생 케어 등 다른 화면의 본문 배경은 바꾸지 않는다.
   */
  surface?: 'plain' | 'canvas'
  children: ReactNode
}

// Admin Extension 공통 Shell (Claude Design LearnersHighAssessment Admin 목업 AM-01~20의 Shell 기준, 2026-10-29).
// 진한 Sidebar + 흰 Header(페이지 제목·Breadcrumb·계정 영역) + 본문.
// 기존 Admin 메뉴 · 계정 · 알림 · 문자잔고는 기존 LearnersHigh 소관이라 이 앱에 그리지 않는다.
export function AdminShell({ current, pageLabel, onEntrySelect, surface = 'plain', children }: AdminShellProps) {
  return (
    <div className={styles.shell} data-care-theme={current === 'student-care' ? true : undefined}>
      <a className={styles.skip} href="#admin-main">
        본문으로 건너뛰기
      </a>
      <header className={styles.header}>
        <p className={styles.brand}>
          <LogoMark />
          <span className={styles.brandText}>
            LEARNERS
            <br />
            HIGH
          </span>
          <span className={styles.brandAdmin}>ADMIN.</span>
        </p>
        <div className={styles.location}>
          <h1 className={styles.pageTitle}>{pageLabel}</h1>
          <p className={styles.breadcrumb}>
            학습관리 <span aria-hidden="true">-</span>
            <span className="lh-visually-hidden">, </span> {pageLabel}
          </p>
        </div>
      </header>

      <nav className={styles.sidebar} aria-label="Admin 메뉴">
        <ul className={styles.menu}>
          <li className={styles.group}>
            <span className={styles.existing} id="admin-extension-menu">
              <MenuIcon />
              <span className={styles.groupLabel}>학습관리 확장</span>
            </span>
            <ul className={styles.submenu} aria-labelledby="admin-extension-menu">
              {extensionEntries.map((entry) => (
                <li key={entry.id}>
                  <button type="button" className={styles.entry} data-child={entry.partOf ? true : undefined} aria-current={entry.id === current ? 'page' : undefined} onClick={() => onEntrySelect(entry.id)}>
                    {entry.label}
                    {entry.partOf && <span className={styles.partOf}>{entry.partOf}</span>}
                    {entry.isNew && <span className={styles.newBadge}>NEW</span>}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>

      <main id="admin-main" className={styles.main} data-surface={surface} tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}

// ── Shell 아이콘 (단색 선, currentColor) ─────────────────────────

function LogoMark() {
  return (
    <svg className={styles.logoMark} width="26" height="20" viewBox="0 0 26 20" fill="none" aria-hidden="true">
      <path d="M2 4v12h8" stroke="#12a5f4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 11l5-5 4 4 6-7" stroke="#1d3c6e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** '학습관리 확장' 제목 아이콘 (문서) */
function MenuIcon() {
  return (
    <svg className={styles.menuIcon} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 3h7l3 3v9H4zM11 3v3h3M6.5 9h5M6.5 12h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
