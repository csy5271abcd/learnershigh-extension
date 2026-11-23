import { useId, useState } from 'react'
import { toApiError } from '../../api/apiError.ts'
import { getHomeMemo, saveHomeMemo } from '../../api/studentUxApi.ts'
import type { HomeMemo } from '../../api/types.ts'
import { isAssessmentReadOnlyView } from '../../api/viewMode.ts'
import { useApiQuery } from '../../model/useApiQuery.ts'
import { ErrorState, LoadingRows } from '../StateViews.tsx'
import styles from './homeDashboard.module.css'

// A27-UX 학생 홈 메모장 (2026-11-19, api-contract §30-a DRAFT). 이번 주 준비물·해야 할 일 같은 간단 메모를 서버에 저장한다.
// 탐구 노트(§20)와 다른 '홈 메모'다. 본인만 보고(관리자 Endpoint 없음), 다른 탭에서 먼저 저장했으면(409) 덮어쓰지 않고 알려 준다.
const maxLength = 2000

export function HomeMemoCard() {
  const headingId = useId()
  const readOnly = isAssessmentReadOnlyView()
  const query = useApiQuery(readOnly ? 'home-memo|readonly' : 'home-memo', () => (readOnly ? Promise.resolve(null) : getHomeMemo()))
  // 저장 응답이 있으면 그 값을, 없으면 서버에서 읽은 값을 쓴다(편집 중 입력은 draft에만 둔다)
  const [saved, setSaved] = useState<HomeMemo | null>(null)
  const memo = saved ?? query.data ?? null
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const startEdit = () => {
    setDraft(memo?.body ?? '')
    setMessage(null)
    setEditing(true)
  }

  const save = async (body: string) => {
    if (!memo) return
    setSaving(true)
    setMessage(null)
    try {
      const result = await saveHomeMemo(body, memo.version)
      setSaved(result)
      setEditing(false)
      setMessage({ tone: 'success', text: result.body ? '저장했어요.' : '메모를 지웠어요.' })
    } catch (cause) {
      const apiError = toApiError(cause)
      setMessage({
        tone: 'error',
        text: apiError.status === 409 ? '다른 화면에서 먼저 저장된 메모가 있어요. 새로고침해서 최신 메모를 확인해 주세요. 입력한 내용은 그대로 있어요.' : `저장하지 못했어요. ${apiError.message} 입력한 내용은 그대로 있어요.`,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={styles.card} aria-labelledby={headingId} data-testid="home-memo">
      <div className={styles.cardHead}>
        <h2 id={headingId} className={styles.cardTitle}>
          수행평가 메모
        </h2>
        {memo?.updatedAt && !editing && <span className={styles.muted}>저장됨</span>}
      </div>
      {readOnly ? (
        <p className={styles.muted}>학생 개인 메모라 관리자 보기에서는 보여 주지 않아요.</p>
      ) : query.status === 'error' && query.error ? (
        <ErrorState title="메모를 불러오지 못했어요" error={query.error} onRetry={query.retry} />
      ) : !memo ? (
        <LoadingRows rows={2} label="메모를 불러오는 중" />
      ) : editing ? (
        <div className={styles.memoEditor}>
          <textarea
            className={styles.memoInput}
            value={draft}
            maxLength={maxLength}
            rows={5}
            autoFocus
            aria-label="수행평가 메모"
            placeholder="이번 주 준비물이나 해야 할 일을 적어 두세요"
            disabled={saving}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                setDraft(memo.body ?? '')
                setEditing(false)
              }
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                void save(draft)
              }
            }}
            data-testid="home-memo-input"
          />
          <div className={styles.memoActions}>
            <span className={styles.muted}>
              {draft.length}/{maxLength} · 나만 볼 수 있어요
            </span>
            <button
              type="button"
              className={styles.ghostButton}
              disabled={saving}
              onClick={() => {
                setDraft(memo.body ?? '')
                setEditing(false)
              }}
            >
              취소
            </button>
            <button type="button" className={styles.outlineButton} disabled={saving} onClick={() => void save(draft)} data-testid="home-memo-save">
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      ) : memo.body ? (
        <>
          <p className={styles.memoBody} data-testid="home-memo-body">
            {memo.body}
          </p>
          <div className={styles.memoActions}>
            <button type="button" className={styles.ghostButton} disabled={saving} onClick={() => void save('')} data-testid="home-memo-clear">
              지우기
            </button>
            <button type="button" className={styles.outlineButton} onClick={startEdit} data-testid="home-memo-edit">
              수정
            </button>
          </div>
        </>
      ) : (
        <button type="button" className={styles.memoEmpty} onClick={startEdit} data-testid="home-memo-edit">
          + 이번 주 준비물·해야 할 일을 적어 두세요
        </button>
      )}
      {message && (
        <p className={message.tone === 'error' ? styles.inlineError : styles.muted} role={message.tone === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </section>
  )
}
