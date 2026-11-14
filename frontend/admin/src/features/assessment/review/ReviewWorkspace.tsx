import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { navigate } from '../../../app/adminLocation.ts'
import { confirmPlanReview, getPlanAnalysis, listSchools, searchSchools } from '../api/assessmentAdminApi.ts'
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
import { analysisStatusText, blockersOf, confirmRequestOf, fieldKey, steps, type Decision, type StepId } from './reviewModel.ts'
import { SourcePane } from './SourcePane.tsx'
import { SubjectStep } from './SubjectStep.tsx'
import { TeachingPlanStep } from './TeachingPlanStep.tsx'
import { useServerDraft, type SyncState } from './useServerDraft.ts'
import styles from './review.module.css'

// 평가계획서 검토 Workspace (2차 UI, 2026-11-14 · http 전용).
// 왼쪽 원문 | 1px 선 | 오른쪽 단계(밑줄 탭). 두 영역은 따로 스크롤하고 폭을 조절할 수 있다.
// 데이터: §39 GET analysis·GET plan·preview·PUT review + A5 공유 검토 초안(GET/PUT review-draft, useServerDraft).
//   검토 중 결정은 서버 공유 초안에 자동 저장한다('임시 저장됨'은 서버 성공 뒤에만). 초안은 학생 공개가 아니다 — 확정은 PUT review.

const SPLIT_KEY = 'lh-assessment-review-split'

function readSplit(): number {
  try {
    const value = Number(window.localStorage.getItem(SPLIT_KEY))
    return value >= 30 && value <= 70 ? value : 52
  } catch {
    return 52
  }
}

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
  const [step, setStep] = useState<StepId>('overview')
  const [selection, setSelection] = useState<PerformanceSelection>({ subjectIndex: 0, item: 'common' })
  const [hash, setHash] = useState<HashState>({ status: 'none' })
  const [attested, setAttested] = useState(false)
  const [partialAcknowledged, setPartialAcknowledged] = useState(false)
  const [viewerPage, setViewerPage] = useState(1)
  const [pane, setPane] = useState<'source' | 'review'>('review')
  const [split, setSplit] = useState(readSplit)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [schoolName, setSchoolName] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const fields = view.reviewFields ?? []
  const decided = fields.filter((field) => decisions[fieldKey(field)]).length
  const isPdf = (view.revisionFile?.documentFormat ?? 'PDF') === 'PDF'
  const editable = !confirmed && sync.kind !== 'closed' && sync.kind !== 'loading' && sync.kind !== 'load-error' && sync.kind !== 'stale' && !draft.choice
  const blockers = blockersOf({ view, decisions, subjectIds, hashMatches: hash.status === 'match', attested, partialAcknowledged })
  const stepIndex = steps.findIndex((item) => item.id === step)

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
  const jump = (page: number) => {
    setViewerPage(page)
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
      setHash({ status: value === view.revisionFile?.checksum ? 'match' : 'mismatch', hash: value, fileName: file.name })
    } catch (cause) {
      setHash({ status: 'error', message: cause instanceof Error ? cause.message : '파일을 읽지 못했어요.' })
    }
  }

  const confirm = async () => {
    if (blockers.length > 0 || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(null)
    try {
      const next = await confirmPlanReview(view.planId, view.documentRevisionId, confirmRequestOf(view, decisions, subjectIds))
      // 서버가 같은 Transaction에서 공유 초안을 닫았다. 이 브라우저 백업도 지운다
      draft.forgetBackup()
      setToast({ id: nextToastId(), tone: 'success', text: '확정했어요. 확정한 값만 학생에게 공개돼요.' })
      onReplaced(next)
    } catch (cause) {
      const apiError = toApiError(cause)
      const reasons = Object.entries(apiError.fieldReasons()).map(([field, reason]) => `${field}: ${reason}`)
      setError(`${apiError.message}${reasons.length ? ` (${reasons.join(', ')})` : ''}`)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  // 분할선: 끌기·←/→로 원문 폭 30~70%. 이 브라우저에만 기억한다.
  const saveSplit = (value: number) => {
    const clamped = Math.min(70, Math.max(30, Math.round(value)))
    setSplit(clamped)
    try {
      window.localStorage.setItem(SPLIT_KEY, String(clamped))
    } catch {
      // 기본 폭 사용
    }
  }
  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = bodyRef.current?.getBoundingClientRect()
    if (!rect) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const move = (moveEvent: PointerEvent) => saveSplit(((moveEvent.clientX - rect.left) / rect.width) * 100)
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }
  const keySplit = (event: ReactKeyboardEvent) => {
    if (event.key === 'ArrowLeft') saveSplit(split - 5)
    if (event.key === 'ArrowRight') saveSplit(split + 5)
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
    : `${analysisStatusText[view.analysisStatus].label} · 검토 ${decided}/${fields.length}`

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

      <div className={styles.body} ref={bodyRef} data-pane={pane} style={{ ['--rv-split' as string]: `${split}%` }}>
        <SourcePane planId={view.planId} revisionId={view.documentRevisionId} file={view.revisionFile?.file} page={viewerPage} onPageChange={setViewerPage} />
        <button
          type="button"
          className={styles.splitter}
          role="separator"
          aria-orientation="vertical"
          aria-label="원문과 검토 영역 폭 조절"
          aria-valuenow={split}
          aria-valuemin={30}
          aria-valuemax={70}
          onPointerDown={startDrag}
          onKeyDown={keySplit}
          data-testid="review-splitter"
        />
        <section className={styles.review} aria-label="분석 결과 검토">
          <nav className={styles.steps} aria-label="검토 단계">
            {steps.map((item, index) => (
              <button key={item.id} type="button" className={styles.step} aria-current={item.id === step ? 'step' : undefined} data-done={stepDone[item.id] ? 'true' : undefined} onClick={() => go(item.id)} data-testid={`review-step-${item.id}-tab`}>
                <span className={styles.stepNo}>{stepDone[item.id] ? '✓' : index + 1}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <DraftBanner state={draft} />
          <div className={styles.reviewBody} style={step === 'performance' ? { padding: 0 } : undefined}>
            {step === 'overview' && <OverviewStep view={view} draft={draft.server} onNext={() => go('subjects')} />}
            {step === 'subjects' && (
              <SubjectStep
                view={view}
                subjectIds={subjectIds}
                decisions={decisions}
                onSubjectId={draft.setSubjectId}
                onOpenSubject={(index) => {
                  setSelection({ subjectIndex: index, item: 'common' })
                  go('performance')
                }}
                onJump={jump}
              />
            )}
            {step === 'performance' && <PerformanceStep view={view} selection={selection} onSelect={setSelection} decisions={decisions} onDecide={decide} onJump={jump} readOnly={!editable || !isPdf} />}
            {step === 'teaching' && <TeachingPlanStep view={view} onJump={jump} />}
            {step === 'confirm' && (
              <ConfirmStep
                view={view}
                decisions={decisions}
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
                onConfirmedStructured={(next) => {
                  setToast({ id: nextToastId(), tone: 'success', text: '확정했어요.' })
                  onReplaced(next)
                }}
              />
            )}
          </div>
          <div className={styles.actionBar} data-testid="review-action-bar">
            <div className={styles.progress}>
              {confirmed ? (
                <span>서버에 저장된 확정 결과를 보고 있어요</span>
              ) : (
                <>
                  <span>
                    <strong>
                      검토 {decided}/{fields.length}
                    </strong>{' '}
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
                    <div className={styles.progressFill} style={{ width: `${fields.length ? (decided / fields.length) * 100 : 0}%` }} />
                  </div>
                </>
              )}
            </div>
            <button type="button" className={styles.buttonGhost} onClick={() => go(steps[stepIndex - 1].id)} disabled={stepIndex <= 0}>
              이전
            </button>
            {step === 'confirm' ? (
              !confirmed &&
              isPdf && (
                <button type="button" className={styles.buttonPrimary} onClick={confirm} disabled={blockers.length > 0 || pending} aria-busy={pending} data-testid="review-confirm">
                  {pending ? '확정하는 중…' : '확정하고 학생에게 공개'}
                </button>
              )
            ) : (
              <>
                <button type="button" className={styles.button} onClick={() => go(steps[stepIndex + 1].id)}>
                  다음
                </button>
                <button type="button" className={styles.buttonPrimary} onClick={() => go('confirm')} data-testid="review-go-confirm">
                  {confirmed ? '확정 결과' : '최종 확정'}
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
function SyncText({ sync, onRetry }: { sync: SyncState; onRetry: () => void }) {
  switch (sync.kind) {
    case 'loading':
      return <span className={styles.statusText} data-tone="neutral" data-testid="review-draft-status">초안 불러오는 중…</span>
    case 'load-error':
      return <span className={styles.statusText} data-tone="danger" data-testid="review-draft-status">서버 초안을 불러오지 못했어요 · {sync.message}</span>
    case 'idle':
      return <span className={styles.statusText} data-tone="neutral" data-testid="review-draft-status">바꾸면 서버에 자동으로 임시 저장돼요(학생 공개 아님)</span>
    case 'dirty':
      return <span className={styles.statusText} data-tone="neutral" data-testid="review-draft-status">서버 저장 전 · 이 브라우저에만 백업</span>
    case 'saving':
      return <span className={styles.statusText} data-tone="neutral" data-testid="review-draft-status">서버에 저장하는 중…</span>
    case 'saved':
      return (
        <span className={styles.statusText} data-testid="review-draft-status">
          서버에 임시 저장됨 {clock(sync.at)} · {sync.by} · 버전 {sync.version}
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
function DraftBanner({ state }: { state: ReturnType<typeof useServerDraft> }) {
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
          {sync.updatedBy ? `${sync.updatedBy}님이` : '다른 관리자가'} 먼저 초안을 저장했어요{sync.currentVersion !== null ? ` (버전 ${sync.currentVersion})` : ''}. 내 변경은 아직 서버에 저장되지 않았어요. 다시 적용하면 다른 관리자가 바꾼 항목은 그대로 두고 내가 바꾼 항목만 더해요.
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
          분석 결과가 새로 바뀌었어요. {previous ? `이전 결과의 초안(${previous.decisionCount}개, ${previous.updatedBy})은 보존되어 있지만 ` : ''}새 결과에는 적용하지 않아요. 새 결과를 다시 검토해 주세요.
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
