import { useEffect, useMemo, useState } from 'react'
import { navigate } from '../../../app/adminLocation.ts'
import { confirmTeachingPlan, getPlanSubjects, getTeachingPlanReview } from '../api/assessmentAdminApi.ts'
import type { EvaluationPlanAnalysisView, PlanSubjects, TeachingPlanEdits, TeachingPlanReviewView, TeachingPlanRowCandidate } from '../api/types.ts'
import { CalendarIcon, MonthlyPlanner, entryFromRow, precisionLabel, whenLabel, type TeachingPlanEntry } from '../components/canonicalUi.ts'
import type { Decision } from './reviewModel.ts'
import { DraftBanner, SyncText } from './ReviewWorkspace.tsx'
import { useServerDraft } from './useServerDraft.ts'
import styles from './review.module.css'

// 4단계 월별 교수·학습 운영 계획 (A6, api-contract.md §39-3 · §39-6 DRAFT).
// - 0.3 분석 결과의 운영계획 후보 행을 과목별로 보여 주고, 행마다 확인 · 수정 · 제외를 정한 뒤 별도로 확정한다(평가 정보 확정과 별개).
// - 결정은 운영계획 전용 공유 초안(§39-6 teaching-plan-draft, A7)에 `teachingPlan[n]`으로 저장한다. 평가 정보 확정과 무관하게 저장·복원·충돌 처리된다.
// - 시간 정밀도 8종을 그대로 보여 준다. 원문에 없는 날짜·연도를 만들지 않는다. 운영계획 행을 수행평가로 만들지 않는다.
// - 0.2 결과에는 운영계획이 없다 → '원문에 없음'이 아니라 '형식상 전달되지 않음'으로 안내한다(가짜 계획 없음).

type RowRef = { subjectIndex: number; rowIndex: number; subjectName: string; row: TeachingPlanRowCandidate }
const keyOf = (ref: { subjectIndex: number; rowIndex: number }) => `${ref.subjectIndex}|teachingPlan[${ref.rowIndex}]`
const firstPage = (row: TeachingPlanRowCandidate) => {
  const pages = (row.sources ?? []).map((source) => source.pdfPageNumber).filter((page): page is number => typeof page === 'number')
  return pages.length ? Math.min(...pages) : null
}
const severityText: Record<string, string> = { BLOCKING: '먼저 확인', REVIEW: '확인 필요', INFO: '참고' }

export function TeachingPlanStep({
  view,
  onJump,
  subjectIds: evaluationSubjectIds,
}: {
  view: EvaluationPlanAnalysisView
  onJump: (page: number) => void
  /** 평가 정보 초안의 과목 연결 (운영계획 초안에 연결이 없을 때 기본값으로 쓴다) */
  subjectIds: Record<number, string>
}) {
  const slot = view.slot
  const candidates = useMemo(() => view.teachingPlanCandidates ?? [], [view.teachingPlanCandidates])
  const refs: RowRef[] = useMemo(
    () => candidates.flatMap((subject) => (subject.rows ?? []).map((row, rowIndex) => ({ subjectIndex: subject.subjectIndex, rowIndex, subjectName: subject.subjectName, row }))),
    [candidates],
  )
  const contract03 = view.analyzer?.contractVersion === '0.3'
  const [server, setServer] = useState<{ state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; data: TeachingPlanReviewView }>({ state: 'loading' })
  const [editing, setEditing] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!view.analysisId) return
    getTeachingPlanReview(view.planId, view.documentRevisionId).then(
      (data) => !cancelled && setServer({ state: 'ready', data }),
      (cause: Error) => !cancelled && setServer({ state: 'error', message: cause.message }),
    )
    return () => {
      cancelled = true
    }
  }, [view.planId, view.documentRevisionId, view.analysisId])

  const confirmedReview = server.state === 'ready' ? server.data.review : null
  // 운영계획 전용 공유 초안 (평가 정보 초안과 별도, 운영계획 확정 때 닫힌다)
  const draft = useServerDraft(view, { scope: 'TEACHING_PLAN', closed: Boolean(confirmedReview) })
  const [subjectOptions, setSubjectOptions] = useState<PlanSubjects | null>(null)
  useEffect(() => {
    let cancelled = false
    getPlanSubjects(view.planId).then(
      (data) => !cancelled && setSubjectOptions(data),
      () => !cancelled && setSubjectOptions(null),
    )
    return () => {
      cancelled = true
    }
  }, [view.planId])
  const draftEditable = !confirmedReview && draft.sync.kind !== 'closed' && draft.sync.kind !== 'loading' && draft.sync.kind !== 'load-error' && draft.sync.kind !== 'stale' && !draft.choice
  const decisions = draft.decisions
  const subjectIds: Record<number, string> = { ...evaluationSubjectIds, ...Object.fromEntries(Object.entries(draft.subjectIds).filter(([, id]) => id.trim() !== '')) }
  const decisionOf = (key: string): Decision | undefined => decisions[key]
  const decide = (key: string, decision: Decision | null) => {
    if (!draftEditable) return
    const subjectIndex = Number(key.slice(0, key.indexOf('|')))
    // 평가 정보 쪽에서 연결한 과목은 운영계획 초안에도 함께 남긴다 (평가 정보 확정 뒤에도 운영계획 확정에 필요)
    if (!draft.subjectIds[subjectIndex] && evaluationSubjectIds[subjectIndex]) draft.setSubjectId(subjectIndex, evaluationSubjectIds[subjectIndex])
    draft.setDecision(key, decision)
  }
  const editsOf = (decision: Decision | undefined): TeachingPlanEdits => {
    if (!decision || decision.kind !== 'edited') return {}
    try {
      return JSON.parse(decision.value) as TeachingPlanEdits
    } catch {
      return {}
    }
  }

  const entries: TeachingPlanEntry[] = useMemo(() => {
    if (!slot) return []
    if (confirmedReview) {
      return confirmedReview.rows
        .filter((row) => row.decision !== 'EXCLUDED')
        .map((row) => entryFromRow(row.row, { id: `${row.subjectIndex}|${row.rowKey}`, subjectName: candidates[row.subjectIndex]?.subjectName ?? row.subjectId, status: 'CONFIRMED', academicYear: slot.academicYear }))
    }
    return refs
      .filter((ref) => decisionOf(keyOf(ref))?.kind !== 'absent')
      .map((ref) => {
        const edits = editsOf(decisionOf(keyOf(ref)))
        const row = { ...ref.row, ...Object.fromEntries(Object.entries(edits).filter(([, value]) => value !== undefined)) } as TeachingPlanRowCandidate
        const missing = (candidates[ref.subjectIndex]?.issues ?? [])
          .filter((issue) => issue.fieldPath?.startsWith(`teachingPlan[${ref.rowIndex}]`) && issue.code !== 'FIELD_NOT_PROVIDED')
          .map((issue) => issue.fieldPath?.split('.').pop() ?? '')
        return entryFromRow(row, { id: keyOf(ref), subjectName: ref.subjectName, status: 'CANDIDATE', academicYear: slot.academicYear, missingFields: missing })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs, confirmedReview, decisions, slot])

  const decidedRefs = refs.filter((ref) => decisionOf(keyOf(ref)))
  const missingSubject = [...new Set(decidedRefs.map((ref) => ref.subjectIndex))].filter((index) => !(subjectIds[index] ?? '').trim())
  const published = decidedRefs.filter((ref) => decisionOf(keyOf(ref))?.kind !== 'absent').length
  const canConfirm = !confirmedReview && decidedRefs.length > 0 && missingSubject.length === 0 && !submitting && Boolean(view.analysisId)

  const submit = async () => {
    if (!canConfirm || !view.analysisId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const data = await confirmTeachingPlan(view.planId, view.documentRevisionId, {
        analysisId: view.analysisId,
        rows: decidedRefs.map((ref) => {
          const decision = decisionOf(keyOf(ref)) as Decision
          const kind = decision.kind === 'absent' ? 'EXCLUDED' : decision.kind === 'edited' ? 'EDITED' : 'CONFIRMED'
          return { subjectIndex: ref.subjectIndex, rowKey: ref.row.rowKey, subjectId: subjectIds[ref.subjectIndex].trim(), decision: kind, ...(kind === 'EDITED' ? { edits: editsOf(decision) } : {}) }
        }),
      })
      setServer({ state: 'ready', data })
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setSubmitting(false)
    }
  }

  const empty = (
    <div data-testid="teaching-plan-pending" style={{ display: 'grid', justifyItems: 'center', gap: 8, maxWidth: 460 }}>
      <CalendarIcon size={28} />
      <strong>{contract03 ? '이 분석 결과에는 운영계획 행이 없어요' : '아직 운영계획 분석 결과가 없어요'}</strong>
      <span className={styles.muted}>
        {contract03
          ? '분석기가 운영계획을 찾지 못했거나 원문에 없을 수 있어요. 아래 과목별 상태와 원문을 확인해 주세요.'
          : '지금 분석 결과 형식(0.2)에는 운영계획이 담기지 않아요. ‘원문에 운영계획이 없음’이 아니니 원문의 해당 쪽을 직접 확인해 주세요.'}
      </span>
      {import.meta.env.DEV && (
        <button type="button" className={styles.link} onClick={() => navigate('/assessment/dev/monthly-planner')} data-testid="open-planner-preview">
          샘플 데이터로 달력 미리보기 (개발 전용)
        </button>
      )}
    </div>
  )

  return (
    <div data-testid="review-step-teaching">
      <h3 className={styles.title}>월별 교수·학습 운영 계획</h3>
      <p className={styles.lead}>
        단원·학습 내용·성취기준을 원문과 대조해 행마다 확인·수정·제외를 정한 뒤 따로 확정해요. 원문에 적힌 날짜·주차·월 단위를 그대로 지키고, 적혀 있지 않은 날짜는 만들지 않아요. 평가 정보 확정과는 별개예요.
      </p>

      {refs.length > 0 && (
        <div className={styles.banner} data-testid="teaching-plan-status" style={{ marginBottom: 12 }}>
          {confirmedReview ? (
            <span>
              확정됨 · {confirmedReview.reviewedBy} · {new Date(confirmedReview.reviewedAt).toLocaleString('ko-KR')} · 학생 공개 {confirmedReview.rows.filter((row) => row.decision !== 'EXCLUDED').length}행 · 제외 {confirmedReview.rows.filter((row) => row.decision === 'EXCLUDED').length}행
            </span>
          ) : (
            <span>
              후보 {refs.length}행 · 결정 {decidedRefs.length}행(공개 {published} · 제외 {decidedRefs.length - published}) · 결정하지 않은 행은 공개되지 않아요
            </span>
          )}
          {!confirmedReview && (
            <span style={{ marginLeft: 'auto' }}>
              <SyncText sync={draft.sync} onRetry={() => void draft.retry()} />
            </span>
          )}
        </div>
      )}
      {refs.length > 0 && !confirmedReview && <DraftBanner state={draft} />}
      {server.state === 'error' && (
        <p className={styles.muted} role="alert">
          운영계획 확정 상태를 불러오지 못했어요. {server.message}
        </p>
      )}

      {slot ? (
        <MonthlyPlanner academicYear={slot.academicYear} semester={slot.semester} entries={entries} mode="admin" onOpenSource={onJump} emptyState={empty} />
      ) : (
        <p className={styles.muted}>문서의 학년도·학기 정보를 받지 못했어요.</p>
      )}

      {candidates.some((subject) => subject.rows !== null || subject.issues.length > 0) && (
        <div style={{ marginTop: 20, display: 'grid', gap: 18 }} data-testid="teaching-plan-rows">
          {candidates.map((subject) => {
            const rows = refs.filter((ref) => ref.subjectIndex === subject.subjectIndex)
            const linked = (subjectIds[subject.subjectIndex] ?? '').trim()
            return (
              <section key={subject.subjectIndex} aria-label={`${subject.subjectName} 운영계획`}>
                <div className={styles.detailHead}>
                  <h4>{subject.subjectName}</h4>
                  <span className={styles.tiny}>
                    {subject.extractionStatus ? `추출 ${subject.extractionStatus === 'COMPLETE' ? '완료' : subject.extractionStatus === 'PARTIAL' ? '일부' : '구간 없음'} · ` : ''}
                    {linked ? `과목 ${subjectOptions?.items.find((item) => item.subjectId === linked)?.name ?? linked}` : '과목 미연결'}
                  </span>
                  {!confirmedReview && subjectOptions?.available && subjectOptions.items.length > 0 && (
                    <select
                      className={styles.select}
                      style={{ maxWidth: 200, marginLeft: 'auto' }}
                      value={linked}
                      disabled={!draftEditable}
                      aria-label={`${subject.subjectName} 운영계획 학업 과목`}
                      onChange={(event) => draft.setSubjectId(subject.subjectIndex, event.target.value)}
                      data-testid={`teaching-plan-subject-${subject.subjectIndex}`}
                    >
                      <option value="">과목 선택</option>
                      {subjectOptions.items.map((item) => (
                        <option key={item.subjectId} value={item.subjectId}>
                          {item.name} · {item.subjectId}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {subject.issues.length > 0 && (
                  <ul className={styles.tiny} style={{ margin: '6px 0', paddingLeft: 18 }} data-testid="teaching-plan-issues">
                    {subject.issues.map((issue, index) => (
                      <li key={index}>
                        [{severityText[issue.severity ?? 'REVIEW'] ?? '확인 필요'}] {issue.message ?? issue.code}
                        {issue.fieldPath ? ` (${issue.fieldPath})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
                {rows.length === 0 ? (
                  <p className={styles.muted}>{subject.rows === null ? '이 과목 결과에 운영계획이 담겨 있지 않아요.' : '운영계획 행이 없어요. 위 상태를 확인해 주세요.'}</p>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: '22%' }}>시기 (정밀도)</th>
                        <th scope="col">단원 · 학습 내용</th>
                        <th scope="col" style={{ width: 64 }}>원문</th>
                        <th scope="col" style={{ width: 210 }}>결정</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((ref) => {
                        const key = keyOf(ref)
                        const decision = decisionOf(key)
                        const edits = editsOf(decision)
                        const entry = entryFromRow({ ...ref.row, ...Object.fromEntries(Object.entries(edits).filter(([, value]) => value !== undefined)) } as TeachingPlanRowCandidate, { id: key, subjectName: ref.subjectName, status: 'CANDIDATE', academicYear: slot?.academicYear ?? 0 })
                        const page = firstPage(ref.row)
                        const confirmedRow = confirmedReview?.rows.find((row) => row.subjectIndex === ref.subjectIndex && row.rowKey === ref.row.rowKey)
                        const locked = Boolean(confirmedReview)
                        const pageText = page ? String(page) : ''
                        return (
                          <tr key={key} data-testid="teaching-plan-row" data-decision={confirmedRow?.decision ?? decision?.kind ?? 'none'}>
                            <td>
                              <strong style={{ fontWeight: 600 }}>{whenLabel(entry)}</strong>
                              <div className={styles.tiny}>
                                {precisionLabel[entry.precision]}
                                {entry.asWritten ? ` · 원문 “${entry.asWritten}”` : ''}
                              </div>
                            </td>
                            <td>
                              {editing === key && !locked ? (
                                <RowEditor
                                  initial={{ unit: edits.unit ?? ref.row.unit ?? '', content: edits.content ?? ref.row.content ?? '' }}
                                  onCancel={() => setEditing(null)}
                                  onSave={(value) => {
                                    decide(key, { kind: 'edited', value: JSON.stringify({ ...edits, unit: value.unit, content: value.content }), page: pageText })
                                    setEditing(null)
                                  }}
                                />
                              ) : (
                                <>
                                  <div style={{ fontWeight: 600 }}>{entry.unit ?? entry.specialSchedule ?? '단원 미확인'}</div>
                                  {entry.content && <div className={styles.tiny}>{entry.content}</div>}
                                  {decision?.kind === 'edited' && <div className={styles.statusText}>관리자 수정 (후보: {ref.row.unit ?? '없음'})</div>}
                                </>
                              )}
                            </td>
                            <td>
                              {page ? (
                                <button type="button" className={styles.link} onClick={() => onJump(page)}>
                                  {page}쪽
                                </button>
                              ) : (
                                <span className={styles.tiny}>없음</span>
                              )}
                            </td>
                            <td>
                              {locked || !draftEditable ? (
                                locked ? (
                                <span className={styles.tiny}>{confirmedRow ? ({ CONFIRMED: '확정', EDITED: '수정 확정', EXCLUDED: '제외' } as const)[confirmedRow.decision] : '확정 대상 아님(비공개)'}</span>
                                ) : (
                                  <span className={styles.tiny}>{decision ? ({ confirmed: '확인', edited: '수정', absent: '제외' } as const)[decision.kind] : '미결정'} · 초안 대기</span>
                                )
                              ) : (
                                <div className={styles.rowButtons} role="group" aria-label="행 결정">
                                  <button type="button" className={`${styles.button} ${styles.small}`} aria-pressed={decision?.kind === 'confirmed'} onClick={() => decide(key, decision?.kind === 'confirmed' ? null : { kind: 'confirmed', value: '', page: pageText })}>
                                    확인
                                  </button>
                                  <button type="button" className={`${styles.button} ${styles.small}`} aria-pressed={decision?.kind === 'edited'} onClick={() => setEditing(key)}>
                                    수정
                                  </button>
                                  <button type="button" className={`${styles.button} ${styles.small}`} aria-pressed={decision?.kind === 'absent'} onClick={() => decide(key, decision?.kind === 'absent' ? null : { kind: 'absent', page: pageText })}>
                                    제외
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            )
          })}
        </div>
      )}

      {refs.length > 0 && !confirmedReview && (
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button type="button" className={styles.buttonDark} disabled={!canConfirm} onClick={() => void submit()} data-testid="teaching-plan-confirm" aria-busy={submitting}>
            {submitting ? '확정하는 중…' : `운영계획 확정 (공개 ${published}행)`}
          </button>
          <span className={styles.tiny}>
            {missingSubject.length > 0
              ? `과목이 연결되지 않은 행이 있어요(${missingSubject.map((index) => candidates[index]?.subjectName ?? index).join(', ')}).`
              : decidedRefs.length === 0
                ? '확정할 행을 하나 이상 정해 주세요.'
                : '확정하면 학생 화면 월별 계획에 공개돼요(문서가 학생에게 공개된 경우). 확정 뒤에는 바꿀 수 없어요(재확정 정책 미결).'}
          </span>
          {submitError && (
            <span className={styles.muted} role="alert">
              확정하지 못했어요. {submitError}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function RowEditor({ initial, onSave, onCancel }: { initial: { unit: string; content: string }; onSave: (value: { unit: string; content: string }) => void; onCancel: () => void }) {
  const [unit, setUnit] = useState(initial.unit)
  const [content, setContent] = useState(initial.content)
  return (
    <div className={styles.formStack} data-testid="teaching-plan-editor">
      <input className={styles.input} value={unit} maxLength={300} onChange={(event) => setUnit(event.target.value)} aria-label="단원" placeholder="단원 (비우면 '원문에 없음')" />
      <textarea className={styles.input} style={{ height: 72, paddingTop: 8 }} value={content} maxLength={4000} onChange={(event) => setContent(event.target.value)} aria-label="학습 내용" placeholder="학습 내용" />
      <div className={styles.rowButtons}>
        <button type="button" className={`${styles.buttonDark} ${styles.small}`} onClick={() => onSave({ unit, content })}>
          수정값 저장
        </button>
        <button type="button" className={`${styles.button} ${styles.small}`} onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  )
}
