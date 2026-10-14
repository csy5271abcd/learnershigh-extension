import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { SearchIcon, SidebarIcon } from './icons.tsx'
import styles from './Workspace.module.css'

export interface SidebarItem {
  key: string
  label: string
  to: string
  active: boolean
  count?: number
}

export interface SidebarSection {
  heading?: string
  items: SidebarItem[]
}

// 접기 상태는 보는 사람의 편의 설정이라 이 Browser의 localStorage에만 둔다. (저장 실패해도 화면은 동작)
const COLLAPSE_KEY = 'lh-mentor:sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    const stored = window.localStorage.getItem(COLLAPSE_KEY)
    if (stored !== null) return stored === '1'
  } catch {
    // 저장소를 못 쓰면 화면 폭으로 정한다.
  }
  // 고른 적이 없으면 Tablet 폭에서는 접어서 시작한다.
  return window.matchMedia('(max-width: 1023px)').matches
}

interface WorkspaceProps {
  /** Secondary Sidebar 제목 (nav 이름) */
  title: string
  sections: SidebarSection[]
  /** 상단 Search / Filter / Primary Action */
  toolbar?: ReactNode
  children: ReactNode
}

/**
 * Secondary Sidebar + Main Workspace. 목록 화면(내 콘텐츠 / 둘러보기 / Q&A)만 쓴다.
 * Desktop은 세로 Navigation, Tablet은 접을 수 있고, Mobile은 위쪽 가로 Navigation으로 바뀐다.
 */
export function Workspace({ title, sections, toolbar, children }: WorkspaceProps) {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const sidebarId = useId()

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
    } catch {
      // 무시
    }
  }

  return (
    <div className={styles.workspace} data-collapsed={collapsed}>
      <nav id={sidebarId} className={styles.sidebar} aria-label={title}>
        <div className={styles.sidebarHeader}>
          <p className={styles.sidebarTitle}>{title}</p>
          <button
            type="button"
            className={styles.iconButton}
            onClick={toggle}
            aria-label="사이드바 접기"
            aria-expanded={!collapsed}
            aria-controls={sidebarId}
          >
            <SidebarIcon />
          </button>
        </div>
        {sections.map((section, index) => (
          <div key={section.heading ?? index} className={styles.section}>
            {section.heading && <p className={styles.sectionHeading}>{section.heading}</p>}
            <ul className={styles.items}>
              {section.items.map((item) => (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    replace
                    preventScrollReset
                    className={`${styles.item} ${item.active ? styles.itemActive : ''}`}
                    aria-current={item.active ? 'page' : undefined}
                  >
                    <span className={styles.itemLabel}>{item.label}</span>
                    {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className={styles.content}>
        {(toolbar || collapsed) && (
          <div className={styles.toolbar}>
            {collapsed && (
              <button
                type="button"
                className={`${styles.iconButton} ${styles.expand}`}
                onClick={toggle}
                aria-label={`${title} 사이드바 펼치기`}
                aria-expanded={false}
                aria-controls={sidebarId}
              >
                <SidebarIcon />
              </button>
            )}
            {toolbar}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

/** 상단 검색창 (기능별 Placeholder) */
export function SearchField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div className={styles.search}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <SearchIcon />
      <input id={id} type="search" placeholder={label} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

/** Toolbar 오른쪽 끝으로 미는 빈 칸 */
export const ToolbarSpacer = () => <span className={styles.spacer} aria-hidden="true" />
