import { useRef, type KeyboardEvent } from 'react'
import { mentorHubTabs, tabElementId, tabPanelElementId, type MentorHubTabId } from '../model/tabs.ts'
import styles from './MentorHubTabs.module.css'

interface MentorHubTabsProps {
  selected: MentorHubTabId
  onSelect: (id: MentorHubTabId) => void
}

export function MentorHubTabs({ selected, onSelect }: MentorHubTabsProps) {
  const tabRefs = useRef(new Map<MentorHubTabId, HTMLButtonElement>())

  // WAI-ARIA Tabs: 좌우 화살표 / Home / End로 이동하고 바로 선택한다.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = mentorHubTabs.findIndex((tab) => tab.id === selected)
    const last = mentorHubTabs.length - 1
    const nextIndex = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key]

    if (nextIndex === undefined) return

    event.preventDefault()
    const next = mentorHubTabs[nextIndex].id
    onSelect(next)
    tabRefs.current.get(next)?.focus()
  }

  return (
    <div className={styles.bar}>
      <div role="tablist" aria-label="Mentor Hub" className={styles.list} onKeyDown={handleKeyDown}>
        {mentorHubTabs.map((tab) => {
          const isSelected = tab.id === selected
          return (
            <button
              key={tab.id}
              ref={(element) => {
                if (element) tabRefs.current.set(tab.id, element)
                else tabRefs.current.delete(tab.id)
              }}
              type="button"
              role="tab"
              id={tabElementId(tab.id)}
              aria-selected={isSelected}
              aria-controls={tabPanelElementId}
              tabIndex={isSelected ? 0 : -1}
              className={styles.tab}
              onClick={() => onSelect(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
