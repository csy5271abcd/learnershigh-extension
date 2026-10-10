import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react'
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
  /**
   * automatic: 화살표로 이동하면 바로 선택 (같은 화면 안 전환)
   * manual: 화살표는 Focus만 이동, Enter / Space로 선택 (선택이 화면 이동을 일으키는 경우)
   */
  activation?: 'automatic' | 'manual'
  /** Tab 선택으로 화면이 바뀐 직후, 새 화면의 선택 Tab으로 Focus를 돌려준다. */
  focusSelectedOnMount?: boolean
}

// Mentor Hub Main Tab / Mentor Profile Content Tab이 함께 쓰는 Underline Tab. (WAI-ARIA Tabs)
export function UnderlineTabs<Id extends string>({
  items,
  selected,
  onSelect,
  ariaLabel,
  idPrefix,
  panelId,
  sticky = false,
  activation = 'automatic',
  focusSelectedOnMount = false,
}: UnderlineTabsProps<Id>) {
  const tabRefs = useRef(new Map<Id, HTMLButtonElement>())
  const listRef = useRef<HTMLDivElement>(null)

  // 좁은 화면에서 Tab 줄이 가로 스크롤될 때 선택 Tab이 잘리지 않게 보이는 위치로 옮긴다.
  useLayoutEffect(() => {
    const list = listRef.current
    const tab = tabRefs.current.get(selected)
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return
    const left = tab.offsetLeft - list.offsetLeft
    if (left < list.scrollLeft || left + tab.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = left - (list.clientWidth - tab.offsetWidth) / 2
    }
  }, [selected])

  useEffect(() => {
    if (focusSelectedOnMount) tabRefs.current.get(selected)?.focus({ preventScroll: true })
    // 화면이 처음 그려질 때 한 번만 실행한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const focusedId = items.find((tab) => tabRefs.current.get(tab.id) === document.activeElement)?.id ?? selected
    const index = items.findIndex((tab) => tab.id === focusedId)
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
    tabRefs.current.get(next)?.focus()
    if (activation === 'automatic') onSelect(next)
  }

  return (
    <div className={`${styles.bar} ${sticky ? styles.sticky : ''}`}>
      <div ref={listRef} role="tablist" aria-label={ariaLabel} className={styles.list} onKeyDown={handleKeyDown}>
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
