import { MentorHubLayout } from './components/MentorHubLayout.tsx'
import { MentorListCard } from './components/MentorListCard.tsx'
import { MentorListControls, type MentorListFilters } from './components/MentorListControls.tsx'
import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
import type { MentorHubTabId } from './model/tabs.ts'
import type { MentorListQuery, MentorListResult } from './model/types.ts'
import { useMentorList } from './model/useMentorList.ts'
import styles from './MentorHubHomePage.module.css'
import listStyles from './MentorListPage.module.css'

/** Mockup(MentorProfile-00)의 "멘토 24명" Grid와 같은 한 Page 크기 */
export const MENTOR_LIST_PAGE_SIZE = 24

interface MentorListPageProps {
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentors. */
  loadList: (query: MentorListQuery) => Promise<MentorListResult>
  /** 검색어 / Filter는 호출 측(Route, URL)이 소유해 새로고침 · Back 후에도 유지한다. */
  filters: MentorListFilters
  onFiltersChange: (filters: MentorListFilters) => void
  onTabSelect: (id: MentorHubTabId) => void
  focusTabOnMount?: boolean
  onMentorSelect: (mentorId: string) => void
}

export function MentorListPage({
  loadList,
  filters,
  onFiltersChange,
  onTabSelect,
  focusTabOnMount,
  onMentorSelect,
}: MentorListPageProps) {
  const { state, reload } = useMentorList({ ...filters, page: 0, size: MENTOR_LIST_PAGE_SIZE }, loadList)
  const hasFilter = Boolean(filters.query.trim() || filters.admissionType || filters.major)

  return (
    <MentorHubLayout
      selectedTab="mentors"
      onTabSelect={onTabSelect}
      focusTabOnMount={focusTabOnMount}
      busy={state.status === 'loading'}
    >
      <section className={listStyles.list} aria-labelledby="mentor-list-heading">
        {state.status === 'success' && (
          <MentorListControls
            filters={filters}
            admissionTypes={state.data.filterOptions.admissionTypes}
            majors={state.data.filterOptions.majors}
            onQueryChange={(query) => onFiltersChange({ ...filters, query })}
            onAdmissionTypeChange={(admissionType) => onFiltersChange({ ...filters, admissionType })}
            onMajorChange={(major) => onFiltersChange({ ...filters, major })}
            onReset={() => onFiltersChange({ query: '' })}
          />
        )}

        <h2 id="mentor-list-heading" className={styles.sectionTitle}>
          {state.status === 'success' ? `멘토 ${state.data.page.totalElements}명` : '멘토'}
        </h2>

        {state.status === 'loading' && (
          <>
            <p className="lh-visually-hidden" role="status">
              멘토 목록을 불러오는 중이에요.
            </p>
            <div className={styles.grid} aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => (
                <span key={index} className={`${skeletonStyles.block} ${listStyles.cardSkeleton}`} />
              ))}
            </div>
          </>
        )}

        {state.status === 'error' && (
          <div className={styles.errorNotice} role="alert">
            <p className={styles.errorTitle}>멘토 목록을 불러오지 못했어요.</p>
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
                <li key={item.mentor.mentorId}>
                  <MentorListCard item={item} onMentorSelect={onMentorSelect} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyNotice} role="status">
              {hasFilter ? '조건에 맞는 멘토를 찾지 못했어요. 검색어나 Filter를 바꿔보세요.' : '아직 등록된 멘토가 없어요.'}
            </p>
          ))}
      </section>
    </MentorHubLayout>
  )
}
