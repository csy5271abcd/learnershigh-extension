import { createSessionToggleStore } from './sessionToggle.ts'
import type { MentorQuestion } from './types.ts'

const useHelpfulToggle = createSessionToggleStore()

/**
 * Q&A 도움돼요 / 취소. 목록과 Detail이 같은 값을 본다.
 * `requestHelpful`은 Data Source Boundary다. (Contract에 Reaction API가 없어 현재는 Fixture)
 */
export function useQuestionHelpful(
  question: MentorQuestion,
  requestHelpful: (questionId: string, helpful: boolean) => Promise<unknown>,
) {
  const { on, count, toggle } = useHelpfulToggle(
    question.questionId,
    { on: question.helpful, count: question.helpfulCount },
    requestHelpful,
  )
  return { helpful: on, helpfulCount: count, toggle }
}
