import { useLocation, useNavigate } from 'react-router'
import type { MentorHubTabId } from '../model/tabs.ts'
import {
  mentorCaseListPath,
  mentorHubPath,
  mentorListPath,
  mentorPlanListPath,
  mentorQuestionListPath,
  mentorRecordListPath,
  mentorRoutineListPath,
  mentorStoryListPath,
} from './paths.ts'

interface MainTabNavigationState {
  focusMainTab?: boolean
}

/**
 * Mentor Hub Main Tab 선택을 Route 이동으로 바꾼다.
 * - 추천 → Mentor Hub Home
 * - 멘토 → Mentor List
 * - Plan → Plan 목록
 * - Routine → Routine 목록
 * - Story → Story Feed
 * - Q&A → Q&A 목록
 * - Record → Record 목록
 * - Case → Activity Case 목록
 * 이동한 화면에서는 선택 Tab에 Focus를 돌려줘 Keyboard 사용자가 이어서 Tab을 이동할 수 있게 한다.
 */
export function useMentorHubTabNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const focusTabOnMount = Boolean((location.state as MainTabNavigationState | null)?.focusMainTab)

  const navigateToTab = (tab: MentorHubTabId) => {
    const state: MainTabNavigationState = { focusMainTab: true }
    if (tab === 'mentors') navigate(mentorListPath, { state })
    else if (tab === 'plan') navigate(mentorPlanListPath, { state })
    else if (tab === 'routine') navigate(mentorRoutineListPath, { state })
    else if (tab === 'story') navigate(mentorStoryListPath, { state })
    else if (tab === 'qna') navigate(mentorQuestionListPath, { state })
    else if (tab === 'record') navigate(mentorRecordListPath, { state })
    else if (tab === 'case') navigate(mentorCaseListPath, { state })
    else navigate(mentorHubPath, { state })
  }

  return { navigateToTab, focusTabOnMount }
}
