import { useState, type FormEvent } from 'react'
import { searchSchoolDirectory, selectSchoolDirectory } from '../api/assessmentAdminApi.ts'
import type { SchoolDirectoryItem, SchoolDirectorySearch as SearchResult } from '../api/http/assessmentAdminHttp.ts'
import review from '../review/review.module.css'
import styles from './SchoolDirectorySearch.module.css'

// A27-UX 부록 O §38-15: 평가계획서가 0건인 학교도 학교알리미 공식 검색으로 찾아 고른다.
// - 고르면 서버가 그 학교 하나만 최근 3개 학년도(18구간)를 자동 확인한다. 학적·학생은 만들지 않는다.
// - 같은 이름 학교는 지역·주소로 구별해 보여 주고, 주소가 없거나 같으면 고를 수 없다(자동 선택 없음).
// - A28-45: 검색 목록이 불완전해도(잘림·일부 상세 실패) 서버가 개별 식별한 학교(ID·상세·주소)는 고를 수 있다. 불완전 경고는 그대로 보이고,
//   확인하지 못한 학교가 있으면 '다시 확인'(캐시 없이 다시 검색)을 준다.
// - A28-02: 검색 → 학교 1곳 선택 → 대상 확인 → 3개년 수집. '이 학교 선택'은 확인 단계만 열고, 수집(선택 POST)은 확인을 누를 때만 보낸다.

const REASON: Record<string, string> = {
  ADDRESS_MISSING: '주소가 없어 구별할 수 없어요',
  ADDRESS_DUPLICATE: '같은 이름·같은 주소 학교가 있어 구별할 수 없어요',
  ID_MISSING: '학교알리미 학교 번호가 없어 구별할 수 없어요',
  ID_CONFLICT: '학교알리미 학교 번호가 겹쳐 구별할 수 없어요',
  SEARCH_INCOMPLETE: '검색 결과를 모두 확인하지 못했어요',
}
const INCOMPLETE: Record<string, string> = {
  SEARCH_TRUNCATED: '학교알리미 검색 목록 일부만 읽었어요',
  TOO_MANY_RESULTS: '검색 결과가 많아 앞 15곳만 확인했어요',
  DETAIL_FAILED: '일부 학교의 상세 정보를 읽지 못했어요',
}

export function SchoolDirectorySearch({ onSelected }: { onSelected: (schoolId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'done'; result: SearchResult }>({ kind: 'idle' })
  const [selecting, setSelecting] = useState<string | null>(null)
  const [selectError, setSelectError] = useState<string | null>(null)
  // A28-02 대상 확인: 고른 후보(아직 서버에 보내지 않음)
  const [pendingItem, setPendingItem] = useState<SchoolDirectoryItem | null>(null)

  const submit = (event: FormEvent | null, refresh = false) => {
    event?.preventDefault()
    const text = query.trim()
    if (text.length < 2) {
      setState({ kind: 'error', message: '학교 이름을 2자 이상 입력해 주세요.' })
      return
    }
    setState({ kind: 'loading' })
    setSelectError(null)
    setPendingItem(null)
    searchSchoolDirectory(text, refresh).then(
      (result) => setState({ kind: 'done', result }),
      (cause: Error) => setState({ kind: 'error', message: cause.message }),
    )
  }

  const choose = (item: SchoolDirectoryItem) => {
    setSelecting(item.candidateId)
    setSelectError(null)
    selectSchoolDirectory(item.candidateId).then(
      (selected) => {
        setSelecting(null)
        setPendingItem(null)
        setOpen(false)
        onSelected(selected.schoolId)
      },
      (cause: Error) => {
        setSelecting(null)
        setSelectError(cause.message)
      },
    )
  }

  if (!open) {
    return (
      <button type="button" className={review.button} onClick={() => setOpen(true)} data-testid="school-directory-open">
        학교 검색
      </button>
    )
  }

  return (
    <section className={styles.panel} aria-label="학교알리미 학교 검색" data-testid="school-directory">
      <form className={styles.form} onSubmit={submit} role="search">
        <label className={styles.label} htmlFor="school-directory-query">
          학교알리미에서 학교 찾기
        </label>
        <input
          id="school-directory-query"
          className={styles.input}
          value={query}
          maxLength={40}
          placeholder="예: 한솔고등학교"
          onChange={(event) => setQuery(event.target.value)}
          data-testid="school-directory-query"
          autoFocus
        />
        <button type="submit" className={review.buttonPrimary} disabled={state.kind === 'loading'} aria-busy={state.kind === 'loading'} data-testid="school-directory-submit">
          {state.kind === 'loading' ? '검색 중…' : '검색'}
        </button>
        <button type="button" className={review.buttonGhost} onClick={() => setOpen(false)}>
          닫기
        </button>
      </form>
      <p className={review.muted}>평가계획서가 아직 없는 학교도 찾을 수 있어요. 고르면 그 학교의 최근 3개 학년도 원본을 자동으로 확인해요(학생 학적은 바뀌지 않아요).</p>
      {state.kind === 'error' && (
        <p className={styles.error} role="alert" data-testid="school-directory-error">
          {state.message}
        </p>
      )}
      {selectError && (
        <p className={styles.error} role="alert">
          {selectError}
        </p>
      )}
      {state.kind === 'done' && (
        <>
          {!state.result.complete && (() => {
            const selectableCount = state.result.items.filter((item) => item.selectable).length
            const unverified = state.result.unverifiedCount ?? 0
            return (
              <p className={styles.warning} role="status" data-testid="school-directory-incomplete">
                {INCOMPLETE[state.result.incompleteReason ?? ''] ?? '검색 결과를 모두 확인하지 못했어요'} · 확인된 {selectableCount}곳 선택 가능
                {unverified > 0 ? ` · 확인하지 못한 ${unverified}곳` : ''} · 찾는 학교가 없으면 정확한 이름으로 다시 검색{' '}
                <button type="button" className={review.buttonGhost} onClick={() => submit(null, true)} data-testid="school-directory-retry">
                  다시 확인
                </button>
              </p>
            )
          })()}
          {state.result.items.length === 0 ? (
            <p className={review.muted} data-testid="school-directory-empty">
              &lsquo;{state.result.query}&rsquo;(으)로 찾은 학교가 없어요.
            </p>
          ) : (
            <ul className={styles.list} data-testid="school-directory-results">
              {state.result.items.map((item) => (
                <li key={item.candidateId} className={styles.item} data-testid="school-directory-item">
                  <div className={styles.itemText}>
                    <strong>{item.officialName}</strong>
                    <span className={styles.region}>
                      {[item.sido, item.sigungu].filter(Boolean).join(' ') || '지역 정보 없음'}
                    </span>
                    <span className={review.muted}>{item.address ?? '주소 없음'}</span>
                    {item.schoolId && <span className={styles.badge}>이미 쓰는 학교</span>}
                  </div>
                  {item.selectable ? (
                    <button
                      type="button"
                      className={review.button}
                      onClick={() => {
                        setSelectError(null)
                        setPendingItem(item)
                      }}
                      disabled={selecting !== null}
                      aria-pressed={pendingItem?.candidateId === item.candidateId}
                      data-testid="school-directory-select"
                    >
                      이 학교 선택
                    </button>
                  ) : (
                    <span className={styles.reason} data-testid="school-directory-unselectable">
                      {REASON[item.unselectableReason ?? ''] ?? '고를 수 없어요'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {pendingItem && (
            <div className={styles.confirm} role="group" aria-label="조회할 학교 확인" data-testid="school-directory-confirm-panel">
              <strong>이 학교의 평가계획서를 조회할까요?</strong>
              <span>
                {pendingItem.officialName} · {[pendingItem.sido, pendingItem.sigungu].filter(Boolean).join(' ') || '지역 정보 없음'} · {pendingItem.address ?? '주소 없음'}
              </span>
              <span className={review.muted}>
                최근 3개 학년도 × 고1~고3 × 1·2학기(18개 구간)를 학교알리미에서 확인해요.{' '}
                {pendingItem.schoolId ? '이미 등록된 학교라 받은 원본은 다시 받지 않고 재사용해요. ' : ''}
                이 학교 자료만 받고, 학생 학적·담당 관계·기존 학교 매핑은 바뀌지 않아요.
              </span>
              <div className={styles.confirmActions}>
                <button type="button" className={review.buttonGhost} onClick={() => setPendingItem(null)} disabled={selecting !== null}>
                  취소
                </button>
                <button
                  type="button"
                  className={review.buttonPrimary}
                  onClick={() => choose(pendingItem)}
                  disabled={selecting !== null}
                  aria-busy={selecting === pendingItem.candidateId}
                  data-testid="school-directory-confirm"
                >
                  {selecting === pendingItem.candidateId ? '조회를 시작하는 중…' : '이 학교로 조회 시작'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
