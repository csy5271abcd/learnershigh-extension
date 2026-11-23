import { useState } from 'react'
import type { EvaluationPlanAnalysisView, ReviewFieldCandidate } from '../api/types.ts'
import { CheckIcon } from '../components/canonicalUi.ts'
import { candidateText, displayValue, fieldKey, fieldName, fieldUnit, gradeText, rubricFieldPath, type Decision } from './reviewModel.ts'
import { RubricEditor } from './RubricEditor.tsx'
import styles from './review.module.css'
import { EvidenceLinks } from './EvidenceLinks.tsx'
import type { OnJump } from './evidence.ts'
import { attentionReasons, filterCounts, filterLabels, matchesFilter, nextMatchingCell, type ReviewFilter } from './reviewFilter.ts'

// 3단계 수행평가 세부기준 검토: 왼쪽 목록(과목 → 평가 비율 · 수행평가) | 오른쪽 선택 항목 상세.
// 필드는 "이름 · 값 · 원문 쪽 · [확인][수정]" 한 줄. 수정할 때만 입력을 펼친다. 항목이 100개여도 한 번에 한 수행평가만 본다.
// 결정은 화면 상태(브라우저 임시 보관)이고 서버 저장은 최종 확정(PUT review) 때 한다. 값 없는 후보는 0으로 바꾸지 않는다.

export type PerformanceSelection = { subjectIndex: number; item: 'common' | number }

interface StepProps {
  view: EvaluationPlanAnalysisView
  selection: PerformanceSelection
  onSelect: (selection: PerformanceSelection) => void
  decisions: Record<string, Decision>
  onDecide: (field: ReviewFieldCandidate, decision: Decision | null) => void
  /** A12 채점기준 보완처럼 후보 필드가 없는 결정 (키 = 과목번호|fieldPath) */
  onDecideKey: (key: string, decision: Decision | null) => void
  onJump: OnJump
  readOnly: boolean
}

const isItemField = (field: ReviewFieldCandidate, itemIndex: number) => field.fieldPath.startsWith(`performanceEvaluation.items[${itemIndex}].`)
const isCommonField = (field: ReviewFieldCandidate) => !field.fieldPath.startsWith('performanceEvaluation.items[')

export function PerformanceStep({ view, selection, onSelect, decisions, onDecide, onDecideKey, onJump, readOnly }: StepProps) {
  const fields = view.reviewFields ?? []
  const remaining = (list: ReviewFieldCandidate[]) => list.filter((field) => !decisions[fieldKey(field)]).length
  const subjectFields = (index: number) => fields.filter((field) => field.subjectIndex === index)
  const items = (index: number) => (view.itemDetails ?? []).filter((item) => item.subjectIndex === index)

  const current = subjectFields(selection.subjectIndex).filter((field) => (selection.item === 'common' ? isCommonField(field) : isItemField(field, selection.item)))
  const item = selection.item === 'common' ? null : items(selection.subjectIndex).find((detail) => detail.itemIndex === selection.item) ?? null
  const subject = view.subjects[selection.subjectIndex]
  // 부록 N5-3: 보기 필터(화면만). 기본 '전체' — AI 후보는 모두 보이고, 관리자가 고른 값만 확인·수정·원문에 없음으로 기록된다
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const counts = filterCounts(fields, decisions)
  const shown = current.filter((field) => matchesFilter(field, decisions[fieldKey(field)], filter))
  const next = filter === 'all' ? null : nextMatchingCell(fields, decisions, filter, selection)

  return (
    <div className={styles.master} data-testid="review-step-performance">
      {/* A27-UX: 과목 → 그 과목의 수행평가 → 필드. 고른 과목만 펼쳐 수행평가를 보여 주고, 다른 과목은 접어 둔다 */}
      <nav className={styles.nav} aria-label="과목과 수행평가">
        <p className={styles.navHeading}>과목</p>
        {view.subjects.map((entry, index) => {
          const common = subjectFields(index).filter(isCommonField)
          const open = selection.subjectIndex === index
          const left = remaining(subjectFields(index))
          return (
            <div key={`${entry.subjectName}-${index}`} className={styles.navGroup} data-open={open || undefined}>
              <button
                type="button"
                className={styles.navSubjectButton}
                aria-expanded={open}
                onClick={() => onSelect({ subjectIndex: index, item: items(index)[0]?.itemIndex ?? 'common' })}
                title={entry.subjectName}
                data-testid="performance-nav-subject"
              >
                <span>
                  {entry.subjectName}
                  {gradeText(view.subjectGrades?.[index]) && <span className={styles.tiny}> · 원문 {gradeText(view.subjectGrades?.[index])}</span>}
                </span>
                <span className={styles.navCount}>{subjectFields(index).length === 0 ? '' : left === 0 ? '완료' : `${left}개 남음`}</span>
              </button>
              {open && (
                <div className={styles.navItems} role="group" aria-label={`${entry.subjectName} 수행평가`}>
                  {common.length > 0 && (
                    <NavItem label="평가 비율" left={remaining(common)} current={selection.item === 'common'} onClick={() => onSelect({ subjectIndex: index, item: 'common' })} />
                  )}
                  {items(index).map((detail) => {
                    const list = subjectFields(index).filter((field) => isItemField(field, detail.itemIndex ?? -1))
                    return (
                      <NavItem
                        key={`${detail.itemKey}-${detail.itemIndex}`}
                        label={detail.label || '이름 미확인 수행평가'}
                        left={remaining(list)}
                        current={selection.item === detail.itemIndex}
                        onClick={() => onSelect({ subjectIndex: index, item: detail.itemIndex ?? 0 })}
                      />
                    )
                  })}
                  {items(index).length === 0 && <p className={styles.tiny} style={{ margin: '4px 10px' }}>추출된 수행평가 없음</p>}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <section className={styles.detail} aria-label="선택한 항목 상세">
        {view.reviewStatus === 'CONFIRMED' && (
          <p className={styles.tiny} style={{ margin: '0 0 12px' }} data-testid="performance-confirmed-notice">
            확정된 문서예요. 아래는 분석기 후보(읽기 전용)이고, 학생에게 공개된 확정값은 &lsquo;최종 확정&rsquo;에서 볼 수 있어요.
          </p>
        )}
        {!subject ? (
          <p className={styles.muted}>분석기가 인식한 과목이 없어요.</p>
        ) : (
          <>
            <p className={styles.crumb} data-testid="performance-crumb">
              <span>{subject.subjectName}</span>
              <span aria-hidden="true">›</span>
              <span>{item ? '수행평가' : '평가 비율'}</span>
            </p>
            <div className={styles.detailHead}>
              <h4>{item ? item.label || '이름 미확인 수행평가' : '평가 비율'}</h4>
              <span className={styles.statusText} data-tone={remaining(current) === 0 ? undefined : 'neutral'}>
                {current.length === 0 ? '' : remaining(current) === 0 ? '모두 확인했어요' : `확인 ${remaining(current)}개 남음`}
              </span>
            </div>

            <div className={styles.filterBar} role="group" aria-label="검토 항목 보기" data-testid="review-filter">
              <span className={styles.tiny}>이 문서 전체</span>
              {(Object.keys(filterLabels) as ReviewFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={styles.filterChip}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  data-testid={`review-filter-${key}`}
                >
                  {filterLabels[key]} {counts[key]}
                </button>
              ))}
            </div>
            {filter === 'attention' && (
              <p className={styles.tiny} data-testid="review-filter-hint">
                값이나 원문 위치가 없어 최종 승인에 넣을 수 없는 항목이에요. 원문에서 확인해 값을 고치거나 '원문에 없음'으로 표시해 주세요.
              </p>
            )}
            {next && (
              <button type="button" className={styles.filterChip} style={{ marginTop: 8 }} onClick={() => onSelect(next)} data-testid="review-filter-next">
                다음 '{filterLabels[filter]}' 칸으로 · {view.subjects[next.subjectIndex]?.subjectName ?? '과목'}
              </button>
            )}

            <ul className={styles.rows} style={{ marginTop: 16 }} data-testid="review-field-list">
              {current.length === 0 ? (
                <li className={styles.row}>
                  <span className={styles.muted}>확인할 값이 없어요.</span>
                </li>
              ) : shown.length === 0 ? (
                <li className={styles.row}>
                  <span className={styles.muted} data-testid="review-filter-empty">
                    이 항목에는 '{filterLabels[filter]}' 값이 없어요. 왼쪽에서 다른 과목·수행평가를 고르거나 '전체'로 바꿔 보세요.
                  </span>
                </li>
              ) : (
                shown.map((field) => (
                  <FieldRow key={fieldKey(field)} field={field} view={view} decision={decisions[fieldKey(field)]} onDecide={onDecide} onJump={onJump} readOnly={readOnly} />
                ))
              )}
            </ul>

            {item && (
              <>
                <p className={styles.sectionLabel}>평가 방법 · 활동</p>
                <p className={styles.prose}>{item.content ?? '분석되지 않음 — 원문을 확인해 주세요.'}</p>

                <ul className={styles.rows} style={{ marginTop: 16 }}>
                  <li className={styles.row}>
                    <span className={styles.rowLabel}>제출물</span>
                    <span className={styles.rowValue} style={{ fontWeight: 500 }}>
                      {item.submissions.length ? item.submissions.join(', ') : '분석되지 않음'}
                    </span>
                  </li>
                  <li className={styles.row}>
                    <span className={styles.rowLabel}>조건</span>
                    <span className={styles.rowValue} style={{ fontWeight: 500, whiteSpace: 'pre-line' }}>
                      {item.conditions.length ? item.conditions.join('\n') : '분석되지 않음'}
                    </span>
                  </li>
                </ul>

                <p className={styles.sectionLabel}>채점기준표 · 분석기 후보</p>
                {item.rubric.length === 0 ? (
                  <p className={styles.muted}>분석되지 않음 — 원문을 확인해 주세요.</p>
                ) : (
                  // PR #18 통합(A27-UX 부록 D): 좁은 검토 칸에서도 읽히도록 표 대신 채점 요소별 묶음(점수 | 기준). 없으면 '수준 분석되지 않음'
                  <div className={styles.rubricList} data-testid="review-rubric">
                    {item.rubric.map((criterion, criterionIndex) => (
                      <section key={criterionIndex} className={styles.rubricCriterion} aria-label={`채점 요소 ${criterion.element}`}>
                        <div className={styles.rubricHead}>
                          <div style={{ minWidth: 0 }}>
                            <strong>{criterion.element}</strong>
                            {typeof criterion.maxScore === 'number' && (
                              <span className={styles.tiny} style={{ marginLeft: 8 }} data-testid="review-rubric-max-score">
                                요소 배점 {criterion.maxScore}점
                              </span>
                            )}
                            {criterion.linkReview === 'REVIEW_REQUIRED' && (
                              <div className={styles.statusText} data-tone="warning" data-testid="review-rubric-link-review" title="분석기가 소제목·배치 같은 간접 근거로 이 채점표를 이 평가에 연결했어요.">
                                연결 확인 필요 · 간접 근거
                              </div>
                            )}
                          </div>
                          <EvidenceLinks
                            pages={criterion.sourcePages}
                            locators={criterion.documentLocators}
                            name={`채점 요소 ${criterion.element}`}
                            onJump={onJump}
                            max={2}
                            pageLabel={(page) => `${page}쪽`}
                            emptyReason="분석 결과에 이 채점 요소의 원문 위치가 없어요."
                          />
                        </div>
                        {criterion.levels.length === 0 ? (
                          <p className={styles.muted} style={{ margin: 0 }}>
                            수준 분석되지 않음 · 관리자 확인 필요
                          </p>
                        ) : (
                          <ul className={styles.rubricLevels}>
                            {criterion.levels.map((level, levelIndex) => (
                              <li key={levelIndex}>
                                <span className={styles.rubricScore}>{level.score !== null ? `${level.score}점` : '확인 필요'}</span>
                                <span className={styles.rubricDesc}>{level.description}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    ))}
                  </div>
                )}
                <p className={styles.tiny} style={{ marginTop: 8 }}>
                  위 표는 분석기 후보예요. 빠졌거나 틀리면 아래에서 채점기준을 직접 입력해 확정할 수 있어요(분석 후보는 바뀌지 않아요).
                </p>
                <RubricEditor
                  key={`${item.subjectIndex}-${item.itemIndex}`}
                  candidate={item.rubric.map((criterion) => ({ element: criterion.element, levels: criterion.levels, ...(typeof criterion.maxScore === 'number' ? { maxScore: criterion.maxScore } : {}) }))}
                  decision={decisions[`${item.subjectIndex}|${rubricFieldPath(item.itemIndex ?? 0)}`]}
                  onSave={(decision) => onDecideKey(`${item.subjectIndex}|${rubricFieldPath(item.itemIndex ?? 0)}`, decision)}
                  readOnly={readOnly}
                  pageCount={view.revisionFile?.pageCount ?? null}
                  defaultPage={item.rubric.flatMap((criterion) => criterion.sourcePages)[0] ?? null}
                />
              </>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function NavItem({ label, left, current, onClick }: { label: string; left: number; current: boolean; onClick: () => void }) {
  return (
    <button type="button" className={styles.navItem} aria-current={current ? 'true' : undefined} onClick={onClick} title={label} data-testid="performance-nav-item">
      <span>{label}</span>
      <span className={styles.navCount} data-done={left === 0 ? 'true' : undefined}>
        {left === 0 ? '완료' : `${left}개 남음`}
      </span>
    </button>
  )
}

function FieldRow({
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
  onJump: OnJump
  readOnly: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [page, setPage] = useState('')
  const name = fieldName(field, view)
  const candidate = candidateText(field.candidate)
  const firstPage = field.sourcePages[0] ? String(field.sourcePages[0]) : ''
  const numeric = field.kind === 'number'
  const invalid = value.trim() !== '' && numeric && !Number.isFinite(Number(value))
  const state = editing ? 'editing' : decision ? 'decided' : field.candidate === null ? 'missing' : 'open'
  // A11: 값이 없을 때 이유를 구분한다 — 분석기가 '원문에 없음'으로 본 것 / 읽지 못한 것 / 그냥 비어 있는 것. 관리자 확정 전에는 모두 미확정이다
  const issue = field.candidate === null
    ? view.teachingPlanCandidates?.find((subject) => subject.subjectIndex === field.subjectIndex)?.issues.find((item) => item.fieldPath === field.fieldPath)
    : undefined
  const missingText =
    issue?.code === 'FIELD_NOT_PROVIDED' ? '원문에 없음(분석 판단 · 미확정)' : issue?.code === 'FIELD_EXTRACTION_FAILED' ? '분석하지 못함 — 원문 확인 후 입력' : '값 없음 — 원문 확인 필요'

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

  if (editing) {
    return (
      <li className={styles.row} data-state="editing" data-testid="review-field" data-field-path={field.fieldPath}>
        <span className={styles.rowLabel} style={{ paddingTop: 10 }}>
          {name}
        </span>
        <div className={styles.editor}>
          <input
            className={styles.input}
            aria-label={`${name} 값`}
            aria-invalid={invalid}
            inputMode={numeric ? 'decimal' : undefined}
            value={value}
            placeholder={numeric ? `숫자${fieldUnit(field.fieldPath) ? ` (${fieldUnit(field.fieldPath)})` : ''}` : '값'}
            onChange={(event) => setValue(event.target.value)}
            data-testid="review-field-input"
            autoFocus
          />
          <input className={styles.input} aria-label={`${name} 근거 쪽`} inputMode="numeric" value={page} placeholder="쪽" onChange={(event) => setPage(event.target.value)} data-testid="review-field-page" />
          {invalid && <span className={styles.statusText} data-tone="danger" style={{ gridColumn: '1 / -1' }}>숫자를 입력해 주세요.</span>}
          <div className={styles.editorActions}>
            <button type="button" className={`${styles.buttonDark} ${styles.small}`} onClick={apply} disabled={invalid} data-testid="review-field-apply">
              적용
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.small}`}
              onClick={() => {
                onDecide(field, { kind: 'absent', page })
                setEditing(false)
              }}
            >
              원문에 없음
            </button>
            <button type="button" className={`${styles.buttonGhost} ${styles.small}`} onClick={() => setEditing(false)}>
              취소
            </button>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li className={styles.row} data-layout="field" data-state={state} data-testid="review-field" data-field-path={field.fieldPath}>
      <span className={styles.rowLabel}>
        {name}
        {/* 부록 N5-3: 미확인 상태에서 값·원문 위치가 없으면 먼저 볼 이유를 붙인다(결정 아님) */}
        {!decision && attentionReasons(field).length > 0 && (
          <span className={styles.statusText} data-tone="warning" data-testid="review-field-attention" style={{ display: 'block' }}>
            확인 필요 · {attentionReasons(field).join(' · ')}
          </span>
        )}
      </span>
      <span className={styles.rowValue}>
        {decision?.kind === 'edited' && <s>{displayValue(candidate, field.fieldPath)}</s>}
        {decision?.kind === 'absent' ? '원문에 없음' : !decision && field.candidate === null ? <span className={styles.tiny} data-testid="review-field-missing" data-reason={issue?.code ?? 'NONE'}>{missingText}</span> : displayValue(decision ? decision.value : candidate, field.fieldPath).replace('확인 필요', '값을 읽지 못함')}
      </span>
      <span className={styles.rowMeta}>
        <EvidenceLinks pages={field.sourcePages} locators={field.documentLocators} name={name} onJump={onJump} />
      </span>
      {decision && (
        <span className={styles.check} data-testid="review-field-state">
          <CheckIcon size={14} /> {decision.kind === 'edited' ? '관리자 수정' : decision.kind === 'absent' ? '원문에 없음' : '직접 확인함'}
        </span>
      )}
      {/* A28-03: 결정 없이 값·근거가 있는 후보는 최종 승인에 AI 값 그대로 들어간다(관리자 확인 기록이 아니다) */}
      {!decision && attentionReasons(field).length === 0 && (
        <span className={styles.tiny} data-testid="review-field-default">
          기본 승인
        </span>
      )}
      {!readOnly && (
        <span className={styles.rowActions}>
          {!decision && (
            <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => onDecide(field, { kind: 'confirmed', value: candidate, page: firstPage })} disabled={field.candidate === null} data-testid="review-field-confirm">
              확인
            </button>
          )}
          <button type="button" className={`${styles.button} ${styles.small}`} onClick={startEdit} data-testid="review-field-edit">
            수정
          </button>
          {decision && (
            <button type="button" className={`${styles.buttonGhost} ${styles.small}`} onClick={() => onDecide(field, null)} data-testid="review-field-undo">
              되돌리기
            </button>
          )}
        </span>
      )}
    </li>
  )
}
