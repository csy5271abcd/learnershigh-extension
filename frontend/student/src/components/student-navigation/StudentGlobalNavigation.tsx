import { useLayoutEffect, useRef } from 'react'
import { CheckoutIcon, MessageIcon, SettingsIcon } from './NavigationIcons.tsx'
import styles from './StudentGlobalNavigation.module.css'
import { studentNavigationItems, type StudentNavigationItemId } from './studentNavigationItems.ts'

interface StudentGlobalNavigationProps {
  activeItem: StudentNavigationItemId
  userDisplayName: string
  /** Router / 기존 Route가 확정되면 호출 측에서 Navigation을 연결한다. */
  onItemSelect?: (id: StudentNavigationItemId) => void
}

// 기존 LearnersHigh Student 상단 Header Context(Existing Visual)를 재현한 Student Surface Shell.
// 기존 기능 화면 / Route / 로그인·퇴실·설정·메시지 기능은 구현하지 않는다.
export function StudentGlobalNavigation({ activeItem, userDisplayName, onItemSelect }: StudentGlobalNavigationProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  // 좁은 화면에서 메뉴가 가로 스크롤될 때 현재 메뉴가 보이도록 한다. (Page 세로 스크롤은 건드리지 않는다)
  useLayoutEffect(() => {
    const list = listRef.current
    const active = activeRef.current
    if (!list || !active || list.scrollWidth <= list.clientWidth) return
    list.scrollLeft = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2
  }, [activeItem])

  return (
    <header className={styles.header}>
      <p className={styles.brand}>LearnersHigh</p>

      <nav className={styles.nav} aria-label="Student global navigation">
        <ul ref={listRef} className={styles.list}>
          {studentNavigationItems.map((item) => {
            const isActive = item.id === activeItem
            const Icon = item.icon
            return (
              <li key={item.id} className={item.extension ? styles.extensionItem : undefined}>
                <button
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  className={`${styles.item} ${item.extension ? styles.extension : ''}`}
                  aria-label={item.extension ? undefined : item.label}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                  onClick={() => onItemSelect?.(item.id)}
                >
                  <Icon className={styles.icon} />
                  {item.extension && <span className={styles.label}>{item.label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className={styles.user}>
        <button type="button" className={styles.userButton} aria-label="메시지" title="메시지">
          <MessageIcon className={styles.icon} />
        </button>
        <span className={styles.userName}>{userDisplayName}</span>
        <button type="button" className={styles.userButton} aria-label="설정" title="설정">
          <SettingsIcon className={styles.icon} />
        </button>
        <button type="button" className={`${styles.userButton} ${styles.checkout}`} aria-label="퇴실" title="퇴실">
          <span className={styles.checkoutLabel}>퇴실</span>
          <CheckoutIcon className={styles.icon} />
        </button>
      </div>
    </header>
  )
}
