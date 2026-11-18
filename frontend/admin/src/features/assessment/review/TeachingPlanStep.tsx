import { useEffect, useMemo, useState } from 'react'
import { subjectOptionLabel } from '../model/subjectOptionLabel.ts'
import { navigate } from '../../../app/adminLocation.ts'
import { confirmTeachingPlan, createTeachingPlanManualRow, getPlanSubjects, getTeachingPlanReview, updateTeachingPlanManualRow } from '../api/assessmentAdminApi.ts'
import type { EvaluationPlanAnalysisView, PlanSubjects, ReviewDocumentLocator, TeachingPlanEdits, TeachingPlanManualRow, TeachingPlanManualRowInput, TeachingPlanReviewView, TeachingPlanRowCandidate } from '../api/types.ts'
import { TeachingPlanManualRowForm } from './TeachingPlanManualRowForm.tsx'
import { toApiError } from '../api/canonicalSource.ts'
import { manualRowErrorText } from './manualRowErrors.ts'
import { EvidenceLinks } from './EvidenceLinks.tsx'
import type { OnJump } from './evidence.ts'
import { CalendarIcon, MonthlyPlanner, entryFromRow, precisionLabel, whenLabel, type TeachingPlanEntry } from '../components/canonicalUi.ts'
import { gradeConflict, type Decision } from './reviewModel.ts'
import { DraftBanner, SyncText } from './ReviewWorkspace.tsx'
import { useServerDraft } from './useServerDraft.ts'
import { TeachingPlanHistoryPanel } from './TeachingPlanHistoryPanel.tsx'
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
/** A14: 관리자 추가 행 → Planner 행 모양 (월·주차 칸은 관리자가 고른 schedule 값 그대로, 분석 근거 없음) */
const manualAsRow = (row: TeachingPlanManualRow): TeachingPlanRowCandidate => ({
  rowKey: row.rowKey,
  month: row.schedule.monthFrom ?? null,
  monthTo: row.schedule.monthTo ?? null,
  weekLabel: row.schedule.weekLabel ?? null,
  weekFrom: row.schedule.weekFrom ?? null,
  weekTo: row.schedule.weekTo ?? null,
  unit: row.unit,
  content: row.content,
  note: row.note,
  achievementStandards: row.achievementStandards,
  teachingMethods: row.teachingMethods,
  assessmentMethods: row.assessmentMethods,
  specialSchedule: row.specialSchedule,
  schedule: row.schedule,
  sources: [],
})
const manualKey = (row: { subjectIndex: number; rowKey: string }) => `manual|${row.subjectIndex}|${row.rowKey}`
/** A15: 시기 칸 제목(whenLabel)에 이미 정밀도 이름이 들어 있으면(예: '주차 (기준 미확인)') 아래 줄에 다시 쓰지 않는다 */
const precisionNote = (entry: TeachingPlanEntry) => {
  const label = precisionLabel[entry.precision]
  return whenLabel(entry).replace(/\s/g, '').includes(label.replace(/\s/g, '')) ? null : label
}

export function TeachingPlanStep({
  view,
  onJump,
  subjectIds: evaluationSubjectIds,
}: {
  view: EvaluationPlanAnalysisView
  onJump: OnJump
  /** 평가 정보 초안의 과목 연결 (운영계획 초안에 연결이 없을 때 기본값으로 쓴다) */
  subjectIds: Record<number, string>
}) {
  const slot = view.slot
  const candidates = useMemo(() => view.teachingPlanCandidates ?? [], [view.teachingPlanCandidates])
  // 여러 학년 공통 문서: 원문 학년이 이 문서 학년이 아닌 과목은 뒤로 보내고 접어 둔다(확정 불가 §39-12)
  const otherGrade = candidates.filter((subject) => gradeConflict(subject.grades, view.slot?.grade))
  const [showOther, setShowOther] = useState(false)
  const refs: RowRef[] = useMemo(
    () => candidates.flatMap((subject) => (subject.rows ?? []).map((row, rowIndex) => ({ subjectIndex: subject.subjectIndex, rowIndex, subjectName: subject.subjectName, row }))),
    [candidates],
  )
  const contract03 = view.analyzer?.contractVersion === '0.3'
  const [server, setServer] = useState<{ state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; data: TeachingPlanReviewView }>({ state: 'loading' })
  const [editing, setEditing] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  /** A14 관리자 추가 행 입력 양식 (과목별 새 행 또는 기존 추가 행 수정) */
  const [manualForm, setManualForm] = useState<{ subjectIndex: number; row?: TeachingPlanManualRow } | null>(null)
  const [manualBusy, setManualBusy] = useState<string | null>(null)
  const [manualError, setManualError] = useState<string | null>(null)

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
  // A13: 운영계획 재검토 중이면 확정본이 있어도 편집·재확정한다. 화면 잠금·표시는 lockedReview(확정됨 + 재검토 안 열림) 기준
  const reReview = Boolean(confirmedReview) && draft.reopened
  const lockedReview = confirmedReview && !reReview ? confirmedReview : null
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
  const draftEditable = !lockedReview && draft.sync.kind !== 'closed' && draft.sync.kind !== 'loading' && draft.sync.kind !== 'load-error' && draft.sync.kind !== 'stale' && !draft.choice
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

  // A14 관리자 직접 추가 행: 편집 중이면 서버 초안, 잠긴 확정본이면 확정 행(origin MANUAL)
  const manualRows = draft.manualRows
  const pageCount = view.revisionFile?.documentFormat === 'PDF' ? (view.revisionFile.pageCount ?? null) : null
  const manualDisabledReason = !draftEditable ? '지금은 운영계획 초안을 고칠 수 없어요.' : !draft.manualRowReady ? '행 결정을 서버에 저장하는 중이에요. 저장된 뒤 다시 눌러 주세요.' : null

  const saveManual = async (input: TeachingPlanManualRowInput, rowKey?: string) => {
    if (!view.analysisId) throw new Error('분석 결과가 없어요.')
    const request = { analysisId: view.analysisId, baseVersion: draft.baseVersion(), row: input }
    const result = rowKey
      ? await updateTeachingPlanManualRow(view.planId, view.documentRevisionId, rowKey, request)
      : await createTeachingPlanManualRow(view.planId, view.documentRevisionId, request)
    draft.adopt(result)
    // 평가 정보 쪽에서 연결한 과목을 운영계획 초안에도 남긴다(확정에 필요)
    if (!draft.subjectIds[input.subjectIndex] && evaluationSubjectIds[input.subjectIndex]) draft.setSubjectId(input.subjectIndex, evaluationSubjectIds[input.subjectIndex])
  }
  /** 제외·복원: 같은 내용으로 상태만 바꿔 저장 */
  const toggleManual = async (row: TeachingPlanManualRow) => {
    if (manualBusy || manualDisabledReason) return
    setManualBusy(row.rowKey)
    setManualError(null)
    try {
      const { rowKey: _key, origin: _origin, createdBy: _cb, createdAt: _ca, updatedBy: _ub, updatedAt: _ua, ...input } = row
      await saveManual({ ...input, status: row.status === 'EXCLUDED' ? 'INCLUDED' : 'EXCLUDED' }, row.rowKey)
    } catch (cause) {
      setManualError(manualRowErrorText(cause))
    } finally {
      setManualBusy(null)
    }
  }

  const entries: TeachingPlanEntry[] = useMemo(() => {
    if (!slot) return []
    if (lockedReview) {
      return lockedReview.rows
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
      .concat(
        manualRows
          .filter((row) => row.status !== 'EXCLUDED')
          .map((row) => entryFromRow(manualAsRow(row), { id: manualKey(row), subjectName: candidates[row.subjectIndex]?.subjectName ?? '', status: 'CANDIDATE', academicYear: slot.academicYear })),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs, lockedReview, decisions, slot, manualRows])

  const decidedRefs = refs.filter((ref) => decisionOf(keyOf(ref)))
  const missingSubject = [...new Set([...decidedRefs.map((ref) => ref.subjectIndex), ...manualRows.map((row) => row.subjectIndex)])].filter((index) => !(subjectIds[index] ?? '').trim())
  const manualPublished = manualRows.filter((row) => row.status !== 'EXCLUDED').length
  const published = decidedRefs.filter((ref) => decisionOf(keyOf(ref))?.kind !== 'absent').length + manualPublished
  const decidedCount = decidedRefs.length + manualRows.length
  const canConfirm = !lockedReview && decidedCount > 0 && missingSubject.length === 0 && !submitting && !manualBusy && !manualForm && Boolean(view.analysisId)

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
        // A14: 관리자 추가 행은 키·과목·결정만 보낸다(내용은 서버가 초안에서 가져온다)
        manualRows: manualRows.map((row) => ({ rowKey: row.rowKey, subjectIndex: row.subjectIndex, subjectId: subjectIds[row.subjectIndex].trim(), decision: row.status === 'EXCLUDED' ? 'EXCLUDED' : 'CONFIRMED' })),
      })
      setServer({ state: 'ready', data })
      // 재확정이면 닫힌 초안을 다시 읽는다(첫 확정은 closed 옵션이 바뀌며 다시 읽힌다)
      if (reReview) void draft.reload()
    } catch (cause) {
      const apiError = toApiError(cause)
      const conflictGrade = Object.values(apiError.fieldReasons()).includes('grade_conflict')
      setSubmitError(conflictGrade ? '원문상 이 문서 학년이 아닌 과목의 행이 있어요. 그 과목 행은 제외하거나 확정하지 마세요.' : apiError.message)
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
          {lockedReview ? (
            <span>
              확정됨 · {lockedReview.reviewedBy} · {new Date(lockedReview.reviewedAt).toLocaleString('ko-KR')} · 학생 공개 {lockedReview.rows.filter((row) => row.decision !== 'EXCLUDED').length}행 · 제외 {lockedReview.rows.filter((row) => row.decision === 'EXCLUDED').length}행
            </span>
          ) : (
            <span>
              후보 {refs.length}행 · 결정 {decidedRefs.length}행 · 관리자 추가 {manualRows.length}행 · 공개 {published} · 제외 {decidedCount - published} · 결정하지 않은 후보 행은 공개되지 않아요
            </span>
          )}
          {!lockedReview && (
            <span style={{ marginLeft: 'auto' }}>
              <SyncText sync={draft.sync} onRetry={() => void draft.retry()} />
            </span>
          )}
        </div>
      )}
      {reReview && (
        <p className={styles.banner} data-testid="teaching-plan-rereview-badge" style={{ marginBottom: 12 }}>
          운영계획 재검토 중 · 다시 확정하기 전까지 학생에게는 {confirmedReview?.versionNo ?? 1}차 확정본이 그대로 보여요.
        </p>
      )}
      {refs.length > 0 && !lockedReview && <DraftBanner state={draft} />}
      {confirmedReview && <TeachingPlanHistoryPanel planId={view.planId} revisionId={view.documentRevisionId} canStart={Boolean(lockedReview)} onStart={draft.reopen} refreshKey={`${confirmedReview.versionNo ?? 1}|${reReview}`} />}
      {server.state === 'error' && (
        <p className={styles.muted} role="alert">
          운영계획 확정 상태를 불러오지 못했어요. {server.message}
        </p>
      )}

      {slot ? (
        <MonthlyPlanner academicYear={slot.academicYear} semester={slot.semester} entries={entries} mode="admin" onOpenSource={(page) => onJump(page)} emptyState={empty} />
      ) : (
        <p className={styles.muted}>문서의 학년도·학기 정보를 받지 못했어요.</p>
      )}

      {candidates.some((subject) => subject.rows !== null || subject.issues.length > 0) && (
        <div style={{ marginTop: 20, display: 'grid', gap: 18 }} data-testid="teaching-plan-rows">
          {otherGrade.length > 0 && (
            <button type="button" className={styles.link} style={{ justifySelf: 'start' }} onClick={() => setShowOther((value) => !value)} aria-expanded={showOther} data-testid="teaching-plan-other-grades">
              {showOther ? '다른 학년 과목 접기' : `다른 학년 과목 ${otherGrade.length}개 보기 (이 문서에서는 확정하지 않아요)`}
            </button>
          )}
          {[...candidates].sort((a, b) => Number(otherGrade.includes(a)) - Number(otherGrade.includes(b))).map((subject) => {
            if (otherGrade.includes(subject) && !showOther) return null
            const rows = refs.filter((ref) => ref.subjectIndex === subject.subjectIndex)
            const linked = (subjectIds[subject.subjectIndex] ?? '').trim()
            return (
              <section key={subject.subjectIndex} aria-label={`${subject.subjectName} 운영계획`}>
                <div className={styles.detailHead}>
                  <h4>
                    {subject.subjectName}
                    {subject.grades && subject.grades.length > 0 && <span className={styles.tiny} style={{ marginLeft: 6 }}>원문 {subject.grades.join('·')}학년</span>}
                  </h4>
                  <span className={styles.tiny}>
                    {subject.extractionStatus ? `추출 ${subject.extractionStatus === 'COMPLETE' ? '완료' : subject.extractionStatus === 'PARTIAL' ? '일부' : '구간 없음'} · ` : ''}
                    {linked ? `과목 ${subjectOptions?.items.find((item) => item.subjectId === linked)?.name ?? linked}` : '과목 미연결'}
                  </span>
                  {!lockedReview && subjectOptions?.available && subjectOptions.items.length > 0 && (
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
                          {subjectOptionLabel(subjectOptions.items, item)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {!lockedReview && draftEditable && rows.some((ref) => !decisionOf(keyOf(ref))) && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0' }}>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.small}`}
                      onClick={() => rows.filter((ref) => !decisionOf(keyOf(ref))).forEach((ref) => {
                        const page = firstPage(ref.row)
                        decide(keyOf(ref), { kind: 'confirmed', value: '', page: page ? String(page) : '' })
                      })}
                      data-testid={`teaching-plan-confirm-all-${subject.subjectIndex}`}
                    >
                      남은 {rows.filter((ref) => !decisionOf(keyOf(ref))).length}행 모두 확인
                    </button>
                    <span className={styles.tiny}>원문과 대조한 뒤 누르세요. 행마다 수정·제외로 바꿀 수 있어요.</span>
                  </div>
                )}
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
                        const confirmedRow = lockedReview?.rows.find((row) => row.subjectIndex === ref.subjectIndex && row.rowKey === ref.row.rowKey)
                        const locked = Boolean(lockedReview)
                        const pageText = page ? String(page) : ''
                        return (
                          <tr key={key} data-testid="teaching-plan-row" data-decision={confirmedRow?.decision ?? decision?.kind ?? 'none'}>
                            <td>
                              <strong style={{ fontWeight: 600 }}>{whenLabel(entry)}</strong>
                              <div className={styles.tiny}>
                                {precisionNote(entry)}
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
                              <EvidenceLinks
                                pages={page ? [page] : []}
                                locators={(ref.row.sources ?? []).map((source) => source.documentLocator).filter((at): at is ReviewDocumentLocator => Boolean(at))}
                                name={`운영계획 ${entry.unit ?? whenLabel(entry)}`}
                                onJump={onJump}
                                max={2}
                                pageLabel={(at) => `${at}쪽`}
                                buttonClassName={styles.link}
                                emptyText="없음"
                                emptyReason="분석 결과에 이 운영계획 행의 원문 위치가 없어요."
                              />
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
                <ManualRowsBlock
                  rows={lockedReview ? [] : manualRows.filter((row) => row.subjectIndex === subject.subjectIndex)}
                  confirmed={lockedReview ? lockedReview.rows.filter((row) => row.origin === 'MANUAL' && row.subjectIndex === subject.subjectIndex) : []}
                  academicYear={slot?.academicYear ?? 0}
                  subjectName={subject.subjectName}
                  editable={!lockedReview && draftEditable}
                  busyKey={manualBusy}
                  disabledReason={manualDisabledReason}
                  onEdit={(row) => setManualForm({ subjectIndex: subject.subjectIndex, row })}
                  onToggle={(row) => void toggleManual(row)}
                />
                {!lockedReview && draftEditable && rows.length > 0 && (manualForm?.subjectIndex === subject.subjectIndex ? (
                  <TeachingPlanManualRowForm
                    key={manualForm.row?.rowKey ?? 'new'}
                    subjectIndex={subject.subjectIndex}
                    subjectName={subject.subjectName}
                    row={manualForm.row}
                    pageCount={pageCount}
                    disabledReason={manualDisabledReason}
                    onCancel={() => setManualForm(null)}
                    onSubmit={async (input) => {
                      await saveManual(input, manualForm.row?.rowKey)
                      setManualForm(null)
                    }}
                  />
                ) : (
                  <button type="button" className={`${styles.button} ${styles.small}`} style={{ marginTop: 8 }} onClick={() => setManualForm({ subjectIndex: subject.subjectIndex })} disabled={Boolean(manualForm)} data-testid={`teaching-plan-manual-add-${subject.subjectIndex}`}>
                    + 새 행 추가
                  </button>
                ))}
              </section>
            )
          })}
          {manualError && (
            <p role="alert" className={styles.statusText} data-tone="danger" data-testid="teaching-plan-manual-error">
              {manualError}
            </p>
          )}
        </div>
      )}

      {refs.length > 0 && !lockedReview && (
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button type="button" className={styles.buttonDark} disabled={!canConfirm} onClick={() => void submit()} data-testid="teaching-plan-confirm" aria-busy={submitting}>
            {submitting ? '확정하는 중…' : reReview ? `운영계획 다시 확정 (공개 ${published}행)` : `운영계획 확정 (공개 ${published}행)`}
          </button>
          <span className={styles.tiny}>
            {missingSubject.length > 0
              ? `과목이 연결되지 않은 행이 있어요(${missingSubject.map((index) => candidates[index]?.subjectName ?? index).join(', ')}).`
              : manualForm
                ? '작성 중인 추가 행을 저장하거나 취소한 뒤 확정해요.'
              : decidedCount === 0
                ? '확정할 행을 하나 이상 정해 주세요.'
                : reReview
                  ? '다시 확정하면 새 확정 버전이 학생 월별 계획에 공개되고, 이전 확정본은 이력으로 남아요.'
                  : '확정하면 학생 화면 월별 계획에 공개돼요(문서가 학생에게 공개된 경우). 고치려면 확정 뒤 재검토를 시작해요.'}
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

/** A14 관리자 직접 추가 행 표 — 분석 후보 행과 구분해 '관리자 추가'로 표시한다. 원문 근거 버튼 대신 관리자 확인 쪽(있을 때만)을 보여 준다 */
function ManualRowsBlock({
  rows,
  confirmed,
  academicYear,
  subjectName,
  editable,
  busyKey,
  disabledReason,
  onEdit,
  onToggle,
}: {
  rows: TeachingPlanManualRow[]
  confirmed: NonNullable<TeachingPlanReviewView['review']>['rows']
  academicYear: number
  subjectName: string
  editable: boolean
  busyKey: string | null
  disabledReason: string | null
  onEdit: (row: TeachingPlanManualRow) => void
  onToggle: (row: TeachingPlanManualRow) => void
}) {
  const items = rows.length
    ? rows.map((row) => ({ key: row.rowKey, source: manualAsRow(row), page: row.pdfPageNumber, excluded: row.status === 'EXCLUDED', label: row.status === 'EXCLUDED' ? '제외(학생 비공개)' : '공개 예정', row }))
    : confirmed.map((row) => ({ key: row.rowKey, source: row.row, page: row.row.manualPdfPageNumber ?? null, excluded: row.decision === 'EXCLUDED', label: row.decision === 'EXCLUDED' ? '제외' : '확정', row: null }))
  if (items.length === 0) return null
  return (
    <div style={{ marginTop: 10 }} data-testid="teaching-plan-manual-rows">
      <p className={styles.sectionLabel} style={{ margin: '0 0 6px' }}>
        관리자 직접 추가 행 · {subjectName}
      </p>
      <table className={styles.table}>
        <tbody>
          {items.map((item) => {
            const entry = entryFromRow(item.source, { id: item.key, subjectName, status: 'CANDIDATE', academicYear })
            return (
              <tr key={item.key} data-testid="teaching-plan-manual-row" data-status={item.excluded ? 'EXCLUDED' : 'INCLUDED'} style={item.excluded ? { opacity: 0.6 } : undefined}>
                <td style={{ width: '22%' }}>
                  <strong style={{ fontWeight: 600 }}>{whenLabel(entry)}</strong>
                  <div className={styles.tiny}>{precisionNote(entry)}</div>
                </td>
                <td>
                  <span className={styles.tiny} style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 6, background: 'var(--as-color-surface-muted, #f2f4f6)', marginBottom: 4 }} data-testid="teaching-plan-manual-badge">
                    관리자 추가
                  </span>
                  <div style={{ fontWeight: 600 }}>{entry.unit ?? entry.specialSchedule ?? '단원 없음'}</div>
                  {entry.content && <div className={styles.tiny}>{entry.content}</div>}
                </td>
                <td style={{ width: 72 }}>
                  <span className={styles.tiny} title={item.page ? '관리자가 확인한 PDF 쪽(분석 근거 아님)' : '분석 결과에 없던 행이라 원문 위치가 없어요.'}>
                    {item.page ? `관리자 확인 ${item.page}쪽` : '원문 근거 없음'}
                  </span>
                </td>
                <td style={{ width: 210 }}>
                  {editable && item.row ? (
                    <div className={styles.rowButtons} role="group" aria-label="추가 행 동작">
                      <span className={styles.tiny} style={{ alignSelf: 'center' }}>{item.label}</span>
                      <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => item.row && onEdit(item.row)} disabled={Boolean(busyKey) || Boolean(disabledReason) || item.excluded} title={disabledReason ?? undefined}>
                        수정
                      </button>
                      <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => item.row && onToggle(item.row)} disabled={Boolean(busyKey) || Boolean(disabledReason)} aria-busy={busyKey === item.key} title={disabledReason ?? undefined} data-testid="teaching-plan-manual-toggle">
                        {busyKey === item.key ? '저장 중…' : item.excluded ? '복원' : '제외'}
                      </button>
                    </div>
                  ) : (
                    <span className={styles.tiny}>{item.label}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
