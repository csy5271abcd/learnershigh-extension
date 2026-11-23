import { useMemo, useState } from 'react'
import { navigate } from '../../../app/adminLocation.ts'
import { downloadPlanRevision, getPlanArchiveDetail } from '../api/assessmentAdminApi.ts'
import type { AdminEvaluationPlan, AdminEvaluationPlanRevision, ArchiveItem, ArchiveLocator, ArchiveSubject, PlanArchiveDetail, TeachingPlanRowCandidate } from '../api/types.ts'
import { RemoteView } from '../components/AdminParts.tsx'
import { Modal, entryFromRow, precisionLabel, semesterMonths, whenLabel, type TeachingPlanEntry } from '../components/canonicalUi.ts'
import { PlanOriginalViewer } from '../components/PlanOriginalViewer.tsx'
import type { StructureFocus } from '../components/PlanStructureViewer.tsx'
import { dateLabel } from '../model/adminFormat.ts'
import { useRemote } from '../model/useRemote.ts'
import styles from './archive.module.css'
import { paths } from './paths.ts'

// A9 평가계획서 문서 상세(DocumentDetail): 과목 → 수행평가·채점기준·월별 운영계획·평가 구성. (학년도별 열람 화면은 A27-UX에서 제거)
// - 학년도는 비교 대상이 아니라 독립된 열람 단위다. 한 번에 한 학년도의 문서만 보여 준다(다른 학년도 정보와 섞지 않음).
// - 값마다 상태를 나눈다: 관리자 확정 / 원문에 없음(관리자 확인) / 원문에 없음(분석) / 분석하지 못함 / 미확정 분석 후보. 값을 만들지 않는다.
// - 기존 API만 쓴다(§39 analysis · §39-4 review-draft · §39-6 teaching-plan-review). 학생 화면과 무관한 관리자 전용 화면이다.

export type Tab = 'performance' | 'teaching' | 'overview'
const tabLabel: Record<Tab, string> = { performance: '수행평가 · 채점기준', teaching: '월별 운영계획', overview: '평가 구성' }

type FieldState =
  | { kind: 'confirmed'; value: unknown; page: number | null }
  | { kind: 'confirmed-absent'; page: number | null }
  | { kind: 'not-in-source' }
  | { kind: 'not-extracted' }
  | { kind: 'candidate'; value: unknown }
  | { kind: 'none' }

const pagesOf = (sources: ArchiveLocator[] | null | undefined) =>
  [...new Set((sources ?? []).map((source) => source.pdfPageNumber).filter((page): page is number => typeof page === 'number'))].sort((a, b) => a - b)

/** HWP·HWPX 근거 위치(분석 결과 documentLocator) — 같은 section·path가 두 번 나오면 하나로 */
const locatorsOf = (sources: ArchiveLocator[] | null | undefined) => {
  const seen = new Set<string>()
  const out: NonNullable<ArchiveLocator['documentLocator']>[] = []
  for (const source of sources ?? []) {
    const locator = source.documentLocator
    if (!locator || seen.has(`${locator.section}:${locator.path}`)) continue
    seen.add(`${locator.section}:${locator.path}`)
    out.push(locator)
  }
  return out
}

const locatorLabel = (locator: NonNullable<ArchiveLocator['documentLocator']>) =>
  `구역 ${locator.section + 1}${locator.table != null ? ` · 표 ${locator.table + 1}` : ''}${locator.row != null ? ` · ${locator.row + 1}행` : ''}${locator.col != null ? ` ${locator.col + 1}열` : ''}`

export type OpenSource = (page: number | null, label: string, focus?: StructureFocus | null) => void

// [08] A27-UX: '학년도별 열람' 화면(PlanArchiveRoute)은 제거했다. 평가계획서는 6칸(PlanSlotsRoute)에서, 문서별 상세는
// 분석 결과 조회(PlanResultRoute)에서 이 파일의 DocumentDetail로 연다.
export function DocumentDetail({
  plan,
  revision,
  subjectIndex,
  tab,
  itemIndex,
  setParams,
  hideHeader = false,
  onSource: externalSource,
}: {
  plan: AdminEvaluationPlan
  revision: AdminEvaluationPlanRevision
  subjectIndex: number
  tab: Tab
  itemIndex: number
  setParams: (patch: Record<string, string | number | null>) => void
  /** A27-UX 결과 조회 화면은 자기 머리글을 쓴다 */
  hideHeader?: boolean
  /** A27-UX(계정 B): 결과 조회 화면의 왼쪽 고정 원문으로 근거를 보낸다. 주면 Modal을 쓰지 않는다 */
  onSource?: OpenSource
}) {
  const detail = useRemote(() => getPlanArchiveDetail(plan.planId, revision.documentRevisionId), [plan.planId, revision.documentRevisionId])
  const [source, setSource] = useState<{ page: number; label: string; focus: StructureFocus | null } | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const format = revision.documentFormat ?? 'PDF'
  const structureViewable = Boolean(revision.file?.available && revision.file.structurePreviewAvailable)
  const openSource: OpenSource = externalSource ?? ((page, label, focus = null) => setSource({ page: page ?? 1, label, focus }))
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
      {/* 결과 조회 화면(외부 원문 패널)은 자기 머리글·원문 막대를 쓴다 */}
      {!externalSource && (
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
            {!hideHeader && <h3 className={styles.docTitle}>{revision.fileName}</h3>}
          </div>
          <div className={styles.docActions}>
            <button type="button" className={styles.button} onClick={() => openSource(1, '원문')} disabled={!revision.file?.available} data-testid="archive-open-original">
              원문 보기
            </button>
            <button type="button" className={styles.button} onClick={download} disabled={!revision.file?.available}>
              내려받기
            </button>
            {!hideHeader && (
              <button type="button" className={styles.buttonPrimary} onClick={() => navigate(paths.planReview(plan.planId, revision.documentRevisionId))}>
                검토 화면
              </button>
            )}
          </div>
          {downloadError && (
            <p className={styles.error} role="alert">
              {downloadError}
            </p>
          )}
        </header>
      )}

      <RemoteView state={detail.state} onRetry={detail.reload} label="분석 결과">
        {(data) =>
          data.subjects.length === 0 ? (
            <div className={styles.empty}>
              <strong>{data.analysisStatus === 'NOT_REQUESTED' ? '아직 분석하지 않은 문서예요' : '분석 결과에 과목이 없어요'}</strong>
              <span>원문은 &lsquo;원문 보기&rsquo;로 확인할 수 있어요.</span>
            </div>
          ) : (
            <DetailBody data={data} subjectIndex={Math.min(subjectIndex, data.subjects.length - 1)} tab={tab} itemIndex={itemIndex} setParams={setParams} onSource={openSource} academicYear={plan.academicYear} semester={plan.semester} />
          )
        }
      </RemoteView>

      {source && !externalSource && (
        <Modal title={`${revision.fileName} · ${source.label}`} wide onRequestClose={() => setSource(null)} footer={<button type="button" className={styles.button} onClick={() => setSource(null)}>닫기</button>}>
          {format !== 'PDF' && (
            <p className={styles.notice} data-testid="archive-hwp-notice">
              {structureViewable
                ? `${format} 원문은 'PDF 미리보기'(변환본)로 보고, 분석 근거 위치는 '분석용 구조' 탭에서 확인해요. ${source.focus ? '근거 위치를 표시했어요.' : '근거 위치 버튼을 누르면 그 칸·문단을 표시해요.'}`
                : `${format} 원문은 앱 안에서 미리 볼 수 없어요. 내려받아 한글 프로그램으로 확인해 주세요.`}
            </p>
          )}
          <div className={styles.viewer}>
            <PlanOriginalViewer bare planId={plan.planId} revisionId={revision.documentRevisionId} file={revision.file} page={format === 'PDF' ? source.page : 1} onPageChange={(page) => setSource({ ...source, page })} focus={source.focus} />
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
  onSource: OpenSource
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
      {/* [06] A27-UX: 과목 칩 띠를 없앴다 — 분석 결과 조회 화면 위의 검색형 단일 과목 선택(ResultSubjectPicker)이 대신한다 */}
      <div className={styles.legend}>
        <span>{data.reviewStatus === 'CONFIRMED' ? '관리자가 확정한 문서예요.' : '아직 확정 전이에요.'}</span>
        <span className={styles.legendItems} aria-label="값 표시">
          <em className={styles.badgeDone}>확정</em> 관리자 확정 <em className={styles.badge}>후보</em> 미확정 분석값
        </span>
        {subject.extraction?.status === 'MISSING_SECTION' && <span>이 과목은 평가 목록을 찾지 못하고 운영계획만 읽었어요.</span>}
      </div>

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

function SourceLinks({ sources, onSource, label }: { sources: ArchiveLocator[] | null | undefined; onSource: OpenSource; label: string }) {
  const pages = pagesOf(sources)
  const locators = locatorsOf(sources).slice(0, 3)
  if (pages.length === 0 && locators.length === 0) return <span className={styles.muted}>근거 위치 없음</span>
  return (
    <span className={styles.sources}>
      {pages.map((page) => (
        <button key={page} type="button" className={styles.pageLink} onClick={() => onSource(page, `${label} · ${page}쪽`)}>
          {page}쪽
        </button>
      ))}
      {locators.map((locator) => (
        <button
          key={`${locator.section}:${locator.path}`}
          type="button"
          className={styles.pageLink}
          onClick={() => onSource(null, `${label} · ${locatorLabel(locator)}`, { section: locator.section, path: locator.path })}
          data-testid="archive-locator-link"
        >
          {locatorLabel(locator)}
        </button>
      ))}
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
  onSource: OpenSource
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

function ItemDetail({ item, path, stateOf, onSource }: { item: ArchiveItem; path: (field: string) => string; stateOf: (fieldPath: string, candidate: unknown) => FieldState; onSource: OpenSource }) {
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
        분석 후보(확정 대상 아님) · 원문 <SourceLinks sources={item.sources} onSource={onSource} label={item.label} />
      </p>
    </article>
  )
}

function TeachingPanel({ subject, subjectIndex, data, onSource, academicYear, semester }: { subject: ArchiveSubject; subjectIndex: number; data: PlanArchiveDetail; onSource: OpenSource; academicYear: number; semester: number }) {
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
  const order = semesterMonths(semester)
  const groups = new Map<string, { entry: TeachingPlanEntry; row: TeachingPlanRowCandidate }[]>()
  for (const item of entries) {
    const month = item.entry.month
    const label = month == null ? '시기를 정할 수 없는 계획' : order.includes(month) ? `${month}월` : `이 학기 달 밖 (${month}월)`
    groups.set(label, [...(groups.get(label) ?? []), item])
  }
  const sortedLabels = [...groups.keys()].sort((a, b) => rank(a, order) - rank(b, order))
  return (
    <div data-testid="archive-teaching">
      <p className={styles.statusLine}>{confirmed ? '관리자가 확정한 운영계획이에요(제외한 행은 보이지 않아요).' : '아직 확정되지 않은 분석 후보예요.'}</p>
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

function OverviewPanel({ subject, stateOf, onSource }: { subject: ArchiveSubject; stateOf: (fieldPath: string, candidate: unknown) => FieldState; onSource: OpenSource }) {
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
      <p className={styles.footnote}>이 학년도 문서의 설명이에요.</p>
    </div>
  )
}
