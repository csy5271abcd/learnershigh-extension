import type { EvaluationPlanAnalysisView, PlanReviewDraftView } from '../api/types.ts'
import { InfoIcon } from '../components/canonicalUi.ts'
import { analysisStatusText, issuesOf, summaryOf } from './reviewModel.ts'
import styles from './review.module.css'

// 1단계 분석 결과 확인: 서버 분석 결과에서 센 숫자만 보여 준다. 부분 분석은 회색 안내 한 칸 + '자세히'로 (큰 경고 상자 없음).
// 분석기 코드·버전·원문 지문은 '자세히' 안의 진단에만.
export function OverviewStep({ view, draft, onNext }: { view: EvaluationPlanAnalysisView; draft: PlanReviewDraftView | null; onNext: () => void }) {
  const summary = summaryOf(view)
  const status = analysisStatusText[view.analysisStatus]
  const issues = issuesOf(view.warnings ?? [])
  const failed = view.analysisStatus === 'FAILED'

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
          <dt>확인할 항목</dt>
          <dd>
            {summary.reviewFields}
            <small>개</small>
          </dd>
        </div>
        <div>
          <dt>월별 운영 계획</dt>
          <dd style={{ fontSize: 16, paddingTop: 8 }}>분석 대기</dd>
        </div>
      </dl>

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
            {draft.draft.status === 'CLOSED' ? '확정되어 닫힌 초안이에요.' : `관리자들이 함께 쓰는 초안이에요. 확인·수정 ${draft.draft.decisionCount}개 · 버전 ${draft.draft.version}.`} 처음 {draft.draft.createdBy}, 마지막 {draft.draft.updatedBy}.
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
        <button type="button" className={styles.buttonDark} onClick={onNext} disabled={view.subjects.length === 0} data-testid="overview-start">
          과목 확인하기
        </button>
      </div>
    </div>
  )
}
