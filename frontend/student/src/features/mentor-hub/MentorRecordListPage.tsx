import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
import { MentorHubLayout } from './components/MentorHubLayout.tsx'
import { RecordCard, RecordListControls, type RecordListFilters } from './components/RecordParts.tsx'
import { MENTOR_CONTENT_LIST_PAGE_SIZE } from './MentorContentListPage.tsx'
import styles from './MentorHubHomePage.module.css'
import recordStyles from './MentorRecordPages.module.css'
import type { MentorHubTabId } from './model/tabs.ts'
import type { MentorRecordListResult } from './model/types.ts'
import { useMentorContentList } from './model/useMentorContentList.ts'

interface MentorRecordListPageProps {
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentor-content?type=record. 조건마다 다른 함수. */
  loadList: (page: number, size: number) => Promise<MentorRecordListResult>
  /** 검색 / 학년 / 영역은 호출 측(Route, URL)이 소유해 Detail 왕복 / 새로고침 후에도 유지한다. */
  filters: RecordListFilters
  onFiltersChange: (filters: RecordListFilters) => void
  onTabSelect: (id: MentorHubTabId) => void
  focusTabOnMount?: boolean
  onRecordSelect: (contentId: string) => void
}

// Mentor Hub Main "Record" Tab (전용 Mockup 없음). 비식별 · 검수 완료된 Record를 활동 / 영역 / Mentor Context와 함께 비교한다.
export function MentorRecordListPage({
  loadList,
  filters,
  onFiltersChange,
  onTabSelect,
  focusTabOnMount,
  onRecordSelect,
}: MentorRecordListPageProps) {
  const { state, reload } = useMentorContentList(loadList, 0, MENTOR_CONTENT_LIST_PAGE_SIZE)
  const hasFilter = Boolean(filters.query.trim() || filters.grade || filters.area)

  return (
    <MentorHubLayout
      selectedTab="record"
      onTabSelect={onTabSelect}
      focusTabOnMount={focusTabOnMount}
      busy={state.status === 'loading'}
    >
      <section className={recordStyles.listSection} aria-labelledby="mentor-record-heading">
        <div>
          <h2 id="mentor-record-heading" className={styles.sectionTitle}>
            {state.status === 'success' ? `Record ${state.data.page.totalElements}개` : 'Record'}
          </h2>
          <p className={recordStyles.lead}>
            Mentor의 실제 활동이 학교생활기록부의 어떤 기록으로 이어졌는지 볼 수 있어요. 개인정보를 제거하고 검수한 공개 범위만
            보여요.
          </p>
        </div>

        <RecordListControls filters={filters} onChange={onFiltersChange} />

        {state.status === 'loading' && (
          <>
            <p className="lh-visually-hidden" role="status">
              Record를 불러오는 중이에요.
            </p>
            <div className={recordStyles.grid} aria-hidden="true">
              {[0, 1, 2].map((key) => (
                <span key={key} className={`${skeletonStyles.block} ${recordStyles.cardSkeleton}`} />
              ))}
            </div>
          </>
        )}

        {state.status === 'error' && (
          <div className={styles.errorNotice} role="alert">
            <p className={styles.errorTitle}>Record를 불러오지 못했어요.</p>
            <p className={styles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
            <button type="button" className={styles.retryButton} onClick={reload}>
              다시 시도
            </button>
          </div>
        )}

        {state.status === 'success' &&
          (state.data.items.length > 0 ? (
            <ul className={recordStyles.grid}>
              {state.data.items.map((record) => (
                <li key={record.contentId}>
                  <RecordCard record={record} onSelect={onRecordSelect} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyNotice} role="status">
              {hasFilter ? '조건에 맞는 Record를 찾지 못했어요. 검색어나 Filter를 바꿔보세요.' : '아직 공개된 Record가 없어요.'}
            </p>
          ))}
      </section>
    </MentorHubLayout>
  )
}
