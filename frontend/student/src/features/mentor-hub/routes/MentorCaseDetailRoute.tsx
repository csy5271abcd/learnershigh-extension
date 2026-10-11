import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  createMentorCaseFixtureLoader,
  fixtureCaseTaskCandidates,
  readCaseDetailFixtureScenario,
} from '../fixtures/mentorCase.fixture.ts'
import { MentorCaseDetailPage } from '../MentorCaseDetailPage.tsx'
import { mentorCaseListPath, mentorProfilePath, mentorQuestionPath } from './paths.ts'
import { mentorContentPath } from './useMentorContentLink.ts'

export function MentorCaseDetailRoute() {
  const { contentId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // API 연결 전까지 Fixture를 Data Source로 쓴다. 개발 중에는 ?fixture=loading|error|not-found로 상태를 확인한다.
  const loadCase = createMentorCaseFixtureLoader(
    import.meta.env.DEV ? readCaseDetailFixtureScenario(searchParams.toString()) : 'success',
  )

  // 선택 단계는 URL(?stage=, 1부터)에 둔다. 관련 콘텐츠 / Profile에 다녀와도 같은 단계와 Scroll로 돌아온다.
  const stageIndex = Number(searchParams.get('stage') ?? '1') - 1
  const changeStage = (index: number) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (index > 0) params.set('stage', String(index + 1))
        else params.delete('stage')
        return params
      },
      // 단계 이동마다 History가 쌓이지 않게 하고 Scroll 위치를 그대로 둔다.
      { replace: true, preventScrollReset: true },
    )
  }

  // App 안에서 이동해 왔다면 History Back으로 이전 화면(Case 목록 검색 / Scroll, Home, Profile, Record)을 복원한다.
  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(mentorCaseListPath)
  }

  return (
    <MentorCaseDetailPage
      contentId={contentId}
      loadCase={loadCase}
      stageIndex={Number.isInteger(stageIndex) ? stageIndex : 0}
      onStageChange={changeStage}
      taskCandidates={fixtureCaseTaskCandidates()}
      onBack={goBack}
      onGoToCaseList={() => navigate(mentorCaseListPath)}
      onMentorSelect={(mentorId) => navigate(mentorProfilePath(mentorId))}
      onContentSelect={(content) => {
        // Q&A 항목의 id는 질문 id다. (Q&A는 별도 Student Question Flow)
        if (content.kind === 'qna') {
          navigate(mentorQuestionPath(content.contentId))
          return
        }
        const path = mentorContentPath(content)
        if (path) navigate(path)
      }}
    />
  )
}
