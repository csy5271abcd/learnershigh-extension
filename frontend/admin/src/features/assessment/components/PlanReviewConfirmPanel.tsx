import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { confirmPlanReview } from '../api/assessmentAdminApi.ts'
import { toApiError } from '../api/canonicalSource.ts'
import type { EvaluationPlanAnalysisView, PlanReviewConfirmRequest, ReviewFieldCandidate } from '../api/types.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { MultiformatReviewReadiness } from './MultiformatReviewReadiness.tsx'

// AD-04·05 검토 확정 (http 전용, §39 PUT review).
// 확정 버튼은 아래가 모두 갖춰질 때만 켜진다. 페이지를 열거나 AI 값이 있다는 이유만으로 확정하지 않는다.
//  1) 분석 결과(analysisId)가 있고 상태가 REVIEW_REQUIRED 또는 PARTIAL(부분 분석 — 6번 확인이 더 필요)
//  2) 관리자가 가진 원본 PDF의 SHA-256 = 서버가 저장한 checksum (2026-11-13부터 서버도 원문을 보관하지만, 이 확정 단계의 원본 대조 절차는 A4 검토 개편 전까지 그대로 둔다)
//  3) 확인할 필드를 하나 이상 고르고, 값이 있으면 근거 PDF 쪽(1~쪽 수)을 적음
//  4) 그 필드의 분석 과목마다 학업 과목 ID를 직접 입력 (과목명으로 추측·자동 선택하지 않는다. 서버가 문서 슬롯 과목인지 검증)
//  5) 관리자가 "원본과 대조했다"를 직접 체크
// HWP·HWPX(Phase B, 2026-11-11): 브라우저는 원본을 열지 못한다. 관리자가 한글 프로그램에서 아래 구조 위치(구역·표·행·열)를 직접 대조하고
// 필드마다 확인한 위치를 고른 뒤 명시적으로 체크한다. 서버는 SHA·Run·과목·근거 노드 Locator를 다시 검사하고,
// 실제 관리자 인증이 없으면(운영 기본) verified_auth_required로 거절한다 — Mock 관리자에게 운영 확정 권한이 없다.
//  6) PARTIAL이면 '일부만 분석됐고 빠진 부분은 확정하지 않는다'를 관리자가 직접 체크 (서버 검사 아님 · 화면 안전장치)
// 이미 확인 완료(CONFIRMED)된 Revision은 재검토 정책(이전 검토 대체 여부)이 미확정이라 이 화면에서 추가 확정하지 않는다.

type HashState = { status: 'none' } | { status: 'computing' } | { status: 'match' | 'mismatch'; hash: string } | { status: 'error'; message: string }

interface FieldInput {
  checked: boolean
  value: string
  page: string
  /** HWP·HWPX: 고른 근거 위치 번호(documentLocators 안) */
  locator: number
}

const reasonText: Record<string, string> = {
  verified_auth_required: '실제 관리자 인증이 연결되지 않아 HWP·HWPX 공식 확정을 서버가 거절했어요(운영 보호). 개발용 합성 시험 환경에서만 확정할 수 있어요.',
  document_mismatch: '고른 원본 파일의 SHA-256이 등록 문서와 달라요.',
  evidence_not_in_analysis: '고른 위치가 이 분석 결과의 해당 항목 근거가 아니에요.',
  evidence_scope_unavailable: '이 필드는 분석 결과에 구조 근거가 없어 확정할 수 없어요.',
  duplicate: '같은 필드를 두 번 확정하려고 했어요.',
  path_mismatch: '위치 정보(행·열)와 경로가 맞지 않아요.',
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
  const [localName, setLocalName] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [subjectIds, setSubjectIds] = useState<Record<number, string>>({})
  const [inputs, setInputs] = useState<Record<string, FieldInput>>(() =>
    Object.fromEntries(fields.map((field) => [fieldKey(field), { checked: false, value: field.candidate === null ? '' : String(field.candidate), page: field.sourcePages[0] ? String(field.sourcePages[0]) : '', locator: 0 }])),
  )
  const [attested, setAttested] = useState(false)
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
      setLocalName(null)
      return
    }
    setLocalName(file.name)
    setHash({ status: 'computing' })
    try {
      const value = await sha256Hex(file)
      setHash({ status: value === checksum ? 'match' : 'mismatch', hash: value })
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
  if (isPartial && !partialAcknowledged) blockers.push('부분 분석 결과예요. 빠진 과목·항목은 확정하지 않는다는 확인 체크가 필요해요.')
  if (data.reviewStatus === 'CONFIRMED') blockers.push('이미 확인 완료된 문서예요. 재검토(이전 확정 대체) 정책이 정해지지 않아 이 화면에서 추가 확정하지 않아요.')
  if (!checksum) blockers.push('서버에 원본 checksum이 없어 원본 대조를 할 수 없어요.')
  else if (hash.status !== 'match') blockers.push(`원본 ${documentFormat} 대조가 필요해요: 갖고 있는 학교 원본 파일을 골라 서버 checksum과 같은지 확인해 주세요.`)
  if (checked.length === 0) blockers.push('확인할 필드를 하나 이상 골라 주세요.')
  for (const index of usedSubjects) {
    if (!(subjectIds[index] ?? '').trim()) blockers.push(`'${subjects[index]?.subjectName ?? index}'의 학업 과목 ID를 입력해 주세요.`)
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
      setError(`${apiError.message} (${apiError.code})${reasons.length ? ` — ${reasons.join(', ')}` : ''}`)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const setInput = (field: ReviewFieldCandidate, patch: Partial<FieldInput>) =>
    setInputs((previous) => ({ ...previous, [fieldKey(field)]: { ...previous[fieldKey(field)], ...patch } }))

  return (
    <section className={styles.box} style={{ marginBottom: 12 }} aria-label="검토 확정" data-testid="review-confirm-panel">
      <h3 className={styles.sectionTitle}>검토 확정</h3>
      <p className={styles.muted}>공통 평가정보 확인이에요. 학생 과제 승인·반려가 아니에요. 확정해도 AI 후보 기록은 그대로 남아요.</p>
      {data.sourceReview && (
        <div className={styles.box} style={{ marginTop: 8 }} data-testid="review-source-record">
          <span className={styles.label}>원문 검토 기록</span>
          <p className={styles.cellSub}>
            {data.sourceReview.reviewedBy} · {new Date(data.sourceReview.reviewedAt).toLocaleString('ko-KR')} · 확정 {data.sourceReview.confirmedFieldCount}개 · 원본 SHA-256 {data.sourceReview.sourceCheckSha256.slice(0, 12)}… · 수동 대조 확인 {data.sourceReview.manualComparisonConfirmed ? '예' : '아니오'}
          </p>
          {data.sourceReview.reviewerAuth === 'MOCK_HEADER' && (
            <p className={styles.badge} data-tone="warning" data-testid="review-source-mock">개발용 Mock 관리자 기록 — 운영 검토 실적이 아니에요</p>
          )}
        </div>
      )}

      <div className={styles.field} style={{ marginTop: 10 }}>
        <label className={styles.label} htmlFor={ids.file}>
          1. 원본 {documentFormat} 대조 (서버 checksum {checksum ? `${checksum.slice(0, 12)}…` : '없음'}{pageCount ? ` · ${pageCount}쪽` : ''})
        </label>
        {!isPdf && (
          <p className={styles.badge} data-tone="warning" data-testid="review-format-experimental">
            {documentFormat} · 브라우저는 원본을 열지 않아요. 한글 프로그램에서 아래 위치를 직접 대조해 주세요. 실제 관리자 인증이 없으면 서버가 확정을 거절해요(개발 합성 시험에서만 허용).
          </p>
        )}
        <input
          id={ids.file}
          type="file"
          accept={isPdf ? 'application/pdf,.pdf' : documentFormat === 'HWP' ? '.hwp' : '.hwpx'}
          data-testid="review-local-pdf"
          onChange={(event) => pickFile(event.target.files?.[0])}
        />
        <p className={styles.hint} data-testid="review-hash-status">
          {hash.status === 'none' && '왼쪽에서 서버 원문을 볼 수 있어요. 확정 전에 갖고 있는 원본(또는 서버에서 내려받은 원본)을 고르면 이 브라우저에서만 SHA-256을 계산해 서버 checksum과 비교해요(파일을 보내지 않아요).'}
          {hash.status === 'computing' && '계산 중…'}
          {hash.status === 'match' &&
            (isPdf
              ? `일치: ${localName} — 등록된 문서와 같은 파일이에요. 아래에서 쪽을 확인하세요.`
              : `일치: ${localName} — 등록된 문서와 같은 파일이에요. 한글 프로그램에서 이 파일을 열어 아래 위치(구역·표·행·열)의 값을 직접 대조해 주세요. 해시 일치는 같은 파일이라는 뜻일 뿐, 원문을 대조했다는 증명이 아니에요.`)}
          {hash.status === 'mismatch' && `불일치: ${localName}의 SHA-256(${hash.hash.slice(0, 12)}…)이 등록 문서와 달라요. 이 파일로는 확정할 수 없어요.`}
          {hash.status === 'error' && `계산 실패: ${hash.message}`}
        </p>
        {objectUrl && <iframe title="원본 PDF (로컬 파일)" src={objectUrl} style={{ width: '100%', height: 420, border: '1px solid var(--as-color-border, #ddd)' }} />}
      </div>

      <div className={styles.field} style={{ marginTop: 12 }}>
        <span className={styles.label}>2. 학업 과목 연결 (직접 입력)</span>
        <p className={styles.hint}>
          관리자용 과목 목록 API가 아직 없어 과목 ID를 직접 입력해요. 과목명으로 자동 선택하지 않아요. 서버가 이 문서의 학교·학년도·학년·학기 과목인지 확인하고, 아니면 거절해요(지금 학업 정보 원천은 개발용 Mock).
        </p>
        {subjects.map((subject, index) => (
          <label key={`${subject.subjectName}-${index}`} className={styles.listRow} style={{ gap: 8 }}>
            <span style={{ minWidth: 180 }}>
              AI 분석 과목 <strong>{subject.subjectName}</strong>
              {subject.from ? ` · PDF ${subject.from}~${subject.to}쪽` : ''}
            </span>
            <input
              className={styles.input}
              style={{ maxWidth: 220 }}
              placeholder="학업 과목 ID (예: subj_…)"
              value={subjectIds[index] ?? ''}
              data-testid={`review-subject-id-${index}`}
              onChange={(event) => setSubjectIds((previous) => ({ ...previous, [index]: event.target.value }))}
            />
            <span className={styles.badge} data-tone={(subjectIds[index] ?? '').trim() ? undefined : 'warning'}>
              {(subjectIds[index] ?? '').trim() ? '입력됨 · 서버 확인 전' : '미연결'}
            </span>
          </label>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <span className={styles.label}>3. 확인할 필드 (값을 원본과 대조해 고칠 수 있어요. 빈 값 = 원문에 없음 확인)</span>
        <div className={styles.tableWrap}>
          <table className={styles.table} style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th scope="col">확인</th>
                <th scope="col">과목</th>
                <th scope="col">필드</th>
                <th scope="col">AI 후보</th>
                <th scope="col">확정할 값</th>
                <th scope="col">{isPdf ? '근거 PDF 쪽' : `근거 위치 (${documentFormat})`}</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => {
                const input = inputs[fieldKey(field)]
                return (
                  <tr key={fieldKey(field)} data-testid="review-field-row" data-field-path={field.fieldPath}>
                    <td>
                      <input type="checkbox" aria-label={`${field.label} 확인`} checked={input.checked} onChange={(event) => setInput(field, { checked: event.target.checked })} />
                    </td>
                    <td>{field.subjectName}</td>
                    <td>
                      {field.label}
                      <span className={styles.cellSub}>{field.fieldPath}</span>
                    </td>
                    <td>{field.candidate === null ? '미확인' : String(field.candidate)}</td>
                    <td>
                      <input className={styles.input} aria-label={`${field.label} 확정 값`} inputMode={field.kind === 'number' ? 'decimal' : undefined} value={input.value} disabled={!input.checked} onChange={(event) => setInput(field, { value: event.target.value })} />
                    </td>
                    <td>
                      {isPdf ? (
                        <>
                          <input className={styles.input} aria-label={`${field.label} 근거 쪽`} style={{ maxWidth: 80 }} inputMode="numeric" value={input.page} disabled={!input.checked} onChange={(event) => setInput(field, { page: event.target.value })} />
                          <span className={styles.cellSub}>{field.sourcePages.length ? `분석기 근거 ${field.sourcePages.join(', ')}쪽` : '분석기 근거 없음'}</span>
                        </>
                      ) : field.sourceLocators.length ? (
                        <ul className={styles.listPlain} data-testid="review-field-locators">
                          {field.sourceLocators.map((text, at) => (
                            <li key={`${text}-${at}`} className={styles.cellSub}>
                              <label>
                                <input
                                  type="radio"
                                  name={`locator-${fieldKey(field)}`}
                                  aria-label={`${field.label} 근거 위치 ${text}`}
                                  checked={input.locator === at}
                                  disabled={!input.checked}
                                  data-testid="review-locator-choice"
                                  onChange={() => setInput(field, { locator: at })}
                                />{' '}
                                {text}
                              </label>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className={styles.cellSub}>위치 근거 없음(확인 필요)</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className={styles.hint}>제출물·조건·채점 기준 같은 목록 값은 위 후보 표에서 볼 수 있지만 이번 화면의 확정 대상이 아니에요.</p>
      </div>

      <label className={styles.listRow} htmlFor={ids.attest} style={{ marginTop: 10, gap: 8, justifyContent: 'flex-start', textAlign: 'left' }}>
        <input id={ids.attest} type="checkbox" checked={attested} disabled={hash.status !== 'match'} data-testid="review-attest" onChange={(event) => setAttested(event.target.checked)} />
        {isPdf
          ? '4. 원본 PDF의 해당 쪽과 직접 대조했고, 고른 값을 공통 평가정보로 확정합니다.'
          : `4. 한글 프로그램에서 원본 ${documentFormat}를 열어 고른 위치의 원문과 값을 직접 대조했고, 고른 값을 공통 평가정보로 확정합니다.`}
      </label>

      {isPartial && (
        <label className={styles.listRow} style={{ marginTop: 6, gap: 8, justifyContent: 'flex-start', textAlign: 'left' }}>
          <input type="checkbox" checked={partialAcknowledged} data-testid="review-partial-ack" onChange={(event) => setPartialAcknowledged(event.target.checked)} />
          5. 부분 분석 결과임을 확인했어요. 고른 값만 원문과 대조해 확정하고, 분석되지 않은 과목·항목은 확정하지 않아요.
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
      <button type="button" className={styles.primaryButton} style={{ marginTop: 10 }} disabled={!canConfirm} aria-busy={pending} data-testid="review-confirm" onClick={confirm}>
        {pending ? '확정 중…' : '공통 평가정보 확정'}
      </button>
    </section>
  )
}
