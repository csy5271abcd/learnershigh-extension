import { useEffect } from 'react'
import ui from '../../components/AdminUi.module.css'
import styles from './ReviewPage.module.css'

export interface ReviewNavigation {
  /** 지금 Queue 안의 위치 (1부터). 이미 Queue에서 빠졌으면 null */
  position: number | null
  total: number
  prevId: string | null
  nextId: string | null
}

// Review 공통 상단: Shared Queue로 돌아가기 · 위치 · 이전 / 다음 (FeedbackDetail Mockup 단축키 J / K)
export function ReviewTopBar({ navigation, status, onBack, onGo }: { navigation: ReviewNavigation; status: string; onBack: () => void; onGo: (feedbackId: string) => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      // 입력 중 · Dialog 안에서는 동작하지 않는다.
      if ((target instanceof Element && target.closest('input, textarea, select, [contenteditable], dialog')) || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'j' && navigation.prevId) onGo(navigation.prevId)
      if (event.key === 'k' && navigation.nextId) onGo(navigation.nextId)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigation.prevId, navigation.nextId, onGo])

  return (
    <div className={styles.topBar}>
      <button type="button" className={ui.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> Shared Queue<span className="lh-visually-hidden">로 돌아가기</span>
      </button>
      <p className={ui.muted}>
        {navigation.position !== null ? `${navigation.position} / ${navigation.total} · ` : 'Queue 밖 · '}
        {status}
      </p>
      <div className={styles.topActions}>
        <span className={ui.muted} aria-hidden="true">
          단축키 J 이전 · K 다음
        </span>
        <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} disabled={!navigation.prevId} onClick={() => navigation.prevId && onGo(navigation.prevId)}>
          이전 (J)
        </button>
        <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} disabled={!navigation.nextId} onClick={() => navigation.nextId && onGo(navigation.nextId)}>
          다음 (K)
        </button>
      </div>
    </div>
  )
}
