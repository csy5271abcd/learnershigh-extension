import { useNavigate, useSearchParams } from 'react-router'
import {
  createMentorQuestionListFixtureLoader,
  markQuestionHelpfulFixture,
  readQuestionListFixtureScenario,
} from '../fixtures/mentorQuestion.fixture.ts'
import { MentorQuestionListPage } from '../MentorQuestionListPage.tsx'
import { parseQuestionCategory, parseQuestionView } from '../model/questions.ts'
import type { QuestionCategory, QuestionView } from '../model/types.ts'
import { mentorQuestionComposerPath, mentorQuestionPath } from './paths.ts'
import { useMentorHubTabNavigation } from './useMentorHubTabNavigation.ts'

// Main "Q&A" Tab. 보기(?view=mine)와 Category(?category=)는 URL에 두어 새로고침 / Back / Detail 왕복 후에도 유지한다.
// Scroll은 App Shell의 ScrollRestoration이 복원한다. 개발용 ?fixture=는 함께 써도 된다.
export function MentorQuestionListRoute() {
  const navigate = useNavigate()
  const { navigateToTab, focusTabOnMount } = useMentorHubTabNavigation()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = parseQuestionView(searchParams.get('view'))
  const category = parseQuestionCategory(searchParams.get('category'))

  const loadList = createMentorQuestionListFixtureLoader(
    import.meta.env.DEV ? readQuestionListFixtureScenario(searchParams.toString()) : 'success',
    view,
    category,
  )

  const changeParam = (name: 'view' | 'category', value: string | undefined) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (value) params.set(name, value)
        else params.delete(name)
        return params
      },
      // 보기 / Category를 바꿀 때마다 History가 쌓이지 않도록 현재 Entry를 바꾼다.
      { replace: true, preventScrollReset: true },
    )
  }

  return (
    <MentorQuestionListPage
      loadList={loadList}
      view={view}
      category={category}
      onViewChange={(next: QuestionView) => changeParam('view', next === 'mine' ? 'mine' : undefined)}
      onCategoryChange={(next: QuestionCategory | undefined) => changeParam('category', next)}
      onTabSelect={navigateToTab}
      focusTabOnMount={focusTabOnMount}
      onQuestionSelect={(questionId) => navigate(mentorQuestionPath(questionId))}
      onAsk={() => navigate(mentorQuestionComposerPath({}))}
      requestHelpful={markQuestionHelpfulFixture}
    />
  )
}
