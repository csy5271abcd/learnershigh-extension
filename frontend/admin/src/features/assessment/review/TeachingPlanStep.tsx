import { useEffect, useMemo, useRef, useState } from 'react'
import { devPanelEnabled } from '../../../../../student/src/features/assessment/dev/devContext.ts'
import { navigate } from '../../../app/adminLocation.ts'
import { confirmTeachingPlan, createTeachingPlanManualRow, getPlanSubjects, getTeachingPlanReview, updateTeachingPlanManualRow } from '../api/assessmentAdminApi.ts'
import type { EvaluationPlanAnalysisView, PlanSubjects, ReviewDocumentLocator, TeachingPlanEdits, TeachingPlanManualRow, TeachingPlanManualRowInput, TeachingPlanReviewView, TeachingPlanRowCandidate } from '../api/types.ts'
import { TeachingPlanManualRowForm } from './TeachingPlanManualRowForm.tsx'
import { toApiError } from '../api/canonicalSource.ts'
import { manualRowErrorText } from './manualRowErrors.ts'
import { EvidenceLinks } from './EvidenceLinks.tsx'
import type { OnJump } from './evidence.ts'
import { CalendarIcon, MonthlyPlanner, entryFromRow, precisionLabel, whenLabel, type TeachingPlanEntry } from '../components/canonicalUi.ts'
import { confirmedSubjectLinks, type Decision } from './reviewModel.ts'
import { teachingApproval } from './teachingApproval.ts'
import { DraftBanner, SyncText } from './ReviewWorkspace.tsx'
import { useServerDraft } from './useServerDraft.ts'
import { TeachingPlanHistoryPanel } from './TeachingPlanHistoryPanel.tsx'
import styles from './review.module.css'
import { actorLabel } from '../model/actorLabel.ts'

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

/** 분석기 확인 항목 문구. 'ROWS_WITHOUT_TIME:4/42' 같은 내부 코드는 사람이 읽는 문장으로 바꾸고, 원래 코드는 진단 모드에서만 보인다 */
function issueText(issue: { code: string; message?: string | null }): string {
  const raw = issue.message ?? issue.code
  const rows = /^ROWS_WITHOUT_TIME:(\d+)\/(\d+)/.exec(raw)
  if (rows) return `시기를 알 수 없는 계획 ${rows[1]}개 (전체 ${rows[2]}개) — 원문에서 시기를 확인해 주세요${devPanelEnabled() ? ` · ${raw}` : ''}`
  if (/^[A-Z][A-Z0-9_]+(:[^\s]*)?$/.test(raw.trim())) return `분석기가 확인을 요청한 항목이 있어요. 원문과 대조해 주세요${devPanelEnabled() ? ` · ${raw}` : ''}`
  return raw
}
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
  excludedSubjects,
  onGoSubjects,
  onFinalStep,
}: {
  view: EvaluationPlanAnalysisView
  onJump: OnJump
  /** 평가 정보 초안의 과목 연결 (2단계 과목 확인 — 운영계획 과목 연결의 기준) */
  subjectIds: Record<number, string>
  /** A27-UX: 2단계에서 이 문서 검토 대상에서 뺀 분석 과목 (운영계획에서도 빠진다) */
  excludedSubjects?: ReadonlySet<number>
  /** 2단계 과목 확인으로 이동 (과목 연결을 바꿀 때) */
  onGoSubjects?: () => void
  /** A28-36: 학교알리미 원본처럼 '최종 확정' 단계의 최종 승인이 운영계획까지 함께 확정하면, 이 단계에는 따로 승인 버튼을 두지 않고 그 단계로 안내 */
  onFinalStep?: () => void
}) {
  const slot = view.slot
  const allCandidates = useMemo(() => view.teachingPlanCandidates ?? [], [view.teachingPlanCandidates])
  const candidates = useMemo(() => allCandidates.filter((subject) => !excludedSubjects?.has(subject.subjectIndex)), [allCandidates, excludedSubjects])
  const excludedCount = allCandidates.length - candidates.length
  const refs: RowRef[] = useMemo(
    () => candidates.flatMap((subject) => (subject.rows ?? []).map((row, rowIndex) => ({ subjectIndex: subject.subjectIndex, rowIndex, subjectName: subject.subjectName, row }))),
    [candidates],
  )
  const contract03 = view.analyzer?.contractVersion === '0.3'
  const [server, setServer] = useState<{ state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; data: TeachingPlanReviewView }>({ state: 'loading' })
  const [editing, setEditing] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // A28-31: 같은 틱의 두 번 클릭도 요청 1번(서버도 중복 확정은 409)
  const submittingRef = useRef(false)
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
  const subjectNameOf = (id: string) => (subjectOptions?.items.find((item) => item.subjectId === id)?.name ?? '목록에 없는 과목')
  // [14] A27-UX: 달력 아래 상세 목록은 고른 과목 하나만 보인다(달력은 전체 그대로). 처음에는 운영계획 행이나 확인 항목이 있는 첫 과목
  const detailSubjects = candidates.filter((subject) => subject.rows !== null || subject.issues.length > 0)
  const [detailPick, setDetailPick] = useState<number | null>(null)
  const detailIndex = detailPick !== null && detailSubjects.some((subject) => subject.subjectIndex === detailPick) ? detailPick : (detailSubjects[0]?.subjectIndex ?? null)
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
  // A27-UX [02]: 과목 연결의 기준은 2단계 과목 확인이다. 순서: ① 평가 정보 초안 연결 ② 확정된 평가 정보의 연결(A10 규칙)
  // ③ 운영계획 초안에 남은 연결(①②가 없을 때만). 예전에는 운영계획 초안이 첫 결정 때 복사한 연결이 이후 2단계 수정보다 우선해
  // '통합과학2 → 공통영어2'처럼 낡은 연결이 남을 수 있었다 — 이제 ①②가 있으면 ③을 쓰지 않고, 다르면 화면에 알린다.
  const confirmedLinks = confirmedSubjectLinks(view)
  const upstreamLink = (index: number) => (evaluationSubjectIds[index] ?? '').trim() || confirmedLinks[index] || ''
  const subjectIds: Record<number, string> = {}
  for (const subject of allCandidates) {
    const link = upstreamLink(subject.subjectIndex) || (draft.subjectIds[subject.subjectIndex] ?? '').trim()
    if (link) subjectIds[subject.subjectIndex] = link
  }
  // A28-31: 연결이 하나도 없으면 학교 과목 중 이름이 정확히 하나 같은 과목(최종 승인과 같은 규칙)
  const norm = (value: string) => value.replace(/\s+/g, '').toLowerCase()
  for (const subject of allCandidates) {
    if (subjectIds[subject.subjectIndex] || !subjectOptions) continue
    const same = subjectOptions.items.filter((item) => norm(item.name) === norm(subject.subjectName))
    if (same.length === 1) subjectIds[subject.subjectIndex] = same[0].subjectId
  }
  const staleLink = (index: number) => {
    const held = (draft.subjectIds[index] ?? '').trim()
    const upstream = upstreamLink(index)
    return held && upstream && held !== upstream ? held : null
  }
  const decisionOf = (key: string): Decision | undefined => decisions[key]
  const decide = (key: string, decision: Decision | null) => {
    if (!draftEditable) return
    const subjectIndex = Number(key.slice(0, key.indexOf('|')))
    // 2단계 연결을 운영계획 초안에도 남긴다(평가 정보 확정 뒤에도 운영계획 확정에 필요). 낡은 연결이 있으면 2단계 연결로 맞춘다
    const upstream = upstreamLink(subjectIndex)
    if (upstream && (draft.subjectIds[subjectIndex] ?? '').trim() !== upstream) draft.setSubjectId(subjectIndex, upstream)
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
  // 제외한 과목의 관리자 추가 행은 보이지 않고 확정에도 보내지 않는다(초안에는 그대로 남아 복원하면 돌아온다)
  const manualRows = draft.manualRows.filter((row) => !excludedSubjects?.has(row.subjectIndex))
  const pageCount = view.revisionFile?.documentFormat === 'PDF' ? (view.revisionFile.pageCount ?? null) : null
  const manualDisabledReason = !draftEditable ? '지금은 운영계획 초안을 고칠 수 없어요.' : !draft.manualRowReady ? '행 결정을 서버에 저장하는 중이에요. 저장된 뒤 다시 눌러 주세요.' : null

  const saveManual = async (input: TeachingPlanManualRowInput, rowKey?: string) => {
    if (!view.analysisId) throw new Error('분석 결과가 없어요.')
    const request = { analysisId: view.analysisId, baseVersion: draft.baseVersion(), row: input }
    const result = rowKey
      ? await updateTeachingPlanManualRow(view.planId, view.documentRevisionId, rowKey, request)
      : await createTeachingPlanManualRow(view.planId, view.documentRevisionId, request)
    draft.adopt(result)
    // 2단계 연결을 운영계획 초안에도 남긴다(확정에 필요)
    const upstream = upstreamLink(input.subjectIndex)
    if (upstream && (draft.subjectIds[input.subjectIndex] ?? '').trim() !== upstream) draft.setSubjectId(input.subjectIndex, upstream)
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

  // A28-31: 관리자가 따로 정하지 않은 후보도 기본 포함(원문 근거 있고 이 학년 과목인 행) — 행마다 '확인'하지 않아도 한 번에 승인
  const approval = teachingApproval({ refs, decisions, subjectIds, subjectGrades: view.subjectGrades ?? null, documentGrade: view.slot?.grade })
  const missingManual = manualRows.filter((row) => !(subjectIds[row.subjectIndex] ?? '').trim()).map((row) => candidates.find((subject) => subject.subjectIndex === row.subjectIndex)?.subjectName ?? String(row.subjectIndex))
  const missingSubject = [...new Set([...approval.missingSubjects, ...missingManual])]
  const manualPublished = manualRows.filter((row) => row.status !== 'EXCLUDED').length
  const published = approval.published + manualPublished
  const decidedCount = approval.rows.length + manualRows.length
  const canConfirm = !lockedReview && decidedCount > 0 && missingSubject.length === 0 && !submitting && !manualBusy && !manualForm && Boolean(view.analysisId)

  const submit = async () => {
    if (!canConfirm || !view.analysisId || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setSubmitError(null)
    try {
      const data = await confirmTeachingPlan(view.planId, view.documentRevisionId, {
        analysisId: view.analysisId,
        rows: approval.rows,
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
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const empty = (
    <div data-testid="teaching-plan-pending" style={{ display: 'grid', justifyItems: 'center', gap: 8, maxWidth: 460 }}>
      <CalendarIcon size={28} />
      <strong>{contract03 ? '이 분석 결과에는 운영계획 행이 없어요' : '아직 운영계획 분석 결과가 없어요'}</strong>
      <span className={styles.muted}>
        {contract03
          ? '운영계획 미검출 또는 원문에 없음 · 과목별 상태와 원문 확인'
          : '분석 결과 형식 0.2 — 운영계획 미포함(원문에 없다는 뜻 아님) · 원문 직접 확인'}
      </span>
      {import.meta.env.DEV && devPanelEnabled() && (
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
        원문 근거 있는 후보 기본 포함 · 필요한 행만 수정·제외 · 원문 시기(날짜·주차·월) 그대로 · 평가 정보 확정과 별개
      </p>

      {refs.length > 0 && (
        <div className={styles.banner} data-testid="teaching-plan-status" style={{ marginBottom: 12 }}>
          {lockedReview ? (
            <span>
              확정됨 · {actorLabel(lockedReview.reviewedBy)} · {new Date(lockedReview.reviewedAt).toLocaleString('ko-KR')} · 학생 공개 {lockedReview.rows.filter((row) => row.decision !== 'EXCLUDED').length}행 · 제외 {lockedReview.rows.filter((row) => row.decision === 'EXCLUDED').length}행
              {lockedReview.rows.some((row) => row.decisionBasis === 'AI_DEFAULT') && ` · AI 기본값 채택 ${lockedReview.rows.filter((row) => row.decisionBasis === 'AI_DEFAULT').length}행 · 관리자 결정 ${lockedReview.rows.filter((row) => row.decisionBasis === 'ADMIN').length}행`}
            </span>
          ) : (
            <span data-testid="teaching-plan-approval-counts">
              후보 {refs.length}행 · 자동 포함 {approval.counts.auto} · 확인 {approval.counts.confirmed} · 수정 {approval.counts.edited} · 제외 {approval.counts.excluded}
              {manualRows.length > 0 ? ` · 관리자 추가 ${manualRows.length}` : ''}
              {approval.counts.noEvidence + approval.counts.otherGrade > 0 ? ` · 확인 필요 ${approval.counts.noEvidence + approval.counts.otherGrade}(원문 근거 없음·다른 학년, 승인 제외)` : ''}
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
          운영계획 재검토 중 · 학생에게는 {confirmedReview?.versionNo ?? 1}차 확정본 유지
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

      {detailSubjects.length > 0 && (
        <div style={{ marginTop: 20, display: 'grid', gap: 18 }} data-testid="teaching-plan-rows">
          {excludedCount > 0 && (
            <p className={styles.tiny} role="note" style={{ margin: 0 }} data-testid="teaching-plan-excluded-note">
              과목 확인에서 뺀 과목 {excludedCount}개 — 운영계획에서도 제외(복원 시 다시 표시)
            </p>
          )}
          <div className={styles.detailPicker}>
            <label htmlFor="teaching-plan-detail-subject">
              과목별 상세 <span className={styles.tiny}>달력 = 전체 과목 · 아래 = 고른 과목</span>
            </label>
            <select
              id="teaching-plan-detail-subject"
              className={styles.select}
              value={detailIndex ?? ''}
              onChange={(event) => setDetailPick(Number(event.target.value))}
              data-testid="teaching-plan-detail-subject"
            >
              {detailSubjects.map((subject) => {
                const count = refs.filter((ref) => ref.subjectIndex === subject.subjectIndex).length
                const twin = detailSubjects.filter((other) => other.subjectName === subject.subjectName).length > 1
                return (
                  <option key={subject.subjectIndex} value={subject.subjectIndex}>
                    {subject.subjectName}
                    {subject.grades && subject.grades.length > 0 ? ` · 원문 ${subject.grades.join('·')}학년` : ''}
                    {twin ? ` · ${subject.subjectIndex + 1}번째 과목` : ''} · {count}행
                  </option>
                )
              })}
            </select>
          </div>
          {detailSubjects.filter((subject) => subject.subjectIndex === detailIndex).map((subject) => {
            const rows = refs.filter((ref) => ref.subjectIndex === subject.subjectIndex)
            const linked = (subjectIds[subject.subjectIndex] ?? '').trim()
            return (
              <section key={subject.subjectIndex} aria-label={`${subject.subjectName} 운영계획`}>
                <div className={styles.detailHead}>
                  <h4>
                    {subject.subjectName}
                    {subject.grades && subject.grades.length > 0 && <span className={styles.tiny} style={{ marginLeft: 6 }}>원문 {subject.grades.join('·')}학년</span>}
                  </h4>
                  {/* [02] A27-UX: 과목 제목 옆 두 번째 Dropdown을 없앴다. 연결은 2단계 과목 확인에서만 바꾸고, 여기서는 텍스트로만 보인다 */}
                  <span className={styles.tiny} data-testid={`teaching-plan-subject-link-${subject.subjectIndex}`}>
                    {subject.extractionStatus ? `추출 ${subject.extractionStatus === 'COMPLETE' ? '완료' : subject.extractionStatus === 'PARTIAL' ? '일부' : '구간 없음'} · ` : ''}
                    {linked ? `학업 과목 ${subjectNameOf(linked)}` : '학업 과목 미연결'}
                  </span>
                  {onGoSubjects && (
                    <button type="button" className={`${styles.link} ${styles.tiny}`} style={{ marginLeft: 'auto' }} onClick={onGoSubjects} data-testid="teaching-plan-go-subjects">
                      {linked ? '과목 확인에서 바꾸기' : '과목 확인에서 연결하기'}
                    </button>
                  )}
                </div>
                {staleLink(subject.subjectIndex) && (
                  <p className={styles.tiny} role="note" style={{ margin: '6px 0' }} data-testid="teaching-plan-stale-link">
                    운영계획 초안에 예전 연결({subjectNameOf(staleLink(subject.subjectIndex) as string)})이 남아 있어요. 과목 확인의 연결({subjectNameOf(upstreamLink(subject.subjectIndex))})을 따르고, 다음 저장 때 함께 맞춰요.
                  </p>
                )}
                {subject.issues.length > 0 && (
                  <ul className={styles.tiny} style={{ margin: '6px 0', paddingLeft: 18 }} data-testid="teaching-plan-issues">
                    {subject.issues.map((issue, index) => (
                      <li key={index}>
                        [{severityText[issue.severity ?? 'REVIEW'] ?? '확인 필요'}] {issueText(issue)}
                        {devPanelEnabled() && issue.fieldPath ? ` (${issue.fieldPath})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
                {rows.length === 0 ? (
                  <p className={styles.muted}>{subject.rows === null ? '이 과목 결과에 운영계획이 담겨 있지 않아요.' : '운영계획 행이 없어요.'}</p>
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

      {refs.length > 0 && !lockedReview && onFinalStep && (
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button type="button" className={styles.buttonDark} onClick={onFinalStep} data-testid="teaching-plan-go-final">
            최종 확정으로 (공개 {published}행)
          </button>
          <span className={styles.tiny}>평가 정보와 함께 최종 승인</span>
        </div>
      )}
      {refs.length > 0 && !lockedReview && !onFinalStep && (
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button type="button" className={styles.buttonDark} disabled={!canConfirm} onClick={() => void submit()} data-testid="teaching-plan-confirm" aria-busy={submitting}>
            {submitting ? '승인하는 중…' : reReview ? `월별 운영계획 다시 승인 (공개 ${published}행)` : `월별 운영계획 최종 승인 (공개 ${published}행)`}
          </button>
          <span className={styles.tiny}>
            {missingSubject.length > 0
              ? `과목 연결 필요: ${missingSubject.join(', ')} — 2단계 과목 확인에서 연결`
              : manualForm
                ? '작성 중인 추가 행을 저장하거나 취소한 뒤 확정해요.'
              : decidedCount === 0
                ? '승인할 수 있는 행이 없어요(원문 근거가 있는 이 학년 과목 행 없음).'
                : reReview
                  ? '새 확정 버전 학생 공개 · 이전 확정본은 이력 보존'
                  : '승인 후 학생 월별 계획에 공개 · 행별 확인 없이 승인 가능(수정·제외한 행은 그대로 반영)'}
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
