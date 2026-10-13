import { useLocation, useNavigate, useSearchParams } from 'react-router'
import {
  createMentorQuestionFixtureService,
  loadQuestionComposerContextFixture,
  readSubmitFixtureScenario,
} from '../fixtures/mentorQuestion.fixture.ts'
import { MentorQuestionComposerPage } from '../MentorQuestionComposerPage.tsx'
import type { QuestionComposerContext } from '../model/types.ts'
import { mentorListPath, mentorQuestionListPath, mentorQuestionPath } from './paths.ts'

// 같은 Key에는 같은 함수를 넘겨 Context를 다시 불러오지 않게 한다. (Key = mentorId|sourceContentId)
const loadContext = (key: string): Promise<QuestionComposerContext | null> => {
  const [mentorId, sourceContentId] = key.split('|')
  return loadQuestionComposerContextFixture(mentorId, sourceContentId || undefined)
}

// /mentor/questions/new?mentorId=&sourceContentId= : 질문 작성
// - Mentor Profile "질문하기" → mentorId
// - Story "관련 질문" → mentorId + sourceContentId (화면 Context로만 쓰고 Submit Request에는 넣지 않는다)
// - 제출하면 새 질문 Detail로 바꾼다. (작성 화면은 History에서 빠지므로 Back = 질문을 시작한 화면)
export function MentorQuestionComposerRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // 개발 중에는 ?fixture=submit-fail-once로 첫 제출 실패 → 다시 보내기를 확인한다.
  const service = createMentorQuestionFixtureService(
    import.meta.env.DEV ? readSubmitFixtureScenario(searchParams.toString()) : 'success',
  )

  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(mentorQuestionListPath)
  }

  return (
    <MentorQuestionComposerPage
      mentorId={searchParams.get('mentorId') || undefined}
      sourceContentId={searchParams.get('sourceContentId') || undefined}
      loadContext={loadContext}
      submit={service.submit}
      onSubmitted={(result) => navigate(mentorQuestionPath(result.questionId), { replace: true })}
      onBack={goBack}
      onFindMentor={() => navigate(mentorListPath)}
    />
  )
}
