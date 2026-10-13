import { useNavigate, useSearchParams } from 'react-router'
import {
  createMentorStoryFeedFixtureLoader,
  readStoryFeedFixtureScenario,
  saveMentorContentFixture,
} from '../fixtures/mentorStory.fixture.ts'
import { MentorStoryFeedPage } from '../MentorStoryFeedPage.tsx'
import { parseStoryTopic } from '../model/storyTopics.ts'
import type { StoryTopic } from '../model/types.ts'
import { mentorStoryPath } from './paths.ts'
import { useMentorHubTabNavigation } from './useMentorHubTabNavigation.ts'

// Main "Story" Tab. 주제는 URL(?topic=)에 두어 새로고침 / Back / Detail 왕복 후에도 유지한다.
// Scroll은 App Shell의 ScrollRestoration이 복원한다. 개발용 ?fixture=는 ?topic=과 함께 써도 된다.
export function MentorStoryFeedRoute() {
  const navigate = useNavigate()
  const { navigateToTab, focusTabOnMount } = useMentorHubTabNavigation()
  const [searchParams, setSearchParams] = useSearchParams()
  const topic = parseStoryTopic(searchParams.get('topic'))

  const loadFeed = createMentorStoryFeedFixtureLoader(
    import.meta.env.DEV ? readStoryFeedFixtureScenario(searchParams.toString()) : 'success',
    topic,
  )

  const selectTopic = (next: StoryTopic | undefined) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (next) params.set('topic', next)
        else params.delete('topic')
        return params
      },
      // 주제를 바꿀 때마다 History가 쌓이지 않도록 현재 Entry를 바꾼다.
      { replace: true, preventScrollReset: true },
    )
  }

  return (
    <MentorStoryFeedPage
      loadFeed={loadFeed}
      topic={topic}
      onTopicSelect={selectTopic}
      onTabSelect={navigateToTab}
      focusTabOnMount={focusTabOnMount}
      onStorySelect={(content) => navigate(mentorStoryPath(content.contentId))}
      requestSave={saveMentorContentFixture}
    />
  )
}
