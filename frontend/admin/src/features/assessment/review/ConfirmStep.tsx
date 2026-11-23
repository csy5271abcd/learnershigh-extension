import { useEffect, useState } from 'react'
import { navigate } from '../../../app/adminLocation.ts'
import { getPlanSubjects } from '../api/assessmentAdminApi.ts'
import { SubjectSearchSelect, type SubjectOption } from '../components/SubjectSearchSelect.tsx'
import { paths } from '../routes/paths.ts'
import { ReReviewPanel } from './ReReviewPanel.tsx'
import { LocalOriginalPicker } from './LocalOriginalPicker.tsx'
import type { EvaluationPlanAnalysisView } from '../api/types.ts'
import { PlanReviewConfirmPanel } from '../components/PlanReviewConfirmPanel.tsx'
import { displayValue, fieldKey, fieldName, gradeConflict, gradeText, type Decision, type StepId } from './reviewModel.ts'
import { ConfirmStepper } from './ConfirmStepper.tsx'
import { FinalApprovalPanel } from './FinalApprovalPanel.tsx'
import type { FinalApprovalPlan } from './finalApproval.ts'
import styles from './review.module.css'

export type HashState = { status: 'none' } | { status: 'computing' } | { status: 'match' | 'mismatch'; hash: string; fileName: string; sizeBytes: number } | { status: 'error'; message: string }

// 5단계 최종 검토·확정. A27-UX: 한 화면의 긴 목록 대신 Daglo 퀴즈처럼 4단계(원본 대조 → 과목 연결 → 검토 결과 확인 → 확정)로 넘긴다.
// 확정 조건(원문 동일 확인 · 과목 연결 · 근거 쪽 · 부분 분석 확인 · 원문 대조 확인)과 서버 검증은 그대로다. 단계 사이 입력값은 Workspace 상태·서버 초안에 남는다.
// 확정은 공통 평가정보 확인이지 학생 과제 승인·반려가 아니다. 확정한 값만 학생에게 공개된다.
export function ConfirmStep({
  view,
  decisions,
  excludedSubjects,
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
  onSubjectId,
  onConfirm,
  pending,
  bulk,
  approval,
}: {
  view: EvaluationPlanAnalysisView
  decisions: Record<string, Decision>
  /** A27-UX: 이 문서 검토 대상에서 뺀 분석 과목 (decisions는 이미 그 과목을 뺀 유효 결정) */
  excludedSubjects?: ReadonlySet<number>
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
  onSubjectId: (index: number, value: string) => void
  onConfirm: () => void
  pending: boolean
  /** 부록 O §39-13 검증 가능한 후보 한 번에 확정(관리자 명시적 1회 동작) */
  bulk?: BulkConfirm
  /** A28-05: 학교알리미 공식 수집 원본이면 원클릭 최종 승인(서버 원본 검증). 있으면 단계별 확정 대신 이 패널 */
  approval?: { plan: FinalApprovalPlan; onConfirmed: (next: EvaluationPlanAnalysisView) => void }
}) {
  const format = view.revisionFile?.documentFormat ?? 'PDF'
  const [sub, setSub] = useState(0)
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[] | null>(null)
  useEffect(() => {
    let cancelled = false
    getPlanSubjects(view.planId).then(
      (data) => !cancelled && setSubjectOptions(data.available ? data.items : []),
      () => !cancelled && setSubjectOptions([]),
    )
    return () => {
      cancelled = true
    }
  }, [view.planId])
  if (view.reviewStatus === 'CONFIRMED' && !reopened) {
    return (
      <>
        <ConfirmedSummary view={view} />
        {/* A28-08: 평가 정보만 확정되고 월별 운영계획이 남았으면 운영계획만 최종 승인 */}
        {approval?.plan.teachingOnlyRequest && (
          <FinalApprovalPanel view={view} plan={approval.plan} reopened={false} onGoSubjects={() => onGo('subjects')} onConfirmed={approval.onConfirmed} />
        )}
        {format === 'PDF' && onReopen && <ReReviewPanel planId={view.planId} revisionId={view.documentRevisionId} onReopen={onReopen} reopened={reopened} />}
      </>
    )
  }

  if (approval) {
    return <FinalApprovalPanel view={view} plan={approval.plan} reopened={reopened} onGoSubjects={() => onGo('subjects')} onConfirmed={approval.onConfirmed} />
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

  // A28-03: 최종 승인(기본 승인 포함)이 가능하면 화면의 값·과목 연결·공개 수는 최종 승인 대상 기준으로 보인다.
  // '확인·수정한 값만 확정'(보조 버튼)은 기존 결정(decisions)만 보낸다 — 표시만 바뀌고 요청 규칙은 그대로다.
  const shown = bulk ? bulk.merged : decisions
  const fields = (view.reviewFields ?? []).filter((field) => shown[fieldKey(field)])
  const usedSubjects = [...new Set(fields.map((field) => field.subjectIndex))]
  const subjectsLinked = usedSubjects.length > 0 && usedSubjects.every((index) => (subjectIds[index] ?? '').trim() !== '')
  const conflicts = usedSubjects.filter((index) => gradeConflict(view.subjectGrades?.[index] ?? null, view.slot?.grade))
  // 검토 대상 = 제외 과목을 뺀 후보 필드 (제외는 따로 센다 — 검토 완료로 세지 않는다)
  const total = (view.reviewFields ?? []).filter((field) => !excludedSubjects?.has(field.subjectIndex)).length
  const excludedCount = excludedSubjects?.size ?? 0
  const partial = view.analysisStatus === 'PARTIAL'
  const missingPage = fields.filter((field) => shown[fieldKey(field)].kind !== 'absent' && !shown[fieldKey(field)].page)
  const nameOf = (subjectId: string) => subjectOptions?.find((item) => item.subjectId === subjectId)?.name ?? null
  const finalBlockers = bulk ? bulk.blockers : blockers
  const pendingCount = bulk?.pendingCount ?? 0
  const ready = [hash.status === 'match', subjectsLinked && conflicts.length === 0, fields.length > 0 && pendingCount === 0 && (!partial || partialAcknowledged), finalBlockers.length === 0]
  const titles = ['원본 문서 대조', '학업 과목 연결', '검토 결과 확인', '최종 승인']

  return (
    <div data-testid="review-step-confirm">
      <ConfirmStepper
        current={sub}
        onSelect={setSub}
        steps={[
          { title: titles[0], description: hash.status === 'match' ? '등록 문서와 같은 파일' : hash.status === 'mismatch' ? '다른 파일이에요' : '원본 파일을 골라 주세요', ready: ready[0] },
          { title: titles[1], description: usedSubjects.length === 0 ? '확인한 과목 없음' : `${usedSubjects.filter((index) => (subjectIds[index] ?? '').trim()).length}/${usedSubjects.length}개 과목 연결${conflicts.length ? ` · 학년 불일치 ${conflicts.length}` : ''}`, ready: ready[1] },
          { title: titles[2], description: bulk ? `승인 대상 ${fields.length}개 · 확인 필요 ${pendingCount}개` : `확정할 값 ${fields.length}개 · 미확인 ${Math.max(0, total - fields.length)}개`, ready: ready[2] },
          { title: titles[3], description: finalBlockers.length === 0 ? '최종 승인할 수 있어요' : `남은 조건 ${finalBlockers.length}개`, ready: ready[3] },
        ]}
      >
      <div className={styles.quizHead}>
        <span className={styles.quizCount} data-testid="review-confirm-substep">
          {sub + 1} / 4
        </span>
        <h3 className={styles.title}>{titles[sub]}</h3>
      </div>
      <div className={styles.quizCard}>
        {sub === 0 && (
          <>
            <p className={styles.quizQuestion}>갖고 있는 학교 원본이 등록된 문서와 같은 파일인가요?</p>
            <p className={styles.muted}>파일은 서버로 보내지 않고 이 브라우저에서만 SHA-256을 계산해 비교해요.</p><LocalOriginalPicker hash={hash} onPickFile={onPickFile} />
          </>
        )}

        {sub === 1 && (
          <>
            <p className={styles.quizQuestion}>확정할 과목을 학업 과목과 연결해 주세요</p>
            {usedSubjects.length === 0 ? (
              <p className={styles.muted}>아직 확인한 과목이 없어요. 수행평가 검토에서 값을 먼저 확인해 주세요.</p>
            ) : subjectOptions === null ? (
              <p className={styles.muted}>학업 과목 목록을 불러오는 중이에요.</p>
            ) : subjectOptions.length === 0 ? (
              <p className={styles.muted} role="alert" data-testid="review-subjects-unavailable">
                이 학년·학기의 학업 과목 목록을 불러오지 못해 과목을 연결할 수 없어요.
              </p>
            ) : (
              <ul className={styles.rows}>
                {usedSubjects.map((index) => {
                  const grades = view.subjectGrades?.[index] ?? null
                  const conflict = gradeConflict(grades, view.slot?.grade)
                  return (
                    <li key={index} className={styles.row} data-testid="review-confirm-subject">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span className={styles.rowValue}>{view.subjects[index]?.subjectName ?? '과목'}</span>
                        <span className={styles.tiny} style={{ display: 'block' }}>
                          AI가 찾은 과목{gradeText(grades) ? ` · 원문 ${gradeText(grades)}` : ''}
                        </span>
                        {conflict && (
                          <div className={styles.blockedNote} role="note" data-testid="review-subject-grade-conflict">
                            <strong>확정할 수 없어요 · 학년이 달라요</strong>
                            <span>
                              이 문서는 {view.slot?.grade}학년으로 등록됐지만 원문상 {gradeText(grades)} 과목이에요.
                            </span>
                          </div>
                        )}
                      </div>
                      <SubjectSearchSelect
                        options={subjectOptions}
                        value={subjectIds[index] ?? ''}
                        onChange={(value) => onSubjectId(index, value)}
                        label={`${view.subjects[index]?.subjectName ?? '과목'} 학업 과목`}
                        context={view.slot ? `고${view.slot.grade} · ${view.slot.semester}학기` : undefined}
                        catalogGrade={view.slot?.grade ?? null}
                        testId={`review-confirm-subject-select-${index}`}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}

        {sub === 2 && (
          <>
            <p className={styles.quizQuestion}>{bulk ? '최종 승인될 값을 확인해 주세요' : '확정할 값을 확인해 주세요'}</p>
            <div className={styles.quizStats}>
              <span>
                <strong>{fields.length}</strong>
                {bulk ? '승인 대상' : '확정할 값'}
              </span>
              <span>
                <strong>{bulk ? pendingCount : Math.max(0, total - fields.length)}</strong>
                {bulk ? '확인 필요 · 먼저 해결' : '미확인 · 학생 비공개'}
              </span>
              {excludedCount > 0 && (
                <span data-testid="review-confirm-excluded">
                  <strong>{excludedCount}</strong>제외한 과목
                </span>
              )}
              <span>
                <strong>{missingPage.length}</strong>근거 쪽 없음
              </span>
            </div>
            {fields.length === 0 ? (
              <p className={styles.muted}>{bulk ? '승인할 수 있는 값이 없어요. 수행평가 검토에서 확인 필요 항목을 먼저 해결해 주세요.' : '수행평가 검토에서 ‘확인’ 또는 ‘수정’으로 값을 골라 주세요.'}</p>
            ) : (
              <div className={styles.quizTableWrap}>
                <table className={styles.table} data-testid="review-confirm-values">
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
                      const decision = shown[fieldKey(field)]
                      const byDefault = Boolean(bulk) && !decisions[fieldKey(field)]
                      return (
                        <tr key={fieldKey(field)}>
                          <td>{field.subjectName}</td>
                          <td>{fieldName(field, view)}</td>
                          <td>
                            {decision.kind === 'absent' ? '원문에 없음' : displayValue(decision.value, field.fieldPath)}
                            {decision.kind === 'edited' && <span className={styles.tiny}> · 관리자 수정</span>}
                            {byDefault && <span className={styles.tiny}> · 기본 승인</span>}
                          </td>
                          <td>{decision.page ? `${decision.page}쪽` : decision.kind === 'absent' ? '-' : '쪽 없음'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <button type="button" className={styles.link} onClick={() => onGo('performance')}>
              수행평가 검토로 돌아가기
            </button>
            {partial && (
              <label className={styles.quizCheck}>
                <input type="checkbox" checked={partialAcknowledged} onChange={(event) => onPartialAck(event.target.checked)} data-testid="review-partial-ack" />
                일부만 분석된 결과예요.
              </label>
            )}
          </>
        )}

        {sub === 3 && (
          <>
            <p className={styles.quizQuestion}>{bulk ? '이 내용으로 최종 승인할까요?' : '이 내용으로 확정할까요?'}</p>
            <dl className={styles.quizSummary}>
              <div>
                <dt>문서</dt>
                <dd>
                  {view.slot ? `${view.slot.academicYear}학년도 고${view.slot.grade} ${view.slot.semester}학기 · ` : ''}
                  {view.revisionFile?.fileName ?? '평가계획서'}
                </dd>
              </div>
              <div>
                <dt>원본 대조</dt>
                <dd>{hash.status === 'match' ? '등록 문서와 같은 파일' : '아직 확인하지 않음'}</dd>
              </div>
              <div>
                <dt>과목 연결</dt>
                <dd>
                  {usedSubjects.length === 0
                    ? '없음'
                    : usedSubjects.map((index) => `${view.subjects[index]?.subjectName ?? '과목'} → ${subjectIds[index] ? (nameOf(subjectIds[index]) ?? '연결됨') : '미연결'}`).join(' · ')}
                </dd>
              </div>
              <div>
                <dt>학생 공개</dt>
                <dd>
                  {bulk ? `최종 승인 뒤 ${fields.length}개 값 공개 · 승인 전에는 이전 확정본만 공개` : `확정값 ${fields.length}개 공개 · 미확인 ${Math.max(0, total - fields.length)}개 비공개`}
                </dd>
              </div>
            </dl>
            <label className={styles.quizCheck} data-disabled={hash.status !== 'match' || undefined}>
              <input type="checkbox" checked={attested} disabled={hash.status !== 'match'} onChange={(event) => onAttest(event.target.checked)} data-testid="review-attest" />
              {bulk ? '원문과 대조했고, 기본 승인 값과 수정한 값을 공통 평가정보로 확정합니다.' : '확인한 값을 원문 해당 쪽과 직접 대조했고, 공통 평가정보로 확정합니다.'}
            </label>
            {!bulk && blockers.length > 0 && (
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
          </>
        )}
      </div>

      <div className={styles.quizNav}>
        <button type="button" className={styles.buttonGhost} onClick={() => setSub(Math.max(0, sub - 1))} disabled={sub === 0} data-testid="review-confirm-prev">
          이전
        </button>
        {sub < 3 ? (
          <button type="button" className={styles.button} onClick={() => setSub(sub + 1)} data-testid="review-confirm-next">
            다음
          </button>
        ) : (
          <button
            type="button"
            className={bulk ? styles.button : styles.buttonPrimary}
            onClick={onConfirm}
            disabled={blockers.length > 0 || pending}
            aria-busy={pending}
            data-testid="review-confirm"
          >
            {pending ? '확정하는 중…' : bulk ? '확인·수정한 값만 확정' : reopened ? '다시 확정하고 학생에게 공개' : '확정하고 학생에게 공개'}
          </button>
        )}
      </div>
      {sub === 3 && bulk && <BulkConfirmPanel bulk={bulk} pending={pending} reopened={reopened} />}
      </ConfirmStepper>
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
        <button type="button" className={styles.button} style={{ marginTop: 10 }} onClick={() => navigate(paths.planResult(view.planId, view.documentRevisionId))} data-testid="review-open-result">
          확정 결과 보기
        </button>
      </div>
      <table className={styles.table} data-testid="confirmed-fields">
        <thead>
          <tr>
            <th scope="col">과목</th>
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
                <td>{candidate?.subjectName ?? '과목'}</td>
                <td>{candidate ? fieldName(candidate, view) : field.fieldPath}</td>
                <td>{field.value === null ? '원문에 없음(확인)' : displayValue(field.value, field.fieldPath)}</td>
                <td>{field.pdfPageNumber ? `${field.pdfPageNumber}쪽` : field.documentLocatorText ?? '-'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export interface BulkConfirm {
  /** A28-03 최종 승인에 들어갈 결정(관리자 결정 + 기본 승인) */
  merged: Record<string, Decision>
  defaulted: number
  edited: number
  absent: number
  confirmed: number
  pendingCount: number
  /** 제외한 과목의 후보 수(검토 대상에서 빠짐) */
  excludedFields: number
  blockers: string[]
  checksum: string | null
  revisionNumber: number | null
  onConfirm: () => void
}

/**
 * A28-03 최종 승인 (부록 O §39-13 한 번에 확정 요청 그대로 · 관리자가 직접 누르는 1회 동작이며 자동 확정이 아니다).
 * 값·근거가 있는 AI 후보는 기본 승인으로 들어가고, 관리자 수정·원문에 없음·과목 제외는 그대로 지킨다.
 * 확인 필요 항목이 남았거나 원문 대조 등 기존 확정 조건이 안 맞으면 누를 수 없다(이유 표시). 서버가 같은 검사를 다시 한다.
 */
function BulkConfirmPanel({ bulk, pending, reopened }: { bulk: BulkConfirm; pending: boolean; reopened: boolean }) {
  const total = bulk.defaulted + bulk.edited + bulk.absent + bulk.confirmed
  return (
    <section className={styles.bulkPanel} aria-labelledby="bulk-confirm-title" data-testid="bulk-confirm">
      <h4 id="bulk-confirm-title">{reopened ? '수정 내용 최종 승인' : '최종 승인'}</h4>
      <p className={styles.muted}>
        AI 추출값은 기본 승인으로 넣고, 관리자가 고친 값·&lsquo;원문에 없음&rsquo;·제외한 과목은 그대로 지켜요. 최종 승인하면 이 값만 학생에게 공개돼요
        {reopened ? '(그 전까지는 이전 확정본이 그대로 보여요)' : ''}.
      </p>
      <ul className={styles.bulkSummary} data-testid="bulk-confirm-summary">
        <li>
          최종 승인 대상 <strong data-testid="bulk-confirm-total">{total}</strong>개
        </li>
        <li>
          기본 승인(AI 값 그대로) <strong data-testid="bulk-confirm-default">{bulk.defaulted}</strong>
        </li>
        <li>
          관리자 수정 <strong data-testid="bulk-confirm-edited">{bulk.edited}</strong> · 직접 확인 <strong>{bulk.confirmed}</strong> · 원문에 없음 <strong>{bulk.absent}</strong>
        </li>
        <li data-attention={bulk.pendingCount > 0 || undefined}>
          확인 필요(값·근거 없음) <strong data-testid="bulk-confirm-pending">{bulk.pendingCount}</strong>
        </li>
        {bulk.excludedFields > 0 && (
          <li>
            제외한 과목 항목 <strong>{bulk.excludedFields}</strong> · 확정·공개 안 함
          </li>
        )}
        <li className={styles.tiny}>
          {bulk.revisionNumber !== null ? `원본 v${bulk.revisionNumber} · ` : '이 원본 문서 · '}SHA {bulk.checksum ? `${bulk.checksum.slice(0, 12)}…` : '없음'}
        </li>
      </ul>
      {bulk.blockers.length > 0 && (
        <ul className={styles.bulkBlockers} data-testid="bulk-confirm-blockers">
          {bulk.blockers.slice(0, 6).map((text) => (
            <li key={text}>{text}</li>
          ))}
          {bulk.blockers.length > 6 && <li>그 밖에 {bulk.blockers.length - 6}개</li>}
        </ul>
      )}
      <button type="button" className={styles.buttonPrimary} onClick={bulk.onConfirm} disabled={bulk.blockers.length > 0 || pending} aria-busy={pending} data-testid="bulk-confirm-submit">
        {pending ? '승인하는 중…' : `최종 승인 · ${total}개 값 확정하고 학생에게 공개`}
      </button>
    </section>
  )
}
