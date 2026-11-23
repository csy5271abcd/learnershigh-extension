import { useRef, useState } from 'react'
import { getTeachingPlanReview, reopenPlanReviewDraft, reopenTeachingPlanDraft, requestPlanAnalysis } from '../api/assessmentAdminApi.ts'
import type { AdminEvaluationPlan, AdminEvaluationPlanRevision } from '../api/types.ts'
import { FileIcon, Modal } from '../components/canonicalUi.ts'
import { analysisFailureText } from '../model/analysisFailure.ts'
import { toApiError } from '../api/canonicalSource.ts'
import { navigate } from '../../../app/adminLocation.ts'
import review from '../review/review.module.css'
import { paths } from './paths.ts'
import { reanalyzeNext } from './reanalyzeNext.ts'

// A28-29: 분석 결과가 있는 문서(확정 문서 포함)를 '다시 분석'한다. 서버(§39 POST …/analysis)는 그 개정본의 보관 원본으로만 분석해
// 새 분석 결과(후보)를 저장하고, 확정 기록·확정값·학생 공개는 바꾸지 않는다. 같은 결과면 새 결과 없이 기존 결과를 돌려준다.
// 끝나면 운영계획 후보 수를 보여 주고 검토 화면으로 이어 준다(확정 문서는 '월별 운영계획 최종 승인'이 그 화면 마지막 단계).
// A28-36: '검토하기' 하나로 검토 화면 최종 확정 단계에 간다. 확정 문서인데 새 분석 결과가 나왔으면 재검토를 먼저 연다
//   (평가 정보·운영계획 초안을 새 분석으로 — 학생 공개는 '최종 승인' 전까지 그대로). 결과가 같고 승인할 운영계획도 없으면 '닫기'만.

/** 재검토가 이미 열려 있으면(409 draft: already_open) 그대로 이어 검토한다 — 다른 오류는 알린다 */
function alreadyOpenIsFine(cause: unknown): void {
  if (toApiError(cause).fieldReasons().draft !== 'already_open') throw cause
}

type Phase =
  | { kind: 'ask' }
  | { kind: 'running' }
  | { kind: 'done'; changed: boolean; candidates: number | null; teachingConfirmed: boolean }
  | { kind: 'error'; message: string }

export function ReanalyzeDialog({
  plan,
  revision,
  onClose,
  onFinished,
}: {
  plan: AdminEvaluationPlan
  revision: AdminEvaluationPlanRevision
  onClose: () => void
  /** 분석이 끝나 서버 상태가 바뀌었을 수 있을 때(목록·결과 다시 읽기) */
  onFinished: () => void
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'ask' })
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmed = revision.reviewStatus === 'CONFIRMED'
  const running = phase.kind === 'running'

  const submit = async () => {
    setPhase({ kind: 'running' })
    const before = await getTeachingPlanReview(plan.planId, revision.documentRevisionId).catch(() => null)
    try {
      await requestPlanAnalysis(plan.planId, revision.documentRevisionId)
    } catch (cause) {
      setPhase({ kind: 'error', message: analysisFailureText(cause as Error) })
      return
    }
    const after = await getTeachingPlanReview(plan.planId, revision.documentRevisionId).catch(() => null)
    onFinished()
    setPhase({
      kind: 'done',
      changed: !before || !after || before.latestAnalysisId !== after.latestAnalysisId,
      candidates: after ? after.candidateRowCount : null,
      teachingConfirmed: Boolean(after?.review),
    })
  }

  const [opening, setOpening] = useState<string | null>(null)
  const next = phase.kind === 'done' ? reanalyzeNext({ confirmed, changed: phase.changed, teachingConfirmed: phase.teachingConfirmed, candidates: phase.candidates }) : null
  const nothingToApprove = next?.kind === 'close'
  const openReview = async () => {
    if (!next || next.kind === 'close' || opening === '') return
    setOpening('')
    try {
      if (next.kind === 'reopen') {
        // 재검토 시작(이미 열려 있으면 그대로) — 확정값·학생 화면은 바뀌지 않는다
        await reopenPlanReviewDraft(plan.planId, revision.documentRevisionId).catch(alreadyOpenIsFine)
        if (next.teaching) await reopenTeachingPlanDraft(plan.planId, revision.documentRevisionId).catch(alreadyOpenIsFine)
      }
      navigate(paths.planReviewFinal(plan.planId, revision.documentRevisionId))
    } catch (cause) {
      setOpening((cause as Error).message || '재검토를 시작하지 못했어요.')
    }
  }

  return (
    <Modal
      compact
      title={phase.kind === 'done' ? '다시 분석했어요' : '다시 분석할까요?'}
      initialFocusRef={cancelRef}
      onRequestClose={() => !running && onClose()}
      footer={
        phase.kind === 'done' ? (
          <>
            <button ref={cancelRef} type="button" className={review.buttonGhost} onClick={onClose}>
              닫기
            </button>
            {!nothingToApprove && (
              <button type="button" className={review.buttonDark} onClick={() => void openReview()} disabled={opening === ''} aria-busy={opening === ''} data-testid="reanalyze-open-review">
                검토하기
              </button>
            )}
          </>
        ) : (
          <>
            <button ref={cancelRef} type="button" className={review.buttonGhost} onClick={onClose} disabled={running}>
              취소
            </button>
            <button type="button" className={review.buttonDark} onClick={() => void submit()} disabled={running} aria-busy={running} data-testid="reanalyze-confirm">
              {running ? '분석 중…' : phase.kind === 'error' ? '다시 시도' : '다시 분석'}
            </button>
          </>
        )
      }
    >
      <div className={review.deleteBody} data-testid="reanalyze-dialog" data-phase={phase.kind}>
        <div className={review.deleteFile}>
          <FileIcon size={18} />
          <div>
            <strong title={revision.fileName}>{revision.fileName}</strong>
            <span>
              {plan.academicYear}학년도 · 고{plan.grade} · {plan.semester}학기 · v{revision.revisionNumber}
            </span>
          </div>
        </div>
        {phase.kind === 'done' ? (
          <ul className={review.deleteNotes} data-testid="reanalyze-result">
            <li>{phase.changed ? '새 분석 결과' : '이전 분석과 같은 결과'}</li>
            <li data-testid="reanalyze-candidates">
              월별 운영계획 후보 {phase.candidates === null ? '확인 못 함' : `${phase.candidates}행`}
              {phase.teachingConfirmed ? ' · 확정된 운영계획 있음' : ''}
            </li>
            <li>{nothingToApprove ? '승인할 변경 없음 · 확정 내용 그대로' : '최종 승인 전까지 학생 화면 그대로'}</li>
          </ul>
        ) : (
          <ul className={review.deleteNotes}>
            <li>새 분석 결과를 생성합니다. 기존 확정 내용은 변경되지 않습니다.</li>
            <li>최대 2분</li>
          </ul>
        )}
        {opening && (
          <p className={review.deleteError} role="alert" data-testid="reanalyze-open-error">
            {opening}
          </p>
        )}
        {phase.kind === 'error' && (
          <p className={review.deleteError} role="alert" data-testid="reanalyze-error">
            {phase.message} 이전 분석·확정 결과는 그대로예요.
          </p>
        )}
      </div>
    </Modal>
  )
}
