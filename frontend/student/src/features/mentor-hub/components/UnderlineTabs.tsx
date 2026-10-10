import { useRef, type KeyboardEvent } from 'react'
import styles from './UnderlineTabs.module.css'

export interface UnderlineTabItem<Id extends string> {
  id: Id
  label: string
}

interface UnderlineTabsProps<Id extends string> {
  items: UnderlineTabItem<Id>[]
  selected: Id
  onSelect: (id: Id) => void
  ariaLabel: string
  /** Tab element id = `${idPrefix}-${id}` (tabpanel의 aria-labelledby와 맞춘다) */
  idPrefix: string
  panelId: string
  sticky?: boolean
}

// Mentor Hub Main Tab / Mentor Profile Content Tab이 함께 쓰는 Underline Tab.
// WAI-ARIA Tabs: 좌우 화살표 / Home / End로 이동하고 바로 선택한다.
export function UnderlineTabs<Id extends string>({
  items,
  selected,
  onSelect,
  ariaLabel,
  idPrefix,
  panelId,
  sticky = false,
}: UnderlineTabsProps<Id>) {
  const tabRefs = useRef(new Map<Id, HTMLButtonElement>())

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((tab) => tab.id === selected)
    const last = items.length - 1
    const nextIndex = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key]

    if (nextIndex === undefined) return

    event.preventDefault()
    const next = items[nextIndex].id
    onSelect(next)
    tabRefs.current.get(next)?.focus()
  }

  return (
    <div className={`${styles.bar} ${sticky ? styles.sticky : ''}`}>
      <div role="tablist" aria-label={ariaLabel} className={styles.list} onKeyDown={handleKeyDown}>
        {items.map((tab) => {
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
              id={`${idPrefix}-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={panelId}
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
