import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import ui from './ui.module.css'

/**
 * 화면 h1. App 안에서 화면이 바뀌면 h1로 Focus를 옮겨 Screen Reader / Keyboard 사용자가 새 화면 시작점에 있게 한다.
 * 주소로 처음 들어온 경우(location.key === 'default')에는 옮기지 않아 Skip Link부터 시작한다.
 * Scroll 위치는 바꾸지 않는다. (Back 후 Scroll 복원 유지)
 */
export function PageTitle({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const { key, pathname } = useLocation()
  const focusedPath = useRef<string | null>(null)

  // Filter / 검색처럼 Query만 바뀔 때는 Focus를 옮기지 않는다. (pathname이 바뀔 때만)
  useEffect(() => {
    if (focusedPath.current === pathname) return
    focusedPath.current = pathname
    if (key !== 'default') ref.current?.focus({ preventScroll: true })
  }, [key, pathname])

  return (
    <h1 ref={ref} tabIndex={-1} className={ui.pageTitle}>
      {children}
    </h1>
  )
}
