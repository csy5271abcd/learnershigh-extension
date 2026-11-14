import type { EvaluationPlanAnalysisView } from '../api/types.ts'
import { analysisStatusText, issuesOf, summaryOf } from './reviewModel.ts'
import styles from './review.module.css'

// 1단계 분석 요약: 서버가 준 분석 결과에서 센 숫자만 보여 준다. 분석기 코드·버전·원문 지문은 '상세 진단'에만.
export function OverviewStep({ view, onNext }: { view: EvaluationPlanAnalysisView; onNext: () => void }) {
  const summary = summaryOf(view)
  const status = analysisStatusText[view.analysisStatus]
  const issues = issuesOf(view.warnings ?? [])
  const partial = view.analysisStatus === 'PARTIAL'
  const confirmed = view.reviewStatus === 'CONFIRMED'

  return (
    <div data-testid="review-step-overview">
      <h3 className={styles.stepTitle}>분석 결과 요약</h3>
      <p className={styles.stepLead}>분석기가 읽어 낸 내용을 먼저 훑어보고, 과목 확인 → 수행평가 검토 → 최종 확정 순서로 진행해요. 언제든 이전 단계로 돌아갈 수 있어요.</p>

      {confirmed ? (
        <div className={styles.notice} data-tone="success" role="status">
          <div>
            <strong>관리자 확정이 끝난 문서예요</strong>
            <p>확정한 값만 학생에게 공개돼요. 분석기 후보는 바뀌지 않고 그대로 남아 있어요.</p>
          </div>
        </div>
      ) : (
        <div className={styles.notice} data-tone={view.analysisStatus === 'FAILED' ? 'danger' : partial ? undefined : 'info'} role="status" data-testid="review-status-notice">
          <div>
            <strong>{status.label}</strong>
            <p>{status.description}</p>
            {partial && <p style={{ marginTop: 4 }}>목록에 없는 과목·항목은 &lsquo;원문에 없음&rsquo;이 아니라 &lsquo;분석되지 않음&rsquo;이에요.</p>}
          </div>
        </div>
      )}

      <dl className={styles.statGrid} aria-label="분석 결과 숫자">
        <div className={styles.stat}>
          <dt>인식한 과목</dt>
          <dd data-testid="summary-subjects">
            {summary.subjects}
            <small>개</small>
          </dd>
        </div>
        <div className={styles.stat}>
          <dt>추출한 수행평가</dt>
          <dd data-testid="summary-items">
            {summary.performanceItems}
            <small>개</small>
          </dd>
        </div>
        <div className={styles.stat}>
          <dt>확인할 항목</dt>
          <dd>
            {summary.reviewFields}
            <small>개</small>
          </dd>
        </div>
        <div className={styles.stat}>
          <dt>값을 못 읽은 항목</dt>
          <dd>
            {summary.missingCandidates}
            <small>개</small>
          </dd>
        </div>
        <div className={styles.stat}>
          <dt>월별 운영 계획</dt>
          <dd style={{ fontSize: 15, marginTop: 10 }}>분석 대기</dd>
        </div>
      </dl>

      <section className={styles.card} aria-label="확인이 필요한 내용">
        <h4 className={styles.cardTitle}>확인이 필요한 내용 {issues.length > 0 && <span className={styles.pill}>{issues.length}</span>}</h4>
        {issues.length === 0 ? (
          <p className={styles.muted}>분석기와 서버가 알린 문제가 없어요. 그래도 원문과 대조한 값만 확정해 주세요.</p>
        ) : (
          <ul className={styles.issueList} data-testid="review-issues">
            {issues.map((issue, index) => (
              <li key={index} className={styles.issue} data-tone={issue.tone}>
                <span className={styles.issueDot} aria-hidden="true" />
                <span>
                  {issue.title}
                  <span className={styles.tiny} style={{ display: 'block' }}>
                    {issue.source}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <details className={styles.diagnostic} data-testid="review-diagnostic">
          <summary>상세 진단 보기</summary>
          <p>
            분석 상태 코드 <code>{view.analysisStatus}</code> · 검토 상태 <code>{view.reviewStatus}</code>
          </p>
          {view.analyzer && (
            <p>
              분석기 <code>{view.analyzer.name}</code> <code>{view.analyzer.version}</code> (<code>{view.analyzer.origin}</code>)
              {view.receivedAt ? ` · 수신 ${view.receivedAt.slice(0, 16).replace('T', ' ')}` : ''}
            </p>
          )}
          <p>
            문서 개정본 <code>{view.documentRevisionId}</code> · 분석 결과 <code>{view.analysisId ?? '없음'}</code>
          </p>
          {view.revisionFile?.checksum && (
            <p>
              원문 SHA-256 <code>{view.revisionFile.checksum}</code>
            </p>
          )}
          {issues.length > 0 && (
            <p>
              원래 메시지: {issues.map((issue) => <code key={issue.diagnostic}>{issue.diagnostic} </code>)}
            </p>
          )}
        </details>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" className={styles.cta} onClick={onNext} disabled={view.subjects.length === 0} data-testid="overview-start">
          과목 확인 시작
        </button>
      </div>
    </div>
  )
}
