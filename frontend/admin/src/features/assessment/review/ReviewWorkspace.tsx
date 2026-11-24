import { approvalSummary, defaultIncluded } from './reviewFilter.ts'
import { finalApprovalPlan, type SlotSubject } from './finalApproval.ts'
import { isSchoolInfoSource } from '../model/schoolInfoSync.ts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSplitPane } from './useSplitPane.ts'
import { navigate } from '../../../app/adminLocation.ts'
import { confirmPlanReview, getPlanAnalysis, getPlanSubjects, getTeachingPlanReview, listSchools, searchSchools } from '../api/assessmentAdminApi.ts'
import { toApiError } from '../api/canonicalSource.ts'
import type { EvaluationPlanAnalysisView, ReviewFieldCandidate } from '../api/types.ts'
import { RemoteView } from '../components/AdminParts.tsx'
import { ChevronLeftIcon, Toast, type ToastMessage } from '../components/canonicalUi.ts'
import { nextToastId } from '../model/adminFormat.ts'
import { useRemote } from '../model/useRemote.ts'
import { paths } from '../routes/paths.ts'
import { ConfirmStep, type HashState } from './ConfirmStep.tsx'
import { OverviewStep } from './OverviewStep.tsx'
import { PerformanceStep, type PerformanceSelection } from './PerformanceStep.tsx'
import { analysisStatusText, blockersOf, confirmRequestOf, confirmedSubjectLinks, gradeConflict, excludedSet, fieldKey, steps, withoutExcluded, type Decision, type StepId } from './reviewModel.ts'
import { SourcePane } from './SourcePane.tsx'
import type { OnJump } from './evidence.ts'
import type { StructureFocus } from '../components/PlanStructureViewer.tsx'
import { SubjectStep } from './SubjectStep.tsx'
import { TeachingPlanStep } from './TeachingPlanStep.tsx'
import { useServerDraft, type SyncState } from './useServerDraft.ts'
import { actorLabel } from '../model/actorLabel.ts'
import { devPanelEnabled } from '../../../../../student/src/features/assessment/dev/devContext.ts'
import styles from './review.module.css'

// 평가계획서 검토 Workspace (2차 UI, 2026-11-14 · http 전용).
// 왼쪽 원문 | 1px 선 | 오른쪽 단계(밑줄 탭). 두 영역은 따로 스크롤하고 폭을 조절할 수 있다.
// 데이터: §39 GET analysis·GET plan·preview·PUT review + A5 공유 검토 초안(GET/PUT review-draft, useServerDraft).
//   검토 중 결정은 서버 공유 초안에 자동 저장한다('임시 저장됨'은 서버 성공 뒤에만). 초안은 학생 공개가 아니다 — 확정은 PUT review.

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function PlanReviewWorkspaceRoute({ planId, revisionId }: { planId: string; revisionId: string }) {
  const analysis = useRemote(() => getPlanAnalysis(planId, revisionId), [planId, revisionId])
  return (
    <RemoteView state={analysis.state} label="분석 결과" onRetry={analysis.reload}>
      {(data) => <ReviewWorkspace key={data.analysisId ?? 'none'} view={data} onReplaced={analysis.setData} />}
    </RemoteView>
  )
}

function ReviewWorkspace({ view, onReplaced }: { view: EvaluationPlanAnalysisView; onReplaced: (next: EvaluationPlanAnalysisView) => void }) {
  const confirmed = view.reviewStatus === 'CONFIRMED'
  const draft = useServerDraft(view)
  const { decisions, subjectIds, sync } = draft
  // A28-36: ?step=confirm 으로 들어오면 최종 확정 단계부터(재분석 뒤 '검토하기' · 결과 화면 '월별 운영계획 승인')
  const [step, setStep] = useState<StepId>(() => (new URLSearchParams(window.location.search).get('step') === 'confirm' ? 'confirm' : 'overview'))
  // PR #18 통합: 처음 여는 과목은 이 문서 학년 과목(합본 문서에서 다른 학년 과목은 A27 과목 제외·학년 충돌 안내로 다룬다)
  const [selection, setSelection] = useState<PerformanceSelection>(() => {
    const own = view.subjects.findIndex((_, index) => !gradeConflict(view.subjectGrades?.[index], view.slot?.grade))
    return { subjectIndex: own >= 0 ? own : 0, item: 'common' }
  })
  const [hash, setHash] = useState<HashState>({ status: 'none' })
  const [attested, setAttested] = useState(false)
  const [partialAcknowledged, setPartialAcknowledged] = useState(false)
  // 학년도 비교 등에서 근거 쪽으로 들어오면(?page=N) 그 쪽부터 연다
  const [viewerPage, setViewerPage] = useState(() => Math.max(1, Number(new URLSearchParams(window.location.search).get('page')) || 1))
  const [pane, setPane] = useState<'source' | 'review'>('review')
  // 분할선: 검토 화면 기본 52% (결과 조회 화면과 같은 공용 훅, 저장 키는 따로)
  const { bodyRef, separatorProps, bodyStyle } = useSplitPane('lh-assessment-review-split', 52)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [schoolName, setSchoolName] = useState<string | null>(null)
  const stepsRef = useRef<HTMLElement>(null)
  // 좁은 패널에서 Stepper가 가로 스크롤될 때 현재 단계가 보이게 한다 (Stepper 영역 안에서만 스크롤)
  useEffect(() => {
    const nav = stepsRef.current
    const current = nav?.querySelector<HTMLElement>('[aria-current="step"]')
    if (!nav || !current) return
    const left = current.offsetLeft - nav.offsetLeft
    if (left < nav.scrollLeft || left + current.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollTo({ left: Math.max(0, left - 16), behavior: 'smooth' })
    }
  }, [step])

  // A27-UX 과목 제외: 제외한 과목은 검토 대상·확정에서 빠진다(결정은 초안에 남아 복원하면 돌아온다). 진행률은 검토 대상 기준, 제외는 따로 센다
  const excluded = excludedSet(draft.exclusions)
  const activeDecisions = withoutExcluded(decisions, excluded)
  const allFields = view.reviewFields ?? []
  const fields = allFields.filter((field) => !excluded.has(field.subjectIndex))
  const excludedFieldCount = allFields.length - fields.length
  const decided = fields.filter((field) => decisions[fieldKey(field)]).length
  const isPdf = (view.revisionFile?.documentFormat ?? 'PDF') === 'PDF'
  // A12: 확정 문서라도 재검토 중(초안 다시 열림)이면 편집·재확정할 수 있다
  const editable = (!confirmed || draft.reopened) && sync.kind !== 'closed' && sync.kind !== 'loading' && sync.kind !== 'load-error' && sync.kind !== 'stale' && !draft.choice
  const blockers = blockersOf({ view, decisions: activeDecisions, subjectIds, hashMatches: hash.status === 'match', attested, partialAcknowledged, reReview: draft.reopened })
  // 부록 O §39-13: AI 후보 기본 포함 + 관리자 결정 보존 → 같은 확정 조건(blockersOf)으로 한 번에 확정
  const bulk = defaultIncluded(view.reviewFields ?? [], activeDecisions, excludedSet(draft.exclusions))
  const bulkBlockers = [
    ...(bulk.pending.length > 0 ? [`값이나 원문 근거가 없는 항목 ${bulk.pending.length}개를 먼저 고치거나 '원문에 없음'으로 표시해 주세요('확인 필요' 필터).`] : []),
    ...(draft.unsaved ? ['검토 초안 자동 저장이 끝난 뒤 확정해 주세요.'] : []),
    ...blockersOf({ view, decisions: bulk.merged, subjectIds, hashMatches: hash.status === 'match', attested, partialAcknowledged, reReview: draft.reopened }),
  ]
  const stepIndex = steps.findIndex((item) => item.id === step)
  // A28-03: '검토 n/전체'(하나씩 확인) 대신 기본 승인 기준 요약 — 값·근거 있는 AI 후보는 클릭 없이 승인 대상, 확인 필요만 따로 센다
  const summary = approvalSummary(allFields, decisions, excluded)
  // A28-05: 학교알리미 공식 수집 원본 → 원클릭 최종 승인(서버 원본 검증). 과목 기본 연결에 문서 슬롯 학업 과목 목록을 쓴다
  const serverOriginal = isSchoolInfoSource(view.revisionFile?.sourceUrl)
  const [slotSubjects, setSlotSubjects] = useState<SlotSubject[] | null>(null)
  useEffect(() => {
    if (!serverOriginal) return
    let cancelled = false
    getPlanSubjects(view.planId).then(
      (data) => !cancelled && setSlotSubjects(data.available ? data.items : []),
      () => !cancelled && setSlotSubjects([]),
    )
    return () => {
      cancelled = true
    }
  }, [view.planId, serverOriginal])
  // A28-08: 최종 승인은 월별 운영계획도 함께 확정한다 — 운영계획 확정 기록(있으면 넣지 않음)과 운영계획 초안의 관리자 결정을 읽는다
  const hasTeachingRows = (view.teachingPlanCandidates ?? []).some((subject) => (subject.rows?.length ?? 0) > 0)
  const [teachingConfirmed, setTeachingConfirmed] = useState<boolean | null | 'error'>(null)
  useEffect(() => {
    if (!serverOriginal || !hasTeachingRows || !view.analysisId) return
    let cancelled = false
    getTeachingPlanReview(view.planId, view.documentRevisionId).then(
      (data) => !cancelled && setTeachingConfirmed(Boolean(data.review)),
      () => !cancelled && setTeachingConfirmed('error'),
    )
    return () => {
      cancelled = true
    }
  }, [view.planId, view.documentRevisionId, view.analysisId, serverOriginal, hasTeachingRows])
  const teachingDraft = useServerDraft(view, { scope: 'TEACHING_PLAN', closed: teachingConfirmed === true })
  const reloadTeachingDraft = teachingDraft.reload
  useEffect(() => {
    // 운영계획 단계에서 바꾼 결정을 최종 승인 요약에 반영한다
    if (step === 'confirm' && serverOriginal && hasTeachingRows) void reloadTeachingDraft()
  }, [step, serverOriginal, hasTeachingRows, reloadTeachingDraft])
  const lockedLinks = useMemo(
    () => ({ ...confirmedSubjectLinks(view), ...Object.fromEntries(Object.entries(subjectIds).filter(([, id]) => (id ?? '').trim() !== '')) }),
    [view, subjectIds],
  )
  const approvalPlan = serverOriginal
    ? finalApprovalPlan({
        view,
        decisions: activeDecisions,
        // A28-29: 평가 정보 확정 때 관리자가 연결한 과목(확정값의 과목)을 기본으로 — 초안 연결이 있으면 그것이 우선. 확정 문서의 '월별 운영계획 최종 승인'이
        // 이름이 다른 과목(초안 없음)에서 연결을 잃어 막히지 않게 한다. 확정값이 없는 문서는 그대로다
        // A28-29: 평가 정보가 확정됐고 재검토가 열리지 않은 문서(= '월별 운영계획 최종 승인'만 남은 경우)에만, 확정 때 관리자가 연결한 과목을
        // 기본 연결로 쓴다(초안 연결이 있으면 그것이 우선). 이름이 다른 과목·초안 없음에서 운영계획 승인이 막히지 않게. 그 밖의 문서는 그대로 subjectIds
        adminLinks: view.reviewStatus === 'CONFIRMED' && !draft.reopened ? lockedLinks : subjectIds,
        excluded,
        slotSubjects,
        reReview: draft.reopened,
        serverOriginal,
        expectedDraftVersion: draft.baseVersion() ?? null,
        teaching: hasTeachingRows
          ? {
              status: teachingConfirmed === null || teachingConfirmed === 'error' ? teachingConfirmed : { confirmed: teachingConfirmed, reopened: teachingConfirmed && teachingDraft.reopened },
              decisions: teachingDraft.decisions,
            }
          : undefined,
      })
    : null

  // 학교 이름: 평가계획서 화면의 학교 목록에서 찾는다. 전체 학교 원천이 없어 못 찾으면 이름 없이 학년도·학기만 보여 준다.
  const schoolId = view.slot?.schoolId
  useEffect(() => {
    if (!schoolId) return
    let cancelled = false
    // 등록 학교 검색(학업 Context로 확인된 이름) → 없으면 담당 학생 학교 목록. 둘 다 없으면 이름을 지어내지 않는다
    searchSchools(schoolId)
      .then((result) => result.items.find((school) => school.schoolId === schoolId)?.name ?? null)
      .catch(() => null)
      .then(async (name) => name ?? (await listSchools().then((list) => list.items.find((school) => school.schoolId === schoolId)?.name ?? null, () => null)))
      .then((name) => {
        if (!cancelled) setSchoolName(name)
      })
    return () => {
      cancelled = true
    }
  }, [schoolId])

  // 서버에 아직 저장되지 않은 변경이 있으면 페이지를 떠나기 전에 브라우저 경고를 띄운다
  const unsaved = draft.unsaved
  useEffect(() => {
    if (!unsaved) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsaved])

  const go = (next: StepId) => {
    setStep(next)
    setPane('review')
  }
  // A11: PDF는 쪽 번호, HWP·HWPX는 구조 위치(section·path)로 이동한다. 같은 위치를 다시 눌러도 다시 스크롤하도록 seq를 올린다
  const [viewerFocus, setViewerFocus] = useState<StructureFocus | null>(null)
  const jump: OnJump = (target) => {
    if (typeof target === 'number') setViewerPage(target)
    else setViewerFocus((current) => ({ section: target.section, path: target.path, seq: (current?.seq ?? 0) + 1 }))
    if (window.matchMedia('(max-width: 1100px)').matches) setPane('source')
  }
  const decide = (field: ReviewFieldCandidate, decision: Decision | null) => draft.setDecision(fieldKey(field), decision)

  const pickFile = async (file: File | undefined) => {
    setAttested(false)
    if (!file) {
      setHash({ status: 'none' })
      return
    }
    setHash({ status: 'computing' })
    try {
      const value = await sha256Hex(file)
      setHash({ status: value === view.revisionFile?.checksum ? 'match' : 'mismatch', hash: value, fileName: file.name, sizeBytes: file.size })
    } catch (cause) {
      setHash({ status: 'error', message: cause instanceof Error ? cause.message : '파일을 읽지 못했어요.' })
    }
  }

  const confirm = async (mode: 'each' | 'bulk' = 'each') => {
    if ((mode === 'each' ? blockers : bulkBlockers).length > 0 || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(null)
    try {
      const request =
        mode === 'each'
          ? confirmRequestOf(view, activeDecisions, subjectIds)
          : { ...confirmRequestOf(view, bulk.merged, subjectIds), expectedDraftVersion: draft.baseVersion(), bulk: true }
      const next = await confirmPlanReview(view.planId, view.documentRevisionId, request)
      // 서버가 같은 Transaction에서 공유 초안을 닫았다. 이 브라우저 백업도 지운다
      draft.forgetBackup()
      const wasReReview = draft.reopened
      setToast({ id: nextToastId(), tone: 'success', text: wasReReview ? '다시 확정했어요. 학생에게는 새 확정본이 보여요.' : '확정했어요. 확정한 값만 학생에게 공개돼요.' })
      onReplaced(next)
      // 재확정은 확정 상태가 그대로라 초안이 닫힌 것을 다시 읽어야 한다
      if (wasReReview) void draft.reload()
      // A27-UX: 확정 뒤 읽기 전용 결과 조회 화면으로 이동한다(목록으로만 돌아가지 않음)
      navigate(paths.planResult(view.planId, view.documentRevisionId))
    } catch (cause) {
      const apiError = toApiError(cause)
      const reasons = Object.entries(apiError.fieldReasons()).map(([field, reason]) => (reason === 'grade_conflict' ? `${field}: 원문상 이 문서 학년이 아닌 과목이에요(확정 불가)` : reason === 'subject_excluded' ? `${field}: 이 문서 검토 대상에서 제외한 과목이에요(복원 후 확정)` : `${field}: ${reason}`))
      setError(`${apiError.message}${reasons.length ? ` (${reasons.join(', ')})` : ''}`)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const slot = view.slot
  // 완료 표시는 실제 상태로만: 과목 연결 = 확인한 과목이 모두 코드 연결, 수행평가 = 모든 항목 확인, 확정 = 서버 CONFIRMED
  const usedSubjects = [...new Set(fields.filter((field) => decisions[fieldKey(field)]).map((field) => field.subjectIndex))]
  const stepDone: Record<StepId, boolean> = {
    overview: false,
    subjects: usedSubjects.length > 0 && usedSubjects.every((index) => (subjectIds[index] ?? '').trim() !== ''),
    performance: fields.length > 0 && decided === fields.length,
    teaching: false,
    confirm: confirmed,
  }
  const headerStatus = confirmed
    ? `확정값 ${view.confirmedFields.length}개 학생 공개 · 미확인 ${Math.max(0, fields.length - view.confirmedFields.length)}개 비공개`
    : `${analysisStatusText[view.analysisStatus].label} · 승인 대상 ${summary.approvalTarget}개 · 확인 필요 ${summary.needsReview}개`

  return (
    <div className={styles.workspace} data-testid="review-workspace">
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={() => navigate(paths.plans)} aria-label="평가계획서 목록으로">
          <ChevronLeftIcon size={20} />
        </button>
        <div className={styles.crumbs}>
          <span>
            {schoolName ? `${schoolName} / ` : ''}
            {slot ? `${slot.academicYear}학년도 ${slot.grade}학년 ${slot.semester}학기 /` : ''}
          </span>
          <strong title={view.revisionFile?.fileName}>{view.revisionFile?.fileName ?? '평가계획서 검토'}</strong>
        </div>
        <span className={styles.headerStatus} data-testid="review-analysis-status">
          {headerStatus}
        </span>
      </header>

      <div className={styles.paneSwitch} role="group" aria-label="보기 전환">
        <button type="button" aria-pressed={pane === 'source'} onClick={() => setPane('source')}>
          원문
        </button>
        <button type="button" aria-pressed={pane === 'review'} onClick={() => setPane('review')}>
          검토
        </button>
      </div>

      <div className={styles.body} ref={bodyRef} data-pane={pane} style={bodyStyle}>
        <SourcePane planId={view.planId} revisionId={view.documentRevisionId} file={view.revisionFile?.file} page={viewerPage} onPageChange={setViewerPage} focus={viewerFocus} />
        <button
          type="button"
          className={styles.splitter}
          aria-label="원문과 검토 영역 폭 조절"
          {...separatorProps}
          data-testid="review-splitter"
        />
        <section className={styles.review} aria-label="분석 결과 검토">
          <nav className={styles.steps} aria-label="검토 단계" ref={stepsRef}>
            {steps.map((item, index) => (
              <button key={item.id} type="button" className={styles.step} aria-current={item.id === step ? 'step' : undefined} data-done={stepDone[item.id] ? 'true' : undefined} onClick={() => go(item.id)} data-testid={`review-step-${item.id}-tab`}>
                <span className={styles.stepNo} aria-hidden="true">
                  {stepDone[item.id] && item.id !== step ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7.4 5.8 10 11 4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                {stepDone[item.id] && item.id !== step && <span className={styles.srOnly}>완료 · </span>}
                {item.label}
              </button>
            ))}
          </nav>
          <DraftBanner state={draft} />
          <div className={styles.reviewBody} style={step === 'performance' ? { padding: 0 } : undefined}>
            {step === 'overview' && <OverviewStep view={view} draft={draft.server} summary={confirmed && !draft.reopened ? null : summary} onNext={() => go('subjects')} />}
            {step === 'subjects' && (
              <SubjectStep
                view={view}
                subjectIds={subjectIds}
                decisions={decisions}
                exclusions={draft.exclusions}
                onExclude={draft.setExclusion}
                editable={editable}
                onSubjectId={draft.setSubjectId}
                onOpenSubject={(index) => {
                  setSelection({ subjectIndex: index, item: 'common' })
                  go('performance')
                }}
                onJump={jump}
              />
            )}
            {step === 'performance' && <PerformanceStep view={view} selection={selection} onSelect={setSelection} decisions={decisions} onDecide={decide} onDecideKey={draft.setDecision} onJump={jump} readOnly={!editable || !isPdf} />}
            {step === 'teaching' && (
              <TeachingPlanStep
                view={view}
                onJump={jump}
                subjectIds={subjectIds}
                excludedSubjects={excluded}
                onGoSubjects={() => go('subjects')}
                onFinalStep={serverOriginal ? () => go('confirm') : undefined}
              />
            )}
            {step === 'confirm' && (
              <ConfirmStep
                view={view}
                decisions={activeDecisions}
                excludedSubjects={excluded}
                subjectIds={subjectIds}
                hash={hash}
                onPickFile={pickFile}
                attested={attested}
                onAttest={setAttested}
                partialAcknowledged={partialAcknowledged}
                onPartialAck={setPartialAcknowledged}
                blockers={blockers}
                error={error}
                onGo={go}
                reopened={draft.reopened}
                onReopen={draft.reopen}
                onConfirmedStructured={(next) => {
                  setToast({ id: nextToastId(), tone: 'success', text: '확정했어요.' })
                  onReplaced(next)
                  navigate(paths.planResult(view.planId, view.documentRevisionId))
                }}
                onSubjectId={draft.setSubjectId}
                onConfirm={() => void confirm('each')}
                pending={pending}
                approval={
                  approvalPlan && ((editable && !draft.unsaved) || approvalPlan.teachingOnlyRequest)
                    ? {
                        plan: approvalPlan,
                        onConfirmed: (next) => {
                          draft.forgetBackup()
                          const wasReReview = draft.reopened
                          setToast({ id: nextToastId(), tone: 'success', text: wasReReview ? '다시 최종 승인했어요. 학생에게는 새 확정본이 보여요.' : '최종 승인했어요. 확정한 값만 학생에게 공개돼요.' })
                          onReplaced(next)
                          if (wasReReview) void draft.reload()
                          navigate(paths.planResult(view.planId, view.documentRevisionId))
                        },
                      }
                    : undefined
                }
                bulk={
                  editable
                    ? {
                        merged: bulk.merged,
                        defaulted: bulk.defaulted,
                        edited: bulk.edited,
                        absent: bulk.absent,
                        confirmed: bulk.confirmed,
                        pendingCount: bulk.pending.length,
                        excludedFields: summary.excludedFields,
                        blockers: bulkBlockers,
                        checksum: view.revisionFile?.checksum ?? null,
                        revisionNumber: null,
                        onConfirm: () => void confirm('bulk'),
                      }
                    : undefined
                }
              />
            )}
          </div>
          <div className={styles.actionBar} data-testid="review-action-bar">
            <div className={styles.progress}>
              {confirmed && !draft.reopened ? (
                <span>서버에 저장된 확정 결과를 보고 있어요</span>
              ) : (
                <>
                  <span>
                    <strong data-testid="review-progress-count">
                      승인 대상 {summary.approvalTarget}/{summary.total} · 확인 필요 {summary.needsReview}
                    </strong>
                    {excludedFieldCount > 0 && (
                      <span data-testid="review-progress-excluded"> · 제외 {excluded.size}과목({excludedFieldCount}항목)</span>
                    )}{' '}
                    {draft.reopened && <span data-testid="review-rereview-badge"> · 재검토 중(학생에게는 이전 확정본 공개 중)</span>}
                    · <SyncText sync={sync} onRetry={() => void draft.retry()} />
                    {editable && decided > 0 && (
                      <>
                        {' · '}
                        <button type="button" className={styles.link} onClick={draft.clearAll} data-testid="review-draft-discard">
                          모두 비우기
                        </button>
                      </>
                    )}
                  </span>
                  <div className={styles.progressTrack} aria-hidden="true">
                    <div className={styles.progressFill} style={{ width: `${summary.total ? (summary.approvalTarget / summary.total) * 100 : 0}%` }} />
                  </div>
                </>
              )}
            </div>
            <button type="button" className={styles.buttonGhost} onClick={() => go(steps[stepIndex - 1].id)} disabled={stepIndex <= 0}>
              이전
            </button>
            {step === 'confirm' ? null : (
              <>
                <button type="button" className={styles.button} onClick={() => go(steps[stepIndex + 1].id)}>
                  다음
                </button>
                <button type="button" className={styles.button} onClick={() => go('confirm')} data-testid="review-go-confirm">
                  {confirmed && !draft.reopened ? '확정 결과' : '최종 승인'}
                </button>
              </>
            )}
          </div>
        </section>
      </div>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

/** 저장 상태: 서버 응답으로만 '임시 저장됨'을 표시한다 */
export function SyncText({ sync, onRetry }: { sync: SyncState; onRetry: () => void }) {
  switch (sync.kind) {
    case 'loading':
      return <span className={styles.statusText} data-tone="neutral" data-testid="review-draft-status">초안 불러오는 중…</span>
    case 'load-error':
      return <span className={styles.statusText} data-tone="danger" data-testid="review-draft-status">서버 초안을 불러오지 못했어요 · {sync.message}</span>
    case 'idle':
      return <span className={styles.statusText} data-tone="neutral" data-testid="review-draft-status">자동 저장</span>
    case 'dirty':
      return <span className={styles.statusText} data-tone="neutral" data-testid="review-draft-status">서버 저장 전 · 이 브라우저에만 백업</span>
    case 'saving':
      return <span className={styles.statusText} data-tone="neutral" data-testid="review-draft-status">서버에 저장하는 중…</span>
    case 'saved':
      return (
        <span className={styles.statusText} data-testid="review-draft-status">
          서버에 임시 저장됨 {clock(sync.at)} · {actorLabel(sync.by)} · 버전 {sync.version}
        </span>
      )
    case 'error':
      return (
        <span className={styles.statusText} data-tone="danger" data-testid="review-draft-status">
          서버 저장 실패 · {sync.message}{' '}
          <button type="button" className={styles.link} onClick={onRetry}>
            다시 시도
          </button>
        </span>
      )
    case 'conflict':
      return <span className={styles.statusText} data-tone="danger" data-testid="review-draft-status">다른 관리자의 저장과 충돌 · 위 안내에서 선택해 주세요</span>
    case 'stale':
      return <span className={styles.statusText} data-tone="danger" data-testid="review-draft-status">분석 결과가 바뀌어 저장하지 않았어요</span>
    case 'closed':
      return <span className={styles.statusText} data-tone="neutral" data-testid="review-draft-status">확정되어 초안이 닫혔어요</span>
  }
}

/** 충돌·결과 바뀜·브라우저 백업 선택 안내 (검토 영역 맨 위 한 줄) */
export function DraftBanner({ state }: { state: ReturnType<typeof useServerDraft> }) {
  const { sync, choice } = state
  if (choice) {
    return (
      <div className={styles.banner} role="alert" data-testid="review-draft-choice">
        <span>
          {choice.kind === 'local-vs-server'
            ? `이 브라우저에 서버 초안과 다른 검토 내용(${choice.localCount}개)이 남아 있어요. 서버 초안은 ${choice.serverBy}님이 저장한 ${choice.serverCount}개예요.`
            : `이 브라우저에 서버에 저장되지 않은 검토 내용(${choice.localCount}개)이 남아 있어요.`}
        </span>
        <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => state.resolveChoice(false)} data-testid="review-draft-use-server">
          {choice.kind === 'local-vs-server' ? '서버 초안 사용' : '버리기'}
        </button>
        <button type="button" className={`${styles.buttonDark} ${styles.small}`} onClick={() => state.resolveChoice(true)} data-testid="review-draft-use-local">
          이 브라우저 내용으로 서버 저장
        </button>
      </div>
    )
  }
  if (sync.kind === 'conflict') {
    return (
      <div className={styles.banner} role="alert" data-testid="review-draft-conflict">
        <span>
          {devPanelEnabled() && sync.updatedBy ? `${actorLabel(sync.updatedBy)}가` : '다른 관리자가'} 먼저 초안을 저장했어요{sync.currentVersion !== null ? ` (버전 ${sync.currentVersion})` : ''}. 내 변경은 아직 서버에 저장되지 않았어요. 다시 적용하면 다른 관리자가 바꾼 항목은 그대로 두고 내가 바꾼 항목만 더해요.
        </span>
        <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => void state.resolveConflict('reload')} data-testid="review-draft-reload">
          최신 초안 불러오기
        </button>
        <button type="button" className={`${styles.buttonDark} ${styles.small}`} onClick={() => void state.resolveConflict('reapply')} data-testid="review-draft-overwrite">
          최신 초안에 내 변경 다시 적용
        </button>
      </div>
    )
  }
  if (sync.kind === 'stale' || (state.server && !state.server.draft && state.server.previousDrafts.length > 0)) {
    const previous = state.server?.previousDrafts[0]
    return (
      <div className={styles.banner} role="status" data-testid="review-draft-stale">
        <span>
          분석 결과가 새로 바뀌었어요. {previous ? `이전 결과의 초안(${previous.decisionCount}개)은 보존되어 있지만 ` : ''}새 결과에는 적용하지 않아요.
        </span>
        {sync.kind === 'stale' && (
          <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => window.location.reload()}>
            새 결과 열기
          </button>
        )}
      </div>
    )
  }
  return null
}
