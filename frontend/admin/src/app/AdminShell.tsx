import type { ReactNode } from 'react'
import styles from './AdminShell.module.css'

export type AdminExtensionEntryId = 'today-board' | 'student-care' | 'feedback-dashboard' | 'mentor-cases' | 'connections' | 'interview' | 'operations' | 'assessment'

interface AdminExtensionEntry {
  id: AdminExtensionEntryId
  label: string
  isNew?: boolean
}

type MenuIconName = 'academy' | 'message' | 'student' | 'study' | 'coaching' | 'payment' | 'reward' | 'solution'

/**
 * 기존 LearnersHigh Admin Sidebar의 상위 메뉴 (references/existing-runners-high/screens/admin, docs/product/existing-runners-high-analysis.md §3-1).
 * 기존 기능이라 여기서 이동하지 않는다. 메뉴명은 기존 화면 분석 기준이다 (Claude Design AM 목업은 '학습조정' 자리를 '학습코칭'으로 그렸다 — 확인 필요).
 */
const existingMenus: { label: string; icon: MenuIconName }[] = [
  { label: '학원관리', icon: 'academy' },
  { label: '문자관리', icon: 'message' },
  { label: '학생관리', icon: 'student' },
  { label: '학습관리', icon: 'study' },
  { label: '학습조정', icon: 'coaching' },
  { label: '학원비결제', icon: 'payment' },
  { label: '리워드', icon: 'reward' },
  { label: '솔루션결제', icon: 'solution' },
]

/** 기존 "학습관리" 하위 메뉴 (Claude Design AM 목업 표기). 기존 LearnersHigh 기능이라 Extension에서 이동하지 않는다. */
const existingStudySubmenus = ['[지점]통합학습현황', '[학생]통합학습현황', '[그룹]학습계획관리', '[지점]순공티비', '[지점]레포트센터', '[공유]계획표탐색', '[지점]수행평가관리']

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
  // Suyeon 신규 Assessment 관리 (ADR-0008, AD-01). 기존 Entry는 그대로 두고 마지막에 하나만 더한다.
  { id: 'assessment', label: 'Assessment 관리', isNew: true },
]

interface AdminShellProps {
  /** 지금 화면이 속한 Extension Entry */
  current: AdminExtensionEntryId
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
// 기존 Admin 메뉴 · 계정 · 알림 · 문자잔고는 기존 LearnersHigh 소관이라 동작을 다시 만들지 않는다 (표시만, 수치를 지어내지 않는다).
export function AdminShell({ current, pageLabel, onEntrySelect, surface = 'plain', children }: AdminShellProps) {
  return (
    <div className={styles.shell}>
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
        <div className={styles.utilities} aria-label="계정·알림 (기존 LearnersHigh 기능)">
          <span className={styles.balance}>문자잔고 : 알 수 없음</span>
          <span className={styles.utilityIcon} title="알림 (기존 LearnersHigh 기능)">
            <BellIcon />
          </span>
          <span className={styles.utilityIcon} title="설정 (기존 LearnersHigh 기능)">
            <GearIcon />
          </span>
          <span className={styles.avatar} aria-hidden="true">
            <UserIcon />
          </span>
          <span className={styles.account}>관리자</span>
        </div>
      </header>

      <nav className={styles.sidebar} aria-label="Admin 메뉴">
        <ul className={styles.menu}>
          {existingMenus.map((menu) => {
            const open = menu.label === '학습관리'
            return (
              <li key={menu.label} className={styles.group}>
                <span className={styles.existing} data-open={open || undefined}>
                  <MenuIcon name={menu.icon} />
                  <span className={styles.groupLabel}>{menu.label}</span>
                  <Chevron up={open} />
                </span>
                {open && (
                  <ul className={styles.submenu} aria-label="학습관리 메뉴">
                    {existingStudySubmenus.map((label) => (
                      <li key={label}>
                        <span className={styles.existingSub}>{label}</span>
                      </li>
                    ))}
                    {extensionEntries.map((entry) => (
                      <li key={entry.id}>
                        <button type="button" className={styles.entry} aria-current={entry.id === current ? 'page' : undefined} onClick={() => onEntrySelect(entry.id)}>
                          {entry.label}
                          {entry.isNew && <span className={styles.newBadge}>NEW</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
        <div className={styles.sidebarFooter} aria-hidden="true">
          <span className={styles.manual}>
            <UserIcon />
            <span className={styles.manualDivider} />
            콘솔 이용 매뉴얼
          </span>
          <span className={styles.timerApp}>
            <TimerIcon />
            <span className={styles.manualDivider} />
            학습타이머앱,
            <br />
            이렇게 사용하세요!
          </span>
        </div>
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

const iconPaths: Record<MenuIconName, string> = {
  academy: 'M3 15h12M4 15V8l5-4 5 4v7M7.5 15v-4h3v4',
  message: 'M3 5h12v8H7l-3 2.5V13H3z',
  student: 'M9 9a3 3 0 100-6 3 3 0 000 6zM3.5 15.5c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5',
  study: 'M4 3h7l3 3v9H4zM11 3v3h3M6.5 9h5M6.5 12h3.5',
  coaching: 'M3 5h12M3 9h8M3 13h5M13 11l2 2-2 2',
  payment: 'M3 5h12v9H3zM3 8h12M6 11.5h3',
  reward: 'M9 2.5l1.8 3.9 4.2.5-3.1 2.9.8 4.2L9 11.9 5.3 14l.8-4.2L3 6.9l4.2-.5z',
  solution: 'M3 4h5v5H3zM10 4h5v5h-5zM3 11h5v4H3zM10 11h5v4h-5z',
}

function MenuIcon({ name }: { name: MenuIconName }) {
  return (
    <svg className={styles.menuIcon} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d={iconPaths[name]} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Chevron({ up }: { up: boolean }) {
  return (
    <svg className={styles.chevron} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d={up ? 'M3.5 8.5L7 5l3.5 3.5' : 'M3.5 5.5L7 9l3.5-3.5'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M4 16h14l-1.5-2V9.5a5.5 5.5 0 10-11 0V14z M9 18.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="2.8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9.6 3h2.8l.4 2.1 1.6.9 2-.8 1.4 2.4-1.6 1.4v1.9l1.6 1.4-1.4 2.4-2-.8-1.6.9-.4 2.1H9.6l-.4-2.1-1.6-.9-2 .8-1.4-2.4 1.6-1.4V9.1L4.2 7.7l1.4-2.4 2 .8 1.6-.9z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 15.5c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function TimerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="10" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 7v3.2l2 1.3M7 2.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
