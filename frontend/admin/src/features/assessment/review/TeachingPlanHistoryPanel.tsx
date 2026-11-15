import { useEffect, useRef, useState } from 'react'
import { getTeachingPlanHistory } from '../api/assessmentAdminApi.ts'
import { toApiError } from '../api/canonicalSource.ts'
import type { TeachingPlanHistory } from '../api/types.ts'
import { Modal } from '../components/canonicalUi.ts'
import styles from './review.module.css'

// A13 운영계획 재검토 시작·확정 이력 (§39-10). 평가 정보 확정·재검토와 따로다.
// 확정 버전은 불변이고 재확정하면 새 버전이 쌓인다. 학생에게는 최신 버전만, 이전 버전은 관리자만 읽기 전용으로 본다.

const dateTime = (value: string) => new Date(value).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
const decisionText = { CONFIRMED: '확정', EDITED: '수정 확정', EXCLUDED: '제외' } as const

export function TeachingPlanHistoryPanel({ planId, revisionId, canStart, onStart, refreshKey }: { planId: string; revisionId: string; canStart: boolean; onStart: () => Promise<unknown>; refreshKey: string }) {
  const [history, setHistory] = useState<TeachingPlanHistory | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [pending, setPending] = useState(false)
  const [openVersion, setOpenVersion] = useState<number | null>(null)
  const pendingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    getTeachingPlanHistory(planId, revisionId).then(
      (result) => !cancelled && setHistory(result),
      (cause: unknown) => !cancelled && setError(toApiError(cause).message),
    )
    return () => {
      cancelled = true
    }
  }, [planId, revisionId, refreshKey])

  const start = async () => {
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    try {
      await onStart()
      setAsking(false)
    } catch (cause) {
      const apiError = toApiError(cause)
      setError(apiError.fieldReasons().draft === 'already_open' ? '다른 관리자가 이미 운영계획 재검토를 시작했어요. 화면을 새로 고쳐 주세요.' : apiError.message)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  return (
    <section className={styles.note} style={{ margin: '12px 0', display: 'block' }} aria-label="운영계획 재검토·확정 이력" data-testid="teaching-plan-history">
      {canStart && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <span>운영계획을 고쳐야 하면 재검토를 시작해요. 다시 확정하기 전까지 학생에게는 지금 확정본이 그대로 보여요(평가 정보와 별개).</span>
          <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => setAsking(true)} data-testid="teaching-plan-rereview-start">
            운영계획 재검토 시작
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className={styles.statusText} data-tone="danger">
          {error}
        </p>
      )}
      <p className={styles.sectionLabel} style={{ marginTop: canStart ? 12 : 0 }}>
        운영계획 확정 이력
      </p>
      {!history ? (
        !error && <p className={styles.tiny}>확정 이력을 불러오는 중…</p>
      ) : (
        <ol className={styles.rows} data-testid="teaching-plan-history-list">
          {history.items.map((item) => (
            <li key={item.reviewId} className={styles.row} data-testid="teaching-plan-history-item" data-current={item.current ? 'true' : undefined} style={{ display: 'block' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <span className={styles.rowLabel}>{item.versionNo}차 확정</span>
                <span className={styles.rowValue}>
                  {dateTime(item.reviewedAt)} · 공개 {item.publishedRowCount}행 · 제외 {item.excludedRowCount}행
                </span>
                <span className={styles.rowMeta}>
                  {item.current ? '학생 공개 중' : '이전 버전(보존)'} · {item.reviewedBy}
                </span>
                <button type="button" className={`${styles.buttonGhost} ${styles.small}`} aria-expanded={openVersion === item.versionNo} onClick={() => setOpenVersion(openVersion === item.versionNo ? null : item.versionNo)} data-testid="teaching-plan-history-toggle">
                  {openVersion === item.versionNo ? '닫기' : '행 보기'}
                </button>
              </div>
              {openVersion === item.versionNo && (
                <table className={styles.table} style={{ marginTop: 8 }} data-testid="teaching-plan-history-rows">
                  <thead>
                    <tr>
                      <th scope="col">행</th>
                      <th scope="col">단원·내용</th>
                      <th scope="col">결정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.rows.map((row) => (
                      <tr key={`${row.subjectIndex}|${row.rowKey}`}>
                        <td>{row.rowKey}</td>
                        <td>{row.row.unit ?? row.row.specialSchedule ?? '단원 미확인'}</td>
                        <td>{decisionText[row.decision]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </li>
          ))}
        </ol>
      )}
      {asking && (
        <Modal
          title="운영계획 재검토를 시작할까요?"
          onRequestClose={() => !pending && setAsking(false)}
          footer={
            <>
              <button type="button" className={styles.buttonGhost} onClick={() => setAsking(false)} disabled={pending}>
                취소
              </button>
              <button type="button" className={styles.buttonPrimary} onClick={() => void start()} disabled={pending} aria-busy={pending} data-testid="teaching-plan-rereview-confirm">
                재검토 시작
              </button>
            </>
          }
        >
          <p>지금 확정본을 바탕으로 운영계획 초안을 다시 열어요. 이전 확정본은 이력으로 남고, 다시 확정할 때까지 학생 월별 계획에는 지금 확정본이 보여요. 평가 정보 확정에는 영향이 없어요.</p>
        </Modal>
      )}
    </section>
  )
}
