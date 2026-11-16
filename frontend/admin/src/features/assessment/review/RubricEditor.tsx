import { useState } from 'react'
import { parseRubric, rubricProblem, type Decision, type RubricCriterion } from './reviewModel.ts'
import styles from './review.module.css'

// A12 채점기준 수동 보완 (§39-9). 분석기가 채점기준을 못 읽었거나 틀렸을 때 관리자가 항목의 채점표 전체를 입력·수정한다.
// 입력값은 서버 공유 초안(결정 EDITED, 경로 performanceEvaluation.items[n].rubric)에 저장되고, 최종 확정 때 확정값이 된다.
// 분석 후보는 그대로 두고(덮어쓰지 않음), 학생에게는 확정된 뒤에만 보인다.

const emptyCriterion = (): RubricCriterion => ({ element: '', levels: [{ description: '', score: null }] })

export function RubricEditor({
  candidate,
  decision,
  onSave,
  readOnly,
  pageCount,
  defaultPage,
}: {
  candidate: RubricCriterion[]
  decision: Decision | undefined
  onSave: (decision: Decision | null) => void
  readOnly: boolean
  pageCount: number | null
  defaultPage: number | null
}) {
  const saved = decision?.kind === 'edited' ? parseRubric(decision.value) : null
  const [draft, setDraft] = useState<RubricCriterion[] | null>(null)
  const [page, setPage] = useState('')
  const [tried, setTried] = useState(false)

  const open = () => {
    setDraft(structuredClone(saved ?? (candidate.length ? candidate : [emptyCriterion()])))
    setPage(decision?.page || (defaultPage ? String(defaultPage) : ''))
    setTried(false)
  }
  const update = (change: (next: RubricCriterion[]) => void) =>
    setDraft((current) => {
      const next = structuredClone(current ?? [])
      change(next)
      return next
    })

  if (draft) {
    const problem = rubricProblem(draft)
    const pageNumber = Number(page)
    const pageProblem = !page || !Number.isInteger(pageNumber) || pageNumber < 1 || (pageCount !== null && pageNumber > pageCount) ? `근거 쪽(1~${pageCount ?? '?'})을 입력해 주세요.` : null
    return (
      <div className={styles.note} data-testid="rubric-editor" style={{ marginTop: 12 }}>
        <p className={styles.sectionLabel} style={{ marginTop: 0 }}>
          채점기준 직접 입력 · 관리자 값
        </p>
        {draft.map((criterion, c) => (
          <fieldset key={c} style={{ border: '1px solid var(--as-color-line)', borderRadius: 8, padding: 12, margin: '0 0 10px' }}>
            <legend className={styles.tiny}>채점 요소 {c + 1}</legend>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className={styles.input}
                aria-label={`채점 요소 ${c + 1} 이름`}
                value={criterion.element}
                maxLength={200}
                onChange={(event) => update((next) => void (next[c].element = event.target.value))}
                data-testid="rubric-element-input"
                style={{ flex: 1 }}
              />
              <input
                className={styles.input}
                type="number"
                min={0}
                max={1000}
                aria-label={`채점 요소 ${c + 1} 요소 배점`}
                placeholder="요소 배점"
                value={criterion.maxScore ?? ''}
                onChange={(event) =>
                  update((next) => {
                    // A15: 요소 배점(선택) — 비우면 저장하지 않는다(0과 다름)
                    if (event.target.value === '') delete next[c].maxScore
                    else next[c].maxScore = Number(event.target.value)
                  })
                }
                data-testid="rubric-max-score"
                style={{ width: 110 }}
              />
              <button type="button" className={`${styles.buttonGhost} ${styles.small}`} onClick={() => update((next) => void next.splice(c, 1))} aria-label={`채점 요소 ${c + 1} 삭제`}>
                요소 삭제
              </button>
            </div>
            {criterion.levels.map((level, l) => (
              <div key={l} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  className={styles.input}
                  aria-label={`채점 요소 ${c + 1} 수준 ${l + 1} 기준`}
                  value={level.description}
                  maxLength={500}
                  onChange={(event) => update((next) => void (next[c].levels[l].description = event.target.value))}
                  data-testid="rubric-level-desc"
                  style={{ flex: '1 1 220px' }}
                />
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={1000}
                  aria-label={`채점 요소 ${c + 1} 수준 ${l + 1} 점수`}
                  value={level.score ?? ''}
                  onChange={(event) => update((next) => void (next[c].levels[l].score = event.target.value === '' ? null : Number(event.target.value)))}
                  data-testid="rubric-level-score"
                  style={{ width: 96 }}
                />
                <span className={styles.tiny}>점</span>
                <button type="button" className={`${styles.buttonGhost} ${styles.small}`} onClick={() => update((next) => void next[c].levels.splice(l, 1))} aria-label={`수준 ${l + 1} 삭제`}>
                  삭제
                </button>
              </div>
            ))}
            <button type="button" className={`${styles.buttonGhost} ${styles.small}`} style={{ marginTop: 8 }} onClick={() => update((next) => void next[c].levels.push({ description: '', score: null }))} data-testid="rubric-add-level">
              수준 추가
            </button>
          </fieldset>
        ))}
        <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => update((next) => void next.push(emptyCriterion()))} data-testid="rubric-add-criterion">
          채점 요소 추가
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <label className={styles.tiny} htmlFor="rubric-page">
            근거 쪽
          </label>
          <input id="rubric-page" className={styles.input} type="number" min={1} value={page} onChange={(event) => setPage(event.target.value)} style={{ width: 90 }} data-testid="rubric-page" />
          <button
            type="button"
            className={`${styles.buttonDark} ${styles.small}`}
            onClick={() => {
              setTried(true)
              if (problem || pageProblem) return
              onSave({ kind: 'edited', value: JSON.stringify(draft), page })
              setDraft(null)
            }}
            data-testid="rubric-save"
          >
            채점기준 적용
          </button>
          <button type="button" className={`${styles.buttonGhost} ${styles.small}`} onClick={() => setDraft(null)}>
            취소
          </button>
        </div>
        {tried && (problem || pageProblem) && (
          <p role="alert" className={styles.statusText} data-tone="danger" data-testid="rubric-problem">
            {problem ?? pageProblem}
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginTop: 12 }} data-testid="rubric-manual">
      {saved && (
        <>
          <p className={styles.sectionLabel}>관리자 채점기준 · 확정 시 학생에게 공개 (근거 {decision?.page}쪽)</p>
          <table className={styles.table} data-testid="rubric-manual-table">
            <tbody>
              {saved.flatMap((criterion, c) =>
                (criterion.levels.length ? criterion.levels : [null]).map((level, l) => (
                  <tr key={`${c}-${l}`}>
                    {l === 0 && (
                      <td rowSpan={Math.max(1, criterion.levels.length)} style={{ fontWeight: 600 }}>
                        {criterion.element}
                        {typeof criterion.maxScore === 'number' && <div className={styles.tiny}>요소 배점 {criterion.maxScore}점</div>}
                      </td>
                    )}
                    <td>{level ? level.description : '수준 없음'}</td>
                    <td className="num">{level && level.score !== null ? `${level.score}점` : '점수 없음'}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </>
      )}
      {!readOnly && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" className={`${styles.button} ${styles.small}`} onClick={open} data-testid="rubric-edit-open">
            {saved ? '채점기준 다시 수정' : candidate.length ? '채점기준 수정·보완' : '채점기준 직접 입력'}
          </button>
          {saved && (
            <button type="button" className={`${styles.buttonGhost} ${styles.small}`} onClick={() => onSave(null)} data-testid="rubric-undo">
              관리자 입력 취소
            </button>
          )}
        </div>
      )}
    </div>
  )
}
