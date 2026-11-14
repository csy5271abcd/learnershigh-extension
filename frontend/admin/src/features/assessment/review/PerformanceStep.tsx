import { useState } from 'react'
import type { EvaluationPlanAnalysisView, ReviewFieldCandidate } from '../api/types.ts'
import { candidateText, displayValue, fieldKey, fieldName, fieldUnit, type Decision } from './reviewModel.ts'
import styles from './review.module.css'

// 3단계 수행평가 검토: 과목 → 수행평가 카드 → 항목별 확인·수정.
// 결정(맞아요/수정/원문에 없음)은 이 화면 안 상태이고 서버 임시 저장은 없다. 최종 확정 때 PUT review로 저장된다.
// 값이 없는 후보는 '확인 필요'로 강조하고 0으로 바꾸지 않는다.

interface StepProps {
  view: EvaluationPlanAnalysisView
  subjectIndex: number
  onSubject: (index: number) => void
  decisions: Record<string, Decision>
  onDecide: (field: ReviewFieldCandidate, decision: Decision | null) => void
  onJump: (page: number) => void
  readOnly: boolean
}

export function PerformanceStep({ view, subjectIndex, onSubject, decisions, onDecide, onJump, readOnly }: StepProps) {
  const fields = (view.reviewFields ?? []).filter((field) => field.subjectIndex === subjectIndex)
  const subject = view.subjects[subjectIndex]
  const commonFields = fields.filter((field) => !field.fieldPath.startsWith('performanceEvaluation.items['))
  const items = (view.itemDetails ?? []).filter((item) => item.subjectIndex === subjectIndex)
  const itemFields = (itemIndex: number) => fields.filter((field) => field.fieldPath.startsWith(`performanceEvaluation.items[${itemIndex}].`))

  return (
    <div data-testid="review-step-performance">
      <h3 className={styles.stepTitle}>수행평가 세부기준 검토</h3>
      <p className={styles.stepLead}>원문과 비교해 맞는 값은 &lsquo;맞아요&rsquo;, 다른 값은 &lsquo;수정&rsquo;을 눌러 고쳐 주세요. 원문 쪽 버튼을 누르면 왼쪽 원문이 그 쪽으로 이동해요.</p>

      {view.reviewStatus === 'CONFIRMED' && (
        <div className={styles.notice} data-tone="success" role="status" data-testid="performance-confirmed-notice">
          <div>
            <strong>확정이 끝난 문서예요</strong>
            <p>아래는 분석기 후보(읽기 전용)예요. 학생에게 공개된 확정값은 &lsquo;최종 확정&rsquo; 단계에서 볼 수 있어요.</p>
          </div>
        </div>
      )}
      <div className={styles.subjectRail} role="group" aria-label="과목 선택">
        {view.subjects.map((item, index) => {
          const list = (view.reviewFields ?? []).filter((field) => field.subjectIndex === index)
          const reviewed = list.filter((field) => decisions[fieldKey(field)]).length
          return (
            <button key={`${item.subjectName}-${index}`} type="button" className={styles.subjectChip} aria-pressed={index === subjectIndex} onClick={() => onSubject(index)}>
              <strong title={item.subjectName}>{item.subjectName}</strong>
              <span className={styles.tiny}>
                수행평가 {item.performanceEvaluation?.items.length ?? 0}개 · 검토 {reviewed}/{list.length}
              </span>
            </button>
          )
        })}
      </div>

      {!subject ? (
        <p className={styles.muted}>분석기가 인식한 과목이 없어요. 원문을 직접 확인해 주세요.</p>
      ) : (
        <>
          {commonFields.length > 0 && (
            <section className={styles.itemCard} aria-label={`${subject.subjectName} 평가 비율`}>
              <div className={styles.itemHead}>
                <h4>{subject.subjectName} · 평가 비율</h4>
              </div>
              <div className={styles.fieldGrid}>
                {commonFields.map((field) => (
                  <FieldTile key={fieldKey(field)} field={field} view={view} decision={decisions[fieldKey(field)]} onDecide={onDecide} onJump={onJump} readOnly={readOnly} />
                ))}
              </div>
            </section>
          )}

          {items.length === 0 ? (
            <div className={styles.softCard} style={{ marginTop: 14 }}>
              <p className={styles.muted}>이 과목에서 추출한 수행평가가 없어요. 분석되지 않았을 수 있으니 원문을 직접 확인해 주세요.</p>
            </div>
          ) : (
            items.map((item) => {
              const list = itemFields(item.itemIndex ?? -1)
              const reviewed = list.filter((field) => decisions[fieldKey(field)]).length
              const pending = list.length - reviewed
              return (
                <section key={`${item.itemKey}-${item.itemIndex}`} className={styles.itemCard} style={{ marginTop: 14 }} aria-label={item.label} data-testid="review-item-card">
                  <div className={styles.itemHead}>
                    <h4>{item.label || '이름을 읽지 못한 수행평가'}</h4>
                    {list.length > 0 && pending === 0 ? (
                      <span className={styles.pill} data-tone="success">검토 완료</span>
                    ) : (
                      <span className={styles.pill} data-tone="warning">확인 {pending}개 남음</span>
                    )}
                  </div>
                  <div className={styles.fieldGrid}>
                    {list.map((field) => (
                      <FieldTile key={fieldKey(field)} field={field} view={view} decision={decisions[fieldKey(field)]} onDecide={onDecide} onJump={onJump} readOnly={readOnly} />
                    ))}
                  </div>
                  <div className={styles.itemDetail}>
                    <div>
                      <span className={styles.detailLabel}>평가 방법 · 활동</span>
                      <p className={styles.detailText}>{item.content ?? '분석되지 않음 · 원문 확인 필요'}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      <div>
                        <span className={styles.detailLabel}>제출물</span>
                        <p className={styles.detailText}>{item.submissions.length ? item.submissions.join(', ') : '분석되지 않음'}</p>
                      </div>
                      <div>
                        <span className={styles.detailLabel}>조건</span>
                        <p className={styles.detailText}>{item.conditions.length ? item.conditions.join('\n') : '분석되지 않음'}</p>
                      </div>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>채점기준표 (분석기 후보)</span>
                      {item.rubric.length === 0 ? (
                        <p className={styles.detailText}>분석되지 않음 · 원문 확인 필요</p>
                      ) : (
                        <table className={styles.rubric} data-testid="review-rubric">
                          <thead>
                            <tr>
                              <th scope="col">평가 요소</th>
                              <th scope="col">수행 수준</th>
                              <th scope="col" style={{ width: 70 }}>배점</th>
                              <th scope="col" style={{ width: 92 }}>원문</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.rubric.flatMap((criterion, criterionIndex) => {
                              const levels = criterion.levels.length ? criterion.levels : [null]
                              return levels.map((level, levelIndex) => (
                                <tr key={`${criterionIndex}-${levelIndex}`}>
                                  {levelIndex === 0 && (
                                    <td rowSpan={levels.length} style={{ fontWeight: 600 }}>
                                      {criterion.element}
                                    </td>
                                  )}
                                  <td>{level ? level.description : '수준 분석되지 않음'}</td>
                                  <td>{level && level.score !== null ? `${level.score}점` : '확인 필요'}</td>
                                  {levelIndex === 0 && (
                                    <td rowSpan={levels.length}>
                                      {criterion.sourcePages.length
                                        ? criterion.sourcePages.map((page) => (
                                            <button key={page} type="button" className={styles.pageLink} onClick={() => onJump(page)}>
                                              {page}쪽
                                            </button>
                                          ))
                                        : <span className={styles.tiny}>근거 없음</span>}
                                    </td>
                                  )}
                                </tr>
                              ))
                            })}
                          </tbody>
                        </table>
                      )}
                      <p className={styles.tiny} style={{ marginTop: 6 }}>채점기준표는 지금 화면에서 확인용으로만 보여요. 수준·배점 단위 확정은 분석 계약(0.3)이 정해진 뒤 열려요.</p>
                    </div>
                  </div>
                </section>
              )
            })
          )}
        </>
      )}
    </div>
  )
}

function FieldTile({
  field,
  view,
  decision,
  onDecide,
  onJump,
  readOnly,
}: {
  field: ReviewFieldCandidate
  view: EvaluationPlanAnalysisView
  decision: Decision | undefined
  onDecide: (field: ReviewFieldCandidate, decision: Decision | null) => void
  onJump: (page: number) => void
  readOnly: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [page, setPage] = useState('')
  const name = fieldName(field, view)
  const candidate = candidateText(field.candidate)
  const firstPage = field.sourcePages[0] ? String(field.sourcePages[0]) : ''
  const state = editing ? 'editing' : decision ? (decision.kind === 'edited' ? 'edited' : 'confirmed') : field.candidate === null ? 'missing' : 'unchecked'
  const numeric = field.kind === 'number'
  const invalid = value.trim() !== '' && numeric && !Number.isFinite(Number(value))

  const startEdit = () => {
    setValue(decision && decision.kind !== 'absent' ? decision.value : candidate)
    setPage(decision?.page || firstPage)
    setEditing(true)
  }
  const apply = () => {
    if (invalid) return
    const trimmed = value.trim()
    onDecide(field, trimmed === candidate ? { kind: 'confirmed', value: trimmed, page } : { kind: 'edited', value: trimmed, page })
    setEditing(false)
  }

  return (
    <div className={styles.field} data-state={state} data-testid="review-field" data-field-path={field.fieldPath}>
      <div className={styles.fieldLabel}>
        <span>{name}</span>
        <span>
          {state === 'missing' && '확인 필요'}
          {state === 'unchecked' && '미확인'}
          {state === 'confirmed' && '✓ 확인함'}
          {state === 'edited' && '수정함'}
          {state === 'editing' && '수정 중'}
        </span>
      </div>
      {editing ? (
        <>
          <div className={styles.editRow}>
            <input
              className={styles.input}
              aria-label={`${name} 값`}
              aria-invalid={invalid}
              inputMode={numeric ? 'decimal' : undefined}
              value={value}
              placeholder={numeric ? `숫자${fieldUnit(field.fieldPath) ? ` (${fieldUnit(field.fieldPath)})` : ''}` : '값'}
              onChange={(event) => setValue(event.target.value)}
              data-testid="review-field-input"
            />
            <input className={styles.input} aria-label={`${name} 근거 쪽`} inputMode="numeric" value={page} placeholder="쪽" onChange={(event) => setPage(event.target.value)} data-testid="review-field-page" />
          </div>
          {invalid && <p className={styles.tiny} style={{ color: 'var(--as-color-danger)', margin: '0 0 6px' }}>숫자를 입력해 주세요.</p>}
          <div className={styles.fieldActions}>
            <button type="button" className={styles.chipButton} data-variant="primary" onClick={apply} disabled={invalid} data-testid="review-field-apply">
              적용
            </button>
            <button
              type="button"
              className={styles.chipButton}
              onClick={() => {
                onDecide(field, { kind: 'absent', page })
                setEditing(false)
              }}
            >
              원문에 없음
            </button>
            <button type="button" className={styles.chipButton} onClick={() => setEditing(false)}>
              취소
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.fieldValue}>
            {decision?.kind === 'edited' && <s>{displayValue(candidate, field.fieldPath)}</s>}
            {decision?.kind === 'absent' ? '원문에 없음' : displayValue(decision ? decision.value : candidate, field.fieldPath)}
          </p>
          <div className={styles.fieldActions}>
            {field.sourcePages.slice(0, 2).map((source) => (
              <button key={source} type="button" className={styles.pageLink} onClick={() => onJump(source)} aria-label={`${name} 원문 ${source}쪽으로 이동`}>
                {source}쪽
              </button>
            ))}
            {!readOnly && !decision && (
              <button type="button" className={styles.chipButton} onClick={() => onDecide(field, { kind: 'confirmed', value: candidate, page: firstPage })} disabled={field.candidate === null} data-testid="review-field-confirm">
                맞아요
              </button>
            )}
            {!readOnly && (
              <button type="button" className={styles.chipButton} onClick={startEdit} data-testid="review-field-edit">
                수정
              </button>
            )}
            {!readOnly && decision && (
              <button type="button" className={styles.chipButton} onClick={() => onDecide(field, null)} data-testid="review-field-undo">
                되돌리기
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
