import { useState } from 'react'
import { getPlanAnalysis, isAdminMockDataSource, savePlanReview } from '../api/assessmentAdminApi.ts'
import type { AdminEvaluationPlanRevision, AnalysisSubject, EvaluationPlanAnalysisView } from '../api/types.ts'
import { DetailHead, RemoteView } from '../components/AdminParts.tsx'
import { PlanOriginalViewer } from '../components/PlanOriginalViewer.tsx'
import { PlanReviewConfirmPanel } from '../components/PlanReviewConfirmPanel.tsx'
import { AlertIcon, InfoIcon, Toast, type ToastMessage } from '../components/canonicalUi.ts'
import { analysisLabels, nextToastId } from '../model/adminFormat.ts'
import { useCommand, useRemote } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { paths } from './paths.ts'

type Confirmed = EvaluationPlanAnalysisView['confirmedFields'][number]

// AD-04·05 지필·수행 통합 분석과 추출 검토 (§39).
// 추출 값은 원본 PDF 쪽과 함께 보이고, 관리자가 고친 값·확인한 값은 따로 기록한다. 비율 합계가 맞지 않아도 자동 재배분하지 않는다.
// '확정'은 학교 공통 평가정보 확인이며 학생 과제 승인·반려가 아니다. 실제 AI 분석은 연결되지 않았다 (API-OD-A02·A10).
export function EvaluationPlanReviewRoute({ planId, revisionId }: { planId: string; revisionId: string }) {
  const analysis = useRemote(() => getPlanAnalysis(planId, revisionId), [planId, revisionId])
  return (
    <div className={styles.detail}>
      <RemoteView state={analysis.state} label="분석 결과" onRetry={analysis.reload}>
        {(data) => (
          <ReviewWorkspace
            data={data}
            onSaved={(revision) => analysis.setData({ ...data, reviewStatus: revision.reviewStatus, confirmedFields: revision.confirmedFields })}
            onReplaced={(next) => analysis.setData(next)}
          />
        )}
      </RemoteView>
    </div>
  )
}

const fieldKey = (subjectName: string, fieldPath: string) => `${subjectName}::${fieldPath}`

function ReviewWorkspace({
  data,
  onSaved,
  onReplaced,
}: {
  data: EvaluationPlanAnalysisView
  onSaved: (revision: AdminEvaluationPlanRevision) => void
  onReplaced: (next: EvaluationPlanAnalysisView) => void
}) {
  const [fields, setFields] = useState<Record<string, Confirmed>>(() => Object.fromEntries(data.confirmedFields.map((field) => [fieldKey(field.subjectName, field.fieldPath), field])))
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const { run, pending } = useCommand()
  // 원문 Viewer 쪽 (근거 쪽 버튼으로 이동). 원문이 없거나 HWP·HWPX면 Viewer가 안내만 한다.
  const [viewerPage, setViewerPage] = useState(1)
  const originalFile = data.revisionFile?.file
  const jumpTo = originalFile?.previewAvailable ? (page: number) => setViewerPage(page) : undefined
  const status = analysisLabels[data.analysisStatus]
  const reviewable = data.analysisStatus === 'COMPLETED' || data.analysisStatus === 'REVIEW_REQUIRED'

  const save = async (decision: 'CONFIRM' | 'SAVE') => {
    setError(null)
    const outcome = await run(() => savePlanReview(data.planId, data.documentRevisionId, { confirmedFields: Object.values(fields), decision }))
    if (!outcome) return
    if (outcome.ok) {
      setToast({ id: nextToastId(), tone: 'success', text: decision === 'CONFIRM' ? '공통 평가정보를 확인 완료로 바꿨어요. 학생 개인 정정값은 바뀌지 않아요.' : '검토 내용을 저장했어요.' })
      onSaved(outcome.value)
    } else setError(`${outcome.error.message} (${outcome.error.code})`)
  }

  const setField = (subjectName: string, fieldPath: string, value: number | null, pdfPageNumber: number | null) =>
    setFields((previous) => ({ ...previous, [fieldKey(subjectName, fieldPath)]: { subjectName, fieldPath, value, pdfPageNumber } }))

  return (
    <>
      <DetailHead trail="Assessment 관리 / 학교별 평가계획서" title={`추출 결과 검토 · ${data.documentRevisionId}`} backTo={paths.plans}>
        <span className={styles.badge} data-tone={status.tone}>
          {status.label}
        </span>
        <span className={styles.badge} data-tone={data.reviewStatus === 'CONFIRMED' ? 'success' : undefined}>
          {data.reviewStatus === 'CONFIRMED' ? '관리자 확인 완료' : '미확인'}
        </span>
        {reviewable && isAdminMockDataSource && (
          <>
            <button type="button" className={styles.secondaryButton} onClick={() => save('SAVE')} disabled={pending}>
              검토 저장
            </button>
            <button type="button" className={styles.primaryButton} onClick={() => save('CONFIRM')} disabled={pending}>
              {pending ? '저장 중…' : '공통 평가정보 확정'}
            </button>
          </>
        )}
      </DetailHead>
      <div className={styles.reviewSplit}>
      {!isAdminMockDataSource && (
        <div className={styles.originalPane}>
          <PlanOriginalViewer planId={data.planId} revisionId={data.documentRevisionId} file={originalFile} page={viewerPage} onPageChange={setViewerPage} />
        </div>
      )}
      <div className={styles.pane}>
        <div className={styles.paneInnerWide}>
          {isAdminMockDataSource ? (
            <p className={styles.mockNotice} style={{ marginBottom: 10 }}>
              <InfoIcon size={14} /> 시연용 분석 결과예요. 실제 AI가 PDF를 분석한 값이 아니며, 원본 PDF 쪽을 직접 확인한 뒤에만 확정해 주세요.
            </p>
          ) : (
            <div className={styles.mockNotice} style={{ marginBottom: 10 }} data-testid="analysis-candidate-notice">
              <p style={{ margin: 0 }}>
                <InfoIcon size={14} /> 분석기가 만든 <strong>후보</strong>예요. 공식 평가기준이 아니고 학생에게 보이지 않아요. 빈 칸·&lsquo;미확인&rsquo;은 원문에 없다는 뜻이 아니라 확인이 필요하다는 뜻이에요.
              </p>
              {data.analyzer && (
                <p style={{ margin: '4px 0 0' }}>
                  분석기 {data.analyzer.name} · {data.analyzer.version} ({data.analyzer.origin}){data.receivedAt ? ` · 수신 ${data.receivedAt.slice(0, 16).replace('T', ' ')}` : ''}
                </p>
              )}
              <p style={{ margin: '4px 0 0' }}>
                {originalFile?.available
                  ? originalFile.previewAvailable
                    ? '왼쪽 원문과 대조해 주세요. 근거 쪽 버튼을 누르면 그 쪽으로 이동해요.'
                    : '원문은 서버에 보관되어 있어요. HWP·HWPX는 아직 서비스 안 미리보기가 없어 원본을 내려받아 근거 위치로 대조해 주세요.'
                  : '이 개정본은 원문 파일을 보관하지 않았어요. 원문 대조는 아래 근거(PDF 쪽 또는 HWP·HWPX 위치)로 학교 원본에서 확인해 주세요.'}
              </p>
            </div>
          )}
          {!isAdminMockDataSource && (
            <section className={styles.box} style={{ marginBottom: 12 }} aria-label="확인된 값과 경고">
              <span className={styles.label}>관리자가 확인한 값 ({data.confirmedFields.length})</span>
              {data.confirmedFields.length === 0 ? (
                <p className={styles.muted} data-testid="confirmed-empty">아직 확인한 값이 없어요. 아래는 모두 미확인 후보예요.</p>
              ) : (
                <ul className={styles.listPlain} data-testid="confirmed-fields">
                  {data.confirmedFields.map((field) => (
                    <li key={`${field.subjectId ?? field.subjectName}-${field.fieldPath}`} className={styles.listRow}>
                      과목 {field.subjectId ?? field.subjectName} · {field.fieldPath} = {field.value === null ? '원문에 없음(확인)' : String(field.value)}
                      {field.pdfPageNumber ? ` · PDF ${field.pdfPageNumber}쪽` : ''}
                    </li>
                  ))}
                </ul>
              )}
              <span className={styles.label} style={{ marginTop: 8, display: 'block' }}>경고 ({data.warnings?.length ?? 0})</span>
              {(data.warnings ?? []).length === 0 ? (
                <p className={styles.muted}>분석기·서버 경고가 없어요. 경고가 없어도 사람 확인은 필요해요.</p>
              ) : (
                <ul className={styles.listPlain} data-testid="analysis-warnings">
                  {(data.warnings ?? []).map((warning, index) => (
                    <li key={index} className={styles.listRow}>
                      <span className={styles.badge} data-tone="warning">{warning.source === 'SERVER' ? '서버 검사' : '분석기'}</span> {warning.message}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {!isAdminMockDataSource && (
            <PlanReviewConfirmPanel
              key={`${data.analysisId ?? 'none'}-${data.reviewStatus}`}
              data={data}
              onConfirmed={(next) => {
                setToast({ id: nextToastId(), tone: 'success', text: '공통 평가정보를 확정했어요. 서버에서 다시 읽은 확정값이에요.' })
                onReplaced(next)
              }}
            />
          )}
          {error && (
            <p className={styles.formError} role="alert" style={{ marginBottom: 12 }}>
              <AlertIcon size={15} /> {error}
            </p>
          )}
          {!reviewable ? (
            <p className={styles.muted}>분석 결과가 없어요. 목록에서 분석을 다시 요청하거나 원본 PDF를 직접 확인해 주세요.</p>
          ) : data.subjects.length === 0 ? (
            <p className={styles.muted}>추출된 과목이 없어요.</p>
          ) : (
            <div className={styles.stack}>
              {!isAdminMockDataSource && (data.itemDetails ?? []).length > 0 && (
                <section className={styles.box} aria-label="수행 활동·제출물·조건 (AI 후보)" data-testid="analysis-item-details">
                  <span className={styles.label}>수행 활동·제출물·조건 (AI 후보 · 미확인)</span>
                  <div className={styles.tableWrap}>
                    <table className={styles.table} style={{ minWidth: 640 }}>
                      <thead>
                        <tr>
                          <th scope="col">수행평가</th>
                          <th scope="col">활동</th>
                          <th scope="col">제출물</th>
                          <th scope="col">조건</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.itemDetails ?? []).map((item) => (
                          <tr key={`${item.subjectName}-${item.itemKey}`} data-testid="analysis-item-detail" data-item-key={item.itemKey}>
                            <td>
                              {item.label}
                              <span className={styles.cellSub}>{item.itemKey}</span>
                            </td>
                            {/* 빈 값은 "원문에 없음"이 아니라 "추출되지 않음 · 확인 필요"다 */}
                            <td style={{ whiteSpace: 'pre-line' }}>{item.content ?? '추출되지 않음 · 확인 필요'}</td>
                            <td>{item.submissions.length ? item.submissions.join(', ') : '추출되지 않음 · 확인 필요'}</td>
                            <td>{item.conditions.length ? item.conditions.join(' / ') : '추출되지 않음 · 확인 필요'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              {data.subjects.map((subject) => (
                <SubjectReview key={subject.subjectName} subject={subject} fields={fields} onField={setField} documentFormat={data.revisionFile?.documentFormat ?? 'PDF'} onJump={jumpTo} />
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  )
}

function SubjectReview({
  subject,
  fields,
  onField,
  documentFormat,
  onJump,
}: {
  subject: AnalysisSubject
  fields: Record<string, Confirmed>
  onField: (subjectName: string, fieldPath: string, value: number | null, page: number | null) => void
  documentFormat: 'PDF' | 'HWP' | 'HWPX'
  /** 원문 Viewer의 그 쪽으로 이동 (PDF 원문 미리보기가 있을 때만) */
  onJump?: (page: number) => void
}) {
  const weight = (path: string, original: number | null) => {
    const confirmed = fields[fieldKey(subject.subjectName, path)]
    return confirmed ? (typeof confirmed.value === 'number' ? confirmed.value : null) : original
  }
  const written = weight('writtenEvaluation.weightPercent', subject.writtenEvaluation?.weightPercent ?? null)
  const performance = weight('performanceEvaluation.weightPercent', subject.performanceEvaluation?.weightPercent ?? null)
  const total = written !== null && performance !== null ? written + performance : null
  const firstPage = subject.sources[0]?.pdfPageNumber ?? null

  return (
    <section className={styles.box} aria-label={subject.subjectName}>
      <div className={styles.studentLine}>
        <strong style={{ color: 'var(--as-color-text)', fontSize: 15 }}>{subject.subjectName}</strong>
        {subject.extractionFailed ? (
          <span className={styles.badge} data-tone="danger">
            이 과목 추출 실패
          </span>
        ) : total !== null && total !== 100 ? (
          <span className={styles.badge} data-tone="warning">
            지필+수행 합계 {total}% — 원본과 비교 필요 (자동 재배분 안 함)
          </span>
        ) : null}
      </div>
      {subject.extractionFailed ? (
        <p className={styles.muted}>원본 PDF에서 직접 확인해 주세요. 값이 없다고 0%로 바꾸지 않아요.</p>
      ) : (
        <div className={styles.formGrid}>
          <WeightField label="지필평가 반영 비율" value={written} edited={Boolean(fields[fieldKey(subject.subjectName, 'writtenEvaluation.weightPercent')])} onChange={(value) => onField(subject.subjectName, 'writtenEvaluation.weightPercent', value, firstPage)} />
          <WeightField label="수행평가 반영 비율" value={performance} edited={Boolean(fields[fieldKey(subject.subjectName, 'performanceEvaluation.weightPercent')])} onChange={(value) => onField(subject.subjectName, 'performanceEvaluation.weightPercent', value, firstPage)} />
        </div>
      )}
      {subject.writtenEvaluation && subject.writtenEvaluation.exams.length > 0 && (
        <p className={styles.muted} style={{ marginTop: 10 }}>
          지필 {subject.writtenEvaluation.exams.map((exam) => `${exam.round}차 ${exam.weightPercent ?? '미확인'}%(${exam.questionTypes.join('·') || '유형 미확인'})`).join(' / ')}
        </p>
      )}
      {subject.performanceEvaluation && subject.performanceEvaluation.items.length > 0 && (
        <div className={styles.tableWrap} style={{ marginTop: 10 }}>
          <table className={styles.table} style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th scope="col">수행평가 영역</th>
                <th scope="col">반영</th>
                <th scope="col">배점</th>
                <th scope="col">시기</th>
                <th scope="col">채점 기준</th>
                <th scope="col">원본 쪽</th>
              </tr>
            </thead>
            <tbody>
              {subject.performanceEvaluation.items.map((item) => (
                <tr key={item.itemKey}>
                  <td>{item.label ?? '이름 미확인'}</td>
                  <td>{item.weightPercent === null ? '미확인' : `${item.weightPercent}%`}</td>
                  <td>{item.maxScore === null ? '미확인' : `${item.maxScore}점`}</td>
                  <td>{item.timing ?? '미확인'}</td>
                  <td>{item.rubric.length ? item.rubric.join(' · ') : '미확인'}</td>
                  <td>
                    {documentFormat !== 'PDF' ? (
                      <span className={styles.cellSub}>{documentFormat} 위치 근거 (검토 확정 표 참고)</span>
                    ) : item.sourcePdfPageNumber === null ? (
                      <span className={styles.danger}>근거 쪽 없음</span>
                    ) : (
                      <PageLink page={item.sourcePdfPageNumber} onJump={onJump} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {subject.achievement.standards.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <span className={styles.label}>성취기준</span>
          {subject.achievement.standards.map((standard) => (
            <p key={standard} className={styles.notePara} style={{ fontSize: 13 }}>
              {standard}
            </p>
          ))}
          {subject.achievement.thresholds.length > 0 && <p className={styles.muted}>성취도 {subject.achievement.thresholds.join(' · ')}</p>}
        </div>
      )}
      {subject.sources.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary className={styles.label} style={{ cursor: 'pointer' }}>
            원문 대조 ({subject.sources.length}곳)
          </summary>
          <ul className={styles.listPlain}>
            {subject.sources.map((source) => (
              <li key={`${source.pdfPageNumber}-${source.extractedText}`} className={styles.listRow}>
                <span>
                  {source.pdfPageNumber ? <PageLink page={source.pdfPageNumber} onJump={onJump} /> : <span className={styles.badge}>쪽 없음</span>}
                  {source.printedPageLabel ? <span className={styles.cellSub}> 인쇄 {source.printedPageLabel}쪽</span> : null}{' '}
                  {source.extractedText}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

/** 근거 쪽: 원문 Viewer가 있으면 그 쪽으로 이동하는 버튼, 없으면 표시만 */
function PageLink({ page, onJump }: { page: number; onJump?: (page: number) => void }) {
  if (!onJump) return <span className={styles.badge}>PDF {page}쪽</span>
  return (
    <button type="button" className={styles.badge} style={{ cursor: 'pointer', border: 0 }} onClick={() => onJump(page)} aria-label={`원문 ${page}쪽으로 이동`} data-testid="evidence-page-link">
      PDF {page}쪽 ↗
    </button>
  )
}

function WeightField({ label, value, edited, onChange }: { label: string; value: number | null; edited: boolean; onChange: (value: number | null) => void }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>
        {label} {edited && <span className={styles.badge} data-tone="warning">관리자 정정</span>}
      </span>
      <input
        className={styles.input}
        type="number"
        min={0}
        max={100}
        value={value ?? ''}
        placeholder="미확인"
        disabled={!isAdminMockDataSource}
        title={isAdminMockDataSource ? undefined : 'AI 후보 값이에요. 확정은 아래 검토 확정 영역에서 해요'}
        onChange={(event) => onChange(event.target.value === '' ? null : Math.min(100, Math.max(0, Number(event.target.value))))}
      />
    </label>
  )
}
