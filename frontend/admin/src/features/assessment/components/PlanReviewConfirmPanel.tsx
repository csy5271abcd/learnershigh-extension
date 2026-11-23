import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { LocalOriginalPicker } from '../review/LocalOriginalPicker.tsx'
import type { HashState } from '../review/ConfirmStep.tsx'
import { confirmPlanReview, getPlanSubjects } from '../api/assessmentAdminApi.ts'
import { SubjectSearchSelect } from './SubjectSearchSelect.tsx'
import { toApiError } from '../api/canonicalSource.ts'
import type { EvaluationPlanAnalysisView, PlanReviewConfirmRequest, PlanSubjects, ReviewFieldCandidate } from '../api/types.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { MultiformatReviewReadiness } from './MultiformatReviewReadiness.tsx'
import { actorLabel } from '../model/actorLabel.ts'
import { ConfirmStepper } from '../review/ConfirmStepper.tsx'
import review from '../review/review.module.css'
import { devPanelEnabled } from '../../../../../student/src/features/assessment/dev/devContext.ts'

// AD-04·05 검토 확정 (http 전용, §39 PUT review).
// 확정 버튼은 아래가 모두 갖춰질 때만 켜진다. 페이지를 열거나 AI 값이 있다는 이유만으로 확정하지 않는다.
//  1) 분석 결과(analysisId)가 있고 상태가 REVIEW_REQUIRED 또는 PARTIAL(부분 분석 — 6번 확인이 더 필요)
//  2) 관리자가 가진 원본 PDF의 SHA-256 = 서버가 저장한 checksum (2026-11-13부터 서버도 원문을 보관하지만, 이 확정 단계의 원본 대조 절차는 A4 검토 개편 전까지 그대로 둔다)
//  3) 확인할 필드를 하나 이상 고르고, 값이 있으면 근거 PDF 쪽(1~쪽 수)을 적음
//  4) 그 필드의 분석 과목마다 학업 과목을 과목명으로 찾아 고름 (A27-UX: ID 직접 입력 없음. 자동 선택하지 않는다. 서버가 문서 슬롯 과목인지 검증)
//  5) 관리자가 "원본과 대조했다"를 직접 체크
// HWP·HWPX(Phase B, 2026-11-11): 브라우저는 원본을 열지 못한다. 관리자가 한글 프로그램에서 아래 구조 위치(구역·표·행·열)를 직접 대조하고
// 필드마다 확인한 위치를 고른 뒤 명시적으로 체크한다. 서버는 SHA·Run·과목·근거 노드 Locator를 다시 검사하고,
// 실제 관리자 인증이 없으면(운영 기본) verified_auth_required로 거절한다 — Mock 관리자에게 운영 확정 권한이 없다.
//  6) PARTIAL이면 '일부만 분석됐고 빠진 부분은 확정하지 않는다'를 관리자가 직접 체크 (서버 검사 아님 · 화면 안전장치)
// 이미 확인 완료(CONFIRMED)된 Revision은 재검토 정책(이전 검토 대체 여부)이 미확정이라 이 화면에서 추가 확정하지 않는다.


interface FieldInput {
  checked: boolean
  value: string
  page: string
  /** HWP·HWPX: 고른 근거 위치 번호(documentLocators 안) */
  locator: number
}

const reasonText: Record<string, string> = {
  verified_auth_required: '실제 관리자 인증이 연결되지 않아 HWP·HWPX 공식 확정을 서버가 거절했어요(운영 보호). 관리자 인증이 연결된 뒤 확정할 수 있어요.',
  document_mismatch: '고른 원본 파일의 SHA-256이 등록 문서와 달라요.',
  evidence_not_in_analysis: '고른 위치가 이 분석 결과의 해당 항목 근거가 아니에요.',
  evidence_scope_unavailable: '이 필드는 분석 결과에 구조 근거가 없어 확정할 수 없어요.',
  duplicate: '같은 필드를 두 번 확정하려고 했어요.',
  path_mismatch: '위치 정보(행·열)와 경로가 맞지 않아요.',
  grade_conflict: '원문상 이 문서 학년이 아닌 과목이에요. 다른 학년 학생에게 보이지 않게 확정할 수 없어요.',
}

const fieldKey = (field: ReviewFieldCandidate) => `${field.subjectIndex}|${field.fieldPath}`

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function PlanReviewConfirmPanel({ data, onConfirmed }: { data: EvaluationPlanAnalysisView; onConfirmed: (next: EvaluationPlanAnalysisView) => void }) {
  const ids = { file: useId(), attest: useId() }
  const fields = useMemo(() => data.reviewFields ?? [], [data.reviewFields])
  const subjects = data.subjectPages ?? []
  const checksum = data.revisionFile?.checksum ?? null
  const pageCount = data.revisionFile?.pageCount ?? null
  const documentFormat = data.revisionFile?.documentFormat ?? 'PDF'
  const isPdf = documentFormat === 'PDF'
  const [hash, setHash] = useState<HashState>({ status: 'none' })
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [subjectIds, setSubjectIds] = useState<Record<number, string>>({})
  const [subjectOptions, setSubjectOptions] = useState<PlanSubjects | null | 'error'>(null)
  useEffect(() => {
    let cancelled = false
    getPlanSubjects(data.planId).then(
      (value) => !cancelled && setSubjectOptions(value),
      () => !cancelled && setSubjectOptions('error'),
    )
    return () => {
      cancelled = true
    }
  }, [data.planId])
  const subjectItems = subjectOptions && subjectOptions !== 'error' && subjectOptions.available ? subjectOptions.items : []
  const [inputs, setInputs] = useState<Record<string, FieldInput>>(() =>
    Object.fromEntries(fields.map((field) => [fieldKey(field), { checked: false, value: field.candidate === null ? '' : String(field.candidate), page: field.sourcePages[0] ? String(field.sourcePages[0]) : '', locator: 0 }])),
  )
  const [attested, setAttested] = useState(false)
  const [sub, setSub] = useState(0)
  const isPartial = data.analysisStatus === 'PARTIAL'
  const [partialAcknowledged, setPartialAcknowledged] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pendingRef = useRef(false)

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }, [objectUrl])

  const pickFile = async (file: File | undefined) => {
    setAttested(false)
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    setObjectUrl(null)
    if (!file) {
      setHash({ status: 'none' })
      return
    }
    setHash({ status: 'computing' })
    try {
      const value = await sha256Hex(file)
      setHash({ status: value === checksum ? 'match' : 'mismatch', hash: value, fileName: file.name, sizeBytes: file.size })
      // 같은 PDF일 때만 브라우저 PDF 보기로 연다 (서버로 보내지 않는다). 브라우저는 HWP·HWPX를 바르게 열지 못해 열지 않는다.
      if (value === checksum && isPdf) setObjectUrl(URL.createObjectURL(file))
    } catch (cause) {
      setHash({ status: 'error', message: cause instanceof Error ? cause.message : '해시를 계산하지 못했어요.' })
    }
  }

  const checked = fields.filter((field) => inputs[fieldKey(field)]?.checked)
  const usedSubjects = [...new Set(checked.map((field) => field.subjectIndex))]

  const blockers: string[] = []
  if (!data.analysisId) blockers.push('받은 분석 결과가 없어요.')
  if (data.analysisStatus !== 'REVIEW_REQUIRED' && !isPartial) blockers.push(`검토할 수 있는 분석 상태가 아니에요 (${data.analysisStatus}).`)
  if (isPartial && !partialAcknowledged) blockers.push('부분 분석 결과예요.')
  if (data.reviewStatus === 'CONFIRMED') blockers.push('이미 확인 완료된 문서예요.')
  if (!checksum) blockers.push('서버에 원본 checksum이 없어 원본 대조를 할 수 없어요.')
  else if (hash.status !== 'match') blockers.push(`원본 ${documentFormat} 대조가 필요해요: 갖고 있는 학교 원본 파일을 골라 서버 checksum과 같은지 확인해 주세요.`)
  if (checked.length === 0) blockers.push('확인할 필드를 하나 이상 골라 주세요.')
  for (const index of usedSubjects) {
    if (!(subjectIds[index] ?? '').trim()) blockers.push(`'${subjects[index]?.subjectName ?? index}'의 학업 과목을 골라 주세요.`)
  }
  for (const field of checked) {
    const input = inputs[fieldKey(field)]
    const page = Number(input.page)
    if (!isPdf && field.documentLocators.length === 0) blockers.push(`${field.label}: 분석 결과에 원문 위치 근거가 없어 확정할 수 없어요.`)
    if (!isPdf && input.value.trim() !== '' && field.kind === 'number' && !Number.isFinite(Number(input.value))) blockers.push(`${field.label}: 숫자를 입력해 주세요.`)
    if (isPdf && input.value.trim() !== '') {
      if (field.kind === 'number' && !Number.isFinite(Number(input.value))) blockers.push(`${field.label}: 숫자를 입력해 주세요.`)
      if (!input.page || !Number.isInteger(page) || page < 1 || (pageCount !== null && page > pageCount)) {
        blockers.push(`${field.label}: 근거 PDF 쪽(1~${pageCount ?? '?'})을 적어 주세요.`)
      }
    }
  }
  if (!attested) blockers.push(isPdf ? '원본 PDF의 해당 쪽과 대조했다는 확인 체크가 필요해요.' : `한글 프로그램에서 원본 ${documentFormat}의 해당 위치와 직접 대조했다는 확인 체크가 필요해요.`)
  const canConfirm = blockers.length === 0 && !pending

  const confirm = async () => {
    if (!canConfirm || pendingRef.current || !data.analysisId) return
    pendingRef.current = true
    setPending(true)
    setError(null)
    const request: PlanReviewConfirmRequest = {
      analysisId: data.analysisId,
      decision: 'CONFIRM',
      reviewedSubjects: usedSubjects.map((index) => ({
        subjectId: subjectIds[index].trim(),
        // A10: PDF도 분석 과목 번호를 함께 확정한다 — 다과목 문서에서 초안이 닫혀도 과목 연결이 확정값에 남는다
        analysisSubjectIndex: index,
        confirmedFields: checked
          .filter((field) => field.subjectIndex === index)
          .map((field) => {
            const input = inputs[fieldKey(field)]
            const raw = input.value.trim()
            // 빈 값은 "원문에 없음을 확인"(null)이다. 0으로 바꾸지 않는다.
            const value = raw === '' ? null : field.kind === 'number' ? Number(raw) : raw
            if (!isPdf) {
              return {
                fieldPath: field.fieldPath,
                value,
                pdfPageNumber: null,
                documentLocator: field.documentLocators[input.locator] ?? field.documentLocators[0],
                ...(value === null ? { absence: 'NOT_IN_SOURCE' as const } : {}),
              }
            }
            return { fieldPath: field.fieldPath, value, pdfPageNumber: value === null ? (input.page ? Number(input.page) : null) : Number(input.page) }
          }),
      })),
      ...(isPdf || hash.status !== 'match'
        ? {}
        : { sourceCheck: { method: 'LOCAL_FILE_EXTERNAL_VIEWER' as const, localFileSha256: hash.hash, manualComparisonConfirmed: true as const } }),
    }
    try {
      onConfirmed(await confirmPlanReview(data.planId, data.documentRevisionId, request))
    } catch (cause) {
      const apiError = toApiError(cause)
      const reasons = Object.entries(apiError.fieldReasons()).map(([field, reason]) => `${field}: ${reasonText[reason] ?? reason}`)
      // 오류 코드·필드 경로는 진단 모드에서만 (일반 화면은 이유 문장만)
      setError(devPanelEnabled() ? `${apiError.message} (${apiError.code})${reasons.length ? ` — ${reasons.join(', ')}` : ''}` : `${apiError.message}${reasons.length ? ` — ${Object.values(apiError.fieldReasons()).map((reason) => reasonText[reason] ?? '입력값을 확인해 주세요.').join(' ')}` : ''}`)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const setInput = (field: ReviewFieldCandidate, patch: Partial<FieldInput>) =>
    setInputs((previous) => ({ ...previous, [fieldKey(field)]: { ...previous[fieldKey(field)], ...patch } }))

  // [15] A27-UX: 한 화면에 몰려 있던 1~4를 세부 단계로 나눈다. 단계 이동은 입력값을 지우지 않고, 확정 조건(blockers)·서버 검증은 그대로다.
  const subjectGroups = subjects.map((subject, index) => ({ subject, index, fields: fields.filter((field) => field.subjectIndex === index) })).filter((group) => group.fields.length > 0)
  const linkedCount = usedSubjects.filter((index) => (subjectIds[index] ?? '').trim()).length
  const steps = [
    { title: `원본 ${documentFormat} 대조`, description: hash.status === 'match' ? '등록 문서와 같은 파일' : hash.status === 'mismatch' ? '다른 파일이에요' : '원본 파일을 골라 주세요', ready: hash.status === 'match' },
    { title: '학업 과목 연결', description: usedSubjects.length === 0 ? `${subjects.length}개 과목 · 확정할 값을 먼저 골라도 돼요` : `${linkedCount}/${usedSubjects.length}개 과목 연결`, ready: usedSubjects.length > 0 && linkedCount === usedSubjects.length },
    { title: '필드별 검토', description: `확정 대상 ${checked.length} / 전체 ${fields.length}`, ready: checked.length > 0 },
    { title: '요약 및 최종 확정', description: blockers.length === 0 ? '확정할 수 있어요' : `남은 조건 ${blockers.length}개`, ready: blockers.length === 0 },
  ]

  return (
    <section className={styles.box} style={{ marginBottom: 12 }} aria-label="검토 확정" data-testid="review-confirm-panel">
      <h3 className={styles.sectionTitle}>검토 확정</h3>
      <p className={styles.muted}>공통 평가정보 확인이에요. 학생 과제 승인·반려가 아니에요. 확정해도 AI 후보 기록은 그대로 남아요.</p>
      {data.sourceReview && (
        <div className={styles.box} style={{ marginTop: 8 }} data-testid="review-source-record">
          <span className={styles.label}>원문 검토 기록</span>
          <p className={styles.cellSub}>
            {actorLabel(data.sourceReview.reviewedBy)} · {new Date(data.sourceReview.reviewedAt).toLocaleString('ko-KR')} · 확정 {data.sourceReview.confirmedFieldCount}개 · 수동 대조 확인 {data.sourceReview.manualComparisonConfirmed ? '예' : '아니오'}
          </p>
          {data.sourceReview.reviewerAuth === 'MOCK_HEADER' && (
            <p className={styles.badge} data-testid="review-source-mock">시험 환경에서 남긴 기록이에요</p>
          )}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <ConfirmStepper steps={steps} current={sub} onSelect={setSub}>
          <div className={review.quizHead}>
            <span className={review.quizCount} data-testid="review-structured-substep">
              {sub + 1} / 4
            </span>
            <h4 className={review.title} style={{ fontSize: 18 }}>
              {steps[sub].title}
            </h4>
          </div>

          <div className={review.quizCard}>
            {sub === 0 && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor={ids.file}>
                  갖고 있는 학교 원본이 등록된 문서와 같은 파일인가요?{pageCount ? ` (등록 문서 ${pageCount}쪽)` : ''}
                </label>
                {!isPdf && (
                  <p className={styles.badge} data-tone="warning" data-testid="review-format-experimental">
                    {documentFormat} 원본은 한글 프로그램에서 다음 단계의 위치를 직접 대조해 주세요. 관리자 인증이 확인되지 않으면 서버가 확정을 거절해요.
                  </p>
                )}
                <LocalOriginalPicker hash={hash} onPickFile={pickFile} format={isPdf ? 'PDF' : documentFormat === 'HWP' ? 'HWP' : 'HWPX'} inputId={ids.file} />
                <p className={styles.hint}>
                  {hash.status === 'match' && !isPdf
                    ? '한글 프로그램에서 이 파일을 열어 필드별 검토 단계의 위치(구역·표·행·열)를 직접 대조해 주세요. 같은 파일이라는 확인일 뿐, 원문을 대조했다는 증명은 아니에요.'
                    : hash.status === 'match'
                      ? '필드별 검토 단계에서 쪽을 확인하세요.'
                      : '갖고 있는 원본(또는 서버에서 내려받은 원본)을 고르면 이 브라우저에서만 비교해요(파일을 보내지 않아요).'}
                </p>
                {objectUrl && <iframe title="원본 PDF (로컬 파일)" src={objectUrl} style={{ width: '100%', height: 420, border: '1px solid var(--as-color-line)' }} />}
              </div>
            )}

            {sub === 1 && (
              <div className={styles.field}>
                <p className={styles.hint}>AI가 찾은 과목마다 이 문서 학년·학기의 학업 과목을 과목명으로 찾아 골라 주세요.</p>
                {subjectOptions === 'error' || (subjectOptions !== null && !subjectOptions.available) ? (
                  <p className={styles.hint} role="alert" data-testid="review-subjects-unavailable">
                    이 학년·학기의 학업 과목 목록을 불러오지 못해 과목을 연결할 수 없어요. 새로고침해 다시 시도해 주세요.
                  </p>
                ) : null}
                {subjects.map((subject, index) => (
                  <div key={`${subject.subjectName}-${index}`} className={styles.listRow} style={{ gap: 8 }}>
                    <span style={{ minWidth: 180 }}>
                      AI 분석 과목 <strong>{subject.subjectName}</strong>
                      {usedSubjects.includes(index) && <span className={styles.cellSub}>확정할 값이 있는 과목</span>}
                    </span>
                    <SubjectSearchSelect
                      options={subjectItems}
                      value={subjectIds[index] ?? ''}
                      onChange={(value) => setSubjectIds((previous) => ({ ...previous, [index]: value }))}
                      label={`${subject.subjectName} 학업 과목`}
                      catalogGrade={data.slot?.grade ?? null}
                      testId={`review-subject-select-${index}`}
                    />
                    <span className={styles.badge}>{(subjectIds[index] ?? '').trim() ? '연결됨' : '미연결'}</span>
                  </div>
                ))}
              </div>
            )}

            {sub === 2 && (
              <div className={styles.field}>
                <p className={styles.hint}>
                  필드마다 원문과 대조한 뒤 &lsquo;확정 대상에 넣기&rsquo;를 눌러요. 값을 고칠 수 있고, 빈 값은 &lsquo;원문에 없음 확인&rsquo;이에요.
                </p>
                <div className={review.quizStats}>
                  <span>
                    <strong>{checked.length}</strong>확정 대상
                  </span>
                  <span>
                    <strong>{fields.length - checked.length}</strong>남은 필드
                  </span>
                  <span>
                    <strong>{subjectGroups.length}</strong>과목
                  </span>
                </div>
                {subjectGroups.length > 1 && (
                  <nav className={review.subjectJump} aria-label="과목으로 이동">
                    {subjectGroups.map((group) => (
                      <a key={group.index} className={`${review.button} ${review.small}`} href={`#confirm-subject-${group.index}`}>
                        {group.subject.subjectName} {group.fields.filter((field) => inputs[fieldKey(field)]?.checked).length}/{group.fields.length}
                      </a>
                    ))}
                  </nav>
                )}
                <div className={review.fieldGroups}>
                  {subjectGroups.map((group) => (
                    <section key={group.index} id={`confirm-subject-${group.index}`} aria-label={`${group.subject.subjectName} 필드`}>
                      <h5 className={review.fieldGroupHead}>
                        {group.subject.subjectName}
                        <span className={styles.cellSub}>
                          {group.fields.filter((field) => inputs[fieldKey(field)]?.checked).length} / {group.fields.length}
                        </span>
                      </h5>
                      <ul className={review.fieldCards}>
                        {group.fields.map((field) => {
                          const input = inputs[fieldKey(field)]
                          return (
                            <li key={fieldKey(field)} className={review.fieldCard} data-checked={input.checked || undefined} data-testid="review-field-row" data-field-path={field.fieldPath}>
                              <div className={review.fieldCardHead}>
                                <span className={review.fieldCardTitle}>
                                  <strong>{field.label}</strong>
                                  <span>AI 후보 {field.candidate === null ? '미확인' : String(field.candidate)}</span>
                                </span>
                                <button type="button" className={review.fieldToggle} aria-pressed={input.checked} aria-label={`${field.label} 확인`} onClick={() => setInput(field, { checked: !input.checked })}>
                                  {input.checked ? '✓ 확정 대상' : '확정 대상에 넣기'}
                                </button>
                              </div>
                              {input.checked && (
                                <div className={review.fieldCardBody}>
                                  <label className={styles.field}>
                                    <span className={styles.label}>확정할 값</span>
                                    <input className={styles.input} aria-label={`${field.label} 확정 값`} inputMode={field.kind === 'number' ? 'decimal' : undefined} value={input.value} placeholder="빈 값 = 원문에 없음" onChange={(event) => setInput(field, { value: event.target.value })} />
                                  </label>
                                  <div className={styles.field}>
                                    <span className={styles.label}>{isPdf ? '근거 PDF 쪽' : `대조한 위치 (${documentFormat})`}</span>
                                    {isPdf ? (
                                      <>
                                        <input className={styles.input} aria-label={`${field.label} 근거 쪽`} style={{ maxWidth: 100 }} inputMode="numeric" value={input.page} onChange={(event) => setInput(field, { page: event.target.value })} />
                                        <span className={styles.cellSub}>{field.sourcePages.length ? `분석기 근거 ${field.sourcePages.join(', ')}쪽` : '분석기 근거 없음'}</span>
                                      </>
                                    ) : field.sourceLocators.length ? (
                                      <ul className={review.locatorChoices} data-testid="review-field-locators">
                                        {field.sourceLocators.map((text, at) => (
                                          <li key={`${text}-${at}`}>
                                            <label>
                                              <input type="radio" name={`locator-${fieldKey(field)}`} aria-label={`${field.label} 근거 위치 ${text}`} checked={input.locator === at} data-testid="review-locator-choice" onChange={() => setInput(field, { locator: at })} />
                                              {text}
                                            </label>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <span className={styles.cellSub}>위치 근거 없음 — 이 필드는 확정할 수 없어요</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
                <p className={styles.hint}>제출물·조건·채점 기준 같은 목록 값은 후보 표에서 볼 수 있지만 이번 화면의 확정 대상이 아니에요.</p>
              </div>
            )}

            {sub === 3 && (
              <div className={styles.field}>
                <dl className={review.quizSummary}>
                  <div>
                    <dt>원본 대조</dt>
                    <dd>{hash.status === 'match' ? '등록 문서와 같은 파일' : '아직 확인하지 않음'}</dd>
                  </div>
                  <div>
                    <dt>과목 연결</dt>
                    <dd>{usedSubjects.length === 0 ? '없음' : usedSubjects.map((index) => `${subjects[index]?.subjectName ?? '과목'} → ${subjectItems.find((item) => item.subjectId === subjectIds[index])?.name ?? (subjectIds[index] ? '연결됨' : '미연결')}`).join(' · ')}</dd>
                  </div>
                  <div>
                    <dt>확정할 값</dt>
                    <dd>
                      {checked.length}개 공개 · 나머지 {fields.length - checked.length}개 비공개
                    </dd>
                  </div>
                </dl>
                <label className={review.quizCheck} htmlFor={ids.attest} data-disabled={hash.status !== 'match' || undefined}>
                  <input id={ids.attest} type="checkbox" checked={attested} disabled={hash.status !== 'match'} data-testid="review-attest" onChange={(event) => setAttested(event.target.checked)} />
                  {isPdf ? '원본 PDF의 해당 쪽과 직접 대조했고, 고른 값을 공통 평가정보로 확정합니다.' : `한글 프로그램에서 원본 ${documentFormat}를 열어 고른 위치의 원문과 값을 직접 대조했고, 고른 값을 공통 평가정보로 확정합니다.`}
                </label>
                {isPartial && (
                  <label className={review.quizCheck}>
                    <input type="checkbox" checked={partialAcknowledged} data-testid="review-partial-ack" onChange={(event) => setPartialAcknowledged(event.target.checked)} />
                    부분 분석 결과임을 확인했어요.
                  </label>
                )}
                {!isPdf && (
                  <MultiformatReviewReadiness
                    documentFormat={documentFormat}
                    fileSelected={hash.status !== 'none'}
                    hashMatches={hash.status === 'match'}
                    subjectIdEntered={usedSubjects.length > 0 && usedSubjects.every((index) => (subjectIds[index] ?? '').trim() !== '')}
                    fieldsChecked={checked.length}
                    fieldsWithLocator={checked.filter((field) => field.documentLocators.length > 0).length}
                    analysisId={data.analysisId ?? null}
                    attested={attested}
                  />
                )}
                {blockers.length > 0 && (
                  <ul className={styles.listPlain} aria-label="확정할 수 없는 이유" data-testid="review-blockers" style={{ marginTop: 8 }}>
                    {blockers.map((reason) => (
                      <li key={reason} className={styles.muted}>
                        · {reason}
                      </li>
                    ))}
                  </ul>
                )}
                {error && (
                  <p className={styles.formError} role="alert" data-testid="review-error">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className={review.quizNav}>
            <button type="button" className={review.buttonGhost} onClick={() => setSub(Math.max(0, sub - 1))} disabled={sub === 0} data-testid="review-structured-prev">
              이전
            </button>
            {sub < 3 ? (
              <button type="button" className={review.button} onClick={() => setSub(sub + 1)} data-testid="review-structured-next">
                다음
              </button>
            ) : (
              <button type="button" className={review.buttonPrimary} disabled={!canConfirm} aria-busy={pending} data-testid="review-confirm" onClick={confirm}>
                {pending ? '확정 중…' : '공통 평가정보 확정'}
              </button>
            )}
          </div>
        </ConfirmStepper>
      </div>
    </section>
  )
}
