import type { EvaluationPlanAnalysisView } from '../api/types.ts'
import { PlanReviewConfirmPanel } from '../components/PlanReviewConfirmPanel.tsx'
import { displayValue, fieldKey, fieldName, type Decision, type StepId } from './reviewModel.ts'
import styles from './review.module.css'

export type HashState = { status: 'none' } | { status: 'computing' } | { status: 'match' | 'mismatch'; hash: string; fileName: string } | { status: 'error'; message: string }

// 5단계 최종 확정. 기존 확정 조건(원문 동일 확인 · 과목 연결 · 근거 쪽 · 원문 대조 확인 · 부분 분석 확인)을 체크리스트로 보여 준다.
// 확정은 공통 평가정보 확인이지 학생 과제 승인·반려가 아니다. 확정하면 확정값만 학생에게 공개된다.
export function ConfirmStep({
  view,
  decisions,
  subjectIds,
  hash,
  onPickFile,
  attested,
  onAttest,
  partialAcknowledged,
  onPartialAck,
  blockers,
  error,
  onGo,
  onConfirmedStructured,
}: {
  view: EvaluationPlanAnalysisView
  decisions: Record<string, Decision>
  subjectIds: Record<number, string>
  hash: HashState
  onPickFile: (file: File | undefined) => void
  attested: boolean
  onAttest: (value: boolean) => void
  partialAcknowledged: boolean
  onPartialAck: (value: boolean) => void
  blockers: string[]
  error: string | null
  onGo: (step: StepId) => void
  onConfirmedStructured: (next: EvaluationPlanAnalysisView) => void
}) {
  const format = view.revisionFile?.documentFormat ?? 'PDF'
  const confirmed = view.reviewStatus === 'CONFIRMED'

  if (confirmed) return <ConfirmedSummary view={view} />

  if (format !== 'PDF') {
    // HWP·HWPX: 브라우저 미리보기가 없어 기존 구조 위치(구역·표·행·열) 대조 확정 흐름을 그대로 쓴다
    return (
      <div data-testid="review-step-confirm">
        <h3 className={styles.stepTitle}>최종 확인 및 확정</h3>
        <p className={styles.stepLead}>{format} 문서는 서비스 안 미리보기가 아직 없어, 한글 프로그램에서 원문 위치를 대조하는 기존 확정 절차를 사용해요.</p>
        <PlanReviewConfirmPanel key={`${view.analysisId ?? 'none'}-${view.reviewStatus}`} data={view} onConfirmed={onConfirmedStructured} />
      </div>
    )
  }

  const fields = (view.reviewFields ?? []).filter((field) => decisions[fieldKey(field)])
  const usedSubjects = [...new Set(fields.map((field) => field.subjectIndex))]
  const subjectsLinked = usedSubjects.length > 0 && usedSubjects.every((index) => (subjectIds[index] ?? '').trim() !== '')
  const checksum = view.revisionFile?.checksum ?? ''

  return (
    <div data-testid="review-step-confirm">
      <h3 className={styles.stepTitle}>최종 확인 및 확정</h3>
      <p className={styles.stepLead}>아래 항목을 모두 마치면 확정할 수 있어요. 확정한 값만 학생에게 공개되고, 분석기 후보는 그대로 남아요.</p>

      <ol className={styles.checklist}>
        <li className={styles.checkItem} data-done={hash.status === 'match'}>
          <span className={styles.checkMark}>{hash.status === 'match' ? '✓' : '1'}</span>
          <div className={styles.checkBody}>
            <strong>갖고 있는 학교 원본이 등록 문서와 같은지 확인</strong>
            <p className={styles.muted}>파일은 서버로 보내지 않아요. 이 브라우저에서만 파일 지문을 계산해 비교해요.</p>
            <label className={styles.dropZone}>
              <input type="file" accept="application/pdf,.pdf" onChange={(event) => onPickFile(event.target.files?.[0])} data-testid="review-local-pdf" />
              <span data-testid="review-hash-status">
                {hash.status === 'none' && '원본 PDF를 골라 주세요.'}
                {hash.status === 'computing' && '확인 중…'}
                {hash.status === 'match' && `같은 파일이에요 (${hash.fileName})`}
                {hash.status === 'mismatch' && `등록 문서와 다른 파일이에요 (${hash.fileName}). 이 파일로는 확정할 수 없어요.`}
                {hash.status === 'error' && `확인하지 못했어요: ${hash.message}`}
              </span>
            </label>
            <details className={styles.diagnostic}>
              <summary>상세 진단 보기</summary>
              <p>
                등록 문서 SHA-256 <code>{checksum || '없음'}</code>
              </p>
              {(hash.status === 'match' || hash.status === 'mismatch') && (
                <p>
                  고른 파일 SHA-256 <code>{hash.hash}</code>
                </p>
              )}
            </details>
          </div>
        </li>

        <li className={styles.checkItem} data-done={subjectsLinked}>
          <span className={styles.checkMark}>{subjectsLinked ? '✓' : '2'}</span>
          <div className={styles.checkBody}>
            <strong>확정할 과목을 학업 과목과 연결</strong>
            <p className={styles.muted}>
              {usedSubjects.length === 0
                ? '아직 검토한 과목이 없어요.'
                : usedSubjects.map((index) => `${view.subjects[index]?.subjectName ?? '과목'} → ${(subjectIds[index] ?? '').trim() || '미연결'}`).join(' · ')}
            </p>
            <button type="button" className={styles.chipButton} style={{ marginTop: 8 }} onClick={() => onGo('subjects')}>
              과목 확인으로 가기
            </button>
          </div>
        </li>

        <li className={styles.checkItem} data-done={fields.length > 0}>
          <span className={styles.checkMark}>{fields.length > 0 ? '✓' : '3'}</span>
          <div className={styles.checkBody}>
            <strong>확정할 값 {fields.length}개</strong>
            {fields.length === 0 ? (
              <p className={styles.muted}>수행평가 검토에서 &lsquo;맞아요&rsquo; 또는 &lsquo;수정&rsquo;으로 값을 골라 주세요.</p>
            ) : (
              <table className={styles.valueTable} style={{ marginTop: 8 }} data-testid="review-confirm-values">
                <thead>
                  <tr>
                    <th scope="col">과목</th>
                    <th scope="col">항목</th>
                    <th scope="col">확정할 값</th>
                    <th scope="col">근거</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field) => {
                    const decision = decisions[fieldKey(field)]
                    return (
                      <tr key={fieldKey(field)}>
                        <td>{field.subjectName}</td>
                        <td>{fieldName(field, view)}</td>
                        <td>
                          {decision.kind === 'absent' ? '원문에 없음' : displayValue(decision.value, field.fieldPath)}
                          {decision.kind === 'edited' && <span className={styles.tiny}> (수정)</span>}
                        </td>
                        <td>{decision.page ? `${decision.page}쪽` : <span style={{ color: 'var(--as-color-danger)' }}>쪽 없음</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            <button type="button" className={styles.chipButton} style={{ marginTop: 8 }} onClick={() => onGo('performance')}>
              수행평가 검토로 가기
            </button>
          </div>
        </li>

        {view.analysisStatus === 'PARTIAL' && (
          <li className={styles.checkItem} data-done={partialAcknowledged}>
            <span className={styles.checkMark}>{partialAcknowledged ? '✓' : '!'}</span>
            <label className={styles.checkBody} style={{ cursor: 'pointer' }}>
              <strong>일부만 분석된 결과임을 확인</strong>
              <span className={styles.muted} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input type="checkbox" checked={partialAcknowledged} onChange={(event) => onPartialAck(event.target.checked)} data-testid="review-partial-ack" />
                고른 값만 원문과 대조해 확정하고, 분석되지 않은 과목·항목은 확정하지 않아요.
              </span>
            </label>
          </li>
        )}

        <li className={styles.checkItem} data-done={attested}>
          <span className={styles.checkMark}>{attested ? '✓' : '4'}</span>
          <label className={styles.checkBody} style={{ cursor: hash.status === 'match' ? 'pointer' : 'not-allowed' }}>
            <strong>원문과 직접 대조했어요</strong>
            <span className={styles.muted} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input type="checkbox" checked={attested} disabled={hash.status !== 'match'} onChange={(event) => onAttest(event.target.checked)} data-testid="review-attest" />
              고른 값을 원문 해당 쪽과 대조했고, 공통 평가정보로 확정합니다.
            </span>
          </label>
        </li>
      </ol>

      {blockers.length > 0 && (
        <div className={styles.blockers} data-testid="review-blockers">
          <strong style={{ color: 'var(--as-color-text)' }}>확정 전에 남은 일</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {blockers.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <div className={styles.notice} data-tone="danger" role="alert" style={{ marginTop: 14 }} data-testid="review-error">
          <div>
            <strong>확정하지 못했어요</strong>
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function ConfirmedSummary({ view }: { view: EvaluationPlanAnalysisView }) {
  return (
    <div data-testid="review-step-confirm">
      <div className={styles.card}>
        <div className={styles.done} data-testid="review-confirmed">
          <span className={styles.doneIcon} aria-hidden="true">
            ✓
          </span>
          <h3 className={styles.stepTitle}>공통 평가정보를 확정했어요</h3>
          <p className={styles.muted}>학생에게는 아래 확정값만 공개돼요. 분석기 후보는 바뀌지 않고 그대로 남아 있어요.</p>
        </div>
        <table className={styles.valueTable} data-testid="confirmed-fields">
          <thead>
            <tr>
              <th scope="col">과목 코드</th>
              <th scope="col">항목</th>
              <th scope="col">확정값</th>
              <th scope="col">근거</th>
            </tr>
          </thead>
          <tbody>
            {view.confirmedFields.map((field) => {
              const candidate = (view.reviewFields ?? []).find((item) => item.fieldPath === field.fieldPath)
              return (
                <tr key={`${field.subjectId ?? field.subjectName}-${field.fieldPath}`}>
                  <td>{field.subjectId ?? field.subjectName}</td>
                  <td>{candidate ? fieldName(candidate, view) : field.fieldPath}</td>
                  <td>{field.value === null ? '원문에 없음(확인)' : displayValue(field.value, field.fieldPath)}</td>
                  <td>{field.pdfPageNumber ? `${field.pdfPageNumber}쪽` : field.documentLocatorText ?? '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className={styles.tiny} style={{ marginTop: 10 }}>
          이미 확정한 문서를 다시 확정하는 정책은 아직 정해지지 않아 이 화면에서 추가 확정하지 않아요.
        </p>
      </div>
    </div>
  )
}
