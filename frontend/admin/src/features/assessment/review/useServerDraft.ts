import { useCallback, useEffect, useRef, useState } from 'react'
import { getPlanReviewDraft, getTeachingPlanDraft, reopenPlanReviewDraft, reopenTeachingPlanDraft, savePlanReviewDraft, saveTeachingPlanDraft } from '../api/assessmentAdminApi.ts'
import { toApiError } from '../api/canonicalSource.ts'
import type { EvaluationPlanAnalysisView, PlanReviewDraftDecision, PlanReviewDraftView } from '../api/types.ts'
import type { Decision } from './reviewModel.ts'

// A5 서버 공유 검토 초안 (DRAFT §39-4). 같은 분석 결과를 보는 관리자들이 하나의 초안을 쓴다.
// - '임시 저장됨'은 서버 저장이 성공한 뒤에만 표시한다. 저장 전 변경은 이 브라우저에 백업만 하고 '서버 저장 전'으로 표시한다.
// - 저장 요청은 마지막으로 읽은 version(baseVersion)을 보낸다. 다른 관리자가 먼저 저장했으면 409 → 자동 저장을 멈추고 사용자가 고른다.
// - 분석 결과가 바뀌면(409 STALE 또는 이전 결과의 초안만 있음) 이전 초안을 새 결과에 적용하지 않는다.

const AUTOSAVE_DELAY = 1000
const backupKey = (view: EvaluationPlanAnalysisView, scope: DraftScope) =>
  `lh-assessment-review-draft:${view.planId}:${view.documentRevisionId}:${view.analysisId ?? 'none'}${scope === 'TEACHING_PLAN' ? ':teaching-plan' : ''}`

/** A7: 평가 정보 초안(EVALUATION)과 운영계획 초안(TEACHING_PLAN)은 서버에서 따로 저장·확정된다 */
export type DraftScope = 'EVALUATION' | 'TEACHING_PLAN'

type Decisions = Record<string, Decision>
type SubjectIds = Record<number, string>
interface Backup {
  decisions: Decisions
  subjectIds: SubjectIds
}

export type SyncState =
  | { kind: 'loading' }
  | { kind: 'load-error'; message: string }
  | { kind: 'idle' }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: string; by: string; version: number }
  | { kind: 'error'; message: string }
  | { kind: 'conflict'; updatedBy: string | null; currentVersion: number | null }
  | { kind: 'stale' }
  | { kind: 'closed' }

export type DraftChoice = { kind: 'local-vs-server'; localCount: number; serverCount: number; serverBy: string } | { kind: 'local-only'; localCount: number }

function readBackup(key: string): Backup | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const value = JSON.parse(raw) as Backup
    return value && typeof value.decisions === 'object' ? { decisions: value.decisions, subjectIds: value.subjectIds ?? {} } : null
  } catch {
    return null
  }
}

function writeBackup(key: string, backup: Backup | null) {
  try {
    if (backup) window.localStorage.setItem(key, JSON.stringify(backup))
    else window.localStorage.removeItem(key)
  } catch {
    // 브라우저 저장소를 쓸 수 없으면 백업 없이 진행 (서버 저장 상태 표시는 그대로)
  }
}

const kindToServer: Record<Decision['kind'], PlanReviewDraftDecision['decision']> = { confirmed: 'CONFIRMED', edited: 'EDITED', absent: 'ABSENT' }

function fromServer(draft: NonNullable<PlanReviewDraftView['draft']>): Backup {
  const decisions: Decisions = {}
  for (const item of draft.decisions) {
    const page = item.pdfPageNumber === null ? '' : String(item.pdfPageNumber)
    decisions[`${item.subjectIndex}|${item.fieldPath}`] =
      item.decision === 'ABSENT' ? { kind: 'absent', page } : { kind: item.decision === 'EDITED' ? 'edited' : 'confirmed', value: item.value ?? '', page }
  }
  const subjectIds: SubjectIds = {}
  for (const link of draft.subjectLinks) subjectIds[link.subjectIndex] = link.subjectId
  return { decisions, subjectIds }
}

function toServer(decisions: Decisions, subjectIds: SubjectIds) {
  return {
    decisions: Object.entries(decisions).map(([key, decision]) => {
      const cut = key.indexOf('|')
      const page = Number(decision.page)
      return {
        subjectIndex: Number(key.slice(0, cut)),
        fieldPath: key.slice(cut + 1),
        decision: kindToServer[decision.kind],
        value: decision.kind === 'absent' ? null : decision.value,
        pdfPageNumber: decision.page && Number.isInteger(page) && page >= 1 ? page : null,
      }
    }),
    subjectLinks: Object.entries(subjectIds)
      .filter(([, id]) => id.trim() !== '')
      .map(([index, id]) => ({ subjectIndex: Number(index), subjectId: id.trim() })),
  }
}

const same = (a: Backup, b: Backup) => JSON.stringify(toServer(a.decisions, a.subjectIds)) === JSON.stringify(toServer(b.decisions, b.subjectIds))
const isEmpty = (backup: Backup) => Object.keys(backup.decisions).length === 0 && Object.values(backup.subjectIds).every((id) => !id.trim())

/** 3-way 재적용: server(최신) 위에 base→mine 사이에서 바뀐 항목만 덮는다 */
function reapply(server: Backup, base: Backup, mine: Backup): Backup {
  const decisions = { ...server.decisions }
  for (const key of new Set([...Object.keys(base.decisions), ...Object.keys(mine.decisions)])) {
    if (JSON.stringify(base.decisions[key]) === JSON.stringify(mine.decisions[key])) continue
    if (mine.decisions[key]) decisions[key] = mine.decisions[key]
    else delete decisions[key]
  }
  const subjectIds = { ...server.subjectIds }
  for (const index of new Set([...Object.keys(base.subjectIds), ...Object.keys(mine.subjectIds)].map(Number))) {
    if ((base.subjectIds[index] ?? '') !== (mine.subjectIds[index] ?? '')) subjectIds[index] = mine.subjectIds[index] ?? ''
  }
  return { decisions, subjectIds }
}

export function useServerDraft(view: EvaluationPlanAnalysisView, options: { scope?: DraftScope; closed?: boolean } = {}) {
  const scope = options.scope ?? 'EVALUATION'
  // 평가 정보 초안은 평가 정보 확정으로, 운영계획 초안은 운영계획 확정으로 닫힌다
  const confirmed = scope === 'TEACHING_PLAN' ? Boolean(options.closed) : view.reviewStatus === 'CONFIRMED'
  const key = backupKey(view, scope)
  const loadDraft = scope === 'TEACHING_PLAN' ? getTeachingPlanDraft : getPlanReviewDraft
  const saveDraft = scope === 'TEACHING_PLAN' ? saveTeachingPlanDraft : savePlanReviewDraft
  const [decisions, setDecisions] = useState<Decisions>({})
  const [subjectIds, setSubjectIds] = useState<SubjectIds>({})
  const [sync, setSync] = useState<SyncState>({ kind: 'loading' })
  const [server, setServer] = useState<PlanReviewDraftView | null>(null)
  const [choice, setChoice] = useState<DraftChoice | null>(null)
  /** A12·A13 재검토 중: 확정된 범위(평가 정보 또는 운영계획)의 최신 분석 결과 초안이 다시 열려 있다(학생 공개값은 이전 확정본 그대로) */
  const reopened = confirmed && server?.draft?.status === 'ACTIVE' && server.draft.analysisId === view.analysisId
  const [edits, setEdits] = useState(0)
  const version = useRef<number | null>(null)
  const latest = useRef<Backup>({ decisions: {}, subjectIds: {} })
  const savedEdits = useRef(0)
  const localBackup = useRef<Backup | null>(null)
  /** 마지막으로 서버와 맞춘 값 (불러오기·저장 성공 시점). 충돌 때 '내가 바꾼 항목'을 가려내는 기준 */
  const baseline = useRef<Backup>({ decisions: {}, subjectIds: {} })
  /** 사용자 변경 횟수 (이벤트 처리에서만 갱신). 저장 중 더 바뀌었는지 판단한다 */
  const editsRef = useRef(0)
  /**
   * A14 회귀 수정: 가장 마지막에 시작한 조회만 화면에 반영한다. 개발 모드(StrictMode)의 초기 조회 두 번 중 늦게 온 응답이
   * 그 사이 사용자가 바꾼 값(브라우저 백업)을 '저장되지 않은 내용'으로 오인해 편집을 잠그던 문제를 막는다.
   */
  const loadSeq = useRef(0)

  const apply = useCallback((backup: Backup) => {
    latest.current = backup
    setDecisions(backup.decisions)
    setSubjectIds(backup.subjectIds)
  }, [])

  /** 서버 초안을 읽어 화면 값을 서버 기준으로 맞춘다 (version 갱신) */
  const load = useCallback(async (mode: 'initial' | 'reload') => {
    const seq = ++loadSeq.current
    const result = await loadDraft(view.planId, view.documentRevisionId)
    if (seq !== loadSeq.current) return result
    setServer(result)
    const draft = result.draft && result.draft.analysisId === view.analysisId ? result.draft : null
    version.current = draft ? draft.version : null
    const serverValues = draft ? fromServer(draft) : { decisions: {}, subjectIds: {} }
    if (mode === 'initial') {
      const backup = confirmed ? null : readBackup(key)
      localBackup.current = backup
      if (backup && !isEmpty(backup) && !same(backup, serverValues)) {
        setChoice(draft ? { kind: 'local-vs-server', localCount: Object.keys(backup.decisions).length, serverCount: draft.decisions.length, serverBy: draft.updatedBy } : { kind: 'local-only', localCount: Object.keys(backup.decisions).length })
      }
    }
    apply(serverValues)
    baseline.current = serverValues
    savedEdits.current = 0
    editsRef.current = 0
    setEdits(0)
    // A12: 확정된 문서라도 재검토로 다시 연 평가 정보 초안(ACTIVE)은 편집할 수 있다
    const reopenedNow = confirmed && draft?.status === 'ACTIVE'
    setSync((confirmed && !reopenedNow) || draft?.status === 'CLOSED' ? { kind: 'closed' } : draft ? { kind: 'saved', at: draft.updatedAt, by: draft.updatedBy, version: draft.version } : { kind: 'idle' })
    return result
  }, [view.planId, view.documentRevisionId, view.analysisId, confirmed, key, apply, loadDraft])

  useEffect(() => {
    let cancelled = false
    // 서버 조회는 비동기다(상태는 응답 뒤에 바뀐다)
    Promise.resolve()
      .then(() => load('initial'))
      .catch((cause: unknown) => {
        if (!cancelled) setSync({ kind: 'load-error', message: toApiError(cause).message })
      })
    return () => {
      cancelled = true
    }
  }, [load])

  const save = useCallback(async () => {
    if (!view.analysisId) return
    const sent = edits
    const values = latest.current
    setSync({ kind: 'saving' })
    try {
      const result = await saveDraft(view.planId, view.documentRevisionId, { analysisId: view.analysisId, baseVersion: version.current, ...toServer(values.decisions, values.subjectIds) })
      setServer(result)
      const draft = result.draft
      if (draft) version.current = draft.version
      savedEdits.current = sent
      baseline.current = values
      // 저장하는 동안 더 바뀌었으면 백업을 남기고 다음 자동 저장을 기다린다
      if (sent === editsRef.current) writeBackup(key, null)
      setSync(draft ? { kind: 'saved', at: draft.updatedAt, by: draft.updatedBy, version: draft.version } : { kind: 'idle' })
    } catch (cause) {
      const error = toApiError(cause)
      if (error.code === 'PLAN_REVIEW_DRAFT_CONFLICT' || error.code === 'CONCURRENT_MODIFICATION') {
        const details = (error.details ?? {}) as { updatedBy?: string; currentVersion?: number }
        setSync({ kind: 'conflict', updatedBy: details.updatedBy ?? null, currentVersion: details.currentVersion ?? null })
      } else if (error.code === 'PLAN_REVIEW_DRAFT_STALE') {
        setSync({ kind: 'stale' })
      } else {
        setSync({ kind: 'error', message: `${error.message}${error.code ? ` (${error.code})` : ''}` })
      }
    }
  }, [view.planId, view.documentRevisionId, view.analysisId, edits, key, saveDraft])

  // 자동 저장: 마지막 변경 1초 뒤. 충돌·결과 바뀜·선택 대기 중에는 멈춘다(사용자가 고른다)
  useEffect(() => {
    if (edits === 0 || edits === savedEdits.current || (confirmed && !reopened) || choice) return
    if (sync.kind === 'conflict' || sync.kind === 'stale' || sync.kind === 'saving' || sync.kind === 'closed' || sync.kind === 'loading') return
    const timer = window.setTimeout(() => {
      void save()
    }, AUTOSAVE_DELAY)
    return () => window.clearTimeout(timer)
  }, [edits, sync.kind, confirmed, reopened, choice, save])

  const change = (next: Backup) => {
    latest.current = next
    setDecisions(next.decisions)
    setSubjectIds(next.subjectIds)
    writeBackup(key, next)
    editsRef.current += 1
    setEdits(editsRef.current)
    setSync((previous) => (previous.kind === 'conflict' || previous.kind === 'stale' ? previous : { kind: 'dirty' }))
  }

  const setDecision = (fieldKey: string, decision: Decision | null) => {
    const next = { ...latest.current.decisions }
    if (decision) next[fieldKey] = decision
    else delete next[fieldKey]
    change({ decisions: next, subjectIds: latest.current.subjectIds })
  }
  const setSubjectId = (index: number, value: string) => change({ decisions: latest.current.decisions, subjectIds: { ...latest.current.subjectIds, [index]: value } })
  const clearAll = () => change({ decisions: {}, subjectIds: {} })

  /** 브라우저 백업 vs 서버 초안 선택 */
  const resolveChoice = (useLocal: boolean) => {
    const backup = localBackup.current
    setChoice(null)
    if (useLocal && backup) change(backup)
    else writeBackup(key, null)
  }

  /**
   * 충돌 해결: 'reload' = 서버 최신을 불러온다(내 미저장 변경 버림). 'reapply' = 서버 최신 초안 위에 <b>내가 바꾼 항목만</b> 다시 적용해 저장한다
   * (다른 관리자가 바꾼 다른 항목은 그대로 둔다. 같은 항목을 둘 다 바꿨으면 내 값이 남는다 — 사용자가 고른 동작).
   */
  const resolveConflict = async (mode: 'reload' | 'reapply') => {
    const mine = latest.current
    const base = baseline.current
    try {
      await load('reload')
      if (mode === 'reapply') change(reapply(latest.current, base, mine))
      else writeBackup(key, null)
    } catch (cause) {
      setSync({ kind: 'error', message: toApiError(cause).message })
    }
  }

  const unsaved = sync.kind === 'dirty' || sync.kind === 'saving' || sync.kind === 'error' || sync.kind === 'conflict'

  /** A12 재검토 시작: 서버에서 초안을 다시 연 뒤 다시 읽는다 */
  const reopen = useCallback(async () => {
    await (scope === 'TEACHING_PLAN' ? reopenTeachingPlanDraft : reopenPlanReviewDraft)(view.planId, view.documentRevisionId)
    await load('reload')
  }, [view.planId, view.documentRevisionId, scope, load])
  const reload = useCallback(() => load('reload'), [load])

  /** A14: 이 분석 결과의 운영계획 초안에 있는 관리자 직접 추가 행 (서버 저장값만 — 브라우저 백업 없음) */
  const manualRows = server?.draft && server.draft.analysisId === view.analysisId ? (server.draft.manualRows ?? []) : []
  /** A14: 관리자 추가 행은 행 결정 저장이 끝난 상태에서만 저장한다(같은 초안 version을 두 저장이 다투지 않게) */
  const manualRowReady = !unsaved && sync.kind !== 'loading' && sync.kind !== 'load-error' && sync.kind !== 'stale' && sync.kind !== 'closed' && !choice
  /** A14: 추가 행 저장 응답(서버 초안)을 받아 version·표시를 맞춘다. 행 결정 값은 바뀌지 않는다(서버가 그대로 보존) */
  const adopt = useCallback((result: PlanReviewDraftView) => {
    setServer(result)
    const draft = result.draft && result.draft.analysisId === view.analysisId ? result.draft : null
    if (draft) {
      version.current = draft.version
      setSync({ kind: 'saved', at: draft.updatedAt, by: draft.updatedBy, version: draft.version })
    }
  }, [view.analysisId])
  const baseVersion = () => version.current
  return { decisions, subjectIds, sync, server, choice, unsaved, reopened, reopen, reload, setDecision, setSubjectId, clearAll, resolveChoice, resolveConflict, retry: save, forgetBackup: () => writeBackup(key, null), manualRows, manualRowReady, adopt, baseVersion }
}
