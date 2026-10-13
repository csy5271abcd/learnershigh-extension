import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  createMentorStoryFixtureLoader,
  readStoryFixtureScenario,
  saveMentorContentFixture,
} from '../fixtures/mentorStory.fixture.ts'
import { MentorStoryDetailPage } from '../MentorStoryDetailPage.tsx'
import { mentorProfilePath, mentorQuestionComposerPath, mentorStoryListPath } from './paths.ts'

export function MentorStoryDetailRoute() {
  const { contentId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // API 연결 전까지 Fixture를 Data Source로 쓴다. 개발 중에는 ?fixture=loading|error|not-found로 상태를 확인한다.
  const loadStory = createMentorStoryFixtureLoader(
    import.meta.env.DEV ? readStoryFixtureScenario(searchParams.toString()) : 'success',
  )

  // App 안에서 이동해 왔다면 History Back으로 이전 화면(Story Feed 주제 / Home / Profile)과 Scroll을 복원한다.
  // 주소로 바로 들어온 경우(이전 화면 없음)에는 Story Feed로 이동한다.
  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(mentorStoryListPath)
  }

  return (
    <MentorStoryDetailPage
      contentId={contentId}
      loadStory={loadStory}
      requestSave={saveMentorContentFixture}
      onBack={goBack}
      onGoToStoryFeed={() => navigate(mentorStoryListPath)}
      onMentorSelect={(mentorId) => navigate(mentorProfilePath(mentorId))}
      // 관련 질문: 받는 Mentor + 이 Story를 Context로 질문 작성 화면을 연다. (질문 문장은 만들지 않는다)
      onAskRelatedQuestion={(context) =>
        navigate(mentorQuestionComposerPath({ mentorId: context.mentorId, sourceContentId: context.sourceContentId }))
      }
    />
  )
}
