import type { EvaluationPlanAnalysisView, PlanReviewDraftView } from '../api/types.ts'
import { InfoIcon } from '../components/canonicalUi.ts'
import { analysisStatusText, issuesOf, summaryOf } from './reviewModel.ts'
import type { approvalSummary } from './reviewFilter.ts'
import styles from './review.module.css'
import { devPanelEnabled } from '../../../../../student/src/features/assessment/dev/devContext.ts'
import { actorLabel } from '../model/actorLabel.ts'

// 1단계 분석 결과 확인: 서버 분석 결과에서 센 숫자만 보여 준다. 부분 분석은 회색 안내 한 칸 + '자세히'로 (큰 경고 상자 없음).
// 분석기 코드·버전·원문 지문은 '자세히' 안의 진단에만.
export function OverviewStep({
  view,
  draft,
  summary: approval,
  onNext,
}: {
  view: EvaluationPlanAnalysisView
  draft: PlanReviewDraftView | null
  /** A28-03 기본 승인 요약(확정 결과 보기에서는 null) */
  summary?: ReturnType<typeof approvalSummary> | null
  onNext: () => void
}) {
  const summary = summaryOf(view)
  const status = analysisStatusText[view.analysisStatus]
  const issues = issuesOf(view.warnings ?? [])
  const failed = view.analysisStatus === 'FAILED'
  const teachingRows = (view.teachingPlanCandidates ?? []).reduce((sum, subject) => sum + (subject.rows?.length ?? 0), 0)

  return (
    <div data-testid="review-step-overview">
      <h3 className={styles.title}>분석 결과 확인</h3>

      <dl className={styles.facts} aria-label="분석 결과">
        <div>
          <dt>인식한 과목</dt>
          <dd data-testid="summary-subjects">
            {summary.subjects}
            <small>개</small>
          </dd>
        </div>
        <div>
          <dt>수행평가</dt>
          <dd data-testid="summary-items">
            {summary.performanceItems}
            <small>개</small>
          </dd>
        </div>
        <div>
          <dt>전체 검토 대상</dt>
          <dd data-testid="summary-review-fields">
            {approval ? approval.total : summary.reviewFields}
            <small>개</small>
          </dd>
        </div>
        <div>
          <dt>월별 운영 계획</dt>
          {/* A28-36: 고정 '분석 대기' 대신 이 분석 결과의 운영계획 후보 행 수 */}
          <dd data-testid="summary-teaching-rows">
            {teachingRows}
            <small>행</small>
          </dd>
        </div>
      </dl>

      {approval && !failed && (
        <section className={styles.approvalSummary} aria-label="기본 승인 요약" data-testid="review-approval-summary">
          <p className={styles.approvalLead}>
            <strong data-testid="review-approval-target">승인 대상 {approval.approvalTarget}개</strong> · <span data-testid="review-approval-needs">확인 필요 {approval.needsReview}개</span>
          </p>
          <p className={styles.muted}>
            값과 원문 근거가 있는 AI 추출값은 기본으로 승인 대상이에요. 잘못된 값만 고치고 &lsquo;최종 승인&rsquo;을 한 번 누르면 확정돼요. 최종 승인 전에는 학생에게 공개되지 않아요.
          </p>
          <ul className={styles.approvalCounts}>
            <li>
              기본 승인 <strong>{approval.defaulted}</strong>
            </li>
            <li>
              관리자 수정 <strong>{approval.edited}</strong>
            </li>
            <li>
              직접 확인 <strong>{approval.confirmed}</strong>
            </li>
            <li>
              원문에 없음 <strong>{approval.absent}</strong>
            </li>
            <li data-attention={approval.needsReview > 0 || undefined}>
              확인 필요 <strong>{approval.needsReview}</strong>
            </li>
            <li>
              제외 과목 항목 <strong>{approval.excludedFields}</strong>
            </li>
          </ul>
        </section>
      )}

      <div className={styles.note} data-tone={failed ? 'danger' : undefined} role="status" data-testid="review-status-notice">
        <InfoIcon size={16} className={styles.noteIcon} />
        <div>
          <strong>{status.label}</strong> — {status.description}
          {summary.missingCandidates > 0 && <> 값을 읽지 못한 항목 {summary.missingCandidates}개는 원문에서 직접 확인해 주세요.</>}
          {(issues.length > 0 || view.analyzer) && (
            <details className={styles.more} data-testid="review-diagnostic">
              <summary>자세히{issues.length > 0 ? ` (${issues.length})` : ''}</summary>
              {issues.length > 0 && (
                <ul data-testid="review-issues">
                  {issues.map((issue, index) => (
                    <li key={index}>
                      {issue.title} <span className={styles.tiny}>· {issue.source}</span>
                    </li>
                  ))}
                </ul>
              )}
              <ul>
                <li>
                  상태 코드 <code>{view.analysisStatus}</code> · 검토 <code>{view.reviewStatus}</code>
                </li>
                {view.analyzer && (
                  <li>
                    분석기 <code>{view.analyzer.version}</code>
                    {view.receivedAt ? ` · ${view.receivedAt.slice(0, 16).replace('T', ' ')}` : ''}
                  </li>
                )}
                {issues.length > 0 && <li>원래 메시지: {issues.map((issue) => <code key={issue.diagnostic}>{issue.diagnostic} </code>)}</li>}
                {view.revisionFile?.checksum && (
                  <li>
                    원문 SHA-256 <code>{view.revisionFile.checksum}</code>
                  </li>
                )}
              </ul>
            </details>
          )}
        </div>
      </div>

      {draft?.draft && (
        <>
          <p className={styles.sectionLabel}>공유 검토 초안 · 학생 공개 아님</p>
          <p className={styles.muted} data-testid="review-draft-summary">
            {draft.draft.status === 'CLOSED' ? '확정되어 닫힌 초안' : `공유 초안 · 확인·수정 ${draft.draft.decisionCount}개 · 버전 ${draft.draft.version}.`}{devPanelEnabled() ? ` 처음 ${actorLabel(draft.draft.createdBy)}, 마지막 ${actorLabel(draft.draft.updatedBy)}.` : ''}
          </p>
          {draft.history.length > 0 && (
            <ul className={styles.rows} style={{ marginTop: 10 }} data-testid="review-draft-history">
              {draft.history.slice(0, 5).map((entry) => (
                <li key={entry.version} className={styles.row} style={{ minHeight: 44 }}>
                  <span className={styles.rowLabel}>{new Date(entry.savedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className={styles.rowValue} style={{ fontWeight: 500 }}>
                    {entry.savedBy} · {entry.changedCount}개 변경
                  </span>
                  <span className={styles.rowMeta}>버전 {entry.version}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div style={{ marginTop: 28 }}>
        {/* [10] A27-UX: [08]과 같은 중립 outline 버튼 */}
        <button type="button" className={styles.button} onClick={onNext} disabled={view.subjects.length === 0} data-testid="overview-start">
          과목 확인하기
        </button>
      </div>
    </div>
  )
}
