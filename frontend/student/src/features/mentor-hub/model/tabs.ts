// Feature Spec Main Tab: 추천 / 멘토 / Plan / Routine / Story / Q&A / Record / Case
export type MentorHubTabId = 'recommend' | 'mentors' | 'plan' | 'routine' | 'story' | 'qna' | 'record' | 'case'

export const mentorHubTabs: { id: MentorHubTabId; label: string }[] = [
  { id: 'recommend', label: '추천' },
  { id: 'mentors', label: '멘토' },
  { id: 'plan', label: 'Plan' },
  { id: 'routine', label: 'Routine' },
  { id: 'story', label: 'Story' },
  { id: 'qna', label: 'Q&A' },
  { id: 'record', label: 'Record' },
  { id: 'case', label: 'Case' },
]

export const tabElementId = (id: MentorHubTabId) => `mentor-hub-tab-${id}`

export const tabPanelElementId = 'mentor-hub-tabpanel'
