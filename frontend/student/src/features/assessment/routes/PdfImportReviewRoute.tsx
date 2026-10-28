import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useBlocker, useLocation, useNavigate, useParams } from 'react-router'
import { toApiError, type ApiError } from '../api/apiError.ts'
import { getEvaluationPlanAnalysis, listEvaluationPlans, requestEvaluationPlanAnalysis, savePersonalReview } from '../api/evaluationPlansApi.ts'
import { createSchoolAssessment } from '../api/schoolAssessmentApi.ts'
import type {
  AnalysisSubject,
  EvaluationPlan,
  EvaluationPlanAnalysis,
  PerformanceEvaluationItem,
  PersonalReviewCorrection,
  SchoolAssessment,
} from '../api/types.ts'
import formStyles from '../components/AddSchoolAssessmentModal.module.css'
import { AlertIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, FileIcon, InfoIcon, PencilIcon } from '../components/AssessmentIcons.tsx'
import enrichmentStyles from '../components/enrichment/enrichment.module.css'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { Modal } from '../components/Modal.tsx'
import styles from '../components/pdf-import/pdfImport.module.css'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { mockPdfPolicy } from '../model/pdfImportPolicy.ts'
import {
  analysisStatusLabels,
  duplicateState,
  labelFieldPath,
  matchSubject,
  planContextIssue,
  planTermLabel,
  reviewStatusLabel,
  valueOrMissing,
  type DuplicateState,
} from '../model/pdfImportView.ts'
import { schoolAssessmentDetailPath, schoolAssessmentsPath } from './paths.ts'

interface Candidate {
  key: string
  subjectIndex: number
  itemIndex: number
  subjectId: string
  item: PerformanceEvaluationItem
  title: string | null
  duplicate: DuplicateState
}

type RegisterResult = { key: string; title: string; ok: true; assessment: SchoolAssessment } | { key: string; title: string; ok: false; error: ApiError }

// 평가계획서 분석 결과 검토·가져오기 (screen-map S5, student §5·§6 등록 A, api-contract.md §11·§12). Mockup 미제공 — Stage 7 보완 UI.
// 분석 결과는 AI 추출 "후보"이며 지금은 시연 Fixture다(실제 PDF에서 추출하지 않음, 원본 PDF 미연결).
// 학생 정정은 §11 개인 검토(PUT)에만 저장하고 공통 문서·분석 결과는 바꾸지 않는다. 학생이 고른 수행평가만 §12 POST로 하나씩 만든다.
// 지필평가는 보여주기만 하고 수행평가로 만들지 않는다.
export function PdfImportReviewRoute() {
  const { documentRevisionId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedContext, termAssessments, notifyDataChanged } = useAssessmentWorkspace()
  const statePlan = (location.state as { plan?: EvaluationPlan } | null)?.plan
  const [plan, setPlan] = useState<EvaluationPlan | undefined>(statePlan?.documentRevisionId === documentRevisionId ? statePlan : undefined)
  const [analysis, setAnalysis] = useState<EvaluationPlanAnalysis>()
  const [loadError, setLoadError] = useState<ApiError>()
  const [poll, setPoll] = useState(0)
  const [requesting, setRequesting] = useState(false)
  const [subjectIndex, setSubjectIndex] = useState(0)
  const [manualSubjects, setManualSubjects] = useState<Record<number, string>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string>()
  const [saved, setSaved] = useState<PersonalReviewCorrection[]>([])
  const [saveState, setSaveState] = useState<{ saving: boolean; error?: string }>({ saving: false })
  const [selected, setSelected] = useState<string[]>([])
  const [openSources, setOpenSources] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [results, setResults] = useState<RegisterResult[]>([])
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const notify = (tone: ToastMessage['tone'], text: string) => setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone, text }))

  // 문서 정보: 가져오기 Modal에서 넘겨받거나, 바로 들어온 경우 이번·작년 공통 목록에서 찾는다.
  useEffect(() => {
    if (plan || !selectedContext) return
    let active = true
    const query = { schoolId: selectedContext.school.schoolId, grade: selectedContext.grade, semester: selectedContext.semester }
    Promise.all([
      listEvaluationPlans({ ...query, academicYear: selectedContext.academicYear }),
      listEvaluationPlans({ ...query, academicYear: selectedContext.academicYear - 1 }),
    ])
      .then(([current, previous]) => {
        const found = [...current.items, ...previous.items].find((item) => item.documentRevisionId === documentRevisionId)
        if (active && found) setPlan(found)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [documentRevisionId, plan, selectedContext])

  // 분석 상태 조회. 진행 중이면 잠시 뒤 다시 조회한다 (Mock 시연 간격, 실제 비동기 주기 아님).
  useEffect(() => {
    let active = true
    getEvaluationPlanAnalysis(documentRevisionId).then(
      (result) => {
        if (!active) return
        setLoadError(undefined)
        setAnalysis(result)
      },
      (error: unknown) => {
        if (active) setLoadError(toApiError(error))
      },
    )
    return () => {
      active = false
    }
  }, [documentRevisionId, poll])
  useEffect(() => {
    if (analysis?.status !== 'PROCESSING') return
    const timer = window.setTimeout(() => setPoll((value) => value + 1), mockPdfPolicy.pollIntervalMs)
    return () => window.clearTimeout(timer)
  }, [analysis])

  const requestAnalysis = async () => {
    if (requesting) return
    setRequesting(true)
    try {
      setAnalysis(await requestEvaluationPlanAnalysis(documentRevisionId))
      setLoadError(undefined)
    } catch (caught) {
      setLoadError(toApiError(caught))
    } finally {
      setRequesting(false)
    }
  }

  const unsavedCount = Object.keys(drafts).length
  const blocker = useBlocker(({ currentLocation, nextLocation }) => unsavedCount > 0 && currentLocation.pathname !== nextLocation.pathname)

  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate(schoolAssessmentsPath))
  const issue = plan && selectedContext ? planContextIssue(plan, selectedContext) : null
  const subjects = analysis?.subjects ?? []
  const existing = termAssessments.data?.items ?? []

  const correctedLabel = (path: string) => saved.find((correction) => correction.fieldPath === path)?.value
  const subjectIdFor = (index: number) =>
    manualSubjects[index] ?? (selectedContext ? matchSubject(subjects[index]?.subjectName ?? '', selectedContext.subjects)?.subjectId : undefined)

  const candidates: Candidate[] = subjects.flatMap((subject, sIndex) => {
    const subjectId = subjectIdFor(sIndex)
    if (!subjectId || subject.extractionFailed) return []
    return (subject.performanceEvaluation?.items ?? []).map((item, iIndex) => {
      const title = correctedLabel(labelFieldPath(sIndex, iIndex)) ?? item.label
      return {
        key: labelFieldPath(sIndex, iIndex),
        subjectIndex: sIndex,
        itemIndex: iIndex,
        subjectId,
        item,
        title,
        duplicate: duplicateState(existing, { documentRevisionId, subjectId, itemKey: item.itemKey }, title),
      }
    })
  })
  const selectedCandidates = candidates.filter((candidate) => selected.includes(candidate.key) && candidate.duplicate?.kind !== 'imported')
  const registerBlockedReason = issue
    ? issue.message
    : !termAssessments.data
      ? '내 수행평가 목록을 확인하는 중이에요.'
      : unsavedCount > 0
        ? '저장하지 않은 이름 정정이 있어요. 먼저 저장해 주세요.'
        : selectedCandidates.length === 0
          ? '추가할 수행평가를 골라 주세요.'
          : null

  const saveCorrections = async () => {
    if (!analysis || saveState.saving || unsavedCount === 0) return
    setSaveState({ saving: true })
    const merged = new Map(saved.map((correction) => [correction.fieldPath, correction]))
    for (const [fieldPath, value] of Object.entries(drafts)) {
      const [, s, i] = fieldPath.match(/subjects\[(\d+)\].*items\[(\d+)\]/) ?? []
      const item = subjects[Number(s)]?.performanceEvaluation?.items[Number(i)]
      merged.set(fieldPath, { fieldPath, value, sourcePdfPageNumber: item?.sourcePdfPageNumber ?? null })
    }
    try {
      const review = await savePersonalReview(documentRevisionId, { analysisId: analysis.analysisId, corrections: [...merged.values()] })
      setSaved(review.corrections)
      setDrafts({})
      setEditing(undefined)
      setSaveState({ saving: false })
      notify('success', '정정한 이름을 내 검토본에 저장했어요. 학교 공통 문서는 바뀌지 않아요.')
    } catch (caught) {
      const error = toApiError(caught)
      setSaveState({ saving: false, error: `${error.message} 입력한 내용은 그대로 있어요. (${error.code})` })
    }
  }

  const frame = (content: ReactNode) => (
    <main className={enrichmentStyles.page}>
      <div className={enrichmentStyles.mainArea}>
        <div className={`${enrichmentStyles.content} ${styles.reviewArea}`}>
          <button type="button" className={`${enrichmentStyles.backLink} ${styles.backButton}`} onClick={goBack}>
            <ChevronLeftIcon size={15} />
            학교 수행평가
          </button>
          <h1 className={styles.reviewTitle}>평가계획서 분석 결과</h1>
          <div className={styles.docLine}>
            <FileIcon size={16} className={styles.pdfIcon} />
            <span>{plan?.fileName ?? documentRevisionId}</span>
            {plan && (
              <>
                <span className={styles.chip}>학교 공통</span>
                <span className={styles.chip}>{reviewStatusLabel(plan.reviewStatus)}</span>
                <span className={styles.chip}>{planTermLabel(plan)}</span>
              </>
            )}
            <span className={styles.chip} data-tone="demo">
              시연 데이터
            </span>
          </div>
          {issue && (
            <p className={styles.warning} role="note" data-kind={issue.kind}>
              <AlertIcon size={15} />
              {issue.message}
            </p>
          )}
          {content}
          <div className={enrichmentStyles.notices}>
            <MockDataNotice />
          </div>
        </div>
      </div>
      <Toast message={toast} onDismiss={dismissToast} />
    </main>
  )

  if (loadError && !analysis) {
    return frame(
      loadError.code === 'EVALUATION_PLAN_NOT_FOUND' ? (
        <EmptyState title="평가계획서를 찾을 수 없어요" action={<Link to={schoolAssessmentsPath}>학교 수행평가로 가기</Link>} />
      ) : (
        <ErrorState title="분석 상태를 불러오지 못했어요" error={loadError} onRetry={() => setPoll((value) => value + 1)} />
      ),
    )
  }
  if (!analysis) return frame(<LoadingRows rows={3} label="분석 상태를 불러오는 중" />)

  if (analysis.status === 'NOT_REQUESTED') {
    return frame(
      <section className={styles.stateBox}>
        <p className={styles.stateTitle}>아직 분석을 요청하지 않았어요</p>
        {loadError && <p className={formStyles.fieldError}>{`${loadError.message} (${loadError.code})`}</p>}
        <button type="button" className={formStyles.primaryButton} disabled={requesting} onClick={() => void requestAnalysis()}>
          {requesting ? '요청 중…' : '분석 시작'}
        </button>
      </section>,
    )
  }
  if (analysis.status === 'PROCESSING') {
    return frame(
      <section className={styles.stateBox} role="status" aria-live="polite">
        <span className={styles.spinner} aria-hidden="true" />
        <p className={styles.stateTitle}>분석 중이에요 (시연)</p>
        <p className={styles.stateText}>시연용 결과를 불러오는 중이에요. 실제 PDF를 읽고 있는 것은 아니에요.</p>
      </section>,
    )
  }
  if (analysis.status === 'FAILED') {
    return frame(
      <section className={styles.stateBox} role="alert">
        <AlertIcon size={22} className={styles.failIcon} />
        <p className={styles.stateTitle}>분석에 실패했어요</p>
        <p className={styles.stateText}>
          스캔본이거나 표를 읽을 수 없는 문서일 수 있어요. 수행평가가 없다는 뜻은 아니에요. 원본을 보면서 직접 추가할 수 있어요. (PDF_EXTRACTION_FAILED)
        </p>
        {loadError && <p className={formStyles.fieldError}>{`${loadError.message} (${loadError.code})`}</p>}
        <div className={styles.stateActions}>
          <button type="button" className={formStyles.ghostButton} disabled={requesting} onClick={() => void requestAnalysis()}>
            {requesting ? '요청 중…' : '다시 분석'}
          </button>
          <Link to={schoolAssessmentsPath} className={formStyles.primaryButton}>
            목록에서 직접 추가하기
          </Link>
        </div>
      </section>,
    )
  }
  if (subjects.length === 0) {
    return frame(
      <section className={styles.stateBox}>
        <p className={styles.stateTitle}>분석은 끝났지만 찾은 과목이 없어요</p>
        <p className={styles.stateText}>문서에서 과목별 평가 정보를 찾지 못했어요. 수행평가가 0건이라는 뜻은 아니에요. 원본을 확인하고 직접 추가해 주세요.</p>
        <Link to={schoolAssessmentsPath} className={formStyles.primaryButton}>
          목록에서 직접 추가하기
        </Link>
      </section>,
    )
  }

  const current = subjects[Math.min(subjectIndex, subjects.length - 1)]
  const currentIndex = subjects.indexOf(current)
  const failedCount = subjects.filter((subject) => subject.extractionFailed).length

  return frame(
    <>
      <p className={styles.candidateBanner}>
        <InfoIcon size={15} />
        <span>
          AI 추출 <strong>후보</strong>예요({analysisStatusLabels[analysis.status]}
          {failedCount > 0 ? ` · ${subjects.length}개 과목 중 ${failedCount}개 추출 실패` : ''}). 지금은 시연 예시 값이라 실제 PDF에서 추출한 것이 아니고, 원본 PDF가
          연결되어 있지 않아 근거 페이지를 원본과 대조할 수 없어요. 학교의 공식 정보로 확정된 값이 아니에요.
        </span>
      </p>

      <div className={enrichmentStyles.tabs} role="tablist" aria-label="분석한 과목">
        {subjects.map((subject, index) => (
          <button
            key={subject.subjectName}
            type="button"
            role="tab"
            id={`subject-tab-${index}`}
            aria-selected={index === currentIndex}
            aria-controls="subject-panel"
            className={`${enrichmentStyles.tab} ${styles.subjectTab}`}
            onClick={() => setSubjectIndex(index)}
          >
            {subject.subjectName}
            {subject.extractionFailed && <span className={styles.tabBadge}>추출 실패</span>}
          </button>
        ))}
      </div>

      <section id="subject-panel" role="tabpanel" aria-labelledby={`subject-tab-${currentIndex}`} className={styles.subjectPanel}>
        <SubjectMapping
          subject={current}
          subjectId={subjectIdFor(currentIndex)}
          autoMatched={Boolean(selectedContext && matchSubject(current.subjectName, selectedContext.subjects)) && !manualSubjects[currentIndex]}
          subjects={selectedContext?.subjects ?? []}
          onChange={(subjectId) =>
            setManualSubjects((previous) => {
              const next = { ...previous }
              if (subjectId) next[currentIndex] = subjectId
              else delete next[currentIndex]
              return next
            })
          }
        />

        {current.extractionFailed ? (
          <div className={styles.stateBox} role="alert">
            <AlertIcon size={20} className={styles.failIcon} />
            <p className={styles.stateTitle}>이 과목은 추출에 실패했어요</p>
            <p className={styles.stateText}>평가 정보가 없다는 뜻은 아니에요. 원본을 확인하고 필요한 수행평가는 직접 추가해 주세요. (PDF_EXTRACTION_FAILED)</p>
          </div>
        ) : (
          <>
            <section className={styles.block} aria-labelledby="written-heading">
              <h2 id="written-heading" className={styles.blockTitle}>
                지필평가 {current.writtenEvaluation?.weightPercent != null && <span className={styles.blockMeta}>반영 {current.writtenEvaluation.weightPercent}%</span>}
              </h2>
              <p className={styles.blockHint}>지필평가는 확인용이에요. 수행평가 목록에는 추가하지 않아요.</p>
              {!current.writtenEvaluation ? (
                <p className={styles.muted}>문서에서 지필평가 정보를 찾지 못했어요 (원본에 없음 또는 미확인).</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">차수</th>
                      <th scope="col">반영비율</th>
                      <th scope="col">문항 유형</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.writtenEvaluation.exams.map((exam) => (
                      <tr key={exam.round}>
                        <td>{exam.round}차</td>
                        <td>{valueOrMissing(exam.weightPercent, '%')}</td>
                        <td>{exam.questionTypes.length > 0 ? exam.questionTypes.join(', ') : '원본에 없음'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className={styles.block} aria-labelledby="performance-heading">
              <h2 id="performance-heading" className={styles.blockTitle}>
                수행평가 {current.performanceEvaluation?.weightPercent != null && <span className={styles.blockMeta}>반영 {current.performanceEvaluation.weightPercent}%</span>}
              </h2>
              {!subjectIdFor(currentIndex) && <p className={styles.blockHint}>내 과목을 고르면 이 과목의 수행평가를 선택할 수 있어요.</p>}
              {!current.performanceEvaluation || current.performanceEvaluation.items.length === 0 ? (
                <p className={styles.muted}>문서에서 수행평가 항목을 찾지 못했어요 (원본에 없음 또는 미확인).</p>
              ) : (
                <ul className={styles.itemList}>
                  {current.performanceEvaluation.items.map((item, itemIndex) => {
                    const path = labelFieldPath(currentIndex, itemIndex)
                    const candidate = candidates.find((entry) => entry.key === path)
                    const corrected = correctedLabel(path)
                    const draft = drafts[path]
                    const title = candidate?.title ?? corrected ?? item.label
                    const disabledReason = !candidate
                      ? '내 과목을 먼저 골라 주세요.'
                      : candidate.duplicate?.kind === 'imported'
                        ? '이미 가져온 항목이에요.'
                        : !candidate.title
                          ? '이름이 없어요. 이름을 정정한 뒤 고를 수 있어요.'
                          : issue
                            ? issue.message
                            : null
                    const source = current.sources.find((entry) => entry.pdfPageNumber === item.sourcePdfPageNumber)
                    const sourceOpen = openSources.includes(path)
                    return (
                      <li key={item.itemKey} className={styles.item} data-selected={selected.includes(path)}>
                        <div className={styles.itemHead}>
                          <input
                            type="checkbox"
                            className={styles.itemCheck}
                            aria-label={`${title ?? '이름 없는 항목'} 선택`}
                            aria-describedby={disabledReason ? `${path}-reason` : undefined}
                            checked={selected.includes(path) && !disabledReason}
                            disabled={Boolean(disabledReason)}
                            onChange={(event) =>
                              setSelected((previous) => (event.target.checked ? [...previous, path] : previous.filter((key) => key !== path)))
                            }
                          />
                          <div className={styles.itemBody}>
                            {editing === path ? (
                              <span className={styles.editRow}>
                                <label className="lh-visually-hidden" htmlFor={`${path}-input`}>
                                  수행평가 이름 정정
                                </label>
                                <input
                                  id={`${path}-input`}
                                  className={formStyles.input}
                                  value={draft ?? title ?? ''}
                                  onChange={(event) => setDrafts((previous) => ({ ...previous, [path]: event.target.value }))}
                                />
                                <button
                                  type="button"
                                  className={styles.textButton}
                                  onClick={() => {
                                    setDrafts((previous) => {
                                      const next = { ...previous }
                                      delete next[path]
                                      return next
                                    })
                                    setEditing(undefined)
                                  }}
                                >
                                  정정 취소
                                </button>
                              </span>
                            ) : (
                              <span className={styles.itemTitleRow}>
                                <span className={styles.itemTitle}>{draft ?? title ?? <span className={styles.muted}>이름 없음 (원본에 없음)</span>}</span>
                                {(corrected || draft !== undefined) && <span className={styles.chip} data-tone="mine">{draft !== undefined ? '정정 (저장 안 됨)' : '내 정정'}</span>}
                                <button type="button" className={styles.textButton} disabled={saveState.saving} onClick={() => setEditing(path)}>
                                  <PencilIcon size={12} /> 이름 정정
                                </button>
                              </span>
                            )}
                            {(corrected || draft !== undefined) && (
                              <span className={styles.compare}>추출 후보: {item.label ?? '원본에 없음'}</span>
                            )}
                            <span className={styles.itemMeta}>
                              반영 {valueOrMissing(item.weightPercent, '%')} · 만점 {valueOrMissing(item.maxScore, '점')} · 시기 {valueOrMissing(item.timing)}
                            </span>
                            {item.rubric.length > 0 ? (
                              <ul className={styles.rubric} aria-label="평가 요소·채점기준 후보">
                                {item.rubric.map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className={styles.itemMeta}>평가 요소·채점기준: 원본에 없음</span>
                            )}
                            <span className={styles.evidenceRow}>
                              {item.sourcePdfPageNumber === null ? (
                                <span className={styles.chip} data-tone="warn">
                                  근거 페이지 미확인 · 확인 필요
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.textButton}
                                  aria-expanded={sourceOpen}
                                  onClick={() => setOpenSources((previous) => (sourceOpen ? previous.filter((key) => key !== path) : [...previous, path]))}
                                >
                                  근거: PDF {item.sourcePdfPageNumber}쪽{source?.printedPageLabel ? ` (문서 표기 ${source.printedPageLabel}쪽)` : ' (문서 표기 쪽 번호 없음)'}
                                  <ChevronDownIcon size={12} />
                                </button>
                              )}
                              {candidate?.duplicate?.kind === 'imported' && (
                                <Link to={schoolAssessmentDetailPath(candidate.duplicate.assessment.assessmentId)} className={styles.chip} data-tone="done">
                                  <CheckIcon size={11} /> 이미 가져온 항목 · 보기
                                </Link>
                              )}
                              {candidate?.duplicate?.kind === 'sameTitle' && (
                                <Link to={schoolAssessmentDetailPath(candidate.duplicate.assessment.assessmentId)} className={styles.chip} data-tone="warn">
                                  같은 이름의 수행평가가 있어요 · 보기
                                </Link>
                              )}
                            </span>
                            {sourceOpen && source && (
                              <blockquote className={styles.sourceText}>
                                {source.extractedText}
                                <span className={styles.sourceNote}>시연 데이터 · 원본 확인 불가</span>
                              </blockquote>
                            )}
                            {disabledReason && candidate?.duplicate?.kind !== 'imported' && (
                              <span id={`${path}-reason`} className={styles.itemMeta}>
                                {disabledReason}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className={styles.block} aria-labelledby="achievement-heading">
              <h2 id="achievement-heading" className={styles.blockTitle}>
                성취·교수학습 계획
              </h2>
              <InfoList title="성취기준" items={current.achievement.standards} />
              <InfoList title="성취수준" items={current.achievement.levels} />
              <InfoList title="기준 성취율" items={current.achievement.thresholds} />
              <InfoList title="교수·학습 계획" items={current.teachingPlan} />
            </section>

            <section className={styles.block} aria-labelledby="sources-heading">
              <h2 id="sources-heading" className={styles.blockTitle}>
                원본 근거
              </h2>
              <p className={styles.blockHint}>PDF 쪽은 파일의 1번째 페이지부터 센 번호이고, 문서 표기 쪽은 문서에 인쇄된 번호예요. 시연 데이터라 원본 PDF는 열 수 없어요.</p>
              {current.sources.length === 0 ? (
                <p className={styles.muted}>근거 페이지가 없어요.</p>
              ) : (
                <ul className={styles.sourceList}>
                  {current.sources.map((source) => (
                    <li key={source.pdfPageNumber}>
                      <span className={styles.sourcePage}>
                        PDF {source.pdfPageNumber}쪽 · 문서 표기 {source.printedPageLabel ?? '없음'}
                      </span>
                      <span>{source.extractedText}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </section>

      <div className={styles.actionBar} role="region" aria-label="검토·가져오기">
        <span className={styles.actionText}>
          {unsavedCount > 0 ? `저장 안 된 이름 정정 ${unsavedCount}건` : saved.length > 0 ? `내 정정 ${saved.length}건 저장됨` : '정정한 항목 없음'}
          {' · '}선택한 수행평가 {selectedCandidates.length}개
        </span>
        {saveState.error && (
          <span className={formStyles.fieldError} role="alert">
            {saveState.error}
          </span>
        )}
        <button
          type="button"
          className={formStyles.ghostButton}
          disabled={unsavedCount === 0 || saveState.saving}
          aria-busy={saveState.saving}
          onClick={() => void saveCorrections()}
        >
          {saveState.saving ? '저장 중…' : '정정 저장'}
        </button>
        <button
          type="button"
          className={formStyles.primaryButton}
          aria-disabled={registerBlockedReason ? 'true' : undefined}
          aria-describedby={registerBlockedReason ? 'register-reason' : undefined}
          onClick={() => {
            if (registerBlockedReason) {
              notify('info', registerBlockedReason)
              return
            }
            setResults([])
            setConfirmOpen(true)
          }}
        >
          내 수행평가에 추가
        </button>
        {registerBlockedReason && (
          <span id="register-reason" className="lh-visually-hidden">
            {registerBlockedReason}
          </span>
        )}
      </div>

      {confirmOpen && (
        <RegisterModal
          candidates={selectedCandidates}
          documentRevisionId={documentRevisionId}
          academicYear={selectedContext?.academicYear ?? 0}
          semester={selectedContext?.semester ?? 0}
          subjectName={(subjectId) => selectedContext?.subjects.find((subject) => subject.subjectId === subjectId)?.name ?? subjectId}
          results={results}
          onResults={(next) => {
            setResults(next)
            if (next.some((result) => result.ok)) notifyDataChanged()
            setSelected((previous) => previous.filter((key) => !next.some((result) => result.ok && result.key === key)))
          }}
          onClose={() => setConfirmOpen(false)}
        />
      )}

      {blocker.state === 'blocked' && (
        <Modal
          title="저장하지 않은 정정이 있어요"
          description="이 화면을 나가면 저장하지 않은 이름 정정이 사라져요."
          compact
          onRequestClose={() => blocker.reset()}
          footer={
            <>
              <button type="button" className={formStyles.ghostButton} onClick={() => blocker.proceed()}>
                저장하지 않고 나가기
              </button>
              <button type="button" className={formStyles.primaryButton} onClick={() => blocker.reset()}>
                머무르기
              </button>
            </>
          }
        >
          <p className={styles.stateText}>이 화면을 나가면 저장하지 않은 이름 정정이 사라져요.</p>
        </Modal>
      )}
    </>,
  )
}

function SubjectMapping({
  subject,
  subjectId,
  autoMatched,
  subjects,
  onChange,
}: {
  subject: AnalysisSubject
  subjectId: string | undefined
  autoMatched: boolean
  subjects: { subjectId: string; name: string }[]
  onChange: (subjectId: string) => void
}) {
  return (
    <div className={styles.mappingRow}>
      <label htmlFor="subject-mapping" className={styles.mappingLabel}>
        문서 과목 "{subject.subjectName}" → 내 과목
      </label>
      <span className={enrichmentStyles.selectWrap}>
        <select id="subject-mapping" className={enrichmentStyles.select} value={subjectId ?? ''} onChange={(event) => onChange(event.target.value)}>
          <option value="">{autoMatched ? '자동 연결 해제' : '고르지 않음'}</option>
          {subjects.map((item) => (
            <option key={item.subjectId} value={item.subjectId}>
              {item.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon size={14} className={enrichmentStyles.selectChevron} />
      </span>
      <span className={styles.itemMeta}>
        {subjectId ? (autoMatched ? '이름이 같은 과목이라 연결했어요.' : '직접 고른 과목이에요 (이 화면에서만).') : '이름이 같은 내 과목이 없어 연결하지 않았어요.'}
      </span>
    </div>
  )
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoTitle}>{title}</span>
      {items.length === 0 ? (
        <span className={styles.muted}>문서에서 찾지 못했어요</span>
      ) : (
        <ul className={styles.infoItems}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface RegisterModalProps {
  candidates: Candidate[]
  documentRevisionId: string
  academicYear: number
  semester: number
  subjectName: (subjectId: string) => string
  results: RegisterResult[]
  onResults: (results: RegisterResult[]) => void
  onClose: () => void
}

// 최종 확인 → §12 POST를 항목마다 보낸다. 성공한 항목은 다시 보내지 않고, 실패한 항목만 다시 시도한다.
// 마감일은 문서에 날짜가 없으므로 비워 두고, 학생이 아는 경우에만 직접 넣는다.
function RegisterModal({ candidates, documentRevisionId, academicYear, semester, subjectName, results, onResults, onClose }: RegisterModalProps) {
  const [deadlines, setDeadlines] = useState<Record<string, string>>({})
  const [acknowledged, setAcknowledged] = useState(false)
  const [running, setRunning] = useState(false)
  const runningRef = useRef(false)
  const done = new Set(results.filter((result) => result.ok).map((result) => result.key))
  const pending = candidates.filter((candidate) => !done.has(candidate.key))
  const hasSameTitle = pending.some((candidate) => candidate.duplicate?.kind === 'sameTitle')
  const failed = results.filter((result) => !result.ok)
  const succeeded = results.filter((result): result is Extract<RegisterResult, { ok: true }> => result.ok)

  const register = async () => {
    if (runningRef.current || pending.length === 0 || (hasSameTitle && !acknowledged)) return
    runningRef.current = true
    setRunning(true)
    const next: RegisterResult[] = results.filter((result) => result.ok)
    for (const candidate of pending) {
      const title = candidate.title ?? ''
      try {
        const assessment = await createSchoolAssessment({
          title,
          subjectId: candidate.subjectId,
          academicYear,
          semester,
          deadlineDate: deadlines[candidate.key] || null,
          description: null,
          status: 'BEFORE_START',
          evaluationItemRef: { documentRevisionId, subjectId: candidate.subjectId, itemKey: candidate.item.itemKey },
        })
        next.push({ key: candidate.key, title, ok: true, assessment })
      } catch (caught) {
        next.push({ key: candidate.key, title, ok: false, error: toApiError(caught) })
      }
    }
    onResults(next)
    runningRef.current = false
    setRunning(false)
  }

  const allDone = results.length > 0 && pending.length === 0
  return (
    <Modal
      title={allDone ? '내 수행평가에 추가했어요' : '내 수행평가에 추가할까요?'}
      description="고른 수행평가를 내 학교 수행평가 목록에 추가해요."
      onRequestClose={() => {
        if (!running) onClose()
      }}
      footer={
        allDone ? (
          <>
            <Link to={schoolAssessmentsPath} className={formStyles.ghostButton}>
              목록에서 보기
            </Link>
            <button type="button" className={formStyles.primaryButton} onClick={onClose}>
              닫기
            </button>
          </>
        ) : (
          <>
            <button type="button" className={formStyles.ghostButton} onClick={onClose} disabled={running}>
              취소
            </button>
            <button
              type="button"
              className={formStyles.primaryButton}
              disabled={running || pending.length === 0 || (hasSameTitle && !acknowledged)}
              aria-busy={running}
              onClick={() => void register()}
            >
              {running ? '추가하는 중…' : failed.length > 0 ? `실패한 ${pending.length}개 다시 추가` : `${pending.length}개 추가`}
            </button>
          </>
        )
      }
    >
      {succeeded.length > 0 && (
        <div className={styles.resultBox} data-tone="ok">
          <p className={styles.resultTitle}>추가됨 {succeeded.length}개</p>
          <ul>
            {succeeded.map((result) => (
              <li key={result.key}>
                <Link to={schoolAssessmentDetailPath(result.assessment.assessmentId)}>{result.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {failed.length > 0 && pending.length > 0 && (
        <div className={styles.resultBox} data-tone="fail" role="alert">
          <p className={styles.resultTitle}>추가하지 못함 {failed.length}개</p>
          <ul>
            {failed.map((result) => (
              <li key={result.key}>
                {result.title} — {result.error.message} ({result.error.code})
              </li>
            ))}
          </ul>
        </div>
      )}
      {pending.length > 0 && (
        <>
          <p className={styles.stateText}>
            시작 전 상태로 추가돼요. 이름은 내 정정값을 쓰고, 학교 공통 문서는 바뀌지 않아요. 문서에 날짜가 없으니 마감일은 아는 경우에만 넣어 주세요.
          </p>
          <ul className={styles.confirmList}>
            {pending.map((candidate) => (
              <li key={candidate.key}>
                <span className={styles.itemTitle}>{candidate.title}</span>
                <span className={styles.itemMeta}>
                  {subjectName(candidate.subjectId)} · 반영 {valueOrMissing(candidate.item.weightPercent, '%')} · 시기 {valueOrMissing(candidate.item.timing)}
                </span>
                {candidate.duplicate?.kind === 'sameTitle' && (
                  <span className={styles.chip} data-tone="warn">
                    같은 이름의 수행평가가 이미 있어요 (자동으로 합치지 않아요)
                  </span>
                )}
                <label className={styles.deadlineField}>
                  <span>마감일 (선택)</span>
                  <input
                    type="date"
                    className={formStyles.input}
                    value={deadlines[candidate.key] ?? ''}
                    disabled={running}
                    onChange={(event) => setDeadlines((previous) => ({ ...previous, [candidate.key]: event.target.value }))}
                  />
                </label>
              </li>
            ))}
          </ul>
          {hasSameTitle && (
            <label className={styles.ackRow}>
              <input type="checkbox" checked={acknowledged} disabled={running} onChange={(event) => setAcknowledged(event.target.checked)} />
              같은 이름의 수행평가가 있는 걸 확인했고, 따로 추가할게요.
            </label>
          )}
        </>
      )}
    </Modal>
  )
}
