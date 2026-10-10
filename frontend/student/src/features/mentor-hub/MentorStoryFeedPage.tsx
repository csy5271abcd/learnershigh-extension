import { MentorContentCard } from './components/MentorContentCard.tsx'
import skeletonStyles from './components/MentorHubHomeSkeleton.module.css'
import { MentorHubLayout } from './components/MentorHubLayout.tsx'
import { StoryTopicFilter } from './components/StoryTopicFilter.tsx'
import listStyles from './MentorContentListPage.module.css'
import { MENTOR_CONTENT_LIST_PAGE_SIZE } from './MentorContentListPage.tsx'
import styles from './MentorHubHomePage.module.css'
import { formatSaveCount, storyTopicLabel } from './model/storyTopics.ts'
import type { MentorHubTabId } from './model/tabs.ts'
import type { MentorContentSummary, MentorStoryListItem, MentorStoryListResult, StoryTopic } from './model/types.ts'
import { useMentorContentList } from './model/useMentorContentList.ts'
import { useSavedContent } from './model/useSavedContent.ts'

interface MentorStoryFeedPageProps {
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/mentor-content?type=story. 주제마다 다른 함수. */
  loadFeed: (page: number, size: number) => Promise<MentorStoryListResult>
  /** 선택 주제는 호출 측(Route, URL ?topic=)이 소유해 Detail 왕복 / 새로고침 후에도 유지한다. */
  topic?: StoryTopic
  onTopicSelect: (topic: StoryTopic | undefined) => void
  onTabSelect: (id: MentorHubTabId) => void
  focusTabOnMount?: boolean
  onStorySelect: (content: MentorContentSummary) => void
  requestSave: (contentId: string, saved: boolean) => Promise<unknown>
}

// Mentor Hub Main "Story" Tab (Story-00 Mockup) + Feature Spec 주제 Filter
export function MentorStoryFeedPage({
  loadFeed,
  topic,
  onTopicSelect,
  onTabSelect,
  focusTabOnMount,
  onStorySelect,
  requestSave,
}: MentorStoryFeedPageProps) {
  const { state, reload } = useMentorContentList(loadFeed, 0, MENTOR_CONTENT_LIST_PAGE_SIZE)

  return (
    <MentorHubLayout
      selectedTab="story"
      onTabSelect={onTabSelect}
      focusTabOnMount={focusTabOnMount}
      busy={state.status === 'loading'}
    >
      <section className={listStyles.list} aria-labelledby="mentor-story-list-heading">
        <StoryTopicFilter selected={topic} onSelect={onTopicSelect} />

        <h2 id="mentor-story-list-heading" className={styles.sectionTitle}>
          {topic ? `${storyTopicLabel(topic)} ` : ''}
          {state.status === 'success' ? `Story ${state.data.page.totalElements}개` : 'Story'}
        </h2>

        {state.status === 'loading' && (
          <>
            <p className="lh-visually-hidden" role="status">
              Story를 불러오는 중이에요.
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
            <p className={styles.errorTitle}>Story를 불러오지 못했어요.</p>
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
                  <StoryCard item={item} topic={topic} onStorySelect={onStorySelect} requestSave={requestSave} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyNotice} role="status">
              {topic ? '이 주제의 Story가 아직 없어요.' : '아직 등록된 Story가 없어요.'}
            </p>
          ))}
      </section>
    </MentorHubLayout>
  )
}

interface StoryCardProps {
  item: MentorStoryListItem
  topic?: StoryTopic
  onStorySelect: (content: MentorContentSummary) => void
  requestSave: (contentId: string, saved: boolean) => Promise<unknown>
}

// Story-00 Mockup Card: 저장 수만 보여주고, 저장 / 취소는 Detail에서 한다.
function StoryCard({ item, topic, onStorySelect, requestSave }: StoryCardProps) {
  const { saved, saveCount } = useSavedContent(item.contentId, item, requestSave)
  const shownTopic = topic && item.topics.includes(topic) ? topic : item.topics[0]

  return (
    <MentorContentCard
      item={item}
      onContentSelect={onStorySelect}
      badgeDetail={shownTopic && storyTopicLabel(shownTopic)}
      aside={
        <span>
          {saved ? '저장됨' : '저장'} {formatSaveCount(saveCount)}
        </span>
      }
    />
  )
}
