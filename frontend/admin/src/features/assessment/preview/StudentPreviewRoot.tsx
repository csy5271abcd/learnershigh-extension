import { useEffect, useState } from 'react'
import { blockedWriteAttempts, clearApiQueryCache, configureAdminReadOnlyView, loadReadOnlyStudentSnapshot, setAssessmentViewMode } from '../api/canonicalSource.ts'
import { AssessmentReadOnlyViewer } from '../components/canonicalUi.ts'
import { isPreviewMessage, type PreviewToChild, type PreviewToParent } from './previewProtocol.ts'

const post = (message: PreviewToParent) => window.parent.postMessage(message, window.location.origin)

export function StudentPreviewRoot() {
  const [initialPath, setInitialPath] = useState<string | null>(null)

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || !isPreviewMessage(event.data)) return
      const message = event.data as PreviewToChild
      if (message.type !== 'lh-preview:snapshot') return
      setAssessmentViewMode('admin-readonly')
      clearApiQueryCache()
      // http: Student 화면이 GET만 관리자 읽기 전용 경로로 직접 조회한다(학생 Header 없음). Mock: 넘겨받은 Snapshot 사본.
      configureAdminReadOnlyView(message.httpStudentId ?? null)
      loadReadOnlyStudentSnapshot(message.snapshot)
      setInitialPath(message.path)
    }
    window.addEventListener('message', onMessage)
    post({ type: 'lh-preview:ready' })
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (initialPath === null) return
    const timer = window.setInterval(() => post({ type: 'lh-preview:blocked', count: blockedWriteAttempts().length }), 1000)
    return () => window.clearInterval(timer)
  }, [initialPath])

  if (window.parent === window) return <p className="lh-preview-standalone">이 페이지는 Admin 학생 화면 보기 안에서만 열려요.</p>
  if (initialPath === null) return null
  return <AssessmentReadOnlyViewer initialPath={initialPath} onPathChange={(path) => post({ type: 'lh-preview:path', path })} />
}
