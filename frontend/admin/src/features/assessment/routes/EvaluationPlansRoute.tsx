import { useEffect, useRef, useState } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import { addPlanRevision, deleteEvaluationPlan, downloadPlanRevision, getPlanAnalysis, getPlanReviewDraft, importPlanAnalysis, isAdminMockDataSource, listEvaluationPlans, listPlanYears, listSchools, requestPlanAnalysis, searchSchools, uploadEvaluationPlan } from '../api/assessmentAdminApi.ts'
import { AnalysisPreviewError, requestAnalysisPreview } from '../api/canonicalSource.ts'
import type { AdminEvaluationPlan, AdminEvaluationPlanRevision, PlanAnalysisStatus } from '../api/types.ts'
import { FieldError, RemoteView } from '../components/AdminParts.tsx'
import { AlertIcon, FileIcon, Modal, Toast, type ToastMessage } from '../components/canonicalUi.ts'
import { dateLabel, fileSizeLabel, nextToastId } from '../model/adminFormat.ts'
import { analysisFailureText } from '../model/analysisFailure.ts'
import { useCommand, useRemote } from '../model/useRemote.ts'
import { planYearOptions, relativeYearLabel } from '../model/schoolInfoSync.ts'
import styles from '../styles/assessmentAdmin.module.css'
import review from '../review/review.module.css'
import { currentTerm } from '../api/http/adminRecordsHttp.ts'
import { PlanAnalysisPreviewPanel } from './PlanAnalysisPreviewPanel.tsx'
import { paths } from './paths.ts'
import { reviewProgressOf } from '../model/planReviewComparison.ts'
import { hasAnalysisResult, planStage, stageLabel, type PlanStage } from '../model/planStatus.ts'

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
// A13 사용자 결정: 담당 학생의 학교(§33-1 managed-schools)를 먼저 보여 준다. 평가계획서 운영 권한(OD-A08)은 모든 학교라
//   등록 문서가 있는 다른 학교도 아래 묶음으로 남긴다(권한을 줄이지 않음).
// 학교 원천: 전체 학교 목록 API가 아직 없다(API-OD-A01). 아래 목록은 '담당 학생 학교 + 등록 학교'라 전체 학교가 아니다 —
//   A28-18: 학교 코드 직접 입력 UI는 없앴다(전국 학교 검색은 평가계획서 탭). ?school= 딥링크는 그대로 연다.
// 한 학년·학기에 여러 문서·개정본을 둘 수 있고 기존 파일을 덮어쓰지 않는다 (§38).
export function EvaluationPlansRoute({ search }: { search: URLSearchParams }) {
  const schools = useRemote(() => listSchools(), [])
  // A5: 평가계획서가 등록된 학교 (전체 학교 Master 연결 전 — coverage로 표시)
  const registered = useRemote(() => searchSchools(), [])
  const registeredSchools = registered.state.status === 'success' ? registered.state.data.items : []
  const knownSchools = schools.state.status === 'success' ? schools.state.data.items : []
  const managedSchools = knownSchools.filter((school) => (school.studentCount ?? 0) > 0)
  const otherRegistered = registeredSchools.filter((item) => !managedSchools.some((school) => school.schoolId === item.schoolId))
  const extraSchools = knownSchools.filter((school) => !(school.studentCount ?? 0) && !registeredSchools.some((item) => item.schoolId === school.schoolId))
  const schoolId = search.get('school') ?? managedSchools[0]?.schoolId ?? registeredSchools[0]?.schoolId ?? knownSchools[0]?.schoolId ?? ''
  const selectedSchool = knownSchools.find((school) => school.schoolId === schoolId)
  const registeredName = registeredSchools.find((school) => school.schoolId === schoolId)?.name ?? null
  const schoolLabel = selectedSchool?.name ?? registeredName ?? `학교 코드 ${schoolId}`
  // 개발 전용: 운영 권한 없는 담당 학교의 자동 분석 미리보기 (2026-11-12). http 운영 정책(모든 학교 허용)에서는 쓰지 않는다
  const planOperable = (selectedSchool as { planOperable?: boolean } | undefined)?.planOperable !== false
  const years = useRemote(() => (schoolId && planOperable ? listPlanYears(schoolId) : Promise.resolve([])), [schoolId, planOperable])
  // 부록 N5-2: 최근 3개 학년도(올해·작년·재작년)를 항상 선택지에 둔다
  const yearList = schoolId && planOperable ? planYearOptions(years.state.status === 'success' ? years.state.data : []) : []
  const year = Number(search.get('year') ?? '') || yearList[0]
  const plans = useRemote(() => (schoolId && year && planOperable ? listEvaluationPlans({ schoolId, academicYear: year }) : Promise.resolve({ items: [] })), [schoolId, year, planOperable])
  const gradeFilter = Number(search.get('grade') ?? '') || null
  const semesterFilter = Number(search.get('semester') ?? '') || null
  const [query, setQuery] = useState('')
  const [upload, setUpload] = useState<{ grade: number; semester: number; planId?: string } | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [deleting, setDeleting] = useState<AdminEvaluationPlan | null>(null)
  const stageFilter = (search.get('status') as PlanStage | null) || null
  const selectedPlanId = search.get('plan')
  // '검토 중' 구분: 분석 결과가 있고 확정 전인 최신 개정본의 공유 검토 초안 결정 수(서버 값)
  const planItems = plans.state.status === 'success' ? plans.state.data.items : []
  const draftTargets = planItems
    .map((plan) => ({ plan, latest: plan.revisions[plan.revisions.length - 1] }))
    .filter(({ latest }) => latest && hasAnalysisResult(latest) && latest.reviewStatus !== 'CONFIRMED')
  // A27-UX(계정 B): 검토 대상 총수 = 결과 화면·확정 화면과 같은 규칙(분석 결과의 확정 후보 필드 수). 결정이 있는 문서만 분석 결과를 더 읽는다
  const drafts = useRemote(
    () =>
      isAdminMockDataSource
        ? Promise.resolve({} as Record<string, { decided: number; total: number }>)
        : Promise.all(
            draftTargets.map(({ plan, latest }) =>
              getPlanReviewDraft(plan.planId, latest.documentRevisionId)
                .then(async (view) => {
                  if (!view.draft || view.draft.status !== 'ACTIVE' || view.draft.decisionCount === 0) return null
                  const analysis = await getPlanAnalysis(plan.planId, latest.documentRevisionId)
                  const progress = reviewProgressOf(analysis.reviewFields ?? [], view.draft)
                  return { decided: progress.decided, total: progress.total }
                })
                .then(
                  (value) => [latest.documentRevisionId, value] as const,
                  () => [latest.documentRevisionId, null] as const,
                ),
            ),
          ).then((pairs) => Object.fromEntries(pairs.filter(([, value]) => value !== null)) as Record<string, { decided: number; total: number }>),
    [draftTargets.map(({ latest }) => latest.documentRevisionId).join(',')],
  )
  const draftCounts = drafts.state.status === 'success' ? drafts.state.data : {}
  const stageOf = (plan: AdminEvaluationPlan) => {
    const latest = plan.revisions[plan.revisions.length - 1]
    return planStage(latest, draftCounts[latest.documentRevisionId] ?? null)
  }
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

  return (
    <div className={review.listPage} data-testid="plans-page">
      <div className={review.listHead}>
        <h2>분석</h2>
        <button type="button" className={review.button} onClick={() => navigate(paths.plans)} data-testid="analysis-to-plans">
          평가계획서 원본 관리
        </button>
      </div>
      <div className={review.toolbar}>
        <select className={review.select} aria-label="학교" value={schoolId} onChange={(event) => setParams({ school: event.target.value, year: null })} data-testid="plans-school">
          {schoolId && !knownSchools.some((school) => school.schoolId === schoolId) && !registeredSchools.some((school) => school.schoolId === schoolId) && <option value={schoolId}>선택한 학교 (이름 확인 안 됨)</option>}
          {managedSchools.length > 0 && (
            <optgroup label="담당 학생 학교" data-testid="plans-managed-schools">
              {managedSchools.map((school) => {
                const plansCount = registeredSchools.find((item) => item.schoolId === school.schoolId)?.planCount
                return (
                  <option key={school.schoolId} value={school.schoolId}>
                    {school.name} · 담당 학생 {school.studentCount}명{plansCount ? ` · ${plansCount}건` : ''}
                  </option>
                )
              })}
            </optgroup>
          )}
          {otherRegistered.length > 0 && (
            <optgroup label={managedSchools.length > 0 ? '평가계획서가 등록된 다른 학교' : '평가계획서가 등록된 학교'}>
              {otherRegistered.map((school) => (
                <option key={school.schoolId} value={school.schoolId}>
                  {school.name ?? `학교 코드 ${school.schoolId}`} · {school.planCount}건
                </option>
              ))}
            </optgroup>
          )}
          {extraSchools.length > 0 && (
            <optgroup label="그 밖의 학교">
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
              {value}학년도{relativeYearLabel(value) ? ` (${relativeYearLabel(value)})` : ''}
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
        <select className={review.select} aria-label="분석 상태" value={stageFilter ?? ''} onChange={(event) => setParams({ status: event.target.value || null })} data-testid="analysis-status-filter">
          <option value="">전체 상태</option>
          {(['NOT_ANALYZED', 'ANALYZED', 'REVIEWING', 'CONFIRMED', 'ANALYSIS_FAILED'] as PlanStage[]).map((stage) => (
            <option key={stage} value={stage}>
              {stageLabel[stage]}
            </option>
          ))}
        </select>
        <div className={review.search}>
          <input className={review.input} type="search" value={query} placeholder="문서 이름 검색" aria-label="문서 이름 검색" onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>
      {/* A28-18: 학교 코드 직접 입력·열기와 학교 목록 설명을 없앴다. 전국 학교 검색은 평가계획서 탭(원본 관리)에 있다. 기존 ?school= 딥링크는 그대로 열린다 */}
      {registered.state.status === 'error' && (
        <p className={review.sourceNote} role="alert" data-testid="plans-school-coverage">
          등록 학교 목록을 불러오지 못했어요.
        </p>
      )}

      {schools.state.status === 'error' && registeredSchools.length === 0 && knownSchools.length === 0 && !search.get('school') ? (
        <div className={review.empty} role="alert">
          <strong>학교 목록을 불러오지 못했어요</strong>
          <span className={review.muted}>{schools.state.error.message}</span>
          <button type="button" className={review.button} onClick={schools.reload}>
            다시 시도
          </button>
        </div>
      ) : !schoolId ? (
        <div className={review.empty}>
          <strong>학교를 골라 주세요</strong>
          <button type="button" className={review.link} onClick={() => navigate(paths.plans)}>
            평가계획서 탭에서 학교 검색
          </button>
        </div>
      ) : !planOperable ? (
        analyzerUpload ? (
          <PlanAnalysisPreviewPanel key={schoolId} schoolName={selectedSchool?.name ?? ''} academicYear={currentTerm().academicYear} />
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
                (!query.trim() || plan.revisions.some((revision) => revision.fileName.toLowerCase().includes(query.trim().toLowerCase()))) &&
                (!stageFilter || stageOf(plan) === stageFilter),
            )
            const sorted = [...filtered].sort((a, b) => a.grade - b.grade || a.semester - b.semester)
            if (data.items.length === 0) {
              return (
                <div className={review.empty} data-testid="plans-empty">
                  <FileIcon size={28} />
                  <strong>{year}학년도에 등록된 평가계획서가 없어요</strong>
                  <span className={review.muted}>학교 홈페이지·학교알리미의 원본 파일(PDF·HWP·HWPX)을 등록해 주세요.</span>
                  <button type="button" className={review.buttonPrimary} onClick={() => navigate(paths.plans)}>
                    평가계획서 탭에서 등록
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
                      setParams({ grade: null, semester: null, status: null })
                    }}
                  >
                    필터 지우기
                  </button>
                </div>
              )
            }
            return (
              // 부록 Q: 좁은 화면(800px)에서 표가 페이지를 가로로 넘기지 않게 표만 옆으로 스크롤한다
              <div className={review.docTableScroll} data-testid="plans-table-scroll">
              <table className={review.docTable} data-testid="plans-table">
                <thead>
                  <tr>
                    <th scope="col">문서</th>
                    <th scope="col">상태 · 학생 공개</th>
                    <th scope="col">등록일</th>
                    <th scope="col">
                      <span className="lh-visually-hidden">동작</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((plan) => (
                    <PlanRow key={plan.planId} plan={plan} pending={pending} analyzingRevisionId={analyzingRevisionId} onAnalyze={analyze} stage={stageOf(plan)} selected={plan.planId === selectedPlanId} />
                  ))}
                </tbody>
              </table>
              </div>
            )
          }}
        </RemoteView>
      )}
      {deleting && (
        <DeletePlanDialog
          plan={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(fileName) => {
            setDeleting(null)
            plans.reload()
            registered.reload()
            setToast({ id: nextToastId(), tone: 'success', text: `${fileName} 문서를 삭제했어요. 학생 화면에서도 보이지 않아요.` })
          }}
        />
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

function PlanRow({ plan, pending, analyzingRevisionId, onAnalyze, stage, selected }: { plan: AdminEvaluationPlan; pending: boolean; analyzingRevisionId: string | null; onAnalyze: (plan: AdminEvaluationPlan, revision: AdminEvaluationPlanRevision) => void; stage: PlanStage; selected: boolean }) {
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
    <tr data-testid="plan-row" data-selected={selected || undefined} data-stage={stage}>
      <td data-col="name">
        <span className={review.docName} title={latest.fileName}>
          {latest.fileName}
        </span>
        <span className={review.docSub}>
          고{plan.grade} · {plan.semester}학기 · {format}
          {format !== 'PDF' ? ' (PDF 변환 미리보기)' : ''} · v{latest.revisionNumber}
          {plan.revisions.length > 1 ? ` (개정 ${plan.revisions.length}회)` : ''} · {fileSizeLabel(latest.sizeBytes)}
        </span>
        {downloadError && (
          <span className={review.statusText} data-tone="danger" role="alert">
            {downloadError}
          </span>
        )}
      </td>
      {/* A28-30: '분석' 열을 없애고 분석 상태를 이 칸에 합친다(분석 전·중·실패·일부 확인 필요 · 검토 단계 · 학생 공개) */}
      <td>
        <span className={review.statusText} data-tone={latest.analysisStatus === 'FAILED' ? 'danger' : 'neutral'} data-testid="plan-row-stage">
          {analyzing
            ? '분석 중… (최대 2분)'
            : stage === 'CONFIRMED'
              ? `확정 · 확정값 ${confirmedCount}개 학생 공개`
              : `${stageLabel[stage]}${latest.analysisStatus === 'PARTIAL' ? ` · ${status.text}` : ''} · 학생 비공개`}
        </span>
      </td>
      <td data-col="date" className={review.tiny}>
        {dateLabel(latest.uploadedAt)}
      </td>
      <td>
        <div className={review.rowButtons}>
          {canAnalyze ? (
            <button type="button" className={`${review.button} ${review.small}`} onClick={() => onAnalyze(plan, latest)} disabled={pending} aria-busy={analyzing} data-testid="plan-analyze-button">
              {analyzing ? '분석 중…' : '분석 시작'}
            </button>
          ) : stage !== 'CONFIRMED' ? (
            // [09] A27-UX: '검토 시작'은 옆 'AI 결과 보기'와 같은 위계의 중립 outline 버튼
            <button type="button" className={`${review.button} ${review.small}`} onClick={() => navigate(paths.planReview(plan.planId, latest.documentRevisionId))} data-testid="plan-open-review">
              {stage === 'REVIEWING' ? '검토 이어하기' : '검토 시작'}
            </button>
          ) : null}
          {hasAnalysisResult(latest) && (
            <button type="button" className={`${review.button} ${review.small}`} onClick={() => navigate(paths.planResult(plan.planId, latest.documentRevisionId))} data-testid="plan-open-result">
              {stage === 'CONFIRMED' ? '확정 결과 보기' : stage === 'ANALYZED' ? 'AI 결과 보기' : '검토 결과 보기'}
            </button>
          )}
          {/* A28-30: '다시 분석'은 문서별 분석 결과 화면 머리에서만(목록 행에는 두지 않음). 결과가 없는 문서(분석 전·실패)만 여기서 '분석 시작' */}
          <button type="button" className={`${review.buttonGhost} ${review.small}`} onClick={downloadOriginal} disabled={!original?.available} title={original?.available ? `${format} 원문 내려받기` : '원문을 보관하지 않은 이전 등록분이에요'} data-testid="plan-original-download-button">
            원문
          </button>
        </div>
      </td>
    </tr>
  )
}

export function UploadPlanModal({
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
            <p className={review.muted}>같은 문서의 새 개정본 · 이전 버전·검토 기록 보존</p>
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
                  <li>원문 형식 그대로 서버 보관 · 서버 분석</li>
                  <li>분석 최대 2분 · 끝나면 검토 화면으로 이동</li>
                </>
              )}
              <li>같은 학년·학기 여러 문서 가능 · 기존 파일 덮어쓰기 없음</li>
              <li>분석 결과 = 후보 · 관리자 확정값만 학생 공개</li>
              {analyzerUpload && <li>등록 후 자동 분석 → 검토 후보 저장</li>}
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ---- A25 평가계획서 삭제 (논리 삭제, api-contract.md §38-9 DRAFT) ----

interface MoreMenuItem {
  key: string
  text: string
  tone?: 'danger'
  disabled?: boolean
  testId?: string
  onSelect: () => void
}

/** 행 보조 동작 메뉴(⋯). Esc·바깥 클릭으로 닫고, Esc로 닫으면 연 버튼으로 초점을 돌려준다 */
export function RowMoreMenu({ label, items }: { label: string; items: MoreMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    rootRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div className={review.moreMenu} ref={rootRef}>
      <button ref={buttonRef} type="button" className={review.iconButton} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} data-testid="plan-more-button">
        <span aria-hidden="true">⋯</span>
      </button>
      {open && (
        <div className={review.moreMenuList} role="menu">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={review.moreMenuItem}
              data-tone={item.tone}
              disabled={item.disabled}
              data-testid={item.testId}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              {item.text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** 삭제 확인. 학생 공개 중(확정된 개정본이 있음)이면 영향을 알리고 한 번 더 확인받는다(서버도 같은 규칙으로 409). */
export function DeletePlanDialog({ plan, onClose, onDeleted }: { plan: AdminEvaluationPlan; onClose: () => void; onDeleted: (fileName: string) => void }) {
  const latest = plan.revisions[plan.revisions.length - 1]
  const published = plan.revisions.some((revision) => revision.reviewStatus === 'CONFIRMED')
  const [acknowledged, setAcknowledged] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const canDelete = !pending && (!published || acknowledged)
  const submit = () => {
    if (!canDelete) return
    setPending(true)
    setError(null)
    deleteEvaluationPlan(plan.planId, plan.schoolId, published).then(
      () => onDeleted(latest.fileName),
      (cause: Error & { code?: string; status?: number }) => {
        setPending(false)
        setError(
          cause.status === 404
            ? '이미 삭제됐거나 찾을 수 없는 문서예요. 목록을 새로고침해 주세요.'
            : cause.code === 'PLAN_ANALYSIS_IN_PROGRESS'
              ? '이 문서를 분석하고 있어요. 분석이 끝난 뒤 다시 시도해 주세요.'
              : cause.code === 'PLAN_DELETE_CONFIRMATION_REQUIRED'
                ? '학생에게 공개 중인 문서예요. 아래 내용을 확인한 뒤 다시 삭제해 주세요.'
                : `삭제하지 못했어요. ${cause.message}`,
        )
      },
    )
  }
  return (
    <Modal
      compact
      title="평가계획서를 삭제할까요?"
      initialFocusRef={cancelRef}
      onRequestClose={() => !pending && onClose()}
      footer={
        <>
          <button ref={cancelRef} type="button" className={review.buttonGhost} onClick={onClose} disabled={pending}>
            취소
          </button>
          <button type="button" className={review.buttonDanger} onClick={submit} disabled={!canDelete} aria-busy={pending} data-testid="plan-delete-confirm">
            {pending ? '삭제하는 중…' : '삭제'}
          </button>
        </>
      }
    >
      <div className={review.deleteBody} data-testid="plan-delete-dialog">
        <div className={review.deleteFile}>
          <FileIcon size={18} />
          <div>
            <strong title={latest.fileName}>{latest.fileName}</strong>
            <span>
              {plan.academicYear}학년도 · 고{plan.grade} · {plan.semester}학기 · 개정본 {plan.revisions.length}개
            </span>
          </div>
        </div>
        <ul className={review.deleteNotes}>
          <li>목록과 검토 화면에서 사라져요.</li>
          {published ? <li>학생에게 공개 중인 평가 정보와 월별 운영계획도 학생 화면에서 함께 사라져요.</li> : <li>아직 학생에게 공개되지 않은 문서예요.</li>}
        </ul>
        {published && (
          <label className={review.deleteAck}>
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} disabled={pending} data-testid="plan-delete-ack" />
            학생 화면에서도 사라지는 것을 확인했어요
          </label>
        )}
        {error && (
          <p className={review.deleteError} role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
