import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReadOnlyStudentSnapshot } from '../api/canonicalSource.ts'
import styles from './studentDesktopPreview.module.css'
import { isPreviewMessage, previewGeometry, type PreviewToChild, type PreviewToParent } from './previewProtocol.ts'

interface StudentDesktopPreviewProps {
  /** 담당 범위 검사를 통과한 한 학생의 기록 (부모가 이미 읽어 둔 것) */
  snapshot: ReadOnlyStudentSnapshot
  /** http 모드: 관리자 읽기 전용 경로로 조회할 학생 */
  httpStudentId?: string
  /** 처음 열 Student 경로 */
  initialPath: string
  onPathChange?: (path: string) => void
  onBlockedCount?: (count: number) => void
  /** 화면 낭독용 이름 */
  title: string
}

// Admin "학생 Desktop 화면 미리보기" (2026-10-29). Student 앱 Desktop 화면을 그대로 그린 뒤 Admin 영역에 맞게 전체를 같은 비율로 줄인다.
// - iframe(Admin 전용 페이지 student-preview.html)이 Desktop 폭의 가상 창을 만든다 → Student의 반응형 규칙이 Desktop으로 계산된다.
// - transform: scale은 iframe 요소에만 준다. 클릭·스크롤 좌표는 브라우저가 변환해 준다.
// - 이 컴포넌트는 Admin 화면 높이에서 자기 위치를 뺀 만큼을 쓰고, 바깥 페이지는 스크롤하지 않는다 (스크롤은 Student 화면 안에서).
export function StudentDesktopPreview({ snapshot, httpStudentId, initialPath, onPathChange, onBlockedCount, title }: StudentDesktopPreviewProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const latest = useRef({ snapshot, httpStudentId, initialPath, onPathChange, onBlockedCount })
  useEffect(() => {
    latest.current = { snapshot, httpStudentId, initialPath, onPathChange, onBlockedCount }
  })

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      const rect = box.getBoundingClientRect()
      setSize({ width: rect.width, height: Math.max(320, window.innerHeight - (rect.top + window.scrollY)) })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // iframe이 준비되면 그 학생 기록과 시작 경로를 넘긴다. 같은 Origin 메시지만 받는다.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow || !isPreviewMessage(event.data)) return
      const message = event.data as PreviewToParent
      if (message.type === 'lh-preview:ready') {
        const payload: PreviewToChild = { type: 'lh-preview:snapshot', snapshot: latest.current.snapshot, path: latest.current.initialPath, httpStudentId: latest.current.httpStudentId }
        frameRef.current?.contentWindow?.postMessage(payload, window.location.origin)
      } else if (message.type === 'lh-preview:path') latest.current.onPathChange?.(message.path)
      else if (message.type === 'lh-preview:blocked') latest.current.onBlockedCount?.(message.count)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const geometry = size ? previewGeometry(size.width, size.height) : null
  return (
    <div ref={boxRef} className={styles.box} style={geometry ? { height: size?.height } : undefined} data-testid="student-desktop-preview" data-scale={geometry?.scale.toFixed(3)}>
      {geometry && (
        <iframe
          ref={frameRef}
          className={styles.frame}
          src="/student-preview.html"
          title={title}
          style={{ width: geometry.virtualWidth, height: geometry.virtualHeight, transform: `scale(${geometry.scale})` }}
        />
      )}
    </div>
  )
}
