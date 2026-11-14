import { useRef, useState } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import { addPlanRevision, downloadPlanRevision, importPlanAnalysis, isAdminMockDataSource, listEvaluationPlans, listPlanYears, listSchools, requestPlanAnalysis, uploadEvaluationPlan } from '../api/assessmentAdminApi.ts'
import { AnalysisPreviewError, requestAnalysisPreview } from '../api/canonicalSource.ts'
import type { AdminEvaluationPlan, AdminEvaluationPlanRevision, PlanAnalysisStatus } from '../api/types.ts'
import { FieldError, RemoteView } from '../components/AdminParts.tsx'
import { AlertIcon, CapIcon, EmptyState, FileIcon, Modal, PlusIcon, Toast, UploadIcon, type ToastMessage } from '../components/canonicalUi.ts'
import { analysisLabels, dateLabel, fileSizeLabel, nextToastId } from '../model/adminFormat.ts'
import { useCommand, useRemote } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import review from '../review/review.module.css'
import { devCurrentTerm } from '../api/http/adminRecordsHttp.ts'
import { PlanAnalysisPreviewPanel } from './PlanAnalysisPreviewPanel.tsx'
import { paths } from './paths.ts'

// PDF·HWP·HWPX 원문 등록 (S-4·S-5, 2026-11-13): http에서는 세 형식 모두 서버가 원문 그대로 보관한다.
// HWP·HWPX 분석 결과 수신·공식 확정은 계속 Backend 실험 기능 뒤에 있다(S-8 미결). Mock(시연)은 PDF만.
const multiformatUpload = !isAdminMockDataSource
// 로컬 분석기 자동 분석 (2026-11-11, 개발 Flag 전용). 등록한 같은 바이트를 분석기에 보내고 결과 payload를 PROPOSED 수신 Endpoint로 저장한다.
// 토큰은 개발 서버 Proxy에서만 붙는다(scripts/vite.admin-analyzer.config.ts). 운영 Build에서는 이 분기가 빠진다.
const analyzerUpload = import.meta.env.DEV && !isAdminMockDataSource && import.meta.env.VITE_ASSESSMENT_DEV_ANALYZER === 'true'

const analyzerFailureTitles: Record<AnalysisPreviewError['kind'], string> = {
  CONNECTION: '분석기 연결 실패',
  UNSUPPORTED: '지원하지 않는 문서',
  EXTRACTION: '원문 추출 실패',
  TOO_LARGE: '파일이 너무 커요',
  BUSY: '분석기가 다른 문서를 분석 중이에요',
  ANALYSIS: '분석 실패',
  REQUEST: '분석 요청 오류',
}

type AnalyzerOutcome =
  | { kind: 'imported'; planId: string; revisionId: string }
  | { kind: 'failed'; planId: string; revisionId: string; message: string }

// AD-03 학교별 평가계획서 (AM-07). 학교 → 학년도 → 학년×학기 칸. 한 칸에 여러 PDF·개정본을 둘 수 있고 기존 파일을 덮어쓰지 않는다 (§38).
// 학교 정보 자체는 기존 LearnersHigh가 관리한다 (API-OD-A01) — 여기서 학교를 새로 만들지 않는다.
export function EvaluationPlansRoute({ search }: { search: URLSearchParams }) {
  const schools = useRemote(() => listSchools(), [])
  const schoolId = search.get('school') ?? (schools.state.status === 'success' ? schools.state.data.items[0]?.schoolId : undefined) ?? ''
  const selectedSchool = schools.state.status === 'success' ? schools.state.data.items.find((school) => school.schoolId === schoolId) : undefined
  // 공식 운영 권한(OD-A08)이 없는 담당 학교: 서버가 403을 주는 목록·학년도 조회를 하지 않고 자동 분석 미리보기만 연다 (2026-11-12)
  const planOperable = (selectedSchool as { planOperable?: boolean } | undefined)?.planOperable !== false
  const years = useRemote(() => (schoolId && planOperable ? listPlanYears(schoolId) : Promise.resolve([])), [schoolId, planOperable])
  const yearList = years.state.status === 'success' ? years.state.data : []
  const year = Number(search.get('year') ?? '') || yearList[0]
  const plans = useRemote(() => (schoolId && year && planOperable ? listEvaluationPlans({ schoolId, academicYear: year }) : Promise.resolve({ items: [] })), [schoolId, year, planOperable])
  const selectedSlot = search.get('slot')
  const [upload, setUpload] = useState<{ grade: number; semester: number; planId?: string } | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const { run, pending } = useCommand()

  const setParams = (entries: Record<string, string | null>) => {
    const next = new URLSearchParams(search)
    for (const [key, value] of Object.entries(entries)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    replaceSearch(next.toString())
  }

  // http: 서버가 원문을 분석기로 보내 결과를 저장한다(A3). 분석 중인 개정본을 표시하고, 끝나면 서버에 저장된 목록을 다시 읽는다.
  const [analyzingRevisionId, setAnalyzingRevisionId] = useState<string | null>(null)
  const analyze = async (plan: AdminEvaluationPlan, revision: AdminEvaluationPlanRevision) => {
    setAnalyzingRevisionId(revision.documentRevisionId)
    const outcome = await run(() => requestPlanAnalysis(plan.planId, revision.documentRevisionId))
    setAnalyzingRevisionId(null)
    if (!outcome) return
    plans.reload()
    if (outcome.ok) {
      const failed = outcome.value.analysisStatus === 'FAILED'
      const partial = outcome.value.analysisStatus === 'PARTIAL'
      setToast({
        id: nextToastId(),
        tone: failed ? 'error' : partial ? 'info' : 'success',
        text: failed
          ? isAdminMockDataSource
            ? '분석하지 못했어요. 실제 AI 분석이 연결되지 않아 시연 결과가 있는 문서만 분석돼요.'
            : '분석기가 이 문서에서 평가 정보를 찾지 못했어요(분석 실패로 저장). 원문을 직접 확인해 주세요.'
          : partial
            ? '일부만 분석된 결과(부분 분석)를 저장했어요. "분석 결과 열기"에서 빠진 부분을 원문과 대조해 주세요.'
            : '분석 결과를 저장했어요. "분석 결과 열기"에서 원문과 대조해 확인해 주세요.',
      })
    } else setToast({ id: nextToastId(), tone: 'error', text: `${outcome.error.message} (${outcome.error.code}${analysisReason(outcome.error)})` })
  }

  return (
    <div className={styles.master}>
      <div className={styles.masterList}>
        <RemoteView state={schools.state} label="학교" onRetry={schools.reload}>
          {(data) => (
            <ul className={styles.listPlain} aria-label="학교 목록">
              {data.items.map((school) => (
                <li key={school.schoolId}>
                  <button type="button" className={styles.masterItem} aria-current={school.schoolId === schoolId ? 'true' : undefined} onClick={() => setParams({ school: school.schoolId, year: null, slot: null })}>
                    <span className={styles.sourceIcon}>
                      <CapIcon size={16} />
                    </span>
                    <span>
                      <span className={styles.cellTitle}>{school.name}</span>
                      <span className={styles.cellSub}>{school.documentCount === null ? '자동 분석 미리보기' : `PDF ${school.documentCount}개`}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </RemoteView>
        <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} style={{ width: '100%', marginTop: 10 }} disabled title="학교 정보는 기존 LearnersHigh 학원·학생 관리에서 관리해요 (API-OD-A01)">
          + 신규 학교 등록
        </button>
        <p className={styles.hint} style={{ marginTop: 6 }}>
          학교는 담당 학생의 학교만 보여요. 학교 등록은 기존 LearnersHigh 관리 기능 소관이에요.
        </p>
      </div>

      <div className={styles.body}>
        {!schoolId ? (
          <EmptyState title="담당 학생의 학교가 없어요" />
        ) : !planOperable ? (
          analyzerUpload ? (
            <PlanAnalysisPreviewPanel key={schoolId} schoolName={selectedSchool?.name ?? ''} academicYear={devCurrentTerm().academicYear} />
          ) : (
            <EmptyState title="이 학교의 평가계획서 운영 권한이 없어요" description="공식 등록·검토·확정은 운영 권한이 있는 관리자만 할 수 있어요 (OD-A08)." />
          )
        ) : (
          <>
            <div className={styles.toolbar}>
              <h2 className={styles.sectionTitle} style={{ fontSize: 18 }}>
                {selectedSchool?.name ?? ''}
              </h2>
              <select className={styles.select} aria-label="학년도" value={year ?? ''} onChange={(event) => setParams({ year: event.target.value, slot: null })}>
                {yearList.map((value) => (
                  <option key={value} value={value}>
                    {value}학년도
                  </option>
                ))}
              </select>
              {/* 실제 AI 분석 (요청 ⑨-A): 원본 PDF를 서버로 보내 분석하고 관리자 검토 화면에서 비교한다 */}
              <button type="button" className={`${styles.secondaryButton} ${styles.toolbarEnd}`} onClick={() => navigate(paths.planAi)} data-testid="open-plan-ai">
                PDF AI 분석
              </button>
              <button type="button" className={styles.primaryButton} onClick={() => setUpload({ grade: 1, semester: 2 })}>
                <UploadIcon size={15} /> 평가계획서 등록
              </button>
            </div>
            <RemoteView state={plans.state} label="평가계획서" onRetry={plans.reload}>
              {(data) => {
                const slot = (grade: number, semester: number) => data.items.filter((plan) => plan.grade === grade && plan.semester === semester)
                const [selGrade, selSemester] = (selectedSlot ?? '').split('-').map(Number)
                const selectedPlans = selGrade ? slot(selGrade, selSemester) : []
                return (
                  <>
                    <div className={styles.slotGrid} role="group" aria-label="학년·학기별 평가계획서">
                      <span className={styles.slotHead} />
                      <span className={styles.slotHead}>1학기</span>
                      <span className={styles.slotHead}>2학기</span>
                      {[1, 2, 3].map((grade) => (
                        <SlotRow key={grade} grade={grade} slot={slot} selected={selectedSlot} onSelect={(key) => setParams({ slot: key })} />
                      ))}
                    </div>
                    <p className={styles.hint} style={{ margin: '8px 0 20px' }}>
                      학년·학기 칸마다 여러 PDF를 올릴 수 있어요 (과목별 PDF · 전체 합본 모두 가능). 없는 학기 자료는 만들지 않고 &lsquo;등록 필요&rsquo;로 둬요.
                    </p>
                    {selGrade ? (
                      <>
                        <div className={styles.sectionHead}>
                          <h3 className={styles.sectionTitle}>
                            {year}학년도 · 고{selGrade} {selSemester}학기
                          </h3>
                          <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => setUpload({ grade: selGrade, semester: selSemester })}>
                            <PlusIcon size={14} /> 이 칸에 PDF 추가
                          </button>
                        </div>
                        {selectedPlans.length === 0 ? (
                          <EmptyState title="등록된 평가계획서가 없어요" description="학교 홈페이지·학교알리미의 원본 PDF를 등록해 주세요." />
                        ) : (
                          <div className={styles.stack}>
                            {selectedPlans.map((plan) => (
                              <PlanCard key={plan.planId} plan={plan} pending={pending} analyzingRevisionId={analyzingRevisionId} onAnalyze={analyze} onRevision={() => setUpload({ grade: plan.grade, semester: plan.semester, planId: plan.planId })} />
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className={styles.muted}>칸을 고르면 등록된 PDF와 개정 이력을 볼 수 있어요.</p>
                    )}
                  </>
                )
              }}
            </RemoteView>
          </>
        )}
      </div>
      {upload && schoolId && year && (
        <UploadPlanModal
          schoolId={schoolId}
          schoolName={schools.state.status === 'success' ? schools.state.data.items.find((school) => school.schoolId === schoolId)?.name ?? '' : ''}
          academicYear={year}
          years={yearList.length ? yearList : [year]}
          initial={upload}
          onClose={() => setUpload(null)}
          onDone={(plan, { revision, analysis, analysisError, analyzer }) => {
            setUpload(null)
            if (analyzer?.kind === 'imported') {
              // 분석 결과는 DB(Revision·분석 후보)에 저장됐다 → 전체 페이지 검토 화면으로 이동 (새로고침해도 다시 조회됨)
              navigate(paths.planReview(analyzer.planId, analyzer.revisionId))
              return
            }
            const latest = plan.revisions[plan.revisions.length - 1]
            if (!isAdminMockDataSource && latest && (analysis === 'REVIEW_REQUIRED' || analysis === 'PARTIAL')) {
              // 서버 분석 결과가 저장됐다 → 검토 Workspace의 '분석 요약'부터 보여 준다 (2026-11-14 UI 재설계)
              navigate(paths.planReview(plan.planId, latest.documentRevisionId))
              return
            }
            setParams({ year: String(plan.academicYear), slot: `${plan.grade}-${plan.semester}` })
            plans.reload()
            schools.reload()
            const analysisText = !isAdminMockDataSource
              ? analysis === 'FAILED'
                ? '분석기가 평가 정보를 찾지 못했어요(분석 실패로 저장). 원문을 직접 확인해 주세요.'
                : `원문은 서버에 보관했어요. 분석은 실행하지 못했어요${analysisError ? ` — ${analysisError}` : ''}. 목록에서 다시 분석할 수 있어요.`
              : analysis === 'FAILED' || analysis === null ? '분석하지 못했어요 — 실제 AI 분석이 연결되지 않아 시연 결과가 있는 문서만 분석돼요.' : '분석 결과가 준비됐어요.'
            setToast({ id: nextToastId(), tone: analysis === 'FAILED' || analysis === null ? 'info' : 'success', text: `${revision ? `개정본 v${revision}을 올렸어요 (기존 버전 보존).` : '평가계획서를 등록했어요.'} ${analysisText}` })
          }}
        />
      )}
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

/** 칸 문구: 최신 Revision의 실제 문서 형식으로 쓴다 (예: "HWP 1개 등록됨", 섞이면 "문서 2개 등록됨 (PDF·HWP)") */
function registeredLabel(latest: AdminEvaluationPlanRevision[], count: number): string {
  const formats = [...new Set(latest.map((revision) => revision.documentFormat ?? 'PDF'))]
  return formats.length === 1 ? `${formats[0]} ${count}개 등록됨` : `문서 ${count}개 등록됨 (${formats.join('·')})`
}

function SlotRow({ grade, slot, selected, onSelect }: { grade: number; slot: (grade: number, semester: number) => AdminEvaluationPlan[]; selected: string | null; onSelect: (key: string) => void }) {
  return (
    <>
      <span className={styles.slotGrade}>고{grade}</span>
      {[1, 2].map((semester) => {
        const plans = slot(grade, semester)
        const revisions = plans.flatMap((plan) => plan.revisions)
        const latest = plans.map((plan) => plan.revisions[plan.revisions.length - 1])
        const needsAttention = (revision: AdminEvaluationPlanRevision) => revision.analysisStatus === 'REVIEW_REQUIRED' || revision.analysisStatus === 'PARTIAL' || revision.analysisStatus === 'FAILED'
        const status = latest.find(needsAttention)?.analysisStatus ?? latest[0]?.analysisStatus
        const key = `${grade}-${semester}`
        return (
          <button key={semester} type="button" className={styles.slot} data-empty={plans.length === 0 ? 'true' : undefined} aria-pressed={selected === key} onClick={() => onSelect(key)}>
            <span>
              <FileIcon size={15} /> {plans.length === 0 ? '등록 필요' : registeredLabel(latest, plans.length)}
              {plans.length > 0 && <span className={styles.cellSub}>개정본 포함 {revisions.length}개 파일</span>}
            </span>
            {status && (
              <span className={styles.badge} data-tone={analysisLabels[status].tone}>
                {analysisLabels[status].label}
              </span>
            )}
          </button>
        )
      })}
    </>
  )
}

/** 서버 분석 오류 사유(details.fields[0].reason: busy·timeout·status_conflict·format_contract_pending 등)를 짧게 덧붙인다 */
function analysisReason(error: { details?: unknown }): string {
  const fields = (error.details as { fields?: { reason?: string }[] } | undefined)?.fields
  const reason = fields?.[0]?.reason
  return reason ? ` · ${reason}` : ''
}

function PlanCard({ plan, pending, analyzingRevisionId, onAnalyze, onRevision }: { plan: AdminEvaluationPlan; pending: boolean; analyzingRevisionId: string | null; onAnalyze: (plan: AdminEvaluationPlan, revision: AdminEvaluationPlanRevision) => void; onRevision: () => void }) {
  const latest = plan.revisions[plan.revisions.length - 1]
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const original = latest.file
  // 원문 내려받기 (형식 그대로). 서버가 크기·SHA-256을 다시 확인해 다르면 409로 막는다.
  const downloadOriginal = () => {
    if (!original?.available) return
    setDownloadError(null)
    downloadPlanRevision(plan.planId, latest.documentRevisionId).then(
      (blob) => {
        const href = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = href
        anchor.download = original.fileName
        anchor.click()
        window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
      },
      (cause: Error) => setDownloadError(`원문을 내려받지 못했어요. ${cause.message}`),
    )
  }
  const status = analysisLabels[latest.analysisStatus]
  return (
    <section className={styles.box} aria-label={latest.fileName}>
      <div className={styles.studentLine} style={{ marginBottom: 4 }}>
        <strong style={{ color: 'var(--as-color-text)' }}>
          <FileIcon size={15} /> {latest.fileName}
        </strong>
        <span className={styles.actions}>
          {latest.documentFormat && latest.documentFormat !== 'PDF' && (
            <span className={styles.badge} data-tone="warning" data-testid="plan-format-badge" title="HWP·HWPX 원문은 보관·내려받기가 돼요. 서비스 안 미리보기(변환 엔진 검증 중)와 공식 확정(실험 기능)은 아직이에요">
              {latest.documentFormat} · 실험
            </span>
          )}
          <span className={styles.badge} data-tone={status.tone}>
            {status.label}
          </span>
          <span className={styles.badge} data-tone={latest.reviewStatus === 'CONFIRMED' ? 'success' : undefined}>
            {latest.reviewStatus === 'CONFIRMED' ? '관리자 확인 완료' : '미확인'}
          </span>
        </span>
      </div>
      <p className={styles.muted}>
        v{latest.revisionNumber} · {dateLabel(latest.uploadedAt)} 등록 · {fileSizeLabel(latest.sizeBytes)} · 출처 {latest.sourceUrl ?? '미기재'}
      </p>
      <div className={styles.actions} style={{ marginTop: 10 }}>
        {latest.analysisStatus === 'NOT_REQUESTED' || latest.analysisStatus === 'FAILED' ? (
          <button type="button" className={`${styles.primaryButton} ${styles.smallButton}`} onClick={() => onAnalyze(plan, latest)} disabled={pending} aria-busy={analyzingRevisionId === latest.documentRevisionId} data-testid="plan-analyze-button">
            {analyzingRevisionId === latest.documentRevisionId ? '분석 중… (최대 2분)' : latest.analysisStatus === 'FAILED' ? '분석 다시 요청' : '분석 요청'}
          </button>
        ) : (
          <button type="button" className={`${styles.primaryButton} ${styles.smallButton}`} onClick={() => navigate(paths.planReview(plan.planId, latest.documentRevisionId))}>
            분석 결과 열기
          </button>
        )}
        <button
          type="button"
          className={`${styles.secondaryButton} ${styles.smallButton}`}
          onClick={downloadOriginal}
          disabled={!original?.available}
          title={original?.available ? `${original.documentFormat} 원문 내려받기 (SHA-256 ${original.checksum.slice(0, 12)}…)` : '이 개정본은 원문 파일을 보관하지 않았어요 (2026-11-13 이전 등록)'}
          data-testid="plan-original-download-button"
        >
          원본 {latest.documentFormat ?? 'PDF'}
        </button>
        <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={onRevision}>
          개정본 추가
        </button>
      </div>
      {downloadError && (
        <p className={styles.formError} role="alert" style={{ marginTop: 8 }}>
          <AlertIcon size={15} /> {downloadError}
        </p>
      )}
      {plan.revisions.length > 1 && (
        <ul className={styles.listPlain} style={{ marginTop: 10 }} aria-label="개정 이력">
          {[...plan.revisions].reverse().map((revision) => (
            <li key={revision.documentRevisionId} className={styles.listRow}>
              <span>
                v{revision.revisionNumber} · {revision.fileName} · {dateLabel(revision.uploadedAt)}
              </span>
              <span className={styles.badge} data-tone={analysisLabels[revision.analysisStatus].tone}>
                {analysisLabels[revision.analysisStatus].label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function UploadPlanModal({
  schoolId,
  schoolName,
  academicYear,
  years,
  initial,
  onClose,
  onDone,
}: {
  schoolId: string
  schoolName: string
  academicYear: number
  years: number[]
  initial: { grade: number; semester: number; planId?: string }
  onClose: () => void
  onDone: (plan: AdminEvaluationPlan, result: { revision?: number; analysis: PlanAnalysisStatus | null; analysisError?: string | null; analyzer?: AnalyzerOutcome }) => void
}) {
  const [year, setYear] = useState(academicYear)
  const [grade, setGrade] = useState(initial.grade)
  const [semester, setSemester] = useState(initial.semester)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [sourceUrl, setSourceUrl] = useState('')
  const [fileError, setFileError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { run, pending } = useCommand()
  const isRevision = Boolean(initial.planId)
  const [stage, setStage] = useState<'upload' | 'analyze'>('upload')
  // 분석기 실패 뒤: Revision은 이미 저장됐으므로 같은 파일로 같은 Revision에 분석만 다시 보낸다(새 Revision을 만들지 않음).
  const [savedPlan, setSavedPlan] = useState<{ plan: AdminEvaluationPlan; revisionId: string; revision?: number } | null>(null)
  const [analyzerError, setAnalyzerError] = useState<string | null>(null)

  const analyzeInto = async (planId: string, revisionId: string, target: File): Promise<AnalyzerOutcome> => {
    setStage('analyze')
    try {
      const result = await requestAnalysisPreview(target, undefined, { includeAnalysis: false })
      const payload = result.backendImport?.payload
      if (!payload || result.backendImport?.importable !== true) {
        return { kind: 'failed', planId, revisionId, message: `분석은 끝났지만 저장할 수 있는 결과가 아니에요 (${result.status ?? '상태 미확인'})` }
      }
      await importPlanAnalysis(planId, revisionId, payload)
      return { kind: 'imported', planId, revisionId }
    } catch (caught) {
      if (caught instanceof AnalysisPreviewError) {
        return { kind: 'failed', planId, revisionId, message: `${analyzerFailureTitles[caught.kind]} · ${caught.message} (${caught.code})` }
      }
      const error = caught as { message?: string; code?: string }
      return { kind: 'failed', planId, revisionId, message: `분석 결과를 저장하지 못했어요 · ${error.message ?? '알 수 없는 오류'}${error.code ? ` (${error.code})` : ''}` }
    } finally {
      setStage('upload')
    }
  }

  const pick = (picked: File | null | undefined) => {
    // 등록 뒤 재시도 단계에서는 같은 바이트만 분석해야 하므로(SHA 대조) 파일을 바꾸지 않는다.
    if (savedPlan) return
    setFile(picked ?? null)
    setFileError(undefined)
  }

  // 등록(또는 개정본 추가) 뒤 같은 문서의 분석을 이어서 요청한다 (목업 AM-08 '등록하고 분석'). 실제 AI는 없다 (API-OD-A02).
  const submit = async () => {
    if (!file) {
      setFileError('PDF 파일을 골라 주세요.')
      return
    }
    setFormError(null)
    setAnalyzerError(null)
    if (analyzerUpload && savedPlan) {
      // 재시도: 업로드 없이 같은 Revision에 분석만
      const retried = await run(() => analyzeInto(savedPlan.plan.planId, savedPlan.revisionId, file))
      if (retried?.ok) {
        if (retried.value.kind === 'imported') onDone(savedPlan.plan, { revision: savedPlan.revision, analysis: null, analyzer: retried.value })
        else setAnalyzerError(retried.value.message)
      }
      return
    }
    const url = sourceUrl.trim() || null
    const outcome = await run(async () => {
      const plan = initial.planId ? await addPlanRevision(initial.planId, { file, sourceUrl: url }) : await uploadEvaluationPlan({ file, schoolId, academicYear: year, grade, semester, sourceUrl: url })
      const latest = plan.revisions[plan.revisions.length - 1]
      if (analyzerUpload) {
        const analyzer = await analyzeInto(plan.planId, latest.documentRevisionId, file)
        return { plan, analysis: null as PlanAnalysisStatus | null, analyzer }
      }
      let analysis: PlanAnalysisStatus | null = null
      let analysisError: string | null = null
      try {
        analysis = (await requestPlanAnalysis(plan.planId, latest.documentRevisionId)).analysisStatus
      } catch (caught) {
        // 등록은 끝났다. 분석 실패 사유를 숨기지 않고 알린다(빈 결과로 바꾸지 않음)
        analysisError = (caught as { message?: string }).message ?? '분석을 실행하지 못했어요.'
      }
      return { plan, analysis, analysisError, analyzer: undefined as AnalyzerOutcome | undefined }
    })
    if (!outcome) return
    if (outcome.ok) {
      const revision = isRevision ? outcome.value.plan.revisions.length : undefined
      const analyzer = outcome.value.analyzer
      if (analyzer?.kind === 'failed') {
        // 등록은 됐고 분석만 실패: Modal을 닫지 않고 실제 오류와 재시도를 보여 준다.
        setSavedPlan({ plan: outcome.value.plan, revisionId: analyzer.revisionId, revision })
        setAnalyzerError(analyzer.message)
        return
      }
      onDone(outcome.value.plan, { revision, analysis: outcome.value.analysis, analysisError: 'analysisError' in outcome.value ? outcome.value.analysisError : null, analyzer })
    }
    else if (outcome.error.code === 'UNSUPPORTED_FILE_TYPE' || outcome.error.code === 'FILE_TOO_LARGE') setFileError(outcome.error.message)
    else setFormError(`${outcome.error.message} (${outcome.error.code})`)
  }

  return (
    <Modal
      wide
      title={isRevision ? '개정본 추가' : '평가계획서 등록'}
      initialFocusRef={inputRef}
      onRequestClose={() => !pending && onClose()}
      footer={
        <>
          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => (savedPlan ? onDone(savedPlan.plan, { revision: savedPlan.revision, analysis: null }) : onClose())}
            disabled={pending}
          >
            {savedPlan ? '분석 없이 닫기' : '취소'}
          </button>
          <button type="button" className={styles.primaryButton} onClick={submit} disabled={pending || !file} aria-busy={pending} title={!file ? 'PDF 파일을 먼저 골라 주세요' : undefined} data-testid="plan-upload-submit">
            {pending ? (stage === 'analyze' ? '분석 중…' : '올리는 중…') : savedPlan ? '분석 다시 시도' : isRevision ? '개정본 올리고 분석' : '등록하고 분석'}
          </button>
        </>
      }
    >
      <div className={review.dialogBody} style={{ padding: 0 }} data-testid="plan-upload-dialog">
        <div
          className={review.dropArea}
          data-over={dragging || undefined}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            pick(event.dataTransfer.files[0])
          }}
        >
          {file ? (
            <div className={review.fileCard} data-testid="plan-upload-file-card">
              <span className={review.fileIcon} aria-hidden="true">
                {(file.name.toLowerCase().endsWith('.hwpx') ? 'HWPX' : file.name.toLowerCase().endsWith('.hwp') ? 'HWP' : 'PDF')}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <strong title={file.name}>{file.name}</strong>
                <span className={review.tiny}>
                  {(file.name.toLowerCase().endsWith('.hwpx') ? 'HWPX' : file.name.toLowerCase().endsWith('.hwp') ? 'HWP' : 'PDF')} · {file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)}KB` : `${(file.size / 1024 / 1024).toFixed(1)}MB`}
                  {savedPlan ? ' · 등록 완료' : pending ? (stage === 'analyze' ? ' · 분석 중…' : ' · 올리는 중…') : ' · 올릴 준비가 됐어요'}
                </span>
                {/* 서버가 단계별 진행률을 주지 않으므로 숫자 없이 진행 중 표시만 한다 */}
                {pending && <span className={review.indeterminate} role="progressbar" aria-label={stage === 'analyze' ? '분석 중' : '올리는 중'} style={{ display: 'block' }} />}
              </span>
              {!pending && !savedPlan && (
                <button type="button" className={review.chipButton} onClick={() => pick(null)} aria-label="고른 파일 지우기">
                  지우기
                </button>
              )}
            </div>
          ) : (
            <label className={review.dropPrompt}>
              <FileIcon size={28} />
              <strong style={{ color: 'var(--as-color-text)', fontSize: 15 }}>평가계획서 파일을 끌어다 놓으세요</strong>
              <span>또는 눌러서 고르기 · PDF{multiformatUpload ? '·HWP·HWPX' : ''} · 20MB까지</span>
              <input
                id="plan-file"
                ref={inputRef}
                type="file"
                accept={multiformatUpload ? 'application/pdf,.pdf,.hwp,.hwpx' : 'application/pdf,.pdf'}
                className="lh-visually-hidden"
                aria-label="평가계획서 원문 파일 (PDF·HWP·HWPX)"
                aria-invalid={fileError ? true : undefined}
                aria-describedby={fileError ? 'plan-file-error' : undefined}
                onChange={(event) => pick(event.target.files?.[0])}
              />
            </label>
          )}
          <FieldError id="plan-file-error" message={fileError} />
          {formError && (
            <p className={styles.formError} role="alert">
              <AlertIcon size={15} /> {formError}
            </p>
          )}
          {analyzerError && savedPlan && (
            <p className={styles.formError} role="alert" data-testid="plan-analyzer-error">
              <AlertIcon size={15} /> 평가계획서는 등록됐어요(v{savedPlan.plan.revisions.length}). 자동 분석은 실패했어요 — {analyzerError}. 같은 파일로 &quot;분석 다시 시도&quot;를 누르면 새 버전을 만들지 않고 분석만 다시 해요.
            </p>
          )}
        </div>

        <div style={{ display: 'grid', alignContent: 'start', gap: 16 }}>
          {!isRevision ? (
            <div className={review.formGrid}>
              <label className={review.formField} style={{ gridColumn: '1 / -1' }}>
                학교
                <input className={review.input} value={schoolName} readOnly />
              </label>
              <label className={review.formField}>
                학년도
                <select className={review.input} value={year} onChange={(event) => setYear(Number(event.target.value))}>
                  {years.map((value) => (
                    <option key={value} value={value}>
                      {value}학년도
                    </option>
                  ))}
                </select>
              </label>
              <label className={review.formField}>
                학년
                <select className={review.input} value={grade} onChange={(event) => setGrade(Number(event.target.value))}>
                  {[1, 2, 3].map((value) => (
                    <option key={value} value={value}>
                      고{value}
                    </option>
                  ))}
                </select>
              </label>
              <label className={review.formField}>
                학기
                <select className={review.input} value={semester} onChange={(event) => setSemester(Number(event.target.value))}>
                  <option value={1}>1학기</option>
                  <option value={2}>2학기</option>
                </select>
              </label>
            </div>
          ) : (
            <p className={review.muted}>같은 문서에 새 개정본을 올려요. 이전 버전과 검토 기록은 그대로 남아요.</p>
          )}
          <label className={review.formField}>
            원본 출처 주소 (선택)
            <input className={review.input} type="url" value={sourceUrl} placeholder="학교 홈페이지·학교알리미 게시 주소" onChange={(event) => setSourceUrl(event.target.value)} />
          </label>
          <div className={review.guide}>
            <strong style={{ fontSize: 14 }}>등록 안내</strong>
            <ul>
              {isAdminMockDataSource ? (
                <li>시연용 화면이에요. 파일은 서버에 저장되지 않아요.</li>
              ) : (
                <>
                  <li>원문은 서버에 형식 그대로 보관하고, 서버가 분석기로 분석해요.</li>
                  <li>분석은 최대 2분 걸릴 수 있어요. 끝나면 검토 화면으로 이동해요.</li>
                </>
              )}
              <li>같은 학년·학기에 여러 문서를 올릴 수 있고, 기존 파일은 덮어쓰지 않아요.</li>
              <li>분석 결과는 후보예요. 관리자가 원문과 대조해 확정한 값만 학생에게 공개돼요.</li>
              {analyzerUpload && <li>개발 환경: 이 PC의 로컬 분석기로 분석해 후보로 저장해요.</li>}
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  )
}
