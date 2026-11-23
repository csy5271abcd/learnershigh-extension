import { useEffect, useRef, useState } from 'react'
import { getPlanReviewHistory } from '../api/assessmentAdminApi.ts'
import { toApiError } from '../api/canonicalSource.ts'
import type { PlanReviewHistory } from '../api/types.ts'
import { Modal } from '../components/canonicalUi.ts'
import styles from './review.module.css'
import { actorLabel } from '../model/actorLabel.ts'

// A12 재검토·확정 이력 (§39-8). 확정 기록은 불변이고 재확정하면 새 기록이 쌓인다. 학생은 최신 확정 기록만 본다.
// 재검토를 시작해도 재확정 전까지 학생 공개값은 그대로다(초안은 학생에게 보이지 않음).

const dateTime = (value: string) => new Date(value).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })

export function ReReviewPanel({ planId, revisionId, onReopen, reopened }: { planId: string; revisionId: string; onReopen: () => Promise<unknown>; reopened: boolean }) {
  const [history, setHistory] = useState<PlanReviewHistory | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pendingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    getPlanReviewHistory(planId, revisionId).then(
      (result) => !cancelled && setHistory(result),
      (cause: unknown) => !cancelled && setHistoryError(toApiError(cause).message),
    )
    return () => {
      cancelled = true
    }
  }, [planId, revisionId, reopened])

  const start = async () => {
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(null)
    try {
      await onReopen()
      setAsking(false)
    } catch (cause) {
      const apiError = toApiError(cause)
      setError(apiError.fieldReasons().draft === 'already_open' ? '다른 관리자가 이미 재검토를 시작했어요. 화면을 새로 고쳐 주세요.' : apiError.message)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  return (
    <section className={styles.note} style={{ marginTop: 16, display: 'block' }} aria-label="재검토·확정 이력" data-testid="review-rereview">
      {!reopened && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <span>확정값을 고쳐야 하면 &lsquo;확정 내용 수정&rsquo;을 눌러요. 다시 최종 승인하기 전까지 학생에게는 지금 확정본이 그대로 보여요.</span>
          <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => setAsking(true)} data-testid="review-rereview-start">
            확정 내용 수정
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className={styles.statusText} data-tone="danger">
          {error}
        </p>
      )}
      <p className={styles.sectionLabel} style={{ marginTop: 12 }}>
        확정 이력
      </p>
      {historyError ? (
        <p role="alert" className={styles.statusText} data-tone="danger">
          확정 이력을 불러오지 못했어요. {historyError}
        </p>
      ) : !history ? (
        <p className={styles.tiny}>확정 이력을 불러오는 중…</p>
      ) : (
        <ol className={styles.rows} data-testid="review-history">
          {history.items.map((item, index) => (
            <li key={item.reviewId} className={styles.row} data-testid="review-history-item" data-current={item.current ? 'true' : undefined}>
              <span className={styles.rowLabel}>{history.items.length - index}차 확정</span>
              <span className={styles.rowValue}>
                {dateTime(item.reviewedAt)} · 값 {item.confirmedFieldCount}개
              </span>
              <span className={styles.rowMeta}>{item.current ? '학생 공개 중' : '이전 기록(보존)'} · {actorLabel(item.reviewedBy)}</span>
            </li>
          ))}
        </ol>
      )}
      {asking && (
        <Modal
          title="확정 내용을 수정할까요?"
          onRequestClose={() => !pending && setAsking(false)}
          footer={
            <>
              <button type="button" className={styles.buttonGhost} onClick={() => setAsking(false)} disabled={pending}>
                취소
              </button>
              <button type="button" className={styles.buttonPrimary} onClick={() => void start()} disabled={pending} aria-busy={pending} data-testid="review-rereview-confirm">
                수정 시작
              </button>
            </>
          }
        >
          <p>지금 확정값으로 수정 초안을 만들어요. 이전 확정 기록은 지워지지 않고, 다시 최종 승인할 때까지 학생에게는 지금 값이 그대로 보여요.</p>
        </Modal>
      )}
    </section>
  )
}
