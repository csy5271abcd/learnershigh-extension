import { useEffect, useRef, useState } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import { getEvaluationPlan, getPlanAnalysis, getPlanReviewDraft, getPlanReviewHistory, getTeachingPlanHistory, getTeachingPlanReview, isAdminMockDataSource, reopenPlanReviewDraft } from '../api/assessmentAdminApi.ts'
import { toApiError } from '../api/canonicalSource.ts'
import { confirmedChanges, originCounts, type ConfirmedChange } from '../model/confirmedChanges.ts'
import type { AdminEvaluationPlan, AdminEvaluationPlanRevision, EvaluationPlanAnalysisView, PlanReviewDraftView, PlanReviewHistory, TeachingPlanReviewView } from '../api/types.ts'
import { RemoteView } from '../components/AdminParts.tsx'
import { ChevronLeftIcon, Modal } from '../components/canonicalUi.ts'
import type { StructureFocus } from '../components/PlanStructureViewer.tsx'
import { dateLabel } from '../model/adminFormat.ts'
import { comparisonRowsOf, displayValue, filterRows, reviewProgressOf, type ComparisonFilter, type ComparisonRow, type ReviewProgress } from '../model/planReviewComparison.ts'
import { planStage, stageLabel, type PlanStage } from '../model/planStatus.ts'
import { useRemote } from '../model/useRemote.ts'
import { SourcePane } from '../review/SourcePane.tsx'
import review from '../review/review.module.css'
import styles from './archive.module.css'
import result from './planResult.module.css'
import { DocumentDetail, type OpenSource, type Tab } from './PlanArchiveRoute.tsx'
import { paths } from './paths.ts'
import { ReanalyzeDialog } from './ReanalyzeDialog.tsx'
import { useSplitPane } from '../review/useSplitPane.ts'
import { actorLabel } from '../model/actorLabel.ts'
import { ResultSubjectPicker, type ResultSubjectEntry } from '../components/ResultSubjectPicker.tsx'
import { confirmedSubjectLinks } from '../review/reviewModel.ts'
import { canEditConfirmed } from '../model/schoolInfoSync.ts'

// A27-UX 분석·검토·확정 결과 읽기 전용 조회 (/assessment/analysis/{planId}/revisions/{revisionId}/result).
// 계정 B 보완(2026-11-18):
// - 왼쪽 원문 고정(검토 화면과 같은 SourcePane: PDF 쪽 이동·확대·축소, HWP·HWPX 구조 위치) | 오른쪽 결과. 근거 위치를 누르면 왼쪽 원문이 그 위치로 간다(Modal 없음).
// - 오른쪽 보기: 결과(과목 → 수행평가·채점기준 / 월별 운영계획 / 평가 구성) · 검토 비교(AI 후보 ↔ 관리자 검토값 ↔ 최종 확정값) · 확정 이력.
// - 검토 진행률: 검토 대상(분석 결과의 확정 후보 필드) 중 서버 공유 초안에 결정이 저장된 수. 모두 결정 = '검토 완료 · 미확정'.
// - 읽기 API만 호출한다. 검토 입력·확정 체크박스는 두지 않는다. 확정 = 학생 공개(§10-1) 정책은 바꾸지 않는다.
type View = 'result' | 'compare' | 'history'

interface ResultData {
  plan: AdminEvaluationPlan
  analysis: EvaluationPlanAnalysisView
  /** 초안 조회 실패는 '초안 없음'과 구분한다 */
  draft: { ok: true; value: PlanReviewDraftView | null } | { ok: false; message: string }
  history: { ok: true; value: PlanReviewHistory } | { ok: false; message: string }
  /** A28-29 운영계획 확정 상태·후보 수(조회 실패는 null — 승인 버튼만 숨긴다) */
  teaching: TeachingPlanReviewView | null
}

const settle = <T,>(promise: Promise<T>) => promise.then((value) => ({ ok: true as const, value }), (cause: unknown) => ({ ok: false as const, message: cause instanceof Error ? cause.message : '불러오지 못했어요.' }))

export function PlanResultRoute({ planId, revisionId, search }: { planId: string; revisionId: string; search: URLSearchParams }) {
  const data = useRemote(
    async (): Promise<ResultData> => {
      const [plan, analysis, draft, history, teaching] = await Promise.all([
        getEvaluationPlan(planId),
        getPlanAnalysis(planId, revisionId),
        isAdminMockDataSource ? Promise.resolve({ ok: true as const, value: null }) : settle(getPlanReviewDraft(planId, revisionId)),
        settle(getPlanReviewHistory(planId, revisionId)),
        isAdminMockDataSource ? Promise.resolve(null) : getTeachingPlanReview(planId, revisionId).catch(() => null),
      ])
      return { plan, analysis, draft, history, teaching }
    },
    [planId, revisionId],
  )
  return (
    <div className={`${review.workspace} ${result.workspace}`} data-testid="plan-result">
      <RemoteView state={data.state} onRetry={data.reload} label="분석 결과">
        {(loaded) => {
          const revision = loaded.plan.revisions.find((item) => item.documentRevisionId === revisionId)
          if (!revision) {
            return (
              <div className={styles.empty} data-testid="plan-result-missing">
                <strong>이 개정본을 찾지 못했어요</strong>
                <span>삭제됐거나 다른 문서의 개정본이에요.</span>
                <button type="button" className={styles.button} onClick={() => navigate(paths.analysis())}>
                  분석 목록으로
                </button>
              </div>
            )
          }
          return <ResultWorkspace data={loaded} revision={revision} search={search} onChanged={data.reload} />
        }}
      </RemoteView>
    </div>
  )
}

function ResultWorkspace({ data, revision, search, onChanged }: { data: ResultData; revision: AdminEvaluationPlanRevision; search: URLSearchParams; onChanged: () => void }) {
  const { plan, analysis } = data
  const [reanalyzeOpen, setReanalyzeOpen] = useState(false)
  // A28-30: 다시 읽기(onChanged)는 화면 전체를 불러오는 중으로 바꿔 확인 창까지 내린다 — 분석이 끝나도 결과(후보 수)를 먼저 보이고, 창을 닫을 때 다시 읽는다
  const reanalyzed = useRef(false)
  const teachingPending = data.teaching && !data.teaching.review ? data.teaching.candidateRowCount : 0
  const setParams = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(search)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, String(value))
    }
    replaceSearch(next.toString())
  }
  const rawView = search.get('view')
  const view: View = rawView === 'compare' || rawView === 'history' ? rawView : 'result'
  const tabParam = search.get('tab')
  const tab: Tab = tabParam === 'teaching' || tabParam === 'overview' ? tabParam : 'performance'
  const subjectCount = analysis.subjects.length
  const subjectIndex = Math.min(Math.max(0, Number(search.get('subject') ?? '0') || 0), Math.max(0, subjectCount - 1))
  const itemIndex = Number(search.get('item') ?? '0') || 0

  const [page, setPage] = useState(() => Math.max(1, Number(search.get('page')) || 1))
  const [focus, setFocus] = useState<StructureFocus | null>(null)
  const [pane, setPane] = useState<'source' | 'review'>('review')
  // [05] A27-UX: 원문 | 결과 폭을 검토 화면과 같은 분할선으로 조절(30~70%, 기본 45:55, 이 브라우저에 기억)
  const { bodyRef, separatorProps, bodyStyle } = useSplitPane('lh-assessment-result-split', 45)
  const openSource: OpenSource = (target, _label, structure = null) => {
    if (structure) setFocus((current) => ({ section: structure.section, path: structure.path, seq: (current?.seq ?? 0) + 1 }))
    else if (target) setPage(target)
    if (window.matchMedia('(max-width: 1100px)').matches) setPane('source')
  }

  const fields = analysis.reviewFields ?? []
  const draftView = data.draft.ok ? data.draft.value : null
  const progress = reviewProgressOf(fields, draftView?.draft)
  const stage = planStage(revision, progress.draftStatus === 'ACTIVE' ? { decided: progress.decided, total: progress.total } : null)
  const confirmed = revision.reviewStatus === 'CONFIRMED'
  const reReviewing = confirmed && progress.draftStatus === 'ACTIVE'
  const file = analysis.revisionFile?.file ?? revision.file

  // [06] 과목 선택 하나로 결과·검토 비교·확정 이력을 맞춘다. 과목을 바꾸면 하위 탭은 그대로, 고른 수행평가 항목은 처음으로, 스크롤은 위로
  const draftValue = data.draft.ok ? data.draft.value?.draft : null
  const excludedIndexes = new Set((draftValue?.subjectExclusions ?? []).map((item) => item.subjectIndex))
  const confirmedLinks = confirmedSubjectLinks(analysis)
  const draftLinks = new Map((draftValue?.subjectLinks ?? []).map((link) => [link.subjectIndex, link.subjectId]))
  const currentReview = data.history.ok ? data.history.value.items.find((item) => item.current) : undefined
  const confirmedOf = (index: number) =>
    currentReview
      ? currentReview.confirmedFields.filter((field) => (typeof field.analysisSubjectIndex === 'number' ? field.analysisSubjectIndex === index : confirmedLinks[index] !== undefined && field.subjectId === confirmedLinks[index])).length
      : 0
  const subjectEntries: ResultSubjectEntry[] = analysis.subjects.map((subject, index) => {
    const grades = analysis.subjectGrades?.[index] ?? null
    const twin = analysis.subjects.filter((other) => other.subjectName === subject.subjectName).length > 1
    return {
      index,
      name: subject.subjectName,
      detail: grades && grades.length > 0 ? `원문 ${grades.join('·')}학년${twin ? ` · ${index + 1}번째` : ''}` : twin ? `${index + 1}번째` : null,
      status: excludedIndexes.has(index) ? 'excluded' : draftLinks.get(index) || confirmedLinks[index] ? 'linked' : 'unlinked',
      confirmedCount: confirmedOf(index),
    }
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [subjectIndex])

  return (
    <>
      <header className={review.header} data-testid="plan-result-head">
        <button type="button" className={review.back} onClick={() => navigate(paths.analysis({ plan: plan.planId }))} aria-label="분석 목록으로" data-testid="plan-result-back">
          <ChevronLeftIcon size={20} />
        </button>
        <div className={review.crumbs}>
          <span>
            {plan.academicYear}학년도 고{plan.grade} {plan.semester}학기 / {revision.documentFormat ?? 'PDF'} · {dateLabel(revision.uploadedAt)} 등록 /
          </span>
          <strong title={revision.fileName}>{revision.fileName}</strong>
        </div>
        {plan.revisions.length > 1 && (
          <select className={result.revisionSelect} value={revision.documentRevisionId} onChange={(event) => navigate(paths.planResult(plan.planId, event.target.value))} aria-label="개정본" data-testid="plan-result-revision">
            {[...plan.revisions].reverse().map((item) => (
              <option key={item.documentRevisionId} value={item.documentRevisionId}>
                v{item.revisionNumber} · {dateLabel(item.uploadedAt)}
              </option>
            ))}
          </select>
        )}
        {(!confirmed || reReviewing) && (
          <button type="button" className={result.primary} onClick={() => navigate(paths.planReview(plan.planId, revision.documentRevisionId))} data-testid="plan-result-review">
            {reReviewing ? '확정 내용 수정 이어하기' : stage === 'ANALYZED' ? '검토하기' : '검토 이어하기'}
          </button>
        )}
        {/* A28-38: PDF 뿐 아니라 학교알리미 수집 원본(HWP·HWPX 포함, §39-14 서버 원본 검증으로 재승인 가능)도 수정 진입점을 보인다 */}
        {confirmed && !reReviewing && canEditConfirmed(revision.documentFormat, analysis.revisionFile?.sourceUrl) && !isAdminMockDataSource && (
          <EditConfirmedButton planId={plan.planId} revisionId={revision.documentRevisionId} />
        )}
        {/* A28-29: 평가 정보만 확정되고 운영계획 후보가 남은 문서 → 검토 화면 마지막 단계 '월별 운영계획 최종 승인'으로 */}
        {confirmed && !reReviewing && teachingPending > 0 && (
          <button type="button" className={review.button} onClick={() => navigate(paths.planReviewFinal(plan.planId, revision.documentRevisionId))} data-testid="plan-result-teaching-approve">
            월별 운영계획 승인 · 후보 {teachingPending}행
          </button>
        )}
        {!isAdminMockDataSource && (
          <button type="button" className={review.button} onClick={() => setReanalyzeOpen(true)} data-testid="plan-result-reanalyze">
            다시 분석
          </button>
        )}
      </header>
      {reanalyzeOpen && (
        <ReanalyzeDialog
          plan={plan}
          revision={revision}
          onClose={() => {
            setReanalyzeOpen(false)
            if (reanalyzed.current) {
              reanalyzed.current = false
              onChanged()
            }
          }}
          onFinished={() => {
            reanalyzed.current = true
          }}
        />
      )}

      <div className={review.paneSwitch} role="group" aria-label="보기 전환">
        <button type="button" aria-pressed={pane === 'source'} onClick={() => setPane('source')}>
          원문
        </button>
        <button type="button" aria-pressed={pane === 'review'} onClick={() => setPane('review')}>
          결과
        </button>
      </div>

      <div className={`${review.body} ${result.body}`} data-pane={pane} ref={bodyRef} style={bodyStyle}>
        <SourcePane planId={plan.planId} revisionId={revision.documentRevisionId} file={file} page={page} onPageChange={setPage} focus={focus} />
        <button type="button" className={review.splitter} aria-label="원문과 결과 영역 폭 조절" {...separatorProps} data-testid="plan-result-splitter" />
        <section className={`${review.review} ${result.panel}`} aria-label="분석 결과" data-testid="plan-result-panel">
          <StatusSummary stage={stage} progress={progress} confirmed={confirmed} reReviewing={reReviewing} draftError={data.draft.ok ? null : data.draft.message} analysis={analysis} />
          <div className={result.viewTabs} role="tablist" aria-label="결과 보기">
            {(
              [
                ['result', '결과'],
                ['compare', '검토 비교'],
                ['history', '확정 이력'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={view === id} className={result.viewTab} onClick={() => setParams({ view: id === 'result' ? null : id })} data-testid={`plan-result-${id}-tab`}>
                {label}
              </button>
            ))}
          </div>
          {subjectEntries.length > 0 && (
            <div className={result.subjectRow}>
              <ResultSubjectPicker entries={subjectEntries} value={subjectIndex} onChange={(index) => setParams({ subject: index, item: null })} />
            </div>
          )}
          <div className={result.scroll} ref={scrollRef}>
            {view === 'result' && <DocumentDetail hideHeader plan={plan} revision={revision} subjectIndex={subjectIndex} tab={tab} itemIndex={itemIndex} setParams={setParams} onSource={openSource} />}
            {view === 'compare' && <Comparison data={data} progress={progress} onSource={openSource} subjectIndex={subjectCount > 1 ? subjectIndex : null} />}
            {view === 'history' && <ResultHistory plan={plan} analysis={analysis} revisionId={revision.documentRevisionId} evaluation={data.history} subjectName={analysis.subjects[subjectIndex]?.subjectName ?? null} subjectConfirmed={(item) => item.confirmedFields.filter((field) => (typeof field.analysisSubjectIndex === 'number' ? field.analysisSubjectIndex === subjectIndex : confirmedLinks[subjectIndex] !== undefined && field.subjectId === confirmedLinks[subjectIndex])).length} />}
          </div>
        </section>
      </div>
    </>
  )
}

function StatusSummary({ stage, progress, confirmed, reReviewing, draftError, analysis }: { stage: PlanStage; progress: ReviewProgress; confirmed: boolean; reReviewing: boolean; draftError: string | null; analysis: EvaluationPlanAnalysisView }) {
  const percent = progress.total ? Math.round((progress.decided / progress.total) * 100) : 0
  const confirmedCount = analysis.confirmedFields.length
  let note: string
  if (reReviewing) note = '재검토 중 · 학생에게는 이전 확정본 유지'
  else if (confirmed) note = '확정 · 학생 공개 중 · 이 화면은 조회 전용'
  else if (stage === 'REVIEW_DONE') note = '검토 완료 · 확정 전(학생 비공개)'
  else if (stage === 'REVIEWING') note = '검토 중 · 검토값 임시 저장(학생 비공개)'
  else note = 'AI 분석 결과 · 확정 전(학생 비공개)'
  const showProgress = progress.draftStatus === 'ACTIVE' || (!confirmed && progress.total > 0)
  return (
    <div className={result.summary} data-testid="plan-result-summary">
      <p className={result.stageLine} data-testid="plan-result-stage">
        <b data-stage={stage}>{reReviewing ? `${stageLabel.CONFIRMED} · 재검토 중` : stageLabel[stage]}</b>
        <span>{note}</span>
      </p>
      <dl className={result.counts}>
        <div>
          <dt>검토 대상</dt>
          <dd>{progress.total}개</dd>
        </div>
        <div>
          <dt>{progress.draftStatus === 'CLOSED' ? '확정 때 결정' : '검토 결정'}</dt>
          <dd data-testid="plan-result-decided">{draftError ? '불러오지 못함' : `${progress.decided}개`}</dd>
        </div>
        {confirmed && progress.draftStatus !== 'ACTIVE' ? (
          // 확정 뒤(재검토 아님)에는 '미검토'가 아니라 확정하지 않아 학생에게 보이지 않는 항목 수를 보인다(검토 화면 머리글과 같은 계산)
          <div>
            <dt>학생 비공개</dt>
            <dd data-testid="plan-result-undecided">{`${Math.max(0, progress.total - confirmedCount)}개`}</dd>
          </div>
        ) : (
          <div>
            <dt>미검토</dt>
            <dd data-testid="plan-result-undecided">{draftError ? '—' : `${Math.max(0, progress.total - progress.decided)}개`}</dd>
          </div>
        )}
        <div>
          <dt>학생 공개 확정값</dt>
          <dd>{confirmed ? `${confirmedCount}개` : '없음'}</dd>
        </div>
      </dl>
      {showProgress && !draftError && (
        <div className={result.progressRow}>
          <span>검토 진행 {percent}%</span>
          <div className={result.track} role="progressbar" aria-label="검토 진행률" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} data-testid="plan-result-progress">
            <div className={result.fill} style={{ width: `${percent}%` }} />
          </div>
          <span>
            {progress.decided}/{progress.total}
          </span>
        </div>
      )}
      {draftError && (
        <p className={styles.error} role="alert" data-testid="plan-result-draft-error">
          검토 초안을 불러오지 못해 진행률을 표시하지 않아요. {draftError}
        </p>
      )}
    </div>
  )
}

const decisionText: Record<string, string> = { CONFIRMED: 'AI 값 그대로', EDITED: '관리자 수정', ABSENT: '원문에 없음' }

function Comparison({ data, progress, onSource, subjectIndex }: { data: ResultData; progress: ReviewProgress; onSource: OpenSource; subjectIndex: number | null }) {
  const [filter, setFilter] = useState<ComparisonFilter>('all')
  // [06] 과목은 화면 위 과목 선택 하나를 따른다(이 탭 안 별도 과목 select 없음)
  const subject = subjectIndex
  const fields = data.analysis.reviewFields ?? []
  if (!data.draft.ok || !data.history.ok) {
    return (
      <p className={styles.error} role="alert" data-testid="plan-result-compare-error">
        비교에 필요한 {!data.draft.ok ? '검토 초안' : '확정 이력'}을 불러오지 못했어요. 값이 없는 것과 구분하려고 비교표를 보여 주지 않아요.
      </p>
    )
  }
  if (fields.length === 0) {
    return (
      <div className={styles.empty} data-testid="plan-result-compare-empty">
        <strong>비교할 검토 대상이 없어요</strong>
        <span>분석 결과에 확정 후보 값이 없어요.</span>
      </div>
    )
  }
  const draftActive = progress.draftStatus === 'ACTIVE'
  const rows = comparisonRowsOf(fields, data.draft.value?.draft, data.history.value).filter((row) => subject === null || row.subjectIndex === subject)
  const shown = filterRows(rows, filter, draftActive)
  const filters: [ComparisonFilter, string, number][] = [
    ['all', '전체', rows.length],
    ['changed', '관리자 수정', filterRows(rows, 'changed', draftActive).length],
    ['unreviewed', draftActive ? '미검토' : '미확정', filterRows(rows, 'unreviewed', draftActive).length],
    ['absent', '원문에 없음', filterRows(rows, 'absent', draftActive).length],
  ]
  return (
    <div className={result.compare} data-testid="plan-result-compare">
      <p className={styles.muted}>
        AI 후보 = 분석 결과 · 관리자 검토값 = {draftActive ? '서버 임시 저장값(학생 비공개)' : progress.draftStatus === 'CLOSED' ? '확정 때 쓴 결정' : '없음'} · 최종 확정값 = 학생 공개 중인 값
      </p>
      <div className={result.filterRow} role="group" aria-label="비교 필터">
        {filters.map(([id, label, count]) => (
          <button key={id} type="button" className={result.filter} aria-pressed={filter === id} onClick={() => setFilter(id)} data-testid={`plan-result-compare-filter-${id}`}>
            {label} {count}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className={styles.muted} data-testid="plan-result-compare-filter-empty">
          이 조건에 맞는 값이 없어요.
        </p>
      ) : (
        <div className={result.tableWrap}>
          <table className={result.table}>
            <thead>
              <tr>
                <th scope="col">항목</th>
                <th scope="col">AI 후보</th>
                <th scope="col">관리자 검토값</th>
                <th scope="col">최종 확정값</th>
                <th scope="col">근거</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <CompareRow key={row.key} row={row} draftActive={draftActive} onSource={onSource} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CompareRow({ row, draftActive, onSource }: { row: ComparisonRow; draftActive: boolean; onSource: OpenSource }) {
  const reviewValue = row.review ? (row.review.decision === 'ABSENT' ? '원문에 없음' : displayValue(row.review.value)) : null
  const confirmedValue = row.confirmed ? (row.confirmed.absent ? '원문에 없음' : displayValue(row.confirmed.value)) : null
  const previousChanged = row.previous && row.confirmed && displayValue(row.previous.value) !== displayValue(row.confirmed.value)
  return (
    <tr data-testid="plan-result-compare-row" data-changed={row.adminChanged ? 'true' : undefined}>
      <th scope="row">
        <span className={result.subject}>{row.subjectName}</span>
        {row.label}
      </th>
      <td>{displayValue(row.ai)}</td>
      <td>
        {reviewValue === null ? (
          <span className={styles.muted}>{draftActive ? '미검토' : '결정 없음'}</span>
        ) : (
          <>
            <span className={row.review?.decision === 'EDITED' ? result.changed : undefined}>{reviewValue}</span>
            <em className={result.tag}>
              {decisionText[row.review?.decision ?? ''] ?? row.review?.decision}
              {draftActive ? ' · 임시' : ''}
            </em>
          </>
        )}
      </td>
      <td>
        {confirmedValue === null ? (
          <span className={styles.muted}>미확정</span>
        ) : (
          <>
            <b>{confirmedValue}</b>
            {previousChanged && <em className={result.tag}>이전 확정 {row.previous?.absent ? '원문에 없음' : displayValue(row.previous?.value)}</em>}
          </>
        )}
      </td>
      <td>
        <span className={styles.sources}>
          {row.sourcePages.length === 0 && row.documentLocators.length === 0 && <span className={styles.muted}>—</span>}
          {row.sourcePages.slice(0, 3).map((value) => (
            <button key={value} type="button" className={styles.pageLink} onClick={() => onSource(value, `${value}쪽`)}>
              {value}쪽
            </button>
          ))}
          {row.documentLocators.slice(0, 2).map((locator) => (
            <button key={`${locator.section}:${locator.path}`} type="button" className={styles.pageLink} onClick={() => onSource(null, '근거 위치', { section: locator.section, path: locator.path })}>
              구역 {locator.section + 1}
              {locator.table != null ? ` · 표 ${locator.table + 1}` : ''}
            </button>
          ))}
        </span>
      </td>
    </tr>
  )
}

function ResultHistory({
  plan,
  analysis,
  revisionId,
  evaluation,
  subjectName,
  subjectConfirmed,
}: {
  plan: AdminEvaluationPlan
  analysis: EvaluationPlanAnalysisView
  revisionId: string
  evaluation: ResultData['history']
  subjectName: string | null
  subjectConfirmed: (item: PlanReviewHistory['items'][number]) => number
}) {
  const teaching = useRemote(() => getTeachingPlanHistory(plan.planId, revisionId), [plan.planId, revisionId])
  // A28 §5-4: 항목 이름·AI 후보는 같은 분석 결과의 후보에서만 찾는다(다른 분석 결과로 확정한 기록은 '후보 모름')
  const candidates = new Map((analysis.reviewFields ?? []).map((field) => [`${field.subjectIndex}|${field.fieldPath}`, field]))
  const fieldOf = (change: { analysisSubjectIndex: number | null; fieldPath: string }) =>
    change.analysisSubjectIndex === null ? undefined : candidates.get(`${change.analysisSubjectIndex}|${change.fieldPath}`)
  return (
    <div style={{ display: 'grid', gap: 20 }} data-testid="plan-result-history">
      <section aria-label="평가 정보 확정 이력">
        <h3 className={styles.sectionTitle}>평가 정보</h3>
        {!evaluation.ok ? (
          <p className={styles.error} role="alert">
            확정 이력을 불러오지 못했어요. {evaluation.message}
          </p>
        ) : evaluation.value.items.length === 0 ? (
          <p className={styles.muted}>아직 확정한 적이 없어요.</p>
        ) : (
          <ol className={styles.historyList}>
            {evaluation.value.items.map((item, index) => (
              <li key={item.reviewId} className={styles.historyRow} data-testid="plan-result-history-row">
                <strong>
                  {evaluation.value.items.length - index}차 확정{item.current ? ' · 학생 공개 중' : ''}
                </strong>
                <span className={styles.muted}>
                  {new Date(item.reviewedAt).toLocaleString('ko-KR')} · {actorLabel(item.reviewedBy)} · 확정값 {item.confirmedFieldCount}개
                  {subjectName ? ` · ${subjectName} ${subjectConfirmed(item)}개` : ''}
                  {item.analysisId === analysis.analysisId && (() => {
                    const origin = originCounts(item.confirmedFields, (field) => (typeof field.analysisSubjectIndex === 'number' ? candidates.get(`${field.analysisSubjectIndex}|${field.fieldPath}`)?.candidate : undefined))
                    return ` · AI 값 그대로 ${origin.asCandidate}개 · 관리자 수정 ${origin.edited}개${origin.unknown ? ` · 후보 없음 ${origin.unknown}개` : ''}`
                  })()}
                </span>
                {index < evaluation.value.items.length - 1 && (
                  <ChangeList changes={confirmedChanges(item.confirmedFields, evaluation.value.items[index + 1].confirmedFields)} fieldOf={fieldOf} />
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
      <section aria-label="월별 운영계획 확정 이력">
        <h3 className={styles.sectionTitle}>월별 운영계획</h3>
        <RemoteView state={teaching.state} onRetry={teaching.reload} label="운영계획 확정 이력">
          {(history) =>
            history.items.length === 0 ? (
              <p className={styles.muted}>아직 확정한 운영계획이 없어요.</p>
            ) : (
              <ol className={styles.historyList}>
                {history.items.map((item) => (
                  <li key={item.reviewId} className={styles.historyRow}>
                    <strong>
                      {item.versionNo}차 확정{item.current ? ' · 학생 공개 중' : ''}
                    </strong>
                    <span className={styles.muted}>
                      {new Date(item.reviewedAt).toLocaleString('ko-KR')} · 공개 {item.publishedRowCount}행 · 제외 {item.excludedRowCount}행
                    </span>
                  </li>
                ))}
              </ol>
            )
          }
        </RemoteView>
      </section>
    </div>
  )
}

/**
 * A28 §5 '확정 내용 수정': 확정된 문서에서 재검토(§39-8 reopen)를 시작하고 검토 화면으로 간다.
 * 서버가 최신 확정값으로 수정 초안을 만든다(처음부터 다시 입력하지 않음). 이전 확정 기록은 바뀌지 않고, 다시 최종 승인할 때까지 학생에게는 지금 확정본이 그대로 보인다.
 */
function EditConfirmedButton({ planId, revisionId }: { planId: string; revisionId: string }) {
  const [asking, setAsking] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pendingRef = useRef(false)
  const start = async () => {
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(null)
    try {
      await reopenPlanReviewDraft(planId, revisionId)
      navigate(paths.planReview(planId, revisionId))
    } catch (cause) {
      const apiError = toApiError(cause)
      if (apiError.fieldReasons().draft === 'already_open') {
        // 다른 관리자가 먼저 시작했다 — 같은 수정 초안을 이어서 쓴다(새로 만들지 않음)
        navigate(paths.planReview(planId, revisionId))
        return
      }
      setError(apiError.message)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }
  return (
    <>
      <button type="button" className={result.primary} onClick={() => setAsking(true)} data-testid="plan-result-edit-confirmed">
        확정 내용 수정
      </button>
      {asking && (
        <Modal
          title="확정 내용을 수정할까요?"
          onRequestClose={() => !pending && setAsking(false)}
          footer={
            <>
              <button type="button" className={review.buttonGhost} onClick={() => setAsking(false)} disabled={pending}>
                취소
              </button>
              <button type="button" className={review.buttonPrimary} onClick={() => void start()} disabled={pending} aria-busy={pending} data-testid="plan-result-edit-confirmed-start">
                {pending ? '수정 초안을 만드는 중…' : '수정 시작'}
              </button>
            </>
          }
        >
          <p>지금 확정값으로 수정 초안 생성 → 필요한 항목만 고친 뒤 &lsquo;최종 승인&rsquo; = 새 확정본</p>
          <p>이전 확정 기록 보존 · 다시 승인할 때까지 학생에게는 지금 확정본 유지</p>
          <p>월별 운영계획은 검토 화면 4단계 &lsquo;운영계획 수정&rsquo;에서 따로 고쳐요</p>
          {error && (
            <p role="alert" className={review.statusText} data-tone="danger">
              {error}
            </p>
          )}
        </Modal>
      )}
    </>
  )
}

/** A28 §5-4 재확정에서 바뀐 항목(이전 값 → 수정 값). 바뀐 것이 없으면 그 사실만 보인다 */
function ChangeList({ changes, fieldOf }: { changes: ConfirmedChange[]; fieldOf: (change: ConfirmedChange) => { subjectName: string; label: string } | undefined }) {
  if (changes.length === 0) {
    return (
      <span className={styles.muted} data-testid="plan-result-history-nochange">
        직전 확정과 같은 값
      </span>
    )
  }
  const shown = changes.slice(0, 20)
  const show = (value: unknown, page: number | null) => (value === null || value === undefined ? '없음' : `${String(value)}${page ? ` (${page}쪽)` : ''}`)
  return (
    <details data-testid="plan-result-history-changes">
      <summary>직전 확정 대비 변경 {changes.length}개</summary>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'grid', gap: 2 }}>
        {shown.map((change) => {
          const field = fieldOf(change)
          const name = field ? `${field.subjectName} · ${field.label}` : change.fieldPath
          return (
            <li key={change.key} data-testid="plan-result-history-change" data-kind={change.kind}>
              {name}: {change.kind === 'added' ? `새로 확정 ${show(change.after, change.afterPage)}` : change.kind === 'removed' ? `확정에서 빠짐 (이전 ${show(change.before, change.beforePage)})` : `${show(change.before, change.beforePage)} → ${show(change.after, change.afterPage)}`}
            </li>
          )
        })}
        {changes.length > shown.length && <li>그 밖에 {changes.length - shown.length}개</li>}
      </ul>
    </details>
  )
}
