import { MentorHubHomeSkeleton } from './components/MentorHubHomeSkeleton.tsx'
import { MentorHubLayout } from './components/MentorHubLayout.tsx'
import { MentorHubRecommendView } from './components/MentorHubRecommendView.tsx'
import { StudentContextSummary } from './components/StudentContextSummary.tsx'
import { mentorHubTabs, type MentorHubTabId } from './model/tabs.ts'
import type { MentorContentSummary, MentorHubHome } from './model/types.ts'
import { useMentorHubHome } from './model/useMentorHubHome.ts'
import styles from './MentorHubHomePage.module.css'

interface MentorHubHomePageProps {
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 API Client로 교체한다. */
  loadHome: () => Promise<MentorHubHome>
  /** 선택 Tab은 호출 측(Route)이 소유해 Detail 왕복 후에도 유지한다. ('멘토' Tab은 Mentor List Route) */
  selectedTab: MentorHubTabId
  onTabSelect: (id: MentorHubTabId) => void
  focusTabOnMount?: boolean
  onMentorSelect?: (mentorId: string) => void
  // Case / Content Detail 화면은 아직 없어 호출 측에서 연결하지 않는다.
  onCaseSelect?: (caseId: string) => void
  onContentSelect?: (content: MentorContentSummary) => void
}

export function MentorHubHomePage({
  loadHome,
  selectedTab,
  onTabSelect,
  focusTabOnMount,
  onMentorSelect,
  onCaseSelect,
  onContentSelect,
}: MentorHubHomePageProps) {
  const { state, reload } = useMentorHubHome(loadHome)
  const selectedTabLabel = mentorHubTabs.find((tab) => tab.id === selectedTab)?.label

  return (
    <MentorHubLayout
      selectedTab={selectedTab}
      onTabSelect={onTabSelect}
      focusTabOnMount={focusTabOnMount}
      busy={selectedTab === 'recommend' && state.status === 'loading'}
      headerExtra={
        <>
          {state.status === 'success' && <StudentContextSummary context={state.data.studentContext} />}
          {state.status === 'loading' && <span className={styles.contextSkeleton} aria-hidden="true" />}
        </>
      }
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
    </MentorHubLayout>
  )
}
