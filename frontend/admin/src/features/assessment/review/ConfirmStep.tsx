import { ReReviewPanel } from './ReReviewPanel.tsx'
import type { EvaluationPlanAnalysisView } from '../api/types.ts'
import { PlanReviewConfirmPanel } from '../components/PlanReviewConfirmPanel.tsx'
import { displayValue, fieldKey, fieldName, type Decision, type StepId } from './reviewModel.ts'
import styles from './review.module.css'

export type HashState = { status: 'none' } | { status: 'computing' } | { status: 'match' | 'mismatch'; hash: string; fileName: string } | { status: 'error'; message: string }

// 5단계 최종 검토·확정. 기존 확정 조건(원문 동일 확인 · 과목 연결 · 근거 쪽 · 부분 분석 확인 · 원문 대조 확인)을 그대로 두고 행 목록으로 보여 준다.
// 확정은 공통 평가정보 확인이지 학생 과제 승인·반려가 아니다. 확정한 값만 학생에게 공개된다.
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
  reopened = false,
  onReopen,
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
  /** A12 재검토 중 */
  reopened?: boolean
  onReopen?: () => Promise<unknown>
  onConfirmedStructured: (next: EvaluationPlanAnalysisView) => void
}) {
  const format = view.revisionFile?.documentFormat ?? 'PDF'
  if (view.reviewStatus === 'CONFIRMED' && !reopened) {
    return (
      <>
        <ConfirmedSummary view={view} />
        {format === 'PDF' && onReopen && <ReReviewPanel planId={view.planId} revisionId={view.documentRevisionId} onReopen={onReopen} reopened={reopened} />}
      </>
    )
  }

  if (format !== 'PDF') {
    // HWP·HWPX: 브라우저 미리보기가 없어 기존 구조 위치(구역·표·행·열) 대조 확정 흐름을 그대로 쓴다
    return (
      <div data-testid="review-step-confirm">
        <h3 className={styles.title}>최종 검토 및 확정</h3>
        <p className={styles.lead}>{format} 문서는 서비스 안 미리보기가 아직 없어, 한글 프로그램에서 원문 위치를 대조하는 기존 확정 절차를 사용해요.</p>
        <PlanReviewConfirmPanel key={`${view.analysisId ?? 'none'}-${view.reviewStatus}`} data={view} onConfirmed={onConfirmedStructured} />
      </div>
    )
  }

  const fields = (view.reviewFields ?? []).filter((field) => decisions[fieldKey(field)])
  const usedSubjects = [...new Set(fields.map((field) => field.subjectIndex))]
  const subjectsLinked = usedSubjects.length > 0 && usedSubjects.every((index) => (subjectIds[index] ?? '').trim() !== '')
  const total = view.reviewFields?.length ?? 0
  const step = (done: boolean, no: number) => (
    <span className={styles.checkNo} aria-hidden="true">
      {done ? '✓' : no}
    </span>
  )
  const partial = view.analysisStatus === 'PARTIAL'

  return (
    <div data-testid="review-step-confirm">
      <h3 className={styles.title}>최종 검토 및 확정</h3>
      <p className={styles.lead}>
        확인한 값 {fields.length}개를 확정해요. 확정한 값만 학생에게 공개되고, 확인하지 않은 {Math.max(0, total - fields.length)}개는 공개되지 않아요. 분석기 후보는 그대로 남아요.
      </p>

      <ol className={styles.checkList}>
        <li className={styles.checkRow} data-done={hash.status === 'match'}>
          {step(hash.status === 'match', 1)}
          <div className={styles.checkBody}>
            <strong>학교 원본이 등록 문서와 같은지 확인</strong>
            <p className={styles.muted}>파일은 서버로 보내지 않고 이 브라우저에서만 비교해요.</p>
            <input className={styles.fileInput} type="file" accept="application/pdf,.pdf" onChange={(event) => onPickFile(event.target.files?.[0])} data-testid="review-local-pdf" aria-label="학교 원본 PDF 고르기" />
            <p className={styles.statusText} data-tone={hash.status === 'mismatch' || hash.status === 'error' ? 'danger' : hash.status === 'match' ? undefined : 'neutral'} style={{ margin: '8px 0 0' }} data-testid="review-hash-status">
              {hash.status === 'none' && '원본 PDF를 골라 주세요.'}
              {hash.status === 'computing' && '확인 중…'}
              {hash.status === 'match' && `같은 파일이에요 · ${hash.fileName}`}
              {hash.status === 'mismatch' && `등록 문서와 다른 파일이에요 · ${hash.fileName}`}
              {hash.status === 'error' && `확인하지 못했어요 · ${hash.message}`}
            </p>
          </div>
        </li>

        <li className={styles.checkRow} data-done={subjectsLinked}>
          {step(subjectsLinked, 2)}
          <div className={styles.checkBody}>
            <strong>과목 연결</strong>
            <p className={styles.muted}>
              {usedSubjects.length === 0 ? '아직 확인한 과목이 없어요.' : usedSubjects.map((index) => `${view.subjects[index]?.subjectName ?? '과목'} → ${(subjectIds[index] ?? '').trim() || '미연결'}`).join(' · ')}
            </p>
            <button type="button" className={styles.link} style={{ marginTop: 6 }} onClick={() => onGo('subjects')}>
              과목 확인으로 가기
            </button>
          </div>
        </li>

        <li className={styles.checkRow} data-done={fields.length > 0}>
          {step(fields.length > 0, 3)}
          <div className={styles.checkBody}>
            <strong>확정할 값 {fields.length}개</strong>
            {fields.length === 0 ? (
              <p className={styles.muted}>수행평가 검토에서 &lsquo;확인&rsquo; 또는 &lsquo;수정&rsquo;으로 값을 골라 주세요.</p>
            ) : (
              <table className={styles.table} style={{ marginTop: 8 }} data-testid="review-confirm-values">
                <thead>
                  <tr>
                    <th scope="col">과목</th>
                    <th scope="col">항목</th>
                    <th scope="col">값</th>
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
                          {decision.kind === 'edited' && <span className={styles.tiny}> · 수정</span>}
                        </td>
                        <td>{decision.page ? `${decision.page}쪽` : <span className={styles.statusText} data-tone="danger">쪽 없음</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            <button type="button" className={styles.link} style={{ marginTop: 8 }} onClick={() => onGo('performance')}>
              수행평가 검토로 가기
            </button>
          </div>
        </li>

        {view.analysisStatus === 'PARTIAL' && (
          <li className={styles.checkRow} data-done={partialAcknowledged}>
            {step(partialAcknowledged, 4)}
            <label className={styles.checkBody} style={{ cursor: 'pointer' }}>
              <strong>일부만 분석된 결과임을 확인</strong>
              <span className={styles.muted} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input type="checkbox" checked={partialAcknowledged} onChange={(event) => onPartialAck(event.target.checked)} data-testid="review-partial-ack" style={{ marginTop: 5 }} />
                확인한 값만 확정하고, 분석되지 않은 과목·항목은 확정하지 않아요.
              </span>
            </label>
          </li>
        )}

        <li className={styles.checkRow} data-done={attested}>
          {step(attested, partial ? 5 : 4)}
          <label className={styles.checkBody} style={{ cursor: hash.status === 'match' ? 'pointer' : 'not-allowed' }}>
            <strong>원문과 직접 대조했어요</strong>
            <span className={styles.muted} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <input type="checkbox" checked={attested} disabled={hash.status !== 'match'} onChange={(event) => onAttest(event.target.checked)} data-testid="review-attest" style={{ marginTop: 5 }} />
              확인한 값을 원문 해당 쪽과 대조했고, 공통 평가정보로 확정합니다.
            </span>
          </label>
        </li>
      </ol>

      {blockers.length > 0 && (
        <div className={styles.note} data-testid="review-blockers">
          <div>
            <strong>확정 전에 남은 일</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18, color: 'var(--as-color-text-secondary)' }}>
              {blockers.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {error && (
        <div className={styles.note} data-tone="danger" role="alert" data-testid="review-error">
          <div>
            <strong>확정하지 못했어요</strong> — {error}
          </div>
        </div>
      )}
    </div>
  )
}

function ConfirmedSummary({ view }: { view: EvaluationPlanAnalysisView }) {
  const total = view.reviewFields?.length ?? 0
  const confirmed = view.confirmedFields.length
  return (
    <div data-testid="review-step-confirm">
      <div className={styles.done} data-testid="review-confirmed">
        <span className={styles.doneMark} aria-hidden="true">
          ✓
        </span>
        <h3 className={styles.title}>공통 평가정보를 확정했어요</h3>
        <p className={styles.muted}>
          확정값 {confirmed}개가 학생에게 공개돼요. 확인하지 않은 {Math.max(0, total - confirmed)}개 항목과 분석기 후보는 학생에게 보이지 않아요.
        </p>
      </div>
      <table className={styles.table} data-testid="confirmed-fields">
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
      <p className={styles.tiny} style={{ marginTop: 12 }}>
        이미 확정한 문서를 다시 확정하는 정책은 아직 정해지지 않아 이 화면에서 추가 확정하지 않아요.
      </p>
    </div>
  )
}
