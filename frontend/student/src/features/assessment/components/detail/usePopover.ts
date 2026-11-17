import { useCallback, useEffect, useRef, useState } from 'react'

/** 버튼으로 여는 Popover: 바깥 클릭·Esc로 닫고, Esc로 닫으면 버튼으로 Focus를 돌려준다. */
export function usePopover<T extends HTMLElement = HTMLDivElement>(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen)
  const rootRef = useRef<T>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  return { open, setOpen, close, rootRef, triggerRef }
}
