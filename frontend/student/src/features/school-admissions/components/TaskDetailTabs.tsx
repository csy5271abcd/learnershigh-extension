import { useLayoutEffect, useRef, type KeyboardEvent } from 'react'
import { taskDetailTabElementId, type TaskDetailTabId } from '../model/taskDetail.ts'
import styles from './TaskDetailTabs.module.css'

interface TaskDetailTabsProps {
  items: { id: TaskDetailTabId; label: string; count?: number }[]
  selected: TaskDetailTabId
  onSelect: (id: TaskDetailTabId) => void
  panelId: string
}

// Task Detail 7 Tab (WAI-ARIA Tabs, 화살표로 이동하면 바로 선택).
// 좁은 화면에서는 가로 Scroll하고, 선택 Tab이 잘리지 않게 보이는 위치로 옮긴다.
export function TaskDetailTabs({ items, selected, onSelect, panelId }: TaskDetailTabsProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef(new Map<TaskDetailTabId, HTMLButtonElement>())

  useLayoutEffect(() => {
    const list = listRef.current
    const tab = tabRefs.current.get(selected)
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return
    const left = tab.offsetLeft - list.offsetLeft
    if (left < list.scrollLeft || left + tab.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = left - (list.clientWidth - tab.offsetWidth) / 2
    }
  }, [selected])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.id === selected)
    const last = items.length - 1
    const nextIndex = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[
      event.key
    ]
    if (nextIndex === undefined) return
    event.preventDefault()
    const next = items[nextIndex].id
    onSelect(next)
    tabRefs.current.get(next)?.focus()
  }

  return (
    <div className={styles.bar}>
      <div ref={listRef} role="tablist" aria-label="Task 상세" className={styles.list} onKeyDown={handleKeyDown}>
        {items.map((item) => {
          const isSelected = item.id === selected
          return (
            <button
              key={item.id}
              ref={(element) => {
                if (element) tabRefs.current.set(item.id, element)
                else tabRefs.current.delete(item.id)
              }}
              type="button"
              role="tab"
              id={taskDetailTabElementId(item.id)}
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              className={styles.tab}
              onClick={() => onSelect(item.id)}
            >
              {item.label}
              {item.count !== undefined && <span className={styles.count}> {item.count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
