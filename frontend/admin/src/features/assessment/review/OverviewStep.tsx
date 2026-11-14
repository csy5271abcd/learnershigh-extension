import type { EvaluationPlanAnalysisView } from '../api/types.ts'
import { InfoIcon } from '../components/canonicalUi.ts'
import { analysisStatusText, issuesOf, summaryOf } from './reviewModel.ts'
import styles from './review.module.css'

// 1단계 분석 결과 확인: 서버 분석 결과에서 센 숫자만 보여 준다. 부분 분석은 회색 안내 한 칸 + '자세히'로 (큰 경고 상자 없음).
// 분석기 코드·버전·원문 지문은 '자세히' 안의 진단에만.
export function OverviewStep({ view, onNext }: { view: EvaluationPlanAnalysisView; onNext: () => void }) {
  const summary = summaryOf(view)
  const status = analysisStatusText[view.analysisStatus]
  const issues = issuesOf(view.warnings ?? [])
  const failed = view.analysisStatus === 'FAILED'

  return (
    <div data-testid="review-step-overview">
      <h3 className={styles.title}>분석 결과 확인</h3>
      <p className={styles.lead}>분석기가 읽은 내용을 확인하고 과목 → 수행평가 순서로 원문과 대조해요. 언제든 앞 단계로 돌아갈 수 있어요.</p>

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

      <div style={{ marginTop: 28 }}>
        <button type="button" className={styles.buttonDark} onClick={onNext} disabled={view.subjects.length === 0} data-testid="overview-start">
          과목 확인하기
        </button>
      </div>
    </div>
  )
}
