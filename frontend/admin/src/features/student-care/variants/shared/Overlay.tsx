// 겹친 창(모달·오른쪽 서랍). 열려 있는 동안 뒤 문서 스크롤을 잠그고 창 안에서만 스크롤한다(P3).
// 머리글은 창 안 위에 고정돼 긴 목록 끝에서도 닫기·전환이 보인다. 닫으면 열기 전 포커스로 돌아간다.
import { useEffect, useRef, type ReactNode } from 'react'

export function Overlay({ label, kind, header, onClose, children }: { label: string; kind: 'modal' | 'drawer'; header: ReactNode; onClose: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const html = document.documentElement, prev = html.style.overflow
    html.style.overflow = 'hidden'
    box.current?.focus()
    return () => { html.style.overflow = prev; opener?.focus?.({ preventScroll: true }) }
  }, [])
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    if (e.key !== 'Tab' || !box.current) return
    const items = [...box.current.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex="0"]')].filter((x) => !x.hasAttribute('disabled'))
    if (!items.length) return
    const first = items[0], last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
  return (
    <div className="v5-overlay-dim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={box} className={`v5-overlay v5-overlay-${kind}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} onKeyDown={onKey}>
        <div className="v5-overlay-head">{header}</div>
        <div className="v5-overlay-body">{children}</div>
      </div>
    </div>
  )
}
