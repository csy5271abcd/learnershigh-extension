import type { ReactNode } from 'react'
import {
  mentorHubTabIdPrefix,
  mentorHubTabs,
  tabElementId,
  tabPanelElementId,
  type MentorHubTabId,
} from '../model/tabs.ts'
import styles from '../MentorHubHomePage.module.css'
import { UnderlineTabs } from './UnderlineTabs.tsx'

interface MentorHubLayoutProps {
  selectedTab: MentorHubTabId
  onTabSelect: (id: MentorHubTabId) => void
  /** 제목 아래 추가 정보 (예: 추천 Home의 Student Context) */
  headerExtra?: ReactNode
  busy?: boolean
  /** Main Tab 선택으로 이 화면에 들어온 경우 선택 Tab에 Focus를 돌려준다. (Keyboard 연속 이동) */
  focusTabOnMount?: boolean
  children: ReactNode
}

// Mentor Hub Main Tab 화면(추천 Home / Mentor List)이 함께 쓰는 Page 제목 + Main Tab + Tab Panel.
// Main Tab 선택은 Route 이동을 일으키므로 manual activation(화살표 = Focus 이동, Enter / Space = 선택)을 쓴다.
export function MentorHubLayout({
  selectedTab,
  onTabSelect,
  headerExtra,
  busy = false,
  focusTabOnMount = false,
  children,
}: MentorHubLayoutProps) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Mentor</h1>
        <p className={styles.lead}>나와 비슷한 진로를 먼저 경험한 선배들의 공부와 활동 과정을 참고해보세요.</p>
        {headerExtra}
      </header>

      <UnderlineTabs
        items={mentorHubTabs}
        selected={selectedTab}
        onSelect={onTabSelect}
        ariaLabel="Mentor Hub"
        idPrefix={mentorHubTabIdPrefix}
        panelId={tabPanelElementId}
        sticky
        activation="manual"
        focusSelectedOnMount={focusTabOnMount}
      />

      <div
        role="tabpanel"
        id={tabPanelElementId}
        aria-labelledby={tabElementId(selectedTab)}
        aria-busy={busy}
        className={styles.panel}
      >
        {children}
      </div>
    </main>
  )
}
