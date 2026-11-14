import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { confirmPlanReview, getPlanAnalysis, listSchools } from '../api/assessmentAdminApi.ts'
import { toApiError } from '../api/canonicalSource.ts'
import type { EvaluationPlanAnalysisView, ReviewFieldCandidate } from '../api/types.ts'
import { RemoteView } from '../components/AdminParts.tsx'
import { ChevronLeftIcon, Toast, type ToastMessage } from '../components/canonicalUi.ts'
import { nextToastId } from '../model/adminFormat.ts'
import { useRemote } from '../model/useRemote.ts'
import { navigate } from '../../../app/adminLocation.ts'
import { paths } from '../routes/paths.ts'
import { ConfirmStep, type HashState } from './ConfirmStep.tsx'
import { OverviewStep } from './OverviewStep.tsx'
import { PerformanceStep } from './PerformanceStep.tsx'
import { analysisStatusText, blockersOf, confirmRequestOf, fieldKey, steps, type Decision, type StepId } from './reviewModel.ts'
import { SourcePane } from './SourcePane.tsx'
import { SubjectStep } from './SubjectStep.tsx'
import { TeachingPlanStep } from './TeachingPlanStep.tsx'
import styles from './review.module.css'

// 평가계획서 검토 Workspace (UI 재설계, 2026-11-14 · http 전용).
// 왼쪽 원문 / 오른쪽 단계별 검토(요약 → 과목 → 수행평가 → 월별 계획 → 확정). 두 패널은 따로 스크롤하고 폭을 조절할 수 있다.
// 데이터: 기존 §39 GET analysis·GET plan·preview·PUT review 그대로. 화면 안 결정은 최종 확정 때만 서버에 저장된다(임시 저장 API 없음).

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
      {(data) => <ReviewWorkspace view={data} onReplaced={analysis.setData} />}
    </RemoteView>
  )
}

function ReviewWorkspace({ view, onReplaced }: { view: EvaluationPlanAnalysisView; onReplaced: (next: EvaluationPlanAnalysisView) => void }) {
  const [step, setStep] = useState<StepId>('overview')
  const [subjectIndex, setSubjectIndex] = useState(0)
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [subjectIds, setSubjectIds] = useState<Record<number, string>>({})
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

  // 학교 이름: 평가계획서 화면의 학교 목록(담당 학생 학교 + 개발 설정)에서 찾는다. 전체 학교 원천 API가 아직 없어 못 찾으면 이름 없이 학년도·학기만 보여 준다.
  const schoolId = view.slot?.schoolId
  useEffect(() => {
    if (!schoolId) return
    let cancelled = false
    listSchools().then(
      (list) => {
        if (!cancelled) setSchoolName(list.items.find((school) => school.schoolId === schoolId)?.name ?? null)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [schoolId])

  const fields = view.reviewFields ?? []
  const decided = fields.filter((field) => decisions[fieldKey(field)]).length
  const confirmed = view.reviewStatus === 'CONFIRMED'
  const isPdf = (view.revisionFile?.documentFormat ?? 'PDF') === 'PDF'
  const blockers = blockersOf({ view, decisions, subjectIds, hashMatches: hash.status === 'match', attested, partialAcknowledged })
  const stepIndex = steps.findIndex((item) => item.id === step)
  const status = analysisStatusText[view.analysisStatus]

  const go = (next: StepId) => {
    setStep(next)
    setPane('review')
  }
  const jump = (page: number) => {
    setViewerPage(page)
    if (window.matchMedia('(max-width: 1100px)').matches) setPane('source')
  }
  const decide = (field: ReviewFieldCandidate, decision: Decision | null) =>
    setDecisions((previous) => {
      const next = { ...previous }
      if (decision) next[fieldKey(field)] = decision
      else delete next[fieldKey(field)]
      return next
    })

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
      // 서버에서 다시 읽은 값으로 바꾼다 (화면 안 결정은 비운다)
      setDecisions({})
      onReplaced(next)
      setToast({ id: nextToastId(), tone: 'success', text: '공통 평가정보를 확정했어요. 확정값만 학생에게 공개돼요.' })
    } catch (cause) {
      const apiError = toApiError(cause)
      const reasons = Object.entries(apiError.fieldReasons()).map(([field, reason]) => `${field}: ${reason}`)
      setError(`${apiError.message}${reasons.length ? ` (${reasons.join(', ')})` : ''}`)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  // 분할선: 끌기·키보드(←/→)로 원문 폭 30~70% 조절. 값은 이 브라우저에만 기억한다.
  const saveSplit = (value: number) => {
    const clamped = Math.min(70, Math.max(30, Math.round(value)))
    setSplit(clamped)
    try {
      window.localStorage.setItem(SPLIT_KEY, String(clamped))
    } catch {
      // 저장 실패는 무시 (기본 폭 사용)
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
  const stepDone: Record<StepId, boolean> = {
    overview: true,
    subjects: view.subjects.length > 0 && view.subjects.every((_, index) => (subjectIds[index] ?? '').trim() !== '' || !fields.some((field) => field.subjectIndex === index && decisions[fieldKey(field)])) && decided > 0,
    performance: fields.length > 0 && decided === fields.length,
    teaching: false,
    confirm: confirmed,
  }

  return (
    <div className={styles.workspace} data-testid="review-workspace">
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={() => navigate(paths.plans)} aria-label="평가계획서 목록으로">
          <ChevronLeftIcon size={20} />
        </button>
        <div className={styles.titleBlock}>
          <p className={styles.eyebrow}>
            {schoolName ? `${schoolName} · ` : ''}
            {slot ? `${slot.academicYear}학년도 ${slot.grade}학년 ${slot.semester}학기` : '평가계획서'}
          </p>
          <h2 className={styles.title} title={view.revisionFile?.fileName}>
            {view.revisionFile?.fileName ?? '평가계획서 검토'}
          </h2>
        </div>
        <div className={styles.headerBadges}>
          <span className={styles.pill} data-tone={status.tone} data-testid="review-analysis-status">
            {status.label}
          </span>
          <span className={styles.pill} data-tone={confirmed ? 'success' : undefined}>
            {confirmed ? '확정 완료 · 학생 공개 중' : '관리자 확정 전'}
          </span>
        </div>
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
        <div className={styles.review}>
          <section className={styles.reviewCard} aria-label="분석 결과 검토">
            <nav className={styles.steps} aria-label="검토 단계">
              {steps.map((item, index) => (
                <button key={item.id} type="button" className={styles.step} aria-current={item.id === step ? 'step' : undefined} data-done={stepDone[item.id] && item.id !== step} onClick={() => go(item.id)} data-testid={`review-step-${item.id}-tab`}>
                  <span className={styles.stepNumber}>{stepDone[item.id] && item.id !== step ? '✓' : index + 1}</span>
                  {item.label}
                </button>
              ))}
            </nav>
            <div className={styles.reviewBody}>
              {step === 'overview' && <OverviewStep view={view} onNext={() => go('subjects')} />}
              {step === 'subjects' && (
                <SubjectStep
                  view={view}
                  subjectIds={subjectIds}
                  decisions={decisions}
                  onSubjectId={(index, value) => setSubjectIds((previous) => ({ ...previous, [index]: value }))}
                  onOpenSubject={(index) => {
                    setSubjectIndex(index)
                    go('performance')
                  }}
                  onJump={jump}
                />
              )}
              {step === 'performance' && (
                <PerformanceStep view={view} subjectIndex={subjectIndex} onSubject={setSubjectIndex} decisions={decisions} onDecide={decide} onJump={jump} readOnly={confirmed || !isPdf} />
              )}
              {step === 'teaching' && <TeachingPlanStep view={view} />}
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
                    onReplaced(next)
                    setToast({ id: nextToastId(), tone: 'success', text: '공통 평가정보를 확정했어요.' })
                  }}
                />
              )}
            </div>
            <div className={styles.actionBar} data-testid="review-action-bar">
              <div className={styles.progress}>
                {confirmed ? (
                  <span>확정 완료 · 서버에 저장된 값을 보고 있어요</span>
                ) : (
                  <>
                    <span>
                      검토 {decided}/{fields.length}개 {decided > 0 && <span className={styles.tiny}>· 확정 전까지 서버에 저장되지 않아요</span>}
                    </span>
                    <div className={styles.progressTrack} aria-hidden="true">
                      <div className={styles.progressFill} style={{ width: `${fields.length ? (decided / fields.length) * 100 : 0}%` }} />
                    </div>
                  </>
                )}
              </div>
              <button type="button" className={styles.ctaGhost} onClick={() => go(steps[stepIndex - 1].id)} disabled={stepIndex <= 0}>
                이전
              </button>
              {step === 'confirm' ? (
                !confirmed && isPdf && (
                  <button type="button" className={styles.cta} onClick={confirm} disabled={blockers.length > 0 || pending} aria-busy={pending} data-testid="review-confirm">
                    {pending ? '확정하는 중…' : '확정하고 학생에게 공개'}
                  </button>
                )
              ) : (
                <>
                  {stepIndex < steps.length - 2 && (
                    <button type="button" className={styles.ctaGhost} onClick={() => go(steps[stepIndex + 1].id)}>
                      다음
                    </button>
                  )}
                  <button type="button" className={styles.cta} onClick={() => go('confirm')} data-testid="review-go-confirm">
                    {confirmed ? '확정 결과 보기' : '최종 확정으로'}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
