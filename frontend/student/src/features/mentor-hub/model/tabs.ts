import type { MentorProfileContentKind } from './types.ts'

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

export const mentorHubTabIdPrefix = 'mentor-hub-tab'

export const tabElementId = (id: MentorHubTabId) => `${mentorHubTabIdPrefix}-${id}`

export const tabPanelElementId = 'mentor-hub-tabpanel'

export function parseMentorHubTab(value: string | null): MentorHubTabId {
  return mentorHubTabs.find((tab) => tab.id === value)?.id ?? 'recommend'
}

// Mentor Profile Content Tab (MentorProfile-02 Mockup 순서)
export const mentorProfileContentKinds: MentorProfileContentKind[] = ['plan', 'routine', 'story', 'record', 'case']

export function parseProfileContentKind(value: string | null): MentorProfileContentKind | undefined {
  return mentorProfileContentKinds.find((kind) => kind === value)
}
