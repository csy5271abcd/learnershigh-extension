import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { navigate } from '../../../app/adminLocation.ts'
import { confirmPlanReview, getPlanAnalysis, listSchools } from '../api/assessmentAdminApi.ts'
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
import styles from './review.module.css'

// 평가계획서 검토 Workspace (2차 UI, 2026-11-14 · http 전용).
// 왼쪽 원문 | 1px 선 | 오른쪽 단계(밑줄 탭). 두 영역은 따로 스크롤하고 폭을 조절할 수 있다.
// 데이터: 기존 §39 GET analysis·GET plan·preview·PUT review. 서버 임시 저장 API는 없다 →
//   검토 중 결정은 이 브라우저(localStorage)에만 임시 보관하고 '서버 저장 아님'을 표시한다. 최종 확정 때만 서버에 저장된다.

const SPLIT_KEY = 'lh-assessment-review-split'
const draftKey = (view: EvaluationPlanAnalysisView) => `lh-assessment-review-draft:${view.planId}:${view.documentRevisionId}:${view.analysisId ?? 'none'}`

interface Draft {
  decisions: Record<string, Decision>
  subjectIds: Record<number, string>
  savedAt: string
}

function readSplit(): number {
  try {
    const value = Number(window.localStorage.getItem(SPLIT_KEY))
    return value >= 30 && value <= 70 ? value : 52
  } catch {
    return 52
  }
}

function readDraft(key: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const draft = JSON.parse(raw) as Draft
    return draft && typeof draft.decisions === 'object' ? draft : null
  } catch {
    return null
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
  // 확정 전 문서만 브라우저 임시 보관본을 복원한다 (분석 결과가 바뀌면 key가 달라져 이전 보관본을 쓰지 않는다)
  const [restored] = useState(() => (confirmed ? null : readDraft(draftKey(view))))
  const [step, setStep] = useState<StepId>('overview')
  const [selection, setSelection] = useState<PerformanceSelection>({ subjectIndex: 0, item: 'common' })
  const [decisions, setDecisions] = useState<Record<string, Decision>>(restored?.decisions ?? {})
  const [subjectIds, setSubjectIds] = useState<Record<number, string>>(restored?.subjectIds ?? {})
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
  const hasDraft = !confirmed && (decided > 0 || Object.values(subjectIds).some((value) => value.trim() !== ''))
  const blockers = blockersOf({ view, decisions, subjectIds, hashMatches: hash.status === 'match', attested, partialAcknowledged })
  const stepIndex = steps.findIndex((item) => item.id === step)

  // 학교 이름: 평가계획서 화면의 학교 목록에서 찾는다. 전체 학교 원천이 없어 못 찾으면 이름 없이 학년도·학기만 보여 준다.
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

  // 브라우저 임시 보관 (서버 저장 아님). 결정이 바뀔 때마다 이 브라우저에만 쓴다.
  const storageKey = draftKey(view)
  useEffect(() => {
    if (confirmed) return
    try {
      if (!hasDraft) {
        window.localStorage.removeItem(storageKey)
        return
      }
      window.localStorage.setItem(storageKey, JSON.stringify({ decisions, subjectIds, savedAt: new Date().toISOString() } satisfies Draft))
    } catch {
      // 저장소를 쓸 수 없는 브라우저: 임시 보관 없이 진행한다(안내 문구는 '서버 저장 아님' 그대로)
    }
  }, [decisions, subjectIds, confirmed, hasDraft, storageKey])

  // 확정하지 않은 검토가 있으면 페이지를 떠나기 전에 브라우저 경고를 띄운다
  useEffect(() => {
    if (!hasDraft) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasDraft])

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
  const discardDraft = () => {
    setDecisions({})
    setSubjectIds({})
  }

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
      try {
        window.localStorage.removeItem(storageKey)
      } catch {
        // 임시 보관본 삭제 실패는 무시 (확정 뒤에는 복원하지 않는다)
      }
      setDecisions({})
      setSubjectIds({})
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
          <div className={styles.reviewBody} style={step === 'performance' ? { padding: 0 } : undefined}>
            {step === 'overview' && <OverviewStep view={view} onNext={() => go('subjects')} />}
            {step === 'subjects' && (
              <SubjectStep
                view={view}
                subjectIds={subjectIds}
                decisions={decisions}
                onSubjectId={(index, value) => setSubjectIds((previous) => ({ ...previous, [index]: value }))}
                onOpenSubject={(index) => {
                  setSelection({ subjectIndex: index, item: 'common' })
                  go('performance')
                }}
                onJump={jump}
              />
            )}
            {step === 'performance' && <PerformanceStep view={view} selection={selection} onSelect={setSelection} decisions={decisions} onDecide={decide} onJump={jump} readOnly={confirmed || !isPdf} />}
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
                    </strong>
                    {hasDraft ? (
                      <span data-testid="review-draft-status">
                        {' '}
                        · 이 브라우저에만 임시 보관{restored ? '(이어서 검토 중)' : ''} · 서버 저장은 확정할 때{' '}
                        <button type="button" className={styles.link} onClick={discardDraft} data-testid="review-draft-discard">
                          비우기
                        </button>
                      </span>
                    ) : (
                      ' · 확정 전까지 서버에 저장되지 않아요'
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
