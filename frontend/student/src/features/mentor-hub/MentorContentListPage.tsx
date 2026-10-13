import { MentorContentCard } from './components/MentorContentCard.tsx'
import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
import { MentorHubLayout } from './components/MentorHubLayout.tsx'
import { contentKindLabel } from './model/format.ts'
import type { MentorHubTabId } from './model/tabs.ts'
import type { MentorContentListResult, MentorContentSummary } from './model/types.ts'
import { useMentorContentList } from './model/useMentorContentList.ts'
import styles from './MentorHubHomePage.module.css'
import listStyles from './MentorContentListPage.module.css'

/** Mentor List와 같은 한 Page 크기 */
export const MENTOR_CONTENT_LIST_PAGE_SIZE = 24

interface MentorContentListPageProps {
  /** Main Tab = Content 유형 (Plan-00 / Routine-00 Mockup) */
  kind: 'plan' | 'routine'
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentor-content?type=. */
  loadList: (page: number, size: number) => Promise<MentorContentListResult>
  onTabSelect: (id: MentorHubTabId) => void
  focusTabOnMount?: boolean
  onContentSelect: (content: MentorContentSummary) => void
}

// Mentor Hub Main "Plan" / "Routine" Tab: Content Card Grid → Detail
export function MentorContentListPage({
  kind,
  loadList,
  onTabSelect,
  focusTabOnMount,
  onContentSelect,
}: MentorContentListPageProps) {
  const { state, reload } = useMentorContentList(loadList, 0, MENTOR_CONTENT_LIST_PAGE_SIZE)
  const label = contentKindLabel[kind]
  const headingId = `mentor-${kind}-list-heading`

  return (
    <MentorHubLayout
      selectedTab={kind}
      onTabSelect={onTabSelect}
      focusTabOnMount={focusTabOnMount}
      busy={state.status === 'loading'}
    >
      <section className={listStyles.list} aria-labelledby={headingId}>
        <h2 id={headingId} className={styles.sectionTitle}>
          {state.status === 'success' ? `${label} ${state.data.page.totalElements}개` : label}
        </h2>

        {state.status === 'loading' && (
          <>
            <p className="lh-visually-hidden" role="status">
              {label} 목록을 불러오는 중이에요.
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
            <p className={styles.errorTitle}>{label} 목록을 불러오지 못했어요.</p>
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
                  <MentorContentCard item={item} onContentSelect={onContentSelect} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyNotice} role="status">
              아직 공개된 {label}이 없어요.
            </p>
          ))}
      </section>
    </MentorHubLayout>
  )
}
