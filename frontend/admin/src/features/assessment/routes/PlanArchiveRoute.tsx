import { useMemo, useState } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import { downloadPlanRevision, getPlanArchiveDetail, listEvaluationPlans, listPlanYearsRegistered, searchSchools } from '../api/assessmentAdminApi.ts'
import type { AdminEvaluationPlan, AdminEvaluationPlanRevision, ArchiveItem, ArchiveLocator, ArchiveSubject, PlanArchiveDetail, TeachingPlanRowCandidate } from '../api/types.ts'
import { RemoteView } from '../components/AdminParts.tsx'
import { Modal, entryFromRow, precisionLabel, whenLabel, type TeachingPlanEntry } from '../components/canonicalUi.ts'
import { PlanOriginalViewer } from '../components/PlanOriginalViewer.tsx'
import { dateLabel } from '../model/adminFormat.ts'
import { useRemote } from '../model/useRemote.ts'
import styles from './archive.module.css'
import { paths } from './paths.ts'

// A9 학년도별 평가계획서 열람 (2026-11-15). 학교 → 학년도 → 학년·학기 → 원문 파일 → 과목 → 수행평가·채점기준·월별 운영계획.
// - 학년도는 비교 대상이 아니라 독립된 열람 단위다. 한 번에 한 학년도의 문서만 보여 준다(다른 학년도 정보와 섞지 않음).
// - 값마다 상태를 나눈다: 관리자 확정 / 원문에 없음(관리자 확인) / 원문에 없음(분석) / 분석하지 못함 / 미확정 분석 후보. 값을 만들지 않는다.
// - 기존 API만 쓴다(§39 analysis · §39-4 review-draft · §39-6 teaching-plan-review). 학생 화면과 무관한 관리자 전용 화면이다.

type Tab = 'performance' | 'teaching' | 'overview'
const tabLabel: Record<Tab, string> = { performance: '수행평가 · 채점기준', teaching: '월별 운영계획', overview: '평가 구성' }
const analysisText: Record<string, string> = { NOT_REQUESTED: '분석 전', REVIEW_REQUIRED: '검토 필요', PARTIAL: '일부 분석', FAILED: '분석 실패', PROCESSING: '분석 중', COMPLETED: '분석 완료' }

type FieldState =
  | { kind: 'confirmed'; value: unknown; page: number | null }
  | { kind: 'confirmed-absent'; page: number | null }
  | { kind: 'not-in-source' }
  | { kind: 'not-extracted' }
  | { kind: 'candidate'; value: unknown }
  | { kind: 'none' }

const pagesOf = (sources: ArchiveLocator[] | null | undefined) =>
  [...new Set((sources ?? []).map((source) => source.pdfPageNumber).filter((page): page is number => typeof page === 'number'))].sort((a, b) => a - b)

const locatorText = (sources: ArchiveLocator[] | null | undefined) =>
  (sources ?? [])
    .map((source) => source.documentLocator)
    .filter(Boolean)
    .map((locator) => `구역 ${locator!.section}${locator!.table != null ? ` · 표 ${locator!.table + 1}` : ''}${locator!.row != null ? ` · ${locator!.row + 1}행` : ''}`)
    .slice(0, 2)
    .join(', ')

export function PlanArchiveRoute({ search }: { search: URLSearchParams }) {
  const schoolId = search.get('school') ?? ''
  const year = Number(search.get('year') ?? '') || null
  const grade = Number(search.get('grade') ?? '') || null
  const semester = Number(search.get('semester') ?? '') || null
  const planId = search.get('plan') ?? ''
  const revisionId = search.get('revision') ?? ''
  const subjectIndex = Number(search.get('subject') ?? 0) || 0
  const tab = (search.get('tab') as Tab | null) ?? 'performance'
  const itemIndex = Number(search.get('item') ?? 0) || 0

  const setParams = (patch: Record<string, string | number | null>) => {
    const params = new URLSearchParams(search)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') params.delete(key)
      else params.set(key, String(value))
    }
    replaceSearch(params.toString())
  }

  const schools = useRemote(() => searchSchools(), [])
  const years = useRemote(() => (schoolId ? listPlanYearsRegistered(schoolId) : Promise.resolve([] as number[])), [schoolId])
  const yearList = years.state.status === 'success' ? years.state.data : []
  const activeYear = year ?? yearList[0] ?? null
  const plans = useRemote(() => (schoolId && activeYear ? listEvaluationPlans({ schoolId, academicYear: activeYear }) : Promise.resolve({ items: [] as AdminEvaluationPlan[] })), [schoolId, activeYear])

  return (
    <div className={styles.page} data-testid="plan-archive">
      <nav className={styles.crumbs} aria-label="위치">
        <button type="button" className={styles.crumbLink} onClick={() => navigate(paths.plans)}>
          학교별 평가계획서
        </button>
        <span aria-hidden="true">/</span>
        <span>학년도별 열람</span>
      </nav>
      <h2 className={styles.title}>평가계획서 열람</h2>
      <p className={styles.lead}>학교와 학년도를 고르면 그 학년도 평가계획서의 원문과 과목별 수행평가·채점기준·월별 운영계획을 볼 수 있어요. 학년도는 하나씩 따로 열람해요.</p>

      <div className={styles.filters}>
        <label className={styles.field}>
          <span>학교</span>
          <select className={styles.select} value={schoolId} onChange={(event) => setParams({ school: event.target.value, year: null, plan: null, revision: null, subject: null, item: null })} data-testid="archive-school">
            <option value="">학교 선택</option>
            {schools.state.status === 'success' &&
              schools.state.data.items.map((school) => (
                <option key={school.schoolId} value={school.schoolId}>
                  {school.name ?? `학교 코드 ${school.schoolId}`}
                </option>
              ))}
            {schoolId && schools.state.status === 'success' && !schools.state.data.items.some((school) => school.schoolId === schoolId) && <option value={schoolId}>학교 코드 {schoolId}</option>}
          </select>
        </label>
        {schoolId && (
          <div className={styles.field}>
            <span>학년도</span>
            <div className={styles.segments} role="group" aria-label="학년도" data-testid="archive-years">
              {yearList.length === 0 ? (
                <span className={styles.muted}>{years.state.status === 'loading' ? '불러오는 중…' : '등록된 학년도가 없어요'}</span>
              ) : (
                yearList.map((value) => (
                  <button key={value} type="button" className={styles.segment} aria-pressed={value === activeYear} onClick={() => setParams({ year: value, plan: null, revision: null, subject: null, item: null })} data-testid={`archive-year-${value}`}>
                    {value}학년도
                  </button>
                ))
              )}
            </div>
          </div>
        )}
        {schoolId && activeYear && (
          <>
            <div className={styles.field}>
              <span>학년</span>
              <div className={styles.segments} role="group" aria-label="학년">
                {[null, 1, 2, 3].map((value) => (
                  <button key={String(value)} type="button" className={styles.segment} aria-pressed={grade === value} onClick={() => setParams({ grade: value, plan: null, revision: null, subject: null, item: null })}>
                    {value ? `${value}학년` : '전체'}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <span>학기</span>
              <div className={styles.segments} role="group" aria-label="학기">
                {[null, 1, 2].map((value) => (
                  <button key={String(value)} type="button" className={styles.segment} aria-pressed={semester === value} onClick={() => setParams({ semester: value, plan: null, revision: null, subject: null, item: null })}>
                    {value ? `${value}학기` : '전체'}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {!schoolId ? (
        <div className={styles.empty}>
          <strong>학교를 골라 주세요</strong>
          <span>평가계획서가 등록된 학교만 목록에 보여요(전체 학교 목록은 아직 연결되지 않았어요).</span>
        </div>
      ) : !activeYear ? (
        <div className={styles.empty}>
          <strong>이 학교에 등록된 평가계획서가 없어요</strong>
        </div>
      ) : (
        <RemoteView state={plans.state} onRetry={plans.reload} label="평가계획서 목록">
          {(data) => {
            const docs = data.items
              .filter((plan) => plan.academicYear === activeYear && (!grade || plan.grade === grade) && (!semester || plan.semester === semester))
              .sort((a, b) => a.grade - b.grade || a.semester - b.semester)
            const selected = docs.find((plan) => plan.planId === planId) ?? docs[0]
            if (!selected) {
              return (
                <div className={styles.empty} data-testid="archive-empty">
                  <strong>
                    {activeYear}학년도{grade ? ` ${grade}학년` : ''}
                    {semester ? ` ${semester}학기` : ''} 평가계획서가 없어요
                  </strong>
                  <span>학교 홈페이지·학교알리미의 원문을 &lsquo;학교별 평가계획서&rsquo;에서 등록해 주세요.</span>
                </div>
              )
            }
            const revision = selected.revisions.find((item) => item.documentRevisionId === revisionId) ?? selected.revisions[selected.revisions.length - 1]
            return (
              <div className={styles.layout}>
                <aside className={styles.docs} aria-label={`${activeYear}학년도 평가계획서`} data-testid="archive-docs">
                  <p className={styles.sideLabel}>
                    {activeYear}학년도 문서 {docs.length}건
                  </p>
                  <ul>
                    {docs.map((plan) => {
                      const latest = plan.revisions[plan.revisions.length - 1]
                      return (
                        <li key={plan.planId}>
                          <button type="button" className={styles.doc} aria-pressed={plan.planId === selected.planId} onClick={() => setParams({ plan: plan.planId, revision: null, subject: null, item: null })} data-testid="archive-doc">
                            <strong>{latest.fileName}</strong>
                            <span className={styles.docMeta}>
                              {plan.grade}학년 {plan.semester}학기 · {latest.documentFormat ?? 'PDF'} · {dateLabel(latest.uploadedAt)}
                            </span>
                            <span className={styles.docStatus} data-tone={latest.reviewStatus === 'CONFIRMED' ? 'done' : undefined}>
                              {analysisText[latest.analysisStatus] ?? latest.analysisStatus} · {latest.reviewStatus === 'CONFIRMED' ? '관리자 확정' : '미확정'}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </aside>
                <DocumentDetail
                  key={`${selected.planId}/${revision.documentRevisionId}`}
                  plan={selected}
                  revision={revision}
                  subjectIndex={subjectIndex}
                  tab={tab}
                  itemIndex={itemIndex}
                  setParams={setParams}
                />
              </div>
            )
          }}
        </RemoteView>
      )}
    </div>
  )
}

function DocumentDetail({
  plan,
  revision,
  subjectIndex,
  tab,
  itemIndex,
  setParams,
}: {
  plan: AdminEvaluationPlan
  revision: AdminEvaluationPlanRevision
  subjectIndex: number
  tab: Tab
  itemIndex: number
  setParams: (patch: Record<string, string | number | null>) => void
}) {
  const detail = useRemote(() => getPlanArchiveDetail(plan.planId, revision.documentRevisionId), [plan.planId, revision.documentRevisionId])
  const [source, setSource] = useState<{ page: number; label: string } | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const format = revision.documentFormat ?? 'PDF'
  const previewable = Boolean(revision.file?.available && revision.file.previewAvailable)
  const openSource = (page: number | null, label: string) => setSource({ page: page ?? 1, label })
  const download = () => {
    setDownloadError(null)
    downloadPlanRevision(plan.planId, revision.documentRevisionId).then(
      (blob) => {
        const href = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = href
        anchor.download = revision.fileName
        anchor.click()
        window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
      },
      (cause: Error) => setDownloadError(`원문을 내려받지 못했어요. ${cause.message}`),
    )
  }

  return (
    <section className={styles.detail} aria-label={revision.fileName} data-testid="archive-detail">
      <header className={styles.docHead}>
        <div>
          <p className={styles.docPath}>
            {plan.academicYear}학년도 · {plan.grade}학년 {plan.semester}학기 · {format}
            {plan.revisions.length > 1 && (
              <select className={styles.inlineSelect} value={revision.documentRevisionId} onChange={(event) => setParams({ revision: event.target.value, subject: null, item: null })} aria-label="개정본">
                {[...plan.revisions].reverse().map((item) => (
                  <option key={item.documentRevisionId} value={item.documentRevisionId}>
                    v{item.revisionNumber} · {dateLabel(item.uploadedAt)}
                  </option>
                ))}
              </select>
            )}
          </p>
          <h3 className={styles.docTitle}>{revision.fileName}</h3>
        </div>
        <div className={styles.docActions}>
          <button type="button" className={styles.button} onClick={() => openSource(1, '원문')} disabled={!revision.file?.available} data-testid="archive-open-original">
            원문 보기
          </button>
          <button type="button" className={styles.button} onClick={download} disabled={!revision.file?.available}>
            내려받기
          </button>
          <button type="button" className={styles.buttonPrimary} onClick={() => navigate(paths.planReview(plan.planId, revision.documentRevisionId))}>
            검토 화면
          </button>
        </div>
        {downloadError && (
          <p className={styles.error} role="alert">
            {downloadError}
          </p>
        )}
      </header>

      <RemoteView state={detail.state} onRetry={detail.reload} label="분석 결과">
        {(data) =>
          data.subjects.length === 0 ? (
            <div className={styles.empty}>
              <strong>{data.analysisStatus === 'NOT_REQUESTED' ? '아직 분석하지 않은 문서예요' : '분석 결과에 과목이 없어요'}</strong>
              <span>원문은 &lsquo;원문 보기&rsquo;로 확인할 수 있어요. 분석은 &lsquo;학교별 평가계획서&rsquo; 목록에서 실행해요.</span>
            </div>
          ) : (
            <DetailBody data={data} subjectIndex={Math.min(subjectIndex, data.subjects.length - 1)} tab={tab} itemIndex={itemIndex} setParams={setParams} onSource={openSource} academicYear={plan.academicYear} semester={plan.semester} />
          )
        }
      </RemoteView>

      {source && (
        <Modal title={`${revision.fileName} · ${source.label}`} wide onRequestClose={() => setSource(null)} footer={<button type="button" className={styles.button} onClick={() => setSource(null)}>닫기</button>}>
          {format !== 'PDF' && (
            <p className={styles.notice} data-testid="archive-hwp-notice">
              {previewable
                ? `${format} 원문을 PDF로 변환한 미리보기예요. 변환 미리보기의 쪽은 원문 위치와 다를 수 있어 근거 위치로 이동하지 않아요. 정확한 위치는 원문 파일에서 확인해 주세요.`
                : `${format} 원문은 앱 안에서 미리 볼 수 없어요. 내려받아 한글 프로그램으로 확인해 주세요.`}
            </p>
          )}
          <div className={styles.viewer}>
            <PlanOriginalViewer bare planId={plan.planId} revisionId={revision.documentRevisionId} file={revision.file} page={format === 'PDF' ? source.page : 1} onPageChange={(page) => setSource({ ...source, page })} />
          </div>
        </Modal>
      )}
    </section>
  )
}

function DetailBody({
  data,
  subjectIndex,
  tab,
  itemIndex,
  setParams,
  onSource,
  academicYear,
  semester,
}: {
  data: PlanArchiveDetail
  subjectIndex: number
  tab: Tab
  itemIndex: number
  setParams: (patch: Record<string, string | number | null>) => void
  onSource: (page: number | null, label: string) => void
  academicYear: number
  semester: number
}) {
  const subject = data.subjects[subjectIndex]
  const subjectId = data.subjectLinks[subjectIndex] ?? null
  const issues = subject.extraction?.issues ?? []
  /** 값의 상태: 확정값 → 분석 issue(원문에 없음/읽지 못함) → 후보 → 없음 */
  const stateOf = (fieldPath: string, candidate: unknown): FieldState => {
    const confirmed = subjectId ? data.confirmed.find((field) => field.subjectId === subjectId && field.fieldPath === fieldPath) : undefined
    if (confirmed) return confirmed.value === null ? { kind: 'confirmed-absent', page: confirmed.pdfPageNumber } : { kind: 'confirmed', value: confirmed.value, page: confirmed.pdfPageNumber }
    const issue = issues.find((item) => item.fieldPath === fieldPath)
    if (issue?.code === 'FIELD_NOT_PROVIDED') return { kind: 'not-in-source' }
    if (issue?.code === 'FIELD_EXTRACTION_FAILED') return { kind: 'not-extracted' }
    if (candidate === null || candidate === undefined || candidate === '') return { kind: 'none' }
    return { kind: 'candidate', value: candidate }
  }

  return (
    <div className={styles.body}>
      <div className={styles.subjects} role="tablist" aria-label="과목" data-testid="archive-subjects">
        {data.subjects.map((item, index) => (
          <button key={`${item.subjectName}-${index}`} type="button" role="tab" aria-selected={index === subjectIndex} className={styles.chip} onClick={() => setParams({ subject: index, item: null })} data-testid="archive-subject">
            {item.subjectName}
          </button>
        ))}
      </div>
      <p className={styles.statusLine}>
        {data.reviewStatus === 'CONFIRMED' ? '관리자가 확정한 문서예요.' : '아직 관리자가 확정하지 않았어요. 아래 값은 분석 후보예요.'} 값 옆 표시: <b>확정</b> = 관리자 확정, <b>후보</b> = 미확정 분석값.
        {subject.extraction?.status === 'MISSING_SECTION' && ' 이 과목은 평가 목록을 찾지 못하고 운영계획만 읽었어요.'}
      </p>

      <div className={styles.tabs} role="tablist" aria-label="보기">
        {(Object.keys(tabLabel) as Tab[]).map((value) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} className={styles.tab} onClick={() => setParams({ tab: value })} data-testid={`archive-tab-${value}`}>
            {tabLabel[value]}
          </button>
        ))}
      </div>

      {tab === 'performance' && <PerformancePanel subject={subject} itemIndex={itemIndex} stateOf={stateOf} onSelect={(index) => setParams({ item: index })} onSource={onSource} />}
      {tab === 'teaching' && <TeachingPanel subject={subject} subjectIndex={subjectIndex} data={data} onSource={onSource} academicYear={academicYear} semester={semester} />}
      {tab === 'overview' && <OverviewPanel subject={subject} stateOf={stateOf} onSource={onSource} />}
    </div>
  )
}

function Value({ state, unit = '', onSource }: { state: FieldState; unit?: string; onSource?: (page: number | null, label: string) => void }) {
  switch (state.kind) {
    case 'confirmed':
      return (
        <span className={styles.value} data-state="confirmed">
          <b>{`${String(state.value)}${unit}`}</b>
          <em className={styles.badgeDone}>확정</em>
          {state.page && onSource && (
            <button type="button" className={styles.pageLink} onClick={() => onSource(state.page, `${state.page}쪽`)}>
              {state.page}쪽
            </button>
          )}
        </span>
      )
    case 'confirmed-absent':
      return <span className={styles.muted} data-state="confirmed-absent">원문에 없음 <em className={styles.badgeDone}>확정</em></span>
    case 'not-in-source':
      return <span className={styles.muted} data-state="not-in-source">원문에 없음 (분석)</span>
    case 'not-extracted':
      return <span className={styles.warn} data-state="not-extracted">분석하지 못함 · 원문 확인</span>
    case 'candidate':
      return (
        <span className={styles.value} data-state="candidate">
          {`${String(state.value)}${unit}`}
          <em className={styles.badge}>후보</em>
        </span>
      )
    default:
      return <span className={styles.muted} data-state="none">정보 없음</span>
  }
}

function SourceLinks({ sources, onSource, label }: { sources: ArchiveLocator[] | null | undefined; onSource: (page: number | null, label: string) => void; label: string }) {
  const pages = pagesOf(sources)
  const locator = locatorText(sources)
  if (pages.length === 0 && !locator) return <span className={styles.muted}>근거 위치 없음</span>
  return (
    <span className={styles.sources}>
      {pages.map((page) => (
        <button key={page} type="button" className={styles.pageLink} onClick={() => onSource(page, `${label} · ${page}쪽`)}>
          {page}쪽
        </button>
      ))}
      {locator && <span className={styles.muted}>{locator}</span>}
    </span>
  )
}

function PerformancePanel({
  subject,
  itemIndex,
  stateOf,
  onSelect,
  onSource,
}: {
  subject: ArchiveSubject
  itemIndex: number
  stateOf: (fieldPath: string, candidate: unknown) => FieldState
  onSelect: (index: number) => void
  onSource: (page: number | null, label: string) => void
}) {
  const items = subject.performanceEvaluation?.items ?? []
  if (items.length === 0) {
    return (
      <div className={styles.empty} data-testid="archive-no-performance">
        <strong>이 과목에서 수행평가 항목을 찾지 못했어요</strong>
        <span>{subject.extraction?.status === 'MISSING_SECTION' ? '분석기가 평가 목록 구간을 찾지 못했어요. 원문에서 직접 확인해 주세요.' : '원문에 수행평가가 없거나 읽지 못했을 수 있어요. 원문에서 확인해 주세요.'}</span>
      </div>
    )
  }
  const index = Math.min(itemIndex, items.length - 1)
  const item = items[index]
  const path = (field: string) => `performanceEvaluation.items[${index}].${field}`
  return (
    <div className={styles.master}>
      <ul className={styles.itemList} aria-label="수행평가 목록" data-testid="archive-items">
        {items.map((entry, position) => (
          <li key={entry.itemKey}>
            <button type="button" className={styles.itemRow} aria-pressed={position === index} onClick={() => onSelect(position)} data-testid="archive-item">
              <strong>{entry.label || '이름 미확인'}</strong>
              <span className={styles.docMeta}>
                {[entry.timing, entry.weightPercent != null ? `${entry.weightPercent}%` : null].filter(Boolean).join(' · ') || '시기·비율 정보 없음'}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <ItemDetail item={item} path={path} stateOf={stateOf} onSource={onSource} />
    </div>
  )
}

function ItemDetail({ item, path, stateOf, onSource }: { item: ArchiveItem; path: (field: string) => string; stateOf: (fieldPath: string, candidate: unknown) => FieldState; onSource: (page: number | null, label: string) => void }) {
  const rows: [string, React.ReactNode][] = [
    ['수행평가명', <Value key="l" state={stateOf(path('label'), item.label)} onSource={onSource} />],
    ['평가 영역', item.area ? <span key="a">{item.area}<em className={styles.badge}>후보</em></span> : <span key="a" className={styles.muted}>정보 없음</span>],
    ['평가 시기', <Value key="t" state={stateOf(path('timing'), item.timing)} onSource={onSource} />],
    ['반영비율', <Value key="w" state={stateOf(path('weightPercent'), item.weightPercent)} unit="%" onSource={onSource} />],
    ['만점', <Value key="m" state={stateOf(path('maxScore'), item.maxScore)} unit="점" onSource={onSource} />],
  ]
  return (
    <article className={styles.itemDetail} data-testid="archive-item-detail">
      <h4 className={styles.itemTitle}>{item.label || '이름 미확인 수행평가'}</h4>
      <dl className={styles.facts}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.sectionLabel}>평가 방법 · 내용</p>
      <p className={styles.prose}>{item.content ?? <span className={styles.muted}>분석 결과에 없음 — 원문 확인</span>}</p>
      <div className={styles.twoCol}>
        <div>
          <p className={styles.sectionLabel}>제출물</p>
          {item.submissions?.length ? <ul className={styles.bullets}>{item.submissions.map((value) => <li key={value}>{value}</li>)}</ul> : <p className={styles.muted}>분석 결과에 없음</p>}
        </div>
        <div>
          <p className={styles.sectionLabel}>수행 조건 · 준비 사항</p>
          {item.conditions?.length ? <ul className={styles.bullets}>{item.conditions.map((value) => <li key={value}>{value}</li>)}</ul> : <p className={styles.muted}>분석 결과에 없음</p>}
        </div>
      </div>
      <p className={styles.sectionLabel}>세부 채점기준</p>
      {item.rubric?.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table} data-testid="archive-rubric">
            <thead>
              <tr>
                <th scope="col" style={{ width: '24%' }}>채점 요소</th>
                <th scope="col">수준별 기준</th>
                <th scope="col" style={{ width: 80 }}>점수</th>
                <th scope="col" style={{ width: 96 }}>근거</th>
              </tr>
            </thead>
            <tbody>
              {item.rubric.flatMap((criterion, criterionIndex) => {
                const levels = criterion.levels?.length ? criterion.levels : [null]
                return levels.map((level, levelIndex) => (
                  <tr key={`${criterionIndex}-${levelIndex}`}>
                    {levelIndex === 0 && (
                      <td rowSpan={levels.length} className={styles.strong}>
                        {criterion.element}
                      </td>
                    )}
                    <td>{level ? level.description : <span className={styles.muted}>수준 정보 없음</span>}</td>
                    <td>{level && level.score !== null ? `${level.score}점` : <span className={styles.muted}>정보 없음</span>}</td>
                    {levelIndex === 0 && (
                      <td rowSpan={levels.length}>
                        <SourceLinks sources={criterion.sources} onSource={onSource} label={criterion.element} />
                      </td>
                    )}
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.muted}>채점기준표를 찾지 못했어요. 원문에서 확인해 주세요.</p>
      )}
      <p className={styles.footnote}>
        채점기준·내용·제출물은 분석 결과이며 관리자 확정 대상이 아니에요(후보). 원문 근거: <SourceLinks sources={item.sources} onSource={onSource} label={item.label} />
      </p>
    </article>
  )
}

function TeachingPanel({ subject, subjectIndex, data, onSource, academicYear, semester }: { subject: ArchiveSubject; subjectIndex: number; data: PlanArchiveDetail; onSource: (page: number | null, label: string) => void; academicYear: number; semester: number }) {
  const confirmedRows = data.teachingPlan?.review?.rows.filter((row) => row.subjectIndex === subjectIndex && row.decision !== 'EXCLUDED') ?? null
  const confirmed = Boolean(data.teachingPlan?.review)
  const rows: { row: TeachingPlanRowCandidate; key: string }[] = useMemo(
    () => (confirmed ? (confirmedRows ?? []).map((row) => ({ row: row.row, key: row.rowKey })) : (subject.teachingPlan ?? []).map((row) => ({ row, key: row.rowKey }))),
    [confirmed, confirmedRows, subject.teachingPlan],
  )
  if (!subject.teachingPlan && !confirmed) {
    return (
      <div className={styles.empty} data-testid="archive-no-teaching">
        <strong>이 분석 결과에는 월별 운영계획이 없어요</strong>
        <span>{data.analyzer?.contractVersion === '0.3' ? '분석기가 운영계획을 찾지 못했어요. 원문에서 확인해 주세요.' : '이전 분석 형식(0.2)에는 운영계획이 담기지 않아요 — 원문에 없다는 뜻이 아니에요.'}</span>
      </div>
    )
  }
  const entries = rows.map(({ row, key }) => ({ entry: entryFromRow(row, { id: key, subjectName: subject.subjectName, status: confirmed ? 'CONFIRMED' : 'CANDIDATE', academicYear }), row }))
  const order = semester === 1 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 12, 1, 2]
  const groups = new Map<string, { entry: TeachingPlanEntry; row: TeachingPlanRowCandidate }[]>()
  for (const item of entries) {
    const month = item.entry.month
    const label = month == null ? '시기를 정할 수 없는 계획' : order.includes(month) ? `${month}월` : `이 학기 달 밖 (${month}월)`
    groups.set(label, [...(groups.get(label) ?? []), item])
  }
  const sortedLabels = [...groups.keys()].sort((a, b) => rank(a, order) - rank(b, order))
  return (
    <div data-testid="archive-teaching">
      <p className={styles.statusLine}>{confirmed ? '관리자가 확정한 운영계획이에요(제외한 행은 보이지 않아요).' : '아직 확정되지 않은 분석 후보예요. 확정은 검토 화면에서 해요.'}</p>
      {sortedLabels.map((label) => (
        <section key={label} className={styles.monthGroup} aria-label={label}>
          <h4 className={styles.monthTitle}>{label}</h4>
          <ul className={styles.timeline}>
            {groups.get(label)!.map(({ entry, row }) => (
              <li key={entry.id} className={styles.timelineRow} data-testid="archive-teaching-row">
                <div className={styles.when}>
                  <strong>{whenLabel(entry)}</strong>
                  <span className={styles.muted}>
                    {precisionLabel[entry.precision]}
                    {entry.asWritten ? ` · 원문 “${entry.asWritten}”` : ''}
                  </span>
                </div>
                <div className={styles.what}>
                  <strong>{entry.unit ?? entry.specialSchedule ?? '단원 정보 없음'}</strong>
                  {entry.content && <p className={styles.prose}>{entry.content}</p>}
                  <dl className={styles.miniFacts}>
                    {entry.achievementStandards.length > 0 && (
                      <div>
                        <dt>성취기준</dt>
                        <dd>{entry.achievementStandards.join(' / ')}</dd>
                      </div>
                    )}
                    {entry.teachingMethods.length > 0 && (
                      <div>
                        <dt>교수학습 방법</dt>
                        <dd>{entry.teachingMethods.join(', ')}</dd>
                      </div>
                    )}
                    {(row as { inquiryProcess?: string | null }).inquiryProcess && (
                      <div>
                        <dt>탐구 활동</dt>
                        <dd>{(row as { inquiryProcess?: string | null }).inquiryProcess}</dd>
                      </div>
                    )}
                    {entry.assessmentMethods.length > 0 && (
                      <div>
                        <dt>평가 관련 활동</dt>
                        <dd>{entry.assessmentMethods.join(', ')}</dd>
                      </div>
                    )}
                    {entry.specialSchedule && entry.unit && (
                      <div>
                        <dt>특별 일정</dt>
                        <dd>{entry.specialSchedule}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                <div className={styles.rowSource}>
                  <SourceLinks sources={row.sources as ArchiveLocator[] | null | undefined} onSource={onSource} label={entry.unit ?? '운영계획'} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function rank(label: string, order: number[]) {
  const month = Number(/^(\d+)월$/.exec(label)?.[1] ?? NaN)
  if (!Number.isNaN(month)) return order.indexOf(month)
  return label.startsWith('이 학기') ? 100 : 200
}

function OverviewPanel({ subject, stateOf, onSource }: { subject: ArchiveSubject; stateOf: (fieldPath: string, candidate: unknown) => FieldState; onSource: (page: number | null, label: string) => void }) {
  const exams = subject.writtenEvaluation?.exams ?? []
  return (
    <div className={styles.overview} data-testid="archive-overview">
      <dl className={styles.facts}>
        <div>
          <dt>지필평가 반영비율</dt>
          <dd>
            <Value state={stateOf('writtenEvaluation.weightPercent', subject.writtenEvaluation?.weightPercent)} unit="%" onSource={onSource} />
          </dd>
        </div>
        <div>
          <dt>수행평가 반영비율</dt>
          <dd>
            <Value state={stateOf('performanceEvaluation.weightPercent', subject.performanceEvaluation?.weightPercent)} unit="%" onSource={onSource} />
          </dd>
        </div>
        <div>
          <dt>수행평가 항목 수 (분석)</dt>
          <dd>{subject.performanceEvaluation?.items?.length ?? 0}개</dd>
        </div>
      </dl>
      <p className={styles.sectionLabel}>지필평가 회차</p>
      {exams.length === 0 ? (
        <p className={styles.muted}>분석 결과에 지필평가 회차가 없어요.</p>
      ) : (
        <ul className={styles.examList}>
          {exams.map((exam, index) => (
            <li key={exam.itemKey}>
              <strong>{exam.round}차</strong>
              <span>
                반영 <Value state={stateOf(`writtenEvaluation.exams[${index}].weightPercent`, exam.weightPercent)} unit="%" onSource={onSource} />
              </span>
              <span>
                시기 <Value state={stateOf(`writtenEvaluation.exams[${index}].timing`, exam.timing)} onSource={onSource} />
              </span>
              {exam.questionTypes?.length ? <span className={styles.muted}>{exam.questionTypes.join(' · ')}</span> : null}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.footnote}>이 학년도 문서의 설명이에요. 다른 학년도와 비교하지 않아요.</p>
    </div>
  )
}
