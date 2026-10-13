import { useState } from 'react'
import { CaseAdminBadge } from './components/CaseParts.tsx'
import { MentorContentCard } from './components/MentorContentCard.tsx'
import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
import { MentorHubLayout } from './components/MentorHubLayout.tsx'
// 검색창은 Mentor List / Record 목록과 같은 모양을 쓴다.
import controlStyles from './components/MentorListControls.module.css'
import listStyles from './MentorContentListPage.module.css'
import { MENTOR_CONTENT_LIST_PAGE_SIZE } from './MentorContentListPage.tsx'
import styles from './MentorHubHomePage.module.css'
import { formatSaveCount } from './model/storyTopics.ts'
import type { MentorHubTabId } from './model/tabs.ts'
import type { MentorCaseListResult, MentorCaseView } from './model/types.ts'
import { useMentorContentList } from './model/useMentorContentList.ts'

interface MentorCaseListPageProps {
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentor-content?type=case. 검색어마다 다른 함수. */
  loadList: (page: number, size: number) => Promise<MentorCaseListResult>
  /** 검색어는 호출 측(Route, URL ?query=)이 소유해 Detail 왕복 / 새로고침 후에도 유지한다. */
  query: string
  onQueryChange: (query: string) => void
  onTabSelect: (id: MentorHubTabId) => void
  focusTabOnMount?: boolean
  onCaseSelect: (contentId: string) => void
}

// Mentor Hub Main "Case" Tab (ActivityCase-00 Mockup). 저장 수가 많은 순서로 실제 활동명 Card를 보여준다.
export function MentorCaseListPage({
  loadList,
  query,
  onQueryChange,
  onTabSelect,
  focusTabOnMount,
  onCaseSelect,
}: MentorCaseListPageProps) {
  const { state, reload } = useMentorContentList(loadList, 0, MENTOR_CONTENT_LIST_PAGE_SIZE)

  return (
    <MentorHubLayout
      selectedTab="case"
      onTabSelect={onTabSelect}
      focusTabOnMount={focusTabOnMount}
      busy={state.status === 'loading'}
    >
      <section className={listStyles.list} aria-labelledby="mentor-case-heading">
        <CaseSearch query={query} onChange={onQueryChange} />

        <h2 id="mentor-case-heading" className={styles.sectionTitle}>
          {state.status === 'success' ? `Case ${state.data.page.totalElements}개` : 'Case'}
        </h2>

        {state.status === 'loading' && (
          <>
            <p className="lh-visually-hidden" role="status">
              Case를 불러오는 중이에요.
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
            <p className={styles.errorTitle}>Case를 불러오지 못했어요.</p>
            <p className={styles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
            <button type="button" className={styles.retryButton} onClick={reload}>
              다시 시도
            </button>
          </div>
        )}

        {state.status === 'success' &&
          (state.data.items.length > 0 ? (
            <ul className={styles.grid}>
              {state.data.items.map((view) => (
                <li key={view.activityCase.contentId}>
                  <CaseCard view={view} onCaseSelect={onCaseSelect} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyNotice} role="status">
              {query.trim() ? '검색어와 맞는 Case를 찾지 못했어요. 다른 활동명이나 과목으로 찾아보세요.' : '아직 공개된 Case가 없어요.'}
            </p>
          ))}
      </section>
    </MentorHubLayout>
  )
}

// ActivityCase-00 Card: Case · 과목 / Admin 추천 / 실제 활동명 / 주요 활동 요약 / Mentor / 저장 수 (저장은 Contract Gap이라 표시만)
function CaseCard({ view, onCaseSelect }: { view: MentorCaseView; onCaseSelect: (contentId: string) => void }) {
  const { activityCase } = view
  return (
    <MentorContentCard
      item={activityCase}
      badgeDetail={activityCase.subject}
      extraBadge={view.adminRecommendation && <CaseAdminBadge />}
      aside={<span>저장 {formatSaveCount(activityCase.saveCount)}</span>}
      onContentSelect={(content) => onCaseSelect(content.contentId)}
    />
  )
}

interface CaseSearchProps {
  query: string
  onChange: (query: string) => void
}

// 검색(활동명, 과목, 활동 유형, 주요 활동, Mentor). 입력 중인 값은 Local State로 두고, 바깥(URL) 값이 바뀌면 따라간다.
function CaseSearch({ query, onChange }: CaseSearchProps) {
  const [draft, setDraft] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  if (query !== syncedQuery) {
    setSyncedQuery(query)
    setDraft(query)
  }

  const change = (value: string) => {
    setDraft(value)
    onChange(value)
  }

  return (
    <div className={controlStyles.search}>
      <label htmlFor="mentor-case-search" className="lh-visually-hidden">
        Case 검색
      </label>
      <svg className={controlStyles.searchIcon} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 16l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        id="mentor-case-search"
        type="search"
        className={controlStyles.searchInput}
        value={draft}
        placeholder="활동명, 과목, Mentor 이름"
        autoComplete="off"
        onChange={(event) => change(event.target.value)}
      />
      {draft && (
        <button type="button" className={controlStyles.clearButton} aria-label="검색어 지우기" onClick={() => change('')}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
