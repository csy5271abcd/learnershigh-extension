import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatMonthDay } from '../model/format.ts'
import {
  conflictSummary,
  finalItems,
  initialDraft,
  isValidDate,
  planApplySteps,
  reachableStep,
  stepIndex,
  toApplyRequest,
  toPreviewRequest,
  unresolvedConflictCount,
  type PlanApplyDraft,
  type PlanApplyStep,
} from '../model/planApply.ts'
import type {
  ExistingLibraryItemView,
  MentorPlanDetail,
  MentorPlanWeek,
  PlanApplyPreviewRequest,
  PlanApplyPreviewResult,
  PlanApplyRequest,
  PlanApplyResult,
} from '../model/types.ts'
import styles from './MentorPlanApplyDialog.module.css'
import { PlanApplyStepper } from './PlanApplyStepper.tsx'
import { ConflictsStep, ItemsStep, LibraryStep, ReviewStep, StartDateStep } from './PlanApplySteps.tsx'

interface MentorPlanApplyDialogProps {
  plan: MentorPlanDetail
  /** 적용할 주차 (Plan Detail에서 선택한 주차, Mockup 부제 "· 4주차") */
  week: MentorPlanWeek
  /** 현재 단계는 호출 측(Route, URL ?step=)이 소유한다. */
  step: PlanApplyStep
  onStepChange: (step: PlanApplyStep) => void
  onClose: () => void
  onGoToPlanList: () => void
  /** Frontend 검증용 표시 목록 (기존 LearnersHigh Library API 아님) */
  libraryItems: ExistingLibraryItemView[]
  /** Data Source Boundary. 현재는 Fixture Service, API 연결 시 plan-apply-preview / apply-plan Client. */
  preview: (contentId: string, request: PlanApplyPreviewRequest) => Promise<PlanApplyPreviewResult>
  apply: (contentId: string, request: PlanApplyRequest) => Promise<PlanApplyResult>
}

type PreviewState =
  | { key: string; status: 'loading' }
  | { key: string; status: 'success'; data: PlanApplyPreviewResult }
  | { key: string; status: 'error' }

type SubmitState =
  | { status: 'idle' | 'submitting' | 'error' }
  | { status: 'success'; result: PlanApplyResult; startDate: string }

const stepTitle: Record<PlanApplyStep, string> = {
  'start-date': '언제부터 적용할까요?',
  items: '가져올 항목을 골라주세요',
  library: '내 교재와 연결해요',
  conflicts: '기존 일정과 겹치는지 확인했어요',
  review: '이렇게 추가할게요',
}

// 내 계획에 적용 Modal (Plan-02 ~ 04 Mockup). Native <dialog>의 showModal()로 배경 조작 차단 / ESC / Focus 이동을 처리한다.
// 입력 내용은 이 화면 안에서만 유지하고 저장하지 않는다. (실제 Student Plan에 쓰지 않음)
export function MentorPlanApplyDialog({
  plan,
  week,
  step: requestedStep,
  onStepChange,
  onClose,
  onGoToPlanList,
  libraryItems,
  preview: loadPreview,
  apply,
}: MentorPlanApplyDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [draft, setDraft] = useState<PlanApplyDraft>(() => initialDraft(week.items))
  const [previewState, setPreviewState] = useState<PreviewState | null>(null)
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' })
  // 같은 순간의 중복 클릭도 막는다. (상태 갱신 전 두 번째 클릭 방지)
  const submittingRef = useRef(false)

  const request = toPreviewRequest(draft, week.items)
  const requestKey = JSON.stringify(request)
  const previewReady = previewState?.key === requestKey && previewState.status === 'success' ? previewState.data : null
  const step = reachableStep(requestedStep, draft, previewReady !== null)
  const needsPreview = step === 'conflicts' || step === 'review'

  // 입력이 바뀐 뒤 충돌 단계에 들어오면 렌더링 중에 다시 불러오기 상태로 바꾼다. (Effect 안의 동기 setState를 피한다)
  if (needsPreview && previewState?.key !== requestKey) {
    setPreviewState({ key: requestKey, status: 'loading' })
  }

  useEffect(() => {
    if (previewState?.status !== 'loading') return
    let active = true
    const { key } = previewState
    loadPreview(plan.contentId, JSON.parse(key) as PlanApplyPreviewRequest).then(
      (data) => active && setPreviewState({ key, status: 'success', data }),
      () => active && setPreviewState({ key, status: 'error' }),
    )
    return () => {
      active = false
    }
  }, [previewState, loadPreview, plan.contentId])

  // 새로고침 등으로 앞 단계 입력이 비어 있으면 주소의 단계도 실제 단계로 맞춘다.
  useEffect(() => {
    if (step !== requestedStep) onStepChange(step)
  }, [step, requestedStep, onStepChange])

  // 열기: 배경 조작 차단 + 스크롤 잠금. 닫히면 열기 전 Focus(내 계획에 적용 버튼)로 돌아간다.
  useEffect(() => {
    const dialog = dialogRef.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    dialog?.showModal()
    root.style.overflow = 'hidden'
    return () => {
      if (dialog?.open) dialog.close()
      root.style.overflow = previousOverflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])

  const isSuccess = submit.status === 'success'

  // 단계가 바뀌면 단계 제목으로 Focus를 옮겨 Screen Reader가 새 단계를 읽게 한다.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [step, isSuccess])

  const index = stepIndex(step)
  const goTo = (next: PlanApplyStep) => onStepChange(next)
  const sourceLabel = `${plan.mentor.name} · ${plan.title}`
  const subtitle = `${sourceLabel} · ${week.week}주차`

  const submitApply = () => {
    if (!previewReady || submittingRef.current) return
    submittingRef.current = true
    const applyRequest = toApplyRequest(draft, week.items, previewReady)
    setSubmit({ status: 'submitting' })
    apply(plan.contentId, applyRequest)
      .then(
        (result) => setSubmit({ status: 'success', result, startDate: applyRequest.startDate }),
        () => setSubmit({ status: 'error' }),
      )
      .finally(() => {
        submittingRef.current = false
      })
  }

  // ---------- 단계별 본문 / 안내 / 다음 가능 여부 ----------
  let body: ReactNode
  let lead: { tone: 'neutral' | 'negative'; text: string } | undefined
  let blockedReason: string | undefined

  switch (step) {
    case 'start-date':
      body = <StartDateStep draft={draft} onDraftChange={setDraft} weekLabel={`${week.week}주차`} />
      if (!draft.startDate) blockedReason = '시작일을 골라주세요.'
      else if (!isValidDate(draft.startDate)) blockedReason = '올바른 날짜를 입력해 주세요.'
      break
    case 'items':
      body = <ItemsStep draft={draft} onDraftChange={setDraft} items={week.items} />
      lead = { tone: 'neutral', text: `${week.week}주차 계획 중 내 주간계획에 넣을 항목만 골라요.` }
      if (draft.selectedItemIds.length === 0) blockedReason = '1개 이상 골라주세요.'
      break
    case 'library':
      body = <LibraryStep draft={draft} onDraftChange={setDraft} items={week.items} libraryItems={libraryItems} />
      lead = { tone: 'neutral', text: '연결하지 않아도 추가할 수 있어요. 연결한 교재는 계획 항목에 함께 표시돼요.' }
      break
    case 'conflicts':
      if (previewReady) {
        body = <ConflictsStep draft={draft} onDraftChange={setDraft} items={week.items} preview={previewReady} />
        lead = conflictSummary(previewReady, draft)
        if (unresolvedConflictCount(previewReady, draft) > 0) blockedReason = lead.text
      } else if (previewState?.status === 'error') {
        body = (
          <div className={styles.inlineError} role="alert">
            <p>기존 일정과 비교하지 못했어요.</p>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setPreviewState({ key: requestKey, status: 'loading' })}
            >
              다시 시도
            </button>
          </div>
        )
        blockedReason = '기존 일정과 비교한 뒤 다음으로 갈 수 있어요.'
      } else {
        body = (
          <p className={styles.notice} role="status">
            기존 일정과 비교하는 중이에요.
          </p>
        )
        blockedReason = '기존 일정과 비교하는 중이에요.'
      }
      break
    case 'review':
      if (previewReady) {
        body = (
          <ReviewStep
            draft={draft}
            items={week.items}
            libraryItems={libraryItems}
            preview={previewReady}
            sourceLabel={sourceLabel}
          />
        )
        lead = { tone: 'neutral', text: `${formatMonthDay(draft.startDate)}부터 내 주간계획에 들어가요.` }
        if (finalItems(previewReady, draft).length === 0) blockedReason = '추가할 항목이 없어요.'
      }
      break
  }

  const nextStep = planApplySteps[index + 1]?.id
  // 충돌 단계는 본문 안내(빨간 문구)가 곧 진행할 수 없는 이유다. 그 외 단계는 Footer에 이유를 보여준다.
  const reasonInLead = step === 'conflicts' && previewReady !== null
  const blockedId = reasonInLead ? 'plan-apply-lead' : 'plan-apply-blocked-reason'

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="plan-apply-title"
      aria-describedby="plan-apply-subtitle"
      onCancel={(event) => {
        // ESC: 아직 저장된 것이 없으므로 확인 없이 닫는다.
        event.preventDefault()
        onClose()
      }}
    >
      <div className={styles.surface}>
        <header className={styles.header}>
          <div>
            <h2 id="plan-apply-title" className={styles.title}>
              내 계획에 적용
            </h2>
            <p id="plan-apply-subtitle" className={styles.subtitle}>
              {subtitle}
            </p>
          </div>
          <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className={styles.body}>
          {isSuccess ? (
            <section className={styles.success} aria-labelledby="plan-apply-step-title">
              <h3 id="plan-apply-step-title" ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
                내 주간계획에 추가했어요
              </h3>
              <p className={styles.lead}>
                {formatMonthDay(submit.startDate)}부터 {submit.result.createdPlanItemIds.length}개 항목이 들어가요.
              </p>
              <p className={styles.sourceNotice}>
                출처({sourceLabel})가 함께 저장됐어요. Mentor가 나중에 Plan을 고쳐도 지금 추가한 계획은 바뀌지 않아요.
              </p>
            </section>
          ) : (
            <>
              <PlanApplyStepper current={step} />
              <section className={styles.stepSection} aria-labelledby="plan-apply-step-title">
                <h3 id="plan-apply-step-title" ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
                  <span className="lh-visually-hidden">
                    {planApplySteps.length}단계 중 {index + 1}단계, {planApplySteps[index].label}:{' '}
                  </span>
                  {stepTitle[step]}
                </h3>
                {lead && (
                  <p id="plan-apply-lead" className={styles.lead} data-tone={lead.tone}>
                    {lead.text}
                  </p>
                )}
                {body}
              </section>
            </>
          )}
        </div>

        <footer className={styles.footer}>
          {submit.status === 'error' && (
            <p className={styles.submitError} role="alert">
              내 주간계획에 추가하지 못했어요. 고른 내용은 그대로 있어요. 다시 시도해 주세요.
            </p>
          )}
          {blockedReason && !isSuccess && !reasonInLead && (
            <p id={blockedId} className={styles.blocked}>
              {blockedReason}
            </p>
          )}
          <div className={styles.actions}>
            {isSuccess ? (
              <>
                <button type="button" className={styles.secondaryButton} onClick={onGoToPlanList}>
                  Plan 목록 보기
                </button>
                <button type="button" className={styles.primaryButton} onClick={onClose}>
                  확인
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={submit.status === 'submitting'}
                  onClick={() => (index === 0 ? onClose() : goTo(planApplySteps[index - 1].id))}
                >
                  {index === 0 ? '취소' : '이전'}
                </button>
                {step === 'review' ? (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={Boolean(blockedReason) || submit.status === 'submitting'}
                    aria-describedby={blockedReason ? blockedId : undefined}
                    onClick={submitApply}
                  >
                    {submit.status === 'submitting'
                      ? '추가하는 중…'
                      : submit.status === 'error'
                        ? '다시 시도'
                        : '내 주간계획에 추가'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={Boolean(blockedReason)}
                    aria-describedby={blockedReason ? blockedId : undefined}
                    onClick={() => nextStep && goTo(nextStep)}
                  >
                    다음
                  </button>
                )}
              </>
            )}
          </div>
        </footer>
      </div>
    </dialog>
  )
}
