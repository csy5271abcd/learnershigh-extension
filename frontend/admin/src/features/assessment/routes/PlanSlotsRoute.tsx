import { SchoolDirectorySearch } from './SchoolDirectorySearch.tsx'
import { useEffect, useRef, useState } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import { downloadPlanRevision, isAdminMockDataSource, listEvaluationPlans } from '../api/assessmentAdminApi.ts'
import type { AdminEvaluationPlan, AdminEvaluationPlanRevision } from '../api/types.ts'
import { FileIcon, Modal, Toast, UploadIcon, type ToastMessage } from '../components/canonicalUi.ts'
import { PlanOriginalViewer } from '../components/PlanOriginalViewer.tsx'
import { dateLabel, fileSizeLabel, nextToastId } from '../model/adminFormat.ts'
import { SchoolYearFilters } from '../components/SchoolYearFilters.tsx'
import { usePlanSchoolContext } from '../model/planSchoolContext.ts'
import { hasAnalysisResult, latestRevision, planStage, stageLabel } from '../model/planStatus.ts'
import { useRemote } from '../model/useRemote.ts'
import review from '../review/review.module.css'
import slots from './planSlots.module.css'
import { DeletePlanDialog, RowMoreMenu, UploadPlanModal } from './EvaluationPlansRoute.tsx'
import { SchoolInfoSyncSummary } from './SchoolInfoSyncSummary.tsx'
import { useSchoolInfoSync } from '../model/useSchoolInfoSync.ts'
import { isSchoolInfoSource, needsAttention, slotBadge, slotOf } from '../model/schoolInfoSync.ts'
import { paths } from './paths.ts'

// A27-UX 평가계획서 탭 = 원본 문서 관리 전용. 학교·학년도마다 고1~고3 × 1·2학기 6칸.
// 한 칸에 여러 문서(과목별 파일·합본·개정본)를 둘 수 있다. AI 분석·검토·확정은 '분석' 탭에서 한다.
// 원본 출처: 관리자 직접 등록 + 학교알리미 자동 확인(A27-UX 부록 E §38-12, 버튼 없이 최근 3개 학년도 × 6칸 = 18개 구간).
// 학교알리미로 받은 문서도 관리자 등록 문서로 저장되고 학생 '공식 공개 원본'으로 표시하지 않는다. 칸에는 관리자 전용 '학교알리미 수집' 배지로만 구분한다.
// 자동 확인은 학교가 바뀔 때만 보낸다 — 학년도 필터는 보기만 바꾼다.
const GRADES = [1, 2, 3]
const SEMESTERS = [1, 2]

export function PlanSlotsRoute({ search }: { search: URLSearchParams }) {
  const context = usePlanSchoolContext(search)
  const { schoolId, year } = context
  const plans = useRemote(() => (schoolId && year ? listEvaluationPlans({ schoolId, academicYear: year }) : Promise.resolve({ items: [] as AdminEvaluationPlan[] })), [schoolId, year])
  const [upload, setUpload] = useState<{ grade: number; semester: number; planId?: string } | null>(null)
  const [deleting, setDeleting] = useState<AdminEvaluationPlan | null>(null)
  // §38-12: 학교가 정해지면 자동 확인(Mock 모드에는 학교알리미 연결이 없다)
  const sync = useSchoolInfoSync(schoolId, !isAdminMockDataSource)
  const syncLinks = sync.result?.counts.slotLinks
  const syncState = sync.result?.state
  const seenLinks = useRef<{ school: string | null | undefined; links: number | undefined; state: string | undefined }>({ school: undefined, links: undefined, state: undefined })
  const reloadPlans = plans.reload
  useEffect(() => {
    // 자동 확인으로 등록 문서가 늘거나 작업이 끝나면(분석 상태 반영) 칸을 다시 읽는다
    const seen = seenLinks.current
    const changed = seen.school === schoolId && ((syncLinks !== undefined && seen.links !== undefined && syncLinks !== seen.links)
      || (seen.state === 'RUNNING' && syncState !== undefined && syncState !== 'RUNNING'))
    seenLinks.current = { school: schoolId, links: syncLinks, state: syncState }
    if (changed) reloadPlans()
  }, [schoolId, syncLinks, syncState, reloadPlans])
  const [toast, setToast] = useState<ToastMessage | null>(null)
  // A27-UX(계정 B): 칸 안에서 원본 바로 보기 · 개정 이력 펼치기
  const [preview, setPreview] = useState<{ plan: AdminEvaluationPlan; revision: AdminEvaluationPlanRevision } | null>(null)
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({})
  const setParams = (entries: Record<string, string | null>) => {
    const next = new URLSearchParams(search)
    for (const [key, value] of Object.entries(entries)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    replaceSearch(next.toString())
  }
  const items = plans.state.status === 'success' ? plans.state.data.items : []
  const inSlot = (grade: number, semester: number) => items.filter((plan) => plan.grade === grade && plan.semester === semester)
  const download = (plan: AdminEvaluationPlan, latest: AdminEvaluationPlanRevision = latestRevision(plan)) => {
    downloadPlanRevision(plan.planId, latest.documentRevisionId).then(
      (blob) => {
        const href = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = href
        anchor.download = latest.fileName
        anchor.click()
        window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
      },
      (cause: Error) => setToast({ id: nextToastId(), tone: 'error', text: `원본을 내려받지 못했어요. ${cause.message}` }),
    )
  }

  return (
    <div className={review.listPage} data-testid="plan-slots-page">
      <div className={review.listHead}>
        <h2>평가계획서</h2>
        {/* [08] A27-UX: '학년도별 열람'을 제거하고, 등록 버튼은 같은 계열의 중립 outline 버튼으로 둔다 */}
        <div style={{ display: 'flex', gap: 8 }}>
          {/* 부록 E: 학교알리미는 자동 확인(아래 요약의 '다시 확인'이 보조 동작). 수동 등록은 그대로 */}
          <button type="button" className={review.button} onClick={() => setUpload({ grade: 1, semester: 1 })} disabled={!schoolId || !year} data-testid="plan-upload-open">
            <UploadIcon size={15} /> 평가계획서 등록
          </button>
        </div>
      </div>
      <SchoolYearFilters
        context={context}
        onChange={setParams}
        extra={
          // 부록 O §38-15: 평가계획서 0건 학교도 학교알리미 공식 검색으로 찾아 고른다(고른 뒤 그 학교·올해로 이동)
          !isAdminMockDataSource && (
            <SchoolDirectorySearch
              onSelected={(selected) => {
                context.retry()
                setParams({ school: selected, year: null })
              }}
            />
          )
        }
      />
      {context.external && schoolId && <ExternalSchoolBanner name={context.schoolName} selected={sync.result?.schoolId === schoolId ? (sync.result?.schoolSelection?.selected ?? null) : null} />}
      {!isAdminMockDataSource && schoolId && <SchoolInfoSyncSummary sync={sync} schoolId={schoolId} onChanged={plans.reload} />}
      <p className={review.sourceNote}>원본 문서만 관리해요. 분석·확정은 &lsquo;분석&rsquo; 탭에서 해요.</p>

      {!schoolId ? (
        <div className={review.empty}>
          <strong>{context.loading ? '학교를 불러오는 중이에요' : '학교를 골라 주세요'}</strong>
        </div>
      ) : plans.state.status === 'error' ? (
        <div className={review.empty} role="alert">
          <strong>평가계획서를 불러오지 못했어요</strong>
          <span className={review.muted}>{plans.state.error.message}</span>
          <button type="button" className={review.button} onClick={plans.reload}>
            다시 시도
          </button>
        </div>
      ) : (
        <div className={slots.grid} role="table" aria-label={`${context.schoolName} ${year ?? ''}학년도 평가계획서`} data-testid="plan-slots">
          <div role="row" className={slots.headRow}>
            <span role="columnheader" />
            {SEMESTERS.map((semester) => (
              <span key={semester} role="columnheader" className={slots.colHead}>
                {semester}학기
              </span>
            ))}
          </div>
          {GRADES.map((grade) => (
            <div role="row" key={grade} className={slots.row}>
              <span role="rowheader" className={slots.rowHead}>
                고{grade}
              </span>
              {SEMESTERS.map((semester) => {
                const docs = inSlot(grade, semester)
                const syncSlot = slotOf(sync.result, year, grade, semester)
                const badge = slotBadge(syncSlot)
                return (
                  <section key={semester} role="cell" className={slots.cell} data-empty={docs.length === 0 || undefined} aria-label={`고${grade} ${semester}학기`} data-testid={`plan-slot-${grade}-${semester}`}>
                    <div className={slots.cellHead}>
                      <strong>{plans.state.status === 'loading' ? '불러오는 중' : docs.length === 0 ? '원본 미등록' : `문서 ${docs.length}개`}</strong>
                      <button type="button" className={slots.addButton} onClick={() => setUpload({ grade, semester })} disabled={!year} aria-label={`고${grade} ${semester}학기 원본 등록`}>
                        + 등록
                      </button>
                    </div>
                    {badge && syncSlot && (
                      <span className={slots.slotSync} data-attention={needsAttention(syncSlot.status) || undefined} data-status={syncSlot.status} data-testid="plan-slot-sync" title={badge}>
                        {badge}
                      </span>
                    )}
                    {plans.state.status === 'success' && docs.length === 0 && (
                      <p className={slots.emptyHint} data-testid="plan-slot-empty">
                        이 학기 원본이 없어요. &lsquo;+ 등록&rsquo;으로 학교 평가계획서 파일(PDF·HWP·HWPX)을 올려 주세요.
                      </p>
                    )}
                    {docs.map((plan) => {
                      const latest = latestRevision(plan)
                      const stage = planStage(latest)
                      const format = latest.documentFormat ?? 'PDF'
                      return (
                        <article key={plan.planId} className={slots.doc} data-testid="plan-slot-doc">
                          <div className={slots.docTop}>
                            <FileIcon size={16} />
                            <span className={slots.docName} title={latest.fileName}>
                              {latest.fileName}
                            </span>
                            {isSchoolInfoSource(latest.sourceUrl) && (
                              <span className={slots.sourceBadge} data-testid="plan-slot-source" title="학교알리미 공시에서 자동으로 받은 원본(관리자에게만 보여요)">
                                학교알리미 수집
                              </span>
                            )}
                            {!isAdminMockDataSource && (
                              <RowMoreMenu
                                label={`${latest.fileName} 더보기`}
                                items={[
                                  { key: 'revision', text: '개정본 등록', onSelect: () => setUpload({ grade, semester, planId: plan.planId }) },
                                  { key: 'delete', text: '삭제', tone: 'danger', onSelect: () => setDeleting(plan), testId: 'plan-delete-open' },
                                ]}
                              />
                            )}
                          </div>
                          <p className={slots.docMeta}>
                            {format} · {fileSizeLabel(latest.sizeBytes)} · {dateLabel(latest.uploadedAt)} 등록{plan.revisions.length > 1 ? ` · 개정 ${plan.revisions.length}회` : ''}{isSchoolInfoSource(latest.sourceUrl) ? '' : latest.sourceUrl ? ' · 출처 링크 있음' : ' · 직접 등록'}
                          </p>
                          <p className={slots.docStage} data-stage={stage} data-testid="plan-slot-stage">
                            {stageLabel[stage]}
                          </p>
                          <div className={slots.docActions}>
                            <button
                              type="button"
                              className={slots.textButton}
                              onClick={() => setPreview({ plan, revision: latest })}
                              disabled={!latest.file?.available}
                              title={latest.file?.available ? `${format} 원본 미리보기` : '원본을 보관하지 않은 이전 등록분이에요'}
                              data-testid="plan-slot-open"
                            >
                              원본 보기
                            </button>
                            <button type="button" className={slots.textButton} onClick={() => download(plan)} disabled={!latest.file?.available} title={latest.file?.available ? `${format} 원본 내려받기` : '원본을 보관하지 않은 이전 등록분이에요'}>
                              원본 내려받기
                            </button>
                            {hasAnalysisResult(latest) ? (
                              <button type="button" className={slots.textButton} onClick={() => navigate(paths.planResult(plan.planId, latest.documentRevisionId))} data-testid="plan-slot-result">
                                {stage === 'CONFIRMED' ? '확정 결과 보기' : '분석 결과 보기'}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className={slots.textButton}
                              onClick={() => navigate(paths.analysis({ school: schoolId, year, grade, semester, plan: plan.planId }))}
                              data-testid="plan-slot-analyze"
                            >
                              {stage === 'NOT_ANALYZED' || stage === 'ANALYSIS_FAILED' ? '분석하기' : '분석 탭에서 보기'}
                            </button>
                            <button
                              type="button"
                              className={slots.textButton}
                              aria-expanded={Boolean(historyOpen[plan.planId])}
                              onClick={() => setHistoryOpen((current) => ({ ...current, [plan.planId]: !current[plan.planId] }))}
                              data-testid="plan-slot-history-toggle"
                            >
                              개정 이력 {plan.revisions.length}
                            </button>
                          </div>
                          {historyOpen[plan.planId] && (
                            <ol className={slots.history} aria-label={`${latest.fileName} 개정 이력`} data-testid="plan-slot-history">
                              {[...plan.revisions].reverse().map((revision) => {
                                const revisionStage = planStage(revision)
                                const isLatest = revision.documentRevisionId === latest.documentRevisionId
                                return (
                                  <li key={revision.documentRevisionId} className={slots.historyRow} data-testid="plan-slot-history-row">
                                    <div className={slots.historyMain}>
                                      <strong>
                                        v{revision.revisionNumber}
                                        {isLatest ? ' · 최신' : ''}
                                      </strong>
                                      <span className={slots.docName} title={revision.fileName}>
                                        {revision.fileName}
                                      </span>
                                      <span className={slots.historyMeta}>
                                        {revision.documentFormat ?? 'PDF'} · {fileSizeLabel(revision.sizeBytes)} · {dateLabel(revision.uploadedAt)} 등록 · {stageLabel[revisionStage]}
                                      </span>
                                    </div>
                                    <div className={slots.docActions}>
                                      <button type="button" className={slots.textButton} onClick={() => setPreview({ plan, revision })} disabled={!revision.file?.available}>
                                        원본 보기
                                      </button>
                                      <button type="button" className={slots.textButton} onClick={() => download(plan, revision)} disabled={!revision.file?.available}>
                                        내려받기
                                      </button>
                                      {hasAnalysisResult(revision) && (
                                        <button type="button" className={slots.textButton} onClick={() => navigate(paths.planResult(plan.planId, revision.documentRevisionId))}>
                                          결과 보기
                                        </button>
                                      )}
                                    </div>
                                  </li>
                                )
                              })}
                            </ol>
                          )}
                        </article>
                      )
                    })}
                  </section>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {upload && schoolId && year && (
        <UploadPlanModal
          schoolId={schoolId}
          schoolName={context.schoolName}
          academicYear={year}
          years={context.yearList.length ? context.yearList : [year]}
          initial={upload}
          onClose={() => setUpload(null)}
          onDone={(plan, { revision, analysis }) => {
            setUpload(null)
            plans.reload()
            const latest = plan.revisions[plan.revisions.length - 1]
            if (!isAdminMockDataSource && latest && (analysis === 'REVIEW_REQUIRED' || analysis === 'PARTIAL')) {
              navigate(paths.planReview(plan.planId, latest.documentRevisionId))
              return
            }
            setParams({ year: String(plan.academicYear) })
            setToast({ id: nextToastId(), tone: 'success', text: revision ? `개정본(v${revision})을 등록했어요.` : '평가계획서 원본을 등록했어요.' })
          }}
        />
      )}
      {deleting && (
        <DeletePlanDialog
          plan={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(fileName) => {
            setDeleting(null)
            plans.reload()
            setToast({ id: nextToastId(), tone: 'success', text: `${fileName} 문서를 삭제했어요. 학생 화면에서도 보이지 않아요.` })
          }}
        />
      )}
      {preview && <OriginalPreview plan={preview.plan} revision={preview.revision} onClose={() => setPreview(null)} />}
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

/**
 * A28-02: 담당 학생이 없는 학교(검색으로 고른 외부 학교 등)를 보고 있다는 표시. 조회를 막지 않고, 학교알리미 학교 선택 기록이 있으면
 * 공식 이름·지역·주소로 정확히 어느 학교인지 보여 준다. 학생 학적·담당 관계·학생 기록 권한은 바뀌지 않는다.
 */
function ExternalSchoolBanner({ name, selected }: { name: string; selected: { schoolName: string; sido: string | null; sigungu: string | null; address: string | null } | null }) {
  const region = selected ? [selected.sido, selected.sigungu].filter(Boolean).join(' ') : ''
  return (
    <div className={slots.externalBanner} role="status" data-testid="plan-external-school">
      <strong>외부 학교 평가계획서 조회</strong>
      <span className={slots.externalName} data-testid="plan-external-school-name">
        {selected?.schoolName ?? name}
        {region ? ` · ${region}` : ''}
        {selected?.address ? ` · ${selected.address}` : ''}
      </span>
      <span className={review.muted}>담당 학생이 없는 학교예요. 학교알리미 공개 원본만 조회해요. 학생 학적·담당 관계는 바뀌지 않아요.</span>
    </div>
  )
}

/** 원본 미리보기: PDF는 쪽 이동·확대, HWP·HWPX는 변환본·구조 보기(PlanOriginalViewer 그대로). 분석 결과와 무관하게 원본만 본다 */
function OriginalPreview({ plan, revision, onClose }: { plan: AdminEvaluationPlan; revision: AdminEvaluationPlanRevision; onClose: () => void }) {
  const [page, setPage] = useState(1)
  const format = revision.documentFormat ?? 'PDF'
  return (
    <Modal
      title={`${revision.fileName} · v${revision.revisionNumber}`}
      wide
      onRequestClose={onClose}
      footer={
        <button type="button" className={review.button} onClick={onClose}>
          닫기
        </button>
      }
    >
      <div className={slots.previewBody} data-testid="plan-slot-preview">
        {format !== 'PDF' && !revision.file?.previewAvailable && !revision.file?.structurePreviewAvailable && (
          <p className={review.muted}>{format} 원문은 앱 안에서 미리 볼 수 없어요. 내려받아 한글 프로그램으로 확인해 주세요.</p>
        )}
        <PlanOriginalViewer bare planId={plan.planId} revisionId={revision.documentRevisionId} file={revision.file} page={page} onPageChange={setPage} />
      </div>
    </Modal>
  )
}
