import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  createMentorQuestionFixtureLoader,
  markQuestionHelpfulFixture,
  readQuestionDetailFixtureScenario,
  requestQuestionReassignFixture,
} from '../fixtures/mentorQuestion.fixture.ts'
import { MentorQuestionDetailPage } from '../MentorQuestionDetailPage.tsx'
import { mentorProfilePath, mentorQuestionListPath } from './paths.ts'
import { useMentorContentLink } from './useMentorContentLink.ts'

export function MentorQuestionDetailRoute() {
  const { questionId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // API 연결 전까지 Fixture를 Data Source로 쓴다. 개발 중에는 ?fixture=loading|error|not-found로 상태를 확인한다.
  const loadQuestion = createMentorQuestionFixtureLoader(
    import.meta.env.DEV ? readQuestionDetailFixtureScenario(searchParams.toString()) : 'success',
  )

  // 관련 콘텐츠는 Detail 화면이 있는 유형(Plan / Routine / Story / Record / Case)으로 연결한다.
  const resolveContentLink = useMentorContentLink()

  // App 안에서 이동해 왔다면 History Back으로 이전 화면(Q&A 목록 보기 / Category / Scroll 등)을 복원한다.
  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(mentorQuestionListPath)
  }

  return (
    <MentorQuestionDetailPage
      questionId={questionId}
      loadQuestion={loadQuestion}
      requestHelpful={markQuestionHelpfulFixture}
      requestReassign={requestQuestionReassignFixture}
      onBack={goBack}
      onGoToQuestionList={() => navigate(mentorQuestionListPath)}
      onMentorSelect={(mentorId) => navigate(mentorProfilePath(mentorId))}
      resolveContentLink={resolveContentLink}
    />
  )
}
