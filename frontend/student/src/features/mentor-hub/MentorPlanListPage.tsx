import { MentorContentCard } from './components/MentorContentCard.tsx'
import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
import { MentorHubLayout } from './components/MentorHubLayout.tsx'
import type { MentorHubTabId } from './model/tabs.ts'
import type { MentorContentSummary, MentorPlanListResult } from './model/types.ts'
import { useMentorPlanList } from './model/useMentorPlanList.ts'
import styles from './MentorHubHomePage.module.css'
import listStyles from './MentorPlanListPage.module.css'

/** Mentor List와 같은 한 Page 크기 */
export const MENTOR_PLAN_LIST_PAGE_SIZE = 24

interface MentorPlanListPageProps {
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentor-content?type=plan. */
  loadList: (page: number, size: number) => Promise<MentorPlanListResult>
  onTabSelect: (id: MentorHubTabId) => void
  focusTabOnMount?: boolean
  onPlanSelect: (content: MentorContentSummary) => void
}

// Mentor Hub Main "Plan" Tab (Plan-00 Mockup): Plan Card Grid → Plan Detail
export function MentorPlanListPage({ loadList, onTabSelect, focusTabOnMount, onPlanSelect }: MentorPlanListPageProps) {
  const { state, reload } = useMentorPlanList(loadList, 0, MENTOR_PLAN_LIST_PAGE_SIZE)

  return (
    <MentorHubLayout
      selectedTab="plan"
      onTabSelect={onTabSelect}
      focusTabOnMount={focusTabOnMount}
      busy={state.status === 'loading'}
    >
      <section className={listStyles.list} aria-labelledby="mentor-plan-list-heading">
        <h2 id="mentor-plan-list-heading" className={styles.sectionTitle}>
          {state.status === 'success' ? `Plan ${state.data.page.totalElements}개` : 'Plan'}
        </h2>

        {state.status === 'loading' && (
          <>
            <p className="lh-visually-hidden" role="status">
              Plan 목록을 불러오는 중이에요.
            </p>
            <div className={styles.grid} aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} className={`${skeletonStyles.block} ${listStyles.cardSkeleton}`} />
              ))}
            </div>
          </>
        )}

        {state.status === 'error' && (
          <div className={styles.errorNotice} role="alert">
            <p className={styles.errorTitle}>Plan 목록을 불러오지 못했어요.</p>
            <p className={styles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
            <button type="button" className={styles.retryButton} onClick={reload}>
              다시 시도
            </button>
          </div>
        )}

        {state.status === 'success' &&
          (state.data.items.length > 0 ? (
            <ul className={styles.grid}>
              {state.data.items.map((item) => (
                <li key={item.contentId}>
                  <MentorContentCard item={item} onContentSelect={onPlanSelect} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyNotice} role="status">
              아직 공개된 Plan이 없어요.
            </p>
          ))}
      </section>
    </MentorHubLayout>
  )
}
