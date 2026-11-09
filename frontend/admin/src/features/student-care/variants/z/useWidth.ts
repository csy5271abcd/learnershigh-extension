import { useLayoutEffect, useRef, useState } from 'react'

/** 요소 폭(그림을 칸 폭에 맞춘다) */
export function useWidth<T extends HTMLElement>(initial = 600) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(initial)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, Math.floor(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}
