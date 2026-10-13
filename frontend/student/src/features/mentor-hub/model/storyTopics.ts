import type { StoryTopic } from './types.ts'

// Feature Spec Story 주제 순서. URL(?topic=)에는 내부 Key를 쓰고 화면에는 이름을 쓴다.
export const storyTopics: { id: StoryTopic; label: string }[] = [
  { id: 'success', label: '성공' },
  { id: 'failure', label: '실패' },
  { id: 'recovery', label: '회복' },
  { id: 'grade-change', label: '성적 변화' },
  { id: 'admission-switch', label: '수시/정시 전환' },
  { id: 'career', label: '진로 고민' },
  { id: 'study-method', label: '공부법' },
  { id: 'mental', label: '멘탈 관리' },
]

export const storyTopicLabel = (topic: StoryTopic) => storyTopics.find((item) => item.id === topic)?.label ?? topic

/** 알 수 없는 값은 전체(undefined)로 본다. */
export function parseStoryTopic(value: string | null): StoryTopic | undefined {
  return storyTopics.find((item) => item.id === value)?.id
}

/** "저장 2.4k" (Story-00 / 01 Mockup 표기) */
export function formatSaveCount(count: number): string {
  if (count < 1000) return String(count)
  const value = Math.round(count / 100) / 10
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}k`
}
