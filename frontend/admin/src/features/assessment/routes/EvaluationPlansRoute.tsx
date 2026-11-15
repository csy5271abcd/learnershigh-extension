import { useRef, useState } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import { addPlanRevision, downloadPlanRevision, importPlanAnalysis, isAdminMockDataSource, listEvaluationPlans, listPlanYears, listSchools, requestPlanAnalysis, searchSchools, uploadEvaluationPlan } from '../api/assessmentAdminApi.ts'
import { AnalysisPreviewError, requestAnalysisPreview } from '../api/canonicalSource.ts'
import type { AdminEvaluationPlan, AdminEvaluationPlanRevision, PlanAnalysisStatus } from '../api/types.ts'
import { FieldError, RemoteView } from '../components/AdminParts.tsx'
import { AlertIcon, FileIcon, Modal, Toast, UploadIcon, type ToastMessage } from '../components/canonicalUi.ts'
import { dateLabel, fileSizeLabel, nextToastId } from '../model/adminFormat.ts'
import { analysisFailureText } from '../model/analysisFailure.ts'
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

// AD-03 학교별 평가계획서 (2차 UI, 2026-11-14 — 다글로 '내 PDF·전체 보드' 목록 참고).
// 정책: 정상 인증된 관리자는 모든 학교의 평가계획서를 등록·분석·검토·확정한다(OD-A08). 학생 기록·Student Care 권한과는 별개다.
// 학교 원천: 전체 학교 목록 API가 아직 없다(API-OD-A01). 아래 목록은 '담당 학생 학교 + 개발 설정'이라 전체 학교가 아니다 —
//   목록에 없는 학교는 학교 코드로 직접 연다(서버가 모든 학교를 허용한다). 학교를 새로 만들거나 이름을 지어내지 않는다.
// 한 학년·학기에 여러 문서·개정본을 둘 수 있고 기존 파일을 덮어쓰지 않는다 (§38).
export function EvaluationPlansRoute({ search }: { search: URLSearchParams }) {
  const schools = useRemote(() => listSchools(), [])
  // A5: 평가계획서가 등록된 학교 (전체 학교 Master 연결 전 — coverage로 표시)
  const registered = useRemote(() => searchSchools(), [])
  const registeredSchools = registered.state.status === 'success' ? registered.state.data.items : []
  const knownSchools = schools.state.status === 'success' ? schools.state.data.items : []
  const extraSchools = knownSchools.filter((school) => !registeredSchools.some((item) => item.schoolId === school.schoolId))
  const schoolId = search.get('school') ?? registeredSchools[0]?.schoolId ?? knownSchools[0]?.schoolId ?? ''
  const selectedSchool = knownSchools.find((school) => school.schoolId === schoolId)
  const registeredName = registeredSchools.find((school) => school.schoolId === schoolId)?.name ?? null
  const schoolLabel = selectedSchool?.name ?? registeredName ?? `학교 코드 ${schoolId}`
  // 개발 전용: 운영 권한 없는 담당 학교의 자동 분석 미리보기 (2026-11-12). http 운영 정책(모든 학교 허용)에서는 쓰지 않는다
  const planOperable = (selectedSchool as { planOperable?: boolean } | undefined)?.planOperable !== false
  const years = useRemote(() => (schoolId && planOperable ? listPlanYears(schoolId) : Promise.resolve([])), [schoolId, planOperable])
  const yearList = years.state.status === 'success' ? years.state.data : []
  const year = Number(search.get('year') ?? '') || yearList[0]
  const plans = useRemote(() => (schoolId && year && planOperable ? listEvaluationPlans({ schoolId, academicYear: year }) : Promise.resolve({ items: [] })), [schoolId, year, planOperable])
  const gradeFilter = Number(search.get('grade') ?? '') || null
  const semesterFilter = Number(search.get('semester') ?? '') || null
  const [query, setQuery] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
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
            ? '일부만 분석된 결과를 저장했어요. "검토"에서 빠진 부분을 원문과 대조해 주세요.'
            : '분석 결과를 저장했어요. "검토"에서 원문과 대조해 확인해 주세요.',
      })
    } else setToast({ id: nextToastId(), tone: 'error', text: analysisFailureText(outcome.error) })
  }

  const openCode = () => {
    const code = schoolCode.trim()
    if (code) setParams({ school: code, year: null, grade: null, semester: null })
  }

  return (
    <div className={review.listPage} data-testid="plans-page">
      <div className={review.listHead}>
        <h2>학교별 평가계획서</h2>
        {!isAdminMockDataSource && (
          <button type="button" className={review.button} onClick={() => navigate(paths.planArchive(schoolId || undefined))} data-testid="open-plan-archive">
            학년도별 열람
          </button>
        )}
        {!isAdminMockDataSource && import.meta.env.DEV && (
          <button type="button" className={review.button} onClick={() => navigate(paths.planAi)} data-testid="open-plan-ai">
            PDF AI 분석
          </button>
        )}
        <button type="button" className={review.buttonPrimary} onClick={() => setUpload({ grade: gradeFilter ?? 1, semester: semesterFilter ?? 2 })} disabled={!schoolId || !year} data-testid="plan-upload-open">
          <UploadIcon size={15} /> 평가계획서 등록
        </button>
      </div>

      <div className={review.toolbar}>
        <select className={review.select} aria-label="학교" value={schoolId} onChange={(event) => setParams({ school: event.target.value, year: null })} data-testid="plans-school">
          {schoolId && !knownSchools.some((school) => school.schoolId === schoolId) && !registeredSchools.some((school) => school.schoolId === schoolId) && <option value={schoolId}>학교 코드 {schoolId}</option>}
          {registeredSchools.length > 0 && (
            <optgroup label="평가계획서가 등록된 학교">
              {registeredSchools.map((school) => (
                <option key={school.schoolId} value={school.schoolId}>
                  {school.name ?? `학교 코드 ${school.schoolId}`} · {school.planCount}건
                </option>
              ))}
            </optgroup>
          )}
          {extraSchools.length > 0 && (
            <optgroup label="담당 학생 학교 (개발 정보)">
              {extraSchools.map((school) => (
                <option key={school.schoolId} value={school.schoolId}>
                  {school.name}
                </option>
              ))}
            </optgroup>
          )}
          {!schoolId && <option value="">학교 없음</option>}
        </select>
        <select className={review.select} aria-label="학년도" value={year ?? ''} onChange={(event) => setParams({ year: event.target.value })}>
          {yearList.map((value) => (
            <option key={value} value={value}>
              {value}학년도
            </option>
          ))}
        </select>
        <select className={review.select} aria-label="학년" value={gradeFilter ?? ''} onChange={(event) => setParams({ grade: event.target.value || null })}>
          <option value="">전체 학년</option>
          {[1, 2, 3].map((value) => (
            <option key={value} value={value}>
              고{value}
            </option>
          ))}
        </select>
        <select className={review.select} aria-label="학기" value={semesterFilter ?? ''} onChange={(event) => setParams({ semester: event.target.value || null })}>
          <option value="">전체 학기</option>
          <option value={1}>1학기</option>
          <option value={2}>2학기</option>
        </select>
        <div className={review.search}>
          <input className={review.input} type="search" value={query} placeholder="문서 이름 검색" aria-label="문서 이름 검색" onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>
      <p className={review.sourceNote}>
        <span data-testid="plans-school-coverage">
          학교 목록은 평가계획서가 등록된 학교와 담당 학생 학교예요. 전체 학교 목록(학교 Master)은 아직 연결되지 않았어요{registered.state.status === 'error' ? ' · 등록 학교를 불러오지 못했어요' : ''}.
        </span>{' '}
        다른 학교는 학교 코드로 열 수 있어요{' '}
        <input className={review.input} style={{ width: 150, height: 30, fontSize: 12.5, marginLeft: 4 }} value={schoolCode} placeholder="학교 코드" aria-label="학교 코드로 열기" onChange={(event) => setSchoolCode(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && openCode()} />{' '}
        <button type="button" className={review.link} onClick={openCode} disabled={!schoolCode.trim()}>
          열기
        </button>
      </p>

      {schools.state.status === 'error' && registeredSchools.length === 0 && knownSchools.length === 0 && !search.get('school') ? (
        <div className={review.empty} role="alert">
          <strong>학교 목록을 불러오지 못했어요</strong>
          <span className={review.muted}>{schools.state.error.message} · 학교 코드로 직접 열 수 있어요.</span>
          <button type="button" className={review.button} onClick={schools.reload}>
            다시 시도
          </button>
        </div>
      ) : !schoolId ? (
        <div className={review.empty}>
          <strong>학교를 골라 주세요</strong>
          <span className={review.muted}>목록에 없는 학교는 위의 학교 코드로 열 수 있어요.</span>
        </div>
      ) : !planOperable ? (
        analyzerUpload ? (
          <PlanAnalysisPreviewPanel key={schoolId} schoolName={selectedSchool?.name ?? ''} academicYear={devCurrentTerm().academicYear} />
        ) : (
          <div className={review.empty}>
            <strong>이 학교 평가계획서를 열 수 없어요</strong>
            <span className={review.muted}>서버가 이 관리자 계정의 평가계획서 운영을 허용하지 않았어요.</span>
          </div>
        )
      ) : (
        <RemoteView state={plans.state} label="평가계획서" onRetry={plans.reload}>
          {(data) => {
            const filtered = data.items.filter(
              (plan) =>
                (!gradeFilter || plan.grade === gradeFilter) &&
                (!semesterFilter || plan.semester === semesterFilter) &&
                (!query.trim() || plan.revisions.some((revision) => revision.fileName.toLowerCase().includes(query.trim().toLowerCase()))),
            )
            const sorted = [...filtered].sort((a, b) => a.grade - b.grade || a.semester - b.semester)
            if (data.items.length === 0) {
              return (
                <div className={review.empty} data-testid="plans-empty">
                  <FileIcon size={28} />
                  <strong>{year}학년도에 등록된 평가계획서가 없어요</strong>
                  <span className={review.muted}>학교 홈페이지·학교알리미의 원본 파일(PDF·HWP·HWPX)을 등록해 주세요.</span>
                  <button type="button" className={review.buttonPrimary} onClick={() => setUpload({ grade: 1, semester: 2 })}>
                    평가계획서 등록
                  </button>
                </div>
              )
            }
            if (sorted.length === 0) {
              return (
                <div className={review.empty}>
                  <strong>조건에 맞는 문서가 없어요</strong>
                  <button
                    type="button"
                    className={review.link}
                    onClick={() => {
                      setQuery('')
                      setParams({ grade: null, semester: null })
                    }}
                  >
                    필터 지우기
                  </button>
                </div>
              )
            }
            return (
              <table className={review.docTable} data-testid="plans-table">
                <thead>
                  <tr>
                    <th scope="col">문서</th>
                    <th scope="col">분석</th>
                    <th scope="col">검토 · 학생 공개</th>
                    <th scope="col">등록일</th>
                    <th scope="col">
                      <span className="lh-visually-hidden">동작</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((plan) => (
                    <PlanRow key={plan.planId} plan={plan} pending={pending} analyzingRevisionId={analyzingRevisionId} onAnalyze={analyze} onRevision={() => setUpload({ grade: plan.grade, semester: plan.semester, planId: plan.planId })} />
                  ))}
                </tbody>
              </table>
            )
          }}
        </RemoteView>
      )}
      {upload && schoolId && year && (
        <UploadPlanModal
          schoolId={schoolId}
          schoolName={schoolLabel}
          academicYear={year}
          years={yearList.length ? yearList : [year]}
          initial={upload}
          onClose={() => setUpload(null)}
          onDone={(plan, { revision, analysis, analysisError, analyzer }) => {
            setUpload(null)
            if (analyzer?.kind === 'imported') {
              navigate(paths.planReview(analyzer.planId, analyzer.revisionId))
              return
            }
            const latest = plan.revisions[plan.revisions.length - 1]
            if (!isAdminMockDataSource && latest && (analysis === 'REVIEW_REQUIRED' || analysis === 'PARTIAL')) {
              // 서버 분석 결과가 저장됐다 → 검토 Workspace의 '분석 결과 확인'부터 보여 준다
              navigate(paths.planReview(plan.planId, latest.documentRevisionId))
              return
            }
            setParams({ year: String(plan.academicYear) })
            plans.reload()
            schools.reload()
            registered.reload()
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

// 상태 문구는 서버 값으로만: 분석 상태 / 검토(확정 여부) / 학생 공개 = 확정값만 (확정값 개수는 최신 개정본의 confirmedFields)
const analysisText: Record<PlanAnalysisStatus, { text: string; tone?: 'neutral' | 'danger' }> = {
  NOT_REQUESTED: { text: '분석 전', tone: 'neutral' },
  PROCESSING: { text: '분석 중' },
  REVIEW_REQUIRED: { text: '검토 필요' },
  PARTIAL: { text: '일부 항목 확인 필요' },
  COMPLETED: { text: '분석 완료', tone: 'neutral' },
  FAILED: { text: '분석 실패', tone: 'danger' },
}

function PlanRow({ plan, pending, analyzingRevisionId, onAnalyze, onRevision }: { plan: AdminEvaluationPlan; pending: boolean; analyzingRevisionId: string | null; onAnalyze: (plan: AdminEvaluationPlan, revision: AdminEvaluationPlanRevision) => void; onRevision: () => void }) {
  const latest = plan.revisions[plan.revisions.length - 1]
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const original = latest.file
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
  const analyzing = analyzingRevisionId === latest.documentRevisionId
  const status = analysisText[latest.analysisStatus]
  const confirmedCount = latest.confirmedFields.length
  const format = latest.documentFormat ?? 'PDF'
  const canAnalyze = latest.analysisStatus === 'NOT_REQUESTED' || latest.analysisStatus === 'FAILED'
  return (
    <tr data-testid="plan-row">
      <td data-col="name">
        <span className={review.docName} title={latest.fileName}>
          {latest.fileName}
        </span>
        <span className={review.docSub}>
          고{plan.grade} · {plan.semester}학기 · {format}
          {format !== 'PDF' ? ' (미리보기 준비 중)' : ''} · v{latest.revisionNumber}
          {plan.revisions.length > 1 ? ` (개정 ${plan.revisions.length}회)` : ''} · {fileSizeLabel(latest.sizeBytes)}
        </span>
        {downloadError && (
          <span className={review.statusText} data-tone="danger" role="alert">
            {downloadError}
          </span>
        )}
      </td>
      <td>
        <span className={review.statusText} data-tone={status.tone}>
          {analyzing ? '분석 중… (최대 2분)' : status.text}
        </span>
      </td>
      <td>
        <span className={review.statusText} data-tone={latest.reviewStatus === 'CONFIRMED' ? undefined : 'neutral'}>
          {latest.reviewStatus === 'CONFIRMED' ? `확정값 ${confirmedCount}개 공개` : '확정 전 · 학생 비공개'}
        </span>
      </td>
      <td data-col="date" className={review.tiny}>
        {dateLabel(latest.uploadedAt)}
      </td>
      <td>
        <div className={review.rowButtons}>
          {canAnalyze ? (
            <button type="button" className={`${review.buttonDark} ${review.small}`} onClick={() => onAnalyze(plan, latest)} disabled={pending} aria-busy={analyzing} data-testid="plan-analyze-button">
              {analyzing ? '분석 중…' : latest.analysisStatus === 'FAILED' ? '다시 분석' : '분석'}
            </button>
          ) : (
            <button type="button" className={`${review.buttonDark} ${review.small}`} onClick={() => navigate(paths.planReview(plan.planId, latest.documentRevisionId))} data-testid="plan-open-review">
              {latest.reviewStatus === 'CONFIRMED' ? '결과 보기' : '검토'}
            </button>
          )}
          <button type="button" className={`${review.buttonGhost} ${review.small}`} onClick={downloadOriginal} disabled={!original?.available} title={original?.available ? `${format} 원문 내려받기` : '원문을 보관하지 않은 이전 등록분이에요'} data-testid="plan-original-download-button">
            원문
          </button>
          <button type="button" className={`${review.buttonGhost} ${review.small}`} onClick={onRevision}>
            개정본
          </button>
        </div>
      </td>
    </tr>
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
        analysisError = analysisFailureText(caught as { code?: string; message?: string; details?: unknown })
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
            className={review.buttonGhost}
            onClick={() => (savedPlan ? onDone(savedPlan.plan, { revision: savedPlan.revision, analysis: null }) : onClose())}
            disabled={pending}
          >
            {savedPlan ? '분석 없이 닫기' : '취소'}
          </button>
          <button type="button" className={review.buttonPrimary} onClick={submit} disabled={pending || !file} aria-busy={pending} title={!file ? 'PDF 파일을 먼저 골라 주세요' : undefined} data-testid="plan-upload-submit">
            {pending ? (stage === 'analyze' ? '분석 중…' : '올리는 중…') : savedPlan ? '분석 다시 시도' : isRevision ? '개정본 올리고 분석' : '등록하고 분석'}
          </button>
        </>
      }
    >
      <div className={review.dialogBody} data-testid="plan-upload-dialog">
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
                <button type="button" className={`${review.buttonGhost} ${review.small}`} onClick={() => pick(null)} aria-label="고른 파일 지우기">
                  지우기
                </button>
              )}
            </div>
          ) : (
            <label className={review.dropPrompt}>
              <FileIcon size={28} />
              <strong>평가계획서 파일을 업로드해 주세요</strong>
              <span>끌어다 놓거나 눌러서 고르기 · PDF{multiformatUpload ? '·HWP·HWPX' : ''} · 20MB 이하</span>
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

        <div className={review.formStack}>
          {!isRevision ? (
            <>
              <label className={review.formRow}>
                <span>학교</span>
                <input className={review.input} value={schoolName} readOnly />
              </label>
              <label className={review.formRow}>
                <span>학년도</span>
                <select className={review.input} value={year} onChange={(event) => setYear(Number(event.target.value))}>
                  {years.map((value) => (
                    <option key={value} value={value}>
                      {value}학년도
                    </option>
                  ))}
                </select>
              </label>
              <label className={review.formRow}>
                <span>학년</span>
                <select className={review.input} value={grade} onChange={(event) => setGrade(Number(event.target.value))}>
                  {[1, 2, 3].map((value) => (
                    <option key={value} value={value}>
                      고{value}
                    </option>
                  ))}
                </select>
              </label>
              <label className={review.formRow}>
                <span>학기</span>
                <select className={review.input} value={semester} onChange={(event) => setSemester(Number(event.target.value))}>
                  <option value={1}>1학기</option>
                  <option value={2}>2학기</option>
                </select>
              </label>
            </>
          ) : (
            <p className={review.muted}>같은 문서에 새 개정본을 올려요. 이전 버전과 검토 기록은 그대로 남아요.</p>
          )}
          <label className={review.formRow}>
            <span>출처 (선택)</span>
            <input className={review.input} type="url" value={sourceUrl} placeholder="학교 홈페이지·학교알리미 게시 주소" onChange={(event) => setSourceUrl(event.target.value)} />
          </label>
          <div className={review.guide}>
            <strong>등록 안내</strong>
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
