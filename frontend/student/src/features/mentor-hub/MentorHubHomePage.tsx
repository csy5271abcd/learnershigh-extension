import { useState } from 'react'
import { MentorHubHomeSkeleton } from './components/MentorHubHomeSkeleton.tsx'
import { MentorHubRecommendView } from './components/MentorHubRecommendView.tsx'
import { MentorHubTabs } from './components/MentorHubTabs.tsx'
import { StudentContextSummary } from './components/StudentContextSummary.tsx'
import { mentorHubTabs, tabElementId, tabPanelElementId, type MentorHubTabId } from './model/tabs.ts'
import type { MentorContentSummary, MentorHubHome } from './model/types.ts'
import { useMentorHubHome } from './model/useMentorHubHome.ts'
import styles from './MentorHubHomePage.module.css'

interface MentorHubHomePageProps {
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 API Client로 교체한다. */
  loadHome: () => Promise<MentorHubHome>
  // Profile / Case / Content 화면과 Router가 아직 없어 연결하지 않는다. (호출 측에서 Navigation을 주입)
  onMentorSelect?: (mentorId: string) => void
  onCaseSelect?: (caseId: string) => void
  onContentSelect?: (content: MentorContentSummary) => void
}

export function MentorHubHomePage({ loadHome, onMentorSelect, onCaseSelect, onContentSelect }: MentorHubHomePageProps) {
  const [selectedTab, setSelectedTab] = useState<MentorHubTabId>('recommend')
  const { state, reload } = useMentorHubHome(loadHome)
  const selectedTabLabel = mentorHubTabs.find((tab) => tab.id === selectedTab)?.label

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Mentor</h1>
        <p className={styles.lead}>나와 비슷한 진로를 먼저 경험한 선배들의 공부와 활동 과정을 참고해보세요.</p>
        {state.status === 'success' && <StudentContextSummary context={state.data.studentContext} />}
        {state.status === 'loading' && <span className={styles.contextSkeleton} aria-hidden="true" />}
      </header>

      <MentorHubTabs selected={selectedTab} onSelect={setSelectedTab} />

      <div
        role="tabpanel"
        id={tabPanelElementId}
        aria-labelledby={tabElementId(selectedTab)}
        aria-busy={selectedTab === 'recommend' && state.status === 'loading'}
        className={styles.panel}
      >
        {selectedTab !== 'recommend' ? (
          <p className={styles.notice}>{selectedTabLabel} 화면은 아직 연결되지 않았어요.</p>
        ) : state.status === 'loading' ? (
          <>
            <p className="lh-visually-hidden" role="status">
              추천 Mentor를 불러오는 중이에요.
            </p>
            <MentorHubHomeSkeleton />
          </>
        ) : state.status === 'error' ? (
          <div className={styles.errorNotice} role="alert">
            <p className={styles.errorTitle}>추천 Mentor 정보를 불러오지 못했어요.</p>
            <p className={styles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
            <button type="button" className={styles.retryButton} onClick={reload}>
              다시 시도
            </button>
          </div>
        ) : (
          <MentorHubRecommendView
            home={state.data}
            onMentorSelect={onMentorSelect}
            onCaseSelect={onCaseSelect}
            onContentSelect={onContentSelect}
          />
        )}
      </div>
    </main>
  )
}
