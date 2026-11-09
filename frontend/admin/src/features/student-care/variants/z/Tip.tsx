// 정확값 안내(F15). data-tip이 있는 요소에 마우스를 올리거나 초점을 두면 그 요소 옆에 작은 글자 상자를 띄운다.
// 상자는 클릭을 가로채지 않고, 화면 가장자리에서는 안쪽으로 붙는다.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export function TipHost({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ text: string; rect: DOMRect } | null>(null)
  useEffect(() => {
    const el = host.current
    if (!el) return
    const show = (e: Event) => { const t = (e.target as Element).closest?.('[data-tip]'); if (t && el.contains(t)) setTip({ text: t.getAttribute('data-tip')!, rect: t.getBoundingClientRect() }) }
    const hide = (e: Event) => { const t = (e.target as Element).closest?.('[data-tip]'); const to = (e as MouseEvent | FocusEvent).relatedTarget as Element | null; if (t && !(to && t.contains(to))) setTip(null) }
    const off = () => setTip(null)
    el.addEventListener('mouseover', show); el.addEventListener('focusin', show)
    el.addEventListener('mouseout', hide); el.addEventListener('focusout', hide)
    window.addEventListener('scroll', off, true)
    return () => { el.removeEventListener('mouseover', show); el.removeEventListener('focusin', show); el.removeEventListener('mouseout', hide); el.removeEventListener('focusout', hide); window.removeEventListener('scroll', off, true) }
  }, [])
  useLayoutEffect(() => {
    const b = box.current
    if (!b || !tip) return
    const { width, height } = b.getBoundingClientRect()
    const r = tip.rect
    let left = r.left + r.width / 2 - width / 2
    left = Math.max(8, Math.min(window.innerWidth - width - 8, left))
    const top = r.top - height - 8 >= 8 ? r.top - height - 8 : r.bottom + 8
    b.style.left = `${left}px`; b.style.top = `${top}px`
  }, [tip])
  return (
    <div ref={host} className="z-tip-host">
      {children}
      {tip && <div ref={box} className="z-tip" role="tooltip">{tip.text}</div>}
    </div>
  )
}
