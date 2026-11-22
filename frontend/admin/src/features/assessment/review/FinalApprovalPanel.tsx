import { useRef, useState } from 'react'
import { confirmPlanReview, confirmTeachingPlan, getPlanAnalysis } from '../api/assessmentAdminApi.ts'
import { toApiError } from '../api/canonicalSource.ts'
import type { EvaluationPlanAnalysisView } from '../api/types.ts'
import { Modal } from '../components/canonicalUi.ts'
import type { FinalApprovalPlan } from './finalApproval.ts'
import styles from './review.module.css'

// A28-05 원클릭 최종 승인(학교알리미 공식 수집 원본 · PDF·HWP·HWPX 공통).
// ① AI 분석 결과 요약 ② (필요하면) 앞 단계에서 수정 ③ '최종 승인' 한 번.
// 원본 파일 재선택·항목별 승인·원문 대조 체크 없음 — 서버가 보관 원본(SHA·Revision·학교알리미 출처)을 직접 검증하고,
// 권한·과목·근거 위치·학년·제외 과목 검사는 기존 확정과 같다. 실패하면 초안·이전 확정본은 그대로다.

const reasonText: Record<string, string> = {
  not_official_original: '학교알리미에서 수집한 원본이 아니에요(단계별 확정 필요)',
  official_source_mismatch: '학교알리미 원본 기록과 등록 문서가 달라요',
  stored_original_mismatch: '서버 보관 원본이 손상됐거나 바뀌었어요',
  original_missing: '서버에 원본이 없어요',
  grade_conflict: '원문상 이 문서 학년이 아닌 과목이 있어요',
  subject_excluded: '제외한 과목이 들어 있어요',
  unknown: '이 문서 슬롯의 학업 과목이 아니에요',
  re_review_not_started: "이미 확정된 문서예요. '확정 내용 수정'으로 시작해 주세요",
  teaching_plan_already_confirmed: '월별 운영계획이 이미 확정돼 있어요(새로고침)',
  no_teaching_plan: '이 분석 결과에 월별 운영계획이 없어요',
  stale: '분석 결과가 바뀌었어요(새로고침)',
  not_allowed: '함께 승인할 수 없는 요청이에요',
  conflict: '화면 정보가 오래됐어요(새로고침)',
}

const teachingStateText = {
  none: '분석 결과 없음 · 이번 승인에 포함 안 됨',
  loading: '확정 상태 확인 중',
  open: '이번 승인에 함께 확정',
  reopened: '재검토 — 새 확정본으로 함께 확정',
  confirmed: '이미 확정됨(이번 승인에서 제외)',
  error: '확정 상태를 불러오지 못함',
} as const

export function FinalApprovalPanel({
  view,
  plan,
  reopened,
  onGoSubjects,
  onConfirmed,
}: {
  view: EvaluationPlanAnalysisView
  plan: FinalApprovalPlan
  reopened: boolean
  onGoSubjects: () => void
  onConfirmed: (next: EvaluationPlanAnalysisView) => void
}) {
  const [asking, setAsking] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pendingRef = useRef(false)
  const slot = view.slot
  const items = view.subjects.reduce((sum, subject) => sum + (subject.performanceEvaluation?.items.length ?? 0), 0)
  const { counts } = plan

  const { byType } = plan
  const teachingOnly = Boolean(plan.teachingOnlyRequest)
  const sendsTeaching = teachingOnly || Boolean(plan.request?.teachingPlan)

  const approve = async () => {
    if ((!plan.request && !plan.teachingOnlyRequest) || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(null)
    try {
      let next: EvaluationPlanAnalysisView
      if (plan.request) {
        // 평가 정보(수행·지필) + 월별 운영계획을 한 요청 · 서버 한 Transaction 으로 확정(하나라도 거절되면 모두 0건)
        next = await confirmPlanReview(view.planId, view.documentRevisionId, plan.request)
      } else {
        // 평가 정보는 이미 확정 — 남은 월별 운영계획만 확정
        await confirmTeachingPlan(view.planId, view.documentRevisionId, plan.teachingOnlyRequest!)
        next = await getPlanAnalysis(view.planId, view.documentRevisionId)
      }
      setAsking(false)
      onConfirmed(next)
    } catch (cause) {
      const apiError = toApiError(cause)
      const reasons = Object.values(apiError.fieldReasons()).map((reason) => reasonText[reason] ?? reason)
      setError(`${apiError.message}${reasons.length ? ` (${[...new Set(reasons)].join(', ')})` : ''}`)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  return (
    <div data-testid="final-approval">
      <h3 className={styles.title}>{teachingOnly ? '월별 운영계획 최종 승인' : reopened ? '수정 내용 최종 승인' : '최종 승인'}</h3>
      {teachingOnly && (
        <p className={styles.lead} data-testid="final-approval-teaching-only">
          평가 정보(수행평가·지필평가)는 이미 확정돼 있어 다시 확정하지 않아요. 아래 월별 운영계획만 승인해 학생에게 공개해요.
        </p>
      )}
      <p className={styles.lead}>학교알리미에서 수집한 원본은 서버가 원본 지문(SHA-256)·개정본·출처를 직접 확인해요. 원본 파일을 다시 고를 필요가 없어요.</p>

      <dl className={styles.quizSummary} data-testid="final-approval-summary">
        <div>
          <dt>문서</dt>
          <dd>
            {slot ? `${slot.academicYear}학년도 고${slot.grade} ${slot.semester}학기 · ` : ''}
            {view.revisionFile?.fileName ?? '평가계획서'} · {view.revisionFile?.documentFormat ?? 'PDF'}
          </dd>
        </div>
        <div>
          <dt>분석</dt>
          <dd>
            과목 {view.subjects.length}개 · 수행평가 {items}개
          </dd>
        </div>
        <div>
          <dt>{teachingOnly ? '평가 정보(확정됨)' : '승인 대상'}</dt>
          <dd>
            {teachingOnly ? '이번에 다시 확정하지 않음 · 참고: ' : ''}
            <strong data-testid="final-approval-count">{counts.approved}</strong>개 (AI 기본 승인 {counts.defaulted} · 관리자 수정 {counts.edited} · 직접 확인 {counts.confirmed} · 원문에 없음 {counts.absent})
          </dd>
        </div>
        <div>
          <dt>유형별</dt>
          <dd data-testid="final-approval-by-type">
            <span data-testid="final-approval-performance">수행평가 승인 {byType.performance.approved} · 빠짐 {byType.performance.skipped}</span>
            {' / '}
            <span data-testid="final-approval-written">지필평가 승인 {byType.written.approved} · 빠짐 {byType.written.skipped}</span>
            {' / '}
            <span data-testid="final-approval-teaching" data-state={byType.teaching.state}>
              월별 운영계획 {byType.teaching.state === 'none' ? '분석 결과 없음(이번 승인에 포함 안 됨)' : `승인 ${byType.teaching.approved}행 · 제외 ${byType.teaching.excluded}행 · 빠짐 ${byType.teaching.skipped}행 (${teachingStateText[byType.teaching.state]})`}
            </span>
          </dd>
        </div>
        <div>
          <dt>확정에서 빠짐</dt>
          <dd data-testid="final-approval-skipped">
            근거·값 없음 {counts.skippedNoEvidence} · 과목 연결·학년 {counts.skippedSubject} · 제외 과목 {counts.excludedFields}
          </dd>
        </div>
        <div>
          <dt>과목 연결</dt>
          <dd>
            {Object.keys(plan.links).length}개 연결{plan.autoLinked.length ? ` (과목명이 같아 기본 연결 ${plan.autoLinked.length})` : ''}
            {plan.unlinkedSubjects.length ? ` · 연결 안 됨 ${plan.unlinkedSubjects.length}` : ''}
          </dd>
        </div>
      </dl>

      {plan.warnings.length > 0 && (
        <ul className={styles.approvalWarnings} data-testid="final-approval-warnings">
          {plan.warnings.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
      {plan.blockers.length > 0 && (
        <ul className={styles.bulkBlockers} data-testid="final-approval-blockers">
          {plan.blockers.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
      {error && (
        <div className={styles.note} data-tone="danger" role="alert" data-testid="final-approval-error">
          <div>
            <strong>승인하지 못했어요</strong> — {error} 검토 초안과 이전 확정본은 그대로예요.
          </div>
        </div>
      )}

      <div className={styles.approvalActions}>
        {plan.unlinkedSubjects.length > 0 && (
          <button type="button" className={styles.button} onClick={onGoSubjects}>
            과목 연결하기
          </button>
        )}
        <button type="button" className={styles.buttonPrimary} disabled={(!plan.request && !plan.teachingOnlyRequest) || pending} onClick={() => setAsking(true)} data-testid="final-approval-open">
          {teachingOnly ? '월별 운영계획 최종 승인' : '최종 승인'}
        </button>
      </div>

      {asking && (
        <Modal
          title={reopened ? '수정 내용을 최종 승인할까요?' : '최종 승인할까요?'}
          onRequestClose={() => !pending && setAsking(false)}
          footer={
            <>
              <button type="button" className={styles.buttonGhost} onClick={() => setAsking(false)} disabled={pending}>
                취소
              </button>
              <button type="button" className={styles.buttonPrimary} onClick={() => void approve()} disabled={pending} aria-busy={pending} data-testid="final-approval-submit">
                {pending ? '승인하는 중…' : '최종 승인'}
              </button>
            </>
          }
        >
          <p>
            {teachingOnly
              ? '평가 정보는 이미 확정돼 있어요. 남은 월별 운영계획을 최종 승인하고 학생에게 공개합니다.'
              : `AI 분석 결과(수행평가·지필평가${sendsTeaching ? '·월별 운영계획' : ''})를 한 번에 최종 승인하고 학생에게 공개합니다. 하나라도 실패하면 아무것도 확정되지 않아요. 승인 후에도 내용을 수정할 수 있습니다.`}
          </p>
          <p className={styles.muted} data-testid="final-approval-confirm-counts">
            {teachingOnly ? '' : `수행평가 ${byType.performance.approved}개 · 지필평가 ${byType.written.approved}개`}
            {sendsTeaching ? `${teachingOnly ? '' : ' · '}월별 운영계획 ${byType.teaching.approved}행(제외 ${byType.teaching.excluded}행)` : ''}
            {reopened ? ' · 새 확정본이 생기고 이전 확정본은 이력으로 남아요' : ''}.
          </p>
        </Modal>
      )}
    </div>
  )
}
