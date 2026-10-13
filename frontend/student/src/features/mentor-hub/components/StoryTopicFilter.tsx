import { useLayoutEffect, useRef } from 'react'
import { storyTopics } from '../model/storyTopics.ts'
import type { StoryTopic } from '../model/types.ts'
// Mentor List의 전형 Chip과 같은 모양을 쓴다. (Mobile: 한 줄 가로 스크롤)
import chipStyles from './MentorListControls.module.css'

interface StoryTopicFilterProps {
  /** undefined = 전체 */
  selected?: StoryTopic
  onSelect: (topic: StoryTopic | undefined) => void
}

// Feature Spec Story 주제 Filter. 하나만 고르고, "전체"로 해제한다.
export function StoryTopicFilter({ selected, onSelect }: StoryTopicFilterProps) {
  const chipsRef = useRef<HTMLDivElement>(null)

  // 가로 스크롤 상태(Mobile)에서 선택한 주제가 화면 밖에 있으면 보이는 위치로 옮긴다.
  useLayoutEffect(() => {
    const chips = chipsRef.current
    const current = chips?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!chips || !current || chips.scrollWidth <= chips.clientWidth) return
    chips.scrollLeft = current.offsetLeft - (chips.clientWidth - current.offsetWidth) / 2
  }, [selected])

  return (
    <div ref={chipsRef} role="group" aria-label="Story 주제" className={chipStyles.chips}>
      <button type="button" className={chipStyles.chip} aria-pressed={!selected} onClick={() => onSelect(undefined)}>
        전체
      </button>
      {storyTopics.map((topic) => (
        <button
          key={topic.id}
          type="button"
          className={chipStyles.chip}
          aria-pressed={selected === topic.id}
          onClick={() => onSelect(topic.id)}
        >
          {topic.label}
        </button>
      ))}
    </div>
  )
}
